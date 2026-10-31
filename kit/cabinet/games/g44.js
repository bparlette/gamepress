// KEYS: Z low fireball, X high fireball, Up jumps (dodges LOW balls), Down crouches (dodges HIGH balls).
/* ===== G44 FIREBALL DODGEBALL (quick): Ryu vs Guile across a dojo floor. Low balls must be jumped, high balls ducked; throw your own (CPU dodges by skill). 5 hearts each. ===== */
const T44 = { hearts:5, spd:112, cd:.55, jump:{ v:230, g:620 }, cpu:{ every:[.9, 1.6], dodge:.55 }, time:70 };
const mk44 = (x, ch, f) => ({ x, ch, face:f, y:0, vy:0, cr:false, hp:T44.hearts, flash:0, cast:0, cd:0, st:'idle', ph:0 });
function fire44(S, f, high) { if (f.cd > 0) return; f.cd = T44.cd; f.cast = .28; S.balls.push({ x:f.x + f.face * 18, y:high ? 62 : 14, vx:f.face * T44.spd, f, high }); sfx('go'); }
const GAME = kit({ id:'g44', t1:'FIREBALL', t2:'DODGEBALL', sub:'JUMP LOW. DUCK HIGH.', seed:944, off:44, secs:60, music:MUS(160, -15, true),
  setup(S) { S.p = mk44(48, 'ryu', 1); S.c = mk44(208, 'guile', -1); S.balls = []; S.rt = 0; S.pA = 0; S.pB = 0; S.cn = 1.2; S.sp = []; },
  step(S, dt, inp) { const C = T44, P = S.p, Cp = S.c; S.rt += dt; if (S.rt < 1) return; for (const f of [P, Cp]) { f.cd -= dt; f.cast -= dt; f.flash -= dt; f.ph += dt * 4; if (f.y > 0 || f.vy > 0) { f.y += f.vy * dt; f.vy -= C.jump.g * dt; if (f.y <= 0) { f.y = 0; f.vy = 0; } } }
    const ea = inp.a && !S.pA, eb = inp.b && !S.pB; S.pA = inp.a; S.pB = inp.b; if (ea) fire44(S, P, false); if (eb) fire44(S, P, true); P.cr = !!inp.d && P.y === 0; if (inp.u && P.y === 0 && !P.cr) P.vy = C.jump.v;
    S.cn -= dt; if (S.cn <= 0) { S.cn = C.cpu.every[0] + S.rng() * (C.cpu.every[1] - C.cpu.every[0]); fire44(S, Cp, S.rng() < .5); }
    const inc = S.balls.find(b => b.f === P && b.x > Cp.x - 90 && b.x < Cp.x - 6 && !b.seen); if (inc && Cp.y === 0 && !Cp.cr) { inc.seen = true; if (S.rng() < C.cpu.dodge) { if (inc.high) Cp.cr = true; else Cp.vy = C.jump.v; Cp.crT = .5; } } if (Cp.crT > 0) { Cp.crT -= dt; if (Cp.crT <= 0) Cp.cr = false; }
    for (const b of S.balls) { b.x += b.vx * dt; const o = b.f === P ? Cp : P; if (Math.abs(b.x - o.x) < 11 && !b.dead) { const top = o.cr ? 44 : o.y + 84, bot = o.y, cy = b.y; if (cy + 8 > bot && cy - 8 < top && !(b.high && o.cr) && !(!b.high && o.y > 20)) { b.dead = true; o.hp--; o.flash = .25; sfx('hit'); ENG.impact(S, 'strong'); S.sp.push({ x:o.x, y:176 - 40, t:0 }); } } if (b.x < -20 || b.x > 276) b.dead = true; }
    S.balls = S.balls.filter(b => !b.dead); S.sp = S.sp.filter(s => (s.t += dt) < .3);
    if (P.hp <= 0 || Cp.hp <= 0 || S.rt > C.time) { const w = Cp.hp < P.hp || (Cp.hp <= 0 && P.hp > 0); return finish(S, w ? 'YOU WIN' : 'YOU LOSE', w ? 1000 + P.hp * 300 : Cp.hp < T44.hearts ? 200 : 0); } },
  draw(S) { rect(0, 0, 256, 224, K); const bands = [N, N, B, B, SKY, PK, O]; for (let i = 0; i < 7; i++) rect(0, i * 14, 256, 14, bands[i]); for (let i = 0; i < 9; i++) { const bx = i * 32; rect(bx, 60, 22, 60, DG); rect(bx + 6, 70, 4, 40, N); }
    rect(0, 120, 256, 104, BRK); rect(0, 120, 256, 3, T); for (let x = 0; x < 256; x += 32) rect(x, 178, 20, 2, O); rect(0, 176, 256, 1, D);
    for (const f of [S.p, S.c]) { for (let y = -2; y <= 2; y++) for (let x = -11; x <= 11; x++) if ((x * x) / 121 + (y * y) / 5 < 1 && (x + y) % 2 === 0) px(f.x + x, 179 + y, K);
      const pose = f.flash > 0 ? 'hit' : f.y > 4 ? 'jump' : f.cr ? 'crouch' : f.cast > 0 ? (f.ch === 'ryu' ? 'hado' : 'sonic') : 'idle'; PRIG.draw('fighter', f.ch, pose, f.x, 176 - f.y, f.face, f.ph, { sc:80, env:1, flash:f.flash > .15 ? 1 : 0 }); }
    for (const b of S.balls) { const x = b.x, y = 176 - b.y, ry = b.f === S.p; for (let a = 0; a < 6.283; a += .12) for (let q = 0; q < 9; q++) px(x + Math.cos(a) * q * 1.2, y + Math.sin(a) * q, q > 6 ? (ry ? CY : V) : q > 3 ? (ry ? SKY : Y) : W); for (let k = 1; k < 4; k++) rect(x - b.f.face * (9 + k * 5) - 2, y + (k % 2 ? 2 : -3), 5, 2, ry ? (k % 2 ? SKY : CY) : (k % 2 ? Y : V)); if (b.high) px(x, y - 12, Y); }
    for (const s of S.sp) { const r = 4 + s.t * 50; for (let a = 0; a < 6.283; a += .4) px(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, s.t < .12 ? W : Y); }
    for (let i = 0; i < T44.hearts; i++) { rect(14 + i * 14, 8, 10, 9, i < S.p.hp ? R : DG); rect(242 - i * 14 - 10, 8, 10, 9, i < S.c.hp ? R : DG); } },
  hud(S) { txt('YOU', 14, 20, W, 8); txt('CPU', 242, 20, W, 8, 'right'); if (S.rt < 1) txt('FIGHT!', 128, 70, Y, 24, 'center'); hintS(S, 'Z LOW  X HIGH  UP JUMP  DOWN DUCK', 8, 212); },
  info(S) { return { hp:S.p.hp, ch:S.c.hp, balls:S.balls.length, t:+S.rt.toFixed(1) }; },
  bot(S, i) { const P = S.p; if (S.rt < 1) return i; const b = S.balls.find(b => b.f === S.c && P.x < b.x && b.x - P.x < 62 && b.x - P.x > 14); if (b) { if (b.high) i.d = 1; else if (P.y === 0) i.u = 1; } else if (P.cr && S.balls.some(b => b.f === S.c && b.x > P.x - 8 && b.x - P.x < 20)) i.d = 1;
    if (!b && P.cd <= 0 && P.y === 0 && !(S.balls.some(b => b.f === S.c && b.x - P.x < 90))) { if (S.rng() < .5) i.a = 1; else i.b = 1; } return i; } });
