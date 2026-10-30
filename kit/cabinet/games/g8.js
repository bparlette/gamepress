/* ===== MAZE WRECKER: Pac-Man x Wrecking Crew. Smash the maze walls to reroute the patrol bots hunting you,
   grab the dots your wrecking reveals, and finish before the maze seals. Walls are both weapon and escape route. ===== */
const MW = 16, MH = 12, OY7 = 16, GOAL7 = 26, TIME7 = 80, LIVES7 = 3;
const DIRS7 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
let grid, pel, hid, regrow7, pl7, gh7, parts7, pops7, score7, pel7, tleft7, lives7, att7, rng7, T7, shake7, hint7;

const free7 = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && grid[y][x] === '.';
function popup7(s, x, y, col) { pops7.push({ s, x, y, col, t:0 }); if (pops7.length > 4) pops7.shift(); }
function burst7(x, y, col, n) { for (let i = 0; i < n; i++) parts7.push({ x, y, vx:(vr() - 0.5) * 110, vy:-vr() * 80, t:0, col }); }

function mkEnt(x, y) { return { x, y, tx:x, ty:y, mv:false, dx:0, dy:0 }; }
function setup7(isAtt) {
  att7 = !!isAtt;
  rng7 = mkRng(runSeed(isAtt ? 41 : null, 15));
  grid = []; pel = []; hid = []; regrow7 = [];
  const keep = new Set(['1,10', '1,9', '2,9', '3,10', '14,1', '13,1', '12,1', '13,2']);
  for (let y = 0; y < MH; y++) {
    const gr = [], pr = [], hr = [];
    for (let x = 0; x < MW; x++) {
      let c = '.';
      if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) c = 'X';
      else if (x % 2 === 0 && y % 2 === 0) c = 'X';
      else if (!keep.has(x + ',' + y) && rng7() < 0.45) c = '#';
      gr.push(c); pr.push(false); hr.push(c === '#' && rng7() < 0.5);
    }
    grid.push(gr); pel.push(pr); hid.push(hr);
  }
  let total = 0; for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (hid[y][x]) total++;
  let guard = 0;
  while (total < GOAL7 + 8 && guard++ < 400) { const x = 1 + Math.floor(rng7() * 14), y = 1 + Math.floor(rng7() * 10); if (grid[y][x] === '#' && !hid[y][x]) { hid[y][x] = true; total++; } }
  for (let k = 0, n = 0; n < 6 && k < 300; k++) { const x = 1 + Math.floor(rng7() * 14), y = 1 + Math.floor(rng7() * 10); if (grid[y][x] === '.' && !pel[y][x] && !keep.has(x + ',' + y) && x + y > 6) { pel[y][x] = true; n++; } }
  pl7 = Object.assign(mkEnt(1, 10), { fx:1, fy:0, swing:0, scd:0, dash:0, dcd:0, inv:1.5, want:null });
  gh7 = [{ k:'r', col:R }, { k:'p', col:PK }, { k:'c', col:CY }].map((o, i) => Object.assign(mkEnt(14 - i, 1), o, { stun:1.2, wander:0, face:-1 }));
  parts7 = []; pops7 = []; score7 = 0; pel7 = 0; tleft7 = TIME7; lives7 = LIVES7; T7 = 0; shake7 = 0; hint7 = 0;
}
function respawn7() {
  Object.assign(pl7, mkEnt(1, 10), { inv:2.2, swing:0 });
  gh7.forEach((g, i) => Object.assign(g, mkEnt(14 - i, 1), { stun:1.6 }));
}
function loseLife7(msg) {
  lives7--; sfx(lives7 < 0 ? 'die' : 'hurt'); shake7 = 0.3; burst7(pl7.x * 16 + 8, OY7 + pl7.y * 16 + 8, R, 10);
  if (lives7 <= 0) { if (att7) setup7(true); else endGame(score7, msg || 'CAUGHT!'); return; }
  respawn7();
}
function moveEnt(e, dt, sp, choose) {
  let rem = sp * dt, guard = 0;
  while (rem > 1e-6 && guard++ < 6) {
    if (!e.mv) {
      const d = choose(e); if (!d) break;
      e.dx = d[0]; e.dy = d[1]; e.tx = Math.round(e.x) + d[0]; e.ty = Math.round(e.y) + d[1]; e.mv = true;
    }
    const ddx = e.tx - e.x, ddy = e.ty - e.y, dist = Math.abs(ddx) + Math.abs(ddy);
    if (rem >= dist) { e.x = e.tx; e.y = e.ty; e.mv = false; rem -= dist; }
    else { e.x += Math.sign(ddx) * rem; e.y += Math.sign(ddy) * rem; rem = 0; }
  }
}
function bfs7(tx, ty) {
  const d = new Int16Array(MW * MH).fill(-1), q = [[tx, ty]]; d[ty * MW + tx] = 0;
  for (let h = 0; h < q.length; h++) {
    const [x, y] = q[h];
    for (const [dx, dy] of DIRS7) { const nx = x + dx, ny = y + dy; if (free7(nx, ny) && d[ny * MW + nx] < 0) { d[ny * MW + nx] = d[y * MW + x] + 1; q.push([nx, ny]); } }
  }
  return d;
}
function ghostChoose(g) {
  if (g.stun > 0) return null;
  const gx = Math.round(g.x), gy = Math.round(g.y), px = Math.round(pl7.x), py = Math.round(pl7.y);
  let tx = px, ty = py;
  if (g.k === 'p') { for (let n = 3; n > 0; n--) { const ax = px + pl7.fx * n, ay = py + pl7.fy * n; if (free7(ax, ay)) { tx = ax; ty = ay; break; } } }
  let opts = DIRS7.filter(d => free7(gx + d[0], gy + d[1]) && !(d[0] === -g.dx && d[1] === -g.dy));
  if (!opts.length) opts = DIRS7.filter(d => free7(gx + d[0], gy + d[1]));
  if (!opts.length) return null;
  if (g.k === 'c') { g.wander -= 0; }
  if (g.k === 'c' && (Math.floor(T7 / 5) & 1) === 0) return opts[Math.floor(rng7() * opts.length)];
  const dist = bfs7(tx, ty); let best = null, bd = 1e9;
  for (const d of opts) { const v = dist[(gy + d[1]) * MW + gx + d[0]]; if (v >= 0 && v < bd) { bd = v; best = d; } }
  return best || opts[Math.floor(rng7() * opts.length)];
}
function plChoose(p) {
  const w = p.want; if (!w) return null;
  const x = Math.round(p.x), y = Math.round(p.y);
  return free7(x + w[0], y + w[1]) ? w : null;
}
function breakWall(x, y) {
  grid[y][x] = '.'; pel[y][x] = hid[y][x]; hid[y][x] = false;
  regrow7.push({ x, y, t:tleft7 > 30 ? 10 : 5 });
  score7 += 5; sfx('punch'); burst7(x * 16 + 8, OY7 + y * 16 + 8, BRK, 7); shake7 = Math.max(shake7, 0.08);
  if (pel[y][x]) popup7('DOT!', x * 16 + 8, OY7 + y * 16, Y);
}
function smash() {
  const p = pl7; p.swing = 0.2; p.scd = 0.3; sfx('swing');
  for (const g of gh7) {
    const dx = g.x - p.x, dy = g.y - p.y, along = dx * p.fx + dy * p.fy, perp = Math.abs(dx * p.fy - dy * p.fx);
    if (along > -0.2 && along < 1.25 && perp < 0.65 && g.stun < 2) { g.stun = 3; score7 += 200; sfx('power'); popup7('STUN +200', g.x * 16 + 8, OY7 + g.y * 16 - 4, CY); burst7(g.x * 16 + 8, OY7 + g.y * 16 + 8, Y, 8); return; }
  }
  if (p.mv) return;
  const x = Math.round(p.x) + p.fx, y = Math.round(p.y) + p.fy;
  if (x >= 0 && y >= 0 && x < MW && y < MH) {
    if (grid[y][x] === '#') breakWall(x, y);
    else if (grid[y][x] === 'X') { sfx('tick'); shake7 = Math.max(shake7, 0.05); }
  }
}

