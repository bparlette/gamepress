// KEYS: LEFT/RIGHT run, A jump up the treehouse tiers, B roll (dash). Reach the top post and survive the quake, meteors and flood for 35 seconds.
/* ===== KONG CALAMITY: Donkey Kong Country x Natural Disaster Survival. Ten monkeys on a wooden treehouse while
   disasters destroy it piece by piece. Be the last one clinging to the top post when time runs out. ===== */
const TR15 = [[196, 0, 16], [160, 1, 15], [124, 3, 13], [88, 5, 11], [56, 7, 9]], PH15 = 11.67, NM15 = { quake:'STAGE EARTHQUAKE', meteor:'METEOR STRIKE', tsunami:'PIXEL TSUNAMI' };
function kill15(S, e, fx) { if (!e.alive) return; e.alive = false; e.vy = -140; e.fx = fx; e.sp = 0; sfx(e.me ? 'die' : 'hit'); if (e.me) S.dead = true; }
function ai15(S, e, smart) {
  const o = { l:0, r:0, a:0, b:0 };
  if (e.pause > 0) return o;
  if (!smart && S.rng() < 0.012) { e.pause = 0.3 + S.rng() * 0.5; if (S.rng() < 0.5) o.a = 1; return o; }
  if (smart) for (const m of S.met) if (Math.abs(m.x - e.x) < 22 && m.y < e.y) { const d = e.x >= m.x ? 1 : -1, nx = e.x + d * 8; if (e.y > 60 || (nx > 114 && nx < 142)) { if (d > 0) o.r = 1; else o.l = 1; return o; } }
  const cur = TR15.findIndex(r => r[0] === e.y);
  if (e.on && cur >= e.goal) return o;
  let best = null, bd = 999;
  for (const t of S.tl) if (t.alive && t.y < e.y - 12 && t.y > e.y - 46) { const d = Math.abs(t.x + 8 - e.x); if (d < bd) { bd = d; best = t; } }
  const tx = best ? best.x + 8 : 128;
  if (best && bd < 9 && e.on) { o.a = 1; return o; }
  if (e.x < tx - 3) o.r = 1; else if (e.x > tx + 3) o.l = 1;
  return o;
}
const GAME = kit({
  id:'g15', t1:'KONG', t2:'CALAMITY', sub:'CLIMB. SURVIVE. CLING TO THE POST.', seed:4, off:15, secs:42,
  music:MUS(150, -20, false),
  setup(S) {
    S.tl = []; for (const [y, a, b] of TR15) for (let c = a; c < b; c++) S.tl.push({ x:c * 16, y, alive:true, warn:0, post:y === 56 });
    S.deb = []; S.met = []; S.inc = []; S.wl = 240; S.nx = 0; S.endT = 0; S.dead = false; S.ord = ['quake', 'meteor', 'tsunami'];
    for (let i = 2; i > 0; i--) { const j = rint(S, i + 1); [S.ord[i], S.ord[j]] = [S.ord[j], S.ord[i]]; }
    S.en = []; for (let i = 0; i < 10; i++) { const hi = rint(S, 2); S.en.push({ x:30 + i * 22, y:hi ? 160 : 196, vx:0, vy:0, on:true, alive:true, me:i === 0, goal:i === 0 ? 4 : [0, 1, 2, 2, 3, 3, 4, 1, 2][i - 1], col:[T, M, BRK, O][i & 3], pause:0, dir:1, fx:0, sp:0, roll:0, rc:0 }); }
    S.en[0].x = 128; S.en[0].y = 196; S.q = 0;
  },
  step(S, dt, inp) {
    const ph = Math.min(2, Math.floor(S.T / PH15)), tin = S.T - ph * PH15, ty = S.ord[ph], act = tin > 2 && S.T < 35;
    S.warnT = tin < 2 && S.T < 35 ? ty : null;
    if (S.endT) { S.endT += dt; if (S.endT > 2.4) return finish(S, 'SURVIVED!', 500); return; }
    if (S.T >= 35 && !S.dead) { S.endT = 0.01; sfx('win'); }
    S.q = act && ty === 'quake' ? 1 : 0;
    if (act && ty === 'quake') { S.nx -= dt; if (S.nx <= 0) { S.nx = 0.32; const c = S.tl.filter(t => t.alive && !t.warn && !t.post && Math.abs(t.x + 8 - 128) >= 36); if (c.length) c[rint(S, c.length)].warn = 0.6; } }
    if (act && ty === 'meteor') { S.nx -= dt; if (S.nx <= 0) { S.nx = 0.75; const al = S.en.filter(e => e.alive && !e.me && Math.abs(e.x - 128) > 30); let x = al.length && S.rng() < 0.75 ? al[rint(S, al.length)].x : 8 + rint(S, 240); if (Math.abs(x - 128) < 30) x = x < 128 ? 98 : 158; S.inc.push({ x, t:0.7 }); } }
    for (const m of S.inc) { m.t -= dt; if (m.t <= 0) { S.met.push({ x:m.x, y:-8, vy:240 }); m.dead = 1; } } S.inc = S.inc.filter(m => !m.dead);
    for (const t of S.tl) if (t.warn > 0) { t.warn -= dt; if (t.warn <= 0) { t.alive = false; S.deb.push({ x:t.x, y:t.y, vy:0 }); sfx('land'); } }
    for (const m of S.met) {
      const py = m.y; m.y += m.vy * dt; let hitY = null;
      for (const t of S.tl) if (t.alive && !t.post && m.x > t.x - 3 && m.x < t.x + 19 && py <= t.y && m.y >= t.y) { t.alive = false; S.deb.push({ x:t.x, y:t.y, vy:0 }); hitY = t.y; }
      for (const e of S.en) if (e.alive && Math.abs(e.x - m.x) < 9 && m.y > e.y - 14 && m.y < e.y + 4) { hitY = e.y - 6; }
      if (m.y > 200 && hitY === null) hitY = 196;
      if (hitY !== null) { m.dead = 1; sfx('boom'); for (const e of S.en) if (e.alive && Math.abs(e.x - m.x) < 11 && Math.abs(e.y - hitY) < 16) kill15(S, e, (e.x - m.x) * 6 + 20); }
    } S.met = S.met.filter(m => !m.dead);
    for (const d of S.deb) { d.vy += 500 * dt; d.y += d.vy * dt; } S.deb = S.deb.filter(d => d.y < 240);
    const tw = act && ty === 'tsunami'; S.wl = tw ? 240 - 180 * Math.min(1, (tin - 2) / 9.6) : Math.min(240, S.wl + 40 * dt);
    S.en.forEach((e, i) => {
      if (!e.alive) { e.vy += 500 * dt; e.y += e.vy * dt; e.x += e.fx * dt; e.sp += dt * 10; return; }
      e.pause = Math.max(0, e.pause - dt); e.roll = Math.max(0, e.roll - dt); e.rc = Math.max(0, e.rc - dt);
      const c = i === 0 ? inp : ai15(S, e, false), k = i === 0 && S.att ? ai15(S, e, true) : c;
      if (k.r) e.dir = 1; if (k.l) e.dir = -1;
      if (k.b && e.on && e.rc <= 0) { e.roll = 0.3; e.rc = 0.9; }
      const sp = e.roll > 0 ? 130 : i ? 56 : 70; e.x = clamp(e.x + ((k.r ? 1 : 0) - (k.l ? 1 : 0) + (e.roll > 0 ? e.dir * (k.r || k.l ? 0 : 1) : 0)) * sp * dt, 4, 252);
      if (k.a && e.on) { e.vy = -290; e.on = false; if (i === 0) sfx('jump'); }
      const py = e.y; e.vy += 820 * dt; e.y += e.vy * dt; e.on = false;
      if (e.vy >= 0) for (const t of S.tl) if (t.alive && e.x > t.x - 3 && e.x < t.x + 19 && py <= t.y + 1 && e.y >= t.y) { e.y = t.y; e.vy = 0; e.on = true; break; }
      for (const o of S.en) if (o !== e && o.alive && Math.abs(o.x - e.x) < 7 && Math.abs(o.y - e.y) < 8) e.x += (e.x >= o.x ? 1 : -1) * 30 * dt;
      if (e.y - 6 > S.wl) kill15(S, e, 80); else if (e.y > 232) kill15(S, e, 0);
    });
    S.alive = S.en.filter(e => e.alive).length; S.score = (10 - S.alive) * 100 + Math.floor(S.T) * 10;
    if (S.dead) { S.endT = 0; if (S.en[0].y > 250 || S.en[0].y < 0) { if (S.att) return 'reset'; endGame(S.score, 'SWEPT AWAY'); } }
  },
  draw(S) {
    const ox = S.q ? Math.round(Math.sin(S.T * 70) * 2) : 0;
    clear(F); rect(0, 0, VW, 90, GR);
    for (let i = 0; i < 9; i++) { rect(i * 32 + 6, 0, 10, 200, M); rect(i * 32 + 6, 0, 3, 200, T); fillCircle(i * 32 + 20, 14 + (i % 3) * 8, 14, F); fillCircle(i * 32 + 4, 10, 12, GR); }
    rect(0, 70, VW, 130, E ? 5 : 5); for (let i = 0; i < 9; i++) rect(i * 32 + 6 + ox, 60, 10, 140, M);
    rect(120 + ox, 56, 16, 140, T); rect(120 + ox, 56, 3, 140, BRK); rect(116 + ox, 50, 24, 7, BRK);
    for (const t of S.tl) if (t.alive && !(t.warn > 0 && (Math.floor(S.T * 20) & 1))) { rect(t.x + ox, t.y, 16, 6, t.y === 196 ? T : BRK); rect(t.x + ox, t.y, 16, 2, t.post ? Y : O); rect(t.x + ox, t.y + 5, 16, 1, M); if (t.y === 196) rect(t.x + ox, t.y + 6, 16, 28, M); }
    for (const d of S.deb) rect(d.x, d.y, 16, 6, BRK);
    for (const e of S.en) { if (e.y > 240 || e.y < -20) continue; const x = Math.round(e.x + ox), y = Math.round(e.y), sp = !e.alive, f = Math.floor(S.T * 10) & 1;
      if (sp && (Math.floor(e.sp) & 1)) { rect(x - 6, y - 8, 12, 5, e.col); fillCircle(x + 5, y - 5, 4, 10); continue; }
      rect(x - 4, y - 9, 8, 7, e.col); rect(x - 4 + (e.dir > 0 ? -4 : 8), y - 5, 3, 3, e.col); fillCircle(x, y - 12, 4, e.col); rect(x - 2, y - 12, 4, 3, 10); rect(x - 2 + e.dir, y - 13, 1, 1, K);
      rect(x - 4, y - 2 + 0, 3, 2 - (e.on && !f ? 0 : 0), M); rect(x + 1, y - 2, 3, 2, M);
      if (e.me) { rect(x - 2, y - 10, 4, 4, R); rect(x - 2, y - 24, 5, 1, Y); rect(x - 1, y - 23, 3, 1, Y); rect(x, y - 22, 1, 1, Y); } }
    for (const m of S.inc) rect(m.x - 2, 2, 5, 3, R);
    for (const m of S.met) { fillCircle(m.x, m.y, 5, O); fillCircle(m.x, m.y, 3, Y); rect(m.x - 1, m.y - 14, 3, 10, R); }
    if (S.wl < 240) { for (let x = 0; x < VW; x += 4) { const y = Math.round(S.wl + Math.sin(x / 12 + S.T * 5) * 2); rect(x, y, 4, 240 - y, B); rect(x, y, 4, 2, W); rect(x, y + 6, 4, 240 - y, (x >> 2 & 1) ? B : N); } }
  },
  hud(S, mode) {
    txt('ALIVE ' + S.alive + '/10', 4, 4, W, 8); txt('TIME ' + Math.max(0, Math.ceil(35 - S.T)), 252, 4, S.T > 28 ? R : Y, 8, 'right');
    if (S.warnT && (Math.floor(S.T * 4) & 1)) txt('WARNING: ' + NM15[S.warnT], 128, 24, R, 8, 'center');
    if (mode === 'play' && S.T < 9) txt('A JUMP  B ROLL  CLIMB TO THE TOP POST', 128, 44, W, 8, 'center');
    if (S.endT && !S.dead) txt('LAST ON THE POST!', 128, 70, Y, 16, 'center');
  },
  bot(S, i) { const e = S.en[0]; if (!e.alive) return i; const o = ai15(S, e, true); i.l = o.l; i.r = o.r; i.a = o.a; return i; },
  info(S) { const e = S.en[0]; return { alive:S.alive, me:e.alive, y:Math.round(e.y), x:Math.round(e.x), ord:S.ord.join(','), wl:Math.round(S.wl), end:S.endT > 0 }; },
});
