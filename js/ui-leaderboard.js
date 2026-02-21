(function () {
  'use strict';

  // =====================================================
  // 리더보드 & 클라우드 저장 UI
  // =====================================================

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
  }

  function formatScore(score) {
    return score.toLocaleString('ko-KR');
  }

  function getState() {
    return window.__MEDIEVAL_GAME_STATE || null;
  }

  // =====================================================
  // UUID 표시 & 복사
  // =====================================================
  function initUUIDDisplay() {
    const display = document.getElementById('my-uuid-display');
    const copyBtn = document.getElementById('copy-uuid-btn');
    const changeBtn = document.getElementById('change-uuid-btn');
    if (!display) return;

    const uuid = CloudSave.getUUID();
    display.textContent = uuid;

    copyBtn && copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(uuid);
        copyBtn.textContent = '✅ 복사됨';
        setTimeout(() => { copyBtn.textContent = '📋 복사'; }, 2000);
      } catch {
        window.prompt('UUID를 복사하세요:', uuid);
      }
    });

    changeBtn && changeBtn.addEventListener('click', () => {
      const input = window.prompt(
        '다른 기기의 UUID를 입력하면 그 세이브 데이터를 불러옵니다.\n' +
        '현재 UUID: ' + CloudSave.getUUID()
      );
      if (!input) return;
      const trimmed = input.trim();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
        alert('UUID 형식이 올바르지 않습니다.');
        return;
      }
      CloudSave.setUUID(trimmed);
      display.textContent = trimmed;
      alert('UUID가 변경되었습니다. 클라우드에서 불러오기를 눌러 데이터를 가져오세요.');
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =====================================================
  // 리더보드 렌더링
  // =====================================================
  function renderLeaderboard(data) {
    const container = document.getElementById('leaderboard-table-container');
    if (!container) return;

    const { entries, my_rank } = data;
    const myUUID = CloudSave.getUUID();

    if (!entries || entries.length === 0) {
      container.innerHTML = '<p class="leaderboard-placeholder">아직 등록된 점수가 없어요!</p>';
      return;
    }

    let html = `
      ${my_rank ? `<p style="text-align:center;margin-bottom:8px;font-weight:bold;color:#8B4513;">내 순위: ${my_rank}위</p>` : ''}
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>순위</th>
            <th>닉네임</th>
            <th>마을</th>
            <th>점수</th>
            <th>인구</th>
            <th>플레이</th>
          </tr>
        </thead>
        <tbody>
    `;

    entries.forEach(e => {
      const isMe = e.uuid === myUUID;
      const rankEmoji = e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank;
      html += `
        <tr class="${isMe ? 'my-row' : ''} leaderboard-rank-${e.rank}">
          <td>${rankEmoji}</td>
          <td>${escapeHtml(e.nickname)}${isMe ? ' 👈' : ''}</td>
          <td>${escapeHtml(e.village_name)}</td>
          <td>${formatScore(e.score)}</td>
          <td>${e.population}명</td>
          <td>${formatTime(e.playtime)}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  // =====================================================
  // 이벤트 바인딩
  // =====================================================
  function bindEvents() {
    // 클라우드 저장 버튼 (footer)
    const cloudSaveBtn = document.getElementById('cloud-save-btn');
    cloudSaveBtn && cloudSaveBtn.addEventListener('click', async () => {
      const state = getState();
      if (!state) return;
      cloudSaveBtn.disabled = true;
      cloudSaveBtn.textContent = '⏳ 저장 중...';
      try {
        await CloudSave.cloudSave(state);
        if (window.UI && UI.showMessage) UI.showMessage('☁️ 클라우드에 저장되었습니다!', 'success');
      } catch (e) {
        if (window.UI && UI.showMessage) UI.showMessage('클라우드 저장 실패: ' + e.message, 'error');
      } finally {
        cloudSaveBtn.disabled = false;
        cloudSaveBtn.textContent = '☁️ 클라우드';
      }
    });

    // 클라우드 불러오기 버튼 (메뉴 모달)
    const cloudLoadBtn = document.getElementById('cloud-load-btn');
    cloudLoadBtn && cloudLoadBtn.addEventListener('click', async () => {
      if (!confirm('클라우드 데이터로 현재 게임을 덮어씁니다. 계속하시겠습니까?')) return;
      cloudLoadBtn.disabled = true;
      cloudLoadBtn.textContent = '⏳ 불러오는 중...';
      try {
        const data = await CloudSave.cloudLoad();
        // 로컬스토리지에 덮어쓰고 Game.load() 호출
        const saveObj = {
          saveVersion: data.save_data.saveVersion || 4,
          savedAt: Date.now(),
          lastUpdate: Date.now(),
          state: data.save_data.state || data.save_data,
        };
        const saveKey = (window.GAME_CONFIG && window.GAME_CONFIG.SAVE_KEY) || 'medievalVillageGameSave';
        localStorage.setItem(saveKey, JSON.stringify(saveObj));
        if (window.Game) Game.load();
        if (window.UI) {
          UI._buildingsCacheKey = null;
          UI._tradeControlsInitialized = false;
          UI.showMessage('☁️ 클라우드 데이터를 불러왔습니다!', 'success');
        }
        document.getElementById('menu-modal').classList.add('hidden');
      } catch (e) {
        alert('불러오기 실패: ' + e.message);
      } finally {
        cloudLoadBtn.disabled = false;
        cloudLoadBtn.textContent = '☁️ 클라우드에서 불러오기';
      }
    });

    // 점수 등록 버튼
    const submitBtn = document.getElementById('submit-score-btn');
    submitBtn && submitBtn.addEventListener('click', async () => {
      const state = getState();
      if (!state) return;

      const nicknameInput = document.getElementById('leaderboard-nickname');
      const nickname = (nicknameInput && nicknameInput.value.trim()) || '익명의 영주';

      // 마을 이름 (village_name은 게임 내 저장하지 않으므로 닉네임 기반으로)
      const villageName = nickname + '의 마을';

      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ 등록 중...';
      try {
        const result = await CloudSave.submitScore(state, nickname, villageName);
        if (window.UI) UI.showMessage(`🏆 ${result.rank}위로 등록되었습니다!`, 'success');
        // 등록 후 자동 새로고침
        const lb = await CloudSave.fetchLeaderboard();
        renderLeaderboard(lb);
      } catch (e) {
        if (window.UI) UI.showMessage('점수 등록 실패: ' + e.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '📤 점수 등록';
      }
    });

    // 새로고침 버튼
    const refreshBtn = document.getElementById('refresh-leaderboard-btn');
    refreshBtn && refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = '⏳';
      try {
        const data = await CloudSave.fetchLeaderboard();
        renderLeaderboard(data);
      } catch (e) {
        const container = document.getElementById('leaderboard-table-container');
        if (container) container.innerHTML = `<p class="leaderboard-placeholder">불러오기 실패: ${e.message}</p>`;
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = '🔄 새로고침';
      }
    });

    // 리더보드 버튼 (footer) → 패널로 스크롤
    const lbBtn = document.getElementById('leaderboard-btn');
    lbBtn && lbBtn.addEventListener('click', () => {
      const panel = document.getElementById('leaderboard-panel');
      if (panel) panel.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // =====================================================
  // 초기화
  // =====================================================
  // 수정 코드
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (!window.CloudSave) return;
      initUUIDDisplay();
      bindEvents();
      CloudSave.startAutoSync();
    });
  } else {
    // 이미 DOM 로드 완료된 경우 즉시 실행
    if (window.CloudSave) {
      initUUIDDisplay();
      bindEvents();
      CloudSave.startAutoSync();
    }
  }
})();
