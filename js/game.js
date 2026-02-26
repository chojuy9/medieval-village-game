(function () {
  'use strict';

  // Note: DEFAULT_RESEARCH_TREE는 이제 research.js (RESEARCH_TREE)에 있습니다.
  // Note: GAME_CONFIG는 이제 config.js에 있습니다.
  // Note: 상태 관련 함수들(createInitialState 등)은 game-state.js (GameState)에 있습니다.
  // Note: 건물 조작 함수들(buildBuilding 등)은 game-buildings.js (GameBuildings)에 있습니다.

  let gameState = GameState.createInitialState();
  let intervalId = null;

  function getCurrentSeasonPayload() {
    const seasonFallback = {
      id: 'spring',
      name: '🌸 봄'
    };

    if (!window.Seasons || typeof window.Seasons.getCurrentSeason !== 'function') {
      return {
        season: seasonFallback,
        index: 0
      };
    }

    const season = window.Seasons.getCurrentSeason(gameState.stats.gameTime) || seasonFallback;
    const index = typeof window.Seasons.getCurrentSeasonIndex === 'function'
      ? window.Seasons.getCurrentSeasonIndex(gameState.stats.gameTime)
      : 0;

    return { season, index };
  }

  function dispatchGameStateChanged() {
    const seasonPayload = getCurrentSeasonPayload();
    document.dispatchEvent(new CustomEvent('gameStateChanged', {
      detail: {
        resources: { ...gameState.resources },
        population: { ...gameState.population },
        buildings: [...gameState.buildings],
        happiness: {
          current: Number(gameState.happiness && gameState.happiness.current) || 50,
          factors: { ...(gameState.happiness && gameState.happiness.factors ? gameState.happiness.factors : {}) }
        },
        season: {
          ...seasonPayload.season,
          index: seasonPayload.index
        }
      }
    }));
  }

  function getResearchTree() {
    if (window.Research && typeof window.Research.getTree === 'function') {
      return window.Research.getTree();
    }
    return DEFAULT_RESEARCH_TREE;
  }

  function getResearchById(researchId) {
    if (!researchId) {
      return null;
    }
    if (window.Research && typeof window.Research.getById === 'function') {
      return window.Research.getById(researchId);
    }

    const tree = getResearchTree();
    return tree[researchId] || null;
  }

  function applyResearchEffect(effect) {
    if (!effect) {
      return;
    }

    GameState.ensureResearchState(gameState);

    if (effect.type === 'production_bonus' && effect.target) {
      gameState.research.bonuses.production[effect.target] =
        (Number(gameState.research.bonuses.production[effect.target]) || 0) + (Number(effect.bonus) || 0);
    }

    if (effect.type === 'trade_bonus') {
      gameState.research.bonuses.trade += Number(effect.bonus) || 0;
    }

    if (effect.type === 'building_bonus' && effect.target) {
      gameState.research.bonuses.building[effect.target] =
        (Number(gameState.research.bonuses.building[effect.target]) || 0) + (Number(effect.bonus) || 0);
    }
  }

  // Note: Production 관련 함수들은 이제 production.js (ProductionUtils)에 있습니다.

  function getResourceMultiplier(resourceType) {
    return window.ProductionUtils
      ? ProductionUtils.getResourceMultiplier(resourceType, gameState)
      : 1;
  }

  function getBuildingResearchBonus(buildingType) {
    return window.ProductionUtils
      ? ProductionUtils.getBuildingResearchBonus(buildingType, gameState)
      : 0;
  }

  function canOperateBuilding(building, definition, deltaTime) {
    return window.ProductionUtils
      ? ProductionUtils.canOperateBuilding(building, definition, deltaTime, gameState)
      : { ok: false, missingResources: {} };
  }

  function processProductionTier(tier, deltaTime) {
    if (window.ProductionUtils) {
      ProductionUtils.processProductionTier(tier, deltaTime, gameState);
    }
  }

  function getResearchSpeedMultiplier() {
    const schoolCount = GameBuildings.getBuildingCountFromState(gameState, 'school');
    if (schoolCount <= 0) {
      return 0;
    }
    return 1 + Math.max(0, schoolCount - 1) * 0.5;
  }

  function updateResearch(deltaTime) {
    if (!gameState.research || !gameState.research.current) {
      return;
    }

    const tech = getResearchById(gameState.research.current);
    if (!tech) {
      gameState.research.current = null;
      gameState.research.progress = 0;
      return;
    }

    const speedMultiplier = getResearchSpeedMultiplier();
    if (speedMultiplier <= 0) {
      return;
    }

    gameState.research.progress += deltaTime * speedMultiplier;

    document.dispatchEvent(new CustomEvent('researchProgress', {
      detail: {
        researchId: gameState.research.current,
        progress: gameState.research.progress,
        total: Number(tech.researchTime) || 0
      }
    }));

    if (gameState.research.progress >= (Number(tech.researchTime) || 0)) {
      const completedId = gameState.research.current;
      gameState.research.completed.push(completedId);
      applyResearchEffect(tech.effect);

      document.dispatchEvent(new CustomEvent('researchCompleted', {
        detail: { researchId: completedId, tech }
      }));

      gameState.research.current = null;
      gameState.research.progress = 0;
    }
  }

  function calculateTotalConsumption(state) {
    const total = {};

    if (!state || !Array.isArray(state.buildings) || !window.Buildings) {
      return total;
    }

    state.buildings.forEach((building) => {
      const def = window.Buildings.definitions[building.type];
      if (!def) {
        return;
      }

      const workersNeeded = Math.max(0, Number(def.workersNeeded) || 0);
      if (workersNeeded > 0 && (Number(building.workers) || 0) <= 0) {
        return;
      }

      Object.keys(def.consumption || {}).forEach((resourceType) => {
        total[resourceType] = (total[resourceType] || 0) + (Number(def.consumption[resourceType]) || 0);
      });
    });

    const threshold = Math.max(0, Number(GAME_CONFIG.FOOD_SCALING_THRESHOLD) || 25);
    const base = Number(GAME_CONFIG.FOOD_CONSUMPTION_PER_PERSON) || 0.1;
    const scaled = Number(GAME_CONFIG.FOOD_CONSUMPTION_SCALED) || 0.12;
    const perPerson = (Number(state.population.current) || 0) >= threshold ? scaled : base;

    total.food = (total.food || 0) + (Number(state.population.current) || 0) * perPerson;

    const config = GAME_CONFIG || {};
    const breadPerPerson = Number(config.BREAD_CONSUMPTION_PER_PERSON) || 0.03;
    const toolMaintenancePerBuilding = Number(config.TOOLS_MAINTENANCE_PER_TIER2_BUILDING) || 0.008;
    const nightWatchGoldPerSec = Number(config.GOLD_SINK_NIGHTWATCH_GOLD_PER_SEC) || 5;

    total.bread = (total.bread || 0) + (Number(state.population.current) || 0) * breadPerPerson;
    total.tools = (total.tools || 0) + GameBuildings.getTier2PlusBuildingCount(state) * toolMaintenancePerBuilding;

    if (state.mercenaries && state.mercenaries.nightWatch) {
      total.gold = (total.gold || 0) + nightWatchGoldPerSec;
    }

    return total;
  }

  function applyGoldSinkUpkeep(deltaTime) {
    if (!window.Resources || !gameState.mercenaries || !gameState.mercenaries.nightWatch) {
      return;
    }

    const dt = Math.max(0, Number(deltaTime) || 0);
    if (dt <= 0) {
      return;
    }

    const config = GAME_CONFIG || {};
    const goldPerSec = Number(config.GOLD_SINK_NIGHTWATCH_GOLD_PER_SEC) || 5;
    const requiredGold = goldPerSec * dt;
    const currentGold = Number(gameState.resources.gold) || 0;

    if (currentGold >= requiredGold) {
      window.Resources.subtract('gold', requiredGold);
      gameState.warnings.nightWatchAutoDisabled = false;
      return;
    }

    if (currentGold > 0) {
      window.Resources.subtract('gold', currentGold);
    }

    gameState.mercenaries.nightWatch = false;
    gameState.warnings.nightWatchAutoDisabled = true;

    document.dispatchEvent(new CustomEvent('nightWatchAutoDisabled', {
      detail: { reason: 'gold' }
    }));
  }

  function ensureResearchModuleFallback() {
    if (window.Research) {
      return;
    }

    window.Research = {
      getTree() {
        return { ...DEFAULT_RESEARCH_TREE };
      },
      getById(researchId) {
        return DEFAULT_RESEARCH_TREE[researchId] || null;
      },
      requiresForBuilding(buildingType) {
        const map = {
          sawmill: ['advanced_woodworking'],
          bakery: ['baking'],
          stonemason: ['masonry']
        };
        return map[buildingType] ? [...map[buildingType]] : [];
      },
      canStartResearch(researchId) {
        const tech = DEFAULT_RESEARCH_TREE[researchId];
        if (!tech || !window.Game || !window.Game.state || !window.Resources) {
          return false;
        }

        const state = window.Game.state;
        const hasSchool = Array.isArray(state.buildings) && state.buildings.some((b) => b.type === 'school');
        if (!hasSchool || state.research.current) {
          return false;
        }

        if (state.research.completed.includes(researchId)) {
          return false;
        }

        return window.Resources.hasEnough(tech.cost);
      },
      startResearch(researchId) {
        return window.Game && typeof window.Game.startResearch === 'function'
          ? window.Game.startResearch(researchId)
          : false;
      }
    };
  }

  const Game = {
    get state() {
      return gameState;
    },

    getResearchProductionBonus(buildingType) {
      return getBuildingResearchBonus(buildingType);
    },

    getResearchTradeBonus() {
      return Number(gameState.research && gameState.research.bonuses && gameState.research.bonuses.trade) || 0;
    },

    getResearchBuildingBonus(buildingType) {
      return Number(gameState.research && gameState.research.bonuses
        && gameState.research.bonuses.building && gameState.research.bonuses.building[buildingType]) || 0;
    },

    startResearch(researchId) {
      try {
        const tech = getResearchById(researchId);
        if (!tech || !window.Resources || !gameState.research) {
          return false;
        }

        const schoolCount = GameBuildings.getBuildingCountFromState(gameState, 'school');
        if (schoolCount <= 0 || gameState.research.current) {
          return false;
        }

        if (gameState.research.completed.includes(researchId)) {
          return false;
        }

        const prereqs = Array.isArray(tech.requires) ? tech.requires : [];
        if (!prereqs.every((id) => gameState.research.completed.includes(id))) {
          return false;
        }

        if (!window.Resources.hasEnough(tech.cost)) {
          return false;
        }

        Object.keys(tech.cost || {}).forEach((resourceType) => {
          const amount = Math.max(0, Number(tech.cost[resourceType]) || 0);
          if (amount > 0) {
            window.Resources.subtract(resourceType, amount);
          }
        });

        gameState.research.current = researchId;
        gameState.research.progress = 0;

        document.dispatchEvent(new CustomEvent('researchStarted', {
          detail: { researchId, tech }
        }));

        return true;
      } catch (error) {
        console.error('[Game.startResearch] 연구 시작 실패:', error);
        return false;
      }
    },

    init() {
      try {


        ensureResearchModuleFallback();

        window.__MEDIEVAL_GAME_STATE = gameState;
        this.load();

        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }

        gameState.timers.lastUpdate = Date.now();

        intervalId = setInterval(() => {
          this.update();
        }, GAME_CONFIG.UPDATE_INTERVAL);

        dispatchGameStateChanged();

      } catch (error) {
        console.error('[Game.init] 초기화 실패:', error);
      }
    },

    update() {
      try {
        const now = Date.now();
        const deltaTime = Math.max(0, (now - gameState.timers.lastUpdate) / 1000);
        const previousSeason = getCurrentSeasonPayload();
        const previousHappiness = Number(gameState.happiness && gameState.happiness.current) || 50;
        gameState.timers.lastUpdate = now;

        if (previousSeason.season && previousSeason.season.id) {
          const seasonsExperienced = new Set(Array.isArray(gameState.stats.seasonsExperienced)
            ? gameState.stats.seasonsExperienced
            : []);
          seasonsExperienced.add(previousSeason.season.id);
          gameState.stats.seasonsExperienced = Array.from(seasonsExperienced);
        }

        gameState.stats.gameTime += deltaTime;

        processProductionTier(1, deltaTime);
        processProductionTier(2, deltaTime);
        processProductionTier(3, deltaTime);

        if (window.Mercenary && typeof window.Mercenary.update === 'function') {
          window.Mercenary.update(deltaTime);
        }

        if (window.Population) {
          window.Population.consume(deltaTime);
          window.Population.updateGrowth(deltaTime);
          window.Population.updateDecline(deltaTime);
        }

        applyGoldSinkUpkeep(deltaTime);

        if (window.EventSystem) {
          window.EventSystem.check(gameState.stats.gameTime);
          window.EventSystem.update(deltaTime);
        }

        if (window.Happiness && typeof window.Happiness.calculate === 'function') {
          const nextHappiness = window.Happiness.calculate();
          gameState.happiness = {
            current: Math.max(0, Math.min(100, Number(nextHappiness.current) || 50)),
            factors: nextHappiness.factors || {}
          };

          if (gameState.happiness.current !== previousHappiness) {
            document.dispatchEvent(new CustomEvent('happinessChanged', {
              detail: {
                current: gameState.happiness.current,
                factors: { ...gameState.happiness.factors }
              }
            }));
          }
        }

        if (gameState.stats.gameTime % 5 < deltaTime && window.Achievements && typeof window.Achievements.check === 'function') {
          window.Achievements.check(gameState);
        }

        gameState.stats.maxPopulation = Math.max(
          Number(gameState.stats.maxPopulation) || 0,
          Number(gameState.population.current) || 0
        );

        const nextSeason = getCurrentSeasonPayload();
        if (nextSeason.index !== previousSeason.index) {
          const seasonId = nextSeason.season && nextSeason.season.id;
          if (seasonId) {
            const seasonsExperienced = new Set(Array.isArray(gameState.stats.seasonsExperienced)
              ? gameState.stats.seasonsExperienced
              : []);
            seasonsExperienced.add(seasonId);
            gameState.stats.seasonsExperienced = Array.from(seasonsExperienced);
          }

          if (seasonId === 'winter') {
            gameState.stats.wintersSurvived = (Number(gameState.stats.wintersSurvived) || 0) + 1;
          }

          document.dispatchEvent(new CustomEvent('seasonChanged', {
            detail: {
              season: { ...nextSeason.season },
              index: nextSeason.index
            }
          }));
        }

        updateResearch(deltaTime);

        // 비주얼 노벨 기능 비활성화
        // if (window.VN && typeof window.VN.checkTriggers === 'function') {
        //   window.VN.checkTriggers(gameState);
        // }

        gameState.timers.autoSaveElapsed += deltaTime;
        if (gameState.timers.autoSaveElapsed >= 60) {
          this.save();
          gameState.timers.autoSaveElapsed = 0;
        }

        gameState.lastUpdate = Date.now();

        dispatchGameStateChanged();
      } catch (error) {
        console.error('[Game.update] 업데이트 실패:', error);
      }
    },

    getBuildingCount(buildingType) {
      return GameBuildings.getBuildingCountFromState(gameState, buildingType);
    },

    getConsumptionRates() {
      return calculateTotalConsumption(gameState);
    },

    getCooldownRemaining(cooldownKey) {
      GameState.ensureCooldownState(gameState);
      const expiresAt = Number(gameState.cooldowns[cooldownKey]) || 0;
      return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    },

    holdFeast() {
      try {
        GameState.ensureCooldownState(gameState);
        GameState.ensureTemporaryEffectsState(gameState);
        const config = GAME_CONFIG || {};
        const cost = Number(config.GOLD_SINK_FEAST_COST) || 80;
        const durationSec = Number(config.GOLD_SINK_FEAST_DURATION) || 120;
        const cooldownSec = Number(config.GOLD_SINK_FEAST_COOLDOWN) || 300;

        if ((Number(gameState.resources.gold) || 0) < cost) {
          return { success: false, reason: 'gold' };
        }

        if (Date.now() < (Number(gameState.cooldowns.feast) || 0)) {
          return { success: false, reason: 'cooldown' };
        }

        if (!window.Resources.subtract('gold', cost)) {
          return { success: false, reason: 'gold' };
        }

        gameState.temporaryEffects.feastUntil = Date.now() + durationSec * 1000;
        gameState.cooldowns.feast = Date.now() + cooldownSec * 1000;
        return { success: true };
      } catch (error) {
        console.error('[Game.holdFeast] 잔치 실행 실패:', error);
        return { success: false, reason: 'error' };
      }
    },

    toggleNightWatch(forceState) {
      try {
        GameState.ensureMercenaryState(gameState);
        const nextState = typeof forceState === 'boolean' ? forceState : !gameState.mercenaries.nightWatch;

        if (nextState) {
          const minCost = Number((GAME_CONFIG || {}).GOLD_SINK_NIGHTWATCH_GOLD_PER_SEC) || 5;
          if ((Number(gameState.resources.gold) || 0) < minCost) {
            return { success: false, reason: 'gold', active: gameState.mercenaries.nightWatch };
          }
        }

        gameState.mercenaries.nightWatch = nextState;
        gameState.warnings.nightWatchAutoDisabled = false;
        return { success: true, active: gameState.mercenaries.nightWatch };
      } catch (error) {
        console.error('[Game.toggleNightWatch] 야경대 토글 실패:', error);
        return { success: false, reason: 'error', active: false };
      }
    },

    useEmergencySupply() {
      try {
        GameState.ensureCooldownState(gameState);
        const config = GAME_CONFIG || {};
        const cost = Number(config.GOLD_SINK_EMERGENCY_SUPPLY_COST) || 50;
        const foodGain = Number(config.GOLD_SINK_EMERGENCY_SUPPLY_FOOD) || 150;
        const cooldownSec = Number(config.GOLD_SINK_EMERGENCY_SUPPLY_COOLDOWN) || 180;

        if ((Number(gameState.resources.gold) || 0) < cost) {
          return { success: false, reason: 'gold' };
        }

        if (Date.now() < (Number(gameState.cooldowns.emergencySupply) || 0)) {
          return { success: false, reason: 'cooldown' };
        }

        if (!window.Resources.subtract('gold', cost)) {
          return { success: false, reason: 'gold' };
        }

        window.Resources.add('food', foodGain);
        gameState.cooldowns.emergencySupply = Date.now() + cooldownSec * 1000;
        return { success: true, foodGain };
      } catch (error) {
        console.error('[Game.useEmergencySupply] 긴급 보급 실패:', error);
        return { success: false, reason: 'error' };
      }
    },

    getBuildingCost(buildingType) {
      return GameBuildings.getBuildingCost(buildingType);
    },

    /**
     * 건물 강화 가능 여부 확인
     * @param {string} buildingId - 건물 고유 ID
     * @returns {boolean}
     */
    canUpgrade(buildingId) {
      return GameBuildings.canUpgrade(buildingId, gameState);
    },

    /**
     * 건물의 강화 비용 조회
     * @param {string} buildingId - 건물 고유 ID
     * @returns {{ gold: number, lumber: number } | null} 비용 객체 (최대 레벨이면 null)
     */
    getUpgradeCost(buildingId) {
      return GameBuildings.getUpgradeCost(buildingId, gameState);
    },

    /**
     * 건물 강화 실행
     * @param {string} buildingId - 건물 고유 ID
     * @returns {boolean} 성공 여부
     */
    upgradeBuilding(buildingId) {
      const result = GameBuildings.upgradeBuilding(buildingId, gameState);
      if (result) dispatchGameStateChanged();
      return result;
    },

    buildBuilding(buildingType) {
      const result = GameBuildings.buildBuilding(buildingType, gameState);
      if (result) dispatchGameStateChanged();
      return result;
    },

    canBuild(buildingType) {
      return GameBuildings.canBuild(buildingType, gameState);
    },

    demolishBuilding(buildingId) {
      const result = GameBuildings.demolishBuilding(buildingId, gameState);
      if (result) dispatchGameStateChanged();
      return result;
    },

    save() {
      try {
        const now = Date.now();
        gameState.lastUpdate = now;

        // productionStatus 최적화: stalled === true인 항목만 저장
        const optimizedProductionStatus = Object.fromEntries(
          Object.entries(gameState.productionStatus || {})
            .filter(([id, status]) => status.stalled === true)
        );

        const saveData = {
          saveVersion: GAME_CONFIG.CURRENT_SAVE_VERSION,
          savedAt: now,
          lastUpdate: now,
          state: {
            ...gameState,
            productionStatus: optimizedProductionStatus
          }
        };
        localStorage.setItem(GAME_CONFIG.SAVE_KEY, JSON.stringify(saveData));

        return true;
      } catch (error) {
        console.error('[Game.save] 저장 실패:', error);
        return false;
      }
    },

    load() {
      try {
        const raw = localStorage.getItem(GAME_CONFIG.SAVE_KEY);
        if (!raw) {
          dispatchGameStateChanged();
          return false;
        }

        const parsed = JSON.parse(raw);
        const normalized = parsed && (parsed.saveVersion || parsed.version)
          ? parsed
          : { saveVersion: 1, savedAt: 0, lastUpdate: 0, state: parsed };
        const migrated = GameState.migrateSave(normalized);

        const offlineReport = GameState.processOfflineProgress(migrated);

        gameState = GameState.applyLoadedState(migrated.state);
        window.__MEDIEVAL_GAME_STATE = gameState;

        if (offlineReport) {
          document.dispatchEvent(new CustomEvent('offlineProgressApplied', {
            detail: offlineReport
          }));
        }

        dispatchGameStateChanged();

        return true;
      } catch (error) {
        console.error('[Game.load] 불러오기 실패:', error);
        document.dispatchEvent(new CustomEvent('saveLoadFailed', {
          detail: { error: error.message }
        }));
        return false;
      }
    },

    reset() {
      try {
        document.dispatchEvent(new CustomEvent('eventResolved', {
          detail: { event: null }
        }));

        localStorage.removeItem(GAME_CONFIG.SAVE_KEY);
        gameState = GameState.createInitialState();
        ensureResearchModuleFallback();
        window.__MEDIEVAL_GAME_STATE = gameState;

        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        gameState.timers.lastUpdate = Date.now();
        intervalId = setInterval(() => {
          this.update();
        }, GAME_CONFIG.UPDATE_INTERVAL);

        dispatchGameStateChanged();

        return true;
      } catch (error) {
        console.error('[Game.reset] 초기화 실패:', error);
        return false;
      }
    }
  };

  window.__MEDIEVAL_GAME_STATE = gameState;
  window.Game = Game;
})();
