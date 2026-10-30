/* ===== KUNG FU KNOCKOUT: Kung-Fu Master x Punch-Out!!. Brawl down the temple hall, then read the master's tells in the ring. ===== */
const FLOOR = 178, END6 = 1500, GOAL = 8;
let phase, trans, cam6, P6, foes6, knives, parts6, pops6, score6, lives6, kills6, spawnT6, T6, att6, rng6, boss, B2, doorMsg, shake6, hintN;

function popup6(s, x, y, col) { pops6.push({ s, x, y, col, t:0 }); if (pops6.length > 4) pops6.shift(); }
function burst6(x, y, col, n) { for (let i = 0; i < n; i++) parts6.push({ x, y, vx:(vr() - 0.5) * 120, vy:-vr() * 90, t:0, col }); }
function setup6(isAtt) {
  rng6 = mkRng(runSeed(isAtt ? 5 : null, 11));
  phase = 1; trans = 0; cam6 = 0; score6 = 0; lives6 = 3; kills6 = 0; spawnT6 = 1.2; T6 = 0; shake6 = 0; hintN = 0;
  P6 = { x:40, y:0, vy:0, dir:1, hp:10, st:'walk', st_t:0, duck:false, inv:1, jump:false, hurt:0, cd:0 };
  foes6 = []; knives = []; parts6 = []; pops6 = []; doorMsg = 0;
  boss = { hp:12, st:'idle', t:0, idleDur:1.2, move:'hookL', tellDur:0.6, resolved:false, dodged:false, hitT:0, combo:0 };
  B2 = { hearts:5, dodge:0, dodgeDir:0, dcd:0, block:false, stun:0, jab:0, hook:0, cd:0, shown:0 };
}
function hurtP(n, msg) {
  if (P6.inv > 0) return;
  P6.hp -= n; P6.inv = 0.9; P6.hurt = 0.25; sfx('hurt'); burst6(P6.x, FLOOR - 18, R, 6); shake6 = 0.2;
  if (P6.hp <= 0) {
    lives6--; popup6(msg || 'KO!', 128, 60, R);
    if (lives6 < 0) { if (!att6) endGame(score6, 'GAME OVER'); else setup6(true); return; }
    P6.hp = 10; P6.inv = 2; foes6 = []; knives = []; P6.x = Math.max(40, P6.x - 60); sfx('die');
  }
}
function spawnFoe() {
  if (foes6.length >= 3 || kills6 + foes6.length >= GOAL + 1) return;
  const right = rng6() < 0.72 || cam6 < 10;
  const k = rng6() < 0.35 ? 'k' : 'g';
  foes6.push({ k, x:right ? cam6 + VW + 12 : cam6 - 14, dir:right ? -1 : 1, hp:k === 'k' ? 2 : 1, cd:1.2, hit:0, st:'walk', t:0, atk:0 });
}

