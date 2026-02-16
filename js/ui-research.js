(function () {
    'use strict';

    // UI 객체에 연구 관련 메서드 추가
    Object.assign(UI, {
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
        }
    });
})();
