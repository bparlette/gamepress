/* ---------- shared NES core: pixel buffer, palette, text, audio, input ---------- */
const VW = 256, VH = 224;
const cv = document.getElementById('screen');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const img = ctx.createImageData(VW, VH);
const px32 = new Uint32Array(img.data.buffer);
const buf = new Uint8Array(VW * VH);
const HEX = ['#000000','#fcfcfc','#bcbcbc','#7c7c7c','#18a838','#006800','#d82800','#f8b800','#0038d8','#000088','#fca044','#a85800','#503000','#b800b8','#f87858','#3cbcfc','#58d854','#f8f8b8','#f8a4c0','#5c94fc','#383838','#c84c0c'];
const K=0,W=1,L=2,D=3,GR=4,F=5,R=6,Y=7,B=8,N=9,S=10,T=11,M=12,PU=13,O=14,CY=15,E=16,V=17,PK=18,SKY=19,DG=20,BRK=21;
const CH = { K,W,L,D,G:GR,F,R,Y,B,N,S,T,M,P:PU,O,C:CY,E,V,Q:PK,U:SKY,Z:DG,H:BRK };
const PAL32 = HEX.map(h => {
  const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16);
  return (0xFF000000 | (b << 16) | (g << 8) | r) >>> 0;
});
const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const rad = Math.PI / 180;
function hash(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function mkRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/* ?seed=N (or any string) makes every run reproducible. Without it: attract mode uses its fixed seed, real play a per-run seed.
   runSeed(fixed, off) is the ONLY way a game should seed its RNG; the active seed is exposed as window.__shell.seed. */
const SEED_Q = (() => { try {
  const q = new URLSearchParams(location.search); let v = q.get('seed');
  if ((v == null || v === '') && q.get('daily')) { const d = new Date(); return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate(); }   /* ?daily=1: everyone gets the same seed today */
  if (v == null || v === '') return null;
  if (Number.isFinite(Number(v))) return Number(v) >>> 0;
  let h = 2166136261; for (let i = 0; i < v.length; i++) h = Math.imul(h ^ v.charCodeAt(i), 16777619); return h >>> 0;
} catch (_) { return null; } })();
let activeSeed = null, vrngS = null;
function runSeed(fixed, off) {
  off = off || 0;
  activeSeed = SEED_Q != null ? (SEED_Q + off) >>> 0 : fixed != null ? fixed : ((Date.now() & 0xffff) + off) >>> 0;
  vrngS = mkRng(activeSeed ^ 0x9e3779b9);
  return activeSeed;
}
const vr = () => (vrngS || (vrngS = mkRng(1)))();   /* visual-only randomness (particles, popups): seeded, never gameplay */
function px(x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || x >= VW || y < 0 || y >= VH) return; buf[y * VW + x] = c; }
function rect(x, y, w, h, c) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const x0 = Math.max(0, x), x1 = Math.min(VW, x + w), y0 = Math.max(0, y), y1 = Math.min(VH, y + h);
  if (x1 <= x0) return;
  for (let j = y0; j < y1; j++) buf.fill(c, j * VW + x0, j * VW + x1);
}
function clear(c) { buf.fill(c); }
function spr(rows, x, y, flip, pal) {
  x = Math.round(x); y = Math.round(y);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r], w = row.length;
    for (let c = 0; c < w; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      const col = pal && pal[ch] !== undefined ? pal[ch] : CH[ch];
      px(flip ? x + w - 1 - c : x + c, y + r, col);
    }
  }
}
function fillCircle(cx, cy, r, c) {
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.5) px(cx + i, cy + j, c);
}

