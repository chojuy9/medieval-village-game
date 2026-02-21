(function () {
  'use strict';

  /**
   * 현재 게임 상태를 반환합니다.
   * @returns {object|null}
   */
  function getState() {
    return window.Utils && typeof window.Utils.getState === 'function'
      ? window.Utils.getState()
      : null;
  }

  /**
   * 용병 설정값을 반환합니다.
   * @returns {object}
   */
  function getConfig() {
    const cfg = window.GAME_CONFIG || {};
    return cfg.MERCENARY_CONFIG || {
      patrol: { cost: 300, duration: 120, defenseBonus: 0.3 },
      knight: { cost: 1200, charges: 3 },
      fortify: { cost: 800, defenseBonus: 0.1 }
    };
  }

  /**
   * 게임 시간(초)을 반환합니다.
   * @param {object} state
   * @returns {number}
   */
  function getGameTime(state) {
    return Math.max(0, Number(state && state.stats && state.stats.gameTime) || 0);
  }

  /**
   * 용병 상태를 보정합니다.
   * @param {object} state
   */
  function ensureMercenaryState(state) {
    if (!state) {
      return;
    }

    state.mercenaries = state.mercenaries || {};
    state.mercenaries.patrol = state.mercenaries.patrol || { active: false, expiresAt: 0 };
    state.mercenaries.knight = state.mercenaries.knight || { charges: 0 };
    state.mercenaries.fortification = Math.max(0, Number(state.mercenaries.fortification) || 0);
  }

  /**
   * 고용 비용을 반환합니다.
   * @param {'patrol' | 'knight' | 'fortify'} type
   * @returns {number}
   */
  function getHireCost(type) {
    const cfg = getConfig();
    if (type === 'patrol') {
      return Math.max(0, Number(cfg.patrol && cfg.patrol.cost) || 0);
    }
    if (type === 'knight') {
      return Math.max(0, Number(cfg.knight && cfg.knight.cost) || 0);
    }
    if (type === 'fortify') {
      return Math.max(0, Number(cfg.fortify && cfg.fortify.cost) || 0);
    }
    return -1;
  }

  const Mercenary = {
    /**
     * 용병 고용 가능 여부를 확인합니다.
     * @param {'patrol' | 'knight' | 'fortify'} type
     * @returns {boolean}
     */
    canHire(type) {
      try {
        const state = getState();
        if (!state || !window.Resources) {
          return false;
        }

        ensureMercenaryState(state);
        const cost = getHireCost(type);
        if (cost < 0) {
          return false;
        }

        if (type === 'patrol' && state.mercenaries.patrol.active) {
          return false;
        }

        if (type === 'fortify') {
          const cfg = getConfig();
          const maxBonus = 0.5;
          const current = Math.max(0, Number(state.mercenaries.fortification) || 0);
          const stepBonus = Math.max(0, Number(cfg.fortify && cfg.fortify.defenseBonus) || 0.1);
          if (stepBonus > 0 && current + stepBonus > maxBonus + 1e-9) {
            return false;
          }
        }

        return window.Resources.hasEnough({ gold: cost });
      } catch (error) {
        console.error('[Mercenary.canHire] 용병 고용 가능 여부 확인 실패:', error);
        return false;
      }
    },

    /**
     * 용병을 고용합니다.
     * @param {'patrol' | 'knight' | 'fortify'} type
     * @returns {boolean}
     */
    hire(type) {
      try {
        if (!this.canHire(type) || !window.Resources) {
          return false;
        }

        const state = getState();
        if (!state) {
          return false;
        }

        ensureMercenaryState(state);

        const cfg = getConfig();
        const cost = getHireCost(type);
        if (!window.Resources.subtract('gold', cost)) {
          return false;
        }

        if (type === 'patrol') {
          const duration = Math.max(0, Number(cfg.patrol && cfg.patrol.duration) || 120);
          state.mercenaries.patrol.active = true;
          state.mercenaries.patrol.expiresAt = getGameTime(state) + duration;
        } else if (type === 'knight') {
          const charges = Math.max(1, Number(cfg.knight && cfg.knight.charges) || 3);
          state.mercenaries.knight.charges += charges;
        } else if (type === 'fortify') {
          const bonus = Math.max(0, Number(cfg.fortify && cfg.fortify.defenseBonus) || 0.1);
          state.mercenaries.fortification += bonus;
        } else {
          return false;
        }

        document.dispatchEvent(new CustomEvent('mercenaryHired', {
          detail: { type, cost }
        }));

        return true;
      } catch (error) {
        console.error('[Mercenary.hire] 용병 고용 실패:', error);
        return false;
      }
    },

    /**
     * 현재 총 방어 보너스를 반환합니다.
     * @returns {number}
     */
    getDefenseBonus() {
      try {
        const state = getState();
        if (!state) {
          return 0;
        }

        ensureMercenaryState(state);
        const cfg = getConfig();

        const patrolBonus = state.mercenaries.patrol.active
          ? Math.max(0, Number(cfg.patrol && cfg.patrol.defenseBonus) || 0)
          : 0;
        const fortifyBonus = Math.max(0, Number(state.mercenaries.fortification) || 0);

        return Math.max(0, Math.min(0.9, patrolBonus + fortifyBonus));
      } catch (error) {
        console.error('[Mercenary.getDefenseBonus] 방어 보너스 계산 실패:', error);
        return 0;
      }
    },

    /**
     * 용병 상태를 업데이트합니다.
     * @param {number} deltaTime
     * @returns {boolean}
     */
    update(deltaTime) {
      try {
        const state = getState();
        if (!state) {
          return false;
        }

        ensureMercenaryState(state);

        const now = getGameTime(state);
        if (state.mercenaries.patrol.active && now >= (Number(state.mercenaries.patrol.expiresAt) || 0)) {
          state.mercenaries.patrol.active = false;
          state.mercenaries.patrol.expiresAt = 0;

          document.dispatchEvent(new CustomEvent('mercenaryExpired', {
            detail: { type: 'patrol' }
          }));

          return true;
        }

        return Math.max(0, Number(deltaTime) || 0) >= 0;
      } catch (error) {
        console.error('[Mercenary.update] 용병 상태 갱신 실패:', error);
        return false;
      }
    }
  };

  window.Mercenary = Mercenary;
})();
