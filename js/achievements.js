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
        id: 'tech_master',
        name: '기술의 정점',
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
        reward: { gold: 100 },
        icon: '🏦'
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
