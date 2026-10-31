// KEYS: Arrows move (auto-fire at the nearest bug). Survive the timer.
/* ===== S1 ARENA SURVIVOR starter. Genre: top-down swarm survival (the shape of Vampire Metroid g17, trimmed).
   BRIEF  genre: arena survivor | player: 8-way mover, auto-fire | goal: survive WIN s | lose: hp 0 | hook: the horde thickens every second
          bot: kites away from the nearest bugs, drifts to centre | win cond: S.T >= TUNE.win | juice: pop rings, hit flash, shake
   Uses ONLY engine.js (swarm, proj, fx, imp, cam) + kit helpers: no hand-rolled collision/swarm/effect-aging. ===== */
const TUNE1 = { win:40, hp:100, pspeed:58, hurt:8, inv:0.8,                       // player
  fire:{ every:0.16, speed:170, life:1.2, dmg:1, pierce:1 },                                 // weapon
  spawn: T => Math.max(0.16, 0.6 / (1 + T * 0.3)), cap:90, eliteAfter:12, eliteP:0.2,   // spawn interval curve (s) / horde cap / elite share
  kinds:{ bug:{ hp:2, sp:22, r:4, score:5 }, elite:{ hp:4, sp:22, r:5, score:12 } }, speedJitter:[0.9, 1.1] };
