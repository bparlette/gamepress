// KEYS: Left/Right move, Down blocks, Up jumps, Z punch, X kick. One round, first KO wins (or most health at 45 s).
/* ===== G36 STREET ROUND: one-round 1v1 fighter, arcade-style 8-bit with the NATIVE per-frame rig (pixrig.js 'fighter'): 88 px fighters drawn fresh each frame
   from a skeleton (idle bob, walk, punch, kick, block, hit, jump, KO), no sprite assets. BRIEF  genre: 1v1 fighter | player: move, block, jump, punch, kick
   goal: KO the CPU or lead on health at the bell | lose: KO'd / behind at time | bot: spaces, pokes, blocks the CPU's attacks
   juice: hit-stop, shake, hit sparks, KO slow-mo + freeze, damage-trail health bars, round intro, crowd, parallax skyline ===== */
const TUNE36 = { time:45, hp:100, sc:88, speed:44, wall:[26, 230], sep:24, jump:{ v:150, g:520 },
  punch:{ dur:.26, hit:[.1, .18], reach:44, dmg:6, stun:.3, kb:5 }, kick:{ dur:.42, hit:[.16, .3], reach:60, dmg:11, stun:.42, kb:10 },
  block:{ chip:1, kb:3 }, ai:{ react:[.14, .34], atk:.5, block:.45, spacing:50 }, intro:1.5, ko:1.7 };
const FY36 = 192, SC36 = TUNE36.sc / 150;
function fighter36(x, v) { return { x, v, y:0, vy:0, hp:TUNE36.hp, hpShow:TUNE36.hp, st:'idle', t:0, atk:null, stun:0, face:1, ph:0, flash:0, cd:0, ai:0, intent:{}, blk:0 }; }
function attack36(f, type) { if (f.st === 'atk' || f.st === 'hit' || f.st === 'ko' || f.y > 0 || f.cd > 0) return; const C = TUNE36[type]; f.st = 'atk'; f.atk = { type, t:0, dur:C.dur, done:false }; sfx(type === 'kick' ? 'swing' : 'punch'); }
function hit36(S, a, d) {   /* attacker a connects on defender d */
  const C = TUNE36[a.atk.type]; a.atk.done = true; const blocked = d.st === 'block' && d.face * a.face < 0 ? true : false;
  if (blocked) { d.hp -= TUNE36.block.chip; d.x += a.face * TUNE36.block.kb; sfx('tick'); S.spk.push({ x:(a.x + d.x) / 2 + a.face * 8, y:FY36 - 56, t:0, blk:true }); ENG.shake(S, 1); return; }
  d.hp -= C.dmg; d.st = 'hit'; d.t = 0; d.stun = C.stun; d.atk = null; d.x += a.face * C.kb; d.flash = .08; S.score += C.dmg * 10; sfx('hit');
  S.spk.push({ x:(a.x + d.x) / 2 + a.face * 10, y:FY36 - (a.atk.type === 'kick' ? 40 : 62), t:0 }); burst(S, d.x, FY36 - 60, W, 4); ENG.impact(S, a.atk.type === 'kick' ? 'strong' : 'weak'); S.combo = (S.last === a ? S.combo + 1 : 1); S.last = a; S.comboT = 1.2;
  if (d.hp <= 0) { d.hp = 0; d.st = 'ko'; d.t = 0; S.over = 0.001; S.loser = d; sfx('die'); ENG.impact(S, { stop:.22, shake:10, flash:.6 }); } }
