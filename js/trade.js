(function () {
  'use strict';

  const Trade = {
    // XML(GameData.trade)에서 교역 비율을 읽어옵니다.
    baseRates: (window.GameData && window.GameData.trade) ? window.GameData.trade : {},

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
