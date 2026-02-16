(function () {
  'use strict';

  const RESOURCE_REGISTRY = {
    wood: { name: '원목', icon: '🪵', tier: 1, category: 'raw' },
    stone: { name: '원석', icon: '🪨', tier: 1, category: 'raw' },
    food: { name: '곡물', icon: '🌾', tier: 1, category: 'raw' },
    gold: { name: '금화', icon: '💰', tier: 1, category: 'currency' },
    lumber: { name: '목재', icon: '🪓', tier: 2, category: 'processed' },
    bread: { name: '빵', icon: '🍞', tier: 2, category: 'processed' },
    tools: { name: '도구', icon: '⚒️', tier: 2, category: 'processed' },
    furniture: { name: '가구', icon: '🪑', tier: 3, category: 'finished' },
    weapons: { name: '무기', icon: '⚔️', tier: 3, category: 'finished' }
  };

  const Resources = {
    /**
     * 자원 레지스트리 전체를 반환합니다.
     * @returns {Record<string, {name: string, icon: string, tier: number, category: string}>}
     */
    getRegistry() {
      return { ...RESOURCE_REGISTRY };
    },

    /**
     * 티어별 자원 타입 배열을 반환합니다.
     * @param {number} tier
     * @returns {string[]}
     */
    getByTier(tier) {
      const safeTier = Number(tier) || 0;
      return Object.keys(RESOURCE_REGISTRY).filter((key) => {
        return Number(RESOURCE_REGISTRY[key].tier) === safeTier;
      });
    },

    /**
     * 자원 아이콘을 반환합니다.
     * @param {string} resourceType
     * @returns {string}
     */
    getIcon(resourceType) {
      if (!resourceType || !RESOURCE_REGISTRY[resourceType]) {
        return '';
      }
      return RESOURCE_REGISTRY[resourceType].icon || '';
    },

    /**
     * 자원 한글명을 반환합니다.
     * @param {string} resourceType
     * @returns {string}
     */
    getName(resourceType) {
      if (!resourceType || !RESOURCE_REGISTRY[resourceType]) {
        return resourceType || '';
      }
      return RESOURCE_REGISTRY[resourceType].name || resourceType;
    },

    /**
     * 자원을 추가합니다.
     * @param {string} resourceType
     * @param {number} amount
     * @returns {boolean}
     */
    add(resourceType, amount) {
      try {
        const state = window.Utils && typeof window.Utils.getState === 'function'
          ? window.Utils.getState()
          : null;
        if (!state || !state.resources || !resourceType) {
          return false;
        }

        const addAmount = Number(amount) || 0;
        if (!Object.prototype.hasOwnProperty.call(RESOURCE_REGISTRY, resourceType)) {
          return false;
        }
        if (!Object.prototype.hasOwnProperty.call(state.resources, resourceType)) {
          state.resources[resourceType] = 0;
        }
        const nextValue = Math.max(0, (Number(state.resources[resourceType]) || 0) + addAmount);
        state.resources[resourceType] = nextValue;
        return true;
      } catch (error) {
        console.error('[Resources.add] 자원 추가 실패:', error);
        return false;
      }
    },

    /**
     * 자원을 차감합니다.
     * @param {string} resourceType
     * @param {number} amount
     * @returns {boolean}
     */
    subtract(resourceType, amount) {
      try {
        const state = window.Utils && typeof window.Utils.getState === 'function'
          ? window.Utils.getState()
          : null;
        if (!state || !state.resources || !resourceType) {
          return false;
        }

        if (!Object.prototype.hasOwnProperty.call(RESOURCE_REGISTRY, resourceType)) {
          return false;
        }

        if (!Object.prototype.hasOwnProperty.call(state.resources, resourceType)) {
          state.resources[resourceType] = 0;
        }

        const subtractAmount = Math.max(0, Number(amount) || 0);
        if (state.resources[resourceType] < subtractAmount) {
          return false;
        }

        state.resources[resourceType] = Math.max(0, state.resources[resourceType] - subtractAmount);
        return true;
      } catch (error) {
        console.error('[Resources.subtract] 자원 차감 실패:', error);
        return false;
      }
    },

    /**
     * 비용을 지불할 수 있는지 확인합니다.
     * @param {Record<string, number>} costs
     * @returns {boolean}
     */
    hasEnough(costs) {
      try {
        const state = window.Utils && typeof window.Utils.getState === 'function'
          ? window.Utils.getState()
          : null;
        if (!state || !state.resources) {
          return false;
        }

        const requiredCosts = costs || {};
        return Object.keys(requiredCosts).every((resourceType) => {
          if (!Object.prototype.hasOwnProperty.call(RESOURCE_REGISTRY, resourceType)) {
            return false;
          }
          const required = Math.max(0, Number(requiredCosts[resourceType]) || 0);
          const current = Number(state.resources[resourceType]) || 0;
          return current >= required;
        });
      } catch (error) {
        console.error('[Resources.hasEnough] 자원 보유량 확인 실패:', error);
        return false;
      }
    }
  };

  window.RESOURCE_REGISTRY = RESOURCE_REGISTRY;
  window.Resources = Resources;
})();
