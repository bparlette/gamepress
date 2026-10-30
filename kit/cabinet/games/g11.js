/* ===== HOP FIGHT: Q*bert x Joust. A 1v1 hop duel on a cube pyramid. Every cube you land on flips to your color;
   hop onto your rival to knock them off. Most cubes when the timer dies wins. ===== */
const ROWS11 = 5, TIME11 = 60, LIVES11 = 5;
let own11, pl11, rv11, lives11, tleft11, T11, att11, rng11, rvRespawn11, hopCd11, pops11, prevDir11, rvCd11, goal11;
function popup11(s, x, y, col) { pops11.push({ s, x, y, col, t:0 }); if (pops11.length > 4) pops11.shift(); }
const cellOK11 = (r, c) => r >= 0 && r < ROWS11 && c >= 0 && c <= r;
const cellXY11 = (r, c) => [128 + (c * 2 - r) * 16 - 16, 52 + r * 26];
function setup11(isAtt) {
  att11 = !!isAtt; rng11 = mkRng(runSeed(isAtt ? 91 : null, 21));
  own11 = []; for (let r = 0; r < ROWS11; r++) own11.push(new Array(r + 1).fill(0));
  pl11 = { r:0, c:0, air:0, ax:0, ay:0 }; rv11 = { r:4, c:4, respawn:0, cd:0.6 };
  lives11 = LIVES11; tleft11 = TIME11; T11 = 0; hopCd11 = 0; rvRespawn11 = 0; rvCd11 = 0.8; pops11 = []; prevDir11 = '';
  own11[0][0] = 1; own11[4][4] = 2;
}
function resetPlayer11() { pl11.r = 0; pl11.c = 0; hopCd11 = 0.4; pl11.inv = 2; }
function knockPlayer11(msg) {
  lives11--; sfx('die'); popup11(msg, 128, 60, R);
  if (lives11 <= 0) { if (att11) setup11(true); else endGame(count11(1), 'DEFEAT'); return; }
  resetPlayer11();
}
function count11(who) { let n = 0; for (const row of own11) for (const v of row) if (v === who) n++; return n; }
function hop11(e, dr, dc, who) {
  const nr = e.r + dr, nc = e.c + dc;
  if (!cellOK11(nr, nc)) return false;
  e.r = nr; e.c = nc; sfx('tick');
  own11[nr][nc] = who;
  return true;
}
const GAME = {
  id:'g11', t1:'HOP', t2:'FIGHT', sub:'LAND ON CUBES. KNOCK THEM OFF.',
  music:{ bpm:150, lead:'square', chords:[{ root:-24, tones:[0, 3, 7] }, { root:-22, tones:[0, 4, 7] }, { root:-27, tones:[0, 3, 7] }, { root:-24, tones:[0, 4, 7] }],
          arp:[0, 2, 1, 3, 2, 1, 0, 2, 1, 2, 0, 3, 2, 1, 2, 0], bass:[0, 4, 8, 12], snare:[4, 12], kick:[0, 8], hat:true },
  init(isAtt) { setup11(isAtt); },
  update(dt, inp, mode) {
    att11 = mode === 'title'; T11 += dt;
    if (att11 && T11 > 65) { setup11(true); return; }
    for (let i = pops11.length - 1; i >= 0; i--) { pops11[i].t += dt; if (pops11[i].t > 1.1) pops11.splice(i, 1); }
    hopCd11 = Math.max(0, hopCd11 - dt); rvCd11 -= dt; pl11.inv = Math.max(0, (pl11.inv || 0) - dt); rvRespawn11 = Math.max(0, rvRespawn11 - dt);
    tleft11 -= dt; if (tleft11 <= 0) { if (att11) setup11(true); else { const a = count11(1), b = count11(2); endGame(a * 10, a > b ? 'YOU WIN' : 'DEFEAT'); } return; }
    const dir = (inp.u && inp.l) ? 'ul' : (inp.u && inp.r) ? 'ur' : (inp.d && inp.l) ? 'dl' : (inp.d && inp.r) ? 'dr' : inp.l ? 'dl' : inp.r ? 'dr' : inp.a ? 'ul' : inp.b ? 'ur' : '';
    if (dir && dir !== prevDir11 && hopCd11 <= 0) {
      const map = { ul:[-1, -1], ur:[-1, 0], dl:[1, 0], dr:[1, 1] }[dir];
      const nr = pl11.r + map[0], nc = pl11.c + map[1];
      hopCd11 = 0.25;
      if (!cellOK11(nr, nc)) { knockPlayer11('FELL OFF!'); prevDir11 = dir; return; }
      pl11.r = nr; pl11.c = nc; own11[nr][nc] = 1; sfx('catch');
      if (rv11.respawn <= 0 && rv11.r === nr && rv11.c === nc) { rv11.respawn = 1.5; rv11.r = -1; score11(); popup11('KNOCKED!', 128, 90, Y); sfx('boom'); }
    }
    prevDir11 = dir;
    if (rv11.respawn > 0) { rv11.respawn -= dt; if (rv11.respawn <= 0) { const sw = pl11.r === 4 && pl11.c === 0; rv11.r = 4; rv11.c = sw ? 4 : 0; rv11.cd = 0.8; } }
    if (rv11.r >= 0) {
      rv11.cd -= dt;
      if (rv11.cd <= 0) {
        rv11.cd = 0.55 + rng11() * 0.25;
        const opts = [[-1, -1], [-1, 0], [1, 0], [1, 1]].map(([a, b]) => [rv11.r + a, rv11.c + b]).filter(([r, c]) => cellOK11(r, c));
        const toward = opts.filter(([r, c]) => own11[r][c] !== 2);
        const pick = (toward.length && rng11() < 0.8 ? toward : opts)[Math.floor(rng11() * (toward.length && rng11() < 0.8 ? toward.length : opts.length))];
        if (pick) { const [r, c] = pick; if (r === pl11.r && c === pl11.c && !(pl11.inv > 0) && rng11() < 0.25) { knockPlayer11('KNOCKED OFF!'); } rv11.r = r; rv11.c = c; own11[r][c] = 2; }
        else { rv11.respawn = 1.2; rv11.r = -1; }
      }
    }
    if (rv11.r >= 0 && rv11.r === pl11.r && rv11.c === pl11.c && !(pl11.inv > 0)) knockPlayer11('KNOCKED OFF!');
  },
  render() {
    clear(N);
    for (let r = 0; r < ROWS11; r++) for (let c = 0; c <= r; c++) {
      const [x, y] = cellXY11(r, c), o = own11[r][c];
      const top = o === 1 ? CY : o === 2 ? R : DG, side = o === 1 ? B : o === 2 ? PK : M;
      rect(x, y + 6, 32, 10, top); rect(x + 1, y + 16, 30, 6, side); rect(x + 2, y + 4, 28, 2, top);
      px(x + 16, y + 10, W);
    }
    const [px0, py0] = cellXY11(pl11.r, pl11.c), [rx, ry] = rv11.r >= 0 ? cellXY11(rv11.r, rv11.c) : [0, 0];
    if (rv11.r >= 0) { rect(rx + 13, ry - 4, 6, 8, K); fillCircle(rx + 16, ry - 6, 4, GR); rect(rx + 14, ry - 8, 2, 2, W); }
    if (!(hopCd11 > 0.2 && (Math.floor(T11 * 20) & 1))) { rect(px0 + 13, py0 - 4, 6, 8, K); fillCircle(px0 + 16, py0 - 6, 4, Y); rect(px0 + 14, py0 - 8, 2, 2, W); }
    rect(0, 200, VW, 24, DG); rect(0, 200, VW, 1, W);
  },
  hud(mode) {
    txt('YOU ' + String(count11(1)).padStart(2, '0'), 4, 4, CY, 8);
    txt('RIVAL ' + String(count11(2)).padStart(2, '0'), 252, 4, R, 8, 'right');
    txt(String(Math.ceil(tleft11)), 128, 4, tleft11 < 10 ? R : W, 8, 'center');
    for (let i = 0; i < Math.max(0, lives11); i++) rect(6 + i * 10, 208, 6, 6, Y);
    txt('L/R HOP DOWN   A/B HOP UP', 128, 206, W, 8, 'center');
    for (const p of pops11) txt(p.s, clamp(Math.round(p.x), 24, 232), Math.round(p.y - p.t * 12), p.col, 8, 'center');
  },
  info() { return { you:count11(1), rival:count11(2), lives:lives11, time:Math.round(tleft11), pr:pl11.r, pc:pl11.c }; },
  bot() {
    const i = { l:0, r:0, u:0, d:0, a:0, b:0, pa:0, pb:0, start:0 }, p = pl11;
    if (hopCd11 > 0) return i;
    let best = null, bd = 1e9, first = null;
    const q = [[p.r, p.c, 0, null]], seen = new Set([p.r + ',' + p.c]);
    for (let h = 0; h < q.length; h++) {
      const [r, c, d, f0] = q[h];
      if ((own11[r][c] !== 1 || (rv11.r === r && rv11.c === c)) && d > 0 && d < bd) { bd = d; best = [r, c]; first = f0; }
      for (const [a, b] of [[-1, -1], [-1, 0], [1, 0], [1, 1]]) { const nr = r + a, nc = c + b, k = nr + ',' + nc; if (cellOK11(nr, nc) && !seen.has(k)) { seen.add(k); q.push([nr, nc, d + 1, f0 || [a, b]]); } }
    }
    if (!first) return i;
    const dr = first[0], dc = first[1];
    if (dr === -1 && dc === -1) { i.u = 1; i.l = 1; } else if (dr === -1 && dc === 0) { i.u = 1; i.r = 1; }
    else if (dr === 1 && dc === 0) { i.d = 1; i.l = 1; } else if (dr === 1 && dc === 1) { i.d = 1; i.r = 1; }
    return i;
  },
};
function score11() { /* hook: knocking the rival off is worth bonus points on the score line */ }
