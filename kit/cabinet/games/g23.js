// KEYS: A cast, then HOLD A to reel (keep bobber in the green zone); LEFT/RIGHT walk the dock; B slash tentacles
/* ===== FISCH OF MANA: cast, then keep the bobber in the green zone to land fish. The 4th bite is a mythic Kraken! ===== */
const FISH23 = [['MINNOW', 0.2, 34, 8], ['SILVER BASS', 0.19, 28, 10], ['GOLD KOI', 0.17, 24, 14], ['MYTHIC KRAKEN', 0.12, 20, 40]], TX23 = [66, 104, 142], BY0 = 50, BY1 = 172;
const GAME = kit({
  id:'g23', t1:'FISCH', t2:'OF MANA', sub:'CAST. REEL. LAND THE KRAKEN.', seed:74, off:23, secs:60,
  music:MUS(112, -22, false),
  setup(S) { S.p = { x:70, f:1, sw:0 }; S.ph = 'idle'; S.n = 0; S.w = 0; S.by = 140; S.bv = 0; S.zc = 110; S.zt = 110; S.zt_ = 0; S.pr = 0; S.tn = []; S.tT = 2; S.hp = 3; S.sh = 0; S.got = []; S.fT = 0; },
  step(S, dt, inp) {
    const p = S.p, f = FISH23[S.n], pa = S.edge(inp, 'a'), pb = S.edge(inp, 'b'), boss = S.n === 3 && S.ph === 'fight'; p.sw = Math.max(0, p.sw - dt); S.sh = Math.max(0, S.sh - dt); S.fT += dt;
    if (S.ph === 'idle' || boss || S.ph === 'wait') p.x = clamp(p.x + (inp.r - inp.l) * 50 * dt, 52, 170);
    if (pb) { p.sw = 0.3; sfx('swing'); }
    if (S.ph === 'idle' && pa) { S.ph = 'wait'; S.w = 1.2 + S.rng() * 1.2; sfx('throw'); }
    else if (S.ph === 'wait') { S.w -= dt; if (S.w <= 0) { S.ph = 'fight'; S.pr = 0.1; S.by = 150; S.bv = 0; S.zc = 110; S.zt = 110; S.zt_ = 0; S.lim = 14; S.tT = 2; sfx('power'); popup(S, S.n === 3 ? 'IT\'S HUGE!' : 'BITE!', 128, 70, S.n === 3 ? R : Y); if (S.n === 3) S.sh = 1.2; } }
    else if (S.ph === 'fight') {
      S.bv += ((inp.a ? -260 : 200) - S.bv * 0) * dt * 1.6; S.bv = clamp(S.bv, -90, 90); S.by = clamp(S.by + S.bv * dt, BY0, BY1 - 10);
      S.zt_ -= dt; if (S.zt_ <= 0) { S.zt_ = 0.6 + S.rng() * 0.8; S.zt = BY0 + 20 + S.rng() * (BY1 - BY0 - 40); }
      S.zc += clamp(S.zt - S.zc, -1, 1) * f[2] * dt;
      const inz = Math.abs(S.by + 5 - S.zc) < f[3]; S.pr = clamp(S.pr + (inz ? f[1] : -0.16) * dt, 0, 1); S.lim -= dt; S.inz = inz;
      if (S.n === 3) {
        S.tT -= dt; if (S.tT <= 0) { S.tT = 1.7; S.tn.push({ x:TX23[rint(S, 3)], t:0 }); }
        for (let i = S.tn.length - 1; i >= 0; i--) { const t = S.tn[i]; t.t += dt;
          if (t.t > 0.9 && !t.hit) { t.hit = 1; S.sh = 0.3; sfx('boom'); if (Math.abs(p.x - t.x) < 20) { S.hp--; sfx('hurt'); popup(S, 'OUCH!', p.x, 150, R); if (S.hp <= 0) { if (S.att) S.hp = 3; else { endGame(S.score, 'KRAKEN WON'); return; } } } }
          if (t.hit && p.sw > 0.1 && Math.abs(p.x + p.f * 10 - t.x) < 26) { S.tn.splice(i, 1); S.pr = clamp(S.pr + 0.07, 0, 1); S.score += 30; sfx('punch'); continue; }
          if (t.t > 1.8) S.tn.splice(i, 1); }
      }
      if (S.pr >= 1) { S.score += 100 + S.n * 150; S.got.push(S.n); sfx(S.n === 3 ? 'win' : 'clear'); popup(S, f[0] + '!', 128, 70, Y); S.tn = []; S.n++; S.ph = 'idle'; if (S.n >= 4) return finish(S, 'KRAKEN LANDED!', 800 + S.hp * 200); }
      else if (S.lim <= 0 && S.n < 3) { popup(S, 'IT GOT AWAY', 128, 70, R); S.n++; S.ph = 'idle'; sfx('hurt'); }
    }
  },
  draw(S) {
    const sx = S.sh > 0 ? Math.round(Math.sin(S.fT * 80) * 3) : 0, boss = S.n === 3 && S.ph === 'fight';
    clear(B); for (let y = 0; y < 224; y += 8) for (let x = 0; x < 256; x += 16) { const w = Math.floor(S.fT * 2 + y / 8 + x / 16) & 3; if (w === 0) rect(x + (y & 8), y, 6, 1, CY); }
    rect(0, 0, 256, 34, SKY); rect(0, 34, 256, 4, W); for (let x = 0; x < 256; x += 32) fillCircle(x + 10, 30, 12, GR), fillCircle(x + 20, 32, 9, F);
    rect(0, 176, 256, 48, M); for (let x = 0; x < 256; x += 16) rect(x + sx, 176, 1, 48, T); rect(0, 176, 256, 3, O);
    rect(0, 176 + 22, 256, 2, T); rect(0, 210, 256, 14, T);
    if (boss) { const bx = 128 + sx; fillCircle(bx, 80, 44, PU); fillCircle(bx, 80, 36, V); rect(bx - 22, 66, 14, 10, W); rect(bx + 8, 66, 14, 10, W); rect(bx - 17, 68, 6, 6, R); rect(bx + 13, 68, 6, 6, R); }
    for (const t of S.tn) { const h = t.t < 0.9 ? 0 : 1, x = t.x + sx; if (!h) { rect(x - 10, 172, 20, 3, Math.floor(S.fT * 12) & 1 ? R : Y); txt('!', x, 160, R, 8, 'center'); } else { rect(x - 7, 118, 14, 58, PU); rect(x - 10, 112, 20, 10, PU); rect(x - 4, 120, 3, 3, PK); rect(x + 2, 128, 3, 3, PK); } }
    const p = S.p, px = Math.round(p.x) + sx;
    rect(px - 5, 156, 10, 5, GR); rect(px - 4, 161, 8, 5, SKY); rect(px - 5, 166, 10, 9, B); rect(px - 4, 175, 3, 3, K); rect(px + 1, 175, 3, 3, K);
    if (p.sw > 0) rect(px + p.f * 8 - (p.f < 0 ? 12 : 0), 160, 14, 3, W);
    if (S.ph !== 'idle') { const bxx = px + 60, by = S.ph === 'wait' ? 134 : 120; rect(px + 4, 158, 1, 8, L); for (let k = 0; k < 4; k++) rect(px + 5 + k * 16, 140 - k * 4 + (k & 1), 18, 1, W); rect(bxx - 2, by + (Math.floor(S.fT * 3) & 1), 4, 4, R); }
    else rect(px + 6, 150, 1, 14, O);
    if (S.ph === 'fight') {
      rect(214, BY0 - 4, 24, BY1 - BY0 + 8, N); rect(216, BY0, 20, BY1 - BY0, DG); const zh = FISH23[S.n][3];
      rect(216, Math.round(S.zc - zh), 20, zh * 2, S.inz ? GR : F); rect(212, Math.round(S.by), 28, 10, Y); rect(214, Math.round(S.by) + 2, 24, 6, O);
      rect(194, BY0, 8, BY1 - BY0, DG); rect(194, BY1 - Math.round((BY1 - BY0) * S.pr), 8, Math.round((BY1 - BY0) * S.pr), CY);
    }
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 - 1; const x = 20 + Math.round(Math.cos(a) * 12), y = 200 + Math.round(Math.sin(a) * 9); fillCircle(x, y, 5, S.got.includes(i) ? [CY, L, Y, R][i] : N); }
  },
  hud(S, mode) {
    txt('SCORE ' + pad5(S.score), 4, 4, W, 8); txt(S.ph === 'idle' ? 'A: CAST' : S.ph === 'wait' ? 'WAITING...' : FISH23[S.n][0], 252, 4, S.n === 3 ? R : Y, 8, 'right');
    if (S.n === 3) txt('HP ' + '*'.repeat(S.hp), 252, 14, R, 8, 'right');
    txt('CATCH ' + S.got.length + '/4', 4, 14, CY, 8);
    if (mode === 'play' && S.T < 10) txt('A CAST. HOLD A TO REEL. B SLASH', 128, 42, W, 8, 'center');
  },
  info: S => ({ ph:S.ph, n:S.n, pr:+S.pr.toFixed(2), hp:S.hp, x:Math.round(S.p.x), zc:Math.round(S.zc), w:+S.w.toFixed(2) }),
  bot(S, i) {
    const p = S.p;
    if (S.ph === 'idle') { if (S.T % 0.4 < 0.2) i.a = 1; return i; }
    if (S.ph === 'wait') return i;
    if (S.by + 5 + S.bv * 0.12 > S.zc) i.a = 1;
    if (S.n === 3) {
      const th = S.tn.filter(t => !t.hit && t.t > 0.2), st = S.tn.find(t => t.hit);
      let gx = p.x; if (th.length) { const d = (x) => th.reduce((m, t) => Math.min(m, Math.abs(t.x - x)), 99); gx = [60, 90, 120, 150, 168].sort((a, b) => d(b) - d(a))[0]; }
      else if (st && Math.abs(st.x - p.x) < 40) { gx = st.x - 12; if (Math.abs(p.x + 10 - st.x) < 22) i.b = 1; }
      if (Math.abs(gx - p.x) > 3) i[gx > p.x ? 'r' : 'l'] = 1;
    }
    return i;
  },
});
