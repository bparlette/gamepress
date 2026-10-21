// gp2d: the 2D game shell every 2D recipe shares. Portrait 540x960 logical canvas, fixed 1/60 step (deterministic under `gamepress drive`),
// touch + keys + on-screen buttons, juice (hit-stop, slow-mo, shake, flash, popups, particles), title/pause/results/replay, best score,
// art styles, seeded RNG, an auto-pilot hook (?auto=1: bot plays, fails once on purpose, restarts, then wins) and window.__game for tests.
import { R, SEED, clamp } from './gpmath.js';
import { sfx, setMuted, comboPitch, resumeAudio, playTone, playChord, startBgm, stopBgm } from './gpaudio.js';
import { castEnd } from './gpcast.js';
import { STY } from './gpsprites.js';
import { tweens, tween, punch, Easing } from './gptween.js';
// ?hold=1 (hub): run a few frames so the game shows, then freeze until the hub posts {gp:'start'}.
if (typeof location !== 'undefined' && typeof window !== 'undefined' && new URLSearchParams(location.search).has('hold')) { const hold = window.__gpHold = { onStart: null, go: false, n: 0 }; const start = () => { if (hold.go) return; hold.go = true; hold.onStart?.(); try { parent.postMessage({ gp: 'started' }, '*'); } catch {} };
  for (const t of ['pointerdown', 'touchstart', 'mousedown', 'keydown']) addEventListener(t, () => start(), { capture: true, passive: true });
  addEventListener('message', e => { if (e.data && e.data.gp === 'start') start(); }); }
export { sfx, comboPitch, resumeAudio, playTone, playChord, startBgm, stopBgm, tweens, tween, punch, Easing };
export * from './gpmath.js';
export const STYLES = ['toon', 'roblox', 'comic', 'painted', 'pixel16', 'pixel8'];

