(function () {
  'use strict';

  const buildingDefs = {
    lumbermill: {
      id: 'lumbermill',
      name: '벌목소',
      tier: 1,
      cost: { wood: 10, stone: 0 },
      consumption: {},
      production: { wood: 2 },
      workersNeeded: 2,
      unlock: {},
      description: '원목을 생산합니다'
    },
    quarry: {
      id: 'quarry',
      name: '채석장',
      tier: 1,
      cost: { wood: 30, stone: 0 },
      consumption: {},
      production: { stone: 1 },
      workersNeeded: 2,
      unlock: {},
      description: '원석을 생산합니다'
    },
    farm: {
      id: 'farm',
      name: '농장',
      tier: 1,
      cost: { wood: 20, stone: 10 },
      consumption: {},
      production: { food: 5 },
      workersNeeded: 2,
      unlock: {},
      description: '곡물을 생산합니다'
    },
    house: {
      id: 'house',
      name: '집',
      tier: 1,
      cost: { wood: 50, stone: 30 },
      consumption: {},
      production: {},
      workersNeeded: 0,
      effect: { maxPopulation: 5 },
      unlock: {},
      description: '최대 인구를 5명 늘립니다'
    },
    market: {
      id: 'market',
      name: '시장',
      tier: 1,
      cost: { wood: 100, stone: 50 },
      consumption: {},
      production: {},
      workersNeeded: 1,
      effect: { productionBonus: 0.1 },
      unlock: {},
      description: '모든 생산량이 증가합니다'
    },
    blacksmith: {
      id: 'blacksmith',
      name: '대장간',
      tier: 2,
      cost: { wood: 80, stone: 60 },
      consumption: { wood: 1, stone: 1 },
      production: { tools: 0.5, gold: 0.3 },
      workersNeeded: 3,
      unlock: {
        buildings: { quarry: 1 }
      },
      description: '원목과 원석으로 도구를 만들고 금화를 벌어들입니다'
    },
    sawmill: {
      id: 'sawmill',
      name: '제재소',
      tier: 2,
      cost: { wood: 60, stone: 40 },
      consumption: { wood: 2 },
      production: { lumber: 1 },
      workersNeeded: 2,
      unlock: { buildings: { lumbermill: 2 } },
      description: '원목을 가공하여 목재를 생산합니다'
    },
    bakery: {
      id: 'bakery',
      name: '제빵소',
      tier: 2,
      cost: { wood: 50, stone: 30 },
      consumption: { food: 3 },
      production: { bread: 2 },
      workersNeeded: 2,
      unlock: { buildings: { farm: 2 } },
      description: '곡물을 가공하여 빵을 생산합니다'
    },
    stonemason: {
      id: 'stonemason',
      name: '석공소',
      tier: 2,
      cost: { wood: 90, stone: 70, gold: 40 },
      consumption: { stone: 2, tools: 0.5 },
      production: { stone: 1.5 },
      workersNeeded: 2,
      unlock: { buildings: { quarry: 2 } },
      description: '원석을 가공해 고급 석재 생산 효율을 높입니다'
    },
    church: {
      id: 'church',
      name: '교회',
      tier: 1,
      cost: { wood: 120, stone: 80 },
      consumption: {},
      production: {},
      workersNeeded: 1,
      effect: { happinessBonus: 10 },
      unlock: {
        population: 15
      },
      description: '마을의 안정과 결속을 강화합니다'
    },
    tavern: {
      id: 'tavern',
      name: '주점',
      tier: 1,
      cost: { wood: 60, stone: 30 },
      consumption: {},
      production: { gold: 2 },
      workersNeeded: 2,
      unlock: {
        buildings: { market: 1 }
      },
      description: '금화를 생산합니다'
    },
    wall: {
      id: 'wall',
      name: '성벽',
      tier: 1,
      cost: { wood: 100, stone: 200, gold: 50 },
      consumption: {},
      production: {},
      workersNeeded: 0,
      effect: { defenseBonus: 20 },
      unlock: {
        buildings: { quarry: 3 }
      },
      description: '외부 위협으로부터 마을을 지킵니다'
    },
    school: {
      id: 'school',
      name: '학교',
      tier: 1,
      cost: { wood: 150, stone: 100, gold: 80 },
      consumption: {},
      production: {},
      workersNeeded: 2,
      effect: { productionBonus: 0.05 },
      unlock: {
        buildings: { church: 1 }
      },
      description: '전체 생산 효율이 상승합니다'
    },
    manor: {
      id: 'manor',
      name: '영주관',
      tier: 1,
      cost: { wood: 300, stone: 200, gold: 150 },
      consumption: {},
      production: { gold: 5 },
      workersNeeded: 3,
      effect: { maxPopulation: 10 },
      unlock: {
        population: 30
      },
      description: '금화 생산과 최대 인구를 크게 늘립니다'
    },
    treasury: {
      id: 'treasury',
      name: '보물창고',
      tier: 1,
      cost: { wood: 200, stone: 150, gold: 100 },
      consumption: {},
      production: {},
      workersNeeded: 2,
      effect: { goldProductionBonus: 0.2 },
      unlock: {
        buildings: { blacksmith: 1, market: 1 }
      },
      description: '금화 생산 효율이 증가합니다'
    },
    furnitureShop: {
      id: 'furnitureShop',
      name: '가구공방',
      tier: 3,
      cost: { wood: 100, stone: 60, gold: 50 },
      consumption: { lumber: 2, tools: 1 },
      production: { furniture: 0.3 },
      workersNeeded: 3,
      unlock: { buildings: { sawmill: 1, blacksmith: 1 } },
      description: '목재와 도구로 가구를 생산합니다'
    },
    weaponShop: {
      id: 'weaponShop',
      name: '무기공방',
      tier: 3,
      cost: { wood: 120, stone: 80, gold: 80 },
      consumption: { lumber: 1, tools: 2 },
      production: { weapons: 0.2 },
      workersNeeded: 3,
      unlock: { buildings: { sawmill: 1, blacksmith: 1 }, population: 20 },
      description: '목재와 도구로 무기를 생산합니다'
    },
    mint: {
      id: 'mint',
      name: '왕립 조폐소',
      tier: 4,
      cost: { wood: 300, stone: 200, gold: 2000 },
      consumption: { gold: 1 },
      production: { gold: 10 },
      workersNeeded: 4,
      unlock: { tribute: 'royal' },
      description: '대량의 금화를 주조합니다'
    },
    cathedral: {
      id: 'cathedral',
      name: '대성당',
      tier: 4,
      cost: { wood: 500, stone: 400, gold: 1500 },
      consumption: {},
      production: {},
      workersNeeded: 3,
      effect: { happinessBonus: 25, plagueImmunity: true },
      unlock: { buildings: { church: 3 }, research: ['agriculture'] },
      description: '마을의 정신적 지주. 역병을 막아줍니다'
    }
  };

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

    /**
     * 건물 기본 생산량을 반환합니다.
     * @param {string} buildingType
     * @returns {Record<string, number>}
     */
    getProductionRate(buildingType) {
      try {
        const definition = buildingDefs[buildingType];
        if (!definition) {
          return {};
        }
        return { ...(definition.production || {}) };
      } catch (error) {
        console.error('[Buildings.getProductionRate] 건물 생산량 조회 실패:', error);
        return {};
      }
    },

    /**
     * 건설된 건물을 티어별로 반환합니다.
     * @param {number} tier
     * @returns {Array<{id: string, type: string, workers: number}>}
     */
    getBuildingsByTier(tier) {
      try {
        const state = getState();
        if (!state || !Array.isArray(state.buildings)) {
          return [];
        }

        const safeTier = Number(tier) || 0;
        return state.buildings.filter((building) => {
          const def = buildingDefs[building.type];
          return def && Number(def.tier) === safeTier;
        });
      } catch (error) {
        console.error('[Buildings.getBuildingsByTier] 티어별 건물 조회 실패:', error);
        return [];
      }
    },

    /**
     * 건설된 건물의 티어별 총 생산량(기본값)을 반환합니다.
     * @param {number} tier
     * @returns {Record<string, number>}
     */
    getProductionByTier(tier) {
      try {
        const state = getState();
        const total = {};
        if (!state || !Array.isArray(state.buildings)) {
          return total;
        }

        this.getBuildingsByTier(tier).forEach((building) => {
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
        console.error('[Buildings.getProductionByTier] 티어별 생산량 조회 실패:', error);
        return {};
      }
    },

    /**
     * 전체 초당 생산량을 반환합니다.
     * @returns {Record<string, number>}
     */
    getTotalProduction() {
      try {
        const state = getState();
        const total = {};
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

        const marketBonus = marketCount * (Number(buildingDefs.market.effect.productionBonus) || 0);
        const schoolBonus = schoolCount * (Number(buildingDefs.school.effect.productionBonus) || 0);
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
        const treasuryBonus = treasuryCount * ((Number(buildingDefs.treasury.effect.goldProductionBonus) || 0) + extraTreasuryBonus);
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
        console.error('[Buildings.getTotalProduction] 전체 생산량 계산 실패:', error);
        return { wood: 0, stone: 0, food: 0, gold: 0 };
      }
    }
  };

  window.Buildings = Buildings;
})();
