// gp2d: the 2D game shell every 2D recipe shares. Portrait 540x960 logical canvas, fixed 1/60 step (deterministic under `gamepress drive`),
// touch + keys + on-screen buttons, juice (hit-stop, slow-mo, shake, flash, popups, particles), title/pause/results/replay, best score,
// art styles, seeded RNG, an auto-pilot hook (?auto=1: bot plays, fails once on purpose, restarts, then wins) and window.__game for tests.
import { R, SEED, clamp } from './gpmath.js';
import { sfx, setMuted, comboPitch } from './gpaudio.js';
import { STY } from './gpsprites.js';
// ?hold=1 (hub): run a few frames so the game shows, then freeze until the hub posts {gp:'start'}.
if (typeof location !== 'undefined' && typeof window !== 'undefined' && new URLSearchParams(location.search).has('hold')) { const raf = window.requestAnimationFrame.bind(window); let q = [], go = false, n = 0; window.requestAnimationFrame = f => (go || n++ < 1) ? raf(f) : (q.push(f), 0);
  const hold = window.__gpHold = { onStart: null }; const start = () => { if (go) return; go = true; q.splice(0).forEach(raf); hold.onStart?.(); try { parent.postMessage({ gp: 'started' }, '*'); } catch {} };
  for (const t of ['pointerdown', 'touchstart', 'mousedown', 'keydown']) addEventListener(t, e => { if (!go) { if (e.cancelable) e.preventDefault(); e.stopImmediatePropagation(); start(); } }, { capture: true, passive: false });
  addEventListener('message', e => { if (e.data && e.data.gp === 'start') start(); }); }
