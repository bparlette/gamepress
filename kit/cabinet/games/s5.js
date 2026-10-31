// KEYS: Arrows move, Z swings the sword. Clear the rooms, take the key, unlock the door, beat the boss.
/* ===== S5 KEEP KEY: MINI-ZELDA DUNGEON starter (4 single-screen rooms, sword, key + locked door, boss).
   BRIEF  genre: top-down dungeon (Zelda-like) | player: 4-way walk, short sword swing | goal: kill the boss behind the locked door
          lose: hp 0 (6 half-hearts) | hook: every seed rearranges blocks and monsters | bot: BFS to monsters/key/doors, swings when close
          win: boss dead | juice: swing arc, knockback, hit flash, boss telegraph, heart drops
   Layout: [start 0,0][hall 1,0] / [boss 0,1 (locked from start)][key room 1,1]. Uses engine.js (grid, move, imp with walls, fx) and gamekit bfs. ===== */
const TUNE5 = { w:16, h:11, ts:16, oy:24, hp:6, speed:62, swordCd:0.32, swordT:0.16, reach:15, inv:1.0, knock:110,
  slime:{ hp:2, sp:26, chase:44, sight:80, dmg:1, turn:[0.8, 1.6] }, boss:{ hp:8, sp:22, dash:105, dmg:1, tele:0.7, every:2.8 }, count:[3, 5], heartDrop:0.5, heal:2, blocks:[3, 5] };
function room5(S, rx, ry) { const C = TUNE5, G = ENG.grid(C.w, C.h, C.ts, 0);
  for (let x = 0; x < C.w; x++) { G.set(x, 0, 1); G.set(x, C.h - 1, 1); } for (let y = 0; y < C.h; y++) { G.set(0, y, 1); G.set(C.w - 1, y, 1); }
  const door = { l:rx === 1 && ry === 0, r:rx === 0 && ry === 0, d:(rx === 1 && ry === 0) || (rx === 0 && ry === 0), u:(rx === 1 && ry === 1) || (rx === 0 && ry === 1) };   // openings (locked one handled by lock flag)
  if (door.l) for (let y = 4; y <= 6; y++) G.set(0, y, 0); if (door.r) for (let y = 4; y <= 6; y++) G.set(C.w - 1, y, 0);
  if (rx === 1 && ry === 0) for (let x = 7; x <= 8; x++) G.set(x, C.h - 1, 0);          // hall -> key room
  if (rx === 1 && ry === 1) for (let x = 7; x <= 8; x++) G.set(x, 0, 0);
  if (rx === 0 && ry === 0) for (let x = 7; x <= 8; x++) G.set(x, C.h - 1, 1);          // start -> boss: LOCKED (stays solid until the key is used)
  if (rx === 0 && ry === 1) for (let x = 7; x <= 8; x++) G.set(x, 0, 1);
  const RM = { rx, ry, G, en:[], cleared:false, item:null, kind:ry === 1 && rx === 0 ? 'boss' : rx === 0 && ry === 0 ? 'start' : rx === 1 && ry === 0 ? 'hall' : 'key' };
  const free = (x, y) => !(x >= 6 && x <= 9) && !(y >= 3 && y <= 7);
  if (RM.kind !== 'boss') for (let k = 0, n = C.blocks[0] + rint(S, C.blocks[1] - C.blocks[0] + 1); k < n; k++) { const x = 2 + rint(S, 12), y = 2 + rint(S, 7); if (free(x, y) && free(x + 1, y + 1) && x < 14 && y < 9) { G.set(x, y, 1); G.set(x + 1, y, 1); G.set(x, y + 1, 1); G.set(x + 1, y + 1, 1); } }
  if (RM.kind === 'boss') RM.en.push({ k:'boss', x:112, y:60, w:14, h:14, hp:C.boss.hp, hpMax:C.boss.hp, st:0, t:1.2, dx:0, dy:0, hit:0, ix:0, iy:0, dead:false });
  else if (RM.kind !== 'start') { const n = C.count[0] + rint(S, C.count[1] - C.count[0] + 1); for (let k = 0, tries = 0; k < n && tries < 80; tries++) { const x = 2 + rint(S, 12), y = 2 + rint(S, 7); if (!G.get(x, y) && !free(x, y) === false && free(x, y)) { RM.en.push({ k:'slime', x:x * 16 + 3, y:y * 16 + 3, w:10, h:10, hp:C.slime.hp, hpMax:C.slime.hp, t:0, dx:0, dy:0, hit:0, ix:0, iy:0, dead:false }); k++; } } }
  RM.cleared = RM.en.length === 0; return RM; }
