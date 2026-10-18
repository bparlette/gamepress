// gplevels: multi-level progression, save persistence, camera scrolling,
// level-select maps, and pause/settings menus for full production builds.
// Extends the 1-screen vertical slice demo into a full multi-level game.

export function createCamera({ w = 540, h = 960, worldW = 540, worldH = 960, deadzone = 40, damping = 8 } = {}) {
  const cam = {
    x: worldW / 2,
    y: worldH / 2,
    w,
    h,
    worldW,
    worldH,
    deadzone,
    damping,
    shakeX: 0,
    shakeY: 0,
    follow(tx, ty, dt = 1 / 60) {
      const dx = tx - cam.x;
      const dy = ty - cam.y;
      if (Math.abs(dx) > cam.deadzone) {
        cam.x += (tx - Math.sign(dx) * cam.deadzone - cam.x) * Math.min(1, dt * cam.damping);
      }
      if (Math.abs(dy) > cam.deadzone) {
        cam.y += (ty - Math.sign(dy) * cam.deadzone - cam.y) * Math.min(1, dt * cam.damping);
      }
      // clamp to world bounds
      const minX = cam.w / 2;
      const maxX = Math.max(minX, cam.worldW - cam.w / 2);
      const minY = cam.h / 2;
      const maxY = Math.max(minY, cam.worldH - cam.h / 2);
      cam.x = Math.max(minX, Math.min(maxX, cam.x));
      cam.y = Math.max(minY, Math.min(maxY, cam.y));
    },
    shake(amount) {
      const a = Math.random() * Math.PI * 2;
      cam.shakeX = Math.cos(a) * amount;
      cam.shakeY = Math.sin(a) * amount;
    },
    apply(ctx) {
      ctx.save();
      const sx = cam.w / 2 - cam.x + cam.shakeX;
      const sy = cam.h / 2 - cam.y + cam.shakeY;
      ctx.translate(Math.round(sx), Math.round(sy));
      cam.shakeX *= 0.85;
      cam.shakeY *= 0.85;
    },
    restore(ctx) {
      ctx.restore();
    },
    toWorld(screenX, screenY) {
      return {
        x: screenX - (cam.w / 2 - cam.x),
        y: screenY - (cam.h / 2 - cam.y)
      };
    },
    toScreen(worldX, worldY) {
      return {
        x: worldX + (cam.w / 2 - cam.x),
        y: worldY + (cam.h / 2 - cam.y)
      };
    }
  };
  return cam;
}

