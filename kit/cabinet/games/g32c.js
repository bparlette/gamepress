// NEEDS: art
// KEYS: Arrows move your critter (it attacks by itself). Hold the road: do not let soldiers reach the sleeping trainer. Kills trigger evolution (25% success).
/* ===== G32C CRITTER CLASH ART RIG (same sim as g32; SVG rig characters + painted-style world + WebGL lighting). Original of: pixel version of the "Clash of Critters" ad (square road ring, marching numbered soldiers, auto-attacking critter, evolution roulette).
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
/* ---- art tier: SVG rigs (art/gen-clash.py -> atlas), baked world, GL lights. Sim untouched: tiers.cjs g32 g32c.art must match. ---- */
for (let f = 0; f < 4; f++) RIG.def('critter' + f, { scale:0.17, anchor:[50, 92], order:['legB', 'legF', 'body', 'head', 'arm'], pivots:{ legB:[40, 74], legF:[62, 74], body:[50, 64], head:[50, 46], arm:[66, 58] } });
for (const [k, sc] of [['G', 0.1], ['S', 0.115], ['H', 0.135]]) RIG.def('troop' + k, { scale:sc, anchor:[50, 112], order:['legB', 'legF', 'torso', 'head', 'arm'], pivots:{ legB:[40, 78], legF:[60, 78], torso:[50, 60], head:[50, 34], arm:[66, 50] } });
const TK32 = { grunt:'troopG', soldier:'troopS', heavy:'troopH' };
function world32() { return HD.spr('world32', 256, 224, (g) => {
  g.fillStyle = HD.lg(g, 0, 0, 0, 224, [[0, '#3f9a48'], [1, '#2a7a38']]); g.fillRect(0, 0, 256, 224);
  for (let k = 0; k < 90; k++) { const x = hash(k, 1) * 256, y = hash(k, 2) * 224, r = 6 + hash(k, 3) * 14; g.fillStyle = HD.rg(g, x, y, 0, r, [[0, `rgba(${hash(k, 4) < 0.5 ? '70,170,80' : '30,100,50'},0.35)`], [1, 'rgba(0,0,0,0)']]); g.fillRect(x - r, y - r, r * 2, r * 2); }   /* lawn patches: no tiling */
  for (let i = 0; i < 16; i++) { const x = (i * 53 + 17) % 256, y = (i * 71 + 9) % 224; if (x < 28 || x > 228 || y < 28 || y > 206) { HD.shadow(g, x + 2, y + 9, 9, 3, 0.4); HD.part(g, x - 2, y - 2, 4, 11, 1.5, '#7a5230', '#3a2410'); HD.ball(g, x, y - 6, 8 + hash(i, 5) * 3, '#58c060', '#1e6a30'); HD.ball(g, x - 2, y - 9, 5, '#7ae080', '#2a8a3c'); } }
  g.fillStyle = '#20242c'; HD.rr(g, 25, 33, 206, 174, 7); g.fill(); g.fillStyle = HD.lg(g, 0, 36, 0, 204, [[0, '#4a5060'], [1, '#2c3038']]); HD.rr(g, 27, 35, 202, 170, 6); g.fill();
  for (let k = 0; k < 160; k++) { g.fillStyle = `rgba(255,255,255,${0.02 + hash(k, 9) * 0.03})`; g.fillRect(27 + hash(k, 6) * 200, 35 + hash(k, 7) * 168, 1 + hash(k, 8) * 3, 1); }
  g.fillStyle = HD.lg(g, 0, 56, 0, 184, [[0, '#7ad060'], [1, '#4aa044']]); HD.rr(g, 51, 55, 154, 130, 4); g.fill(); g.strokeStyle = '#e8e0c8'; g.lineWidth = 1.6; HD.rr(g, 51, 55, 154, 130, 4); g.stroke();
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) { const cx = 76 + x * 52, cy = 82 + y * 38; g.fillStyle = 'rgba(30,110,40,0.55)'; g.beginPath(); g.ellipse(cx, cy, 11, 9, 0, 0, 6.283); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 0.8; g.stroke(); g.fillStyle = 'rgba(210,255,190,0.35)'; g.fillRect(cx - 1, cy - 4, 2, 8); g.fillRect(cx - 4, cy - 1, 8, 2); }
  g.fillStyle = 'rgba(255,255,255,0.7)'; for (let x = 30; x < 226; x += 14) { g.fillRect(x, 43.5, 7, 2); g.fillRect(x, 195.5, 7, 2); } for (let y = 40; y < 206; y += 14) { g.fillRect(35.5, y, 2, 7); g.fillRect(213.5, y, 2, 7); }
  g.fillStyle = '#d83030'; g.fillRect(154, 36, 6, 18); g.fillStyle = '#fff'; for (let y = 36; y < 54; y += 6) g.fillRect(154, y, 6, 3);
}); }
function bed32(g, T) { HD.shadow(g, 172, 53, 13, 3, 0.4); HD.part(g, 161, 36, 24, 17, 3, '#e8d8c0', '#9a7a58'); HD.part(g, 163, 41, 20, 11, 3, '#6aa8ff', '#2a58b8'); HD.part(g, 164, 37, 9, 6, 2.5, '#ffffff', '#c8d0e0'); HD.ball(g, 168.5, 39.5, 3, '#f6d0a8', '#c8946a'); g.fillStyle = '#10131a'; g.fillRect(167, 39.2, 1, 0.5); g.fillRect(169.4, 39.2, 1, 0.5);
  g.font = FONT(4.5); g.textAlign = 'center'; for (let i = 0; i < 3; i++) { const k = ((T * 0.5 + i / 3) % 1); g.fillStyle = `rgba(255,255,255,${1 - k})`; g.fillText('Z', 176 + i * 4 + k * 4, 34 - k * 10); } }
