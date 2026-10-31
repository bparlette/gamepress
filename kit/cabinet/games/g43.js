// KEYS: Tap Z then X alternately to shove. Push the CPU out of the ring before he pushes you.
/* ===== G43 SUMO SHOVE (quick): tug-of-war shove on a straw ring. Alternate-tap power decays; whoever builds more pushes the pair toward the other edge. Ryu vs Guile, native rig poses (grab / hit / knock). ===== */
const T43 = { ring:78, tap:.55, decay:2, push:.5, cpu:[6.4, .35], time:32 };
const GAME = kit({ id:'g43', t1:'SUMO', t2:'SHOVE', sub:'PUSH HIM OUT OF THE RING', seed:943, off:43, secs:60, music:MUS(140, -18, true),
  setup(S) { S.pos = 0; S.pw = 0; S.cw = 0; S.last = ''; S.rt = 0; S.acc = 0; S.out = 0; S.pA = 0; S.pB = 0; S.ph = 0; S.loser = 0; S.stag = 0; },
  step(S, dt, inp) { const C = T43; S.rt += dt; S.ph += dt * 6; if (S.out) { S.out += dt; if (S.out > 1.8) return finish(S, S.loser < 0 ? 'YOU WIN' : 'YOU LOSE', S.loser < 0 ? 1500 + Math.round((C.time - S.rt) * 40) : 0); return; } if (S.rt < 1.2) return;
    const ea = inp.a && !S.pA, eb = inp.b && !S.pB; S.pA = inp.a; S.pB = inp.b; for (const s of [ea ? 'a' : '', eb ? 'b' : '']) if (s) { if (S.last !== s) { S.pw += C.tap; S.last = s; ENG.impact(S, { stop:0, shake:.5, flash:0 }); } else S.pw *= .9; }
    S.acc += dt * (C.cpu[0] + Math.sin(S.rt * 1.1) * 1.1); if (S.acc >= 1) { S.acc -= 1; S.cw += C.tap; } S.pw -= S.pw * C.decay * dt; S.cw -= S.cw * C.decay * dt;
    S.pos += (S.pw - S.cw) * C.push * dt; S.pos = Math.max(-1.05, Math.min(1.05, S.pos));
    if (Math.abs(S.pos) >= 1 || S.rt > C.time) { S.out = .001; S.loser = Math.abs(S.pos) >= 1 ? -Math.sign(S.pos) : (S.pos >= 0 ? 1 : -1); sfx('hit'); ENG.impact(S, 'strong'); } },
  draw(S) { const C = T43; rect(0, 0, 256, 224, K); const bands = [N, N, B, B, SKY, PK, O]; for (let i = 0; i < 7; i++) rect(0, i * 14, 256, 14, bands[i]);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 22; i++) { const cx = i * 12 + r * 5, bob = Math.round(Math.sin(S.rt * 5 + i + r) * (S.out ? 3 : 1)); rect(cx, 80 + r * 10 + bob, 7, 8, [R, B, GR, Y, PU][(i + r) % 5]); rect(cx + 1, 75 + r * 10 + bob, 5, 5, (i + r) % 3 ? S : T); }
    rect(0, 120, 256, 104, DG); rect(0, 120, 256, 2, L);
    for (let y = -14; y <= 14; y++) for (let x = -(C.ring + 14); x <= C.ring + 14; x++) { const e = (x * x) / ((C.ring + 14) ** 2) + (y * y) / 200; if (e < 1) px(128 + x, 176 + y, e > .8 ? Y : (e > .72 ? O : BRK)); }
    for (const sx of [-1, 1]) rect(128 + sx * C.ring - 3, 166, 6, 20, Y);
    const mid = 128 + S.pos * 62, lose = S.out ? S.loser : 0, t = S.out;
    const fig = (side, x, ch, pw) => { const l = lose === side, win = lose === -side; let pose = 'grab', env = .6 + Math.min(.4, pw * .25), rot = 0, y = 176, xx = x; if (l) { pose = 'knock'; env = 1; rot = Math.min(150, t * 140); y = 176 + Math.min(14, t * 18); xx = x + (-side) * t * 90; } else if (win) { pose = 'idle'; env = 1; }
      for (let yy = -2; yy <= 2; yy++) for (let xx2 = -11; xx2 <= 11; xx2++) if ((xx2 * xx2) / 121 + (yy * yy) / 5 < 1 && (xx2 + yy) % 2 === 0 && !l) px(x + xx2, 178 + yy, K); PRIG.draw('fighter', ch, pose, xx, y, side, S.ph + (side > 0 ? 0 : 1.5), { sc:78, env, rot }); };
    fig(1, mid - 15, 'ryu', S.pw); fig(-1, mid + 15, 'guile', S.cw);
    rect(40, 10, 176, 6, W); rect(41, 11, 174, 4, K); rect(128, 9, 1, 8, Y); rect(128 + Math.round(S.pos * 86) - 2, 8, 5, 10, S.pos >= 0 ? GR : R); rect(14, 24, Math.round(Math.min(1, S.pw / 2.2) * 60), 4, CY); rect(242 - Math.round(Math.min(1, S.cw / 2.2) * 60), 24, Math.round(Math.min(1, S.cw / 2.2) * 60), 4, O); },
  hud(S) { txt('YOU', 14, 6, W, 8); txt('CPU', 242, 6, W, 8, 'right'); txt(String(Math.max(0, Math.ceil(T43.time - S.rt))), 128, 22, W, 8, 'center'); if (S.rt < 1.2) txt('SHOVE!', 128, 70, Y, 24, 'center'); hintS(S, 'TAP Z X ALTERNATELY TO PUSH', 8, 212); },
  info(S) { return { pos:+S.pos.toFixed(2), pw:+S.pw.toFixed(2), cw:+S.cw.toFixed(2), t:+S.rt.toFixed(1) }; },
  bot(S, i) { if (S.rt < 1.2) return i; S.bacc = (S.bacc || 0) + 7.4 / 60; if (S.bacc >= 1) { S.bacc -= 1; S.bs = S.bs === 'a' ? 'b' : 'a'; S.bh = 2; } if (S.bh > 0) { S.bh--; if (S.bs === 'a') i.a = 1; else i.b = 1; } return i; } });
