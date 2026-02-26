(function () {
  'use strict';

  // 인구 정보 업데이트
  function updatePopulation() {
    try {
      document.getElementById('current-population').textContent = Game.state.population.current;
      document.getElementById('max-population').textContent = Game.state.population.max;
      document.getElementById('idle-population').textContent = Game.state.population.idle;
      document.getElementById('employed-population').textContent = Game.state.population.employed;
    } catch (error) {
      console.error('[UIPopulation.updatePopulation] 인구 UI 업데이트 실패:', error);
    }
  }

  // 행복도 정보 업데이트
  function updateHappiness() {
    try {
      const h = Game.state.happiness;
      if (!h) return;

      document.getElementById('happiness-value').textContent = h.current;

      const bar = document.getElementById('happiness-bar');
      bar.style.width = `${h.current}%`;
      bar.className = 'happiness-bar ' + (h.current >= 70 ? 'high' : h.current >= 30 ? 'medium' : 'low');

      // 요인 표시
      const container = document.getElementById('happiness-factors');
      container.innerHTML = '';
      if (h.factors) {
        Object.entries(h.factors).forEach(([key, value]) => {
          if (value === 0) return;
          const tag = document.createElement('span');
          tag.className = 'happiness-factor ' + (value > 0 ? 'positive' : 'negative');
          tag.textContent = `${getHappinessFactorLabel(key)} ${value > 0 ? '+' : ''}${value}`;
          container.appendChild(tag);
        });
      }
    } catch (error) {
      console.error('[UIPopulation.updateHappiness] 행복도 UI 업데이트 실패:', error);
    }
  }

  // 행복도 요인 라벨 반환
  function getHappinessFactorLabel(key) {
    const labels = {
      church: '⛪ 교회',
      tavern: '🍺 주점',
      crowding: '🏠 과밀',
      starvation: '🌾 기아',
      negativeEvent: '⚠️ 이벤트',
      feast: '🎉 잔치'
    };
    return labels[key] || key;
  }

  window.UIPopulation = {
    updatePopulation,
    updateHappiness,
    getHappinessFactorLabel
  };
})();
