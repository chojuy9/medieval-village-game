(function () {
  'use strict';

  function getCheckInterval() {
    const config = window.GAME_CONFIG || {};
    return Math.max(1, Number(config.EVENT_CHECK_INTERVAL) || 90);
  }

  function getEventChance() {
    const config = window.GAME_CONFIG || {};
    const chance = Number(config.EVENT_CHANCE);
    if (!Number.isFinite(chance)) {
      return 0.4;
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
      weight: 10,
      minGameTime: 240,
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
      let lossPercent = randomInt(10, 20);
      if (getBuildingCount('wall') > 0) {
        if (state.stats) {
          state.stats.raidsDefended = (Number(state.stats.raidsDefended) || 0) + 1;
        }
        lossPercent *= 0.5;
      }

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
        losses
      };
      return;
    }

    if (immediateType === 'plague_damage') {
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

      if (activeEvent.id === 'plague' && activeEvent.effect.foodConsumptionMultiplier) {
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
    }
  };

  window.EventSystem = EventSystem;
})();
