/* ===== BLOCK COMMANDO: Contra x Tetris. Run and gun on a floor that keeps building, cracking and deleting itself. ===== */
const COLS = 12, ROWS = 14, CS = 16, PW = 192, GRAV = 520, MAXT = 90;
const SHAPES = {
  I:{ c:[[0,0],[1,0],[2,0],[3,0]], col:CY }, O:{ c:[[0,0],[1,0],[0,1],[1,1]], col:Y },
  T:{ c:[[0,0],[1,0],[2,0],[1,1]], col:PU }, S:{ c:[[1,0],[2,0],[0,1],[1,1]], col:E },
  Z:{ c:[[0,0],[1,0],[1,1],[2,1]], col:R }, J:{ c:[[0,0],[0,1],[1,1],[2,1]], col:B },
  L:{ c:[[2,0],[0,1],[1,1],[2,1]], col:O },
};
const SKEYS = Object.keys(SHAPES);
const HERO = [
"..RRRR..",".RRRRRR.",".SSSSSS.",".SSKSSS.","..SSSS..",".SSSSSSG","SSSSSSKK",".SSSSSS.","..SSSS..","..BBBB..",".BB..BB.",".BB..BB.",".KK..KK.",".KK..KK.",
];
const GRUNT = [
"..DDDD..",".DDDDDD.",".SSSSSS.",".SKSSKS.","..SSSS..",".LLLLLL.","LLLLLLKK",".LLLLLL.","..LLLL..","..DDDD..",".DD..DD.",".DD..DD.",".KK..KK.",".KK..KK.",
];
const DRONE = [
"..LLLLLL..","LLDDDDDDLL","LDWWDDWWDL",".LLLLLLLL.","...RRRR...",
];
let grid, piece, bag, nextKind, P, enemies, pbul, ebul, parts, popups, score, lines, lives, elapsed, spawnT, garbT, flash, attract, rng, pieceWait, shake;

