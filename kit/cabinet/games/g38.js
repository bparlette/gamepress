// KEYS: Tap Z then X (or the A and B buttons) ALTERNATELY to run; Up jumps hurdles and mud. Faceplant = flop on the floor and lose your speed.
/* ===== G38 FLOPPY RACE: 4 runners (you = Ryu; CPUs = Guile, blue-gi Ryu, purple-pants Guile) on a 4-lane track, sprint by alternating A/B taps, hurdle/mud/boost obstacles.
   Each runner is a VERLET RAGDOLL (11 points, bone lengths of the fighter skeleton, knee/elbow flexion limits) pulled toward the animated run pose by "muscle" springs:
   arms and head are loose so they flail; a trip drops the muscles to ~0 and the body really flops, then they come back for the get-up. Drawn by the native 8-bit rig (PRIG.draw with o.J).
   BRIEF  genre: arcade racer | player: alternate taps + jump | goal: finish 1st | lose: not 1st / time out | bot: steady 6.8 taps/s + perfect jumps | juice: dust, shake on faceplant, ragdoll flop, crowd, boost pads ===== */
const TUNE38 = { len:1700, sc:56, lanes:[132, 150, 168, 186], tapGain:9.5, drag:.9, maxV:92, mudCap:26, mudW:46, boost:34, jumpV:150, grav:520, clear:11, fall:1.15, getup:.6, intro:2.2,
  ragG:1500, cpu:[[6.1, .88], [6.5, .92], [6.9, .95]], time:60 };
const K38 = TUNE38.sc / 150, KIND38 = [['ryu', 0], ['guile', 0], ['ryu', 1], ['guile', 1]];
const RN = ['hip', 'sh', 'head', 'kA', 'fA', 'kB', 'fB', 'eA', 'hA', 'eB', 'hB'], RM = { hip:'hip', sh:'sh', head:'head', kA:'kneeA', fA:'footA', kB:'kneeB', fB:'footB', eA:'elbA', hA:'handA', eB:'elbB', hB:'handB' };
const RK = { hip:.5, sh:.4, head:.16, kA:.3, fA:.5, kB:.3, fB:.5, eA:.14, hA:.1, eB:.14, hB:.1 };
const RC = [['hip', 'sh', 44], ['sh', 'head', 17], ['hip', 'kA', 33], ['kA', 'fA', 33], ['hip', 'kB', 33], ['kB', 'fB', 33], ['sh', 'eA', 27], ['eA', 'hA', 26], ['sh', 'eB', 27], ['eB', 'hB', 26]];
function mkRunner38(lane, cpuIdx) { const [kind, alt] = KIND38[lane], r = { lane, kind, alt, cpu:cpuIdx >= 0, ci:cpuIdx, x:30, v:0, jy:0, jvy:0, air:false, st:'run', t:0, ph:0, m:.6, place:0, done:0, pass:new Set(), acc:0, last:'', tapT:0, trips:0, pts:{}, prv:{} };
  const J = PRIG.skelG('crouch', 1, 0); for (const p of RN) { const q = J[RM[p]]; r.pts[p] = [30 / K38 + q[0], q[1]]; r.prv[p] = [r.pts[p][0], r.pts[p][1]]; } return r; }
function trip38(S, r) { if (r.st !== 'run') return; r.st = 'fall'; r.t = 0; r.trips++; r.m = .03; const vu = r.v / K38;
  for (const p of RN) { const P = r.pts[p], Q = r.prv[p], extra = p === 'head' || p[0] === 'h' ? 1.35 : p[0] === 'f' ? .6 : 1; Q[0] = P[0] - vu * extra * .85 / 60; Q[1] = P[1] - (p === 'hip' ? 90 : 230) / 60; }
  r.v *= .9; if (!r.cpu) { ENG.impact(S, 'strong'); } burst(S, r.x, TUNE38.lanes[r.lane], L, 10); }
