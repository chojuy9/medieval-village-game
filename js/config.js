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
        CURRENT_SAVE_VERSION: 4,
        MAX_OFFLINE_SECONDS: 28800,
        EVENT_CHECK_INTERVAL: 90,
        EVENT_CHANCE: 0.4,
        SEASON_DURATION: 180,
        HAPPINESS_BASE: 50,
        HAPPINESS_CHURCH_BONUS: 10,
        HAPPINESS_TAVERN_BONUS: 5,
        UPGRADE_CONFIG: {
            maxLevel: 5,
            costs: [100, 300, 700, 1500, 3000],
            bonuses: [0.10, 0.25, 0.45, 0.70, 1.00]
        },
        MERCENARY_CONFIG: {
            patrol: { cost: 300, duration: 120, defenseBonus: 0.30 },
            knight: { cost: 1200, charges: 3 },
            fortify: { cost: 800, defenseBonus: 0.10 }
        }
    };

    // 전역 노출
    window.GAME_CONFIG = GAME_CONFIG;
})();