/* text drawn on the 2d context after the pixel buffer is blitted */
const FONT = s => `${s}px "Press Start 2P", ui-monospace, monospace`;
function txt(s, x, y, col, size, align, shadow) {
  size = size || 8;
  ctx.font = FONT(size); ctx.textBaseline = 'top'; ctx.textAlign = align || 'left';
  if (shadow !== false) { ctx.fillStyle = '#000'; const o = size >= 16 ? 2 : 1; ctx.fillText(s, x + o, y + o); }
  ctx.fillStyle = typeof col === 'number' ? HEX[col] : col; ctx.fillText(s, x, y);
}
function panel(x, y, w, h, bg) {
  ctx.fillStyle = HEX[bg === undefined ? N : bg]; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = HEX[W]; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x, y, 2, h); ctx.fillRect(x + w - 2, y, 2, h);
}
const pad5 = n => String(Math.max(0, Math.round(n))).padStart(5, '0');
const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

/* ---------- audio (square-wave chip tune) ---------- */
let AC = null, master = null, muted = false, step16 = 0, nextT = 0;
/* iOS: the silent switch mutes Web Audio unless the page's audio session is 'playback'; contexts also start 'suspended'/'interrupted'
   until a real gesture (touchend/click/keydown; pointerdown alone does not count on Safari). */
function iosAudioFix() { try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) {} }
function audioInit() {
  iosAudioFix();
  if (AC) { if (AC.state !== 'running') { try { AC.resume(); } catch (_) {} } return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = muted ? 0 : 0.16; master.connect(AC.destination);
    try { const sb = AC.createBuffer(1, 1, 22050), ss = AC.createBufferSource(); ss.buffer = sb; ss.connect(AC.destination); ss.start(0); } catch (_) {}
    nextT = AC.currentTime + 0.1;
    setInterval(scheduleMusic, 30);
  } catch (e) { AC = null; }
}
['touchend', 'click', 'keydown', 'pointerup'].forEach(ev => window.addEventListener(ev, audioInit, { passive: true }));
document.addEventListener('visibilitychange', () => { if (!document.hidden && AC && AC.state !== 'running') { try { AC.resume(); } catch (_) {} } });
function tone(freq, dur, type, vol, slide, delay) {
  if (window.__log) { window.__log.push({ k:'tone', t:window.__now, freq, dur, type:type || 'square', vol:vol == null ? 0.5 : vol, slide:slide || 0, delay:delay || 0 }); return; }
  if (!AC || muted) return;
  const t = AC.currentTime + (delay || 0);
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol == null ? 0.5 : vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
}
function noise(dur, vol, when) {
  if (window.__log) { window.__log.push({ k:'noise', t:window.__now, dur, vol, delay:when || 0 }); return; }
  if (!AC || muted) return;
  const t = AC.currentTime + (when || 0);
  const len = Math.max(1, Math.floor(AC.sampleRate * dur));
  const b = AC.createBuffer(1, len, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = AC.createBufferSource(), g = AC.createGain();
  s.buffer = b; g.gain.setValueAtTime(vol, t); s.connect(g); g.connect(master); s.start(t);
}
const hz = s => 440 * Math.pow(2, s / 12);
function scheduleMusic() {
  const m = GAME.music;
  if (!AC || AC.state !== 'running' || !m) return;
  const sixteenth = 60 / m.bpm / 4;
  while (nextT < AC.currentTime + 0.14) {
    const ch = m.chords[Math.floor(step16 / 16) % m.chords.length], s = step16 % 16;
    const delay = Math.max(0, nextT - AC.currentTime);
    if (!muted) {
      const a = m.arp[s];
      if (a >= 0) tone(hz(ch.tones[a % ch.tones.length] + (a >= ch.tones.length ? 12 : 0) + 12), sixteenth * 1.7, m.lead || 'square', 0.15, 0, delay);
      if (m.bass.includes(s)) tone(hz(ch.root + ((s % 8 === 6) ? 12 : 0)), sixteenth * 1.8, 'triangle', 0.5, 0, delay);
      if (m.snare.includes(s)) noise(0.07, 0.3, delay);
      if (s % 2 === 1 && m.hat) noise(0.02, 0.06, delay);
      if (m.kick.includes(s)) tone(90, 0.09, 'sine', 0.7, -50, delay);
    }
    nextT += sixteenth; step16++;
  }
}
const SFX = {
  jump:  () => tone(260, 0.14, 'square', 0.25, 420),
  shoot: () => tone(900, 0.06, 'square', 0.18, -500),
  hit:   () => { noise(0.08, 0.3); tone(220, 0.08, 'square', 0.2, -100); },
  boom:  () => { noise(0.35, 0.6); tone(120, 0.4, 'sawtooth', 0.3, -80); },
  coin:  () => { tone(988, 0.06, 'square', 0.22); tone(1319, 0.14, 'square', 0.22, 0, 0.06); },
  hurt:  () => tone(330, 0.3, 'sawtooth', 0.28, -260),
  die:   () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.14, 'square', 0.28, 0, i * 0.12)),
  power: () => tone(300, 0.4, 'square', 0.25, 900),
  beep:  () => tone(520, 0.12, 'square', 0.3),
  go:    () => tone(1040, 0.35, 'square', 0.3),
  win:   () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.16, 'square', 0.28, 0, i * 0.13)),
  land:  () => { tone(120, 0.1, 'triangle', 0.5, -60); noise(0.06, 0.2); },
  throw: () => tone(500, 0.12, 'square', 0.2, 400),
  catch: () => { tone(700, 0.05, 'square', 0.25); tone(500, 0.08, 'square', 0.2, 0, 0.05); },
  super: () => { tone(200, 0.5, 'sawtooth', 0.3, 1200); noise(0.4, 0.4); },
  flap:  () => tone(420, 0.07, 'triangle', 0.4, 240),
  pop:   () => { noise(0.1, 0.4); tone(700, 0.1, 'square', 0.2, -500); },
  tick:  () => tone(1400, 0.03, 'square', 0.15),
  swing: () => tone(300, 0.18, 'sawtooth', 0.12, 300),
  punch: () => { noise(0.07, 0.4); tone(160, 0.1, 'square', 0.3, -80); },
  clear: () => [523, 659, 784].forEach((f, i) => tone(f, 0.08, 'square', 0.25, 0, i * 0.06)),
  over:  () => [330, 262, 196, 165].forEach((f, i) => tone(f, 0.22, 'triangle', 0.5, 0, i * 0.18)),
};
function sfx(n) { if (SFX[n]) SFX[n](); }