const GAME = kit({ id:'s1', t1:'ARENA', t2:'SURVIVOR', sub:'KITE THE HORDE. OUTLAST IT.', seed:901, off:31, secs:40, music:MUS(150, -21, true),
  setup(S) { S.p = { x:128, y:112, hp:TUNE1.hp, inv:0, ang:0 }; S.fire = 0; S.kills = 0;
    ENG.swarm.init(S, { cap:TUNE1.cap, spawn:() => TUNE1.spawn(S.T), pick:S => (S.T > TUNE1.eliteAfter && S.rng() < TUNE1.eliteP) ? 'elite' : 'bug', kinds:TUNE1.kinds, ring:[130, 150], bounds:[-8, -8, 264, 232] }); },
  step(S, dt, inp) { const p = S.p;
    const ax = inp.ax !== undefined ? inp.ax : (inp.r ? 1 : 0) - (inp.l ? 1 : 0), ay = inp.ay !== undefined ? inp.ay : (inp.d ? 1 : 0) - (inp.u ? 1 : 0), m = Math.hypot(ax, ay) || 1;
    p.x = clamp(p.x + ax / Math.max(1, m) * TUNE1.pspeed * dt, 8, 248); p.y = clamp(p.y + ay / Math.max(1, m) * TUNE1.pspeed * dt, 20, 208); p.inv -= dt;
    const dead = ENG.swarm.step(S, dt, p.x, p.y);
    for (const e of dead) { S.kills++; S.score += TUNE1.kinds[e.k].score; burst(S, e.x, e.y, GR, 5); ENG.fx.add(S, 'pop', e.x, e.y, 0.25); sfx('pop'); }
    let t = null, td = 1e9; for (const e of S.swarm.list) { const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < td) { td = d; t = e; } }
    S.fire -= dt; if (S.fire <= 0 && t) { S.fire = TUNE1.fire.every; const a = Math.atan2(t.y - p.y, t.x - p.x); p.ang = a; ENG.proj.fire(S, p.x, p.y, Math.cos(a) * TUNE1.fire.speed, Math.sin(a) * TUNE1.fire.speed, { life:TUNE1.fire.life, dmg:TUNE1.fire.dmg, pierce:TUNE1.fire.pierce, r:3, bounds:[-10, -10, 266, 234] }); sfx('tick'); }
    ENG.hits(S, (pr, e) => { ENG.swarm.hurt(S, e, pr.dmg, p.x, p.y); });
    for (const e of S.swarm.list) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < e.r + 4 && p.inv <= 0) { p.hp -= TUNE1.hurt; p.inv = TUNE1.inv; sfx('hurt'); ENG.shake(S, 3); popup(S, '-' + TUNE1.hurt, p.x, p.y - 10, R); }
    if (p.hp <= 0) return finish(S, 'OVERRUN');
    if (S.T >= TUNE1.win) { sfx('win'); return finish(S, 'SURVIVED!', Math.round(p.hp) * 5); } },
  draw(S) { clear(DG); for (let y = 16; y < 224; y += 16) for (let x = 0; x < 256; x += 16) if (((x + y) >> 4) & 1) rect(x, y, 16, 16, K);
    for (const e of S.swarm.list) { const c = e.k === 'elite' ? PU : GR; rect(Math.round(e.x - e.r), Math.round(e.y - e.r), e.r * 2, e.r * 2, e.hit > 0 ? W : c); }
    for (const q of S.eproj || []) rect(Math.round(q.x - 1), Math.round(q.y - 1), 3, 3, Y);
    ENG.fx.each(S, 'pop', (f, k) => fillCircle(Math.round(f.x), Math.round(f.y), Math.round(3 + k * 8), k < .5 ? W : Y));
    const p = S.p; if (p.inv <= 0 || (S.T * 20 | 0) & 1) { rect(Math.round(p.x - 4), Math.round(p.y - 4), 8, 8, CY); rect(Math.round(p.x + Math.cos(p.ang) * 5 - 1), Math.round(p.y + Math.sin(p.ang) * 5 - 1), 3, 3, W); } },
  drawHD(S, g) { g.fillStyle = HD.lg(g, 0, 0, 0, 224, [[0, '#1a2230'], [1, '#0c1018']]); g.fillRect(0, 0, 256, 224);
    for (const e of S.swarm.list) { HD.shadow(g, e.x, e.y + e.r, e.r, e.r * 0.5); HD.ball(g, e.x, e.y, e.r, e.hit > 0 ? '#ffffff' : e.k === 'elite' ? '#d09aff' : '#a2dc78', e.k === 'elite' ? '#5a2c7a' : '#2f6a28'); }
    for (const q of S.eproj || []) { HD.glow(g, q.x, q.y, 6, '255,220,90', 0.8); HD.ball(g, q.x, q.y, 1.6, '#fff8c0', '#f0b020'); }
    ENG.fx.each(S, 'pop', (f, k) => HD.glow(g, f.x, f.y, 4 + k * 12, '255,200,80', 1 - k));
    const p = S.p; if (p.inv <= 0 || (S.T * 20 | 0) & 1) { HD.shadow(g, p.x, p.y + 6, 6, 3); HD.ball(g, p.x, p.y, 5, '#8af0ff', '#1a5a8a'); HD.part(g, p.x + Math.cos(p.ang) * 3, p.y + Math.sin(p.ang) * 3 - 1, 6, 2, 1, '#d0d8e0', '#505864'); }
    for (const q of S.parts || []) { g.fillStyle = '#7fd860'; g.fillRect(q.x, q.y, 1.5, 1.5); } },
  hud(S) { txt('HP ' + Math.max(0, Math.round(S.p.hp)), 4, 4, W, 8); txt(String(S.kills) + ' KILLS', 252, 4, W, 8, 'right'); txt(Math.max(0, Math.ceil(TUNE1.win - S.T)) + 's', 128, 4, Y, 8, 'center'); hintS(S, 'ARROWS MOVE  AUTO-FIRE', 8, 212); },
  info(S) { return { hp:Math.round(S.p.hp), kills:S.kills, en:S.swarm.list.length }; },
  bot(S, i) { const p = S.p; let fx = 0, fy = 0;
    for (const e of S.swarm.list) { const dx = p.x - e.x, dy = p.y - e.y, d2 = dx * dx + dy * dy + 1; if (d2 < 3600) { fx += dx / d2; fy += dy / d2; } }
    fx += (128 - p.x) * 0.00012; fy += (112 - p.y) * 0.00012; if (p.x < 24) fx += 0.01; if (p.x > 232) fx -= 0.01; if (p.y < 36) fy += 0.01; if (p.y > 190) fy -= 0.01;
    return dirInp(i, Math.abs(fx) > 0.0004 ? Math.sign(fx) : 0, Math.abs(fy) > 0.0004 ? Math.sign(fy) : 0); },
});
