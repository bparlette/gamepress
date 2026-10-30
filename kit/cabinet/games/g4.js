/* ===== BOOM BALLOONS: Balloon Fight x Bomberman. Flap around a destructible arena, drop bouncing bombs, pop their balloons. ===== */
const TS = 16, GW = 16, GH = 13, OY = 16, RANGE = 3, WAVES = 3;
const LAYOUT = [
"................",
"..+..........+..",
".###........###.",
"................",
"....##+..+##....",
"................",
".+.....##.....+.",
"..###......###..",
"................",
"....+..##..+....",
".##..........##.",
"......+..+......",
"################",
];
let map, pl, foes, bombs, flames, parts, popups, score, lives, wave, att, rng, T4, waveWait, shake, clearT;

const tileAt = (c, r) => { c = ((c % GW) + GW) % GW; if (r < 0 || r >= GH) return '#'; return map[r][c]; };
function solidPx(x, y) { if (y < OY || y >= VH) return true; return tileAt(Math.floor(x / TS), Math.floor((y - OY) / TS)) !== '.'; }
function boxHits(x, y, w, h) { const x2 = x + w - 1, y2 = y + h - 1; return solidPx(x, y) || solidPx(x2, y) || solidPx(x, y2) || solidPx(x2, y2); }
const wrapX = x => ((x % VW) + VW) % VW;
function popup(s, x, y, col) { popups.push({ s, x, y, col, t:0 }); if (popups.length > 5) popups.shift(); }
function burst(x, y, col, n, spd) { for (let i = 0; i < n; i++) parts.push({ x, y, vx:(vr() - 0.5) * (spd || 120), vy:-vr() * 90, t:0, col }); }
function gravityOf(e) { return e.bal >= 2 ? 120 : e.bal === 1 ? 200 : 380; }

function moveBody(e, dt, g, bounce) {
  e.vy = Math.min(e.vy + g * dt, 150 + (e.bal === 0 ? 150 : 0) + (e.isBomb ? 120 : 0));
  const dx = e.vx * dt, sx = Math.max(1, Math.ceil(Math.abs(dx)));
  for (let i = 0; i < sx; i++) { const nx = wrapX(e.x + dx / sx); if (!boxHits(nx, e.y, e.w, e.h)) e.x = nx; else { e.vx = bounce ? -e.vx * 0.5 : 0; break; } }
  const dy = e.vy * dt, sy = Math.max(1, Math.ceil(Math.abs(dy)));
  for (let i = 0; i < sy; i++) {
    const ny = e.y + dy / sy;
    if (!boxHits(e.x, ny, e.w, e.h)) e.y = ny;
    else { if (bounce && Math.abs(e.vy) > 40) e.vy = -e.vy * 0.4; else { if (e.vy < 0) e.ceil = true; e.vy = e.vy < 0 ? 20 : 0; } break; }
  }
  e.ground = boxHits(e.x, e.y + 1, e.w, e.h);
}
function mkBird(kind, x, y, bal, pal) { return { kind, x, y, vx:0, vy:0, w:8, h:12, bal, face:1, ground:false, inv:kind === 'p' ? 2 : 0.5, flapCd:0.3, bombCd:3 + rng() * 2, pump:0, pal, wing:0, dead:false, ft:0 }; }
function spawnWave() {
  const n = wave + 1;
  foes = [];
  const spots = [[24, 36], [224, 36], [120, 30], [60, 100], [196, 100]];
  for (let i = 0; i < n + 1 && i < 5; i++) {
    const s = spots[i], f = mkBird('e', s[0], s[1], i === 0 && wave === 1 ? 1 : 2, i % 2 ? { cap:PU, balloon:PU, hi:PK } : { cap:GR, balloon:E, hi:V });
    foes.push(f);
  }
  popup('WAVE ' + wave, 128, 90, Y);
}
function resetMap() { map = LAYOUT.map(r => r.split('')); }
function setup(isAtt) {
  rng = mkRng(runSeed(isAtt ? 21 : null, 9)); GAME._fl = 0;
  resetMap();
  pl = mkBird('p', 120, 60, 2, { cap:R, balloon:R, hi:PK });
  bombs = []; flames = []; parts = []; popups = []; foes = []; score = 0; lives = 3; wave = 1; shake = 0; T4 = 0; waveWait = 0; clearT = 0;
  spawnWave();
}
function dropBomb(e) {
  const mine = bombs.filter(b => b.owner === e).length;
  if (mine >= (e.kind === 'p' ? 2 : 1)) return false;
  bombs.push({ x:e.x - 1, y:e.y + 4, vx:e.vx * 0.5, vy:20, w:10, h:10, fuse:2.1, owner:e, isBomb:true, bal:2 });
  sfx('tick'); return true;
}
function explode(b) {
  const tx = Math.floor(wrapX(b.x + 5) / TS), ty = Math.floor((b.y + 5 - OY) / TS);
  const cells = [[tx, ty]];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let i = 1; i <= RANGE; i++) {
      const cx = ((tx + dx * i) % GW + GW) % GW, cy = ty + dy * i, t = tileAt(cx, cy);
      if (cy < 0 || cy >= GH || t === '#') break;
      cells.push([cx, cy]);
      if (t === '+') { map[cy][cx] = '.'; score += 10; burst(cx * TS + 8, cy * TS + OY + 8, T, 8); break; }
    }
  }
  flames.push({ cells, t:0 });
  sfx('boom'); shake = 0.25;
  bombs.splice(bombs.indexOf(b), 1);
}
function hitBird(e, why) {
  if (e.bal <= 0 || e.inv > 0) return;
  e.bal--; e.inv = e.kind === 'p' ? 1.4 : 0.6; sfx('pop'); burst(e.x + 4, e.y - 8, e.pal.balloon, 10);
  if (e.kind === 'e') { score += 100; popup('POP! +100', e.x, e.y - 20, Y); }
  else popup('OUCH!', e.x, e.y - 20, R);
  if (e.bal === 0) { e.pump = 0; if (e.kind === 'p') popup('PUMP A!', 128, 60, O); }
}
function killBird(e) {
  e.dead = true; burst(e.x + 4, e.y + 6, e.kind === 'e' ? L : R, 14, 160); sfx('hit');
  if (e.kind === 'e') { score += 400; popup('SPLAT! +400', e.x, e.y - 14, Y); }
  else {
    lives--; popup('LOST A LIFE', 128, 70, R); sfx('die');
    if (lives <= 0) { if (!att) endGame(score, 'GAME OVER'); }
    else { pl = mkBird('p', 120, 40, 2, pl.pal); }
  }
}

