// js/ui-manual.js — 게임 설명서 UI 모듈
const ManualUI = {
    _currentTab: 'overview',
    _contentCache: {},

    init() {
        // 설명서 열기 버튼
        const manualBtn = document.getElementById('manual-btn');
        if (manualBtn) {
            manualBtn.addEventListener('click', () => this.open());
        }

        // 설명서 닫기 버튼
        const closeBtn = document.getElementById('close-manual-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // 모달 바깥 클릭 시 닫기
        const modal = document.getElementById('manual-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });
        }

        // ESC 키로 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                this.close();
            }
        });

        // 탭 버튼 이벤트
        const tabContainer = document.querySelector('.manual-tabs');
        if (tabContainer) {
            tabContainer.addEventListener('click', (e) => {
                const tab = e.target.closest('.manual-tab');
                if (tab) {
                    this.switchTab(tab.dataset.category);
                }
            });
        }
    },

    open() {
        const menuModal = document.getElementById('menu-modal');
        if (menuModal) menuModal.classList.add('hidden');

        const modal = document.getElementById('manual-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.switchTab(this._currentTab || 'overview');
        }
    },

    close() {
        const modal = document.getElementById('manual-modal');
        if (modal) modal.classList.add('hidden');
    },

    switchTab(category) {
        this._currentTab = category;
        // 탭 활성 상태 업데이트
        document.querySelectorAll('.manual-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        // 콘텐츠 렌더링
        const content = document.getElementById('manual-content');
        if (content) {
            content.innerHTML = this.renderCategory(category);
            content.scrollTop = 0;
        }
    },

    renderCategory(category) {
        if (this._contentCache[category]) return this._contentCache[category];
        const renderer = this._renderers[category];
        const html = renderer ? renderer() : '<p>준비 중입니다.</p>';
        this._contentCache[category] = html;
        return html;
    },

    _renderers: {
        // ─── 📋 개요 ───
        overview() {
            return `
<h3>🏰 중세 마을 경영에 오신 것을 환영합니다!</h3>
<p>당신은 작은 마을의 영주로서, 자원을 수집하고 건물을 짓고, 인구를 늘려 번영하는 도시를 만들어야 합니다.</p>

<h4>🎯 게임 목표</h4>
<ul>
  <li>자원을 채취하고 가공하여 마을을 발전시키세요</li>
  <li>인구를 늘리고 행복하게 유지하세요</li>
  <li>연구를 통해 새로운 기술을 해금하세요</li>
  <li>이벤트와 재해에 대비하세요</li>
  <li>교역으로 부를 축적하세요</li>
  <li>도적의 습격으로부터 마을을 지키세요</li>
</ul>

<h4>📍 기본 흐름</h4>
<ol>
  <li>🪓 벌목소 → 원목 생산</li>
  <li>⛏️ 채석장 → 원석 생산</li>
  <li>🌾 농장 → 식량 생산 <strong>(인구 유지 필수!)</strong></li>
  <li>🏠 집 건설 → 최대 인구 증가</li>
  <li>⚒️ 2차 가공 건물 (제재소/제빵소/대장간) → 가공품 생산</li>
  <li>🪑 3차 완제품 건물 (가구공방/무기공방) → 고급 물품 생산</li>
  <li>📈 교역 · 연구 · 조공으로 더 큰 발전!</li>
</ol>

<div class="manual-info-box">
  <h4>💾 저장 / 오프라인</h4>
  <ul>
    <li>60초마다 자동 저장됩니다</li>
    <li>하단의 💾 저장 버튼으로 수동 저장 가능</li>
    <li>☁️ 클라우드 저장으로 기기 간 동기화 가능</li>
    <li>게임을 닫아도 <strong>최대 8시간</strong>까지 자원이 자동으로 생산됩니다</li>
  </ul>
</div>`;
        },

        // ─── 🪵 자원 ───
        resources() {
            return `
<h3>🪵 자원 시스템</h3>

<h4>자원 목록</h4>
<table>
  <tr><th>아이콘</th><th>이름</th><th>등급</th><th>분류</th><th>설명</th></tr>
  <tr><td>🪵</td><td>원목</td><td>1차</td><td>원자재</td><td>벌목소에서 생산. 건물 건설의 기본 재료</td></tr>
  <tr><td>🪨</td><td>원석</td><td>1차</td><td>원자재</td><td>채석장에서 생산. 건물 건설의 기본 재료</td></tr>
  <tr><td>🌾</td><td>곡물(식량)</td><td>1차</td><td>원자재</td><td>농장에서 생산. 인구 유지에 필수</td></tr>
  <tr><td>💰</td><td>금화</td><td>1차</td><td>화폐</td><td>주점·대장간·영주관에서 생산. 교역 등에 사용</td></tr>
  <tr><td>🪓</td><td>목재</td><td>2차</td><td>가공품</td><td>제재소에서 원목을 가공하여 생산</td></tr>
  <tr><td>🍞</td><td>빵</td><td>2차</td><td>가공품</td><td>제빵소에서 곡물을 가공하여 생산</td></tr>
  <tr><td>⚒️</td><td>도구</td><td>2차</td><td>가공품</td><td>대장간에서 생산. 2차 이상 건물 유지에 필요</td></tr>
  <tr><td>🪑</td><td>가구</td><td>3차</td><td>완제품</td><td>가구공방에서 생산. 높은 교역 가치</td></tr>
  <tr><td>⚔️</td><td>무기</td><td>3차</td><td>완제품</td><td>무기공방에서 생산. 최고 교역 가치</td></tr>
</table>

<h4>자원 등급 체계</h4>
<div class="manual-info-box">
  <p><strong>■ 1차 원자재 (Tier 1)</strong><br>
  벌목소, 채석장, 농장에서 직접 생산. 건물 건설과 2차 가공의 원료로 사용.</p>
  <p><strong>■ 2차 가공품 (Tier 2)</strong><br>
  1차 원자재를 소비하여 생산 (제재소, 제빵소, 대장간, 석공소).<br>
  연구 해금이 필요한 건물에서 생산됩니다.</p>
  <p><strong>■ 3차 완제품 (Tier 3)</strong><br>
  2차 가공품을 소비하여 생산 (가구공방, 무기공방). 교역 가치가 매우 높습니다.</p>
</div>

<div class="manual-warning-box">
  <h4>⚠️ 자원 소비 주의사항</h4>
  <ul>
    <li><strong>식량:</strong> 인구 1명당 매초 0.1 소비 (25명 이상 시 0.12로 증가)</li>
    <li><strong>빵:</strong> 인구 1명당 매초 0.03 소비</li>
    <li><strong>도구:</strong> 2차 이상 건물 1개당 매초 0.008 소비 (유지보수)</li>
    <li>도구 보유량이 0이면 2차 이상 건물 생산량 <strong>30% 감소!</strong></li>
    <li>식량이 0이 되면 <strong>30초마다 인구 1명이 줄어듭니다!</strong></li>
  </ul>
</div>

<h4>🏁 시작 자원</h4>
<div class="manual-info-box">
  🪵 원목: 100 &nbsp;|&nbsp; 🪨 원석: 50 &nbsp;|&nbsp; 🌾 식량: 200 &nbsp;|&nbsp; 💰 금화: 0
</div>`;
        },

        // ─── 🏗️ 건물 ───
        buildings() {
            return `
<h3>🏗️ 건물 시스템</h3>

<h4>건물 등급 분류</h4>
<div class="manual-info-box">
  <p><strong>■ 1차 건물 (기본):</strong> 즉시 건설 가능. 원자재 생산 및 마을 기반 시설</p>
  <p><strong>■ 2차 건물 (가공):</strong> 연구 해금 또는 특정 건물 필요. 원자재를 가공</p>
  <p><strong>■ 3차 건물 (완제품):</strong> 2차 건물 필요. 가공품으로 고가 완제품 생산</p>
  <p><strong>■ 4차 건물 (특수):</strong> 조공이나 특수 조건으로 해금. 강력한 효과</p>
</div>

<h4>1차 건물 (기본)</h4>
<table>
  <tr><th>건물</th><th>건설 비용</th><th>일꾼</th><th>생산</th><th>특수 효과</th><th>해금 조건</th></tr>
  <tr><td>🪓 벌목소</td><td>🪵 10</td><td>2명</td><td>원목 +2/초</td><td>—</td><td>없음</td></tr>
  <tr><td>⛏️ 채석장</td><td>🪵 30</td><td>2명</td><td>원석 +1/초</td><td>—</td><td>없음</td></tr>
  <tr><td>🌾 농장</td><td>🪵 20, 🪨 10</td><td>2명</td><td>식량 +5/초</td><td>—</td><td>없음</td></tr>
  <tr><td>🏠 집</td><td>🪵 50, 🪨 30</td><td>0명</td><td>—</td><td>최대인구 +5</td><td>없음</td></tr>
  <tr><td>🏪 시장</td><td>🪵 100, 🪨 50</td><td>1명</td><td>—</td><td>전체 생산 +10%<br>교역 해금</td><td>없음 (최대 3개)</td></tr>
  <tr><td>⛪ 교회</td><td>🪵 120, 🪨 80</td><td>1명</td><td>—</td><td>행복도 +10</td><td>인구 15명</td></tr>
  <tr><td>🍺 주점</td><td>🪵 30, 🪨 20, 🪓 20</td><td>2명</td><td>금화 +2/초</td><td>행복도 +5</td><td>시장 1개</td></tr>
  <tr><td>🏰 성벽</td><td>🪨 400, 💰 100</td><td>0명</td><td>—</td><td>방어력 +20<br>용병 해금</td><td>채석장 3개</td></tr>
  <tr><td>🏫 학교</td><td>🪵 80, 🪨 80, 🪓 30, 💰 80</td><td>2명</td><td>—</td><td>전체 생산 +5%<br>연구 해금</td><td>교회 1개 (최대 3개)</td></tr>
  <tr><td>🏛️ 영주관</td><td>🪵 300, 🪨 200, 💰 150</td><td>3명</td><td>금화 +5/초</td><td>최대인구 +10<br>조공 해금</td><td>인구 30명</td></tr>
  <tr><td>💎 보물창고</td><td>🪵 200, 🪨 150, 💰 100</td><td>2명</td><td>—</td><td>금화 생산 +20%</td><td>대장간 1, 시장 1 (최대 2개)</td></tr>
</table>

<h4>2차 건물 (가공)</h4>
<table>
  <tr><th>건물</th><th>건설 비용</th><th>일꾼</th><th>생산</th><th>소비 (매초)</th><th>해금 조건</th></tr>
  <tr><td>⚒️ 대장간</td><td>🪵 80, 🪨 60</td><td>3명</td><td>도구 +0.5/초<br>금화 +0.3/초</td><td>원목 1, 원석 1</td><td>채석장 1개</td></tr>
  <tr><td>🪚 제재소</td><td>🪵 60, 🪨 40</td><td>2명</td><td>목재 +1/초</td><td>원목 2</td><td>벌목소 2개 + 연구「고급 목공」</td></tr>
  <tr><td>🍞 제빵소</td><td>🪵 30, 🪨 20, 🪓 10</td><td>2명</td><td>빵 +2/초</td><td>식량 3</td><td>농장 2개 + 연구「제빵 기술」</td></tr>
  <tr><td>🧱 석공소</td><td>🪵 50, 🪨 60, 🪓 15, 💰 40</td><td>2명</td><td>원석 +1.5/초</td><td>원석 2, 도구 0.5</td><td>채석장 2개 + 연구「석공술」</td></tr>
</table>

<h4>3차 건물 (완제품)</h4>
<table>
  <tr><th>건물</th><th>건설 비용</th><th>일꾼</th><th>생산</th><th>소비 (매초)</th><th>해금 조건</th></tr>
  <tr><td>🪑 가구공방</td><td>🪵 100, 🪨 60, 💰 50</td><td>3명</td><td>가구 +0.3/초</td><td>목재 2, 도구 1</td><td>제재소 1, 대장간 1</td></tr>
  <tr><td>⚔️ 무기공방</td><td>🪵 120, 🪨 80, 💰 80</td><td>3명</td><td>무기 +0.2/초</td><td>목재 1, 도구 2</td><td>제재소 1, 대장간 1, 인구 20명</td></tr>
</table>

<h4>4차 건물 (특수)</h4>
<table>
  <tr><th>건물</th><th>건설 비용</th><th>일꾼</th><th>생산/소비</th><th>특수 효과</th><th>해금 조건</th></tr>
  <tr><td>🏦 왕립 조폐소</td><td>🪵 300, 🪨 200, 💰 2,000</td><td>4명</td><td>금화 +10/초<br>(소비: 금화 1/초)</td><td>—</td><td>조공「왕실 인가」완료</td></tr>
  <tr><td>⛪ 대성당</td><td>🪵 500, 🪨 400, 💰 1,500</td><td>3명</td><td>—</td><td>행복도 +25<br><strong>역병 완전 면역!</strong></td><td>교회 3개 + 연구「농업혁신」</td></tr>
</table>

<h4>⬆️ 건물 강화 시스템</h4>
<div class="manual-info-box">
  일꾼이 필요한 생산 건물만 강화 가능합니다 (★1 ~ ★5)
</div>
<table>
  <tr><th>등급</th><th>금화 비용</th><th>목재 비용</th><th>생산 보너스</th></tr>
  <tr><td>★1</td><td>💰 100</td><td>🪓 5</td><td>+10%</td></tr>
  <tr><td>★2</td><td>💰 300</td><td>🪓 10</td><td>+25%</td></tr>
  <tr><td>★3</td><td>💰 700</td><td>🪓 15</td><td>+45%</td></tr>
  <tr><td>★4</td><td>💰 1,500</td><td>🪓 20</td><td>+70%</td></tr>
  <tr><td>★5</td><td>💰 3,000</td><td>🪓 25</td><td>+100% (2배!)</td></tr>
</table>

<h4>🗑️ 건물 철거</h4>
<div class="manual-info-box">
  건물을 철거하면 건설 비용의 <strong>50%</strong>를 자원으로 돌려받습니다.<br>
  배치된 일꾼은 자동으로 해제됩니다.
</div>

<h4>건물 개수 제한</h4>
<table>
  <tr><th>건물</th><th>최대 건설 개수</th></tr>
  <tr><td>🏪 시장</td><td>3개</td></tr>
  <tr><td>🏫 학교</td><td>3개</td></tr>
  <tr><td>💎 보물창고</td><td>2개</td></tr>
  <tr><td>기타 건물</td><td>제한 없음</td></tr>
</table>`;
        },

        // ─── 👥 인구 ───
        population() {
            return `
<h3>👥 인구 시스템</h3>

<h4>🏁 기본 정보</h4>
<div class="manual-info-box">
  <strong>게임 시작 시:</strong> 인구 5명 / 최대 인구 10명 / 유휴 5명
</div>

<h4>최대 인구 증가 방법</h4>
<table>
  <tr><th>방법</th><th>증가량</th></tr>
  <tr><td>🏠 집 건설</td><td>+5명 / 채</td></tr>
  <tr><td>🏛️ 영주관 건설</td><td>+10명</td></tr>
  <tr><td>👑 조공「작위 수여」</td><td>+20명</td></tr>
</table>

<h4>인구 증가 조건 및 속도</h4>
<div class="manual-info-box">
  <p><strong>증가 조건:</strong></p>
  <ul>
    <li>✅ 식량 > 0</li>
    <li>✅ 현재 인구 < 최대 인구</li>
  </ul>
  <p><strong>기본 속도:</strong> 45초마다 +1명</p>
  <p><strong>실제 속도:</strong> 행복도 배율 × 계절 배율 × 빵 보너스에 따라 달라집니다</p>
</div>

<div class="manual-tip-box">
  <strong>🍞 빵 보너스:</strong> 빵 보유량 ≥ (인구 × 0.5) 일 때 인구 성장 속도 <strong>×1.5!</strong><br>
  예: 인구 20명 → 빵 10개 이상 보유 시 성장 가속
</div>

<h4>⚠️ 인구 감소 조건</h4>
<div class="manual-warning-box">
  <ul>
    <li>식량이 0이 되면 <strong>30초마다 인구 1명 감소!</strong></li>
    <li>☠️ 역병 이벤트: 인구 1~2명 즉시 감소 (교회 시 피해 ×0.5, 대성당 시 면역)</li>
    <li>🏹 도적기지 침공 실패: 인구 -2명</li>
  </ul>
</div>

<h4>👷 일꾼 시스템</h4>
<div class="manual-info-box">
  <p><strong>자동 배치:</strong> 건물 건설 시 필요한 수만큼 자동 배치됩니다. 유휴 인구가 부족하면 건설 불가!</p>
  <p><strong>수동 조절:</strong> 건설된 건물에서 [+1] [-1] 버튼으로 1명씩 조절 가능</p>
  <p><strong>생산 정지:</strong> 일꾼이 0명인 건물은 생산과 소비가 모두 정지됩니다</p>
</div>

<h4>🌾 식량 소비 상세</h4>
<table>
  <tr><th>인구 구간</th><th>1인당 식량 소비 (매초)</th><th>예시</th></tr>
  <tr><td>1 ~ 24명</td><td>0.1 / 초</td><td>인구 20명 = 매초 2.0 식량</td></tr>
  <tr><td>25명 이상</td><td>0.12 / 초</td><td>인구 30명 = 매초 3.6 식량</td></tr>
</table>
<table>
  <tr><th>빵 소비</th><th>1인당 빵 소비 (매초)</th><th>예시</th></tr>
  <tr><td>전 구간</td><td>0.03 / 초</td><td>인구 20명 = 매초 0.6 빵</td></tr>
</table>`;
        },

        // ─── ⚙️ 생산 ───
        production() {
            return `
<h3>⚙️ 생산 시스템</h3>

<h4>생산 배율 공식</h4>
<div class="manual-info-box">
  <p><strong>최종 생산량 = 기본 생산량 × 여러 배율의 곱</strong></p>
  <p>적용되는 배율:</p>
  <ol>
    <li><strong>연구 보너스:</strong> 해당 건물 관련 연구 완료 시 적용</li>
    <li><strong>강화 보너스:</strong> 건물 강화 등급에 따라 +10% ~ +100%</li>
    <li><strong>시장 보너스:</strong> 시장 수 × 10% (최대 3개 = +30%)</li>
    <li><strong>학교 보너스:</strong> 학교 수 × 5% (최대 3개 = +15%)</li>
    <li><strong>행복도 배율:</strong> 행복도에 따라 ×0.9 ~ ×1.05</li>
    <li><strong>이벤트 배율:</strong> 활성 이벤트에 따라 가변</li>
    <li><strong>계절 배율:</strong> 계절별 자원 보너스/페널티</li>
    <li><strong>조공 영구 보너스:</strong> 대 헌상(+5%), 작위 수여(+10%)</li>
  </ol>
</div>

<h4>금화 추가 배율</h4>
<div class="manual-tip-box">
  <strong>💎 보물창고:</strong> 보물창고 수 × 20% 금화 생산 보너스<br>
  <strong>🏦 금융학 연구:</strong> 추가 +10% 금화 생산 보너스
</div>

<h4>⚒️ 도구 보유 효과</h4>
<div class="manual-warning-box">
  <p>도구 보유량 > 0 → 정상 생산 (×1.0)</p>
  <p>도구 보유량 = 0 → 2차 이상 건물 생산량 <strong>×0.7 (30% 감소!)</strong></p>
</div>

<h4>생산 순서</h4>
<div class="manual-info-box">
  매 1초마다 생산이 처리됩니다:<br>
  <strong>1차 건물 (원자재) → 2차 건물 (가공품) → 3차 건물 (완제품)</strong><br>
  순서대로 처리되므로 1차에서 생산된 원자재가 바로 2차에서 소비됩니다.
</div>

<h4>주요 소비 항목 종합</h4>
<table>
  <tr><th>소비 항목</th><th>소비 자원</th><th>소비량</th></tr>
  <tr><td>인구 식량 소비</td><td>식량</td><td>인구 × 0.1 (또는 0.12)/초</td></tr>
  <tr><td>인구 빵 소비</td><td>빵</td><td>인구 × 0.03/초</td></tr>
  <tr><td>건물 유지보수</td><td>도구</td><td>2차+ 건물 수 × 0.008/초</td></tr>
  <tr><td>💂 야경대</td><td>금화</td><td>5/초</td></tr>
  <tr><td>🪚 제재소</td><td>원목</td><td>2/초</td></tr>
  <tr><td>🍞 제빵소</td><td>식량</td><td>3/초</td></tr>
  <tr><td>⚒️ 대장간</td><td>원목 1, 원석 1</td><td>합계 2/초</td></tr>
  <tr><td>🧱 석공소</td><td>원석 2, 도구 0.5</td><td>합계 2.5/초</td></tr>
  <tr><td>🪑 가구공방</td><td>목재 2, 도구 1</td><td>합계 3/초</td></tr>
  <tr><td>⚔️ 무기공방</td><td>목재 1, 도구 2</td><td>합계 3/초</td></tr>
  <tr><td>🏦 왕립 조폐소</td><td>금화</td><td>1/초</td></tr>
</table>`;
        },

        // ─── 📜 이벤트 ───
        events() {
            return `
<h3>📜 이벤트 시스템</h3>

<h4>이벤트 발생 규칙</h4>
<div class="manual-info-box">
  <ul>
    <li><strong>체크 주기:</strong> 90초마다 이벤트 발생 여부를 판정</li>
    <li><strong>발생 확률:</strong> 40%</li>
    <li><strong>동시 이벤트:</strong> 이미 이벤트 활성 시 새 이벤트 불가</li>
    <li>이벤트는 <strong>가중치 기반 확률</strong>로 선택됩니다 (가중치 높을수록 자주 등장)</li>
  </ul>
</div>

<h4>🟢 긍정적 이벤트</h4>
<table>
  <tr><th>이벤트</th><th>지속</th><th>빈도</th><th>최소 시간</th><th>효과</th></tr>
  <tr><td>🌾 풍년</td><td>60초</td><td>높음</td><td>2분</td><td>식량 생산 ×1.5</td></tr>
  <tr><td>🧳 떠돌이 상인</td><td>60초</td><td>보통</td><td>1분 30초</td><td>금화 35~60 즉시 + 교역 할인 30%</td></tr>
  <tr><td>👥 이주민 유입</td><td>즉시</td><td>보통</td><td>1분 30초</td><td>인구 +2~3명</td></tr>
  <tr><td>🎪 축제</td><td>60초</td><td>보통</td><td>5분</td><td>행복도 +20, 금화 +50</td></tr>
  <tr><td>📦 보급 행렬</td><td>90초</td><td>보통</td><td>4분</td><td>원목/원석/식량 생산 ×1.3</td></tr>
  <tr><td>🏅 왕의 포상</td><td>즉시</td><td>낮음</td><td>10분</td><td>금화 150~250 즉시</td></tr>
  <tr><td>👨‍🌾 명장인 방문</td><td>120초</td><td>보통</td><td>6분</td><td>랜덤 생산 건물 ×2.0</td></tr>
  <tr><td>🌟 풍요의 계절</td><td>90초</td><td>보통</td><td>3분</td><td>식량 소비 ×0.5 (반감)</td></tr>
</table>

<h4>🔴 부정적 이벤트</h4>
<table>
  <tr><th>이벤트</th><th>지속</th><th>빈도</th><th>최소 시간</th><th>효과</th><th>방어/완화</th></tr>
  <tr><td>⚔️ 도적 습격</td><td>즉시</td><td>높음</td><td>2분 30초</td><td>자원 10~20% 약탈</td><td>성벽 ×0.5 / 기사단 완전방어 / 야경대 -15%</td></tr>
  <tr><td>🥀 흉년</td><td>60초</td><td>보통</td><td>3분</td><td>식량 생산 ×0.7</td><td>—</td></tr>
  <tr><td>☠️ 역병</td><td>60초</td><td>낮음</td><td>5분</td><td>인구 -1~2 + 소비 ×1.3</td><td>교회 ×0.5 / <strong>대성당 면역!</strong></td></tr>
  <tr><td>🔥 화재</td><td>즉시</td><td>낮음</td><td>8분</td><td>랜덤 건물 1개 파손</td><td>성벽: 50% 확률 방지</td></tr>
  <tr><td>🐀 쥐떼</td><td>즉시</td><td>보통</td><td>5분</td><td>식량 20% 손실</td><td>—</td></tr>
  <tr><td>💸 세금 징수</td><td>즉시</td><td>보통</td><td>6분</td><td>금화 15% 손실</td><td>—</td></tr>
  <tr><td>🌊 홍수</td><td>60초</td><td>낮음</td><td>7분</td><td>식량+원목 생산 완전 정지</td><td>—</td></tr>
</table>

<h4>🟡 중립 이벤트</h4>
<table>
  <tr><th>이벤트</th><th>지속</th><th>빈도</th><th>최소 시간</th><th>효과</th></tr>
  <tr><td>🛒 지나가는 행상</td><td>즉시</td><td>높음</td><td>1분</td><td>랜덤 자원 20~45 (금화 8~20)</td></tr>
  <tr><td>📜 왕의 칙령</td><td>90초</td><td>보통</td><td>3분</td><td>랜덤 건물 건설비 20% 할인</td></tr>
  <tr><td>⚖️ 외교 사절</td><td>즉시</td><td>보통</td><td>5분</td><td>선택형 (아래 참조)</td></tr>
  <tr><td>🔮 점술사</td><td>즉시</td><td>낮음</td><td>4분</td><td>다음 이벤트 예고</td></tr>
  <tr><td>🎭 유랑극단</td><td>60초</td><td>보통</td><td>3분</td><td>행복도 +10</td></tr>
</table>

<h4>⚖️ 외교 사절 선택지</h4>
<div class="manual-info-box">
  <p><strong>[1] 우호 조약 체결</strong> — 비용: 💰 100 → 보상: 💰 100 (관계 강화)</p>
  <p><strong>[2] 자원 교환 제안</strong> — 비용: 💰 100 → 보상: 랜덤 자원 50개</p>
  <p><strong>[3] 정중히 거절</strong> — 비용 없음, 효과 없음</p>
</div>

<h4>🏹 도적기지 침공 (특수 이벤트)</h4>
<div class="manual-warning-box">
  <p><strong>발동 조건 (모두 충족):</strong></p>
  <ul>
    <li>게임 시간 15분 이상 경과</li>
    <li>도적 습격을 3회 이상 당한 상태</li>
    <li>성벽 보유</li>
    <li>아직 도적기지를 해결하지 않은 상태</li>
  </ul>
</div>
<table>
  <tr><th>선택지</th><th>비용</th><th>성공률</th><th>성공 보상</th><th>실패 패널티</th></tr>
  <tr><td>⚔️ 원정대 파견</td><td>무기 20 + 금화 100</td><td>방어점수 ≥40: 80%<br>미만: 50%</td><td>금화 200 + 무기 10<br>도적 영구 제거</td><td>행복도 -15, 인구 -2</td></tr>
  <tr><td>💰 용병 고용 파견</td><td>금화 300</td><td>95%</td><td>동일</td><td>동일</td></tr>
  <tr><td>🚫 무시하기</td><td>없음</td><td>—</td><td>—</td><td>습격 확률 +30%</td></tr>
</table>
<div class="manual-tip-box">
  <strong>방어 점수 계산:</strong> 성벽 수 × 20 + 용병 방어 보너스(%) × 100 + 야경대(15)
</div>`;
        },

        // ─── 🌸 계절 ───
        seasons() {
            return `
<h3>🌸 계절 시스템</h3>

<h4>계절 순환</h4>
<div class="manual-info-box">
  한 계절 = <strong>3분 (180초)</strong> / 전체 사이클 = <strong>12분 (720초)</strong><br><br>
  🌸 봄 → ☀️ 여름 → 🍂 가을 → ❄️ 겨울 → 🌸 봄 → ...
</div>

<h4>계절별 효과</h4>
<table>
  <tr><th>계절</th><th>생산 보너스</th><th>생산 페널티</th><th>인구 성장</th><th>소비 변화</th></tr>
  <tr><td>🌸 봄</td><td>식량 +20%, 빵 +10%</td><td>—</td><td>×1.1 (빠름)</td><td>—</td></tr>
  <tr><td>☀️ 여름</td><td>원목 +10%, 원석 +10%, 목재 +8%</td><td>—</td><td>×1.0</td><td>—</td></tr>
  <tr><td>🍂 가을</td><td>식량 +30%, 금화 +15%, 가구 +8%</td><td>—</td><td>×1.0</td><td>—</td></tr>
  <tr><td>❄️ 겨울</td><td>무기 +5%</td><td><strong>식량 -40%, 빵 -10%</strong></td><td>×0.8 (느림)</td><td><strong>소비 +20%</strong></td></tr>
</table>

<h4>💡 계절별 전략</h4>
<div class="manual-tip-box">
  <p><strong>🌸 봄:</strong> 인구 성장이 빠릅니다. 집을 지어 최대 인구를 늘리세요!</p>
  <p><strong>☀️ 여름:</strong> 목재/석재 생산이 증가합니다. 건축에 집중하세요!</p>
  <p><strong>🍂 가을:</strong> 식량 생산이 크게 증가합니다. 겨울을 위해 비축하세요!</p>
  <p><strong>❄️ 겨울:</strong> 식량 생산이 급감하고 소비가 증가합니다. 반드시 가을까지 충분한 식량을 확보하세요!</p>
</div>`;
        },

        // ─── 😊 행복도 ───
        happiness() {
            return `
<h3>😊 행복도 시스템</h3>

<h4>행복도 계산</h4>
<div class="manual-info-box">
  <p><strong>기본 행복도: 50</strong></p>
  <p><strong>보너스 요소:</strong></p>
  <ul>
    <li>⛪ 교회 × 10 (최대 +30)</li>
    <li>🍺 주점 × 5</li>
    <li>⛪ 대성당 × 25</li>
    <li>🎉 마을 잔치 +25 (120초 지속)</li>
    <li>🎪 축제 이벤트 +20</li>
    <li>🎭 유랑극단 이벤트 +10</li>
  </ul>
  <p><strong>페널티 요소:</strong></p>
  <ul>
    <li>인구/최대인구 > 80% → 과밀 페널티 -(초과비율 × 150)</li>
    <li>식량 0 → -20</li>
    <li>부정적 이벤트 활성 → -10</li>
  </ul>
  <p>범위: <strong>최소 0 ~ 최대 100</strong></p>
</div>

<h4>행복도 효과</h4>
<table>
  <tr><th>행복도</th><th>인구 성장 속도</th><th>생산 효율</th><th>상태</th></tr>
  <tr><td>70 이상</td><td>×1.3 (매우 빠름)</td><td>×1.05 (+5%)</td><td>😊 행복</td></tr>
  <tr><td>50 ~ 69</td><td>×1.0 (보통)</td><td>×1.0 (보통)</td><td>😐 보통</td></tr>
  <tr><td>30 ~ 49</td><td>×0.7 (느림)</td><td>×0.95 (-5%)</td><td>😟 불만</td></tr>
  <tr><td>30 미만</td><td><strong>×0.0 (성장 정지!)</strong></td><td>×0.9 (-10%)</td><td>😡 분노</td></tr>
</table>

<div class="manual-warning-box">
  ⚠️ 행복도가 30 미만이 되면 인구 성장이 <strong>완전히 정지</strong>됩니다!
</div>

<h4>💡 행복도 관리 방법</h4>
<div class="manual-tip-box">
  <ol>
    <li>⛪ 교회 3개 건설 → +30</li>
    <li>🏠 집을 충분히 지어 과밀 방지</li>
    <li>🌾 식량을 항상 0 이상 유지</li>
    <li>🎉 긴급 시 마을 잔치 (금화 80) 활용</li>
    <li>⛪ 대성당 건설 → +25 (후반부)</li>
  </ol>
</div>`;
        },

        // ─── 🔬 연구 ───
        research() {
            return `
<h3>🔬 연구 시스템</h3>

<h4>기본 규칙</h4>
<div class="manual-info-box">
  <ul>
    <li><strong>전제 조건:</strong> 학교 건물 1개 이상 필요!</li>
    <li><strong>동시 연구:</strong> 1개만 가능 (한 번에 하나만 연구)</li>
    <li>오프라인 중에도 연구가 진행됩니다</li>
  </ul>
</div>

<h4>연구 속도</h4>
<table>
  <tr><th>학교 수</th><th>연구 속도</th></tr>
  <tr><td>1개</td><td>×1.0 (기본)</td></tr>
  <tr><td>2개</td><td>×1.5 (50% 가속)</td></tr>
  <tr><td>3개</td><td>×2.0 (100% 가속, 2배속!)</td></tr>
</table>

<h4>연구 목록</h4>
<table>
  <tr><th>연구</th><th>비용</th><th>시간</th><th>선행 연구</th><th>효과</th></tr>
  <tr><td>🪓 목공술</td><td>🪵 100, 💰 20</td><td>2분</td><td>없음</td><td>벌목소 생산 +20%</td></tr>
  <tr><td>🪚 고급 목공</td><td>🪵 200, 🪨 100, 💰 50</td><td>4분</td><td>목공술</td><td><strong>제재소 해금</strong></td></tr>
  <tr><td>⛏️ 채굴술</td><td>🪨 100, 💰 20</td><td>2분</td><td>없음</td><td>채석장 생산 +20%</td></tr>
  <tr><td>🧱 석공술</td><td>🪨 200, 🪵 100, 💰 50</td><td>4분</td><td>채굴술</td><td><strong>석공소 해금</strong></td></tr>
  <tr><td>🌾 농업혁신</td><td>🌾 150, 💰 30</td><td>2분 30초</td><td>없음</td><td>농장 생산 +30%</td></tr>
  <tr><td>🍞 제빵 기술</td><td>🌾 300, 🪵 100, 💰 60</td><td>4분</td><td>농업혁신</td><td><strong>제빵소 해금</strong></td></tr>
  <tr><td>💰 경제학</td><td>💰 100</td><td>3분</td><td>없음</td><td>시장 보너스 +5%, 교역 개선</td></tr>
  <tr><td>🏦 금융학</td><td>💰 200</td><td>5분</td><td>경제학</td><td>보물창고 보너스 +10%</td></tr>
</table>

<h4>연구 의존 관계</h4>
<div class="manual-info-box">
  <p>🪓 목공술 → 🪚 고급 목공 → <strong>[제재소]</strong></p>
  <p>⛏️ 채굴술 → 🧱 석공술 → <strong>[석공소]</strong></p>
  <p>🌾 농업혁신 → 🍞 제빵 기술 → <strong>[제빵소]</strong></p>
  <p> &nbsp; &nbsp; &nbsp; └→ <strong>[대성당 해금 조건 중 하나]</strong></p>
  <p>💰 경제학 → 🏦 금융학</p>
</div>

<div class="manual-tip-box">
  <strong>💡 추천 연구 순서:</strong>
  <ol>
    <li>농업혁신 → 식량 +30%로 초반 안정화</li>
    <li>목공술, 고급 목공 → 제재소 해금</li>
    <li>제빵 기술 → 제빵소 해금 (인구 성장 가속)</li>
    <li>채굴술, 경제학 → 자원·교역 효율 향상</li>
    <li>석공술, 금융학 → 후반부 최적화</li>
  </ol>
</div>`;
        },

        // ─── 🏪 교역 ───
        trade() {
            return `
<h3>🏪 교역 시스템</h3>

<h4>기본 정보</h4>
<div class="manual-info-box">
  <ul>
    <li><strong>전제 조건:</strong> 시장 건물 1개 이상 필요!</li>
    <li>보유한 자원을 다른 자원으로 교환합니다</li>
    <li>교환 비율은 자원 등급과 보유량에 따라 실시간 변동!</li>
    <li>교환 단위: 10개씩</li>
  </ul>
</div>

<h4>자원 가치 순위</h4>
<div class="manual-info-box">
  <p>⚔️ 무기 > 🪑 가구 > ⚒️ 도구 > 🪓 목재 / 🍞 빵 > 🪵 원목 / 🪨 원석 / 🌾 식량</p>
  <p>높은 가치 자원을 교역하면 더 많은 저급 자원을 얻을 수 있습니다!</p>
</div>

<h4>대표 교환 비율 (기본값)</h4>
<table>
  <tr><th>교환</th><th>비율</th><th>예시</th></tr>
  <tr><td>금화 → 원목</td><td>1 : 20</td><td>금화 10개 → 원목 200개</td></tr>
  <tr><td>금화 → 원석</td><td>1 : 15</td><td>금화 10개 → 원석 150개</td></tr>
  <tr><td>금화 → 식량</td><td>1 : 25</td><td>금화 10개 → 식량 250개</td></tr>
  <tr><td>무기 → 금화</td><td>1 : 1.2</td><td>무기 10개 → 금화 12개</td></tr>
  <tr><td>가구 → 금화</td><td>1 : 0.95</td><td>가구 10개 → 금화 9.5개</td></tr>
  <tr><td>원목 → 금화</td><td>1 : 0.05</td><td>원목 10개 → 금화 0.5개</td></tr>
</table>

<h4>동적 가격 변동</h4>
<div class="manual-info-box">
  <p><strong>희소성 비율:</strong> 받으려는 자원의 보유량 ÷ 내가 주는 자원의 보유량</p>
  <ul>
    <li>내가 주는 자원이 매우 많고, 받으려는 자원이 적으면 → 비율 불리</li>
    <li>내가 주는 자원이 적고, 받으려는 자원이 많으면 → 비율 유리</li>
    <li>변동 범위: 기본 비율의 <strong>50% ~ 150%</strong></li>
  </ul>
</div>

<div class="manual-tip-box">
  <strong>💡 교역 팁</strong>
  <ul>
    <li>연구「경제학」완료 시 교역 비율 +5% 개선</li>
    <li>🧳 떠돌이 상인 이벤트 중 교역하면 <strong>30% 할인!</strong></li>
    <li>3차 완제품(가구, 무기)을 교역하면 최고 효율!</li>
    <li>과잉 생산 자원 → 부족한 자원으로 전환하세요</li>
  </ul>
</div>`;
        },

        // ─── ⚔️ 용병 ───
        mercenary() {
            return `
<h3>⚔️ 용병 시스템</h3>

<h4>기본 정보</h4>
<div class="manual-info-box">
  <ul>
    <li><strong>전제 조건:</strong> 성벽 건물 1개 이상 필요!</li>
    <li>금화로만 고용 가능</li>
    <li>최대 방어 보너스: 90% (순찰병 + 성벽 보강 합산)</li>
  </ul>
</div>

<h4>용병 종류</h4>
<table>
  <tr><th>용병</th><th>비용</th><th>효과</th><th>지속</th><th>비고</th></tr>
  <tr><td>🛡️ 순찰병</td><td>💰 300</td><td>방어력 +30%</td><td>120초 (2분)</td><td>동시 1명만</td></tr>
  <tr><td>⚔️ 기사단</td><td>💰 1,200</td><td>도적 습격 자동 방어</td><td>3회 충전</td><td>충전 누적 가능</td></tr>
  <tr><td>🏰 성벽 보강</td><td>💰 800</td><td><strong>영구</strong> 방어력 +10%</td><td>영구</td><td>최대 +50% (5회)</td></tr>
</table>

<h4>도적 습격 방어 메카닉</h4>
<div class="manual-info-box">
  <p><strong>기본 피해:</strong> 보유 자원의 10~20% 약탈</p>
  <p><strong>방어 수단별 피해 감소:</strong></p>
  <table>
    <tr><th>수단</th><th>효과</th></tr>
    <tr><td>🏰 성벽</td><td>피해 50% 감소</td></tr>
    <tr><td>🛡️ 순찰병</td><td>추가 방어 30%</td></tr>
    <tr><td>🏰 성벽 보강</td><td>영구 방어 +10% (최대 +50%)</td></tr>
    <tr><td>💂 야경대</td><td>추가 방어 15% + 습격 확률 -30%</td></tr>
    <tr><td>⚔️ 기사단</td><td>1회 소모하여 <strong>피해 완전 방어!</strong></td></tr>
  </table>
</div>

<div class="manual-tip-box">
  <strong>💡 용병 전략</strong>
  <ul>
    <li><strong>초반:</strong> 순찰병 (300 금화)으로 즉시 방어력 확보</li>
    <li><strong>중반:</strong> 기사단 (1,200 금화)으로 완전 방어 3회 확보</li>
    <li><strong>후반:</strong> 성벽 보강 5회 (총 4,000 금화)로 영구 +50%!</li>
    <li><strong>도적기지:</strong> 용병 고용 파견 (300 금화) = 95% 성공률!</li>
  </ul>
</div>`;
        },

        // ─── 👑 조공 ───
        tribute() {
            return `
<h3>👑 조공 시스템</h3>

<h4>기본 정보</h4>
<div class="manual-info-box">
  <ul>
    <li><strong>전제 조건:</strong> 영주관 건물 1개 이상 필요!</li>
    <li>왕실에 금화를 바쳐 다양한 보상을 받습니다</li>
    <li>일회성 조공은 한 번만 수행할 수 있습니다</li>
  </ul>
</div>

<h4>조공 종류</h4>
<table>
  <tr><th>조공</th><th>비용</th><th>쿨다운</th><th>반복</th><th>효과</th></tr>
  <tr><td>📦 소 헌상</td><td>💰 500</td><td>2분</td><td>✅</td><td>랜덤 자원(금화 제외) 50~100개 즉시</td></tr>
  <tr><td>🎁 대 헌상</td><td>💰 2,000</td><td>5분</td><td>✅</td><td><strong>영구</strong> 전체 생산 +5%</td></tr>
  <tr><td>👑 왕실 인가</td><td>💰 5,000</td><td>—</td><td>❌</td><td><strong>왕립 조폐소 건설 해금!</strong></td></tr>
  <tr><td>🏅 작위 수여</td><td>💰 10,000</td><td>—</td><td>❌</td><td>최대 인구 +20 + <strong>영구</strong> 전체 생산 +10%</td></tr>
</table>

<div class="manual-tip-box">
  <strong>💡 조공 전략</strong>
  <ol>
    <li><strong>대 헌상</strong> (2,000) × 여러 회: 영구 +5%씩 누적!</li>
    <li><strong>왕실 인가</strong> (5,000): 조폐소로 금화 대량 생산</li>
    <li><strong>작위 수여</strong> (10,000): 후반 인구 확장 + 영구 +10%</li>
  </ol>
  <p>소 헌상은 특정 자원이 급할 때만. 랜덤이라 비효율적!</p>
</div>`;
        },

        // ─── 🏆 업적 ───
        achievements() {
            return `
<h3>🏆 업적 시스템</h3>

<h4>기본 정보</h4>
<div class="manual-info-box">
  <ul>
    <li>특정 조건 달성 시 자동 해금, 보상 즉시 지급</li>
    <li>업적 판정: 5초마다 자동 체크</li>
    <li>총 <strong>33개</strong>의 업적</li>
  </ul>
</div>

<h4>🏗️ 건설 업적</h4>
<table>
  <tr><th>업적</th><th>조건</th><th>보상</th></tr>
  <tr><td>🏠 첫 발걸음</td><td>건물 1개 건설</td><td>🪵 20</td></tr>
  <tr><td>🏗️ 마을의 시작</td><td>건물 5개 건설</td><td>🪵 50</td></tr>
  <tr><td>🏙️ 번영의 도시</td><td>건물 20개 건설</td><td>🪨 150</td></tr>
  <tr><td>🏰 요새화</td><td>성벽 1개 건설</td><td>방어력 +5</td></tr>
  <tr><td>🪓 가공의 시작</td><td>2차 가공품 생산 시작</td><td>목재 10</td></tr>
  <tr><td>🪑 장인의 길</td><td>3차 완제품 생산 시작</td><td>가구 3</td></tr>
  <tr><td>⚙️ 완벽한 공급망</td><td>주요 생산건물 각 1개 이상</td><td>도구 20</td></tr>
  <tr><td>👑 건축왕</td><td>모든 종류 건물 보유</td><td>💰 300</td></tr>
  <tr><td>⬆️ 첫 강화</td><td>건물 ★1 달성</td><td>💰 100</td></tr>
  <tr><td>🌟 풀 강화</td><td>건물 ★5 달성</td><td>💰 500</td></tr>
</table>

<h4>💰 경제 업적</h4>
<table>
  <tr><th>업적</th><th>조건</th><th>보상</th></tr>
  <tr><td>💰 부자 마을</td><td>금화 500 이상 보유</td><td>💰 50</td></tr>
  <tr><td>💎 부호</td><td>금화 5,000 이상 보유</td><td>💰 250</td></tr>
  <tr><td>🏦 재벌</td><td>누적 금화 50,000 이상</td><td>💰 1,000</td></tr>
  <tr><td>🚢 교역왕</td><td>교역 50회</td><td>💰 300</td></tr>
  <tr><td>💰 용병 사령관</td><td>용병으로 도적기지 성공</td><td>💰 50</td></tr>
</table>

<h4>🛡️ 생존 업적</h4>
<table>
  <tr><th>업적</th><th>조건</th><th>보상</th></tr>
  <tr><td>🛡️ 첫 방어</td><td>습격 방어 1회</td><td>🪵 80, 🪨 80</td></tr>
  <tr><td>⚔️ 전쟁 영웅</td><td>습격 방어 5회</td><td>방어력 +10</td></tr>
  <tr><td>🏰 철벽 방어</td><td>습격 방어 10회</td><td>💰 500</td></tr>
  <tr><td>🏹 도적기지 정복자</td><td>도적기지 침공 성공</td><td>💰 200, ⚔️ 5</td></tr>
  <tr><td>🗡️ 도적 소탕</td><td>도적기지 침공 성공</td><td>💰 100, ⚔️ 5</td></tr>
  <tr><td>☠️ 역병 극복</td><td>역병 3회 생존</td><td>🌾 300</td></tr>
  <tr><td>❄️ 혹한의 겨울</td><td>겨울 10회 생존</td><td>🌾 400</td></tr>
</table>

<h4>👥 인구 업적</h4>
<table>
  <tr><th>업적</th><th>조건</th><th>보상</th></tr>
  <tr><td>👥 성장하는 마을</td><td>인구 20명</td><td>🌾 100</td></tr>
  <tr><td>🏘️ 작은 마을</td><td>최대 인구 30명</td><td>💰 120</td></tr>
  <tr><td>🏙️ 도시화</td><td>최대 인구 50명</td><td>💰 250</td></tr>
  <tr><td>🌆 대도시</td><td>최대 인구 100명</td><td>💰 800</td></tr>
</table>

<h4>⭐ 특수 업적</h4>
<table>
  <tr><th>업적</th><th>조건</th><th>보상</th></tr>
  <tr><td>🕐 영원한 영주</td><td>플레이 1시간</td><td>전체 생산 +5%</td></tr>
  <tr><td>⌛ 장기 집권</td><td>플레이 1시간</td><td>💰 200</td></tr>
  <tr><td>📚 학문의 시작</td><td>연구 1개 완료</td><td>💰 30</td></tr>
  <tr><td>🌈 사계절</td><td>4계절 모두 경험</td><td>🌾 200, 🪵 100</td></tr>
  <tr><td>📖 학자</td><td>모든 연구 완료</td><td>💰 600</td></tr>
  <tr><td>🏆 완벽주의자</td><td>모든 업적 달성</td><td>💰 2,000</td></tr>
</table>`;
        },

        // ─── 💰 금화 사용 ───
        goldsink() {
            return `
<h3>💰 금화 사용처</h3>

<h4>개요</h4>
<div class="manual-info-box">
  금화를 소비하여 마을에 다양한 즉시 효과를 줄 수 있습니다.
</div>

<h4>기능 목록</h4>
<table>
  <tr><th>기능</th><th>비용</th><th>효과</th><th>지속시간</th><th>재사용 대기</th></tr>
  <tr><td>🎉 마을 잔치</td><td>💰 80</td><td>행복도 +25</td><td>120초 (2분)</td><td>300초 (5분)</td></tr>
  <tr><td>🚑 긴급 보급</td><td>💰 50</td><td>식량 +150 즉시</td><td>즉시</td><td>180초 (3분)</td></tr>
  <tr><td>💂 야경대</td><td>💰 5/초</td><td>방어력 +15%<br>습격 확률 -30%</td><td>수동 해제까지</td><td>—</td></tr>
</table>

<h4>기능 상세</h4>

<h4>🎉 마을 잔치</h4>
<div class="manual-info-box">
  금화 80을 소비하여 행복도를 +25 올립니다.<br>
  120초(2분) 동안 지속되며, 5분 후 다시 사용 가능합니다.<br>
  <strong>행복도가 위험할 때 긴급 사용하세요!</strong>
</div>

<h4>🚑 긴급 보급</h4>
<div class="manual-info-box">
  금화 50을 소비하여 식량 150을 즉시 획득합니다.<br>
  식량이 바닥나서 인구가 줄기 시작할 때 응급 조치로 활용!<br>
  3분마다 사용 가능합니다.
</div>

<h4>💂 야경대</h4>
<div class="manual-warning-box">
  매초 금화 5를 지속적으로 소비합니다!<br>
  활성화 중:
  <ul>
    <li>도적 습격 시 추가 방어력 +15%</li>
    <li>도적 습격 발생 확률 30% 감소</li>
    <li>도적기지 침공 시 방어 점수 +15</li>
  </ul>
  <strong>금화가 부족하면 자동으로 해제됩니다!</strong>
</div>`;
        },

        // ─── 💡 팁 ───
        tips() {
            return `
<h3>💡 전략 가이드 & 팁</h3>

<h4>🏁 초반 전략 (0~5분)</h4>
<div class="manual-info-box">
  <ol>
    <li>벌목소 2개 건설 → 원목 확보</li>
    <li>농장 1~2개 건설 → <strong>식량 확보 최우선!</strong></li>
    <li>채석장 1개 건설 → 원석 확보</li>
    <li>집 1~2개 건설 → 최대 인구 증가</li>
    <li>학교가 가능해지면 연구「농업혁신」시작</li>
  </ol>
</div>

<h4>⚔️ 중반 전략 (5~15분)</h4>
<div class="manual-info-box">
  <ol>
    <li>교회 건설 → 학교 해금 → 연구 시작</li>
    <li>대장간 건설 (도구 생산 필수!)</li>
    <li>제재소, 제빵소 해금 (연구 완료 후)</li>
    <li>성벽 건설 → 도적 방어 + 용병 해금</li>
    <li>시장 건설 → 교역 해금</li>
  </ol>
</div>

<h4>👑 후반 전략 (15분~)</h4>
<div class="manual-info-box">
  <ol>
    <li>영주관 건설 → 조공 → 왕립 조폐소 해금</li>
    <li>가구공방/무기공방 → 교역으로 부 축적</li>
    <li>건물 강화로 생산 극대화</li>
    <li>도적기지 침공 → 도적 영구 제거</li>
    <li>대성당 건설 → 역병 면역</li>
  </ol>
</div>

<h4>🌾 식량 관리 팁</h4>
<div class="manual-tip-box">
  <ul>
    <li>식량이 0이 되면 30초마다 인구가 줄어듭니다!</li>
    <li>겨울 전에 반드시 식량을 비축하세요 (겨울 식량 생산 -40%)</li>
    <li>빵을 충분히 보유하면 인구 성장 ×1.5 보너스!</li>
    <li>긴급 시「긴급 보급」(금화 50) 활용</li>
  </ul>
</div>

<h4>👥 인구 관리 팁</h4>
<div class="manual-tip-box">
  <ul>
    <li>집을 미리 지어서 최대 인구 여유를 확보</li>
    <li>인구/최대인구 > 80%이면 과밀 페널티로 행복도 감소</li>
    <li>행복도 70 이상 유지 → 인구 성장 ×1.3!</li>
    <li>행복도 30 미만 → 인구 성장 완전 정지! 주의!</li>
  </ul>
</div>

<h4>🛡️ 방어 전략 팁</h4>
<div class="manual-tip-box">
  <ul>
    <li>성벽은 반드시 건설 (도적 피해 50% 감소)</li>
    <li>기사단(1,200 금화)은 가성비 최고의 방어 수단</li>
    <li>성벽 보강 5회 → 영구 방어 +50%!</li>
    <li>야경대는 습격 확률 자체를 30% 줄여줌</li>
  </ul>
</div>

<h4>💰 금화 벌이 팁</h4>
<div class="manual-tip-box">
  <ul>
    <li><strong>초반:</strong> 주점 (금화 +2/초)</li>
    <li><strong>중반:</strong> 대장간 (+0.3/초) + 보물창고 (+20%)</li>
    <li><strong>후반:</strong> 영주관 (+5/초) + 왕립 조폐소 (+10/초)</li>
    <li><strong>교역:</strong> 3차 완제품(가구, 무기)을 금화로 교환!</li>
  </ul>
</div>

<h4>🔬 연구 팁</h4>
<div class="manual-tip-box">
  <ul>
    <li>학교 3개 건설 → 연구 속도 2배!</li>
    <li>연구 비용을 미리 확보해두면 연속 연구 가능</li>
    <li>오프라인 중에도 연구가 진행됩니다</li>
  </ul>
</div>

<h4>🏪 교역 팁</h4>
<div class="manual-tip-box">
  <ul>
    <li>떠돌이 상인 이벤트 중 교역하면 30% 할인!</li>
    <li>과잉 생산 자원을 교역으로 부족한 자원으로 전환</li>
    <li>3차 완제품의 교역 가치가 가장 높습니다</li>
  </ul>
</div>

<h4>🏹 도적기지 침공 팁</h4>
<div class="manual-tip-box">
  <ul>
    <li>발동 조건: 습격 3회 + 성벽 + 15분 이상 플레이</li>
    <li>용병 고용 파견(300 금화): 95% 성공률로 가장 안전!</li>
    <li>성공 시 도적 습격이 영구적으로 사라집니다!</li>
  </ul>
</div>

<h4>📊 리더보드 점수 계산</h4>
<div class="manual-info-box">
  <table>
    <tr><th>항목</th><th>점수</th></tr>
    <tr><td>최대 인구</td><td>× 100</td></tr>
    <tr><td>총 건물 수</td><td>× 50</td></tr>
    <tr><td>보유 금화</td><td>÷ 10</td></tr>
    <tr><td>달성 업적 수</td><td>× 500</td></tr>
    <tr><td>플레이 시간 (초)</td><td>× 1</td></tr>
    <tr><td>완료 연구 수</td><td>× 200</td></tr>
  </table>
  <p>💡 인구와 업적이 가장 높은 가중치를 가집니다!</p>
</div>`;
        }
    }
};
