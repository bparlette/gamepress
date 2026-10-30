// KEYS: A or B = punch to deflect the ball once it turns red and closes in. Time it late. Deflect until you are the last boxer standing.
/* ===== BLADE PUNCH: Punch-Out!! x Blade Ball. Eight boxers in a ring, one glowing ball. Deflect it back at someone else;
   whoever misses is launched out of the ring. Each deflection makes it faster. ===== */
const GAME = kit({
  id:'g12', t1:'BLADE', t2:'PUNCH', sub:'DEFLECT THE BALL. LAST BOXER STANDING.', seed:5, off:12, secs:48,
  music:MUS(172, -21, true),
  setup(S) {
    S.bx = []; const cols = [R, GR, Y, PU, O, CY, PK];
    S.bx.push({ x:128, y:176, sc:1.6, col:B, alive:true, fx:0, fy:0, fr:0 });
    for (let i = 0; i < 7; i++) { const a = Math.PI * (1.12 + i * 0.1285 * 1.0) ; S.bx.push({ x:128 + Math.cos(a) * 100, y:116 + Math.sin(a) * 50, sc:0.8 + (Math.sin(a) < -0.8 ? 0 : 0.3), col:cols[i], alive:true, fx:0, fy:0, fr:0 }); }
    S.ball = { from:0, to:1 + rint(S, 7), ph:'hover', t:0, w:0.9 }; S.n = 0; S.lives = 3; S.cd = 0; S.miss = 0; S.endT = 0; S.flash = 0; S.out = 0;
  },
  step(S, dt, inp) {
    const bl = S.ball, B_ = S.bx; S.cd = Math.max(0, S.cd - dt); S.flash = Math.max(0, S.flash - dt);
    for (const b of B_) if (b.fr) { b.x += b.fx * dt; b.y += b.fy * dt; b.fy += 260 * dt; b.fr += dt * 12; }
    if (S.endT) { S.endT += dt; if (S.endT > 2.2) return finish(S, 'KO! YOU WIN', 500 + S.lives * 100); return; }
    const press = S.edge(inp, 'a') | S.edge(inp, 'b');
    if (press && S.cd <= 0) { S.cd = 0.25; S.punch = 0.2; sfx('swing'); if (bl.ph === 'fly' && bl.to === 0 && bl.t > 0.55) { S.good = 1; } }
    S.punch = Math.max(0, (S.punch || 0) - dt);
    const alive = B_.filter(b => b.alive).length;
    if (alive === 1) { S.endT = 0.01; return; }
    if (bl.ph === 'hover') { bl.w -= dt; if (bl.w <= 0) { bl.ph = 'fly'; bl.t = 0; bl.dur = Math.max(0.34, 1.5 * Math.pow(0.95, S.n)); sfx('go'); } return; }
    bl.t += dt / bl.dur;
    if (bl.to === 0 && S.good) { S.good = 0; bl.t = 1.01; this_deflect(S, 0); return; }
    if (bl.t < 1) return;
    const tg = B_[bl.to];
    if (bl.to === 0) {
      S.lives--; S.flash = 0.3; sfx('hurt'); popup(S, 'HIT!', 128, 150, R);
      if (S.lives <= 0) { if (S.att) return 'reset'; endGame(S.score, 'KNOCKED OUT'); return; }
      return this_next(S, 0);
    }
    const duel = alive === 2, pm = Math.min(0.75, 0.07 + 0.02 * S.n + (duel ? 0.1 * S.miss : 0));
    if (rint(S, 1000) / 1000 < pm || (duel && S.miss >= 5)) {
      tg.alive = false; tg.fx = (tg.x - 128) * 1.3 + 20; tg.fy = -150; tg.fr = 1; S.score += 100; sfx('boom'); popup(S, 'OUT!', tg.x, tg.y - 20, Y); S.out++;
      return this_next(S, bl.to);
    }
    if (duel) S.miss++;
    this_deflect(S, bl.to);
  },
  draw(S) {
    clear(N); rect(0, 0, VW, 60, M); for (let x = 0; x < VW; x += 8) rect(x, 40 + (x >> 3 & 1) * 6, 8, 20, x % 16 ? T : D);
    rect(0, 60, VW, 164, DG);
    for (let r = 0; r < 4; r++) { const y = 70 + r * 36; rect(10 + r * 8, y, 236 - r * 16, 3, r % 2 ? R : W); }
    for (let j = -56; j <= 56; j += 2) { const w = 138 * Math.sqrt(1 - (j / 56) * (j / 56)); rect(128 - w, 123 + j, w * 2, 2, j % 4 ? S_ : L); }
    for (const b of S.bx.slice().sort((a, c) => a.y - c.y)) box(S, b);
    const bl = S.ball, f = S.bx[bl.from], t = S.bx[bl.to];
    if (bl.ph === 'hover') { const bob = Math.sin(S.T * 8) * 3; fillCircle(f.x, f.y - 40 * f.sc + bob, 4, CY); fillCircle(f.x, f.y - 40 * f.sc + bob, 2, W); rect(t.x - 6, t.y - 50 * t.sc, 12, 2, Y); }
    else { const u = Math.min(1, bl.t), x = f.x + (t.x - f.x) * u, y = f.y - 30 + (t.y - f.y) * u - Math.sin(u * 3.14) * 24, r = 3 + Math.round(u * 4 * t.sc / 1.6 * (bl.to ? 1 : 2));
      for (let k = 1; k < 4; k++) { const v = Math.max(0, u - k * 0.04); fillCircle(f.x + (t.x - f.x) * v, f.y - 30 + (t.y - f.y) * v - Math.sin(v * 3.14) * 24, Math.max(1, r - k), k > 1 ? M : R); }
      fillCircle(x, y, r, R); fillCircle(x, y, Math.max(1, r - 2), Y); }
    if (S.flash) rect(0, 0, VW, VH, R);
  },
  hud(S, mode) {
    txt('LEFT ' + S.bx.filter(b => b.alive).length, 4, 4, W, 8); txt('SPD x' + (1 + S.n * 0.5).toFixed(1), 252, 4, CY, 8, 'right');
    txt('LIVES ' + S.lives, 4, 16, R, 8);
    if (S.ball.ph === 'fly' && S.ball.to === 0 && S.ball.t > 0.5) txt('PUNCH!', 128, 90, R, 16, 'center');
    if (mode === 'play' && S.T < 8) txt('A/B: PUNCH WHEN BALL IS CLOSE', 128, 208, W, 8, 'center');
    if (S.endT) txt('LAST ONE STANDING!', 128, 70, Y, 8, 'center');
  },
  bot(S, i) { const b = S.ball; if (b.ph === 'fly' && b.to === 0 && b.t > 0.7 + (S.n % 3) * 0.04) i.a = 1; return i; },
  info(S) { return { left:S.bx.filter(b => b.alive).length, n:S.n, lives:S.lives, out:S.out, h:S.h, end:S.endT > 0 }; },
});
const S_ = 3;
function this_next(S, from) { const al = S.bx.map((b, i) => b.alive && i !== from ? i : -1).filter(i => i >= 0); const bl = S.ball; bl.from = from; bl.to = al[rint(S, al.length)]; bl.ph = 'hover'; bl.w = 0.8; }
function this_deflect(S, who) {
  S.n++; S.score += 20 + S.n * 5; sfx('punch'); if (who === 0) { popup(S, 'DEFLECT x' + S.n, 128, 140, CY); S.punch = 0.3; }
  const al = S.bx.map((b, i) => b.alive && i !== who ? i : -1).filter(i => i >= 0), bl = S.ball;
  bl.from = who; bl.to = al[rint(S, al.length)]; S.h = ((S.h || 7) * 31 + bl.to) % 9973; bl.ph = 'fly'; bl.t = 0; bl.dur = Math.max(0.34, 1.5 * Math.pow(0.95, S.n));
}
function box(S, b) {
  const s = b.sc, x = Math.round(b.x), y = Math.round(b.y), me = b === S.bx[0];
  if (b.fr) { rect(x - 5, y - 20, 10, 14, b.col); fillCircle(x, y - 26, 5, O); return; }
  if (!b.alive) return;
  rect(x - 8 * s, y + 2, 16 * s, 3, K);
  const w = Math.round(14 * s), h = Math.round(16 * s);
  rect(x - w / 2, y - h, w, h - 6 * s, me ? BRK : b.col); rect(x - w / 2, y - 6 * s, w, 8 * s, me ? B : W);
  fillCircle(x, y - h - 5 * s, Math.round(5 * s), me ? BRK : O);
  const up = me && S.punch > 0 ? 18 : 0;
  fillCircle(x - w / 2 - 3 * s, y - h + 4 * s - (me ? up * 0 : 0), Math.round(3.5 * s), R); fillCircle(x + w / 2 + 3 * s, y - h + 2 * s - up * s * 0.6, Math.round(3.5 * s), R);
}
