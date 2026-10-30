// KEYS: ARROWS walk, A grab crate / restock shelf, B ring up the customer at the register (near it) or swing the bat
/* ===== ONETT MART SIM: restock shelves, scan customers, and bat the alien shoplifters before they reach the door. Earn $64 to close up. ===== */
const GOAL22 = 64, SHX22 = [66, 122, 178], REG22 = { x:48, y:166 }, DOOR22 = { x:226, y:196 };
const GAME = kit({
  id:'g22', t1:'ONETT', t2:'MART SIM', sub:'STOCK. SCAN. BAT THE THIEVES.', seed:63, off:22, secs:60,
  music:MUS(124, -24, false),
  setup(S) { S.p = { x:90, y:130, f:1, carry:0, sw:0 }; S.sh = [5, 5, 5]; S.cu = []; S.sp = 1; S.th = 9; S.cash = 0; S.lost = 0; S.kids = 0; S.fx = []; },
  step(S, dt, inp) {
    const p = S.p; p.sw = Math.max(0, p.sw - dt);
    p.x = clamp(p.x + (inp.r - inp.l) * 60 * dt, 8, 246); p.y = clamp(p.y + (inp.d - inp.u) * 60 * dt, 78, 190); if (inp.r) p.f = 1; if (inp.l) p.f = -1;
    const pa = S.edge(inp, 'a'), pb = S.edge(inp, 'b');
    if (pa) {
      if (!p.carry && p.x < 36 && p.y > 90 && p.y < 150) { p.carry = 1; sfx('catch'); popup(S, 'GOT CRATE', p.x + 14, p.y - 14, CY); }
      else if (p.carry) { const i = SHX22.findIndex(x => Math.abs(x - p.x) < 22); if (i >= 0 && p.y < 100) { S.sh[i] = 6; p.carry = 0; S.score += 10; sfx('coin'); } }
    }
    const rc = S.cu.find(c => c.st === 'wait' && c.q === 0);
    if (pb) {
      if (rc && Math.hypot(p.x - REG22.x, p.y - REG22.y) < 34) { rc.st = 'leave'; S.cash += 8; S.score += 80; sfx('coin'); popup(S, '+$8', rc.x, rc.y - 14, Y); }
      else { p.sw = 0.25; sfx('swing'); }
    }
    S.sp -= dt; S.th -= dt;
    if (S.sp <= 0 && S.cu.length < 6) { S.sp = 2.4 + S.rng() * 1.2; const k = rint(S, 3); S.cu.push({ x:DOOR22.x, y:DOOR22.y, st:'in', sh:k, col:[PK, SKY, GR, Y][rint(S, 4)], q:0, v:30 }); }
    if (S.th <= 0) { S.th = 11 + S.rng() * 4; S.cu.push({ x:DOOR22.x, y:DOOR22.y, st:'tin', sh:rint(S, 3), col:PU, th:1, q:0, v:34 }); }
    let qn = 0;
    for (let i = S.cu.length - 1; i >= 0; i--) {
      const c = S.cu[i], go = (tx, ty, sp) => { const d = Math.hypot(tx - c.x, ty - c.y); if (d < 3) return 1; c.x += (tx - c.x) / d * sp * dt; c.y += (ty - c.y) / d * sp * dt; return 0; };
      if (c.st === 'in' || c.st === 'tin') { if (go(SHX22[c.sh], 88, c.v)) { if (S.sh[c.sh] > 0) { S.sh[c.sh] = c.th ? Math.max(0, S.sh[c.sh] - 3) : S.sh[c.sh] - 1; c.st = c.th ? 'run' : 'toreg'; if (c.th) { sfx('boom'); popup(S, 'THIEF!', c.x, c.y - 10, R); } } else c.st = 'leave'; } }
      else if (c.st === 'toreg') { c.q = qn++; if (go(REG22.x + 26 + c.q * 16, REG22.y, c.v) && c.q === 0) c.st = 'wait'; }
      else if (c.st === 'wait') { c.q = qn++; c.pt = (c.pt || 0) + dt; if (c.pt > 14) c.st = 'leave'; }
      else if (c.st === 'run') { if (go(DOOR22.x, DOOR22.y, 52)) { S.lost += 1; popup(S, 'STOLEN -$6', 200, 170, R); S.cash = Math.max(0, S.cash - 6); S.cu.splice(i, 1); sfx('hurt'); } }
      else if (c.st === 'ko') { c.t -= dt; c.y -= 0; if (c.t <= 0) S.cu.splice(i, 1); }
      else if (c.st === 'leave') { if (go(DOOR22.x, DOOR22.y, 40)) S.cu.splice(i, 1); }
      if (p.sw > 0.05 && c.th && c.st !== 'ko' && Math.hypot(p.x + p.f * 14 - c.x, p.y - c.y) < 22) { c.st = 'ko'; c.t = 1; S.cash += 6; S.score += 120; S.kids++; sfx('punch'); popup(S, 'BONK! +$6', c.x, c.y - 14, Y); }
    }
    if (S.cash >= GOAL22) { sfx('win'); return finish(S, 'SHIFT CLEARED!', 500 + (3 - Math.min(3, S.lost)) * 300); }
  },
  draw(S) {
    clear(SKY); rect(0, 40, VW, 150, PK); for (let x = 0; x < VW; x += 16) for (let y = 72; y < 200; y += 16) if (((x + y) >> 4) & 1) rect(x, y, 16, 16, L);
    rect(0, 40, VW, 32, W); rect(0, 70, VW, 3, DG); rect(0, 190, VW, 34, DG); rect(0, 188, VW, 2, W);
    rect(0, 90, 30, 60, T); for (let k = 0; k < 4; k++) rect(4 + (k & 1) * 12, 94 + (k >> 1) * 14, 10, 10, O); txt('BACK', 15, 80, W, 8, 'center');
    for (let i = 0; i < 3; i++) { const x = SHX22[i]; rect(x - 20, 56, 40, 20, BRK); rect(x - 20, 56, 40, 3, K); for (let k = 0; k < S.sh[i]; k++) rect(x - 18 + k * 6, 62, 5, 8, [R, Y, CY, GR, PU, O][k]); }
    rect(REG22.x - 14, REG22.y - 10, 28, 16, M); rect(REG22.x - 10, REG22.y - 14, 12, 6, GR); txt('$', REG22.x + 6, REG22.y - 8, Y, 8);
    rect(DOOR22.x - 14, 188, 28, 4, CY);
    const ppl = (x, y, c, h, f) => { x = Math.round(x); y = Math.round(y); rect(x - 4, y - 16, 8, 6, h); rect(x - 4, y - 14, 8, 4, SKY); rect(x - 5, y - 9, 10, 9, c); rect(x - 4, y, 3, 3, B); rect(x + 1, y, 3, 3, B); };
    for (const c of S.cu) { if (c.st === 'ko') { rect(Math.round(c.x) - 7, Math.round(c.y) - 4, 14, 6, PU); rect(Math.round(c.x) - 7, Math.round(c.y) - 8, 4, 4, GR); txt('*', c.x, c.y - 18, Y, 8, 'center'); continue; }
      if (c.th) { ppl(c.x, c.y, PU, GR); rect(c.x - 6, c.y - 20, 2, 5, GR); rect(c.x + 4, c.y - 20, 2, 5, GR); rect(c.x - 3, c.y - 14, 2, 2, K); rect(c.x + 1, c.y - 14, 2, 2, K); if (c.st === 'run') rect(c.x + 5, c.y - 8, 7, 7, O); }
      else ppl(c.x, c.y, c.col, BRK); }
    const p = S.p; ppl(p.x, p.y, R, Y); rect(p.x - 5, p.y - 12, 10, 2, W); if (p.carry) rect(p.x - 6, p.y - 24, 12, 8, O);
    if (p.sw > 0) { const a = (0.25 - p.sw) / 0.25 * 3 - 1.5; rect(p.x + p.f * 12 - 2 + Math.round(Math.sin(a) * 6 * p.f), p.y - 8 + Math.round(Math.cos(a) * 8) - 8, 4, 16, L); }
  },
  hud(S, mode) {
    txt('CASH $' + S.cash + '/' + GOAL22, 4, 4, Y, 8); txt('SCORE ' + pad5(S.score), 252, 4, W, 8, 'right'); txt('LOST ' + S.lost, 4, 16, R, 8);
    rect(4, 28, 100, 5, DG); rect(4, 28, Math.round(100 * Math.min(1, S.cash / GOAL22)), 5, GR);
    if (mode === 'play' && S.T < 9) txt('A CRATE/RESTOCK  B SCAN/BAT', 128, 206, W, 8, 'center');
  },
  info: S => ({ cash:S.cash, lost:S.lost, stock:S.sh.join(''), cust:S.cu.length }),
  bot(S, i) {
    const p = S.p, mv = (tx, ty, r) => { if (Math.hypot(tx - p.x, ty - p.y) < (r || 4)) return 1; if (Math.abs(tx - p.x) > 3) i[tx > p.x ? 'r' : 'l'] = 1; if (Math.abs(ty - p.y) > 3) i[ty > p.y ? 'd' : 'u'] = 1; return 0; };
    const th = S.cu.find(c => c.th && c.st !== 'ko'), rc = S.cu.find(c => c.st === 'wait' && c.q === 0), low = S.sh.findIndex(v => v <= 1);
    if (th && th.st !== 'tin') { const tx = th.x - 12 * (th.x > p.x ? 1 : -1) * 0, d = Math.hypot(th.x - p.f * 14 - p.x, th.y - p.y);
      if (Math.hypot(p.x + p.f * 14 - th.x, p.y - th.y) < 20) { i.b = 1; return i; }
      mv(th.x - p.f * 12, th.y); if (th.x > p.x) i.r = 1; else i.l = 1; return i; }
    if (rc) { if (mv(REG22.x + 12, REG22.y - 4, 18)) i.b = 1; return i; }
    if (low >= 0 || p.carry) {
      if (!p.carry) { if (mv(14, 120, 6)) i.a = 1; } else { const k = low >= 0 ? low : 0; if (mv(SHX22[k], 90, 8)) i.a = 1; }
      return i; }
    mv(REG22.x + 24, REG22.y - 10, 6); return i;
  },
});