function num32HD(g, v, x, y) { g.font = FONT(4.4); g.textAlign = 'center'; g.lineWidth = 1.5; g.strokeStyle = '#10131a'; g.lineJoin = 'round'; g.strokeText(String(Math.ceil(v)), x, y); g.fillStyle = '#fff'; g.fillText(String(Math.ceil(v)), x, y); }
function drawHD32(S, g) { const C = TUNE32, T = S.T, p = S.p; g.drawImage(world32(), 0, 0, 256, 224); bed32(g, T);
  const en = S.en.slice().sort((a, b) => a.y - b.y);
  for (const e of en) { const q = PATH32.at(e.d), fl = Math.cos(q.a) < -0.2, ph = e.d * 0.42, sw = Math.sin(ph), big = e.k === 'heavy' ? 1.25 : e.k === 'grunt' ? 0.9 : 1, key = TK32[e.k];
    HD.shadow(g, e.x, e.y + 1, 5 * big, 2, 0.45); if (RIG.ready(key)) RIG.draw(g, key, e.x, e.y + 3, { flip:fl, a:1, tint:'#ffffff', ta:e.hit > 0 ? 0.85 : 0, pose:{ legB:{ rot:sw * 0.5 }, legF:{ rot:-sw * 0.5 }, torso:{ oy:-Math.abs(sw) * 1.2 }, head:{ oy:-Math.abs(sw) * 1.4, rot:sw * 0.06 }, arm:{ rot:-0.5 + sw * 0.35 } } }); else HD.ball(g, e.x, e.y - 4, 4.5, '#c8a070', '#5a3e28');
    num32HD(g, e.hp, e.x, e.y - 17 * big); }
  const n = C.form.swords[S.form], br = S.sw, fl = Math.cos(p.ang) < 0, key = 'critter' + S.form, bob = Math.sin(T * 6) * 0.6;
  for (let k = 0; k < n; k++) { const a = br + k * 6.2832 / n, sx = p.x + Math.cos(a) * C.swordR, sy = p.y + Math.sin(a) * C.swordR - 3; HD.glow(g, sx, sy, 8, '90,230,255', 0.7); g.save(); g.translate(sx, sy); g.rotate(a + 1.57); HD.part(g, -1.1, -5.5, 2.2, 8, 0.8, '#ffffff', '#6ae8ff'); HD.part(g, -2.6, 2, 5.2, 1.4, 0.5, '#d8a030', '#7a5010'); g.restore(); }
  HD.shadow(g, p.x, p.y + 5, 8, 3, 0.5); if (RIG.ready(key)) RIG.draw(g, key, p.x, p.y + 8, { flip:fl, sx:1 + (S.cd > 0.8 * C.form.cd[S.form] ? 0.08 : 0), sy:1 - (S.cd > 0.8 * C.form.cd[S.form] ? 0.06 : 0), pose:{ legB:{ rot:Math.sin(T * 9) * 0.25 }, legF:{ rot:-Math.sin(T * 9) * 0.25 }, body:{ oy:bob * 0.4 }, head:{ oy:bob * 0.7, rot:Math.sin(T * 3) * 0.05 }, arm:{ rot:(fl ? Math.PI - p.ang : p.ang) * 0.5 - 0.2 } } }); else HD.ball(g, p.x, p.y, 6, '#8be070', '#2a7a30');
  for (const q of S.eproj || []) { const a = Math.atan2(q.vy, q.vx); HD.glow(g, q.x, q.y, 10, '120,230,255', 0.8); g.save(); g.translate(q.x, q.y); g.rotate(a); g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2; g.beginPath(); g.arc(-4, 0, 7, -0.9, 0.9); g.stroke(); g.strokeStyle = 'rgba(90,220,255,0.55)'; g.lineWidth = 4; g.beginPath(); g.arc(-4, 0, 7, -0.8, 0.8); g.stroke(); g.restore(); }
  ENG.fx.each(S, 'pop', (f, k) => HD.glow(g, f.x, f.y, 5 + k * 12, '255,210,120', 1 - k)); for (const q of S.parts || []) { g.fillStyle = '#fff6c0'; g.fillRect(q.x, q.y, 1.4, 1.4); }
  ENG.fx.each(S, 'num', (f, k) => { g.font = FONT(4.6); g.textAlign = 'center'; g.fillStyle = `rgba(255,224,90,${1 - k})`; g.strokeStyle = `rgba(0,0,0,${1 - k})`; g.lineWidth = 1.2; g.strokeText(String(f.v), f.x, f.y - k * 10); g.fillText(String(f.v), f.x, f.y - k * 10); });
  ENG.fx.each(S, 'evo', (f, k) => { HD.glow(g, f.x, f.y, 14 + k * 70, '255,224,120', 1 - k); g.save(); g.translate(f.x, f.y); g.rotate(k * 3); g.strokeStyle = `rgba(255,255,220,${1 - k})`; g.lineWidth = 1.4; for (let i = 0; i < 10; i++) { g.rotate(0.628); g.beginPath(); g.moveTo(10 + k * 20, 0); g.lineTo(26 + k * 50, 0); g.stroke(); } g.restore(); });
  g.fillStyle = HD.rg(g, 128, 112, 90, 150, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,10,20,0.35)']]); g.fillRect(0, 0, 256, 224);
  if (typeof GLPOST !== 'undefined' && window.GLPOST_ON) { const W = (x, y) => [x / 256, y / 224]; GLPOST.clear(); let l;
    l = W(p.x, p.y - 4); GLPOST.light(l[0], l[1], 0.3, 0.8, [0.55, 0.9, 1]); l = W(172, 44); GLPOST.light(l[0], l[1], 0.22, 0.6, [1, 0.85, 0.55]);
    for (const q of (S.eproj || []).slice(0, 6)) { l = W(q.x, q.y); GLPOST.light(l[0], l[1], 0.1, 0.9, [0.4, 0.9, 1]); }
    ENG.fx.each(S, 'evo', (f, k) => { l = W(f.x, f.y); GLPOST.light(l[0], l[1], 0.5, 2.2 * (1 - k), [1, 0.85, 0.4]); }); ENG.fx.each(S, 'pop', (f, k) => { l = W(f.x, f.y); GLPOST.light(l[0], l[1], 0.08, 1.2 * (1 - k), [1, 0.8, 0.5]); });
    GLPOST.fx.ca = Math.min(1.4, (S.ecam && S.ecam.sh ? S.ecam.sh * 0.3 : 0)); GLPOST.fx.hurt = S.bed <= 4 ? 0.3 + 0.2 * Math.sin(T * 6) : 0; GLPOST.fx.flash = S.evo > 0 ? Math.min(0.5, S.evo * 0.3) : 0; GLPOST.fx.ember = 0.15; } }
