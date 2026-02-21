(function () {
  'use strict';

  const Trade = {
    // 교환 비율 기본값
    baseRates: {
      wood: { stone: 0.6, food: 0.8, lumber: 0.45, bread: 0.35, tools: 0.2, furniture: 0.12, weapons: 0.08, gold: 0.05 },
      stone: { wood: 1.5, food: 1.2, lumber: 0.4, bread: 0.3, tools: 0.22, furniture: 0.1, weapons: 0.08, gold: 0.08 },
      food: { wood: 1.2, stone: 0.8, lumber: 0.35, bread: 0.5, tools: 0.18, furniture: 0.1, weapons: 0.06, gold: 0.04 },
      lumber: { wood: 1.8, stone: 1.7, food: 1.4, bread: 0.8, tools: 0.55, furniture: 0.25, weapons: 0.22, gold: 0.18 },
      bread: { wood: 2.1, stone: 1.9, food: 2.3, lumber: 1.1, tools: 0.6, furniture: 0.2, weapons: 0.16, gold: 0.2 },
      tools: { wood: 3.5, stone: 3.2, food: 2.8, lumber: 1.8, bread: 1.6, furniture: 0.45, weapons: 0.35, gold: 0.35 },
      furniture: { wood: 6.5, stone: 6.2, food: 5.2, lumber: 3.2, bread: 3.0, tools: 2.2, weapons: 0.75, gold: 0.95 },
      weapons: { wood: 7.2, stone: 7.0, food: 5.8, lumber: 3.8, bread: 3.4, tools: 2.6, furniture: 1.2, gold: 1.2 },
      gold: { wood: 20, stone: 15, food: 25, lumber: 10, bread: 12, tools: 8, furniture: 4, weapons: 3 }
    },

    /**
     * 교역 가능한 자원 목록(금화 제외)을 반환합니다.
     * @returns {string[]}
     */
    getTradeableResources() {
      if (!window.Resources || typeof window.Resources.getRegistry !== 'function') {
        return ['wood', 'stone', 'food', 'gold'];
      }
      return Object.keys(window.Resources.getRegistry());
    },

    // 현재 보유량 기반 동적 비율 계산
    getRate(fromResource, toResource) {
      const base = this.baseRates[fromResource] && this.baseRates[fromResource][toResource];
      if (!base) {
        return 0;
      }

      const state = window.Utils && typeof window.Utils.getState === 'function'
        ? window.Utils.getState()
        : null;
      if (!state || !state.resources) {
        return base;
      }

      const fromStock = Math.max(1, Number(state.resources[fromResource]) || 0);
      const toStock = Math.max(1, Number(state.resources[toResource]) || 0);
      const scarcityRatio = toStock / fromStock;
      const clamped = Math.max(0.5, Math.min(1.5, scarcityRatio));

      let rate = base * clamped;

      const researchBonus = window.Game && typeof window.Game.getResearchTradeBonus === 'function'
        ? Math.max(0, Number(window.Game.getResearchTradeBonus()) || 0)
        : 0;
      if (researchBonus > 0) {
        rate *= (1 + researchBonus);
      }

      const eventDiscount = window.EventSystem && typeof window.EventSystem.getTradeDiscountMultiplier === 'function'
        ? Math.max(0, Number(window.EventSystem.getTradeDiscountMultiplier()) || 1)
        : 1;
      if (eventDiscount > 0 && eventDiscount < 1) {
        rate *= (1 / eventDiscount);
      }

      return Math.max(0, rate);
    },

    // 교환 가능 여부
    canTrade() {
      if (!window.Game || typeof window.Game.getBuildingCount !== 'function') {
        return false;
      }
      return window.Game.getBuildingCount('market') > 0;
    },

    // 교환 실행
    execute(fromResource, fromAmount, toResource) {
      try {
        if (!this.canTrade() || !window.Resources) {
          return false;
        }

        if (!fromResource || !toResource || fromResource === toResource) {
          return false;
        }

        const state = window.Utils && typeof window.Utils.getState === 'function'
          ? window.Utils.getState()
          : null;
        if (!state || !state.resources) {
          return false;
        }

        const amount = Math.max(0, Number(fromAmount) || 0);
        if (amount <= 0) {
          return false;
        }

        const current = Math.max(0, Number(state.resources[fromResource]) || 0);
        if (current < amount) {
          return false;
        }

        const rate = this.getRate(fromResource, toResource);
        if (rate <= 0) {
          return false;
        }

        const convertedAmount = Math.max(0, Math.floor(amount * rate));
        if (convertedAmount <= 0) {
          return false;
        }

        const subtracted = window.Resources.subtract(fromResource, amount);
        if (!subtracted) {
          return false;
        }

        window.Resources.add(toResource, convertedAmount);

        if (state.stats) {
          state.stats.totalTradeCount = (Number(state.stats.totalTradeCount) || 0) + 1;
        }

        document.dispatchEvent(new CustomEvent('tradeExecuted', {
          detail: {
            from: fromResource,
            to: toResource,
            fromAmount: amount,
            toAmount: convertedAmount
          }
        }));

        return true;
      } catch (error) {
        console.error('[Trade.execute] 자원 교환 실패:', error);
        return false;
      }
    }
  };

  window.Trade = Trade;
})();