export { sfx, comboPitch };
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
  const g = { ctx, W: w, H: h, k: 1, t: 0, dt: 1 / 60, style: STYLE, auto: AUTO, clean: CLEAN, seed: SEED, mode: CLEAN || PACK ? 'play' : 'title', attempt: 0, score: 0, state: {}, hud: { l: '', r: '', hint: '' }, keys: {}, pressed: {}, taps: [], ptr: { x: w / 2, y: h / 2, down: false }, sim: {}, pointers: new Map(), fxl: [], pops: [], btns: [], shakeA: 0, freeze: 0, timeScale: 1, slowT: 0, flashA: 0, flashC: '#fff', bannerT: 0, banner: '', overT: 0, result: null, best: 0 };
  g.dumb = () => AUTO && g.attempt === 0 && P.get('failfirst') !== '0';   // bots play badly on the first attempt so the video shows a lose state
  try { g.best = +localStorage.getItem('gp-best-' + id) || 0; } catch {}
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
  g.start = () => { if (g.mode === 'title') { g.mode = 'play'; g.onStart?.(); } };
  g.reset = () => { g.attempt++; g.mode = 'play'; g.result = null; g.overT = 0; g.score = 0; g.fxl.length = 0; g.pops.length = 0; tw.length = 0; g.timeScale = 1; g.onReset?.(); g.showBanner('GO!', .7); };
  /** End the round. Always shows a big in-canvas banner (so videos show the stakes); the panel with best score appears unless ?clean/?auto. */
  g.end = ({ win = false, score = g.score, label = 'SCORE' } = {}) => { if (g.mode === 'over') return; stats.ends++; g.mode = 'over'; g.overT = 0; if (score > g.best) { g.best = score; try { localStorage.setItem('gp-best-' + id, score); } catch {} } g.result = { win, score, label, best: g.best }; if (PACK) try { parent.postMessage({ gp: 'end', id, win, score: Math.round(score) }, '*'); } catch {} (window.__ends = window.__ends || []).push({ t: +(performance.now() / 1000).toFixed(1), win, score: Math.round(score), attempt: g.attempt, state: JSON.stringify(g.state) }); sfx(win ? 'win' : 'lose'); g.shake(win ? 6 : 12); g.flash(win ? '#fff' : '#ff3b3b', .4); if (win) g.slowmo(.35, 1.0); };
  window.__result = null;
  Object.defineProperty(window, '__game', { get: () => ({ ...g.state, mode: g.mode, attempt: g.attempt, score: Math.round(g.score) }), configurable: true });
  const panel = () => { const r = g.result; ctx.fillStyle = r.win ? 'rgba(10,40,20,.55)' : 'rgba(40,8,8,.55)'; ctx.fillRect(0, h * .3, w, h * .34);
    g.text(r.win ? 'YOU WIN' : 'GAME OVER', w / 2, h * .42, { size: 96, align: 'center', color: r.win ? '#7dff7d' : '#ff6b6b' });
    if (!CLEAN) { g.text(`${r.label} ${Math.round(r.score).toLocaleString()}`, w / 2, h * .5, { size: 44, align: 'center', color: '#ffd34d' }); g.text(`BEST ${Math.round(r.best).toLocaleString()}`, w / 2, h * .55, { size: 28, align: 'center' }); if (g.overT > .8) g.text('tap to play again', w / 2, h * .61, { size: 28, align: 'center', stroke: 4 }); }
    else g.text(`${r.label} ${Math.round(r.score).toLocaleString()}`, w / 2, h * .5, { size: 44, align: 'center', color: '#ffd34d' }); };
  g.run = (update, draw) => {
    let last = 0, acc = 0;
    const frame = ts => {
      acc += Math.min(.1, (ts - last) / 1000 || .016); last = ts;
      while (acc >= 1 / 60) { acc -= 1 / 60; const dt0 = 1 / 60;
        if (g.mode !== 'pause') { for (let i = tw.length - 1; i >= 0; i--) { const q = tw[i]; q.t += dt0; const u = Math.min(1, q.t / q.d); q.o[q.k] = q.a + (q.to - q.a) * q.ez(u); if (u >= 1) { tw.splice(i, 1); q.then?.(); } }
          for (const p of g.fxl) { p.t += dt0; p.vy += p.g * dt0; p.x += p.vx * dt0; p.y += p.vy * dt0; } g.fxl = g.fxl.filter(p => p.t < p.life); for (const p of g.pops) p.t += dt0; g.pops = g.pops.filter(p => p.t < .9);
          g.shakeA = Math.max(0, g.shakeA - dt0 * 40); g.flashA *= .88; if (g.bannerT > 0) g.bannerT -= dt0; if (g.mode === 'over') { g.overT += dt0; if (AUTO && g.overT > 2.4 && !g.result?.win) g.reset(); } }
        if (g.mode === 'play' || (g.mode === 'title' && AUTO)) { if (g.freeze > 0) g.freeze -= dt0; else { if (g.slowT > 0 && (g.slowT -= dt0) <= 0) g.timeScale = 1; const dt = dt0 * g.timeScale; g.t += dt; g.btns.length = 0; update(dt); } }
        else if (g.mode === 'over') { g.btns.length = 0; update(0); }
        g.taps.length = 0; g.pressed = {}; g.simP = {}; }
      ctx.setTransform(g.k, 0, 0, g.k, 0, 0); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); ctx.save();
      if (g.shakeA > 0) ctx.translate((R() - .5) * g.shakeA, (R() - .5) * g.shakeA);
      draw(ctx);
      for (const p of g.fxl) { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.color; if (p.sq || STY.blocky) ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, 7); ctx.fill(); } } ctx.globalAlpha = 1;
      for (const p of g.pops) { ctx.globalAlpha = 1 - p.t / .9; g.text(p.text, p.x, p.y - p.t * 70, { size: p.size, color: p.color, align: 'center' }); } ctx.globalAlpha = 1; ctx.restore();
      if (g.flashA > .01) { ctx.globalAlpha = g.flashA; ctx.fillStyle = g.flashC; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
      if (g.hud.l) g.text(g.hud.l, 24, 56, { size: 40, color: '#ffd34d' }); if (g.hud.r) g.text(g.hud.r, w - 24, 56, { size: 40, align: 'right' });
      if (g.bannerT > 0) g.text(g.banner, w / 2, h * .36, { size: 84, align: 'center', color: '#ffd34d' });
      for (const b of g.btns) { ctx.globalAlpha = b.held ? .85 : .45; ctx.fillStyle = b.held ? '#fff' : 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.bw, b.bh, 22); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1; g.text(b.label, b.x + b.bw / 2, b.y + b.bh / 2 + 12, { size: Math.min(44, b.bh * .45), align: 'center', stroke: 4 }); }
      if (g.hud.hint && !CLEAN) g.text(g.hud.hint, w / 2, h - 24, { size: 26, align: 'center', stroke: 4 });
      if (g.mode === 'over' && g.result) panel();
      if (g.mode === 'title') { ctx.fillStyle = 'rgba(8,10,20,.72)'; ctx.fillRect(0, 0, w, h); g.text(title, w / 2, h * .42, { size: Math.min(110, 1100 / title.length), align: 'center', color: '#ffd34d' }); g.text(sub, w / 2, h * .5, { size: 30, align: 'center' }); if (hook) g.text(hook, w / 2, h * .56, { size: 24, align: 'center', color: '#bbb' }); }
      if (g.mode === 'pause') { ctx.fillStyle = 'rgba(8,10,20,.7)'; ctx.fillRect(0, 0, w, h); g.text('PAUSED', w / 2, h * .46, { size: 100, align: 'center' }); g.text('tap or press a key to resume · M mutes', w / 2, h * .52, { size: 26, align: 'center' }); }
      requestAnimationFrame(frame); };
    requestAnimationFrame(frame); };
  return g;
}
