/* ---------- shell: title / play / over flow, loop, test hooks ---------- */
let mode = 'title', overT = 0, result = null, hi = 0, blink = 0, botOn = false, persona = 'expert', plag = [], plcg = 12345, tms = 0;
const HIK = 'nes6-hi-' + GAME.id;
try { hi = parseInt(localStorage.getItem(HIK) || '0', 10) || 0; } catch (_) {}
/* retention: plays / day streak / best, kept per game in localStorage (every access guarded; the game works with storage blocked) */
const META_K = 'nes6-meta-' + GAME.id, DAILY = (() => { try { return !!new URLSearchParams(location.search).get('daily'); } catch (_) { return false; } })();
const dayNo = () => Math.floor(Date.now() / 864e5);
let meta = { plays: 0, streak: 0, last: 0, dbest: 0, dday: 0 };
try { Object.assign(meta, JSON.parse(localStorage.getItem(META_K) || '{}')); } catch (_) {}
if (meta.last && dayNo() - meta.last > 1) meta.streak = 0;   /* a missed day ends the streak (shown on the title as soon as it is stale) */
function metaPlay(score) { const d = dayNo(); meta.plays++; if (meta.last !== d) { meta.streak = meta.last === d - 1 ? meta.streak + 1 : 1; meta.last = d; }
  if (DAILY) { if (meta.dday !== d) { meta.dday = d; meta.dbest = 0; } meta.dbest = Math.max(meta.dbest, score); }
  try { localStorage.setItem(META_K, JSON.stringify(meta)); } catch (_) {} }
let shareMsg = '', shareT = 0;
function shareRun() { if (!result) return; const url = location.href.split('#')[0].replace(/[?&](seed|daily)=[^&]*/g, '').replace(/[?&]$/, '');
  const text = GAME.t1 + ' ' + GAME.t2 + ': I scored ' + result.score + (DAILY ? ' on today\'s daily' : '') + '. Beat it!';
  const full = text + ' ' + url + (DAILY ? (url.includes('?') ? '&' : '?') + 'daily=1' : '');
  const done = m => { shareMsg = m; shareT = 2.2; };
  try { if (navigator.share) { navigator.share({ text, url: full.slice(text.length + 1) }).then(() => done('SHARED'), () => done('CANCELLED')); return; } } catch (_) {}
  try { navigator.clipboard.writeText(full).then(() => done('COPIED'), () => done('COPY FAILED')); } catch (_) { done('COPY FAILED'); } }
