(function () {
    'use strict';

    // UI 객체에 건물 관련 메서드 추가
    Object.assign(UI, {
        // 건물 버튼 생성
        createBuildingButtons() {
            try {
                const container = document.getElementById('building-buttons');
                container.innerHTML = '';

                // Buildings.definitions 순회
                for (const [type, building] of Object.entries(Buildings.definitions)) {
                    const isUnlocked = Buildings.isUnlocked(type);
                    const button = document.createElement('button');
                    button.className = 'building-btn';

                    // 해금 상태에 따른 클래스 추가
                    if (!isUnlocked) {
                        button.classList.add('locked');
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
                        const costs = costEntries.map(([type, amount]) =>
                            `${Utils.getResourceIcon(type)} ${amount}`
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

                        // 일꾼 토글 버튼 추가
                        const toggleBtn = document.createElement('button');
                        toggleBtn.className = 'worker-toggle-btn';
                        const hasWorkers = data.totalWorkers > 0;
                        toggleBtn.textContent = hasWorkers ? '⏸ 해제' : '▶ 배치';
                        toggleBtn.classList.toggle('inactive', !hasWorkers);
                        toggleBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (hasWorkers) {
                                // 해당 타입의 모든 건물에서 일꾼 해제
                                data.buildings.forEach(b => {
                                    if (b.workers > 0 && window.Population) {
                                        Population.unassign(b.id);
                                    }
                                });
                            } else {
                                // 해당 타입의 건물에 일꾼 배치
                                if (window.Population) {
                                    const firstBuilding = data.buildings[0];
                                    if (firstBuilding) {
                                        Population.reassign(firstBuilding.id);
                                    }
                                }
                            }
                        });
                        buildingDiv.appendChild(toggleBtn);
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
        }
    });
})();
