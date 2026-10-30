// KEYS: ARROWS MOVE + AIM, A = SHOOT YOUR ONE ARROW AT THE KILLER
const CO28 = [R, GR, B, PU];
function hero28(x, y, c, dead, glow) {
  x = Math.round(x); y = Math.round(y);
  if (dead) { rect(x - 5, y + 2, 10, 5, c); rect(x - 7, y, 3, 3, S); px(x + 3, y + 4, R); return; }
  rect(x - 4, y - 3, 8, 9, glow ? W : c); rect(x - 3, y - 8, 6, 5, S); rect(x - 4, y - 10, 8, 3, c); rect(x - 4, y + 6, 3, 2, K); rect(x + 1, y + 6, 3, 2, K);
}
const GAME = kit({
  id:'g28', t1:'FOUR SWORDS', t2:'MURDER', sub:'ONE ARROW. ONE KILLER.', seed:2828, off:28, secs:60,
  music:MUS(132, -24, true),
  setup(S) {
    S.pl = { x:128, y:130, fx:0, fy:-1 }; S.n = []; S.kills = 0; S.st = 0; S.used = false; S.arrow = null; S.end = 0; S.msg = ''; S.m = rint(S, 8);
    for (let i = 0; i < 8; i++) S.n.push({ x:30 + rint(S, 196), y:50 + rint(S, 130), tx:0, ty:0, wt:rng0(S), col:CO28[i % 4], alive:true });
    for (const n of S.n) { n.tx = n.x; n.ty = n.y; }
  },
  step(S, dt, inp) {
    const p = S.pl, m = S.n[S.m];
    if (S.end > 0) { S.end -= dt; if (S.end <= 0) return S.msg === 'CASE CLEARED' ? finish(S, S.msg) : (S.att ? 'reset' : endGame(S.score, S.msg)); return; }
    const vx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), vy = (inp.d ? 1 : 0) - (inp.u ? 1 : 0);
    if (vx || vy) { const h = Math.hypot(vx, vy); p.fx = vx / h; p.fy = vy / h; p.x = clamp(p.x + p.fx * 60 * dt, 10, 246); p.y = clamp(p.y + p.fy * 60 * dt, 36, 190); }
    if (inp.pa && !S.used) {
      S.used = true; let ax = p.fx, ay = p.fy;
      const dx = m.x - p.x, dy = m.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (m.alive && (dx * ax + dy * ay) / d > 0.82) { ax = dx / d; ay = dy / d; }
      S.arrow = { x:p.x, y:p.y, vx:ax * 240, vy:ay * 240, t:0 }; sfx('shoot');
    }
    for (const n of S.n) {
      if (!n.alive) continue;
      const chase = n === m && S.st === 1;
      let victim = null;
      if (n === m && S.st === 0 && S.kills < 2 && S.T > 7 + S.kills * 9) { let bd = 1e9; for (const o of S.n) if (o !== m && o.alive && dist(o, m) < bd) { bd = dist(o, m); victim = o; } }
      if (victim) { n.tx = victim.x; n.ty = victim.y; n.wt = 0; if (dist(n, victim) < 7) { victim.alive = false; S.kills++; sfx('hit'); popup(S, 'SOMEONE FELL!', victim.x, victim.y - 14, R); } }
      else if (chase) { n.tx = p.x; n.ty = p.y; n.wt = 0; }
      else if (n.wt > 0) { n.wt -= dt; if (n.wt <= 0) { n.tx = 20 + rint(S, 216); n.ty = 44 + rint(S, 140); } continue; }
      const dx = n.tx - n.x, dy = n.ty - n.y, d = Math.hypot(dx, dy), sp = chase ? 66 : victim ? 45 : 22;
      if (d < 3) { n.wt = 0.8 + S.rng() * 1.6; continue; }
      n.x += dx / d * sp * dt; n.y += dy / d * sp * dt;
    }
    if (S.st === 0 && S.kills >= 2 && S.T > 28) { S.st = 1; popup(S, 'HE HAS A KNIFE!', p.x, p.y - 24, R); sfx('power'); }
    if (S.st === 1 && dist(m, p) < 8) { S.end = 1.5; S.msg = 'STABBED'; sfx('hurt'); }
    const a = S.arrow;
    if (a) for (let k = 0; k < 4 && S.arrow; k++) {
      a.x += a.vx * dt / 4; a.y += a.vy * dt / 4; a.t += dt / 4;
      for (const n of S.n) if (n.alive && Math.hypot(n.x - a.x, n.y - a.y) < 8) {
        S.arrow = null;
        if (n === m) { S.score = 1000 - S.kills * 150; S.end = 1.8; S.msg = 'CASE CLEARED'; m.alive = false; sfx('boom'); popup(S, 'GOTCHA!', n.x, n.y - 14, Y); }
        else { n.alive = false; S.end = 1.5; S.msg = 'WRONG TARGET'; sfx('hurt'); }
        break;
      }
      if (S.arrow && (a.t > 0.9 || a.x < 0 || a.x > 256 || a.y < 20 || a.y > 205)) { S.arrow = null; if (m.alive && S.st === 1) { S.end = 1.2; S.msg = 'MISSED'; } }
    }
  },
  draw(S) {
    clear(GR);
    for (let y = 20; y < 200; y += 8) for (let x = 0; x < 256; x += 8) if (hash(x, y) > 0.93) px(x + 3, y + 3, hash(y, x) > 0.5 ? Y : PK);
    rect(0, 20, 256, 6, F); rect(0, 198, 256, 4, F); rect(0, 20, 6, 182, F); rect(250, 20, 6, 182, F);
    rect(100, 80, 56, 40, DG); rect(104, 84, 48, 32, SKY); rect(124, 90, 8, 20, W);
    rect(20, 150, 40, 16, BRK); rect(196, 40, 40, 16, BRK);
    const all = S.n.concat([S.pl]).sort((a, b) => a.y - b.y);
    for (const n of all) {
      if (n === S.pl) { hero28(n.x, n.y, Y, false); px(n.x + n.fx * 8, n.y + n.fy * 8, W); rect(n.x + n.fx * 6, n.y + n.fy * 6, 2, 2, CY); continue; }
      const m = n === S.n[S.m], glow = m && S.st === 0 && S.kills > 0 && (S.T % 2.4) < 0.25;
      hero28(n.x, n.y, n.col, !n.alive, glow);
      if (m && S.st === 1 && n.alive) { rect(n.x + 5, n.y - 2, 2, 8, L); rect(n.x + 5, n.y + 6, 2, 2, R); }
    }
    if (S.arrow) { rect(S.arrow.x - 2, S.arrow.y - 1, 4, 2, W); px(S.arrow.x + Math.sign(S.arrow.vx) * 3, S.arrow.y, Y); }
  },
  hud(S) {
    txt('FELLED ' + S.kills, 4, 4, R, 8); txt(S.used ? 'NO ARROW' : 'ARROW READY', 252, 4, S.used ? DG : Y, 8, 'right');
    txt('ARROWS AIM  A SHOOT (1 ARROW)', 128, 206, W, 8, 'center');
  },
  info(S) { return { m:S.m, mx:Math.round(S.n[S.m].x), kills:S.kills, st:S.st, used:S.used, msg:S.msg }; },
  bot(S, i) {
    const p = S.pl, m = S.n[S.m];
    if (S.end > 0 || S.used) return i;
    if (S.st === 1) {
      const dx = m.x - p.x, dy = m.y - p.y;
      if (Math.abs(dx) > Math.abs(dy) * 0.4) { if (dx > 0) i.r = 1; else i.l = 1; }
      if (Math.abs(dy) > Math.abs(dx) * 0.4) { if (dy > 0) i.d = 1; else i.u = 1; }
      const d = dist(m, p), ux = dx / d, uy = dy / d;
      const clear = S.n.every(n => n === m || !n.alive || (t => t < 0 || t > d || Math.abs((n.x - p.x) * uy - (n.y - p.y) * ux) > 11)((n.x - p.x) * ux + (n.y - p.y) * uy));
      if (d < 60 && clear) i.pa = 1;
    } else if (S.T % 5 < 1.5) i.u = 1;
    return i;
  },
});
function rng0(S) { return 0.2 + S.rng() * 1.5; }
