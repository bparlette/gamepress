/* ===== GRAPPLE NINJA: Bionic Commando x Ninja Gaiden. Swing a wire across pits, slash through the gauntlet. ===== */
const LEND = 3300, GRAV5 = 470, RMAX = 138;
let plats, rings, foes, shur, parts, popups, P, cam, score, lives, kills, elapsed, cps, att, T5, goalX, shake;

function buildLevel() {
  const r = mkRng(runSeed(55, 0));
  plats = [{ x:-64, y:176, w:254 }]; rings = []; foes = []; cps = [{ x:40, y:176 }];
  let x = 190, y = 176, cpNext = 700;
  while (x < LEND) {
    const big = r() < 0.3, gap = big ? 190 + r() * 40 : 66 + r() * 66;
    const ny = clamp(y + (r() * 37 - 12), 140, 192);
    const ry = Math.max(38, Math.min(y, ny) - 108);
    if (big) { rings.push({ x:x + gap * 0.33, y:ry }); rings.push({ x:x + gap * 0.72, y:ry + 6 }); }
    else rings.push({ x:x + gap * 0.5, y:ry });
    if (r() < 0.28) foes.push({ k:'hawk', x:x + gap * 0.5, y:ry + 52 + r() * 30, vx:-30, vy:0, w:12, h:8, ph:r() * 6, dead:false });
    x += gap;
    const w = big ? 96 + r() * 60 : 72 + r() * 100;
    plats.push({ x, y:ny, w });
    if (w >= 84 && r() < 0.72) foes.push({ k:'grunt', x:x + w * 0.5, y:ny - 16, vx:-22, vy:0, w:8, h:14, dir:-1, minx:x + 6, maxx:x + w - 14, dead:false, cd:0 });
    if (w >= 112 && r() < 0.5) foes.push({ k:'thrower', x:x + w - 20, y:ny - 16, vx:0, vy:0, w:8, h:14, dir:-1, dead:false, cd:1 + r() });
    y = ny; x += w;
    if (x > cpNext) { cps.push({ x:x - w + 14, y:ny }); cpNext += 700; }
  }
  plats.push({ x, y:176, w:260 }); goalX = x + 150;
}
function popup(s, x, y, col) { popups.push({ s, x, y, col, t:0 }); if (popups.length > 4) popups.shift(); }
function burst(x, y, col, n) { for (let i = 0; i < n; i++) parts.push({ x, y, vx:(vr() - 0.5) * 130, vy:-vr() * 100, t:0, col }); }
function solid(x, y) { for (const p of plats) if (x >= p.x && x < p.x + p.w && y >= p.y) return true; return false; }
function boxHits(x, y, w, h) { return solid(x, y) || solid(x + w - 1, y) || solid(x, y + h - 1) || solid(x + w - 1, y + h - 1); }
function tryMove(e, dx, dy) {
  let hitX = false, hitY = false;
  const sx = Math.max(1, Math.ceil(Math.abs(dx)));
  for (let i = 0; i < sx; i++) {
    const nx = e.x + dx / sx;
    if (!boxHits(nx, e.y, e.w, e.h)) e.x = nx;
    else {
      let up = 0;
      if (e === P) for (let k = 1; k <= 13; k++) if (!boxHits(nx, e.y - k, e.w, e.h)) { up = k; break; }
      if (up) { e.x = nx; e.y -= up; if (e.vy > 0) e.vy = 0; } else { hitX = true; break; }
    }
  }
  const sy = Math.max(1, Math.ceil(Math.abs(dy)));
  for (let i = 0; i < sy; i++) { const ny = e.y + dy / sy; if (!boxHits(e.x, ny, e.w, e.h)) e.y = ny; else { hitY = true; break; } }
  return { hitX, hitY };
}
function die(msg) {
  if (P.inv > 0 || P.dead) return;
  lives--; burst(P.x + 4, P.y + 7, R, 14); sfx('die'); shake = 0.3; P.att = null;
  popup(msg, 128, 70, R);
  if (lives <= 0) { P.dead = true; if (!att) endGame(score, 'GAME OVER'); return; }
  let cp = cps[0]; for (const c of cps) if (c.x <= P.x) cp = c;
  P.x = cp.x; P.y = cp.y - 16; P.vx = 0; P.vy = 0; P.inv = 2; if (P.x > goalX) P.x = cp.x;
}
function findRing() {
  let best = null, bs = 1e9;
  const cx = P.x + 4, cy = P.y + 4;
  for (const r of rings) {
    const dx = r.x - cx, dy = r.y - cy, d = Math.hypot(dx, dy);
    if (dy > -22 || d > RMAX || d < 24) continue;
    if (dx * P.face < -14) continue;
    const s = d + Math.abs(dx - P.face * 40) * 0.5;
    if (s < bs) { bs = s; best = r; }
  }
  return best;
}
function setup(isAtt) {
  buildLevel();
  parts = []; popups = []; shur = []; score = 0; lives = 3; kills = 0; elapsed = 0; T5 = 0; GAME._tg = 0; shake = 0;
  P = { x:40, y:160, vx:0, vy:0, w:8, h:14, face:1, ground:false, att:null, slash:0, scd:0, inv:1, dead:false, reel:0, whiff:0, run:0 };
  cam = 0;
}

