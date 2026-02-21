(function () {
    'use strict';

    // 게임 설정 상수
    const GAME_CONFIG = {
        FOOD_CONSUMPTION_PER_PERSON: 0.1,
        FOOD_SCALING_THRESHOLD: 25,
        FOOD_CONSUMPTION_SCALED: 0.12,
        BREAD_CONSUMPTION_PER_PERSON: 0.03,
        BREAD_GROWTH_THRESHOLD_PER_PERSON: 0.5,
        BREAD_GROWTH_BONUS_MULTIPLIER: 1.5,
        TOOLS_MAINTENANCE_PER_TIER2_BUILDING: 0.008,
        TOOLS_MAINTENANCE_PRODUCTION_MULTIPLIER: 0.7,
        GOLD_SINK_FEAST_COST: 80,
        GOLD_SINK_FEAST_HAPPINESS_BONUS: 25,
        GOLD_SINK_FEAST_DURATION: 120,
        GOLD_SINK_FEAST_COOLDOWN: 300,
        GOLD_SINK_NIGHTWATCH_GOLD_PER_SEC: 5,
        GOLD_SINK_NIGHTWATCH_DEFENSE_BONUS: 15,
        GOLD_SINK_NIGHTWATCH_RAID_REDUCTION: 0.3,
        GOLD_SINK_EMERGENCY_SUPPLY_COST: 50,
        GOLD_SINK_EMERGENCY_SUPPLY_FOOD: 150,
        GOLD_SINK_EMERGENCY_SUPPLY_COOLDOWN: 180,
        BANDIT_BASE_SIEGE_TRIGGER_TIME: 900,
        BANDIT_BASE_SIEGE_REQUIRED_RAIDS: 3,
        VN_TYPEWRITER_INTERVAL: 16,
        VN_INTRO_TRIGGER_SECONDS: 5,
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
