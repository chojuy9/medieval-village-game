(function () {
  'use strict';

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

  function getMissingResources(cost, gameState) {
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

  function getBuildingCost(buildingType) {
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
  }

  function canBuild(buildingType, gameState) {
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

      const config = window.GAME_CONFIG || {};
      if (buildingType === 'market' && getBuildingCountFromState(gameState, 'market') >= (Number(config.MARKET_MAX_COUNT) || 3)) {
        return false;
      }
      if (buildingType === 'school' && getBuildingCountFromState(gameState, 'school') >= (Number(config.SCHOOL_MAX_COUNT) || 3)) {
        return false;
      }
      if (buildingType === 'treasury' && getBuildingCountFromState(gameState, 'treasury') >= (Number(config.TREASURY_MAX_COUNT) || 2)) {
        return false;
      }

      const enoughResources = window.Resources.hasEnough(getBuildingCost(buildingType));
      const enoughWorkers = gameState.population.idle >= (Number(definition.workersNeeded) || 0);

      return enoughResources && enoughWorkers;
    } catch (error) {
      console.error('[GameBuildings.canBuild] 건설 가능 여부 확인 실패:', error);
      return false;
    }
  }

  function buildBuilding(buildingType, gameState) {
    try {
      if (!window.Buildings || !window.Resources || !window.Population) {
        return false;
      }

      const definition = window.Buildings.definitions[buildingType];
      if (!definition) {
        return false;
      }

      if (!canBuild(buildingType, gameState)) {
        const missing = getMissingResources(getBuildingCost(buildingType), gameState);
        const workersNeeded = Number(definition.workersNeeded) || 0;
        if (gameState.population.idle < workersNeeded) {
          missing.workers = workersNeeded - gameState.population.idle;
        }

        if (window.Buildings && !window.Buildings.isUnlocked(buildingType)) {
          missing.unlock = 1;
        }

        const config = window.GAME_CONFIG || {};
        if (buildingType === 'market' && getBuildingCountFromState(gameState, 'market') >= (Number(config.MARKET_MAX_COUNT) || 3)) {
          missing.marketLimit = 1;
        }
        if (buildingType === 'school' && getBuildingCountFromState(gameState, 'school') >= (Number(config.SCHOOL_MAX_COUNT) || 3)) {
          missing.schoolLimit = 1;
        }
        if (buildingType === 'treasury' && getBuildingCountFromState(gameState, 'treasury') >= (Number(config.TREASURY_MAX_COUNT) || 2)) {
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

      const actualCost = getBuildingCost(buildingType);
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

      return true;
    } catch (error) {
      console.error('[GameBuildings.buildBuilding] 건물 건설 실패:', error);
      return false;
    }
  }

  function demolishBuilding(buildingId, gameState) {
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

      return true;
    } catch (error) {
      console.error('[GameBuildings.demolishBuilding] 건물 철거 실패:', error);
      return false;
    }
  }

  /**
   * 건물 강화 가능 여부 확인
   * @param {string} buildingId - 건물 고유 ID
   * @param {object} gameState
   * @returns {boolean}
   */
  function canUpgrade(buildingId, gameState) {
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

      const config = window.GAME_CONFIG && window.GAME_CONFIG.UPGRADE_CONFIG ? window.GAME_CONFIG.UPGRADE_CONFIG : {};
      const maxLevel = Math.max(0, Number(config.maxLevel) || 5);
      const level = Math.max(0, Number(target.upgradeLevel) || 0);
      if (level >= maxLevel) {
        return false;
      }

      const cost = getUpgradeCost(buildingId, gameState);
      if (!cost) {
        return false;
      }

      return window.Resources.hasEnough(cost);
    } catch (error) {
      console.error('[GameBuildings.canUpgrade] 강화 가능 여부 확인 실패:', error);
      return false;
    }
  }

  /**
   * 건물의 강화 비용 조회
   * @param {string} buildingId - 건물 고유 ID
   * @param {object} gameState
   * @returns {{ gold: number, lumber: number } | null} 비용 객체 (최대 레벨이면 null)
   */
  function getUpgradeCost(buildingId, gameState) {
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

      const config = window.GAME_CONFIG && window.GAME_CONFIG.UPGRADE_CONFIG ? window.GAME_CONFIG.UPGRADE_CONFIG : {};
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
      console.error('[GameBuildings.getUpgradeCost] 강화 비용 조회 실패:', error);
      return null;
    }
  }

  /**
   * 건물 강화 실행
   * @param {string} buildingId - 건물 고유 ID
   * @param {object} gameState
   * @returns {boolean} 성공 여부
   */
  function upgradeBuilding(buildingId, gameState) {
    try {
      if (!canUpgrade(buildingId, gameState) || !window.Resources) {
        return false;
      }

      const target = gameState.buildings.find((building) => building.id === buildingId);
      if (!target) {
        return false;
      }

      const cost = getUpgradeCost(buildingId, gameState);
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

      return true;
    } catch (error) {
      console.error('[GameBuildings.upgradeBuilding] 건물 강화 실패:', error);
      return false;
    }
  }

  window.GameBuildings = {
    getBuildingCountFromState,
    getTier2PlusBuildingCount,
    getMissingResources,
    getBuildingCost,
    canBuild,
    buildBuilding,
    demolishBuilding,
    canUpgrade,
    getUpgradeCost,
    upgradeBuilding
  };
})();
