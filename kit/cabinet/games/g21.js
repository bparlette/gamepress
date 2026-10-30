// KEYS: ARROWS walk, A open door / grab key, B hide in pot (press again to leave). When torches flicker: hide!
/* ===== HYRULE DOORS: sprint through numbered rooms; when the torches flicker a screaming wall demon rushes past. Hide in a pot! ===== */
const NR21 = 8, DX21 = 232;
const GAME = kit({
  id:'g21', t1:'HYRULE', t2:'DOORS', sub:'OPEN THE DOORS. HIDE FROM THE RUSH.', seed:52, off:21, secs:60,
  music:MUS(132, -29, true),
  setup(S) { S.room = 0; S.hearts = 3; S.p = { x:16, y:120, hid:0 }; newRoom(S); },
  step(S, dt, inp) {
    const p = S.p, r = S.r; r.t += dt; S.flash = Math.max(0, S.flash - dt);
    const pb = S.edge(inp, 'b'), pa = S.edge(inp, 'a');
    if (pb) { const pot = r.pots.find(q => Math.abs(q.x - p.x) < 14 && Math.abs(q.y - p.y) < 16); if (p.hid) { p.hid = 0; sfx('tick'); } else if (pot) { p.hid = 1; p.x = pot.x; p.y = pot.y; sfx('catch'); } }
    if (!p.hid) { p.x = clamp(p.x + (inp.r - inp.l) * 56 * dt, 8, 244); p.y = clamp(p.y + (inp.d - inp.u) * 56 * dt, 78, 160); }
    if (r.key && Math.abs(r.key.x - p.x) < 10 && Math.abs(r.key.y - p.y) < 12 && !p.hid) { r.key = null; r.has = 1; popup(S, 'GOT KEY', p.x, p.y - 12, Y); sfx('coin'); }
    if (pa && !p.hid && p.x > DX21 - 18 && Math.abs(p.y - 118) < 22) {
      if (r.locked && !r.has) popup(S, 'LOCKED!', p.x - 20, p.y - 12, R);
      else { S.score += 100; S.room++; sfx('clear'); if (S.room >= NR21) { sfx('win'); return finish(S, 'ESCAPED!', 1000 + S.hearts * 300); } newRoom(S); return; }
    }
    if (r.rush) {
      const q = r.rt = (r.rt || 0) + dt;
      if (q < 1.5) { r.warn = 1; if ((q * 6 | 0) !== (q * 6 - dt * 6 | 0)) sfx('hurt'); }
      else if (q < 2.3) { r.warn = 0; r.dx = (q - 1.5) / 0.8 * 330 - 40; if (!p.hid && r.dx > p.x - 6 && !r.hit) { r.hit = 1; S.hearts--; S.flash = 0.5; sfx('die'); popup(S, 'CAUGHT!', p.x, p.y - 12, R); if (S.hearts <= 0) { if (S.att) S.hearts = 3; else { endGame(S.score, 'CAUGHT BY RUSH'); return; } } } }
      else r.dx = -99;
    } else if (r.t > r.rd) { r.rush = 1; r.rt = 0; }
  },
  draw(S) {
    const r = S.r, p = S.p, dark = r.warn && (Math.floor(S.T * 14) & 1);
    clear(dark ? K : DG);
    for (let y = 72; y < 176; y += 16) for (let x = 0; x < VW; x += 16) if (((x + y) >> 4) & 1) rect(x, y, 16, 16, dark ? N : M);
    rect(0, 40, VW, 32, dark ? N : BRK); rect(0, 70, VW, 2, K); rect(0, 176, VW, 8, K);
    for (const x of [50, 130]) { rect(x, 52, 6, 10, O); rect(x + 1, 46, 4, 6, Math.floor(S.T * 12) & 1 ? Y : R); }
    rect(DX21, 84, 20, 64, r.locked && !r.has ? R : T); rect(DX21 + 4, 92, 12, 48, K); txt(String(S.room + 1).padStart(3, '0'), DX21 + 10, 74, W, 8, 'center');
    if (r.locked && !r.has) rect(DX21 + 6, 114, 6, 6, Y);
    for (const q of r.pots) { rect(q.x - 6, q.y - 8, 12, 14, O); rect(q.x - 4, q.y - 11, 8, 4, SKY); rect(q.x - 6, q.y - 2, 12, 2, T); }
    if (r.key) { rect(r.key.x - 3, r.key.y, 6, 4, Y); rect(r.key.x - 6, r.key.y + 1, 4, 2, Y); }
    if (!p.hid || (Math.floor(S.T * 4) & 1)) { const x = Math.round(p.x), y = Math.round(p.y); rect(x - 4, y - 14, 8, 5, T); rect(x - 4, y - 10, 8, 5, SKY); rect(x - 5, y - 5, 10, 8, R); rect(x - 4, y + 3, 3, 3, M); rect(x + 1, y + 3, 3, 3, M); if (p.hid) rect(x - 7, y - 16, 14, 24, O); }
    if (r.dx > -90 && r.rt >= 1.5 && r.rt < 2.4) { const x = Math.round(r.dx); rect(x - 30, 74, 34, 100, PU); rect(x - 6, 90, 8, 8, R); rect(x - 6, 120, 8, 8, R); rect(x - 10, 140, 14, 14, W); rect(x - 30, 74, 4, 100, K); }
    if (S.flash > 0) rect(0, 0, VW, VH, R);
  },
  hud(S, mode) {
    txt('DOOR ' + String(S.room + 1).padStart(3, '0') + '/' + String(NR21).padStart(3, '0'), 4, 4, W, 8); txt('HP ' + '*'.repeat(Math.max(0, S.hearts)), 252, 4, R, 8, 'right');
    txt('SCORE ' + pad5(S.score), 4, 16, Y, 8);
    if (S.r.warn) txt('!! RUSH !! HIDE !!', 128, 190, R, 8, 'center');
    if (S.p.hid) txt('HIDING', 128, 206, CY, 8, 'center');
    if (mode === 'play' && S.T < 9) txt('B: HIDE IN POT  A: OPEN DOOR', 128, 28, W, 8, 'center');
  },
  info: S => ({ room:S.room + 1, hearts:S.hearts, x:Math.round(S.p.x), hid:S.p.hid }),
  bot(S, i) {
    const p = S.p, r = S.r, mv = (tx, ty) => { if (Math.abs(tx - p.x) > 3) i[tx > p.x ? 'r' : 'l'] = 1; if (Math.abs(ty - p.y) > 3) i[ty > p.y ? 'd' : 'u'] = 1; };
    const danger = r.rush && r.rt < 2.4 && r.dx < 400, ahead = r.pots.filter(q => q.x >= p.x - 4).sort((a, b) => a.x - b.x)[0];
    if (r.rush && r.rt < 2.5) {
      const pot = r.pots.slice().sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
      if (!p.hid) { if (Math.abs(pot.x - p.x) < 10 && Math.abs(pot.y - p.y) < 12) i.b = 1; else mv(pot.x, pot.y); }
      else i.b = 0; return i;
    }
    if (p.hid) { i.b = 1; return i; }
    if (r.key) { mv(r.key.x, r.key.y); return i; }
    mv(DX21 - 6, 118); if (p.x > DX21 - 18) i.a = Math.abs(p.y - 118) < 20 ? 1 : 0;
    return i;
  },
});
function newRoom(S) {
  const n = S.room, pots = [0, 1, 2].map(k => ({ x:60 + k * 60 + rint(S, 20), y:98 + rint(S, 50) }));
  S.p.x = 16; S.p.y = 120; S.p.hid = 0; S.flash = 0;
  S.r = { t:0, pots, locked:n % 3 === 2, has:0, key:n % 3 === 2 ? { x:100 + rint(S, 60), y:90 + rint(S, 60) } : null, rush:0, rd:1.2 + S.rng() * 1.5, rt:0, dx:-99, warn:0, hit:0 };
  if (n % 2 === 0) S.r.rd = 999;
}
