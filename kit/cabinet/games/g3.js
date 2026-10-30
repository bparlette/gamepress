/* ===== PAPER RASH: Paperboy x Road Rash. Deliver papers to mailboxes, dodge traffic, punch rivals off their bikes. ===== */
const RX = 70, LANES = [133, 159, 185], MAXTIME = 75, SIDEWALK = 110, STRIDE = 96;
const HOUSE_COLS = [T, L, PK, V, O, CY];
let rw, speed, lane, laneY, laneT, papers, hearts, score, tleft, combo, cars, rivals, pickups, flying, delivered, popups, parts, shakeT;
let rider, spawnCar, spawnRival, spawnPick, att, rng, runT, hitFlash;

function line(x0, y0, x1, y1, c) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let i = 0; i < 200; i++) { px(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
function popup(s, x, y, col) { popups.push({ s, x, y, col, t:0 }); if (popups.length > 4) popups.shift(); }
function burst(x, y, col, n) { for (let i = 0; i < n; i++) parts.push({ x, y, vx:(vr() - 0.5) * 140, vy:-vr() * 110, t:0, col }); }
const flightT = ln => [0.36, 0.46, 0.56][ln];
const houseIdx = wx => Math.floor(wx / STRIDE);
function mailbox(i) { return { wx:i * STRIDE + 34 + Math.floor(hash(i, 1) * 26), sub:hash(i, 2) < 0.62, i }; }
function setup(isAtt) {
  rng = mkRng(runSeed(isAtt ? 9 : null, 5)); GAME._lu = GAME._ld = 0;
  rw = 0; speed = 115; lane = 1; laneY = LANES[1]; laneT = 0; papers = 20; hearts = 3; score = 0; tleft = MAXTIME; combo = 0;
  cars = []; rivals = []; pickups = []; flying = []; delivered = {}; popups = []; parts = []; shakeT = 0; hitFlash = 0; runT = 0;
  rider = { crash:0, inv:1.2, punch:0, pcd:0, ph:0, throwAnim:0 };
  spawnCar = 1.4; spawnRival = 8; spawnPick = 3;
}
function carHit(c, ln) { return c.lane === ln && Math.abs(RX + (c.wx - rw) - RX) < c.w / 2 + 8; }
function hurt(msg) {
  if (rider.inv > 0 || rider.crash > 0) return;
  hearts--; rider.crash = 1.3; rider.inv = 2.6; speed = 0; combo = 0; shakeT = 0.35;
  popup(msg, 128, 60, R); sfx('boom'); burst(RX, laneY - 8, L, 12);
  if (hearts <= 0 && !att) endGame(score, 'WIPED OUT');
}
function curLane() { return laneT < 0.5 ? lane : lane; }

const GAME = {
  id:'g3', t1:'PAPER', t2:'RASH', sub:'DELIVER. DODGE. DEFEND.',
  music:{ bpm:168, lead:'square', chords:[{ root:-26, tones:[0,4,7] }, { root:-23, tones:[0,4,7] }, { root:-21, tones:[0,3,7] }, { root:-19, tones:[2,5,9] }],
          arp:[0,2,1,2,0,2,1,2,0,2,1,2,2,1,0,1], bass:[0,2,4,6,8,10,12,14], snare:[4,12], kick:[0,6,8,14], hat:true },
  init(isAtt) { att = !!isAtt; setup(att); },
  update(dt, inp, mode) {
    att = mode === 'title';
    runT += dt;
    if (att && (hearts <= 0 || tleft <= 0)) { setup(true); return; }
    if (shakeT > 0) shakeT -= dt; if (hitFlash > 0) hitFlash -= dt;
    tleft -= dt;
    if (tleft <= 0 && !att) { endGame(score, 'ROUTE CLEAR'); tleft = 0; return; }
    rider.inv = Math.max(0, rider.inv - dt); rider.pcd = Math.max(0, rider.pcd - dt); rider.punch = Math.max(0, rider.punch - dt); rider.throwAnim = Math.max(0, rider.throwAnim - dt);
    if (rider.crash > 0) { rider.crash -= dt; speed = 0; if (rider.crash <= 0) speed = 60; }
    else {
      const target = 115 + (inp.r ? 38 : 0) - (inp.l ? 36 : 0);
      speed += (target - speed) * Math.min(1, 3 * dt);
      if (inp.u && !GAME._lu && lane > 0) lane--; if (inp.d && !GAME._ld && lane < 2) lane++;
      GAME._lu = inp.u; GAME._ld = inp.d;
      if (inp.pa && papers > 0) {
        papers--; const T_ = flightT(lane);
        flying.push({ t:0, T:T_, wx0:rw, pv:speed + 50, y0:laneY - 14, ln:lane }); rider.throwAnim = 0.2; sfx('throw');
      }
      if (inp.pb && rider.pcd <= 0) { rider.pcd = 0.38; rider.punch = 0.2; sfx('swing');
        for (const r of rivals) {
          const sx = RX + (r.wx - rw);
          if (r.state !== 'fall' && Math.abs(sx - RX) < 30 && Math.abs(r.lane - lane) <= 1) {
            r.hp--; r.hit = 0.3; r.wx += 8; sfx('punch'); burst(sx, LANES[r.lane] - 16, W, 5);
            if (r.hp <= 0) { r.state = 'fall'; r.ft = 0; score += 300; combo++; popup('KO! +300', 128, 70, Y); sfx('boom'); hitFlash = 0.1; } else popup('POW!', sx, 90, O);
          }
        }
      }
    }
    laneY += (LANES[lane] - laneY) * Math.min(1, 14 * dt);
    rw += speed * dt; rider.ph += speed * dt * 0.22;
    /* paper flight */
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i]; f.t += dt;
      if (f.t >= f.T) {
        const wx = f.wx0 + f.pv * f.T;
        let got = false;
        for (let k = houseIdx(wx) - 1; k <= houseIdx(wx) + 1; k++) {
          const mb = mailbox(k); const dx = Math.abs(wx - mb.wx);
          if (!delivered[k] && dx < 11) {
            delivered[k] = true; got = true;
            const bull = dx < 5;
            const pts = (mb.sub ? 150 : 75) * (bull ? 2 : 1) * (1 + Math.min(4, combo) * 0.25);
            score += Math.round(pts); combo++;
            popup(bull ? 'BULLSEYE! +' + Math.round(pts) : (mb.sub ? 'DELIVERED +' : 'SMASH +') + Math.round(pts), 128, 70, bull ? Y : mb.sub ? E : O);
            sfx(bull ? 'win' : 'coin'); burst(RX + (wx - rw), SIDEWALK - 6, mb.sub ? E : R, 8);
          }
        }
        if (!got) { combo = 0; sfx('tick'); parts.push({ x:RX + (wx - rw), y:SIDEWALK, vx:-speed * 0.6, vy:-30, t:0.2, col:W }); }
        flying.splice(i, 1);
      }
    }
    /* spawns */
    const prog = 1 + (MAXTIME - tleft) / MAXTIME;
    spawnCar -= dt; if (spawnCar <= 0) { spawnCar = (0.95 + rng() * 1.4) / prog; const van = rng() < 0.3; cars.push({ wx:rw + 250, lane:Math.floor(rng() * 3), cv:60 + rng() * 55, w:van ? 44 : 36, van, col:[R, B, Y, E, PU, O][Math.floor(rng() * 6)] }); sfx('tick'); }
    spawnRival -= dt; if (spawnRival <= 0 && rivals.length < 2) { spawnRival = 10 + rng() * 5; rivals.push({ wx:rw + 230, lane:Math.floor(rng() * 3), hp:2, state:'ride', cd:1.6, hit:0, ft:0, swing:0, side:rng() < 0.5 ? 1 : -1, lt:0 }); popup('RIVAL!', 190, 60, R); sfx('hurt'); }
    spawnPick -= dt; if (spawnPick <= 0) { spawnPick = 3.5 + rng() * 2.5; pickups.push({ wx:rw + 240, lane:Math.floor(rng() * 3) }); }
    /* cars */
    for (let i = cars.length - 1; i >= 0; i--) {
      const c = cars[i]; c.wx -= c.cv * dt;
      const sx = RX + (c.wx - rw);
      if (sx < -60) { cars.splice(i, 1); continue; }
      if (!att || true) { if (rider.crash <= 0 && carHit(c, lane) && Math.abs(laneY - LANES[lane]) < 8) hurt('CRASH!'); }
    }
    /* pickups */
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i], sx = RX + (p.wx - rw);
      if (sx < -20) { pickups.splice(i, 1); continue; }
      if (p.lane === lane && Math.abs(sx - RX) < 12 && rider.crash <= 0) { papers += 6; pickups.splice(i, 1); popup('+6 PAPERS', 128, 70, CY); sfx('power'); }
    }
    /* rivals */
    for (let i = rivals.length - 1; i >= 0; i--) {
      const r = rivals[i];
      r.hit = Math.max(0, r.hit - dt);
      if (r.state === 'fall') { r.ft += dt; r.wx += 40 * dt; if (r.ft > 1.4) rivals.splice(i, 1); continue; }
      const want = rw + r.side * 28 + 6 * Math.sin(runT * 2 + i);
      r.wx += (want - r.wx) * Math.min(1, 1.6 * dt) + (speed - 0) * dt - speed * dt;
      r.lt -= dt;
      if (r.lt <= 0) { r.lt = 0.7; const tl = clamp(lane + (r.lane === lane ? (lane === 0 ? 1 : lane === 2 ? -1 : (rng() < 0.5 ? -1 : 1)) : 0), 0, 2); r.lane = r.lane === lane ? tl : r.lane + Math.sign(lane - r.lane) * (Math.abs(lane - r.lane) > 1 ? 1 : 0); }
      r.cd -= dt;
      if (r.cd <= 0 && Math.abs(r.lane - lane) <= 1 && Math.abs(r.wx - rw) < 36) { r.swing = 0.28; r.cd = 1.5 + rng() * 0.8; }
      if (r.swing > 0) { r.swing -= dt; if (r.swing <= 0.12 && r.swing > 0.12 - dt && rider.inv <= 0 && rider.crash <= 0 && Math.abs(r.lane - lane) <= 1 && Math.abs(r.wx - rw) < 36) { hurt('SMACKED!'); } }
    }
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t += dt; q.vy += 300 * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.t > 0.7) parts.splice(i, 1); }
    for (let i = popups.length - 1; i >= 0; i--) { popups[i].t += dt; if (popups[i].t > 1.3) popups.splice(i, 1); }
  },
  render() {
    clear(SKY);
    /* clouds + far trees */
    for (let i = 0; i < 6; i++) { const cx = ((i * 97 - rw * 0.12) % 330 + 330) % 330 - 40; rect(cx, 14 + (i % 3) * 8, 34, 8, W); rect(cx + 6, 10 + (i % 3) * 8, 20, 6, W); }
    for (let x = -10; x < VW + 20; x += 18) { const wx = x + Math.floor(rw * 0.35 / 18) * 18, ox = x - (rw * 0.35) % 18; const h = 14 + Math.floor(hash(Math.floor((rw * 0.35 + x) / 18), 4) * 14); rect(ox, 62 - h + 16, 16, h, F); }
    rect(0, 78, VW, 30, GR);
    /* houses */
    const i0 = Math.floor((rw - RX - 8) / STRIDE);
    for (let i = i0; i < i0 + 4; i++) {
      const hx = Math.round(RX + (i * STRIDE - rw)), col = HOUSE_COLS[Math.floor(hash(i, 3) * HOUSE_COLS.length)];
      rect(hx, 52, 80, 48, col); rect(hx, 52, 80, 2, K); rect(hx, 98, 80, 2, K);
      for (let k = 0; k < 9; k++) rect(hx - 4 + k * 5, 42 + (k < 5 ? k : 8 - k) * 2 + 4, 6, 10 - (k < 5 ? k : 8 - k) * 2, BRK);
      rect(hx - 4, 52, 88, 3, BRK);
      rect(hx + 10, 62, 14, 14, CY); rect(hx + 16, 62, 2, 14, K); rect(hx + 10, 68, 14, 2, K);
      rect(hx + 54, 62, 14, 14, CY); rect(hx + 60, 62, 2, 14, K); rect(hx + 54, 68, 14, 2, K);
      rect(hx + 34, 70, 14, 30, M); px(hx + 44, 86, Y);
      if (hash(i, 8) > 0.5) { rect(hx + 8, 96, 18, 4, E); rect(hx + 52, 96, 18, 4, E); }
    }
    rect(0, 100, VW, 8, GR); for (let x = 0; x < VW; x += 3) if (hash(x + Math.floor(rw), 2) > 0.8) px(x, 102, E);
    rect(0, 108, VW, 12, L); rect(0, 108, VW, 1, W); rect(0, 119, VW, 1, D);
    /* mailboxes */
    for (let k = i0; k < i0 + 4; k++) {
      const mb = mailbox(k), sx = Math.round(RX + (mb.wx - rw));
      rect(sx - 1, 100, 2, 9, M);
      if (delivered[k]) { rect(sx - 6, 94, 12, 7, D); rect(sx - 8, 90, 16, 5, W); }
      else { rect(sx - 6, 94, 12, 7, mb.sub ? E : R); rect(sx - 6, 94, 12, 1, W); rect(sx + 3, 91, 2, 4, Y); }
    }
    /* road */
    rect(0, 120, VW, 80, DG);
    for (let y = 121; y < 200; y += 2) for (let x = 0; x < VW; x += 7) if (hash(x + Math.floor(rw / 3), y) > 0.93) px(x, y, D);
    rect(0, 198, VW, 3, L);
    for (const ly of [146, 172]) for (let x = -((rw * 1) % 28); x < VW; x += 28) rect(x, ly, 14, 2, Y);
    rect(0, 120, VW, 2, W);
    /* landing marker on sidewalk */
    if (rider.crash <= 0) { const mx = Math.round(RX + (speed + 50) * flightT(lane)); rect(mx - 4, 112, 9, 2, Y); rect(mx, 110, 1, 6, Y); }
    /* lane objects sorted by lane */
    for (let ln = 0; ln < 3; ln++) {
      for (const p of pickups) if (p.lane === ln) { const sx = RX + (p.wx - rw); rect(sx - 6, LANES[ln] - 6, 12, 7, T); rect(sx - 6, LANES[ln] - 6, 12, 2, W); rect(sx - 1, LANES[ln] - 6, 2, 7, R); }
      for (const c of cars) if (c.lane === ln) drawCar(c, ln);
      for (const r of rivals) if (r.lane === ln || (r.state === 'fall' && ln === r.lane)) drawRival(r);
      if (ln === lane || (ln === Math.round((laneY - 133) / 26) && false)) drawRider();
    }
    for (const f of flying) {
      const u = f.t / f.T, wx = f.wx0 + f.pv * f.t, sx = RX + (wx - rw), sy = f.y0 + (SIDEWALK - f.y0) * u - Math.sin(u * Math.PI) * 16;
      rect(sx - 2, sy - 2, 5, 4, W); rect(sx - 2, sy - 1, 5, 1, L); px(sx, sy, R);
    }
    for (const q of parts) px(q.x, q.y, q.col);
    if (hitFlash > 0) for (let y = 16; y < 200; y += 2) rect(0, y, VW, 1, W);
    /* bottom bar */
    rect(0, 201, VW, 23, N); rect(0, 201, VW, 1, W);
    for (let i = 0; i < 3; i++) { const x = 8 + i * 14; rect(x, 214, 5, 3, i < hearts ? R : DG); rect(x + 6, 214, 5, 3, i < hearts ? R : DG); rect(x + 1, 217, 9, 2, i < hearts ? R : DG); rect(x + 3, 219, 5, 1, i < hearts ? R : DG); }
    if (shakeT > 0) for (let y = 16; y < 200; y += 5) if (hash(y, Math.floor(runT * 40)) > 0.6) { const o = Math.round((hash(y, 8) - 0.5) * 5); const row = buf.slice(y * VW, (y + 1) * VW); buf.set(row.subarray(Math.max(0, -o), VW - Math.max(0, o)), y * VW + Math.max(0, o)); }
  },
  hud(mode) {
    txt('SCORE ' + pad5(score), 8, 206, W, 8);
    txt(String(Math.ceil(tleft)).padStart(2, '0'), 128, 206, tleft < 15 ? R : Y, 8, 'center');
    txt('PAPERS ' + String(papers).padStart(2, '0'), 248, 206, papers > 0 ? W : R, 8, 'right');
    txt('COMBO X' + (1 + Math.min(4, combo) * 0.25).toFixed(2), 248, 4, Y, 8, 'right');
    txt('TIME', 128, 214, CY, 8, 'center', false);
    for (const p of popups) txt(p.s, p.x, Math.round(p.y - p.t * 14), p.col, 8, 'center');
    if (mode === 'play' && runT < 5) txt('THROW WHEN THE BOX HITS THE TICK', 128, 130 - 0, W, 8, 'center');
  },
  info() { return { score, papers, hearts, tleft:+tleft.toFixed(1), combo, cars:cars.length, rivals:rivals.length, rw:Math.round(rw) }; },
  bot() {
    const i = { l:0, r:0, u:0, d:0, a:0, b:0, pa:0, pb:0, start:0 };
    /* dodge: look at cars in my lane coming within 1.1s */
    const danger = ln => cars.some(c => c.lane === ln && (c.wx - rw) > -20 && (c.wx - rw) / (speed + c.cv + 1) < 1.25 && (c.wx - rw) < 190);
    if (danger(lane)) {
      const opts = [lane - 1, lane + 1].filter(l => l >= 0 && l <= 2 && !danger(l));
      if (opts.length) { const t = opts[0]; if (t < lane) i.u = 1; else i.d = 1; }
    } else if (lane !== 1 && !danger(1) && Math.abs(laneY - LANES[lane]) < 3 && !cars.some(c => c.lane === lane + 0 && false)) {
      if (lane < 1) i.d = 1; else if (lane > 1) i.u = 1;
    }
    /* throw when box aligns with tick */
    const mxT = (speed + 50) * flightT(lane);
    for (let k = houseIdx(rw) - 1; k <= houseIdx(rw) + 4; k++) {
      const mb = mailbox(k); if (delivered[k]) continue;
      const sx = mb.wx - rw;
      if (Math.abs(sx - mxT) < 2.2 && papers > 0) i.pa = 1;
    }
    for (const r of rivals) if (r.state !== 'fall' && Math.abs(r.wx - rw) < 24 && Math.abs(r.lane - lane) <= 1) i.pb = 1;
    if (!i.u && !i.d) { if (cars.length === 0) i.r = 0; }
    return i;
  },
};
function drawBikeBase(x, y, shirt, cap, ph, pose, flash) {
  const ring = (cx, cy) => { fillCircle(cx, cy, 5, K); fillCircle(cx, cy, 3, flash ? W : DG); const a = ph; px(cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, L); px(cx - Math.cos(a) * 3, cy - Math.sin(a) * 3, L); };
  ring(x - 9, y - 5); ring(x + 9, y - 5);
  line(x - 9, y - 5, x - 2, y - 11, L); line(x - 2, y - 11, x + 5, y - 5, L); line(x + 9, y - 5, x + 5, y - 12, L); line(x - 2, y - 11, x + 5, y - 12, L); line(x + 5, y - 12, x + 7, y - 15, L);
  const pa = Math.cos(ph) * 3;
  line(x - 1, y - 6, x - 3 + pa, y - 3 + Math.abs(pa) * 0, K);
  rect(x - 6, y - 17, 4, 5, Y); rect(x - 6, y - 17, 4, 1, W);
  rect(x - 4, y - 21, 7, 9, flash ? W : shirt);
  rect(x - 2, y - 28, 6, 6, S); rect(x - 3, y - 29, 8, 2, cap); rect(x + 3, y - 27, 3, 1, cap); px(x + 2, y - 26, K);
  if (pose === 'punch') rect(x + 3, y - 19, 14, 3, S); else if (pose === 'throw') { rect(x + 3, y - 23, 7, 3, S); rect(x + 9, y - 25, 3, 3, W); } else line(x + 2, y - 18, x + 7, y - 15, S);
}
function drawRider() {
  const x = RX, y = Math.round(laneY) + 4;
  if (rider.crash > 0) {
    const u = 1 - rider.crash / 1.3, fx = x + u * 26, fy = y - Math.sin(Math.min(1, u * 1.4) * Math.PI) * 24;
    rect(x - 4, y - 4, 16, 3, K); fillCircle(x - 6, y - 5, 4, K); fillCircle(x + 14, y - 6, 4, K);
    rect(fx - 4, fy - 14, 8, 10, B); rect(fx - 2, fy - 22, 6, 6, S); px(fx, fy - 20, K); px(fx + 2, fy - 20, K);
    const s = Math.floor(runT * 10) & 1; px(x + 4 + s * 4, y - 30, Y); px(x + 12 - s * 4, y - 32, Y);
    return;
  }
  if (rider.inv > 0 && (Math.floor(runT * 16) & 1)) return;
  drawBikeBase(x, y, B, R, rider.ph, rider.punch > 0 ? 'punch' : rider.throwAnim > 0 ? 'throw' : 'ride', false);
}
function drawRival(r) {
  const sx = Math.round(RX + (r.wx - rw)), y = LANES[r.lane] + 4;
  if (sx < -30 || sx > 290) return;
  if (r.state === 'fall') {
    const u = r.ft / 1.4, fx = sx + u * 40, fy = y - Math.sin(Math.min(1, u * 1.3) * Math.PI) * 30;
    fillCircle(sx - 6, y - 5, 4, K); fillCircle(sx + 12, y - 5, 4, K); rect(sx - 4, y - 4, 18, 3, K);
    rect(fx - 4, fy - 12, 8, 10, O); rect(fx - 2, fy - 20, 6, 6, S); const s = Math.floor(runT * 10) & 1; px(fx - 4 + s * 6, fy - 26, Y); return;
  }
  drawBikeBase(sx, y, PU, K, runT * 8 + r.lane, r.swing > 0 ? 'punch' : 'ride', r.hit > 0);
  if (r.swing > 0) { const dir = Math.sign(RX - sx) || 1; for (let k = 0; k < 6; k++) px(sx + dir * (6 + k * 3), y - 18 + Math.sin(k + runT * 20) * 3, L); fillCircle(sx + dir * 24, y - 18, 2, D); }
}
function drawCar(c, ln) {
  const sx = Math.round(RX + (c.wx - rw)), y = LANES[ln] + 6, w = c.w, h = c.van ? 20 : 14;
  if (sx < -60 || sx > 300) return;
  const x0 = sx - Math.floor(w / 2);
  rect(x0 + 2, y - 2, w - 4, 3, K);
  rect(x0, y - h, w, h - 3, c.col); rect(x0, y - h, w, 1, W);
  if (c.van) { rect(x0 + 4, y - h + 3, 12, 7, CY); rect(x0 + w - 12, y - h + 3, 10, 7, CY); }
  else { rect(x0 + 8, y - h - 5, w - 16, 6, c.col); rect(x0 + 10, y - h - 4, 9, 5, CY); rect(x0 + w - 19, y - h - 4, 9, 5, CY); }
  rect(x0, y - 8, 3, 3, Y); rect(x0 + w - 3, y - 8, 3, 3, R);
  fillCircle(x0 + 8, y - 2, 4, K); fillCircle(x0 + w - 9, y - 2, 4, K); fillCircle(x0 + 8, y - 2, 2, L); fillCircle(x0 + w - 9, y - 2, 2, L);
}