function rag38(S, r, dt, pose, env) {
  const J = PRIG.skelG(pose, env, r.ph), rxu = r.x / K38, g = TUNE38.ragG, tgtY = r.jy / K38;
  for (const p of RN) { const P = r.pts[p], Q = r.prv[p], vx = (P[0] - Q[0]) * .985, vy = (P[1] - Q[1]) * .985; Q[0] = P[0]; Q[1] = P[1]; P[0] += vx; P[1] += vy - g * dt * dt;
    const t = J[RM[p]], s = Math.min(1, r.m * RK[p] * dt * 60); P[0] += (rxu + t[0] - P[0]) * s; P[1] += (tgtY + t[1] - P[1]) * s; }
  if (r.st === 'run') { const H = r.pts.hip, Q = r.prv.hip; H[0] += (rxu - H[0]) * .9; Q[0] = H[0] - r.v / K38 * dt; }
  for (let it = 0; it < 6; it++) { for (const [a, b, L0] of RC) { const A = r.pts[a], B = r.pts[b], dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1e-3, e = (d - L0) / d * .5; A[0] += dx * e; A[1] += dy * e; B[0] -= dx * e; B[1] -= dy * e; }
    for (const p of RN) { const P = r.pts[p]; if (P[1] < 0) { P[1] = 0; const Q = r.prv[p]; Q[0] += (P[0] - Q[0]) * .35; } } }
  for (const [h, k, f, leg] of [['hip', 'kA', 'fA', 1], ['hip', 'kB', 'fB', 1], ['sh', 'eA', 'hA', 0], ['sh', 'eB', 'hB', 0]]) { const H = r.pts[h], Kn = r.pts[k], F = r.pts[f], t0 = [Kn[0] - H[0], Kn[1] - H[1]], s0 = [F[0] - Kn[0], F[1] - Kn[1]], c = t0[0] * s0[1] - t0[1] * s0[0];
    if (leg ? c > 0 : c < 0) { const ux = F[0] - H[0], uy = F[1] - H[1], n = ux * ux + uy * uy || 1, dd = ((Kn[0] - H[0]) * ux + (Kn[1] - H[1]) * uy) / n; Kn[0] = H[0] + 2 * dd * ux - (Kn[0] - H[0]); Kn[1] = H[1] + 2 * dd * uy - (Kn[1] - H[1]); } }
}
function joints38(r) {   /* ragdoll points -> skeleton-style joints local to the runner's x (units, y up) for PRIG.draw */
  const ax = r.x / K38, P = n => [r.pts[n][0] - ax, r.pts[n][1]], J = { hip:P('hip'), sh:P('sh'), head:P('head'), kneeA:P('kA'), footA:P('fA'), kneeB:P('kB'), footB:P('fB'), elbA:P('eA'), handA:P('hA'), elbB:P('eB'), handB:P('hB') };
  J.chest = [(J.hip[0] + J.sh[0]) / 2 + 1, (J.hip[1] + J.sh[1]) / 2]; J.hipA = [J.hip[0] + 2, J.hip[1] + .6]; J.hipB = [J.hip[0] - 2, J.hip[1] - .6]; J.shA = [J.sh[0] + 3, J.sh[1] - 3.5]; J.shB = [J.sh[0] - 3, J.sh[1] - 4.5];
  for (const q of ['A', 'B']) { const ft = J['foot' + q], kn = J['knee' + q], sa = Math.atan2(ft[1] - kn[1], ft[0] - kn[0]), ang = ft[1] < 3.5 ? 0 : sa + 80 * Math.PI / 180, dx = Math.cos(ang), dy = Math.sin(ang); J['toe' + q] = [ft[0] + 11 * dx, ft[1] + 11 * dy]; J['heel' + q] = [ft[0] - 4 * dx, ft[1] - 4 * dy]; }
  J.free = true; J.lying = false; return J; }
