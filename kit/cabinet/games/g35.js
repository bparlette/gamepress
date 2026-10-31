// KEYS: Left/Right move, Z or X fire. Hold the locker room against the dead for 45 s.
/* ===== G35 LOCKER ROOM LAST STAND. 8-bit with a NATIVE per-frame character rig (pixrig.js): the soldier and every zombie are drawn fresh each frame from a skeleton
   (live walk cycle, aim, hit and down poses), no sprite assets. BRIEF  genre: lane shooter | player: move + fire | goal: survive WIN s | lose: hp 0
   bot: backs off when a zombie gets close, fires when one is in range | juice: muzzle flash, impact burst, hit flash, hit-stop, shake ===== */
const TUNE35 = { win:45, hp:5, speed:46, fire:{ cd:0.34, range:190, dmg:1 }, bite:{ r:20, every:0.9 }, minX:30, maxX:110, sc:56,
  spawn: T => Math.max(0.55, 2.2 - T * 0.04), cap:7, kinds:{ green:{ hp:3, sp:15 }, grey:{ hp:4, sp:12 }, yellow:{ hp:2, sp:24 } } };
const FY35 = 190, FL35 = 150;
const GAME = kit({ id:'g35', t1:'LOCKER', t2:'ROOM', sub:'THE DEAD ARE AT THE DOOR.', seed:935, off:35, secs:40, music:MUS(132, -19, true),
  setup(S) { S.p = { x:60, hp:TUNE35.hp, cd:0, ph:0, aim:0, flash:0, down:0 }; S.en = []; S.kills = 0; S.sp = 1; S.gun = null; S.imp = null; },
  step(S, dt, inp) { const C = TUNE35, p = S.p;
    if (p.down > 0) { p.down += dt; if (p.down > 1.3) return finish(S, 'OVERRUN'); return; }
    const ax = inp.ax !== undefined ? inp.ax : (inp.r ? 1 : 0) - (inp.l ? 1 : 0), fire = inp.a || inp.b;
    p.x = clamp(p.x + ax * C.speed * dt, C.minX, C.maxX); if (ax) p.ph += dt * 9 * (ax > 0 ? 1 : -1); p.cd -= dt; p.aim = Math.max(0, p.aim - dt); p.flash = Math.max(0, p.flash - dt);
    S.sp -= dt; if (S.sp <= 0 && S.en.length < C.cap) { S.sp = C.spawn(S.T) * (0.7 + S.rng() * 0.6); const k = ['green', 'green', 'grey', 'yellow'][Math.floor(S.rng() * 4)]; S.en.push({ x:280, k, hp:C.kinds[k].hp, ph:S.rng() * 6, hit:0, dead:0, bite:0 }); }
    S.gun = null; if (fire && p.cd <= 0) { p.cd = C.fire.cd; p.aim = 0.22; sfx('shoot'); let t = null; for (const e of S.en) if (!e.dead && e.x > p.x + 14 && e.x < p.x + C.fire.range && (!t || e.x < t.x)) t = e;
      S.gun = { x:p.x + 38, hit:t ? t.x - 4 : p.x + 120 }; if (t) { t.hp -= C.fire.dmg; t.hit = 0.1; t.x += 3; S.imp = { x:t.x, t:0.18 }; burst(S, t.x, FY35 - 24, R, 5); if (t.hp <= 0) { t.dead = 0.01; S.kills++; S.score += 10; sfx('hit'); ENG.impact(S, 'weak'); } } }
    if (S.imp) { S.imp.t -= dt; if (S.imp.t <= 0) S.imp = null; }
    for (const e of S.en) { e.ph += dt * 6;
      if (e.dead) { e.dead += dt; continue; } e.hit = Math.max(0, e.hit - dt);
      if (e.x > p.x + C.bite.r) e.x -= C.kinds[e.k].sp * dt * (e.hit > 0 ? 0.2 : 1); else { e.bite -= dt; if (e.bite <= 0) { e.bite = C.bite.every; p.hp--; p.flash = 0.25; sfx('hurt'); ENG.impact(S, 'strong'); S.score = Math.max(0, S.score - 5); if (p.hp <= 0) { p.down = 0.01; sfx('die'); } } } }
    S.en = S.en.filter(e => !e.dead || e.dead < 0.35);
    if (S.T >= C.win) return finish(S, 'CLEAR', S.kills * 5); },
  draw(S) { const C = TUNE35, p = S.p, sx = S.ecam && S.ecam.sh > 0 ? Math.round((S.rng() - .5) * S.ecam.sh * .4) : 0;
    rect(0, 0, 256, 224, K); rect(0, 0, 256, FL35, DG);
    for (let i = 0; i < 5; i++) { const x = 10 + i * 50 + sx; rect(x, 22, 42, 118, D); rect(x, 22, 42, 2, L); rect(x, 22, 2, 118, L); rect(x + 40, 22, 2, 118, DG); rect(x + 9, 34, 24, 12, B); rect(x + 9, 34, 24, 1, SKY); rect(x + 9, 45, 24, 1, N); for (let k = 0; k < 6; k++) rect(x + 6, 98 + k * 5, 30, 2, DG); rect(x + 34, 78, 3, 8, L); }
    rect(0, 80, 256, 3, L); rect(0, 83, 256, 1, DG); rect(0, FL35, 256, 2, D); rect(0, FL35 + 2, 256, 74, K); for (let y = FL35 + 4; y < 224; y += 8) for (let x = (y / 8 % 2) * 6; x < 256; x += 12) px(x, y, DG);
    const dith = (cx, w) => { for (let y = -2; y <= 2; y++) for (let x = -w; x <= w; x++) if ((x * x) / (w * w) + (y * y) / 6 < 1 && (x + y) % 2 === 0) px(cx + x, FY35 + y, DG); };
    dith(p.x + sx, p.down ? 26 : 12); for (const e of S.en) dith(e.x + sx, 11);
    const L2 = S.en.slice().sort((a, b) => b.x - a.x);
    for (const e of L2) PRIG.draw('zombie', e.k, e.dead ? 'hit' : 'walk', e.x + sx, FY35, -1, e.ph, { sc:C.sc, flash:e.hit > 0 ? 1 : 0 });
    const pose = p.down ? 'down' : p.aim > 0 ? 'aim' : 'walk'; const r = PRIG.draw('soldier', 'olive', pose, p.x + sx, FY35, 1, p.ph, { sc:C.sc, flash:p.flash > 0.12 ? 1 : 0 });
    if (S.gun && r.muzzle) { const mx = r.muzzle[0], my = r.muzzle[1]; rect(mx, my - 1, 9, 3, Y); rect(mx + 2, my - 3, 3, 7, Y); rect(mx, my, 6, 1, W); for (let x = mx + 10; x < S.gun.hit; x += 4) px(x, my, V); }
    if (S.imp) { const hx = S.imp.x, hy = FY35 - 26; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; px(hx + Math.cos(a) * 5, hy + Math.sin(a) * 5, k % 2 ? Y : W); px(hx + Math.cos(a) * 8, hy + Math.sin(a) * 8, Y); } rect(hx - 1, hy - 1, 3, 3, W); } },
  hud(S) { const p = S.p; for (let i = 0; i < TUNE35.hp; i++) { rect(8 + i * 11, 6, 8, 7, i < p.hp ? R : DG); rect(8 + i * 11, 6, 8, 1, i < p.hp ? PK : D); }
    txt('KILLS ' + S.kills, 248, 6, W, 8, 'right'); txt(Math.max(0, Math.ceil(TUNE35.win - S.T)) + 's', 128, 6, Y, 8, 'center'); hintS(S, 'LEFT/RIGHT MOVE   Z FIRE', 8, 212); },
  info(S) { const e = S.en.filter(q => !q.dead); return { x:Math.round(S.p.x), hp:S.p.hp, kills:S.kills, en:e.length, near:e.length ? Math.round(Math.min(...e.map(q => q.x)) - S.p.x) : 999 }; },
  bot(S, i) { const e = S.en.filter(q => !q.dead && q.x > S.p.x), n = e.length ? Math.min(...e.map(q => q.x)) - S.p.x : 999; const want = n < 56 ? -1 : (S.p.x < 70 && n > 110 ? 1 : 0);
    if (want < 0) i.l = 1; if (want > 0) i.r = 1; if (n < TUNE35.fire.range) i.a = 1; return i; } });
