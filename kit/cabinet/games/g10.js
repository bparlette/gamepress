/* ===== GRIDLOCK GRAND PRIX: Pole Position x Frogger. Weave through traffic at speed; near misses score,
   one tap changes lane, one crash ends the run. One nitro per run. ===== */
const LANES10 = [56, 88, 120, 152], PLAY_Y10 = 170, GOAL10 = 1500;
let cars10, dist10, spd10, lane10, nitro10, nitroT10, spawnT10, score10, att10, rng10, T10, pl10, pops10, prevL10, prevR10, nearSet10;
function popup10(s, x, y, col) { pops10.push({ s, x, y, col, t:0 }); if (pops10.length > 4) pops10.shift(); }
function setup10(isAtt) {
  att10 = !!isAtt; rng10 = mkRng(runSeed(isAtt ? 81 : null, 19));
  cars10 = []; dist10 = 0; spd10 = 70; lane10 = 1; nitro10 = true; nitroT10 = 0; spawnT10 = 0.8; score10 = 0; T10 = 0; pops10 = [];
  prevL10 = prevR10 = false; nearSet10 = new Set();
}
const GAME = {
  id:'g10', t1:'GRIDLOCK', t2:'GRAND PRIX', sub:'WEAVE. NEAR MISS. ONE SHOT.',
  music:{ bpm:168, lead:'square', chords:[{ root:-24, tones:[0, 4, 7] }, { root:-20, tones:[0, 4, 7] }, { root:-22, tones:[0, 3, 7] }, { root:-19, tones:[0, 4, 7] }],
          arp:[0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1], bass:[0, 2, 4, 6, 8, 10, 12, 14], snare:[4, 12], kick:[0, 4, 8, 12], hat:true },
  init(isAtt) { setup10(isAtt); },
  update(dt, inp, mode) {
    att10 = mode === 'title'; T10 += dt;
    if (att10 && T10 > 60) { setup10(true); return; }
    for (let i = pops10.length - 1; i >= 0; i--) { pops10[i].t += dt; if (pops10[i].t > 1.0) pops10.splice(i, 1); }
    if (inp.l && !prevL10 && lane10 > 0) lane10--;
    if (inp.r && !prevR10 && lane10 < 3) lane10++;
    prevL10 = !!inp.l; prevR10 = !!inp.r;
    let target = 70 + (inp.u ? 40 : 0) - (inp.d ? 30 : 0);
    if (nitroT10 > 0) { nitroT10 -= dt; target += 60; }
    if (inp.a && nitro10 && nitroT10 <= 0) { nitro10 = false; nitroT10 = 2; sfx('power'); popup10('NITRO!', 128, 120, Y); }
    spd10 += (target - spd10) * Math.min(1, 2.5 * dt);
    dist10 += spd10 * dt;
    score10 = Math.floor(dist10 / 10);
    spawnT10 -= dt;
    if (spawnT10 <= 0) {
      spawnT10 = 0.45 + rng10() * 0.7;
      const ln = Math.floor(rng10() * 4), v = 25 + Math.floor(rng10() * 45);
      if (!cars10.some(c => c.ln === ln && c.sy < 40)) cars10.push({ ln, sy:-24, v, col:[R, Y, CY, PU, GR][Math.floor(rng10() * 5)] });
    }
    for (let i = cars10.length - 1; i >= 0; i--) {
      const c = cars10[i]; c.sy += (spd10 - c.v) * 0.9 * dt;
      if (c.sy > 250) { cars10.splice(i, 1); continue; }
      const dy = Math.abs(c.sy - PLAY_Y10), key = i + ':' + c.sy.toFixed(0);
      if (c.ln === lane10 && dy < 13) { if (nitroT10 > 0) continue; sfx('boom'); score10 += 0; endGame(score10, 'CRASHED!'); return; }
      if (Math.abs(c.ln - lane10) === 1 && dy < 14 && !nearSet10.has(c)) { nearSet10.add(c); score10 += 50; popup10('NEAR MISS +50', 128, PLAY_Y10 - 26, Y); sfx('coin'); }
      if (c.sy > PLAY_Y10 + 16) nearSet10.delete(c);
    }
    if (dist10 >= GOAL10) { if (att10) setup10(true); else endGame(score10 + 500, 'FINISH!'); }
  },
  render() {
    clear(GR);
    const scroll = (dist10 * 0.8) % 16;
    rect(40, 0, 136, VH, DG);
    for (let y = -16 + scroll; y < VH; y += 16) for (let k = 1; k < 4; k++) rect(LANES10[0] - 16 + k * 32, y, 2, 8, W);
    for (let k = 0; k < 4; k++) rect(LANES10[k] - 16 + 16, 0, 1, VH, K);
    rect(40, 0, 2, VH, W); rect(214, 0, 2, VH, W);
    for (const c of cars10) {
      const x = LANES10[c.ln] - 6, y = Math.round(c.sy);
      rect(x, y, 12, 18, c.col); rect(x + 2, y + 3, 8, 4, CY); rect(x + 1, y + 13, 3, 3, K); rect(x + 8, y + 13, 3, 3, K);
    }
    const x = LANES10[lane10] - 6, y = PLAY_Y10;
    rect(x, y, 12, 18, nitroT10 > 0 ? (Math.floor(T10 * 20) & 1 ? W : R) : R); rect(x + 5, y, 2, 18, Y); rect(x + 2, y + 3, 8, 4, CY); rect(x + 1, y + 13, 3, 3, K); rect(x + 8, y + 13, 3, 3, K);
    rect(0, 200, VW, 24, N); rect(0, 200, VW, 1, W);
  },
  hud(mode) {
    txt('DIST ' + String(Math.min(GOAL10, Math.floor(dist10))).padStart(4, '0') + '/' + GOAL10, 4, 4, W, 8);
    txt('SCORE ' + pad5(score10), 252, 4, Y, 8, 'right');
    txt('SPD ' + Math.round(spd10), 4, 206, CY, 8);
    txt(nitro10 ? 'NITRO READY' : 'NITRO USED', 252, 206, nitro10 ? Y : DG, 8, 'right');
    rect(96, 210, 64, 6, DG); rect(96, 210, Math.round(64 * Math.min(1, dist10 / GOAL10)), 6, Y);
    if (mode === 'play' && T10 < 7) txt('TAP LEFT / RIGHT: CHANGE LANE', 128, 100, W, 8, 'center');
    for (const p of pops10) txt(p.s, p.x, Math.round(p.y - p.t * 14), p.col, 8, 'center');
  },
  info() { return { score:score10, dist:Math.floor(dist10), spd:Math.round(spd10), lane:lane10, nitro:nitro10, cars:cars10.length }; },
  bot() {
    const i = { l:0, r:0, u:0, d:0, a:0, b:0, pa:0, pb:0, start:0 };
    const blocked = ln => cars10.some(c => c.ln === ln && c.sy > PLAY_Y10 - 70 && c.sy < PLAY_Y10 + 14);
    if (blocked(lane10)) {
      const opts = [lane10 - 1, lane10 + 1].filter(l => l >= 0 && l <= 3 && !blocked(l));
      if (opts.length) { const dest = opts[0]; if (dest < lane10) i.l = 1; else i.r = 1; }
      else i.d = 1;
    } else if (!blocked(lane10)) i.u = 1;
    if (nitro10 && nitroT10 <= 0 && dist10 > 300 && !blocked(lane10) && Math.floor(T10) % 9 === 0 && T10 > 1) i.a = 1;
    return i;
  },
};
