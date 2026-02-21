(function () {
  'use strict';

  function getConfig() {
    return window.GAME_CONFIG || {
      FOOD_CONSUMPTION_PER_PERSON: 0.1,
      FOOD_SCALING_THRESHOLD: 25,
      FOOD_CONSUMPTION_SCALED: 0.12,
      POPULATION_GROWTH_TIME: 60,
      POPULATION_DECLINE_TIME: 30
    };
  }

  const Population = {
    consume(deltaTime) {
      try {
        const state = window.Utils && typeof window.Utils.getState === 'function'
          ? window.Utils.getState()
          : null;
        if (!state) {
          return 0;
        }

        // 인구 수에 비례해서 식량을 소비
        const config = getConfig();
        const dt = Math.max(0, Number(deltaTime) || 0);
        const threshold = Math.max(0, Number(config.FOOD_SCALING_THRESHOLD) || 20);
        const baseConsumption = Number(config.FOOD_CONSUMPTION_PER_PERSON) || 0.1;
        const scaledConsumption = Number(config.FOOD_CONSUMPTION_SCALED) || 0.15;
        const perPersonConsumption = state.population.current >= threshold ? scaledConsumption : baseConsumption;
        const eventMultiplier = window.EventSystem && typeof window.EventSystem.getFoodConsumptionMultiplier === 'function'
          ? Math.max(0, Number(window.EventSystem.getFoodConsumptionMultiplier()) || 1)
          : 1;
        const seasonMultiplier = window.Seasons && typeof window.Seasons.getConsumptionMultiplier === 'function'
          ? Math.max(0, Number(window.Seasons.getConsumptionMultiplier(state.stats.gameTime)) || 1)
          : 1;
        const consumption = state.population.current * perPersonConsumption * eventMultiplier * seasonMultiplier * dt;

        state.resources.food = Math.max(0, state.resources.food - consumption);
        return consumption;
      } catch (error) {
        console.error('[Population.consume] 식량 소비 처리 실패:', error);
        return 0;
      }
    },

    updateGrowth(deltaTime) {
      try {
        const state = window.Utils && typeof window.Utils.getState === 'function'
          ? window.Utils.getState()
          : null;
        if (!state) {
          return false;
        }

        const config = getConfig();
        const dt = Math.max(0, Number(deltaTime) || 0);
        const happinessMultiplier = window.Happiness && typeof window.Happiness.getGrowthMultiplier === 'function'
          ? Math.max(0, Number(window.Happiness.getGrowthMultiplier()) || 0)
          : 1;
        const seasonMultiplier = window.Seasons && typeof window.Seasons.getGrowthMultiplier === 'function'
          ? Math.max(0, Number(window.Seasons.getGrowthMultiplier(state.stats.gameTime)) || 0)
          : 1;
        const growthMultiplier = happinessMultiplier * seasonMultiplier;

        // 식량이 충분하고 최대 인구 미만일 때만 증가 타이머 진행
        if (state.resources.food > 0 && state.population.current < state.population.max && growthMultiplier > 0) {
          state.timers.populationGrowth += dt * growthMultiplier;

          while (state.timers.populationGrowth >= config.POPULATION_GROWTH_TIME) {
            if (state.population.current >= state.population.max) {
              break;
            }

            state.timers.populationGrowth -= config.POPULATION_GROWTH_TIME;
            state.population.current += 1;
            state.population.idle += 1;
            if (window.Utils && typeof window.Utils.clampPopulation === 'function') {
              window.Utils.clampPopulation(state);
            }

            document.dispatchEvent(new CustomEvent('populationChanged', {
              detail: {
                current: state.population.current,
                max: state.population.max,
                idle: state.population.idle,
                employed: state.population.employed
              }
            }));
          }
          return true;
        }

        state.timers.populationGrowth = 0;
        return false;
      } catch (error) {
        console.error('[Population.updateGrowth] 인구 증가 처리 실패:', error);
        return false;
      }
    },

    updateDecline(deltaTime) {
      try {
        const state = window.Utils && typeof window.Utils.getState === 'function'
          ? window.Utils.getState()
          : null;
        if (!state) {
          return false;
        }

        const config = getConfig();
        const dt = Math.max(0, Number(deltaTime) || 0);

        // 식량이 0이면 인구 감소 타이머 진행
        if (state.resources.food <= 0 && state.population.current > 0) {
          state.timers.populationDecline += dt;

          while (state.timers.populationDecline >= config.POPULATION_DECLINE_TIME) {
            if (state.population.current <= 0) {
              break;
            }

            state.timers.populationDecline -= config.POPULATION_DECLINE_TIME;
            state.population.current -= 1;

            if (state.population.employed > state.population.current) {
              state.population.employed = state.population.current;
            }

            if (window.Utils && typeof window.Utils.clampPopulation === 'function') {
              window.Utils.clampPopulation(state);
            }

            document.dispatchEvent(new CustomEvent('populationChanged', {
              detail: {
                current: state.population.current,
                max: state.population.max,
                idle: state.population.idle,
                employed: state.population.employed
              }
            }));
          }
          return true;
        }

        state.timers.populationDecline = 0;
        return false;
      } catch (error) {
        console.error('[Population.updateDecline] 인구 감소 처리 실패:', error);
        return false;
      }
    },

    assign(buildingType) {
      try {
        const state = window.Utils && typeof window.Utils.getState === 'function'
          ? window.Utils.getState()
          : null;
        if (!state || !window.Buildings || !window.Buildings.definitions) {
          return false;
        }

        const definition = window.Buildings.definitions[buildingType];
        if (!definition) {
          return false;
        }

        const workersNeeded = Math.max(0, Number(definition.workersNeeded) || 0);
        if (state.population.idle < workersNeeded) {
          return false;
        }

        state.population.idle -= workersNeeded;
        state.population.employed += workersNeeded;
        if (window.Utils && typeof window.Utils.clampPopulation === 'function') {
          window.Utils.clampPopulation(state);
        }

        document.dispatchEvent(new CustomEvent('populationChanged', {
          detail: {
            current: state.population.current,
            max: state.population.max,
            idle: state.population.idle,
            employed: state.population.employed
          }
        }));

        return true;
      } catch (error) {
        console.error('[Population.assign] 일꾼 배치 실패:', error);
        return false;
      }
    },

    unassign(buildingId) {
      try {
        const state = window.Utils && typeof window.Utils.getState === 'function'
          ? window.Utils.getState()
          : null;
        if (!state || !Array.isArray(state.buildings)) {
          return false;
        }

        const target = state.buildings.find((building) => building.id === buildingId);
        if (!target) {
          return false;
        }

        const workers = Math.max(0, Number(target.workers) || 0);
        if (workers <= 0) {
          return true;
        }

        target.workers = 0;
        state.population.employed -= workers;
        state.population.idle += workers;

        if (window.Utils && typeof window.Utils.clampPopulation === 'function') {
          window.Utils.clampPopulation(state);
        }

        document.dispatchEvent(new CustomEvent('workersUnassigned', {
          detail: { buildingId, workers }
        }));

        document.dispatchEvent(new CustomEvent('populationChanged', {
          detail: {
            current: state.population.current,
            max: state.population.max,
            idle: state.population.idle,
            employed: state.population.employed
          }
        }));

        return true;
      } catch (error) {
        console.error('[Population.unassign] 일꾼 해제 실패:', error);
        return false;
      }
    },

    reassign(buildingId) {
      try {
        const state = window.Utils && typeof window.Utils.getState === 'function'
          ? window.Utils.getState()
          : null;
        if (!state || !Array.isArray(state.buildings) || !window.Buildings || !window.Buildings.definitions) {
          return false;
        }

        const target = state.buildings.find((building) => building.id === buildingId);
        if (!target) {
          return false;
        }

        const definition = window.Buildings.definitions[target.type];
        if (!definition) {
          return false;
        }

        const workersNeeded = Math.max(0, Number(definition.workersNeeded) || 0);
        if (workersNeeded <= 0) {
          target.workers = 0;
          return true;
        }

        if (state.population.idle < workersNeeded) {
          return false;
        }

        target.workers = workersNeeded;
        state.population.idle -= workersNeeded;
        state.population.employed += workersNeeded;

        if (window.Utils && typeof window.Utils.clampPopulation === 'function') {
          window.Utils.clampPopulation(state);
        }

        document.dispatchEvent(new CustomEvent('workersReassigned', {
          detail: { buildingId, workers: workersNeeded }
        }));

        document.dispatchEvent(new CustomEvent('populationChanged', {
          detail: {
            current: state.population.current,
            max: state.population.max,
            idle: state.population.idle,
            employed: state.population.employed
          }
        }));

        return true;
      } catch (error) {
        console.error('[Population.reassign] 일꾼 재배치 실패:', error);
        return false;
      }
    },
    assignOne(buildingId) {
      try {
        const state = window.Utils && typeof window.Utils.getState === 'function'
          ? window.Utils.getState()
          : null;
        if (!state || !Array.isArray(state.buildings) || !window.Buildings || !window.Buildings.definitions) {
          return false;
        }

        const target = state.buildings.find((building) => building.id === buildingId);
        if (!target) {
          return false;
        }

        const definition = window.Buildings.definitions[target.type];
        if (!definition) {
          return false;
        }

        const workersNeeded = Math.max(0, Number(definition.workersNeeded) || 0);
        const currentWorkers = Math.max(0, Number(target.workers) || 0);

        // 이미 최대 인원이면 실패
        if (currentWorkers >= workersNeeded) {
          return false;
        }

        // 유휴 인구가 없으면 실패
        if (state.population.idle < 1) {
          return false;
        }

        target.workers = currentWorkers + 1;
        state.population.idle -= 1;
        state.population.employed += 1;

        if (window.Utils && typeof window.Utils.clampPopulation === 'function') {
          window.Utils.clampPopulation(state);
        }

        document.dispatchEvent(new CustomEvent('workersReassigned', {
          detail: { buildingId, workers: target.workers }
        }));

        document.dispatchEvent(new CustomEvent('populationChanged', {
          detail: {
            current: state.population.current,
            max: state.population.max,
            idle: state.population.idle,
            employed: state.population.employed
          }
        }));

        return true;
      } catch (error) {
        console.error('[Population.assignOne] 일꾼 1명 배치 실패:', error);
        return false;
      }
    },

    // ── 노동자 1명 해제 ──
    unassignOne(buildingId) {
      try {
        const state = window.Utils && typeof window.Utils.getState === 'function'
          ? window.Utils.getState()
          : null;
        if (!state || !Array.isArray(state.buildings)) {
          return false;
        }

        const target = state.buildings.find((building) => building.id === buildingId);
        if (!target) {
          return false;
        }

        const currentWorkers = Math.max(0, Number(target.workers) || 0);

        // 이미 0명이면 실패
        if (currentWorkers <= 0) {
          return false;
        }

        target.workers = currentWorkers - 1;
        state.population.employed -= 1;
        state.population.idle += 1;

        if (window.Utils && typeof window.Utils.clampPopulation === 'function') {
          window.Utils.clampPopulation(state);
        }

        document.dispatchEvent(new CustomEvent('workersReassigned', {
          detail: { buildingId, workers: target.workers }
        }));

        document.dispatchEvent(new CustomEvent('populationChanged', {
          detail: {
            current: state.population.current,
            max: state.population.max,
            idle: state.population.idle,
            employed: state.population.employed
          }
        }));

        return true;
      } catch (error) {
        console.error('[Population.unassignOne] 일꾼 1명 해제 실패:', error);
        return false;
      }
    }
  };

  window.Population = Population;
})();
