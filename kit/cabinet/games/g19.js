// KEYS: Left/Right move, Up jump (hold in air to glide once bought), Z/Space place block ahead, X swing, Down+X drop bomb. Touch the ? shop to buy.
/* ===== MUSHROOM BEDWARS: sky islands, coin spawner, shop block, bridge the void, bomb the rival's bed. ===== */
const GY19 = 150, SHOP19 = 72, BEDX19 = 232, COST19 = [4, 6, 10];
const GAME = kit({ id:'g19', t1:'MUSHROOM', t2:'BEDWARS', sub:'BRIDGE. BOMB THE BED. WIN.', seed:191, off:19, secs:50,
  music:MUS(138, -17, false),
  setup(S) {
    S.tile = []; for (let c = 0; c < 16; c++) S.tile.push(c < 6 || c > 11 ? 1 : 0);
    S.p = { x:36, y:GY19, vx:0, vy:0, g:1, f:1, hp:3, inv:0, bl:0, co:0, gl:0, bomb:0, sw:0 };
    S.bought = 0; S.coins = []; S.cT = 0.4; S.ham = []; S.bombs = []; S.win = 0; S.flee = 0; S.ba = 0; S.bedOK = 1; S.homeOK = 1; S.dn = 0;
    S.en = [0, 1, 2].map(i => ({ x:204 + i * 20, d:-1, cd:2 + S.rng() * 2, dead:0, rs:0 }));
  },
  step(S, dt, inp, att) {
    const p = S.p, a = S.edge(inp, 'a'), b = S.edge(inp, 'b');
    if (S.win) { S.win -= dt; if (S.win <= 0) { sfx('win'); return finish(S, 'BED BLOWN! CLEAR', 400 + p.hp * 50); } }
    p.inv = Math.max(0, p.inv - dt); p.sw = Math.max(0, p.sw - dt); S.flee = Math.max(0, S.flee - dt);
    const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0); if (dir) p.f = dir;
    p.vx += (dir * 62 - p.vx) * Math.min(1, 12 * dt);
    if (inp.u && p.g) { p.vy = -215; p.g = 0; sfx('flap'); }
    p.vy += 600 * dt; if (p.gl && inp.u && p.vy > 40 && !p.g) p.vy = 40;
    p.x = clamp(p.x + p.vx * dt, 4, 252); const oy = p.y; p.y += p.vy * dt; p.g = 0;
    if (p.vy >= 0 && oy <= GY19 + 1 && p.y >= GY19 && S.tile[Math.floor(p.x / 16)]) { p.y = GY19; p.vy = 0; p.g = 1; }
    if (p.y > 235) { p.x = 36; p.y = 90; p.vy = 0; p.vx = 0; sfx('hurt'); popup(S, 'FELL!', 60, 90, R); }
    if (a && p.bl > 0) { const c = Math.floor(p.x / 16) + (p.f > 0 ? 1 : -1); if (c >= 0 && c < 16 && !S.tile[c]) { S.tile[c] = 1; p.bl--; sfx('land'); } }
    if (b) { if (inp.d && p.bomb) { p.bomb = 0; S.bombs.push({ x:p.x, y:p.y - 4, t:1.3 }); sfx('beep'); } else { p.sw = 0.2; sfx('swing'); for (const e of S.en) if (!e.dead && Math.abs(e.x - p.x - p.f * 10) < 14 && Math.abs(p.y - GY19) < 12) { e.dead = 1; e.rs = 3.5; sfx('pop'); } } }
    /* shop + coins */
    S.cT -= dt; if (S.cT <= 0) { S.cT = 0.7 + S.rng() * 0.4; S.coins.push({ x:36 + rint(S, 3) * 6, y:100, vy:0 }); }
    for (const c of S.coins) { c.vy += 400 * dt; c.y = Math.min(GY19 - 3, c.y + c.vy * dt); if (Math.abs(c.x - p.x) < 9 && Math.abs(c.y - p.y) < 14) { c.got = 1; p.co++; S.score += 10; sfx('coin'); } }
    S.coins = S.coins.filter(c => !c.got && S.coins.length < 14);
    if (S.bought < 3 && Math.abs(p.x - SHOP19) < 12 && p.co >= COST19[S.bought]) { p.co -= COST19[S.bought]; if (S.bought === 0) p.gl = 1; else if (S.bought === 1) p.bl = 8; else p.bomb = 1; popup(S, ['TAIL GLIDE!', 'WOOD x8', 'BOB-OMB!'][S.bought], SHOP19, 120, Y); S.bought++; sfx('power'); }
    /* rival koopa-folk */
    for (const e of S.en) {
      if (e.dead) { if (S.bedOK && (e.rs -= dt) <= 0) { e.dead = 0; e.x = 230; } continue; }
      const raider = e === S.en[0] && S.T > 20 && S.tile.slice(6, 12).every(Boolean);
      e.x += (raider ? -26 : e.d * 14) * dt; if (!raider && (e.x < 198 || e.x > 248)) e.d = -e.d;
      if (e.x < 14 && S.homeOK) { S.homeOK = 0; sfx('boom'); return finish(S, 'BED BROKEN', 0); }
      e.cd -= dt; if (e.cd <= 0 && Math.abs(e.x - p.x) < 130 && e.x > p.x - 20) { e.cd = 1.8 + S.rng() * 1.2; S.ham.push({ x:e.x, y:GY19 - 14, vx:-(30 + S.rng() * 40), vy:-130 }); sfx('throw'); }
      if (Math.abs(e.x - p.x) < 8 && Math.abs(p.y - GY19) < 12 && !p.inv) hurt19(S);
    }
    for (const h of S.ham) { h.x += h.vx * dt; h.vy += 400 * dt; h.y += h.vy * dt; if (Math.abs(h.x - p.x) < 7 && Math.abs(h.y - (p.y - 8)) < 9 && !p.inv) { h.y = 999; hurt19(S); } }
    S.ham = S.ham.filter(h => h.y < 240 && h.x > -10);
    for (const bm of S.bombs) { bm.t -= dt; bm.y = Math.min(GY19 - 3, bm.y + 60 * dt); if (bm.t <= 0) {
      sfx('boom'); S.fx = { x:bm.x, y:bm.y, t:0.5 }; for (const e of S.en) if (Math.abs(e.x - bm.x) < 40) { e.dead = 1; e.rs = 99; }
      if (Math.abs(bm.x - BEDX19) < 28 && S.bedOK) { S.bedOK = 0; S.win = 1.4; popup(S, 'BED DESTROYED!', 128, 70, R); for (const e of S.en) e.rs = 99; }
      if (Math.abs(bm.x - p.x) < 28 && Math.abs(bm.y - p.y) < 20) hurt19(S, 1); } }
    S.bombs = S.bombs.filter(x => x.t > 0);
    if (S.fx) { S.fx.t -= dt; if (S.fx.t <= 0) S.fx = null; }
  },
  draw(S) {
    clear(SKY);
    for (let i = 0; i < 5; i++) { const x = (i * 71 + Math.floor(S.T * 4)) % 300 - 20, y = 24 + i * 22; rect(x, y, 30, 8, W); rect(x + 6, y - 4, 18, 6, W); }
    for (let c = 0; c < 16; c++) if (S.tile[c]) { const x = c * 16, edge = c < 6 || c > 11; rect(x, GY19, 16, 5, GR); rect(x, GY19 + 5, 16, edge ? 24 : 16, edge ? BRK : M); rect(x, GY19 + 5, 1, edge ? 24 : 16, T); rect(x, GY19 + 5, 16, 1, T); if (!edge) rect(x + 7, GY19 + 8, 2, 8, T); }
    rect(32, GY19 - 12, 16, 12, GR); rect(30, GY19 - 14, 20, 4, F);
    rect(SHOP19 - 8, GY19 - 32, 16, 16, Y); rect(SHOP19 - 8, GY19 - 32, 16, 2, W); txt('?', SHOP19, GY19 - 30, R, 8, 'center');
    const bed = (x, c, ok) => { if (ok) { rect(x - 7, GY19 - 4, 15, 4, W); fillCircle(x, GY19 - 5, 7, c); rect(x - 7, GY19 - 5, 15, 3, c); px(x - 3, GY19 - 8, W); px(x + 2, GY19 - 7, W); } else rect(x - 6, GY19 - 2, 12, 2, M); };
    bed(12, R, S.homeOK); bed(BEDX19, PU, S.bedOK); if (S.bedOK && (Math.floor(S.T * 2) & 1)) txt('Z', BEDX19 + 6, GY19 - 24, W, 8);
    for (const c of S.coins) rect(c.x - 2, c.y - 3, 4, 5, Y);
    for (const e of S.en) if (!e.dead) { const x = Math.round(e.x); rect(x - 5, GY19 - 12, 10, 8, GR); rect(x - 4, GY19 - 14, 8, 3, F); px(x - 2, GY19 - 15, Y); px(x + 2, GY19 - 15, Y); rect(x - 4, GY19 - 5, 8, 5, L); rect(x - 3, GY19 - 9, 2, 2, K); rect(x + 1, GY19 - 9, 2, 2, K); rect(x - 7, GY19 - 12, 3, 5, W); }
    for (const h of S.ham) { rect(h.x - 3, h.y - 2, 6, 4, L); rect(h.x - 1, h.y - 5, 2, 8, T); }
    for (const bm of S.bombs) { fillCircle(bm.x, bm.y - 3, 4, K); if (Math.floor(S.T * 10) & 1) px(bm.x + 2, bm.y - 8, Y); }
    if (S.fx) fillCircle(S.fx.x, S.fx.y - 4, Math.round(30 * (1 - S.fx.t * 1.6)), S.fx.t > 0.25 ? Y : O);
    const p = S.p, x = Math.round(p.x), y = Math.round(p.y);
    if (!(p.inv > 0 && (Math.floor(S.T * 20) & 1))) { rect(x - 4, y - 9, 8, 9, W); rect(x - 4, y - 5, 8, 4, B); fillCircle(x, y - 12, 6, R); rect(x - 6, y - 12, 13, 3, R); px(x - 3, y - 15, W); px(x + 2, y - 14, W); px(x, y - 17, W); rect(x + (p.f > 0 ? 1 : -3), y - 8, 3, 2, K);
      if (p.gl) rect(x - p.f * 6, y - 4, 3, 2, O); if (p.sw > 0) rect(x + p.f * 5 - (p.f < 0 ? 8 : 0), y - 6, 8, 3, Y); if (p.bl) rect(x - 2, y - 2, 4, 2, BRK); }
  },
  hud(S, mode) {
    const p = S.p; txt('COINS ' + p.co, 4, 4, Y, 8); txt('WOOD ' + p.bl, 4, 14, BRK, 8); txt('HP ' + p.hp, 252, 4, R, 8, 'right'); txt(p.bomb ? 'BOMB READY' : '', 252, 14, W, 8, 'right');
    if (S.bought < 3) txt('NEXT: ' + ['TAIL', 'WOOD', 'BOMB'][S.bought] + ' ' + COST19[S.bought] + 'c', 128, 4, W, 8, 'center');
    if (mode === 'play' && S.T < 9) txt('UP JUMP  Z BUILD  X SWING  DN+X BOMB', 128, 208, W, 8, 'center');
  },
  bot(S, i) {
    const p = S.p, sx = Math.floor(S.T * 8) & 1;
    const go = tx => { if (tx > p.x + 3) i.r = 1; else if (tx < p.x - 3) i.l = 1; };
    for (const h of S.ham) if (h.x > p.x - 6 && h.x < p.x + 46 && p.g && h.y > GY19 - 30) i.u = 1;
    if (S.flee > 0) { i.l = 1; if (p.g) i.u = 1; return i; }
    if (S.bought < 3) { if (p.co >= COST19[S.bought]) go(SHOP19); else { const c = S.coins.find(c => c.y > 100) || { x:44 }; go(c.x); } return i; }
    const cl = Math.floor(p.x / 16), e = S.en.find(e => !e.dead && Math.abs(e.x - p.x) < 20);
    if (e) { p.f = e.x > p.x ? 1 : -1; if (e.x > p.x) i.r = 1; else i.l = 1; if (Math.abs(e.x - p.x - p.f * 10) < 14) i.b = sx; return i; }
    if (!S.tile[cl + 1] && cl < 15 && p.bl) { i.a = sx; i.r = 1; return i; }
    if (p.bomb && Math.abs(p.x - BEDX19) < 16 && p.g) { i.d = 1; i.b = 1; S.flee = 1.6; return i; }
    go(p.bomb ? BEDX19 - 8 : 36);
    return i;
  },
  info: S => ({ bought:S.bought, co:S.p.co, hp:S.p.hp, x:Math.round(S.p.x), bed:S.bedOK, win:S.win, en:S.en.filter(e => !e.dead).length }),
});
function hurt19(S, f) { const p = S.p; p.inv = 1; p.hp--; sfx('hurt'); p.vy = -120; if (p.hp <= 0) { p.hp = 3; p.x = 36; p.y = 90; p.vx = 0; popup(S, 'RESPAWN', 60, 90, R); } }
