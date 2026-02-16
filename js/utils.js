(function () {
  'use strict';

  // 공통 유틸리티 함수 모음
  const Utils = {
    getState() {
      if (window.Game && window.Game.state) {
        return window.Game.state;
      }
      if (window.__MEDIEVAL_GAME_STATE) {
        return window.__MEDIEVAL_GAME_STATE;
      }
      return null;
    },

    clampPopulation(state) {
      if (!state || !state.population) {
        return;
      }

      state.population.current = Math.max(0, Math.min(state.population.current, state.population.max));
      state.population.employed = Math.max(0, Math.min(state.population.employed, state.population.current));
      state.population.idle = Math.max(0, state.population.current - state.population.employed);
    },

    formatNumber(num) {
      try {
        const safeNumber = Number.isFinite(Number(num)) ? Number(num) : 0;
        return safeNumber.toLocaleString('ko-KR', {
          maximumFractionDigits: 1
        });
      } catch (error) {
        console.error('[Utils.formatNumber] 숫자 포맷 처리 실패:', error);
        return '0';
      }
    },

    formatTime(seconds) {
      try {
        const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
        const min = Math.floor(totalSeconds / 60);
        const sec = totalSeconds % 60;
        return `${min}분 ${sec}초`;
      } catch (error) {
        console.error('[Utils.formatTime] 시간 포맷 처리 실패:', error);
        return '0분 0초';
      }
    },

    getResourceIcon(resourceType) {
      if (window.Resources && typeof window.Resources.getIcon === 'function') {
        return window.Resources.getIcon(resourceType) || '';
      }

      const fallbackIcons = {
        wood: '🪵',
        stone: '🪨',
        food: '🌾',
        gold: '💰'
      };

      return fallbackIcons[resourceType] || '';
    }
  };

  window.Utils = Utils;
})();
