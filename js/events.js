(function () {
  'use strict';

  function getCheckInterval() {
    const config = window.GAME_CONFIG || {};
    return Math.max(1, Number(config.EVENT_CHECK_INTERVAL) || 45);
  }

  function getEventChance() {
    const config = window.GAME_CONFIG || {};
    const chance = Number(config.EVENT_CHANCE);
    if (!Number.isFinite(chance)) {
      return 0.5;
    }
    return Math.max(0, Math.min(1, chance));
  }

  const eventDefinitions = [
    {
      id: 'bumper_harvest',
      name: '🌾 풍년',
      type: 'positive',
      description: '올해 수확이 풍성합니다! 식량 생산이 크게 증가합니다.',
      duration: 60,
      weight: 20,
      minGameTime: 120,
      effect: {
        productionMultiplier: { food: 1.5 }
      }
    },
    {
      id: 'wandering_merchant',
      name: '🧳 떠돌이 상인',
      type: 'positive',
      description: '상단이 마을에 들러 금화 거래를 남겼습니다.',
      duration: 60,
      weight: 15,
      minGameTime: 90,
      effect: {
        immediate: 'merchant_trade',
        tradeDiscountMultiplier: 0.7
      }
    },
    {
      id: 'migrant_arrival',
      name: '👥 이주민 유입',
      type: 'positive',
      description: '새로운 주민들이 마을에 정착했습니다.',
      duration: 0,
      weight: 10,
      minGameTime: 90,
      effect: {
        immediate: 'population_gain'
      }
    },
    {
      id: 'traveling_peddler',
      name: '🛒 지나가는 행상',
      type: 'neutral',
      description: '행상이 자원 꾸러미를 두고 갔습니다.',
      duration: 0,
      weight: 20,
      minGameTime: 60,
      effect: {
        immediate: 'small_resource_gain'
      }
    },
    {
      id: 'royal_decree',
      name: '📜 왕의 칙령',
      type: 'neutral',
      description: '특정 건물 건설비가 일시적으로 감소합니다.',
      duration: 90,
      weight: 10,
      minGameTime: 180,
      effect: {
        targetBuildingDiscount: 0.8
      }
    },
    {
      id: 'bandit_raid',
      name: '⚔️ 도적 습격',
      type: 'negative',
      description: '도적들이 자원을 약탈했습니다.',
      duration: 0,
      weight: 20,
      minGameTime: 150,
      effect: {
        immediate: 'resource_raid'
      }
    },
    {
      id: 'famine',
      name: '🥀 흉년',
      type: 'negative',
      description: '작황이 나빠 식량 생산이 감소합니다.',
      duration: 60,
      weight: 10,
      minGameTime: 180,
      effect: {
        productionMultiplier: { food: 0.7 }
      }
    },
    {
      id: 'plague',
      name: '☠️ 역병',
      type: 'negative',
      description: '역병이 퍼져 인구가 감소했습니다.',
      duration: 60,
      weight: 5,
      minGameTime: 300,
      effect: {
        immediate: 'plague_damage',
        foodConsumptionMultiplier: 1.3
      }
    },
    {
      id: 'festival',
      name: '🎪 축제',
      type: 'positive',
      description: '마을에 축제가 열립니다! 행복도가 크게 상승합니다.',
      duration: 60,
      weight: 12,
      minGameTime: 300,
      effect: {
        immediate: 'festival_boost'
      }
    },
    {
      id: 'supply_convoy',
      name: '📦 보급 행렬',
      type: 'positive',
      description: '왕실에서 보급품이 도착했습니다.',
      duration: 90,
      weight: 10,
      minGameTime: 240,
      effect: {
        productionMultiplier: { wood: 1.3, stone: 1.3, food: 1.3 }
      }
    },
    {
      id: 'royal_reward',
      name: '🏅 왕의 포상',
      type: 'positive',
      description: '마을의 번영에 감명받은 왕이 금화를 하사합니다.',
      duration: 0,
      weight: 8,
      minGameTime: 600,
      effect: {
        immediate: 'royal_gold'
      }
    },
    {
      id: 'master_craftsman_visit',
      name: '👨‍🌾 명장인 방문',
      type: 'positive',
      description: '명장인이 기술을 전수합니다.',
      duration: 120,
      weight: 10,
      minGameTime: 360,
      effect: {
        immediate: 'craftsman_boost'
      }
    },
    {
      id: 'bountiful_season',
      name: '🌟 풍요의 계절',
      type: 'positive',
      description: '풍요가 넘칩니다. 식량 소비가 줄어듭니다.',
      duration: 90,
      weight: 10,
      minGameTime: 180,
      effect: {
        foodConsumptionMultiplier: 0.5
      }
    },
    {
      id: 'fire',
      name: '🔥 화재',
      type: 'negative',
      description: '화재가 발생하여 건물이 손상되었습니다.',
      duration: 0,
      weight: 8,
      minGameTime: 480,
      effect: {
        immediate: 'fire_damage'
      }
    },
    {
      id: 'rat_infestation',
      name: '🐀 쥐떼',
      type: 'negative',
      description: '쥐떼가 식량 창고를 습격했습니다.',
      duration: 0,
      weight: 12,
      minGameTime: 300,
      effect: {
        immediate: 'food_loss'
      }
    },
    {
      id: 'tax_collection',
      name: '💸 세금 징수',
      type: 'negative',
      description: '왕실에서 세금을 거둬갑니다.',
      duration: 0,
      weight: 10,
      minGameTime: 360,
      effect: {
        immediate: 'tax_loss'
      }
    },
    {
      id: 'flood',
      name: '🌊 홍수',
      type: 'negative',
      description: '홍수로 농장과 벌목소가 침수되었습니다.',
      duration: 60,
      weight: 8,
      minGameTime: 420,
      effect: {
        productionMultiplier: { food: 0, wood: 0 }
      }
    },
    {
      id: 'diplomat',
      name: '⚖️ 외교 사절',
      type: 'neutral',
      description: '외교 사절이 거래를 제안합니다.',
      duration: 0,
      weight: 10,
      minGameTime: 300,
      effect: {
        immediate: 'diplomat_offer'
      }
    },
    {
      id: 'fortune_teller',
      name: '🔮 점술사',
      type: 'neutral',
      description: '점술사가 앞으로의 운명을 예언합니다.',
      duration: 0,
      weight: 8,
      minGameTime: 240,
      effect: {
        immediate: 'fortune_tell'
      }
    },
    {
      id: 'traveling_troupe',
      name: '🎭 유랑극단',
      type: 'neutral',
      description: '유랑극단이 공연을 펼칩니다.',
      duration: 60,
      weight: 12,
      minGameTime: 180,
      effect: {
        immediate: 'troupe_show'
      }
    }
  ];

  let activeEvent = null;
  let lastCheckTime = 0;

  function ensureEventState() {
    const state = window.Utils && typeof window.Utils.getState === 'function'
      ? window.Utils.getState()
      : null;
    if (!state) {
      return null;
    }

    if (!state.eventState) {
      state.eventState = {
        activeEvent: null,
        lastCheckTime: 0
      };
    }

    if (!activeEvent && state.eventState.activeEvent) {
      activeEvent = state.eventState.activeEvent;
    }

    if (lastCheckTime === 0 && state.eventState.lastCheckTime > 0) {
      lastCheckTime = Number(state.eventState.lastCheckTime) || 0;
    }

    return state;
  }

  function syncEventState() {
    const state = ensureEventState();
    if (!state) {
      return;
    }

    state.eventState.activeEvent = activeEvent ? { ...activeEvent } : null;
    state.eventState.lastCheckTime = lastCheckTime;
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

  function dispatchEvent(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function randomInt(min, max) {
    const safeMin = Math.ceil(min);
    const safeMax = Math.floor(max);
    return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
  }

  function weightedPick(events) {
    const totalWeight = events.reduce((sum, event) => sum + (Number(event.weight) || 0), 0);
    if (totalWeight <= 0) {
      return null;
    }

    let roll = Math.random() * totalWeight;
    for (const event of events) {
      roll -= Number(event.weight) || 0;
      if (roll <= 0) {
        return event;
      }
    }

    return events[events.length - 1] || null;
  }

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
      lossPercent *= (1 - mercBonus);

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
        mercenaryBonus: Number(mercBonus.toFixed(2))
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
      // 자동 수행 대신 선택 대기 — UI가 처리
      const payGold = 100;
      const gainAmount = 50;
      const canAfford = (Number(state.resources.gold) || 0) >= payGold;
      eventRuntime.runtimeData = {
        requiresChoice: true,
        choices: [
          { id: 'gold',       label: '금화 거래',    description: `💰 ${payGold} 지불 → 💰 ${gainAmount * 2} 획득`, canAfford },
          { id: 'resource',   label: '자원 교환',    description: `💰 ${payGold} 지불 → 자원 ${gainAmount} 획득`,  canAfford },
          { id: 'decline',    label: '거절',          description: '외교 사절을 돌려보냅니다.',                        canAfford: true }
        ],
        payGold,
        gainAmount
      };
      return;
    }

    if (immediateType === 'fortune_tell') {
      const nowGameTime = Math.max(0, Number(state.stats && state.stats.gameTime) || 0);
      const candidates = eventDefinitions.filter((eventDef) => {
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

  function createEventRuntime(definition) {
    const runtime = {
      ...definition,
      remainingDuration: Number(definition.duration) || 0,
      startedAt: Date.now(),
      runtimeData: {}
    };

    if (runtime.id === 'royal_decree') {
      const targetCandidates = ['lumbermill', 'quarry', 'farm', 'house', 'market', 'blacksmith', 'church', 'tavern', 'wall', 'school', 'manor'];
      runtime.runtimeData.targetBuilding = targetCandidates[randomInt(0, targetCandidates.length - 1)];
    }

    return runtime;
  }

  const EventSystem = {
    definitions: eventDefinitions,
    CHECK_INTERVAL: 90,
    EVENT_CHANCE: 0.4,

    check(gameTime) {
      try {
        ensureEventState();
        this.CHECK_INTERVAL = getCheckInterval();
        this.EVENT_CHANCE = getEventChance();

        if (activeEvent) {
          return false;
        }

        const nowGameTime = Math.max(0, Number(gameTime) || 0);
        if (nowGameTime - lastCheckTime < this.CHECK_INTERVAL) {
          return false;
        }

        // 체크 시점 갱신 (실패/성공 모두 동일 주기 유지)
        lastCheckTime = nowGameTime;
        syncEventState();

        if (Math.random() > this.EVENT_CHANCE) {
          return false;
        }

        const candidates = eventDefinitions.filter((eventDef) => {
          return nowGameTime >= (Number(eventDef.minGameTime) || 0);
        });

        if (candidates.length === 0) {
          return false;
        }

        const selected = weightedPick(candidates);
        if (!selected) {
          return false;
        }

        this.trigger(selected);
        return true;
      } catch (error) {
        console.error('[EventSystem.check] 이벤트 판정 실패:', error);
        return false;
      }
    },

    trigger(eventDefinition) {
      try {
        const runtimeEvent = createEventRuntime(eventDefinition);

        console.log('[EventSystem.trigger] 이벤트 발생:', runtimeEvent.id);

        if ((Number(runtimeEvent.duration) || 0) > 0) {
          activeEvent = runtimeEvent;
        } else {
          activeEvent = null;
        }

        applyImmediateEffect(runtimeEvent);
        syncEventState();

        dispatchEvent('eventTriggered', {
          event: runtimeEvent,
          active: Boolean(activeEvent)
        });

        return true;
      } catch (error) {
        console.error('[EventSystem.trigger] 이벤트 적용 실패:', error);
        return false;
      }
    },

    resolve() {
      try {
        if (!activeEvent) {
          return false;
        }

        const resolvedEvent = activeEvent;
        activeEvent = null;
        syncEventState();

        console.log('[EventSystem.resolve] 이벤트 종료:', resolvedEvent.id);

        dispatchEvent('eventResolved', {
          event: resolvedEvent
        });

        return true;
      } catch (error) {
        console.error('[EventSystem.resolve] 이벤트 종료 처리 실패:', error);
        return false;
      }
    },

    update(deltaTime) {
      try {
        ensureEventState();

        if (!activeEvent) {
          return false;
        }

        const dt = Math.max(0, Number(deltaTime) || 0);
        if ((Number(activeEvent.duration) || 0) <= 0) {
          return false;
        }

        activeEvent.remainingDuration = Math.max(0, (Number(activeEvent.remainingDuration) || 0) - dt);
        syncEventState();

        if (activeEvent.remainingDuration <= 0) {
          this.resolve();
        }

        return true;
      } catch (error) {
        console.error('[EventSystem.update] 활성 이벤트 타이머 업데이트 실패:', error);
        return false;
      }
    },

    getActiveEvent() {
      ensureEventState();
      return activeEvent ? { ...activeEvent } : null;
    },

    getProductionMultiplier(resourceType) {
      ensureEventState();

      if (!activeEvent || !activeEvent.effect || !activeEvent.effect.productionMultiplier) {
        return 1;
      }

      const map = activeEvent.effect.productionMultiplier;
      if (!Object.prototype.hasOwnProperty.call(map, resourceType)) {
        return 1;
      }

      return Math.max(0, Number(map[resourceType]) || 1);
    },

    getCostMultiplier(buildingType) {
      ensureEventState();

      if (!activeEvent || activeEvent.id !== 'royal_decree') {
        return 1;
      }

      const target = activeEvent.runtimeData && activeEvent.runtimeData.targetBuilding;
      if (buildingType !== target) {
        return 1;
      }

      return Math.max(0, Number(activeEvent.effect.targetBuildingDiscount) || 1);
    },

    getFoodConsumptionMultiplier() {
      ensureEventState();

      if (!activeEvent || !activeEvent.effect) {
        return 1;
      }

      if (activeEvent.effect.foodConsumptionMultiplier) {
        return Math.max(0, Number(activeEvent.effect.foodConsumptionMultiplier) || 1);
      }

      return 1;
    },

    getTradeDiscountMultiplier() {
      ensureEventState();

      if (!activeEvent || activeEvent.id !== 'wandering_merchant' || !activeEvent.effect) {
        return 1;
      }

      return Math.max(0, Number(activeEvent.effect.tradeDiscountMultiplier) || 1);
    },

    getBuildingProductionMultiplier(buildingType) {
      ensureEventState();

      if (!activeEvent || activeEvent.id !== 'master_craftsman_visit') {
        return 1;
      }

      const target = activeEvent.runtimeData && activeEvent.runtimeData.craftsmanTargetBuildingType;
      if (!target || target !== buildingType) {
        return 1;
      }

      return 2;
    }
  };

  /**
   * 선택형 이벤트의 선택지를 처리합니다.
   * @param {string} choiceId - 'gold' | 'resource' | 'decline'
   * @returns {object|null} 처리 결과
   */
  EventSystem.resolveChoice = function (choiceId) {
    try {
      const state = window.Utils && typeof window.Utils.getState === 'function'
        ? window.Utils.getState()
        : null;
      if (!state || !window.Resources) {
        return null;
      }

      const event = activeEvent;
      if (!event || event.id !== 'diplomat') {
        return null;
      }

      const data = event.runtimeData || {};
      const payGold = Number(data.payGold) || 100;
      const gainAmount = Number(data.gainAmount) || 50;
      const canAfford = (Number(state.resources.gold) || 0) >= payGold;

      if (choiceId === 'decline') {
        activeEvent = null;
        syncEventState();
        dispatchEvent('eventResolved', { event });
        return { choiceId, result: 'declined' };
      }

      if (!canAfford) {
        return { choiceId, result: 'insufficient_gold' };
      }

      window.Resources.subtract('gold', payGold);

      let result = {};
      if (choiceId === 'gold') {
        const goldGain = gainAmount * 2;
        window.Resources.add('gold', goldGain);
        result = { choiceId, goldGain };
      } else if (choiceId === 'resource') {
        const resourceOptions = ['wood', 'stone', 'food'];
        const picked = resourceOptions[randomInt(0, resourceOptions.length - 1)];
        window.Resources.add(picked, gainAmount);
        result = { choiceId, resource: picked, amount: gainAmount };
      }

      activeEvent = null;
      syncEventState();
      dispatchEvent('eventResolved', { event });
      dispatchEvent('diplomatChoiceResolved', { result });
      return result;
    } catch (error) {
      console.error('[EventSystem.resolveChoice] 선택 처리 실패:', error);
      return null;
    }
  };

  /**
   * 이벤트를 강제로 발동합니다 (디버그/테스트용).
   * @param {string} eventId - 이벤트 ID
   * @returns {boolean}
   */
  EventSystem.forceEvent = function (eventId) {
    try {
      if (!eventId) {
        console.warn('[EventSystem.forceEvent] 이벤트 ID가 없습니다. 사용 가능한 ID:', eventDefinitions.map(function (e) { return e.id; }));
        return false;
      }
      const definition = eventDefinitions.find(function (e) { return e.id === eventId; });
      if (!definition) {
        console.warn('[EventSystem.forceEvent] 알 수 없는 이벤트 ID:', eventId, '사용 가능:', eventDefinitions.map(function (e) { return e.id; }));
        return false;
      }
      if (activeEvent) {
        activeEvent = null;
        syncEventState();
      }
      return this.trigger(definition);
    } catch (error) {
      console.error('[EventSystem.forceEvent] 강제 발동 실패:', error);
      return false;
    }
  };

  /**
   * 현재 활성 이벤트를 강제 종료합니다 (디버그용).
   * @returns {boolean}
   */
  EventSystem.clearActiveEvent = function () {
    return this.resolve();
  };

  /**
   * 사용 가능한 이벤트 목록을 출력합니다 (디버그용).
   */
  EventSystem.listEvents = function () {
    console.table(eventDefinitions.map(function (e) {
      return { id: e.id, name: e.name, type: e.type, duration: e.duration, minGameTime: e.minGameTime };
    }));
  };

  window.EventSystem = EventSystem;
})();