const GAME = {
  id:'g6', t1:'KUNG FU', t2:'KNOCKOUT', sub:'BRAWL. READ THE TELLS. KO.',
  music:{ bpm:140, lead:'square', chords:[{ root:-24, tones:[0,3,7] }, { root:-26, tones:[-2,2,5] }, { root:-29, tones:[-5,-1,2] }, { root:-22, tones:[2,5,9] }],
          arp:[0,-1,-1,1,-1,2,-1,1,0,-1,-1,1,-1,2,1,-1], bass:[0,3,6,8,11,14], snare:[4,12], kick:[0,6,8,10], hat:true },
  init(isAtt) { att6 = !!isAtt; setup6(att6); },
  update(dt, inp, mode) {
    att6 = mode === 'title'; T6 += dt; if (shake6 > 0) shake6 -= dt;
    if (att6 && T6 > 70) { setup6(true); return; }
    for (let i = parts6.length - 1; i >= 0; i--) { const q = parts6[i]; q.t += dt; q.vy += 300 * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.t > 0.6) parts6.splice(i, 1); }
    for (let i = pops6.length - 1; i >= 0; i--) { pops6[i].t += dt; if (pops6[i].t > 1.3) pops6.splice(i, 1); }
    if (trans > 0) { trans -= dt; if (trans <= 0 && phase === 2) { popup6('FIGHT!', 128, 90, Y); sfx('go'); } return; }
    if (phase === 1) phase1(dt, inp); else phase2(dt, inp);
  },
  render() { if (phase === 1) render1(); else render2(); },
  hud(mode) {
    if (phase === 1) {
      txt('SCORE ' + pad5(score6), 6, 4, W, 8); txt('KO ' + kills6 + '/' + GOAL, 250, 4, Y, 8, 'right');
      txt('YOU', 6, 16, W, 8, 'left', false);
      if (kills6 >= GOAL) txt('GO TO THE DOOR >>', 128, 70, Y, 8, 'center');
      else if (mode === 'play' && T6 < 6) txt('A PUNCH  B KICK  UP JUMP  DOWN DUCK', 128, 70, W, 8, 'center');
    } else {
      txt('SCORE ' + pad5(score6), 6, 4, W, 8); txt('MASTER', 250, 4, Y, 8, 'right');
      if (trans > 0) { txt('ROUND 1', 128, 84, Y, 16, 'center'); }
      if (mode === 'play' && boss.st === 'tell' && B2.shown < 3) {
        const h = boss.move === 'hookL' ? 'DODGE RIGHT >>' : boss.move === 'hookR' ? '<< DODGE LEFT' : boss.move === 'upper' ? 'BLOCK: HOLD DOWN' : 'DODGE LEFT OR RIGHT';
        txt(h, 128, 172, Y, 8, 'center');
      }
      if (mode === 'play' && (boss.st === 'recover' || boss.st === 'stun') && T6 < 40) txt('PUNCH NOW!', 128, 172, E, 8, 'center');
    }
    for (const p of pops6) txt(p.s, clamp(Math.round(p.x), 40, 216), Math.round(p.y - p.t * 14), p.col, 8, 'center');
  },
  info() { return { phase, score:score6, lives:lives6, hp:P6.hp, kills:kills6, x:Math.round(P6.x), bossHp:boss.hp, hearts:B2.hearts, bst:boss.st }; },
  bot() {
    const i = { l:0, r:0, u:0, d:0, a:0, b:0, pa:0, pb:0, start:0 };
    if (phase === 1) {
      i.r = 1; P6.dir = 1;
      for (const f of foes6) {
        const dx = f.x - P6.x;
        if (f.k === 'g' && dx > 0 && dx < 26) { i.pa = 1; i.r = 0; }
        if (f.k === 'k' && dx > 0 && dx < 36) { i.pb = 1; i.r = 0; }
        if (f.k === 'g' && dx < 0 && dx > -26) { P6.dir = -1; i.pa = 1; i.l = 1; i.r = 0; }
      }
      for (const k of knives) { const dx = k.x - P6.x; if (dx > 0 && dx < 48) { if (k.h === 'hi') i.d = 1; else i.u = 1; } }
      if (kills6 < GOAL && P6.x > cam6 + 190) i.r = 0;
    } else {
      const b = boss;
      if (b.st === 'tell' && b.t > 0.18) { if (b.move === 'hookL') i.r = 1; else if (b.move === 'hookR') i.l = 1; else if (b.move === 'upper') i.d = 1; else i.l = 1; }
      else if (b.st === 'recover' || b.st === 'stun') { if (Math.floor(T6 * 5) % 3 === 0) i.pb = 1; else i.pa = 1; }
    }
    return i;
  },
};

