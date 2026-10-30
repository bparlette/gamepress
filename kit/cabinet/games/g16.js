// KEYS: Arrows move, Z/Space whip (empty-handed), X scan for relics. Haul 3 relics to the carriage; light freezes the stalker.
/* ===== LETHAL CASTLEVANIA: gothic catacomb haul in the dark. Heavy relics slow you; a ceiling stalker takes your crew. ===== */
const WW16 = 820, GY16 = 170, Q16 = 4;
const cam16 = S => clamp(Math.round(S.p.x - 128), 0, WW16 - 256);
function lit16(S, x, y) { /* world point lit by lantern or flashlight? */
  const p = S.p, dx = x - p.x, dy = y - (GY16 - 14), l = S.fl ? 0 : 36 + 90 * S.bat;
  return dx * dx + dy * dy < 400 * (0.5 + S.bat * 0.5) || (dx * p.f > 0 && dx * p.f < l && Math.abs(dy) < 4 + dx * p.f * 0.4) || (x < 70 && (x - 24) ** 2 + dy * dy < 1600);
}
const GAME = kit({ id:'g16', t1:'LETHAL', t2:'CASTLEVANIA', sub:'GRAB RELICS. FEAR THE DARK.', seed:161, off:16, secs:50,
  music:MUS(104, -26, true),
  setup(S) {
    S.p = { x:60, f:1, c:-1, stun:0, whip:0 }; S.co = { x:50, c:-1, gone:0 }; S.dem = { on:0, x:0, y:-20, hid:0, frz:0 };
    S.rel = []; for (let i = 0; i < 5; i++) S.rel.push({ x:140 + i * 100 + rint(S, 50), st:0 });
    S.dep = 0; S.left = 70; S.bat = 1; S.spT = 8 + S.rng() * 3; S.scan = 0; S.scd = 0; S.fl = 0;
  },
  step(S, dt, inp, att) {
    const p = S.p, co = S.co, d = S.dem, wa = S.edge(inp, 'a');
    S.left -= dt; S.bat = Math.max(0.25, S.bat - dt * 0.009); p.stun = Math.max(0, p.stun - dt); S.scd = Math.max(0, S.scd - dt); S.scan = Math.max(0, S.scan - dt); p.whip = Math.max(0, p.whip - dt);
    S.fl = hash(Math.floor(S.T * 10), 5) < 0.2 * (1.3 - S.bat) ? 1 : 0;
    if (S.left <= 0) { sfx('over'); return finish(S, 'TIME UP'); }
    const dx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    if (dx && !p.stun) { p.f = dx; p.x = clamp(p.x + dx * (p.c >= 0 ? 34 : 60) * dt, 8, WW16 - 8); }
    if (inp.b && S.scd <= 0) { S.scan = 1.5; S.scd = 5; sfx('beep'); }
    if (wa && p.c < 0 && !p.stun) { p.whip = 0.2; sfx('swing'); if (d.on && d.y > 100 && (d.x - p.x) * p.f > 0 && Math.abs(d.x - p.x) < 36) { d.frz = 1.6; sfx('hit'); } }
    const carrier = (who, x) => { for (const r of S.rel) if (r.st === 0 && Math.abs(r.x - x) < 8 && who.c < 0) { who.c = S.rel.indexOf(r); r.st = 1; sfx('catch'); } if (who.c >= 0) { S.rel[who.c].x = x; if (x < 46) { S.rel[who.c].st = 2; who.c = -1; S.dep++; S.score += 100; popup(S, 'RELIC SAVED ' + S.dep + '/' + Q16, 128, 90); sfx('coin'); } } };
    carrier(p, p.x);
    if (!co.gone) { /* companion: fetch relics, panic when stalker is near */
      let t = null; for (const r of S.rel) if (r.st === 0 && (!t || Math.abs(r.x - co.x) < Math.abs(t.x - co.x))) t = r;
      const dir = co.c >= 0 ? -1 : t ? Math.sign(t.x - co.x) : 0; co.x += dir * (co.c >= 0 ? 30 : 46) * dt; carrier(co, co.x);
    }
    S.spT -= dt;
    if (!d.on && S.spT <= 0) { d.on = 1; d.x = co.gone ? clamp(p.x + 110, 60, WW16) : co.x; d.y = -20; sfx('boom'); }
    if (d.on) {
      d.frz = Math.max(0, d.frz - dt);
      if (d.hid > 0) { d.hid -= dt; if (d.hid <= 0) { d.x = clamp(p.x + 110, 60, WW16); d.y = -20; } }
      else if (d.y < GY16 - 14) d.y += 150 * dt;
      else {
        if (!co.gone && Math.abs(d.x - co.x) < 30) { co.gone = 1; if (co.c >= 0) { S.rel[co.c].st = 0; co.c = -1; } popup(S, 'AAAAH!', 128, 60, R); sfx('hurt'); d.x = co.x; }
        const seen = lit16(S, d.x, d.y) && Math.abs(d.x - p.x) < 130;
        if (!seen && !d.frz) d.x += Math.sign(p.x - d.x) * 31 * dt;
        if (Math.abs(d.x - p.x) < 9 && !p.stun) { if (p.c >= 0) { S.rel[p.c].st = 0; p.c = -1; } p.stun = 1; d.hid = 4; d.y = -20; popup(S, 'DROPPED!', 128, 70, R); sfx('hurt'); }
      }
    }
    if (S.dep >= Q16) { sfx('win'); return finish(S, 'QUOTA CLEAR!', Math.round(S.left) * 10); }
  },
  draw(S) {
    const p = S.p, cam = cam16(S);
    clear(N);
    for (let x = -(cam % 24); x < 256; x += 24) { rect(x + 8, 20, 8, 150, DG); rect(x + 6, 20, 12, 6, D); rect(x + 4, 150, 16, 20, D); }
    for (let y = 30; y < 160; y += 16) for (let x = -(cam % 16) - 16; x < 256; x += 16) rect(x + ((y >> 4) & 1) * 8, y, 1, 15, N);
    rect(0, GY16, 256, 54, BRK); rect(0, GY16, 256, 3, M);
    for (let x = -(cam % 20); x < 256; x += 20) rect(x, GY16 + 10, 1, 40, M);
    const cx = -cam; /* carriage */
    rect(cx + 6, GY16 - 34, 40, 26, R); rect(cx + 10, GY16 - 30, 12, 12, Y); rect(cx + 28, GY16 - 30, 12, 12, Y); rect(cx + 8, GY16 - 8, 12, 10, K); rect(cx + 32, GY16 - 8, 12, 10, K); rect(cx + 2, GY16 - 40, 48, 6, K);
    for (const r of S.rel) if (r.st < 2) { const x = Math.round(r.x - cam), y = GY16 - 12 - (r.st ? 8 : 0); rect(x - 1, y + 4, 6, 8, Y); rect(x - 3, y + 8, 10, 3, Y); rect(x + 1, y - 2, 2, 6, Y); px(x + 2, y - 3, O); }
    if (!S.co.gone) { const x = Math.round(S.co.x - cam); rect(x - 3, GY16 - 14, 7, 14, PU); fillCircle(x, GY16 - 17, 3, PK); }
    const px0 = Math.round(p.x - cam), f = p.f;
    rect(px0 - 3, GY16 - 18, 7, 18, p.stun > 0 ? R : B); rect(px0 - 2, GY16 - 24, 5, 6, L); rect(px0 - 3, GY16 - 25, 7, 2, W); if (p.c >= 0) rect(px0 - 4, GY16 - 28, 9, 4, Y);
    if (p.whip > 0) rect(px0 + (f > 0 ? 4 : -28), GY16 - 14, 24, 2, BRK);
    const d = S.dem; if (d.on && d.hid <= 0) { const x = Math.round(d.x - cam), y = Math.round(d.y); rect(x - 4, y - 14, 9, 22, K); rect(x - 8, y - 6, 3, 14, K); rect(x + 6, y - 6, 3, 14, K); rect(x, y - 2, 1, 40, K); }
    /* darkness */
    const len = S.fl ? 0 : 36 + 90 * S.bat, sy = GY16 - 14, r2 = 400 * (0.5 + S.bat * 0.5);
    for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
      const dx = x - px0, dy = y - sy, lx = x - 24 + cam;
      if (dx * dx + dy * dy < r2 || (dx * f > 0 && dx * f < len && Math.abs(dy) < 4 + dx * f * 0.4) || (lx < 46 && lx > -46 && lx * lx + (y - 150) * (y - 150) < 1600 && cam < 100)) continue;
      buf[y * VW + x] = K;
    }
    const d2 = S.dem; if (d2.on && d2.hid <= 0 && d2.y > 0) { const x = Math.round(d2.x - cam); px(x - 2, d2.y - 8, R); px(x + 2, d2.y - 8, R); }
  },
  hud(S, mode) {
    txt('RELICS ' + S.dep + '/' + Q16, 4, 4, Y, 8); txt('TIME ' + Math.ceil(S.left), 252, 4, S.left < 15 ? R : W, 8, 'right');
    rect(4, 16, 40, 5, DG); rect(4, 16, Math.round(40 * S.bat), 5, S.fl ? R : GR);
    if (S.p.c >= 0) txt('HEAVY! NO WHIP', 128, 28, Y, 8, 'center');
    if (S.scan > 0) for (const r of S.rel) if (r.st === 0) { const x = clamp(r.x - cam16(S), 6, 250); rect(x - 2, 40, 5, 5, Y); }
    if (mode === 'play' && S.T < 8) txt('ARROWS MOVE  Z WHIP  X SCAN', 128, 208, W, 8, 'center');
  },
  bot(S, i) {
    const p = S.p; let t = null;
    if (p.c >= 0) i.l = 1; else { for (const r of S.rel) if (r.st === 0 && (!t || r.x < t.x) && r.x - S.co.x > -30 || r.st === 0 && !t) t = r; if (t) { if (t.x > p.x + 2) i.r = 1; else if (t.x < p.x - 2) i.l = 1; } }
    if (S.dem.on && S.dem.hid <= 0 && p.c < 0 && Math.abs(S.dem.x - p.x) < 40) { i.a = 1; S.dem.x > p.x ? (i.r = 1, i.l = 0) : (i.l = 1, i.r = 0); }
    if (S.T % 9 < 0.1) i.b = 1;
    return i;
  },
  info: S => ({ dep:S.dep, left:Math.round(S.left), demon:S.dem.on, px:Math.round(S.p.x), carry:S.p.c }),
});
