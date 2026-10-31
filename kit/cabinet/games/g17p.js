// NEEDS: art
/* ===== g17p: 16-bit tier of the zombie game = g17c sim + rigs, rendered to a 256x224 (SNES-sized) pixel grid: every frame is downsampled, palette-posterised and
   scaled back nearest-neighbour; rig characters get a 1-pixel dark contour (RIG.outline). Same game as g17/g17b-f. PIX = screen px per game pixel. ===== */
window.GLPOST_ON = false; const PIX = 3, PLV = 7;
RIG.outline = { col:'#0b0d14', w:1 };
const PIXC = document.createElement('canvas'), PIXX = PIXC.getContext('2d', { willReadFrequently:true });
function PIXPASS(g) { const cv = g.canvas, sw = Math.round(cv.width / PIX), sh = Math.round(cv.height / PIX); if (PIXC.width !== sw || PIXC.height !== sh) { PIXC.width = sw; PIXC.height = sh; }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); PIXX.imageSmoothingEnabled = true; PIXX.imageSmoothingQuality = 'high'; PIXX.clearRect(0, 0, sw, sh); PIXX.drawImage(cv, 0, 0, sw, sh);
  const im = PIXX.getImageData(0, 0, sw, sh), d = im.data, k = (PLV - 1) / 255, q = 255 / (PLV - 1); for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i + 1], b = d[i + 2], l = (r + gg + b) / 3; const c = (v) => Math.max(0, Math.min(255, (l + (v - l) * 1.25 - 128) * 1.12 + 128 + 8)); d[i] = Math.round(c(r) * k) * q; d[i + 1] = Math.round(c(gg) * k) * q; d[i + 2] = Math.round(c(b) * k) * q; }
  PIXX.putImageData(im, 0, 0); g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height); g.drawImage(PIXC, 0, 0, cv.width, cv.height); g.imageSmoothingEnabled = true; g.restore(); }
// KEYS: Arrows move (auto-fire), Z/Space or X pick an upgrade when the level bar fills (Left/Right to choose).
/* ===== VAMPIRE METROID: bounty hunter vs. endless cave bugs. Auto-fire, pellets, level-up picks, boss melt. ===== */
const UP17 = ['SPAZER', 'ICE AURA', 'MINES', 'SCREW'];

/* ---- art: all from ART (artkit.js) ---- */
const bgFn17 = () => { ART.floor(); ART.blood(8); ART.brick(0, 16, 4); ART.lockers(5, 10, 50); ART.pipes(); ART.brick(208, 16, 3); ART.hazard(208); ART.table(10, 22); ART.table(222, 178); ART.crate(228, 22); ART.barrel(20, 186); };
function icon17(k, cx, cy, T) {
  if (k === 0) { for (const a of [-0.45, 0, 0.45]) for (let i = 0; i < 4; i++) rect(cx - 8 + i * 4, cy + Math.round(Math.sin(a) * (i * 4 - 2)) - 1, 3, 3, i === 3 ? W : Y); }
  else if (k === 1) { for (let a = 0; a < 6.28; a += 0.14) px(cx + Math.cos(a + T) * 9, cy + Math.sin(a + T) * 9, CY); fillCircle(cx, cy, 3, W); }
  else if (k === 2) { fillCircle(cx, cy, 6, D); fillCircle(cx, cy, 4, DG); rect(cx - 1, cy - 1, 3, 3, Math.floor(T * 5) & 1 ? R : Y); }
  else { for (let a = 0; a < 4; a++) { const an = T * 3 + a * 1.57; rect(cx + Math.cos(an) * 8 - 1, cy + Math.sin(an) * 8 - 1, 3, 3, W); } fillCircle(cx, cy, 2, CY); }
}

/* ---- HD painted art (only used when built with --hd; same rules, richer drawing) ---- */
function heroHD(f) { return HD.spr('h17' + f, 14.4, 22.4, g => { g.scale(0.8, 0.8); const L = [-2.4, 0, 2.4, 0][f], b = [0, -0.5, 0, -0.5][f];
  HD.part(g, 5.4 + L * 0.5, 17, 3.2, 8, 1.2, '#4a5a3a', '#2e3a24'); HD.part(g, 5, 24, 4.4, 2.6, 1, '#2a2a30', '#14141a');
  HD.part(g, 3, 9 + b, 4.5, 8, 1.5, '#7a6038', '#3a2e1c');
  HD.part(g, 9.4 - L * 0.5, 17, 3.2, 8, 1.2, '#5a6e44', '#34442a'); HD.part(g, 9, 24, 4.8, 2.6, 1, '#34343c', '#16161c');
  HD.part(g, 5, 8.5 + b, 8, 10, 2.2, '#7a9a54', '#3d5a2c'); g.fillStyle = '#2e4220'; g.fillRect(8.3, 13 + b, 4, 3); g.fillStyle = '#2a2018'; g.fillRect(5, 17 + b, 8, 1.4);
  HD.ball(g, 9.5, 5.2 + b, 3.7, '#f6d0a8', '#c8946a'); g.beginPath(); g.arc(9.5, 4.3 + b, 4, 3.14, 6.283); g.fillStyle = HD.lg(g, 0, 0, 0, 5, [[0, '#6f9a4a'], [1, '#34522a']]); g.fill(); g.strokeStyle = '#10131a'; g.lineWidth = 0.5; g.stroke(); HD.part(g, 10, 3.6 + b, 5, 1.5, 0.7, '#4a7a3a', '#2a4222');
  g.fillStyle = '#1a1a1a'; g.fillRect(11.3, 5 + b, 0.9, 1.1); HD.part(g, 9, 10.2 + b, 6.5, 2.7, 1.2, '#86a862', '#46622f'); HD.ball(g, 15.4, 11.5 + b, 1.5, '#f6d0a8', '#c8946a'); }); }
