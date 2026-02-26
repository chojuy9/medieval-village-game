(function () {
  'use strict';

  // 이전 자원 값 (변경 감지용) — ui.js의 _prevResources에서 분리
  const _prevResources = {};

  // 자원 정보 업데이트
  function updateResources() {
    try {
      const allResources = window.Resources ? Object.keys(Resources.getRegistry()) : ['wood', 'stone', 'food', 'gold', 'lumber', 'bread', 'tools', 'furniture', 'weapons'];

      // 생산량 계산 캐시
      let production = {};
      let consumption = {};
      if (window.Buildings) {
        production = Buildings.getTotalProduction();
        consumption = getConsumptionRates();
      }

      allResources.forEach(type => {
        // 1. 보유량 업데이트
        const amountEl = document.getElementById(`${type}-amount`);
        if (amountEl) {
          amountEl.textContent = Utils.formatNumber(Math.floor(Game.state.resources[type] || 0));
        }

        // 2. 생산/소비량(증감률) 업데이트
        const rateEl = document.getElementById(`${type}-rate`);
        if (rateEl) {
          const net = (production[type] || 0) - (consumption[type] || 0);
          const sign = net >= 0 ? '+' : '';
          rateEl.textContent = `${sign}${net.toFixed(1)}/초`;
          rateEl.className = 'res-rate resource-rate ' + (net > 0 ? 'positive' : net < 0 ? 'negative' : 'neutral');
        }

        // 3. 티어 2 이상 자원은 건물이 있거나 자원이 1 이상일 때만 표시
        if (amountEl) {
          const parentItem = amountEl.closest('.res-item');
          if (parentItem) {
            if (window.Resources) {
              const registry = Resources.getRegistry();
              const def = registry[type];
              if (def && def.tier > 1) {
                const hasAnyResource = (Game.state.resources[type] || 0) >= 0.1;
                const hasTierBuilding = window.Buildings && Game.state.buildings.some(b => {
                  const bDef = Buildings.definitions[b.type];
                  return bDef && bDef.tier === def.tier;
                });

                if (!hasTierBuilding && !hasAnyResource) {
                  parentItem.style.display = 'none';
                } else {
                  parentItem.style.display = 'flex';
                }
              }
            }
          }
        }
      });

    } catch (error) {
      console.error('[UIResources.updateResources] 자원 UI 업데이트 실패:', error);
    }
  }

  // 자원별 소비량 계산 (건물 소비 + 식량 소비)
  function getConsumptionRates() {
    const state = Game.state;

    if (Game && typeof Game.getConsumptionRates === 'function') {
      return Game.getConsumptionRates();
    }

    const rates = {};

    // 건물 소비량 합산
    if (window.Buildings && Array.isArray(state.buildings)) {
      state.buildings.forEach(b => {
        const def = Buildings.definitions[b.type];
        if (!def) return;
        if ((def.workersNeeded || 0) > 0 && (b.workers || 0) <= 0) return;
        Object.entries(def.consumption || {}).forEach(([type, amount]) => {
          rates[type] = (rates[type] || 0) + (Number(amount) || 0);
        });
      });
    }

    // 식량 소비 추가
    const config = window.GAME_CONFIG || {};
    const threshold = config.FOOD_SCALING_THRESHOLD || 20;
    const baseCons = config.FOOD_CONSUMPTION_PER_PERSON || 0.1;
    const scaledCons = config.FOOD_CONSUMPTION_SCALED || 0.15;
    const perPerson = state.population.current >= threshold ? scaledCons : baseCons;
    rates.food = (rates.food || 0) + state.population.current * perPerson;

    const breadPerPerson = Number(config.BREAD_CONSUMPTION_PER_PERSON) || 0.03;
    rates.bread = (rates.bread || 0) + state.population.current * breadPerPerson;

    const tier2PlusCount = Array.isArray(state.buildings)
      ? state.buildings.filter((building) => {
        const def = window.Buildings && window.Buildings.definitions
          ? window.Buildings.definitions[building.type]
          : null;
        return def && Number(def.tier) >= 2;
      }).length
      : 0;
    const toolMaintenance = Number(config.TOOLS_MAINTENANCE_PER_TIER2_BUILDING) || 0.008;
    rates.tools = (rates.tools || 0) + tier2PlusCount * toolMaintenance;

    if (state.mercenaries && state.mercenaries.nightWatch) {
      rates.gold = (rates.gold || 0) + (Number(config.GOLD_SINK_NIGHTWATCH_GOLD_PER_SEC) || 5);
    }

    return rates;
  }

  // 자원 변화 플로팅 숫자 표시
  function showResourceFloat(elementId, amount) {
    try {
      const el = document.getElementById(elementId);
      if (!el) return;

      const float = document.createElement('span');
      float.className = `resource-float ${amount > 0 ? 'float-positive' : 'float-negative'}`;
      float.textContent = `${amount > 0 ? '+' : ''}${Utils.formatNumber(amount)}`;
      el.parentElement.style.position = 'relative';
      el.parentElement.appendChild(float);

      setTimeout(() => float.remove(), 1000);
    } catch (error) {
      console.error('[UIResources.showResourceFloat] 플로팅 숫자 표시 실패:', error);
    }
  }

  // 값 변경 하이라이트 (조건부)
  function highlightValueChange(elementId, newValue) {
    try {
      const el = document.getElementById(elementId);
      if (!el) return;

      const prevValue = _prevResources[elementId];
      if (prevValue !== undefined && prevValue !== newValue) {
        el.classList.add('value-changed');
        setTimeout(() => el.classList.remove('value-changed'), 500);
      }
      _prevResources[elementId] = newValue;
    } catch (error) {
      console.error('[UIResources.highlightValueChange] 값 변경 하이라이트 실패:', error);
    }
  }

  // 건물 비용 색상 분기 포맷팅
  function formatCost(resourceType, cost, current) {
    const icon = Utils.getResourceIcon(resourceType);
    const isEnough = current >= cost;
    const colorClass = isEnough ? 'cost-sufficient' : 'cost-insufficient';
    return `<span class="${colorClass}">${icon} ${cost}</span>`;
  }

  window.UIResources = {
    updateResources,
    getConsumptionRates,
    showResourceFloat,
    highlightValueChange,
    formatCost
  };
})();
