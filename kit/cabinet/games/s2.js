// KEYS: Arrows run, Z/Space jump (hold = higher). Reach the flag, stomp walkers, grab coins.
/* ===== S2 TILE RUNNER: PLATFORMER starter (side-scroll run-and-jump on a tile grid).
   BRIEF  genre: platformer | player: run + variable jump (coyote + buffer) | goal: reach the flag | lose: 3 lives (pits, walkers)
          bot: runs right, jumps at gaps/walls/walkers | win: x >= flag | juice: coin pops, stomp burst, camera follow
   Uses engine.js (grid, move, cam, fx). The level is generated from S.rng: every ?seed= is a different, always-solvable level. ===== */
const TUNE2 = { run:84, accel:900, grav:980, jump:310, cut:0.45, coyote:0.1, buffer:0.12, maxfall:420, lives:3, ts:8, w:112, h:28, gy:22, coin:10, stomp:50, flagBonus:300 };  // apex = 310^2/(2*980) = 49 px (6 tiles)
function level2(S) { const C = TUNE2, G = ENG.grid(C.w, C.h, C.ts, 0), gy = C.gy, en = [], coins = [], safe = [];
  for (let tx = 0; tx < C.w; tx++) for (let ty = gy; ty < C.h; ty++) G.set(tx, ty, 1);
  let x = 12; while (x < C.w - 14) { safe.push(x * C.ts); const k = rint(S, 4);
    if (k === 0) { const w = 2 + rint(S, 2); for (let i = 0; i < w; i++) for (let ty = gy; ty < C.h; ty++) G.set(x + i, ty, 0); for (let i = 0; i < w; i++) coins.push({ x:(x + i) * C.ts + 2, y:(gy - 5) * C.ts, got:0 }); x += w + 4 + rint(S, 4); }
    else if (k === 1) { const h = 2 + rint(S, 2); for (let ty = gy - h; ty < gy; ty++) { G.set(x, ty, 1); G.set(x + 1, ty, 1); } coins.push({ x:x * C.ts + 6, y:(gy - h - 2) * C.ts, got:0 }); x += 6 + rint(S, 4); }
    else if (k === 2) { en.push({ x:(x + 2) * C.ts, y:(gy - 1) * C.ts, w:8, h:8, vx:-20, dead:0, x0:(x - 2) * C.ts, x1:(x + 8) * C.ts }); x += 10 + rint(S, 4); }
    else { for (let i = 0; i < 4; i++) coins.push({ x:(x + i) * C.ts + 2, y:(gy - 4) * C.ts, got:0 }); x += 6 + rint(S, 3); } }
  return { G, en, coins, safe, flag:(C.w - 8) * C.ts }; }
