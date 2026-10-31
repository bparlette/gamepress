// KEYS: Arrows move your critter (it attacks by itself). Hold the road: do not let soldiers reach the sleeping trainer. Kills trigger evolution (25% success).
/* ===== G32 CRITTER CLASH: pixel version of the "Clash of Critters" ad (square road ring, marching numbered soldiers, auto-attacking critter, evolution roulette).
   BRIEF  genre: lane defense + auto-battler | player: 8-way critter inside the ring, auto slash + orbiting swords | goal: survive 55 s with the trainer asleep
          lose: 12 soldiers reach the bed | hook: numbered HP soldiers file around the road; every 20 kills the critter tries to EVOLVE (25% success, else mutate +ATK)
          bot: parks at the arena edge nearest the front of the column | juice: slash crescents, damage numbers, evolution flash/fail text, form colours
   Reference: user-supplied frames (clash_frames_20.zip). Original pixel art, no assets copied. Engine: path, proj, hits(list), fx, imp unused. ===== */
const TUNE32 = { win:55, bed:12, speed:56, form:{ slash:[4, 6, 9, 13], swords:[1, 2, 3, 4], cd:[1.0, 0.85, 0.7, 0.55] }, evoEvery:20, evoP:0.25, mutate:2, swordR:22, swordDps:8, swordTick:0.28,
  slashR:70, slashSpeed:170, pierce:4,
  spawn: T => Math.max(0.3, 0.5 - T * 0.005), kinds:{ grunt:{ hp:6, sp:24, r:4, w:0.35 }, soldier:{ hp:15, sp:19, r:5, w:0.45 }, heavy:{ hp:20, sp:16, r:5, w:0.2 } } };