/* ---------- input ---------- */
const kd = { l:false, r:false, u:false, d:false, b:false, a:false };
const td = { l:false, r:false, u:false, d:false, b:false, a:false, on:false, ax:0, ay:0 };
let aEdge = false, bEdge = false, startEdge = false;
const KEYMAP = { ArrowLeft:'l', KeyA:'l', ArrowRight:'r', KeyD:'r', ArrowDown:'d', KeyS:'d', ArrowUp:'u', KeyW:'u',
  KeyZ:'a', Space:'a', KeyK:'a', KeyX:'b', ShiftLeft:'b', ShiftRight:'b', KeyJ:'b' };
addEventListener('keydown', e => {
  const k = KEYMAP[e.code];
  if (k) { if (!kd[k] && k === 'a') aEdge = true; if (!kd[k] && k === 'b') bEdge = true; kd[k] = true; e.preventDefault(); audioInit(); return; }
  if (e.code === 'Enter') { startEdge = true; e.preventDefault(); audioInit(); }
  else if (e.code === 'KeyM') toggleSound();
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) { kd[k] = false; e.preventDefault(); } });
addEventListener('blur', () => { for (const k in kd) kd[k] = false; for (const k in td) td[k] = false; });

const dpad = document.getElementById('dpad');
const nub = document.getElementById('nub');
/* The pad LOOKS like a d-pad but reads like an analog stick: angle + strength of the touch decide the output.
   GAME.dir = '4' (up/down/left/right only), '8' (default, adds diagonals) or 'any' (also exposes inp.ax/inp.ay, -1..1, full 360 degrees).
   inp.l/r/u/d are always set so every game keeps working; inp.ax/inp.ay exist for games that want smooth movement. */
