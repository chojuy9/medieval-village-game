(function () {
    'use strict';

    // UI 객체에 업적 관련 메서드 추가
    Object.assign(UI, {
        // 현재 선택된 카테고리
        _currentAchievementCategory: 'all',

        // 업적 패널 업데이트
        updateAchievementsPanel() {
            try {
                const container = document.getElementById('achievements-list');
                if (!container) return;

                if (!window.Achievements || !Achievements.getAll) {
                    return;
                }

                // 카테고리 탭 생성 (최초 1회만)
                if (!container.querySelector('.achievement-tabs')) {
                    this.createAchievementTabs(container);
                }

                // 업적 목록 컨테이너
                let listContainer = container.querySelector('.achievement-list-container');
                if (!listContainer) {
                    listContainer = document.createElement('div');
                    listContainer.className = 'achievement-list-container';
                    container.appendChild(listContainer);
                }
                listContainer.innerHTML = '';

                const allAchievements = Achievements.getAll();
                
                // 카테고리별 필터링
                const filteredAchievements = this._currentAchievementCategory === 'all'
                    ? allAchievements
                    : allAchievements.filter(a => a.category === this._currentAchievementCategory);

                filteredAchievements.forEach((achievement) => {
                    const card = document.createElement('div');
                    card.className = `achievement-card ${achievement.achieved ? 'unlocked' : 'locked'}`;
                    card.dataset.category = achievement.category || 'special';

                    const iconDiv = document.createElement('div');
                    iconDiv.className = 'achievement-icon';
                    iconDiv.textContent = achievement.icon || '🏆';

                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'achievement-info';

                    const nameDiv = document.createElement('div');
                    nameDiv.className = 'achievement-name';
                    nameDiv.textContent = achievement.name;

                    const descDiv = document.createElement('div');
                    descDiv.className = 'achievement-desc';
                    descDiv.textContent = achievement.description;

                    infoDiv.appendChild(nameDiv);
                    infoDiv.appendChild(descDiv);

                    // 진행도 표시 (잠긴 업적만)
                    if (!achievement.achieved && achievement.progress !== undefined) {
                        const progressDiv = document.createElement('div');
                        progressDiv.className = 'achievement-progress';
                        
                        const progressFill = document.createElement('div');
                        progressFill.className = 'achievement-progress-fill';
                        const progressPercent = Math.min(100, Math.max(0, 
                            (achievement.progress.current / achievement.progress.target) * 100));
                        progressFill.style.width = `${progressPercent}%`;
                        
                        progressDiv.appendChild(progressFill);
                        infoDiv.appendChild(progressDiv);

                        const progressText = document.createElement('div');
                        progressText.className = 'achievement-progress-text';
                        progressText.textContent = `${achievement.progress.current}/${achievement.progress.target}`;
                        infoDiv.appendChild(progressText);
                    }

                    if (achievement.reward) {
                        const rewardDiv = document.createElement('div');
                        rewardDiv.className = 'achievement-reward';
                        const rewardText = Object.entries(achievement.reward)
                            .map(([key, val]) => `${Utils.getResourceIcon(key) || key} ${val}`)
                            .join(', ');
                        rewardDiv.textContent = `보상: ${rewardText}`;
                        infoDiv.appendChild(rewardDiv);
                    }

                    if (achievement.achieved) {
                        const checkDiv = document.createElement('div');
                        checkDiv.className = 'achievement-check';
                        checkDiv.textContent = '✅';
                        card.appendChild(checkDiv);
                    }

                    card.appendChild(iconDiv);
                    card.appendChild(infoDiv);
                    listContainer.appendChild(card);
                });

                // 업적이 없는 경우
                if (filteredAchievements.length === 0) {
                    const emptyDiv = document.createElement('div');
                    emptyDiv.className = 'achievement-empty';
                    emptyDiv.textContent = '해당 카테고리의 업적이 없습니다.';
                    listContainer.appendChild(emptyDiv);
                }
            } catch (error) {
                console.error('[UI.updateAchievementsPanel] 업적 패널 업데이트 실패:', error);
            }
        },

        // 업적 카테고리 탭 생성
        createAchievementTabs(container) {
            try {
                const tabsDiv = document.createElement('div');
                tabsDiv.className = 'achievement-tabs';

                const categories = [
                    { id: 'all', name: '전체' },
                    { id: 'building', name: '🏗️ 건설' },
                    { id: 'economy', name: '💰 경제' },
                    { id: 'survival', name: '⚔️ 생존' },
                    { id: 'population', name: '👥 인구' },
                    { id: 'special', name: '🌟 특수' }
                ];

                categories.forEach(cat => {
                    const tab = document.createElement('button');
                    tab.className = `ach-tab ${cat.id === this._currentAchievementCategory ? 'active' : ''}`;
                    tab.dataset.category = cat.id;
                    tab.textContent = cat.name;
                    
                    tab.addEventListener('click', () => {
                        // 활성 탭 변경
                        tabsDiv.querySelectorAll('.ach-tab').forEach(t => t.classList.remove('active'));
                        tab.classList.add('active');
                        
                        this._currentAchievementCategory = cat.id;
                        this.updateAchievementsPanel();
                    });

                    tabsDiv.appendChild(tab);
                });

                container.appendChild(tabsDiv);
            } catch (error) {
                console.error('[UI.createAchievementTabs] 업적 탭 생성 실패:', error);
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
        }
    });
})();
