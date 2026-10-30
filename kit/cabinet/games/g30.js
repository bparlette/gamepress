// KEYS: ARROWS MOVE, A = SELL / PUNCH, B = KICK (KEEP THE CRATE SAFE)
function guy30(x, y, col, face, hurt, atk) {
  x = Math.round(x); y = Math.round(y);
  if (hurt > 0 && (Math.floor(hurt * 20) & 1)) col = W;
  rect(x - 4, y - 14, 8, 8, S); rect(x - 4, y - 16, 8, 3, col === W ? W : K); rect(x - 5, y - 6, 10, 10, col); rect(x - 4, y + 4, 3, 7, B); rect(x + 1, y + 4, 3, 7, B);
  rect(x + face * 5, y - (atk > 0 ? 8 : 3), 4 * face > 0 ? 5 : -5, 3, S); px(x + face * 2, y - 11, K);
}
const GAME = kit({
  id:'g30', t1:'RIVER CITY', t2:'CARTEL', sub:'BREW. DEAL. BRAWL.', seed:3030, off:30, secs:60,
  music:MUS(124, -22, true),
  setup(S) { S.ph = 0; S.pt = 0; S.cash = 0; S.stock = 0; S.hp = 12; S.p = { x:80, y:160, f:1, cd:0, hurt:0, atk:0 }; S.cust = []; S.th = []; S.sold = 0; S.sp = 1; S.k = 0; S.end = 0; },
  step(S, dt, inp) {
    const p = S.p; S.pt += dt; p.cd -= dt; p.hurt -= dt; p.atk -= dt;
    if (S.end > 0) { S.end -= dt; if (S.end <= 0) return S.msg === 'CARTEL CLEARED' ? finish(S, S.msg, 500 + S.cash) : (S.att ? 'reset' : endGame(S.score, S.msg)); return; }
    if (S.ph === 0) { const n = Math.min(4, Math.floor(S.pt / 2)); if (n > S.stock) { S.stock = n; sfx('pop'); popup(S, 'BATCH +1', 128, 120); } if (S.pt > 9) { S.ph = 1; S.pt = 0; sfx('go'); } return; }
    const vx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), vy = (inp.d ? 1 : 0) - (inp.u ? 1 : 0);
    if (vx) p.f = vx; if (p.atk < 0.1) { p.x = clamp(p.x + vx * 55 * dt, 10, 246); p.y = clamp(p.y + vy * 40 * dt, 130, 186); }
    if (S.ph === 1) {
      if (S.cust.length < 3 && S.pt > 0.5 + S.cust.length * 4) S.cust.push({ x:260, y:140 + rint(S, 40), v:0 });
      for (const c of S.cust) { if (c.x > 150 + c.y % 30) c.x -= 40 * dt; if (c.gone) c.x -= 60 * dt; }
      if (inp.pa) for (const c of S.cust) if (!c.gone && Math.abs(c.x - p.x) < 24 && Math.abs(c.y - p.y) < 12) { c.gone = 1; S.sold++; S.cash += 40; S.score += 40; S.stock--; sfx('coin'); popup(S, '+$40 SOLD', c.x, c.y - 24, GR); }
      if (S.sold >= 3 && S.cust.every(c => c.gone)) { S.ph = 2; S.pt = 0; sfx('power'); popup(S, 'AMBUSH!', 128, 90, R); S.stock = 1; for (let i = 0; i < 3; i++) S.th.push({ x:270 + i * 70, y:140 + i * 18, hp:4, vx:0, cd:1, hurt:0, down:false }); }
      return;
    }
    if (p.cd <= 0 && (inp.pa || inp.pb)) {
      const kick = !inp.pa; p.cd = kick ? 0.5 : 0.28; p.atk = 0.2; sfx(kick ? 'swing' : 'punch');
      for (const t of S.th) if (!t.down && Math.abs(t.y - p.y) < 10 && (t.x - p.x) * p.f > -4 && (t.x - p.x) * p.f < 20) { t.hp -= kick ? 2 : 1; t.hurt = 0.3; t.vx = p.f * (kick ? 170 : 60); S.score += 25; sfx('hit'); }
    }
    for (const t of S.th) {
      if (t.down) continue;
      t.hurt -= dt; t.cd -= dt;
      if (Math.abs(t.vx) > 5) { t.x += t.vx * dt; t.vx *= 1 - 3 * dt; if (t.x < 10 || t.x > 250) { t.x = clamp(t.x, 10, 250); t.vx = -t.vx * 0.5; t.hp--; sfx('boom'); popup(S, 'BOUNCE!', t.x, t.y - 22, Y); } }
      else {
        const tgt = dist(t, p) < 90 ? p : { x:28, y:t.y }, dx = tgt.x - t.x, dy = tgt.y - t.y;
        if (Math.abs(dx) > 12) t.x += Math.sign(dx) * 26 * dt; if (Math.abs(dy) > 3) t.y += Math.sign(dy) * 18 * dt;
        if (t.cd <= 0 && Math.abs(dx) < 16 && Math.abs(dy) < 8) {
          t.cd = 1.3;
          if (tgt === p) { if (p.hurt <= 0) { S.hp--; p.hurt = 0.4; sfx('hurt'); } } else { S.stock--; sfx('hurt'); popup(S, 'THEY GRABBED ONE!', 128, 100, R); t.cd = 3; }
        }
      }
      if (t.hp <= 0) { t.down = true; S.k++; sfx('boom'); }
    }
    if (S.stock <= 0) { S.end = 1.5; S.msg = 'CRATE STOLEN'; } else if (S.hp <= 0) { S.end = 1.5; S.msg = 'KNOCKED OUT'; }
    else if (S.th.length && S.th.every(t => t.down)) { S.end = 2.2; S.msg = 'CARTEL CLEARED'; popup(S, 'UPGRADE UNLOCKED!', 128, 110, Y); sfx('win'); }
  },
  draw(S) {
    if (S.ph === 0) {
      clear(DG); rect(0, 150, 256, 50, M); rect(0, 0, 256, 6, K);
      for (let i = 0; i < 4; i++) rect(20 + i * 60, 20, 20, 30, T);
      rect(88, 70, 80, 80, S === 0 ? K : L); rect(92, 74, 72, 40, SKY); rect(100, 118, 56, 24, N); const b = Math.floor(S.pt * 8);
      for (let i = 0; i < 5; i++) fillCircle(110 + i * 9, 100 - ((b * 3 + i * 7) % 24), 3, i % 2 ? CY : W);
      for (let i = 0; i < S.stock; i++) rect(190 + i * 12, 160, 10, 12, O);
      guy30(60, 170, W, 1, 0, 0); return;
    }
    clear(N); rect(0, 0, 256, 118, BRK); for (let x = 0; x < 256; x += 16) for (let y = 0; y < 118; y += 8) rect(x + (y & 8 ? 8 : 0), y, 1, 8, M);
    rect(30, 30, 24, 30, K); rect(30, 30, 24, 4, R); rect(150, 24, 30, 38, B); rect(0, 118, 256, 82, DG); rect(0, 118, 256, 3, L);
    for (let x = 0; x < 256; x += 32) rect(x, 150, 16, 2, L);
    rect(228, 124, 16, 22, GR); rect(226, 122, 20, 3, L);
    rect(8, 160, 14, 14, O); rect(8, 160, 14, 3, Y);
    const all = [S.p].concat(S.th.filter(t => !t.down), S.cust).sort((a, b) => a.y - b.y);
    for (const o of all) { if (o === S.p) guy30(o.x, o.y, CY, o.f, o.hurt, o.atk); else if (o.hp !== undefined) guy30(o.x, o.y, R, o.vx ? -Math.sign(o.vx) : -1, o.hurt, 0); else guy30(o.x, o.y, o.gone ? GR : PU, -1, 0, 0); }
    for (const t of S.th) if (t.down) { rect(t.x - 8, t.y + 4, 16, 5, R); rect(t.x + 6, t.y + 2, 4, 4, S); }
  },
  hud(S) {
    txt('CASH $' + S.cash, 4, 4, GR, 8); txt('CRATE ' + S.stock, 252, 4, O, 8, 'right'); for (let i = 0; i < S.hp; i++) rect(4 + i * 7, 16, 5, 5, R);
    txt(S.ph === 0 ? 'COOKING THE FIZZ...' : S.ph === 1 ? 'A: SELL TO CUSTOMER' : 'A PUNCH  B KICK  PROTECT THE CRATE', 128, 206, W, 8, 'center');
    if (S.ph === 2) txt('GANG ' + S.th.filter(t => !t.down).length, 128, 4, R, 8, 'center');
  },
  info(S) { return { px:Math.round(S.p.x), py:Math.round(S.p.y), cy:S.cust.length ? Math.round(S.cust[0].y) : 0, ph:S.ph, hp:S.hp, stock:S.stock, sold:S.sold, k:S.k, msg:S.msg }; },
  bot(S, i) {
    const p = S.p; if (S.end > 0 || S.ph === 0) return i;
    let tg = null, bd = 1e9;
    if (S.ph === 1) { for (const c of S.cust) if (!c.gone && c.x < 270) { const d = Math.abs(c.x - p.x) + Math.abs(c.y - p.y); if (d < bd) { bd = d; tg = c; } } }
    else for (const t of S.th) if (!t.down) { const d = Math.abs(t.x - p.x) + Math.abs(t.y - p.y); if (d < bd) { bd = d; tg = t; } }
    if (!tg) { if (S.ph === 1 && p.x > 90) i.l = 1; return i; }
    const dx = tg.x - p.x, dy = tg.y - p.y;
    if (Math.abs(dy) > 4) { if (dy > 0) i.d = 1; else i.u = 1; }
    if (S.ph === 1) { if (Math.abs(dx) > 16) { if (dx > 0) i.r = 1; else i.l = 1; } else i.pa = 1; return i; }
    if (Math.abs(dx) > 14) { if (dx > 0) i.r = 1; else i.l = 1; }
    else if (dx * p.f < 0) { if (dx > 0) i.r = 1; else i.l = 1; }
    else if (Math.abs(dy) < 8) { if (Math.floor(S.T * 3) % 3 === 0) i.pb = 1; else i.pa = 1; }
    return i;
  },
});
