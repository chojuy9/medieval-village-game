(function () {
  'use strict';

  const RESEARCH_TREE = {
    woodworking: {
      id: 'woodworking', name: '목공술', icon: '🪓',
      cost: { wood: 100, gold: 20 },
      researchTime: 120,
      effect: { type: 'production_bonus', target: 'lumbermill', bonus: 0.2 },
      requires: [],
      description: '벌목소 생산량 +20%'
    },
    advanced_woodworking: {
      id: 'advanced_woodworking', name: '고급 목공', icon: '🪚',
      cost: { wood: 200, stone: 100, gold: 50 },
      researchTime: 240,
      effect: { type: 'unlock_building', target: 'sawmill' },
      requires: ['woodworking'],
      description: '제재소 해금'
    },
    mining: {
      id: 'mining', name: '채굴술', icon: '⛏️',
      cost: { stone: 100, gold: 20 },
      researchTime: 120,
      effect: { type: 'production_bonus', target: 'quarry', bonus: 0.2 },
      requires: [],
      description: '채석장 생산량 +20%'
    },
    masonry: {
      id: 'masonry', name: '석공술', icon: '🧱',
      cost: { stone: 200, wood: 100, gold: 50 },
      researchTime: 240,
      effect: { type: 'unlock_building', target: 'stonemason' },
      requires: ['mining'],
      description: '석공소 해금'
    },
    agriculture: {
      id: 'agriculture', name: '농업혁신', icon: '🌾',
      cost: { food: 150, gold: 30 },
      researchTime: 150,
      effect: { type: 'production_bonus', target: 'farm', bonus: 0.3 },
      requires: [],
      description: '농장 생산량 +30%'
    },
    baking: {
      id: 'baking', name: '제빵 기술', icon: '🍞',
      cost: { food: 300, wood: 100, gold: 60 },
      researchTime: 240,
      effect: { type: 'unlock_building', target: 'bakery' },
      requires: ['agriculture'],
      description: '제빵소 해금'
    },
    economics: {
      id: 'economics', name: '경제학', icon: '💰',
      cost: { gold: 100 },
      researchTime: 180,
      effect: { type: 'trade_bonus', bonus: 0.05 },
      requires: [],
      description: '시장 보너스 +5%p'
    },
    finance: {
      id: 'finance', name: '금융학', icon: '🏦',
      cost: { gold: 200 },
      researchTime: 300,
      effect: { type: 'building_bonus', target: 'treasury', bonus: 0.1 },
      requires: ['economics'],
      description: '보물창고 보너스 +10%p'
    }
  };

  const RESEARCH_BUILDING_REQUIREMENTS = {
    sawmill: ['advanced_woodworking'],
    bakery: ['baking'],
    stonemason: ['masonry']
  };

  function getState() {
    return window.Utils && typeof window.Utils.getState === 'function'
      ? window.Utils.getState()
      : null;
  }

  function hasSchool(state) {
    return (state && Array.isArray(state.buildings))
      ? state.buildings.some((building) => building.type === 'school')
      : false;
  }

  function hasCompletedResearch(state, researchId) {
    return Boolean(state && state.research && Array.isArray(state.research.completed)
      && state.research.completed.includes(researchId));
  }

  const Research = {
    RESEARCH_TREE,

    /**
     * 연구 트리 전체를 반환합니다.
     * @returns {Record<string, object>}
     */
    getTree() {
      return { ...RESEARCH_TREE };
    },

    /**
     * 연구 정보를 조회합니다.
     * @param {string} researchId
     * @returns {object|null}
     */
    getById(researchId) {
      if (!researchId || !RESEARCH_TREE[researchId]) {
        return null;
      }
      return RESEARCH_TREE[researchId];
    },

    /**
     * 특정 건물 해금에 필요한 연구 목록을 반환합니다.
     * @param {string} buildingType
     * @returns {string[]}
     */
    requiresForBuilding(buildingType) {
      if (!buildingType || !RESEARCH_BUILDING_REQUIREMENTS[buildingType]) {
        return [];
      }
      return [...RESEARCH_BUILDING_REQUIREMENTS[buildingType]];
    },

    /**
     * 연구 시작 가능 여부를 확인합니다.
     * @param {string} researchId
     * @returns {boolean}
     */
    canStartResearch(researchId) {
      try {
        const state = getState();
        const tech = this.getById(researchId);
        if (!state || !tech) {
          return false;
        }

        if (!state.research) {
          return false;
        }

        if (!hasSchool(state)) {
          return false;
        }

        if (state.research.current) {
          return false;
        }

        if (hasCompletedResearch(state, researchId)) {
          return false;
        }

        const requires = Array.isArray(tech.requires) ? tech.requires : [];
        const prereqOk = requires.every((id) => hasCompletedResearch(state, id));
        if (!prereqOk) {
          return false;
        }

        return window.Resources && typeof window.Resources.hasEnough === 'function'
          ? window.Resources.hasEnough(tech.cost)
          : false;
      } catch (error) {
        console.error('[Research.canStartResearch] 연구 시작 가능 여부 확인 실패:', error);
        return false;
      }
    },

    /**
     * 현재 시작 가능한 연구 목록을 반환합니다.
     * @param {object} state
     * @returns {string[]}
     */
    getAvailable(state) {
      try {
        const s = state || getState();
        if (!s || !s.research) {
          return [];
        }
        const completed = Array.isArray(s.research.completed) ? s.research.completed : [];
        return Object.keys(RESEARCH_TREE).filter((id) => {
          if (completed.includes(id)) {
            return false;
          }
          const tech = RESEARCH_TREE[id];
          const requires = Array.isArray(tech.requires) ? tech.requires : [];
          return requires.every((req) => completed.includes(req));
        });
      } catch (error) {
        console.error('[Research.getAvailable] 사용 가능한 연구 목록 조회 실패:', error);
        return [];
      }
    },

    /**
     * 연구를 시작합니다.
     * @param {string} researchId
     * @returns {boolean}
     * @fires researchStarted
     */
    startResearch(researchId) {
      try {
        const state = getState();
        const tech = this.getById(researchId);
        if (!state || !tech || !this.canStartResearch(researchId) || !window.Resources) {
          return false;
        }

        Object.keys(tech.cost || {}).forEach((resourceType) => {
          const amount = Math.max(0, Number(tech.cost[resourceType]) || 0);
          if (amount > 0) {
            window.Resources.subtract(resourceType, amount);
          }
        });

        state.research.current = researchId;
        state.research.progress = 0;

        document.dispatchEvent(new CustomEvent('researchStarted', {
          detail: { researchId, tech }
        }));

        return true;
      } catch (error) {
        console.error('[Research.startResearch] 연구 시작 실패:', error);
        return false;
      }
    }
  };

  window.Research = Research;
})();