function emptyRow() { return new Array(COLS).fill(0); }
function nextFromBag() { if (!bag.length) { bag = SKEYS.slice(); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } } return bag.pop(); }
function rotCells(cells, k) {
  let c = cells.map(a => a.slice());
  for (let i = 0; i < k; i++) c = c.map(([x, y]) => [-y, x]);
  const mx = Math.min(...c.map(a => a[0])), my = Math.min(...c.map(a => a[1]));
  return c.map(([x, y]) => [x - mx, y - my]);
}
function collide(cells, x, y) {
  for (const [dx, dy] of cells) {
    const cx = x + dx, cy = y + dy;
    if (cx < 0 || cx >= COLS || cy >= ROWS) return true;
    if (cy >= 0 && grid[cy][cx]) return true;
  }
  return false;
}
function evalPlacement(cells, x) {
  let y = 0;
  if (collide(cells, x, y)) return -1e9;
  while (!collide(cells, x, y + 1)) y++;
  const b = grid.map(r => r.map(c => !!c));
  for (const [dx, dy] of cells) if (y + dy >= 0) b[y + dy][x + dx] = true;
  let full = 0, agg = 0, holes = 0, bump = 0, prev = 0;
  for (let r = 0; r < ROWS; r++) if (b[r].every(v => v)) full++;
  for (let c = 0; c < COLS; c++) {
    let h = 0, seen = false;
    for (let r = 0; r < ROWS; r++) { if (b[r][c]) { if (!seen) { h = ROWS - r; seen = true; } } else if (seen) holes++; }
    agg += h; if (c > 0) bump += Math.abs(h - prev); prev = h;
  }
  return -0.51 * agg + 0.76 * full * 4 - 0.36 * holes * 2 - 0.18 * bump;
}
function spawnPiece() {
  const kind = nextKind; nextKind = nextFromBag();
  const base = SHAPES[kind];
  let best = null;
  for (let k = 0; k < 4; k++) {
    const cells = rotCells(base.c, k), w = Math.max(...cells.map(a => a[0])) + 1;
    for (let x = 0; x <= COLS - w; x++) {
      const s = evalPlacement(cells, x) + rng() * 0.3;
      if (!best || s > best.s) best = { s, cells, x, w };
    }
  }
  const cells = best ? best.cells : base.c;
  const startX = clamp(Math.floor(COLS / 2 - 1), 0, COLS - 1);
  piece = { cells, x:startX, y:0, col:base.col, t:0, mt:0, tx:best ? best.x : startX, fall:Math.max(0.2, 0.5 - elapsed * 0.003) };
  if (collide(piece.cells, piece.x, piece.y)) {
    for (let r = 0; r < 6; r++) grid[r] = emptyRow();
    popup('OVERFLOW!', 96, 40, R); sfx('boom'); shake = 0.4;
  }
}
function popup(s, x, y, col) { popups.push({ s, x, y, col, t:0 }); if (popups.length > 5) popups.shift(); }
function burst(x, y, col, n) { for (let i = 0; i < n; i++) parts.push({ x, y, vx:(vr() - 0.5) * 120, vy:-vr() * 100, t:0, col }); }
function solidPx(x, y) {
  if (x < 0 || x >= PW || y >= VH) return true;
  if (y < 0) return false;
  const c = Math.floor(x / CS), r = Math.floor(y / CS);
  if (grid[r][c]) return true;
  if (piece) for (const [dx, dy] of piece.cells) if (piece.x + dx === c && piece.y + dy === r) return true;
  return false;
}
function boxHits(x, y, w, h) { return solidPx(x, y) || solidPx(x + w - 1, y) || solidPx(x, y + h - 1) || solidPx(x + w - 1, y + h - 1); }
function moveEnt(e, dt) {
  e.blocked = false;
  const dx = e.vx * dt, sx = Math.max(1, Math.ceil(Math.abs(dx)));
  for (let i = 0; i < sx; i++) { const nx = e.x + dx / sx; if (!boxHits(nx, e.y, e.w, e.h)) e.x = nx; else { e.blocked = true; break; } }
  e.vy += GRAV * dt;
  const dy = e.vy * dt, sy = Math.max(1, Math.ceil(Math.abs(dy)));
  for (let i = 0; i < sy; i++) { const ny = e.y + dy / sy; if (!boxHits(e.x, ny, e.w, e.h)) e.y = ny; else { e.vy = 0; break; } }
  e.ground = boxHits(e.x, e.y + 1, e.w, e.h);
  if (e.ground && e.vy > 0) e.vy = 0;
}
function pushOut(e) { let n = 0; while (boxHits(e.x, e.y, e.w, e.h) && n < 80) { e.y -= 1; n++; } }
function overlapPiece(e) {
  if (!piece) return false;
  for (const [dx, dy] of piece.cells) {
    const px0 = (piece.x + dx) * CS, py0 = (piece.y + dy) * CS;
    if (e.x < px0 + CS && e.x + e.w > px0 && e.y < py0 + CS && e.y + e.h > py0) return true;
  }
  return false;
}
function killPlayer() {
  if (P.inv > 0 || P.dead) return;
  lives--; sfx('die'); burst(P.x + 4, P.y + 7, R, 14); shake = 0.3;
  if (lives <= 0) { P.dead = true; if (!attract) endGame(score, 'GAME OVER'); return; }
  P.x = 92; P.y = -24; P.vx = 0; P.vy = 0; P.inv = 2.2;
}
function damageCell(c, r) {
  if (grid[r] && grid[r][c]) {
    grid[r][c].hp--;
    if (grid[r][c].hp <= 0) { grid[r][c] = 0; score += 10; burst(c * CS + 8, r * CS + 8, DG, 6); }
    sfx('hit'); return true;
  }
  if (piece) {
    const i = piece.cells.findIndex(([dx, dy]) => piece.x + dx === c && piece.y + dy === r);
    if (i >= 0) {
      piece.cells.splice(i, 1); score += 10; burst(c * CS + 8, r * CS + 8, piece.col, 6); sfx('hit');
      if (!piece.cells.length) { piece = null; pieceWait = 0.4; }
      return true;
    }
  }
  return false;
}
function checkLines() {
  const rows = [];
  for (let r = 0; r < ROWS; r++) if (grid[r].every(c => c)) rows.push(r);
  if (rows.length) { flash = { rows, t:0 }; sfx('clear'); }
}
function finishClear() {
  const n = flash.rows.length;
  grid = grid.filter((_, r) => !flash.rows.includes(r));
  while (grid.length < ROWS) grid.unshift(emptyRow());
  const pts = [0, 500, 1200, 2000, 3000][n]; score += pts; lines += n;
  popup(n > 1 ? `${n} LINES +${pts}` : `LINE +${pts}`, 96, 70, Y); sfx('power');
  flash = null;
  for (const e of [P].concat(enemies)) if (boxHits(e.x, e.y, e.w, e.h)) pushOut(e);
}
function addGarbage() {
  grid.shift();
  const row = new Array(COLS).fill(0).map(() => ({ col:DG, hp:2 })), hole = Math.floor(rng() * COLS);
  row[hole] = 0; grid.push(row);
  for (const e of [P].concat(enemies)) e.y -= CS;
  if (piece && collide(piece.cells, piece.x, piece.y)) piece.y = Math.max(0, piece.y - 1);
  popup('RISING!', 96, 90, O); sfx('boom'); shake = 0.25;
}
function spawnEnemy() {
  if (enemies.length >= 4) return;
  if (rng() < 0.3) {
    const left = rng() < 0.5;
    enemies.push({ k:'d', x:left ? 2 : PW - 14, y:22 + rng() * 40, vx:(left ? 1 : -1) * 36, vy:0, w:10, h:5, hp:1, cd:1.2 + rng(), ph:rng() * 6 });
  } else {
    const left = rng() < 0.5, c = left ? 0 : COLS - 1;
    let r = 0; while (r < ROWS && !grid[r][c]) r++;
    enemies.push({ k:'g', x:left ? 1 : PW - 9, y:r * CS - 15, vx:0, vy:0, w:8, h:14, hp:1, cd:1.5 + rng(), face:left ? 1 : -1 });
  }
}
function setupWorld(att) {
  rng = mkRng(runSeed(att ? 77 : null, 1));
  grid = []; for (let r = 0; r < ROWS; r++) grid.push(emptyRow());
  for (let r = ROWS - 2; r < ROWS; r++) for (let c = 0; c < COLS; c++) grid[r][c] = (c === 3 + (r % 5)) ? 0 : { col:DG, hp:2 };
  bag = []; nextKind = nextFromBag(); piece = null; pieceWait = 0.6; flash = null;
  P = { x:92, y:100, vx:0, vy:0, w:8, h:14, face:1, ground:false, cd:0, inv:1.5, dead:false, blocked:false };
  enemies = []; pbul = []; ebul = []; parts = []; popups = [];
  score = 0; lines = 0; lives = 3; elapsed = 0; spawnT = 2; garbT = 16; shake = 0;
}