export function createGame({ id = 'game', title = 'GAME', sub = 'Tap to start', w = 540, h = 960, bg = '#1d2b4a', style = 'toon', hook = '' } = {}) {
  const P = new URLSearchParams(location.search), STYLE = STYLES.includes(P.get('style')) ? P.get('style') : (STYLES.includes(style) ? style : 'toon');
  const AUTO = P.has('auto'), CLEAN = AUTO || P.has('clean'), PACK = P.has('pack'), DPR = +(P.get('dpr') || 2);
  window.__style = STYLE; STY.ow = { comic: 5, painted: 1, pixel8: 0, pixel16: 0 }[STYLE] ?? 3; STY.blocky = ['roblox', 'pixel8', 'pixel16'].includes(STYLE);
  document.documentElement.style.cssText = 'margin:0;height:100%;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none';
  document.body.style.cssText = 'margin:0;overflow:hidden;background:#000;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;display:flex;align-items:center;justify-content:center;height:100vh;width:100vw';
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d'); document.body.appendChild(cv);
  const FILT = { comic: 'contrast(1.2) saturate(1.45)', painted: 'saturate(.95) contrast(1.05) sepia(.16) blur(.45px)', pixel8: 'url(#gpq8) saturate(1.3)', pixel16: 'saturate(1.2) contrast(1.05)', roblox: 'saturate(1.2)', toon: 'saturate(1.1)' }[STYLE];
  cv.style.cssText = `display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;filter:${FILT};${STYLE.startsWith('pixel') ? 'image-rendering:pixelated;' : ''}`;
  if (STYLE === 'pixel8') document.body.insertAdjacentHTML('beforeend', '<svg width="0" height="0" style="position:absolute"><filter id="gpq8"><feComponentTransfer><feFuncR type="discrete" tableValues="0 .33 .66 1"/><feFuncG type="discrete" tableValues="0 .33 .66 1"/><feFuncB type="discrete" tableValues="0 .5 1"/></feComponentTransfer></filter></svg>');
  if (STYLE === 'comic') { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;pointer-events:none;mix-blend-mode:multiply;background-image:radial-gradient(rgba(0,0,0,.3) 1px,transparent 1.6px);background-size:6px 6px'; document.body.appendChild(d); }
  const stats = (window.__gpStats = window.__gpStats || { shell: true, hitstops: 0, shakes: 0, popups: 0, flashes: 0, particles: 0, audioEvents: 0, cameraMoved: true, customGeo: true, walkAnimated: true, ends: 0 });
  /* g.keys reads three ways, because every author reaches for a different one:
     g.keys['Space']  ·  g.keys.has('Space')  ·  g.keys.size  (used by Set-minded code) */
  const __keys = {};
  Object.defineProperties(__keys, {
    has: { value: k => !!__keys[k] },
    add: { value: k => { __keys[k] = true; } },
    delete: { value: k => { __keys[k] = false; } },
    size: { get: () => Object.keys(__keys).filter(k => __keys[k]).length },
  });
  const g = { ctx, W: w, H: h, k: 1, t: 0, dt: 1 / 60, style: STYLE, auto: AUTO, clean: CLEAN, seed: SEED, mode: CLEAN || PACK ? 'play' : 'title', attempt: 0, score: 0, state: {}, hud: { l: '', r: '', hint: '' }, keys: __keys, pressed: {}, taps: [], ptr: { x: w / 2, y: h / 2, down: false }, sim: {}, pointers: new Map(), fxl: [], pops: [], btns: [], shakeA: 0, freeze: 0, timeScale: 1, slowT: 0, flashA: 0, flashC: '#fff', bannerT: 0, banner: '', overT: 0, result: null, best: 0 };
  g.dumb = () => AUTO && g.attempt === 0 && P.get('failfirst') !== '0';   // bots play badly on the first attempt so the video shows a lose state
  try { g.best = +localStorage.getItem('gp-best-' + id) || 0; } catch {}
  /* ---------- audio toggle (touch players have no keyboard: the M key alone is useless on a phone) ---------- */
  if (!CLEAN && !PACK) {
    const SPK = on => `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 9.5v5h3.2L12 18.5V5.5L7.2 9.5H4z" fill="currentColor" stroke="none"/>
      ${on ? '<path d="M15.5 8.6a4.8 4.8 0 0 1 0 6.8"/><path d="M18.3 6a8.3 8.3 0 0 1 0 12"/>'
           : '<path d="M16 9.4l4.6 5.2M20.6 9.4L16 14.6"/>'}</svg>`;
    const mb = document.createElement('button');
    mb.setAttribute('aria-label', 'toggle sound');
    mb.style.cssText = 'position:fixed;right:9px;bottom:9px;width:41px;height:41px;border-radius:50%;border:1px solid rgba(255,255,255,.20);' +
      'background:rgba(8,10,22,.52);color:#eaf2ff;z-index:6;display:grid;place-items:center;padding:0;cursor:pointer;' +
      'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transition:opacity .25s ease,transform .12s ease;-webkit-tap-highlight-color:transparent';
    let muted = false; try { muted = localStorage.getItem('gp-muted') === '1'; } catch {}
    g.muted = muted; try { setMuted(muted); } catch {}
    const paint = () => { mb.innerHTML = SPK(!muted); mb.style.opacity = muted ? '.55' : '.85'; };
    const flip = e => { e.preventDefault(); e.stopPropagation(); muted = !muted; g.muted = muted;
      try { setMuted(muted); } catch {} try { localStorage.setItem('gp-muted', muted ? '1' : '0'); } catch {}
      paint(); mb.style.transform = 'scale(.88)'; setTimeout(() => { mb.style.transform = ''; }, 120); };
    mb.addEventListener('pointerdown', flip); mb.addEventListener('touchstart', flip, { passive: false });
    mb.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
    document.body.appendChild(mb); paint();
    g.muteBtn = mb;
  }
  const resize = () => { const k = Math.min(innerWidth / w, innerHeight / h), px = STYLE === 'pixel8' ? .25 : STYLE === 'pixel16' ? .5 : Math.min(devicePixelRatio || 1, DPR) * k;
    cv.style.width = w * k + 'px'; cv.style.height = h * k + 'px'; cv.width = Math.round(w * px); cv.height = Math.round(h * px); g.k = cv.width / w; };
  addEventListener('resize', resize); resize();
  const toL = e => { const r = cv.getBoundingClientRect();
    const cx = e.clientX !== undefined ? e.clientX : (e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? (r.left + r.width / 2));
    const cy = e.clientY !== undefined ? e.clientY : (e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY ?? (r.top + r.height / 2));
    return { x: clamp((cx - r.left) / (r.width || 1) * w, 0, w), y: clamp((cy - r.top) / (r.height || 1) * h, 0, h) }; };
  let lastDownT = 0;
  const onDown = e => {
    const now = performance.now(); if (now - lastDownT < 35) return; lastDownT = now;
    if (e.cancelable) e.preventDefault();
    const p = toL(e), pid = e.pointerId ?? (e.changedTouches?.[0]?.identifier ?? 0);
    g.pointers.set(pid, { ...p, down: true }); Object.assign(g.ptr, p, { down: true }); g.taps.push(p);
    if (g.mode === 'title') g.start(); else if (g.mode === 'over' && g.overT > .8 && !AUTO && !PACK) g.reset();
  };
  const onMove = e => {
    if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
    const p = toL(e), pid = e.pointerId ?? (e.changedTouches?.[0]?.identifier ?? 0), q = g.pointers.get(pid);
    if (q) Object.assign(q, p); if (!g.pointers.size || q) Object.assign(g.ptr, p);
  };
  const onUp = e => {
    const pid = e.pointerId ?? (e.changedTouches?.[0]?.identifier ?? 0);
    g.pointers.delete(pid); g.ptr.down = g.pointers.size > 0;
  };
  [window, cv].forEach(target => {
    target.addEventListener('pointerdown', onDown);
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
    target.addEventListener('touchstart', onDown, { passive: false });
    target.addEventListener('touchmove', onMove, { passive: false });
    target.addEventListener('touchend', onUp, { passive: false });
    target.addEventListener('touchcancel', onUp, { passive: false });
  });
  addEventListener('keydown', e => { g.keys[e.code] = true; if (!e.repeat) g.pressed[e.code] = true; if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    if (e.code === 'KeyM') setMuted(g.muted = !g.muted); else if ((e.code === 'KeyP' || e.code === 'Escape') && g.mode === 'play') g.mode = 'pause'; else if (g.mode === 'pause') g.mode = 'play'; else if (g.mode === 'title') g.start(); else if (g.mode === 'over' && g.overT > .8 && !AUTO) g.reset(); });
  addEventListener('keyup', e => { g.keys[e.code] = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden && g.mode === 'play' && !AUTO) g.mode = 'pause'; });
  const tw = []; g.tween = (o, k, to, d = .3, ez = t => 1 - (1 - t) ** 3, then) => tw.push({ o, k, a: o[k], to, d, t: 0, ez, then });
  g.punch = (o, k, amount, d = .25) => punch(o, k, amount, d);
  g.bgm = opts => startBgm(opts); g.stopBgm = () => stopBgm();
  g.shake = a => { stats.shakes++; g.shakeA = Math.max(g.shakeA, a); }; g.hitstop = (s = .06) => { stats.hitstops++; g.freeze = Math.max(g.freeze, s); }; g.slowmo = (f = .3, s = 1) => { stats.hitstops++; g.timeScale = f; g.slowT = s; };
  g.flash = (c = '#fff', a = .5) => { stats.flashes++; g.flashC = c; g.flashA = a; }; g.showBanner = (t, s = 1.2) => { g.banner = t; g.bannerT = s; };
  g.popup = (text, x, y, color = '#ffd34d', size = 34) => { stats.popups++; g.pops.push({ text, x, y, color, size, t: 0 }); if (g.pops.length > 30) g.pops.shift(); };
  g.burst = (x, y, n = 10, o = {}) => { stats.particles += n; for (let i = 0; i < n; i++) { const a = R() * 6.283, s = (o.speed || 220) * (.4 + R() * .8); g.fxl.push({ x, y, vx: Math.cos(a) * s + (o.vx || 0), vy: Math.sin(a) * s + (o.vy || 0) - (o.up || 0), life: (o.life || .6) * (.6 + R() * .6), t: 0, size: (o.size || 6) * (.6 + R() * .8), color: Array.isArray(o.color) ? o.color[i % o.color.length] : (o.color || '#fff'), g: o.gravity ?? 600, sq: o.square }); } if (g.fxl.length > 500) g.fxl.splice(0, g.fxl.length - 500); };
  g.text = (s, x, y, o = {}) => { ctx.font = `900 ${o.size || 32}px Impact,"Arial Black",system-ui,sans-serif`; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic'; ctx.lineJoin = 'round'; if (o.stroke !== 0) { ctx.lineWidth = o.stroke || Math.max(4, (o.size || 32) / 6); ctx.strokeStyle = o.ink || '#000'; ctx.strokeText(s, x, y); } ctx.fillStyle = o.color || '#fff'; ctx.fillText(s, x, y); };
  g.bar = (x, y, bw, bh, v, color = '#7dff7d', back = 'rgba(0,0,0,.5)') => { ctx.fillStyle = back; ctx.fillRect(x, y, bw, bh); ctx.fillStyle = color; ctx.fillRect(x, y, bw * clamp(v, 0, 1), bh); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(x, y, bw, bh); };
  /** On-screen touch button. Call in update(); returns {held, pressed}. Bots can press it with g.sim[id] = true. */
  g.btn = (bid, x, y, bw, bh, label, o = {}) => { const inb = p => p.x >= x && p.x <= x + bw && p.y >= y && p.y <= y + bh; let held = !!g.sim[bid], pressed = !!g.simP?.[bid];
    for (const p of g.pointers.values()) if (inb(p)) held = true; for (const p of g.taps) if (inb(p)) pressed = true; if (g.keys[o.key] || g.pressed[o.key]) { held = held || g.keys[o.key]; pressed = pressed || g.pressed[o.key]; }
    g.btns.push({ x, y, bw, bh, label, held, color: o.color || '#ffffff', icon: o.icon }); return { held, pressed }; };
  g.sim = {}; g.simP = {};
  g.fever = 0;
  g.triggerFever = (dur = 4.5) => { g.fever = dur; sfx('fever'); g.punch(g, 'k', 1.05, 0.3); g.showBanner('🔥 FEVER MODE! 🔥', 1.2); };
  g.checkGraze = (player, hazard, radius = 36) => {
    if (!hazard || hazard._grazed) return false;
    const px = player.x ?? player.p?.x ?? 0, py = player.y ?? player.p?.y ?? 0;
    const hx = hazard.x ?? hazard.p?.x ?? 0, hy = hazard.y ?? hazard.p?.y ?? 0;
    const d = Math.hypot(px - hx, py - hy);
    if (d > 0 && d <= radius) {
      hazard._grazed = true;
      g.slowmo(0.35, 0.18);
      sfx('nearMiss');
      g.flash('rgba(255,215,0,0.35)', 0.15);
      g.popup('+25 CLOSE!', px, py - 30, '#ffd34d', 30);
      g.score += (g.fever > 0 ? 50 : 25);
      return true;
    }
    return false;
  };
  g.start = () => { if (g.mode === 'title') { g.mode = 'play'; g.onStart?.(); } };
  g.reset = () => { g.attempt++; g.mode = 'play'; g.result = null; g.overT = 0; g.score = 0; g.fever = 0; g.fxl.length = 0; g.pops.length = 0; tw.length = 0; g.timeScale = 1; g.onReset?.(); g.showBanner('GO!', .7); };
  /** End the round. Always shows a big in-canvas banner (so videos show the stakes); the panel with best score appears unless ?clean/?auto. */
  g.end = ({ win = false, score = g.score, label = 'SCORE', progress = null } = {}) => { if (g.mode === 'over') return; castEnd(win); stats.ends++; g.mode = 'over'; g.overT = 0; g.newBest = score > g.best && score > 0; if (score > g.best) { g.best = score; try { localStorage.setItem('gp-best-' + id, score); } catch {} } g.result = { win, score, label, best: g.best, progress }; if (PACK) try { parent.postMessage({ gp: 'end', id, win, score: Math.round(score) }, '*'); } catch {} (window.__ends = window.__ends || []).push({ t: +(performance.now() / 1000).toFixed(1), win, score: Math.round(score), attempt: g.attempt, state: JSON.stringify(g.state) }); sfx(win ? 'win' : 'lose'); g.shake(win ? 6 : 12); g.flash(win ? '#fff' : '#ff3b3b', .4); if (win) { g.slowmo(.35, 1.0);
    /* a win should *look* like a win: confetti rain in the game's own palette */
    if (!g.noConfetti) for (let i = 0; i < 46; i++) setTimeout(() => g.mode === 'over' && g.burst(20 + R() * (w - 40), -20 - R() * 80, 1,
      { speed: 60 + R() * 90, size: 7 + R() * 7, life: 1.5 + R() * 1.1, gravity: 340, square: true,
        color: ['#ffd34d', '#7dff7d', '#7df9ff', '#ff6bd6', '#ffffff'][i % 5], up: 60 }), i * 26);
  } };
  window.__result = null;
  Object.defineProperty(window, '__game', { get: () => ({ ...g.state, mode: g.mode, attempt: g.attempt, score: Math.round(g.score) }), configurable: true });
  const panel = () => {
    const r = g.result;
    const isClose = !r.win && ((r.progress && r.progress >= 0.7) || (r.best > 0 && r.score >= r.best * 0.7));
    const pct = r.progress ? Math.round(r.progress * 100) : (r.best > 0 ? Math.min(99, Math.round(r.score / r.best * 100)) : 0);
    const now = performance.now() / 1000;
    const kAn = Math.min(1, Math.max(0, (g.overT - .04) / .34)), ease = 1 - Math.pow(1 - kAn, 3);
    const accent = r.win ? '#7dff7d' : isClose ? '#ff9a3c' : '#ff6b6b';
    const cw = w * .86, cx = (w - cw) / 2, chh = h * .42, cyy = h * .225 + (1 - ease) * 30;
    ctx.save(); ctx.globalAlpha = ease;
    ctx.fillStyle = 'rgba(4,6,14,.70)'; ctx.fillRect(0, 0, w, h);
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
    ctx.fillStyle = 'rgba(14,16,30,.96)'; ctx.beginPath(); ctx.roundRect(cx, cyy, cw, chh, 26); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.globalAlpha = ease * .18; ctx.fillStyle = accent;
    ctx.beginPath(); ctx.roundRect(cx, cyy, cw, chh, 26); ctx.fill();
    ctx.globalAlpha = ease; ctx.strokeStyle = accent; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(cx, cyy, cw, chh, 26); ctx.stroke();
    ctx.fillStyle = accent; ctx.fillRect(cx + cw * .3, cyy - 2, cw * .4, 4);
    const head = r.win ? 'YOU WIN' : isClose ? 'SO CLOSE!' : 'GAME OVER';
    g.text(head, w / 2, cyy + chh * .245, { size: Math.min(80, cw / head.length * 1.55), align: 'center', color: accent });
    if (isClose) g.text(`${pct}% COMPLETED`, w / 2, cyy + chh * .35, { size: 30, align: 'center', color: '#ffd34d' });
    const scoreY = cyy + chh * (isClose ? .50 : .46);
    const roll = Math.min(1, Math.max(0, (g.overT - .12) / .5)), rEz = 1 - (1 - roll) ** 3;
    const shown = Math.round(r.score * rEz);
    const pop = 1 + .10 * Math.sin(Math.min(1, roll) * Math.PI);
    ctx.save(); ctx.translate(w / 2, scoreY); ctx.scale(pop, pop); ctx.translate(-w / 2, -scoreY);
    g.text(shown.toLocaleString(), w / 2, scoreY, { size: 62, align: 'center', color: '#fff' });
    ctx.restore();
    g.text(r.label, w / 2, scoreY + 30, { size: 21, align: 'center', color: 'rgba(255,255,255,.55)', stroke: 0 });
    if (r.win || isClose) g.bar(cx + cw * .2, cyy + chh * .70, cw * .6, 14, r.win ? 1 : pct / 100, accent, 'rgba(255,255,255,.10)');
    const bestY = cyy + chh * (r.win || isClose ? .82 : .74);
    if (g.newBest) {
      const bp = .5 + .5 * Math.sin(now * 7);
      ctx.globalAlpha = ease * (.55 + bp * .45);
      g.text('NEW BEST!', w / 2, bestY, { size: 26, align: 'center', color: '#ffd34d' });
      ctx.globalAlpha = ease;
    } else g.text(`BEST ${Math.round(r.best).toLocaleString()}`, w / 2, bestY, { size: 22, align: 'center', color: 'rgba(255,255,255,.45)', stroke: 0 });
    if (!CLEAN && g.overT > .75) {
      const p = .5 + .5 * Math.sin(now * 4.4);
      const bw2 = Math.min(cw * .74, 330), bh2 = 62, bx2 = w / 2 - bw2 / 2, by2 = cyy + chh + 26;
      ctx.globalAlpha = ease;
      ctx.fillStyle = accent; ctx.globalAlpha = ease * (.14 + p * .16);
      ctx.beginPath(); ctx.roundRect(bx2, by2, bw2, bh2, 16); ctx.fill();
      ctx.globalAlpha = ease * (.6 + p * .4);
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(bx2, by2, bw2, bh2, 16); ctx.stroke();
      ctx.globalAlpha = ease;
      g.text(isClose ? 'ONE MORE RUN' : 'PLAY AGAIN', w / 2, by2 + bh2 * .64, { size: 26, align: 'center', color: accent, stroke: 0 });
    }
    ctx.restore();
  };
  g.run = (update, draw) => {
    let last = 0, acc = 0;
    const frame = ts => {
      requestAnimationFrame(frame);            // scheduled first: one bad frame can never kill the loop
      acc += Math.min(.1, (ts - last) / 1000 || .016); last = ts;
      { const H = window.__gpHold; if (H && !H.go && ++H.n > 3) acc = 0; } // ?hold=1: draw the scene but freeze the simulation until the first touch
      while (acc >= 1 / 60) { acc -= 1 / 60; const dt0 = 1 / 60;
        if (g.mode !== 'pause') { tweens.step(dt0 * g.timeScale); for (let i = tw.length - 1; i >= 0; i--) { const q = tw[i]; q.t += dt0; const u = Math.min(1, q.t / q.d); q.o[q.k] = q.a + (q.to - q.a) * q.ez(u); if (u >= 1) { tw.splice(i, 1); q.then?.(); } }
          for (const p of g.fxl) { p.t += dt0; p.vy += p.g * dt0; p.x += p.vx * dt0; p.y += p.vy * dt0; } g.fxl = g.fxl.filter(p => p.t < p.life); for (const p of g.pops) p.t += dt0; g.pops = g.pops.filter(p => p.t < .9);
          g.shakeA = Math.max(0, g.shakeA - dt0 * 40); g.flashA *= .88; if (g.bannerT > 0) g.bannerT -= dt0; if (g.fever > 0) g.fever = Math.max(0, g.fever - dt0); if (g.mode === 'over') { g.overT += dt0; if (AUTO && g.overT > 2.4 && !g.result?.win) g.reset(); } }
        if (g.mode === 'play' || (g.mode === 'title' && AUTO)) { if (g.freeze > 0) g.freeze -= dt0; else { if (g.slowT > 0 && (g.slowT -= dt0) <= 0) g.timeScale = 1; const dt = dt0 * g.timeScale; g.t += dt; g.btns.length = 0; update(dt); } }
        else if (g.mode === 'over') { g.btns.length = 0; update(0); }
        g.taps.length = 0; g.pressed = {}; g.simP = {}; }
      ctx.setTransform(g.k, 0, 0, g.k, 0, 0); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); ctx.save();
      if (g.shakeA > 0) ctx.translate((R() - .5) * g.shakeA, (R() - .5) * g.shakeA);
      draw(ctx);
      for (const p of g.fxl) { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.color; if (p.sq || STY.blocky) ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, 7); ctx.fill(); } } ctx.globalAlpha = 1;
      for (const p of g.pops) { ctx.globalAlpha = 1 - p.t / .9; g.text(p.text, p.x, p.y - p.t * 70, { size: p.size, color: p.color, align: 'center' }); } ctx.globalAlpha = 1; ctx.restore();
      if (g.fever > 0) { ctx.save(); ctx.strokeStyle = `hsl(${(g.t * 360) % 360}, 100%, 60%)`; ctx.lineWidth = 10 + Math.sin(g.t * 12) * 4; ctx.strokeRect(0, 0, w, h); ctx.restore(); }
      if (g.flashA > .01) { ctx.globalAlpha = g.flashA; ctx.fillStyle = g.flashC; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
      /* HUD sitting on a soft glass chip so it stays legible over sky, fire and confetti alike */
      const hudChip = (txt, x, align, color) => {
        ctx.font = '900 40px Impact,"Arial Black",system-ui,sans-serif';
        const tw2 = ctx.measureText(txt).width, pad = 13, hh = 44, yy = 28;
        const bx = align === 'right' ? x - tw2 - pad : x - pad;
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
        ctx.fillStyle = 'rgba(6,8,16,.40)'; ctx.beginPath(); ctx.roundRect(bx, yy, tw2 + pad * 2, hh, 13); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(bx, yy, tw2 + pad * 2, hh, 13); ctx.stroke();
        g.text(txt, x, 56, { size: 40, align, color });
      };
      if (g.hud.l) hudChip(g.hud.l, 24, 'left', '#ffd34d');
      if (g.hud.r) hudChip(g.hud.r, w - 24, 'right', '#ffffff');
      if (g.bannerT > 0) g.text(g.banner, w / 2, h * .36, { size: 84, align: 'center', color: '#ffd34d' });
      for (const b of g.btns) { ctx.globalAlpha = b.held ? .85 : .45; ctx.fillStyle = b.held ? '#fff' : 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.bw, b.bh, 22); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1; g.text(b.label, b.x + b.bw / 2, b.y + b.bh / 2 + 12, { size: Math.min(44, b.bh * .45), align: 'center', stroke: 4 }); }
      if (g.hud.hint && !CLEAN) g.text(g.hud.hint, w / 2, h - 24, { size: 26, align: 'center', stroke: 4 });
      if (g.mode === 'over' && g.result) panel();
      if (g.mode === 'title') {
        /* staged reveal + a lit backdrop: the first 1.2s decide whether this looks like a $5 game */
        const now = performance.now() / 1000;
        const dT = Math.min(.05, Math.max(0, now - (g._ttPrev || now))); g._ttPrev = now;
        const T = (g.titleT = (g.titleT || 0) + dT);
        const p = .5 + .5 * Math.sin(now * 3.1);
        const st = (a, b) => Math.max(0, Math.min(1, (T - a) / (b - a)));
        const eOut = t => 1 - (1 - t) ** 3, eBack = t => { const c = 2.1; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
        let gr = ctx.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, 'rgba(7,9,20,.90)'); gr.addColorStop(.55, 'rgba(9,11,26,.82)'); gr.addColorStop(1, 'rgba(3,4,10,.94)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const yy = ((now * (16 + i * 11) + i * h / 2.6) % (h + 420)) - 210;
          const bg2 = ctx.createLinearGradient(0, yy - 190, 0, yy + 190);
          bg2.addColorStop(0, 'rgba(255,211,77,0)'); bg2.addColorStop(.5, `rgba(255,211,77,${.035 + i * .014})`); bg2.addColorStop(1, 'rgba(255,211,77,0)');
          ctx.fillStyle = bg2; ctx.fillRect(0, yy - 190, w, 380);
        }
        ctx.restore();
        const vg = ctx.createRadialGradient(w / 2, h * .44, w * .18, w / 2, h * .44, w * .98);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.58)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);

        const gy = h * .40, tIn = st(0, .40);
        ctx.save();
        ctx.globalAlpha = Math.min(1, tIn * 1.6);
        const sc = .84 + .16 * eBack(tIn);
        ctx.translate(w / 2, gy); ctx.scale(sc, sc); ctx.translate(-w / 2, -gy);
        ctx.shadowColor = 'rgba(255,168,40,.55)'; ctx.shadowBlur = 28 + p * 14;
        g.text(title, w / 2, gy, { size: Math.min(96, 1080 / title.length), align: 'center', color: '#ffd34d' });
        ctx.restore();

        const uw = Math.min(w * .62, 40 + title.length * 15) * eOut(st(.06, .46));
        if (uw > 1) {
          const ug = ctx.createLinearGradient(w / 2 - uw / 2, 0, w / 2 + uw / 2, 0);
          ug.addColorStop(0, 'rgba(255,211,77,0)'); ug.addColorStop(.5, 'rgba(255,211,77,.95)'); ug.addColorStop(1, 'rgba(255,211,77,0)');
          ctx.fillStyle = ug; ctx.fillRect(w / 2 - uw / 2, gy + 14, uw, 3);
        }
        const a2 = st(.16, .40), a3 = st(.26, .52), a4 = st(.34, .60), a5 = st(.46, .70);
        ctx.globalAlpha = a2; g.text(sub, w / 2, gy + 62 + (1 - eOut(a2)) * 10, { size: 28, align: 'center', stroke: 4 });
        if (hook) g.text(hook, w / 2, gy + 96 + (1 - eOut(a3)) * 10, { size: 21, align: 'center', color: 'rgba(255,255,255,.6)', stroke: 0 });
        ctx.globalAlpha = 1;

        const by2 = h * .64, bh2 = 74, bw3 = Math.min(w * .72, 340), bx3 = w / 2 - bw3 / 2;
        ctx.globalAlpha = a4 * (.16 + p * .2); ctx.fillStyle = '#ffd34d';
        ctx.beginPath(); ctx.roundRect(bx3, by2, bw3, bh2, 18); ctx.fill();
        ctx.globalAlpha = a4 * (.55 + p * .45); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.roundRect(bx3, by2, bw3, bh2, 18); ctx.stroke();
        ctx.globalAlpha = a4;
        g.text('TAP TO PLAY', w / 2, by2 + bh2 * .66, { size: 30, align: 'center', color: '#ffd34d', stroke: 0 });
        if (g.best > 0) { ctx.globalAlpha = a5; g.text(`BEST ${Math.round(g.best).toLocaleString()}`, w / 2, by2 + bh2 + 38, { size: 22, align: 'center', color: 'rgba(255,255,255,.5)', stroke: 0 }); }
        ctx.globalAlpha = 1;
      }
      if (g.mode === 'pause') { ctx.fillStyle = 'rgba(8,10,20,.7)'; ctx.fillRect(0, 0, w, h); g.text('PAUSED', w / 2, h * .46, { size: 100, align: 'center' }); g.text('tap or press a key to resume · M mutes', w / 2, h * .52, { size: 26, align: 'center' }); }
      };
    requestAnimationFrame(frame); };
  return g;
}
