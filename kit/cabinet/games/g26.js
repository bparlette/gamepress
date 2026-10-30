/* ===== PET QUEST 99: Dragon Quest x Pet Simulator 99. Smash coin rocks, hatch eggs at the tent, pets form a conga line
   and auto-fight; the 5th egg is a HUGE GOLDEN DRAGON that vaporizes the demon boss. ===== */
// KEYS: ARROWS move, B swing sword at rocks, A hatch an egg when standing at the tent
const ST26 = { x:212, y:50 }, PN26 = ['SLIME', 'PUPPY', 'DRAGON', 'GOLDEN DRAGON'], PP26 = [1, 2, 4, 90];
const cost26 = S => 10 + S.eggs * 8;
function rock26(S) { const c = rint(S, 5) === 0; S.rocks.push({ x:20 + rint(S, 170), y:44 + rint(S, 140), hp:c ? 3 : 2, chest:c, hf:0 }); }
function pet26(k, x, y, c, w) { // pet sprite centered at x,y
  if (k === 0) { rect(x - 4, y - 2, 9, 6, c); rect(x - 3, y - 4, 7, 2, c); rect(x - 2, y - 2, 1, 2, K); rect(x + 1, y - 2, 1, 2, K); }
  else if (k === 1) { rect(x - 4, y - 2, 9, 5, S_TAN); rect(x - 5, y - 4, 3, 4, T); rect(x + 3, y - 4, 3, 4, T); rect(x - 1, y - 1, 2, 2, K); rect(x + 4, y + 3, 2, 2, S_TAN); }
  else if (k === 2) { rect(x - 4, y - 3, 9, 7, R); rect(x - 7, y - 4, 4, 4, O); rect(x + 4, y - 4, 4, 4, O); rect(x - 2, y - 2, 2, 2, Y); rect(x + 1, y - 2, 2, 2, Y); }
  else { const q = w * 1; rect(x - 12, y - 10, 25, 18, Y); rect(x - 20, y - 14 + q, 10, 10, O); rect(x + 11, y - 14 + q, 10, 10, O); rect(x - 6, y - 7, 4, 4, W); rect(x + 3, y - 7, 4, 4, W); rect(x - 4, y + 3, 9, 3, R); rect(x - 14, y - 14, 3, 5, W); rect(x + 12, y - 14, 3, 5, W); }
}
const S_TAN = S_COL();
function S_COL() { return 10; }
const GAME = kit({
  id:'g26', t1:'PET QUEST', t2:'99', sub:'HATCH PETS. BREAK ROCKS. GO HUGE.', seed:26, off:26, secs:50,
  music:MUS(132, -22, false),
  setup(S) {
    S.h = { x:150, y:120, fx:0, fy:1, sw:0, cd:0 }; S.hist = []; S.ht = 0; S.coins = 0; S.eggs = 0; S.pets = []; S.rocks = []; S.coinFx = []; S.hat = 0; S.hatK = 0;
    S.boss = null; S.gold = 0; S.endT = 0; S.beam = 0;
    for (let i = 0; i < 12; i++) rock26(S);
  },
  step(S, dt, inp) {
    const h = S.h, dx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), dy = (inp.d ? 1 : 0) - (inp.u ? 1 : 0), busy = S.hat > 0;
    S.beam -= dt; h.cd -= dt; h.sw -= dt;
    if (!busy && (dx || dy)) { const m = dx && dy ? 0.71 : 1; h.x = clamp(h.x + dx * 62 * m * dt, 8, 246); h.y = clamp(h.y + dy * 62 * m * dt, 32, 196); h.fx = dx; h.fy = dy; }
    S.ht -= dt; if (S.ht <= 0) { S.ht = 0.06; S.hist.unshift({ x:h.x, y:h.y }); if (S.hist.length > 80) S.hist.pop(); }
    if (S.edge(inp, 'b') && h.cd <= 0 && !busy) {
      h.cd = 0.3; h.sw = 0.2; sfx('tick'); const sx = h.x + h.fx * 12, sy = h.y + h.fy * 12;
      for (const r of S.rocks) if (Math.hypot(r.x - sx, r.y - sy) < 16) r.hp -= 2;
      if (S.boss && Math.hypot(S.boss.x - sx, S.boss.y - sy) < 28) S.boss.hp -= 2;
    }
    const nearTent = Math.hypot(h.x - ST26.x, h.y - ST26.y) < 26;
    if (S.edge(inp, 'a') && nearTent && !busy && S.coins >= cost26(S) && !S.boss?.dying) { S.coins -= cost26(S); S.hat = 0.9; S.hatK = S.eggs === 4 ? 3 : (rint(S, 10) < 6 ? 0 : rint(S, 10) < 6 ? 1 : 2); S.eggs++; sfx('power'); }
    if (S.hat > 0) { S.hat -= dt; if (S.hat <= 0) {
      S.pets.push({ k:S.hatK }); popup(S, (S.hatK === 3 ? 'HUGE ' : '') + PN26[S.hatK] + '!', ST26.x - 20, ST26.y - 20, S.hatK === 3 ? Y : PK); sfx(S.hatK === 3 ? 'boom' : 'catch');
      if (S.eggs === 3) { S.boss = { x:30, y:110, hp:300, dying:0 }; popup(S, 'DEMON LORD!', 128, 110, R); } } }
    for (let i = S.rocks.length - 1; i >= 0; i--) {
      const r = S.rocks[i]; r.hf -= dt;
      for (let j = 0; j < S.pets.length; j++) { const p = S.hist[(j + 1) * 5]; if (p && S.pets[j].k < 3 && Math.hypot(p.x - r.x, p.y - r.y) < 28 && S.T * 10 % 12 < dt * 10) r.hp -= PP26[S.pets[j].k] * 0.4; }
      if (r.hp <= 0) { const v = r.chest ? 30 : 8; S.coins += v; S.score += v * 10; sfx('coin'); popup(S, '+' + v, r.x, r.y - 6, Y); S.rocks.splice(i, 1); S.rf = (S.rf || []).concat([S.T + 2]); }
    }
    if (S.rf) for (let i = S.rf.length - 1; i >= 0; i--) if (S.T > S.rf[i]) { S.rf.splice(i, 1); rock26(S); }
    const bs = S.boss;
    if (bs) {
      let dmg = 0; for (const p of S.pets) dmg += PP26[p.k] * (p.k === 3 ? 1 : 0.4);
      if (!bs.dying) { bs.hp -= dmg * dt * 6; const d = Math.hypot(h.x - bs.x, h.y - bs.y); bs.x += (h.x - bs.x) / (d || 1) * 9 * dt; bs.y += (h.y - bs.y) / (d || 1) * 9 * dt; if (d < 22 && S.T % 2 < dt) { S.coins = Math.max(0, S.coins - 6); popup(S, 'OUCH -6', h.x, h.y - 10, R); sfx('die'); } }
      if (S.pets.some(p => p.k === 3)) S.beam = 1;
      if (bs.hp <= 0 && !bs.dying) { bs.dying = 1; sfx('boom'); popup(S, 'VAPORIZED!', 128, 90, Y); }
      if (bs.dying) { bs.dying += dt; if (bs.dying > 1.6) return finish(S, 'GOLDEN VICTORY!', 1000 + S.coins * 5); }
    }
    if (!S.att && S.T > 90) return finish(S, 'TIME UP');
  },
  draw(S) {
    clear(GR);
    for (let i = 0; i < 40; i++) { const x = hash(i, 3) % 250, y = 24 + hash(i, 9) % 190; rect(x, y, 3, 1, F); px(x + 1, y - 1, F); }
    rect(0, 24, VW, 6, S_TAN); for (let x = 0; x < VW; x += 8) rect(x, 24, 2, 6, T);
    for (let i = 0; i < 3; i++) { rect(10 + i * 34, 30, 26, 18, BRK); rect(8 + i * 34, 24, 30, 8, R); rect(20 + i * 34, 38, 6, 10, T); }
    rect(ST26.x - 16, ST26.y - 6, 32, 20, W); rect(ST26.x - 18, ST26.y - 14, 36, 8, R); rect(ST26.x - 18, ST26.y - 14, 12, 8, W); rect(ST26.x + 6, ST26.y - 14, 12, 8, W);
    const sh = S.hat > 0 ? Math.round(Math.sin(S.T * 40) * 2) : 0; fillCircle(ST26.x + sh, ST26.y + 4, 6, S.hat > 0 ? PK : CY); px(ST26.x - 2 + sh, ST26.y + 1, W);
    for (const r of S.rocks) { if (r.chest) { rect(r.x - 7, r.y - 5, 14, 10, T); rect(r.x - 7, r.y - 5, 14, 4, S_TAN); rect(r.x - 2, r.y - 1, 4, 4, Y); } else { rect(r.x - 7, r.y - 5, 14, 11, L); rect(r.x - 5, r.y - 7, 10, 3, L); px(r.x - 3, r.y, Y); px(r.x + 2, r.y + 2, Y); px(r.x + 1, r.y - 3, Y); rect(r.x - 7, r.y + 4, 14, 2, D); } }
    const h = S.h, bs = S.boss;
    if (bs && bs.dying < 1.4) { const f = bs.dying ? (S.T * 30 & 1) : 0; rect(bs.x - 20, bs.y - 18, 40, 40, f ? W : PU); rect(bs.x - 24, bs.y - 26, 8, 12, R); rect(bs.x + 16, bs.y - 26, 8, 12, R); rect(bs.x - 12, bs.y - 8, 8, 6, Y); rect(bs.x + 4, bs.y - 8, 8, 6, Y); rect(bs.x - 10, bs.y + 8, 20, 4, K); }
    for (let j = S.pets.length - 1; j >= 0; j--) { const p = S.hist[(j + 1) * 5] || h, k = S.pets[j].k; pet26(k, p.x, p.y, j % 2 ? GR : CY, Math.sin(S.T * 10) * 2); if (S.beam > 0 && k === 3 && bs && !bs.dying) for (let t = 0; t < 14; t++) rect(p.x + (bs.x - p.x) * t / 14, p.y + (bs.y - p.y) * t / 14, 4, 4, t & 1 ? Y : W); }
    rect(h.x - 4, h.y - 8, 8, 4, B); rect(h.x - 3, h.y - 5, 6, 5, S_TAN); rect(h.x - 4, h.y, 8, 7, R); rect(h.x - 4, h.y + 7, 3, 2, K); rect(h.x + 1, h.y + 7, 3, 2, K);
    if (h.sw > 0) { const sx = h.x + h.fx * 11, sy = h.y + h.fy * 11; rect(sx - 4, sy - 4, 8, 8, W); rect(sx - 2, sy - 2, 4, 4, CY); }
    rect(0, 0, VW, 18, N); rect(0, 18, VW, 1, W);
  },
  hud(S) {
    txt('COINS ' + String(S.coins).padStart(4, '0'), 4, 5, Y, 8); txt('PETS ' + S.pets.length, 252, 5, CY, 8, 'right');
    const nt = Math.hypot(S.h.x - ST26.x, S.h.y - ST26.y) < 26, ok = S.coins >= cost26(S);
    txt('EGG ' + cost26(S), ST26.x, ST26.y + 18, ok ? Y : L, 8, 'center'); if (nt && ok) txt('A: HATCH!', ST26.x - 10, ST26.y - 24, W, 8, 'center');
    if (S.boss && !S.boss.dying) { rect(60, 21, 136, 5, K); rect(61, 22, Math.max(0, Math.round(134 * S.boss.hp / 300)), 3, R); }
    txt('B SWING  A HATCH AT TENT', 128, 208, W, 8, 'center');
  },
  bot(S, i) {
    const h = S.h; let tx, ty, go = 0;
    if (S.hat > 0 || (S.boss && S.boss.dying)) return i;
    if (S.coins >= cost26(S) && S.eggs < 5) { tx = ST26.x; ty = ST26.y + 14; if (Math.hypot(h.x - ST26.x, h.y - ST26.y) < 22) { i.a = 1; return i; } }
    else {
      let bd = 1e9; for (const r of S.rocks) { const d = Math.hypot(r.x - h.x, r.y - h.y) + (S.boss ? Math.max(0, 50 - Math.hypot(r.x - S.boss.x, r.y - S.boss.y)) * 2 : 0); if (d < bd) { bd = d; tx = r.x; ty = r.y; } }
      if (tx === undefined) return i;
      if (Math.hypot(tx - h.x, ty - h.y) < 15) { i.b = 1; if (Math.abs(tx - h.x) > 2) i.r = tx > h.x ? 1 : 0, i.l = tx < h.x ? 1 : 0; return i; }
    }
    if (tx - h.x > 3) i.r = 1; if (tx - h.x < -3) i.l = 1; if (ty - h.y > 3) i.d = 1; if (ty - h.y < -3) i.u = 1;
    return i;
  },
  info(S) { return { coins:S.coins, eggs:S.eggs, pets:S.pets.map(p => p.k).join(''), boss:S.boss ? Math.round(S.boss.hp) : -1 }; },
});