function gunHD() { return HD.spr('gun17', 16, 6, g => { HD.part(g, 0, 2, 5, 2.6, 0.8, '#5a4028', '#2e2014'); HD.part(g, 4, 1.4, 8, 3, 0.8, '#5c6470', '#20262e'); HD.part(g, 11, 2.1, 5, 1.4, 0.5, '#a8b0bc', '#505864'); HD.part(g, 6, 0.4, 4, 1.4, 0.6, '#30363e', '#14181e'); }); }
function zomHD(f, el) { return HD.spr('z17' + f + el, 14.4, 22.4, g => { g.scale(0.8, 0.8); const L = [-2.2, 0, 2.2, 0][f], b = [0, -0.6, 0, -0.6][f], k = el ? ['#cfb0dc', '#8a6a9c', '#7a3a9a', '#3a1c52', '#ff4040'] : ['#a2dc78', '#4d8f36', '#667a8c', '#33404c', '#ffe85c'];
  HD.part(g, 5.4 + L * 0.6, 17, 3.2, 8, 1.2, '#3a4048', '#1c2026'); HD.part(g, 9.4 - L * 0.6, 17, 3.2, 8, 1.2, '#4a5058', '#22262c'); HD.part(g, 5, 24.2, 4.4, 2, 1, '#2a2a30', '#14141a'); HD.part(g, 9, 24.2, 4.4, 2, 1, '#2a2a30', '#14141a');
  HD.part(g, 7, 12.5 + b, 7.5, 2.2, 1, k[2], k[3]); HD.ball(g, 15, 13.5 + b, 1.5, k[0], k[1]);
  HD.part(g, 4.6, 8.5 + b, 8.6, 10, 2.2, k[2], k[3]); g.fillStyle = '#e8e8ee'; g.fillRect(7.6, 9 + b, 2.6, 6); g.fillStyle = '#c03030'; g.fillRect(8.4, 9.4 + b, 1, 5.6); g.fillStyle = 'rgba(150,20,20,0.65)'; g.beginPath(); g.ellipse(11, 14.5 + b, 1.8, 1.2, 0.4, 0, 6.283); g.fill();
  HD.part(g, 8.6, 10.2 + b, 7.4, 2.5, 1.1, k[0], k[1]); HD.ball(g, 16.4, 11.4 + b, 1.5, k[0], k[1]);
  HD.ball(g, 9.8, 5.2 + b, 4.1, k[0], k[1]); g.fillStyle = '#1c1a1a'; g.beginPath(); g.arc(8.4, 5 + b, 1.15, 0, 6.283); g.arc(11.4, 5 + b, 1.15, 0, 6.283); g.fill(); g.fillStyle = k[4]; g.fillRect(8.1, 4.8 + b, 0.7, 0.7); g.fillRect(11.1, 4.8 + b, 0.7, 0.7);
  g.fillStyle = '#2a1214'; g.fillRect(8.4, 7.4 + b, 3.2, 1.2); g.fillStyle = '#f0f0e0'; g.fillRect(8.8, 7.4 + b, 0.7, 0.7); g.fillRect(10.4, 7.4 + b, 0.7, 0.7); g.fillStyle = '#2a3a22'; g.fillRect(7.6, 1.2 + b, 4.6, 1.2); }); }
function queenHD(f) { return HD.spr('q17' + f, 50, 46, g => { const w = f ? 1.2 : -1.2;
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { const lx = 25 + sd * (11 + k * 4), ly = 20 + k * 6 + (k === 1 ? w : 0); g.strokeStyle = '#3a1c4c'; g.lineWidth = 3; g.beginPath(); g.moveTo(25 + sd * 8, 20 + k * 3); g.lineTo(lx + sd * 5, ly - 4); g.lineTo(lx + sd * 7, ly + 9); g.stroke(); g.strokeStyle = '#8a5aa8'; g.lineWidth = 1.2; g.stroke(); }
  HD.ball(g, 25, 31, 10, '#7a4a98', '#2a1238'); HD.ball(g, 25, 21, 15, '#a864c8', '#3a1850'); g.beginPath(); g.ellipse(25, 24, 11, 8, 0, 0, 6.283); g.fillStyle = 'rgba(60,20,80,0.55)'; g.fill();
  for (const dx of [-9, 0, 9]) { g.beginPath(); g.moveTo(25 + dx - 3, 9); g.lineTo(25 + dx, dx ? 1 : -3); g.lineTo(25 + dx + 3, 9); g.fillStyle = HD.lg(g, 0, -3, 0, 9, [[0, '#ffd84a'], [1, '#a864c8']]); g.fill(); g.strokeStyle = '#10131a'; g.lineWidth = 0.6; g.stroke(); }
  for (const dx of [-7, 7]) { HD.ball(g, 25 + dx, 19, 4.2, '#fff2a0', '#e8a000'); g.fillStyle = '#d02010'; g.beginPath(); g.ellipse(25 + dx, 19.4, 1.1, 2.4, 0, 0, 6.283); g.fill(); }
  g.fillStyle = '#f4f0e0'; for (const dx of [-5, 4]) { g.beginPath(); g.moveTo(25 + dx, 27); g.lineTo(25 + dx + 1.6, 27); g.lineTo(25 + dx + 0.8, 34); g.fill(); } g.fillStyle = '#2a0a14'; g.fillRect(21, 30, 8, 1.4); }); }
