// KEYS: LEFT/RIGHT move, A fire, hold B + arrows UP RIGHT DOWN DOWN = 500KG BOMB (hits ahead of you; allies get launched)
/* ===== CONTRA HELLDIVERS: run-and-gun vs a bug hive. Hold B and key a stratagem code to call a bomb. ===== */
const GY20 = 170, HX20 = 760, CODE20 = ['u', 'r', 'd', 'd'];
const GAME = kit({
  id:'g20', t1:'CONTRA', t2:'HELLDIVERS', sub:'CALL IN THE BOMB. KILL THE HIVE.', seed:41, off:20, secs:50,
  music:MUS(156, -26, true),
  setup(S) {
    S.p = { x:20, vy:0, y:0, f:1, hp:3, inv:0, cd:0 }; S.bul = []; S.bug = []; S.bomb = []; S.fx = []; S.hive = 3; S.cam = 0;
    S.al = [{ x:50, rag:0, vx:0, y:0 }, { x:5, rag:0, vx:0, y:0 }]; S.code = []; S.bcd = 0; S.spawn = 1; S.hold = 0; S.prev = {}; S.bots = 0; S.bugT = 0;
  },
  step(S, dt, inp) {
    const p = S.p; p.inv = Math.max(0, p.inv - dt); p.cd -= dt; S.bcd -= dt;
    const e = k => !!inp[k] && !S.prev[k]; const ed = { l:e('l'), r:e('r'), u:e('u'), d:e('d') }; S.prev = Object.assign({}, inp);
    if (inp.b && S.bcd <= 0) {
      for (const k of 'urdl') if (ed[k]) { S.code.push(k); sfx('tick'); }
      if (S.code.length > 4) S.code.shift();
      if (S.code.join('') === CODE20.join('')) { S.code = []; S.bcd = 4; S.bomb.push({ x:p.x + 70, y:-40, t:1.1 }); popup(S, 'BOMB INBOUND!', 128, 60, CY); sfx('power'); }
    } else if (!inp.b) S.code = [];
    if (!inp.b) {
      if (inp.r) { p.x += 46 * dt; p.f = 1; } if (inp.l) { p.x -= 46 * dt; p.f = -1; }
      if (inp.a && p.cd <= 0) { p.cd = 0.16; S.bul.push({ x:p.x + 6 * p.f, y:GY20 - 16, vx:220 * p.f }); sfx('shoot'); }
    }
    p.x = clamp(p.x, 8, HX20 - 30); S.cam = clamp(p.x - 90, 0, HX20 - 170);
    for (const a of S.al) {
      if (a.rag > 0) { a.rag -= dt; a.x += a.vx * dt; a.y = -Math.sin((1 - a.rag / 1.4) * Math.PI) * 60; if (a.rag <= 0) { a.y = 0; a.vx = 0; } continue; }
      a.x += (p.x + (a === S.al[0] ? 52 : -22) - a.x) * Math.min(1, 2 * dt);
    }
    S.spawn -= dt;
    if (S.spawn <= 0 && S.hive > 0) { S.spawn = 0.7 + S.rng() * 0.9; const x = S.cam + 270; if (x < HX20 + 20) S.bug.push({ x:x + rint(S, 30), hp:1, ph:S.bugT++ }); }
    for (const b of S.bul) b.x += b.vx * dt; S.bul = S.bul.filter(b => Math.abs(b.x - p.x) < 200);
    for (let i = S.bug.length - 1; i >= 0; i--) {
      const g = S.bug[i]; g.x -= 24 * dt;
      const bi = S.bul.findIndex(b => Math.abs(b.x - g.x) < 7 && b.y > GY20 - 24);
      if (bi >= 0) { S.bul.splice(bi, 1); S.bug.splice(i, 1); S.score += 50; sfx('hit'); continue; }
      if (p.inv <= 0 && Math.abs(g.x - p.x) < 8) { p.hp--; p.inv = 1.5; S.bug.splice(i, 1); sfx('hurt'); if (p.hp <= 0) { sfx('die'); if (S.att) { p.hp = 3; } else { endGame(S.score, 'SQUAD LOST'); return; } } }
    }
    for (let i = S.bomb.length - 1; i >= 0; i--) {
      const b = S.bomb[i]; b.t -= dt; b.y = GY20 - 4 - b.t * 130;
      if (b.t <= 0) {
        S.bomb.splice(i, 1); sfx('boom'); S.fx.push({ x:b.x, t:0 }); S.score += 100 * S.bug.filter(g => Math.abs(g.x - b.x) < 60).length;
        S.bug = S.bug.filter(g => Math.abs(g.x - b.x) >= 60);
        if (Math.abs(b.x - HX20) < 60) { S.hive--; popup(S, S.hive ? 'HIVE HIT!' : 'HIVE DESTROYED', 128, 80, R); }
        for (const a of S.al) if (Math.abs(a.x - b.x) < 60) { a.rag = 1.4; a.vx = (a.x < b.x ? -1 : 1) * 70; popup(S, 'FRIENDLY FIRE!', 128, 100, Y); }
      }
    }
    for (const f of S.fx) f.t += dt; S.fx = S.fx.filter(f => f.t < 0.7);
    if (S.hive <= 0 && S.fx.length === 0) { sfx('win'); return finish(S, 'HIVE CLEARED!', 1000 + p.hp * 200); }
  },
  draw(S) {
    clear(N); for (let i = 0; i < 20; i++) rect((i * 37 - S.cam * 0.2 + 400) % 256, 20 + (i * 13) % 60, 2, 2, W);
    rect(0, GY20, VW, 54, T); rect(0, GY20, VW, 4, GR);
    for (let i = 0; i < 12; i++) rect(((i * 61 - S.cam) % 300 + 300) % 300 - 20, GY20 + 12 + (i % 3) * 12, 18, 3, M);
    const sx = x => Math.round(x - S.cam);
    const h = S.hive; if (h > 0 || S.fx.length) { const x = sx(HX20); rect(x - 22, GY20 - 44, 44, 44, PU); rect(x - 14, GY20 - 54, 28, 12, PU); rect(x - 8, GY20 - 20, 16, 20, K); rect(x - 12, GY20 - 36, 5, 5, R); rect(x + 7, GY20 - 36, 5, 5, R); rect(x - 22, GY20 - 48, 44 * h / 3, 3, R); }
    for (const g of S.bug) { const x = sx(g.x), w = Math.floor(S.T * 8 + g.ph) & 1; rect(x - 6, GY20 - 8, 12, 7, GR); rect(x - 4, GY20 - 12, 8, 5, GR); rect(x - 5, GY20 - 1, 2, 1 + w, K); rect(x + 3, GY20 - 1, 2, 2 - w, K); rect(x - 3, GY20 - 10, 2, 2, R); }
    const man = (x, y, f, c, st) => { x = sx(x); y = GY20 + y; rect(x - 3, y - 18, 6, 6, SKY); rect(x - 3, y - 20, 6, 3, c); rect(x - 3, y - 12, 6, 8, c); rect(x - 3, y - 4, 2, 4, B); rect(x + 1, y - 4, 2, 4, B); rect(x + (f > 0 ? 2 : -9), y - 11, 7, 2, st ? DG : L); };
    for (const a of S.al) man(a.x, a.y, 1, a.rag > 0 ? Y : CY, 0);
    if (S.p.inv <= 0 || (Math.floor(S.T * 20) & 1)) man(S.p.x, 0, S.p.f, R, 0);
    for (const b of S.bul) rect(sx(b.x), Math.round(b.y), 3, 2, Y);
    for (const b of S.bomb) { rect(sx(b.x) - 2, Math.round(b.y), 4, 10, DG); rect(sx(b.x) - 1, GY20 - 2, 2, 2, R); rect(sx(b.x) - 1, 0, 2, GY20, Math.floor(S.T * 16) & 1 ? R : N); }
    for (const f of S.fx) { const r = f.t * 90; fillCircle(sx(f.x), GY20 - 10, r, f.t < 0.3 ? W : Y); fillCircle(sx(f.x), GY20 - 10, r * 0.6, f.t < 0.5 ? O : R); }
  },
  hud(S, mode) {
    txt('SCORE ' + pad5(S.score), 4, 4, W, 8); txt('HP ' + '*'.repeat(S.p.hp), 252, 4, R, 8, 'right');
    txt('HIVE ' + '#'.repeat(Math.max(0, S.hive)), 252, 14, PU, 8, 'right');
    const k = { u:'^', r:'>', d:'v', l:'<' };
    if (S.p.x > 0) { panel(70, 204, 116, 16, K); txt('CODE ' + CODE20.map(c => k[c]).join(' '), 78, 208, S.bcd > 0 ? DG : CY, 8); txt(S.code.map(c => k[c]).join(''), 178, 208, Y, 8, 'right'); }
    if (mode === 'play' && S.T < 9) txt('A FIRE  HOLD B + ^ > v v = BOMB', 128, 40, W, 8, 'center');
  },
  info: S => ({ x:Math.round(S.p.x), hive:S.hive, bugs:S.bug.length, hp:S.p.hp }),
  bot(S, i) {
    const p = S.p, ahead = S.bug.filter(g => g.x > p.x && g.x - p.x < 120), near = ahead.length;
    const wantBomb = S.bcd <= 0 && S.bomb.length === 0 && ((S.hive === 3 && p.x > 250 && near >= 2 && p.x < 500) || (p.x >= HX20 - 100 && S.hive > 0));
    if (wantBomb || S.bot_) {
      if (!S.bot_) S.bot_ = { t0:S.T };
      const ph = Math.floor((S.T - S.bot_.t0) / 0.14), idx = ph >> 1; i.b = 1;
      if (ph % 2 === 0 && idx < 4) i[CODE20[idx]] = 1;
      if (idx >= 5 || S.bcd > 0) S.bot_ = null;
      return i;
    }
    if (near) i.a = 1;
    const wall = S.bug.some(g => g.x > p.x && g.x - p.x < 22);
    if (!(near && ahead[0].x - p.x < 70) && !(p.x >= HX20 - 100)) i.r = 1;
    else if (wall && p.x > 4) i.l = 1;
    if (!near && p.x < HX20 - 100) i.r = 1;
    i.a = near ? 1 : (S.bug.length ? 1 : 0);
    return i;
  },
});
