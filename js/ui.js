(function () {
  'use strict';

  // Note: SoundManager는 이제 sound.js에 있습니다.

  // UI 업데이트 및 이벤트 처리
  const UI = {
    // 메시지 타이머 참조
    messageTimer: null,
    // 건설된 건물 목록 캐시 키 (변경 없으면 DOM 재생성 스킵)
    _buildingsCacheKey: null,
    // 이전 해금 상태 캐시
    _unlockedCache: {},
    // 이벤트 배너 업데이트 인터벌
    _eventBannerInterval: null,
    // 교역 컨트롤 초기화 완료 여부
    _tradeControlsInitialized: false,
    // 이전 자원 값 (변경 감지용)
    _prevResources: {},

    // 초기화
    init() {
      try {
        // 사운드 매니저 초기화
        SoundManager.init();

        // 이벤트 리스너 맵 (선언적 패턴)
        const EVENT_HANDLERS = {
          gameStateChanged: () => this.updateAll(),
          buildingBuilt: (e) => this.onBuildingBuilt(e),
          resourceInsufficient: (e) => this.showError(e),
          populationChanged: (e) => this.onPopulationChanged(e),
          eventTriggered: (e) => this.onEventTriggered(e),
          eventResolved: (e) => this.onEventResolved(e),
          buildingDemolished: (e) => this.onBuildingDemolished(e),
          workersUnassigned: () => {
            this._buildingsCacheKey = null;
            this.updateBuiltBuildings();
          },
          workersReassigned: () => {
            this._buildingsCacheKey = null;
            this.updateBuiltBuildings();
          },
          tradeExecuted: () => this.updateTradeRate(),
          achievementUnlocked: (e) => {
            this.showAchievementNotification(e.detail.achievement);
            this.updateAchievementsPanel();
          },
          seasonChanged: (e) => {
            if (e.detail && e.detail.season) {
              const banner = document.getElementById('status-bar'); // Now the season block
              if (banner) {
                banner.classList.remove('spring', 'summer', 'autumn', 'winter');
                banner.classList.add(e.detail.season.id);
              }
            }
          },
          happinessChanged: () => this.updateHappiness(),
          productionStalled: (e) => {
            const { buildingType, missingResources } = e.detail;
            this.showProductionStalled(buildingType, missingResources);
          },
          productionResumed: (e) => {
            const { buildingType } = e.detail;
            this.hideProductionStalled(buildingType);
          },
          researchProgress: (e) => {
            const { progress, total } = e.detail;
            this.updateResearchProgress(progress, total);
          },
          researchCompleted: (e) => {
            const { tech } = e.detail;
            this.onResearchCompleted(tech);
          },
          researchStarted: () => {
            SoundManager.play('research');
            this.updateResearchPanel();
          },
          offlineProgressApplied: (e) => {
            const { seconds, resources } = e.detail;
            this.showOfflineReport(seconds, resources);
          },
          // v0.3 신규 이벤트
          buildingUpgraded: (e) => {
            const { buildingId, newLevel } = e.detail;
            const building = Game.state.buildings.find(b => b.id === buildingId);
            const def = building && window.Buildings && window.Buildings.definitions[building.type];
            const name = def ? def.name : '건물';
            this.showMessage(`${name} 강화 완료! ★${newLevel}`, 'success');
            SoundManager.play('upgrade');
          },
          tributeExecuted: (e) => {
            this.updateTributePanel();
          },
          mercenaryHired: (e) => {
            this.updateMercenaryPanel();
          },
          mercenaryExpired: (e) => {
            this.showMessage('순찰병 계약이 만료되었습니다.', 'warning');
            this.updateMercenaryPanel();
          },
          saveLoadFailed: (e) => {
            this.showMessage('저장 파일이 손상되었습니다. 새 게임을 시작합니다.', 'error');
          }
        };

        // 이벤트 리스너 일괄 등록
        Object.entries(EVENT_HANDLERS).forEach(([event, handler]) => {
          document.addEventListener(event, handler);
        });

        // DOM 요소 이벤트 리스너 설정
        // 튜토리얼 확인 버튼
        document.getElementById('tutorial-dismiss').addEventListener('click', () => {
          this.hideTutorial();
        });

        // 건물 버튼 생성
        this.createBuildingButtons();

        // 조공 / 용병 카드 초기 생성 (ui-tribute.js, ui-mercenary.js에서 UI에 메서드 주입)
        if (typeof this.createTributeCards === 'function') {
          this.createTributeCards();
        }
        if (typeof this.createMercenaryCards === 'function') {
          this.createMercenaryCards();
        }

        // 저장 버튼
        document.getElementById('save-btn').addEventListener('click', () => {
          Game.save();
          this.showMessage('게임이 저장되었습니다!', 'success');
        });

        // 불러오기 버튼
        document.getElementById('load-btn').addEventListener('click', () => {
          if (Game.load()) {
            this._buildingsCacheKey = null; // 불러오기 시 강제 재렌더링
            this._tradeControlsInitialized = false; // 교역 컨트롤 재초기화
            this.showMessage('게임을 불러왔습니다!', 'success');
          } else {
            this.showMessage('저장된 게임이 없습니다.', 'error');
          }
        });

        // 메뉴 버튼
        document.getElementById('menu-btn').addEventListener('click', () => {
          this.openMenu();
        });

        // 메뉴 닫기 버튼
        document.getElementById('close-menu-btn').addEventListener('click', () => {
          this.closeMenu();
        });

        // 모달 바깥 클릭 시 닫기
        document.getElementById('menu-modal').addEventListener('click', (e) => {
          if (e.target === document.getElementById('menu-modal')) {
            this.closeMenu();
          }
        });

        // 새 게임 버튼 → 확인 패널 토글
        document.getElementById('new-game-btn').addEventListener('click', () => {
          document.getElementById('new-game-confirm').classList.toggle('hidden');
        });

        // 새 게임 확인
        document.getElementById('new-game-confirm-btn').addEventListener('click', () => {
          Game.reset();
          this._buildingsCacheKey = null;
          this._tradeControlsInitialized = false;
          this.closeMenu();
          this.showMessage('새 게임을 시작합니다!', 'success');
        });

        // 새 게임 취소
        document.getElementById('new-game-cancel-btn').addEventListener('click', () => {
          document.getElementById('new-game-confirm').classList.add('hidden');
        });

        // 사운드 토글 버튼
        document.getElementById('sound-toggle-btn').addEventListener('click', () => {
          const enabled = SoundManager.toggle();
          const btn = document.getElementById('sound-toggle-btn');
          btn.textContent = enabled ? '🔊' : '🔇';
          btn.classList.toggle('muted', !enabled);
        });

        // 탭 네비게이션 초기화
        this.initTabNavigation();

        // v0.3 AI2 - 금화 소비처 버튼 이벤트 핸들러
        this.initGoldSinkButtons();

        // 초기 UI 업데이트
        // 초기 계절 배경 적용
        if (window.Seasons) {
          const initSeason = Seasons.getCurrentSeason(Game.state.stats.gameTime);
          if (initSeason) {
            const banner = document.getElementById('status-bar'); // Now the season block
            if (banner) {
              banner.classList.remove('spring', 'summer', 'autumn', 'winter');
              banner.classList.add(initSeason.id);
            }
          }
        }

        // 교역 컨트롤 플래그 초기화 (시장이 있는 상태로 불러왔을 때 대비)
        this._tradeControlsInitialized = false;

        this.updateAll();

      } catch (error) {
        console.error('[UI.init] UI 초기화 실패:', error);
      }
    },

    // 탭 네비게이션 초기화
    initTabNavigation() {
      try {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            // 다른 탭 비활성화
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // 클릭된 탭 활성화
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            const targetContent = document.getElementById(`tab-${tabId}`);
            if (targetContent) {
              targetContent.classList.add('active');
            }
          });
        });
      } catch (error) {
        console.error('[UI.initTabNavigation] 탭 네비게이션 초기화 실패:', error);
      }
    },

    // 메뉴 열기
    openMenu() {
      document.getElementById('new-game-confirm').classList.add('hidden');
      document.getElementById('menu-modal').classList.remove('hidden');
    },

    // 메뉴 닫기
    closeMenu() {
      document.getElementById('menu-modal').classList.add('hidden');
    },

    // 전체 UI 업데이트
    updateAll() {
      try {
        this.updateResources();
        this.updatePopulation();
        this.updateHappiness();
        this.updateSeason();
        this.updateBuildingButtons();
        this.updateBuiltBuildings();
        this.updateGameTime();
        this.updateTradePanel();
        this.updateResearchPanel();
        this.updateAchievementsPanel();
        // v0.3 신규 패널 업데이트
        this.updateTributePanel();
        this.updateMercenaryPanel();
        this.updateStatsPanel();
        this.checkTutorialTriggers();
        this.updateTabBadges();
      } catch (error) {
        console.error('[UI.updateAll] UI 업데이트 실패:', error);
      }
    },

    // 탭 배지 업데이트 (새 건물 해금, 새 연구 등)
    updateTabBadges() {
      try {
        if (!window.Game || !Game.state) return;

        // 건설 탭 배지 (해금되었지만 아직 하나도 안 지은 건물이 있는지)
        let newBuildings = 0;
        if (window.Buildings && window.Buildings.definitions) {
          for (const type of Object.keys(Buildings.definitions)) {
            if (Buildings.isUnlocked(type) && Game.getBuildingCount(type) === 0) {
              newBuildings++;
            }
          }
        }

        // 마을 탭 배지 (여유 일꾼이 있는지)
        const idleWorkers = Game.state.population.idle > 0 ? 1 : 0;

        // 연구소 탭 배지 (새로 연구 가능한 항목이 있는지)
        let availableResearch = 0;
        if (window.Research && typeof Research.getTree === 'function') {
          const tree = Research.getTree();
          const completed = Game.state.research?.completed || [];
          const current = Game.state.research?.current;
          for (const [id, tech] of Object.entries(tree)) {
            const isCompleted = completed.includes(id);
            const isAvailable = !isCompleted && (tech.requires || []).every(r => completed.includes(r));
            if (isAvailable && current !== id) {
              availableResearch++;
            }
          }
        }

        // DOM 업데이트 헬퍼 함수
        const updateBadge = (tabId, count) => {
          const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
          if (!btn) return;

          let badge = btn.querySelector('.tab-badge');
          if (count > 0) {
            if (!badge) {
              badge = document.createElement('span');
              badge.className = 'tab-badge';
              btn.appendChild(badge);
            }
            badge.textContent = count > 9 ? '9+' : count;
          } else if (badge) {
            badge.remove();
          }
        };

        updateBadge('build', newBuildings);
        updateBadge('village', idleWorkers);
        updateBadge('research', availableResearch);

      } catch (error) {
        console.error('[UI.updateTabBadges] 탭 배지 업데이트 실패:', error);
      }
    },

    // 자원 정보 업데이트
    updateResources() {
      try {
        // Tier 1 자원 동적 업데이트
        const tier1Resources = window.Resources ? Resources.getByTier(1) : ['wood', 'stone', 'food', 'gold'];

        tier1Resources.forEach(type => {
          const amountEl = document.getElementById(`${type}-amount`);
          if (amountEl) {
            amountEl.textContent = Utils.formatNumber(Math.floor(Game.state.resources[type] || 0));
          }
        });

        // 생산량 표시
        if (window.Buildings) {
          const production = Buildings.getTotalProduction();
          const consumption = this.getConsumptionRates();

          tier1Resources.forEach(type => {
            const rateEl = document.getElementById(`${type}-rate`);
            if (!rateEl) return;
            const net = (production[type] || 0) - (consumption[type] || 0);
            const sign = net >= 0 ? '+' : '';
            rateEl.textContent = `${sign}${net.toFixed(1)}/초`;
            rateEl.className = 'resource-rate ' + (net > 0 ? 'positive' : net < 0 ? 'negative' : 'neutral');
          });
        }

        // 2차/3차 자원 동적 표시
        if (window.Resources && window.Buildings) {
          const production = Buildings.getTotalProduction();
          const consumption = this.getConsumptionRates();

          [2, 3].forEach(tier => {
            const container = document.getElementById(`tier${tier}-resources`);
            if (!container) return;

            const tierResources = Resources.getByTier(tier);
            // 해당 티어 건물이 있거나 자원이 1 이상인 경우 표시
            const hasTierBuilding = Game.state.buildings.some(b => {
              const def = Buildings.definitions[b.type];
              return def && def.tier === tier;
            });
            const hasAnyResource = tierResources.some(type => (Game.state.resources[type] || 0) >= 0.1);

            if (!hasTierBuilding && !hasAnyResource) {
              container.style.display = 'none';
              return;
            }

            container.style.display = '';

            // 기존 자원 항목 제거 (tier-label은 유지)
            const existingItems = container.querySelectorAll('.resource');
            existingItems.forEach(item => item.remove());

            tierResources.forEach(type => {
              const amount = Math.floor(Game.state.resources[type] || 0);
              const icon = Resources.getIcon(type);
              const name = Resources.getName(type);

              const div = document.createElement('div');
              div.className = 'resource';

              const iconSpan = document.createElement('span');
              iconSpan.className = 'resource-icon';
              iconSpan.textContent = icon;
              div.appendChild(iconSpan);

              const nameSpan = document.createElement('span');
              nameSpan.className = 'resource-name';
              nameSpan.textContent = name;
              div.appendChild(nameSpan);

              const rateSpan = document.createElement('span');
              rateSpan.className = 'resource-rate';
              rateSpan.id = `${type}-rate`;
              const net = (production[type] || 0) - (consumption[type] || 0);
              const sign = net >= 0 ? '+' : '';
              rateSpan.textContent = `${sign}${net.toFixed(1)}/초`;
              rateSpan.classList.add(net > 0 ? 'positive' : net < 0 ? 'negative' : 'neutral');
              div.appendChild(rateSpan);

              const amountSpan = document.createElement('span');
              amountSpan.className = 'resource-amount';
              amountSpan.id = `${type}-amount`;
              amountSpan.textContent = Utils.formatNumber(amount);
              div.appendChild(amountSpan);

              container.appendChild(div);
            });
          });
        }
      } catch (error) {
        console.error('[UI.updateResources] 자원 UI 업데이트 실패:', error);
      }
    },

    // 자원별 소비량 계산 (건물 소비 + 식량 소비)
    getConsumptionRates() {
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
          // 일꾼이 필요한 건물인데 일꾼이 없으면 소비 안 함
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
    },

    // 인구 정보 업데이트
    updatePopulation() {
      try {
        document.getElementById('current-population').textContent = Game.state.population.current;
        document.getElementById('max-population').textContent = Game.state.population.max;
        document.getElementById('idle-population').textContent = Game.state.population.idle;
        document.getElementById('employed-population').textContent = Game.state.population.employed;
      } catch (error) {
        console.error('[UI.updatePopulation] 인구 UI 업데이트 실패:', error);
      }
    },

    // 행복도 정보 업데이트
    updateHappiness() {
      try {
        const h = Game.state.happiness;
        if (!h) return;

        document.getElementById('happiness-value').textContent = h.current;

        const bar = document.getElementById('happiness-bar');
        bar.style.width = `${h.current}%`;
        bar.className = 'happiness-bar ' + (h.current >= 70 ? 'high' : h.current >= 30 ? 'medium' : 'low');

        // 요인 표시
        const container = document.getElementById('happiness-factors');
        container.innerHTML = '';
        if (h.factors) {
          Object.entries(h.factors).forEach(([key, value]) => {
            if (value === 0) return;
            const tag = document.createElement('span');
            tag.className = 'happiness-factor ' + (value > 0 ? 'positive' : 'negative');
            tag.textContent = `${this.getHappinessFactorLabel(key)} ${value > 0 ? '+' : ''}${value}`;
            container.appendChild(tag);
          });
        }
      } catch (error) {
        console.error('[UI.updateHappiness] 행복도 UI 업데이트 실패:', error);
      }
    },

    // 행복도 요인 라벨 반환
    getHappinessFactorLabel(key) {
      const labels = {
        church: '⛪ 교회',
        tavern: '🍺 주점',
        crowding: '🏠 과밀',
        starvation: '🌾 기아',
        negativeEvent: '⚠️ 이벤트',
        feast: '🎉 잔치'
      };
      return labels[key] || key;
    },

    // 계절 정보 업데이트
    updateSeason() {
      try {
        if (!window.Seasons) return;

        const gameTime = Game.state.stats.gameTime;
        const season = Seasons.getCurrentSeason(gameTime);
        const index = Seasons.getCurrentSeasonIndex(gameTime);
        const banner = document.getElementById('status-bar'); // Now the season block
        const nameEl = document.getElementById('season-name');
        const iconEl = document.getElementById('season-icon');

        if (!season || !banner || !nameEl) return;

        nameEl.textContent = season.name;
        iconEl.textContent = this.getSeasonIcon(season.id);

        // Remove existing season classes and add current
        banner.classList.remove('spring', 'summer', 'autumn', 'winter');
        banner.classList.add(season.id);

        // 현재 계절 내 진행률
        const cycleTime = gameTime % (Seasons.SEASON_DURATION * 4);
        const seasonStart = index * Seasons.SEASON_DURATION;
        const progress = ((cycleTime - seasonStart) / Seasons.SEASON_DURATION) * 100;

        banner.style.setProperty('--season-progress', `${Math.min(100, Math.max(0, progress))}%`);
      } catch (error) {
        console.error('[UI.updateSeason] 계절 UI 업데이트 실패:', error);
      }
    },

    // Helper to get season icon since it's removed from text directly
    getSeasonIcon(seasonId) {
      const icons = {
        'spring': '🌸',
        'summer': '☀️',
        'autumn': '🍂',
        'winter': '❄️'
      };
      return icons[seasonId] || '🌸';
    },

    // 건물 버튼 생성
    createBuildingButtons() {
      try {
        const container = document.getElementById('building-buttons');
        container.innerHTML = '';

        // Buildings.definitions 순회
        let anyUnlockedAndAffordable = false;

        for (const [type, building] of Object.entries(Buildings.definitions)) {
          const isUnlocked = Buildings.isUnlocked(type);
          const button = document.createElement('button');
          button.className = 'building-btn';

          // 해금 상태에 따른 클래스 추가
          if (!isUnlocked) {
            button.classList.add('locked');
          } else {
            anyUnlockedAndAffordable = true;
          }

          button.setAttribute('data-building-type', type);
          button.setAttribute('aria-label', `${building.name} 건설하기`);

          // 건물 이름
          const nameDiv = document.createElement('div');
          nameDiv.className = 'building-name';
          nameDiv.textContent = building.name;
          button.appendChild(nameDiv);

          // 비용 표시
          const costDiv = document.createElement('div');
          costDiv.className = 'building-cost';
          const costEntries = Object.entries(building.cost).filter(([, v]) => v > 0);
          if (costEntries.length > 0) {
            const costs = costEntries.map(([resType, amount]) =>
              `${Utils.getResourceIcon(resType)} ${amount}`
            );
            costDiv.textContent = `비용: ${costs.join(', ')}`;
          } else {
            costDiv.textContent = '비용: 무료';
          }
          button.appendChild(costDiv);

          // 필요 일꾼 표시
          if (building.workersNeeded > 0) {
            const workersDiv = document.createElement('div');
            workersDiv.className = 'building-workers';
            workersDiv.textContent = `일꾼: ${building.workersNeeded}명`;
            button.appendChild(workersDiv);
          }

          // 설명
          if (building.description) {
            const descDiv = document.createElement('div');
            descDiv.className = 'building-description';
            descDiv.textContent = building.description;
            button.appendChild(descDiv);
          }

          // 미해금 건물의 경우 해금 조건 툴팁 추가
          if (!isUnlocked) {
            const tooltipDiv = document.createElement('div');
            tooltipDiv.className = 'unlock-tooltip';
            tooltipDiv.textContent = this.getUnlockConditionText(type, building);
            button.appendChild(tooltipDiv);

            // 잠긴 건물은 클릭 비활성화
            button.disabled = true;
          }

          // 클릭 이벤트
          button.addEventListener('click', () => {
            if (Buildings.isUnlocked(type)) {
              Game.buildBuilding(type);
            }
          });

          container.appendChild(button);

          // 초기 해금 상태 캐시 저장
          this._unlockedCache[type] = isUnlocked;
        }

        // 비어있다면 메시지
        if (Object.keys(Buildings.definitions).length === 0) {
          const emptyMsg = document.createElement('div');
          emptyMsg.className = 'empty-state-message';
          emptyMsg.textContent = '건설 가능한 건물이 없습니다.';
          container.appendChild(emptyMsg);
        }

      } catch (error) {
        console.error('[UI.createBuildingButtons] 건물 버튼 생성 실패:', error);
      }
    },

    // 해금 조건 텍스트 생성
    getUnlockConditionText(buildingType, building) {
      try {
        const unlock = building.unlock || {};
        const conditions = [];

        if (unlock.population) {
          conditions.push(`인구 ${unlock.population}명 이상`);
        }

        if (unlock.buildings) {
          for (const [reqType, reqCount] of Object.entries(unlock.buildings)) {
            const reqDef = Buildings.definitions[reqType];
            const reqName = reqDef ? reqDef.name : reqType;
            conditions.push(`${reqName} ${reqCount}개 이상`);
          }
        }

        if (conditions.length === 0) {
          return '해금 조건 없음';
        }

        return `해금 조건: ${conditions.join(', ')}`;
      } catch (error) {
        console.error('[UI.getUnlockConditionText] 해금 조건 텍스트 생성 실패:', error);
        return '해금 조건 확인 불가';
      }
    },

    // 건물 버튼 상태 업데이트 (활성화/비활성화 및 해금 상태 갱신)
    updateBuildingButtons() {
      try {
        const buttons = document.querySelectorAll('.building-btn');
        buttons.forEach(button => {
          const buildingType = button.getAttribute('data-building-type');
          const isUnlocked = Buildings.isUnlocked(buildingType);
          const wasUnlocked = this._unlockedCache[buildingType];

          // 해금 상태가 변경된 경우 (잠금 → 해금)
          if (!wasUnlocked && isUnlocked) {
            // 잠금 클래스 제거 및 해금 애니메이션 적용
            button.classList.remove('locked');
            button.classList.add('unlocked-animation');

            // 툴팁 제거
            const tooltip = button.querySelector('.unlock-tooltip');
            if (tooltip) {
              tooltip.remove();
            }

            // 해금 메시지 표시
            const definition = Buildings.definitions[buildingType];
            const buildingName = definition ? definition.name : buildingType;
            this.showMessage(`${buildingName}이(가) 해금되었습니다!`, 'success');

            // 캐시 업데이트
            this._unlockedCache[buildingType] = true;

            // 애니메이션 완료 후 클래스 제거
            setTimeout(() => {
              button.classList.remove('unlocked-animation');
            }, 500);
          }

          // 이벤트 할인 등 반영된 실제 비용으로 갱신
          if (isUnlocked) {
            const costDiv = button.querySelector('.building-cost');
            if (costDiv) {
              const actualCost = Game.getBuildingCost(buildingType);
              const costEntries = Object.entries(actualCost).filter(([, v]) => v > 0);
              if (costEntries.length > 0) {
                const costs = costEntries.map(([type, amount]) =>
                  `${Utils.getResourceIcon(type)} ${amount}`
                );
                costDiv.textContent = `비용: ${costs.join(', ')}`;
              } else {
                costDiv.textContent = '비용: 무료';
              }
            }
          }

          // 건설 가능 여부에 따른 버튼 상태
          const canBuild = Game.canBuild(buildingType);

          // 잠긴 건물은 항상 비활성화
          if (!isUnlocked) {
            button.disabled = true;
          } else {
            button.disabled = !canBuild;
          }
        });

        this.updateTabBadges();
      } catch (error) {
        console.error('[UI.updateBuildingButtons] 건물 버튼 상태 업데이트 실패:', error);
      }
    },

    // 건설된 건물 목록 업데이트
    updateBuiltBuildings() {
      try {
        // 건물 목록이 바뀌지 않으면 DOM 재생성 스킵
        const cacheKey = Game.state.buildings.map(b => `${b.id}:${b.workers}`).join(',');
        if (this._buildingsCacheKey === cacheKey) return;
        this._buildingsCacheKey = cacheKey;

        const container = document.getElementById('built-buildings-list');
        container.innerHTML = '';

        // 건물 유형별로 그룹화
        const buildingCounts = {};
        Game.state.buildings.forEach(building => {
          if (!buildingCounts[building.type]) {
            buildingCounts[building.type] = {
              count: 0,
              totalWorkers: 0,
              buildings: []
            };
          }
          buildingCounts[building.type].count++;
          buildingCounts[building.type].totalWorkers += building.workers || 0;
          buildingCounts[building.type].buildings.push(building);
        });

        // 그룹화된 건물 표시
        for (const [type, data] of Object.entries(buildingCounts)) {
          const definition = Buildings.definitions[type];
          if (!definition) continue;

          const buildingDiv = document.createElement('div');
          buildingDiv.className = 'built-building';

          const infoDiv = document.createElement('div');
          infoDiv.className = 'building-info';
          infoDiv.textContent = definition.name;

          const workersDiv = document.createElement('div');
          workersDiv.className = 'building-workers';
          workersDiv.textContent = `⚒️ ${data.totalWorkers}명`;

          const countDiv = document.createElement('div');
          countDiv.className = 'building-count';
          countDiv.textContent = data.count;

          buildingDiv.appendChild(infoDiv);

          if (definition.workersNeeded > 0) {
            buildingDiv.appendChild(workersDiv);

            // 일꾼 +/- 조절 컨트롤
            const workerControl = document.createElement('div');
            workerControl.className = 'worker-control';

            const maxWorkers = definition.workersNeeded * data.count;

            // − 버튼
            const minusBtn = document.createElement('button');
            minusBtn.className = 'worker-ctrl-btn worker-minus';
            minusBtn.textContent = '−';
            minusBtn.disabled = data.totalWorkers <= 0;
            minusBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (!window.Population) return;
              // 노동자가 있는 건물 중 마지막 것에서 1명 해제
              for (let i = data.buildings.length - 1; i >= 0; i--) {
                if ((data.buildings[i].workers || 0) > 0) {
                  Population.unassignOne(data.buildings[i].id);
                  break;
                }
              }
            });

            // 인원 표시
            const workerDisplay = document.createElement('span');
            workerDisplay.className = 'worker-display';
            workerDisplay.textContent = `${data.totalWorkers}/${maxWorkers}`;

            // + 버튼
            const plusBtn = document.createElement('button');
            plusBtn.className = 'worker-ctrl-btn worker-plus';
            plusBtn.textContent = '+';
            const state = Game.state;
            plusBtn.disabled = data.totalWorkers >= maxWorkers || (state && state.population.idle <= 0);
            plusBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (!window.Population) return;
              // 아직 풀이 아닌 건물 중 첫 번째에 1명 배치
              for (let i = 0; i < data.buildings.length; i++) {
                const bWorkers = data.buildings[i].workers || 0;
                if (bWorkers < definition.workersNeeded) {
                  Population.assignOne(data.buildings[i].id);
                  break;
                }
              }
            });

            workerControl.appendChild(minusBtn);
            workerControl.appendChild(workerDisplay);
            workerControl.appendChild(plusBtn);
            buildingDiv.appendChild(workerControl);
          }

          // 철거 버튼 추가
          const demolishBtn = document.createElement('button');
          demolishBtn.className = 'demolish-btn';
          demolishBtn.textContent = '🗑️';
          demolishBtn.setAttribute('aria-label', `${definition.name} 철거`);
          demolishBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showDemolishConfirm(type, definition.name, data.count);
          });
          buildingDiv.appendChild(demolishBtn);

          buildingDiv.appendChild(countDiv);
          container.appendChild(buildingDiv);
        }

        // 건물이 없는 경우 메시지
        if (Object.keys(buildingCounts).length === 0) {
          const emptyDiv = document.createElement('div');
          emptyDiv.style.textAlign = 'center';
          emptyDiv.style.color = '#8B4513';
          emptyDiv.style.padding = '20px';
          emptyDiv.textContent = '건설된 건물이 없습니다.';
          container.appendChild(emptyDiv);
        }
      } catch (error) {
        console.error('[UI.updateBuiltBuildings] 건설된 건물 목록 업데이트 실패:', error);
      }
    },

    // 철거 확인 모달 표시
    showDemolishConfirm(buildingType, buildingName, count) {
      try {
        const definition = Buildings.definitions[buildingType];
        const refund = definition ? Math.floor(Object.values(definition.cost).reduce((a, b) => a + b, 0) * 0.5) : 0;

        document.getElementById('demolish-message').textContent =
          `${buildingName} ${count}개를 철거하시겠습니까?`;
        document.getElementById('demolish-refund').textContent =
          `환급: 자원의 50% 반환 (약 ${refund} 자원)`;

        // 모달 표시
        document.getElementById('demolish-modal').classList.remove('hidden');

        // 확인 버튼 이벤트
        const confirmBtn = document.getElementById('demolish-confirm-btn');
        const cancelBtn = document.getElementById('demolish-cancel-btn');

        // 기존 이벤트 리스너 제거
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => {
          this.demolishBuilding(buildingType);
          document.getElementById('demolish-modal').classList.add('hidden');
        });

        cancelBtn.addEventListener('click', () => {
          document.getElementById('demolish-modal').classList.add('hidden');
        }, { once: true });
      } catch (error) {
        console.error('[UI.showDemolishConfirm] 철거 확인 모달 표시 실패:', error);
      }
    },

    // 건물 철거 실행
    demolishBuilding(buildingType) {
      try {
        if (!window.Game || !Game.state) return;
        // 해당 타입의 마지막 건물 찾기
        const buildings = Game.state.buildings.filter(b => b.type === buildingType);
        if (buildings.length === 0) return;
        const target = buildings[buildings.length - 1];
        const result = Game.demolishBuilding(target.id);
        if (result) {
          const definition = Buildings.definitions[buildingType];
          const buildingName = definition ? definition.name : buildingType;
          this.showMessage(`${buildingName}이(가) 철거되었습니다!`, 'success');
          this._buildingsCacheKey = null; // 캐시 무효화
          this.updateBuiltBuildings();
        }
      } catch (error) {
        console.error('[UI.demolishBuilding] 건물 철거 실패:', error);
        this.showMessage('건물 철거에 실패했습니다.', 'error');
      }
    },

    // 게임 시간 업데이트
    updateGameTime() {
      try {
        const seconds = Math.floor(Game.state.stats.gameTime);
        document.getElementById('game-time').textContent = `플레이 시간: ${Utils.formatTime(seconds)}`;
      } catch (error) {
        console.error('[UI.updateGameTime] 게임 시간 업데이트 실패:', error);
      }
    },

    // 건물 철거 완료 시 처리
    onBuildingDemolished(event) {
      try {
        const { buildingType, buildingId, refund } = event.detail;
        const definition = Buildings.definitions[buildingType];
        const buildingName = definition ? definition.name : buildingType;
        // 철거 후 교역 패널 상태 재확인 (시장 철거 시 교역 패널 숨김)
        this.updateTradePanel();
      } catch (error) {
        console.error('[UI.onBuildingDemolished] 건물 철거 완료 처리 실패:', error);
      }
    },

    // 건물 건설 성공 시 처리
    onBuildingBuilt(event) {
      try {
        SoundManager.play('build');
        const buildingType = event.detail.buildingType;
        const definition = Buildings.definitions[buildingType];
        const buildingName = definition ? definition.name : buildingType;
        this.showMessage(`${buildingName} 건설 완료!`, 'success');
      } catch (error) {
        console.error('[UI.onBuildingBuilt] 건설 완료 처리 실패:', error);
      }
    },

    // 인구 변경 시 처리
    onPopulationChanged(event) {
      try {
        this.updatePopulation();
      } catch (error) {
        console.error('[UI.onPopulationChanged] 인구 변경 처리 실패:', error);
      }
    },

    // 메시지 표시
    showMessage(text, type) {
      try {
        type = type || 'success';
        const messageBox = document.getElementById('message-box');
        messageBox.textContent = text;
        messageBox.className = 'show ' + type;

        // 기존 타이머가 있으면 제거
        if (this.messageTimer) {
          clearTimeout(this.messageTimer);
        }

        // 3초 후 자동 숨김
        this.messageTimer = setTimeout(() => {
          messageBox.className = 'hidden';
        }, 3000);

        // 이벤트 로그 패널에도 메시지 추가 (Phase 1-2 신규 기능)
        this.addLogMessage(text, type);
      } catch (error) {
        console.error('[UI.showMessage] 메시지 표시 실패:', error);
      }
    },

    // 하단 고정 이벤트 로그 갱신 (Phase 1-2 신규 기능)
    addLogMessage(text, type) {
      try {
        const logContainer = document.getElementById('event-log-messages');
        if (!logContainer) return;

        const p = document.createElement('p');
        p.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;

        // 타입별 클래스 부여
        if (type === 'success') p.className = 'log-positive';
        else if (type === 'error') p.className = 'log-negative';
        else if (type === 'warning') p.className = 'log-warning';

        logContainer.appendChild(p);

        // 스크롤 최하단으로 유지
        const eventLog = document.getElementById('event-log');
        if (eventLog) {
          eventLog.scrollTop = eventLog.scrollHeight;
        }

        // 최대 50개 유지 (메모리 제한)
        while (logContainer.children.length > 50) {
          logContainer.removeChild(logContainer.firstChild);
        }
      } catch (error) {
        console.error('[UI.addLogMessage] 이벤트 로그 추가 실패:', error);
      }
    },

    // 에러 메시지 표시
    showError(event) {
      try {
        const { buildingType, missing } = event.detail;
        const definition = Buildings.definitions[buildingType];
        const buildingName = definition ? definition.name : buildingType;

        let missingText = '';
        if (missing) {
          const missingList = [];
          const registry = (window.Resources && typeof Resources.getRegistry === 'function') ? Resources.getRegistry() : {};
          Object.entries(missing).forEach(([key, val]) => {
            if (key === 'workers' && val > 0) {
              missingList.push(`일꾼 ${val}명`);
            } else if (key === 'unlock') {
              missingList.push('해금 조건 미충족');
            } else if (key === 'marketLimit') {
              missingList.push('시장 최대 건설 수 초과');
            } else if (key === 'schoolLimit') {
              missingList.push('학교 최대 건설 수 초과');
            } else if (key === 'treasuryLimit') {
              missingList.push('보물창고 최대 건설 수 초과');
            } else if (typeof val === 'number' && val > 0 && registry[key]) {
              const name = (window.Resources && Resources.getName) ? Resources.getName(key) : key;
              missingList.push(`${name} ${Math.ceil(val)}`);
            }
          });
          missingText = missingList.length > 0
            ? ` (부족: ${missingList.join(', ')})`
            : '';
        }

        this.showMessage(`${buildingName} 건설 실패!${missingText}`, 'error');
      } catch (error) {
        console.error('[UI.showError] 에러 메시지 표시 실패:', error);
      }
    },

    // 이벤트 발생 시 배너 표시
    onEventTriggered(event) {
      try {
        const { event: eventData, active } = event.detail;
        const banner = document.getElementById('event-banner');

        // 배너 내용 업데이트
        const iconDiv = banner.querySelector('.event-icon');
        const nameDiv = banner.querySelector('.event-name');
        const descDiv = banner.querySelector('.event-description');

        // 이벤트 이름에서 이모지 추출
        const eventName = eventData.name || '';
        const iconMatch = eventName.match(/^[\u{1F300}-\u{1F9FF}]|^[🌾🧳👥🛒📜⚔️🥀☠️]/u);
        const icon = iconMatch ? iconMatch[0] : '📢';
        const name = eventName.replace(/^[\u{1F300}-\u{1F9FF}]|^[🌾🧳👥🛒📜⚔️🥀☠️]\s*/u, '').trim();

        iconDiv.textContent = icon;
        nameDiv.textContent = name;
        descDiv.textContent = eventData.description || '';

        // 이벤트 타입에 따른 클래스 추가
        banner.classList.remove('event-positive', 'event-neutral', 'event-negative', 'hidden');
        banner.classList.add(`event-${eventData.type || 'neutral'}`, 'show');

        // 지속 시간이 있는 이벤트의 경우 프로그레스 바 설정
        if (active && eventData.duration > 0) {
          this.startEventProgress(eventData);
        } else {
          // 즉시 이벤트는 프로그레스 바 숨김
          const progressDiv = banner.querySelector('.event-progress');
          progressDiv.style.display = 'none';

          // 즉시 이벤트 배너 5초 후 자동 숨김
          if (this._immediateBannerTimer) {
            clearTimeout(this._immediateBannerTimer);
          }
          this._immediateBannerTimer = setTimeout(() => {
            banner.classList.add('hidden');
            banner.classList.remove('show', 'event-positive', 'event-neutral', 'event-negative');
            this._immediateBannerTimer = null;
          }, 5000);
        }


      } catch (error) {
        console.error('[UI.onEventTriggered] 이벤트 배너 표시 실패:', error);
      }
    },

    // 이벤트 종료 시 배너 숨김
    onEventResolved(event) {
      try {
        const banner = document.getElementById('event-banner');
        banner.classList.add('hidden');
        banner.classList.remove('show', 'event-positive', 'event-neutral', 'event-negative');

        // 프로그레스 바 인터벌 정리
        if (this._eventBannerInterval) {
          clearInterval(this._eventBannerInterval);
          this._eventBannerInterval = null;
        }


      } catch (error) {
        console.error('[UI.onEventResolved] 이벤트 배너 숨김 실패:', error);
      }
    },

    // 이벤트 프로그레스 바 시작
    startEventProgress(eventData) {
      try {
        const banner = document.getElementById('event-banner');
        const progressDiv = banner.querySelector('.event-progress');
        const progressBar = banner.querySelector('.progress-bar');

        progressDiv.style.display = 'block';

        const totalDuration = eventData.duration;
        let remainingDuration = eventData.remainingDuration || totalDuration;

        // 기존 인터벌 정리
        if (this._eventBannerInterval) {
          clearInterval(this._eventBannerInterval);
        }

        // 프로그레스 바 업데이트 함수
        const updateProgress = () => {
          const activeEvent = EventSystem.getActiveEvent();
          if (!activeEvent) {
            clearInterval(this._eventBannerInterval);
            this._eventBannerInterval = null;
            return;
          }

          remainingDuration = activeEvent.remainingDuration || 0;
          const progress = ((totalDuration - remainingDuration) / totalDuration) * 100;
          progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        };

        // 초기 업데이트
        updateProgress();

        // 100ms마다 업데이트
        this._eventBannerInterval = setInterval(updateProgress, 100);
      } catch (error) {
        console.error('[UI.startEventProgress] 프로그레스 바 시작 실패:', error);
      }
    },

    // 튜토리얼 표시
    showTutorial(icon, text) {
      try {
        document.getElementById('tutorial-icon').textContent = icon;
        document.getElementById('tutorial-text').textContent = text;
        document.getElementById('tutorial-overlay').classList.remove('hidden');
      } catch (error) {
        console.error('[UI.showTutorial] 튜토리얼 표시 실패:', error);
      }
    },

    // 튜토리얼 숨김
    hideTutorial() {
      try {
        document.getElementById('tutorial-overlay').classList.add('hidden');
      } catch (error) {
        console.error('[UI.hideTutorial] 튜토리얼 숨김 실패:', error);
      }
    },

    // 튜토리얼 트리거 체크 (게임 루프에서 호출)
    checkTutorialTriggers() {
      try {
        if (!Game.state.tutorial) {
          Game.state.tutorial = { seen: [] };
        }
        const seen = Game.state.tutorial.seen;

        // 튜토리얼 단계별 체크
        const buildings = Game.state.buildings;
        const resources = Game.state.resources;
        const population = Game.state.population;

        // 건물 카운트 헬퍼 함수
        const countBuildings = (type) => buildings.filter(b => b.type === type).length;

        // 튜토리얼 1: 게임 시작
        if (!seen.includes('start') && buildings.length === 0) {
          this.showTutorial('🪵', '벌목소를 건설하여 목재를 생산해 보세요!');
          seen.push('start');
          return;
        }

        // 튜토리얼 2: 벌목소 건설 후
        if (!seen.includes('lumbermill') && countBuildings('lumbermill') >= 1 && countBuildings('quarry') === 0) {
          this.showTutorial('🪨', '채석장을 건설하면 석재를 얻을 수 있습니다.');
          seen.push('lumbermill');
          return;
        }

        // 튜토리얼 3: 식량 부족 경고
        if (!seen.includes('food_warning') && resources.food < 100 && countBuildings('farm') === 0) {
          this.showTutorial('⚠️', '식량이 줄어들고 있습니다! 농장을 건설하세요.');
          seen.push('food_warning');
          return;
        }

        // 튜토리얼 4: 인구 부족
        if (!seen.includes('population_warning') && population.idle === 0 && countBuildings('house') < 2) {
          this.showTutorial('🏠', '인구가 부족합니다. 집을 지어 최대 인구를 늘리세요.');
          seen.push('population_warning');
          return;
        }

      } catch (error) {
        console.error('[UI.checkTutorialTriggers] 튜토리얼 트리거 체크 실패:', error);
      }
    },

    // 교역 패널 업데이트
    updateTradePanel() {
      try {
        const hasMarket = Game.state.buildings.some(b => b.type === 'market');
        const tradePanel = document.getElementById('trade-panel');

        if (hasMarket) {
          tradePanel.classList.remove('hidden');
          // 교역 컨트롤이 초기화되지 않은 경우 초기화 (불러오기 후 재초기화 포함)
          if (!this._tradeControlsInitialized) {
            this.initTradeControls();
            this._tradeControlsInitialized = true;
          }
          this.updateTradeRate();
        } else {
          tradePanel.classList.add('hidden');
          this._tradeControlsInitialized = false;
        }
      } catch (error) {
        console.error('[UI.updateTradePanel] 교역 패널 업데이트 실패:', error);
      }
    },

    // 교역 비율 업데이트
    updateTradeRate() {
      try {
        const sellType = document.getElementById('trade-sell-type').value;
        const buyType = document.getElementById('trade-buy-type').value;
        const sellAmount = parseInt(document.getElementById('trade-sell-amount').value) || 0;

        if (window.Trade && typeof Trade.getRate === 'function') {
          const rate = Trade.getRate(sellType, buyType);
          const receive = Math.floor(sellAmount * rate);

          document.getElementById('trade-rate').textContent = `교환 비율: 1 → ${rate.toFixed(2)}`;
          document.getElementById('trade-preview').textContent = `획득: ${Utils.getResourceIcon(buyType)} ${receive}`;
        }
      } catch (error) {
        console.error('[UI.updateTradeRate] 교역 비율 업데이트 실패:', error);
      }
    },

    // 교역 실행
    executeTrade() {
      try {
        const sellType = document.getElementById('trade-sell-type').value;
        const buyType = document.getElementById('trade-buy-type').value;
        const sellAmount = parseInt(document.getElementById('trade-sell-amount').value) || 0;

        if (sellType === buyType) {
          this.showMessage('같은 자원끼리는 교환할 수 없습니다.', 'error');
          return;
        }

        if (sellAmount <= 0) {
          this.showMessage('교환할 수량을 입력해주세요.', 'error');
          return;
        }

        if (window.Trade && typeof Trade.execute === 'function') {
          // Trade.execute(fromResource, fromAmount, toResource) → boolean
          const rate = Trade.getRate(sellType, buyType);
          const expectedReceive = Math.floor(sellAmount * rate);
          const success = Trade.execute(sellType, sellAmount, buyType);
          if (success) {
            this.showMessage(`교환 완료! ${Utils.getResourceIcon(buyType)} ${expectedReceive} 획득`, 'success');
          } else {
            this.showMessage('교환 실패! 자원이 부족합니다.', 'error');
          }
        }
      } catch (error) {
        console.error('[UI.executeTrade] 교역 실행 실패:', error);
      }
    },

    // 업적 달성 알림 표시
    showAchievementNotification(achievement) {
      try {
        // 알림 오버레이 생성
        let notification = document.getElementById('achievement-notification');
        if (!notification) {
          notification = document.createElement('div');
          notification.id = 'achievement-notification';
          document.body.appendChild(notification);
        }

        notification.innerHTML = `
          <div style="font-size: 3em; margin-bottom: 10px;">🏆</div>
          <div style="font-size: 1.3em; font-weight: bold; color: #8B4513;">업적 달성!</div>
          <div style="font-size: 1.5em; font-weight: bold; color: #DAA520; margin: 10px 0;">
            ${achievement.icon || '🏆'} ${achievement.name}
          </div>
          <div style="color: #2E7D32; font-weight: bold;">보상: ${achievement.reward || '없음'}</div>
        `;

        notification.classList.remove('hidden');

        // 2초 후 자동 숨김
        setTimeout(() => {
          notification.classList.add('hidden');
        }, 2000);
      } catch (error) {
        console.error('[UI.showAchievementNotification] 업적 알림 표시 실패:', error);
      }
    },

    // 계절 전환 애니메이션 적용
    applySeasonBackground(seasonId) {
      try {
        // body 클래스 변경으로 배경 전환
        document.body.classList.remove('spring', 'summer', 'autumn', 'winter');
        if (seasonId) {
          document.body.classList.add(seasonId);
        }
      } catch (error) {
        console.error('[UI.applySeasonBackground] 계절 배경 적용 실패:', error);
      }
    },

    // 시장 건설 여부에 따른 교역 패널 토글
    checkMarketAvailability() {
      try {
        const hasMarket = Game.state.buildings.some(b => b.type === 'market');
        const tradePanel = document.getElementById('trade-panel');

        if (hasMarket && tradePanel.classList.contains('hidden')) {
          tradePanel.classList.remove('hidden');
          this.showMessage('시장 건설 완료! 교역이 가능합니다.', 'success');
          if (!this._tradeControlsInitialized) {
            this.initTradeControls();
            this._tradeControlsInitialized = true;
          }
        }
      } catch (error) {
        console.error('[UI.checkMarketAvailability] 시장 가용성 체크 실패:', error);
      }
    },

    // 교역 컨트롤 초기화
    initTradeControls() {
      try {
        // 퀵 버튼 이벤트
        document.querySelectorAll('.trade-quick-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const amount = btn.getAttribute('data-amount');
            document.getElementById('trade-sell-amount').value = amount;
            this.updateTradeRate();
          });
        });

        // 교역 실행 버튼
        document.getElementById('trade-execute-btn').addEventListener('click', () => {
          this.executeTrade();
        });

        // 셀렉트 변경 이벤트
        document.getElementById('trade-sell-type').addEventListener('change', () => this.updateTradeRate());
        document.getElementById('trade-buy-type').addEventListener('change', () => this.updateTradeRate());
        document.getElementById('trade-sell-amount').addEventListener('input', () => this.updateTradeRate());

        // 초기 sell/buy가 같으면 buy를 stone으로 기본 설정
        const sellEl = document.getElementById('trade-sell-type');
        const buyEl = document.getElementById('trade-buy-type');
        if (sellEl.value === buyEl.value) {
          buyEl.value = 'stone';
        }

        this.updateTradeRate();
      } catch (error) {
        console.error('[UI.initTradeControls] 교역 컨트롤 초기화 실패:', error);
      }
    },

    // ============================================
    // v0.3 추가 메서드들
    // ============================================

    // 자원 변화 플로팅 숫자 표시
    showResourceFloat(elementId, amount) {
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
        console.error('[UI.showResourceFloat] 플로팅 숫자 표시 실패:', error);
      }
    },

    // 값 변경 하이라이트 (조건부)
    highlightValueChange(elementId, newValue) {
      try {
        const el = document.getElementById(elementId);
        if (!el) return;

        const prevValue = this._prevResources[elementId];
        if (prevValue !== undefined && prevValue !== newValue) {
          el.classList.add('value-changed');
          setTimeout(() => el.classList.remove('value-changed'), 500);
        }
        this._prevResources[elementId] = newValue;
      } catch (error) {
        console.error('[UI.highlightValueChange] 값 변경 하이라이트 실패:', error);
      }
    },

    // 건물 비용 색상 분기 포맷팅
    formatCost(resourceType, cost, current) {
      const icon = Utils.getResourceIcon(resourceType);
      const isEnough = current >= cost;
      const colorClass = isEnough ? 'cost-sufficient' : 'cost-insufficient';
      return `<span class="${colorClass}">${icon} ${cost}</span>`;
    },

    // 생산 중단 표시
    showProductionStalled(buildingType, missingResources) {
      try {
        const cards = document.querySelectorAll(`[data-building-type="${buildingType}"]`);
        cards.forEach(card => {
          card.classList.add('production-stalled');

          // 기존 배지 제거
          const existingBadge = card.querySelector('.production-stalled-badge');
          if (existingBadge) existingBadge.remove();

          // 새 배지 추가
          const badge = document.createElement('span');
          badge.className = 'production-stalled-badge';
          const missing = Object.entries(missingResources)
            .map(([r, a]) => `${Utils.getResourceIcon(r)} ${a}`)
            .join(', ');
          badge.textContent = `⚠️ ${missing} 부족`;
          card.appendChild(badge);
        });
      } catch (error) {
        console.error('[UI.showProductionStalled] 생산 중단 표시 실패:', error);
      }
    },

    // 생산 재개 표시
    hideProductionStalled(buildingType) {
      try {
        const cards = document.querySelectorAll(`[data-building-type="${buildingType}"]`);
        cards.forEach(card => {
          card.classList.remove('production-stalled');
          const badge = card.querySelector('.production-stalled-badge');
          if (badge) badge.remove();
        });
      } catch (error) {
        console.error('[UI.hideProductionStalled] 생산 재개 표시 실패:', error);
      }
    },

    // 연구 진행 바 업데이트
    updateResearchProgress(progress, total) {
      try {
        const bar = document.getElementById('research-progress-bar');
        const fill = document.getElementById('research-progress-fill');
        const label = document.getElementById('research-progress-label');

        if (!bar || !fill || !label) return;

        bar.classList.remove('hidden');
        const percent = (progress / total) * 100;
        fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        label.textContent = `${Math.floor(progress)}/${total}초`;
      } catch (error) {
        console.error('[UI.updateResearchProgress] 연구 진행 바 업데이트 실패:', error);
      }
    },

    // 연구 완료 알림
    onResearchCompleted(tech) {
      try {
        // 진행 바 숨김
        const bar = document.getElementById('research-progress-bar');
        if (bar) bar.classList.add('hidden');

        // 팬파레 사운드
        SoundManager.play('achievement');

        // 알림 팝업
        const overlay = document.createElement('div');
        overlay.className = 'achievement-notification';
        overlay.innerHTML = `
          <div class="achievement-icon">${tech.icon || '📚'}</div>
          <div class="achievement-title">연구 완료!</div>
          <div class="achievement-desc">${tech.name || '연구'}: ${tech.description || ''}</div>
        `;
        document.body.appendChild(overlay);

        setTimeout(() => overlay.remove(), 3000);

        // 연구 패널 갱신
        this.updateResearchPanel();
      } catch (error) {
        console.error('[UI.onResearchCompleted] 연구 완료 알림 실패:', error);
      }
    },

    // 연구 패널 업데이트
    updateResearchPanel() {
      try {
        const state = Game.state;
        const hasSchool = state.buildings.some(b => b.type === 'school');
        const panel = document.getElementById('research-panel');
        const placeholder = document.getElementById('research-placeholder');
        const tree = document.getElementById('research-tree');

        if (!panel || !placeholder || !tree) return;

        if (!hasSchool) {
          panel.classList.add('hidden');
          placeholder.style.display = 'block';
          tree.innerHTML = '';
          return;
        }

        panel.classList.remove('hidden');
        placeholder.style.display = 'none';

        // Research 모듈이 있는 경우 연구 트리 렌더링
        if (!window.Research || !Research.getTree) {
          tree.innerHTML = '<p style="text-align:center;color:#8B4513;">연구 시스템 준비 중...</p>';
          return;
        }

        const researchTree = Research.getTree();
        const completed = state.research?.completed || [];
        const current = state.research?.current;

        tree.innerHTML = Object.entries(researchTree).map(([id, tech]) => {
          const isCompleted = completed.includes(id);
          const isAvailable = !isCompleted && (tech.requires || []).every(r => completed.includes(r));
          const isCurrent = current === id;

          let statusClass = isCompleted ? 'completed' : isCurrent ? 'in-progress' : isAvailable ? 'available' : 'locked';

          return `
            <button class="research-btn ${statusClass}" data-research-id="${id}" ${isCompleted || !isAvailable || isCurrent ? 'disabled' : ''}>
              <span class="research-icon">${tech.icon || '📚'}</span>
              <span class="research-name">${tech.name || id}</span>
              <span class="research-desc">${tech.description || ''}</span>
              ${isCompleted ? '<span class="research-status">✅ 완료</span>' : ''}
              ${isCurrent ? '<span class="research-status">⏳ 연구 중</span>' : ''}
            </button>
          `;
        }).join('');

        // 연구 버튼 클릭 이벤트
        tree.querySelectorAll('.research-btn.available').forEach(btn => {
          btn.addEventListener('click', () => {
            const researchId = btn.getAttribute('data-research-id');
            if (window.Game && Game.startResearch) {
              Game.startResearch(researchId);
              SoundManager.play('research');
            }
          });
        });
      } catch (error) {
        console.error('[UI.updateResearchPanel] 연구 패널 업데이트 실패:', error);
      }
    },

    // 오프라인 진행 보고서 표시
    showOfflineReport(seconds, resources) {
      try {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const timeStr = hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;

        const resourceLines = Object.entries(resources || {})
          .filter(([, amount]) => amount !== 0)
          .map(([type, amount]) => {
            const icon = Utils.getResourceIcon(type);
            const name = (window.Resources && Resources.getName) ? Resources.getName(type) : type;
            const sign = amount > 0 ? '+' : '';
            const color = amount > 0 ? 'var(--positive)' : 'var(--negative)';
            return `<div style="color:${color}">${icon} ${name}: ${sign}${Math.floor(amount)}</div>`;
          }).join('');

        const overlay = document.createElement('div');
        overlay.className = 'offline-report-overlay';
        overlay.innerHTML = `
          <div class="offline-report">
            <h3>📜 부재 중 보고서</h3>
            <p>부재 시간: ${timeStr}</p>
            <div class="offline-resources">${resourceLines || '<div>변동 없음</div>'}</div>
            <button class="offline-close-btn">확인</button>
          </div>
        `;
        document.body.appendChild(overlay);

        SoundManager.play('event');

        // 닫기 버튼 이벤트
        overlay.querySelector('.offline-close-btn').addEventListener('click', () => {
          overlay.remove();
        });
      } catch (error) {
        console.error('[UI.showOfflineReport] 오프라인 보고서 표시 실패:', error);
      }
    },

    // 교역 패널 안내 문구 표시 (시장 건설 전)
    showTradePlaceholder() {
      try {
        const tradeControls = document.getElementById('trade-controls');
        if (!tradeControls) return;

        tradeControls.innerHTML = `
          <div class="trade-placeholder">
            <span>🏪</span>
            <p>시장을 건설하면 교역이 가능합니다</p>
          </div>
        `;
      } catch (error) {
        console.error('[UI.showTradePlaceholder] 교역 안내 문구 표시 실패:', error);
      }
    },

    // ============================================
    // v0.3 신규 패널 업데이트 메서드 (기본 구현)
    // 실제 구현은 ui-tribute.js, ui-mercenary.js에서 Override
    // ============================================

    // 조공 패널 업데이트 (기본 구현)
    updateTributePanel() {
      try {
        const panel = document.getElementById('tribute-panel');
        if (!panel || !window.Game) return;

        // 영주관 보유 시 패널 표시
        const hasManor = Game.getBuildingCount('manor') > 0;
        panel.classList.toggle('hidden', !hasManor);

        if (hasManor && typeof this.createTributeCards === 'function') {
          // 최초 1회 카드 생성
          const grid = document.getElementById('tribute-grid');
          if (grid && grid.children.length === 0) {
            this.createTributeCards();
          }
        }
      } catch (error) {
        console.error('[UI.updateTributePanel] 조공 패널 업데이트 실패:', error);
      }
    },

    // 용병 패널 업데이트 (기본 구현)
    updateMercenaryPanel() {
      try {
        const panel = document.getElementById('mercenary-panel');
        if (!panel || !window.Game) return;

        // 성벽 보유 시 패널 표시
        const hasWall = Game.getBuildingCount('wall') > 0;
        panel.classList.toggle('hidden', !hasWall);

        if (hasWall && typeof this.createMercenaryCards === 'function') {
          // 최초 1회 카드 생성
          const grid = document.getElementById('mercenary-grid');
          if (grid && grid.children.length === 0) {
            this.createMercenaryCards();
          }
        }
      } catch (error) {
        console.error('[UI.updateMercenaryPanel] 용병 패널 업데이트 실패:', error);
      }
    },

    // 통계 패널 업데이트 (Phase 2 준비)
    updateStatsPanel() {
      try {
        const panel = document.getElementById('stats-panel');
        if (!panel || !window.Game) return;

        // 통계 패널은 항상 표시 (또는 특정 조건에 따라)
        // Phase 2에서 실제 데이터 바인딩 구현 예정

        // 기본 통계 업데이트
        const gameTime = Game.state.stats?.gameTime || 0;
        const playtimeEl = document.getElementById('stat-playtime');
        if (playtimeEl) {
          const minutes = Math.floor(gameTime / 60);
          playtimeEl.textContent = `${minutes}분`;
        }

        const buildingsEl = document.getElementById('stat-buildings-built');
        if (buildingsEl) {
          buildingsEl.textContent = `${Game.state.buildings.length}개`;
        }

        const maxPopEl = document.getElementById('stat-max-population');
        if (maxPopEl) {
          maxPopEl.textContent = `${Game.state.population.max}명`;
        }

        const achievementsEl = document.getElementById('stat-achievements');
        if (achievementsEl && window.Achievements) {
          const unlocked = Achievements.getAll().filter(a => a.achieved).length;
          achievementsEl.textContent = `${unlocked}개`;
        }
      } catch (error) {
        console.error('[UI.updateStatsPanel] 통계 패널 업데이트 실패:', error);
      }
    },

    // ============================================
    // v0.3 AI2 - 금화 소비처 버튼 이벤트 핸들러
    // ============================================

    initGoldSinkButtons() {
      try {
        // 마을 잔치 버튼
        const feastBtn = document.getElementById('btn-feast');
        if (feastBtn) {
          feastBtn.addEventListener('click', () => {
            if (!window.Game) return;
            const result = Game.holdFeast ? Game.holdFeast() : { success: false, reason: 'not_implemented' };
            if (!result.success) {
              if (result.reason === 'gold') {
                this.showMessage('금화가 부족합니다!', 'error');
              } else if (result.reason === 'cooldown') {
                this.showMessage('재사용 대기 중입니다.', 'warning');
              } else {
                this.showMessage('잔치를 개최할 수 없습니다.', 'error');
              }
            } else {
              this.showMessage('🎉 마을 잔치가 시작되었습니다! 행복도 +25', 'success');
              SoundManager.play('event');
            }
            this.updateFeastButton();
          });
        }

        // 긴급 보급 버튼
        const supplyBtn = document.getElementById('btn-emergency-supply');
        if (supplyBtn) {
          supplyBtn.addEventListener('click', () => {
            if (!window.Game) return;
            const result = Game.emergencySupply ? Game.emergencySupply() : { success: false, reason: 'not_implemented' };
            if (!result.success) {
              if (result.reason === 'gold') {
                this.showMessage('금화가 부족합니다! (50 금화 필요)', 'error');
              } else {
                this.showMessage('긴급 보급을 실행할 수 없습니다.', 'error');
              }
            } else {
              this.showMessage('🚑 긴급 보급 완료! 식량 +150', 'success');
              SoundManager.play('build');
            }
          });
        }

        // 야경대 토글
        const nightwatchToggle = document.getElementById('toggle-nightwatch');
        if (nightwatchToggle) {
          nightwatchToggle.addEventListener('change', (e) => {
            if (!window.Game) return;
            const enabled = e.target.checked;
            const result = Game.toggleNightWatch ? Game.toggleNightWatch(enabled) : { success: false };
            if (!result.success) {
              e.target.checked = false;
              this.showMessage('금화가 부족하여 야경대를 고용할 수 없습니다.', 'error');
            } else {
              if (enabled) {
                this.showMessage('💂 야경대가 고용되었습니다. (금화 5/초 소모)', 'success');
              } else {
                this.showMessage('야경대가 해산되었습니다.', 'warning');
              }
            }
            this.updateNightwatchStatus();
          });
        }

        // 초기 상태 업데이트
        this.updateFeastButton();
        this.updateNightwatchStatus();
        this.updateBreadWarning();

        // 주기적 상태 업데이트 (쿨다운 표시용)
        setInterval(() => {
          this.updateFeastButton();
          this.updateNightwatchStatus();
          this.updateBreadWarning();
        }, 1000);


      } catch (error) {
        console.error('[UI.initGoldSinkButtons] 금화 소비처 버튼 초기화 실패:', error);
      }
    },

    // 마을 잔치 버튼 상태 업데이트 (쿨다운 표시)
    updateFeastButton() {
      try {
        const feastBtn = document.getElementById('btn-feast');
        if (!feastBtn || !window.Game) return;

        const state = Game.state;
        const cooldown = state.feastCooldown || 0;

        if (cooldown > 0) {
          feastBtn.disabled = true;
          const remaining = Math.ceil(cooldown);
          feastBtn.textContent = `🎉 잔치 준비 중... (${remaining}초)`;
        } else {
          const goldCost = 80;
          const canAfford = (state.resources.gold || 0) >= goldCost;
          feastBtn.disabled = !canAfford;
          feastBtn.textContent = '🎉 마을 잔치 개최';
        }
      } catch (error) {
        console.error('[UI.updateFeastButton] 잔치 버튼 업데이트 실패:', error);
      }
    },

    // 야경대 상태 표시 업데이트
    updateNightwatchStatus() {
      try {
        const statusEl = document.getElementById('nightwatch-status');
        const toggleEl = document.getElementById('toggle-nightwatch');
        if (!statusEl || !toggleEl || !window.Game) return;

        const state = Game.state;
        const nightWatch = state.mercenaries?.nightWatch;

        if (nightWatch) {
          statusEl.textContent = '🟢 근무 중';
          toggleEl.checked = true;
        } else {
          statusEl.textContent = '⚫ 해제';
          toggleEl.checked = false;
        }
      } catch (error) {
        console.error('[UI.updateNightwatchStatus] 야경대 상태 업데이트 실패:', error);
      }
    },

    // 빵 부족 경고 표시 업데이트
    updateBreadWarning() {
      try {
        const warningEl = document.getElementById('bread-warning');
        if (!warningEl || !window.Game) return;

        const state = Game.state;
        const breadLow = state.warnings?.breadLow || false;

        // 빵이 부족하고 제분소가 있는 경우 표시
        const hasMill = state.buildings.some(b => b.type === 'mill');
        const breadAmount = state.resources.bread || 0;
        const population = state.population.current;

        // 인구 대비 빵이 부족한지 확인
        const isBreadLow = hasMill && breadAmount < population * 5;

        warningEl.style.display = isBreadLow ? 'flex' : 'none';
      } catch (error) {
        console.error('[UI.updateBreadWarning] 빵 부족 경고 업데이트 실패:', error);
      }
    }
  };

  window.UI = UI;
})();