function roomHD() { return HD.spr('room17', 256, 224, g => {
  g.fillStyle = HD.lg(g, 0, 0, 0, 224, [[0, '#2f3f48'], [1, '#1b262e']]); g.fillRect(0, 0, 256, 224);
  for (let y = 18; y < 208; y += 16) for (let x = 0; x < 256; x += 16) { const h = hash(x, y); g.fillStyle = `rgba(${h < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + h * 0.05})`; g.fillRect(x, y, 16, 16);
    g.fillStyle = 'rgba(255,255,255,0.09)'; g.fillRect(x, y, 16, 0.6); g.fillRect(x, y, 0.6, 16); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x, y + 15.4, 16, 0.6); g.fillRect(x + 15.4, y, 0.6, 16);
    if (h < 0.2) { g.fillStyle = HD.rg(g, x + 8, y + 8, 0, 9, [[0, 'rgba(70,150,60,0.32)'], [1, 'rgba(70,150,60,0)']]); g.fillRect(x - 2, y - 2, 20, 20); }
    if (h > 0.88) { g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x + 3, y + 4); g.lineTo(x + 7, y + 7 + hash(y, x) * 3); g.lineTo(x + 10, y + 6); g.lineTo(x + 13, y + 11); g.stroke(); } }
  for (let k = 0; k < 8; k++) { const x = 24 + hash(k, 3) * 208, y = 40 + hash(k, 5) * 150; g.fillStyle = HD.rg(g, x, y, 0, 11, [[0, 'rgba(120,14,14,0.85)'], [0.6, 'rgba(90,10,12,0.6)'], [1, 'rgba(70,8,10,0)']]); g.beginPath(); g.ellipse(x, y, 12, 8, hash(k, 9), 0, 6.283); g.fill(); }
  HD.grain(g, 0, 18, 256, 190, 0.05, 0.5);
  g.fillStyle = '#3a2e28'; g.fillRect(0, 0, 256, 18); for (let r = 0; r < 4; r++) for (let x = -(r & 1) * 8; x < 256; x += 16) { const h = hash(x, r); HD.part(g, x + 0.6, r * 4.5 + 0.4, 14.8, 3.8, 0.6, `rgb(${150 + h * 40},${80 + h * 20},${60})`, `rgb(${100 + h * 30},${50 + h * 14},${40})`, '#1a120e'); }
  for (let i = 0; i < 5; i++) { const x = 10 + i * 50; HD.part(g, x, 2, 15, 14, 1, '#7c8a96', '#3c4650'); for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + 2, 4 + k * 2.2, 11, 0.8); } HD.ball(g, x + 12, 11, 0.9, '#ffe070', '#a07000'); }
  g.fillStyle = '#0c0f14'; g.fillRect(0, 18, 256, 1.4);
  g.fillStyle = '#3a2e28'; g.fillRect(0, 208, 256, 16); for (let r = 0; r < 3; r++) for (let x = -(r & 1) * 8; x < 256; x += 16) { const h = hash(x, r + 7); HD.part(g, x + 0.6, 214 + r * 3.6, 14.8, 3.2, 0.6, `rgb(${140 + h * 40},${76 + h * 20},${58})`, `rgb(${96 + h * 30},${48 + h * 14},${38})`, '#1a120e'); }
  for (let x = 0; x < 256; x += 8) { g.fillStyle = '#f2c230'; g.beginPath(); g.moveTo(x, 208); g.lineTo(x + 4, 208); g.lineTo(x + 2, 213); g.lineTo(x - 2, 213); g.fill(); g.fillStyle = '#16181c'; g.beginPath(); g.moveTo(x + 4, 208); g.lineTo(x + 8, 208); g.lineTo(x + 6, 213); g.lineTo(x + 2, 213); g.fill(); }
  for (const sx of [0, 250]) { g.fillStyle = HD.lg(g, sx, 0, sx + 6, 0, [[0, '#1a222c'], [0.4, '#7a8a98'], [1, '#222a34']]); g.fillRect(sx, 18, 6, 190); for (let y = 30; y < 208; y += 40) { HD.part(g, sx - 0.5, y, 7, 3, 0.8, '#a0acb8', '#4a5560'); } }
  for (const [tx, ty] of [[10, 24], [222, 180]]) { HD.part(g, tx + 1, ty + 9, 3, 7, 0.8, '#5a3a20', '#2e1c0e'); HD.part(g, tx + 20, ty + 9, 3, 7, 0.8, '#5a3a20', '#2e1c0e'); HD.part(g, tx, ty + 3, 24, 7, 1, '#7a5230', '#3e2812'); HD.part(g, tx - 0.5, ty, 25, 4, 1, '#b88a58', '#7a5230');
    HD.part(g, tx + 3, ty - 6, 4, 6, 1.4, '#9fe8ff', '#2a8aaa'); HD.part(g, tx + 10, ty - 5, 3.6, 5, 1.4, '#a0f088', '#3a9a30'); HD.part(g, tx + 16, ty - 7, 4, 7, 1.4, '#ffc0e0', '#c04a8a'); }
  HD.part(g, 226, 22, 15, 15, 1, '#b07a40', '#6a4420'); g.strokeStyle = 'rgba(40,20,8,0.8)'; g.lineWidth = 0.7; g.strokeRect(227.5, 23.5, 12, 12); g.beginPath(); g.moveTo(227.5, 23.5); g.lineTo(239.5, 35.5); g.moveTo(239.5, 23.5); g.lineTo(227.5, 35.5); g.stroke();
  HD.ball(g, 20, 186, 7, '#a06a38', '#4a2c14'); g.strokeStyle = '#2a2a30'; g.lineWidth = 0.9; g.beginPath(); g.ellipse(20, 184, 7, 2, 0, 0, 6.283); g.moveTo(13, 188); g.quadraticCurveTo(20, 190, 27, 188); g.stroke();
}); }
function iconHD(g, k, cx, cy, T) {
  g.save(); g.translate(cx, cy);
  if (k === 0) { for (const a of [-0.4, 0, 0.4]) { g.save(); g.rotate(a); g.fillStyle = HD.lg(g, -9, 0, 9, 0, [[0, 'rgba(255,200,60,0)'], [1, '#fff4a0']]); g.fillRect(-9, -1, 18, 2); g.restore(); } HD.glow(g, 8, 0, 8, '255,220,80', 0.7); }
  else if (k === 1) { g.strokeStyle = '#7ae8ff'; g.lineWidth = 1.2; g.setLineDash([2, 2]); g.lineDashOffset = -T * 8; g.beginPath(); g.arc(0, 0, 9, 0, 6.283); g.stroke(); g.setLineDash([]); HD.ball(g, 0, 0, 3.4, '#ffffff', '#6ad0ff'); HD.glow(g, 0, 0, 12, '90,220,255', 0.5); }
  else if (k === 2) { HD.ball(g, 0, 0, 6, '#8a929c', '#20262e'); g.fillStyle = Math.floor(T * 5) & 1 ? '#ff3a3a' : '#ffe060'; g.beginPath(); g.arc(0, 0, 1.6, 0, 6.283); g.fill(); HD.glow(g, 0, 0, 9, '255,70,60', 0.5); }
  else { for (let a = 0; a < 4; a++) { const an = T * 3 + a * 1.571; HD.ball(g, Math.cos(an) * 8, Math.sin(an) * 8, 2.6, '#ffffff', '#8ad8ff'); } HD.ball(g, 0, 0, 3, '#8ae8ff', '#2a7aaa'); HD.glow(g, 0, 0, 12, '120,220,255', 0.45); }
  g.restore();
}

