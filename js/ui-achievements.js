(function () {
    'use strict';

    // UI 객체에 업적 관련 메서드 추가
    Object.assign(UI, {
        // 업적 패널 업데이트
        updateAchievementsPanel() {
            try {
                const container = document.getElementById('achievements-list');
                if (!container) return;
                container.innerHTML = '';

                if (!window.Achievements || !Achievements.getAll) {
                    return;
                }

                const allAchievements = Achievements.getAll();
                allAchievements.forEach((achievement) => {
                    const card = document.createElement('div');
                    card.className = `achievement-card ${achievement.achieved ? 'unlocked' : 'locked'}`;

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

                    if (achievement.reward) {
                        const rewardDiv = document.createElement('div');
                        rewardDiv.className = 'achievement-reward';
                        const rewardText = Object.entries(achievement.reward)
                            .map(([key, val]) => `${Utils.getResourceIcon(key) || key} ${val}`)
                            .join(', ');
                        rewardDiv.textContent = `보상: ${rewardText}`;
                        card.appendChild(rewardDiv);
                    }

                    if (achievement.achieved) {
                        const checkDiv = document.createElement('div');
                        checkDiv.className = 'achievement-check';
                        checkDiv.textContent = '✅';
                        card.appendChild(checkDiv);
                    }

                    card.appendChild(iconDiv);
                    card.appendChild(infoDiv);
                    container.appendChild(card);
                });
            } catch (error) {
                console.error('[UI.updateAchievementsPanel] 업적 패널 업데이트 실패:', error);
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