const GAME = kit({ id:'s5', t1:'KEEP', t2:'KEY', sub:'SWORD. KEY. BOSS.', seed:905, off:35, secs:40, dir:'4', music:MUS(120, -22, true),
  setup(S) { const C = TUNE5; S.rooms = [[room5(S, 0, 0), room5(S, 1, 0)], [room5(S, 0, 1), room5(S, 1, 1)]]; S.rx = 0; S.ry = 0; S.hasKey = false; S.unlocked = false; S.kills = 0;
    S.p = { x:56, y:80, w:10, h:10, hp:C.hp, inv:0, fx:1, fy:0, cd:0, sw:0, swId:0, ix:0, iy:0 }; S.drops = []; S.won = 0; },
  step(S, dt, inp) { const C = TUNE5, p = S.p, RM = S.rooms[S.ry][S.rx], G = RM.G; p.inv -= dt; p.cd -= dt; p.sw -= dt;
    if (S.won) { S.won -= dt; if (S.won <= 0) { sfx('win'); return finish(S, 'DUNGEON CLEARED!', 300 + p.hp * 100); } return; }
    const dx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), dy = (inp.d ? 1 : 0) - (inp.u ? 1 : 0), m = Math.hypot(dx, dy) || 1;
    if (dx || dy) { if (Math.abs(dx) >= Math.abs(dy) && dx) { p.fx = Math.sign(dx); p.fy = 0; } else if (dy) { p.fx = 0; p.fy = Math.sign(dy); } }
    ENG.move(p, G.solidAt, dx / m * C.speed * dt, 0); ENG.move(p, G.solidAt, 0, dy / m * C.speed * dt); ENG.imp.step(p, dt, G.solidAt);
    /* room transitions through the openings */
    const cx = p.x + 5, cy = p.y + 5, goto = (nx, ny, x, y) => { S.rx = nx; S.ry = ny; p.x = x; p.y = y; sfx('tick'); };
    if (p.x < 1 && dx < 0 && S.rx > 0) goto(S.rx - 1, S.ry, C.w * C.ts - 22, p.y); else if (p.x > C.w * C.ts - 11 && dx > 0 && S.rx < 1) goto(S.rx + 1, S.ry, 12, p.y);
    else if (p.y < 1 && dy < 0 && S.ry > 0) goto(S.rx, S.ry - 1, p.x, C.h * C.ts - 22); else if (p.y > C.h * C.ts - 11 && dy > 0 && S.ry < 1) goto(S.rx, S.ry + 1, p.x, 12);
    const R2 = S.rooms[S.ry][S.rx], G2 = R2.G;
    /* locked door: walking into it with the key opens it for good */
    if (S.hasKey && !S.unlocked && S.rx === 0 && S.ry === 0 && p.y > C.h * C.ts - 30 && cx > 112 && cx < 144) { S.unlocked = true; S.hasKey = false; for (let x = 7; x <= 8; x++) { S.rooms[0][0].G.set(x, C.h - 1, 0); S.rooms[1][0].G.set(x, 0, 0); } sfx('power'); popup(S, 'UNLOCKED!', 128, 120, Y); }
    /* sword */
    if (S.edge(inp, 'a') && p.cd <= 0) { p.cd = C.swordCd; p.sw = C.swordT; p.swId++; ENG.fx.add(S, 'swing', cx + p.fx * 10, cy + p.fy * 10, C.swordT, { fx:p.fx, fy:p.fy }); sfx('swing'); }
    if (p.sw > 0) { const hb = { x:cx + p.fx * C.reach - 8, y:cy + p.fy * C.reach - 8, w:16, h:16 };
      for (const e of R2.en) if (!e.dead && e.swId !== p.swId && hit(hb, e)) { e.swId = p.swId; e.hp -= 1; e.hit = 0.15; ENG.imp.push(e, e.x - p.x, e.y - p.y, C.knock); sfx('pop'); burst(S, e.x + 5, e.y + 5, e.k === 'boss' ? R : GR, 6); if (e.hp <= 0) { e.dead = true; S.kills++; S.score += e.k === 'boss' ? 500 : 50; if (e.k === 'boss') { S.won = 1.2; ENG.fx.add(S, 'boom', e.x, e.y, 0.6); sfx('super'); } else if (S.rng() < C.heartDrop) S.drops.push({ x:e.x + 2, y:e.y + 2, rx:S.rx, ry:S.ry }); } } }
    /* monsters */
    for (const e of R2.en) { if (e.dead) continue; e.hit -= dt; ENG.imp.step(e, dt, G2.solidAt); const ex = p.x - e.x, ey = p.y - e.y, d = Math.hypot(ex, ey) || 1;
      if (e.k === 'slime') { e.t -= dt; if (e.t <= 0) { e.t = C.slime.turn[0] + S.rng() * (C.slime.turn[1] - C.slime.turn[0]); const a = S.rng() * 6.283; e.dx = Math.cos(a); e.dy = Math.sin(a); }
        const sp = d < C.slime.sight ? C.slime.chase : C.slime.sp, vx = d < C.slime.sight ? ex / d : e.dx, vy = d < C.slime.sight ? ey / d : e.dy; if (!(e.ix || e.iy)) { ENG.move(e, G2.solidAt, vx * sp * dt, 0); ENG.move(e, G2.solidAt, 0, vy * sp * dt); } }
      else { e.t -= dt; if (e.st === 0) { if (e.t <= 0) { e.st = 1; e.t = C.boss.tele; e.dx = ex / d; e.dy = ey / d; sfx('boom'); } else { ENG.move(e, G2.solidAt, ex / d * C.boss.sp * dt, 0); ENG.move(e, G2.solidAt, 0, ey / d * C.boss.sp * dt); } }
        else if (e.st === 1) { if (e.t <= 0) { e.st = 2; e.t = 0.45; } } else { ENG.move(e, G2.solidAt, e.dx * C.boss.dash * dt, 0); ENG.move(e, G2.solidAt, 0, e.dy * C.boss.dash * dt); if (e.t <= 0) { e.st = 0; e.t = C.boss.every; } } }
      const dmg = e.k === 'boss' ? C.boss.dmg : C.slime.dmg; if (p.inv <= 0 && hit(p, e)) { p.hp -= dmg; p.inv = C.inv; ENG.imp.push(p, p.x - e.x, p.y - e.y, C.knock * 1.2); sfx('hurt'); ENG.shake(S, 3); if (p.hp <= 0) { sfx('die'); return finish(S, 'YOU DIED'); } } }
    for (let i = S.drops.length - 1; i >= 0; i--) { const q = S.drops[i]; if (q.rx === S.rx && q.ry === S.ry && Math.abs(q.x - cx) < 9 && Math.abs(q.y - cy) < 9) { p.hp = Math.min(C.hp, p.hp + C.heal); S.drops.splice(i, 1); sfx('coin'); } }
    if (!R2.cleared && R2.en.every(e => e.dead)) { R2.cleared = true; S.drops.push({ x:120, y:104, rx:S.rx, ry:S.ry });   /* every cleared room pays a heart */ if (R2.kind === 'key') { R2.item = { x:120, y:80 }; popup(S, 'KEY!', 128, 90, Y); sfx('power'); } }
    if (R2.item && Math.abs(R2.item.x + 3 - cx) < 12 && Math.abs(R2.item.y + 5 - cy) < 12) { R2.item = null; S.hasKey = true; sfx('coin'); } },
  draw(S) { const C = TUNE5, RM = S.rooms[S.ry][S.rx], G = RM.G, oy = C.oy; clear(K); rect(0, oy, 256, 176, DG);
    for (let y = 0; y < C.h; y++) for (let x = 0; x < C.w; x++) { const t = G.get(x, y); if (t === 1) { const lock = !S.unlocked && ((S.rx === 0 && S.ry === 0 && y === C.h - 1 && (x === 7 || x === 8)) || (S.rx === 0 && S.ry === 1 && y === 0 && (x === 7 || x === 8))); rect(x * 16, oy + y * 16, 16, 16, lock ? Y : (x === 0 || y === 0 || x === C.w - 1 || y === C.h - 1) ? T : D); if (!lock) rect(x * 16 + 1, oy + y * 16 + 1, 14, 6, BRK); } else if ((x + y) & 1) rect(x * 16, oy + y * 16, 16, 16, K); }
    for (const q of S.drops) if (q.rx === S.rx && q.ry === S.ry) rect(q.x - 2, oy + q.y - 2, 5, 5, R);
    if (RM.item) rect(RM.item.x, oy + RM.item.y, 6, 10, Y);
    for (const e of RM.en) if (!e.dead) rect(Math.round(e.x), oy + Math.round(e.y), e.w, e.h, e.hit > 0 ? W : e.k === 'boss' ? (e.st === 1 && (S.T * 20 | 0) & 1 ? Y : R) : GR);
    ENG.fx.each(S, 'swing', (f, k) => { rect(Math.round(f.x - 5 + f.fx * 6), oy + Math.round(f.y - 5 + f.fy * 6), 10, 10, k < .5 ? W : L); });
    const p = S.p; if (p.inv <= 0 || (S.T * 20 | 0) & 1) { rect(Math.round(p.x), oy + Math.round(p.y), 10, 10, CY); rect(Math.round(p.x) + 3 + p.fx * 3, oy + Math.round(p.y) + 3 + p.fy * 3, 3, 3, W); }
    for (let i = 0; i < C.hp / 2; i++) { const full = S.p.hp >= (i + 1) * 2, half = S.p.hp === i * 2 + 1; rect(4 + i * 10, 6, 8, 8, full ? R : half ? PK : D); }
    if (S.hasKey) rect(40, 6, 5, 9, Y); },
  drawHD(S, g) { const C = TUNE5, RM = S.rooms[S.ry][S.rx], G = RM.G; g.fillStyle = '#10141c'; g.fillRect(0, 0, 256, 224); g.save(); g.translate(0, C.oy);
    for (let y = 0; y < C.h; y++) for (let x = 0; x < C.w; x++) { const t = G.get(x, y), lock = !S.unlocked && ((S.rx === 0 && S.ry === 0 && y === C.h - 1 && (x === 7 || x === 8)) || (S.rx === 0 && S.ry === 1 && y === 0 && (x === 7 || x === 8)));
      g.fillStyle = t === 1 ? (lock ? HD.lg(g, 0, y * 16, 0, y * 16 + 16, [[0, '#f8d860'], [1, '#a07810']]) : HD.lg(g, 0, y * 16, 0, y * 16 + 16, [[0, '#6a6a78'], [1, '#34343e']])) : ((x + y) & 1 ? '#2c3240' : '#262c38'); g.fillRect(x * 16, y * 16, 16.3, 16.3); if (t === 1 && !lock) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x * 16, y * 16, 16, 1.4); } }
    for (const q of S.drops) if (q.rx === S.rx && q.ry === S.ry) { HD.glow(g, q.x, q.y, 8, '255,90,120', 0.6); HD.ball(g, q.x, q.y, 3, '#ff8aa0', '#c01840'); }
    if (RM.item) { HD.glow(g, RM.item.x + 3, RM.item.y + 5, 12, '255,220,80', 0.8); HD.part(g, RM.item.x, RM.item.y, 6, 10, 2, '#fff0a0', '#c89810'); }
    for (const e of RM.en) if (!e.dead) { HD.shadow(g, e.x + e.w / 2, e.y + e.h, e.w / 2 + 1, 3); if (e.k === 'boss') { HD.part(g, e.x, e.y, e.w, e.h, 4, e.hit > 0 ? '#fff' : e.st === 1 ? '#ffe070' : '#e05060', '#601020'); g.fillStyle = '#fff'; g.fillRect(e.x + 3, e.y + 4, 2.5, 2.5); g.fillRect(e.x + 8.5, e.y + 4, 2.5, 2.5); } else { HD.ball(g, e.x + 5, e.y + 5, 5.5, e.hit > 0 ? '#fff' : '#9be070', '#2f6a28'); g.fillStyle = '#10200c'; g.fillRect(e.x + 2.5, e.y + 3.5, 1.6, 1.6); g.fillRect(e.x + 6.2, e.y + 3.5, 1.6, 1.6); } }
    ENG.fx.each(S, 'swing', (f, k) => { g.save(); g.translate(f.x, f.y); g.rotate(Math.atan2(f.fy, f.fx)); g.strokeStyle = `rgba(255,255,255,${1 - k})`; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 9, -1.1 + k * 0.6, 1.1 + k * 0.6); g.stroke(); g.restore(); HD.glow(g, f.x, f.y, 12, '200,230,255', 0.6 * (1 - k)); });
    ENG.fx.each(S, 'boom', (f, k) => HD.glow(g, f.x + 7, f.y + 7, 10 + k * 40, '255,200,80', 1 - k));
    const p = S.p; if (p.inv <= 0 || (S.T * 20 | 0) & 1) { HD.shadow(g, p.x + 5, p.y + 10, 6, 2.5); HD.part(g, p.x, p.y, 10, 10, 3, '#6ae8ff', '#1a6a8a'); g.fillStyle = '#fff'; g.fillRect(p.x + 3 + p.fx * 2.5, p.y + 3 + p.fy * 2.5, 3, 3); }
    g.restore(); for (let i = 0; i < C.hp / 2; i++) { const full = p.hp >= (i + 1) * 2, half = p.hp === i * 2 + 1; HD.ball(g, 8 + i * 11, 10, 4, full ? '#ff6a80' : half ? '#ffb0c0' : '#40343c', full ? '#b01838' : '#201a20'); } if (S.hasKey) HD.part(g, 42, 5, 5, 10, 2, '#fff0a0', '#c89810'); },
  hud(S) { txt('KILLS ' + S.kills, 252, 4, Y, 8, 'right'); if (S.hasKey) txt('KEY', 56, 4, Y, 8); hintS(S, 'Z SWORD  KEY OPENS THE BOTTOM DOOR', 8, 212); },
  info(S) { const b = S.rooms[1][0].en[0]; return { r:S.rx + ',' + S.ry, hp:S.p.hp, key:S.hasKey ? 1 : 0, open:S.unlocked ? 1 : 0, kills:S.kills, boss:b ? b.hp : 0, x:Math.round(S.p.x), y:Math.round(S.p.y) }; },
  bot(S, i) { const C = TUNE5, p = S.p, RM = S.rooms[S.ry][S.rx], G = RM.G, cx = p.x + 5, cy = p.y + 5, tile = v => clamp(Math.floor(v / 16), 0, 15);
    const alive = RM.en.filter(e => !e.dead); const go = (tx, ty) => { const st = bfs(C.w, C.h, (x, y) => G.get(x, y) !== 1, tile(cx), tile(cy), (x, y) => x === tx && y === ty); const mx = (tile(cx) * 16 + 8) - cx, my = (tile(cy) * 16 + 8) - cy;
      if (!st) return false; const nx = (tile(cx) + st.dx) * 16 + 8, ny = (tile(cy) + st.dy) * 16 + 8; return dirInp(i, Math.abs(nx - cx) > 2 ? Math.sign(nx - cx) : 0, Math.abs(ny - cy) > 2 ? Math.sign(ny - cy) : 0), true; };
    if (alive.length) { let t = alive[0], bd = 1e9; for (const e of alive) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; t = e; } }
      if (bd < 24) { const ex = t.x + t.w / 2 - cx, ey = t.y + t.h / 2 - cy; if (Math.abs(ex) > Math.abs(ey)) { if (ex > 0) i.r = 1; else i.l = 1; } else { if (ey > 0) i.d = 1; else i.u = 1; } if (bd < 22 && ((S.T * 30 | 0) & 1)) i.a = 1; }
      else go(tile(t.x + 5), tile(t.y + 5)); return i; }
    const dr = S.drops.find(q => q.rx === S.rx && q.ry === S.ry); if (dr && p.hp < C.hp) { const hx = dr.x - cx, hy = dr.y - cy; if (Math.hypot(hx, hy) < 40) dirInp(i, Math.abs(hx) > 2 ? Math.sign(hx) : 0, Math.abs(hy) > 2 ? Math.sign(hy) : 0); else go(tile(dr.x), tile(dr.y)); return i; }
    if (RM.item) { const ix = RM.item.x + 3 - cx, iy = RM.item.y + 5 - cy; if (Math.hypot(ix, iy) < 40) dirInp(i, Math.abs(ix) > 2 ? Math.sign(ix) : 0, Math.abs(iy) > 2 ? Math.sign(iy) : 0); else go(tile(RM.item.x), tile(RM.item.y)); return i; }
    /* navigate rooms: need key -> key room (1,1) via hall; have key -> start room, then south door; else boss */
    const want = S.hasKey || S.unlocked ? (S.unlocked ? [0, 1] : [0, 0]) : [1, 1], at = [S.rx, S.ry];
    if (at[0] === want[0] && at[1] === want[1]) { if (S.hasKey && !S.unlocked) { if (Math.abs(128 - cx) > 4) dirInp(i, Math.sign(128 - cx), 0); else i.d = 1; } return i; }
    let door; if (S.unlocked && at[0] === 0 && at[1] === 0) door = [7, 10]; else if (at[0] === 0 && at[1] === 0 && !S.unlocked && !S.hasKey) door = [15, 5]; else if (at[0] === 1 && at[1] === 0) door = S.hasKey || S.unlocked ? [0, 5] : [7, 10]; else if (at[0] === 1 && at[1] === 1) door = [7, 0]; else door = [7, 10];
    go(door[0], door[1]); if (door[0] === 7 && door[1] === 10) i.d = 1; if (door[0] === 15) i.r = 1; if (door[0] === 0) i.l = 1; if (door[1] === 0) i.u = 1; return i; },
});