/* ---- skeletal rig (SVG atlas) with fallback to the code-painted sprites while images load ---- */
RIG.def('hero', { scale:0.2, anchor:[60, 141], order:['pack', 'legB', 'legF', 'armFar', 'torso', 'head', 'arm'], pivots:{ pack:[30, 80], legB:[48, 104], legF:[68, 104], armFar:[46, 74], torso:[60, 108], head:[60, 64], arm:[66, 74] }, attach:[{ key:'gun.all', to:'arm', at:[60, 62], scale:0.9 }] });
for (const n of ['zombie', 'elite']) RIG.def(n, { scale:n === 'elite' ? 0.21 : 0.19, anchor:[60, 141], order:['legB', 'legF', 'armFar', 'torso', 'head', 'arm'], pivots:{ legB:[50, 102], legF:[68, 102], armFar:[44, 76], torso:[58, 108], head:[62, 64], arm:[64, 76] } });
RIG.def('queen', { scale:0.36, anchor:[80, 134], order:['legsL', 'legsR', 'body', 'head'], pivots:{ legsL:[60, 80], legsR:[100, 80], body:[80, 100], head:[80, 62] } });
const zPose = (T, s) => { const w = Math.sin(T * 9 + s), sw = Math.sin(T * 4.5 + s * 1.7), b = -Math.abs(w) * 1.6; return { legB:{ rot:w * 0.5 }, legF:{ rot:-w * 0.5 }, armFar:{ rot:0.14 * Math.sin(T * 9 + s + 1.5) - 0.05, oy:b }, arm:{ rot:0.14 * w, oy:b }, torso:{ rot:0.07 * sw, oy:b }, head:{ rot:-0.1 * sw + 0.05 * Math.sin(T * 13 + s), oy:b * 1.3 } }; };
const qPose = T => { const w = Math.sin(T * 8), br = Math.sin(T * 3); return { legsL:{ rot:w * 0.18 }, legsR:{ rot:-w * 0.18 }, body:{ sy:1 + br * 0.025, sx:1 - br * 0.015 }, head:{ oy:-Math.abs(br) * 1.5, rot:0.04 * Math.sin(T * 5) } }; };
const hPose = (T, mov, la, kick) => { const w = mov ? Math.sin(T * 12) : 0, b = mov ? -Math.abs(Math.sin(T * 12)) * 2.2 : Math.sin(T * 3) * -0.7; return { pack:{ rot:-0.06 * w, oy:b }, legB:{ rot:w * 0.6 }, legF:{ rot:-w * 0.6 }, armFar:{ rot:0.12 * w, oy:b }, torso:{ rot:0.05 * w, oy:b }, head:{ oy:b * 1.3, rot:-0.06 * w }, arm:{ rot:la, ox:-kick * 4, oy:b } }; };
function drawZomR(g, x, y, flip, el, sx, sy, a, tint, ta, T, fallbackFrame) { const n = el ? 'elite' : 'zombie'; if (RIG.ready(n)) RIG.draw(g, n, x, y, { flip, sx, sy, a, tint, ta, pose:zPose(T, x) }); else HD.puts(g, zomHD(fallbackFrame & 3, el ? 1 : 0), x, y, flip, sx, sy, a, tint, ta); }
const GAME = kit({ id:'g17p', t1:'VAMPIRE', t2:'METROID 16BIT', sub:'SURVIVE. LEVEL. MELT THE HIVE.', seed:171, off:17, secs:48,
  music:MUS(150, -21, true),
  setup(S) {
    S.p = { x:128, y:112, hp:100, inv:0, f:0, ang:0 }; S.en = []; S.sh = []; S.pel = []; S.fx = []; S.mines = []; S.dec = []; S.mz = 0;
    S.lv = [1, 0, 0, 0]; S.lvl = 1; S.xp = 0; S.need = 4; S.menu = null; S.sel = 0; S.mt = 0; S.fire = 0; S.spw = 0; S.mineT = 0; S.boss = null; S.kills = 0; S.win = 0;
  },
  step(S, dt, inp, att) {
    const p = S.p, a = S.edge(inp, 'a'), b = S.edge(inp, 'b'), lf = S.edge(inp, 'l'), rt = S.edge(inp, 'r'); S.mz = Math.max(0, S.mz - dt);
    if (S.win) { S.win -= dt; if (S.win <= 0) { sfx('win'); return finish(S, 'HIVE CLEAR!', 500 + Math.round(p.hp) * 5); } return; }
    if (S.menu) { /* level-up pause */
      S.mt += dt; if (lf) S.sel = (S.sel + 2) % 3; if (rt) S.sel = (S.sel + 1) % 3;
      if ((a || b) && S.mt > 0.3) { S.lv[S.menu[S.sel]]++; S.menu = null; sfx('power'); popup(S, 'POWER UP!', p.x, p.y - 14, CY); }
      return;
    }
    p.x = clamp(p.x + ((inp.r ? 1 : 0) - (inp.l ? 1 : 0)) * 58 * dt, 8, 248); p.y = clamp(p.y + ((inp.d ? 1 : 0) - (inp.u ? 1 : 0)) * 58 * dt, 22, 200); p.inv -= dt;
    /* spawns from the screen edges, ramping */
    S.spw -= dt; const rate = Math.min(0.09, 0.45 / (1 + S.T * 0.35));
    while (S.spw <= 0 && S.en.length < 140) {
      S.spw += rate; const e = rint(S, 4), t = S.rng(); let x = e < 2 ? t * 256 : e === 2 ? -6 : 262, y = e < 2 ? (e ? 230 : 14) : 14 + t * 210;
      S.en.push({ x, y, hp:S.T > 12 && S.rng() < 0.2 ? 4 : 2, sp:16 + S.rng() * 16, fz:0, big:0 }); S.en[S.en.length - 1].el = S.en[S.en.length - 1].hp > 2;
    }
    if (S.T > 20 && !S.boss) { S.boss = { x:128, y:-10, hp:300, sp:24, fz:0, big:1 }; S.en.push(S.boss); popup(S, 'HIVE QUEEN!', 128, 100, R); sfx('boom'); }
    /* weapons */
    let tgt = null, td = 1e9; for (const e of S.en) { const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < td) { td = d; tgt = e; } }
    S.fire -= dt; if (S.fire <= 0 && tgt) {
      S.fire = 0.42; const ang = Math.atan2(tgt.y - p.y, tgt.x - p.x), n = 1 + S.lv[0] * 2 - 2 + 1; p.ang = ang; S.mz = 0.07;
      for (let k = 0; k < n; k++) { const q = ang + (k - (n - 1) / 2) * 0.22; S.sh.push({ x:p.x, y:p.y, vx:Math.cos(q) * 150, vy:Math.sin(q) * 150, t:1.2 }); }
      sfx('tick');
    }
    S.mineT -= dt; if (S.lv[2] && S.mineT <= 0) { S.mineT = 1.6; for (let k = 0; k < S.lv[2]; k++) S.mines.push({ x:p.x + (k - S.lv[2] / 2) * 8, y:p.y + 4, t:0.9 + k * 0.2 }); }
    const aur = S.lv[1] ? 22 + S.lv[1] * 9 : 0, ob = S.lv[3] ? 1 + S.lv[3] : 0;
    for (let k = 0; k < ob; k++) { const an = S.T * 3.2 + k * 6.283 / ob; S.fx.push({ x:p.x + Math.cos(an) * 30, y:p.y + Math.sin(an) * 30, r:5, t:0.02, o:1 }); }
    for (const s of S.sh) { s.x += s.vx * dt; s.y += s.vy * dt; s.t -= dt; }
    for (const m of S.mines) { m.t -= dt; if (m.t <= 0) { S.fx.push({ x:m.x, y:m.y, r:26, t:0.25 }); S.fx.push({ x:m.x, y:m.y, r:26, t:0.02, dmg:1 }); sfx('pop'); } }
    S.mines = S.mines.filter(m => m.t > 0);
    for (const f of S.fx) f.t -= dt;
    for (const e of S.en) {
      e.fz = Math.max(0, e.fz - dt); const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
      const slow = aur && d < aur ? 0.25 : 1; if (aur && d < aur) { e.hp -= (1.5 + S.lv[1] * 3) * dt * (e.big ? 1.5 : 1); }
      e.x += (p.x - e.x) / d * e.sp * slow * dt; e.y += (p.y - e.y) / d * e.sp * slow * dt;
      for (const s of S.sh) if (s.t > 0 && Math.abs(s.x - e.x) < (e.big ? 12 : 5) && Math.abs(s.y - e.y) < (e.big ? 12 : 5)) { s.t = 0; e.hp -= 1 + S.lv[0] * 0.5; }
      for (const f of S.fx) if (f.t > 0 && (f.dmg || f.o) && Math.hypot(f.x - e.x, f.y - e.y) < f.r + (e.big ? 10 : 2)) { e.hp -= f.o ? 0.4 : 6; }
      if (d < (e.big ? 14 : 7) && p.inv <= 0) { p.hp -= e.big ? 14 : 5; p.inv = 0.6; sfx('hurt'); if (p.hp <= 0) { sfx('die'); return finish(S, 'OVERRUN', 0); } }
    }
    S.sh = S.sh.filter(s => s.t > 0);
    S.fx = S.fx.filter(f => f.t > 0);
    for (const e of S.en) if (e.hp <= 0) { if (e.big) { S.win = 1.2; S.fx.push({ x:e.x, y:e.y, r:40, t:0.6 }); sfx('super'); } else { S.pel.push({ x:e.x, y:e.y }); S.kills++; S.score += 5; if (S.dec.length > 70) S.dec.shift(); S.dec.push({ x:e.x, y:e.y, k:S.kills, el:e.el }); } }
    S.en = S.en.filter(e => e.hp > 0);
    for (const q of S.pel) if (Math.hypot(q.x - p.x, q.y - p.y) < 28) { q.x += (p.x - q.x) * 0.2; q.y += (p.y - q.y) * 0.2; if (Math.hypot(q.x - p.x, q.y - p.y) < 5) { q.got = 1; S.xp++; } }
    S.pel = S.pel.filter(q => !q.got);
    if (S.xp >= S.need) {
      S.xp = 0; S.need += 2; S.lvl++; S.sel = 0; S.mt = 0; sfx('clear');
      const o = [0, 1, 2, 3]; const out = rint(S, 4); S.menu = o.filter(k => k !== out);
    }
  },
  draw(S) {
    const p = S.p, T = S.T; ART.bg('g17', bgFn17);
    for (const d of S.dec) ART.splat(d);
    for (const q of S.pel) ART.gem(q.x, q.y, T);
    for (const m of S.mines) { fillCircle(m.x, m.y, 3, D); fillCircle(m.x, m.y, 2, DG); rect(m.x - 1, m.y - 1, 2, 2, Math.floor(T * 10) & 1 ? R : Y); }
    const aur = S.lv[1] ? 22 + S.lv[1] * 9 : 0;
    if (aur) { ART.ring(p.x, p.y, aur, T); ART.ring(p.x, p.y, aur - 3, T, SKY, SKY, 45); }
    const cx = Math.round(p.x), cy = Math.round(p.y), bl = p.inv > 0 && (Math.floor(T * 20) & 1);
    ART.depth(S.en.map(e => ({ y:e.y, draw: () => e.big ? ART.queen(Math.round(e.x), Math.round(e.y), T, e.hp) : ART.grunt(Math.round(e.x), Math.round(e.y), T, e.el ? { E:PK, L:PU, Y:R } : null, e.x < 128 ? 0 : 1) }))
      .concat([{ y:p.y, draw: () => { ART.marker(cx, cy, T); if (bl) return; ART.hero(cx, cy); ART.gun(cx, cy, p.ang, S.mz > 0); } }]));
    for (const s of S.sh) ART.bullet(s);
    for (const f of S.fx) { if (f.o) { fillCircle(f.x, f.y, 3, W); px(f.x, f.y, CY); px(f.x + 2, f.y - 2, CY); } else if (f.r && !f.dmg) ART.blast(f.x, f.y, Math.round(f.r * (1 - f.t * 2) + 4)); }
    ART.fog(p.x, p.y); if (p.inv > 0.3) ART.flash();
    ART.bar(40, 4, 56, S.xp / S.need, CY, W); ART.heart(101, 4); ART.bar(112, 4, 54, p.hp / 100, R, PK);
    if (S.boss && S.boss.hp > 0) ART.bar(64, 212, 128, S.boss.hp / 300, PU, PK);
    if (S.menu) { ART.modal(24, 70, 208, 84); S.menu.forEach((k, i) => { const x = 32 + i * 66; ART.card(x, 96, 60, 50, i === S.sel); icon17(k, x + 30, 118, T); }); }
  },
  hud(S, mode) {
    txt('LV ' + S.lvl, 4, 4, W, 8); txt('KILLS ' + S.kills, 252, 4, Y, 8, 'right');
    if (S.boss && S.boss.hp > 0) txt('HIVE QUEEN', 128, 202, PK, 8, 'center');
    if (mode === 'play' && S.T < 7) txt('MOVE: ARROWS  (SHOOTS ITSELF)', 128, 192, W, 8, 'center');
    if (S.menu) { txt('LEVEL UP! CHOOSE', 128, 76, Y, 8, 'center'); S.menu.forEach((k, i) => { const x = 32 + i * 66; txt(UP17[k], x + 30, 100, W, 8, 'center'); txt('LV ' + (S.lv[k] + 1), x + 30, 134, CY, 8, 'center'); }); }
  },
  drawHD(S, g, mode) { this.drawHDb(S, g, mode); PIXPASS(g); },
  drawHDb(S, g, mode) {
    const T = S.T, p = S.p, dt = 1 / 60, clampv = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    if (!S.hd) S.hd = { parts:[], ghosts:[], nums:[], vis:new WeakMap(), last:null, zoom:0, shake:0, xp:0, hp:100, hpg:100, lvl:1, boss:0, kick:0, mzp:0, px:p.x, py:p.y, puff:0, xpf:0, kp:0, kills:0, rings:[] };
    const hd = S.hd, win = S.win > 0, boss = S.boss;
    /* ---- visual event detection ---- */
    if (S.lvl > hd.lvl) { hd.lvl = S.lvl; hd.zoom = 1; hd.xp = 0; hd.xpf = 1; hd.rings.push({ x:p.x, y:p.y, r:4, t:0.5, c:'120,230,255' }); HD.burst(hd.parts, p.x, p.y - 6, '#9be8ff', 18, 70); }
    if (boss && !hd.boss) { hd.boss = 1; hd.shake = 1.6; hd.zoom = 0.8; hd.rings.push({ x:128, y:30, r:6, t:0.7, c:'255,60,60' }); }
    if (S.kills > hd.kills) { hd.kp = 1; hd.kills = S.kills; }
    const fired = S.mz > 0.06 && hd.mzp <= 0.06; hd.mzp = S.mz;
    if (fired) { hd.kick = 1; const fl0 = Math.cos(p.ang) < 0; hd.parts.push({ x:p.x, y:p.y - 4, vx:(fl0 ? 1 : -1) * (14 + vr() * 14), vy:-26 - vr() * 14, t:0.6, t0:0.6, c:'#f0c040', r:0.7, g:150 }); }
    hd.mov = Math.hypot(p.x - hd.px, p.y - hd.py) > 0.2; if (Math.hypot(p.x - hd.px, p.y - hd.py) > 0.4) { hd.puff += 1; if (hd.puff % 5 === 0) HD.burst(hd.parts, p.x, p.y + 8, 'rgba(210,210,200,0.55)', 2, 10, 1.4); } hd.px = p.x; hd.py = p.y;
    const last = S.dec[S.dec.length - 1];
    if (last && last !== hd.last) { HD.burst(hd.parts, last.x, last.y - 4, last.el ? '#c8a0e8' : '#8ee04e', 12, 60); hd.ghosts.push({ x:last.x, y:last.y, el:last.el, t:0.4, fl:last.x > p.x }); hd.last = last; hd.shake = Math.max(hd.shake, 0.12); }
    /* ---- smoothed UI values ---- */
    hd.xp += (S.xp / S.need - hd.xp) * 0.25; hd.hp += (p.hp - hd.hp) * 0.35; hd.hpg += (hd.hp - hd.hpg) * 0.04; if (hd.hpg < hd.hp) hd.hpg = hd.hp;
    hd.kick *= 0.78; hd.zoom *= 0.93; hd.shake *= 0.9; hd.kp *= 0.88; hd.xpf *= 0.9;
    /* ---- camera: lean toward hero, zoom pulses, boss-death push-in, shake ---- */
    let z = 1.045 + hd.zoom * 0.06, cx = 128 + (p.x - 128) * 0.035, cy = 112 + (p.y - 112) * 0.035;
    if (win && boss) { const k = 1 - S.win / 1.2; z += k * 0.5; cx += (boss.x - cx) * k * 0.7; cy += (boss.y - cy) * k * 0.7; hd.shake = Math.max(hd.shake, 1.2); if (S.win > 0.1) { HD.burst(hd.parts, boss.x + (vr() - 0.5) * 24, boss.y + (vr() - 0.5) * 20, vr() < 0.5 ? '#ffd060' : '#c864f0', 3, 90, 1.4); if ((S.T * 60 | 0) % 8 === 0) hd.rings.push({ x:boss.x, y:boss.y, r:5, t:0.6, c:'255,230,160' }); } }
    cx = clampv(cx, 128 / z, 256 - 128 / z); cy = clampv(cy, 112 / z, 224 - 112 / z);
    const shk = hd.shake * 1.7 + (p.inv > 0.45 ? 0.8 : 0);
    g.save(); g.translate(128 + (shk ? Math.sin(T * 91) * shk : 0), 112 + (shk ? Math.cos(T * 77) * shk : 0)); g.scale(z, z); g.translate(-cx, -cy);
    g.drawImage(roomHD(), 0, 0, 256, 224);
    for (const d of S.dec) { const c = d.el ? '170,110,200' : '110,200,70'; g.fillStyle = HD.rg(g, d.x, d.y, 0, 5.5, [[0, `rgba(${c},0.6)`], [1, `rgba(${c},0)`]]); g.beginPath(); g.ellipse(d.x, d.y, 6, 4, hash(d.k, 1) * 3, 0, 6.283); g.fill(); for (let k = 0; k < 3; k++) { g.fillStyle = `rgba(${c},0.55)`; g.beginPath(); g.arc(d.x + (hash(d.k, k) - 0.5) * 12, d.y + (hash(k, d.k) - 0.5) * 8, 0.9, 0, 6.283); g.fill(); } }
    for (const q of S.pel) { const bob = Math.sin(T * 5 + q.x) * 1, dd = Math.hypot(q.x - p.x, q.y - p.y); HD.shadow(g, q.x, q.y + 3, 3, 1.2, 0.4); g.save(); g.translate(q.x, q.y - 1 + bob); g.scale(1 + (dd < 28 ? 0.25 : 0), 1 + (dd < 28 ? 0.25 : 0)); g.beginPath(); g.moveTo(0, -3.2); g.lineTo(2.4, 0); g.lineTo(0, 3.2); g.lineTo(-2.4, 0); g.closePath(); g.fillStyle = HD.lg(g, -2, -3, 2, 3, [[0, '#d8fbff'], [1, '#2ab0e8']]); g.fill(); g.lineWidth = 0.4; g.strokeStyle = '#0a2a40'; g.stroke(); g.restore(); }
    for (const m of S.mines) { HD.shadow(g, m.x, m.y + 3, 4, 1.5, 0.4); HD.ball(g, m.x, m.y, 3.4, '#8a929c', '#20262e'); g.fillStyle = Math.floor(T * 10) & 1 ? '#ff3a3a' : '#ffe060'; g.beginPath(); g.arc(m.x, m.y, 1, 0, 6.283); g.fill(); }
    const aur = S.lv[1] ? 22 + S.lv[1] * 9 : 0;
    if (aur) { g.fillStyle = HD.rg(g, p.x, p.y, aur * 0.4, aur, [[0, 'rgba(120,220,255,0)'], [1, `rgba(120,220,255,${0.18 + 0.06 * Math.sin(T * 6)})`]]); g.beginPath(); g.arc(p.x, p.y, aur, 0, 6.283); g.fill(); g.strokeStyle = 'rgba(190,240,255,0.8)'; g.lineWidth = 0.8; g.setLineDash([3, 2]); g.lineDashOffset = -T * 12; g.stroke(); g.setLineDash([]); }
    for (const gh of hd.ghosts) { gh.t -= dt; if (gh.t > 0) { const k = gh.t / 0.4; drawZomR(g, gh.x, gh.y + 9 + (1 - k) * 2, gh.fl, gh.el, 1 + (1 - k) * 0.5, 0.25 + 0.75 * k * k, k, '#ffffff', k > 0.7 ? 0.9 : 0.2, T, Math.floor(T * 6)); } } hd.ghosts = hd.ghosts.filter(x => x.t > 0);
    const fr = Math.floor(T * 8) & 3, ents = S.en.map(e => ({ y:e.y, e })); ents.push({ y:p.y, pl:1 }); ents.sort((a, b) => a.y - b.y);
    for (const o of ents) {
      if (o.e) { const e = o.e; let v = hd.vis.get(e); if (!v) { v = { hp:e.hp, fl:0, kx:0, ky:0, sq:0 }; hd.vis.set(e, v); }
        if (e.hp < v.hp - 0.01) { const dmg = v.hp - e.hp; if (dmg >= 0.9) { v.fl = 0.1; v.sq = 1; const an = Math.atan2(e.y - p.y, e.x - p.x), kb = e.big ? 0.6 : 2.4; v.kx = Math.cos(an) * kb; v.ky = Math.sin(an) * kb; HD.burst(hd.parts, e.x, e.y - 6, '#ffe9a0', 4, 45, 0.8); if (hd.nums.length < 14) hd.nums.push({ x:e.x + (vr() - 0.5) * 6, y:e.y - (e.big ? 26 : 14), v:Math.round(dmg * 10), t:0.7, big:e.big }); if (e.big) hd.shake = Math.max(hd.shake, 0.35); } v.hp = e.hp; }
        v.fl -= dt; v.kx *= 0.8; v.ky *= 0.8; v.sq *= 0.84; const wob = Math.sin(T * 14 + e.x * 0.7) * 0.045, sy = 1 + wob - 0.22 * v.sq, sx = 1 - wob + 0.28 * v.sq, ex = e.x + v.kx, ey = e.y + v.ky;
        if (e.big) { HD.shadow(g, ex, ey + 17, 20, 5, 0.5); if (RIG.ready('queen')) RIG.draw(g, 'queen', ex, ey + 20, { sx:1 + 0.1 * v.sq, sy:1 - 0.08 * v.sq, tint:'#ffffff', ta:v.fl > 0 ? 0.8 : 0, pose:qPose(T) }); else HD.puts(g, queenHD(Math.floor(T * 6) & 1), ex, ey + 20, false, 1 + wob * 0.6 + 0.1 * v.sq, 1 - wob * 0.6 - 0.08 * v.sq, 1, '#ffffff', v.fl > 0 ? 0.8 : 0); if (e.hp < 100 && (Math.floor(T * 8) & 1)) HD.glow(g, ex, ey, 30, '255,40,30', 0.5); }
        else { HD.shadow(g, ex, ey + 9, 6, 2, 0.45); drawZomR(g, ex, ey + 9, e.x > p.x, e.el, sx, sy, 1, '#ffffff', v.fl > 0 ? 0.85 : 0, T, Math.floor(T * 6 + e.x)); } continue; }
      const blink = p.inv > 0 && (Math.floor(T * 20) & 1), fl = Math.cos(p.ang) < 0, sk = 1 - hd.kick * 0.06;
      HD.shadow(g, p.x, p.y + 8, 7, 2.4, 0.5); g.strokeStyle = 'rgba(120,230,255,0.85)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(p.x, p.y + 8, 9, 3.4, 0, 0, 6.283); g.stroke(); HD.glow(g, p.x, p.y, 16, '90,200,255', 0.22);
      if (RIG.ready('hero')) { let la = fl ? Math.PI - p.ang : p.ang; la = Math.max(-1.2, Math.min(1.2, Math.atan2(Math.sin(la), Math.cos(la)))); RIG.draw(g, 'hero', p.x, p.y + 8, { flip:fl, sx:1 + hd.kick * 0.05, sy:sk, a:blink ? 0.55 : 1, tint:'#ff5040', ta:p.inv > 0.4 ? 0.55 : 0, pose:hPose(T, hd.mov, la, hd.kick) }); } else HD.puts(g, heroHD(fr), p.x, p.y + 8, fl, 1 + hd.kick * 0.05, sk, blink ? 0.55 : 1, '#ff5040', p.inv > 0.4 ? 0.55 : 0);
      if (!RIG.ready('hero')) { g.save(); const kb = hd.kick * 1.8; g.translate(p.x + (fl ? -1.5 : 1.5) - Math.cos(p.ang) * kb, p.y - 1 - Math.sin(p.ang) * kb); g.rotate(p.ang); if (fl) g.scale(1, -1); g.drawImage(gunHD(), -2, -3, 16, 6); g.restore(); }
    }
    for (const s of S.sh) { g.strokeStyle = 'rgba(255,200,60,0.55)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(s.x - s.vx * 0.045, s.y - s.vy * 0.045); g.lineTo(s.x, s.y); g.stroke(); g.strokeStyle = '#fff6b0'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(s.x - s.vx * 0.02, s.y - s.vy * 0.02); g.lineTo(s.x, s.y); g.stroke(); HD.glow(g, s.x, s.y, 5, '255,210,80', 0.7); }
    for (const f of S.fx) { if (f.o) { HD.ball(g, f.x, f.y, 3, '#ffffff', '#8ad8ff'); HD.glow(g, f.x, f.y, 9, '130,220,255', 0.6); } else if (f.r && !f.dmg) { const r = Math.max(2, f.r * (1 - f.t * 2) + 4); g.fillStyle = HD.rg(g, f.x, f.y, 0, r, [[0, 'rgba(255,255,230,0.95)'], [0.35, 'rgba(255,190,50,0.9)'], [0.75, 'rgba(230,70,20,0.6)'], [1, 'rgba(120,20,10,0)']]); g.beginPath(); g.arc(f.x, f.y, r, 0, 6.283); g.fill(); if (f.r > 30) hd.shake = Math.max(hd.shake, 0.5); } }
    for (const r of hd.rings) { r.t -= dt; r.r += 150 * dt; if (r.t > 0) { g.strokeStyle = `rgba(${r.c},${Math.min(1, r.t * 2.4)})`; g.lineWidth = 1.6; g.beginPath(); g.arc(r.x, r.y, r.r, 0, 6.283); g.stroke(); } } hd.rings = hd.rings.filter(r => r.t > 0);
    HD.parts(g, hd.parts);
    for (const n of hd.nums) { n.t -= dt; HD.num(g, String(n.v), n.x, n.y - (0.7 - n.t) * 16, n.big ? '#ff9a50' : '#fff2a0', n.big ? 7 : 5, Math.min(1, n.t * 3)); } hd.nums = hd.nums.filter(n => n.t > 0);
    HD.beginLight('rgba(3,6,12,0.42)'); HD.addLight(p.x, p.y - 4, 125, 1); for (let i = 0; i < 5; i++) HD.addLight(17.5 + i * 50, 16, 46, 0.55); HD.addLight(22, 22, 24, 0.4); HD.addLight(234, 178, 24, 0.4);
    for (const q of S.pel.slice(0, 40)) HD.addLight(q.x, q.y, 11, 0.5); for (const f of S.fx) if (f.r && !f.dmg) HD.addLight(f.x, f.y, f.r * 1.6, 0.9); for (const s of S.sh.slice(0, 20)) HD.addLight(s.x, s.y, 12, 0.5); if (S.mz > 0) HD.addLight(p.x, p.y, 40, 0.8); if (win && boss) HD.addLight(boss.x, boss.y, 90, 0.9);
    HD.endLight(g);
    HD.glow(g, 22, 22, 14, '90,230,255', 0.22); HD.glow(g, 234, 178, 14, '120,255,110', 0.22); for (const q of S.pel.slice(0, 40)) HD.glow(g, q.x, q.y, 6, '90,210,255', 0.35); if (S.mz > 0) HD.glow(g, p.x + Math.cos(p.ang) * 12, p.y - 1 + Math.sin(p.ang) * 12, 14, '255,210,90', 0.8);
    g.restore();
    /* screen-space overlays */
    if (p.inv > 0.3) { g.fillStyle = HD.rg(g, 128, 112, 70, 170, [[0, 'rgba(200,0,0,0)'], [1, 'rgba(220,20,20,0.5)']]); g.fillRect(0, 0, 256, 224); }
    g.fillStyle = HD.rg(g, 128, 112, 100, 190, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.2)']]); g.fillRect(0, 0, 256, 224);
    if (hd.zoom > 0.3) { g.fillStyle = `rgba(190,240,255,${(hd.zoom - 0.3) * 0.18})`; g.fillRect(0, 0, 256, 224); }
    if (win && boss) { const k = 1 - S.win / 1.2; g.fillStyle = `rgba(255,255,255,${Math.max(0, 0.7 * Math.sin(k * 14) * (1 - k))})`; g.fillRect(0, 0, 256, 224); }
    /* animated HUD */
    HD.bar(g, 40, 4, 56, 6, hd.xp, '#7aeaff', '#1a7ab8'); if (hd.xpf > 0.05) { HD.rr(g, 40, 4, 56, 6, 2); g.fillStyle = `rgba(255,255,255,${hd.xpf * 0.8})`; g.fill(); }
    g.fillStyle = '#ff6a8a'; g.beginPath(); g.arc(103, 7, 3 + (hd.hpg - hd.hp > 1 ? 0.8 : 0), 0, 6.283); g.fill(); HD.bar(g, 112, 4, 54, 6, hd.hp / 100, '#ff5a50', '#a01818');
    if (hd.hpg > hd.hp + 0.2) { g.fillStyle = 'rgba(255,230,230,0.85)'; g.fillRect(112 + 54 * hd.hp / 100, 4, 54 * (hd.hpg - hd.hp) / 100, 6); }
    if (hd.kp > 0.05) HD.glow(g, 222, 8, 26, '255,200,60', hd.kp * 0.35);
    if (boss && boss.hp > 0) HD.bar(g, 64, 212, 128, 6, boss.hp / 300, '#c46af0', '#5a1a8a');
    if (S.menu) { g.fillStyle = 'rgba(0,4,10,0.7)'; g.fillRect(0, 0, 256, 224); HD.rr(g, 24, 70, 208, 84, 5); g.fillStyle = HD.lg(g, 0, 70, 0, 154, [[0, '#1c2c48'], [1, '#0c1424']]); g.fill(); g.lineWidth = 1; g.strokeStyle = '#6ad8ff'; g.stroke();
      S.menu.forEach((k, i) => { const x = 32 + i * 66, on = i === S.sel; HD.rr(g, x, 96, 60, 50, 4); g.fillStyle = HD.lg(g, 0, 96, 0, 146, on ? [[0, '#6a4a1a'], [1, '#3a2408']] : [[0, '#2c3a52'], [1, '#161e2e']]); g.fill(); g.lineWidth = on ? 1.4 : 0.7; g.strokeStyle = on ? '#ffd84a' : '#4a5a74'; g.stroke(); if (on) HD.glow(g, x + 30, 121, 40, '255,200,60', 0.25); iconHD(g, k, x + 30, 118, T); }); }
  },
  bot(S, i) {
    const p = S.p;
    if (S.menu) { if (S.mt > 0.45) { const pr = [1, 3, 2, 0], k = S.menu.slice().sort((x, y) => S.lv[x] - S.lv[y] || pr.indexOf(x) - pr.indexOf(y))[0]; const s = S.menu.indexOf(k); const on = Math.floor(S.mt * 30) % 2; if (s > S.sel) i.r = on; else if (s < S.sel) i.l = on; else i.a = 1; } return i; }
    let fx = 0, fy = 0;
    for (const e of S.en) { const dx = p.x - e.x, dy = p.y - e.y, d2 = dx * dx + dy * dy + 1; if (d2 < 3600) { fx += dx / d2 * (e.big ? 1.2 : 1); fy += dy / d2 * (e.big ? 1.2 : 1); } }
    let tx = 0, ty = 0; const c = S.pel.find(q => Math.hypot(q.x - p.x, q.y - p.y) < 70); if (c) { tx = (c.x - p.x) * 0.002; ty = (c.y - p.y) * 0.002; }
    fx += tx + (128 - p.x) * 0.00012; fy += ty + (112 - p.y) * 0.00012;
    if (p.x < 24) fx += 0.01; if (p.x > 232) fx -= 0.01; if (p.y < 36) fy += 0.01; if (p.y > 190) fy -= 0.01;
    return dirInp(i, Math.abs(fx) > 0.0004 ? Math.sign(fx) : 0, Math.abs(fy) > 0.0004 ? Math.sign(fy) : 0);
  },
  info: S => ({ lvl:S.lvl, hp:Math.round(S.p.hp), en:S.en.length, boss:S.boss ? Math.round(S.boss.hp) : -1, lv:S.lv.join(''), px:Math.round(S.p.x), py:Math.round(S.p.y), bx:S.boss ? Math.round(S.boss.x) : -1, by:S.boss ? Math.round(S.boss.y) : -1, cam:S.hd && S.hd.cam ? S.hd.cam : null, hh:window.HD_H || 224 }),
});