const GAME = {
  id:'g4', t1:'BOOM', t2:'BALLOONS', sub:'FLAP, DROP, POP!',
  music:{ bpm:146, lead:'square', chords:[{ root:-24, tones:[0,3,7] }, { root:-21, tones:[3,7,10] }, { root:-19, tones:[2,7,10] }, { root:-26, tones:[-2,2,5] }],
          arp:[0,2,1,2,0,2,1,2,2,1,0,1,2,1,0,-1], bass:[0,4,8,12,6,14], snare:[4,12], kick:[0,8,10], hat:true },
  init(isAtt) { att = !!isAtt; setup(att); },
  update(dt, inp, mode) {
    att = mode === 'title';
    T4 += dt; if (shake > 0) shake -= dt;
    if (att && (lives <= 0 || T4 > 60)) { setup(true); return; }
    /* player */
    if (!pl.dead) {
      pl.inv = Math.max(0, pl.inv - dt);
      const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
      if (dir) pl.face = dir;
      const maxS = pl.ground ? 46 : 64;
      pl.vx += (dir * maxS - pl.vx) * Math.min(1, (pl.ground ? 10 : 2.4) * dt);
      if (inp.pa) {
        if (pl.bal > 0) { pl.vy = pl.bal >= 2 ? -78 : -68; pl.wing = 0.12; sfx('flap'); }
        else { pl.pump++; sfx('tick'); if (pl.pump >= 3) { pl.bal = 1; pl.pump = 0; pl.inv = 1; popup('RE-INFLATED!', 128, 70, E); sfx('power'); } }
      }
      if (inp.pb) dropBomb(pl);
      if (pl.wing > 0) pl.wing -= dt;
      moveBody(pl, dt, gravityOf(pl), false);
      if (pl.x < 0 || pl.x >= VW) pl.x = wrapX(pl.x);
      if (pl.bal === 0 && pl.ground) killBird(pl);
    }
    /* foes */
    for (const f of foes) {
      if (f.dead) continue;
      f.inv = Math.max(0, f.inv - dt); f.flapCd -= dt; f.bombCd -= dt; if (f.wing > 0) f.wing -= dt;
      if (f.bal > 0) {
        const px0 = pl.x, py0 = pl.y;
        let dx = px0 - f.x; if (Math.abs(dx) > VW / 2) dx -= Math.sign(dx) * VW;
        let dir = Math.abs(dx) > 10 ? Math.sign(dx) : 0;
        for (const b of bombs) { let bdx = b.x - f.x; if (Math.abs(bdx) > VW / 2) bdx -= Math.sign(bdx) * VW; if (Math.abs(bdx) < 46 && Math.abs(b.y - f.y) < 46) { dir = -Math.sign(bdx) || 1; if (f.flapCd > 0.1 && b.y > f.y - 20) f.flapCd = 0.05; } }
        if (dir) f.face = dir;
        f.vx += (dir * 52 - f.vx) * Math.min(1, 2.2 * dt);
        const targetY = pl.y - 24 + Math.sin(T4 + f.x) * 10;
        if ((f.y > targetY || f.vy > 55) && f.flapCd <= 0 && f.y > 36) { f.vy = f.bal >= 2 ? -74 : -64; f.flapCd = 0.32 + rng() * 0.45; f.wing = 0.12; }
        if (f.bombCd <= 0 && Math.abs(dx) < 22 && f.y < pl.y - 14 && f.y > 30) { if (dropBomb(f)) { f.bombCd = 4.5 + rng() * 2.5; f.vx += dir * -30; } else f.bombCd = 1; }
      }
      moveBody(f, dt, gravityOf(f), false);
      if (f.bal === 0 && f.ground) killBird(f);
    }
    foes = foes.filter(f => !f.dead);
    /* stomps and bumps */
    const birds = [pl].concat(foes);
    for (const a of birds) for (const b of birds) {
      if (a === b || a.dead || b.dead || b.bal <= 0) continue;
      let ddx = a.x - b.x; if (Math.abs(ddx) > VW / 2) ddx -= Math.sign(ddx) * VW;
      const balRectX = b.x - 3, bw = b.w + 6;
      if (a.vy > 20 && a.y + a.h - 5 < b.y - 2 && Math.abs(ddx) < 9 && a.y + a.h > b.y - 12 && b.inv <= 0) {
        hitBird(b, 'stomp'); a.vy = -70; if (a === pl && b.kind === 'e') { score += 0; }
      } else if (Math.abs(ddx) < 8 && Math.abs(a.y - b.y) < 12 && a !== b && birds.indexOf(a) < birds.indexOf(b)) {
        const s = Math.sign(ddx) || 1; a.vx = s * 55; b.vx = -s * 55; sfx('tick');
      }
    }
    /* bombs */
    for (let i = bombs.length - 1; i >= 0; i--) {
      const b = bombs[i]; b.fuse -= dt;
      moveBody(b, dt, 300, true);
      if (b.ground) b.vx *= Math.max(0, 1 - 6 * dt);
      for (const e of birds) {
        if (e.dead) continue;
        if (e.x < b.x + b.w && e.x + e.w > b.x && e.y < b.y + b.h && e.y + e.h > b.y && (Math.abs(e.vx) > 8)) { b.vx = e.vx * 1.5; b.vy = -30; }
      }
      if (b.fuse <= 0) explode(b);
    }
    /* flames */
    for (let i = flames.length - 1; i >= 0; i--) {
      const fl = flames[i]; fl.t += dt;
      for (const [cx, cy] of fl.cells) {
        const fx = cx * TS, fy = cy * TS + OY;
        for (const e of birds) {
          if (e.dead || e.bal <= 0) continue;
          const bx = e.x - 2, by = e.y - 11, bw = e.w + 4, bh = e.h + 11;
          if (bx < fx + TS && bx + bw > fx && by < fy + TS && by + bh > fy) hitBird(e, 'blast');
        }
        for (const b of bombs) if (b.x < fx + TS && b.x + b.w > fx && b.y < fy + TS && b.y + b.h > fy && b.fuse > 0.08) b.fuse = 0.08;
      }
      if (fl.t > 0.4) flames.splice(i, 1);
    }
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t += dt; q.vy += 260 * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.t > 0.7) parts.splice(i, 1); }
    for (let i = popups.length - 1; i >= 0; i--) { popups[i].t += dt; if (popups[i].t > 1.4) popups.splice(i, 1); }
    /* wave logic */
    if (!foes.length && lives > 0) {
      waveWait += dt;
      if (waveWait > 1.6) {
        waveWait = 0; score += 1000; popup('WAVE CLEAR +1000', 128, 70, E); sfx('win');
        if (wave >= WAVES) { if (!att) endGame(score + lives * 500, 'ARENA CLEAR'); else setup(true); }
        else { wave++; resetMap(); bombs = []; flames = []; spawnWave(); }
      }
    }
  },
  render() {
    clear(K);
    for (let i = 0; i < 40; i++) px(hash(i, 3) * VW, OY + hash(i, 7) * (VH - OY - 30), (Math.floor(T4 * 2 + i) & 3) ? D : W);
    rect(0, OY, VW, 1, B);
    /* tiles */
    for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
      const t = map[r][c]; if (t === '.') continue;
      const x = c * TS, y = r * TS + OY;
      if (t === '#') {
        rect(x, y, TS, TS, BRK); rect(x, y, TS, 1, O); rect(x, y + 7, TS, 1, K); rect(x, y + 15, TS, 1, K);
        for (const bx of [3, 11]) rect(x + bx, y, 1, 7, K); for (const bx of [7]) rect(x + bx, y + 8, 1, 7, K);
      } else {
        rect(x, y, TS, TS, T); rect(x, y, TS, 2, V); rect(x, y, 2, TS, V); rect(x + TS - 2, y, 2, TS, M); rect(x, y + TS - 2, TS, 2, M);
        for (let i = 3; i < 13; i++) { px(x + i, y + i, M); px(x + 15 - i, y + i, M); }
      }
    }
    /* bombs */
    for (const b of bombs) {
      const x = Math.round(b.x), y = Math.round(b.y), blink = b.fuse < 0.8 && (Math.floor(b.fuse * 14) & 1);
      fillCircle(x + 5, y + 6, 5, blink ? R : K); px(x + 3, y + 3, W); px(x + 4, y + 3, W);
      rect(x + 5, y - 1, 2, 3, T); px(x + 7, y - 2, (Math.floor(T4 * 20) & 1) ? Y : O); px(x + 8, y - 3, W);
    }
    /* flames */
    for (const fl of flames) {
      const u = fl.t / 0.4, shrink = Math.floor(u * 4);
      for (const [cx, cy] of fl.cells) {
        const x = cx * TS + shrink, y = cy * TS + OY + shrink, s = TS - shrink * 2;
        rect(x, y, s, s, R); rect(x + 2, y + 2, s - 4, s - 4, O); rect(x + 4, y + 4, Math.max(2, s - 8), Math.max(2, s - 8), Y); if (u < 0.5) rect(x + 6, y + 6, Math.max(1, s - 12), Math.max(1, s - 12), W);
      }
    }
    for (const f of foes) drawBird(f);
    if (!pl.dead && lives > 0) drawBird(pl);
    for (const q of parts) px(q.x, q.y, q.col);
    /* HUD bar */
    rect(0, 0, VW, OY, N); rect(0, OY - 1, VW, 1, W);
    for (let i = 0; i < lives; i++) { const x = 90 + i * 12; fillCircle(x + 3, 6, 3, R); px(x + 2, 4, W); line_(x + 3, 9, x + 3, 13, L); }
    if (shake > 0) for (let y = OY; y < VH; y += 6) if (hash(y, Math.floor(T4 * 40)) > 0.6) { const o = Math.round((hash(y, 8) - 0.5) * 4); const row = buf.slice(y * VW, (y + 1) * VW); buf.set(row.subarray(Math.max(0, -o), VW - Math.max(0, o)), y * VW + Math.max(0, o)); }
  },
  hud(mode) {
    txt('SCORE ' + pad5(score), 6, 4, W, 8);
    txt('WAVE ' + wave + '/' + WAVES, 250, 4, Y, 8, 'right');
    for (const p of popups) txt(p.s, clamp(p.x, 50, 206), Math.round(p.y - p.t * 12), p.col, 8, 'center');
    if (mode === 'play' && T4 < 5) txt('A FLAP  B BOMB', 128, 118, W, 8, 'center');
  },
  info() { return { score, lives, wave, foes:foes.length, bal:pl.bal, bombs:bombs.length, py:Math.round(pl.y) }; },
  bot() {
    const i = { l:0, r:0, u:0, d:0, a:0, b:0, pa:0, pb:0, start:0 };
    let tgt = null, bd = 1e9;
    for (const f of foes) { const d = Math.abs(f.x - pl.x) + Math.abs(f.y - pl.y); if (d < bd) { bd = d; tgt = f; } }
    let flee = null;
    for (const b of bombs) { let dx = b.x - pl.x; if (Math.abs(dx) > VW / 2) dx -= Math.sign(dx) * VW; if (Math.abs(dx) < 48 && Math.abs(b.y - pl.y) < 48) flee = dx; }
    let ty = 70;
    if (flee !== null) { if (flee > 0) i.l = 1; else i.r = 1; ty = pl.y - 30; }
    else if (tgt) {
      let dx = tgt.x - pl.x; if (Math.abs(dx) > VW / 2) dx -= Math.sign(dx) * VW;
      if (Math.abs(dx) > 14) { if (dx > 0) i.r = 1; else i.l = 1; }
      ty = tgt.y - 30;
      if (Math.abs(dx) < 22 && tgt.y > pl.y + 8 && tgt.y < pl.y + 80 && !bombs.some(b => b.owner === pl) && pl.bal > 0) i.pb = 1;
    }
    if (pl.bal === 0) { i.pa = (Math.floor(T4 * 12) & 1) ? 1 : 0; return i; }
    if ((pl.y > ty + 6 || pl.vy > 55) && pl.y > 36 && !GAME._fl) { i.pa = 1; GAME._fl = 5; } else if (GAME._fl) GAME._fl--;
    return i;
  },
};
function line_(x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) px(x0, y, c); }
function drawBird(e) {
  const draw = ox => {
    const x = Math.round(e.x + ox), y = Math.round(e.y), p = e.pal;
    if (e.inv > 0 && e.kind === 'p' && (Math.floor(T4 * 16) & 1)) return;
    const f = e.face;
    /* balloons */
    const balloon = (bx, by, col, hi) => { rect(bx - 3, by - 1, 7, 8, col); rect(bx - 2, by - 2, 5, 1, col); rect(bx - 2, by + 7, 5, 1, col); px(bx - 1, by, hi); px(bx - 1, by + 1, hi); px(bx, by + 8, col); };
    const wob = Math.round(Math.sin(T4 * 6 + e.x * 0.1));
    if (e.bal >= 2) { balloon(x + 1 + wob, y - 20, p.balloon, p.hi); balloon(x + 7 + wob, y - 20, p.balloon, p.hi); for (let k = 0; k < 8; k++) { px(x + 3 + Math.round(-k * 0.2), y - 11 + k, L); px(x + 5 + Math.round(k * 0.2), y - 11 + k, L); } }
    else if (e.bal === 1) { balloon(x + 4 + wob, y - 20, p.balloon, p.hi); for (let k = 0; k < 8; k++) px(x + 4, y - 11 + k, L); }
    else { rect(x - 1, y - 3, 10, 2, DG); }
    /* body */
    rect(x + 2, y, 4, 4, S); rect(x + 2, y - 1, 4, 2, p.cap); px(x + (f > 0 ? 5 : 2), y + 1, K);
    rect(x + 1, y + 4, 6, 4, p.cap === R ? W : p.cap); rect(x + 1, y + 8, 6, 2, B);
    const fl = e.wing > 0 || (e.bal > 0 && !e.ground && Math.floor(T4 * 8) & 1);
    rect(x - 1, y + (fl ? 1 : 5), 2, 3, S); rect(x + 7, y + (fl ? 1 : 5), 2, 3, S);
    const step = e.ground && Math.abs(e.vx) > 6 ? (Math.floor(T4 * 10) & 1) : 0;
    rect(x + 1, y + 10, 2, 2, K); rect(x + 5, y + 10 - step, 2, 2 + step, K);
    if (e.bal === 0) { const s = Math.floor(T4 * 12) & 1; px(x + s * 4, y - 4, Y); }
  };
  draw(0); if (e.x > VW - 16) draw(-VW); if (e.x < 16) draw(VW);
}
