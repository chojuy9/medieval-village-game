(function () {
  'use strict';

  const SUPABASE_URL = 'https://auuoqzyxvrfkrqtxguah.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_v7w5pTVZ3hXoxRx9LAejJQ_dug_BF8Z';
  const UUID_KEY = 'medieval_cloud_uuid';
  const SYNC_MS = 5 * 60 * 1000;

  // 클라이언트를 처음 사용할 때 생성 (로드 타이밍 문제 방지)
  let _client = null;
  function getClient() {
    if (!_client) {
      if (!window.supabase) throw new Error('Supabase 라이브러리가 로드되지 않았습니다');
      _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return _client;
  }

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
    const maxPop = (state.stats && state.stats.maxPopulation) || (state.population && state.population.current) || 0;
    const buildings = Array.isArray(state.buildings) ? state.buildings.length : 0;
    const gold = Math.floor(((state.resources && state.resources.gold) || 0) / 10);
    const ach = Array.isArray(state.achievements) ? state.achievements.length * 500 : 0;
    const playtime = (state.stats && state.stats.playtime) || 0;
    const research = Array.isArray(state.research && state.research.completed) ? state.research.completed.length * 200 : 0;
    return Math.floor(maxPop * 100 + buildings * 50 + gold + ach + playtime + research);
  }

  // 클라우드 저장
  async function cloudSave(state) {
    const { error } = await getClient().from('saves').upsert({
      uuid: getUUID(),
      save_data: state,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  }

  // 클라우드 불러오기
  async function cloudLoad(uuid) {
    const id = uuid || getUUID();
    const { data, error } = await getClient().from('saves').select('save_data, updated_at').eq('uuid', id).single();
    if (error) throw new Error('저장 데이터 없음');
    return data;
  }

  // 순위 계산
  async function getMyRank(score) {
    const { count } = await getClient().from('leaderboard').select('uuid', { count: 'exact', head: true }).gt('score', score);
    return (count || 0) + 1;
  }

  // 점수 등록
  async function submitScore(state, nickname, villageName) {
    const uuid = getUUID();
    const score = calculateScore(state);

    const { data: prev } = await getClient().from('leaderboard').select('score').eq('uuid', uuid).single();
    const prevScore = prev ? prev.score : -1;

    if (score > prevScore) {
      const { error } = await getClient().from('leaderboard').upsert({
        uuid,
        nickname: (nickname || '익명의 영주').slice(0, 30),
        score,
        village_name: (villageName || '이름없는 마을').slice(0, 50),
        population: (state.population && state.population.current) || 0,
        buildings: Array.isArray(state.buildings) ? state.buildings.length : 0,
        playtime: (state.stats && state.stats.playtime) || 0,
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
    }
    return { rank: await getMyRank(score), score };
  }

  // 리더보드 조회
  async function fetchLeaderboard(limit = 20) {
    const { data: entries, error } = await getClient().from('leaderboard').select('*').order('score', { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);

    const myUUID = getUUID();
    let my_rank = null;
    if (entries) {
      const myIdx = entries.findIndex(e => e.uuid === myUUID);
      if (myIdx >= 0) {
        my_rank = myIdx + 1;
      } else {
        const { data: myRow } = await getClient().from('leaderboard').select('score').eq('uuid', myUUID).single();
        if (myRow) my_rank = await getMyRank(myRow.score);
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

  window.CloudSave = {
    getUUID, setUUID, calculateScore, cloudSave, cloudLoad,
    submitScore, fetchLeaderboard, startAutoSync,
    stopAutoSync() { if (_timer) { clearInterval(_timer); _timer = null; } }
  };
})();