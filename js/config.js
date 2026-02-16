(function () {
    'use strict';

    // 게임 설정 상수
    const GAME_CONFIG = {
        FOOD_CONSUMPTION_PER_PERSON: 0.1,
        FOOD_SCALING_THRESHOLD: 25,
        FOOD_CONSUMPTION_SCALED: 0.12,
        POPULATION_GROWTH_TIME: 45,
        POPULATION_DECLINE_TIME: 30,
        MARKET_MAX_COUNT: 3,
        SCHOOL_MAX_COUNT: 3,
        TREASURY_MAX_COUNT: 2,
        UPDATE_INTERVAL: 1000,
        SAVE_KEY: 'medievalVillageGameSave',
        CURRENT_SAVE_VERSION: 3,
        MAX_OFFLINE_SECONDS: 28800,
        EVENT_CHECK_INTERVAL: 90,
        EVENT_CHANCE: 0.4,
        SEASON_DURATION: 180,
        HAPPINESS_BASE: 50,
        HAPPINESS_CHURCH_BONUS: 10,
        HAPPINESS_TAVERN_BONUS: 5
    };

    // 전역 노출
    window.GAME_CONFIG = GAME_CONFIG;
})();