export function createLevelManager({
  id = 'game',
  levels = [],
  onStartLevel = null,
  onLevelWin = null,
  onLevelFail = null
} = {}) {
  const saveKey = 'gp-save-' + id;
  const loadSave = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(saveKey);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return { unlocked: 1, stars: {}, scores: {}, coins: 0, upgrades: {} };
  };

  const saveState = (data) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(saveKey, JSON.stringify(data));
      }
    } catch {}
  };

  const state = loadSave();
  // Ensure default levels array if empty
  const lvls = levels.length ? levels : [
    { id: 1, name: 'Level 1', world: 'World 1', bounds: { w: 540, h: 960 }, goal: 'Reach the end' }
  ];

  const mgr = {
    id,
    levels: lvls,
    currentIndex: 0,
    unlocked: Math.max(1, state.unlocked || 1),
    stars: state.stars || {},
    scores: state.scores || {},
    coins: state.coins || 0,
    upgrades: state.upgrades || {},
    mode: 'play', // 'play', 'win_modal', 'fail_modal', 'level_select', 'pause'
    bannerText: '',
    bannerTime: 0,
    modalTime: 0,
    result: null,

    getCurrentLevel() {
      return mgr.levels[mgr.currentIndex] || mgr.levels[0];
    },

    startLevel(index = mgr.currentIndex) {
      mgr.currentIndex = Math.max(0, Math.min(mgr.levels.length - 1, index));
      mgr.mode = 'play';
      mgr.result = null;
      mgr.modalTime = 0;
      const lvl = mgr.getCurrentLevel();
      mgr.bannerText = `${lvl.world || 'WORLD'} - ${lvl.name || 'LEVEL ' + (mgr.currentIndex + 1)}`;
      mgr.bannerTime = 1.6;
      onStartLevel?.(lvl, mgr.currentIndex);
    },

    nextLevel() {
      if (mgr.currentIndex + 1 < mgr.levels.length) {
        mgr.startLevel(mgr.currentIndex + 1);
      } else {
        // All levels completed: return to level select
        mgr.mode = 'level_select';
      }
    },

    restartLevel() {
      mgr.startLevel(mgr.currentIndex);
    },

    completeLevel({ score = 0, stars = 3, coins = 0 } = {}) {
      mgr.mode = 'win_modal';
      mgr.modalTime = 0;
      const lvlIndex = mgr.currentIndex;
      // Record stars & high score
      const prevStars = mgr.stars[lvlIndex] || 0;
      mgr.stars[lvlIndex] = Math.max(prevStars, Math.min(3, Math.max(1, stars)));
      const prevScore = mgr.scores[lvlIndex] || 0;
      mgr.scores[lvlIndex] = Math.max(prevScore, score);
      mgr.coins += coins;

      // Unlock next level
      if (lvlIndex + 2 > mgr.unlocked) {
        mgr.unlocked = Math.min(mgr.levels.length, lvlIndex + 2);
      }

      mgr.save();
      mgr.result = { win: true, levelIndex: lvlIndex, score, stars: mgr.stars[lvlIndex], coins };
      onLevelWin?.(mgr.result);
    },

    failLevel({ score = 0 } = {}) {
      mgr.mode = 'fail_modal';
      mgr.modalTime = 0;
      mgr.result = { win: false, levelIndex: mgr.currentIndex, score };
      onLevelFail?.(mgr.result);
    },

    save() {
      saveState({
        unlocked: mgr.unlocked,
        stars: mgr.stars,
        scores: mgr.scores,
        coins: mgr.coins,
        upgrades: mgr.upgrades
      });
    },

    resetProgress() {
      mgr.unlocked = 1;
      mgr.stars = {};
      mgr.scores = {};
      mgr.coins = 0;
      mgr.upgrades = {};
      mgr.save();
    },

    update(dt) {
      if (mgr.bannerTime > 0) mgr.bannerTime -= dt;
      if (mgr.mode !== 'play') mgr.modalTime += dt;
    },

    /** Draw Level Start Banner */
    drawBanner(ctx, w = 540) {
      if (mgr.bannerTime <= 0) return;
      ctx.save();
      const alpha = Math.min(1, mgr.bannerTime * 2);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 160, w, 70);
      ctx.fillStyle = '#ffd34d';
      ctx.font = '900 32px Impact, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(mgr.bannerText, w / 2, 206);
      ctx.restore();
    },

    /** Draw Win Modal */
    drawWinModal(ctx, w = 540, h = 960, { onNext, onReplay, onSelect } = {}) {
      if (mgr.mode !== 'win_modal') return;
      ctx.save();
      ctx.fillStyle = 'rgba(10,24,14,0.85)';
      ctx.fillRect(0, 0, w, h);

      // Card
      const cardY = h * 0.22;
      ctx.fillStyle = '#1e3825';
      ctx.strokeStyle = '#7dff7d';
      ctx.lineWidth = 4;
      ctx.fillRect(40, cardY, w - 80, 480);
      ctx.strokeRect(40, cardY, w - 80, 480);

      // Title
      ctx.fillStyle = '#7dff7d';
      ctx.font = '900 48px Impact, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LEVEL COMPLETE!', w / 2, cardY + 70);

      // Stars
      const starsEarned = mgr.result?.stars || 1;
      const starStr = '★'.repeat(starsEarned) + '☆'.repeat(3 - starsEarned);
      ctx.fillStyle = '#ffd34d';
      ctx.font = '54px system-ui, sans-serif';
      ctx.fillText(starStr, w / 2, cardY + 150);

      // Score & coins
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 28px system-ui, sans-serif';
      ctx.fillText(`SCORE: ${Math.round(mgr.result?.score || 0).toLocaleString()}`, w / 2, cardY + 220);
      if (mgr.result?.coins) {
        ctx.fillStyle = '#ffd34d';
        ctx.fillText(`+${mgr.result.coins} COINS`, w / 2, cardY + 265);
      }

      // Buttons
      const nextBtnY = cardY + 320;
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(80, nextBtnY, w - 160, 56);
      ctx.fillStyle = '#000000';
      ctx.font = '900 26px Impact, system-ui, sans-serif';
      ctx.fillText('▶ NEXT LEVEL', w / 2, nextBtnY + 38);

      const replayBtnY = cardY + 395;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(80, replayBtnY, (w - 180) / 2, 48);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 20px Impact, system-ui, sans-serif';
      ctx.fillText('↺ REPLAY', 80 + (w - 180) / 4, replayBtnY + 32);

      const selectBtnX = 80 + (w - 180) / 2 + 20;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(selectBtnX, replayBtnY, (w - 180) / 2, 48);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('☰ MAP', selectBtnX + (w - 180) / 4, replayBtnY + 32);

      ctx.restore();
    },

    /** Draw Level Select Grid */
    drawLevelSelect(ctx, w = 540, h = 960) {
      if (mgr.mode !== 'level_select') return;
      ctx.save();
      ctx.fillStyle = 'rgba(15,23,42,0.96)';
      ctx.fillRect(0, 0, w, h);

      // Header
      ctx.fillStyle = '#38bdf8';
      ctx.font = '900 44px Impact, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SELECT LEVEL', w / 2, 90);

      // Total Stars
      let totalStars = 0;
      Object.values(mgr.stars).forEach(s => totalStars += s);
      ctx.fillStyle = '#ffd34d';
      ctx.font = '900 24px system-ui, sans-serif';
      ctx.fillText(`★ ${totalStars} / ${mgr.levels.length * 3} STARS`, w / 2, 130);

      // Grid
      const cols = 4;
      const size = 88;
      const gap = 20;
      const startX = (w - (cols * size + (cols - 1) * gap)) / 2;
      const startY = 170;

      for (let i = 0; i < mgr.levels.length; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = startX + col * (size + gap);
        const y = startY + row * (size + gap + 25);
        const unlocked = i < mgr.unlocked;
        const stars = mgr.stars[i] || 0;

        ctx.fillStyle = unlocked ? (i === mgr.currentIndex ? '#0284c7' : '#1e293b') : '#0f172a';
        ctx.strokeStyle = unlocked ? '#38bdf8' : '#334155';
        ctx.lineWidth = 3;
        ctx.fillRect(x, y, size, size);
        ctx.strokeRect(x, y, size, size);

        if (unlocked) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 32px Impact, system-ui, sans-serif';
          ctx.fillText(String(i + 1), x + size / 2, y + 54);

          // Stars under box
          const starsStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
          ctx.fillStyle = '#ffd34d';
          ctx.font = '16px system-ui, sans-serif';
          ctx.fillText(starsStr, x + size / 2, y + size + 18);
        } else {
          ctx.fillStyle = '#64748b';
          ctx.font = '28px system-ui, sans-serif';
          ctx.fillText('🔒', x + size / 2, y + 54);
        }
      }

      // Back / Play button at bottom
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(60, h - 110, w - 120, 56);
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 26px Impact, system-ui, sans-serif';
      ctx.fillText('PLAY CURRENT LEVEL', w / 2, h - 74);

      ctx.restore();
    },

    /** Handle Tap on Win Modal or Level Select */
    handlePointerTap(px, py, w = 540, h = 960) {
      if (mgr.mode === 'win_modal') {
        const cardY = h * 0.22;
        const nextBtnY = cardY + 320;
        if (py >= nextBtnY && py <= nextBtnY + 56 && px >= 80 && px <= w - 80) {
          mgr.nextLevel();
          return true;
        }
        const replayBtnY = cardY + 395;
        if (py >= replayBtnY && py <= replayBtnY + 48) {
          if (px >= 80 && px <= 80 + (w - 180) / 2) {
            mgr.restartLevel();
            return true;
          }
          const selectBtnX = 80 + (w - 180) / 2 + 20;
          if (px >= selectBtnX && px <= selectBtnX + (w - 180) / 2) {
            mgr.mode = 'level_select';
            return true;
          }
        }
      } else if (mgr.mode === 'level_select') {
        const cols = 4;
        const size = 88;
        const gap = 20;
        const startX = (w - (cols * size + (cols - 1) * gap)) / 2;
        const startY = 170;

        for (let i = 0; i < mgr.levels.length; i++) {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const x = startX + col * (size + gap);
          const y = startY + row * (size + gap + 25);
          if (px >= x && px <= x + size && py >= y && py <= y + size) {
            if (i < mgr.unlocked) {
              mgr.startLevel(i);
              return true;
            }
          }
        }

        // Bottom button
        if (py >= h - 110 && py <= h - 54 && px >= 60 && px <= w - 60) {
          mgr.startLevel(mgr.currentIndex);
          return true;
        }
      }
      return false;
    }
  };

  return mgr;
}
