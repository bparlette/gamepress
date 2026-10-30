/* ===== MAZE WRECKER: Pac-Man x Wrecking Crew. Eat every pellet before the maze seals — smash brick walls with the hammer to reroute the ghosts (and yourself). ===== */
const MW = 16, MH = 14, TS = 16, SEAL_T = 150;
const MAP0 = [
  '################',
  '#..............#',
  '#.##.#.BB.#.##.#',
  '#o...B....B...o#',
  '#.####.##.####.#',
  '#......##......#',
  '##.##......##.##',
  '#...#..gg..#...#',
  '#.##...g...B##.#',
  '#..B.##..##.B..#',
  '#o##....B...##o#',
  '#....#....#....#',
  '#......P.......#',
  '################',
];
/* tiles: '#'=steel wall  'B'=brick (smashable)  '.'=pellet  'o'=power pellet  ' '=corridor  'P'=player start  'g'=ghost spawn */
const DIRS = { l:[-1,0], r:[1,0], u:[0,-1], d:[0,1] };
const DK = ['l','r','u','d'];
const WRECKER = [
  '..YYYY..',
  '.YYYYYY.',
  '.YSSSSY.',
  '..SSSS..',
  '.OOOOOO.',
  'OSOOOOSO',
  '.OOOOOO.',
  '..OOOO..',
  '..B..B..',
  '..B..B..',
  '.KK..KK.',
];
const GHOST = [
  '..XXXX..',
  '.XXXXXX.',
  'XXXXXXXX',
  'XWWXXWWX',
  'XWKXXKWX',
  'XXXXXXXX',
  'XXXXXXXX',
  'XX.XX.XX',
];
let tiles, pellets, totalPellets, P, ghosts, parts, popups, fruits;
let score, lives, timeLeft, frightT, elapsed, rng, attract, shake, fruitT, eaten;
function popup(s, x, y, col) { popups.push({ s, x, y, col, t:0 }); if (popups.length > 5) popups.shift(); }
function burst(x, y, col, n) { for (let i = 0; i < n; i++) { const a = vr() * 6.283, sp = 14 + vr() * 40; parts.push({ x, y, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp - 12, t:0, life:0.4 + vr() * 0.3, col }); } }
function tileAt(tx, ty) { if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return '#'; return tiles[ty][tx]; }
function passable(tx, ty) { const t = tileAt(tx, ty); return t !== '#' && t !== 'B'; }
function bfs(sx, sy, brickCost) {
  const dist = new Array(MW * MH).fill(1e9);
  const q = [[sx, sy]]; dist[sy * MW + sx] = 0;
  for (let h = 0; h < q.length; h++) {
    const [x, y] = q[h], d0 = dist[y * MW + x];
    for (const k of DK) {
      const nx = x + DIRS[k][0], ny = y + DIRS[k][1], t = tileAt(nx, ny);
      if (t === '#') continue;
      const c = (t === 'B') ? (brickCost || 6) : 1;
      if (brickCost === 0 && t === 'B') continue;
      if (dist[ny * MW + nx] > d0 + c) { dist[ny * MW + nx] = d0 + c; q.push([nx, ny]); }
    }
  }
  return dist;
}
function setupWorld(att) {
  tiles = MAP0.map(r => r.split(''));
  pellets = 0; totalPellets = 0; const spawns = [];
  let pStart = { x:8, y:12 };
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const c = tiles[y][x];
    if (c === '.' || c === 'o') totalPellets++;
    if (c === 'P') { pStart = { x, y }; tiles[y][x] = ' '; }
    if (c === 'g') { spawns.push({ x, y }); tiles[y][x] = ' '; }
  }
  pellets = totalPellets;
  rng = mkRng(runSeed(att ? 41 : null, 13));
  P = { x:pStart.x * TS + 8, y:pStart.y * TS + 8, dir:'l', want:'l', sx:pStart.x, sy:pStart.y, swing:0, swingCd:0, dash:0, dashCd:0, invuln:0, anim:0 };
  const gcols = [R, CY, PK], gnames = ['chase', 'ambush', 'roam'];
  ghosts = spawns.map((s, i) => ({ x:s.x * TS + 8, y:s.y * TS + 8, dir:DK[i % 4], sx:s.x, sy:s.y, kind:gnames[i % 3], col:gcols[i % 3], eyes:false, roamT:0, roamTx:s.x, roamTy:s.y }));
  parts = []; popups = []; fruits = [];
  score = 0; lives = 3; timeLeft = SEAL_T; frightT = 0; elapsed = 0; shake = 0; fruitT = 0; eaten = 0;
}
function resetPositions() {
  P.x = P.sx * TS + 8; P.y = P.sy * TS + 8; P.dir = 'l'; P.want = 'l'; P.invuln = 2;
  for (const g of ghosts) { g.x = g.sx * TS + 8; g.y = g.sy * TS + 8; g.eyes = false; }
  frightT = 0;
}
function centerSnap(e) { const cx = Math.round((e.x - 8) / TS) * TS + 8, cy = Math.round((e.y - 8) / TS) * TS + 8; return [cx, cy, Math.abs(e.x - cx) < 0.6 && Math.abs(e.y - cy) < 0.6]; }
function tryMove(e, dt, speed) {
  const [cx, cy, centered] = centerSnap(e);
  if (centered) {
    e.x = cx; e.y = cy;
    const tx = (cx - 8) / TS, ty = (cy - 8) / TS;
    if (e.want && e.want !== e.dir) {
      const [dx, dy] = DIRS[e.want];
      if (passable(tx + dx, ty + dy)) e.dir = e.want;
    }
    const [dx, dy] = DIRS[e.dir];
    if (!passable(tx + dx, ty + dy)) return;
  }
  const [dx, dy] = DIRS[e.dir];
  e.x += dx * speed * dt; e.y += dy * speed * dt;
}
function ghostStep(g, dt) {
  const [cx, cy, centered] = centerSnap(g);
  const speed = g.eyes ? 92 : (frightT > 0 ? 34 : 48);
  if (centered) {
    g.x = cx; g.y = cy;
    const tx = (cx - 8) / TS, ty = (cy - 8) / TS;
    if (g.eyes && tx === g.sx && ty === g.sy) { g.eyes = false; return; }
    let tTx, tTy;
    const pTx = Math.floor(P.x / TS), pTy = Math.floor(P.y / TS);
    if (g.eyes) { tTx = g.sx; tTy = g.sy; }
    else if (frightT > 0) { tTx = pTx; tTy = pTy; }
    else if (g.kind === 'chase') { tTx = pTx; tTy = pTy; }
    else if (g.kind === 'ambush') { const [dx, dy] = DIRS[P.dir]; tTx = clamp(pTx + dx * 4, 1, MW - 2); tTy = clamp(pTy + dy * 4, 1, MH - 2); if (!passable(tTx, tTy)) { tTx = pTx; tTy = pTy; } }
    else { g.roamT -= 1; if (g.roamT <= 0 || (tx === g.roamTx && ty === g.roamTy)) { g.roamT = 240; let gx = 1 + Math.floor(rng() * (MW - 2)), gy = 1 + Math.floor(rng() * (MH - 2)); if (passable(gx, gy)) { g.roamTx = gx; g.roamTy = gy; } } tTx = g.roamTx; tTy = g.roamTy; }
    const dist = bfs(tTx, tTy, 0);
    const rev = DK.find(k => DIRS[k][0] === -DIRS[g.dir][0] && DIRS[k][1] === -DIRS[g.dir][1]);
    let best = null, bestD = frightT > 0 && !g.eyes ? -1 : 1e9;
    for (const k of DK) {
      if (k === rev) continue;
      const nx = tx + DIRS[k][0], ny = ty + DIRS[k][1];
      if (!passable(nx, ny)) continue;
      const d = dist[ny * MW + nx];
      if (frightT > 0 && !g.eyes ? d > bestD : d < bestD) { bestD = d; best = k; }
    }
    if (!best) best = rev;
    g.dir = best;
  }
  const [dx, dy] = DIRS[g.dir];
  g.x += dx * speed * dt; g.y += dy * speed * dt;
}
function botInput() {
  const inp = { l:0, r:0, u:0, d:0, a:0, b:0, pa:0, pb:0, start:0 };
  const pTx = Math.floor(P.x / TS), pTy = Math.floor(P.y / TS);
  const toPellet = bfs(pTx, pTy, 6);
  let goal = null, gd = 1e9;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const c = tiles[y][x]; if (c === '.' || c === 'o') { const d = toPellet[y * MW + x]; if (d < gd) { gd = d; goal = [x, y]; } } }
  if (!goal) return inp;
  const field = bfs(goal[0], goal[1], 6);
  let danger = 0;
  for (const g of ghosts) { if (!g.eyes && Math.hypot(g.x - P.x, g.y - P.y) < 48) danger++; }
  let bestK = P.dir, bestV = 1e9;
  for (const k of DK) {
    const nx = pTx + DIRS[k][0], ny = pTy + DIRS[k][1], t = tileAt(nx, ny);
    if (t === '#') continue;
    let v = field[ny * MW + nx] + (t === 'B' ? 2 : 0);
    if (danger) { for (const g of ghosts) { if (!g.eyes) { const gd2 = Math.hypot(g.x - (nx * TS + 8), g.y - (ny * TS + 8)); if (gd2 < 36) v += (36 - gd2) * 3; } } }
    if (v < bestV) { bestV = v; bestK = k; }
  }
  inp[bestK] = 1;
  const [fx, fy] = DIRS[P.dir];
  const ahead = tileAt(pTx + fx, pTy + fy);
  if (ahead === 'B' && P.swingCd <= 0) {
    const around = field[pTy * MW + pTx];
    if (field[(pTy + fy) * MW + (pTx + fx)] < around || danger) inp.pa = 1;
  }
  if (danger && P.dashCd <= 0 && ahead !== '#' && ahead !== 'B') inp.pb = 1;
  return inp;
}
const GAME = {
  id: 'g7', t1: 'MAZE', t2: 'WRECKER', sub: 'SMASH WALLS. EAT. ESCAPE.',
  music: { bpm: 138, lead: 'square', chords: [{ root: -24, tones: [0, 3, 7] }, { root: -17, tones: [0, 4, 7] }, { root: -21, tones: [0, 3, 7] }, { root: -19, tones: [0, 4, 7] }],
    arp: [0, 1, 2, 1, 0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, -1], bass: [0, 4, 8, 12], snare: [4, 12], kick: [0, 8], hat: true },
  init(att) { attract = !!att; setupWorld(attract); },
  update(dt, inp, mode) {
    elapsed += dt;
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; if (p.t > p.life) parts.splice(i, 1); }
    for (let i = popups.length - 1; i >= 0; i--) { popups[i].t += dt; if (popups[i].t > 1.2) popups.splice(i, 1); }
    if (shake > 0) shake = Math.max(0, shake - dt * 3);
    if (mode !== 'play' && mode !== 'title') return;
    if (inp.l) P.want = 'l'; if (inp.r) P.want = 'r'; if (inp.u) P.want = 'u'; if (inp.d) P.want = 'd';
    P.swingCd -= dt; P.dashCd -= dt; P.invuln -= dt; P.anim += dt;
    if (inp.pa && P.swingCd <= 0) {
      P.swing = 0.22; P.swingCd = 0.34; sfx('swing');
      const [fx, fy] = DIRS[P.dir];
      const tx = Math.floor(P.x / TS) + fx, ty = Math.floor(P.y / TS) + fy;
      if (tileAt(tx, ty) === 'B') {
        tiles[ty][tx] = ' '; score += 5; shake = 0.5;
        burst(tx * TS + 8, ty * TS + 8, BRK, 10); burst(tx * TS + 8, ty * TS + 8, T, 5);
        sfx('boom'); popup('+5', tx * TS + 8, ty * TS, Y);
      }
    }
    if (P.swing > 0) P.swing -= dt;
    if (inp.pb && P.dashCd <= 0) { P.dash = 0.32; P.dashCd = 1.6; sfx('throw'); }
    if (P.dash > 0) P.dash -= dt;
    tryMove(P, dt, P.dash > 0 ? 98 : 57);
    const pTx = Math.floor(P.x / TS), pTy = Math.floor(P.y / TS);
    const c = tileAt(pTx, pTy);
    if (Math.hypot(P.x - (pTx * TS + 8), P.y - (pTy * TS + 8)) < 6) {
      if (c === '.') { tiles[pTy][pTx] = ' '; pellets--; eaten++; score += 10; sfx('coin'); if (eaten === 40 || eaten === 80) { fruits.push({ x: 8, y: 9, t: 9 }); popup('BONUS FRUIT!', 128, 150, PK); } }
      else if (c === 'o') { tiles[pTy][pTx] = ' '; pellets--; eaten++; score += 50; frightT = 6; sfx('power'); popup('GHOSTS SCARED!', 128, 30, CY); }
    }
    for (let i = fruits.length - 1; i >= 0; i--) { const f = fruits[i]; f.t -= dt; if (f.t <= 0) { fruits.splice(i, 1); continue; } if (f.x === pTx && f.y === pTy) { score += 300; popup('+300', P.x, P.y - 10, PK); sfx('coin'); fruits.splice(i, 1); } }
    if (frightT > 0) frightT -= dt;
    for (const g of ghosts) ghostStep(g, dt);
    for (const g of ghosts) {
      if (Math.hypot(g.x - P.x, g.y - P.y) < 9) {
        if (frightT > 0 && !g.eyes) { g.eyes = true; score += 200; popup('+200', g.x, g.y - 10, W); burst(g.x, g.y, CY, 8); sfx('pop'); }
        else if (!g.eyes && P.invuln <= 0) {
          lives--; sfx('die'); burst(P.x, P.y, O, 14);
          if (lives <= 0) { endGame(score, 'CAUGHT!'); return; }
          popup('CAUGHT!', 128, 104, R); resetPositions(); break;
        }
      }
    }
    if (mode === 'play') {
      timeLeft -= dt;
      if (timeLeft <= 10.05 && timeLeft > 0 && Math.abs(timeLeft % 1) < dt) sfx('tick');
      if (timeLeft <= 0) { endGame(score, 'SEALED IN!'); return; }
    }
    if (pellets <= 0) { endGame(score + Math.ceil(timeLeft) * 10 + lives * 100, 'MAZE CLEAR!'); }
  },
  render(mode) {
    clear(K);
    const ox = shake > 0 ? Math.round((vr() - 0.5) * 3 * shake) : 0, oy = shake > 0 ? Math.round((vr() - 0.5) * 3 * shake) : 0;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const c = tiles[y][x], X = x * TS + ox, Y0 = y * TS + oy;
      if (c === '#') { rect(X, Y0, TS, TS, N); rect(X, Y0, TS, 2, SKY); rect(X, Y0, 2, TS, SKY); }
      else if (c === 'B') { rect(X, Y0, TS, TS, BRK); rect(X + 1, Y0 + 1, 6, 5, T); rect(X + 9, Y0 + 1, 6, 5, T); rect(X + 5, Y0 + 8, 6, 5, T); rect(X + 1, Y0 + 8, 3, 5, M); rect(X + 12, Y0 + 8, 3, 5, M); rect(X, Y0 + 7, TS, 1, M); }
      else {
        if (c === '.') rect(X + 7, Y0 + 7, 2, 2, V);
        else if (c === 'o') { const r = 4 + Math.sin(elapsed * 6) * 1.2; fillCircle(X + 8, Y0 + 8, r, V); }
      }
    }
    for (const f of fruits) { const X = f.x * TS, Y0 = f.y * TS; fillCircle(X + 6, Y0 + 10, 3, R); fillCircle(X + 11, Y0 + 11, 3, R); px(X + 8, Y0 + 4, GR); px(X + 9, Y0 + 3, GR); }
    for (const g of ghosts) {
      const gx = Math.round(g.x - 6 + ox), gy = Math.round(g.y - 6 + oy);
      if (g.eyes) { px(gx + 2, gy + 4, W); px(gx + 3, gy + 4, W); px(gx + 8, gy + 4, W); px(gx + 9, gy + 4, W); px(gx + 3, gy + 5, B); px(gx + 9, gy + 5, B); }
      else if (frightT > 0) { spr(GHOST, gx, gy, false, { X: B, W: V, K: PK }); }
      else spr(GHOST, gx, gy, g.dir === 'l', { X: g.col });
    }
    const flip = P.dir === 'l';
    spr(WRECKER, Math.round(P.x - 5 + ox), Math.round(P.y - 6 + oy), flip, P.invuln > 0 && (Math.floor(elapsed * 12) & 1) ? { Y: L, S: W, O: L, B: D, K: D } : null);
    if (P.swing > 0) {
      const [fx, fy] = DIRS[P.dir], hx = Math.round(P.x + fx * 11), hy = Math.round(P.y + fy * 11);
      rect(hx - 1 + ox, hy - 5 + oy, 3, 8, T); rect(hx - 3 + ox, hy - 8 + oy, 7, 4, D);
    }
    for (const p of parts) px(p.x + ox, p.y + oy, p.col);
    if (timeLeft <= 10 && mode === 'play') { rect(0, 0, VW, 2, R); rect(0, VH - 2, VW, 2, R); }
  },
  hud(mode) {
    if (mode === 'title') return;
    txt('SC ' + pad5(score), 6, 3, W, 8);
    txt(Math.max(0, Math.ceil(timeLeft)) + 's', 128, 3, timeLeft <= 10 ? R : Y, 8, 'center');
    txt(pellets + ' LEFT', 250, 3, CY, 8, 'right');
    for (let i = 0; i < lives - 1; i++) spr(WRECKER, 8 + i * 12, 212, false, null);
    for (const p of popups) txt(p.s, p.x, Math.round(p.y - p.t * 12), p.col, 8, 'center');
  },
  info() { return { score, pellets, lives, time: +timeLeft.toFixed(1), px: Math.round(P.x), py: Math.round(P.y), eaten, ghosts: ghosts.map(g => Math.round(g.x) + ',' + Math.round(g.y)).join(' ') }; },
  bot() { return botInput(); },
};