const GAME = {
  id:'g1', t1:'BLOCK', t2:'COMMANDO', sub:'RUN AND GUN ON FALLING BLOCKS',
  music:{ bpm:152, lead:'square', chords:[{ root:-24, tones:[0,3,7] }, { root:-28, tones:[-4,0,3] }, { root:-21, tones:[3,7,10] }, { root:-26, tones:[-2,2,5] }],
          arp:[0,-1,1,-1,2,-1,1,-1,0,-1,1,-1,2,1,2,-1], bass:[0,4,8,12,6,14], snare:[4,12], kick:[0,8], hat:true },
  init(att) { attract = !!att; setupWorld(attract); },
  update(dt, inp, mode) {
    attract = mode === 'title';
    elapsed += dt;
    if (attract && (P.dead || elapsed > 40)) { setupWorld(true); return; }
    if (shake > 0) shake -= dt;
    /* falling pieces */
    if (flash) { flash.t += dt; if (flash.t > 0.35) finishClear(); }
    else if (!piece) { pieceWait -= dt; if (pieceWait <= 0) spawnPiece(); }
    else {
      piece.t += dt; piece.mt += dt;
      if (piece.mt > 0.1 && piece.x !== piece.tx) {
        piece.mt = 0; const nx = piece.x + Math.sign(piece.tx - piece.x);
        if (!collide(piece.cells, nx, piece.y)) piece.x = nx;
      }
      if (piece.t >= piece.fall) {
        piece.t = 0;
        if (!collide(piece.cells, piece.x, piece.y + 1)) {
          piece.y++;
          if (overlapPiece(P)) { if (P.inv > 0) pushOut(P); else killPlayer(); }
          for (const e of enemies) if (overlapPiece(e)) e.hp = 0;
        } else {
          for (const [dx, dy] of piece.cells) { const r = piece.y + dy; if (r >= 0) grid[r][piece.x + dx] = { col:piece.col, hp:2 }; }
          piece = null; pieceWait = 0.45; sfx('land'); checkLines();
        }
      }
    }
    garbT -= dt; if (garbT <= 0) { garbT = 16; addGarbage(); }
    /* player */
    if (!P.dead) {
      if (P.inv > 0) P.inv -= dt;
      P.vx = ((inp.r ? 1 : 0) - (inp.l ? 1 : 0)) * 70;
      if (inp.r) P.face = 1; else if (inp.l) P.face = -1;
      if (inp.pa && P.ground) { P.vy = -205; sfx('jump'); }
      if (!inp.a && P.vy < -90) P.vy = -90;
      moveEnt(P, dt);
      if (P.y > VH) killPlayer();
      P.cd -= dt;
      if (inp.b && P.cd <= 0 && pbul.length < 5) {
        P.cd = 0.16;
        let vx = P.face, vy = 0;
        if (inp.u) { vy = -1; vx = (inp.l || inp.r) ? P.face * 0.7 : 0; if (vx) vy = -0.7; }
        pbul.push({ x:P.x + 4 + vx * 6, y:P.y + 6 + vy * 6, vx:vx * 230, vy:vy * 230 }); sfx('shoot');
      }
    }
    /* bullets */
    for (let i = pbul.length - 1; i >= 0; i--) {
      const b = pbul[i]; let dead = false;
      const n = Math.ceil(Math.hypot(b.vx, b.vy) * dt);
      for (let s = 0; s < n && !dead; s++) {
        b.x += b.vx * dt / n; b.y += b.vy * dt / n;
        if (b.x < 0 || b.x >= PW || b.y < -8 || b.y > VH) { dead = true; break; }
        if (b.y >= 0 && solidPx(b.x, b.y)) { damageCell(Math.floor(b.x / CS), Math.floor(b.y / CS)); dead = true; break; }
        for (const e of enemies) if (e.hp > 0 && b.x > e.x - 1 && b.x < e.x + e.w + 1 && b.y > e.y - 1 && b.y < e.y + e.h + 1) { e.hp = 0; dead = true; break; }
      }
      if (dead) pbul.splice(i, 1);
    }
    for (let i = ebul.length - 1; i >= 0; i--) {
      const b = ebul[i]; b.x += b.vx * dt; b.y += b.vy * dt;
      let dead = b.x < 0 || b.x >= PW || b.y > VH || b.y < -10;
      if (!dead && b.y >= 0 && solidPx(b.x, b.y)) dead = true;
      if (!dead && !P.dead && P.inv <= 0 && b.x > P.x && b.x < P.x + P.w && b.y > P.y && b.y < P.y + P.h) { killPlayer(); dead = true; }
      if (dead) ebul.splice(i, 1);
    }
    /* enemies */
    spawnT -= dt; if (spawnT <= 0) { spawnT = Math.max(1.6, 3.4 - elapsed * 0.02); spawnEnemy(); }
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.hp <= 0) { burst(e.x + 4, e.y + 6, e.k === 'g' ? L : Y, 10); if (!attract || true) score += e.k === 'd' ? 200 : 100; sfx('pop'); enemies.splice(i, 1); continue; }
      e.cd -= dt;
      if (e.k === 'g') {
        e.face = Math.sign(P.x - e.x) || 1; e.vx = e.face * 28;
        if (e.blocked && e.ground) e.vy = -190;
        moveEnt(e, dt);
        if (e.cd <= 0 && Math.abs(P.y - e.y) < 24) { e.cd = 2.2; ebul.push({ x:e.x + 4 + e.face * 6, y:e.y + 6, vx:e.face * 85, vy:0 }); }
        if (e.y > VH) e.hp = 0;
      } else {
        e.ph += dt * 3; e.x += e.vx * dt; e.y += Math.sin(e.ph) * 0.4;
        if (e.x < 0 || e.x > PW - 10) e.vx = -e.vx;
        if (e.cd <= 0 && Math.abs(P.x - e.x) < 30) { e.cd = 2; ebul.push({ x:e.x + 5, y:e.y + 6, vx:0, vy:95 }); }
      }
      if (!P.dead && P.inv <= 0 && e.x < P.x + P.w && e.x + e.w > P.x && e.y < P.y + P.h && e.y + e.h > P.y) killPlayer();
    }
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t += dt; q.vy += 300 * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.t > 0.6) parts.splice(i, 1); }
    for (let i = popups.length - 1; i >= 0; i--) { popups[i].t += dt; if (popups[i].t > 1.4) popups.splice(i, 1); }
    if (!attract && elapsed >= MAXT && !P.dead) endGame(score + lives * 500, 'MISSION CLEAR');
  },
  render() {
    clear(K);
    for (let x = 0; x < PW; x += 16) { const h = 40 + Math.floor(hash(x, 7) * 90); rect(x, VH - h, 14, h, 9 + 0); for (let wy = VH - h + 6; wy < VH - 6; wy += 10) if (hash(x, wy) > 0.55) rect(x + 3, wy, 3, 4, M); }
    for (let i = 0; i < 18; i++) px(hash(i, 3) * PW, hash(i, 9) * 60, W);
    /* landing ghost */
    if (piece) {
      let gy = piece.y; while (!collide(piece.cells, piece.x, gy + 1)) gy++;
      for (const [dx, dy] of piece.cells) { const x = (piece.x + dx) * CS, y = (gy + dy) * CS; rect(x, y, CS, 1, D); rect(x, y + CS - 1, CS, 1, D); rect(x, y, 1, CS, D); rect(x + CS - 1, y, 1, CS, D); }
    }
    const drawBlock = (x, y, col, hp, flashOn) => {
      const c = flashOn ? W : col;
      rect(x, y, CS, CS, K); rect(x + 1, y + 1, CS - 2, CS - 2, c);
      if (!flashOn) { rect(x + 1, y + 1, CS - 2, 2, V); rect(x + 1, y + 1, 2, CS - 2, V); rect(x + 3, y + CS - 3, CS - 4, 2, M); rect(x + CS - 3, y + 3, 2, CS - 4, M); rect(x + 5, y + 5, 6, 6, c); }
      if (hp === 1) { for (let i = 0; i < 12; i++) px(x + 2 + i, y + 3 + ((i * 7) % 9), K); px(x + 8, y + 2, K); px(x + 7, y + 13, K); }
    };
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c]; if (!cell) continue;
      const fl = flash && flash.rows.includes(r) && (Math.floor(flash.t * 20) & 1);
      drawBlock(c * CS, r * CS, cell.col, cell.hp, fl);
    }
    if (piece) for (const [dx, dy] of piece.cells) { const y = (piece.y + dy) * CS; if (y > -CS) drawBlock((piece.x + dx) * CS, y, piece.col, 2, false); }
    for (const e of enemies) spr(e.k === 'g' ? GRUNT : DRONE, e.x - (e.k === 'g' ? 0 : 0), e.y, e.k === 'g' && e.face < 0);
    if (!P.dead && !(P.inv > 0 && (Math.floor(elapsed * 14) & 1))) spr(HERO, P.x, P.y, P.face < 0);
    for (const b of pbul) { rect(b.x - 1, b.y - 1, 3, 3, Y); px(b.x, b.y, W); }
    for (const b of ebul) rect(b.x - 1, b.y - 1, 3, 3, R);
    for (const q of parts) px(q.x, q.y, q.col);
    /* side panel */
    rect(PW, 0, VW - PW, VH, DG); rect(PW, 0, 2, VH, W);
    if (nextKind) { const s = SHAPES[nextKind]; for (const [dx, dy] of s.c) { rect(PW + 14 + dx * 9, 152 + dy * 9, 9, 9, K); rect(PW + 15 + dx * 9, 153 + dy * 9, 7, 7, s.col); } }
    for (let i = 0; i < lives; i++) { rect(PW + 10 + i * 14, 196, 8, 3, R); rect(PW + 10 + i * 14, 199, 8, 6, S); }
    if (shake > 0) { /* quick screen jolt: shift a few rows */ for (let y = 0; y < VH; y += 8) if (hash(y, Math.floor(elapsed * 30)) > 0.7) { const o = Math.round((hash(y, 2) - 0.5) * 4); const row = buf.slice(y * VW, y * VW + PW); buf.set(row, y * VW + 0 + Math.max(0, o)); } }
  },
  hud(mode) {
    txt('SCORE', PW + 6, 8, W, 8); txt(pad5(score), PW + 6, 20, Y, 8);
    txt('LINES', PW + 6, 40, W, 8); txt(String(lines), PW + 6, 52, CY, 8);
    txt('TIME', PW + 6, 72, W, 8); txt(String(Math.max(0, Math.ceil(MAXT - elapsed))), PW + 6, 84, E, 8);
    txt('NEXT', PW + 6, 136, W, 8);
    txt('LIVES', PW + 6, 182, W, 8);
    for (const p of popups) txt(p.s, p.x, Math.round(p.y - p.t * 14), p.col, 8, 'center');
  },
  info() { return { score, lines, lives, elapsed:+elapsed.toFixed(1), enemies:enemies.length, py:Math.round(P.y), dead:P.dead }; },
  bot() {
    const i = { l:0, r:0, u:0, d:0, a:0, b:0, pa:0, pb:0, start:0 };
    const cx = P.x + 4;
    let danger = null;
    if (piece) for (const [dx, dy] of piece.cells) {
      const px0 = (piece.x + dx) * CS + 8, py0 = (piece.y + dy) * CS + 8;
      if (py0 < P.y + 4 && Math.abs(px0 - cx) < 22 && P.y - py0 < 80) danger = px0;
    }
    if (danger !== null) {
      if (danger >= cx) i.l = 1; else i.r = 1;
      if (P.blocked && P.ground) i.pa = 1;
      i.u = 1; i.b = 1;
    } else {
      let tgt = null, bd = 1e9;
      for (const e of enemies) { const d = Math.abs(e.x - P.x) + Math.abs(e.y - P.y); if (d < bd) { bd = d; tgt = e; } }
      if (tgt) {
        const dx = tgt.x - P.x;
        if (Math.abs(dx) > 52) { if (dx > 0) i.r = 1; else i.l = 1; } else if (Math.abs(dx) < 26) { if (dx > 0) i.l = 1; else i.r = 1; }
        P.face = dx >= 0 ? 1 : -1;
        if (Math.abs(tgt.y - P.y) < 18) i.b = 1;
        if (tgt.y < P.y - 20) { i.u = 1; i.b = 1; }
      } else { if (cx < 70) i.r = 1; else if (cx > 120) i.l = 1; }
      if (P.blocked && P.ground) i.pa = 1;
      if (i.l && !i.r) P.face = -1; else if (i.r && !i.l) P.face = 1;
    }
    if (!P.ground) i.a = 1;
    return i;
  },
};
