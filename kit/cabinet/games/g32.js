/* ===== MAZE WRECKER: NIGHT SHIFT — Pac-Man x Wrecking Crew, built on the shared gamekit.
   Same lattice maze as Moth's g7, one new rule: the hammer is a weapon now — swing at a
   foreman (ghost) to STUN him for 3 s (+50). Dusk palette, tighter 135 s seal.
   All state on S; ghost steering uses the kit's shared bfs(). Updated to the artkit-era script: HUD icons draw in ui() (hud() is text-only - pixel calls there are discarded after the blit), particles renamed S.fx so the kit's own S.parts updater leaves them alone. Gameplay, map and 135 s seal unchanged. ===== */
// KEYS: Arrows move, Z swings the hammer (smash bricks, STUN ghosts), X dashes.
const MW32 = 16, MH32 = 14, TS32 = 16, SEAL32 = 135;
const MAP32 = [
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
const D32 = { l:[-1,0], r:[1,0], u:[0,-1], d:[0,1] };
const DK32 = ['l','r','u','d'];
const WRECKER32 = [
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
const GHOST32 = [
  '..XXXX..',
  '.XXXXXX.',
  'XXXXXXXX',
  'XWWXXWWX',
  'XWKXXKWX',
  'XXXXXXXX',
  'XXXXXXXX',
  'XX.XX.XX',
];
const tile32 = (S, x, y) => (x < 0 || y < 0 || x >= MW32 || y >= MH32) ? '#' : S.tiles[y][x];
const pass32 = (S, x, y) => { const t = tile32(S, x, y); return t !== '#' && t !== 'B'; };
function burst32(S, x, y, col, n) { for (let i = 0; i < n; i++) { const a = vr() * 6.283, sp = 14 + vr() * 40; S.fx.push({ x, y, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp - 12, t:0, life:0.4 + vr() * 0.3, col }); } }
function snap32(e) { const cx = Math.round((e.x - 8) / TS32) * TS32 + 8, cy = Math.round((e.y - 8) / TS32) * TS32 + 8; return [cx, cy, Math.abs(e.x - cx) < 0.6 && Math.abs(e.y - cy) < 0.6]; }
function resetPos32(S) {
  const P = S.P;
  P.x = P.sx * TS32 + 8; P.y = P.sy * TS32 + 8; P.dir = 'l'; P.want = 'l'; P.invuln = 2; P.dash = 0;
  for (const g of S.ghosts) { g.x = g.sx * TS32 + 8; g.y = g.sy * TS32 + 8; g.eyes = false; g.stun = 0; }
  S.frightT = 0;
}
/* one ghost step: kit bfs() toward a goal predicate, honouring the no-reverse rule */
function ghostStep32(S, g, dt) {
  const speed = g.stun > 0 ? 0 : g.eyes ? 92 : (S.frightT > 0 ? 34 : 48);
  if (g.stun > 0) { g.stun -= dt; return; }
  const [cx, cy, centered] = snap32(g);
  if (centered) {
    g.x = cx; g.y = cy;
    const tx = (cx - 8) / TS32, ty = (cy - 8) / TS32;
    if (g.eyes && tx === g.sx && ty === g.sy) { g.eyes = false; return; }
    const P = S.P, pTx = Math.floor(P.x / TS32), pTy = Math.floor(P.y / TS32);
    let goal;
    if (g.eyes) goal = (x, y) => x === g.sx && y === g.sy;
    else if (S.frightT > 0) goal = (x, y) => Math.abs(x - pTx) + Math.abs(y - pTy) >= 7;
    else if (g.kind === 'chase') goal = (x, y) => x === pTx && y === pTy;
    else if (g.kind === 'ambush') { const [dx, dy] = D32[P.dir]; const ax = clamp(pTx + dx * 4, 1, MW32 - 2), ay = clamp(pTy + dy * 4, 1, MH32 - 2); goal = pass32(S, ax, ay) ? ((x, y) => x === ax && y === ay) : ((x, y) => x === pTx && y === pTy); }
    else { g.roamT -= 1; if (g.roamT <= 0 || (tx === g.roamTx && ty === g.roamTy)) { g.roamT = 240; const gx = 1 + Math.floor(S.rng() * (MW32 - 2)), gy = 1 + Math.floor(S.rng() * (MH32 - 2)); if (pass32(S, gx, gy)) { g.roamTx = gx; g.roamTy = gy; } } goal = (x, y) => x === g.roamTx && y === g.roamTy; }
    const pass = (x, y) => pass32(S, x, y);
    let step = bfs(MW32, MH32, pass, tx, ty, goal);
    if (step) {
      const rev = DK32.find(k => D32[k][0] === -D32[g.dir][0] && D32[k][1] === -D32[g.dir][1]);
      const stepDir = DK32.find(k => D32[k][0] === step.dx && D32[k][1] === step.dy);
      if (stepDir === rev) {
        const bx = tx - step.dx, by = ty - step.dy;
        const alt = bfs(MW32, MH32, (x, y) => pass(x, y) && !(x === bx && y === by), tx, ty, goal);
        if (alt) step = alt;
      }
      if (step) g.dir = DK32.find(k => D32[k][0] === step.dx && D32[k][1] === step.dy) || g.dir;
    }
  }
  const [dx, dy] = D32[g.dir];
  g.x += dx * speed * dt; g.y += dy * speed * dt;
}
const GAME = kit({
  id:'g32', t1:'MAZE', t2:'WRECKER', sub:'NIGHT SHIFT. STUN THE FOREMEN.',
  secs:50, seed:132, off:32,
  music:MUS(138, -24, true),
  setup(S, att) {
    S.tiles = MAP32.map(r => r.split(''));
    S.pellets = 0; const spawns = []; let pStart = { x:8, y:12 };
    for (let y = 0; y < MH32; y++) for (let x = 0; x < MW32; x++) {
      const c = S.tiles[y][x];
      if (c === '.' || c === 'o') S.pellets++;
      if (c === 'P') { pStart = { x, y }; S.tiles[y][x] = ' '; }
      if (c === 'g') { spawns.push({ x, y }); S.tiles[y][x] = ' '; }
    }
    S.total = S.pellets;
    S.P = { x:pStart.x * TS32 + 8, y:pStart.y * TS32 + 8, dir:'l', want:'l', sx:pStart.x, sy:pStart.y, swing:0, swingCd:0, dash:0, dashCd:0, invuln:0 };
    const cols = [O, CY, PK], kinds = ['chase', 'ambush', 'roam'];
    S.ghosts = spawns.map((s, i) => ({ x:s.x * TS32 + 8, y:s.y * TS32 + 8, dir:DK32[i % 4], sx:s.x, sy:s.y, kind:kinds[i % 3], col:cols[i % 3], eyes:false, stun:0, roamT:0, roamTx:s.x, roamTy:s.y }));
    S.fx = []; S.fruits = [];
    S.lives = 3; S.timeLeft = SEAL32; S.frightT = 0; S.eaten = 0; S.stuns = 0;
  },
  step(S, dt, inp, att) {
    const P = S.P;
    for (let i = S.fx.length - 1; i >= 0; i--) { const p = S.fx[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; if (p.t > p.life) S.fx.splice(i, 1); }
    if (inp.l) P.want = 'l'; if (inp.r) P.want = 'r'; if (inp.u) P.want = 'u'; if (inp.d) P.want = 'd';
    P.swingCd -= dt; P.dashCd -= dt; P.invuln -= dt;
    if (S.edge(inp, 'a') && P.swingCd <= 0) {
      P.swing = 0.22; P.swingCd = 0.34; sfx('swing');
      const [fx, fy] = D32[P.dir];
      const tx = Math.floor(P.x / TS32) + fx, ty = Math.floor(P.y / TS32) + fy;
      if (tile32(S, tx, ty) === 'B') {
        S.tiles[ty][tx] = ' '; S.score += 5;
        burst32(S, tx * TS32 + 8, ty * TS32 + 8, BRK, 10); burst32(S, tx * TS32 + 8, ty * TS32 + 8, T, 5);
        sfx('boom'); popup(S, '+5', tx * TS32 + 8, ty * TS32, Y);
      } else {
        /* the new rule: a swing that reaches a foreman stuns him */
        const hx = P.x + fx * 13, hy = P.y + fy * 13;
        for (const g of S.ghosts) {
          if (!g.eyes && g.stun <= 0 && Math.hypot(g.x - hx, g.y - hy) < 13) {
            g.stun = 3; S.stuns++; S.score += 50;
            popup(S, 'STUN!', g.x, g.y - 10, Y); burst32(S, g.x, g.y, Y, 8); sfx('hit');
          }
        }
      }
    }
    if (P.swing > 0) P.swing -= dt;
    if (S.edge(inp, 'b') && P.dashCd <= 0) { P.dash = 0.32; P.dashCd = 1.6; sfx('throw'); }
    if (P.dash > 0) P.dash -= dt;
    /* player tile movement (same feel as g7) */
    {
      const [cx, cy, centered] = snap32(P);
      if (centered) {
        P.x = cx; P.y = cy;
        const tx = (cx - 8) / TS32, ty = (cy - 8) / TS32;
        if (P.want !== P.dir) { const [dx, dy] = D32[P.want]; if (pass32(S, tx + dx, ty + dy)) P.dir = P.want; }
        const [dx, dy] = D32[P.dir];
        if (pass32(S, tx + dx, ty + dy)) { const sp = P.dash > 0 ? 98 : 57; P.x += dx * sp * dt; P.y += dy * sp * dt; }
      } else { const [dx, dy] = D32[P.dir]; const sp = P.dash > 0 ? 98 : 57; P.x += dx * sp * dt; P.y += dy * sp * dt; }
    }
    const pTx = Math.floor(P.x / TS32), pTy = Math.floor(P.y / TS32);
    const c = tile32(S, pTx, pTy);
    if (Math.hypot(P.x - (pTx * TS32 + 8), P.y - (pTy * TS32 + 8)) < 6) {
      if (c === '.') { S.tiles[pTy][pTx] = ' '; S.pellets--; S.eaten++; S.score += 10; sfx('coin'); if (S.eaten === 40 || S.eaten === 80) { S.fruits.push({ x:8, y:9, t:9 }); popup(S, 'BONUS FRUIT!', 128, 150, PK); } }
      else if (c === 'o') { S.tiles[pTy][pTx] = ' '; S.pellets--; S.eaten++; S.score += 50; S.frightT = 6; sfx('power'); popup(S, 'GHOSTS SCARED!', 128, 30, CY); }
    }
    for (let i = S.fruits.length - 1; i >= 0; i--) { const f = S.fruits[i]; f.t -= dt; if (f.t <= 0) { S.fruits.splice(i, 1); continue; } if (f.x === pTx && f.y === pTy) { S.score += 300; popup(S, '+300', P.x, P.y - 10, PK); sfx('coin'); S.fruits.splice(i, 1); } }
    if (S.frightT > 0) S.frightT -= dt;
    for (const g of S.ghosts) ghostStep32(S, g, dt);
    for (const g of S.ghosts) {
      if (g.stun > 0 || g.eyes) continue;
      if (Math.hypot(g.x - P.x, g.y - P.y) < 9) {
        if (S.frightT > 0) { g.eyes = true; S.score += 200; popup(S, '+200', g.x, g.y - 10, W); burst32(S, g.x, g.y, CY, 8); sfx('pop'); }
        else if (P.invuln <= 0) {
          S.lives--; sfx('die'); burst32(S, P.x, P.y, O, 14);
          if (S.lives <= 0) return finish(S, 'CAUGHT!');
          popup(S, 'CAUGHT!', 128, 104, R); resetPos32(S); break;
        }
      }
    }
    if (!att) {
      S.timeLeft -= dt;
      if (S.timeLeft <= 10.05 && S.timeLeft > 0 && Math.abs(S.timeLeft % 1) < dt) sfx('tick');
      if (S.timeLeft <= 0) return finish(S, 'SEALED IN!');
    }
    if (S.pellets <= 0) return finish(S, 'MAZE CLEAR!', Math.ceil(Math.max(0, S.timeLeft)) * 10 + S.lives * 100);
  },
  draw(S) {
    clear(K);
    const P = S.P;
    for (let y = 0; y < MH32; y++) for (let x = 0; x < MW32; x++) {
      const c = S.tiles[y][x], X = x * TS32, Y0 = y * TS32;
      if (c === '#') { rect(X, Y0, TS32, TS32, N); rect(X, Y0, TS32, 2, DG); rect(X, Y0, 2, TS32, DG); }
      else if (c === 'B') { rect(X, Y0, TS32, TS32, BRK); rect(X + 1, Y0 + 1, 6, 5, T); rect(X + 9, Y0 + 1, 6, 5, T); rect(X + 5, Y0 + 8, 6, 5, T); rect(X + 1, Y0 + 8, 3, 5, M); rect(X + 12, Y0 + 8, 3, 5, M); rect(X, Y0 + 7, TS32, 1, M); }
      else {
        if (c === '.') rect(X + 7, Y0 + 7, 2, 2, V);
        else if (c === 'o') { const r = 4 + Math.sin(S.T * 6) * 1.2; fillCircle(X + 8, Y0 + 8, r, V); }
      }
    }
    for (const f of S.fruits) { const X = f.x * TS32, Y0 = f.y * TS32; fillCircle(X + 6, Y0 + 10, 3, R); fillCircle(X + 11, Y0 + 11, 3, R); px(X + 8, Y0 + 4, GR); px(X + 9, Y0 + 3, GR); }
    for (const g of S.ghosts) {
      const gx = Math.round(g.x - 6), gy = Math.round(g.y - 6);
      if (g.eyes) { px(gx + 2, gy + 4, W); px(gx + 3, gy + 4, W); px(gx + 8, gy + 4, W); px(gx + 9, gy + 4, W); px(gx + 3, gy + 5, B); px(gx + 9, gy + 5, B); }
      else if (g.stun > 0) { spr(GHOST32, gx, gy, false, { X: DG, W: Y, K: Y }); px(gx + 1, gy - 2, Y); px(gx + 10, gy - 3, Y); px(gx + 5, gy - 4, Y); }
      else if (S.frightT > 0) spr(GHOST32, gx, gy, false, { X: B, W: V, K: PK });
      else spr(GHOST32, gx, gy, g.dir === 'l', { X: g.col });
    }
    spr(WRECKER32, Math.round(P.x - 5), Math.round(P.y - 6), P.dir === 'l', P.invuln > 0 && (Math.floor(S.T * 12) & 1) ? { Y: L, S: W, O: L, B: D, K: D } : null);
    if (P.swing > 0) {
      const [fx, fy] = D32[P.dir], hx = Math.round(P.x + fx * 11), hy = Math.round(P.y + fy * 11);
      rect(hx - 1, hy - 5, 3, 8, T); rect(hx - 3, hy - 8, 7, 4, D);
    }
    for (const p of S.fx) px(p.x, p.y, p.col);
    if (!S.att && S.timeLeft <= 10) { rect(0, 0, VW, 2, R); rect(0, VH - 2, VW, 2, R); }
    if (!S.att && S.timeLeft <= 30 && S.timeLeft > 10 && (Math.floor(S.T * 2) & 1)) { rect(0, 0, VW, 2, O); rect(0, VH - 2, VW, 2, O); }
  },
  ui(S) {
    /* HUD icons live here now: hud() runs after the blit, so spr() there never showed */
    for (let i = 0; i < S.lives - 1; i++) spr(WRECKER32, 8 + i * 12, 212, false, null);
  },
  hud(S, mode) {
    if (mode === 'title') return;
    txt('SC ' + pad5(S.score), 6, 3, W, 8);
    txt(Math.max(0, Math.ceil(S.timeLeft)) + 's', 128, 3, S.timeLeft <= 10 ? R : Y, 8, 'center');
    txt(S.pellets + ' LEFT', 250, 3, CY, 8, 'right');
  },
  info(S) { return { pellets:S.pellets, lives:S.lives, time:+S.timeLeft.toFixed(1), eaten:S.eaten, stuns:S.stuns, px:Math.round(S.P.x), py:Math.round(S.P.y), ghosts:S.ghosts.map(g => Math.round(g.x) + ',' + Math.round(g.y)).join(' ') }; },
  bot(S, i) {
    const P = S.P, pTx = Math.floor(P.x / TS32), pTy = Math.floor(P.y / TS32);
    let danger = null, dd = 1e9;
    for (const g of S.ghosts) { if (!g.eyes && g.stun <= 0 && S.frightT <= 0) { const d = Math.hypot(g.x - P.x, g.y - P.y); if (d < dd) { dd = d; danger = g; } } }
    if (danger && dd < 30) {
      /* stun it if it's in the facing arc, else run */
      const [fx, fy] = D32[P.dir];
      if (Math.hypot(danger.x - (P.x + fx * 13), danger.y - (P.y + fy * 13)) < 14 && P.swingCd <= 0) { i.a = 1; return i; }
      let bx = 0, by = 0, bv = -1;
      for (const k of DK32) { const nx = pTx + D32[k][0], ny = pTy + D32[k][1]; if (!pass32(S, nx, ny)) continue; const v = Math.hypot(danger.x - (nx * TS32 + 8), danger.y - (ny * TS32 + 8)); if (v > bv) { bv = v; bx = D32[k][0]; by = D32[k][1]; } }
      if (bx || by) { dirInp(i, bx, by); if (P.dashCd <= 0) i.b = 1; }
      return i;
    }
    const huntGhost = S.frightT > 1 ? S.ghosts.find(g => !g.eyes && g.stun <= 0 && Math.hypot(g.x - P.x, g.y - P.y) < 80) : null;
    const goal = huntGhost
      ? ((x, y) => x === Math.floor(huntGhost.x / TS32) && y === Math.floor(huntGhost.y / TS32))
      : ((x, y) => { const t = tile32(S, x, y); return t === '.' || t === 'o'; });
    let step = bfs(MW32, MH32, (x, y) => pass32(S, x, y), pTx, pTy, goal);
    if (!step) {
      step = bfs(MW32, MH32, (x, y) => tile32(S, x, y) !== '#', pTx, pTy, goal);
      if (step && tile32(S, pTx + step.dx, pTy + step.dy) === 'B') { dirInp(i, step.dx, step.dy); if (P.swingCd <= 0) i.a = 1; return i; }
    }
    if (step) dirInp(i, step.dx, step.dy);
    return i;
  },
});
