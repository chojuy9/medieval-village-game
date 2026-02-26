(function () {
  'use strict';

  // buildings.js가 먼저 로드되므로 window.Buildings.definitions를 참조합니다.
  function getBuildingDefs() {
    return window.Buildings && window.Buildings.definitions
      ? window.Buildings.definitions
      : {};
  }

  function getState() {
    return window.Utils && typeof window.Utils.getState === 'function'
      ? window.Utils.getState()
      : null;
  }

  function isBuildingOperational(building, definition) {
    const required = Math.max(0, Number(definition && definition.workersNeeded) || 0);
    if (required <= 0) {
      return true;
    }
    return (Number(building && building.workers) || 0) > 0;
  }

  function getOwnedCounts(buildings) {
    return (buildings || []).reduce((counts, building) => {
      counts[building.type] = (counts[building.type] || 0) + 1;
      return counts;
    }, {});
  }

  function getResearchUnlockSet(state) {
    const unlocked = {};
    if (!state || !state.research || !Array.isArray(state.research.completed) || !window.Research) {
      return unlocked;
    }
    state.research.completed.forEach((researchId) => {
      const tech = window.Research.getById(researchId);
      if (tech && tech.effect && tech.effect.type === 'unlock_building' && tech.effect.target) {
        unlocked[tech.effect.target] = true;
      }
    });
    return unlocked;
  }

  /**
   * 건물 기본 생산량을 반환합니다.
   * @param {string} buildingType
   * @returns {Record<string, number>}
   */
  function getProductionRate(buildingType) {
    try {
      const buildingDefs = getBuildingDefs();
      const definition = buildingDefs[buildingType];
      if (!definition) {
        return {};
      }
      return { ...(definition.production || {}) };
    } catch (error) {
      console.error('[BuildingsProduction.getProductionRate] 건물 생산량 조회 실패:', error);
      return {};
    }
  }

  /**
   * 건설된 건물을 티어별로 반환합니다.
   * @param {number} tier
   * @returns {Array<{id: string, type: string, workers: number}>}
   */
  function getBuildingsByTier(tier) {
    try {
      const state = getState();
      if (!state || !Array.isArray(state.buildings)) {
        return [];
      }
      const buildingDefs = getBuildingDefs();
      const safeTier = Number(tier) || 0;
      return state.buildings.filter((building) => {
        const def = buildingDefs[building.type];
        return def && Number(def.tier) === safeTier;
      });
    } catch (error) {
      console.error('[BuildingsProduction.getBuildingsByTier] 티어별 건물 조회 실패:', error);
      return [];
    }
  }

  /**
   * 건설된 건물의 티어별 총 생산량(기본값)을 반환합니다.
   * @param {number} tier
   * @returns {Record<string, number>}
   */
  function getProductionByTier(tier) {
    try {
      const state = getState();
      const total = {};
      if (!state || !Array.isArray(state.buildings)) {
        return total;
      }
      const buildingDefs = getBuildingDefs();
      BuildingsProduction.getBuildingsByTier(tier).forEach((building) => {
        const def = buildingDefs[building.type];
        if (!def || !isBuildingOperational(building, def)) {
          return;
        }
        Object.keys(def.production || {}).forEach((resourceType) => {
          total[resourceType] = (total[resourceType] || 0) + (Number(def.production[resourceType]) || 0);
        });
      });
      return total;
    } catch (error) {
      console.error('[BuildingsProduction.getProductionByTier] 티어별 생산량 조회 실패:', error);
      return {};
    }
  }

  /**
   * 전체 초당 생산량을 반환합니다.
   * @returns {Record<string, number>}
   */
  function getTotalProduction() {
    try {
      const state = getState();
      const total = {};
      const buildingDefs = getBuildingDefs();
      const registry = window.Resources && typeof window.Resources.getRegistry === 'function'
        ? window.Resources.getRegistry()
        : { wood: {}, stone: {}, food: {}, gold: {} };

      Object.keys(registry).forEach((key) => {
        total[key] = 0;
      });

      if (!state || !Array.isArray(state.buildings)) {
        return total;
      }

      const config = window.GAME_CONFIG || {};
      const marketLimit = Math.max(1, Number(config.MARKET_MAX_COUNT) || 3);
      const schoolLimit = Math.max(1, Number(config.SCHOOL_MAX_COUNT) || 3);
      const treasuryLimit = Math.max(1, Number(config.TREASURY_MAX_COUNT) || 2);

      const marketCount = Math.min((getOwnedCounts(state.buildings).market || 0), marketLimit);
      const schoolCount = Math.min((getOwnedCounts(state.buildings).school || 0), schoolLimit);
      const treasuryCount = Math.min((getOwnedCounts(state.buildings).treasury || 0), treasuryLimit);

      const marketBonus = marketCount * (Number(buildingDefs.market && buildingDefs.market.effect && buildingDefs.market.effect.productionBonus) || 0);
      const schoolBonus = schoolCount * (Number(buildingDefs.school && buildingDefs.school.effect && buildingDefs.school.effect.productionBonus) || 0);
      const baseMultiplier = 1 + marketBonus + schoolBonus;

      const researchUnlockSet = getResearchUnlockSet(state);

      state.buildings.forEach((building) => {
        const definition = buildingDefs[building.type];
        if (!definition || !isBuildingOperational(building, definition)) {
          return;
        }

        if (researchUnlockSet[building.type] === false) {
          return;
        }

        const toolPenaltyMultiplier = ((Number(state.resources && state.resources.tools) || 0) <= 0
          && Number(definition.tier) >= 2)
          ? Math.max(0, Number((window.GAME_CONFIG || {}).TOOLS_MAINTENANCE_PRODUCTION_MULTIPLIER) || 0.7)
          : 1;

        Object.keys(definition.production || {}).forEach((resourceType) => {
          const amount = (Number(definition.production[resourceType]) || 0) * toolPenaltyMultiplier;
          total[resourceType] = (total[resourceType] || 0) + amount;
        });
      });

      Object.keys(total).forEach((resourceType) => {
        total[resourceType] *= baseMultiplier;
      });

      const extraTreasuryBonus = window.Game && typeof window.Game.getResearchBuildingBonus === 'function'
        ? Number(window.Game.getResearchBuildingBonus('treasury')) || 0
        : 0;
      const treasuryBonus = treasuryCount * ((Number(buildingDefs.treasury && buildingDefs.treasury.effect && buildingDefs.treasury.effect.goldProductionBonus) || 0) + extraTreasuryBonus);
      if (treasuryBonus > 0 && total.gold > 0) {
        total.gold *= (1 + treasuryBonus);
      }

      if (window.Happiness && typeof window.Happiness.getProductionMultiplier === 'function') {
        const happinessMultiplier = Math.max(0, Number(window.Happiness.getProductionMultiplier()) || 1);
        Object.keys(total).forEach((resourceType) => {
          total[resourceType] *= happinessMultiplier;
        });
      }

      if (window.EventSystem && typeof window.EventSystem.getProductionMultiplier === 'function') {
        Object.keys(total).forEach((resourceType) => {
          total[resourceType] *= Math.max(0, Number(window.EventSystem.getProductionMultiplier(resourceType)) || 1);
        });
      }

      if (window.Seasons && typeof window.Seasons.getProductionMultiplier === 'function') {
        Object.keys(total).forEach((resourceType) => {
          total[resourceType] *= Math.max(0, Number(window.Seasons.getProductionMultiplier(resourceType, state.stats.gameTime)) || 1);
        });
      }

      if (window.Game && typeof window.Game.getResearchProductionBonus === 'function') {
        state.buildings.forEach((building) => {
          const def = buildingDefs[building.type];
          if (!def || !isBuildingOperational(building, def)) {
            return;
          }
          const bonus = Number(window.Game.getResearchProductionBonus(building.type)) || 0;
          if (bonus <= 0) {
            return;
          }
          Object.keys(def.production || {}).forEach((resourceType) => {
            total[resourceType] += (Number(def.production[resourceType]) || 0) * bonus;
          });
        });
      }

      return total;
    } catch (error) {
      console.error('[BuildingsProduction.getTotalProduction] 전체 생산량 계산 실패:', error);
      return { wood: 0, stone: 0, food: 0, gold: 0 };
    }
  }

  const BuildingsProduction = {
    getProductionRate,
    getBuildingsByTier,
    getProductionByTier,
    getTotalProduction
  };

  window.BuildingsProduction = BuildingsProduction;
})();
