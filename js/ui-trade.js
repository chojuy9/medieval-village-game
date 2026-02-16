(function () {
    'use strict';

    // UI 객체에 교역 관련 메서드 추가
    Object.assign(UI, {
        // 교역 패널 업데이트
        updateTradePanel() {
            try {
                const hasMarket = Game.state.buildings.some(b => b.type === 'market');
                const tradePanel = document.getElementById('trade-panel');

                if (hasMarket) {
                    tradePanel.classList.remove('hidden');
                    // 교역 컨트롤이 초기화되지 않은 경우 초기화 (불러오기 후 재초기화 포함)
                    if (!this._tradeControlsInitialized) {
                        this.initTradeControls();
                        this._tradeControlsInitialized = true;
                    }
                    this.updateTradeRate();
                } else {
                    tradePanel.classList.add('hidden');
                    this._tradeControlsInitialized = false;
                }
            } catch (error) {
                console.error('[UI.updateTradePanel] 교역 패널 업데이트 실패:', error);
            }
        },

        // 교역 비율 업데이트
        updateTradeRate() {
            try {
                const sellType = document.getElementById('trade-sell-type').value;
                const buyType = document.getElementById('trade-buy-type').value;
                const sellAmount = parseInt(document.getElementById('trade-sell-amount').value) || 0;

                if (window.Trade && typeof Trade.getRate === 'function') {
                    const rate = Trade.getRate(sellType, buyType);
                    const receive = Math.floor(sellAmount * rate);

                    document.getElementById('trade-rate').textContent = `교환 비율: 1 → ${rate.toFixed(2)}`;
                    document.getElementById('trade-preview').textContent = `획득: ${Utils.getResourceIcon(buyType)} ${receive}`;
                }
            } catch (error) {
                console.error('[UI.updateTradeRate] 교역 비율 업데이트 실패:', error);
            }
        },

        // 교역 실행
        executeTrade() {
            try {
                const sellType = document.getElementById('trade-sell-type').value;
                const buyType = document.getElementById('trade-buy-type').value;
                const sellAmount = parseInt(document.getElementById('trade-sell-amount').value) || 0;

                if (sellType === buyType) {
                    this.showMessage('같은 자원끼리는 교환할 수 없습니다.', 'error');
                    return;
                }

                if (sellAmount <= 0) {
                    this.showMessage('교환할 수량을 입력해주세요.', 'error');
                    return;
                }

                if (window.Trade && typeof Trade.execute === 'function') {
                    // Trade.execute(fromResource, fromAmount, toResource) → boolean
                    const rate = Trade.getRate(sellType, buyType);
                    const expectedReceive = Math.floor(sellAmount * rate);
                    const success = Trade.execute(sellType, sellAmount, buyType);
                    if (success) {
                        this.showMessage(`교환 완료! ${Utils.getResourceIcon(buyType)} ${expectedReceive} 획득`, 'success');
                    } else {
                        this.showMessage('교환 실패! 자원이 부족합니다.', 'error');
                    }
                }
            } catch (error) {
                console.error('[UI.executeTrade] 교역 실행 실패:', error);
            }
        },

        // 시장 건설 여부에 따른 교역 패널 토글
        checkMarketAvailability() {
            try {
                const hasMarket = Game.state.buildings.some(b => b.type === 'market');
                const tradePanel = document.getElementById('trade-panel');

                if (hasMarket && tradePanel.classList.contains('hidden')) {
                    tradePanel.classList.remove('hidden');
                    this.showMessage('시장 건설 완료! 교역이 가능합니다.', 'success');
                    if (!this._tradeControlsInitialized) {
                        this.initTradeControls();
                        this._tradeControlsInitialized = true;
                    }
                }
            } catch (error) {
                console.error('[UI.checkMarketAvailability] 시장 가용성 체크 실패:', error);
            }
        },

        // 교역 컨트롤 초기화
        initTradeControls() {
            try {
                // 동적 드롭다운 생성 (NEW)
                if (window.Trade && window.Resources) {
                    const tradeable = Trade.getTradeableResources ? Trade.getTradeableResources() :
                        ['wood', 'stone', 'food', 'gold', 'lumber', 'bread', 'tools', 'furniture', 'weapons'];

                    ['sell', 'buy'].forEach(action => {
                        const select = document.getElementById(`trade-${action}-type`);
                        select.innerHTML = '';
                        tradeable.forEach(type => {
                            const option = document.createElement('option');
                            option.value = type;
                            option.textContent = `${Resources.getIcon(type)} ${Resources.getName(type)}`;
                            select.appendChild(option);
                        });
                    });
                }

                // 퀵 버튼 이벤트
                document.querySelectorAll('.trade-quick-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const amount = btn.getAttribute('data-amount');
                        document.getElementById('trade-sell-amount').value = amount;
                        this.updateTradeRate();
                    });
                });

                // 교역 실행 버튼
                document.getElementById('trade-execute-btn').addEventListener('click', () => {
                    this.executeTrade();
                });

                // 셀렉트 변경 이벤트
                document.getElementById('trade-sell-type').addEventListener('change', () => this.updateTradeRate());
                document.getElementById('trade-buy-type').addEventListener('change', () => this.updateTradeRate());
                document.getElementById('trade-sell-amount').addEventListener('input', () => this.updateTradeRate());

                // 초기 sell/buy가 같으면 buy를 stone으로 기본 설정
                const sellEl = document.getElementById('trade-sell-type');
                const buyEl = document.getElementById('trade-buy-type');
                if (sellEl.value === buyEl.value) {
                    buyEl.value = 'stone';
                }

                this.updateTradeRate();
            } catch (error) {
                console.error('[UI.initTradeControls] 교역 컨트롤 초기화 실패:', error);
            }
        }
    });
})();
