/* ===== MORPH CLIMB: Metroid x Kid Icarus. Each layer needs a suit form; grab the form on its floor, climb before the lava. ===== */
const NP8 = 10, YP8 = Array.from({ length: NP8 + 1 }, (_, i) => 24 + i * 46);
const FORMS8 = { man:{ w:8, h:14 }, ball:{ w:5, h:6 }, wing:{ w:8, h:12 }, beam:{ w:8, h:14 } };
const NEED8 = { open:null, slot:'ball', brick:'beam', wing:'wing' };
const PICK8 = { slot:'ball', brick:'beam', wing:'wing' };
let P8, L8, PK8, lava8, cam8, score8, lives8, att8, rng8, T8, layerDone8, maxY8;

function popup8(s, x, y, col) { pops8.push({ s, x, y, col, t:0 }); if (pops8.length > 4) pops8.shift(); }
let pops8 = [];
function setup8(isAtt) {
  att8 = !!isAtt; rng8 = mkRng(runSeed(isAtt ? 61 : null, 15));
  L8 = []; PK8 = []; layerDone8 = []; pops8 = [];
  for (let j = 0; j < NP8; j++) {
    const r = rng8(), t = j < 1 ? 'open' : r < 0.25 ? 'open' : r < 0.5 ? 'slot' : r < 0.75 ? 'brick' : 'wing';
    const ox = 40 + Math.floor(rng8() * 176);
    L8.push({ t, ox, ow:t === 'slot' ? 7 : 40, open:t === 'open' || t === 'slot' });
    layerDone8.push(false);
    if (PICK8[t]) PK8.push({ j, k:PICK8[t], x:ox < 128 ? 196 : 56, taken:false });
  }
  P8 = { x:124, y:YP8[0], vy:0, form:'man', owned:['man'], ground:true, cur:0, fcd:0, bp:false, ju:false, act:0 };
  lava8 = -22; score8 = 0; lives8 = 3; T8 = 0; maxY8 = 0; cam8 = 0;
}
function solidAt8(j, x0, w) {
  const l = L8[j];
  if (!l.open) return true;
  return !(x0 >= l.ox - l.ow / 2 && x0 + w <= l.ox + l.ow / 2);
}
function phys8(dt, inp) {
  const p = P8, f = FORMS8[p.form];
  const mv = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
  p.x = clamp(p.x + mv * 70 * dt, 0, 256 - f.w);
  if (inp.pb && !p.bp) { const o = p.owned; p.form = o[(o.indexOf(p.form) + 1) % o.length]; sfx('tick'); }
  p.bp = !!inp.pb;
  p.fcd = Math.max(0, p.fcd - dt); p.act = Math.max(0, p.act - dt);
  const prevY = p.y;
  if (p.form === 'wing') {
    if (inp.u && p.fcd <= 0) { p.vy = 150; p.fcd = 0.16; sfx('flap'); }
    p.vy = Math.max(-130, p.vy - 300 * dt);
  } else {
    p.vy -= 480 * dt;
    if (inp.u && !p.ju && p.ground) { p.vy = 236; p.ground = false; sfx('jump'); }
  }
  p.ju = !!inp.u;
  let ny = p.y + p.vy * dt;
  if (p.form !== 'wing' && p.vy > 0) {
    const pt = prevY + f.h, nt = ny + f.h;
    for (let j = 0; j < NP8; j++) { const Lb = YP8[j] + 14; if (pt <= Lb && nt > Lb && solidAt8(j, p.x, f.w)) { ny = Lb - f.h; p.vy = 0; break; } }
  }
  p.y = ny;
  if (p.vy <= 0) {
    let land = -1;
    for (let j = 0; j <= NP8; j++) if (prevY >= YP8[j] - 0.01 && ny <= YP8[j]) land = j;
    if (land >= 0) { p.y = YP8[land]; p.vy = 0; p.ground = true; p.cur = land; }
  }
  if (p.y > maxY8) maxY8 = p.y;
  for (const k of PK8) if (!k.taken && p.ground && p.cur === k.j && Math.abs(p.x + f.w / 2 - k.x) < 10) {
    k.taken = true; if (!p.owned.includes(k.k)) p.owned.push(k.k); score8 += 100; sfx('coin'); popup8(k.k.toUpperCase() + '!', k.x, YP8[k.j] - 12, Y);
  }
  for (let j = 0; j < NP8; j++) if (!layerDone8[j] && p.y >= YP8[j] + 30) { layerDone8[j] = true; score8 += 50; sfx('clear'); }
  if (p.form === 'beam' && inp.pa && p.act <= 0 && p.ground && L8[p.cur] && L8[p.cur].t === 'brick') {
    const l = L8[p.cur]; l.t = 'open'; l.open = true; l.ow = 16; l.ox = clamp(p.x + 4, 20, 236); p.act = 0.4; sfx('boom'); popup8('BLAST!', p.x, YP8[p.cur] + 20, CY);
  }
}
const GAME = {
  id:'g8', t1:'MORPH', t2:'CLIMB', sub:'CHANGE FORM. BEAT THE LAVA.',
  music:{ bpm:146, lead:'square', chords:[{ root:-24, tones:[0, 4, 7] }, { root:-21, tones:[0, 3, 7] }, { root:-19, tones:[0, 4, 7] }, { root:-26, tones:[0, 3, 7] }],
          arp:[0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1, 0, 2, 1, -1], bass:[0, 3, 6, 8, 11, 14], snare:[4, 12], kick:[0, 6, 8, 10], hat:true },
  init(isAtt) { setup8(isAtt); },
  update(dt, inp, mode) {
    att8 = mode === 'title'; T8 += dt;
    if (att8 && T8 > 90) { setup8(true); return; }
    for (let i = pops8.length - 1; i >= 0; i--) { pops8[i].t += dt; if (pops8[i].t > 1.2) pops8.splice(i, 1); }
    phys8(dt, inp);
    const p = P8;
    lava8 += dt * (4 + 0.05 * T8);
    cam8 = Math.max(0, p.y - 90);
    if (p.y < lava8) {
      lives8--; sfx(lives8 <= 0 ? 'die' : 'hurt'); popup8('LAVA!', 128, 60, R);
      if (lives8 <= 0) { if (att8) setup8(true); else endGame(Math.floor(maxY8) + score8, 'BURNED'); return; }
      p.x = 124; p.y = YP8[p.cur]; p.vy = 0; p.ground = true; lava8 = Math.max(lava8 - 30, YP8[p.cur] - 80);
    }
    if (p.cur === NP8 && p.ground) { if (att8) setup8(true); else endGame(Math.floor(maxY8) + score8 + lives8 * 200, 'SUMMIT FINISH!'); }
  },
  render() {
    clear(N);
    for (let y = 0; y < VH; y += 8) rect(0, y, VW, 1, (hash(0, y) > 0.7) ? K : N);
    for (let j = 0; j <= NP8; j++) { const sy = 200 - (YP8[j] - cam8); rect(0, sy, VW, 3, GR); rect(0, sy, VW, 1, S); }
    for (let j = 0; j < NP8; j++) {
      const l = L8[j], top = 200 - (YP8[j] + 30 - cam8), h = 16;
      const col = l.t === 'wing' ? CY : l.t === 'brick' ? BRK : l.t === 'slot' ? O : DG;
      if (!l.open) rect(0, top, VW, h, col);
      else { rect(0, top, Math.max(0, l.ox - l.ow / 2), h, col); rect(l.ox + l.ow / 2, top, VW, h, col); }
      for (let x = 0; x < VW; x += 16) rect(x, top + 6, 1, 4, M);
    }
    for (const k of PK8) if (!k.taken) {
      const sy = 200 - (YP8[k.j] - cam8), c = k.k === 'ball' ? Y : k.k === 'wing' ? CY : R, bob = Math.floor(T8 * 4) & 1;
      rect(k.x - 4, sy - 9 - bob, 9, 9, c); rect(k.x - 2, sy - 7 - bob, 5, 5, W);
    }
    drawForm8();
    rect(0, 200 - (lava8 - cam8), VW, 24 + (lava8 - cam8), R);
    for (let x = 0; x < VW; x += 12) rect(x + ((T8 * 30) | 0) % 12, 200 - (lava8 - cam8) + 1, 6, 2, O);
  },
  hud(mode) {
    txt('HEIGHT ' + String(Math.min(100, Math.floor(maxY8 / YP8[NP8] * 100))) + '%', 4, 4, W, 8);
    txt(P8.form.toUpperCase(), 252, 4, Y, 8, 'right');
    for (let i = 0; i < Math.max(0, lives8); i++) rect(6 + i * 10, 16, 6, 6, R);
    for (const p of pops8) txt(p.s, clamp(Math.round(p.x), 24, 232), Math.round(p.y - p.t * 12), p.col, 8, 'center');
  },
  info() { return { score:score8, height:Math.floor(maxY8), lives:lives8, form:P8.form, cur:P8.cur, owned:P8.owned.join('+'), lt:(L8[P8.cur] || {}).t, lox:(L8[P8.cur] || {}).ox, px:+P8.x.toFixed(1), act:+P8.act.toFixed(2), pk:PK8.filter(k => k.j === P8.cur).map(k => k.k + (k.taken ? ':t' : ':n')).join(',') }; },
  bot() {
    const i = { l:0, r:0, u:0, d:0, a:0, b:0, pa:0, pb:0, start:0 }, p = P8, f = FORMS8[p.form], j = p.cur;
    if (j >= NP8) return i;
    const l = L8[j], need = NEED8[l.t], pk = PK8.find(k => k.j === j && !k.taken);
    const wantPk = !!pk && !p.owned.includes(pk.k);
    if (!wantPk && need && p.owned.includes(need) && p.form !== need && !p.bp) i.pb = 1;
    const tx = wantPk ? pk.x : (l.open ? l.ox - f.w / 2 : p.x), dx = tx - p.x;
    if (Math.abs(dx) > 0.6) { if (dx > 0) i.r = 1; else i.l = 1; }
    if (wantPk) return i;
    if (p.form === 'wing') { if (p.y < YP8[j + 1] - 8) i.u = 1; return i; }
    if (p.form === 'beam' && l.t === 'brick' && p.ground && p.act <= 0) { i.pa = 1; return i; }
    const inWin = p.x >= l.ox - l.ow / 2 && p.x + f.w <= l.ox + l.ow / 2;
    if (l.open && p.ground && !p.ju && inWin && (!need || p.form === need)) i.u = 1;
    return i;
  },
};
function drawForm8() {
  const p = P8, f = FORMS8[p.form], sy = 200 - (p.y - cam8), sx = Math.round(p.x);
  if (p.form === 'ball') { fillCircle(sx + 3, sy - 3, 3, Y); rect(sx + 1, sy - 4, 2, 1, W); return; }
  const top = sy - f.h;
  rect(sx + 2, top + 1, 4, 4, S); rect(sx + 2, top, 4, 2, K);
  rect(sx + 1, top + 5, 6, 5, R); rect(sx + 2, top + 10, 2, f.h - 10, B); rect(sx + 5, top + 10, 2, f.h - 10, B);
  if (p.form === 'wing') { rect(sx - 4, top + 3, 4, 2, W); rect(sx + 8, top + 3, 4, 2, W); }
  if (p.form === 'beam') rect(sx + 8, top + 6, 4, 2, K);
}
