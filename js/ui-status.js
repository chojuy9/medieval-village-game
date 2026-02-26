(function () {
  'use strict';

  // 계절 정보 업데이트
  function updateSeason() {
    try {
      if (!window.Seasons) return;

      const gameTime = Game.state.stats.gameTime;
      const season = Seasons.getCurrentSeason(gameTime);
      const index = Seasons.getCurrentSeasonIndex(gameTime);
      const banner = document.getElementById('status-bar');
      const nameEl = document.getElementById('season-name');
      const iconEl = document.getElementById('season-icon');

      if (!season || !banner || !nameEl) return;

      nameEl.textContent = season.name;
      iconEl.textContent = getSeasonIcon(season.id);

      // Remove existing season classes and add current
      banner.classList.remove('spring', 'summer', 'autumn', 'winter');
      banner.classList.add(season.id);

      // 현재 계절 내 진행률
      const cycleTime = gameTime % (Seasons.SEASON_DURATION * 4);
      const seasonStart = index * Seasons.SEASON_DURATION;
      const progress = ((cycleTime - seasonStart) / Seasons.SEASON_DURATION) * 100;

      banner.style.setProperty('--season-progress', `${Math.min(100, Math.max(0, progress))}%`);
    } catch (error) {
      console.error('[UIStatus.updateSeason] 계절 UI 업데이트 실패:', error);
    }
  }

  // 계절 아이콘 반환
  function getSeasonIcon(seasonId) {
    const icons = {
      'spring': '🌸',
      'summer': '☀️',
      'autumn': '🍂',
      'winter': '❄️'
    };
    return icons[seasonId] || '🌸';
  }

  // 계절 전환 배경 적용
  function applySeasonBackground(seasonId) {
    try {
      document.body.classList.remove('spring', 'summer', 'autumn', 'winter');
      if (seasonId) {
        document.body.classList.add(seasonId);
      }
    } catch (error) {
      console.error('[UIStatus.applySeasonBackground] 계절 배경 적용 실패:', error);
    }
  }

  // 게임 시간 업데이트
  function updateGameTime() {
    try {
      const seconds = Math.floor(Game.state.stats.gameTime);
      document.getElementById('game-time').textContent = `플레이 시간: ${Utils.formatTime(seconds)}`;
    } catch (error) {
      console.error('[UIStatus.updateGameTime] 게임 시간 업데이트 실패:', error);
    }
  }

  // 통계 패널 업데이트
  function updateStatsPanel() {
    try {
      const panel = document.getElementById('stats-panel');
      if (!panel || !window.Game) return;

      const gameTime = Game.state.stats?.gameTime || 0;
      const playtimeEl = document.getElementById('stat-playtime');
      if (playtimeEl) {
        const minutes = Math.floor(gameTime / 60);
        playtimeEl.textContent = `${minutes}분`;
      }

      const buildingsEl = document.getElementById('stat-buildings-built');
      if (buildingsEl) {
        buildingsEl.textContent = `${Game.state.buildings.length}개`;
      }

      const maxPopEl = document.getElementById('stat-max-population');
      if (maxPopEl) {
        maxPopEl.textContent = `${Game.state.population.max}명`;
      }

      const achievementsEl = document.getElementById('stat-achievements');
      if (achievementsEl && window.Achievements) {
        const unlocked = Achievements.getAll().filter(a => a.achieved).length;
        achievementsEl.textContent = `${unlocked}개`;
      }
    } catch (error) {
      console.error('[UIStatus.updateStatsPanel] 통계 패널 업데이트 실패:', error);
    }
  }

  window.UIStatus = {
    updateSeason,
    getSeasonIcon,
    applySeasonBackground,
    updateGameTime,
    updateStatsPanel
  };
})();
