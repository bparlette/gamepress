// KEYS: ARROWS MOVE, A = THROW ORB (WILD PAL) / WORK TILE, PALS HELP AUTOMATICALLY
const PC31 = [GR, O, W];
const TX31 = 32, TY31 = 44, TS31 = 24, GOAL31 = 13;
function pal31(x, y, t, flip) {
  x = Math.round(x); y = Math.round(y);
  fillCircle(x, y, 6, PC31[t]); px(x - 2, y - 1, K); px(x + 2, y - 1, K);
  if (t === 0) { rect(x - 1, y - 11, 2, 5, GR); rect(x + 1, y - 11, 3, 2, F); }
  if (t === 1) { rect(x - 6, y - 9, 3, 4, R); rect(x + 3, y - 9, 3, 4, R); rect(x + 6 * (flip ? -1 : 1), y + 2, 4, 3, Y); }
  if (t === 2) { rect(x - 5, y - 8, 10, 3, L); px(x, y + 2, PK); }
}
function sheep31(x, y, k) { fillCircle(x, y, 8, W); rect(x - 4, y - 2, 8, 6, K); px(x - 2, y, Y); px(x + 2, y, Y); rect(x - 6, y + 8, 2, 4, K); rect(x + 4, y + 8, 2, 4, K); rect(x - 1, y - 11, 2, 3, Y); if (k) rect(x + 9, y - 10, 2, 5, CY); }
const GAME = kit({
  id:'g31', t1:'PAL', t2:'HARVEST', sub:'CATCH PALS. FARM. CRAFT.', seed:3131, off:31, secs:60,
  music:MUS(108, -19, false),
  setup(S) {
    S.p = { x:128, y:170, fx:0, fy:-1 }; S.tiles = []; for (let i = 0; i < 24; i++) S.tiles.push({ s:0, g:0 });
    S.wild = [0, 1, 2].map(t => ({ x:40 + rint(S, 176), y:150 + rint(S, 44), t, tx:0, ty:0, wt:0.5 + S.rng() })); S.pals = []; S.orb = null; S.cd = 0;
    S.crops = 0; S.pan = 0; S.ph = 0; S.ft = 0; S.made = 0; S.prog = [0, 0, 0, 0]; S.end = 0;
  },
  step(S, dt, inp) {
    const p = S.p, mid = (c, r) => [TX31 + c * 36 + 18, TY31 + r * 24 + 12];
    if (S.end > 0) { S.end -= dt; if (S.end <= 0) return finish(S, 'FARM CLEARED', 300); return; }
    S.cd -= dt;
    if (S.ph === 2) {
      S.ft += dt;
      for (let i = 0; i < 4; i++) { S.prog[i] += dt * (0.3 + 0.06 * i); if (S.prog[i] >= 1) { S.prog[i] = 0; S.made++; S.score += 50; sfx('super'); popup(S, 'ROCKET!', 52 + i * 52, 80, Y); } }
      if (S.made >= 6) { S.end = 1.6; S.score += 200; }
      return;
    }
    const vx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), vy = (inp.d ? 1 : 0) - (inp.u ? 1 : 0);
    if (vx || vy) { const h = Math.hypot(vx, vy); p.fx = vx / h; p.fy = vy / h; p.x = clamp(p.x + p.fx * 62 * dt, 10, 246); p.y = clamp(p.y + p.fy * 62 * dt, 30, 196); }
    const at = (x, y) => { const c = Math.floor((x - TX31) / 36), r = Math.floor((y - TY31) / 24); return c >= 0 && c < 6 && r >= 0 && r < 4 ? c + r * 6 : -1; };
    const adv = (ti) => { const t = S.tiles[ti]; if (t.s === 0) t.s = 1; else if (t.s === 1) { t.s = 2; t.g = 0; } else if (t.s === 2) { t.s = 4; t.g = 0; } else if (t.s === 3) { t.s = 0; S.crops++; S.score += 20; sfx('coin'); } else return; sfx('tick'); };
    if (inp.pa && S.cd <= 0) {
      S.cd = 0.3;
      if (S.wild.length && !S.orb) {
        let ax = p.fx, ay = p.fy, bd = 1e9, w0 = null;
        for (const w of S.wild) { const d = dist(w, p); if (d < bd) { bd = d; w0 = w; } }
        if (w0 && ((w0.x - p.x) * ax + (w0.y - p.y) * ay) / (bd || 1) > 0.8) { ax = (w0.x - p.x) / bd; ay = (w0.y - p.y) / bd; }
        S.orb = { x:p.x, y:p.y, vx:ax * 170, vy:ay * 170, t:0 }; sfx('throw');
      } else if (!S.wild.length || at(p.x, p.y) >= 0) { const ti = at(p.x, p.y); if (ti >= 0) adv(ti); }
    }
    if (S.orb) {
      const o = S.orb; o.x += o.vx * dt; o.y += o.vy * dt; o.t += dt;
      for (let i = 0; i < S.wild.length; i++) if (dist(S.wild[i], o) < 10) { const w = S.wild.splice(i, 1)[0]; S.pals.push({ x:w.x, y:w.y, t:w.t, job:S.pals.length, wk:0, tg:-1 }); S.orb = null; sfx('catch'); popup(S, 'CAUGHT!', w.x, w.y - 16, Y); break; }
      if (S.orb && o.t > 0.7) S.orb = null;
    }
    for (const w of S.wild) {
      w.wt -= dt; if (w.wt <= 0) { w.tx = 20 + rint(S, 216); w.ty = 150 + rint(S, 46); w.wt = 1.5 + S.rng() * 2; }
      const d = Math.hypot(w.tx - w.x, w.ty - w.y); if (d > 2) { w.x += (w.tx - w.x) / d * 16 * dt; w.y += (w.ty - w.y) / d * 16 * dt; }
    }
    for (const t of S.tiles) if (t.s === 4) { t.g += dt; if (t.g > 3) { t.s = 3; } }
    for (const q of S.pals) {
      const okS = v => q.job % 3 === 0 ? (v === 0 || v === 1) : q.job % 3 === 1 ? v === 2 : v === 3;
      if (q.tg < 0 || !okS(S.tiles[q.tg].s)) {
        let bd = 1e9; q.tg = -1;
        for (let i = 0; i < 24; i++) { const ok = okS(S.tiles[i].s); const m = mid(i % 6, Math.floor(i / 6)), d = Math.hypot(m[0] - q.x, m[1] - q.y); if (ok && !S.pals.some(o => o !== q && o.tg === i) && d < bd) { bd = d; q.tg = i; } }
      }
      if (q.tg >= 0) {
        const m = mid(q.tg % 6, Math.floor(q.tg / 6)), d = Math.hypot(m[0] - q.x, m[1] - q.y);
        if (d > 3) { q.x += (m[0] - q.x) / d * 40 * dt; q.y += (m[1] - q.y) / d * 40 * dt; q.wk = 0; }
        else { q.wk += dt; if (q.wk > 0.6) { q.wk = 0; const t = S.tiles[q.tg]; if (t.s === 0) t.s = 1; else if (t.s === 1) { t.s = 2; } else if (t.s === 2) { t.s = 4; t.g = 0; } else if (t.s === 3) { t.s = 0; S.crops++; S.score += 20; } sfx('tick'); q.tg = -1; } }
      }
    }
    if (S.crops >= GOAL31 && S.ph === 0) { S.ph = 1; popup(S, 'TO THE FACTORY!', 128, 100, Y); sfx('power'); }
    if (S.ph === 1) { S.pan += dt / 2; if (S.pan >= 1) { S.pan = 1; S.ph = 2; } }
  },
  draw(S) {
    const ox = -Math.round(S.pan * 256);
    clear(F); rect(ox, 24, 256, 176, GR); rect(ox, 140, 256, 60, F);
    for (let i = 0; i < 12; i++) rect(ox + 8 + i * 22, 144 + (i % 3) * 20, 6, 10, GR);
    for (let i = 0; i < 24; i++) {
      const t = S.tiles[i], x = ox + TX31 + (i % 6) * 36, y = TY31 + Math.floor(i / 6) * 24;
      rect(x + 2, y + 2, 32, 20, t.s === 0 ? V : T);
      if (t.s >= 1) for (let k = 0; k < 4; k++) rect(x + 5, y + 5 + k * 4, 26, 1, M);
      if (t.s === 2) rect(x + 16, y + 10, 4, 4, GR);
      if (t.s === 4) { rect(x + 16, y + 6, 4, 10, GR); rect(x + 4, y + 18, 28, 2, CY); }
      if (t.s === 3) { fillCircle(x + 14, y + 12, 5, O); fillCircle(x + 23, y + 12, 5, R); rect(x + 17, y + 4, 2, 4, GR); }
    }
    rect(ox + 256, 24, 256, 176, DG); rect(ox + 256, 150, 256, 12, L); for (let x = 0; x < 256; x += 8) rect(ox + 256 + x + ((S.T * 20) | 0) % 8, 154, 3, 4, K);
    for (let i = 0; i < 4; i++) { const x = ox + 256 + 36 + i * 52; rect(x - 12, 112, 24, 28, M); rect(x - 10, 114, 20, 6, CY); rect(x - 10, 128, 20 * S.prog[i], 4, Y); sheep31(x, 100, S.ph === 2 && (S.T * 4 | 0) % 2); }
    for (let i = 0; i < Math.min(S.made, 6); i++) { const x = ox + 256 + 30 + i * 36; rect(x, 146, 20, 5, L); rect(x + 18, 145, 4, 7, R); }
    for (const w of S.wild) pal31(ox + w.x, w.y, w.t, 0);
    for (const q of S.pals) { pal31(ox + q.x, q.y - (q.wk > 0 ? Math.abs(Math.sin(S.T * 20)) * 3 : 0), q.t, 0); }
    if (S.ph < 2) { rect(ox + S.p.x - 4, S.p.y - 12, 8, 8, S); rect(ox + S.p.x - 5, S.p.y - 15, 10, 4, Y); rect(ox + S.p.x - 5, S.p.y - 4, 10, 9, B); rect(ox + S.p.x - 4, S.p.y + 5, 3, 3, K); rect(ox + S.p.x + 1, S.p.y + 5, 3, 3, K); }
    if (S.orb) fillCircle(ox + S.orb.x, S.orb.y, 3, S.T * 20 & 1 ? R : W);
  },
  hud(S) {
    txt('CROPS ' + S.crops + '/' + GOAL31, 4, 4, Y, 8); txt('PALS ' + S.pals.length + '/3', 252, 4, CY, 8, 'right');
    txt(S.ph === 2 ? 'ELECTRIC SHEEP CRAFT ROCKETS ' + S.made + '/6' : S.wild.length ? 'A: THROW ORB AT WILD PALS' : 'PALS FARM FOR YOU. A WORKS TILES', 128, 206, W, 8, 'center');
  },
  info(S) { return { crops:S.crops, pals:S.pals.length, ph:S.ph, made:S.made, px:Math.round(S.p.x), wx:S.wild.length ? Math.round(S.wild[0].x) : -1 }; },
  bot(S, i) {
    const p = S.p; if (S.ph > 0 || S.end > 0) return i;
    let tg = null, bd = 1e9;
    if (S.wild.length) { for (const w of S.wild) { const d = dist(w, p); if (d < bd) { bd = d; tg = w; } } if (!tg) return i; }
    else for (let k = 0; k < 24; k++) { const s = S.tiles[k].s; if (s === 3 || s === 0 || s === 2 || s === 1) { const t = { x:TX31 + (k % 6) * 36 + 18, y:TY31 + Math.floor(k / 6) * 24 + 12 }; const d = dist(t, p) - (s === 3 ? 30 : 0); if (d < bd) { bd = d; tg = t; } } }
    if (!tg) return i;
    const dx = tg.x - p.x, dy = tg.y - p.y;
    if (S.wild.length) { if (bd < 70) { dirInp(i, Math.abs(dx) > 4 ? dx : 0, Math.abs(dy) > 4 ? dy : 0); i.pa = 1; } else dirInp(i, dx, dy); return i; }
    if (bd > 6) { dirInp(i, Math.abs(dx) > 3 ? dx : 0, Math.abs(dy) > 3 ? dy : 0); } else i.pa = 1;
    return i;
  },
});
