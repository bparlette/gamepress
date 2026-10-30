/* ===== DEEP ROCK DIG DUG: Dig Dug x Deep Rock Galactic. A dwarf miner tunnels for 5 gold veins while a bug swarm digs in;
   cannon the bugs, drop boulders, then grapple the extraction pod before oxygen runs out. ===== */
// KEYS: ARROWS dig and move, A fire drill cannon (facing), B blast flare (stuns/kills nearby bugs, 3 charges)
const GW = 32, GH = 24, OY = 16, SX27 = 16;
const open27 = (S, x, y) => x >= 0 && y >= 0 && x < GW && y < GH && !S.d[y][x] && !S.bo.some(b => b.x === x && b.y === y);
function bolt27(S) {
  const f = S.face; S.cd = 0.45; S.bolt = { x:S.p.x, y:S.p.y, f, t:0.15 }; sfx('tick');
  for (let k = 1; k <= 5; k++) {
    const x = S.p.x + f[0] * k, y = S.p.y + f[1] * k; if (!open27(S, x, y)) break;
    const e = S.en.find(q => q.x === x && q.y === y); if (e) { kill27(S, e, 100, 'POP'); break; }
  }
}
function kill27(S, e, v, m) { S.en.splice(S.en.indexOf(e), 1); S.score += v; S.kills++; sfx('boom'); popup(S, m + ' +' + v, e.x * 8, OY + e.y * 8 - 6, Y); }
function hurt27(S) { if (S.inv > 0) return; S.hp--; S.inv = 1.6; sfx('die'); popup(S, 'OUCH!', S.p.x * 8, OY + S.p.y * 8 - 8, R); }
const GAME = kit({
  id:'g27', t1:'DEEP ROCK', t2:'DIG DUG', sub:'MINE GOLD. SURVIVE THE SWARM.', seed:27, off:27, secs:50,
  music:MUS(124, -24, true),
  setup(S) {
    S.d = []; for (let y = 0; y < GH; y++) S.d.push(new Array(GW).fill(y >= 2 ? 1 : 0));
    S.p = { x:SX27, y:2 }; S.face = [0, 1]; S.hold = 0; S.pd = ''; S.mt = 0; S.cd = 0; S.hp = 3; S.inv = 0; S.o2 = 55; S.gold = 0; S.fl = 3; S.kills = 0; S.bolt = null; S.sp = 3; S.alert = 0; S.pod = 0; S.fx = 0; S.bo = []; S.en = []; S.gv = []; S.rope = 0;
    S.d[2][SX27] = 0; S.d[3][SX27] = 0;
    const gx = [4, 27, 5, 26, 16], gy = [8, 11, 15, 18, 21];
    for (let i = 0; i < 5; i++) S.gv.push({ x:gx[i] + rint(S, 3) - 1, y:gy[i] + rint(S, 2) });
    for (let i = 0; i < 5; i++) { const x = 3 + rint(S, 26), y = 5 + rint(S, 12); if (Math.abs(x - SX27) > 1 && !S.gv.some(g => g.x === x && g.y === y)) S.bo.push({ x, y, t:0, fall:0 }); }
    for (let i = 0; i < 2; i++) S.en.push({ x:4 + rint(S, 24), y:10 + rint(S, 8), t:1 + i, type:i, st:0 });
  },
  step(S, dt, inp) {
    const p = S.p; S.mt -= dt; S.cd -= dt; S.inv -= dt; S.fx -= dt; S.alert -= dt; S.rope -= dt; if (S.bolt) { S.bolt.t -= dt; if (S.bolt.t < 0) S.bolt = null; }
    S.o2 -= dt; if (S.o2 <= 0) return finish(S, 'OUT OF OXYGEN'); if (S.hp <= 0) return finish(S, 'KIA');
    if (S.pod === 2) { if (S.rope < 0 && !S.rope0) { S.rope0 = 1; } if (S.rope < -0.1 && S.rope0) return finish(S, 'EXTRACTED!', Math.round(S.o2) * 20 + S.hp * 200); return; }
    const dir = inp.l ? 'l' : inp.r ? 'r' : inp.u ? 'u' : inp.d ? 'd' : '';
    if (dir) { S.face = { l:[-1, 0], r:[1, 0], u:[0, -1], d:[0, 1] }[dir]; S.hold = dir === S.pd ? S.hold + dt : 0; } else S.hold = -1; S.pd = dir;
    if (dir && S.hold >= 0.07 && S.mt <= 0) {
      const x = p.x + S.face[0], y = p.y + S.face[1];
      if (x >= 0 && x < GW && y >= 2 && y < GH && !S.bo.some(b => b.x === x && b.y === y)) {
        const dig = S.d[y][x]; S.d[y][x] = 0; p.x = x; p.y = y; S.mt = dig ? 0.3 : 0.15;
        if (dig && S.sp === 3) { S.sp = 2; S.alert = 1.8; popup(S, 'SWARM ALERT!', 128, 60, R); sfx('power'); }
        const g = S.gv.findIndex(q => q.x === x && q.y === y);
        if (g >= 0) { S.gv.splice(g, 1); S.gold++; S.score += 500; sfx('coin'); popup(S, 'GOLD ' + S.gold + '/5', x * 8, OY + y * 8 - 8, Y); if (S.gold === 5) { S.pod = 1; popup(S, 'POD INBOUND! RETURN!', 128, 70, CY); } }
      }
    }
    if (S.edge(inp, 'a') && S.cd <= 0) bolt27(S);
    if (S.edge(inp, 'b') && S.fl > 0) { S.fl--; S.fx = 0.4; sfx('power'); for (const e of S.en.slice()) if (Math.hypot(e.x - p.x, e.y - p.y) < 6) kill27(S, e, 150, 'FLARE'); }
    if (S.pod === 1 && p.y <= 3 && Math.abs(p.x - SX27) <= 1) { S.pod = 2; S.rope = 0.8; popup(S, 'GRAPPLE!', 128, 80, Y); sfx('catch'); }
    if (S.sp === 2 && (S.spt = (S.spt === undefined ? 1 : S.spt) - dt) <= 0 && S.en.length < 8) {
      S.spt = 1.8;
      for (let k = 0; k < 8; k++) { const x = rint(S, GW), y = 6 + rint(S, 16); if (Math.hypot(x - p.x, y - p.y) > 8) { S.en.push({ x, y, t:1, type:rint(S, 2), st:0 }); S.d[y][x] = 0; break; } }
    }
    for (const e of S.en.slice()) {
      e.t -= dt; e.st -= dt;
      if (e.st <= 0 && e.t <= 0) {
        const dx = p.x - e.x, dy = p.y - e.y, ord = Math.abs(dx) > Math.abs(dy) ? [[Math.sign(dx), 0], [0, Math.sign(dy)]] : [[0, Math.sign(dy)], [Math.sign(dx), 0]];
        for (const [a, b] of ord) { if ((!a && !b) || e.x + a < 0 || e.x + a >= GW || e.y + b < 2 || e.y + b >= GH || S.bo.some(q => q.x === e.x + a && q.y === e.y + b)) continue; const dig = S.d[e.y + b][e.x + a]; S.d[e.y + b][e.x + a] = 0; e.x += a; e.y += b; e.t = dig ? 0.6 : 0.32; break; }
        if (!e.t || e.t <= 0) e.t = 0.3;
      }
      if (e.x === p.x && e.y === p.y) hurt27(S);
      if (e.type === 1 && e.y === p.y && Math.abs(e.x - p.x) <= 2 && Math.abs(e.x - p.x) > 0 && S.T % 3 < 0.5) hurt27(S);
    }
    for (const b of S.bo) {
      if (!b.fall && b.y + 1 < GH && !S.d[b.y + 1][b.x] && !S.bo.some(q => q.x === b.x && q.y === b.y + 1)) { b.t += dt; if (b.t > 0.6) { b.fall = 1; b.t = 0; } }
      else if (!b.fall) b.t = 0;
      if (b.fall) { b.t += dt; if (b.t > 0.12) { b.t = 0; if (b.y + 1 < GH && !S.d[b.y + 1][b.x]) { b.y++; for (const e of S.en.slice()) if (e.x === b.x && e.y === b.y) kill27(S, e, 400, 'CRUSH'); if (p.x === b.x && p.y === b.y) hurt27(S); } else b.fall = 0; } }
    }
  },
  draw(S) {
    clear(N); rect(0, 0, VW, OY + 16, SKY); rect(0, OY + 16, VW, 8, GR);
    for (let y = 2; y < GH; y++) for (let x = 0; x < GW; x++) { rect(x * 8, OY + y * 8, 8, 8, S.d[y][x] ? (y < 8 ? S_COL27 : y < 15 ? T : M) : K); if (S.d[y][x] && hash(x, y) % 5 === 0) px(x * 8 + 3, OY + y * 8 + 3, y < 8 ? T : BRK); }
    for (const g of S.gv) { const x = g.x * 8, y = OY + g.y * 8; if (S.d[g.y][g.x] || S.fx > 0) { rect(x + 1, y + 1, 6, 6, Y); px(x + 2, y + 2, W); px(x + 5, y + 5, O); } }
    for (const b of S.bo) { fillCircle(b.x * 8 + 4, OY + b.y * 8 + 4, 4, L); px(b.x * 8 + 3, OY + b.y * 8 + 2, W); px(b.x * 8 + 5, OY + b.y * 8 + 6, D); }
    for (const e of S.en) { const x = e.x * 8, y = OY + e.y * 8, c = e.type ? GR : R; if (e.type) { rect(x, y + 2, 8, 5, c); rect(x + 5, y, 3, 3, c); px(x + 6, y + 1, W); rect(x, y + 6, 2, 2, F); } else { fillCircle(x + 4, y + 4, 4, c); rect(x + 1, y + 2, 6, 2, W); px(x + 3, y + 3, K); px(x + 5, y + 3, K); } }
    if (S.pod) { const x = SX27 * 8; rect(x, OY + 3, 8, 14, W); rect(x + 2, OY - 3, 4, 7, R); rect(x - 2, OY + 12, 4, 6, R); rect(x + 6, OY + 12, 4, 6, R); rect(x + 3, OY + 5, 3, 3, CY); }
    const p = S.p, px0 = p.x * 8, py0 = OY + p.y * 8;
    if (S.bolt) { const f = S.bolt.f; for (let k = 1; k <= 5; k++) { const x = (p.x + f[0] * k) * 8 + 3, y = OY + (p.y + f[1] * k) * 8 + 3; if (!open27(S, p.x + f[0] * k, p.y + f[1] * k)) break; rect(x - 1, y - 1, 3, 3, CY); } }
    if (S.rope > 0 || S.pod === 2) for (let y = OY + 6; y < py0; y += 3) px(SX27 * 8 + 4, y, W);
    if (!(S.inv > 0 && (S.T * 20 & 1))) { rect(px0 + 1, py0 + 1, 6, 3, Y); px(px0 + 4, py0, W); rect(px0 + 2, py0 + 3, 4, 2, S_COL27); rect(px0 + 1, py0 + 5, 6, 2, O); rect(px0, py0 + 6, 3, 2, K); rect(px0 + 5, py0 + 6, 3, 2, K); rect(px0 + 3 + S.face[0] * 4 - (S.face[0] ? 0 : 0), py0 + 4 + S.face[1] * 3, 2, 2, L); }
    if (S.fx > 0) for (let r = 4; r < 48; r += 6) { const rr = (0.4 - S.fx) * 120; if (Math.abs(r - rr) < 6) for (let a = 0; a < 360; a += 20) px(px0 + 4 + Math.cos(a * rad) * r, py0 + 4 + Math.sin(a * rad) * r, Y); }
  },
  hud(S) {
    rect(0, 0, VW, 14, N); txt('O2', 4, 3, CY, 8); rect(24, 3, 70, 8, DG); rect(24, 3, Math.max(0, Math.round(70 * S.o2 / 55)), 8, S.o2 < 12 ? R : CY);
    txt('GOLD ' + S.gold + '/5', 104, 3, Y, 8); txt('FLARE ' + S.fl, 190, 3, O, 8); for (let i = 0; i < S.hp; i++) rect(4 + i * 9, OY + 2, 6, 6, R);
    txt('ARROWS DIG  A CANNON  B FLARE', 128, 214, W, 8, 'center');
  },
  bot(S, i) {
    const p = S.p;
    if (S.pod === 2) return i;
    const dirs = [[1, 0, 'r'], [-1, 0, 'l'], [0, 1, 'd'], [0, -1, 'u']];
    for (const [a, b, k] of dirs) for (let n = 1; n <= 5; n++) { const x = p.x + a * n, y = p.y + b * n; if (!open27(S, x, y)) break; if (S.en.some(e => e.x === x && e.y === y)) { if (S.face[0] === a && S.face[1] === b) { if (S.cd <= 0) { i.a = 1; return i; } } else { i[k] = 1; return i; } } }
    if (S.fl > 0 && S.en.filter(e => Math.hypot(e.x - p.x, e.y - p.y) < 3).length >= 1 && S.en.some(e => Math.hypot(e.x - p.x, e.y - p.y) < 2)) { i.b = 1; return i; }
    const sx = S.pod === 1 ? SX27 : -1, st = bfs(GW, GH, (x, y) => y >= 2 && !S.bo.some(b => b.x === x && b.y === y), p.x, p.y, (x, y) => S.pod === 1 ? (x === SX27 && y === 3) : S.gv.some(g => g.x === x && g.y === y));
    if (st) dirInp(i, st.dx, st.dy);
    return i;
  },
  info(S) { return { gold:S.gold, hp:S.hp, o2:Math.round(S.o2), en:S.en.length, kills:S.kills, pod:S.pod }; },
});
const S_COL27 = 10;
