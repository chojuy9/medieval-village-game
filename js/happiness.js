(function () {
  'use strict';

  function getBuildingCount(buildingType) {
    if (!window.Game || typeof window.Game.getBuildingCount !== 'function') {
      return 0;
    }
    return window.Game.getBuildingCount(buildingType);
  }

  const Happiness = {
    // 매 업데이트(1초)마다 호출 — 행복도 재계산
    calculate() {
      const state = window.Utils && typeof window.Utils.getState === 'function'
        ? window.Utils.getState()
        : null;
      if (!state) {
        return { current: 50, factors: {} };
      }

      const config = window.GAME_CONFIG || {};
      const baseHappiness = Number(config.HAPPINESS_BASE) || 50;
      const churchUnitBonus = Number(config.HAPPINESS_CHURCH_BONUS) || 10;
      const tavernUnitBonus = Number(config.HAPPINESS_TAVERN_BONUS) || 5;

      // 기본값 50에서 시작
      let happiness = baseHappiness;
      const factors = {};

      // ① 교회 보너스: 교회 1개당 +10 (최대 +30)
      const churchCount = Math.min(getBuildingCount('church'), 3);
      const churchBonus = churchCount * churchUnitBonus;
      factors.church = churchBonus;
      happiness += churchBonus;

      // ② 주점 보너스: 주점 1개당 +5 (최대 +15)
      const tavernCount = Math.min(getBuildingCount('tavern'), 3);
      const tavernBonus = tavernCount * tavernUnitBonus;
      factors.tavern = tavernBonus;
      happiness += tavernBonus;

      // ③ 과밀 페널티: (현재 인구 / 최대 인구) > 0.8이면 초과 비율 × -30
      const popRatio = state.population.current / Math.max(1, state.population.max);
      if (popRatio > 0.8) {
        const crowdPenalty = Math.floor((popRatio - 0.8) * 150);
        factors.crowding = -crowdPenalty;
        happiness -= crowdPenalty;
      }

      // ④ 식량 부족 페널티: 식량이 0이면 -20
      if (state.resources.food <= 0) {
        factors.starvation = -20;
        happiness -= 20;
      }

      // ⑤ 최근 부정적 이벤트 페널티: 활성 부정 이벤트 시 -10
      const activeEvent = window.EventSystem && typeof window.EventSystem.getActiveEvent === 'function'
        ? window.EventSystem.getActiveEvent()
        : null;
      if (activeEvent && activeEvent.type === 'negative') {
        factors.negativeEvent = -10;
        happiness -= 10;
      }

      const feastUntil = Number(state.temporaryEffects && state.temporaryEffects.feastUntil) || 0;
      if (feastUntil > Date.now()) {
        const feastBonus = Number((window.GAME_CONFIG || {}).GOLD_SINK_FEAST_HAPPINESS_BONUS) || 25;
        factors.feast = feastBonus;
        happiness += feastBonus;
      }

      // 범위 클램핑 0~100
      return {
        current: Math.max(0, Math.min(100, happiness)),
        factors
      };
    },

    // 행복도에 따른 인구 증가 속도 배율 반환
    getGrowthMultiplier() {
      const state = window.Utils && typeof window.Utils.getState === 'function'
        ? window.Utils.getState()
        : null;
      const h = Number(state && state.happiness && state.happiness.current) || 50;
      if (h >= 70) return 1.3;
      if (h >= 50) return 1.0;
      if (h >= 30) return 0.7;
      return 0;
    },

    // 행복도에 따른 생산 배율 반환
    getProductionMultiplier() {
      const state = window.Utils && typeof window.Utils.getState === 'function'
        ? window.Utils.getState()
        : null;
      const h = Number(state && state.happiness && state.happiness.current) || 50;
      if (h >= 70) return 1.05;
      if (h >= 50) return 1.0;
      if (h >= 30) return 0.95;
      return 0.9;
    }
  };

  window.Happiness = Happiness;
})();
