// KEYS: Arrows steer, Z gas, X brake (hold X while steering = drift; release after a long drift = boost). 4 laps.
/* ===== S4 LOOP RACER: KART RACER starter (top-down closed circuit, drift boost, 3 AI rivals with rubber-band).
   BRIEF  genre: kart racer | player: steer + gas, hold-brake drift that charges a boost | goal: finish 4 laps in the top 2
          lose: finish 3rd/4th | hook: every seed is a different track | bot: follows the racing line, drifts in tight corners
          win: place <= TUNE4.podium | juice: drift smoke, boost flame, bump impulses, countdown
   Uses engine.js (path, imp, fx). The circuit is generated from S.rng (10 jittered control points -> Catmull-Rom -> ENG.path). ===== */
const TUNE4 = { laps:4, cars:4, vmax:112, accel:150, brake:240, coast:60, steer:2.5, grip:9, driftGrip:2.6, driftSteer:1.5, driftMin:55, driftCharge:0.6, boostT:0.8, boostMul:1.3,
  halfW:19, offCap:0.5, offDecay:140, aiSpeed:[1.05, 1.15], aiCorner:0.12, rubber:0.1, look:26, podium:2, countdown:3, carR:5, bump:60, radius:[0.88, 1.12] };
function track4(S) { const C = TUNE4, n = 10, cp = [];
  for (let i = 0; i < n; i++) { const a = i / n * 6.2832; cp.push([128 + Math.cos(a) * 96 * (C.radius[0] + S.rng() * (C.radius[1] - C.radius[0])), 118 + Math.sin(a) * 70 * (C.radius[0] + S.rng() * (C.radius[1] - C.radius[0]))]); }
  const pts = []; for (let i = 0; i < n; i++) { const p0 = cp[(i + n - 1) % n], p1 = cp[i], p2 = cp[(i + 1) % n], p3 = cp[(i + 2) % n], seg = Math.max(4, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 4));
    for (let k = 0; k < seg; k++) { const t = k / seg, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]); } }
  pts.push(pts[0]); return { pts, P:ENG.path(pts) }; }
