// KEYS: Arrows move (auto-fire), Z/Space or X pick an upgrade when the level bar fills (Left/Right to choose).
/* ===== VAMPIRE METROID: bounty hunter vs. endless cave bugs. Auto-fire, pellets, level-up picks, boss melt. ===== */
const UP17 = ['SPAZER', 'ICE AURA', 'MINES', 'SCREW'];

/* ---- art: hive-lab room, shaded sprites, fog-of-war vignette ---- */
const HERO17 = ['..BBBB..', '.BCCCCB.', '.BCWWCB.', '..BBBB..', '.YBBBBY.', 'YYBLLBYY', '.BBBBBB.', '.MMMMMM.', '.BB..BB.', '.NN..NN.', '.KK..KK.'];
const ZOM17 = ['..EEEE..', '.EEEEEE.', '.EYEEYE.', '.EEKKEE.', '..EEEE..', '.LLLLLL.', 'ELLLLLLE', 'E.LLLL.E', '..DDDD..'];
const ZLEG17 = [['..D..D..', '.DD..DD.'], ['..DD.D..', '.D...DD.']];
let BG17 = null;
function bg17() {
  if (BG17) return BG17;
  clear(DG);
  for (let y = 16; y < 208; y += 16) for (let x = 0; x < 256; x += 16) {
    rect(x, y, 16, 1, K); rect(x, y, 1, 16, K);
    for (let k = 2; k < 15; k += 2) { px(x + k, y + 1, D); px(x + 1, y + k, D); }
    const h = hash(x, y);
    if (h < 0.18) for (let j = 0; j < 7; j++) for (let i = 0; i < 9; i++) if (((i + j) & 1) && hash(x + i, y + j) < 0.8) px(x + 3 + i, y + 4 + j, F);
    if (h > 0.9) { rect(x + 3, y + 5, 6, 1, K); rect(x + 8, y + 6, 4, 1, K); rect(x + 11, y + 7, 2, 2, K); }
  }
  for (let k = 0; k < 8; k++) { const x = 24 + hash(k, 3) * 208, y = 40 + hash(k, 5) * 150;
    for (let j = -5; j <= 5; j++) for (let i = -6; i <= 6; i++) { const d = i * i / 36 + j * j / 25; if (d < 1 && (d < 0.45 || ((i + j) & 1))) px(x + i, y + j, d < 0.45 ? R : M); } }
  rect(0, 0, 256, 16, M);
  for (let r = 0; r < 4; r++) for (let x = -(r & 1) * 8; x < 256; x += 16) { rect(x + 1, r * 4 + 1, 14, 3, BRK); rect(x + 1, r * 4 + 1, 14, 1, T); }
  rect(0, 14, 256, 2, K);
  for (let i = 0; i < 5; i++) { const x = 10 + i * 50; rect(x, 2, 15, 13, DG); rect(x, 2, 15, 1, L); rect(x, 2, 1, 13, L); rect(x + 2, 4, 11, 1, K); rect(x + 2, 6, 11, 1, K); rect(x + 2, 8, 11, 1, K); rect(x + 11, 11, 2, 2, Y); }
  rect(0, 208, 256, 16, M);
  for (let r = 0; r < 3; r++) for (let x = -(r & 1) * 8; x < 256; x += 16) { rect(x + 1, 212 + r * 4, 14, 3, BRK); rect(x + 1, 212 + r * 4, 14, 1, T); }
  for (let x = 0; x < 256; x += 8) { rect(x, 208, 4, 3, Y); rect(x + 4, 208, 4, 3, K); }
  for (const sx of [0, 250]) { rect(sx, 16, 6, 192, N); rect(sx + (sx ? 0 : 5), 16, 1, 192, K); rect(sx + 2, 16, 3, 192, D); rect(sx + 2, 16, 1, 192, L);
    for (let y = 24; y < 208; y += 40) { rect(sx, y, 6, 3, L); rect(sx, y + 3, 6, 1, K); } }
  for (const [tx, ty] of [[10, 22], [222, 178]]) { rect(tx, ty + 9, 3, 6, M); rect(tx + 21, ty + 9, 3, 6, M); rect(tx, ty + 4, 24, 6, M); rect(tx, ty, 24, 5, T); rect(tx, ty, 24, 1, S);
    rect(tx + 3, ty - 5, 3, 5, CY); rect(tx + 4, ty - 7, 1, 2, W); rect(tx + 10, ty - 4, 3, 4, E); rect(tx + 16, ty - 6, 3, 6, PK); px(tx + 4, ty - 3, W); px(tx + 11, ty - 2, V); }
  rect(228, 22, 14, 14, BRK); rect(228, 22, 14, 2, T); rect(228, 34, 14, 2, M); rect(228, 22, 2, 14, M); rect(240, 22, 2, 14, M); rect(231, 27, 8, 1, M);
  fillCircle(20, 186, 6, T); fillCircle(20, 186, 5, BRK); rect(14, 184, 13, 1, M); rect(14, 188, 13, 1, M);
  BG17 = buf.slice(); return BG17;
}
function splat17(d) {
  const c = d.el ? PU : GR, c2 = d.el ? PK : E, x = Math.round(d.x), y = Math.round(d.y);
  fillCircle(x, y, 3, c); fillCircle(x - 1, y - 1, 1, c2);
  for (let k = 0; k < 4; k++) px(x + Math.round((hash(d.k, k) - 0.5) * 14), y + Math.round((hash(k, d.k) - 0.5) * 10), c);
}
function drawZom17(e, T) {
  const x = Math.round(e.x), y = Math.round(e.y), w = Math.floor(T * 6 + x) & 1, pal = e.el ? { E:PK, L:PU, Y:R } : null;
  rect(x - 4, y + 5, 8, 2, K); spr(ZOM17, x - 4, y - 5, e.x < 128 ? 0 : 1, pal); spr(ZLEG17[w], x - 4, y + 4, 0, pal);
}
function drawQueen17(e, T) {
  const x = Math.round(e.x), y = Math.round(e.y), w = Math.floor(T * 6) & 1;
  rect(x - 14, y + 11, 29, 4, K);
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { const lx = x + sd * (8 + k * 3), ly = y + 2 + k * 4 + (w && k === 1 ? 1 : 0); rect(Math.min(lx, lx + sd * 6), ly, 7, 2, D); rect(lx + sd * 6, ly - 2, 2, 5, L); }
  fillCircle(x, y + 6, 7, M); fillCircle(x, y, 12, M); fillCircle(x, y - 1, 10, PU); fillCircle(x - 3, y - 5, 4, PK); fillCircle(x + 4, y + 3, 4, M);
  rect(x - 7, y - 5, 5, 5, Y); rect(x + 3, y - 5, 5, 5, Y); rect(x - 5, y - 4, 2, 3, R); rect(x + 5, y - 4, 2, 3, R); px(x - 6, y - 5, W); px(x + 4, y - 5, W);
  rect(x - 5, y + 3, 2, 5, W); rect(x + 4, y + 3, 2, 5, W); rect(x - 2, y + 6, 5, 1, K);
  for (const [dx, h] of [[-7, 4], [-1, 6], [5, 4]]) { rect(x + dx, y - 11 - h, 3, h + 2, PU); rect(x + dx, y - 11 - h, 3, 2, Y); }
  if (e.hp < 100 && (Math.floor(T * 8) & 1)) for (let k = 0; k < 10; k++) px(x + Math.cos(k * 0.63) * 13, y + Math.sin(k * 0.63) * 13, R);
}
function bar17(x, y, w, v, col, hi) { rect(x - 1, y - 1, w + 2, 8, K); rect(x, y, w, 6, DG); const f = Math.round(w * Math.max(0, Math.min(1, v))); rect(x, y, f, 6, col); rect(x, y, f, 2, hi); }
function icon17(k, cx, cy, T) {
  if (k === 0) { for (const a of [-0.45, 0, 0.45]) for (let i = 0; i < 4; i++) rect(cx - 8 + i * 4, cy + Math.round(Math.sin(a) * (i * 4 - 2)) - 1, 3, 3, i === 3 ? W : Y); }
  else if (k === 1) { for (let a = 0; a < 6.28; a += 0.14) px(cx + Math.cos(a + T) * 9, cy + Math.sin(a + T) * 9, CY); fillCircle(cx, cy, 3, W); }
  else if (k === 2) { fillCircle(cx, cy, 6, D); fillCircle(cx, cy, 4, DG); rect(cx - 1, cy - 1, 3, 3, Math.floor(T * 5) & 1 ? R : Y); }
  else { for (let a = 0; a < 4; a++) { const an = T * 3 + a * 1.57; rect(cx + Math.cos(an) * 8 - 1, cy + Math.sin(an) * 8 - 1, 3, 3, W); } fillCircle(cx, cy, 2, CY); }
}
const GAME = kit({ id:'g17', t1:'VAMPIRE', t2:'METROID', sub:'SURVIVE. LEVEL. MELT THE HIVE.', seed:171, off:17, secs:48,
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
    const p = S.p, T = S.T; buf.set(bg17());
    for (const d of S.dec) splat17(d);
    for (const q of S.pel) { const bob = Math.floor(T * 4 + q.x) & 1; rect(q.x - 2, q.y + 3, 5, 1, K); rect(q.x - 2, q.y - 2 - bob, 5, 5, CY); rect(q.x - 1, q.y - 1 - bob, 2, 2, W); px(q.x + 1, q.y + 1 - bob, B); }
    for (const m of S.mines) { fillCircle(m.x, m.y, 3, D); fillCircle(m.x, m.y, 2, DG); rect(m.x - 1, m.y - 1, 2, 2, Math.floor(T * 10) & 1 ? R : Y); }
    const aur = S.lv[1] ? 22 + S.lv[1] * 9 : 0;
    if (aur) for (let k = 0; k < 90; k++) { const an = k * 0.0698 + T; px(p.x + Math.cos(an) * aur, p.y + Math.sin(an) * aur, k % 3 ? CY : W); if (k % 2) px(p.x + Math.cos(an) * (aur - 3), p.y + Math.sin(an) * (aur - 3), SKY); }
    const ents = S.en.map(e => ({ y:e.y, e })); ents.push({ y:p.y, pl:1 }); ents.sort((a, b) => a.y - b.y);
    for (const o of ents) {
      if (o.e) { if (o.e.big) drawQueen17(o.e, T); else drawZom17(o.e, T); continue; }
      const bl = p.inv > 0 && (Math.floor(T * 20) & 1), fl = Math.cos(p.ang) < 0, cx = Math.round(p.x), cy = Math.round(p.y);
      for (let k = 0; k < 14; k++) px(cx + Math.cos(k * 0.449 + T * 2) * 9, cy + 4 + Math.sin(k * 0.449 + T * 2) * 4, SKY); rect(cx - 4, cy + 5, 9, 2, K); if (bl) continue;
      spr(HERO17, cx - 4, cy - 6, 0);
      for (let k = 3; k < 10; k++) px(cx + Math.cos(p.ang) * k, cy - 1 + Math.sin(p.ang) * k, k > 8 ? L : D);
      if (S.mz > 0) { const gx = cx + Math.cos(p.ang) * 11, gy = cy - 1 + Math.sin(p.ang) * 11; fillCircle(gx, gy, 2, Y); px(gx, gy, W); }
    }
    for (const s of S.sh) { rect(s.x - 1, s.y - 1, 3, 3, Y); px(s.x - s.vx * 0.025, s.y - s.vy * 0.025, O); px(s.x - s.vx * 0.05, s.y - s.vy * 0.05, D); }
    for (const f of S.fx) { if (f.o) { fillCircle(f.x, f.y, 3, W); px(f.x, f.y, CY); px(f.x + 2, f.y - 2, CY); } else if (f.r && !f.dmg) { const r = Math.round(f.r * (1 - f.t * 2) + 4); fillCircle(f.x, f.y, r, R); fillCircle(f.x, f.y, Math.max(1, r - 3), O); fillCircle(f.x, f.y, Math.max(1, r - 6), Y); if (r > 9) fillCircle(f.x, f.y, r - 9, W); } }
    for (let y = 0; y < 224; y++) for (let x = 0; x < 256; x++) { const dx = x - p.x, dy = y - p.y, d = dx * dx + dy * dy; if (d > 14400 && (d > 27225 ? (x + y) & 1 : (x & 1) & (y & 1))) buf[y * 256 + x] = K; }
    if (p.inv > 0.3) { rect(0, 0, 256, 2, R); rect(0, 222, 256, 2, R); rect(0, 0, 2, 224, R); rect(254, 0, 2, 224, R); }
    bar17(40, 4, 56, S.xp / S.need, CY, W); rect(101, 4, 3, 3, PK); rect(105, 4, 3, 3, PK); rect(102, 7, 5, 2, R); bar17(112, 4, 54, p.hp / 100, R, PK);
    if (S.boss && S.boss.hp > 0) bar17(64, 212, 128, S.boss.hp / 300, PU, PK);
    if (S.menu) {
      for (let y = 0; y < 224; y++) for (let x = (y & 1); x < 256; x += 2) buf[y * 256 + x] = K;
      rect(22, 68, 212, 88, W); rect(24, 70, 208, 84, N); rect(24, 70, 208, 2, B);
      S.menu.forEach((k, i) => { const x = 32 + i * 66, on = i === S.sel; rect(x - 2, 94, 64, 54, on ? Y : DG); rect(x, 96, 60, 50, on ? BRK : D); rect(x, 96, 60, 2, on ? Y : L); icon17(k, x + 30, 118, T); });
    }
  },
  hud(S, mode) {
    txt('LV ' + S.lvl, 4, 4, W, 8); txt('KILLS ' + S.kills, 252, 4, Y, 8, 'right');
    if (S.boss && S.boss.hp > 0) txt('HIVE QUEEN', 128, 202, PK, 8, 'center');
    if (mode === 'play' && S.T < 7) txt('MOVE: ARROWS  (SHOOTS ITSELF)', 128, 192, W, 8, 'center');
    if (S.menu) { txt('LEVEL UP! CHOOSE', 128, 76, Y, 8, 'center'); S.menu.forEach((k, i) => { const x = 32 + i * 66; txt(UP17[k], x + 30, 100, W, 8, 'center'); txt('LV ' + (S.lv[k] + 1), x + 30, 134, CY, 8, 'center'); }); }
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
  info: S => ({ lvl:S.lvl, hp:Math.round(S.p.hp), en:S.en.length, boss:S.boss ? Math.round(S.boss.hp) : -1, lv:S.lv.join('') }),
});
