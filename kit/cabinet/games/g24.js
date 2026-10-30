/* ===== LIARS TAVERN: Chrono Trigger x Liar's Bar. Bluff cards at a tavern table; call LIAR, make rivals drink poison. ===== */
// KEYS: LEFT/RIGHT pick card, A play card as the target rank, B call LIAR on the last play
const RK24 = ['QUEEN', 'KING', 'ACE'], NM24 = ['YOU', 'KNIGHT', 'ROGUE', 'BRUTE'], PX24 = [0, 40, 112, 184];
const nxt24 = (S, i) => { do i = (i + 1) % 4; while (S.p[i].lv <= 0); return i; };
function deal24(S) {
  const d = []; for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) d.push(r);
  for (let i = 17; i > 0; i--) { const j = rint(S, i + 1); [d[i], d[j]] = [d[j], d[i]]; }
  S.p.forEach(p => { p.hand = p.lv > 0 ? d.splice(0, 4) : []; });
  S.tg = rint(S, 3); S.cl = null; S.ph = 'turn'; S.tm = 1; S.curs = 0;
}
function play24(S, who, idx) {
  const p = S.p[who], cards = idx.map(i => p.hand[i]);
  p.hand = p.hand.filter((_, i) => !idx.includes(i));
  S.cl = { who, n:cards.length, cards }; S.cur = nxt24(S, who); S.tm = S.cur ? 1.1 : 0.4; S.curs = 0; sfx('tick');
  popup(S, cards.length + ' ' + RK24[S.tg] + (cards.length > 1 ? 'S' : '') + '!', who ? PX24[who] + 16 : 128, who ? 84 : 150, W);
}
function call24(S, who) {
  S.ph = 'rev'; S.tm = 1.8; S.lie = S.cl.cards.some(c => c !== S.tg); S.loser = S.lie ? S.cl.who : who;
  popup(S, 'LIAR!', who ? PX24[who] + 16 : 128, who ? 84 : 150, R); sfx('boom');
}
function face24(i, x, y, dead) {
  if (dead) y += 12;
  rect(x, y, 32, 32, N); rect(x, y, 32, 1, W);
  if (i === 1) { rect(x + 4, y + 4, 24, 26, L); rect(x + 14, y - 2, 4, 6, R); rect(x + 6, y + 12, 20, 4, K); rect(x + 6, y + 12, 4, 4, CY); rect(x + 22, y + 12, 4, 4, CY); }
  else if (i === 2) { rect(x + 3, y + 3, 26, 29, PU); rect(x + 8, y + 9, 16, 16, S); rect(x + 10, y + 14, 4, 3, K); rect(x + 18, y + 14, 4, 3, K); rect(x + 8, y + 19, 16, 6, DG); }
  else if (i === 3) { rect(x + 5, y + 5, 22, 24, S); rect(x + 4, y + 2, 24, 7, O); rect(x + 9, y + 13, 4, 3, K); rect(x + 19, y + 13, 4, 3, K); rect(x + 7, y + 22, 18, 7, T); rect(x + 21, y + 8, 2, 8, R); }
  else { rect(x + 5, y + 5, 22, 24, S); rect(x + 4, y + 2, 24, 7, R); rect(x + 9, y + 13, 4, 3, K); rect(x + 19, y + 13, 4, 3, K); rect(x + 12, y + 22, 8, 2, R); }
  if (dead) { rect(x + 8, y + 12, 16, 5, GR); }
}
const cardX24 = i => 78 + i * 24;
const GAME = kit({
  id:'g24', t1:'LIARS', t2:'TAVERN', sub:'BLUFF. CALL LIAR. DRINK UP.', seed:24, off:24, secs:55,
  music:MUS(104, -24, true),
  setup(S) { S.p = [3, 2, 2, 2].map(lv => ({ lv, hand:[] })); S.cur = 0; S.loser = 0; S.lie = 0; deal24(S); },
  step(S, dt, inp) {
    S.tm -= dt; const ea = S.edge(inp, 'a'), eb = S.edge(inp, 'b'), el = S.edge(inp, 'l'), er = S.edge(inp, 'r');
    if (S.tm > 0) return;
    if (S.ph === 'rev') {
      const p = S.p[S.loser]; p.lv--; sfx('die'); S.ph = 'drink'; S.tm = 1.5;
      popup(S, p.lv ? 'POISON!' : 'COLLAPSES!', S.loser ? PX24[S.loser] + 16 : 128, S.loser ? 84 : 150, GR);
      if (S.loser) S.score += p.lv ? 100 : 400; return;
    }
    if (S.ph === 'drink') {
      if (S.p[0].lv <= 0) return finish(S, 'POISONED');
      if (S.p.every((p, i) => !i || p.lv <= 0)) return finish(S, 'LAST ONE STANDING!', 300 + S.p[0].lv * 100);
      deal24(S); S.cur = S.p[S.loser].lv > 0 ? S.loser : nxt24(S, S.loser); return;
    }
    const c = S.cur, p = S.p[c], cl = S.cl, k = p.hand.filter(x => x === S.tg).length;
    if (c === 0) {
      S.curs = clamp(S.curs + (er ? 1 : 0) - (el ? 1 : 0), 0, Math.max(0, p.hand.length - 1));
      if (cl && (eb || !p.hand.length)) call24(S, 0); else if (ea && p.hand.length) play24(S, 0, [S.curs]);
      return;
    }
    if (cl && (!p.hand.length || cl.n + k > 6 || S.rng() < (cl.n > 2 ? 0.5 : 0.2))) return call24(S, c);
    let idx = [];
    if (k && S.rng() < 0.7) p.hand.forEach((x, i) => { if (x === S.tg && idx.length < 3) idx.push(i); });
    else { const n = Math.min(p.hand.length, 1 + rint(S, 3)); p.hand.forEach((x, i) => { if (x !== S.tg && idx.length < n) idx.push(i); }); }
    play24(S, c, idx.length ? idx : [0]);
  },
  draw(S) {
    clear(BRK); for (let y = 0; y < 96; y += 8) for (let x = (y / 8 & 1) * 8 - 8; x < VW; x += 16) rect(x, y, 15, 7, (x + y) % 5 ? BRK : M);
    rect(0, 0, VW, 14, M); for (let x = 20; x < VW; x += 60) { rect(x, 4, 8, 12, Y); rect(x + 2, 2, 4, 3, O); }
    rect(0, 96, VW, 128, T); rect(0, 96, VW, 3, S); rect(0, 160, VW, 64, M);
    for (let i = 1; i < 4; i++) {
      const dead = S.p[i].lv <= 0, x = PX24[i];
      face24(i, x, 26, dead); if (S.cur === i && S.ph === 'turn') rect(x - 2, 22, 36, 2, Y);
      for (let f = 0; f < S.p[i].lv; f++) { rect(x + 2 + f * 10, 66, 6, 8, GR); rect(x + 3 + f * 10, 64, 4, 3, W); }
    }
    face24(0, 8, 168, S.p[0].lv <= 0); if (S.cur === 0 && S.ph === 'turn') rect(6, 164, 36, 2, Y);
    for (let f = 0; f < S.p[0].lv; f++) { rect(8 + f * 10, 204, 6, 8, GR); rect(9 + f * 10, 202, 4, 3, W); }
    if (S.cl && S.ph !== 'drink') for (let i = 0; i < S.cl.n; i++) {
      const rev = S.ph === 'rev' && S.tm < 1.2; rect(104 + i * 18, 114, 16, 22, rev ? W : BRK); rect(105 + i * 18, 115, 14, 20, rev ? W : R);
      if (!rev) rect(108 + i * 18, 122, 8, 8, Y);
    }
    const hand = S.p[0].hand;
    for (let i = 0; i < hand.length; i++) { const y = (S.cur === 0 && S.curs === i && S.ph === 'turn') ? 166 : 174; rect(cardX24(i) - 1, y - 1, 22, 32, K); rect(cardX24(i), y, 20, 30, W); }
  },
  hud(S) {
    for (let i = 1; i < 4; i++) txt(NM24[i], PX24[i] + 16, 84, S.p[i].lv ? W : R, 8, 'center');
    txt('TARGET: ' + RK24[S.tg] + 'S', 128, 101, Y, 8, 'center');
    const hand = S.p[0].hand;
    for (let i = 0; i < hand.length; i++) txt('QKA'[hand[i]], cardX24(i) + 10, (S.cur === 0 && S.curs === i && S.ph === 'turn' ? 166 : 174) + 11, hand[i] === S.tg ? R : K, 8, 'center');
    if (S.cl && S.ph === 'rev' && S.tm < 1.2) S.cl.cards.forEach((c, i) => txt('QKA'[c], 112 + i * 18, 121, c === S.tg ? R : K, 8, 'center'));
    const st = S.ph === 'rev' ? (S.tm < 1.2 ? (S.lie ? 'A LIAR!' : 'HONEST!') : 'LIAR CALLED...') : S.ph === 'drink' ? NM24[S.loser] + ' DRINKS POISON' : NM24[S.cur] + (S.cl ? ' MUST PLAY OR CALL' : ' LEADS');
    txt(st, 128, 140, S.ph === 'rev' && S.lie ? Y : W, 8, 'center');
    txt('L/R CARD  A PLAY  B LIAR', 250, 206, L, 8, 'right');
  },
  bot(S, i) {
    if (S.ph !== 'turn' || S.cur || S.tm > 0) return i;
    const p = S.p[0];
    if (S.cl && S.cl.cards.some(c => c !== S.tg)) { i.b = 1; return i; }
    const t = Math.max(0, p.hand.indexOf(S.tg)), f = Math.floor(S.T * 30) & 1;
    if (S.curs < t) i.r = f; else if (S.curs > t) i.l = f; else i.a = 1;
    return i;
  },
  info(S) { return { lives:S.p.map(p => p.lv).join(''), ph:S.ph, cur:S.cur }; },
});