const GAME = {
  id:'g8', t1:'MAZE', t2:'WRECKER', sub:'SMASH WALLS. FIND DOTS. ESCAPE.',
  music:{ bpm:152, lead:'square', chords:[{ root:-24, tones:[0, 3, 7] }, { root:-22, tones:[0, 3, 7] }, { root:-27, tones:[0, 4, 7] }, { root:-26, tones:[0, 3, 8] }],
          arp:[0, -1, 1, -1, 2, -1, 1, -1, 0, -1, 1, 2, 1, -1, 2, -1], bass:[0, 3, 6, 8, 11, 14], snare:[4, 12], kick:[0, 6, 8, 10], hat:true },
  init(isAtt) { setup7(isAtt); },
  update(dt, inp, mode) {
    att7 = mode === 'title'; T7 += dt; if (shake7 > 0) shake7 -= dt;
    if (att7 && T7 > 80) { setup7(true); return; }
    const p = pl7;
    for (let i = parts7.length - 1; i >= 0; i--) { const q = parts7[i]; q.t += dt; q.vy += 300 * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.t > 0.6) parts7.splice(i, 1); }
    for (let i = pops7.length - 1; i >= 0; i--) { pops7[i].t += dt; if (pops7[i].t > 1.2) pops7.splice(i, 1); }
    p.inv = Math.max(0, p.inv - dt); p.swing = Math.max(0, p.swing - dt); p.scd = Math.max(0, p.scd - dt); p.dash = Math.max(0, p.dash - dt); p.dcd = Math.max(0, p.dcd - dt);
    /* input to wanted direction */
    const ix = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), iy = (inp.d ? 1 : 0) - (inp.u ? 1 : 0);
    let want = null;
    if (ix && iy) {
      const horizMove = p.mv ? p.dx !== 0 : true;
      want = horizMove ? [0, iy] : [ix, 0];
      if (!free7(Math.round(p.x) + want[0], Math.round(p.y) + want[1])) want = horizMove ? [ix, 0] : [0, iy];
    } else if (ix) want = [ix, 0]; else if (iy) want = [0, iy];
    p.want = want;
    if (want) { p.fx = want[0]; p.fy = want[1]; if (p.mv && want[0] === -p.dx && want[1] === -p.dy) { p.tx -= p.dx; p.ty -= p.dy; p.dx = -p.dx; p.dy = -p.dy; } }
    if (inp.pb && p.dcd <= 0) { p.dash = 0.3; p.dcd = 1.6; sfx('swing'); }
    if (inp.pa && p.scd <= 0) smash();
    moveEnt(p, dt, p.dash > 0 ? 7 : 4.1, plChoose);
    /* dots */
    const cx = Math.round(p.x), cy = Math.round(p.y);
    if (Math.hypot(p.x - cx, p.y - cy) < 0.45 && pel[cy][cx]) { pel[cy][cx] = false; pel7++; score7 += 10; sfx('coin'); popup7('+10', cx * 16 + 8, OY7 + cy * 16 - 2, W); }
    /* walls regrow */
    for (let i = regrow7.length - 1; i >= 0; i--) {
      const r = regrow7[i]; r.t -= dt; if (r.t > 0) continue;
      const busy = pel[r.y][r.x] || gh7.some(g => Math.hypot(g.x - r.x, g.y - r.y) < 1) || Math.hypot(p.x - r.x, p.y - r.y) < 1;
      if (busy) { r.t = 0.5; continue; }
      grid[r.y][r.x] = '#'; regrow7.splice(i, 1);
    }
    /* patrol bots */
    const gsp = 3.4 + 0.09 * pel7 + (tleft7 < 30 ? 0.4 : 0);
    for (const g of gh7) {
      g.stun = Math.max(0, g.stun - dt);
      moveEnt(g, dt, gsp, ghostChoose);
      if (g.dx) g.face = g.dx;
      if (g.stun <= 0 && p.inv <= 0 && Math.hypot(g.x - p.x, g.y - p.y) * 16 < 9) { loseLife7('CAUGHT!'); if (mode === 'play' && lives7 <= 0) return; break; }
    }
    tleft7 -= dt;
    if (pel7 >= GOAL7) { score7 += Math.round(Math.max(0, tleft7)) * 10 + lives7 * 300; if (att7) setup7(true); else endGame(score7, 'MAZE CLEAR'); return; }
    if (tleft7 <= 0) { tleft7 = 0; if (att7) setup7(true); else endGame(score7, 'SEALED IN'); return; }
    if (mode === 'play') hint7 += dt;
  },
  render() {
    clear(K);
    const blink = Math.floor(T7 * 2.2) & 1;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const sx = x * 16, sy = OY7 + y * 16, c = grid[y][x];
      if (c === '.') { if ((x + y) & 1) rect(sx, sy, 16, 16, N); px(sx + 8, sy + 8, M); }
      else if (c === 'X') { rect(sx, sy, 16, 16, D); rect(sx, sy, 16, 2, L); rect(sx, sy, 2, 16, L); rect(sx + 14, sy, 2, 16, K); rect(sx, sy + 14, 16, 2, K); rect(sx + 7, sy + 7, 2, 2, K); }
      else {
        rect(sx, sy, 16, 16, BRK); for (let r = 5; r < 16; r += 5) rect(sx, sy + r, 16, 1, M);
        for (let r = 0; r < 3; r++) rect(sx + ((r & 1) ? 4 : 10), sy + r * 5, 1, 5, M);
        rect(sx, sy, 16, 1, O); rect(sx, sy + 15, 16, 1, M);
        if (hid[y][x] && blink) { px(sx + 12, sy + 3, Y); px(sx + 11, sy + 4, Y); px(sx + 13, sy + 4, Y); px(sx + 12, sy + 5, Y); }
      }
      if (pel[y][x]) rect(sx + 6, sy + 6, 4, 4, Y);
    }
    for (const r of regrow7) if (r.t < 1.2 && (Math.floor(T7 * 14) & 1)) { rect(r.x * 16 + 2, OY7 + r.y * 16 + 2, 12, 12, BRK); }
    for (const g of gh7) drawBot(g);
    drawHero();
    for (const q of parts7) px(q.x, q.y, q.col);
    rect(0, 0, VW, OY7, N); rect(0, OY7 - 1, VW, 1, W); rect(0, 208, VW, 16, N); rect(0, 208, VW, 1, W);
    for (let i = 0; i < Math.max(0, lives7); i++) { const x = 6 + i * 12; rect(x, 213, 8, 3, O); rect(x - 1, 216, 10, 2, O); rect(x + 1, 218, 6, 3, S); }
    rect(188, 213, 56, 6, DG); rect(188, 213, Math.round(56 * (pl7.dcd <= 0 ? 1 : 1 - pl7.dcd / 1.6)), 6, pl7.dcd <= 0 ? E : Y);
    rect(60, 213, 100, 6, DG); rect(60, 213, Math.round(100 * tleft7 / TIME7), 6, tleft7 > 30 ? CY : (Math.floor(T7 * 6) & 1) ? R : O);
    if (shake7 > 0) for (let y = OY7; y < 208; y += 6) if (hash(y, Math.floor(T7 * 40)) > 0.6) { const o = Math.round((hash(y, 8) - 0.5) * 4); const row = buf.slice(y * VW, (y + 1) * VW); buf.set(row.subarray(Math.max(0, -o), VW - Math.max(0, o)), y * VW + Math.max(0, o)); }
  },
  hud(mode) {
    txt('SCORE ' + pad5(score7), 4, 4, W, 8); txt('DOTS ' + String(pel7).padStart(2, '0') + '/' + GOAL7, 252, 4, Y, 8, 'right');
    txt(String(Math.ceil(tleft7)), 128, 4, tleft7 < 20 ? R : W, 8, 'center');
    if (mode === 'play' && hint7 < 6) txt('SMASH WALLS!', 128, 100, W, 8, 'center');
    for (const p of pops7) txt(p.s, clamp(Math.round(p.x), 24, 232), Math.round(p.y - p.t * 12), p.col, 8, 'center');
  },
  info() { return { score:score7, dots:pel7, lives:lives7, time:Math.round(tleft7), x:+pl7.x.toFixed(1), y:+pl7.y.toFixed(1), stunned:gh7.filter(g => g.stun > 0).length }; },
  bot() {
    const i = { l:0, r:0, u:0, d:0, a:0, b:0, pa:0, pb:0, start:0 }, p = pl7;
    const px0 = Math.round(p.x), py0 = Math.round(p.y);
    const act = gh7.filter(g => g.stun <= 0);
    for (const g of gh7) {
      const dx = g.x - p.x, dy = g.y - p.y, along = dx * p.fx + dy * p.fy, perp = Math.abs(dx * p.fy - dy * p.fx);
      if (g.stun < 1 && along > -0.2 && along < 1.15 && perp < 0.6 && p.scd <= 0) { i.pa = 1; return i; }
    }
    if (act.some(g => Math.hypot(g.x - p.x, g.y - p.y) < 2.2) && p.dcd <= 0) i.pb = 1;
    const cost = new Float32Array(MW * MH).fill(1e9), par = new Int16Array(MW * MH).fill(-1), done = new Uint8Array(MW * MH);
    const tc = (x, y) => {
      let c = grid[y][x] === '#' ? 3 : 1;
      for (const g of act) { const m = Math.abs(Math.round(g.x) - x) + Math.abs(Math.round(g.y) - y); if (m <= 3) c += (4 - m) * 7; }
      return c;
    };
    cost[py0 * MW + px0] = 0;
    for (;;) {
      let bi = -1, bc = 1e9; for (let k = 0; k < MW * MH; k++) if (!done[k] && cost[k] < bc) { bc = cost[k]; bi = k; }
      if (bi < 0) break; done[bi] = 1;
      const x = bi % MW, y = (bi / MW) | 0;
      for (const [dx, dy] of DIRS7) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || grid[ny][nx] === 'X') continue; const nk = ny * MW + nx, nc = bc + tc(nx, ny); if (nc < cost[nk]) { cost[nk] = nc; par[nk] = bi; } }
    }
    let tgt = -1, tb = 1e9;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { if (!(pel[y][x] || hid[y][x])) continue; const c = cost[y * MW + x] + (hid[y][x] ? 2 : 0); if (c < tb) { tb = c; tgt = y * MW + x; } }
    if (tgt < 0 || tgt === py0 * MW + px0) return i;
    let k = tgt, guard = 0; while (par[k] !== py0 * MW + px0 && par[k] >= 0 && guard++ < 300) k = par[k];
    const nx = k % MW, ny = (k / MW) | 0, dx = nx - px0, dy = ny - py0;
    if (dx > 0) i.r = 1; else if (dx < 0) i.l = 1; else if (dy > 0) i.d = 1; else if (dy < 0) i.u = 1;
    if (grid[ny][nx] === '#' && !p.mv && p.scd <= 0) i.pa = 1;
    return i;
  },
};
function drawHero() {
  const p = pl7; if (p.inv > 0 && (Math.floor(T7 * 16) & 1)) return;
  const cx = Math.round(p.x * 16 + 8), cy = Math.round(OY7 + p.y * 16 + 8), st = p.mv ? (Math.floor(T7 * 12) & 1) : 0;
  rect(cx - 5, cy + 6, 10, 2, M);
  rect(cx - 4, cy + 3, 3, 4, B); rect(cx + 1, cy + 3, 3, 4, B); rect(cx - 4 - st, cy + 6, 4, 2, K); rect(cx + 1 + st, cy + 6, 4, 2, K);
  rect(cx - 4, cy - 2, 8, 6, B); rect(cx - 3, cy - 2, 2, 3, Y); rect(cx + 1, cy - 2, 2, 3, Y);
  rect(cx - 5, cy - 2, 1, 4, S); rect(cx + 4, cy - 2, 1, 4, S);
  rect(cx - 4, cy - 6, 8, 5, S); rect(cx - 3, cy - 4, 1, 1, K); rect(cx + 2, cy - 4, 1, 1, K);
  rect(cx - 5, cy - 9, 10, 4, O); rect(cx - 6, cy - 6, 12, 1, O); rect(cx - 1, cy - 10, 2, 2, Y);
  if (p.swing > 0) {
    const u = 1 - p.swing / 0.2, hx = cx + p.fx * (6 + Math.round(u * 6)), hy = cy + p.fy * (6 + Math.round(u * 6));
    rect(cx + p.fx * 3 - 1, cy + p.fy * 3 - 1, 3, 3, T); rect(hx - 3, hy - 3, 7, 7, L); rect(hx - 3, hy + 3, 7, 1, D);
  } else { rect(cx + 5, cy - 8, 2, 9, T); rect(cx + 3, cy - 11, 6, 4, L); rect(cx + 3, cy - 8, 6, 1, D); }
}
function drawBot(g) {
  const cx = Math.round(g.x * 16 + 8), cy = Math.round(OY7 + g.y * 16 + 8), st = g.stun > 0, fl = st && (g.stun < 0.9 ? (Math.floor(T7 * 12) & 1) : 0);
  const col = st ? (fl ? W : B) : g.col;
  rect(cx - 6, cy + 6, 12, 2, M);
  rect(cx - 6, cy - 5, 12, 10, col); rect(cx - 5, cy - 7, 10, 2, col); rect(cx - 6, cy + 4, 12, 1, D);
  rect(cx - 7, cy + 5, 14, 3, D); if (!st && g.mv && (Math.floor(T7 * 14) & 1)) rect(cx - 5, cy + 6, 2, 1, L), rect(cx + 3, cy + 6, 2, 1, L);
  rect(cx - 1, cy - 11, 2, 4, D); rect(cx - 2, cy - 12, 4, 2, st ? Y : ((Math.floor(T7 * 10) & 1) ? R : W));
  if (st) { rect(cx - 4, cy - 3, 3, 1, K); rect(cx - 3, cy - 4, 1, 3, K); rect(cx + 2, cy - 3, 3, 1, K); rect(cx + 3, cy - 4, 1, 3, K);
    for (let k = 0; k < 3; k++) { const a = T7 * 5 + k * 2.1; px(cx + Math.cos(a) * 8, cy - 13 + Math.sin(a) * 2, Y); } }
  else { rect(cx - 5, cy - 3, 4, 4, W); rect(cx + 1, cy - 3, 4, 4, W); const ox = g.face > 0 ? 1 : 0; rect(cx - 5 + ox + 1, cy - 2, 2, 2, K); rect(cx + 1 + ox + 1, cy - 2, 2, 2, K); rect(cx - 5, cy - 4, 4, 1, K); rect(cx + 1, cy - 4, 4, 1, K); }
}