function think36(S, me, foe, lvl, intent) {   /* shared CPU/bot brain -> input-like intent */
  const A = TUNE36.ai; me.ai -= 1 / 60; if (me.ai > 0) return me.intent; me.ai = A.react[0] + S.rng() * (A.react[1] - A.react[0]) / lvl; const dx = Math.abs(foe.x - me.x), I = {};
  const foeAtk = foe.st === 'atk', want = A.spacing;
  if (foeAtk && dx < 78 && S.rng() < A.block * lvl) I.d = 1;
  else if (dx > want + 6) I.f = 1; else if (dx < want - 24 && S.rng() < .4) I.bk = 1;
  else if (me.cd <= 0 && S.rng() < A.atk * lvl) { if (dx > 44 || S.rng() < .35) I.b = 1; else I.a = 1; }
  me.intent = I; return I; }
const GAME = kit({ id:'g36', t1:'STREET', t2:'ROUND', sub:'ONE ROUND. ONE WINNER.', seed:936, off:36, secs:60, music:MUS(150, -17, true),
  setup(S) { S.p1 = fighter36(78, 'red'); S.p2 = fighter36(178, 'blue'); S.p2.face = -1; S.spk = []; S.intro = 0; S.over = 0; S.loser = null; S.combo = 0; S.comboT = 0; S.last = null; S.rt = 0; S.timeLeft = TUNE36.time; S.fight = false; },
  step(S, dt, inp) { const C = TUNE36, a = S.p1, b = S.p2; S.rt += dt;
    if (S.over > 0) { S.over += dt; const slow = S.over < 1 ? 0.3 : 1; if (S.over > C.ko) { const w = S.loser === b ? 'YOU WIN' : 'YOU LOSE'; return finish(S, w, S.loser === b ? Math.round(a.hp) * 5 : 0); } dt *= slow; }
    S.intro += dt; if (S.intro < C.intro) { a.ph += dt * 6; b.ph += dt * 6; return; } if (!S.fight) { S.fight = true; sfx('go'); }
    if (S.over <= 0) { S.timeLeft -= dt; if (S.timeLeft <= 0) { S.timeLeft = 0; S.over = 0.001; S.loser = a.hp >= b.hp ? b : a; if (a.hp === b.hp) S.loser = b; } }
    for (const [f, o] of [[a, b], [b, a]]) { f.face = o.x >= f.x ? 1 : -1; f.flash = Math.max(0, f.flash - dt); f.cd = Math.max(0, f.cd - dt); f.hpShow += (f.hp - f.hpShow) * Math.min(1, dt * 2.2);
      let I; if (S.over > 0 || f.st === 'ko') I = {}; else if (f === a) { const ax = inp.ax !== undefined ? inp.ax : (inp.r ? 1 : 0) - (inp.l ? 1 : 0); I = { f:ax * f.face > 0.3 ? 1 : 0, bk:ax * f.face < -0.3 ? 1 : 0, d:inp.d, u:inp.u, a:S.edge(inp, 'a'), b:S.edge(inp, 'b') }; if (S.att) I = Object.assign({}, think36(S, f, o, 1.0)); } else I = think36(S, f, o, 0.6);
      if (f.st === 'hit') { f.t += dt; if (f.t > f.stun) { f.st = 'idle'; f.t = 0; } }
      else if (f.st === 'atk') { f.atk.t += dt; const C2 = C[f.atk.type]; const tt = f.atk.t; if (!f.atk.done && tt >= C2.hit[0] && tt <= C2.hit[1] && Math.abs(o.x - f.x) < C2.reach && o.y < 30 && o.st !== 'ko') hit36(S, f, o); if (tt >= C2.dur) { f.st = 'idle'; f.atk = null; f.cd = .08; } }
      else if (f.st !== 'ko') {
        if (f.y > 0 || I.u && f.y === 0 && f.st !== 'block') { if (f.y === 0 && I.u) { f.vy = C.jump.v; f.y = .01; sfx('jump'); } f.vy -= C.jump.g * dt; f.y += f.vy * dt; if (f.y <= 0) { f.y = 0; f.vy = 0; burst(S, f.x, FY36, L, 3); sfx('land'); } f.st = f.y > 0 ? 'jump' : 'idle'; f.x += (I.f ? 1 : I.bk ? -1 : 0) * f.face * C.speed * .8 * dt; }
        else if (I.d) { f.st = 'block'; }
        else { f.st = I.f || I.bk ? 'walk' : 'idle'; const m = (I.f ? 1 : 0) - (I.bk ? 1 : 0); f.x += m * f.face * C.speed * (m < 0 ? .75 : 1) * dt; f.ph += dt * (m ? 11 * (m > 0 ? 1 : -1) : 5); if (I.a) attack36(f, 'punch'); else if (I.b) attack36(f, 'kick'); } }
      if (f.st === 'ko') f.t += dt; }
    const sep = C.sep; if (Math.abs(a.x - b.x) < sep && a.y < 20 && b.y < 20) { const m = (a.x + b.x) / 2, s = a.x <= b.x ? 1 : -1; a.x = m - s * sep / 2; b.x = m + s * sep / 2; }
    a.x = clamp(a.x, C.wall[0], C.wall[1]); b.x = clamp(b.x, C.wall[0], C.wall[1]); S.comboT -= dt; if (S.comboT <= 0) S.combo = 0;
    for (const s of S.spk) s.t += dt; S.spk = S.spk.filter(s => s.t < .22); },
  draw(S) { const C = TUNE36, sh = S.ecam && S.ecam.sh > 0 ? Math.round((S.rng() - .5) * S.ecam.sh * .5) : 0, sy = S.ecam && S.ecam.sh > 3 ? Math.round((S.rng() - .5) * S.ecam.sh * .3) : 0;
    rect(0, 0, 256, 224, K); const bands = [B, B, B, SKY, SKY, PK, PK, O]; for (let i = 0; i < 8; i++) { rect(0, i * 14, 256, 14, bands[i]); if (i) for (let x = (i % 2) * 2; x < 256; x += 4) px(x, i * 14, bands[i - 1]); }
    for (let i = 0; i < 12; i++) { const bx = i * 24 - ((S.rt * 2) % 24) + sh * .3, bh = 24 + ((i * 37) % 5) * 10; rect(bx, 110 - bh, 18, bh + 4, N); for (let w = 0; w < bh; w += 8) rect(bx + 3, 110 - bh + 4 + w, 3, 3, (i + w) % 3 ? Y : DG); rect(bx + 10, 110 - bh + 4, 3, 3, DG); }
    rect(0, 108, 256, 54, D); rect(0, 108, 256, 2, L);   // back wall / fence
    for (let x = 0; x < 256; x += 8) rect(x + sh * .5, 112, 2, 40, DG); rect(0, 120, 256, 2, D);
    for (let i = 0; i < 18; i++) { const cx = i * 15 + 6 + sh * .6, bob = Math.round(Math.sin(S.rt * 5 + i * 1.7) * (S.over > 0 || S.combo > 1 ? 3 : 1)), col = [R, B, GR, Y, PU][i % 5]; rect(cx - 2, 132 + bob, 6, 8, col); rect(cx - 1, 126 + bob, 4, 5, i % 3 ? S : T); rect(cx - 2, 124 + bob, 6, 2, K); }
    rect(0, 148, 256, 14, M); rect(0, 148, 256, 1, T);
    rect(0, 162, 256, 62, DG); for (let y = 0; y < 62; y += 1) { const gy = 162 + y; if (y % 6 === 0) rect(0, gy, 256, 1, D); }
    for (let i = -6; i < 14; i++) { const x0 = 128 + (i - 4) * 14, x1 = 128 + (i - 4) * 40; for (let t = 0; t < 1; t += .02) px(x0 + (x1 - x0) * t + sh, 162 + t * 62, D); }
    rect(0, 162, 256, 2, L);
    const fs = [S.p1, S.p2].sort((p, q) => (p.st === 'hit' || p.st === 'ko') - (q.st === 'hit' || q.st === 'ko'));
    for (const f of fs) { const w = f.st === 'ko' ? 30 : 17 - f.y * .06; for (let y = -3; y <= 3; y++) for (let x = -Math.round(w); x <= w; x++) if ((x * x) / (w * w) + (y * y) / 10 < 1 && (x + y) % 2 === 0) px(f.x + x + sh, FY36 + 2 + y, K); }
    for (const f of fs) { const pose = f.st === 'atk' ? f.atk.type : f.st === 'hit' ? 'hit' : f.st === 'block' ? 'block' : f.st === 'jump' ? 'jump' : f.st === 'ko' ? 'ko' : f.st === 'walk' ? 'walk' : 'idle';
      const ph = f.st === 'atk' ? f.atk.t / f.atk.dur : f.st === 'hit' ? f.t / f.stun : f.st === 'ko' ? f.t / .5 : f.ph;
      PRIG.draw('fighter', f.v, pose, f.x + sh, FY36 - f.y + sy, f.face, ph, { sc:C.sc, flash:f.flash > 0 ? 1 : 0 }); }
    for (const s of S.spk) { const x = s.x + sh, y = s.y, r = 4 + s.t * 60, c = s.blk ? CY : Y; for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, r2 = k % 2 ? r : r * .5; for (let q = r2 * .4; q < r2; q += 1) px(x + Math.cos(a) * q, y + Math.sin(a) * q, k % 3 ? c : W); } if (s.t < .08) rect(x - 3, y - 3, 7, 7, W); }
    const bar = (x, w, f, rev) => { rect(x - 2, 14, w + 4, 12, W); rect(x - 1, 15, w + 2, 10, K); const cur = Math.round(w * f.hp / C.hp), tr = Math.round(w * f.hpShow / C.hp); const bx = rev ? x + w - tr : x; rect(rev ? x + w - tr : x, 17, tr, 6, R); const cx = rev ? x + w - cur : x; rect(cx, 17, cur, 6, f.hp > 30 ? Y : (Math.floor(S.rt * 6) & 1 ? R : Y)); rect(cx, 17, cur, 2, V); };
    bar(14, 96, S.p1, false); bar(146, 96, S.p2, true); rect(112, 12, 32, 18, W); rect(113, 13, 30, 16, N); },
  hud(S) { txt('YOU', 14, 6, W, 8); txt('CPU', 242, 6, W, 8, 'right'); txt(String(Math.ceil(S.timeLeft)).padStart(2, '0'), 128, 14, Y, 16, 'center');
    if (S.intro < TUNE36.intro) { const t = S.intro; if (t < .85) txt('ROUND 1', 128, 84, Y, 24, 'center'); else txt('FIGHT!', 128, 84, R, 32, 'center'); }
    if (S.combo > 1) txt(S.combo + ' HIT COMBO', 128, 40, Y, 8, 'center');
    if (S.over > 0) { txt(S.over > .5 && S.loser === S.p2 ? 'K.O.!' : (S.timeLeft <= 0 ? 'TIME' : 'K.O.!'), 128, 80, Y, 32, 'center'); }
    hintS(S, 'Z PUNCH  X KICK  DOWN BLOCK  UP JUMP', 8, 212); },
  info(S) { return { x1:Math.round(S.p1.x), x2:Math.round(S.p2.x), hp1:Math.round(S.p1.hp), hp2:Math.round(S.p2.hp), st1:S.p1.st, st2:S.p2.st, tl:+S.timeLeft.toFixed(1) }; },
  bot(S, i) { const I = think36(S, S.p1, S.p2, 1.0); if (I.f) i.r = S.p1.face > 0 ? 1 : 0, i.l = S.p1.face < 0 ? 1 : 0; if (I.bk) i.l = S.p1.face > 0 ? 1 : 0, i.r = S.p1.face < 0 ? 1 : 0; if (I.d) i.d = 1; if (I.a) i.a = 1; if (I.b) i.b = 1; return i; } });
