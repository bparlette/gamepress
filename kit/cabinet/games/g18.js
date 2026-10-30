// KEYS: Left/Right move, Z/Space jump (hold in air to flutter), X tongue-grab the platform above. Climb to the star before the lava!
/* ===== TOWER OF YOSHI-ISH: no-checkpoint vertical climb, flutter jumps, tongue grabs, rising lava, 10 racers. ===== */
const ROWS18 = 34, RH18 = 32, GY18 = ROWS18 * RH18 + 40, CPAL = [R, Y, CY, PU, PK, O, GR, W, SKY, B];
const platX18 = (pl, t) => pl.cx + (pl.orb ? Math.sin(t * pl.w + pl.ph) * pl.orb : 0);
const GAME = kit({ id:'g18', t1:'TOWER OF', t2:'YOSHI', sub:'CLIMB. FLUTTER. DODGE THE LAVA.', seed:181, off:18, secs:50,
  music:MUS(132, -19, false),
  setup(S) {
    S.pl = []; let cx = 128;
    for (let i = 0; i < ROWS18; i++) { cx = clamp(cx + (S.rng() - 0.5) * 120, 80, 176); S.pl.push({ cx, y:GY18 - (i + 1) * RH18, wd:40, orb:i % 5 === 3 ? 26 : 0, w:1.4 + S.rng(), ph:S.rng() * 6, dx:0, col:CPAL[i % 10] }); }
    S.pl.push({ cx:128, y:GY18 - (ROWS18 + 1) * RH18, wd:60, orb:0, w:0, ph:0, dx:0, col:Y, star:1 });
    S.p = { x:128, y:GY18, vx:0, vy:0, g:1, fl:0, st:0, tg:0, tgp:null, tgt:null }; S.lava = GY18 + 90; S.bills = []; S.billT = 3; S.hit = 0; S.tc = 0;
    S.rac = []; for (let i = 0; i < 10; i++) S.rac.push({ x:80 + i * 10, y:GY18, v:i < 2 ? 24 + i * 3 : 14 + S.rng() * 14, fall:S.rng() * 20 + 5 + (i < 2 ? 40 : 0), dead:0, col:CPAL[i] });
    S.cam = GY18 - 150; S.best = 0;
  },
  step(S, dt, inp, att) {
    const p = S.p, a = S.edge(inp, 'a'), b = S.edge(inp, 'b'), T = S.T; S.lava -= (14 + T * 0.35) * dt; p.tg = Math.max(0, p.tg - dt); S.hit = Math.max(0, S.hit - dt);
    for (const pl of S.pl) { const nx = platX18(pl, T); pl.dx = nx - (pl.px === undefined ? nx : pl.px); pl.px = nx; pl.x = nx; }
    const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    if (S.hit <= 0) p.vx += (dir * (p.g ? 80 : 84) - p.vx) * Math.min(1, 12 * dt); else p.vx *= 0.9;
    if (a && p.g) { p.vy = -250; p.g = 0; p.fl = 0.55; sfx('flap'); }
    if (b && p.tc !== 1 && S.tc <= 0) { /* tongue: snap up to the nearest platform within reach */
      let best = null; for (const pl of S.pl) if (pl.y < p.y - 10 && pl.y > p.y - 78 && Math.abs(pl.x - p.x) < 46 && (!best || pl.y > best.y)) best = pl;
      if (best) { p.vy = -285; p.g = 0; p.tgt = best; p.tg = 0.18; S.tc = 1; sfx('throw'); }
    }
    S.tc = Math.max(0, S.tc - dt * 0.9);
    p.vy += (inp.a && !p.g && p.vy > 0 && p.fl > 0 ? 0 : 620) * dt; if (inp.a && !p.g && p.vy > 0 && p.fl > 0) { p.vy = Math.min(p.vy, 40); p.fl -= dt; }
    const oy = p.y; p.y += p.vy * dt; p.x = clamp(p.x + p.vx * dt, 40, 216); if (p.g && p.on) p.x += p.on.dx; p.g = 0; p.on = null;
    if (p.y >= GY18) { p.y = GY18; p.vy = 0; p.g = 1; }
    if (p.vy >= 0) for (const pl of S.pl) if (oy <= pl.y + 1 && p.y >= pl.y && Math.abs(p.x - pl.x) < pl.wd / 2 + 3) { p.y = pl.y; p.vy = 0; p.g = 1; p.on = pl; if (pl.star) { sfx('win'); return finish(S, 'SUMMIT CLEAR!', 500 + Math.round((S.lava < 0 ? 0 : 1) * 100)); } if (S.best < pl.y) S.best = pl.y; }
    S.score = Math.max(S.score, (GY18 - p.y) / 2);
    /* bullet bills */
    S.billT -= dt; if (S.billT <= 0) { S.billT = 3 + S.rng() * 2; const l = S.rng() < 0.5; S.bills.push({ x:l ? 20 : 236, y:p.y - 30 - S.rng() * 40, v:l ? 70 : -70 }); }
    for (const bl of S.bills) { bl.x += bl.v * dt; if (Math.abs(bl.x - p.x) < 9 && Math.abs(bl.y - (p.y - 6)) < 9) { if (p.vy > 60) { p.vy = -270; bl.x = -99; sfx('pop'); popup(S, 'BOUNCE!', p.x, p.y - 20, CY); } else if (!S.hit) { S.hit = 0.4; p.vx = bl.v * 1.5; p.vy = Math.max(p.vy, 0); sfx('hit'); } } }
    S.bills = S.bills.filter(bl => bl.x > 0 && bl.x < 256);
    for (const r of S.rac) if (!r.dead) { r.y -= r.v * dt; if (r.y < GY18 - ROWS18 * RH18 + 4) r.y = GY18 - ROWS18 * RH18 + 4; r.x = 88 + Math.sin(r.y * 0.05 + r.v) * 40; if (T > r.fall && r.y > GY18 - ROWS18 * RH18 + 10) r.dead = 1; if (r.y > S.lava) r.dead = 2; }
    else if (r.dead === 1) { r.y += 120 * dt; }
    if (p.y > S.lava) { sfx('die'); return finish(S, 'BURNED', 0); }
    S.cam += (p.y - 140 - S.cam) * Math.min(1, 6 * dt);
  },
  draw(S) {
    const c = Math.round(S.cam); clear(N);
    for (let y = 0; y < 224; y += 8) { const wy = y + c; rect(0, y, 36, 8, (wy >> 3) & 1 ? D : DG); rect(220, y, 36, 8, (wy >> 3) & 1 ? D : DG); if ((wy >> 4) % 6 === 0) { rect(36, y, 2, 8, PU); rect(218, y, 2, 8, CY); } }
    for (const pl of S.pl) { const y = pl.y - c; if (y < -20 || y > 230) continue; rect(pl.x - pl.wd / 2, y, pl.wd, 6, pl.col); rect(pl.x - pl.wd / 2, y + 6, pl.wd, 2, W); if (pl.star) { fillCircle(pl.x, y - 12, 8, Y); rect(pl.x - 2, y - 14, 5, 5, W); } if (pl.orb) rect(pl.x - 1, y + 8, 3, 3, W); }
    for (const r of S.rac) if (r.dead !== 2) { const y = r.y - c; rect(r.x - 3, y - 8, 7, 8, r.col); rect(r.x - 2, y - 7, 2, 2, W); }
    for (const bl of S.bills) { const y = bl.y - c; rect(bl.x - 6, y - 4, 12, 8, K); rect(bl.x - (bl.v > 0 ? -2 : 6), y - 2, 4, 4, W); rect(bl.x - (bl.v > 0 ? 8 : -6), y - 2, 3, 4, R); }
    const p = S.p, y = Math.round(p.y - c), x = Math.round(p.x), f = p.vx < -5 ? 1 : 0;
    if (p.tg > 0 && p.tgt) for (let t = 0; t < 12; t++) px(x + (p.tgt.x - x) * t / 12, y - 6 + (p.tgt.y - p.y + 6) * t / 12, PK);
    if (!(S.hit > 0 && (Math.floor(S.T * 20) & 1))) { rect(x - 4, y - 10, 9, 10, GR); rect(x - 3, y - 14, 7, 5, E); rect(x + (f ? -6 : 3), y - 12, 4, 3, W); px(x + (f ? -5 : 5), y - 11, K); rect(x - 4, y - 2, 3, 2, O); rect(x + 2, y - 2, 3, 2, O); if (p.fl > 0 && p.vy > 0 && p.vy < 50) { rect(x - 8, y - 8, 4, 2, W); rect(x + 5, y - 8, 4, 2, W); } }
    const ly = S.lava - c; if (ly < 224) { rect(0, ly, 256, 230 - ly, R); for (let i = 0; i < 256; i += 8) rect(i, ly - 2 + ((i + Math.floor(S.T * 8)) & 3), 6, 4, O); rect(0, ly + 6, 256, 224, R); }
  },
  hud(S, mode) {
    const h = clamp(Math.round((GY18 - S.p.y) / RH18), 0, ROWS18), alive = S.rac.filter(r => !r.dead).length;
    txt('FLOOR ' + h + '/' + ROWS18, 4, 4, W, 8); txt('RACERS ' + alive + '/10', 252, 4, Y, 8, 'right');
    rect(250, 20, 3, 190, DG); rect(249, Math.round(205 - 185 * h / ROWS18), 5, 5, GR);
    if (mode === 'play' && S.T < 8) txt('Z JUMP+HOLD FLUTTER  X TONGUE', 128, 208, W, 8, 'center');
  },
  bot(S, i) {
    const p = S.p; if (p.g || !S.tg2) { if (p.g) { const t = S.pl.filter(q => q.y < p.y - 8).sort((a, b) => b.y - a.y)[0]; S.tg2 = t; } }
    const t = S.tg2; if (!t) return i;
    if (t.x > p.x + 3) i.r = 1; else if (t.x < p.x - 3) i.l = 1;
    if (p.g) { if (S.ba) S.ba = 0; else if (Math.abs(t.x - p.x) < t.wd / 2 + 24 || p.y >= GY18) { i.a = 1; S.ba = 1; } }
    else { if (p.vy > 0 || S.ba) i.a = 1; if (p.vy > 140 && p.y - t.y < 70 && p.y > t.y + 8) i.b = 1; }
    return i;
  },
  info: S => ({ fl:Math.round((GY18 - S.p.y) / RH18), lava:Math.round(GY18 - S.lava), alive:S.rac.filter(r => !r.dead).length, y:Math.round(S.p.y) }),
});