const inMud38 = (S, r) => S.obs.some(o => o.t === 'mud' && r.x > o.x && r.x < o.x + TUNE38.mudW && r.jy < 6);
function step38(S, r, dt, tap, jump) {
  const C = TUNE38; r.t += dt;
  if (r.st === 'run') { if (r.go) { if (tap) r.v += C.tapGain * tap; r.v -= r.v * C.drag * dt; if (inMud38(S, r)) r.v -= (r.v - C.mudCap) * Math.min(1, 7 * dt) * (r.v > C.mudCap ? 1 : 0); r.v = Math.max(0, Math.min(C.maxV, r.v)); if (jump && !r.air) { r.air = true; r.jvy = C.jumpV; } } else r.v = 0; }
  else if (r.st === 'fall') { r.v -= r.v * 2.4 * dt; if (r.t > C.fall) { r.st = 'getup'; r.t = 0; } r.m = r.t > .7 ? .22 : .03; }
  else if (r.st === 'getup') { r.v = 0; r.m = .25 + .5 * Math.min(1, r.t / C.getup); if (r.t > C.getup) { r.st = 'run'; r.t = 0; r.m = .6; r.last = ''; } }
  if (r.st === 'run') r.m += (.62 - r.m) * Math.min(1, dt * 6);
  if (r.air) { r.jy += r.jvy * dt; r.jvy -= C.grav * dt; if (r.jy <= 0) { r.jy = 0; r.jvy = 0; r.air = false; if (r.v > 20) burst(S, r.x, C.lanes[r.lane], L, 3); } }
  if (r.st !== 'fall' && r.st !== 'getup') r.x += r.v * dt;
  r.ph += dt * (3 + r.v * .16);
  if (r.st === 'run') for (const o of S.obs) { if (o.t === 'hurdle' && !o.down[r.lane] && Math.abs(r.x - o.x) < 5 && r.jy < C.clear) { o.down[r.lane] = true; trip38(S, r); }
    else if (o.t === 'boost' && r.x > o.x && r.x < o.x + 30 && !r.pass.has(o)) { r.pass.add(o); r.v = Math.min(C.maxV + 14, r.v + C.boost); burst(S, r.x, C.lanes[r.lane], Y, 6); } }
  const pose = r.st === 'getup' ? 'getup' : r.st === 'fall' ? 'ko' : !r.go ? 'crouch' : r.air ? 'jump' : 'run';
  rag38(S, r, dt, pose, 1); if (r.st === 'fall' || r.st === 'getup') r.x = Math.max(r.x - 40 * dt, r.pts.hip[0] * K38);
  if (!r.done && r.x >= C.len) { r.done = S.rt; S.order = (S.order || 0) + 1; r.place = S.order; }
}
const GAME = kit({ id:'g38', t1:'FLOPPY', t2:'RACE', sub:'TAP. JUMP. DONT FACEPLANT.', seed:938, off:38, secs:60, music:MUS(168, -16, true),
  setup(S) { S.rt = 0; S.obs = []; let x = 260; while (x < TUNE38.len - 160) { const q = S.rng(), t = q < .55 ? 'hurdle' : q < .8 ? 'mud' : 'boost'; S.obs.push({ x, t, down:{} }); x += 150 + S.rng() * 130; }
    S.run = [0, 1, 2, 3].map(l => mkRunner38(l, l === 0 ? -1 : l - 1)); S.pA = 0; S.pB = 0; S.order = 0; S.endT = 0; S.cam = 0; S.go = 0; S.pa = 0; S.pb = 0; },
  step(S, dt, inp) { const C = TUNE38; S.rt += dt; const intro = S.rt < C.intro, me = S.run[0];
    if (!intro && !S.go) { S.go = 1; for (const r of S.run) r.go = 1; ENG.impact(S, 'weak'); }
    const ea = inp.a && !S.pA, eb = inp.b && !S.pB, ej = inp.u && !S.pU; S.pA = inp.a; S.pB = inp.b; S.pU = inp.u; let tap = 0;
    for (const side of [ea ? 'a' : '', eb ? 'b' : '']) if (side) { if (me.last !== side) { tap += 1; me.last = side; me.tapT = S.rt; } else me.v *= .985; }
    if (me.st !== 'run') tap = 0;
    for (const r of S.run) { let t = 0, j = false;
      if (r === me) { t = tap; j = ej || (inp.u && !me.air && S.obs.some(o => (o.t === 'hurdle' || o.t === 'mud') && o.x - me.x < 26 && o.x - me.x > 18)); if (ej) me.jq = .12; if (me.jq > 0) { me.jq -= dt; j = true; } }
      else if (r.go && r.st === 'run') { const [rate, skill] = C.cpu[r.ci]; r.acc += dt * rate * (.85 + .3 * Math.sin(S.rt * .7 + r.ci * 2)); if (r.acc >= 1) { r.acc -= 1; t = 1; }
        const nxt = S.obs.find(o => o.x > r.x - 4 && (o.t === 'hurdle' || o.t === 'mud') && !o.down[r.lane]); if (nxt && !r.air) { const d = nxt.x - r.x, want = nxt.t === 'hurdle' ? 12 + r.v * .05 : 10; if (d < want + 6 && d > want - 6) { if (r.skillRoll === undefined || r.skillNext !== nxt) { r.skillNext = nxt; r.skillRoll = S.rng() < skill; } if (r.skillRoll) j = true; } } }
      step38(S, r, dt, t, j); }
    if (me.done) { S.endT += dt; if (S.endT > 1.6) { const w = me.place === 1; return finish(S, w ? 'YOU WIN' : ['', '', '2ND PLACE', '3RD PLACE', '4TH PLACE'][me.place], Math.max(0, (5 - me.place) * 500) + Math.round(Math.max(0, 40 - me.done) * 20)); } }
    if (S.rt > C.time + 2) return finish(S, 'TIME UP', 0);
    const target = Math.max(0, Math.min(C.len + 60 - 256, me.x - 86)); S.cam += (target - S.cam) * Math.min(1, dt * 6); },
  draw(S) { const C = TUNE38, cam = Math.round(S.cam), sh = S.ecam && S.ecam.sh > 0 ? Math.round((S.rng() - .5) * S.ecam.sh * .5) : 0;
    rect(0, 0, 256, 224, K); const bands = [B, B, SKY, SKY, PK, PK, O]; for (let i = 0; i < 7; i++) { rect(0, i * 10, 256, 10, bands[i]); if (i) for (let x = (i % 2) * 2; x < 256; x += 4) px(x, i * 10, bands[i - 1]); }
    for (let i = 0; i < 14; i++) { const bx = ((i * 26 - cam * .25) % 364 + 364) % 364 - 40, bh = 18 + ((i * 37) % 5) * 7; rect(bx, 78 - bh, 20, bh + 4, N); for (let w = 0; w < bh; w += 8) rect(bx + 4, 78 - bh + 4 + w, 3, 3, (i + w) % 3 ? Y : DG); }
    rect(0, 80, 256, 40, D); rect(0, 80, 256, 2, L); for (let r = 0; r < 3; r++) for (let i = 0; i < 20; i++) { const cx = ((i * 14 + r * 5 - cam * (.6 + r * .05) + 5000) % 280) - 10, bob = Math.round(Math.sin(S.rt * 5 + i * 1.7 + r) * (S.run[0].done ? 3 : 1)), col = [R, B, GR, Y, PU][(i + r) % 5]; rect(cx, 92 + r * 9 + bob, 6, 7, col); rect(cx + 1, 87 + r * 9 + bob, 4, 4, (i + r) % 3 ? S : T); }
    rect(0, 118, 256, 4, M); const ly = TUNE38.lanes; rect(0, 122, 256, 82, BRK);
    for (let l = 0; l < 4; l++) { rect(0, ly[l] + 4, 256, 1, W); for (let x = 0; x < 256; x += 2) if ((x + l) % 4 === 0) px(x, ly[l] - 10, O); } rect(0, ly[3] + 4, 256, 1, W);
    rect(0, 204, 256, 20, GR); for (let x = 0; x < 256; x += 6) rect(x + (cam % 6), 208 + (x % 4) * 3, 2, 3, DG);
    const sx = x => Math.round(x - cam + sh), fl = TUNE38.len; if (sx(40) > -8 && sx(40) < 260) rect(sx(40), 122, 2, 82, W);
    if (sx(fl) > -10 && sx(fl) < 270) for (let y = 122; y < 204; y += 4) for (let c = 0; c < 2; c++) rect(sx(fl) + c * 4, y, 4, 4, ((y / 4 + c) & 1) ? W : K);
    for (const o of S.obs) for (let l = 0; l < 4; l++) { const x = sx(o.x), y = ly[l];
      if (x < -50 || x > 260) continue;
      if (o.t === 'mud') { for (let yy = -3; yy <= 3; yy++) for (let xx = 0; xx < C.mudW; xx++) if (((xx - C.mudW / 2) ** 2) / (C.mudW * C.mudW / 4) + yy * yy / 10 < 1) px(x + xx, y + yy + 1, (xx + yy) % 3 ? D : M); }
      else if (o.t === 'boost') { for (let k = 0; k < 3; k++) for (let q = 0; q < 5; q++) { px(x + k * 9 + q, y - 3 + q, Y); px(x + k * 9 + q, y + 5 - q, Y); } }
      else if (o.down[l]) { rect(x - 6, y + 1, 14, 2, W); rect(x - 5, y - 1, 2, 3, R); rect(x + 4, y - 3, 2, 5, R); }
      else { rect(x - 4, y - 12, 2, 13, W); rect(x + 3, y - 12, 2, 13, W); for (let q = 0; q < 9; q += 3) rect(x - 4 + q, y - 12, 3, 3, q % 6 ? R : W); } }
    const order = [...S.run].sort((a, b) => a.lane - b.lane);
    for (const r of order) { const gx = sx(r.x), gy = ly[r.lane]; for (let y = -2; y <= 2; y++) for (let x = -12; x <= 12; x++) if ((x * x) / 144 + (y * y) / 5 < 1 && (x + y) % 2 === 0) px(gx + x, gy + 2 + y, K);
      PRIG.draw('fighter', r.kind, 'idle', gx, gy - r.jy, 1, 0, { sc:C.sc, J:joints38(r), alt:r.alt }); if (r === S.run[0]) { rect(gx - 2, gy - 62, 5, 1, Y); px(gx, gy - 60, Y); } }
    rect(60, 10, 136, 3, DG); for (const r of S.run) rect(60 + Math.min(1, r.x / TUNE38.len) * 133, 8, 4, 7, r === S.run[0] ? Y : [N, R, B, GR][r.lane]);
  },
  hud(S) { const me = S.run[0], pl = S.run.filter(r => r.done).length, rank = 1 + S.run.filter(r => r !== me && (r.done ? (!me.done || r.place < me.place) : (!me.done && r.x > me.x))).length;
    txt(['1ST', '2ND', '3RD', '4TH'][rank - 1], 14, 6, rank === 1 ? Y : W, 16); txt(Math.max(0, Math.round((TUNE38.len - me.x) / 17)) + 'M', 242, 8, W, 8, 'right');
    if (S.rt < TUNE38.intro) { const n = Math.ceil(TUNE38.intro - S.rt - .3); txt(n > 0 ? String(n) : 'GO!', 128, 70, n > 0 ? W : Y, 32, 'center'); } else if (S.rt < TUNE38.intro + .6) txt('GO!', 128, 70, Y, 32, 'center');
    if (me.done) txt(me.place === 1 ? 'YOU WIN!' : '#' + me.place, 128, 70, Y, 24, 'center');
    hintS(S, 'TAP Z X ALTERNATELY TO RUN   UP JUMP', 8, 212); },
  info(S) { const me = S.run[0]; return { x:S.run.map(r => Math.round(r.x)), v:Math.round(me.v), st:me.st, trips:me.trips, place:me.place, t:+S.rt.toFixed(1), go:S.go }; },
  bot(S, i) { const me = S.run[0]; if (!S.go) return i; me.bacc = (me.bacc || 0) + 6.9 / 60; if (me.bacc >= 1) { me.bacc -= 1; me.bside = me.bside === 'a' ? 'b' : 'a'; me.bhold = 2; } if (me.bhold > 0) { me.bhold--; if (me.bside === 'a') i.a = 1; else i.b = 1; }
    const nxt = S.obs.find(o => o.x > me.x - 4 && (o.t === 'hurdle' || o.t === 'mud') && !o.down[0]); if (nxt && !me.air) { const d = nxt.x - me.x, want = nxt.t === 'hurdle' ? 12 + me.v * .05 : 10; if (d < want + 5 && d > want - 7) i.u = 1; } return i; } });
