(function () {
    'use strict';

    // UI 객체에 이벤트 배너 관련 메서드 추가
    Object.assign(UI, {
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

                console.log('[UI.onEventTriggered] 이벤트 배너 표시:', eventData.id);
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

                console.log('[UI.onEventResolved] 이벤트 배너 숨김');
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
        }
    });
})();
