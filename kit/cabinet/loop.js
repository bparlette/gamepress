/* ---------- shell: title / play / over flow, loop, test hooks ---------- */
let mode = 'title', overT = 0, result = null, hi = 0, blink = 0, botOn = false, tms = 0;
const HIK = 'nes6-hi-' + GAME.id;
try { hi = parseInt(localStorage.getItem(HIK) || '0', 10) || 0; } catch (_) {}
function endGame(score, msg) {
  if (mode !== 'play') return;
  mode = 'over'; overT = 0;
  const isBest = score > hi;
  if (isBest) { hi = score; try { localStorage.setItem(HIK, String(hi)); } catch (_) {} }
  result = { score, msg, isBest };
  sfx(msg && /CLEAR|WIN|KO!|FINISH/.test(msg) ? 'win' : 'over');
}
GAME.init(true);
function begin() { tms = 0; blink = 0; GAME.init(false); mode = 'play'; result = null; }
function step(dt) {
  blink += dt; tms += dt;
  const raw = readInput();
  if (mode === 'title') {
    if (raw.start) { begin(); sfx('beep'); }
    else GAME.update(dt, GAME.bot ? GAME.bot() : BLANK, 'title');
  } else if (mode === 'play') {
    GAME.update(dt, botOn && GAME.bot ? GAME.bot() : raw, 'play');
  } else {
    overT += dt;
    if (raw.start && overT > 1.5) { begin(); sfx('beep'); }
  }
}
function render() {
  if (window.HD_MODE && GAME.renderHD) { ctx.setTransform(3, 0, 0, 3, 0, 0); ctx.imageSmoothingEnabled = true; GAME.renderHD(ctx, mode); }
  else { GAME.render(mode);
  for (let i = 0; i < buf.length; i++) px32[i] = PAL32[buf[i]];
  ctx.putImageData(img, 0, 0); }
  GAME.hud(mode);
  const WH = HEX[W], YE = HEX[Y];
  if (mode === 'title') {
    panel(16, 12, 224, 96);
    const s1 = GAME.t1.length <= 6 ? 32 : 24;
    txt(GAME.t1, 128, s1 === 32 ? 22 : 28, YE, s1, 'center');
    txt(GAME.t2, 128, 62, WH, GAME.t2.length > 8 ? 16 : 24, 'center');
    txt(GAME.sub, 128, 90, HEX[CY], 8, 'center');
    if (Math.floor(blink * 2) & 1) txt('PRESS START', 128, 120, WH, 8, 'center');
    txt('HI ' + pad5(hi), 128, 134, YE, 8, 'center');
  } else if (mode === 'over' && result) {
    panel(32, 52, 192, 100);
    txt(result.msg || 'GAME OVER', 128, 64, YE, 16, 'center');
    txt('SCORE ' + pad5(result.score), 128, 94, WH, 8, 'center');
    if (result.isBest) { if (Math.floor(blink * 3) & 1) txt('NEW BEST!', 128, 110, HEX[E], 8, 'center'); }
    else txt('BEST ' + pad5(hi), 128, 110, WH, 8, 'center');
    if (overT > 1.5 && (Math.floor(blink * 2) & 1)) txt('PRESS START', 128, 130, WH, 8, 'center');
  }
}
let last = 0, acc = 0;
function frame(ts) {
  if (!last) last = ts;
  acc += Math.min(0.1, (ts - last) / 1000); last = ts;
  while (acc >= 1 / 60) { step(1 / 60); acc -= 1 / 60; }
  render();
  requestAnimationFrame(frame);
}
if (!window.__norun) requestAnimationFrame(frame);
if (document.fonts && document.fonts.load) document.fonts.load('8px "Press Start 2P"').catch(() => {});
window.__shell = {
  start: () => begin(),
  bot: on => { botOn = !!on; },
  ff: n => { for (let i = 0; i < n; i++) step(1 / 60); },
  render,
  step: () => { window.__now = (window.__now || 0) + 1 / 60; step(1 / 60); },
  info: () => Object.assign({ mode, result, hi }, GAME.info ? GAME.info() : {}),
  go: () => { startEdge = true; },
  mode: () => mode, music: () => GAME.music,
  get seed() { return activeSeed; }, get seedFromUrl() { return SEED_Q; },
};