function nearest4(pts, i0, x, y, win) { let bi = i0, bd = 1e9, n = pts.length - 1; for (let k = -win; k <= win; k++) { const i = ((i0 + k) % n + n) % n, d = (pts[i][0] - x) ** 2 + (pts[i][1] - y) ** 2; if (d < bd) { bd = d; bi = i; } } return { i:bi, d:Math.sqrt(bd) }; }
const GAME = kit({ id:'s4', t1:'LOOP', t2:'RACER', sub:'DRIFT. BOOST. TAKE THE PODIUM.', seed:904, off:34, secs:40, music:MUS(160, -18, false),
  setup(S) { const C = TUNE4, T = track4(S); S.tk = T; S.cars = []; S.go = 0;
    const cum = []; let acc = 0; cum.push(0); for (let i = 1; i < T.pts.length; i++) { acc += Math.hypot(T.pts[i][0] - T.pts[i - 1][0], T.pts[i][1] - T.pts[i - 1][1]); cum.push(acc); } S.cum = cum;
    for (let i = 0; i < C.cars; i++) { const d = T.P.len - 10 - i * 11, q = T.P.at(d), nx = -Math.sin(q.a), ny = Math.cos(q.a), side = i & 1 ? 7 : -7;
      S.cars.push({ id:i, ai:i > 0, x:q.x + nx * side, y:q.y + ny * side, a:q.a, vx:0, vy:0, sp:0, idx:Math.max(0, Math.round(d / T.P.len * (T.pts.length - 1))), tot:-(10 + i * 11), dr:0, bo:0, off:false, ix:0, iy:0, fin:0, aiS:C.aiSpeed[0] + S.rng() * (C.aiSpeed[1] - C.aiSpeed[0]) }); } },
  step(S, dt, inp) { const C = TUNE4, T = S.tk, cars = S.cars, me = cars[0], len = T.P.len, n = T.pts.length - 1;
    if (S.T < C.countdown) { if (!S.cd || Math.floor(S.T) !== S.cd) { S.cd = Math.floor(S.T) + 1; if (S.T > 0.05) sfx('tick'); } return; }
    if (!S.go) { S.go = 1; sfx('power'); }
    const order = () => cars.slice().sort((a, b) => b.tot - a.tot);
    for (const c of cars) { if (c.fin) { c.sp = Math.max(0, c.sp - 80 * dt); } 
      const nr = nearest4(T.pts, c.idx, c.x, c.y, 14); c.idx = nr.i; c.off = nr.d > C.halfW; const sNew = S.cum[nr.i], sOld = c.s === undefined ? sNew : c.s; let ds = sNew - sOld; if (ds > len / 2) ds -= len; if (ds < -len / 2) ds += len; c.tot += ds; c.s = sNew;
      let steer = 0, gas = 0, brake = 0, drift = false;
      if (!c.ai) { steer = inp.ax !== undefined ? inp.ax : (inp.r ? 1 : 0) - (inp.l ? 1 : 0); gas = (inp.a || inp.u) ? 1 : 0; brake = (inp.b || inp.d) ? 1 : 0; drift = brake && Math.abs(steer) > 0.3 && c.sp > C.driftMin; if (drift) brake = 0; }
      else { const q = T.P.at(((c.s + C.look + c.sp * 0.12) % len + len) % len), want = Math.atan2(q.y - c.y, q.x - c.x); let df = want - c.a; while (df > Math.PI) df -= 6.2832; while (df < -Math.PI) df += 6.2832; steer = clamp(df * 2.6, -1, 1); gas = 1; c.need = Math.abs(df); }
      if (c.fin) { gas = 0; steer = 0; }
      c.a += steer * C.steer * (0.45 + 0.55 * Math.min(1, c.sp / C.vmax)) * (drift ? C.driftSteer : 1) * dt;
      if (drift) { c.dr += dt; if (S.rng() < 0.5) ENG.fx.add(S, 'smoke', c.x - Math.cos(c.a) * 5, c.y - Math.sin(c.a) * 5, 0.4); } else { if (c.dr >= C.driftCharge) { c.bo = C.boostT; sfx('power'); } c.dr = 0; }
      c.bo = Math.max(0, c.bo - dt);
      let cap = C.vmax * (c.off ? C.offCap : 1) * (c.bo > 0 ? C.boostMul : 1);
      if (c.ai) { const rub = 1 + C.rubber * clamp((me.tot - c.tot) / 80, -1, 1); cap *= c.aiS * rub * (1 - C.aiCorner * Math.min(1, (c.need || 0) / 0.9)); }
      if (c.sp > cap) c.sp = Math.max(cap, c.sp - C.offDecay * dt); else if (gas) c.sp = Math.min(cap, c.sp + C.accel * dt);   /* gas never pushes past the cap */
      if (!gas) c.sp -= C.coast * dt; if (brake) c.sp -= C.brake * dt; c.sp = Math.max(0, c.sp);
      const g = Math.min(1, (drift ? C.driftGrip : C.grip) * dt), hx = Math.cos(c.a) * c.sp, hy = Math.sin(c.a) * c.sp; c.vx += (hx - c.vx) * g; c.vy += (hy - c.vy) * g;
      c.x += c.vx * dt; c.y += c.vy * dt; ENG.imp.step(c, dt); c.x = clamp(c.x, 6, 250); c.y = clamp(c.y, 22, 216);
      if (!c.fin && c.tot >= C.laps * len) { c.fin = S.T; S.place = S.place || []; S.place.push(c.id); if (c.id === 0) { sfx('win'); } } }
    for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) { const a = cars[i], b = cars[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy); if (d < C.carR * 2 && d > 0) { ENG.imp.push(a, dx, dy, C.bump); ENG.imp.push(b, -dx, -dy, C.bump); a.sp *= 0.97; b.sp *= 0.97; } }
    S.pos = order().findIndex(c => c.id === 0) + 1; S.lap = clamp(Math.floor(me.tot / len) + 1, 1, C.laps); S.score = Math.max(0, Math.round(me.tot * 2));
    if (me.fin) { const pl = S.place.indexOf(0) + 1; if (S.T - me.fin > 1.2 || cars.every(c => c.fin)) return finish(S, pl <= C.podium ? 'PODIUM P' + pl : 'FINISH P' + pl, pl <= C.podium ? (5 - pl) * 500 : 0); } },
  draw(S) { clear(GR); const C = TUNE4, T = S.tk; for (let i = 0; i < T.pts.length; i += 3) fillCircle(Math.round(T.pts[i][0]), Math.round(T.pts[i][1]), C.halfW + 2, D);
    for (let i = 0; i < T.pts.length; i += 3) fillCircle(Math.round(T.pts[i][0]), Math.round(T.pts[i][1]), C.halfW, DG);
    const q = T.P.at(0); for (let k = -3; k <= 3; k++) rect(Math.round(q.x - Math.sin(q.a) * k * 5) - 1, Math.round(q.y + Math.cos(q.a) * k * 5) - 1, 3, 3, (k & 1) ? W : K);
    ENG.fx.each(S, 'smoke', (f, k) => fillCircle(Math.round(f.x), Math.round(f.y), Math.round(1 + k * 3), k < .5 ? L : D));
    for (const c of S.cars.slice().reverse()) { const col = c.id === 0 ? R : [0, CY, Y, PU][c.id], cx = Math.round(c.x), cy = Math.round(c.y); rect(cx - 3, cy - 3, 6, 6, col); rect(Math.round(c.x + Math.cos(c.a) * 3) - 1, Math.round(c.y + Math.sin(c.a) * 3) - 1, 2, 2, W); if (c.bo > 0) fillCircle(Math.round(c.x - Math.cos(c.a) * 6), Math.round(c.y - Math.sin(c.a) * 6), 2, (S.T * 30 | 0) & 1 ? Y : O); } },
  drawHD(S, g) { const C = TUNE4, T = S.tk; g.fillStyle = HD.lg(g, 0, 0, 0, 224, [[0, '#4aa04a'], [1, '#2c7030']]); g.fillRect(0, 0, 256, 224);
    g.lineCap = 'round'; g.lineJoin = 'round'; const path = () => { g.beginPath(); T.pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); };
    g.lineWidth = C.halfW * 2 + 6; g.strokeStyle = '#e8e8e8'; path(); g.stroke(); g.setLineDash([5, 5]); g.strokeStyle = '#d02828'; path(); g.stroke(); g.setLineDash([]); g.lineWidth = C.halfW * 2; g.strokeStyle = '#3c4048'; path(); g.stroke();
    g.lineWidth = 1; g.setLineDash([6, 8]); g.strokeStyle = 'rgba(255,255,255,0.45)'; path(); g.stroke(); g.setLineDash([]);
    const q = T.P.at(0); g.save(); g.translate(q.x, q.y); g.rotate(q.a + Math.PI / 2); for (let k = -4; k < 4; k++) for (let r = 0; r < 2; r++) { g.fillStyle = (k + r) & 1 ? '#fff' : '#111'; g.fillRect(k * 4.5, -3 + r * 3, 4.5, 3); } g.restore();
    ENG.fx.each(S, 'smoke', (f, k) => { g.fillStyle = `rgba(230,230,230,${0.5 * (1 - k)})`; g.beginPath(); g.arc(f.x, f.y, 1.5 + k * 4, 0, 6.283); g.fill(); });
    for (const c of S.cars.slice().reverse()) { const body = c.id === 0 ? ['#ff6a50', '#a01818'] : [['#fff', '#000'], ['#6ae8ff', '#1a6a8a'], ['#ffe070', '#a07810'], ['#d08cf0', '#5a2c7a']][c.id]; g.save(); g.translate(c.x, c.y); g.rotate(c.a); HD.shadow(g, 0, 3, 8, 3, 0.35);
      HD.part(g, -6, -4.2, 12, 8.4, 3, body[0], body[1]); g.fillStyle = '#222'; g.fillRect(-5, -5.4, 3, 1.6); g.fillRect(-5, 3.8, 3, 1.6); g.fillRect(2.5, -5.4, 3, 1.6); g.fillRect(2.5, 3.8, 3, 1.6); HD.ball(g, 0.5, 0, 2.3, '#f6d0a8', '#c8946a');
      if (c.bo > 0) HD.glow(g, -9, 0, 9, '255,180,60', 0.9); g.restore(); } },
  hud(S) { txt('LAP ' + S.lap + '/' + TUNE4.laps, 4, 4, W, 8); txt('POS ' + S.pos + '/' + TUNE4.cars, 252, 4, Y, 8, 'right'); if (S.T < TUNE4.countdown) txt(String(Math.ceil(TUNE4.countdown - S.T)), 128, 100, W, 24, 'center'); hintS(S, 'Z GAS  ARROWS STEER  X DRIFT', 8, 212); },
  info(S) { return { lap:S.lap, pos:S.pos, tot:Math.round(S.cars[0].tot), ai:S.cars.slice(1).map(c => Math.round(c.tot)).join(','), sp:Math.round(S.cars[0].sp) }; },
  bot(S, i) { const C = TUNE4, me = S.cars[0], T = S.tk, len = T.P.len; if (S.T < C.countdown) return i;
    const q = T.P.at(((me.s + C.look + me.sp * 0.1) % len + len) % len), want = Math.atan2(q.y - me.y, q.x - me.x); let df = want - me.a; while (df > Math.PI) df -= 6.2832; while (df < -Math.PI) df += 6.2832;
    if (df > 0.04) i.r = 1; if (df < -0.04) i.l = 1; i.a = 1; const far = T.P.at(((me.s + 70) % len + len) % len); let dfar = Math.atan2(far.y - me.y, far.x - me.x) - me.a; while (dfar > Math.PI) dfar -= 6.2832; while (dfar < -Math.PI) dfar += 6.2832;
    if (Math.abs(dfar) > 0.45 && Math.abs(df) > 0.08 && me.sp > C.driftMin + 5) i.b = 1;   /* corner ahead: hold drift through it to bank a boost */
    return i; },
});
