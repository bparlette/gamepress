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
