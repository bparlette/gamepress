// KEYS: Arrows move the cursor, Z/Space builds a tower on grass. Stop every creep reaching the gate.
/* ===== S3 GATE GUARD: TOWER DEFENSE starter (path + build cursor + waves).
   BRIEF  genre: tower defense | player: tile cursor, spends gold on towers | goal: survive all waves | lose: 10 gate lives gone
          bot: builds on a fixed priority list of tiles beside the path, as gold allows | win: wave 8 cleared | juice: muzzle flash, coin pops, creep burst
   Uses engine.js (path, proj, hits via swarm-free creeps list, fx). Same S, three tiers. ===== */
const TUNE3 = { lives:10, gold:70, waves:8, ts:16, cost:25, range:44, every:0.55, shot:200, dmg:2,           // economy + tower
  creep:{ hp: w => 3 + w * 2, sp: w => 32 + w * 2, n: w => 6 + w * 2, gap: w => Math.max(0.35, 0.8 - w * 0.05), bounty:6, kinds:{ norm:{ hp:1, sp:1, b:1 }, runner:{ hp:0.6, sp:1.6, b:1 }, tank:{ hp:2.2, sp:0.7, b:2 } }, pick:[0.5, 0.78] }, wavePause:3, leak:1 };   // wave curve
const PATH3 = ENG.path([[-8, 72], [88, 72], [88, 152], [168, 152], [168, 72], [264, 72]]);
const onPath3 = (tx, ty) => { for (let d = 0; d < PATH3.len; d += 6) { const q = PATH3.at(d); if (Math.abs(q.x - (tx * 16 + 8)) < 14 && Math.abs(q.y - (ty * 16 + 8)) < 14) return true; } return false; };
const SPOTS3 = [[6, 6], [4, 6], [6, 3], [5, 10], [7, 10], [11, 6], [9, 6], [11, 10], [13, 6], [13, 3], [9, 3], [3, 3], [4, 9], [7, 8], [11, 8], [9, 9], [12, 9], [3, 6], [14, 6], [14, 3]].filter(([x, y]) => !onPath3(x, y));   // bot build order (tile x,y): beside the path bends
const GAME = kit({ id:'s3', t1:'GATE', t2:'GUARD', sub:'BUILD. SHOOT. HOLD THE GATE.', seed:903, off:33, secs:40, music:MUS(130, -19, true),
  setup(S) { S.lives = TUNE3.lives; S.gold = TUNE3.gold; S.wave = 0; S.towers = []; S.creeps = []; S.queue = 0; S.sp = 0; S.pause = 1; S.kills = 0; S.cur = { x:6, y:5, mv:0 }; S.cd = 0; },
  step(S, dt, inp) { const C = TUNE3, cu = S.cur;
    /* cursor: one tile per press, auto-repeat while held */
    cu.mv -= dt; const dx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), dy = (inp.d ? 1 : 0) - (inp.u ? 1 : 0);
    if ((dx || dy) && cu.mv <= 0) { cu.x = clamp(cu.x + dx, 0, 15); cu.y = clamp(cu.y + dy, 1, 13); cu.mv = 0.09; }
    if (S.edge(inp, 'a') && S.gold >= C.cost && !onPath3(cu.x, cu.y) && !S.towers.some(t => t.tx === cu.x && t.ty === cu.y)) { S.gold -= C.cost; S.towers.push({ tx:cu.x, ty:cu.y, x:cu.x * 16 + 8, y:cu.y * 16 + 8, cd:0, ang:0 }); ENG.fx.add(S, 'build', cu.x * 16 + 8, cu.y * 16 + 8, 0.35); sfx('power'); }
    /* waves */
    if (S.queue === 0 && S.creeps.length === 0) { S.pause -= dt; if (S.pause <= 0) { if (S.wave >= C.waves) { sfx('win'); return finish(S, 'GATE HELD!', S.lives * 100 + S.gold); } S.wave++; S.queue = C.creep.n(S.wave); S.sp = 0; popup(S, 'WAVE ' + S.wave, 128, 100, Y); } }
    S.sp -= dt; if (S.queue > 0 && S.sp <= 0) { S.queue--; S.sp = C.creep.gap(S.wave); const rr = S.rng(), kd = rr < C.creep.pick[0] ? 'norm' : rr < C.creep.pick[1] ? 'runner' : 'tank', K_ = C.creep.kinds[kd], hp = Math.round(C.creep.hp(S.wave) * K_.hp); S.creeps.push({ d:0, x:-8, y:72, hp, hpMax:hp, kd, b:K_.b, sp:C.creep.sp(S.wave) * K_.sp * (0.92 + S.rng() * 0.16), hit:0, r:kd === 'tank' ? 6 : 5, dead:false }); if (S.queue === 0) S.pause = C.wavePause; }
    for (let i = S.creeps.length - 1; i >= 0; i--) { const c = S.creeps[i]; c.d += c.sp * dt; const q = PATH3.at(c.d); c.x = q.x; c.y = q.y; c.hit -= dt;
      if (c.dead) { S.creeps.splice(i, 1); continue; }
      if (c.d >= PATH3.len) { S.creeps.splice(i, 1); S.lives -= C.leak; sfx('hurt'); ENG.shake(S, 3); if (S.lives <= 0) return finish(S, 'GATE FELL'); } }
    /* towers fire through the shared projectile engine; hits resolved in one place */
    for (const t of S.towers) { t.cd -= dt; if (t.cd > 0) continue; let b = null, bd = -1; for (const c of S.creeps) if (!c.dead && Math.hypot(c.x - t.x, c.y - t.y) < C.range && c.d > bd) { b = c; bd = c.d; }
      if (b) { t.cd = C.every; const a = Math.atan2(b.y - t.y, b.x - t.x); t.ang = a; ENG.proj.fire(S, t.x, t.y, Math.cos(a) * C.shot, Math.sin(a) * C.shot, { life:0.5, r:3, dmg:C.dmg, bounds:[-10, -10, 270, 240] }); ENG.fx.add(S, 'muzzle', t.x + Math.cos(a) * 7, t.y + Math.sin(a) * 7, 0.08); sfx('tick'); } }
    for (const p of S.eproj || []) { if (p.dead) continue; for (const c of S.creeps) if (!c.dead && Math.hypot(c.x - p.x, c.y - p.y) < c.r + p.r) { c.hp -= p.dmg; c.hit = 0.1; p.dead = true;
      if (c.hp <= 0) { c.dead = true; S.kills++; S.gold += C.creep.bounty * c.b; S.score += 10; burst(S, c.x, c.y, GR, 6); ENG.fx.add(S, 'pop', c.x, c.y, 0.25); sfx('pop'); } break; } } },
  draw(S) { clear(GR); for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) if ((x + y) & 1) rect(x * 16, 16 + y * 16 - 16, 16, 16, F);
    for (let d = 0; d < PATH3.len; d += 4) { const q = PATH3.at(d); rect(Math.round(q.x - 8), Math.round(q.y - 8), 16, 16, T); }
    rect(240, 56, 16, 32, R);
    for (const t of S.towers) { rect(t.x - 6, t.y - 6, 12, 12, D); rect(t.x - 4, t.y - 4, 8, 8, CY); rect(Math.round(t.x + Math.cos(t.ang) * 5) - 1, Math.round(t.y + Math.sin(t.ang) * 5) - 1, 3, 3, W); }
    for (const c of S.creeps) rect(Math.round(c.x - 4), Math.round(c.y - 4), 8, 8, c.hit > 0 ? W : c.kd === 'runner' ? Y : c.kd === 'tank' ? R : PU);
    for (const q of S.eproj || []) rect(Math.round(q.x - 1), Math.round(q.y - 1), 3, 3, Y);
    ENG.fx.each(S, 'pop', (f, k) => fillCircle(Math.round(f.x), Math.round(f.y), Math.round(2 + k * 7), k < .5 ? W : Y));
    const cu = S.cur; if ((S.T * 6 | 0) & 1) { rect(cu.x * 16, cu.y * 16, 16, 1, W); rect(cu.x * 16, cu.y * 16 + 15, 16, 1, W); rect(cu.x * 16, cu.y * 16, 1, 16, W); rect(cu.x * 16 + 15, cu.y * 16, 1, 16, W); } },
  drawHD(S, g) { g.fillStyle = HD.lg(g, 0, 0, 0, 224, [[0, '#4a9a40'], [1, '#2c6a2c']]); g.fillRect(0, 0, 256, 224);
    g.lineWidth = 15; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#8a6a3c'; g.beginPath(); PATH3.pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); g.lineWidth = 11; g.strokeStyle = '#b8935a'; g.stroke();
    HD.part(g, 238, 54, 18, 36, 2, '#e05040', '#7a1a14');
    for (const t of S.towers) { HD.shadow(g, t.x, t.y + 6, 8, 3); HD.part(g, t.x - 6, t.y - 6, 12, 12, 3, '#9aa8b8', '#38424e'); HD.ball(g, t.x, t.y, 4, '#8af0ff', '#1a5a8a'); HD.part(g, t.x + Math.cos(t.ang) * 3 - 1, t.y + Math.sin(t.ang) * 3 - 1, 6, 2.4, 1, '#e0e0e0', '#505864'); }
    for (const c of S.creeps) { HD.shadow(g, c.x, c.y + 5, 5, 2); HD.ball(g, c.x, c.y, 5, c.hit > 0 ? '#fff' : c.kd === 'runner' ? '#ffe070' : c.kd === 'tank' ? '#f07070' : '#d08cf0', '#5a2c7a'); HD.bar && HD.bar(g, c.x - 6, c.y - 9, 12, 2, c.hp / c.hpMax, '#60e060', '#208020'); }
    for (const q of S.eproj || []) { HD.glow(g, q.x, q.y, 6, '255,220,90', 0.8); HD.ball(g, q.x, q.y, 1.6, '#fff8c0', '#f0b020'); }
    ENG.fx.each(S, 'pop', (f, k) => HD.glow(g, f.x, f.y, 4 + k * 12, '255,200,80', 1 - k)); ENG.fx.each(S, 'muzzle', (f, k) => HD.glow(g, f.x, f.y, 7, '255,240,160', 1 - k)); ENG.fx.each(S, 'build', (f, k) => HD.glow(g, f.x, f.y, 6 + k * 14, '140,240,255', 1 - k));
    const cu = S.cur; g.strokeStyle = (S.T * 6 | 0) & 1 ? '#fff' : '#ffe060'; g.lineWidth = 1.2; g.strokeRect(cu.x * 16 + 0.6, cu.y * 16 + 0.6, 14.8, 14.8); },
  hud(S) { txt('GATE ' + S.lives, 4, 4, W, 8); txt('GOLD ' + S.gold, 252, 4, Y, 8, 'right'); txt('WAVE ' + S.wave + '/' + TUNE3.waves, 128, 4, CY, 8, 'center'); hintS(S, 'ARROWS CURSOR  Z BUILD 25G', 8, 212); },
  info(S) { return { lives:S.lives, gold:S.gold, wave:S.wave, towers:S.towers.length, kills:S.kills }; },
  bot(S, i) { const want = SPOTS3.find(([x, y]) => !S.towers.some(t => t.tx === x && t.ty === y)); if (!want) return i; const cu = S.cur;
    if (cu.x !== want[0] || cu.y !== want[1]) { if (cu.x < want[0]) i.r = 1; if (cu.x > want[0]) i.l = 1; if (cu.x === want[0]) { if (cu.y < want[1]) i.d = 1; if (cu.y > want[1]) i.u = 1; } }
    else if (S.gold >= TUNE3.cost && ((S.T * 30 | 0) & 1)) i.a = 1; return i; },
});
