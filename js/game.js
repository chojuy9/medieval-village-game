(function () {
  'use strict';

  // Note: DEFAULT_RESEARCH_TREE는 이제 research.js (RESEARCH_TREE)에 있습니다.
  // Note: GAME_CONFIG는 이제 config.js에 있습니다.

  function getResourceKeys() {
    if (window.Resources && typeof window.Resources.getRegistry === 'function') {
      return Object.keys(window.Resources.getRegistry());
    }
    return ['wood', 'stone', 'food', 'gold'];
  }

  function createInitialResources() {
    const resources = {};
    getResourceKeys().forEach((key) => {
      resources[key] = 0;
    });

    resources.wood = 100;
    resources.stone = 50;
    resources.food = 200;
    resources.gold = 0;

    return resources;
  }

  function createInitialState() {
    return {
      resources: createInitialResources(),
      population: {
        current: 5,
        max: 10,
        idle: 5,
        employed: 0
      },
      buildings: [],
      timers: {
        lastUpdate: Date.now(),
        populationGrowth: 0,
        populationDecline: 0,
        autoSaveElapsed: 0
      },
      stats: {
        totalBuildingsBuilt: 0,
        gameTime: 0,
        raidsDefended: 0,
        producedByTier: { 1: 0, 2: 0, 3: 0 },
        totalTradeCount: 0,
        totalGoldEarned: 0,
        plaguesSurvived: 0,
        wintersSurvived: 0,
        seasonsExperienced: [],
        maxPopulation: 5
      },
      achievements: [],
      happiness: {
        current: 50,
        factors: {}
      },
      eventState: {
        activeEvent: null,
        lastCheckTime: 0
      },
      tutorial: {
        seen: []
      },
      research: {
        completed: [],
        current: null,
        progress: 0,
        bonuses: {
          production: {},
          trade: 0,
          building: {}
        }
      },
      tribute: {
        completed: [],
        lastTributeTime: {},
        permanentBonus: 0
      },
      mercenaries: {
        patrol: { active: false, expiresAt: 0 },
        knight: { charges: 0 },
        fortification: 0,
        nightWatch: false
      },
      cooldowns: {
        feast: 0,
        emergencySupply: 0
      },
      temporaryEffects: {
        feastUntil: 0
      },
      warnings: {
        breadShortage: false,
        nightWatchAutoDisabled: false
      },
      raids: {
        count: 0,
        enhanced: false,
        banditBaseSiege: {
          inProgress: false,
          success: false,
          resolved: false,
          lastChoice: null
        }
      },
      storyFlags: {
        introShown: false,
        firstHouseShown: false,
        banditWarningShown: false,
        royalTributeShown: false
      },
      productionStatus: {},
      lastUpdate: Date.now(),
      migration_notices: []
    };
  }

  let gameState = createInitialState();
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

  function getMissingResources(cost) {
    const missing = {};
    Object.keys(cost || {}).forEach((resourceType) => {
      const required = Number(cost[resourceType]) || 0;
      const current = Number(gameState.resources[resourceType]) || 0;
      if (current < required) {
        missing[resourceType] = required - current;
      }
    });
    return missing;
  }

  function normalizeResourceState(state) {
    const registryKeys = getResourceKeys();
    state.resources = state.resources || {};

    registryKeys.forEach((resourceType) => {
      state.resources[resourceType] = Math.max(0, Number(state.resources[resourceType]) || 0);
    });
  }

  function ensureResearchState(state) {
    if (!state.research) {
      state.research = {
        completed: [],
        current: null,
        progress: 0,
        bonuses: {
          production: {},
          trade: 0,
          building: {}
        }
      };
    }

    state.research.completed = Array.isArray(state.research.completed) ? state.research.completed : [];
    state.research.current = state.research.current || null;
    state.research.progress = Math.max(0, Number(state.research.progress) || 0);
    state.research.bonuses = state.research.bonuses || {};
    state.research.bonuses.production = state.research.bonuses.production || {};
    state.research.bonuses.trade = Math.max(0, Number(state.research.bonuses.trade) || 0);
    state.research.bonuses.building = state.research.bonuses.building || {};
  }

  function ensureProductionStatus(state) {
    state.productionStatus = state.productionStatus || {};
    if (!Array.isArray(state.buildings)) {
      return;
    }

    state.buildings.forEach((building) => {
      if (!state.productionStatus[building.id]) {
        state.productionStatus[building.id] = { stalled: false };
      }
    });
  }

  /**
   * 건물 강화 상태를 보정합니다.
   * @param {object} state
   */
  function ensureBuildingUpgradeState(state) {
    if (!Array.isArray(state.buildings)) {
      state.buildings = [];
      return;
    }

    const upgradeConfig = GAME_CONFIG && GAME_CONFIG.UPGRADE_CONFIG ? GAME_CONFIG.UPGRADE_CONFIG : {};
    const maxLevel = Math.max(0, Number(upgradeConfig.maxLevel) || 5);

    state.buildings.forEach((building) => {
      building.upgradeLevel = Math.max(0, Math.min(maxLevel, Number(building.upgradeLevel) || 0));
    });
  }

  /**
   * 조공 상태를 보정합니다.
   * @param {object} state
   */
  function ensureTributeState(state) {
    state.tribute = state.tribute || {};
    state.tribute.completed = Array.isArray(state.tribute.completed) ? state.tribute.completed : [];
    state.tribute.lastTributeTime = state.tribute.lastTributeTime && typeof state.tribute.lastTributeTime === 'object'
      ? state.tribute.lastTributeTime
      : {};
    state.tribute.permanentBonus = Math.max(0, Number(state.tribute.permanentBonus) || 0);
  }

  /**
   * 용병 상태를 보정합니다.
   * @param {object} state
   */
  function ensureMercenaryState(state) {
    state.mercenaries = state.mercenaries || {};
    state.mercenaries.patrol = state.mercenaries.patrol || { active: false, expiresAt: 0 };
    state.mercenaries.patrol.active = Boolean(state.mercenaries.patrol.active);
    state.mercenaries.patrol.expiresAt = Math.max(0, Number(state.mercenaries.patrol.expiresAt) || 0);

    state.mercenaries.knight = state.mercenaries.knight || { charges: 0 };
    state.mercenaries.knight.charges = Math.max(0, Number(state.mercenaries.knight.charges) || 0);

    state.mercenaries.fortification = Math.max(0, Number(state.mercenaries.fortification) || 0);
    state.mercenaries.nightWatch = Boolean(state.mercenaries.nightWatch);
  }

  function ensureCooldownState(state) {
    state.cooldowns = state.cooldowns || {};
    state.cooldowns.feast = Math.max(0, Number(state.cooldowns.feast) || 0);
    state.cooldowns.emergencySupply = Math.max(0, Number(state.cooldowns.emergencySupply) || 0);
  }

  function ensureTemporaryEffectsState(state) {
    state.temporaryEffects = state.temporaryEffects || {};
    state.temporaryEffects.feastUntil = Math.max(0, Number(state.temporaryEffects.feastUntil) || 0);
  }

  function ensureWarningState(state) {
    state.warnings = state.warnings || {};
    state.warnings.breadShortage = Boolean(state.warnings.breadShortage);
    state.warnings.nightWatchAutoDisabled = Boolean(state.warnings.nightWatchAutoDisabled);
  }

  function ensureRaidState(state) {
    state.raids = state.raids || {};
    state.raids.count = Math.max(0, Number(state.raids.count) || 0);
    state.raids.enhanced = Boolean(state.raids.enhanced);
    state.raids.banditBaseSiege = state.raids.banditBaseSiege || {};
    state.raids.banditBaseSiege.inProgress = Boolean(state.raids.banditBaseSiege.inProgress);
    state.raids.banditBaseSiege.success = Boolean(state.raids.banditBaseSiege.success);
    state.raids.banditBaseSiege.resolved = Boolean(state.raids.banditBaseSiege.resolved);
    state.raids.banditBaseSiege.lastChoice = state.raids.banditBaseSiege.lastChoice || null;
  }

  function ensureStoryState(state) {
    state.storyFlags = state.storyFlags || {};
    state.storyFlags.introShown = Boolean(state.storyFlags.introShown);
    state.storyFlags.firstHouseShown = Boolean(state.storyFlags.firstHouseShown);
    state.storyFlags.banditWarningShown = Boolean(state.storyFlags.banditWarningShown);
    state.storyFlags.royalTributeShown = Boolean(state.storyFlags.royalTributeShown);
  }

  /**
   * 확장 통계 필드를 보정합니다.
   * @param {object} state
   */
  function ensureStatsState(state) {
    state.stats = state.stats || {};
    state.stats.totalBuildingsBuilt = Number(state.stats.totalBuildingsBuilt) || 0;
    state.stats.gameTime = Number(state.stats.gameTime) || 0;
    state.stats.raidsDefended = Number(state.stats.raidsDefended) || 0;
    state.stats.producedByTier = state.stats.producedByTier || { 1: 0, 2: 0, 3: 0 };
    state.stats.totalTradeCount = Number(state.stats.totalTradeCount) || 0;
    state.stats.totalGoldEarned = Number(state.stats.totalGoldEarned) || 0;
    state.stats.plaguesSurvived = Number(state.stats.plaguesSurvived) || 0;
    state.stats.wintersSurvived = Number(state.stats.wintersSurvived) || 0;
    state.stats.seasonsExperienced = Array.isArray(state.stats.seasonsExperienced)
      ? state.stats.seasonsExperienced
      : [];
    state.stats.maxPopulation = Math.max(
      Number(state.population && state.population.current) || 0,
      Number(state.stats.maxPopulation) || 0
    );
  }

  function migrateToV2(state) {
    state.happiness = {
      current: Number(state.happiness && state.happiness.current) || 50,
      factors: (state.happiness && state.happiness.factors) || {}
    };
    state.achievements = Array.isArray(state.achievements) ? state.achievements : [];
    state.stats = state.stats || {};
    state.stats.raidsDefended = Number(state.stats.raidsDefended) || 0;
    state.stats.producedByTier = state.stats.producedByTier || { 1: 0, 2: 0, 3: 0 };
    return state;
  }

  function migrateToV3(state) {
    normalizeResourceState(state);
    ensureResearchState(state);
    ensureProductionStatus(state);

    state.lastUpdate = Number(state.lastUpdate) || Date.now();

    if (Array.isArray(state.buildings) && state.buildings.some((b) => b.type === 'blacksmith')) {
      state.migration_notices = Array.isArray(state.migration_notices) ? state.migration_notices : [];
      if (!state.migration_notices.includes('blacksmith_changed')) {
        state.migration_notices.push('blacksmith_changed');
      }
    }

    return state;
  }

  /**
   * v3 저장 데이터를 v4 구조로 마이그레이션합니다.
   * @param {object} state
   * @returns {object}
   */
  function migrateToV4(state) {
    normalizeResourceState(state);
    ensureResearchState(state);
    ensureProductionStatus(state);
    ensureBuildingUpgradeState(state);
    ensureTributeState(state);
    ensureMercenaryState(state);
    ensureCooldownState(state);
    ensureTemporaryEffectsState(state);
    ensureWarningState(state);
    ensureRaidState(state);
    ensureStoryState(state);
    ensureStatsState(state);
    return state;
  }

  function migrateSave(data) {
    const fallbackState = createInitialState();
    const normalized = data && typeof data === 'object' ? data : { saveVersion: 1, state: fallbackState };
    const migrated = {
      saveVersion: Number(normalized.saveVersion || normalized.version) || 1,
      savedAt: Number(normalized.savedAt) || 0,
      lastUpdate: Number(normalized.lastUpdate) || 0,
      state: normalized.state || fallbackState
    };

    while (migrated.saveVersion < GAME_CONFIG.CURRENT_SAVE_VERSION) {
      if (migrated.saveVersion === 1) {
        migrated.state = migrateToV2(migrated.state);
      } else if (migrated.saveVersion === 2) {
        migrated.state = migrateToV3(migrated.state);
      } else if (migrated.saveVersion === 3) {
        migrated.state = migrateToV4(migrated.state);
      }
      migrated.saveVersion += 1;
    }

    migrated.state = migrateToV4(migrated.state);
    if (!migrated.lastUpdate) {
      migrated.lastUpdate = Number(migrated.state.lastUpdate) || Date.now();
    }

    return migrated;
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

    ensureResearchState(gameState);

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

  function recomputeResearchBonuses(state) {
    ensureResearchState(state);
    state.research.bonuses = {
      production: {},
      trade: 0,
      building: {}
    };

    state.research.completed.forEach((researchId) => {
      const tech = getResearchById(researchId);
      if (tech && tech.effect) {
        if (tech.effect.type === 'production_bonus' && tech.effect.target) {
          state.research.bonuses.production[tech.effect.target] =
            (Number(state.research.bonuses.production[tech.effect.target]) || 0) + (Number(tech.effect.bonus) || 0);
        }
        if (tech.effect.type === 'trade_bonus') {
          state.research.bonuses.trade += Number(tech.effect.bonus) || 0;
        }
        if (tech.effect.type === 'building_bonus' && tech.effect.target) {
          state.research.bonuses.building[tech.effect.target] =
            (Number(state.research.bonuses.building[tech.effect.target]) || 0) + (Number(tech.effect.bonus) || 0);
        }
      }
    });
  }

  function applyLoadedState(loadedState) {
    const fresh = createInitialState();

    gameState = {
      resources: {
        ...fresh.resources,
        ...(loadedState.resources || {})
      },
      population: {
        ...fresh.population,
        ...(loadedState.population || {})
      },
      buildings: Array.isArray(loadedState.buildings) ? loadedState.buildings : [],
      timers: {
        ...fresh.timers,
        ...(loadedState.timers || {}),
        lastUpdate: Date.now(),
        autoSaveElapsed: 0
      },
      stats: {
        ...fresh.stats,
        ...(loadedState.stats || {})
      },
      achievements: Array.isArray(loadedState.achievements) ? loadedState.achievements : [...fresh.achievements],
      happiness: {
        ...fresh.happiness,
        ...(loadedState.happiness || {}),
        factors: {
          ...fresh.happiness.factors,
          ...((loadedState.happiness && loadedState.happiness.factors) || {})
        }
      },
      eventState: {
        ...fresh.eventState,
        ...(loadedState.eventState || {})
      },
      tutorial: {
        ...fresh.tutorial,
        ...(loadedState.tutorial || {}),
        seen: Array.isArray(loadedState.tutorial && loadedState.tutorial.seen)
          ? loadedState.tutorial.seen
          : [...fresh.tutorial.seen]
      },
      research: loadedState.research || fresh.research,
      tribute: {
        ...fresh.tribute,
        ...(loadedState.tribute || {}),
        completed: Array.isArray(loadedState.tribute && loadedState.tribute.completed)
          ? loadedState.tribute.completed
          : [...fresh.tribute.completed],
        lastTributeTime: {
          ...fresh.tribute.lastTributeTime,
          ...((loadedState.tribute && loadedState.tribute.lastTributeTime) || {})
        }
      },
      mercenaries: {
        ...fresh.mercenaries,
        ...(loadedState.mercenaries || {}),
        patrol: {
          ...fresh.mercenaries.patrol,
          ...((loadedState.mercenaries && loadedState.mercenaries.patrol) || {})
        },
        knight: {
          ...fresh.mercenaries.knight,
          ...((loadedState.mercenaries && loadedState.mercenaries.knight) || {})
        }
      },
      cooldowns: {
        ...fresh.cooldowns,
        ...(loadedState.cooldowns || {})
      },
      temporaryEffects: {
        ...fresh.temporaryEffects,
        ...(loadedState.temporaryEffects || {})
      },
      warnings: {
        ...fresh.warnings,
        ...(loadedState.warnings || {})
      },
      raids: {
        ...fresh.raids,
        ...(loadedState.raids || {}),
        banditBaseSiege: {
          ...fresh.raids.banditBaseSiege,
          ...((loadedState.raids && loadedState.raids.banditBaseSiege) || {})
        }
      },
      storyFlags: {
        ...fresh.storyFlags,
        ...(loadedState.storyFlags || {})
      },
      productionStatus: loadedState.productionStatus || {},
      lastUpdate: Number(loadedState.lastUpdate) || Date.now(),
      migration_notices: Array.isArray(loadedState.migration_notices) ? loadedState.migration_notices : []
    };

    normalizeResourceState(gameState);
    ensureResearchState(gameState);
    ensureProductionStatus(gameState);
    ensureBuildingUpgradeState(gameState);
    ensureTributeState(gameState);
    ensureMercenaryState(gameState);
    ensureCooldownState(gameState);
    ensureTemporaryEffectsState(gameState);
    ensureWarningState(gameState);
    ensureRaidState(gameState);
    ensureStoryState(gameState);
    ensureStatsState(gameState);
    recomputeResearchBonuses(gameState);

    gameState.population.current = Math.max(0, Math.min(gameState.population.current, gameState.population.max));
    gameState.population.employed = Math.max(0, Math.min(gameState.population.employed, gameState.population.current));
    gameState.population.idle = Math.max(0, gameState.population.current - gameState.population.employed);
    gameState.happiness.current = Math.max(0, Math.min(100, Number(gameState.happiness.current) || 50));
  }

  function getBuildingCountFromState(state, buildingType) {
    if (!state || !Array.isArray(state.buildings)) {
      return 0;
    }
    return state.buildings.filter((building) => building.type === buildingType).length;
  }

  function getTier2PlusBuildingCount(state) {
    if (!state || !Array.isArray(state.buildings) || !window.Buildings || !window.Buildings.definitions) {
      return 0;
    }

    return state.buildings.reduce((count, building) => {
      const def = window.Buildings.definitions[building.type];
      if (!def || Number(def.tier) < 2) {
        return count;
      }
      return count + 1;
    }, 0);
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
    const schoolCount = getBuildingCountFromState(gameState, 'school');
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
    total.tools = (total.tools || 0) + getTier2PlusBuildingCount(state) * toolMaintenancePerBuilding;

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

  function processOfflineProgress(data) {
    if (!data || !data.state || !data.lastUpdate) {
      return null;
    }

    const elapsed = Math.floor((Date.now() - Number(data.lastUpdate)) / 1000);
    if (elapsed < 60) {
      return null;
    }

    const seconds = Math.min(elapsed, GAME_CONFIG.MAX_OFFLINE_SECONDS);
    const report = { seconds, resources: {} };

    const resourceKeys = getResourceKeys();
    const production = window.Buildings && typeof window.Buildings.getTotalProduction === 'function'
      ? window.Buildings.getTotalProduction()
      : {};
    const consumption = calculateTotalConsumption(data.state);

    resourceKeys.forEach((resourceType) => {
      const net = (Number(production[resourceType]) || 0) - (Number(consumption[resourceType]) || 0);
      const gained = net * seconds;
      if (gained !== 0) {
        data.state.resources[resourceType] = Math.max(0,
          (Number(data.state.resources[resourceType]) || 0) + gained);
        report.resources[resourceType] = gained;
      }
    });

    if (data.state.research && data.state.research.current) {
      const schoolCount = getBuildingCountFromState(data.state, 'school');
      const speedMul = schoolCount > 0 ? 1 + Math.max(0, schoolCount - 1) * 0.5 : 0;
      data.state.research.progress += seconds * speedMul;
    }

    return report;
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

        const schoolCount = getBuildingCountFromState(gameState, 'school');
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
        console.log('[Game.init] 게임 초기화 시작');

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
        console.log('[Game.init] 게임 초기화 완료');
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

        if (window.VN && typeof window.VN.checkTriggers === 'function') {
          window.VN.checkTriggers(gameState);
        }

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
      return getBuildingCountFromState(gameState, buildingType);
    },

    getConsumptionRates() {
      return calculateTotalConsumption(gameState);
    },

    getCooldownRemaining(cooldownKey) {
      ensureCooldownState(gameState);
      const expiresAt = Number(gameState.cooldowns[cooldownKey]) || 0;
      return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    },

    holdFeast() {
      try {
        ensureCooldownState(gameState);
        ensureTemporaryEffectsState(gameState);
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
        ensureMercenaryState(gameState);
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
        ensureCooldownState(gameState);
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
      const definition = window.Buildings && window.Buildings.definitions
        ? window.Buildings.definitions[buildingType]
        : null;

      if (!definition) {
        return {};
      }

      const costMultiplier = window.EventSystem && typeof window.EventSystem.getCostMultiplier === 'function'
        ? Math.max(0, Number(window.EventSystem.getCostMultiplier(buildingType)) || 1)
        : 1;

      const adjustedCost = {};
      Object.keys(definition.cost || {}).forEach((resourceType) => {
        const baseAmount = Math.max(0, Number(definition.cost[resourceType]) || 0);
        adjustedCost[resourceType] = Math.ceil(baseAmount * costMultiplier);
      });

      return adjustedCost;
    },

    /**
     * 건물 강화 가능 여부 확인
     * @param {string} buildingId - 건물 고유 ID
     * @returns {boolean}
     */
    canUpgrade(buildingId) {
      try {
        if (!buildingId || !window.Resources) {
          return false;
        }

        const target = Array.isArray(gameState.buildings)
          ? gameState.buildings.find((building) => building.id === buildingId)
          : null;
        if (!target) {
          return false;
        }

        const config = GAME_CONFIG && GAME_CONFIG.UPGRADE_CONFIG ? GAME_CONFIG.UPGRADE_CONFIG : {};
        const maxLevel = Math.max(0, Number(config.maxLevel) || 5);
        const level = Math.max(0, Number(target.upgradeLevel) || 0);
        if (level >= maxLevel) {
          return false;
        }

        const cost = this.getUpgradeCost(buildingId);
        if (!cost) {
          return false;
        }

        return window.Resources.hasEnough(cost);
      } catch (error) {
        console.error('[Game.canUpgrade] 강화 가능 여부 확인 실패:', error);
        return false;
      }
    },

    /**
     * 건물의 강화 비용 조회
     * @param {string} buildingId - 건물 고유 ID
     * @returns {{ gold: number, lumber: number } | null} 비용 객체 (최대 레벨이면 null)
     */
    getUpgradeCost(buildingId) {
      try {
        if (!buildingId) {
          return null;
        }

        const target = Array.isArray(gameState.buildings)
          ? gameState.buildings.find((building) => building.id === buildingId)
          : null;
        if (!target) {
          return null;
        }

        const config = GAME_CONFIG && GAME_CONFIG.UPGRADE_CONFIG ? GAME_CONFIG.UPGRADE_CONFIG : {};
        const maxLevel = Math.max(0, Number(config.maxLevel) || 5);
        const costs = Array.isArray(config.costs) ? config.costs : [];
        const level = Math.max(0, Number(target.upgradeLevel) || 0);
        if (level >= maxLevel) {
          return null;
        }

        const cost = {};
        cost.gold = Math.max(0, Number(costs[level]) || 0);
        cost.lumber = Math.floor((level + 1) * 5);  // ★1=5, ★2=10, ..., ★5=25
        return cost;
      } catch (error) {
        console.error('[Game.getUpgradeCost] 강화 비용 조회 실패:', error);
        return null;
      }
    },

    /**
     * 건물 강화 실행
     * @param {string} buildingId - 건물 고유 ID
     * @returns {boolean} 성공 여부
     */
    upgradeBuilding(buildingId) {
      try {
        if (!this.canUpgrade(buildingId) || !window.Resources) {
          return false;
        }

        const target = gameState.buildings.find((building) => building.id === buildingId);
        if (!target) {
          return false;
        }

        const cost = this.getUpgradeCost(buildingId);
        if (!cost || !window.Resources.hasEnough(cost)) {
          return false;
        }
        Object.entries(cost).forEach(([type, amount]) => {
          window.Resources.subtract(type, amount);
        });

        target.upgradeLevel = Math.max(0, Number(target.upgradeLevel) || 0) + 1;

        document.dispatchEvent(new CustomEvent('buildingUpgraded', {
          detail: {
            buildingId,
            buildingType: target.type,
            newLevel: target.upgradeLevel,
            cost
          }
        }));

        dispatchGameStateChanged();
        return true;
      } catch (error) {
        console.error('[Game.upgradeBuilding] 건물 강화 실패:', error);
        return false;
      }
    },

    buildBuilding(buildingType) {
      try {
        if (!window.Buildings || !window.Resources || !window.Population) {
          return false;
        }

        const definition = window.Buildings.definitions[buildingType];
        if (!definition) {
          return false;
        }

        if (!this.canBuild(buildingType)) {
          const missing = getMissingResources(this.getBuildingCost(buildingType));
          const workersNeeded = Number(definition.workersNeeded) || 0;
          if (gameState.population.idle < workersNeeded) {
            missing.workers = workersNeeded - gameState.population.idle;
          }

          if (window.Buildings && !window.Buildings.isUnlocked(buildingType)) {
            missing.unlock = 1;
          }

          if (buildingType === 'market' && this.getBuildingCount('market') >= GAME_CONFIG.MARKET_MAX_COUNT) {
            missing.marketLimit = 1;
          }
          if (buildingType === 'school' && this.getBuildingCount('school') >= GAME_CONFIG.SCHOOL_MAX_COUNT) {
            missing.schoolLimit = 1;
          }
          if (buildingType === 'treasury' && this.getBuildingCount('treasury') >= GAME_CONFIG.TREASURY_MAX_COUNT) {
            missing.treasuryLimit = 1;
          }

          document.dispatchEvent(new CustomEvent('resourceInsufficient', {
            detail: {
              buildingType,
              missing
            }
          }));
          return false;
        }

        const assigned = window.Population.assign(buildingType);
        if (!assigned && (definition.workersNeeded || 0) > 0) {
          return false;
        }

        const actualCost = this.getBuildingCost(buildingType);
        Object.keys(actualCost).forEach((resourceType) => {
          const amount = Number(actualCost[resourceType]) || 0;
          if (amount > 0) {
            window.Resources.subtract(resourceType, amount);
          }
        });

        const buildingCount = gameState.buildings.filter((b) => b.type === buildingType).length;
        const buildingId = `${buildingType}_${buildingCount + 1}`;

        gameState.buildings.push({
          id: buildingId,
          type: buildingType,
          workers: Number(definition.workersNeeded) || 0,
          upgradeLevel: 0
        });
        gameState.productionStatus[buildingId] = { stalled: false };

        if (definition.effect && definition.effect.maxPopulation) {
          gameState.population.max += Number(definition.effect.maxPopulation) || 0;
        }

        gameState.stats.totalBuildingsBuilt += 1;

        document.dispatchEvent(new CustomEvent('buildingBuilt', {
          detail: {
            buildingType,
            buildingId
          }
        }));

        dispatchGameStateChanged();
        return true;
      } catch (error) {
        console.error('[Game.buildBuilding] 건물 건설 실패:', error);
        return false;
      }
    },

    canBuild(buildingType) {
      try {
        if (!window.Buildings || !window.Resources) {
          return false;
        }

        const definition = window.Buildings.definitions[buildingType];
        if (!definition) {
          return false;
        }

        if (typeof window.Buildings.isUnlocked === 'function' && !window.Buildings.isUnlocked(buildingType)) {
          return false;
        }

        if (buildingType === 'market' && this.getBuildingCount('market') >= GAME_CONFIG.MARKET_MAX_COUNT) {
          return false;
        }
        if (buildingType === 'school' && this.getBuildingCount('school') >= GAME_CONFIG.SCHOOL_MAX_COUNT) {
          return false;
        }
        if (buildingType === 'treasury' && this.getBuildingCount('treasury') >= GAME_CONFIG.TREASURY_MAX_COUNT) {
          return false;
        }

        const enoughResources = window.Resources.hasEnough(this.getBuildingCost(buildingType));
        const enoughWorkers = gameState.population.idle >= (Number(definition.workersNeeded) || 0);

        return enoughResources && enoughWorkers;
      } catch (error) {
        console.error('[Game.canBuild] 건설 가능 여부 확인 실패:', error);
        return false;
      }
    },

    demolishBuilding(buildingId) {
      try {
        if (!window.Buildings || !window.Resources || !window.Population) {
          return false;
        }

        const buildingIndex = gameState.buildings.findIndex((building) => building.id === buildingId);
        if (buildingIndex < 0) {
          return false;
        }

        const target = gameState.buildings[buildingIndex];
        const definition = window.Buildings.definitions[target.type];
        if (!definition) {
          return false;
        }

        const refund = {};
        const cost = definition.cost || {};
        Object.keys(cost).forEach((resourceType) => {
          const amount = Math.max(0, Number(cost[resourceType]) || 0);
          const refundAmount = Math.floor(amount * 0.5);
          if (refundAmount > 0) {
            refund[resourceType] = refundAmount;
            window.Resources.add(resourceType, refundAmount);
          }
        });

        const assignedWorkers = Math.max(0, Number(target.workers) || 0);
        if (assignedWorkers > 0) {
          gameState.population.employed -= assignedWorkers;
          gameState.population.idle += assignedWorkers;
        }

        if (definition.effect && definition.effect.maxPopulation) {
          const maxPopBonus = Math.max(0, Number(definition.effect.maxPopulation) || 0);
          gameState.population.max = Math.max(0, gameState.population.max - maxPopBonus);
          if (gameState.population.current > gameState.population.max) {
            gameState.population.current = gameState.population.max;
          }
        }

        if (window.Utils && typeof window.Utils.clampPopulation === 'function') {
          window.Utils.clampPopulation(gameState);
        }

        gameState.buildings.splice(buildingIndex, 1);
        delete gameState.productionStatus[buildingId];

        document.dispatchEvent(new CustomEvent('buildingDemolished', {
          detail: {
            buildingType: target.type,
            buildingId,
            refund
          }
        }));

        dispatchGameStateChanged();
        return true;
      } catch (error) {
        console.error('[Game.demolishBuilding] 건물 철거 실패:', error);
        return false;
      }
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
        console.log('[Game.save] 저장 완료');
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
        const migrated = migrateSave(normalized);

        const offlineReport = processOfflineProgress(migrated);

        applyLoadedState(migrated.state);
        window.__MEDIEVAL_GAME_STATE = gameState;

        if (offlineReport) {
          document.dispatchEvent(new CustomEvent('offlineProgressApplied', {
            detail: offlineReport
          }));
        }

        dispatchGameStateChanged();
        console.log('[Game.load] 불러오기 완료');
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
        gameState = createInitialState();
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
        console.log('[Game.reset] 새 게임 시작');
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
