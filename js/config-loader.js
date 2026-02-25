/**
 * config-loader.js
 * XML 데이터 파일들을 비동기로 로드하여 window.GameData에 저장합니다.
 * 모든 게임 모듈은 초기화 시 window.GameData에서 데이터를 읽어옵니다.
 */
(function () {
    'use strict';

    const DATA_FILES = [
        { key: 'config', url: 'data/config.xml' },
        { key: 'buildings', url: 'data/buildings.xml' },
        { key: 'events', url: 'data/events.xml' },
        { key: 'research', url: 'data/research.xml' },
        { key: 'achievements', url: 'data/achievements.xml' },
        { key: 'trade', url: 'data/trade.xml' },
        { key: 'seasons', url: 'data/seasons.xml' },
        { key: 'tribute', url: 'data/tribute.xml' },
    ];

    const parser = new DOMParser();

    /**
     * 단일 XML 파일을 fetch하여 파싱된 Document를 반환합니다.
     * @param {string} url
     * @returns {Promise<Document>}
     */
    async function fetchXml(url) {
        const response = await fetch(url + '?v=0.5.0');
        if (!response.ok) {
            throw new Error('[ConfigLoader] ' + url + ' 로드 실패: HTTP ' + response.status);
        }
        const text = await response.text();
        const doc = parser.parseFromString(text, 'text/xml');
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            throw new Error('[ConfigLoader] ' + url + ' XML 파싱 오류: ' + parseError.textContent);
        }
        return doc;
    }

    /**
     * <cost wood="10" stone="5" /> 형태의 엘리먼트 속성을 객체로 변환합니다.
     * @param {Element|null} el
     * @returns {Record<string, number>}
     */
    function parseResourceAttrs(el) {
        if (!el) return {};
        const result = {};
        Array.from(el.attributes).forEach(function (attr) {
            const val = Number(attr.value);
            if (!Number.isNaN(val)) {
                result[attr.name] = val;
            }
        });
        return result;
    }

    /**
     * config.xml → GAME_CONFIG 객체
     * @param {Document} doc
     * @returns {object}
     */
    function parseConfig(doc) {
        const config = {};
        doc.querySelectorAll('param').forEach(function (param) {
            const key = param.getAttribute('key');
            const rawVal = param.getAttribute('value');
            if (!key) return;
            // 숫자면 숫자로, 아니면 문자열 유지
            const numVal = Number(rawVal);
            config[key] = Number.isNaN(numVal) ? rawVal : numVal;
        });
        // UPGRADE_CONFIG 중첩 파싱
        const upgradeEl = doc.querySelector('upgradeConfig');
        if (upgradeEl) {
            config.UPGRADE_CONFIG = {
                maxLevel: Number(upgradeEl.getAttribute('maxLevel')) || 5,
                costs: upgradeEl.getAttribute('costs').split(',').map(Number),
                bonuses: upgradeEl.getAttribute('bonuses').split(',').map(Number)
            };
        }
        // MERCENARY_CONFIG 중첩 파싱
        const mercEl = doc.querySelector('mercenaryConfig');
        if (mercEl) {
            config.MERCENARY_CONFIG = {};
            mercEl.querySelectorAll('type').forEach(function (typeEl) {
                const id = typeEl.getAttribute('id');
                const obj = {};
                Array.from(typeEl.attributes).forEach(function (attr) {
                    if (attr.name === 'id') return;
                    const v = Number(attr.value);
                    obj[attr.name] = Number.isNaN(v) ? attr.value : v;
                });
                config.MERCENARY_CONFIG[id] = obj;
            });
        }
        return config;
    }

    /**
     * buildings.xml → buildingDefs 객체
     * @param {Document} doc
     * @returns {object}
     */
    function parseBuildings(doc) {
        const defs = {};
        doc.querySelectorAll('building').forEach(function (node) {
            const id = node.getAttribute('id');
            if (!id) return;

            // unlock 조건 파싱
            const unlockEl = node.querySelector('unlock');
            const unlock = {};
            if (unlockEl) {
                // 인구 조건
                const popReq = unlockEl.getAttribute('population');
                if (popReq) unlock.population = Number(popReq);

                // 조공 조건
                const tributeReq = unlockEl.getAttribute('tribute');
                if (tributeReq) unlock.tribute = tributeReq;

                // 건물 조건
                const buildingReqs = {};
                unlockEl.querySelectorAll('requires[type="building"]').forEach(function (req) {
                    buildingReqs[req.getAttribute('id')] = Number(req.getAttribute('count')) || 1;
                });
                if (Object.keys(buildingReqs).length > 0) unlock.buildings = buildingReqs;

                // 연구 조건
                const researchReqs = [];
                unlockEl.querySelectorAll('requires[type="research"]').forEach(function (req) {
                    researchReqs.push(req.getAttribute('id'));
                });
                if (researchReqs.length > 0) unlock.research = researchReqs;
            }

            // effect 파싱
            const effectEl = node.querySelector('effect');
            const effect = {};
            if (effectEl) {
                Array.from(effectEl.attributes).forEach(function (attr) {
                    if (attr.value === 'true') effect[attr.name] = true;
                    else if (attr.value === 'false') effect[attr.name] = false;
                    else {
                        const v = Number(attr.value);
                        effect[attr.name] = Number.isNaN(v) ? attr.value : v;
                    }
                });
            }

            defs[id] = {
                id: id,
                name: node.getAttribute('name') || id,
                category: node.getAttribute('category') || 'resource',
                tier: Number(node.getAttribute('tier')) || 1,
                cost: parseResourceAttrs(node.querySelector('cost')),
                consumption: parseResourceAttrs(node.querySelector('consumption')),
                production: parseResourceAttrs(node.querySelector('production')),
                workersNeeded: Number(node.querySelector('workers') && node.querySelector('workers').textContent) || 0,
                effect: Object.keys(effect).length > 0 ? effect : undefined,
                unlock: unlock,
                description: (node.querySelector('description') && node.querySelector('description').textContent) || ''
            };
        });
        return defs;
    }

    /**
     * events.xml → eventDefinitions 배열
     * @param {Document} doc
     * @returns {Array}
     */
    function parseEvents(doc) {
        const defs = [];
        doc.querySelectorAll('event').forEach(function (node) {
            const id = node.getAttribute('id');
            if (!id) return;

            const effectEl = node.querySelector('effect');
            const effect = {};
            if (effectEl) {
                const type = effectEl.getAttribute('type');
                if (type === 'productionMultiplier') {
                    effect.productionMultiplier = {};
                    effectEl.querySelectorAll('resource').forEach(function (res) {
                        effect.productionMultiplier[res.getAttribute('name')] = Number(res.getAttribute('value'));
                    });
                } else if (type === 'immediate') {
                    effect.immediate = effectEl.getAttribute('action');
                    const extra = effectEl.getAttribute('extra');
                    if (extra) {
                        const extraParsed = Number(extra);
                        effect[effectEl.getAttribute('extraKey') || 'extraValue'] = Number.isNaN(extraParsed) ? extra : extraParsed;
                    }
                    // tradeDiscountMultiplier 처리
                    const tdm = effectEl.getAttribute('tradeDiscountMultiplier');
                    if (tdm) effect.tradeDiscountMultiplier = Number(tdm);
                } else if (type === 'foodConsumptionMultiplier') {
                    effect.foodConsumptionMultiplier = Number(effectEl.getAttribute('value'));
                } else if (type === 'targetBuildingDiscount') {
                    effect.targetBuildingDiscount = Number(effectEl.getAttribute('value'));
                }
            }

            defs.push({
                id: id,
                name: node.getAttribute('name') || id,
                type: node.getAttribute('type') || 'neutral',
                description: (node.querySelector('description') && node.querySelector('description').textContent) || '',
                duration: Number((node.querySelector('duration') && node.querySelector('duration').textContent) || 0),
                weight: Number((node.querySelector('weight') && node.querySelector('weight').textContent) || 10),
                minGameTime: Number((node.querySelector('minGameTime') && node.querySelector('minGameTime').textContent) || 0),
                effect: effect
            });
        });
        return defs;
    }

    /**
     * research.xml → RESEARCH_TREE 객체 + RESEARCH_BUILDING_REQUIREMENTS 객체
     * @param {Document} doc
     * @returns {{tree: object, requirements: object}}
     */
    function parseResearch(doc) {
        const tree = {};
        doc.querySelectorAll('research').forEach(function (node) {
            const id = node.getAttribute('id');
            if (!id) return;

            const effectEl = node.querySelector('effect');
            const effect = {};
            if (effectEl) {
                effect.type = effectEl.getAttribute('type');
                const target = effectEl.getAttribute('target');
                if (target) effect.target = target;
                const bonus = effectEl.getAttribute('bonus');
                if (bonus) effect.bonus = Number(bonus);
            }

            const requires = [];
            node.querySelectorAll('requires[id]').forEach(function (req) {
                requires.push(req.getAttribute('id'));
            });

            tree[id] = {
                id: id,
                name: node.getAttribute('name') || id,
                icon: node.getAttribute('icon') || '🔬',
                cost: parseResourceAttrs(node.querySelector('cost')),
                researchTime: Number((node.querySelector('researchTime') && node.querySelector('researchTime').textContent) || 120),
                effect: effect,
                requires: requires,
                description: (node.querySelector('description') && node.querySelector('description').textContent) || ''
            };
        });

        // 건물 해금 요구 연구 역방향 맵
        const requirements = {};
        Object.values(tree).forEach(function (tech) {
            if (tech.effect && tech.effect.type === 'unlock_building' && tech.effect.target) {
                if (!requirements[tech.effect.target]) requirements[tech.effect.target] = [];
                requirements[tech.effect.target].push(tech.id);
            }
        });

        return { tree: tree, requirements: requirements };
    }

    /**
     * achievements.xml → definitions 배열
     * conditionType 기반으로 condition 함수를 생성합니다.
     * @param {Document} doc
     * @returns {Array}
     */
    function parseAchievements(doc) {
        const defs = [];
        doc.querySelectorAll('achievement').forEach(function (node) {
            const id = node.getAttribute('id');
            if (!id) return;

            const condEl = node.querySelector('condition');
            const condType = condEl ? condEl.getAttribute('type') : null;
            const condKey = condEl ? condEl.getAttribute('key') : null;
            const condOp = condEl ? condEl.getAttribute('operator') : '>=';
            const condThreshold = condEl ? Number(condEl.getAttribute('threshold')) : 0;

            // condition 함수 생성 (conditionType 기반 디스패처)
            const condition = makeConditionFn(id, condType, condKey, condOp, condThreshold);
            const reward = parseResourceAttrs(node.querySelector('reward'));

            defs.push({
                id: id,
                name: node.getAttribute('name') || id,
                category: node.getAttribute('category') || 'special',
                icon: node.getAttribute('icon') || '🏆',
                description: (node.querySelector('description') && node.querySelector('description').textContent) || '',
                condition: condition,
                reward: reward
            });
        });
        return defs;
    }

    /**
     * conditionType → condition 함수 생성
     */
    function makeConditionFn(id, type, key, op, threshold) {
        function compare(val, thr) {
            if (op === '>=') return val >= thr;
            if (op === '>') return val > thr;
            if (op === '<=') return val <= thr;
            if (op === '<') return val < thr;
            if (op === '===') return val === thr;
            return val >= thr;
        }

        if (type === 'stat') {
            return function (state) {
                return compare(Number(state.stats && state.stats[key]) || 0, threshold);
            };
        }
        if (type === 'population') {
            return function (state) {
                return compare(Number(state.population && state.population[key]) || 0, threshold);
            };
        }
        if (type === 'resource') {
            return function (state) {
                return compare(Number(state.resources && state.resources[key]) || 0, threshold);
            };
        }
        if (type === 'research_count') {
            return function (state) {
                const count = Array.isArray(state.research && state.research.completed) ? state.research.completed.length : 0;
                return compare(count, threshold);
            };
        }
        if (type === 'building_level') {
            return function (state) {
                return Array.isArray(state.buildings) &&
                    state.buildings.some(function (b) { return compare(Number(b.upgradeLevel) || 0, threshold); });
            };
        }
        if (type === 'population_tier') {
            return function (state) {
                return compare(Number(state.stats && state.stats.maxPopulation) || 0, threshold);
            };
        }
        if (type === 'seasons_all') {
            return function (state) {
                const seasons = new Set(Array.isArray(state.stats && state.stats.seasonsExperienced) ? state.stats.seasonsExperienced : []);
                return ['spring', 'summer', 'autumn', 'winter'].every(function (s) { return seasons.has(s); });
            };
        }
        // 커스텀 조건 — custom_{id} 방식으로 외부에서 주입 가능
        if (type === 'custom') {
            return function (state) {
                const customFn = window._AchievementCustomConditions && window._AchievementCustomConditions[id];
                return customFn ? customFn(state) : false;
            };
        }
        // fallback: 항상 false
        return function () { return false; };
    }

    /**
     * trade.xml → baseRates 객체
     * @param {Document} doc
     * @returns {object}
     */
    function parseTrade(doc) {
        const baseRates = {};
        doc.querySelectorAll('from').forEach(function (fromEl) {
            const fromRes = fromEl.getAttribute('resource');
            if (!fromRes) return;
            baseRates[fromRes] = {};
            fromEl.querySelectorAll('to').forEach(function (toEl) {
                const toRes = toEl.getAttribute('resource');
                const rate = Number(toEl.getAttribute('rate'));
                if (toRes && !Number.isNaN(rate)) {
                    baseRates[fromRes][toRes] = rate;
                }
            });
        });
        return baseRates;
    }

    /**
     * seasons.xml → definitions 배열
     * @param {Document} doc
     * @returns {Array}
     */
    function parseSeasons(doc) {
        const defs = [];
        doc.querySelectorAll('season').forEach(function (node) {
            const id = node.getAttribute('id');
            if (!id) return;
            defs.push({
                id: id,
                name: node.getAttribute('name') || id,
                productionMultiplier: parseResourceAttrs(node.querySelector('productionMultiplier')),
                growthMultiplier: Number(node.getAttribute('growthMultiplier')) || 1.0,
                consumptionMultiplier: Number(node.getAttribute('consumptionMultiplier')) || 1.0
            });
        });
        return defs;
    }

    /**
     * tribute.xml → TRIBUTE_DEFS 객체
     * @param {Document} doc
     * @returns {object}
     */
    function parseTribute(doc) {
        const defs = {};
        doc.querySelectorAll('tribute').forEach(function (node) {
            const id = node.getAttribute('id');
            if (!id) return;

            // reward 파싱
            const rewardEl = node.querySelector('reward');
            let reward = {};
            if (rewardEl) {
                reward.type = rewardEl.getAttribute('type');
                const min = rewardEl.getAttribute('min');
                const max = rewardEl.getAttribute('max');
                const bonus = rewardEl.getAttribute('bonus');
                const target = rewardEl.getAttribute('target');
                if (min) reward.min = Number(min);
                if (max) reward.max = Number(max);
                if (bonus) reward.bonus = Number(bonus);
                if (target) reward.target = target;
                // multi 효과
                const effects = [];
                rewardEl.querySelectorAll('effect').forEach(function (effectEl) {
                    const eff = { type: effectEl.getAttribute('type') };
                    const effBonus = effectEl.getAttribute('bonus');
                    if (effBonus) eff.bonus = Number(effBonus);
                    effects.push(eff);
                });
                if (effects.length > 0) reward.effects = effects;
            }

            const oneTime = node.getAttribute('oneTime');
            defs[id] = {
                id: id,
                name: node.getAttribute('name') || id,
                cost: Number(node.getAttribute('cost')) || 0,
                reward: reward,
                cooldown: Number(node.getAttribute('cooldown')) || 0
            };
            if (oneTime === 'true') defs[id].oneTime = true;
        });
        return defs;
    }

    /**
     * 파서 맵: key → 파서 함수
     */
    const PARSERS = {
        config: parseConfig,
        buildings: parseBuildings,
        events: parseEvents,
        research: parseResearch,
        achievements: parseAchievements,
        trade: parseTrade,
        seasons: parseSeasons,
        tribute: parseTribute
    };

    /**
     * 모든 XML 파일을 동기 XHR로 로드합니다.
     * index.html에서 다른 <script> 태그보다 먼저 인라인으로 호출해야 합니다.
     * 이렇게 하면 buildings.js, events.js 등의 IIFE가 실행될 때 window.GameData가 이미 채워져 있습니다.
     */
    function loadAllSync() {
        window.GameData = {};

        DATA_FILES.forEach(function (fileInfo) {
            const key = fileInfo.key;
            const url = fileInfo.url;
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url + '?v=0.5.0', false); // false = 동기
                xhr.send();
                if (xhr.status === 200) {
                    const doc = parser.parseFromString(xhr.responseText, 'text/xml');
                    const parseError = doc.querySelector('parsererror');
                    if (parseError) throw new Error('XML 파싱 오류: ' + parseError.textContent);
                    window.GameData[key] = PARSERS[key] ? PARSERS[key](doc) : doc;
                } else {
                    console.warn('[ConfigLoader] ' + url + ' HTTP ' + xhr.status);
                }
            } catch (err) {
                console.error('[ConfigLoader] ' + key + ' 동기 로드 실패:', err);
            }
        });

        console.log('[ConfigLoader] 동기 로드 완료:', Object.keys(window.GameData));
    }

    /**
     * 모든 XML 파일을 병렬 fetch → 파싱 → window.GameData에 저장합니다. (비동기 버전)
     * @returns {Promise<void>}
     */
    async function loadAll() {
        window.GameData = {};

        const results = await Promise.all(
            DATA_FILES.map(async function ({ key, url }) {
                try {
                    const doc = await fetchXml(url);
                    return { key: key, doc: doc };
                } catch (err) {
                    console.error('[ConfigLoader] ' + key + ' 로드 실패:', err);
                    return { key: key, doc: null };
                }
            })
        );

        results.forEach(function ({ key, doc }) {
            if (!doc) return;
            try {
                window.GameData[key] = PARSERS[key] ? PARSERS[key](doc) : doc;
            } catch (err) {
                console.error('[ConfigLoader] ' + key + ' 파싱 실패:', err);
            }
        });

        console.log('[ConfigLoader] 데이터 로드 완료:', Object.keys(window.GameData));
    }

    window.ConfigLoader = { loadAll: loadAll, loadAllSync: loadAllSync };
})();