const GAME = {
  id:'g5', t1:'GRAPPLE', t2:'NINJA', sub:'SWING. SLASH. SURVIVE.',
  music:{ bpm:156, lead:'square', chords:[{ root:-24, tones:[0,3,7] }, { root:-27, tones:[-3,0,4] }, { root:-22, tones:[2,5,9] }, { root:-26, tones:[-2,2,5] }],
          arp:[0,-1,2,0,1,-1,2,1,0,-1,2,0,2,1,0,-1], bass:[0,3,6,8,11,14], snare:[4,12], kick:[0,6,10], hat:true, lead:'square' },
  init(isAtt) { att = !!isAtt; setup(att); },
  update(dt, inp, mode) {
    att = mode === 'title';
    T5 += dt; elapsed += dt; if (shake > 0) shake -= dt;
    if (att && (P.dead || P.x > goalX || elapsed > 70)) { setup(true); return; }
    if (!P.dead) {
      P.inv = Math.max(0, P.inv - dt); P.scd = Math.max(0, P.scd - dt); P.slash = Math.max(0, P.slash - dt); P.whiff = Math.max(0, P.whiff - dt);
      const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
      if (dir) P.face = dir;
      /* grapple */
      if (inp.pa && !P.att) {
        const ring = findRing();
        if (ring) { const L = Math.hypot(ring.x - (P.x + 4), ring.y - (P.y + 4)); P.att = { ring, L:clamp(L, 30, RMAX) }; sfx('power'); P.ground = false; }
        else { P.whiff = 0.15; sfx('tick'); }
      }
      if (P.att && !inp.a) { P.att = null; sfx('swing'); if (P.vy < -30 || Math.abs(P.vx) > 60) { P.vx *= 1.08; P.vy *= 1.04; } }
      if (P.att) {
        const a = P.att, cx = P.x + 4, cy = P.y + 4;
        if (inp.u) a.L = Math.max(30, a.L - 52 * dt); if (inp.d) a.L = Math.min(RMAX, a.L + 52 * dt);
        P.vy += GRAV5 * dt; P.vx += dir * 190 * dt; P.vx *= 1 - 0.1 * dt;
        tryMove(P, P.vx * dt, P.vy * dt);
        const nx0 = P.x + 4 - a.ring.x, ny0 = P.y + 4 - a.ring.y, d = Math.hypot(nx0, ny0);
        if (d > a.L) {
          const nx = nx0 / d, ny = ny0 / d, tx = a.ring.x + nx * a.L - 4, ty = a.ring.y + ny * a.L - 4;
          tryMove(P, tx - P.x, ty - P.y);
          const vn = P.vx * nx + P.vy * ny; if (vn > 0) { P.vx -= vn * nx; P.vy -= vn * ny; }
        }
        P.ground = boxHits(P.x, P.y + 1, P.w, P.h);
        if (P.ground && P.vy > 0) { P.vy = 0; }
      } else {
        const sp = P.ground ? 74 : 62;
        P.vx += (dir * sp - P.vx) * Math.min(1, (P.ground ? 14 : 3) * dt);
        if (inp.u && P.ground && !inp.a) { P.vy = -178; sfx('jump'); }
        P.vy += GRAV5 * dt;
        const r = tryMove(P, P.vx * dt, P.vy * dt);
        if (r.hitX) P.vx = 0;
        if (r.hitY) { P.vy = 0; }
        P.ground = boxHits(P.x, P.y + 1, P.w, P.h);
      }
      P.run += Math.abs(P.vx) * dt * 0.2;
      if (inp.pb && P.scd <= 0) { P.slash = 0.18; P.scd = 0.3; sfx('swing'); }
      if (P.y > VH + 12) die('FELL!');
      if (P.x < -50) { P.x = -50; P.vx = 0; }
      if (P.x > goalX && !att) { endGame(score + Math.max(0, Math.round((110 - elapsed) * 20)) + lives * 500, 'STAGE CLEAR'); }
    }
    /* foes */
    const sx0 = P.slash > 0 ? (P.face > 0 ? P.x + 8 : P.x - 24) : -999;
    for (const f of foes) {
      if (f.dead) continue;
      const near = Math.abs(f.x - P.x) < 280; if (!near) continue;
      if (f.k === 'grunt') {
        f.x += f.dir * 22 * dt; if (f.x < f.minx) f.dir = 1; if (f.x > f.maxx) f.dir = -1;
        if (Math.abs(f.x - P.x) < 70 && Math.abs(f.y - P.y) < 24) f.dir = Math.sign(P.x - f.x) || 1;
      } else if (f.k === 'thrower') {
        f.dir = Math.sign(P.x - f.x) || -1; f.cd -= dt;
        if (f.cd <= 0 && Math.abs(f.x - P.x) < 170) { f.cd = 2.1; shur.push({ x:f.x + 4, y:f.y + 4, vx:f.dir * 95, t:0 }); sfx('shoot'); }
      } else { f.ph += dt * 3; f.x += f.vx * dt; f.y += Math.cos(f.ph) * 0.45; if (Math.abs(f.x - P.x) < 4 && false) f.vx = -f.vx; }
      if (P.slash > 0 && f.x + f.w > sx0 && f.x < sx0 + 24 && f.y + f.h > P.y - 2 && f.y < P.y + 16) {
        f.dead = true; kills++; const pts = f.k === 'hawk' ? 200 : 150; score += pts; popup('+' + pts, f.x, f.y - 8, Y); burst(f.x + 4, f.y + 6, f.k === 'hawk' ? T : R, 10); sfx('pop');
      } else if (!P.dead && P.inv <= 0 && f.x < P.x + P.w && f.x + f.w > P.x && f.y < P.y + P.h && f.y + f.h > P.y) die(f.k === 'hawk' ? 'HAWKED!' : 'CUT DOWN!');
    }
    for (let i = shur.length - 1; i >= 0; i--) {
      const s = shur[i]; s.x += s.vx * dt; s.t += dt;
      if (P.slash > 0 && s.x > sx0 && s.x < sx0 + 24 && s.y > P.y - 2 && s.y < P.y + 16) { shur.splice(i, 1); score += 25; sfx('hit'); continue; }
      if (!P.dead && P.inv <= 0 && s.x > P.x && s.x < P.x + P.w && s.y > P.y && s.y < P.y + P.h) { die('STARRED!'); shur.splice(i, 1); continue; }
      if (s.t > 3 || solid(s.x, s.y)) shur.splice(i, 1);
    }
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t += dt; q.vy += 300 * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.t > 0.6) parts.splice(i, 1); }
    for (let i = popups.length - 1; i >= 0; i--) { popups[i].t += dt; if (popups[i].t > 1.2) popups.splice(i, 1); }
    cam = clamp(P.x - 96, 0, goalX + 120 - VW);
  },
  render() {
    clear(N);
    for (let i = 0; i < 45; i++) px(hash(i, 4) * VW, hash(i, 6) * 110, (Math.floor(T5 * 2 + i) & 3) ? D : W);
    fillCircle(206, 40, 18, V); fillCircle(212, 36, 16, N); fillCircle(206, 40, 18, V); fillCircle(213, 37, 13, V);
    /* mountains and bamboo, parallax */
    for (let x = 0; x < VW; x++) { const wx = x + cam * 0.2; const h = 34 + Math.sin(wx / 31) * 14 + Math.sin(wx / 13) * 5; rect(x, 150 - h, 1, 80, B); }
    for (let x = 0; x < VW; x++) { const wx = x + cam * 0.45; const h = 20 + Math.sin(wx / 17) * 9 + Math.sin(wx / 7) * 3; rect(x, 176 - h, 1, 60, DG); }
    for (let i = 0; i < 8; i++) { const bx = ((i * 71 - cam * 0.7) % 400 + 400) % 400 - 40; rect(bx, 60, 3, 170, F); for (let y = 70; y < 230; y += 26) rect(bx - 1, y, 5, 2, GR); }
    /* platforms */
    for (const p of plats) {
      const x0 = Math.round(p.x - cam); if (x0 > VW || x0 + p.w < 0) continue;
      rect(x0, p.y, p.w, VH - p.y, D); rect(x0, p.y, p.w, 3, E); rect(x0, p.y + 3, p.w, 2, F);
      for (let y = p.y + 8; y < VH; y += 10) { rect(x0, y, p.w, 1, DG); for (let x = x0 + ((y / 10) & 1) * 8; x < x0 + p.w; x += 16) rect(x, y, 1, 10, DG); }
      rect(x0, p.y, 1, VH - p.y, L); rect(x0 + p.w - 1, p.y, 1, VH - p.y, K);
    }
    /* spikes in pits */
    for (let x = 0; x < VW; x += 6) { const wx = x + cam; if (!plats.some(p => wx >= p.x && wx < p.x + p.w)) { for (let k = 0; k < 6; k++) rect(x + k, VH - 4 + Math.abs(k - 3) - 3, 1, 8, L); } }
    /* rings and rope */
    for (const r of rings) {
      const sx = Math.round(r.x - cam), sy = Math.round(r.y); if (sx < -10 || sx > VW + 10) continue;
      fillCircle(sx, sy, 5, CY); fillCircle(sx, sy, 3, N); px(sx - 2, sy - 3, W);
      if ((Math.floor(T5 * 4) & 1)) { px(sx + 6, sy, W); px(sx - 6, sy, W); }
      rect(sx - 1, sy - 9, 2, 4, D); rect(sx - 2, sy - 10, 4, 2, L);
    }
    if (P.att) { const hx = P.x + 4 - cam, hy = P.y + 3; line5(hx, hy, P.att.ring.x - cam, P.att.ring.y, L); }
    else if (P.whiff > 0) line5(P.x + 4 - cam, P.y + 3, P.x + 4 - cam + P.face * 34, P.y - 30, D);
    /* foes */
    for (const f of foes) { if (f.dead) continue; const sx = Math.round(f.x - cam); if (sx < -20 || sx > VW + 20) continue; drawFoe(f, sx); }
    for (const s of shur) { const sx = Math.round(s.x - cam), sy = Math.round(s.y), k = Math.floor(s.t * 20) & 1; rect(sx - 2, sy, 5, 1, L); rect(sx, sy - 2, 1, 5, L); if (k) { px(sx - 1, sy - 1, W); px(sx + 1, sy + 1, W); } else { px(sx + 1, sy - 1, W); px(sx - 1, sy + 1, W); } }
    if (!P.dead && !(P.inv > 0 && (Math.floor(T5 * 16) & 1))) drawNinja();
    for (const q of parts) px(q.x - cam, q.y, q.col);
    /* goal gate */
    { const gx = Math.round(goalX - cam); if (gx > -30 && gx < VW + 30) { rect(gx, 120, 4, 56, R); rect(gx + 24, 120, 4, 56, R); rect(gx - 4, 116, 36, 5, R); rect(gx - 2, 112, 32, 3, R); for (let y = 0; y < 5; y++) for (let x = 0; x < 10; x++) rect(gx + 4 + x * 2, 124 + y * 2, 2, 2, ((x + y) & 1) ? W : K); } }
    rect(0, 0, VW, 14, N); rect(0, 14, VW, 1, W);
    const prog = clamp(P.x / goalX, 0, 1); rect(88, 5, 80, 4, DG); rect(88, 5, Math.round(80 * prog), 4, E); rect(88 + Math.round(80 * prog) - 1, 3, 3, 8, W);
    for (let i = 0; i < lives; i++) { rect(212 + i * 12, 3, 8, 8, N); rect(212 + i * 12, 3, 8, 3, R); rect(213 + i * 12, 6, 6, 3, S); px(216 + i * 12, 7, K); }
    if (shake > 0) for (let y = 15; y < VH; y += 6) if (hash(y, Math.floor(T5 * 40)) > 0.6) { const o = Math.round((hash(y, 8) - 0.5) * 4); const row = buf.slice(y * VW, (y + 1) * VW); buf.set(row.subarray(Math.max(0, -o), VW - Math.max(0, o)), y * VW + Math.max(0, o)); }
  },
  hud(mode) {
    txt('SCORE ' + pad5(score), 4, 3, W, 8);
    for (const p of popups) txt(p.s, Math.round(p.x - cam), Math.round(p.y - p.t * 14), p.col, 8, 'center');
    if (mode === 'play' && T5 < 6) txt('HOLD A NEAR A RING TO SWING', 128, 150 - 0, W, 8, 'center');
  },
  info() { return { score, lives, kills, x:Math.round(P.x), y:Math.round(P.y), vx:Math.round(P.vx), vy:Math.round(P.vy), g:P.ground, goal:Math.round(goalX), t:+elapsed.toFixed(1), dead:P.dead, att:!!P.att, L:P.att ? Math.round(P.att.L) : 0, dbg:GAME._dbg, plats:plats.slice(0,4).map(p => [Math.round(p.x), Math.round(p.y), Math.round(p.w)]), rings:rings.slice(0,3).map(r => [Math.round(r.x), Math.round(r.y)]) }; },
  bot() {
    const i = { l:0, r:0, u:0, d:0, a:0, b:0, pa:0, pb:0, start:0 };
    i.r = 1; P.face = 1;
    const aheadGround = solid(P.x + 14, P.y + 16) || solid(P.x + 6, P.y + 16);
    const nearRing = findRing();
    const lands = () => {
      let x = P.x, y = P.y, vx = P.vx, vy = P.vy;
      for (let k = 0; k < 150; k++) {
        const nx = x + vx / 60, ny = y + vy / 60; vy += GRAV5 / 60;
        if (ny > VH - 4) return false;
        if (boxHits(nx - 2, ny - 2, 12, 18)) { return !boxHits(nx - 2, y - 2, 12, 18) && vy > 0; }
        x = nx; y = ny;
      }
      return false;
    };
    if (P.att) {
      i.a = 1; i.r = 1; if (P.att.L > 104) i.u = 1;
      const dxr = (P.x + 4) - P.att.ring.x;
      const ld = lands(); GAME._dbg = [Math.round(dxr), ld ? 1 : 0, Math.round(T5 - (GAME._tg || 0))];
      if (dxr > 8 && P.vx > 25 && ld) i.a = 0;
      if (T5 - (GAME._tg || 0) > 3.2) i.a = 0;
    } else {
      GAME._tg = T5;
      if (!P.ground && nearRing && P.vy > -10 && !lands()) { i.pa = 1; i.a = 1; }
      else if (P.ground && !aheadGround && nearRing) { i.pa = 1; i.a = 1; }
      else if (P.ground && !aheadGround && !nearRing) { i.u = 1; }
    }
    for (const f of foes) {
      if (f.dead) continue; const dx = f.x - P.x;
      if (dx > -4 && dx < 30 && Math.abs(f.y - P.y) < 24) { i.pb = 1; }
      if (f.k === 'grunt' && dx > 28 && dx < 44 && P.ground && Math.abs(f.y - P.y) < 8) i.u = 1;
    }
    for (const s of shur) { const dx = s.x - P.x; if (dx > 0 && dx < 28 && Math.abs(s.y - (P.y + 6)) < 12) i.pb = 1; }
    if (P.ground && P.vx < 5 && aheadGround && solid(P.x + 10, P.y + 4)) i.u = 1;
    return i;
  },
};
function line5(x0, y0, x1, y1, c) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
  for (let i = 0; i < 300; i++) { px(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
function drawNinja() {
  const x = Math.round(P.x - cam), y = Math.round(P.y), f = P.face;
  const Rr = (ox, oy, w, h, c) => rect(f > 0 ? x + ox : x + 8 - ox - w, y + oy, w, h, c);
  const swing = !!P.att, air = !P.ground && !swing;
  Rr(1, 0, 6, 5, N); Rr(4, 2, 3, 2, S); Rr(1, 1, 6, 1, R); Rr(-3 - (swing ? 1 : 0), 1 + (Math.floor(T5 * 12) & 1), 4, 1, R);
  Rr(1, 5, 6, 6, N); Rr(1, 8, 6, 1, R);
  if (swing) { Rr(5, 0, 2, 6, B); Rr(0, 0, 2, 6, B); Rr(2, 11, 4, 4, N); }
  else if (air) { Rr(-1, 5, 2, 4, B); Rr(7, 5, 2, 4, B); Rr(0, 11, 3, 4, N); Rr(5, 10, 3, 3, N); }
  else { const s = Math.floor(P.run) & 1; Rr(-1, 6, 2, 4, B); Rr(7, 6, 2, 3, B); Rr(1 + s, 11, 3, 3, N); Rr(4 - s, 11, 3, 3, N); Rr(1 + s, 14, 3, 1, K); Rr(4 - s, 14, 3, 1, K); }
  if (P.slash > 0) {
    const u = 1 - P.slash / 0.18;
    for (let k = 0; k < 7; k++) { const a = (-70 + u * 130 + k * 4) * rad, rr = 17; const px_ = Math.cos(a) * rr * f, py_ = Math.sin(a) * rr; px(x + 4 + px_, y + 6 + py_, k > 4 ? W : CY); px(x + 4 + px_ * 0.85, y + 6 + py_ * 0.85, W); }
  }
}
function drawFoe(f, sx) {
  const y = Math.round(f.y);
  if (f.k === 'hawk') { const fl = Math.floor(T5 * 10) & 1; rect(sx, y + 2, 12, 3, T); rect(sx + 9, y + 1, 4, 3, M); px(sx + 11, y + 2, Y); rect(sx + 2, y - (fl ? 2 : 0), 4, 3, T); rect(sx + 2, y + 5 + (fl ? 0 : 1), 4, 2, T); return; }
  const f_ = f.dir, Rr = (ox, oy, w, h, c) => rect(f_ > 0 ? sx + ox : sx + 8 - ox - w, y + oy, w, h, c);
  const pal = f.k === 'thrower' ? { a:PU, b:PK } : { a:T, b:O };
  Rr(1, 0, 6, 5, pal.a); Rr(3, 2, 4, 2, S); px(f_ > 0 ? sx + 6 : sx + 1, y + 2, K);
  Rr(1, 5, 6, 6, pal.a); Rr(1, 8, 6, 1, K);
  const s = f.k === 'grunt' ? Math.floor(T5 * 6) & 1 : 0;
  Rr(1 + s, 11, 3, 3, K); Rr(4 - s, 11, 3, 3, K);
  if (f.k === 'grunt') { Rr(7, 3, 2, 8, L); Rr(8, 2, 1, 2, W); } else Rr(-1, 5, 2, 4, S);
}