/* ---------- phase 1: the hall ---------- */
function phase1(dt, inp) {
  const p = P6;
  p.inv = Math.max(0, p.inv - dt); p.hurt = Math.max(0, p.hurt - dt); p.cd = Math.max(0, p.cd - dt);
  if (p.st !== 'walk') { p.st_t -= dt; if (p.st_t <= 0) p.st = 'walk'; }
  p.duck = !!inp.d && p.y <= 0 && p.st === 'walk';
  const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
  if (dir && p.st === 'walk' && !p.duck) { p.dir = dir; p.x += dir * 58 * dt; }
  else if (dir && p.y > 0) { p.dir = dir; p.x += dir * 40 * dt; }
  if (inp.u && p.y <= 0 && p.st === 'walk') { p.vy = 205; sfx('jump'); }
  if (p.y > 0 || p.vy > 0) { p.y += p.vy * dt; p.vy -= 560 * dt; if (p.y <= 0) { p.y = 0; p.vy = 0; } }
  p.jump = p.y > 2;
  if (p.cd <= 0 && p.hurt <= 0) {
    if (inp.pa) { p.st = 'punch'; p.st_t = 0.2; p.cd = 0.26; sfx('swing'); strike(18, 1); }
    else if (inp.pb) { p.st = 'kick'; p.st_t = 0.3; p.cd = 0.4; sfx('swing'); strike(28, 1); }
  }
  p.x = clamp(p.x, cam6 + 8, END6);
  cam6 = clamp(p.x - 100, cam6, END6 - VW + 40);
  /* spawn + foes */
  spawnT6 -= dt; if (spawnT6 <= 0 && kills6 < GOAL) { spawnT6 = 1.5 + rng6() * 1.2; spawnFoe(); }
  for (let i = foes6.length - 1; i >= 0; i--) {
    const f = foes6[i]; f.hit = Math.max(0, f.hit - dt); f.cd -= dt;
    if (f.st === 'dead') { f.t += dt; f.x += f.dir * -50 * dt * (f.t < 0.3 ? 1 : 0); if (f.t > 0.6) foes6.splice(i, 1); continue; }
    const dx = p.x - f.x; f.dir = Math.sign(dx) || 1;
    if (f.k === 'g') {
      if (Math.abs(dx) > 16) f.x += f.dir * 38 * dt;
      else if (f.cd <= 0) { f.cd = 1; f.atk = 0.2; if (p.y < 8) hurtP(1, 'CAUGHT!'); }
    } else {
      const want = 84;
      if (Math.abs(dx) < want - 8) f.x -= f.dir * 34 * dt; else if (Math.abs(dx) > want + 10) f.x += f.dir * 34 * dt;
      if (f.cd <= 0 && Math.abs(dx) < 140) { f.cd = 1.9; f.atk = 0.25; knives.push({ x:f.x, h:rng6() < 0.5 ? 'hi' : 'lo', vx:f.dir * 105 }); sfx('shoot'); }
    }
    f.atk = Math.max(0, f.atk - dt);
  }
  for (let i = knives.length - 1; i >= 0; i--) {
    const k = knives[i]; k.x += k.vx * dt;
    if (Math.abs(k.x - cam6 - 128) > 190) { knives.splice(i, 1); continue; }
    const hitX = Math.abs(k.x - p.x) < 6;
    const hi = k.h === 'hi';
    if (hitX && ((hi && !p.duck) || (!hi && p.y < 10))) { const kk = knives; hurtP(1, 'KNIFED!'); if (knives !== kk) break; knives.splice(i, 1); }
  }
  if (kills6 >= GOAL && p.x >= END6 - 24) { phase = 2; trans = 1.8; knives = []; foes6 = []; sfx('beep'); popup6('THE MASTER!', 128, 60, R); }
}
function strike(range, dmg) {
  const p = P6;
  for (const f of foes6) {
    if (f.st === 'dead') continue;
    const dx = (f.x - p.x) * p.dir;
    if (dx > -4 && dx < range) {
      f.hp -= dmg; f.hit = 0.2; f.x += p.dir * 6; sfx('punch'); burst6(f.x, FLOOR - 18, W, 5);
      if (f.hp <= 0) { f.st = 'dead'; f.t = 0; kills6++; const pts = f.k === 'k' ? 200 : 100; score6 += pts; popup6('+' + pts, f.x - cam6, FLOOR - 40, Y); sfx('pop'); }
    }
  }
}
function render1() {
  clear(M);
  /* hall wall */
  rect(0, 0, VW, 120, DG);
  for (let x = -((cam6 * 0.5) % 32); x < VW; x += 32) { rect(x, 18, 26, 70, K); rect(x + 2, 20, 22, 66, M); rect(x + 4, 22, 18, 62, DG); fillCircle(x + 13, 16, 7, R); rect(x + 12, 6, 2, 4, Y); }
  rect(0, 100, VW, 20, M); for (let x = -((cam6 * 1.0) % 24); x < VW; x += 24) rect(x, 100, 3, 78, BRK);
  rect(0, 118, VW, 2, K);
  /* floor */
  rect(0, FLOOR, VW, VH - FLOOR, T); rect(0, FLOOR, VW, 2, O);
  for (let y = FLOOR + 6; y < VH; y += 10) rect(0, y, VW, 1, M);
  for (let x = -((cam6) % 40); x < VW; x += 40) rect(x, FLOOR + 2, 1, VH, M);
  /* door */
  const dx = Math.round(END6 + 28 - cam6);
  if (dx > -50 && dx < VW + 50) { rect(dx, 60, 36, FLOOR - 60, R); rect(dx + 3, 63, 30, FLOOR - 63, kills6 >= GOAL ? K : BRK); rect(dx - 3, 56, 42, 5, Y); if (kills6 >= GOAL) for (let k = 0; k < 6; k++) rect(dx + 6 + k * 4, 80, 2, 70, (Math.floor(T6 * 6 + k) & 1) ? R : O); }
  for (const f of foes6) drawFoe6(f);
  for (const k of knives) { const sx = Math.round(k.x - cam6), y = FLOOR - (k.h === 'hi' ? 24 : 6); rect(sx - 4, y, 9, 2, L); rect(sx - 5 * Math.sign(k.vx), y - 1, 3, 4, D); px(sx, y, W); }
  drawFighter6();
  for (const q of parts6) px(q.x - cam6, q.y, q.col);
  rect(0, 0, VW, 14, N); rect(0, 14, VW, 1, W);
  rect(34, 17, 66, 7, K); rect(35, 18, 64, 5, DG); rect(35, 18, Math.round(64 * P6.hp / 10), 5, P6.hp > 3 ? E : R);
  for (let i = 0; i < Math.max(0, lives6); i++) rect(106 + i * 8, 17, 6, 7, R);
  if (shake6 > 0) for (let y = 15; y < VH; y += 6) if (hash(y, Math.floor(T6 * 40)) > 0.6) { const o = Math.round((hash(y, 8) - 0.5) * 4); const row = buf.slice(y * VW, (y + 1) * VW); buf.set(row.subarray(Math.max(0, -o), VW - Math.max(0, o)), y * VW + Math.max(0, o)); }
}
function body6(x, y, dir, pal, st, tms, extra) {
  const Rr = (ox, oy, w, h, c) => rect(dir > 0 ? x + ox : x - ox - w, y + oy, w, h, c);
  const duck = extra && extra.duck;
  const hh = duck ? 12 : 0;
  Rr(-5, -30 + hh, 10, 9, pal.hair); Rr(-4, -27 + hh, 8, 7, S); Rr(0, -25 + hh, 3, 1, K);
  Rr(-6, -21 + hh, 12, 13 - (duck ? 3 : 0), pal.top); Rr(-6, -10 + hh, 12, 2, pal.belt);
  const sw = Math.floor(tms * 8) & 1;
  if (duck) { Rr(-6, -8 + hh - 3, 12, 8, pal.pants); Rr(-7, 0 - 2, 6, 2, K); Rr(1, 0 - 2, 6, 2, K); }
  else { Rr(-5, -8, 5, 8, pal.pants); Rr(1, -8, 5, 8, pal.pants); Rr(-6 + (sw ? 1 : 0), -1, 6, 2, K); Rr(1 - (sw ? 1 : 0), -1, 6, 2, K); }
  if (st === 'punch') { Rr(5, -20 + hh, 16, 4, S); Rr(20, -21 + hh, 3, 6, S); }
  else if (st === 'kick') { Rr(4, -8, 22, 5, pal.pants); Rr(25, -9, 4, 7, K); Rr(-4, -20, 3, 9, S); }
  else if (st === 'hurt') { Rr(-8, -20 + hh, 3, 9, S); Rr(5, -20 + hh, 3, 9, S); }
  else { Rr(5, -20 + hh, 3, 10, S); Rr(-8, -20 + hh, 3, 10, S); }
}
function drawFighter6() {
  const p = P6;
  if (p.inv > 0 && p.hurt <= 0 && (Math.floor(T6 * 16) & 1)) return;
  const x = Math.round(p.x - cam6), y = FLOOR - Math.round(Math.max(0, p.y));
  rect(x - 8, FLOOR + 1, 16, 2, M);
  body6(x, y + 12 - 12 + 12 - 12, p.dir, { hair:K, top:W, belt:R, pants:W }, p.hurt > 0 ? 'hurt' : p.st, T6, { duck:p.duck });
}
function drawFoe6(f) {
  const x = Math.round(f.x - cam6), y = FLOOR;
  if (x < -30 || x > VW + 30) return;
  rect(x - 8, FLOOR + 1, 16, 2, M);
  const pal = f.k === 'k' ? { hair:K, top:GR, belt:Y, pants:F } : { hair:M, top:PU, belt:K, pants:N };
  if (f.st === 'dead') { const u = Math.min(1, f.t / 0.4); rect(x - 10, y - 6 + Math.round(u * 2), 20, 6, pal.top); rect(x + 8, y - 6, 5, 5, S); if (Math.floor(T6 * 12) & 1) px(x, y - 12, Y); return; }
  if (f.hit > 0 && (Math.floor(T6 * 20) & 1)) { body6(x, y, f.dir, { hair:W, top:W, belt:W, pants:W }, 'hurt', T6); return; }
  body6(x, y, f.dir, pal, f.atk > 0 ? (f.k === 'g' ? 'punch' : 'hurt') : 'walk', T6);
}

