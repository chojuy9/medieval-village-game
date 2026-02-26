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

  // XML(GameData.events)에서 이벤트 정의를 읽어옵니다.
  const eventDefinitions = (window.GameData && Array.isArray(window.GameData.events)) ? window.GameData.events : [
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
      id: 'bandit_base_siege',
      name: '🏹 도적기지 침공',
      type: 'neutral',
      description: '도적들의 근거지를 소탕할 기회입니다. 결단을 내려야 합니다.',
      duration: 0,
      weight: 1,
      minGameTime: 900,
      effect: {
        immediate: 'bandit_base_siege'
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

    ensureRaidState(state);

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

  function dispatchEvent(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function randomInt(min, max) {
    const safeMin = Math.ceil(min);
    const safeMax = Math.floor(max);
    return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
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

    getVillageDefenseScore(stateArg) {
      const state = stateArg || (window.Utils && typeof window.Utils.getState === 'function'
        ? window.Utils.getState()
        : null);
      if (!state) {
        return 0;
      }

      const wallDefense = getBuildingCount('wall') * 20;
      const mercenaryDefense = window.Mercenary && typeof window.Mercenary.getDefenseBonus === 'function'
        ? (Math.max(0, Number(window.Mercenary.getDefenseBonus()) || 0) * 100)
        : 0;
      const nightWatchDefense = state.mercenaries && state.mercenaries.nightWatch
        ? (Number((window.GAME_CONFIG || {}).GOLD_SINK_NIGHTWATCH_DEFENSE_BONUS) || 15)
        : 0;

      return Math.max(0, Math.round(wallDefense + mercenaryDefense + nightWatchDefense));
    },

    canTriggerBanditBaseSiege(gameTime, stateArg) {
      const state = stateArg || (window.Utils && typeof window.Utils.getState === 'function'
        ? window.Utils.getState()
        : null);
      if (!state) {
        return false;
      }

      ensureRaidState(state);
      const config = window.GAME_CONFIG || {};
      const minTime = Number(config.BANDIT_BASE_SIEGE_TRIGGER_TIME) || 900;
      const requiredRaids = Number(config.BANDIT_BASE_SIEGE_REQUIRED_RAIDS) || 3;
      const nowGameTime = Math.max(0, Number(gameTime) || 0);
      const hasWall = getBuildingCount('wall') >= 1;
      const siegeState = state.raids.banditBaseSiege || {};

      return nowGameTime >= minTime
        && (Number(state.raids.count) || 0) >= requiredRaids
        && hasWall
        && !siegeState.inProgress
        && !siegeState.success
        && !siegeState.resolved;
    },

    check(gameTime) {
      try {
        const state = ensureEventState();
        this.CHECK_INTERVAL = getCheckInterval();
        this.EVENT_CHANCE = getEventChance();

        if (activeEvent) {
          return false;
        }

        const nowGameTime = Math.max(0, Number(gameTime) || 0);
        if (nowGameTime - lastCheckTime < this.CHECK_INTERVAL) {
          return false;
        }

        if (this.canTriggerBanditBaseSiege(nowGameTime, state)) {
          lastCheckTime = nowGameTime;
          syncEventState();
          const siegeDef = eventDefinitions.find((eventDef) => eventDef.id === 'bandit_base_siege');
          if (siegeDef) {
            this.trigger(siegeDef);
            return true;
          }
        }

        // 체크 시점 갱신 (실패/성공 모두 동일 주기 유지)
        lastCheckTime = nowGameTime;
        syncEventState();

        if (Math.random() > this.EVENT_CHANCE) {
          return false;
        }

        const candidates = eventDefinitions
          .filter((eventDef) => eventDef.id !== 'bandit_base_siege')
          .filter((eventDef) => nowGameTime >= (Number(eventDef.minGameTime) || 0))
          .map((eventDef) => {
            let runtimeWeight = Number(eventDef.weight) || 0;
            if (eventDef.id === 'bandit_raid') {
              if (state && state.mercenaries && state.mercenaries.nightWatch) {
                const reduction = Number((window.GAME_CONFIG || {}).GOLD_SINK_NIGHTWATCH_RAID_REDUCTION) || 0.3;
                runtimeWeight *= Math.max(0, 1 - reduction);
              }
              if (state && state.raids && state.raids.enhanced) {
                runtimeWeight *= 1.3;
              }
            }
            return {
              ...eventDef,
              runtimeWeight
            };
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



        EventEffects.applyImmediateEffect(runtimeEvent);
        const isChoiceEvent = Boolean(runtimeEvent.runtimeData && runtimeEvent.runtimeData.requiresChoice);
        if ((Number(runtimeEvent.duration) || 0) > 0 || isChoiceEvent) {
          activeEvent = runtimeEvent;
        } else {
          activeEvent = null;
        }
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
        const state = ensureEventState();
        if (state && resolvedEvent && resolvedEvent.id === 'bandit_base_siege') {
          ensureRaidState(state);
          state.raids.banditBaseSiege.inProgress = false;
        }
        syncEventState();



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
   * 실제 로직은 EventEffects.resolveChoice에 위임합니다.
   * @param {string} choiceId
   * @returns {object|null}
   */
  EventSystem.resolveChoice = function (choiceId) {
    return EventEffects.resolveChoice(choiceId, {
      getActiveEvent: () => activeEvent,
      clearActiveEvent: () => {
        activeEvent = null;
        syncEventState();
      }
    });
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
