(function () {
  'use strict';

  function getAchievedMap(gameState) {
    const source = Array.isArray(gameState.achievements) ? gameState.achievements : [];
    return source.reduce((map, item) => {
      if (typeof item === 'string') {
        map[item] = true;
      } else if (item && item.id) {
        map[item.id] = true;
      }
      return map;
    }, {});
  }

  function addResourceReward(reward) {
    if (!window.Resources || !reward) {
      return;
    }

    const resourceTypes = window.Resources && typeof window.Resources.getRegistry === 'function'
      ? Object.keys(window.Resources.getRegistry())
      : ['wood', 'stone', 'food', 'gold'];

    resourceTypes.forEach((resourceType) => {
      const amount = Math.max(0, Number(reward[resourceType]) || 0);
      if (amount > 0) {
        window.Resources.add(resourceType, amount);
      }
    });
  }

  const Achievements = {
    definitions: [
      {
        id: 'first_building',
        name: '🏠 첫 발걸음',
        description: '첫 건물을 건설했습니다',
        condition: (state) => state.stats.totalBuildingsBuilt >= 1,
        reward: { wood: 20 },
        icon: '🏠'
      },
      {
        id: 'growing_village',
        name: '👥 성장하는 마을',
        description: '인구 20명을 달성했습니다',
        condition: (state) => state.population.current >= 20,
        reward: { food: 100 },
        icon: '👥'
      },
      {
        id: 'fortified',
        name: '🏰 요새화',
        description: '성벽을 건설했습니다',
        condition: (state) => {
          if (!window.Game || typeof window.Game.getBuildingCount !== 'function') {
            return false;
          }
          return window.Game.getBuildingCount('wall') >= 1;
        },
        reward: { defenseBonus: 5 },
        icon: '🏰'
      },
      {
        id: 'wealthy_village',
        name: '💰 부자 마을',
        description: '금화 500을 보유했습니다',
        condition: (state) => (state.resources.gold || 0) >= 500,
        reward: { gold: 50 },
        icon: '💰'
      },
      {
        id: 'war_hero',
        name: '⚔️ 전쟁 영웅',
        description: '도적 습격을 5회 방어했습니다',
        condition: (state) => (state.stats.raidsDefended || 0) >= 5,
        reward: { defenseBonus: 10 },
        icon: '⚔️'
      },
      {
        id: 'eternal_lord',
        name: '🕐 영원한 영주',
        description: '1시간 동안 플레이했습니다',
        condition: (state) => state.stats.gameTime >= 3600,
        reward: { productionBonus: 0.05 },
        icon: '🕐'
      },
      {
        id: 'first_processed',
        name: '가공의 시작',
        description: '2차 가공품을 처음 생산했습니다',
        condition: (state) => (Number(state.stats && state.stats.producedByTier && state.stats.producedByTier[2]) || 0) > 0,
        reward: { lumber: 10 },
        icon: '🪓'
      },
      {
        id: 'master_craftsman',
        name: '장인의 길',
        description: '3차 완제품을 처음 생산했습니다',
        condition: (state) => (Number(state.stats && state.stats.producedByTier && state.stats.producedByTier[3]) || 0) > 0,
        reward: { furniture: 3 },
        icon: '🪑'
      },
      {
        id: 'first_research',
        name: '학문의 시작',
        description: '첫 연구를 완료했습니다',
        condition: (state) => Array.isArray(state.research && state.research.completed)
          && state.research.completed.length >= 1,
        reward: { gold: 30 },
        icon: '📚'
      },
      {
        id: 'production_chain_complete',
        name: '완벽한 공급망',
        description: '모든 생산 체인 건물을 1개 이상 보유했습니다',
        condition: () => {
          if (!window.Game || typeof window.Game.getBuildingCount !== 'function') {
            return false;
          }
          return ['sawmill', 'bakery', 'blacksmith', 'furnitureShop', 'weaponShop'].every((type) => {
            return window.Game.getBuildingCount(type) >= 1;
          });
        },
        reward: { tools: 20 },
        icon: '⚙️'
      },
      {
        id: 'village_beginning',
        name: '마을의 시작',
        description: '건물 5개를 건설했습니다',
        condition: (state) => (Number(state.stats && state.stats.totalBuildingsBuilt) || 0) >= 5,
        reward: { wood: 50 },
        icon: '🏗️'
      },
      {
        id: 'prosperous_city',
        name: '번영의 도시',
        description: '건물 20개를 건설했습니다',
        condition: (state) => (Number(state.stats && state.stats.totalBuildingsBuilt) || 0) >= 20,
        reward: { stone: 150 },
        icon: '🏙️'
      },
      {
        id: 'master_architect',
        name: '건축왕',
        description: '모든 종류의 건물을 1개 이상 보유했습니다',
        condition: () => {
          if (!window.Game || typeof window.Game.getBuildingCount !== 'function' || !window.Buildings) {
            return false;
          }
          return Object.keys(window.Buildings.definitions || {}).every((type) => window.Game.getBuildingCount(type) >= 1);
        },
        reward: { gold: 300 },
        icon: '👑'
      },
      {
        id: 'rich_person',
        name: '부호',
        description: '금화 5,000을 보유했습니다',
        condition: (state) => (Number(state.resources && state.resources.gold) || 0) >= 5000,
        reward: { gold: 250 },
        icon: '💎'
      },
      {
        id: 'tycoon',
        name: '재벌',
        description: '누적 금화 획득량이 50,000에 도달했습니다',
        condition: (state) => (Number(state.stats && state.stats.totalGoldEarned) || 0) >= 50000,
        reward: { gold: 1000 },
        icon: '🏦'
      },
      {
        id: 'trade_king',
        name: '교역왕',
        description: '교역을 50회 수행했습니다',
        condition: (state) => (Number(state.stats && state.stats.totalTradeCount) || 0) >= 50,
        reward: { gold: 300 },
        icon: '🚢'
      },
      {
        id: 'first_defense',
        name: '첫 방어',
        description: '습격을 1회 방어했습니다',
        condition: (state) => (Number(state.stats && state.stats.raidsDefended) || 0) >= 1,
        reward: { wood: 80, stone: 80 },
        icon: '🛡️'
      },
      {
        id: 'iron_wall',
        name: '철벽 방어',
        description: '습격을 10회 방어했습니다',
        condition: (state) => (Number(state.stats && state.stats.raidsDefended) || 0) >= 10,
        reward: { gold: 500 },
        icon: '🏰'
      },
      {
        id: 'plague_survivor',
        name: '역병 극복',
        description: '역병을 3회 겪고 살아남았습니다',
        condition: (state) => (Number(state.stats && state.stats.plaguesSurvived) || 0) >= 3,
        reward: { food: 300 },
        icon: '☠️'
      },
      {
        id: 'harsh_winter',
        name: '혹한의 겨울',
        description: '겨울을 10회 버텼습니다',
        condition: (state) => (Number(state.stats && state.stats.wintersSurvived) || 0) >= 10,
        reward: { food: 400 },
        icon: '❄️'
      },
      {
        id: 'small_town',
        name: '작은 마을',
        description: '최대 인구 30명을 달성했습니다',
        condition: (state) => (Number(state.stats && state.stats.maxPopulation) || 0) >= 30,
        reward: { gold: 120 },
        icon: '🏘️'
      },
      {
        id: 'urbanization',
        name: '도시화',
        description: '최대 인구 50명을 달성했습니다',
        condition: (state) => (Number(state.stats && state.stats.maxPopulation) || 0) >= 50,
        reward: { gold: 250 },
        icon: '🏙️'
      },
      {
        id: 'metropolis',
        name: '대도시',
        description: '최대 인구 100명을 달성했습니다',
        condition: (state) => (Number(state.stats && state.stats.maxPopulation) || 0) >= 100,
        reward: { gold: 800 },
        icon: '🌆'
      },
      {
        id: 'long_reign',
        name: '장기 집권',
        description: '1시간 동안 통치했습니다',
        condition: (state) => (Number(state.stats && state.stats.gameTime) || 0) >= 3600,
        reward: { gold: 200 },
        icon: '⌛'
      },
      {
        id: 'four_seasons',
        name: '사계절',
        description: '봄, 여름, 가을, 겨울을 모두 경험했습니다',
        condition: (state) => {
          const seasons = new Set(Array.isArray(state.stats && state.stats.seasonsExperienced)
            ? state.stats.seasonsExperienced
            : []);
          return ['spring', 'summer', 'autumn', 'winter'].every((id) => seasons.has(id));
        },
        reward: { food: 200, wood: 100 },
        icon: '🌈'
      },
      {
        id: 'scholar',
        name: '학자',
        description: '모든 연구를 완료했습니다',
        condition: (state) => {
          if (!window.Research || typeof window.Research.getTree !== 'function') {
            return false;
          }
          const totalResearch = Object.keys(window.Research.getTree()).length;
          const completed = Array.isArray(state.research && state.research.completed)
            ? state.research.completed.length
            : 0;
          return totalResearch > 0 && completed >= totalResearch;
        },
        reward: { gold: 600 },
        icon: '📖'
      },
      {
        id: 'first_upgrade',
        name: '첫 강화',
        description: '건물 하나를 강화했습니다',
        condition: (state) => Array.isArray(state.buildings)
          && state.buildings.some((building) => (Number(building.upgradeLevel) || 0) >= 1),
        reward: { gold: 100 },
        icon: '⬆️'
      },
      {
        id: 'full_upgrade',
        name: '풀 강화',
        description: '건물 하나를 ★5까지 강화했습니다',
        condition: (state) => Array.isArray(state.buildings)
          && state.buildings.some((building) => (Number(building.upgradeLevel) || 0) >= 5),
        reward: { gold: 500 },
        icon: '🌟'
      },
      {
        id: 'perfectionist',
        name: '완벽주의자',
        description: '모든 업적을 달성했습니다',
        condition: (state) => {
          const achievedCount = Array.isArray(state.achievements) ? state.achievements.length : 0;
          const total = window.Achievements && Array.isArray(window.Achievements.definitions)
            ? window.Achievements.definitions.length
            : 0;
          return total > 0 && achievedCount >= (total - 1);
        },
        reward: { gold: 2000 },
        icon: '🏆'
      }
    ],

    // 매 업데이트마다 호출 — 미달성 업적 확인
    check(gameState) {
      try {
        if (!gameState) {
          return false;
        }

        if (!Array.isArray(gameState.achievements)) {
          gameState.achievements = [];
        }

        const achievedMap = getAchievedMap(gameState);
        let changed = false;

        this.definitions.forEach((achievement) => {
          if (achievedMap[achievement.id]) {
            return;
          }

          if (!achievement.condition(gameState)) {
            return;
          }

          gameState.achievements.push({
            id: achievement.id,
            achievedAt: Date.now()
          });
          addResourceReward(achievement.reward);

          document.dispatchEvent(new CustomEvent('achievementUnlocked', {
            detail: { achievement }
          }));

          changed = true;
        });

        return changed;
      } catch (error) {
        console.error('[Achievements.check] 업적 판정 실패:', error);
        return false;
      }
    },

    // 전체 업적 목록 + 달성 여부 조회
    getAll(gameState) {
      const state = gameState || (window.Game && window.Game.state) || null;
      const achievedMap = state ? getAchievedMap(state) : {};

      return this.definitions.map((achievement) => ({
        ...achievement,
        achieved: Boolean(achievedMap[achievement.id])
      }));
    }
  };

  window.Achievements = Achievements;
})();
