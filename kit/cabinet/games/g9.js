/* ===== DIG UP: Dig Dug x Ice Climber. Dig your own staircase up a mountain, stun the diggers with the pump,
   and drop the dirt you dig onto them. Reach the summit before the clock runs out. ===== */
const GW9 = 16, GH9 = 36, TS9 = 16;      // grid: 0 unused, 1 dirt, 2 hole (dug, walkable, does not fall)
let G9, P9, E9, CL9, lives9, score9, tleft9, T9, att9, rng9, spawnT9, cam9, pops9;
let popsList9 = [];
function popup9(s, c, r, col) { popsList9.push({ s, x:c * TS9 + 8, y:r, col, t:0 }); if (popsList9.length > 4) popsList9.shift(); }
function setup9(isAtt) {
  att9 = !!isAtt; rng9 = mkRng(runSeed(isAtt ? 71 : null, 17));
  G9 = []; for (let r = 0; r < GH9; r++) G9.push(new Array(GW9).fill(1));
  G9[1][8] = 2; G9[2][8] = 2;
  P9 = { c:8, r:1, fx:1, moveT:0, digT:0, inv:1, pumpT:0 };
  E9 = []; CL9 = []; popsList9 = []; lives9 = 3; score9 = 0; tleft9 = 90; T9 = 0; spawnT9 = 4; cam9 = 0;
}
const inB9 = (c, r) => c >= 0 && r >= 0 && c < GW9 && r < GH9;
function hurt9(msg) {
  if (P9.inv > 0) return;
  lives9--; P9.inv = 1.5; sfx('hurt'); popup9(msg, P9.c, P9.r + 1, R);
  if (lives9 <= 0) { if (att9) setup9(true); else endGame(score9, 'GAME OVER'); }
}
function dig9(c, r) {
  if (!inB9(c, r) || G9[r][c] !== 1) return false;
  G9[r][c] = 2; score9 += 5; sfx('punch');
  const up = r + 1 < GH9 ? G9[r + 1][c] : 0;   // dirt above the dug tile drops down as a trap
  if (up === 1 && E9.some(e => e.c === c && e.r < r + 1 && e.r > r - 7)) { G9[r + 1][c] = 2; CL9.push({ c, r:r + 1, t:0 }); popup9('TRAP!', c, r + 2, O); }
  return true;
}
const GAME = {
  id:'g9', t1:'DIG', t2:'UP', sub:'DIG A STAIRCASE. DROP THE DIRT.',
  music:{ bpm:138, lead:'square', chords:[{ root:-24, tones:[0, 4, 7] }, { root:-28, tones:[0, 3, 7] }, { root:-26, tones:[0, 4, 7] }, { root:-21, tones:[0, 4, 7] }],
          arp:[0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 3, 2], bass:[0, 3, 6, 8, 11, 14], snare:[4, 12], kick:[0, 4, 8, 12], hat:true },
  init(isAtt) { setup9(isAtt); },
  update(dt, inp, mode) {
    att9 = mode === 'title'; T9 += dt;
    if (att9 && T9 > 75) { setup9(true); return; }
    const p = P9;
    for (let i = popsList9.length - 1; i >= 0; i--) { popsList9[i].t += dt; if (popsList9[i].t > 1.2) popsList9.splice(i, 1); }
    p.inv = Math.max(0, p.inv - dt); p.moveT = Math.max(0, p.moveT - dt); p.digT = Math.max(0, p.digT - dt); p.pumpT = Math.max(0, p.pumpT - dt);
    tleft9 -= dt; if (tleft9 <= 0) { if (att9) setup9(true); else endGame(score9, 'TIME UP'); return; }
    const dx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    if (dx) p.fx = dx;
    if (p.moveT <= 0) {
      if (dx && !inp.a && G9[p.r][p.c + dx] === 2 && inB9(p.c + dx, p.r)) { p.c += dx; p.moveT = 0.16; }
      else if (inp.u && !inp.a && G9[p.r + 1] && G9[p.r + 1][p.c] === 2) { p.r++; p.moveT = 0.18; }
      else if (inp.d && !inp.a && p.r > 0 && G9[p.r - 1][p.c] === 2) { p.r--; p.moveT = 0.18; }
    }
    if (inp.a && p.digT <= 0) {
      const tc = inp.u ? p.c : p.c + p.fx, tr = inp.u ? p.r + 1 : p.r;
      if (dig9(tc, tr)) p.digT = 0.42;
    }
    if (inp.pb && p.pumpT <= 0) {
      p.pumpT = 0.5;
      for (let k = 1; k <= 4; k++) { const hit = E9.find(e => e.r === p.r && e.c === p.c + p.fx * k); if (hit) { hit.stun = 3; popup9('PUMP!', hit.c, hit.r + 1, CY); sfx('power'); break; } }
    }
    for (let i = CL9.length - 1; i >= 0; i--) {
      const cl = CL9[i]; cl.t += dt; if (cl.t < 0.12) continue; cl.t = 0;
      const below = cl.r - 1 >= 0 ? G9[cl.r - 1][cl.c] : 1;
      if (below === 2) {
        cl.r--;
        const e = E9.findIndex(x => x.r === cl.r && x.c === cl.c);
        if (e >= 0) { E9.splice(e, 1); score9 += 150; popup9('CRUSH +150', cl.c, cl.r + 1, O); sfx('pop'); CL9.splice(i, 1); continue; }
      } else { G9[cl.r][cl.c] = 1; CL9.splice(i, 1); sfx('land'); }
    }
    spawnT9 -= dt;
    if (spawnT9 <= 0 && E9.length < 4) {
      spawnT9 = 5 + rng9() * 3;
      const r0 = Math.max(2, p.r - 6), r1 = Math.min(GH9 - 3, p.r + 2), rr = r0 + Math.floor(rng9() * (r1 - r0 + 1)), cc = Math.floor(rng9() * (GW9 - 1));
      if (G9[rr][cc] === 1 && G9[rr][cc + 1] === 1 && Math.abs(cc - p.c) >= 3) { G9[rr][cc] = 2; G9[rr][cc + 1] = 2; E9.push({ c:cc, r:rr, dx:rng9() < 0.5 ? 1 : -1, cd:0.3, stun:0 }); }
    }
    for (let i = E9.length - 1; i >= 0; i--) {
      const e = E9[i]; e.stun = Math.max(0, e.stun - dt); e.cd -= dt;
      if (e.cd <= 0) {
        e.cd = e.stun > 0 ? 0.3 : 0.28;
        if (e.stun <= 0) { const n = e.c + e.dx; if (inB9(n, e.r) && G9[e.r][n] === 2) e.c = n; else e.dx = -e.dx; }
      }
      if (e.r === p.r && e.c === p.c) {
        if (e.stun > 0) { E9.splice(i, 1); score9 += 100; popup9('+100', e.c, e.r + 1, Y); sfx('coin'); }
        else hurt9('CAUGHT!');
      }
    }
    if (p.r >= GH9 - 1) { if (att9) setup9(true); else endGame(score9 + Math.round(tleft9) * 5, 'SUMMIT FINISH!'); return; }
    cam9 = clamp(p.r - 4, 0, GH9 - 14);
  },
  render() {
    clear(CY);
    for (let r = cam9; r < Math.min(GH9, cam9 + 15); r++) for (let c = 0; c < GW9; c++) {
      const sy = 224 - 16 * (r - cam9 + 1), sx = c * TS9, v = G9[r][c];
      if (v === 1) { rect(sx, sy, 16, 16, T); px(sx + 3, sy + 4, O); px(sx + 10, sy + 9, O); px(sx + 6, sy + 12, M); rect(sx, sy, 16, 1, O); }
      else if (v === 2) { rect(sx, sy, 16, 16, K); rect(sx + 2, sy + 2, 12, 12, D); }
    }
    if (GH9 - 1 >= cam9 && GH9 - 1 < cam9 + 15) { const sy = 224 - 16 * (GH9 - 1 - cam9 + 1); rect(120, sy - 22, 2, 22, W); rect(122, sy - 22, 10, 6, R); }
    for (const cl of CL9) { const sy = 224 - 16 * (cl.r - cam9 + 1); rect(cl.c * TS9 + 1, sy + 1, 14, 14, O); rect(cl.c * TS9 + 3, sy + 3, 6, 4, Y); }
    for (const e of E9) { const sy = 224 - 16 * (e.r - cam9 + 1), cx = e.c * TS9 + 8, cy = sy + 8, col = e.stun > 0 ? (Math.floor(T9 * 10) & 1 ? W : CY) : R; fillCircle(cx, cy, 6, col); rect(cx - 3, cy - 2, 2, 2, K); rect(cx + 1, cy - 2, 2, 2, K); }
    const p = P9, sy = 224 - 16 * (p.r - cam9 + 1), cx = p.c * TS9 + 8, cy = sy + 8;
    if (!(p.inv > 0 && (Math.floor(T9 * 16) & 1))) {
      rect(cx - 5, cy - 2, 10, 8, B); fillCircle(cx, cy - 5, 4, S); rect(cx - 4, cy - 9, 8, 3, Y);
      rect(cx + p.fx * 3 - 1, cy - 4, 2, 2, K);
    }
    for (const q of popsList9) txt(q.s, clamp(Math.round(q.x), 24, 232), 40 + Math.round(q.t * 8) + (q.y % 8), q.col, 8, 'center');
  },
  hud(mode) {
    txt('HEIGHT ' + String(Math.round(Math.min(100, P9.r / (GH9 - 1) * 100))) + '%', 4, 4, W, 8);
    txt(String(Math.ceil(tleft9)), 128, 4, tleft9 < 15 ? R : W, 8, 'center');
    txt('SCORE ' + pad5(score9), 252, 4, Y, 8, 'right');
    for (let i = 0; i < Math.max(0, lives9); i++) rect(6 + i * 10, 214, 6, 6, R);
    if (mode === 'play' && T9 < 8) txt('UP + A DIGS UP. B PUMPS.', 128, 200, W, 8, 'center');
  },
  info() { return { score:score9, height:P9.r, lives:lives9, time:Math.round(tleft9), enemies:E9.length, traps:CL9.length, c:P9.c }; },
  bot() {
    const i = { l:0, r:0, u:0, d:0, a:0, b:0, pa:0, pb:0, start:0 }, p = P9;
    const cost = new Array(GW9 * GH9).fill(1e9), par = new Array(GW9 * GH9).fill(-1), done = new Array(GW9 * GH9).fill(false);
    const id = (c, r) => r * GW9 + c; cost[id(p.c, p.r)] = 0;
    for (;;) {
      let bi = -1, bc = 1e9; for (let k = 0; k < cost.length; k++) if (!done[k] && cost[k] < bc) { bc = cost[k]; bi = k; }
      if (bi < 0) break; done[bi] = true;
      const c = bi % GW9, r = (bi / GW9) | 0;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr; if (!inB9(nc, nr)) continue;
        const w = G9[nr][nc] === 2 ? 1 : G9[nr][nc] === 1 ? 3 : 99, k = id(nc, nr);
        if (bc + w < cost[k]) { cost[k] = bc + w; par[k] = bi; }
      }
    }
    let goal = -1, gb = 1e9; for (let c = 0; c < GW9; c++) { const k = id(c, GH9 - 1); if (cost[k] < gb) { gb = cost[k]; goal = k; } }
    if (goal < 0) return i;
    let k = goal, guard = 0; while (par[k] !== id(p.c, p.r) && par[k] >= 0 && guard++ < 2000) k = par[k];
    if (par[k] < 0 && goal !== id(p.c, p.r)) return i;
    const nc = k % GW9, nr = (k / GW9) | 0, dc = nc - p.c, dr = nr - p.r;
    if (goal === id(p.c, p.r)) return i;
    if (dr === 1) { i.u = 1; if (G9[nr][nc] === 1) i.a = 1; }
    else if (dr === -1) i.d = 1;
    else if (dc !== 0) { if (dc > 0) i.r = 1; else i.l = 1; if (G9[nr][nc] === 1) i.a = 1; }
    for (const e of E9) if (e.r === p.r && Math.abs(e.c - p.c) <= 4 && e.stun <= 0 && p.pumpT <= 0 && (e.c - p.c) * p.fx > 0) i.pb = 1;
    return i;
  },
};
