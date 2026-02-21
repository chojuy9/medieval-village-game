(function () {
    'use strict';

    /**
     * Production 모듈
     * 생산, 소비, 자원 배수 계산 관련 로직을 담당합니다.
     */

    // Production 유틸리티 함수들을 Game 객체에 추가
    const ProductionUtils = {
        /**
         * 자원 생산 배수를 계산합니다 (시장, 학교, 행복도, 이벤트, 계절 보너스 적용)
         * @param {string} resourceType - 자원 타입
         * @param {object} gameState - 게임 상태
         * @returns {number}
         */
        getResourceMultiplier(resourceType, gameState) {
            let multiplier = 1;

            const config = window.GAME_CONFIG || {};
            const getBuildingCount = (type) => {
                return gameState && Array.isArray(gameState.buildings)
                    ? gameState.buildings.filter(b => b.type === type).length
                    : 0;
            };

            const marketCount = Math.min(getBuildingCount('market'), config.MARKET_MAX_COUNT || 3);
            const schoolCount = Math.min(getBuildingCount('school'), config.SCHOOL_MAX_COUNT || 3);

            const marketBonus = window.Buildings && window.Buildings.definitions && window.Buildings.definitions.market
                ? Number(window.Buildings.definitions.market.effect.productionBonus) || 0
                : 0;
            const schoolBonus = window.Buildings && window.Buildings.definitions && window.Buildings.definitions.school
                ? Number(window.Buildings.definitions.school.effect.productionBonus) || 0
                : 0;

            multiplier *= (1 + marketCount * marketBonus + schoolCount * schoolBonus);

            if (resourceType === 'gold') {
                const treasuryCount = Math.min(getBuildingCount('treasury'), config.TREASURY_MAX_COUNT || 2);
                const treasuryBaseBonus = window.Buildings && window.Buildings.definitions && window.Buildings.definitions.treasury
                    ? Number(window.Buildings.definitions.treasury.effect.goldProductionBonus) || 0
                    : 0;
                const researchBonus = Number(gameState.research && gameState.research.bonuses
                    && gameState.research.bonuses.building && gameState.research.bonuses.building.treasury) || 0;
                multiplier *= (1 + treasuryCount * (treasuryBaseBonus + researchBonus));
            }

            if (window.Happiness && typeof window.Happiness.getProductionMultiplier === 'function') {
                multiplier *= Math.max(0, Number(window.Happiness.getProductionMultiplier()) || 1);
            }

            if (window.EventSystem && typeof window.EventSystem.getProductionMultiplier === 'function') {
                multiplier *= Math.max(0, Number(window.EventSystem.getProductionMultiplier(resourceType)) || 1);
            }

            if (window.Seasons && typeof window.Seasons.getProductionMultiplier === 'function') {
                multiplier *= Math.max(0, Number(window.Seasons.getProductionMultiplier(resourceType, gameState.stats.gameTime)) || 1);
            }

            const tributeBonus = Number(gameState.tribute && gameState.tribute.permanentBonus) || 0;
            if (tributeBonus > 0) {
                multiplier *= (1 + tributeBonus);
            }

            return Math.max(0, multiplier);
        },

        /**
         * 건물의 연구 보너스를 반환합니다
         * @param {string} buildingType - 건물 타입
         * @param {object} gameState - 게임 상태
         * @returns {number}
         */
        getBuildingResearchBonus(buildingType, gameState) {
            if (!gameState.research || !gameState.research.bonuses || !gameState.research.bonuses.production) {
                return 0;
            }
            return Math.max(0, Number(gameState.research.bonuses.production[buildingType]) || 0);
        },

        /**
         * 건물이 작동 가능한지 확인합니다 (일꾼, 자원 소비 확인)
         * @param {object} building - 건물 인스턴스
         * @param {object} definition - 건물 정의
         * @param {number} deltaTime - 경과 시간(초)
         * @param {object} gameState - 게임 상태
         * @returns {{ok: boolean, missingResources: object}}
         */
        canOperateBuilding(building, definition, deltaTime, gameState) {
            const workersNeeded = Math.max(0, Number(definition.workersNeeded) || 0);
            if (workersNeeded > 0 && (Number(building.workers) || 0) <= 0) {
                return { ok: false, missingResources: {} };
            }

            const required = definition.consumption || {};
            const missingResources = {};

            Object.keys(required).forEach((resourceType) => {
                const needed = (Number(required[resourceType]) || 0) * deltaTime;
                const current = Number(gameState.resources[resourceType]) || 0;
                if (current < needed) {
                    missingResources[resourceType] = Math.max(0, needed - current);
                }
            });

            const ok = Object.keys(missingResources).length === 0;
            return { ok, missingResources };
        },

        /**
         * 특정 티어의 생산을 처리합니다
         * @param {number} tier - 티어 (1, 2, 3)
         * @param {number} deltaTime - 경과 시간(초)
         * @param {object} gameState - 게임 상태
         */
        processProductionTier(tier, deltaTime, gameState) {
            if (!window.Buildings || !window.Resources || typeof window.Buildings.getBuildingsByTier !== 'function') {
                return;
            }

            const tierBuildings = window.Buildings.getBuildingsByTier(tier);
            tierBuildings.forEach((building) => {
                const definition = window.Buildings.definitions[building.type];
                if (!definition) {
                    return;
                }

                if (!gameState.productionStatus[building.id]) {
                    gameState.productionStatus[building.id] = { stalled: false };
                }

                const operation = this.canOperateBuilding(building, definition, deltaTime, gameState);
                if (!operation.ok) {
                    if (!gameState.productionStatus[building.id].stalled && Object.keys(operation.missingResources).length > 0) {
                        gameState.productionStatus[building.id].stalled = true;
                        document.dispatchEvent(new CustomEvent('productionStalled', {
                            detail: {
                                buildingType: building.type,
                                missingResources: operation.missingResources
                            }
                        }));
                    }
                    return;
                }

                if (gameState.productionStatus[building.id].stalled) {
                    gameState.productionStatus[building.id].stalled = false;
                    document.dispatchEvent(new CustomEvent('productionResumed', {
                        detail: { buildingType: building.type }
                    }));
                }

                Object.keys(definition.consumption || {}).forEach((resourceType) => {
                    const consumeAmount = (Number(definition.consumption[resourceType]) || 0) * deltaTime;
                    if (consumeAmount > 0) {
                        window.Resources.subtract(resourceType, consumeAmount);
                    }
                });

                Object.keys(definition.production || {}).forEach((resourceType) => {
                    const baseAmount = (Number(definition.production[resourceType]) || 0) * deltaTime;
                    const researchBonus = this.getBuildingResearchBonus(building.type, gameState);
                    const level = Math.max(0, Number(building.upgradeLevel) || 0);
                    const config = window.GAME_CONFIG || {};
                    const upgradeBonuses = (config.UPGRADE_CONFIG && Array.isArray(config.UPGRADE_CONFIG.bonuses))
                        ? config.UPGRADE_CONFIG.bonuses
                        : [];
                    const upgradeBonus = Number(upgradeBonuses[level - 1]) || 0;
                    const eventBuildingMultiplier = window.EventSystem && typeof window.EventSystem.getBuildingProductionMultiplier === 'function'
                        ? Math.max(0, Number(window.EventSystem.getBuildingProductionMultiplier(building.type)) || 1)
                        : 1;
                    const toolPenaltyMultiplier = ((Number(gameState.resources && gameState.resources.tools) || 0) <= 0
                        && Number(definition.tier) >= 2)
                        ? Math.max(0, Number((window.GAME_CONFIG || {}).TOOLS_MAINTENANCE_PRODUCTION_MULTIPLIER) || 0.7)
                        : 1;
                    const amount = baseAmount
                        * (1 + researchBonus)
                        * (1 + upgradeBonus)
                        * this.getResourceMultiplier(resourceType, gameState)
                        * eventBuildingMultiplier
                        * toolPenaltyMultiplier;
                    if (amount > 0) {
                        window.Resources.add(resourceType, amount);
                        gameState.stats.producedByTier[tier] = (Number(gameState.stats.producedByTier[tier]) || 0) + amount;
                    }
                });
            });
        }
    };

    // 전역 노출
    window.ProductionUtils = ProductionUtils;
})();
