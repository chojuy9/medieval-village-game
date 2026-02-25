(function () {
  'use strict';

  // XML(GameData.research)에서 연구 트리를 읽어옵니다.
  const _researchData = (window.GameData && window.GameData.research) ? window.GameData.research : { tree: {}, requirements: {} };
  const RESEARCH_TREE = _researchData.tree;
  const RESEARCH_BUILDING_REQUIREMENTS = _researchData.requirements;

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
