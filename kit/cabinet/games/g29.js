// KEYS: UP/DOWN PICK SLOT, LEFT/RIGHT CHANGE ITEM, A = STRUT NOW (OR WAIT FOR TIMER)
const CAT29 = ['HAT', 'CLOAK', 'WEAPON', 'COLOR'];
const OPT29 = [['CROWN', 'POINTY', 'HELM', 'BOW'], ['CAPE', 'ROBE', 'PLAIN', 'FUR'], ['SWORD', 'STAFF', 'AXE', 'WAND'], ['WHITE', 'PURPLE', 'RED', 'GOLD']];
const COL29 = [W, PU, R, Y];
function figure29(cx, y, sel, k) {
  const c = COL29[sel[3]], dk = sel[3] === 0 ? L : K;
  const r = (x, yy, w, h, col) => rect(cx + x * k, y + yy * k, w * k, h * k, col);
  if (sel[1] === 0) r(-5, 6, 10, 10, dk);
  if (sel[1] === 1) r(-5, 6, 10, 12, c); else r(-3, 6, 6, 8, c);
  if (sel[1] === 3) { r(-5, 6, 10, 2, W); r(-4, 8, 8, 1, L); }
  r(-3, 8 + (sel[1] === 1 ? 10 : 6), 2, 3, K); r(1, 8 + (sel[1] === 1 ? 10 : 6), 2, 3, K);
  r(-3, 0, 6, 6, S); r(-2, 2, 1, 1, K); r(1, 2, 1, 1, K);
  const h = sel[0];
  if (h === 0) { r(-3, -2, 6, 2, Y); r(-3, -4, 1, 2, Y); r(0, -4, 1, 2, Y); r(2, -4, 1, 2, Y); }
  else if (h === 1) { r(-4, -1, 8, 2, c); r(-2, -3, 4, 2, c); r(-1, -6, 2, 3, c); }
  else if (h === 2) { r(-4, -2, 8, 4, L); r(-1, -3, 2, 1, R); }
  else { r(-3, -1, 6, 1, c); r(-1, -3, 2, 2, PK); r(-4, -3, 2, 2, PK); r(2, -3, 2, 2, PK); }
  const w = sel[2];
  if (w === 0) { r(6, 2, 2, 12, L); r(5, 13, 4, 1, Y); }
  else if (w === 1) { r(6, -2, 1, 16, T); r(5, -4, 3, 3, CY); }
  else if (w === 2) { r(6, 2, 1, 12, T); r(7, 2, 4, 4, L); }
  else { r(6, 4, 1, 8, T); r(5, 2, 3, 2, Y); }
}
function judge29(x, y, n) { rect(x - 8, y, 16, 14, N); rect(x - 6, y - 8, 12, 10, S); rect(x - 4, y - 5, 2, 2, K); rect(x + 2, y - 5, 2, 2, K); rect(x - 3, y, 6, 1, K); rect(x - 7, y - 11, 14, 4, [R, GR, B][n]); }
const GAME = kit({
  id:'g29', t1:'DRESS TO', t2:'QUEST', sub:'PICK THE LOOK. WOW THE JUDGES.', seed:2929, off:29, secs:60,
  music:MUS(116, -17, false),
  setup(S) { S.ph = 0; S.pt = 20; S.sel = [0, 0, 0, 0]; S.cur = 0; S.cd = 0; S.ideal = [0, 1, 2, 3].map(() => rint(S, 4)); S.stars = [0, 0, 0]; S.shown = 0; S.x = 20; S.fl = 0; S.dummy = 100; S.match = 0; },
  step(S, dt, inp) {
    S.pt -= dt;
    if (S.ph === 0) {
      S.cd -= dt;
      if (S.cd <= 0 && (inp.u || inp.d || inp.l || inp.r)) {
        S.cd = 0.2; sfx('tick');
        if (inp.u) S.cur = (S.cur + 3) % 4; else if (inp.d) S.cur = (S.cur + 1) % 4;
        else S.sel[S.cur] = (S.sel[S.cur] + (inp.r ? 1 : 3)) % 4;
      }
      if (S.pt <= 0 || (inp.pa && S.pt < 17)) {
        S.match = S.sel.filter((v, i) => v === S.ideal[i]).length;
        S.stars = [1 + S.match, Math.max(1, 1 + S.match - (S.sel[1] !== S.ideal[1] ? 1 : 0)), Math.max(1, 1 + S.match - (S.sel[2] !== S.ideal[2] ? 1 : 0))];
        S.ph = 1; S.pt = 5; sfx('go');
      }
    } else if (S.ph === 1) {
      S.x = 20 + (5 - S.pt) / 5 * 108; if (S.pt <= 0) { S.ph = 2; S.pt = 5; }
    } else if (S.ph === 2) {
      const n = Math.min(3, Math.floor((5 - S.pt) / 1.2));
      if (n > S.shown) { S.shown = n; sfx('coin'); popup(S, S.stars[n - 1] + ' STARS', 64 + n * 64 - 64, 80, Y); }
      if (S.pt <= 0) { S.ph = 3; S.pt = 9; S.full = S.stars.every(v => v === 5); S.dmg = (S.stars[0] + S.stars[1] + S.stars[2]) * 7; sfx(S.full ? 'super' : 'hit'); }
    } else {
      S.fl += dt; S.dummy = Math.max(0, 100 - Math.min(1, S.fl / 3) * (S.full ? 100 : S.dmg));
      S.score = S.dmg * 40 + S.match * 100;
      if (S.pt <= 0) return finish(S, S.full ? 'FIVE STAR CLEAR' : 'NICE TRY', S.full ? 1000 : 0);
    }
  },
  draw(S) {
    clear(N); rect(0, 0, 20, 200, R); rect(236, 0, 20, 200, R); rect(20, 0, 216, 4, Y);
    rect(20, 150, 216, 50, T); for (let x = 20; x < 236; x += 18) rect(x, 150, 1, 50, M); for (let x = 30; x < 236; x += 30) rect(x, 154, 3, 3, Y);
    if (S.ph === 0) {
      rect(20, 40, 100, 150, B); figure29(70, 80, S.sel, 3);
      for (let i = 0; i < 4; i++) { const y = 62 + i * 30, on = i === S.cur; rect(128, y - 4, 112, 24, on ? M : DG); }
    } else {
      for (let j = 0; j < 3; j++) judge29(64 + j * 64, 30, j);
      const x = S.ph === 1 ? S.x : 128; figure29(S.ph === 3 ? 60 : x, 100 + (S.ph === 1 ? Math.round(Math.abs(Math.sin(S.T * 8)) * 2) : 0), S.sel, 2);
    }
    if (S.ph === 3) {
      if (S.dummy > 0 || S.fl < 3) { rect(188, 120, 8, 40, T); rect(180, 106, 24, 22, Y); rect(190, 160 - 0, 4, 4, M); rect(160, 94, 70 * S.dummy / 100, 4, R); }
      if (S.full && S.fl < 3.2) { const c = [W, Y, CY, PK][Math.floor(S.fl * 14) % 4]; rect(0, 0, 256, 200, c); for (let i = 0; i < 12; i++) rect(0, i * 17 + ((S.fl * 90) % 17), 256, 3, i & 1 ? PU : W); }
    }
  },
  hud(S) {
    if (S.ph === 0) { txt('THEME: ' + OPT29[3][S.ideal[3]] + ' ' + OPT29[0][S.ideal[0]], 128, 6, W, 8, 'center'); txt(OPT29[1][S.ideal[1]] + ' + ' + OPT29[2][S.ideal[2]], 128, 18, W, 8, 'center'); for (let i = 0; i < 4; i++) { const y = 62 + i * 30, on = i === S.cur; txt(CAT29[i], 134, y, on ? Y : L, 8); txt((on ? '< ' : '') + OPT29[i][S.sel[i]] + (on ? ' >' : ''), 134, y + 10, W, 8); }
      txt(Math.ceil(S.pt) + 's', 6, 32, Y, 8); txt('ARROWS PICK   A STRUT', 128, 206, W, 8, 'center'); }
    else if (S.ph === 1) txt('THE RUNWAY!', 128, 206, Y, 8, 'center');
    else if (S.ph === 2) { txt('JUDGES SCORE', 128, 206, Y, 8, 'center'); for (let j = 0; j < S.shown; j++) for (let k = 0; k < 5; k++) txt('*', 40 + j * 64 + k * 8 - 12 + 12, 56, k < S.stars[j] ? Y : DG, 8); }
    else txt(S.full ? 'ULTIMATE SUMMON!' : 'DAMAGE ' + S.dmg, 128, S.full && S.fl < 3 ? 100 : 206, S.full ? R : Y, S.full ? 16 : 8, 'center');
  },
  info(S) { return { ph:S.ph, match:S.match, sel:S.sel.join(''), ideal:S.ideal.join('') }; },
  bot(S, i) {
    if (S.ph !== 0 || S.T < 1.5) return i;
    const w = S.sel.findIndex((v, k) => v !== S.ideal[k]);
    if (w < 0) { if (S.pt < 8) i.pa = 1; return i; }
    if (S.cur !== w) { i.d = 1; return i; }
    i.r = 1; return i;
  },
});
