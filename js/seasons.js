(function () {
  'use strict';

  function getSeasonDuration() {
    const config = window.GAME_CONFIG || {};
    return Math.max(1, Number(config.SEASON_DURATION) || 180);
  }

  const Seasons = {
    SEASON_DURATION: 180,

    // XML(GameData.seasons)에서 계절 정의를 읽어옵니다.
    definitions: (window.GameData && Array.isArray(window.GameData.seasons)) ? window.GameData.seasons : [
      {
        id: 'spring', name: '🌸 봄',
        productionMultiplier: { food: 1.2, bread: 1.1 },
        growthMultiplier: 1.1,
        consumptionMultiplier: 1.0
      },
      {
        id: 'summer', name: '☀️ 여름',
        productionMultiplier: { wood: 1.1, stone: 1.1, lumber: 1.08 },
        growthMultiplier: 1.0,
        consumptionMultiplier: 1.0
      },
      {
        id: 'autumn', name: '🍂 가을',
        productionMultiplier: { food: 1.3, gold: 1.15, furniture: 1.08 },
        growthMultiplier: 1.0,
        consumptionMultiplier: 1.0
      },
      {
        id: 'winter', name: '❄️ 겨울',
        productionMultiplier: { food: 0.6, bread: 0.9, weapons: 1.05 },
        growthMultiplier: 0.8,
        consumptionMultiplier: 1.2
      }
    ],

    getCurrentSeasonIndex(gameTime) {
      const safeTime = Math.max(0, Number(gameTime) || 0);
      const duration = getSeasonDuration();
      this.SEASON_DURATION = duration;
      const cycleTime = safeTime % (duration * 4);
      return Math.floor(cycleTime / duration);
    },

    getCurrentSeason(gameTime) {
      return this.definitions[this.getCurrentSeasonIndex(gameTime)] || this.definitions[0];
    },

    getProductionMultiplier(resourceType, gameTime) {
      const season = this.getCurrentSeason(gameTime);
      return Number(season.productionMultiplier[resourceType]) || 1.0;
    },

    getGrowthMultiplier(gameTime) {
      return Number(this.getCurrentSeason(gameTime).growthMultiplier) || 1.0;
    },

    getConsumptionMultiplier(gameTime) {
      return Number(this.getCurrentSeason(gameTime).consumptionMultiplier) || 1.0;
    }
  };

  window.Seasons = Seasons;
})();
