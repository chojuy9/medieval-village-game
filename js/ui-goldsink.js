(function () {
  'use strict';

  // 금화 소비처 버튼 이벤트 핸들러 초기화
  function initGoldSinkButtons() {
    try {
      // 마을 잔치 버튼
      const feastBtn = document.getElementById('btn-feast');
      if (feastBtn) {
        feastBtn.addEventListener('click', () => {
          if (!window.Game) return;
          const result = Game.holdFeast ? Game.holdFeast() : { success: false, reason: 'not_implemented' };
          if (!result.success) {
            if (result.reason === 'gold') {
              window.UI && window.UI.showMessage('금화가 부족합니다!', 'error');
            } else if (result.reason === 'cooldown') {
              window.UI && window.UI.showMessage('재사용 대기 중입니다.', 'warning');
            } else {
              window.UI && window.UI.showMessage('잔치를 개최할 수 없습니다.', 'error');
            }
          } else {
            window.UI && window.UI.showMessage('🎉 마을 잔치가 시작되었습니다! 행복도 +25', 'success');
            window.SoundManager && SoundManager.play('event');
          }
          updateFeastButton();
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
              window.UI && window.UI.showMessage('금화가 부족합니다! (50 금화 필요)', 'error');
            } else {
              window.UI && window.UI.showMessage('긴급 보급을 실행할 수 없습니다.', 'error');
            }
          } else {
            window.UI && window.UI.showMessage('🚑 긴급 보급 완료! 식량 +150', 'success');
            window.SoundManager && SoundManager.play('build');
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
            window.UI && window.UI.showMessage('금화가 부족하여 야경대를 고용할 수 없습니다.', 'error');
          } else {
            if (enabled) {
              window.UI && window.UI.showMessage('💂 야경대가 고용되었습니다. (금화 5/초 소모)', 'success');
            } else {
              window.UI && window.UI.showMessage('야경대가 해산되었습니다.', 'warning');
            }
          }
          updateNightwatchStatus();
        });
      }

      // 초기 상태 업데이트
      updateFeastButton();
      updateNightwatchStatus();
      updateBreadWarning();

      // 주기적 상태 업데이트 (쿨다운 표시용)
      setInterval(() => {
        updateFeastButton();
        updateNightwatchStatus();
        updateBreadWarning();
      }, 1000);

    } catch (error) {
      console.error('[UIGoldSink.initGoldSinkButtons] 금화 소비처 버튼 초기화 실패:', error);
    }
  }

  // 마을 잔치 버튼 상태 업데이트 (쿨다운 표시)
  function updateFeastButton() {
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
      console.error('[UIGoldSink.updateFeastButton] 잔치 버튼 업데이트 실패:', error);
    }
  }

  // 야경대 상태 표시 업데이트
  function updateNightwatchStatus() {
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
      console.error('[UIGoldSink.updateNightwatchStatus] 야경대 상태 업데이트 실패:', error);
    }
  }

  // 빵 부족 경고 표시 업데이트
  function updateBreadWarning() {
    try {
      const warningEl = document.getElementById('bread-warning');
      if (!warningEl || !window.Game) return;

      const state = Game.state;
      const hasMill = state.buildings.some(b => b.type === 'mill');
      const breadAmount = state.resources.bread || 0;
      const population = state.population.current;

      const isBreadLow = hasMill && breadAmount < population * 5;

      warningEl.style.display = isBreadLow ? 'flex' : 'none';
    } catch (error) {
      console.error('[UIGoldSink.updateBreadWarning] 빵 부족 경고 업데이트 실패:', error);
    }
  }

  window.UIGoldSink = {
    initGoldSinkButtons,
    updateFeastButton,
    updateNightwatchStatus,
    updateBreadWarning
  };
})();