function respawn2(S) { const p = S.p, s = S.L.safe.filter(v => v <= S.maxx); p.x = Math.max(16, s.length ? s[s.length - 1] : 16); p.y = (TUNE2.gy - 1) * TUNE2.ts; p.vx = p.vy = 0; p.inv = 1.5; p.gt = 0; p.bt = 0; }
const GAME = kit({ id:'s2', t1:'TILE', t2:'RUNNER', sub:'RUN. JUMP. REACH THE FLAG.', seed:902, off:32, secs:40, music:MUS(140, -17, false),
  setup(S) { S.L = level2(S); S.lives = TUNE2.lives; S.coins = 0; S.maxx = 0; S.p = { x:16, y:0, w:6, h:8, vx:0, vy:0, gt:0, bt:0, inv:0, face:1, air:true }; respawn2(S); S.p.inv = 0; ENG.cam(S, 16, 160, 256, 224, TUNE2.w * TUNE2.ts, TUNE2.h * TUNE2.ts, 1); },
  step(S, dt, inp) { const C = TUNE2, p = S.p, G = S.L.G; p.inv -= dt;
    const ax = inp.ax !== undefined ? inp.ax : (inp.r ? 1 : 0) - (inp.l ? 1 : 0), want = ax * C.run;
    p.vx += clamp(want - p.vx, -C.accel * dt, C.accel * dt); if (ax) p.face = ax > 0 ? 1 : -1;
    const jd = inp.a || inp.b || inp.u, edge = S.edge(inp, 'a') | S.edge(inp, 'b'); p.bt = edge ? C.buffer : p.bt - dt; p.gt = p.air ? p.gt - dt : C.coyote;
    if (p.bt > 0 && p.gt > 0) { p.vy = -C.jump; p.gt = 0; p.bt = 0; p.air = true; sfx('jump'); }
    if (!jd && p.vy < -60) p.vy *= C.cut ** (dt * 30);                       // release = shorter hop
    p.vy = Math.min(C.maxfall, p.vy + C.grav * dt);
    const h = ENG.move(p, G.solidAt, p.vx * dt, p.vy * dt);
    if (h.hx) p.vx = 0; if (h.hy) { if (p.vy > 0) p.air = false; p.vy = 0; } else p.air = true;
    p.x = Math.max(0, p.x); S.maxx = Math.max(S.maxx, p.x);
    ENG.cam(S, p.x, p.y, 256, 224, C.w * C.ts, C.h * C.ts, 0.15);
    for (const c of S.L.coins) if (!c.got && Math.abs(c.x - p.x) < 7 && Math.abs(c.y - p.y) < 8) { c.got = 1; S.coins++; S.score += C.coin; ENG.fx.add(S, 'coin', c.x, c.y, 0.4); sfx('coin'); }
    for (const e of S.L.en) { if (e.dead) continue; e.x += e.vx * dt; if (e.x < e.x0) e.vx = Math.abs(e.vx); if (e.x > e.x1) e.vx = -Math.abs(e.vx);
      if (Math.abs(e.x - p.x) < 7 && Math.abs(e.y - p.y) < 8 && p.inv <= 0) {
        if (p.vy > 0 && p.y + p.h - 4 < e.y + 2) { e.dead = 1; p.vy = -200; S.score += C.stomp; burst(S, e.x + 4, e.y + 4, PU, 8); ENG.fx.add(S, 'coin', e.x, e.y, 0.3); sfx('pop'); }
        else { S.lives--; sfx('hurt'); ENG.shake(S, 3); if (S.lives <= 0) return finish(S, 'GAME OVER'); respawn2(S); } } }
    if (p.y > C.h * C.ts) { S.lives--; sfx('hurt'); if (S.lives <= 0) return finish(S, 'GAME OVER'); respawn2(S); }
    if (p.x >= S.L.flag) { sfx('win'); return finish(S, 'COURSE CLEAR!', C.flagBonus + S.lives * 100); } },
  draw(S) { clear(SKY); const C = TUNE2, G = S.L.G, cx = Math.round(S.ecam.x), t0 = Math.floor(cx / C.ts);
    for (let tx = t0; tx <= t0 + 33; tx++) for (let ty = 0; ty < C.h; ty++) if (G.get(tx, ty) === 1) { const top = G.get(tx, ty - 1) !== 1; rect(tx * C.ts - cx, ty * C.ts, 8, 8, top ? GR : T); if (top) rect(tx * C.ts - cx, ty * C.ts + 2, 8, 6, M); }
    for (const c of S.L.coins) if (!c.got) rect(Math.round(c.x - cx), Math.round(c.y), 4, 5, Y);
    for (const e of S.L.en) if (!e.dead) rect(Math.round(e.x - cx), Math.round(e.y), 8, 8, PU);
    rect(Math.round(S.L.flag - cx), 120, 2, 56, W); rect(Math.round(S.L.flag - cx) + 2, 120, 10, 7, R);
    const p = S.p; if (p.inv <= 0 || (S.T * 20 | 0) & 1) { rect(Math.round(p.x - cx), Math.round(p.y), 6, 8, R); rect(Math.round(p.x - cx) + (p.face > 0 ? 3 : 0), Math.round(p.y) + 1, 3, 2, W); } },
  drawHD(S, g) { const C = TUNE2, G = S.L.G, cx = S.ecam.x, t0 = Math.floor(cx / C.ts);
    g.fillStyle = HD.lg(g, 0, 0, 0, 224, [[0, '#4a86e0'], [1, '#b8e0ff']]); g.fillRect(0, 0, 256, 224);
    for (let i = 0; i < 4; i++) { const hx = ((i * 90 - cx * 0.3) % 360 + 360) % 360 - 60; g.fillStyle = 'rgba(70,140,90,0.55)'; g.beginPath(); g.ellipse(hx, 176, 70, 34, 0, Math.PI, 0); g.fill(); }
    for (let tx = t0; tx <= t0 + 33; tx++) for (let ty = 0; ty < C.h; ty++) if (G.get(tx, ty) === 1) { const top = G.get(tx, ty - 1) !== 1; g.fillStyle = HD.lg(g, 0, ty * 8, 0, ty * 8 + 8, top ? [[0, '#58c848'], [1, '#2e8a2c']] : [[0, '#8a5a30'], [1, '#5a3a1e']]); g.fillRect(tx * 8 - cx, ty * 8, 8.2, 8.2); if (top) { g.fillStyle = '#7ae060'; g.fillRect(tx * 8 - cx, ty * 8, 8.2, 1.4); } }
    for (const c of S.L.coins) if (!c.got) { HD.glow(g, c.x - cx + 2, c.y + 2, 7, '255,220,60', 0.5); HD.ball(g, c.x - cx + 2, c.y + 2.5, 2.4, '#fff4a0', '#d89a10'); }
    for (const e of S.L.en) if (!e.dead) { HD.shadow(g, e.x - cx + 4, e.y + 8, 4, 1.6); HD.part(g, e.x - cx, e.y, 8, 8, 3, '#c07ae0', '#5a2c7a'); g.fillStyle = '#fff'; g.fillRect(e.x - cx + 1.5, e.y + 2, 1.6, 1.6); g.fillRect(e.x - cx + 4.8, e.y + 2, 1.6, 1.6); }
    g.fillStyle = '#e8e8e8'; g.fillRect(S.L.flag - cx, 120, 1.6, 56); g.fillStyle = '#e03030'; g.fillRect(S.L.flag - cx + 1.6, 120, 10, 7);
    const p = S.p; if (p.inv <= 0 || (S.T * 20 | 0) & 1) { HD.shadow(g, p.x - cx + 3, p.y + 8, 4, 1.6); HD.part(g, p.x - cx, p.y, 6, 8, 2, '#ff6a50', '#a01818'); g.fillStyle = '#fff'; g.fillRect(p.x - cx + (p.face > 0 ? 3.4 : 0.6), p.y + 1.4, 2, 2); }
    ENG.fx.each(S, 'coin', (f, k) => HD.glow(g, f.x - cx + 2, f.y - k * 10, 8, '255,230,90', 1 - k)); },
  hud(S) { txt('LIVES ' + S.lives, 4, 4, W, 8); txt('COINS ' + S.coins, 252, 4, Y, 8, 'right'); hintS(S, 'RUN  Z JUMP  REACH THE FLAG', 8, 212); },
  info(S) { return { x:Math.round(S.p.x), lives:S.lives, coins:S.coins }; },
  bot(S, i) { const p = S.p, G = S.L.G; i.r = 1; let jump = false;
    if (!p.air || p.gt > 0) {
      if (!G.solidAt(p.x + 6 + 9, p.y + 10)) jump = true;                       // gap ahead
      if (G.solidAt(p.x + 6 + 5, p.y + 4)) jump = true;                         // wall ahead
      for (const e of S.L.en) if (!e.dead && e.x - p.x > -4 && e.x - p.x < 26 && Math.abs(e.y - p.y) < 10) jump = true; }
    if (jump || p.vy < -20) { i.a = 1; } return i; },
});
