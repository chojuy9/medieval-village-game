(function () {
  'use strict';

  // XML(GameData.buildings)에서 건물 정의를 읽어옵니다.
  // ConfigLoader가 먼저 실행된 경우 XML 데이터가 있고, 없으면 빈 객체(게임 동작 불가).
  const buildingDefs = (window.GameData && window.GameData.buildings) ? window.GameData.buildings : {};

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

  const Buildings = {
    definitions: buildingDefs,

    /**
     * 건물 해금 조건을 확인합니다.
     * @param {string} buildingType
     * @returns {boolean}
     */
    isUnlocked(buildingType) {
      try {
        const state = getState();
        const definition = buildingDefs[buildingType];
        if (!state || !definition) {
          return false;
        }

        const unlock = definition.unlock || {};
        const populationRequirement = Math.max(0, Number(unlock.population) || 0);
        if (state.population.current < populationRequirement) {
          return false;
        }

        const buildingRequirements = unlock.buildings || {};
        const ownedCounts = getOwnedCounts(state.buildings);
        const buildingsSatisfied = Object.keys(buildingRequirements).every((requiredType) => {
          const requiredCount = Math.max(0, Number(buildingRequirements[requiredType]) || 0);
          return (ownedCounts[requiredType] || 0) >= requiredCount;
        });

        if (!buildingsSatisfied) {
          return false;
        }

        const tributeRequirement = unlock.tribute;
        if (tributeRequirement) {
          const completedTributes = Array.isArray(state.tribute && state.tribute.completed)
            ? state.tribute.completed
            : [];
          if (!completedTributes.includes(tributeRequirement)) {
            return false;
          }
        }

        const requiredResearchList = Array.isArray(unlock.research) ? unlock.research : [];
        if (requiredResearchList.length > 0) {
          const completedResearch = Array.isArray(state.research && state.research.completed)
            ? state.research.completed
            : [];
          const hasRequiredResearch = requiredResearchList.every((researchId) => completedResearch.includes(researchId));
          if (!hasRequiredResearch) {
            return false;
          }
        }

        const requiresResearch = window.Research && typeof window.Research.requiresForBuilding === 'function'
          ? window.Research.requiresForBuilding(buildingType)
          : [];
        if (!requiresResearch || requiresResearch.length === 0) {
          return true;
        }

        return requiresResearch.every((researchId) => {
          return Array.isArray(state.research && state.research.completed)
            && state.research.completed.includes(researchId);
        });
      } catch (error) {
        console.error('[Buildings.isUnlocked] 건물 해금 조건 확인 실패:', error);
        return false;
      }
    },

    // 생산량 관련 메서드는 buildings-production.js의 BuildingsProduction에 위임합니다.
    getProductionRate(buildingType) {
      return window.BuildingsProduction ? window.BuildingsProduction.getProductionRate(buildingType) : {};
    },
    getBuildingsByTier(tier) {
      return window.BuildingsProduction ? window.BuildingsProduction.getBuildingsByTier(tier) : [];
    },
    getProductionByTier(tier) {
      return window.BuildingsProduction ? window.BuildingsProduction.getProductionByTier(tier) : {};
    },
    getTotalProduction() {
      return window.BuildingsProduction ? window.BuildingsProduction.getTotalProduction() : { wood: 0, stone: 0, food: 0, gold: 0 };
    }
  };

  window.Buildings = Buildings;
})();