function dpadUpdate(e, on) {
  td.l = td.r = td.u = td.d = false; td.on = false; td.ax = td.ay = 0;
  let nx = 0, ny = 0;
  if (on) {
    const r = dpad.getBoundingClientRect(), m = (typeof GAME !== 'undefined' && GAME.dir) || '8';
    nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2); ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const mag = Math.hypot(nx, ny);
    if (mag >= 0.16) {
      const ux = nx / mag, uy = ny / mag;
      td.on = true;
      if (m === '4') { if (Math.abs(ux) >= Math.abs(uy)) { td.l = ux < 0; td.r = ux > 0; } else { td.u = uy < 0; td.d = uy > 0; } td.ax = td.r - td.l; td.ay = td.d - td.u; }
      else {
        if (ux < -0.38) td.l = true; if (ux > 0.38) td.r = true; if (uy < -0.38) td.u = true; if (uy > 0.38) td.d = true;
        if (m === 'any') { const s = Math.min(1, (mag - 0.16) / 0.5); td.ax = ux * s; td.ay = uy * s; } else { td.ax = td.r - td.l; td.ay = td.d - td.u; }
      }
    }
  }
  const k = Math.min(1, Math.hypot(nx, ny)) , sc = k > 0 ? 40 * k / Math.hypot(nx, ny) : 0;
  if (nub) nub.style.transform = on ? `translate(${(nx * sc).toFixed(1)}px,${(ny * sc).toFixed(1)}px)` : '';
  dpad.classList.toggle('on-l', td.l); dpad.classList.toggle('on-r', td.r);
  dpad.classList.toggle('on-u', td.u); dpad.classList.toggle('on-d', td.d);
}
dpad.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); try { dpad.setPointerCapture(e.pointerId); } catch (_) {} dpadUpdate(e, true); });
dpad.addEventListener('pointermove', e => { if (e.buttons || e.pressure > 0) dpadUpdate(e, true); });
['pointerup', 'pointercancel'].forEach(n => dpad.addEventListener(n, e => dpadUpdate(e, false)));
dpad.addEventListener('contextmenu', e => e.preventDefault());
document.querySelectorAll('[data-k]').forEach(btn => {
  const k = btn.dataset.k;
  btn.addEventListener('pointerdown', e => {
    e.preventDefault(); audioInit();
    try { btn.setPointerCapture(e.pointerId); } catch (_) {}
    btn.classList.add('on');
    if (k === 'a') { aEdge = true; td.a = true; }
    else if (k === 'b') { bEdge = true; td.b = true; }
    else if (k === 'start') startEdge = true;
    else if (k === 'select') toggleSound();
  });
  const up = () => { btn.classList.remove('on'); if (k === 'a') td.a = false; if (k === 'b') td.b = false; };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => btn.addEventListener(n, up));
  btn.addEventListener('contextmenu', e => e.preventDefault());
});
cv.addEventListener('pointerdown', () => { audioInit(); startEdge = true; });
const sndBtn = document.getElementById('snd');
function toggleSound() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.16;
  sndBtn.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
}
const BLANK = Object.freeze({ l:0, r:0, u:0, d:0, a:0, b:0, pa:0, pb:0, start:0, ax:0, ay:0 });
function readInput() {
  const i = { l:kd.l || td.l, r:kd.r || td.r, u:kd.u || td.u, d:kd.d || td.d, a:kd.a || td.a, b:kd.b || td.b, pa:aEdge, pb:bEdge, start:startEdge };
  i.ax = td.on ? td.ax : (i.r ? 1 : 0) - (i.l ? 1 : 0); i.ay = td.on ? td.ay : (i.d ? 1 : 0) - (i.u ? 1 : 0);
  aEdge = false; bEdge = false; startEdge = false;
  return i;
}
