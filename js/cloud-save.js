(function () {
  'use strict';

  const SUPABASE_URL = 'https://auuoqzyxvrfkrqtxguah.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_v7w5pTVZ3hXoxRx9LAejJQ_dug_BF8Z';
  const UUID_KEY     = 'medieval_cloud_uuid';
  const SYNC_MS      = 5 * 60 * 1000;

  const HEADERS = {
    'apikey':        SUPABASE_KEY,
    'Content-Type':  'application/json',
  };

  // UUID 관리
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  function getUUID() {
    let id = localStorage.getItem(UUID_KEY);
    if (!id) { id = generateUUID(); localStorage.setItem(UUID_KEY, id); }
    return id;
  }
  function setUUID(id) { localStorage.setItem(UUID_KEY, id); }

  // 점수 계산
  function calculateScore(state) {
    if (!state) return 0;
    const maxPop   = (state.stats && state.stats.maxPopulation) || (state.population && state.population.current) || 0;
    const buildings = Array.isArray(state.buildings) ? state.buildings.length : 0;
    const gold      = Math.floor(((state.resources && state.resources.gold) || 0) / 10);
    const ach       = Array.isArray(state.achievements) ? state.achievements.length * 500 : 0;
    const playtime  = (state.stats && state.stats.playtime) || 0;
    const research  = Array.isArray(state.research && state.research.completed) ? state.research.completed.length * 200 : 0;
    return Math.floor(maxPop * 100 + buildings * 50 + gold + ach + playtime + research);
  }

  // Supabase REST 호출
  async function sb(path, options = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { ...HEADERS, ...(options.headers || {}) },
      ...options,
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || `HTTP ${res.status}`); }
    if (res.status === 204) return null;
    return res.json();
  }

  // 클라우드 저장
  async function cloudSave(state) {
    return sb('saves', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ uuid: getUUID(), save_data: state, updated_at: new Date().toISOString() }),
    });
  }

  // 클라우드 불러오기
  async function cloudLoad(uuid) {
    const id  = uuid || getUUID();
    const res = await sb(`saves?uuid=eq.${encodeURIComponent(id)}&select=save_data,updated_at`);
    if (!res || res.length === 0) throw new Error('저장 데이터 없음');
    return res[0];
  }

  // 순위 계산
  async function getMyRank(score) {
    const above = await sb(`leaderboard?score=gt.${score}&select=uuid`).catch(() => []);
    return (above ? above.length : 0) + 1;
  }

  // 점수 등록
  async function submitScore(state, nickname, villageName) {
    const uuid  = getUUID();
    const score = calculateScore(state);
    const prev  = await sb(`leaderboard?uuid=eq.${encodeURIComponent(uuid)}&select=score`).catch(() => []);
    const prevScore = prev && prev[0] ? prev[0].score : -1;

    if (score > prevScore) {
      await sb('leaderboard', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          uuid,
          nickname:     (nickname || '익명의 영주').slice(0, 30),
          score,
          village_name: (villageName || '이름없는 마을').slice(0, 50),
          population:   (state.population && state.population.current) || 0,
          buildings:    Array.isArray(state.buildings) ? state.buildings.length : 0,
          playtime:     (state.stats && state.stats.playtime) || 0,
          updated_at:   new Date().toISOString(),
        }),
      });
    }
    return { rank: await getMyRank(score), score };
  }

  // 리더보드 조회
  async function fetchLeaderboard(limit = 20) {
    const entries = await sb(`leaderboard?select=*&order=score.desc&limit=${limit}`);
    const myUUID  = getUUID();
    let my_rank   = null;
    if (entries) {
      const myIdx = entries.findIndex(e => e.uuid === myUUID);
      if (myIdx >= 0) {
        my_rank = myIdx + 1;
      } else {
        const myRow = await sb(`leaderboard?uuid=eq.${encodeURIComponent(myUUID)}&select=score`).catch(() => []);
        if (myRow && myRow[0]) my_rank = await getMyRank(myRow[0].score);
      }
    }
    return { entries: (entries || []).map((e, i) => ({ ...e, rank: i + 1 })), my_rank };
  }

  // 자동 동기화
  let _timer = null;
  function startAutoSync() {
    if (_timer) return;
    _timer = setInterval(async () => {
      const state = window.__MEDIEVAL_GAME_STATE;
      if (!state) return;
      try { await cloudSave(state); console.log('[CloudSave] 자동 동기화 완료'); }
      catch (e) { console.warn('[CloudSave] 자동 동기화 실패:', e.message); }
    }, SYNC_MS);
  }

  window.CloudSave = { getUUID, setUUID, calculateScore, cloudSave, cloudLoad, submitScore, fetchLeaderboard, startAutoSync,
    stopAutoSync() { if (_timer) { clearInterval(_timer); _timer = null; } }
  };
})();