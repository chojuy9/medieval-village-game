(function () {
  'use strict';

  // ============================================
  // 사운드 매니저 (Web Audio API 기반)
  // ============================================
  const SoundManager = {
    sounds: {},
    enabled: true,
    volume: 0.5,
    ctx: null,

    init() {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        console.log('[SoundManager] Web Audio API 초기화 완료');
      } catch (e) {
        console.warn('[SoundManager] Web Audio API 미지원:', e);
      }
    },

    play(type) {
      if (!this.enabled || !this.ctx) return;
      try {
        switch (type) {
          case 'build':
            this._playTone(440, 0.1, 'square');
            break;
          case 'demolish':
            this._playTone(220, 0.2, 'sawtooth');
            break;
          case 'trade':
            this._playTone(523, 0.1, 'sine');
            break;
          case 'achievement':
            this._playFanfare();
            break;
          case 'click':
            this._playTone(880, 0.05, 'sine');
            break;
          case 'error':
            this._playTone(200, 0.15, 'square');
            break;
          case 'season':
            this._playTone(660, 0.2, 'triangle');
            break;
          case 'event':
            this._playTone(330, 0.15, 'sawtooth');
            break;
          case 'research':
            this._playTone(587, 0.15, 'sine');
            break;
        }
      } catch (e) {
        console.warn('[SoundManager] 사운드 재생 실패:', e);
      }
    },

    _playTone(freq, duration, type) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    },

    _playFanfare() {
      [523, 659, 784].forEach((freq, i) => {
        setTimeout(() => this._playTone(freq, 0.2, 'sine'), i * 150);
      });
    },

    toggle() {
      this.enabled = !this.enabled;
      return this.enabled;
    },

    setVolume(v) {
      this.volume = Math.max(0, Math.min(1, v));
    }
  };

  // 전역 노출
  window.SoundManager = SoundManager;
})();