function endGame(score, msg) {
  if (mode !== 'play') return;
  mode = 'over'; overT = 0;
  const isBest = score > hi;
  if (isBest) { hi = score; try { localStorage.setItem(HIK, String(hi)); } catch (_) {} }
  const win = !!(msg && /CLEAR|WIN|KO!|FINISH/.test(msg));
  result = { score, msg, isBest, win }; metaPlay(score);
  sfx(win ? 'win' : 'over');
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
    GAME.update(dt, botOn && GAME.bot ? personaIn(GAME.bot()) : raw, 'play');
  } else {
    overT += dt; if (shareT > 0) shareT -= dt; if (raw.pb && overT > .4) shareRun();
    if (raw.start && overT > 1.5) { begin(); sfx('beep'); }
  }
}
function fitTall() { /* HD canvas size: width 256*K, height follows the screen for tall games (K = pixels per logical unit, default 3) */
  const K = window.HD_K || 3;
  if (!GAME.tall) window.HD_H = 224;
  else { const r = cv.parentNode.getBoundingClientRect(); if (r.width && r.height) window.HD_H = Math.max(224, Math.min(480, Math.round(256 * r.height / r.width))); else window.HD_H = window.HD_H || 224; }
  if (cv.width !== 256 * K) cv.width = 256 * K; if (cv.height !== window.HD_H * K) cv.height = window.HD_H * K;
}
function render() {
  if (window.HD_MODE) fitTall();
  if (window.HD_MODE && GAME.renderHD) { const K = window.HD_K || 3; ctx.setTransform(K, 0, 0, K, 0, 0); ctx.imageSmoothingEnabled = true; GAME.renderHD(ctx, mode); }
  else { GAME.render(mode);
  for (let i = 0; i < buf.length; i++) px32[i] = PAL32[buf[i]];
  ctx.putImageData(img, 0, 0); }
  GAME.hud(mode);
  const WH = HEX[W], YE = HEX[Y];
  const HH = window.HD_H || 224; if (window.HD_MODE && HH !== 224) { ctx.save(); ctx.translate(0, (HH - 224) / 2); }
  if (mode === 'title') {
    panel(16, 12, 224, 96);
    const s1 = GAME.t1.length <= 6 ? 32 : 24;
    txt(GAME.t1, 128, s1 === 32 ? 22 : 28, YE, s1, 'center');
    txt(GAME.t2, 128, 62, WH, GAME.t2.length > 8 ? 16 : 24, 'center');
    txt(GAME.sub, 128, 90, HEX[CY], 8, 'center');
    if (Math.floor(blink * 2) & 1) txt('PRESS START', 128, 120, WH, 8, 'center');
    txt('HI ' + pad5(hi), 128, 134, YE, 8, 'center');
    if (DAILY) txt('DAILY' + (meta.dday === dayNo() ? ' BEST ' + pad5(meta.dbest) : ' - NEW TODAY'), 128, 148, HEX[CY], 8, 'center');
    if (meta.streak > 0) txt('STREAK ' + meta.streak + (meta.streak > 1 ? ' DAYS' : ' DAY'), 128, DAILY ? 162 : 148, WH, 8, 'center');
  } else if (mode === 'over' && result) {
    panel(32, 52, 192, 100);
    txt(result.msg || 'GAME OVER', 128, 64, YE, 16, 'center');
    txt('SCORE ' + pad5(result.score), 128, 94, WH, 8, 'center');
    if (result.isBest) { if (Math.floor(blink * 3) & 1) txt('NEW BEST!', 128, 110, HEX[E], 8, 'center'); }
    else txt('BEST ' + pad5(hi), 128, 110, WH, 8, 'center');
    if (overT > 1.5 && (Math.floor(blink * 2) & 1)) txt('PRESS START', 128, 130, WH, 8, 'center');
    txt(shareT > 0 ? shareMsg : 'B: SHARE', 128, 142, HEX[CY], 8, 'center');
  }
  if (window.HD_MODE && HH !== 224) ctx.restore();
  if (window.GLPOST_ON) { if (!GLPOST.on && !GLPOST.tried) { GLPOST.tried = 1; GLPOST.init(cv); } GLPOST.run(performance.now() / 1000); }
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
/* test personas (QA only, own LCG so sim determinism is untouched): expert = bot as written; clumsy = input ~0.25 s late and 35% of button frames dropped; idle = no input at all */
function personaIn(b) { if (persona === 'expert') return b; if (persona === 'idle') return Object.assign({}, BLANK);
  plag.push(Object.assign({}, b)); const o = plag.length > 15 ? plag.shift() : Object.assign({}, BLANK);
  plcg = (plcg * 1103515245 + 12345) & 0x7fffffff; if ((plcg >> 8) % 100 < 35) { o.a = 0; o.b = 0; } return o; }
window.__shell = {
  start: () => begin(),
  bot: (on, who) => { botOn = !!on; persona = who || 'expert'; plag = []; plcg = 12345; },
  ff: n => { for (let i = 0; i < n; i++) step(1 / 60); },
  render,
  step: () => { window.__now = (window.__now || 0) + 1 / 60; step(1 / 60); },
  info: () => Object.assign({ mode, result, hi }, GAME.info ? GAME.info() : {}),
  go: () => { startEdge = true; },
  meta: () => Object.assign({ daily: DAILY }, meta), share: () => shareRun(),
  mode: () => mode, music: () => GAME.music,
  get seed() { return activeSeed; }, get seedFromUrl() { return SEED_Q; },
};