/* ---------- phase 2: the ring ---------- */
function phase2(dt, inp) {
  const b = boss, p = B2;
  b.t += dt; b.hitT = Math.max(0, b.hitT - dt);
  p.cd = Math.max(0, p.cd - dt); p.jab = Math.max(0, p.jab - dt); p.hook = Math.max(0, p.hook - dt); p.stun = Math.max(0, p.stun - dt);
  p.dcd = Math.max(0, p.dcd - dt);
  if (p.dodge > 0) { p.dodge -= dt; if (p.dodge <= 0) { p.dodgeDir = 0; p.dcd = 0.3; } }
  p.block = !!inp.d && p.stun <= 0 && p.dodge <= 0;
  if (p.stun <= 0 && p.dodge <= 0 && p.dcd <= 0 && (inp.l || inp.r) && boss.st !== 'ko') { p.dodgeDir = inp.l ? -1 : 1; p.dodge = 0.45; sfx('tick'); }
  if (p.stun <= 0 && p.cd <= 0 && !p.block && p.dodge <= 0 && boss.st !== 'ko') {
    if (inp.pa) { p.cd = 0.3; p.jab = 0.18; sfx('swing'); landPunch(1); }
    else if (inp.pb) { p.cd = 0.55; p.hook = 0.3; sfx('swing'); landPunch(2); }
  }
  if (b.st === 'ko') { if (b.t > 2.2 && !att6) endGame(score6 + 3000 + p.hearts * 500, 'KO! YOU WIN'); else if (b.t > 3 && att6) setup6(true); return; }
  const hard = b.hp <= 6;
  if (b.st === 'idle') {
    if (b.t >= b.idleDur) {
      const moves = hard ? ['hookL', 'hookR', 'upper', 'slam', 'hookL', 'hookR'] : ['hookL', 'hookR', 'upper', 'slam'];
      b.move = moves[Math.floor(rng6() * moves.length)]; b.st = 'tell'; b.t = 0; b.tellDur = hard ? 0.42 : 0.62; b.resolved = false; b.dodged = false; sfx('tick');
    }
  } else if (b.st === 'tell') {
    if (b.t >= b.tellDur) { b.st = 'attack'; b.t = 0; sfx('swing'); if (B2.shown < 3) B2.shown++; }
  } else if (b.st === 'attack') {
    if (!b.resolved && b.t >= 0.12) {
      b.resolved = true;
      const m = b.move;
      const ok = (m === 'hookL' && p.dodgeDir === 1) || (m === 'hookR' && p.dodgeDir === -1) || (m === 'upper' && p.block) || (m === 'slam' && p.dodgeDir !== 0);
      if (ok) { b.dodged = true; score6 += 150; popup6(m === 'upper' ? 'BLOCKED!' : 'DODGE!', 128, 150, CY); sfx('catch'); }
      else { p.hearts -= m === 'slam' ? 2 : 1; p.stun = 0.7; sfx('boom'); shake6 = 0.3; popup6('OUCH!', 128, 150, R); if (p.hearts <= 0) { p.hearts = 0; if (!att6) endGame(score6, 'KNOCKED OUT'); else setup6(true); return; } }
    }
    if (b.t >= 0.3) { b.st = b.dodged ? 'stun' : 'recover'; b.t = 0; }
  } else if (b.st === 'recover') {
    if (b.t >= 0.9) { b.st = 'idle'; b.t = 0; b.idleDur = (hard ? 0.35 : 0.6) + rng6() * 0.6; }
  } else if (b.st === 'stun') {
    if (b.t >= 1.5) { b.st = 'idle'; b.t = 0; b.idleDur = (hard ? 0.3 : 0.5) + rng6() * 0.5; }
  }
}
function landPunch(dmg) {
  const b = boss;
  if (b.st === 'recover' || b.st === 'stun') {
    b.hp -= dmg; b.hitT = 0.25; score6 += 120 * dmg; sfx('punch'); shake6 = 0.12; popup6(dmg > 1 ? 'HOOK! -' + dmg : 'JAB!', 128 + (vr() - 0.5) * 60, 40, dmg > 1 ? O : W);
    if (b.st === 'recover') b.t = Math.max(0, b.t - 0.15);
    if (b.hp <= 0) { b.hp = 0; b.st = 'ko'; b.t = 0; sfx('boom'); popup6('KNOCKOUT!', 128, 90, Y); }
  } else { sfx('tick'); }
}
function render2() {
  clear(N);
  /* crowd */
  for (let y = 0; y < 64; y += 8) for (let x = 0; x < VW; x += 8) { const c = [R, Y, B, E, O, PU, W][Math.floor(hash(x, y) * 7)]; const bob = (Math.floor(T6 * 3 + hash(y, x) * 5) & 1); if (hash(x + 3, y + 1) > 0.25) { rect(x + 1, y + 2 - bob, 6, 6, K); rect(x + 2, y + 1 - bob, 4, 4, c); } }
  rect(0, 64, VW, 3, DG);
  /* ring floor and ropes */
  rect(0, 112, VW, 112, B); for (let y = 112; y < VH; y += 14) rect(0, y, VW, 1, N);
  rect(0, 112, VW, 3, W);
  for (const [ry, rc] of [[84, R], [96, W], [108, R]]) { rect(0, ry, VW, 3, rc); }
  rect(4, 70, 6, 60, D); rect(246, 70, 6, 60, D);
  drawBoss();
  drawFist();
  rect(0, 0, VW, 16, K); rect(0, 16, VW, 1, W);
  for (let i = 0; i < 5; i++) { const x = 6 + i * 11; rect(x, 18 - 1 + 0, 9, 7, i < B2.hearts ? R : DG); }
  rect(150, 18, 100, 7, DG); rect(150, 18, Math.round(100 * boss.hp / 12), 7, boss.hp > 6 ? E : boss.hp > 3 ? Y : R);
  if (shake6 > 0) for (let y = 17; y < VH; y += 5) if (hash(y, Math.floor(T6 * 40)) > 0.6) { const o = Math.round((hash(y, 8) - 0.5) * 5); const row = buf.slice(y * VW, (y + 1) * VW); buf.set(row.subarray(Math.max(0, -o), VW - Math.max(0, o)), y * VW + Math.max(0, o)); }
}
function drawBoss() {
  const b = boss; let cx = 128, hy = 66, lean = 0;
  const telling = b.st === 'tell', atk = b.st === 'attack';
  if (telling && b.move === 'hookL') lean = -10; if (telling && b.move === 'hookR') lean = 10;
  if (telling && b.move === 'upper') hy += 8;
  if (b.st === 'recover' || b.st === 'stun') hy += 5;
  if (b.st === 'ko') { const u = Math.min(1, b.t / 1.2); hy += Math.round(u * 40); cx += Math.round(u * 20); }
  cx += lean;
  const flash = b.hitT > 0 && (Math.floor(T6 * 30) & 1);
  const skin = flash ? W : S, robe = flash ? W : O;
  /* torso */
  rect(cx - 26, hy + 14, 52, 56, robe); rect(cx - 26, hy + 14, 52, 3, Y); rect(cx - 26, hy + 48, 52, 5, K); rect(cx - 4, hy + 48, 8, 5, Y);
  rect(cx - 6, hy + 14, 12, 22, skin);
  rect(cx - 20, hy + 54, 16, 18, N); rect(cx + 4, hy + 54, 16, 18, N);
  /* head */
  fillCircle(cx, hy, 15, skin); rect(cx - 15, hy - 3, 30, 2, K); rect(cx - 15, hy - 17, 30, 7, K); fillCircle(cx, hy - 20, 5, K);
  const eye = telling ? ((Math.floor(T6 * 14) & 1) ? R : W) : (b.st === 'stun' ? Y : K);
  rect(cx - 9, hy - 3, 6, 4, W); rect(cx + 4, hy - 3, 6, 4, W); rect(cx - 7, hy - 2, 3, 3, eye); rect(cx + 6, hy - 2, 3, 3, eye);
  if (telling) { rect(cx - 12, hy - 8, 10, 2, R); rect(cx + 3, hy - 8, 10, 2, R); }
  rect(cx - 9, hy + 7, 18, 2, K); if (b.st === 'recover' || b.st === 'stun') rect(cx - 4, hy + 9, 8, 4, R);
  if (b.st === 'stun') for (let k = 0; k < 4; k++) { const a = T6 * 5 + k * 1.57; px(cx + Math.cos(a) * 20, hy - 26 + Math.sin(a) * 4, Y); px(cx + Math.cos(a) * 20 + 1, hy - 26 + Math.sin(a) * 4, W); }
  /* gloves */
  const glove = (gx, gy, r) => { fillCircle(gx, gy, r, flash ? W : R); fillCircle(gx - 2, gy - 2, Math.max(1, r - 5), flash ? W : PK); };
  let l = [cx - 18, hy + 16, 9], r2 = [cx + 18, hy + 16, 9];
  if (b.st === 'recover' || b.st === 'stun') { l = [cx - 36, hy + 52, 9]; r2 = [cx + 36, hy + 52, 9]; }
  if (telling) {
    if (b.move === 'hookL') l = [cx - 44, hy + 22, 11];
    else if (b.move === 'hookR') r2 = [cx + 44, hy + 22, 11];
    else if (b.move === 'upper') { l = [cx - 20, hy + 60, 10]; r2 = [cx + 20, hy + 60, 10]; }
    else { l = [cx - 20, hy - 30, 10]; r2 = [cx + 20, hy - 30, 10]; }
  }
  if (atk) {
    const u = Math.min(1, b.t / 0.3);
    if (b.move === 'hookL') l = [cx - 44 + Math.round(u * 70), hy + 40 + Math.round(u * 30), 12 + Math.round(u * 8)];
    else if (b.move === 'hookR') r2 = [cx + 44 - Math.round(u * 70), hy + 40 + Math.round(u * 30), 12 + Math.round(u * 8)];
    else if (b.move === 'upper') { l = [cx - 14, hy + 60 + Math.round(u * 60), 12 + Math.round(u * 6)]; r2 = [cx + 14, hy + 60 + Math.round(u * 60), 12 + Math.round(u * 6)]; }
    else { l = [cx - 16, hy - 30 + Math.round(u * 130), 12 + Math.round(u * 8)]; r2 = [cx + 16, hy - 30 + Math.round(u * 130), 12 + Math.round(u * 8)]; }
  }
  glove(l[0], l[1], l[2]); glove(r2[0], r2[1], r2[2]);
}
function drawFist() {
  const p = B2; let ox = p.dodgeDir * 46 * Math.min(1, (0.45 - Math.max(0, p.dodge - 0.0)) < 0.15 || p.dodge > 0.3 ? 1 : 0.7);
  if (p.dodge <= 0) ox = 0;
  const y0 = 198 + (p.stun > 0 ? 8 : 0);
  if (p.stun > 0 && (Math.floor(T6 * 16) & 1)) return;
  const x = 128 + Math.round(ox);
  rect(x - 26, y0 + 8, 52, 24, W); rect(x - 26, y0 + 8, 52, 2, L); rect(x - 4, y0 + 8, 8, 24, L);
  fillCircle(x, y0 - 2, 11, K); rect(x - 11, y0 + 0, 22, 8, K);
  let lg = [x - 24, y0 + 4], rg = [x + 24, y0 + 4], lr = 9, rr = 9;
  if (p.block) { lg = [x - 7, y0 - 10]; rg = [x + 7, y0 - 10]; }
  if (p.jab > 0) { const u = 1 - p.jab / 0.18; rg = [x + 8 - Math.round(u * 8), y0 - Math.round(u * 70)]; rr = 9 - Math.round(u * 4); }
  if (p.hook > 0) { const u = 1 - p.hook / 0.3; lg = [x - 24 + Math.round(u * 26), y0 - Math.round(u * 54)]; lr = 9 - Math.round(u * 2); }
  fillCircle(lg[0], lg[1], lr, R); fillCircle(lg[0] - 2, lg[1] - 2, Math.max(1, lr - 5), PK);
  fillCircle(rg[0], rg[1], rr, R); fillCircle(rg[0] - 2, rg[1] - 2, Math.max(1, rr - 5), PK);
}
