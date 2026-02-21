(function () {
    'use strict';

    // UI 객체에 조공 관련 메서드 추가
    Object.assign(UI, {
        // 조공 카드 생성
        createTributeCards() {
            try {
                const grid = document.getElementById('tribute-grid');
                if (!grid || !window.Tribute) return;

                grid.innerHTML = '';

                Object.values(Tribute.definitions).forEach(tribute => {
                    const card = document.createElement('div');
                    card.className = 'tribute-card';
                    card.dataset.tributeId = tribute.id;

                    card.innerHTML = `
                        <div class="tribute-name">${tribute.name}</div>
                        <div class="tribute-cost">💰 ${tribute.cost}</div>
                        <div class="tribute-reward">${this.formatTributeReward(tribute.reward)}</div>
                        <button class="tribute-btn" data-id="${tribute.id}">헌상</button>
                    `;

                    card.querySelector('.tribute-btn').addEventListener('click', () => {
                        this.handleTributeClick(tribute.id);
                    });

                    grid.appendChild(card);
                });

                console.log('[UI.createTributeCards] 조공 카드 생성 완료');
            } catch (error) {
                console.error('[UI.createTributeCards] 조공 카드 생성 실패:', error);
            }
        },

        // 조공 버튼 클릭 처리
        handleTributeClick(tributeId) {
            try {
                if (!window.Tribute) return;

                const definition = Tribute.definitions[tributeId];
                if (!definition) return;

                // 일회성이고 이미 완료된 경우
                if (definition.oneTime && Game.state.tribute?.completed?.includes(tributeId)) {
                    this.showMessage('이미 완료된 조공입니다.', 'warning');
                    return;
                }

                // 쿨다운 중인 경우
                const cooldown = Tribute.getCooldownRemaining(tributeId);
                if (cooldown > 0) {
                    this.showMessage(`쿨다운 중: ${Math.ceil(cooldown)}초 남음`, 'warning');
                    return;
                }

                // 조공 실행
                if (Tribute.execute(tributeId)) {
                    if (window.SoundManager) {
                        SoundManager.play('upgrade');
                    }
                    this.showMessage(`${definition.name} 완료!`, 'success');
                    this.updateTributePanel();
                } else {
                    this.showMessage('금화가 부족합니다.', 'error');
                }
            } catch (error) {
                console.error('[UI.handleTributeClick] 조공 실행 실패:', error);
            }
        },

        // 조공 패널 업데이트
        updateTributePanel() {
            try {
                if (!window.Tribute || !window.Game) return;

                const panel = document.getElementById('tribute-panel');
                if (!panel) return;

                // 영주관 보유 시 패널 표시
                const hasManor = Game.getBuildingCount('manor') > 0;
                panel.classList.toggle('hidden', !hasManor);

                if (!hasManor) return;

                // 카드가 아직 생성되지 않았으면 생성 (안전망)
                const tributeGrid = document.getElementById('tribute-grid');
                if (tributeGrid && tributeGrid.children.length === 0) {
                    this.createTributeCards();
                }

                // 각 카드 상태 업데이트
                document.querySelectorAll('.tribute-card').forEach(card => {
                    const id = card.dataset.tributeId;
                    const btn = card.querySelector('.tribute-btn');
                    const definition = Tribute.definitions[id];

                    if (!definition || !btn) return;

                    // 일회성 조공 완료 여부
                    const isCompleted = definition.oneTime && 
                        Game.state.tribute?.completed?.includes(id);

                    if (isCompleted) {
                        card.classList.add('completed');
                        btn.textContent = '완료';
                        btn.disabled = true;
                        return;
                    }

                    card.classList.remove('completed');

                    // 쿨다운 확인
                    const cooldown = Tribute.getCooldownRemaining(id);
                    if (cooldown > 0) {
                        btn.textContent = `⏳ ${Math.ceil(cooldown)}초`;
                        btn.disabled = true;
                    } else {
                        btn.textContent = '헌상';
                        btn.disabled = !Tribute.canTribute(id);
                    }
                });
            } catch (error) {
                console.error('[UI.updateTributePanel] 조공 패널 업데이트 실패:', error);
            }
        },

        // 조공 보상 설명 포맷팅
        formatTributeReward(reward) {
            try {
                if (!reward) return '';

                const texts = {
                    random_resources: '🎁 랜덤 자원 획득',
                    permanent_bonus: `📈 전체 생산 +${Math.round(reward.bonus * 100)}%`,
                    unlock_building: '🏛️ 특수 건물 해금',
                    max_population: `👥 최대 인구 +${reward.bonus}명`,
                    multi: '👑 다중 보상'
                };

                if (reward.type === 'multi' && Array.isArray(reward.effects)) {
                    const effectTexts = reward.effects.map(e => {
                        if (e.type === 'max_population') return `인구 +${e.bonus}`;
                        if (e.type === 'permanent_bonus') return `생산 +${Math.round(e.bonus * 100)}%`;
                        return '';
                    }).filter(Boolean).join(', ');
                    return `👑 ${effectTexts}`;
                }

                return texts[reward.type] || '';
            } catch (error) {
                console.error('[UI.formatTributeReward] 보상 포맷팅 실패:', error);
                return '';
            }
        }
    });

    // 이벤트 리스너 등록
    document.addEventListener('tributeExecuted', (e) => {
        if (window.UI) {
            UI.updateTributePanel();
        }
    });
})();