const PATH32 = ENG.path([[240, 196], [40, 196], [40, 44], [150, 44]]);
const DIG32 = { 0:'111101101101111', 1:'010110010010111', 2:'111001111100111', 3:'111001111001111', 4:'101101111001001', 5:'111100111001111', 6:'111100111101111', 7:'111001001010010', 8:'111101111101111', 9:'111101111001111' };
function num32(n, cx, y, col) { const s = String(Math.max(0, Math.ceil(n))), w = s.length * 4 - 1; let x = Math.round(cx - w / 2); for (const ch of s) { const d = DIG32[ch]; for (let i = 0; i < 15; i++) if (d[i] === '1') px(x + (i % 3), y + ((i / 3) | 0), col); x += 4; } }
const FORM32 = [[GR, F], [O, T], [PU, N], [Y, O]];                        // body / petal colours per evolution form
const GAME = kit({ id:'g32', t1:'CRITTER', t2:'CLASH', sub:'EVOLVE. HOLD THE ROAD.', seed:932, off:32, secs:55, music:MUS(140, -19, false),
  setup(S) { S.p = { x:128, y:120, hp:1, ang:0, inv:0 }; S.en = []; S.form = 0; S.atk = 0; S.bed = TUNE32.bed; S.kills = 0; S.next = TUNE32.evoEvery; S.sp = 0.5; S.cd = 0; S.sw = 0; S.evo = 0; S.msg = ''; S.mt = 0; },
  step(S, dt, inp) { const C = TUNE32, p = S.p, F_ = C.form;
    const ax = inp.ax !== undefined ? inp.ax : (inp.r ? 1 : 0) - (inp.l ? 1 : 0), ay = inp.ay !== undefined ? inp.ay : (inp.d ? 1 : 0) - (inp.u ? 1 : 0), m = Math.max(1, Math.hypot(ax, ay));
    p.x = clamp(p.x + ax / m * C.speed * dt, 58, 198); p.y = clamp(p.y + ay / m * C.speed * dt, 62, 178);
    /* spawns: marching column along the road */
    S.sp -= dt; if (S.sp <= 0) { S.sp += C.spawn(S.T); const r = S.rng(), k = r < C.kinds.grunt.w ? 'grunt' : r < C.kinds.grunt.w + C.kinds.soldier.w ? 'soldier' : 'heavy', K_ = C.kinds[k];
      S.en.push({ k, d:0, x:240, y:196, hp:K_.hp, hpMax:K_.hp, sp:K_.sp * (0.94 + S.rng() * 0.12), r:K_.r, hit:0, oc:0, dead:false }); }
    for (let i = S.en.length - 1; i >= 0; i--) { const e = S.en[i]; if (e.dead) { S.en.splice(i, 1); continue; } e.d += e.sp * dt; const q = PATH32.at(e.d); e.x = q.x; e.y = q.y; e.hit -= dt; e.oc -= dt;
      if (e.d >= PATH32.len) { S.en.splice(i, 1); S.bed--; sfx('hurt'); ENG.shake(S, 3); popup(S, 'OW!', 166, 56, R); if (S.bed <= 0) { sfx('die'); return finish(S, 'TRAINER WOKE UP'); } } }
    /* weapons: auto slash at the nearest enemy in range, orbiting swords */
    S.cd -= dt; if (S.cd <= 0) { let t = null, td = C.slashR * C.slashR; for (const e of S.en) { const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < td) { td = d; t = e; } }
      if (t) { S.cd = F_.cd[S.form]; const a = Math.atan2(t.y - p.y, t.x - p.x); p.ang = a; ENG.proj.fire(S, p.x, p.y, Math.cos(a) * C.slashSpeed, Math.sin(a) * C.slashSpeed, { life:0.55, r:5, dmg:F_.slash[S.form] + S.atk, pierce:C.pierce, bounds:[-10, -10, 266, 234] }); sfx('tick'); } }
    ENG.hits(S, (pr, e) => { e.hp -= pr.dmg; e.hit = 0.12; burst(S, e.x, e.y, W, 3); ENG.fx.add(S, 'num', e.x, e.y - 6, 0.5, { v:pr.dmg }); }, S.en);
    S.sw += dt * 3.4; const n = F_.swords[S.form];
    for (let k = 0; k < n; k++) { const a = S.sw + k * 6.2832 / n, sx = p.x + Math.cos(a) * C.swordR, sy = p.y + Math.sin(a) * C.swordR; for (const e of S.en) if (!e.dead && e.oc <= 0 && Math.hypot(e.x - sx, e.y - sy) < e.r + 4) { e.oc = C.swordTick; e.hp -= C.swordDps * C.swordTick + S.atk * 0.3; e.hit = 0.12; } }
    for (const e of S.en) if (!e.dead && e.hp <= 0) { e.dead = true; S.kills++; S.score += 10; sfx('pop'); burst(S, e.x, e.y, e.k === 'heavy' ? BRK : PK, 5); ENG.fx.add(S, 'pop', e.x, e.y, 0.25);
      if (S.kills >= S.next) { S.next += C.evoEvery; S.evo = 1.4; if (S.rng() < C.evoP && S.form < 3) { S.form++; S.msg = 'EVOLVED!'; sfx('super'); ENG.fx.add(S, 'evo', p.x, p.y, 0.8); } else { S.atk += C.mutate; S.msg = 'EVOLUTION FAILED  ATK+' + C.mutate; sfx('hurt'); } S.mt = 1.6; } }
    S.mt -= dt; if (S.T >= C.win) { sfx('win'); return finish(S, 'TRAINER SLEPT IN!', S.bed * 50); } },
  draw(S) { const C = TUNE32; clear(GR); for (let i = 0; i < 14; i++) { const x = (i * 53 + 17) % 256, y = (i * 71 + 9) % 224; if ((x < 30 || x > 226 || y < 26 || y > 208)) { fillCircle(x, y, 7, F); fillCircle(x, y - 2, 5, GR); } }
    rect(26, 34, 204, 172, DG); rect(52, 56, 152, 128, E);                                                                           // road ring + arena
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) fillCircle(76 + x * 52, 82 + y * 38, 9, GR);
    for (let x = 30; x < 226; x += 14) { rect(x, 44, 7, 2, L); rect(x, 196, 7, 2, L); } for (let y = 40; y < 206; y += 14) { rect(36, y, 2, 7, L); rect(214, y, 2, 7, L); }
    for (let i = 0; i < 6; i++) rect(150 + (i & 1) * 0, 36 + i * 3, 6, 3, i & 1 ? R : W);  rect(154, 38, 6, 16, R); for (let y = 38; y < 54; y += 4) rect(154, y, 6, 2, W);   // striped barrier
    rect(162, 38, 20, 14, SKY); rect(162, 38, 20, 4, W); rect(164, 41, 8, 4, PK); rect(166, 36, 6, 6, S);                              // bed + sleeping trainer
    const en = S.en.slice().sort((a, b) => a.y - b.y);
    for (const e of en) { const x = Math.round(e.x), y = Math.round(e.y), body = e.k === 'heavy' ? B : e.k === 'soldier' ? T : BRK; if (e.hit > 0) { rect(x - 3, y - 4, 7, 9, W); } else { rect(x - 3, y - 4, 7, 4, e.k === 'heavy' ? N : M); rect(x - 3, y, 7, 5, body); rect(x - 4, y + 1, 1, 3, K); rect(x + 4, y + 1, 1, 3, K); } num32(e.hp, x, y - 11, W); }
    ENG.fx.each(S, 'pop', (f, k) => fillCircle(Math.round(f.x), Math.round(f.y), Math.round(2 + k * 6), k < .5 ? W : Y));
    const p = S.p, n = C.form.swords[S.form], bc = FORM32[S.form];
    for (let k = 0; k < n; k++) { const a = S.sw + k * 6.2832 / n, sx = Math.round(p.x + Math.cos(a) * C.swordR), sy = Math.round(p.y + Math.sin(a) * C.swordR); rect(sx - 1, sy - 1, 3, 3, CY); px(sx, sy, W); px(sx + Math.round(Math.cos(a) * 2), sy + Math.round(Math.sin(a) * 2), CY); }
    for (const q of S.eproj || []) { const a = Math.atan2(q.vy, q.vx); for (let t = 0; t < 4; t++) px(q.x - Math.cos(a) * t * 1.5 + Math.cos(a + 1.57) * (t - 1.5), q.y - Math.sin(a) * t * 1.5 + Math.sin(a + 1.57) * (t - 1.5), t < 2 ? W : CY); rect(Math.round(q.x) - 1, Math.round(q.y) - 1, 3, 3, W); }
    fillCircle(Math.round(p.x), Math.round(p.y), 5 + (S.form > 1 ? 1 : 0), bc[0]); rect(Math.round(p.x) - 6, Math.round(p.y) - 7, 3, 3, bc[1]); rect(Math.round(p.x) + 3, Math.round(p.y) - 7, 3, 3, bc[1]); rect(Math.round(p.x) - 2, Math.round(p.y) - 1, 2, 2, K); rect(Math.round(p.x) + 1, Math.round(p.y) - 1, 2, 2, K); rect(Math.round(p.x) - 4, Math.round(p.y) - 4, 9, 2, bc[1]);
    ENG.fx.each(S, 'num', (f, k) => num32(f.v, Math.round(f.x), Math.round(f.y - k * 10), Y));
    ENG.fx.each(S, 'evo', (f, k) => { fillCircle(Math.round(f.x), Math.round(f.y), Math.round(8 + k * 40), k < .5 ? Y : W); fillCircle(Math.round(f.x), Math.round(f.y), Math.round(6 + k * 38), k < .5 ? W : GR); }); },
  hud(S) { txt('BED ' + S.bed, 4, 4, W, 8); txt(S.kills + ' KO', 252, 4, Y, 8, 'right'); txt('FORM ' + (S.form + 1) + '/4', 128, 4, CY, 8, 'center'); if (S.mt > 0) txt(S.msg, 128, 120, S.msg[0] === 'E' && S.msg[1] === 'V' && S.msg[2] === 'O' && S.msg[3] === 'L' && S.msg[4] === 'V' ? Y : R, 8, 'center'); hintS(S, 'ARROWS MOVE  IT FIGHTS BY ITSELF', 8, 212); },
  info(S) { return { bed:S.bed, kills:S.kills, form:S.form, atk:S.atk, en:S.en.length, x:Math.round(S.p.x), y:Math.round(S.p.y) }; },
  bot(S, i) { const p = S.p; let tx = 128, ty = 120, best = -1; for (const e of S.en) if (e.d > best) { best = e.d; tx = e.x; ty = e.y; }
    const gx = clamp(tx, 60, 196), gy = clamp(ty, 64, 176), dx = gx - p.x, dy = gy - p.y; return dirInp(i, Math.abs(dx) > 6 ? Math.sign(dx) : 0, Math.abs(dy) > 6 ? Math.sign(dy) : 0); },
});