const GAME = kit({ id:'g32c', t1:'CRITTER', t2:'CLASH ART', sub:'EVOLVE. HOLD THE ROAD.', seed:932, off:32, secs:55, music:MUS(140, -19, false),
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
  drawHD(S, g) { drawHD32(S, g); },
  hud(S) { txt('BED ' + S.bed, 4, 4, W, 8); txt(S.kills + ' KO', 252, 4, Y, 8, 'right'); txt('FORM ' + (S.form + 1) + '/4', 128, 4, CY, 8, 'center'); if (S.mt > 0) txt(S.msg, 128, 120, S.msg[0] === 'E' && S.msg[1] === 'V' && S.msg[2] === 'O' && S.msg[3] === 'L' && S.msg[4] === 'V' ? Y : R, 8, 'center'); hintS(S, 'ARROWS MOVE  IT FIGHTS BY ITSELF', 8, 212); },
  info(S) { return { bed:S.bed, kills:S.kills, form:S.form, atk:S.atk, en:S.en.length, x:Math.round(S.p.x), y:Math.round(S.p.y) }; },
  bot(S, i) { const p = S.p; let tx = 128, ty = 120, best = -1; for (const e of S.en) if (e.d > best) { best = e.d; tx = e.x; ty = e.y; }
    const gx = clamp(tx, 60, 196), gy = clamp(ty, 64, 176), dx = gx - p.x, dy = gy - p.y; return dirInp(i, Math.abs(dx) > 6 ? Math.sign(dx) : 0, Math.abs(dy) > 6 ? Math.sign(dy) : 0); },
});
