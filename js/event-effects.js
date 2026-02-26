(function () {
  'use strict';

  // ── 헬퍼 함수 (events.js 로컬 함수 복사) ──────────────────────────

  function randomInt(min, max) {
    const safeMin = Math.ceil(min);
    const safeMax = Math.floor(max);
    return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
  }

  function dispatchEvent(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function getBuildingCount(buildingType) {
    const state = window.Utils && typeof window.Utils.getState === 'function'
      ? window.Utils.getState()
      : null;
    if (!state || !Array.isArray(state.buildings)) {
      return 0;
    }
    return state.buildings.reduce((count, building) => {
      return count + (building.type === buildingType ? 1 : 0);
    }, 0);
  }

  function ensureRaidState(state) {
    if (!state) {
      return;
    }
    state.raids = state.raids || {};
    state.raids.count = Math.max(0, Number(state.raids.count) || 0);
    state.raids.enhanced = Boolean(state.raids.enhanced);
    state.raids.banditBaseSiege = state.raids.banditBaseSiege || {};
    state.raids.banditBaseSiege.inProgress = Boolean(state.raids.banditBaseSiege.inProgress);
    state.raids.banditBaseSiege.success = Boolean(state.raids.banditBaseSiege.success);
    state.raids.banditBaseSiege.resolved = Boolean(state.raids.banditBaseSiege.resolved);
    state.raids.banditBaseSiege.lastChoice = state.raids.banditBaseSiege.lastChoice || null;
  }

  function weightedPick(events) {
    const totalWeight = events.reduce((sum, event) => {
      const runtimeWeight = Number(event.runtimeWeight);
      const weight = Number.isFinite(runtimeWeight) ? runtimeWeight : (Number(event.weight) || 0);
      return sum + weight;
    }, 0);
    if (totalWeight <= 0) {
      return null;
    }
    let roll = Math.random() * totalWeight;
    for (const event of events) {
      const runtimeWeight = Number(event.runtimeWeight);
      const weight = Number.isFinite(runtimeWeight) ? runtimeWeight : (Number(event.weight) || 0);
      roll -= weight;
      if (roll <= 0) {
        return event;
      }
    }
    return events[events.length - 1] || null;
  }

  // ── 이벤트 즉발 효과 ──────────────────────────────────────────────

  function applyImmediateEffect(eventRuntime) {
    const state = window.Utils && typeof window.Utils.getState === 'function'
      ? window.Utils.getState()
      : null;
    if (!state || !window.Resources) {
      return;
    }

    const immediateType = eventRuntime.effect && eventRuntime.effect.immediate;

    if (immediateType === 'merchant_trade') {
      const goldGain = randomInt(35, 60);
      window.Resources.add('gold', goldGain);
      eventRuntime.runtimeData = { goldGain };
      return;
    }

    if (immediateType === 'population_gain') {
      const gain = randomInt(2, 3);
      const before = state.population.current;
      state.population.current = Math.min(state.population.max, state.population.current + gain);
      const actualGain = state.population.current - before;
      state.population.idle += actualGain;
      if (window.Utils && typeof window.Utils.clampPopulation === 'function') {
        window.Utils.clampPopulation(state);
      }
      eventRuntime.runtimeData = { populationGain: actualGain };
      dispatchEvent('populationChanged', {
        current: state.population.current,
        max: state.population.max,
        idle: state.population.idle,
        employed: state.population.employed
      });
      return;
    }

    if (immediateType === 'small_resource_gain') {
      const candidates = ['wood', 'stone', 'food', 'gold'];
      const picked = candidates[randomInt(0, candidates.length - 1)];
      const gainMin = picked === 'gold' ? 8 : 20;
      const gainMax = picked === 'gold' ? 20 : 45;
      const gain = randomInt(gainMin, gainMax);
      window.Resources.add(picked, gain);
      eventRuntime.runtimeData = { resourceType: picked, resourceGain: gain };
      return;
    }

    if (immediateType === 'resource_raid') {
      ensureRaidState(state);
      state.raids.count = (Number(state.raids.count) || 0) + 1;

      if (window.Mercenary && state.mercenaries && state.mercenaries.knight
        && (Number(state.mercenaries.knight.charges) || 0) > 0) {
        state.mercenaries.knight.charges -= 1;
        if (state.stats) {
          state.stats.raidsDefended = (Number(state.stats.raidsDefended) || 0) + 1;
        }
        eventRuntime.runtimeData = {
          lossPercent: 0,
          losses: { wood: 0, stone: 0, food: 0, gold: 0 },
          knightDefended: true
        };
        return;
      }

      let lossPercent = randomInt(10, 20);
      if (getBuildingCount('wall') > 0) {
        if (state.stats) {
          state.stats.raidsDefended = (Number(state.stats.raidsDefended) || 0) + 1;
        }
        lossPercent *= 0.5;
      }

      const mercBonus = window.Mercenary && typeof window.Mercenary.getDefenseBonus === 'function'
        ? Math.max(0, Math.min(0.9, Number(window.Mercenary.getDefenseBonus()) || 0))
        : 0;
      const nightWatchBonus = state.mercenaries && state.mercenaries.nightWatch
        ? (Number((window.GAME_CONFIG || {}).GOLD_SINK_NIGHTWATCH_DEFENSE_BONUS) || 15) / 100
        : 0;
      const totalDefenseBonus = Math.max(0, Math.min(0.9, mercBonus + nightWatchBonus));
      lossPercent *= (1 - totalDefenseBonus);

      const resourceTypes = ['wood', 'stone', 'food', 'gold'];
      const losses = {};

      resourceTypes.forEach((resourceType) => {
        const current = Math.max(0, Number(state.resources[resourceType]) || 0);
        if (current <= 0) {
          losses[resourceType] = 0;
          return;
        }
        const lossAmount = Math.floor(current * (lossPercent / 100));
        if (lossAmount > 0) {
          window.Resources.subtract(resourceType, lossAmount);
        }
        losses[resourceType] = lossAmount;
      });

      eventRuntime.runtimeData = {
        lossPercent: Number(lossPercent.toFixed(1)),
        losses,
        mercenaryBonus: Number(totalDefenseBonus.toFixed(2))
      };
      return;
    }

    if (immediateType === 'bandit_base_siege') {
      ensureRaidState(state);
      state.raids.banditBaseSiege.inProgress = true;

      const defenseScore = window.EventSystem && typeof window.EventSystem.getVillageDefenseScore === 'function'
        ? window.EventSystem.getVillageDefenseScore(state)
        : 0;
      const expeditionSuccessRate = defenseScore >= 40 ? 0.8 : 0.5;

      eventRuntime.runtimeData = {
        requiresChoice: true,
        defenseScore,
        choices: [
          {
            id: 'expedition',
            label: '원정대 파견',
            description: '⚔️ 무기 20 + 💰 금화 100',
            successRate: expeditionSuccessRate,
            canAfford: (Number(state.resources.weapons) || 0) >= 20 && (Number(state.resources.gold) || 0) >= 100
          },
          {
            id: 'mercenary',
            label: '용병 고용 파견',
            description: '💰 금화 300',
            successRate: 0.95,
            canAfford: (Number(state.resources.gold) || 0) >= 300
          },
          {
            id: 'ignore',
            label: '무시하기',
            description: '비용 없음 (이후 도적 습격 빈도 증가)',
            successRate: 0,
            canAfford: true
          }
        ]
      };
      return;
    }

    if (immediateType === 'plague_damage') {
      if (state.stats) {
        state.stats.plaguesSurvived = (Number(state.stats.plaguesSurvived) || 0) + 1;
      }

      if (getBuildingCount('cathedral') > 0) {
        eventRuntime.runtimeData = { populationLoss: 0, preventedByCathedral: true };
        return;
      }

      let loss = randomInt(1, 2);
      if (getBuildingCount('church') > 0) {
        loss = Math.max(1, Math.floor(loss * 0.5));
      }

      const before = state.population.current;
      state.population.current = Math.max(0, state.population.current - loss);
      const actualLoss = before - state.population.current;
      if (window.Utils && typeof window.Utils.clampPopulation === 'function') {
        window.Utils.clampPopulation(state);
      }

      eventRuntime.runtimeData = { populationLoss: actualLoss };
      dispatchEvent('populationChanged', {
        current: state.population.current,
        max: state.population.max,
        idle: state.population.idle,
        employed: state.population.employed
      });
      return;
    }

    if (immediateType === 'festival_boost') {
      state.happiness.current = Math.min(100, (Number(state.happiness && state.happiness.current) || 50) + 20);
      const festivalGold = 50;
      window.Resources.add('gold', festivalGold);
      eventRuntime.runtimeData = { happinessGain: 20, goldGain: festivalGold };
      return;
    }

    if (immediateType === 'royal_gold') {
      const goldGain = randomInt(150, 250);
      window.Resources.add('gold', goldGain);
      eventRuntime.runtimeData = { goldGain };
      return;
    }

    if (immediateType === 'craftsman_boost') {
      if (window.Buildings && window.Buildings.definitions && Array.isArray(state.buildings)) {
        const availableTypes = Array.from(new Set(state.buildings
          .map((building) => building.type)
          .filter((type) => {
            const def = window.Buildings.definitions[type];
            return def && Object.keys(def.production || {}).length > 0;
          })));
        if (availableTypes.length > 0) {
          const pickedType = availableTypes[randomInt(0, availableTypes.length - 1)];
          eventRuntime.runtimeData = { craftsmanTargetBuildingType: pickedType };
        }
      }
      return;
    }

    if (immediateType === 'fire_damage') {
      const hasWall = getBuildingCount('wall') > 0;
      if (hasWall && Math.random() < 0.5) {
        eventRuntime.runtimeData = { preventedByWall: true };
        return;
      }

      if (!Array.isArray(state.buildings) || state.buildings.length === 0) {
        eventRuntime.runtimeData = { damaged: false };
        return;
      }

      const target = state.buildings[randomInt(0, state.buildings.length - 1)];
      const workersLost = Math.max(0, Number(target.workers) || 0);
      if (workersLost > 0) {
        state.population.employed = Math.max(0, (Number(state.population.employed) || 0) - workersLost);
        state.population.idle = (Number(state.population.idle) || 0) + workersLost;
      }
      target.workers = 0;
      target.needsRepair = true;

      if (window.Utils && typeof window.Utils.clampPopulation === 'function') {
        window.Utils.clampPopulation(state);
      }

      eventRuntime.runtimeData = {
        damaged: true,
        buildingId: target.id,
        buildingType: target.type,
        workersLost
      };
      return;
    }

    if (immediateType === 'food_loss') {
      const currentFood = Math.max(0, Number(state.resources.food) || 0);
      const foodLoss = Math.floor(currentFood * 0.2);
      if (foodLoss > 0) {
        window.Resources.subtract('food', foodLoss);
      }
      eventRuntime.runtimeData = { foodLoss };
      return;
    }

    if (immediateType === 'tax_loss') {
      const currentGold = Math.max(0, Number(state.resources.gold) || 0);
      const goldLoss = Math.floor(currentGold * 0.15);
      if (goldLoss > 0) {
        window.Resources.subtract('gold', goldLoss);
      }
      eventRuntime.runtimeData = { goldLoss };
      return;
    }

    if (immediateType === 'diplomat_offer') {
      const payGold = 100;
      const gainAmount = 50;
      const canAfford = (Number(state.resources.gold) || 0) >= payGold;
      eventRuntime.runtimeData = {
        requiresChoice: true,
        choices: [
          { id: 'gold', label: '금화 거래', description: `💰 ${payGold} 지불 → 💰 ${gainAmount * 2} 획득`, canAfford },
          { id: 'resource', label: '자원 교환', description: `💰 ${payGold} 지불 → 자원 ${gainAmount} 획득`, canAfford },
          { id: 'decline', label: '거절', description: '외교 사절을 돌려보냅니다.', canAfford: true }
        ],
        payGold,
        gainAmount
      };
      return;
    }

    if (immediateType === 'fortune_tell') {
      const nowGameTime = Math.max(0, Number(state.stats && state.stats.gameTime) || 0);
      const definitions = window.EventSystem && Array.isArray(window.EventSystem.definitions)
        ? window.EventSystem.definitions
        : [];
      const candidates = definitions.filter((eventDef) => {
        return eventDef.id !== eventRuntime.id && nowGameTime >= (Number(eventDef.minGameTime) || 0);
      });
      const predicted = weightedPick(candidates);
      eventRuntime.runtimeData = {
        nextEventHint: predicted ? {
          id: predicted.id,
          name: predicted.name,
          type: predicted.type
        } : null
      };
      return;
    }

    if (immediateType === 'troupe_show') {
      state.happiness.current = Math.min(100, (Number(state.happiness && state.happiness.current) || 50) + 10);
      eventRuntime.runtimeData = { happinessGain: 10 };
    }
  }

  // ── 선택형 이벤트 처리 ────────────────────────────────────────────
  // ctx: { getActiveEvent(), clearActiveEvent() }
  // clearActiveEvent()는 activeEvent = null + syncEventState()를 수행한다 (events.js 제공)

  function resolveChoice(choiceId, ctx) {
    try {
      const state = window.Utils && typeof window.Utils.getState === 'function'
        ? window.Utils.getState()
        : null;
      if (!state || !window.Resources) {
        return null;
      }

      const event = ctx.getActiveEvent();
      if (!event) {
        return null;
      }

      if (event.id === 'diplomat') {
        const data = event.runtimeData || {};
        const payGold = Number(data.payGold) || 100;
        const gainAmount = Number(data.gainAmount) || 50;
        const canAfford = (Number(state.resources.gold) || 0) >= payGold;

        if (choiceId === 'decline') {
          ctx.clearActiveEvent();
          dispatchEvent('eventResolved', { event });
          return { eventId: event.id, choiceId, result: 'declined' };
        }

        if (!canAfford) {
          return { eventId: event.id, choiceId, result: 'insufficient_gold' };
        }

        window.Resources.subtract('gold', payGold);

        let result = {};
        if (choiceId === 'gold') {
          const goldGain = gainAmount * 2;
          window.Resources.add('gold', goldGain);
          result = { eventId: event.id, choiceId, goldGain };
        } else if (choiceId === 'resource') {
          const resourceOptions = ['wood', 'stone', 'food'];
          const picked = resourceOptions[randomInt(0, resourceOptions.length - 1)];
          window.Resources.add(picked, gainAmount);
          result = { eventId: event.id, choiceId, resource: picked, amount: gainAmount };
        }

        ctx.clearActiveEvent();
        dispatchEvent('eventResolved', { event });
        dispatchEvent('diplomatChoiceResolved', { result });
        return result;
      }

      if (event.id === 'bandit_base_siege') {
        ensureRaidState(state);
        const siegeState = state.raids.banditBaseSiege;
        const defenseScore = window.EventSystem && typeof window.EventSystem.getVillageDefenseScore === 'function'
          ? window.EventSystem.getVillageDefenseScore(state)
          : 0;
        let successRate = 0;

        if (choiceId === 'expedition') {
          if ((Number(state.resources.weapons) || 0) < 20 || (Number(state.resources.gold) || 0) < 100) {
            return { eventId: event.id, choiceId, result: 'insufficient_resources' };
          }
          window.Resources.subtract('weapons', 20);
          window.Resources.subtract('gold', 100);
          successRate = defenseScore >= 40 ? 0.8 : 0.5;
        } else if (choiceId === 'mercenary') {
          if ((Number(state.resources.gold) || 0) < 300) {
            return { eventId: event.id, choiceId, result: 'insufficient_gold' };
          }
          window.Resources.subtract('gold', 300);
          successRate = 0.95;
        } else if (choiceId === 'ignore') {
          state.raids.enhanced = true;
          siegeState.inProgress = false;
          siegeState.success = false;
          siegeState.resolved = true;
          siegeState.lastChoice = 'ignore';

          ctx.clearActiveEvent();
          dispatchEvent('eventResolved', { event });
          return { eventId: event.id, choiceId, result: 'ignored' };
        } else {
          return { eventId: event.id, choiceId, result: 'invalid_choice' };
        }

        const success = Math.random() < successRate;
        if (success) {
          window.Resources.add('gold', 200);
          window.Resources.add('weapons', 10);
          siegeState.success = true;
          siegeState.resolved = true;
          siegeState.inProgress = false;
          siegeState.lastChoice = choiceId;
        } else {
          state.happiness.current = Math.max(0, (Number(state.happiness && state.happiness.current) || 50) - 15);
          state.population.current = Math.max(0, (Number(state.population.current) || 0) - 2);
          if (window.Utils && typeof window.Utils.clampPopulation === 'function') {
            window.Utils.clampPopulation(state);
          }
          siegeState.success = false;
          siegeState.resolved = true;
          siegeState.inProgress = false;
          siegeState.lastChoice = choiceId;
        }

        ctx.clearActiveEvent();
        dispatchEvent('eventResolved', { event });
        dispatchEvent('banditBaseSiegeResolved', {
          success,
          choiceId,
          successRate,
          defenseScore
        });

        return {
          eventId: event.id,
          choiceId,
          success,
          successRate,
          defenseScore,
          result: success ? 'success' : 'fail'
        };
      }

      return null;
    } catch (error) {
      console.error('[EventEffects.resolveChoice] 선택 처리 실패:', error);
      return null;
    }
  }

  window.EventEffects = {
    applyImmediateEffect,
    resolveChoice
  };
})();
