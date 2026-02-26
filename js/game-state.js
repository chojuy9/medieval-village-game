(function () {
  'use strict';

  // 비공개 헬퍼: 티어 2 이상 건물 수 계산 (calculateTotalConsumptionPrivate 전용)
  function getTier2PlusBuildingCountPrivate(state) {
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

  // 비공개 헬퍼: 총 소비량 계산 (processOfflineProgress 전용)
  function calculateTotalConsumptionPrivate(state) {
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

    const config = window.GAME_CONFIG || {};
    const threshold = Math.max(0, Number(config.FOOD_SCALING_THRESHOLD) || 25);
    const base = Number(config.FOOD_CONSUMPTION_PER_PERSON) || 0.1;
    const scaled = Number(config.FOOD_CONSUMPTION_SCALED) || 0.12;
    const perPerson = (Number(state.population.current) || 0) >= threshold ? scaled : base;
    total.food = (total.food || 0) + (Number(state.population.current) || 0) * perPerson;

    const breadPerPerson = Number(config.BREAD_CONSUMPTION_PER_PERSON) || 0.03;
    const toolMaintenancePerBuilding = Number(config.TOOLS_MAINTENANCE_PER_TIER2_BUILDING) || 0.008;
    const nightWatchGoldPerSec = Number(config.GOLD_SINK_NIGHTWATCH_GOLD_PER_SEC) || 5;

    total.bread = (total.bread || 0) + (Number(state.population.current) || 0) * breadPerPerson;
    total.tools = (total.tools || 0) + getTier2PlusBuildingCountPrivate(state) * toolMaintenancePerBuilding;

    if (state.mercenaries && state.mercenaries.nightWatch) {
      total.gold = (total.gold || 0) + nightWatchGoldPerSec;
    }

    return total;
  }

  // 비공개 헬퍼: 연구 보너스 재계산 (applyLoadedState 전용)
  function recomputeResearchBonuses(state) {
    ensureResearchState(state);
    state.research.bonuses = {
      production: {},
      trade: 0,
      building: {}
    };

    state.research.completed.forEach((researchId) => {
      const tech = window.Research && typeof window.Research.getById === 'function'
        ? window.Research.getById(researchId)
        : null;
      if (!tech || !tech.effect) {
        return;
      }
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
    });
  }

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

    const upgradeConfig = window.GAME_CONFIG && window.GAME_CONFIG.UPGRADE_CONFIG ? window.GAME_CONFIG.UPGRADE_CONFIG : {};
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
    const config = window.GAME_CONFIG || {};
    const fallbackState = createInitialState();
    const normalized = data && typeof data === 'object' ? data : { saveVersion: 1, state: fallbackState };
    const migrated = {
      saveVersion: Number(normalized.saveVersion || normalized.version) || 1,
      savedAt: Number(normalized.savedAt) || 0,
      lastUpdate: Number(normalized.lastUpdate) || 0,
      state: normalized.state || fallbackState
    };

    while (migrated.saveVersion < (Number(config.CURRENT_SAVE_VERSION) || 4)) {
      if (migrated.saveVersion === 1) {
        migrated.state = migrateToV2(migrated.state);
      } else if (migrated.saveVersion === 2) {
        migrated.state = migrateToV3(migrated.state);
      } else if (migrated.saveVersion === 3) {
        migrated.state = migrateToV4(migrated.state);
      }
      migrated.saveVersion += 1;
    }

    if (!migrated.lastUpdate) {
      migrated.lastUpdate = Number(migrated.state.lastUpdate) || Date.now();
    }

    return migrated;
  }

  // 불러온 저장 데이터를 새 상태로 병합하여 반환합니다.
  // game.js에서: gameState = GameState.applyLoadedState(migrated.state)
  function applyLoadedState(loadedState) {
    const fresh = createInitialState();

    const newState = {
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

    normalizeResourceState(newState);
    ensureResearchState(newState);
    ensureProductionStatus(newState);
    ensureBuildingUpgradeState(newState);
    ensureTributeState(newState);
    ensureMercenaryState(newState);
    ensureCooldownState(newState);
    ensureTemporaryEffectsState(newState);
    ensureWarningState(newState);
    ensureRaidState(newState);
    ensureStoryState(newState);
    ensureStatsState(newState);
    recomputeResearchBonuses(newState);

    newState.population.current = Math.max(0, Math.min(newState.population.current, newState.population.max));
    newState.population.employed = Math.max(0, Math.min(newState.population.employed, newState.population.current));
    newState.population.idle = Math.max(0, newState.population.current - newState.population.employed);
    newState.happiness.current = Math.max(0, Math.min(100, Number(newState.happiness.current) || 50));

    return newState;
  }

  function processOfflineProgress(data) {
    if (!data || !data.state || !data.lastUpdate) {
      return null;
    }

    const config = window.GAME_CONFIG || {};
    const elapsed = Math.floor((Date.now() - Number(data.lastUpdate)) / 1000);
    if (elapsed < 60) {
      return null;
    }

    const seconds = Math.min(elapsed, Number(config.MAX_OFFLINE_SECONDS) || 3600);
    const report = { seconds, resources: {} };

    const resourceKeys = getResourceKeys();
    const production = window.Buildings && typeof window.Buildings.getTotalProduction === 'function'
      ? window.Buildings.getTotalProduction()
      : {};
    const consumption = calculateTotalConsumptionPrivate(data.state);

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
      const schoolCount = window.GameBuildings && typeof window.GameBuildings.getBuildingCountFromState === 'function'
        ? window.GameBuildings.getBuildingCountFromState(data.state, 'school')
        : 0;
      const speedMul = schoolCount > 0 ? 1 + Math.max(0, schoolCount - 1) * 0.5 : 0;
      data.state.research.progress += seconds * speedMul;
    }

    return report;
  }

  window.GameState = {
    createInitialState,
    createInitialResources,
    getResourceKeys,
    normalizeResourceState,
    ensureResearchState,
    ensureProductionStatus,
    ensureBuildingUpgradeState,
    ensureTributeState,
    ensureMercenaryState,
    ensureCooldownState,
    ensureTemporaryEffectsState,
    ensureWarningState,
    ensureRaidState,
    ensureStoryState,
    ensureStatsState,
    migrateSave,
    applyLoadedState,
    processOfflineProgress
  };
})();
