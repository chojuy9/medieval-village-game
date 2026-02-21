(function () {
  'use strict';

  const DEFAULT_STORIES = {
    intro: [
      {
        speaker: '보좌관',
        text: '영주님, 이 작은 정착지에서 위대한 마을이 시작됩니다.',
        activeChar: 'right'
      },
      {
        speaker: '영주',
        text: '좋다. 주민들을 지키고 번영을 이끌어 보자.',
        activeChar: 'left'
      }
    ],
    first_house: [
      {
        speaker: '주민',
        text: '첫 집이 완성되었습니다! 이제 더 많은 주민을 맞이할 수 있습니다.',
        activeChar: 'right'
      }
    ],
    bandit_warning: [
      {
        speaker: '정찰병',
        text: '영주님, 도적들의 움직임이 심상치 않습니다.',
        activeChar: 'right'
      }
    ],
    siege_decision: [
      {
        speaker: '보좌관',
        text: '도적기지의 위치를 확인했습니다. 지금 결단을 내려야 합니다.',
        activeChar: 'right'
      }
    ],
    siege_success: [
      {
        speaker: '주민',
        text: '승리했습니다! 도적기지가 무너졌습니다!',
        activeChar: 'right'
      }
    ],
    siege_fail: [
      {
        speaker: '보좌관',
        text: '작전이 실패했습니다... 마을의 사기가 크게 떨어졌습니다.',
        activeChar: 'right'
      }
    ],
    royal_tribute: [
      {
        speaker: '전령',
        text: '왕실에서 조공을 요구합니다. 선택의 시간이 다가옵니다.',
        activeChar: 'right'
      }
    ]
  };

  function getElements() {
    return {
      overlay: document.getElementById('vn-overlay'),
      bg: document.getElementById('vn-bg'),
      left: document.getElementById('vn-left-char'),
      right: document.getElementById('vn-right-char'),
      speaker: document.getElementById('vn-speaker'),
      text: document.getElementById('vn-text')
    };
  }

  const VN = {
    stories: { ...DEFAULT_STORIES },
    _active: false,
    _storyId: null,
    _scenes: [],
    _sceneIndex: 0,
    _typing: false,
    _skipTyping: false,
    _onEnd: null,

    start(storyId, onEnd) {
      const scenes = this.stories[storyId];
      if (!Array.isArray(scenes) || scenes.length === 0) {
        return false;
      }

      this._active = true;
      this._storyId = storyId;
      this._scenes = scenes;
      this._sceneIndex = 0;
      this._typing = false;
      this._skipTyping = false;
      this._onEnd = typeof onEnd === 'function' ? onEnd : null;

      const els = getElements();
      if (els.overlay) {
        els.overlay.classList.remove('hidden');
        if (!els.overlay.__vnBound) {
          els.overlay.addEventListener('click', () => {
            if (this._typing) {
              this._skipTyping = true;
              return;
            }
            this.next();
          });
          els.overlay.__vnBound = true;
        }
      }

      document.dispatchEvent(new CustomEvent('vnStarted', {
        detail: { storyId }
      }));

      this.renderCurrentScene();
      return true;
    },

    async renderCurrentScene() {
      if (!this._active) {
        return;
      }

      const scene = this._scenes[this._sceneIndex];
      if (!scene) {
        this.end();
        return;
      }

      const els = getElements();
      if (els.bg && scene.background) {
        els.bg.style.backgroundImage = `url(${scene.background})`;
      }
      if (els.left && scene.leftChar) {
        els.left.src = scene.leftChar;
      }
      if (els.right && scene.rightChar) {
        els.right.src = scene.rightChar;
      }
      if (els.speaker) {
        els.speaker.textContent = scene.speaker || '';
      }

      this.setActiveChar(scene.activeChar || 'right');

      if (els.text) {
        await this.typeWriter(scene.text || '', els.text);
      }

      document.dispatchEvent(new CustomEvent('vnSceneChanged', {
        detail: {
          storyId: this._storyId,
          sceneIndex: this._sceneIndex,
          scene
        }
      }));
    },

    next() {
      if (!this._active) {
        return;
      }

      if (this._typing) {
        this._skipTyping = true;
        return;
      }

      this._sceneIndex += 1;
      if (this._sceneIndex >= this._scenes.length) {
        this.end();
        return;
      }

      this.renderCurrentScene();
    },

    end() {
      if (!this._active) {
        return;
      }

      this._active = false;
      const endedStoryId = this._storyId;
      this._storyId = null;
      this._scenes = [];
      this._sceneIndex = 0;
      this._typing = false;
      this._skipTyping = false;

      const els = getElements();
      if (els.overlay) {
        els.overlay.classList.add('hidden');
      }

      if (this._onEnd) {
        this._onEnd();
      }
      this._onEnd = null;

      document.dispatchEvent(new CustomEvent('vnEnded', {
        detail: { storyId: endedStoryId }
      }));
    },

    async typeWriter(text, el) {
      const speed = Math.max(1, Number((window.GAME_CONFIG || {}).VN_TYPEWRITER_INTERVAL) || 16);
      this._typing = true;
      this._skipTyping = false;
      el.textContent = '';

      for (let i = 0; i < text.length; i += 1) {
        if (this._skipTyping) {
          el.textContent = text;
          break;
        }
        el.textContent += text[i];
        await new Promise((resolve) => setTimeout(resolve, speed));
      }

      this._typing = false;
      this._skipTyping = false;
    },

    setActiveChar(side) {
      const els = getElements();
      if (!els.left || !els.right) {
        return;
      }

      if (side === 'left') {
        els.left.style.opacity = '1';
        els.right.style.opacity = '0.5';
      } else {
        els.left.style.opacity = '0.5';
        els.right.style.opacity = '1';
      }
    },

    checkTriggers(state) {
      if (!state || this._active) {
        return;
      }

      state.storyFlags = state.storyFlags || {};
      const nowGameTime = Number(state.stats && state.stats.gameTime) || 0;
      const introTrigger = Number((window.GAME_CONFIG || {}).VN_INTRO_TRIGGER_SECONDS) || 5;

      if (!state.storyFlags.introShown && nowGameTime >= introTrigger) {
        state.storyFlags.introShown = true;
        this.start('intro');
        return;
      }

      if (!state.storyFlags.firstHouseShown) {
        const houseBuilt = Array.isArray(state.buildings)
          && state.buildings.some((building) => building.type === 'house');
        if (houseBuilt) {
          state.storyFlags.firstHouseShown = true;
          this.start('first_house');
          return;
        }
      }

      if (!state.storyFlags.banditWarningShown && state.raids && (Number(state.raids.count) || 0) >= 1) {
        state.storyFlags.banditWarningShown = true;
        this.start('bandit_warning');
        return;
      }

      if (!state.storyFlags.royalTributeShown) {
        const royalTriggered = Boolean(state.tribute && state.tribute.lastTributeTime && state.tribute.lastTributeTime.royal);
        if (royalTriggered) {
          state.storyFlags.royalTributeShown = true;
          this.start('royal_tribute');
        }
      }
    }
  };

  window.VN = VN;
})();
