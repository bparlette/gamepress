/* ===== SPOOKSNAP 64: Pokemon Snap x Content Warning. On-rails camera ride through a haunted lab; film spooky creatures,
   then zoom on a teammate bot walking into a spike trap for a million views. ===== */
// KEYS: ARROWS aim camera, A snap photo, B toggle zoom lens (zoom = bigger views, drains battery)
const END25 = 960, TRAP25 = 930, KN25 = ['GHOST', 'PUMPKIN', 'SLIME', 'BATLING'], KC25 = [W, O, GR, PU];
function proj25(S, e) {
  const rel = e.z - S.D, z = S.zm ? 2 : 1, s = 1500 / rel * z;
  return { rel, s, x:128 + (e.x + (e.y2 ? 0 : Math.sin(S.T * 1.5 + e.ph) * 6)) * 100 / rel * z, y:100 + e.y * 100 / rel * z + (e.k === 3 ? Math.sin(S.T * 3 + e.ph) * 5 : 0) };
}
const pose25 = (S, e) => Math.sin(S.T * 2.2 + e.ph) > 0.35;
function snap25(S) {
  S.cd = 0.7; S.flash = 0.12; S.bat -= 1; sfx('catch'); let best = null;
  for (const e of S.ents) {
    if (e.dead) continue; const p = proj25(S, e);
    if (p.rel < 12 || p.rel > 110) continue; const d = Math.hypot(p.x - S.rx, p.y - S.ry), half = 24 + p.s * 0.4;
    if (d < half * 0.8 && (!best || d < best.d)) best = { e, d, p, q:1 - d / half };
  }
  if (!best) return;
  const e = best.e;
  if (e.k === 9) { if (e.zapped) { e.dead = true; S.viral = 1; S.score = 1000000; popup(S, 'VIRAL!! 1,000,000', 128, 70, Y); sfx('power'); } return; }
  const v = Math.round((4 + best.p.s / 8) * (pose25(S, e) ? 3 : 1) * (S.zm ? 2 : 1) * best.q) * 1000; e.dead = true; S.shots++;
  S.score += v; popup(S, KN25[e.k] + ' +' + v / 1000 + 'K', best.p.x, best.p.y - 14, KC25[e.k]);
}
const GAME = kit({
  id:'g25', t1:'SPOOKSNAP', t2:'64', sub:'FILM THE FRIGHTS. GO VIRAL.', seed:25, off:25, secs:45,
  music:MUS(112, -26, true),
  setup(S) {
    S.D = 0; S.rx = 128; S.ry = 100; S.zm = 0; S.bat = 100; S.cd = 0; S.flash = 0; S.shots = 0; S.viral = 0; S.hurt = 0; S.ents = [];
    for (let i = 0; i < 11; i++) S.ents.push({ k:rint(S, 4), z:70 + i * 70 + rint(S, 30), x:(rint(S, 2) ? 1 : -1) * (18 + rint(S, 50)), y:-30 + rint(S, 60), ph:S.rng() * 6 });
    S.ents.push({ k:9, z:TRAP25, x:-60, y:12, ph:0, y2:1 });
  },
  step(S, dt, inp) {
    const tm = S.ents[S.ents.length - 1];
    S.D += (S.D > 850 ? 17 : 28) * dt; S.bat -= (0.6 + (S.zm ? 1 : 0)) * dt; S.cd -= dt; S.flash -= dt; S.hurt -= dt;
    S.rx = clamp(S.rx + ((inp.r ? 1 : 0) - (inp.l ? 1 : 0)) * 100 * dt, 20, 236); S.ry = clamp(S.ry + ((inp.d ? 1 : 0) - (inp.u ? 1 : 0)) * 100 * dt, 40, 180);
    if (S.edge(inp, 'b')) { S.zm ^= 1; sfx('tick'); }
    if (S.edge(inp, 'a') && S.cd <= 0) snap25(S);
    if (S.D > 800 && !tm.zapped) { tm.x = Math.min(0, -60 + (S.D - 800) * 0.8); if (tm.x >= 0) { tm.zapped = 1; sfx('boom'); popup(S, 'BOT-7: AAAH!', 128, 60, R); } }
    for (const e of S.ents) if (e.k < 9 && !e.dead && e.z - S.D < 14 && !e.hit) { e.hit = 1; S.bat -= 8; S.hurt = 0.5; sfx('die'); popup(S, 'CLOBBERED! -BATT', 128, 140, R); }
    if (S.bat <= 0) return finish(S, 'BATTERY DEAD');
    if (S.D >= END25) return finish(S, S.viral ? '1,000,000 VIEWS!' : 'CLIP FLOPPED', S.viral ? 1500 : 0);
  },
  draw(S) {
    clear(N); rect(0, 100, VW, 124, DG); const z = S.zm ? 2 : 1;
    for (let k = 0; k < 9; k++) {
      const rel = 20 + k * 20 - (S.D % 20), y = Math.round(100 + 1500 / rel * z * 0.5), xw = 1500 / rel * z * 1.3;
      rect(0, y, VW, 1, M); rect(128 - xw, 100 - xw * 0.8, 3, xw * 0.8 + (y - 100), D); rect(128 + xw - 3, 100 - xw * 0.8, 3, xw * 0.8 + (y - 100), D);
      if (k % 3 == 0) { rect(128 - xw + 3, y - 30 * z * 100 / rel, 5, 8, CY); }
    }
    for (const e of S.ents.slice().sort((a, b) => b.z - a.z)) {
      const p = proj25(S, e); if (e.dead && e.k === 9 || p.rel < 6 || p.rel > 130) continue;
      const sz = Math.max(4, Math.min(80, Math.round(p.s))), x = Math.round(p.x), y = Math.round(p.y), c = KC25[e.k] || Y;
      if (e.k === 9) {
        rect(x - sz / 2 - 6, y + sz / 2, sz + 12, Math.max(2, sz / 6), D); for (let i = 0; i < 5; i++) rect(x - sz / 2 - 4 + i * sz / 4 + 2, y + sz / 2 - sz / 6, Math.max(2, sz / 8), sz / 6, L);
        const dy = e.zapped ? sz / 3 : 0; rect(x - sz / 4, y - sz / 3 + dy, sz / 2, sz / 2, e.zapped && (S.T * 12 & 1) ? Y : CY); rect(x - sz / 6, y - sz / 2 + dy, sz / 3, sz / 5, L); rect(x - sz / 8, y - sz / 2.5 + dy, sz / 10 + 1, sz / 10 + 1, R);
        continue;
      }
      if (e.dead) { rect(x - sz / 2, y, sz, 1, c); continue; }
      const gl = pose25(S, e); fillCircle(x, y, sz / 2, c);
      if (e.k === 0) rect(x - sz / 2, y, sz, sz / 2, c), rect(x - sz / 2, y + sz / 2 - 2, sz, 3, N);
      if (e.k === 1) rect(x - 1, y - sz / 2 - 3, 3, 4, GR);
      if (e.k === 3) { rect(x - sz, y - sz / 6, sz / 2, sz / 4, M); rect(x + sz / 2, y - sz / 6, sz / 2, sz / 4, M); }
      const ew = Math.max(2, sz / 6); rect(x - sz / 4 - ew / 2, y - sz / 8, ew, ew, gl ? R : K); rect(x + sz / 4 - ew / 2, y - sz / 8, ew, ew, gl ? R : K);
    }
    for (let y = 0; y < VH; y += 4) for (let x = y & 2; x < VW; x += 4) px(x, y, K);
    const R0 = S.zm ? 18 : 26; rect(S.rx - R0, S.ry - R0, 8, 2, W); rect(S.rx - R0, S.ry - R0, 2, 8, W); rect(S.rx + R0 - 8, S.ry - R0, 8, 2, W); rect(S.rx + R0 - 2, S.ry - R0, 2, 8, W);
    rect(S.rx - R0, S.ry + R0 - 2, 8, 2, W); rect(S.rx - R0, S.ry + R0 - 8, 2, 8, W); rect(S.rx + R0 - 8, S.ry + R0 - 2, 8, 2, W); rect(S.rx + R0 - 2, S.ry + R0 - 8, 2, 8, W); rect(S.rx - 1, S.ry - 4, 2, 8, R);
    if (S.flash > 0) rect(0, 0, VW, VH, W); if (S.hurt > 0) rect(0, 0, VW, 6, R);
  },
  hud(S) {
    if (S.T * 2 % 2 < 1.2) { fillCircle(10, 10, 3, R); } txt('REC', 18, 5, R, 8);
    txt('VIEWS ' + String(Math.round(S.score)).padStart(7, '0'), 128, 5, Y, 8, 'center');
    rect(196, 5, 50, 8, W); rect(197, 6, 48, 6, K); rect(197, 6, Math.max(0, Math.round(48 * S.bat / 100)), 6, S.bat < 25 ? R : GR); rect(246, 7, 2, 4, W);
    txt(S.zm ? 'ZOOM x2' : 'ZOOM x1', 4, 206, CY, 8); txt('A SNAP  B ZOOM  ARROWS AIM', 252, 206, W, 8, 'right');
    rect(60, 17, 136, 4, DG); rect(60, 17, Math.round(136 * S.D / END25), 4, PK);
    txt('EXIT', 60, 24, W, 8);
  },
  bot(S, i) {
    if (S.D > 800 && S.ents[S.ents.length - 1].dead) return i;
    let tg = null, td = 1e9; const tm = S.ents[S.ents.length - 1];
    if (S.D > 830) tg = tm;
    else for (const e of S.ents) { if (e.dead || e.k === 9) continue; const rel = e.z - S.D; if (rel > 22 && rel < 70 && rel < td) { td = rel; tg = e; } }
    if (!tg) { if (S.zm) i.b = (S.T * 30 & 1); return i; }
    const p = proj25(S, tg), want = tg === tm ? 1 : 0;
    if (S.zm !== want) { i.b = S.T * 30 & 1; return i; }
    const dx = p.x - S.rx, dy = p.y - S.ry;
    if (dx > 3) i.r = 1; if (dx < -3) i.l = 1; if (dy > 3) i.d = 1; if (dy < -3) i.u = 1;
    if (Math.hypot(dx, dy) < 9 && S.cd <= 0 && (tg === tm ? tm.zapped : (pose25(S, tg) || p.rel < 36))) i.a = 1;
    return i;
  },
  info(S) { return { D:Math.round(S.D), bat:Math.round(S.bat), shots:S.shots, viral:S.viral }; },
});
