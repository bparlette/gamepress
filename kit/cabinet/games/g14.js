// KEYS: LEFT/RIGHT pick SHOOT FOE / SHOOT SELF / an item, A confirm. Self-shot with a blank keeps your turn. Whiskey +1 HP, saw = double damage, glass peeks the shell.
/* ===== BUCKSHOT SALOON: Sunset Riders x Buckshot Roulette. One shotgun, one poker table, a jittery bandit.
   Read the chamber, use your items, and survive the final 50/50 pull. ===== */
const IT14 = ['WHISKEY', 'SAW', 'GLASS'];
function load14(S, fin) {
  S.final = fin; S.shells = fin ? ['L', 'B'] : ['L', 'L', 'B', 'B', rint(S, 2) ? 'L' : 'B'];
  for (let i = S.shells.length - 1; i > 0; i--) { const j = rint(S, i + 1); [S.shells[i], S.shells[j]] = [S.shells[j], S.shells[i]]; }
  S.n0 = { L:S.shells.filter(s => s === 'L').length, B:S.shells.filter(s => s === 'B').length }; S.known = null; S.saw = false;
  if (fin) { S.hp = { p:1, e:1 }; S.inv = { p:[], e:[] }; } else for (const w of ['p', 'e']) while (S.inv[w].length < 3) S.inv[w].push(IT14[rint(S, 3)]);
  S.phase = 'load'; S.wait = 2.4; S.msg = fin ? 'FINAL ROUND' : 'LOADING'; S.reveal = true; S.think = 0.8; S.cur = 0;
}
function decide14(S, who, smart) {
  const o = who === 'p' ? 'e' : 'p', inv = S.inv[who], n = S.shells.length, live = S.shells.filter(s => s === 'L').length, kn = S.known && S.known.who === who ? S.known.v : null;
  const r = smart ? 0 : S.rng();
  if (S.hp[who] < 3 && inv.includes('WHISKEY') && (smart || r < 0.7)) return 'WHISKEY';
  if (inv.includes('GLASS') && kn === null && n > 1 && (smart || r < 0.5)) return 'GLASS';
  if (inv.includes('SAW') && !S.saw && (smart ? kn === 'L' : r < 0.35) && !S.final) return 'SAW';
  if (kn) return kn === 'L' ? 'foe' : 'self';
  if (smart) return live * 2 > n ? 'foe' : live * 2 < n ? 'self' : 'foe';
  return S.rng() < 0.3 ? (S.rng() < 0.5 ? 'foe' : 'self') : live * 2 >= n ? 'foe' : 'self';
}
function act14(S, who, k) {
  const o = who === 'p' ? 'e' : 'p'; S.aim = k === 'self' ? 'self' : 'foe'; S.last = who;
  if (IT14.includes(k)) {
    S.inv[who].splice(S.inv[who].indexOf(k), 1); S.wait = 1.1; S.think = 0.7; sfx('coin');
    if (k === 'WHISKEY') { S.hp[who] = Math.min(3, S.hp[who] + 1); S.msg = (who === 'p' ? 'YOU' : 'BANDIT') + ' DRINK +1 HP'; }
    else if (k === 'SAW') { S.saw = true; S.msg = 'BARREL SAWED OFF: 2X DAMAGE'; sfx('swing'); }
    else { S.known = { who, v:S.shells[0] }; S.msg = who === 'p' ? 'THE NEXT SHELL IS ' + (S.shells[0] === 'L' ? 'LIVE' : 'BLANK') : 'BANDIT SQUINTS AT THE SHELL'; }
    return;
  }
  const t = k === 'self' ? who : o, sh = S.shells.shift(), dmg = S.saw ? 2 : 1; S.saw = false; S.known = null; S.think = 0.8; S.wait = 1.7; S.reveal = false;
  if (sh === 'L') {
    S.hp[t] = Math.max(0, S.hp[t] - dmg); S.fl = 0.18; S.shake = 0.4; sfx('boom'); S.msg = 'BANG! ' + (t === 'p' ? 'YOU TAKE ' : 'BANDIT TAKES ') + dmg;
    if (t === 'e') S.score += 100 * dmg; S.turn = o;
  } else { sfx('tick'); S.msg = 'CLICK... BLANK'; S.turn = (k === 'self') ? who : o; }
  if (S.hp.p <= 0 || S.hp.e <= 0) { S.endT = 0.01; S.wait = 9; return; }
  if (!S.shells.length) S.reload = true;
}
const GAME = kit({
  id:'g14', t1:'BUCKSHOT', t2:'SALOON', sub:'ONE GUN. ONE TABLE. DON\'T BLINK.', seed:5, off:14, secs:52,
  music:MUS(96, -26, true),
  setup(S) { S.hp = { p:3, e:3 }; S.inv = { p:[], e:[] }; S.turn = 'p'; S.endT = 0; S.fl = 0; S.shake = 0; S.aim = 'foe'; S.last = 'p'; S.reload = false; S.tg = 0; load14(S, false); },
  step(S, dt, inp) {
    S.fl = Math.max(0, S.fl - dt); S.shake = Math.max(0, S.shake - dt);
    if (S.endT) { S.endT += dt; if (S.endT > 2.6) { if (S.hp.p > 0) return finish(S, 'YOU WIN', 500 + S.hp.p * 100); if (S.att) return 'reset'; endGame(S.score, 'YOU DIED'); } return; }
    S.wait = Math.max(0, S.wait - dt); if (S.wait > 0) return;
    if (S.phase === 'load') { S.phase = 'pick'; S.reveal = false; S.msg = S.turn === 'p' ? 'YOUR TURN' : 'BANDIT\'S TURN'; return; }
    if (S.reload || (S.T > 33 && !S.final)) { S.reload = false; load14(S, S.T > 33); return; }
    S.think = Math.max(0, S.think - dt);
    const opts = ['foe', 'self'].concat(S.inv.p);
    if (S.turn === 'e') { if (S.think <= 0) act14(S, 'e', decide14(S, 'e', false)); return; }
    if (S.edge(inp, 'r')) S.cur = (S.cur + 1) % opts.length; if (S.edge(inp, 'l')) S.cur = (S.cur + opts.length - 1) % opts.length;
    S.cur = Math.min(S.cur, opts.length - 1); S.aim = opts[S.cur] === 'self' ? 'self' : 'foe';
    if (S.edge(inp, 'a') && S.think <= 0) act14(S, 'p', opts[S.cur]);
  },
  draw(S) {
    const sx = S.shake ? Math.round(Math.sin(S.T * 90) * 3) : 0;
    clear(M); for (let x = 0; x < VW; x += 16) rect(x, 0, 1, 150, T); rect(0, 36, VW, 3, T);
    rect(20, 14, 70, 4, BRK); for (let i = 0; i < 6; i++) { rect(24 + i * 11, 4, 5, 10, [GR, R, Y, CY, GR, PU][i]); rect(25 + i * 11, 1, 3, 3, L); }
    rect(166, 10, 70, 50, B); rect(168, 12, 31, 46, SKY); rect(203, 12, 31, 46, SKY);
    const hx = 128 + sx, ang = S.fl > 0 || (S.last === 'e' && S.hp.e < 3 && S.T % 1 < 0.5) ? R : S_14;
    rect(hx - 28, 78, 56, 70, D); rect(hx - 28, 78, 56, 8, L); rect(hx - 8, 86, 16, 62, W); rect(hx - 28, 120, 10, 28, T); rect(hx + 18, 120, 10, 28, T);
    rect(hx - 14, 44, 28, 32, 10); rect(hx - 20, 36, 40, 6, M); rect(hx - 12, 22, 24, 16, T); rect(hx - 12, 34, 24, 3, K);
    rect(hx - 14, 62, 28, 14, R); rect(hx - 9, 50, 5, 4, K); rect(hx + 4, 50, 5, 4, K); rect(hx - 8, 51, 2, 2, ang === R ? R : W); rect(hx + 5, 51, 2, 2, ang === R ? R : W);
    rect(0, 148, VW, 76, T); rect(0, 148, VW, 4, BRK); rect(24, 158, 208, 52, F); rect(24, 158, 208, 2, GR); rect(24, 208, 208, 2, M);
    const dn = S.aim === 'self'; rect(124, dn ? 188 : 160, 8, dn ? 30 : 30, K); rect(126, dn ? 188 : 160, 4, dn ? 30 : 30, D); rect(121, 186, 14, 10, BRK); if (S.saw) rect(124, dn ? 214 : 160, 8, 3, R);
    for (const w of ['p', 'e']) S.inv[w].forEach((k, i) => { const x = w === 'p' ? 34 + i * 26 : 164 + i * 26, y = w === 'p' ? 188 : 164; icon14(k, x, y); if (w === 'p' && S.turn === 'p' && S.phase === 'pick' && S.cur === i + 2) { rect(x - 4, y - 5, 22, 1, Y); rect(x - 4, y + 18, 22, 1, Y); rect(x - 4, y - 5, 1, 24, Y); rect(x + 17, y - 5, 1, 24, Y); } });
    for (let i = 0; i < 3; i++) { rect(4 + i * 10, 66, 7, 7, i < S.hp.e ? R : DG); rect(4 + i * 10, 198 + 8, 7, 7, i < S.hp.p ? R : DG); }
    const n = S.shells.length; for (let i = 0; i < n; i++) { const c = S.reveal ? (S.shells[i] === 'L' ? R : CY) : (i === 0 && S.known && S.known.who === 'p' ? (S.known.v === 'L' ? R : CY) : L); rect(98 + i * 12, 2 + 0, 8, 14, c); rect(98 + i * 12, 2, 8, 3, Y); }
    if (S.fl > 0) rect(0, 0, VW, VH, W);
  },
  hud(S, mode) {
    txt('BANDIT', 4, 54, R, 8); txt('YOU', 4, 206 - 12, CY, 8);
    txt(S.n0.L + ' LIVE  ' + S.n0.B + ' BLANK', 252, 22, Y, 8, 'right');
    if (S.msg) txt(S.msg, 128, S.reveal ? 100 : 128, W, 8, 'center');
    if (S.reveal) txt(S.n0.L + ' LIVE, ' + S.n0.B + ' BLANK', 128, 84, Y, 16, 'center');
    if (S.turn === 'p' && S.phase === 'pick' && !S.endT) { const o = ['SHOOT FOE', 'SHOOT SELF'].concat(S.inv.p)[S.cur]; txt('< ' + o + ' >', 168, 207, Y, 8, 'center'); if (mode === 'play' && S.T < 10) txt('L/R CHOOSE  A SELECT', 168, 197, W, 8, 'center'); }
    if (S.endT) txt(S.hp.p > 0 ? 'BANDIT DOWN!' : 'YOU DIED', 128, 70, Y, 16, 'center');
  },
  bot(S, i) {
    if (S.turn !== 'p' || S.phase !== 'pick' || S.wait > 0 || S.endT || S.think > 0) return i;
    const k = decide14(S, 'p', true), want = k === 'foe' ? 0 : k === 'self' ? 1 : 2 + S.inv.p.indexOf(k);
    if (S.cur !== want) i.r = (S.tg ^= 1); else i.a = 1;
    return i;
  },
  info(S) { return { hp:S.hp.p, bhp:S.hp.e, shells:S.shells.length, turn:S.turn, fin:S.final, end:S.endT > 0, inv:S.inv.p.length + S.inv.e.length }; },
});
const S_14 = K;
function icon14(k, x, y) {
  if (k === 'WHISKEY') { rect(x + 6, y, 4, 5, T); rect(x + 3, y + 5, 10, 12, O); rect(x + 5, y + 8, 6, 5, W); }
  else if (k === 'SAW') { rect(x, y + 4, 16, 6, L); for (let i = 0; i < 8; i++) rect(x + i * 2, y + 10, 1, 2, L); rect(x + 12, y, 5, 12, BRK); }
  else { fillCircle(x + 7, y + 7, 7, CY); fillCircle(x + 7, y + 7, 4, SKY); rect(x + 11, y + 11, 3, 8, BRK); }
}
