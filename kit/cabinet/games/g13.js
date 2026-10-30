// KEYS: LEFT/RIGHT steer, drive through ? boxes to collect cards, A = play your hand for a poker boost, B = discard the hand.
const RK13 = 'AKQJT';
/* ===== BALATRO GRAND PRIX: Mario Kart x Balatro. Pseudo-3D kart race; item boxes hand out playing cards.
   Play a poker hand for a speed burst: Pair is a nudge, Full House or Straight Flush blasts past the ghosts. ===== */
const LEN13 = 2500, HZ13 = 92, HANDS13 = ['HIGH CARD', 'PAIR', 'TWO PAIR', 'TRIPS', 'STRAIGHT', 'FLUSH', 'FULL HOUSE', 'QUADS', 'STRAIGHT FLUSH'], MULT13 = [1.2, 1.5, 1.9, 2.3, 2.7, 3, 3.6, 4, 6];
const curve13 = z => Math.sin(z / 300) * 1.4 + Math.sin(z / 130 + 1) * 0.6;
function eval13(h) {
  if (!h.length) return -1;
  const c = {}; for (const k of h) c[k.r] = (c[k.r] || 0) + 1;
  const v = Object.values(c).sort((a, b) => b - a), fl = h.length === 5 && h.every(k => k.s === h[0].s), st = h.length === 5 && v.length === 5;
  return fl && st ? 8 : v[0] === 4 ? 7 : v[0] === 3 && v[1] === 2 ? 6 : fl ? 5 : st ? 4 : v[0] === 3 ? 3 : v[0] === 2 && v[1] === 2 ? 2 : v[0] === 2 ? 1 : 0;
}
function suit13(s, x, y, c) {
  if (s === 2) { rect(x + 2, y, 1, 1, c); rect(x + 1, y + 1, 3, 1, c); rect(x, y + 2, 5, 1, c); rect(x + 1, y + 3, 3, 1, c); rect(x + 2, y + 4, 1, 1, c); }
  else if (s === 0) { rect(x, y, 2, 2, c); rect(x + 3, y, 2, 2, c); rect(x, y + 1, 5, 2, c); rect(x + 1, y + 3, 3, 1, c); rect(x + 2, y + 4, 1, 1, c); }
  else { rect(x + 2, y, 1, 1, c); rect(x + 1, y + 1, 3, 1, c); rect(x, y + 2, 5, 2, c); rect(x + 2, y + 4, 1, 1, c); }
}
function kart13(x, y, s, col, me) {
  const w = Math.max(4, Math.round(s)), h = Math.max(3, Math.round(s * 0.55));
  rect(x - w / 2, y - h, w, h, col); rect(x - w / 2 - 1, y - h * 0.5, Math.max(2, w * 0.2), h * 0.5, K); rect(x + w / 2 - w * 0.2 + 1, y - h * 0.5, Math.max(2, w * 0.2), h * 0.5, K);
  fillCircle(x, y - h - Math.max(1, s * 0.12), Math.max(2, Math.round(s * 0.2)), me ? W : S);
}
function play13(S, disc) {
  if (!S.hand.length) return;
  if (disc) { S.hand = []; sfx('tick'); popup(S, 'DISCARD', 128, 150, L); return; }
  const k = eval13(S.hand), m = MULT13[k], chips = S.hand.reduce((a, c) => a + 11 - c.r, 0) * 5 + k * 20;
  S.bo = { t:2 + m * 0.6, m }; S.hand = []; S.score += chips * m; sfx(k >= 6 ? 'super' : 'power'); popup(S, HANDS13[k] + ' x' + m, 128, 70, k >= 4 ? Y : CY);
  for (let i = 0; i < 6 + k * 2; i++) S.chips.push({ x:60 + vr() * 136, y:110 + vr() * 50, t:-vr() * 0.6, n:chips / 6 | 0 });
  if (S.chips.length > 24) S.chips.splice(0, S.chips.length - 24);
}
const GAME = kit({
  id:'g13', t1:'BALATRO', t2:'GRAND PRIX', sub:'COLLECT CARDS. PLAY POKER. GO FAST.', seed:3, off:13, secs:50,
  music:MUS(158, -19, false),
  setup(S) {
    S.d = 0; S.px = 0; S.hand = []; S.bo = { t:0, m:1 }; S.chips = []; S.endT = 0; S.v = 0; S.pos = 8;
    S.cpu = []; for (let i = 0; i < 7; i++) S.cpu.push({ d:4 + i * 4, lat:(i % 3 - 1) * 0.5, v:44 + i * 0.8 + rint(S, 3), col:[B, GR, Y, PU, O, CY, PK][i], ph:rint(S, 9) });
    S.box = []; for (let z = 120; z < LEN13 - 150; z += 100 + rint(S, 40)) S.box.push({ z, lat:(rint(S, 5) - 2) * 0.4, got:false });
    S.rows = []; S.cp = 0;
  },
  step(S, dt, inp) {
    if (S.endT) { S.endT += dt; S.v *= 0.98; S.d += S.v * dt; if (S.endT > 2.4) { S.score = Math.round(S.score); return finish(S, 'FINISH P' + S.pos, (9 - S.pos) * 200); } return; }
    const bo = S.bo; bo.t = Math.max(0, bo.t - dt);
    const off = Math.abs(S.px) > 1.02, base = 50 * (off ? 0.6 : 1), tv = base * (bo.t > 0 ? 1 + (bo.m - 1) * 0.9 : 1);
    S.v += (tv - S.v) * Math.min(1, 2.5 * dt); S.d += S.v * dt; S.score += S.v * dt * 0.2;
    S.px += ((inp.r ? 1 : 0) - (inp.l ? 1 : 0)) * 1.5 * dt - curve13(S.d) * dt * 0.5 * (S.v / 50);
    S.px = clamp(S.px, -1.25, 1.25);
    for (const c of S.cpu) { c.d += (c.v + Math.sin(S.T * 0.7 + c.ph) * 3) * dt; }
    S.pos = 1 + S.cpu.filter(c => c.d > S.d).length;
    for (const b of S.box) if (!b.got && b.z - S.d < 5 && b.z - S.d > -4 && Math.abs(b.lat - S.px) < 0.3) {
      b.got = true; if (S.hand.length < 5) { S.hand.push({ r:rint(S, 4), s:rint(S, 3) }); sfx('coin'); popup(S, 'CARD!', 128, 120, Y); } else popup(S, 'HAND FULL', 128, 120, R);
    }
    if (Math.floor(S.d / 625) > S.cp) { S.cp++; if (S.hand.length < 5) S.hand.push({ r:rint(S, 4), s:rint(S, 3) }); popup(S, 'CHECKPOINT', 128, 100, CY); sfx('go'); }
    if (S.edge(inp, 'a')) play13(S, false); if (S.edge(inp, 'b')) play13(S, true);
    for (const c of S.chips) c.t += dt;
    if (S.d >= LEN13) { S.endT = 0.01; sfx('win'); }
  },
  draw(S) {
    clear(SKY); rect(0, HZ13 - 14, VW, 14, F); for (let x = 0; x < VW; x += 16) rect(x, HZ13 - 14 - ((x * 7) % 11), 16, 14, F);
    for (let y = 199, o = 0; y >= HZ13; y--) {
      const p = (y - HZ13) / (200 - HZ13), d = 42 / (p + 0.1) - 35, w = 6 + 112 * p, st = Math.floor((S.d + d) / 14) & 1;
      o += curve13(S.d + d) * 0.3; const cx = 128 + o - S.px * w * 0.9; S.rows[y] = [cx, w];
      rect(0, y, VW, 1, st ? GR : F); rect(cx - w * 1.1, y, w * 2.2, 1, st ? R : W); rect(cx - w, y, w * 2, 1, st ? D : DG);
      if (st) rect(cx - w * 0.03, y, Math.max(1, w * 0.06), 1, W);
    }
    const objs = []; for (const c of S.cpu) objs.push({ d:c.d - S.d, lat:c.lat + Math.sin(c.ph + S.T) * 0.1, k:'c', col:c.col }); for (const b of S.box) if (!b.got) objs.push({ d:b.z - S.d, lat:b.lat, k:'b' });
    objs.sort((a, b) => b.d - a.d);
    for (const o of objs) {
      if (o.d < 3 || o.d > 300) continue; const p = 42 / (o.d + 35) - 0.1, y = Math.round(HZ13 + p * 108), r = S.rows[y]; if (!r) continue;
      const x = r[0] + o.lat * r[1] * 0.9, s = 4 + p * 26;
      if (o.k === 'b') { rect(x - s / 2, y - s, s, s, Y); rect(x - s / 2 + 1, y - s + 1, s - 2, s - 2, B); if (s > 7) txt('?', x, y - s + 1, W, Math.max(8, s * 0.7), 'center', false); }
      else kart13(x, y, s, o.col, false);
    }
    const bump = S.bo.t > 0 ? (Math.floor(S.T * 30) & 1) : 0, fast = S.bo.t > 0;
    if (fast) for (let i = 0; i < 14; i++) { const a = i * 0.45 + S.T * 9; rect(128 + Math.cos(a) * (60 + (i * 13) % 50), 120 + Math.sin(a) * 40, 2, 2 + (i % 3) * 3, i & 1 ? W : Y); }
    if (fast) { rect(114, 190, 6, 8 + bump * 4, O); rect(136, 190, 6, 8 + bump * 4, Y); }
    kart13(128, 196 - bump, 30, R, true);
    rect(0, 200, VW, 24, N); rect(0, 200, VW, 1, W);
    for (let i = 0; i < 5; i++) { const x = 8 + i * 20, c = S.hand[i]; rect(x, 203, 16, 19, c ? W : DG); if (c) suit13(c.s, x + 5, 214, c.s === 1 ? K : R); }
  },
  hud(S, mode) {
    txt('POS ' + S.pos + '/8', 4, 4, S.pos === 1 ? Y : W, 8); txt(Math.min(100, Math.floor(S.d / LEN13 * 100)) + '%', 252, 4, W, 8, 'right');
    const b = S.bo, cc = b.t > 0 ? (b.m >= 6 ? 50000 : Math.round(b.m * b.m * 100)) : Math.round(S.v * 2);
    txt(cc.toLocaleString('en-US') + 'CC', 252, 16, b.t > 0 ? Y : CY, 8, 'right'); if (b.t > 0) txt('MULT x' + b.m, 4, 16, Y, 8);
    for (let i = 0; i < 5; i++) {
      const x = 8 + i * 20, c = S.hand[i]; if (c) txt(RK13[c.r], x + 3, 205, c.s === 1 ? K : R, 8, 'left', false);
    }
    const k = eval13(S.hand); txt(k >= 0 ? HANDS13[k] : 'NO CARDS', 116, 204, k >= 4 ? Y : W, 8); txt('A:PLAY B:DROP', 116, 214, L, 8);
    for (const c of S.chips) if (c.t > 0) txt('+' + c.n, c.x, Math.round(c.y - c.t * 40), Y, 8);
    if (mode === 'play' && S.T < 8) txt('STEER INTO ? BOXES, A = PLAY HAND', 128, 40, W, 8, 'center');
    if (S.endT) txt('FINISH! P' + S.pos, 128, 60, Y, 16, 'center');
  },
  bot(S, i) {
    const nb = S.box.filter(b => !b.got && b.z - S.d > 4 && b.z - S.d < 150)[0], tgt = nb && S.hand.length < 5 ? nb.lat : 0, err = tgt - S.px + curve13(S.d) * 0.12;
    if (err > 0.06) i.r = 1; else if (err < -0.06) i.l = 1;
    const k = eval13(S.hand); if (S.bo.t <= 0 && (S.hand.length === 5 || (k >= 3 && S.hand.length >= 3))) i.a = 1;
    return i;
  },
  info(S) { return { pos:S.pos, d:Math.round(S.d), hand:S.hand.length, boost:+S.bo.t.toFixed(1), m:S.bo.m, px:+S.px.toFixed(2), end:S.endT > 0 }; },
});
