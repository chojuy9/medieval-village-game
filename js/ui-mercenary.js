(function () {
    'use strict';

    // 용병 설정
    const MERCENARY_DEFS = {
        patrol: {
            id: 'patrol',
            name: '순찰병',
            description: '일정 시간 동안 방어력 증가',
            icon: '🛡️'
        },
        knight: {
            id: 'knight',
            name: '기사단',
            description: '이벤트 방어 충전',
            icon: '⚔️'
        },
        fortify: {
            id: 'fortify',
            name: '성벽 보강',
            description: '영구 방어력 증가',
            icon: '🏰'
        }
    };

    // UI 객체에 용병 관련 메서드 추가
    Object.assign(UI, {
        // 용병 카드 생성
        createMercenaryCards() {
            try {
                const grid = document.getElementById('mercenary-grid');
                if (!grid || !window.Mercenary) return;

                grid.innerHTML = '';

                // 설정에서 비용 정보 가져오기
                const cfg = (window.GAME_CONFIG && window.GAME_CONFIG.MERCENARY_CONFIG) || {
                    patrol: { cost: 300, duration: 120, defenseBonus: 0.3 },
                    knight: { cost: 1200, charges: 3 },
                    fortify: { cost: 800, defenseBonus: 0.1 }
                };

                Object.values(MERCENARY_DEFS).forEach(merc => {
                    const card = document.createElement('div');
                    card.className = 'mercenary-card';
                    card.dataset.mercId = merc.id;

                    const cost = cfg[merc.id]?.cost || 0;
                    const effect = this.getMercenaryEffect(merc.id, cfg);

                    card.innerHTML = `
                        <div class="mercenary-icon">${merc.icon}</div>
                        <div class="mercenary-name">${merc.name}</div>
                        <div class="mercenary-desc">${merc.description}</div>
                        <div class="mercenary-effect">${effect}</div>
                        <div class="mercenary-cost">💰 ${cost}</div>
                        <button class="mercenary-btn" data-id="${merc.id}">고용</button>
                    `;

                    card.querySelector('.mercenary-btn').addEventListener('click', () => {
                        this.handleMercenaryHire(merc.id);
                    });

                    grid.appendChild(card);
                });

                
            } catch (error) {
                console.error('[UI.createMercenaryCards] 용병 카드 생성 실패:', error);
            }
        },

        // 용병 효과 설명 반환
        getMercenaryEffect(mercId, cfg) {
            try {
                const config = cfg[mercId];
                if (!config) return '';

                switch (mercId) {
                    case 'patrol':
                        return `🛡️ 방어력 +${Math.round(config.defenseBonus * 100)}% (${config.duration}초)`;
                    case 'knight':
                        return `⚔️ 방어 충전 +${config.charges}회`;
                    case 'fortify':
                        return `🏰 영구 방어력 +${Math.round(config.defenseBonus * 100)}%`;
                    default:
                        return '';
                }
            } catch (error) {
                return '';
            }
        },

        // 용병 고용 처리
        handleMercenaryHire(mercId) {
            try {
                if (!window.Mercenary) return;

                if (Mercenary.hire(mercId)) {
                    if (window.SoundManager) {
                        SoundManager.play('upgrade');
                    }
                    
                    const merc = MERCENARY_DEFS[mercId];
                    this.showMessage(`${merc.name} 고용 완료!`, 'success');
                    this.updateMercenaryPanel();
                } else {
                    // 이미 고용된 순찰병인지 확인
                    if (mercId === 'patrol' && Game.state.mercenaries?.patrol?.active) {
                        this.showMessage('이미 순찰병이 활동 중입니다.', 'warning');
                    } else {
                        this.showMessage('금화가 부족합니다.', 'error');
                    }
                }
            } catch (error) {
                console.error('[UI.handleMercenaryHire] 용병 고용 실패:', error);
            }
        },

        // 용병 패널 업데이트
        updateMercenaryPanel() {
            try {
                if (!window.Mercenary || !window.Game) return;

                const panel = document.getElementById('mercenary-panel');
                if (!panel) return;

                // 성벽 보유 시 패널 표시
                const hasWall = Game.getBuildingCount('wall') > 0;
                panel.classList.toggle('hidden', !hasWall);

                if (!hasWall) return;

                // 카드가 아직 생성되지 않았으면 생성 (안전망)
                const mercenaryGrid = document.getElementById('mercenary-grid');
                if (mercenaryGrid && mercenaryGrid.children.length === 0) {
                    this.createMercenaryCards();
                }

                // 방어력 보너스 업데이트
                const defenseBonus = Mercenary.getDefenseBonus();
                const defenseDisplay = document.getElementById('defense-bonus');
                if (defenseDisplay) {
                    defenseDisplay.textContent = `${Math.round(defenseBonus * 100)}%`;
                }

                // 각 카드 상태 업데이트
                const cfg = (window.GAME_CONFIG && window.GAME_CONFIG.MERCENARY_CONFIG) || {};
                const fortifyMax = 0.5;
                const fortifyCurrent = Math.max(0, Number(Game.state.mercenaries?.fortification) || 0);
                const fortifyStep = Math.max(0, Number(cfg.fortify && cfg.fortify.defenseBonus) || 0.1);
                const fortifyAtMax = fortifyStep > 0 && fortifyCurrent + fortifyStep > fortifyMax + 1e-9;

                document.querySelectorAll('.mercenary-card').forEach(card => {
                    const id = card.dataset.mercId;
                    const btn = card.querySelector('.mercenary-btn');
                    const effectEl = card.querySelector('.mercenary-effect');

                    if (!btn) return;

                    // 순찰병 활성화 상태 확인
                    if (id === 'patrol' && Game.state.mercenaries?.patrol?.active) {
                        const expiresAt = Game.state.mercenaries.patrol.expiresAt || 0;
                        const gameTime = Game.state.stats?.gameTime || 0;
                        const remaining = Math.max(0, Math.ceil(expiresAt - gameTime));
                        btn.textContent = `⏳ ${remaining}초`;
                        btn.disabled = true;
                    } else if (id === 'fortify' && fortifyAtMax) {
                        // 성벽 보강 최대치 도달
                        btn.textContent = '🏰 MAX';
                        btn.disabled = true;
                        if (effectEl) {
                            effectEl.textContent = `🏰 영구 방어력 ${Math.round(fortifyCurrent * 100)}% (최대)`;
                        }
                    } else {
                        btn.textContent = '고용';
                        btn.disabled = !Mercenary.canHire(id);
                        // fortify 현재 누적치 실시간 표시
                        if (id === 'fortify' && effectEl && fortifyCurrent > 0) {
                            effectEl.textContent = `🏰 영구 방어력 +${Math.round(fortifyStep * 100)}% (현재 ${Math.round(fortifyCurrent * 100)}%)`;
                        }
                    }
                });
            } catch (error) {
                console.error('[UI.updateMercenaryPanel] 용병 패널 업데이트 실패:', error);
            }
        }
    });

    // 이벤트 리스너 등록
    document.addEventListener('mercenaryHired', (e) => {
        if (window.UI) {
            UI.updateMercenaryPanel();
        }
    });

    document.addEventListener('mercenaryExpired', (e) => {
        if (window.UI) {
            UI.showMessage('순찰병 계약이 만료되었습니다.', 'warning');
            UI.updateMercenaryPanel();
        }
    });
})();