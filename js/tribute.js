(function () {
  'use strict';

  // XML(GameData.tribute)에서 조공 정의를 읽어옵니다.
  const TRIBUTE_DEFS = (window.GameData && window.GameData.tribute) ? window.GameData.tribute : {};

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
   * 게임 시간(초)을 반환합니다.
   * @param {object} state
   * @returns {number}
   */
  function getGameTime(state) {
    return Math.max(0, Number(state && state.stats && state.stats.gameTime) || 0);
  }

  /**
   * 정수 난수를 생성합니다.
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function randomInt(min, max) {
    const safeMin = Math.ceil(min);
    const safeMax = Math.floor(max);
    return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
  }

  /**
   * 조공 상태를 보정합니다.
   * @param {object} state
   */
  function ensureTributeState(state) {
    if (!state) {
      return;
    }

    state.tribute = state.tribute || {};
    state.tribute.completed = Array.isArray(state.tribute.completed) ? state.tribute.completed : [];
    state.tribute.lastTributeTime = state.tribute.lastTributeTime && typeof state.tribute.lastTributeTime === 'object'
      ? state.tribute.lastTributeTime
      : {};
    state.tribute.permanentBonus = Math.max(0, Number(state.tribute.permanentBonus) || 0);
  }

  /**
   * 조공 보상을 적용합니다.
   * @param {object} state
   * @param {object} reward
   * @returns {object|null}
   */
  function applyReward(state, reward) {
    if (!state || !reward) {
      return null;
    }

    if (reward.type === 'random_resources') {
      const registry = window.Resources && typeof window.Resources.getRegistry === 'function'
        ? Object.keys(window.Resources.getRegistry())
        : ['wood', 'stone', 'food', 'gold'];
      const pickable = registry.filter((resourceType) => resourceType !== 'gold');
      const target = pickable[randomInt(0, pickable.length - 1)] || 'wood';
      const amount = randomInt(Number(reward.min) || 50, Number(reward.max) || 100);
      if (window.Resources) {
        window.Resources.add(target, amount);
      }
      return { type: reward.type, resource: target, amount };
    }

    if (reward.type === 'permanent_bonus') {
      const bonus = Math.max(0, Number(reward.bonus) || 0);
      state.tribute.permanentBonus = (Number(state.tribute.permanentBonus) || 0) + bonus;
      return { type: reward.type, bonus };
    }

    if (reward.type === 'unlock_building') {
      return { type: reward.type, target: reward.target || null };
    }

    if (reward.type === 'max_population') {
      const bonus = Math.max(0, Number(reward.bonus) || 0);
      state.population.max = (Number(state.population.max) || 0) + bonus;
      return { type: reward.type, bonus };
    }

    if (reward.type === 'multi') {
      const effects = Array.isArray(reward.effects) ? reward.effects : [];
      const results = effects
        .map((effect) => applyReward(state, effect))
        .filter(Boolean);
      return { type: reward.type, effects: results };
    }

    return null;
  }

  const Tribute = {
    definitions: TRIBUTE_DEFS,

    /**
     * 조공 실행 가능 여부를 확인합니다.
     * @param {string} tributeId
     * @returns {boolean}
     */
    canTribute(tributeId) {
      try {
        const state = getState();
        const definition = TRIBUTE_DEFS[tributeId];
        if (!state || !definition || !window.Resources) {
          return false;
        }

        ensureTributeState(state);

        if (definition.oneTime && state.tribute.completed.includes(tributeId)) {
          return false;
        }

        const remaining = this.getCooldownRemaining(tributeId);
        if (remaining > 0) {
          return false;
        }

        return window.Resources.hasEnough({ gold: Math.max(0, Number(definition.cost) || 0) });
      } catch (error) {
        console.error('[Tribute.canTribute] 조공 가능 여부 확인 실패:', error);
        return false;
      }
    },

    /**
     * 조공 실행
     * @param {string} tributeId
     * @returns {boolean}
     */
    execute(tributeId) {
      try {
        if (!this.canTribute(tributeId) || !window.Resources) {
          return false;
        }

        const state = getState();
        const definition = TRIBUTE_DEFS[tributeId];
        if (!state || !definition) {
          return false;
        }

        ensureTributeState(state);

        const cost = Math.max(0, Number(definition.cost) || 0);
        if (cost > 0 && !window.Resources.subtract('gold', cost)) {
          return false;
        }

        const reward = applyReward(state, definition.reward);
        state.tribute.lastTributeTime[tributeId] = getGameTime(state);

        if (definition.oneTime && !state.tribute.completed.includes(tributeId)) {
          state.tribute.completed.push(tributeId);
        }

        document.dispatchEvent(new CustomEvent('tributeExecuted', {
          detail: { tributeId, reward }
        }));

        return true;
      } catch (error) {
        console.error('[Tribute.execute] 조공 실행 실패:', error);
        return false;
      }
    },

    /**
     * 조공 남은 쿨다운(초) 반환
     * @param {string} tributeId
     * @returns {number}
     */
    getCooldownRemaining(tributeId) {
      try {
        const state = getState();
        const definition = TRIBUTE_DEFS[tributeId];
        if (!state || !definition) {
          return 0;
        }

        ensureTributeState(state);

        const cooldown = Math.max(0, Number(definition.cooldown) || 0);
        if (cooldown <= 0) {
          return 0;
        }

        const last = Math.max(0, Number(state.tribute.lastTributeTime[tributeId]) || 0);
        const elapsed = getGameTime(state) - last;
        return Math.max(0, Math.ceil(cooldown - elapsed));
      } catch (error) {
        console.error('[Tribute.getCooldownRemaining] 쿨다운 계산 실패:', error);
        return 0;
      }
    }
  };

  window.Tribute = Tribute;
})();
