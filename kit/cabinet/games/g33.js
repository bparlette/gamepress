// NEEDS: art
// KEYS: Arrows move the little kid AND aim: everyone throws candy the way you last moved (auto-aims inside that cone). Survive 5 minutes. Fill each costumed kid's bucket before they reach the porch. Every 12 happy kids a family member tries to join.
/* ===== G33 TRICK OR TREAT HOUSE: Halloween house-defense version of Critter Clash (tall screen, art rig tier).
   BRIEF  genre: lane defense + auto-battler | player: little kid roaming a cutaway house, auto-throws candy | goal: keep the candy stash until midnight (5 minutes)
          lose: stash empties (kids reaching the porch grab handfuls) | hook: the number over each kid is the CANDY THEIR BUCKET NEEDS; full bucket = happy kid runs home
          family: every 12 happy kids a family member tries to join (sister slingshot spray, mom rapid mini candy, dad king-size bar cannon); failure upgrades the candy
          costumes: ghost basic, cat fast+small, pumpkin tank, vampire cape-dash, robot armoured (bars work best), pirate steals 2, dino boss
          bot: parks near the front of the column | Original art + sim. Engine: path, proj, hits(list), fx. ===== */
const TUNE33 = { win:300, stash:10, speed:62, evoEvery:10, famP:0.5, pity:1, shotV:190, range:200,
  me:{ cd:0.4, dmg:3, r:4 }, sis:{ cd:0.95, dmg:2, r:4, n:3, spread:0.24 }, mom:{ cd:0.2, dmg:1, r:3 }, dad:{ cd:1.6, dmg:12, r:6, pierce:2, v:150 },
  spawn:T => Math.max(0.36, 1.2 - T * 0.0045),
  kinds:{ ghost:{ need:8, sp:22, r:11, sc:0.3, steal:1 }, cat:{ need:5, sp:40, r:9, sc:0.27, steal:1 }, pumpkin:{ need:24, sp:15, r:14, sc:0.33, steal:1 }, vampire:{ need:11, sp:24, r:10, sc:0.3, steal:1 },
    robot:{ need:16, sp:20, r:11, sc:0.31, steal:1 }, pirate:{ need:10, sp:24, r:10, sc:0.3, steal:2 }, dino:{ need:110, sp:12, r:18, sc:0.46, steal:3 } },
  boss:[40, 90, 140, 190, 240, 275] };
const PATH33 = ENG.path([[272, 84], [24, 84], [24, 300], [128, 300]]);
const RING33 = [128, 192];
const PLX = { x0:58, x1:198, y0:150, y1:268 };
const FAM33 = [null, { k:'hw_sister', x:70, y:178, sc:0.4 }, { k:'hw_mom', x:186, y:178, sc:0.43 }, { k:'hw_dad', x:128, y:280, sc:0.47 }];
const FAMTXT = ['', 'BIG SISTER JOINED!', 'MOM JOINED!', 'DAD JOINED!'];
function pick33(S) { const T = S.T, r = S.rng(); const w = [['ghost', 1], ['cat', 0.7]]; if (T > 20) w.push(['pumpkin', 0.5]); if (T > 45) w.push(['vampire', 0.55]); if (T > 80) w.push(['robot', 0.5]); if (T > 110) w.push(['pirate', 0.5]);
  let tot = 0; for (const x of w) tot += x[1]; let a = r * tot; for (const x of w) { a -= x[1]; if (a <= 0) return x[0]; } return 'ghost'; }
function shoot33(S, x, y, tx, ty, o) { const a = Math.atan2(ty - y, tx - x) + (o.sp || 0), v = o.v || TUNE33.shotV;
  ENG.proj.fire(S, x, y, Math.cos(a) * v, Math.sin(a) * v, { life:o.life || 1.1, r:o.r, dmg:o.dmg, pierce:o.pierce || 0, bar:!!o.bar, c:S.shots++ % 5, bounds:[-30, -30, 290, 420] }); }
function front33(S, x, y, me) { const p = S.p, L = Math.hypot(p.fx, p.fy) || 1, dx = p.fx / L, dy = p.fy / L; let t = null, b = -1, any = null, ab = -1;
  for (const e of S.en) { if (e.happy || e.dead || e.x < -8 || e.x > 264) continue; const ex = e.x - x, ey = e.y - y, dd = Math.hypot(ex, ey); if (dd >= TUNE33.range) continue; if (e.d > ab) { ab = e.d; any = e; }
    if ((ex * dx + ey * dy) / (dd || 1) > 0.5 && e.d > b) { b = e.d; t = e; } }
  if (t) return t; if (!any) return null; if (!me) return any; return { x:x + dx * 120, y:y + dy * 120, d:0, stray:true }; }   /* aim assist (family: prefers targets in that cone, else the front-most kid; the little kid throws straight if nothing is in the cone) inside a 60-degree cone of the way you last moved; nothing there: throw straight that way */
function spawn33(S, k) { const K = TUNE33.kinds[k]; const need = k === 'dino' ? K.need + S.bossN * 25 : Math.ceil(K.need * (1 + S.T / 140)); S.en.push({ k, d:0, x:272, y:84, a:Math.PI, need, fill:0, sp:K.sp * (0.94 + S.rng() * 0.12), r:K.r, steal:K.steal, lane:((S.idx++ % 3) - 1) * 8, hit:0, happy:false, dead:false }); }
/* ---- art tier ---- */
const CHR33 = { hw_kid:0.36, hw_sister:0.4, hw_mom:0.43, hw_dad:0.47, hw_ghost:0.3, hw_cat:0.27, hw_pumpkin:0.33, hw_vampire:0.3, hw_robot:0.31, hw_pirate:0.3, hw_dino:0.46 };
for (const k in CHR33) RIG.def(k, { scale:CHR33[k], anchor:[50, 112], order:['legB', 'legF', 'torso', 'head', 'arm'], pivots:{ legB:[40, 80], legF:[60, 80], torso:[50, 62], head:[50, 40], arm:[66, 52] } });
const CAND33 = ['#ff5a8a', '#ffd84a', '#6ae8ff', '#9aff6a', '#c08cff'];
function house33() { return HD.spr('house33', 256, 384, (g) => {
  g.fillStyle = HD.lg(g, 0, 0, 0, 384, [[0, '#0a1030'], [0.22, '#1c1850'], [0.3, '#24305a'], [1, '#14301e']]); g.fillRect(0, 0, 256, 384);
  for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(255,255,255,${0.3 + hash(k, 1) * 0.6})`; g.fillRect(hash(k, 2) * 256, hash(k, 3) * 62, 0.7 + hash(k, 4), 0.7 + hash(k, 4)); }
  g.fillStyle = HD.rg(g, 214, 28, 4, 40, [[0, 'rgba(255,248,200,1)'], [0.3, 'rgba(255,240,170,.4)'], [1, 'rgba(255,240,170,0)']]); g.fillRect(170, 0, 90, 80);
  g.beginPath(); g.arc(214, 28, 15, 0, 6.283); g.fillStyle = HD.lg(g, 200, 14, 228, 42, [[0, '#fffbe0'], [1, '#e8d890']]); g.fill(); g.fillStyle = 'rgba(160,140,70,.35)'; for (const [x, y, r] of [[208, 24, 3], [219, 33, 2.4], [212, 36, 1.6]]) { g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
  for (let k = 0; k < 40; k++) { const x = hash(k, 5) * 256, y = 66 + hash(k, 6) * 318, r = 8 + hash(k, 7) * 18; g.fillStyle = HD.rg(g, x, y, 0, r, [[0, `rgba(${hash(k, 8) < 0.5 ? '50,120,70' : '16,60,40'},0.4)`], [1, 'rgba(0,0,0,0)']]); g.fillRect(x - r, y - r, r * 2, r * 2); }
  /* spooky tree top-left, graves bottom */
  g.strokeStyle = '#120c18'; g.lineCap = 'round'; g.lineWidth = 4; g.beginPath(); g.moveTo(14, 66); g.quadraticCurveTo(12, 40, 22, 22); g.stroke(); g.lineWidth = 2; for (const [a, b, c, d] of [[18, 40, 4, 30], [20, 30, 34, 18], [16, 50, 30, 42], [22, 22, 12, 8], [22, 24, 32, 6]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
  for (const [x, y] of [[30, 346], [58, 356], [200, 350], [228, 342]]) { HD.part(g, x - 7, y - 14, 14, 18, 6, '#8a90a0', '#4a5060'); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - 1, y - 10, 2, 8); g.fillRect(x - 4, y - 7, 8, 2); }
  /* road ring */
  g.fillStyle = '#5c6070'; HD.rr(g, 2, 62, 252, 260, 10); g.fill(); g.fillStyle = HD.lg(g, 0, 66, 0, 318, [[0, '#2e323e'], [1, '#22252e']]); HD.rr(g, 6, 66, 244, 252, 8); g.fill();
  for (let k = 0; k < 260; k++) { g.fillStyle = `rgba(255,255,255,${0.02 + hash(k, 9) * 0.03})`; g.fillRect(6 + hash(k, 10) * 244, 66 + hash(k, 11) * 252, 1 + hash(k, 12) * 3, 1); }
  g.fillStyle = '#6a6e7c'; g.fillRect(42, 102, 172, 180); g.fillStyle = 'rgba(255,230,160,.5)'; for (let x = 12; x < 244; x += 16) { g.fillRect(x, 83, 8, 2); g.fillRect(x, 299, 8, 2); } for (let y = 72; y < 314; y += 16) { g.fillRect(23, y, 2, 8); g.fillRect(231, y, 2, 8); }
  /* lawn border inside ring is the house yard; house cutaway */
  g.fillStyle = '#1a4a30'; g.fillRect(44, 104, 168, 176);
  g.fillStyle = '#3a2430'; g.beginPath(); g.moveTo(36, 120); g.lineTo(128, 96); g.lineTo(220, 120); g.lineTo(212, 126); g.lineTo(128, 106); g.lineTo(44, 126); g.fill();
  g.fillStyle = HD.lg(g, 0, 118, 0, 284, [[0, '#ffe2a8'], [1, '#e8a868']]); HD.rr(g, 48, 118, 160, 166, 3); g.fill();
  g.fillStyle = 'rgba(120,50,30,.18)'; for (let x = 52; x < 206; x += 12) g.fillRect(x, 120, 5, 162);
  g.fillStyle = '#7a4a2a'; g.fillRect(48, 196, 160, 6); g.fillStyle = '#4a2a14'; g.fillRect(48, 282, 160, 5); g.fillStyle = '#2a1a10'; g.fillRect(44, 118, 4, 169); g.fillRect(208, 118, 4, 169); g.fillStyle = '#8a5a34'; g.fillRect(48, 118, 160, 3);
  /* windows (sister left, mom right) */
  for (const wx of [58, 156]) { g.fillStyle = '#1a2a50'; HD.rr(g, wx, 134, 42, 50, 3); g.fill(); g.fillStyle = HD.lg(g, 0, 136, 0, 182, [[0, '#6a8ac8'], [1, '#2a3a78']]); g.fillRect(wx + 3, 137, 36, 44); g.fillStyle = '#e8d8b8'; g.fillRect(wx + 20, 137, 2, 44); g.fillRect(wx + 3, 158, 36, 2); g.fillStyle = '#c0392b'; g.fillRect(wx - 1, 134, 6, 22); g.fillRect(wx + 37, 134, 6, 22); }
  /* furniture: bed upstairs-centre, sofa+tv downstairs, stairs, lamp */
  HD.part(g, 108, 168, 36, 26, 4, '#6a8ae8', '#2a4aa8'); HD.part(g, 108, 160, 8, 20, 3, '#e8d8c0', '#9a7a58'); HD.part(g, 112, 170, 18, 8, 3, '#fff', '#c8d0e0');
  HD.part(g, 54, 240, 46, 30, 6, '#a83a3a', '#6a1a1a'); HD.part(g, 54, 232, 12, 38, 5, '#c04848', '#7a2020'); HD.part(g, 88, 232, 12, 38, 5, '#c04848', '#7a2020');
  HD.part(g, 164, 236, 34, 34, 3, '#5a5a6a', '#2a2a38'); g.fillStyle = '#6ae8ff'; g.fillRect(167, 239, 28, 22); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(168, 240, 12, 6);
  for (let i = 0; i < 6; i++) { g.fillStyle = i & 1 ? '#6a4a2a' : '#8a6a3a'; g.fillRect(104 + i * 4, 204 + i * 4, 38 - i * 4, 4); }
  HD.part(g, 192, 160, 10, 36, 3, '#8a6a3a', '#4a3a1a'); HD.ball(g, 197, 154, 8, '#fff2a8', '#e8a828');
  /* door + porch + candy bowl */
  g.fillStyle = '#2a1a10'; HD.rr(g, 106, 238, 44, 44, 3); g.fill(); g.fillStyle = HD.lg(g, 0, 240, 0, 282, [[0, '#ffd890'], [1, '#e89848']]); HD.rr(g, 109, 241, 38, 41, 2); g.fill();
  g.fillStyle = '#6a1a1a'; g.fillRect(104, 282, 48, 6); g.fillStyle = '#c8b898'; g.fillRect(100, 286, 56, 6); g.fillRect(96, 291, 64, 5);
  g.fillStyle = '#d83030'; HD.rr(g, 112, 298, 32, 5, 2); g.fill();
  /* pumpkin on porch, lanterns, hanging bats */
  HD.shadow(g, 98, 282, 9, 3, 0.4); HD.ball(g, 98, 274, 8, '#ffb040', '#d86a10'); g.fillStyle = '#ffe65a'; g.fillRect(94, 272, 3, 3); g.fillRect(100, 272, 3, 3); g.fillRect(95, 277, 7, 2);
  for (const [x, y] of [[70, 126], [186, 126], [128, 126]]) { g.strokeStyle = '#2a1a10'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, 120); g.lineTo(x, y); g.stroke(); HD.ball(g, x, y + 5, 5, '#ffb040', '#d86a10'); }
  /* lamp posts at ring corners */
  for (const [x, y] of [[24, 84], [232, 84], [24, 300], [232, 300]]) { g.fillStyle = '#1a1a24'; g.fillRect(x - 1, y - 24, 2.4, 24); HD.ball(g, x, y - 26, 4.5, '#fff6c8', '#e8a828'); }
  for (let i = 0; i < 4; i++) { const x = [10, 238, 12, 240][i], y = [120, 130, 250, 220][i]; HD.shadow(g, x + 2, y + 9, 9, 3, 0.4); HD.part(g, x - 2, y - 2, 4, 11, 1.5, '#7a5230', '#3a2410'); HD.ball(g, x, y - 7, 9, '#2a6a40', '#103a20'); }
}); }
function candyBowl33(g, n) { HD.part(g, 112, 292, 32, 8, 3, '#e8d8c0', '#9a7a58'); for (let i = 0; i < n * 2; i++) { const a = hash(i, 21) * 6.283, r = Math.sqrt(hash(i, 22)) * 13; HD.ball(g, 128 + Math.cos(a) * r, 289 - Math.abs(Math.sin(a)) * r * 0.35, 2.4, CAND33[i % 5], '#3a2a2a'); } }
function num33(g, e, x, y, v) { const w = 15 + (v > 9 ? 4 : 0) + (v > 99 ? 4 : 0); HD.rr(g, x - w / 2, y - 7, w, 13, 6); g.fillStyle = e.hit > 0 ? '#fff' : '#1a1230'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#ffb040'; g.stroke(); g.font = FONT(8.5); g.textAlign = 'center'; g.fillStyle = e.hit > 0 ? '#1a1230' : '#ffe9a8'; g.fillText(String(v), x, y + 3.4); }
function drawHD33(S, g) { const C = TUNE33, T = S.T, p = S.p, HH = window.HD_H || 384, oy = (HH - 384) / 2, sc = Math.min(1, HH / 340);
  g.fillStyle = '#0a1030'; g.fillRect(0, 0, 256, HH); g.save(); g.translate(128, HH / 2); g.scale(sc, sc); g.translate(-128, -192 + (S.ecam && S.ecam.sh ? Math.sin(T * 90) * S.ecam.sh * 0.4 : 0));
  g.drawImage(house33(), 0, 0, 256, 384);
  for (let i = 0; i < 4; i++) { const k = (T * 0.06 + i * 0.27) % 1; const bx = 300 - k * 380, by = 30 + Math.sin(k * 14 + i) * 12 + i * 8; g.save(); g.translate(bx, by); g.fillStyle = '#0a0612'; const f = Math.sin(T * 14 + i) * 4; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-5, -5 - f, -11, 0 - f * .5); g.quadraticCurveTo(-6, 1, 0, 2); g.quadraticCurveTo(6, 1, 11, -f * .5); g.quadraticCurveTo(5, -5 - f, 0, 0); g.fill(); g.restore(); }
  candyBowl33(g, S.stash);
  const items = []; for (const e of S.en) items.push({ y:e.y, f:() => drawKid33(S, g, e) });
  const fam = [p]; for (let k = 1; k <= S.fam; k++) fam.push(FAM33[k]);
  items.push({ y:p.y, f:() => drawShooter33(S, g, 0) }); for (let k = 1; k <= S.fam; k++) items.push({ y:FAM33[k].y, f:() => drawShooter33(S, g, k) });
  items.sort((a, b) => a.y - b.y); for (const it of items) it.f();
  for (const q of S.eproj || []) { const a = Math.atan2(q.vy, q.vx); if (q.bar) { HD.glow(g, q.x, q.y, 14, '255,210,120', 0.6); g.save(); g.translate(q.x, q.y); g.rotate(a); HD.part(g, -8, -4, 16, 8, 2, '#8a5230', '#3a1e10'); g.fillStyle = '#ffd84a'; g.fillRect(-5, -4, 3, 8); g.restore(); } else { const c = CAND33[q.c], rr = q.r * 1.25; HD.glow(g, q.x, q.y, rr * 3, '255,230,160', 0.5); g.save(); g.translate(q.x, q.y); g.rotate(a + T * 8); g.fillStyle = c; g.beginPath(); g.moveTo(-rr * 2.4, -rr * 0.9); g.lineTo(-rr * 0.8, 0); g.lineTo(-rr * 2.4, rr * 0.9); g.closePath(); g.fill(); g.beginPath(); g.moveTo(rr * 2.4, -rr * 0.9); g.lineTo(rr * 0.8, 0); g.lineTo(rr * 2.4, rr * 0.9); g.closePath(); g.fill(); HD.ball(g, 0, 0, rr, '#ffffff', c); g.restore(); } }
  ENG.fx.each(S, 'pop', (f, k) => HD.glow(g, f.x, f.y, 6 + k * 12, '255,210,140', 1 - k));
  for (const q of S.parts || []) { g.fillStyle = '#ffd0f0'; g.fillRect(q.x, q.y, 1.6, 1.6); }
  ENG.fx.each(S, 'heart', (f, k) => { const y = f.y - k * 22; g.save(); g.globalAlpha = 1 - k * k; g.translate(f.x, y); g.scale(1 + k * 0.4, 1 + k * 0.4); g.fillStyle = '#ff4a7a'; g.beginPath(); g.moveTo(0, 3); g.bezierCurveTo(-8, -3, -4, -9, 0, -4); g.bezierCurveTo(4, -9, 8, -3, 0, 3); g.fill(); g.restore(); });
  ENG.fx.each(S, 'num', (f, k) => { g.font = FONT(9); g.textAlign = 'center'; g.fillStyle = `rgba(255,${f.bad ? 90 : 230},${f.bad ? 90 : 120},${1 - k})`; g.fillText(f.bad ? '-' + Math.abs(f.v) + ' CANDY' : String(f.v), f.x, f.y - k * 16); });
  ENG.fx.each(S, 'join', (f, k) => { HD.glow(g, f.x, f.y, 14 + k * 60, '255,224,120', 1 - k); g.save(); g.translate(f.x, f.y); g.rotate(k * 3); g.strokeStyle = `rgba(255,255,220,${1 - k})`; g.lineWidth = 1.4; for (let i = 0; i < 10; i++) { g.rotate(0.628); g.beginPath(); g.moveTo(12 + k * 20, 0); g.lineTo(28 + k * 46, 0); g.stroke(); } g.restore(); });
  g.fillStyle = HD.rg(g, 128, 192, 100, 230, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,4,20,0.5)']]); g.fillRect(0, 0, 256, 384);
  g.restore();
  /* HUD in screen space */
  const top = Math.max(2, (HH - 340 * sc) / 2 - 4) * 0 + 4; g.textAlign = 'left'; g.font = FONT(9);
  HD.rr(g, 4, top, 66, 16, 8); g.fillStyle = 'rgba(10,8,30,.75)'; g.fill(); for (let i = 0; i < 3; i++) HD.ball(g, 14 + i * 0, top + 8, 0.01, '#fff', '#fff'); HD.ball(g, 14, top + 8, 5, '#ff5a8a', '#a01848'); g.fillStyle = '#fff'; g.fillText('x ' + S.stash, 24, top + 12);
  HD.rr(g, 186, top, 66, 16, 8); g.fillStyle = 'rgba(10,8,30,.75)'; g.fill(); g.textAlign = 'right'; g.fillStyle = '#ffe65a'; g.fillText(S.kills + ' HAPPY', 248, top + 12);
  g.textAlign = 'center'; g.fillStyle = '#ffb040'; g.fillText('FAMILY ' + (S.fam + 1) + '/4', 128, top + 12); HD.bar(g, 78, top + 18, 100, 4, Math.min(1, T / C.win), '#7a5ae8', '#3a1a8a');
  if (S.mt > 0) { const a = Math.min(1, S.mt * 2); g.font = FONT(12); g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = `rgba(20,8,40,${a})`; g.lineJoin = 'round'; g.strokeText(S.msg, 128, HH / 2 - 30); g.fillStyle = `rgba(255,224,90,${a})`; g.fillText(S.msg, 128, HH / 2 - 30); }
  if (S.hurt > 0) { g.fillStyle = HD.rg(g, 128, HH / 2, 70, HH * 0.7, [[0, 'rgba(200,0,0,0)'], [1, `rgba(220,20,20,${S.hurt * 0.6})`]]); g.fillRect(0, 0, 256, HH); }
  if (typeof GLPOST !== 'undefined' && window.GLPOST_ON) { const W2 = (x, y) => [(128 + (x - 128) * sc) / 256, (HH / 2 + (y - 192) * sc) / HH]; GLPOST.clear(); let l;
    for (const [x, y] of [[24, 58], [232, 58], [24, 274], [232, 274]]) { l = W2(x, y); GLPOST.light(l[0], l[1], 0.2, 0.7, [1, 0.85, 0.5]); }
    l = W2(128, 200); GLPOST.light(l[0], l[1], 0.5, 0.18, [1, 0.8, 0.5]); l = W2(128, 270); GLPOST.light(l[0], l[1], 0.2, 0.4, [1, 0.8, 0.45]); l = W2(214, 28); GLPOST.light(l[0], l[1], 0.35, 0.5, [0.7, 0.8, 1]);
    for (const q of (S.eproj || []).slice(0, 8)) { l = W2(q.x, q.y); GLPOST.light(l[0], l[1], q.bar ? 0.16 : 0.08, 0.9, [1, 0.8, 0.5]); }
    ENG.fx.each(S, 'join', (f, k) => { l = W2(f.x, f.y); GLPOST.light(l[0], l[1], 0.5, 2.2 * (1 - k), [1, 0.85, 0.4]); });
    GLPOST.fx.ca = 0.25; GLPOST.fx.hurt = S.hurt > 0 ? S.hurt : 0; GLPOST.fx.flash = S.evo > 0 ? Math.min(0.4, S.evo * 0.25) : 0; GLPOST.fx.ember = 0.1; } }
function drawKid33(S, g, e) { const K = TUNE33.kinds[e.k], key = 'hw_' + e.k, T = S.T; const fl = Math.cos(e.a || 0) < -0.2 || (e.happy && e.hx < 0); const ph = (e.d || e.ht * 40) * 0.38, sw = Math.sin(ph), big = K.sc / 0.3;
  const q = e.happy ? 1 - Math.min(1, Math.max(0, e.ht - 0.9) / 0.5) : 1; g.save(); g.globalAlpha = q;
  HD.shadow(g, e.x, e.y + 1, 11 * big, 3.5 * big, 0.5); const bounce = e.happy ? -Math.abs(Math.sin(e.ht * 12)) * 5 : -Math.abs(sw) * 1.5;
  if (RIG.ready(key)) RIG.draw(g, key, e.x, e.y + 4 + bounce, { flip:fl, tint:'#ffffff', ta:e.hit > 0 ? 0.8 : 0, pose:{ legB:{ rot:sw * 0.5 }, legF:{ rot:-sw * 0.5 }, torso:{ oy:-Math.abs(sw) * 1.2 }, head:{ oy:-Math.abs(sw) * 1.4, rot:sw * 0.06 }, arm:{ rot:e.happy ? -1.6 + Math.sin(e.ht * 18) * 0.5 : -0.3 + sw * 0.25 } } });
  else HD.ball(g, e.x, e.y - 8, 9, '#fff', '#889');
  g.restore(); if (!e.happy) { num33(g, e, e.x, e.y - 41 * big - 2, Math.max(1, Math.ceil(e.need - e.fill))); const f = Math.min(1, e.fill / e.need); if (f > 0.02) { g.fillStyle = '#ffb040'; g.fillRect(e.x - 8, e.y - 41 * big + 8, 16 * f, 1.6); } } }
function drawShooter33(S, g, k) { const T = S.T, p = S.p; const info = k === 0 ? { key:'hw_kid', x:p.x, y:p.y, face:p.face } : { key:FAM33[k].k, x:FAM33[k].x, y:FAM33[k].y, face:1 };
  const aim = S.aim[k], fl = k === 0 ? p.face < 0 : Math.cos(aim) < 0, ph = k === 0 ? T * 9 : T * 2.2 + k, sw = Math.sin(ph), moving = k === 0 && (S.T > 0), rec = Math.max(0, S.cd[k]) / [0.4, 0.95, 0.2, 1.6][k];
  HD.shadow(g, info.x, info.y + 1, 12, 4, 0.5); const lift = k === 0 ? -Math.abs(Math.sin(T * 9)) * 1.4 : 0;
  if (RIG.ready(info.key)) RIG.draw(g, info.key, info.x, info.y + 4 + lift, { flip:fl, pose:{ legB:{ rot:k === 0 ? sw * 0.3 : 0 }, legF:{ rot:k === 0 ? -sw * 0.3 : 0 }, torso:{ oy:Math.sin(ph) * 0.6 }, head:{ oy:Math.sin(ph) * 0.9, rot:Math.sin(T * 3 + k) * 0.05 }, arm:{ rot:(fl ? Math.PI - aim : aim) * 0.5 - 0.2 - rec * 0.5 } } });
  if (k > 0) { const f = FAM33[k]; g.font = FONT(6); g.textAlign = 'center'; } }
const GAME = kit({ id:'g33', tall:true, dir:'any', t1:'TRICK', t2:'TREAT HOUSE', sub:'FILL BUCKETS. SAVE THE CANDY.', seed:933, off:33, secs:300, music:MUS(140, -19, false),
  setup(S) { S.p = { x:128, y:230, ang:0, face:1, fx:0, fy:-1 }; S.en = []; S.fam = 0; S.fails = 0; S.atk = 0; S.stash = TUNE33.stash; S.kills = 0; S.next = TUNE33.evoEvery; S.sp = 0.6; S.cd = [0.3, 0.5, 0.2, 0.9]; S.shots = 0; S.bossN = 0; S.idx = 0; S.msg = ''; S.mt = 0; S.hurt = 0; S.evo = 0; S.aim = [0, 0, 0, 0]; },
  step(S, dt, inp) { const C = TUNE33, p = S.p;
    const ax = inp.ax !== undefined ? inp.ax : (inp.r ? 1 : 0) - (inp.l ? 1 : 0), ay = inp.ay !== undefined ? inp.ay : (inp.d ? 1 : 0) - (inp.u ? 1 : 0), m = Math.max(1, Math.hypot(ax, ay));
    p.x = clamp(p.x + ax / m * C.speed * dt, PLX.x0, PLX.x1); p.y = clamp(p.y + ay / m * C.speed * dt, PLX.y0, PLX.y1); if (ax) p.face = ax > 0 ? 1 : -1; if (ax || ay) { p.fx = ax / m; p.fy = ay / m; }
    S.hurt = Math.max(0, S.hurt - dt); S.mt -= dt; S.evo = Math.max(0, S.evo - dt);
    /* spawns */
    S.sp -= dt; if (S.sp <= 0) { S.sp += C.spawn(S.T); spawn33(S, pick33(S)); }
    if (S.bossN < C.boss.length && S.T >= C.boss[S.bossN]) { S.bossN++; spawn33(S, 'dino'); S.msg = 'DINO COSTUME!'; S.mt = 2; sfx('super'); }
    for (let i = S.en.length - 1; i >= 0; i--) { const e = S.en[i]; if (e.dead) { S.en.splice(i, 1); continue; } e.hit -= dt;
      if (e.happy) { e.ht += dt; e.x += e.hx * dt; e.y += e.hy * dt; if (e.ht > 1.4) S.en.splice(i, 1); continue; }
      let sp = e.sp; if (e.k === 'vampire' && e.d > PATH33.len - 150 && !e.dashed) { e.dash = (e.dash || 0) + dt; if (e.dash > 0.9) e.dashed = true; sp *= 2.8; }
      e.d += sp * dt; const q = PATH33.at(Math.min(e.d, PATH33.len)); e.a = q.a; e.x = q.x - Math.sin(q.a) * e.lane; e.y = q.y + Math.cos(q.a) * e.lane;
      if (e.d >= PATH33.len) { S.en.splice(i, 1); S.stash -= e.steal; S.hurt = 0.6; sfx('hurt'); ENG.shake(S, 3); ENG.fx.add(S, 'num', 128, 292, 0.9, { v:-e.steal, bad:true }); if (S.stash <= 0) { S.stash = 0; sfx('die'); return finish(S, 'THE CANDY IS GONE'); } } }
    /* shooters: kid, then family as they join */
    const live = () => S.en.filter(e => !e.happy && !e.dead);
    S.cd[0] -= dt; if (S.cd[0] <= 0) { const t = front33(S, p.x, p.y - 20, true); if (t) { S.cd[0] = C.me.cd; S.aim[0] = Math.atan2(t.y - (p.y - 20), t.x - p.x); shoot33(S, p.x + 8 * p.face, p.y - 20, t.x, t.y, { r:C.me.r, dmg:C.me.dmg + S.atk }); sfx('swing'); } }
    if (S.fam >= 1) { S.cd[1] -= dt; const f = FAM33[1]; if (S.cd[1] <= 0) { const t = front33(S, f.x, f.y - 24); if (t) { S.cd[1] = C.sis.cd; S.aim[1] = Math.atan2(t.y - f.y + 24, t.x - f.x); for (let k = -1; k <= 1; k++) shoot33(S, f.x, f.y - 24, t.x, t.y, { r:C.sis.r, dmg:C.sis.dmg + S.atk, sp:k * C.sis.spread, life:0.9 }); } } }
    if (S.fam >= 2) { S.cd[2] -= dt; const f = FAM33[2]; if (S.cd[2] <= 0) { const t = front33(S, f.x, f.y - 26); if (t) { S.cd[2] = C.mom.cd; S.aim[2] = Math.atan2(t.y - f.y + 26, t.x - f.x); shoot33(S, f.x, f.y - 26, t.x, t.y, { r:C.mom.r, dmg:C.mom.dmg + Math.floor(S.atk / 2), v:230, life:0.95 }); } } }
    if (S.fam >= 3) { S.cd[3] -= dt; const f = FAM33[3]; if (S.cd[3] <= 0) { const t = front33(S, f.x, f.y - 28); if (t) { S.cd[3] = C.dad.cd; S.aim[3] = Math.atan2(t.y - f.y + 28, t.x - f.x); shoot33(S, f.x + 10, f.y - 28, t.x, t.y, { r:C.dad.r, dmg:C.dad.dmg + S.atk * 2, pierce:C.dad.pierce, v:C.dad.v, life:1.5, bar:true }); ENG.shake(S, 1.5); sfx('boom'); } } }
    ENG.hits(S, (pr, e) => { let d = pr.dmg; if (e.k === 'robot') d *= pr.bar ? 1.5 : 0.4; e.fill += d; e.hit = 0.12; ENG.fx.add(S, 'pop', pr.x, pr.y, 0.2); }, live());
    for (const e of S.en) if (!e.happy && !e.dead && e.fill >= e.need) { e.happy = true; e.ht = 0; const l = Math.hypot(e.x - RING33[0], e.y - RING33[1]) || 1; e.hx = (e.x - RING33[0]) / l * 55; e.hy = (e.y - RING33[1]) / l * 55; S.kills++; S.score += e.k === 'dino' ? 100 : 10; sfx('pop'); burst(S, e.x, e.y - 10, PK, 6); ENG.fx.add(S, 'heart', e.x, e.y - 30, 0.9);
      if (S.kills >= S.next) { S.tries = (S.tries || 0) + 1; S.next += C.evoEvery + S.tries * 2; S.evo = 1.4;
        if (S.fam < 3 && (S.fails >= C.pity || S.rng() < C.famP)) { S.fam++; S.fails = 0; S.msg = FAMTXT[S.fam]; S.mt = 2.4; sfx('super'); ENG.fx.add(S, 'join', FAM33[S.fam].x, FAM33[S.fam].y - 24, 0.9); }
        else { S.fails++; S.atk = Math.min(S.atk + 1, 8); S.msg = 'FAMILY BUSY - CANDY UPGRADE +1'; S.mt = 2.2; sfx('boom'); ENG.fx.add(S, 'join', p.x, p.y - 24, 0.7); } } }
    if (S.T >= C.win) { sfx('win'); return finish(S, 'HAPPY HALLOWEEN!', S.stash * 50); } },
  draw(S) { clear(K); txt('USE THE ART BUILD', 128, 100, W, 8, 'center'); },
  drawHD(S, g) { drawHD33(S, g); },
  hud(S) {},
  info(S) { return { stash:S.stash, kills:S.kills, fam:S.fam, atk:S.atk, en:S.en.length, x:Math.round(S.p.x), y:Math.round(S.p.y) }; },
  bot(S, i) { const p = S.p; let tx = 128, ty = 230, best = -1; for (const e of S.en) if (!e.happy && e.d > best) { best = e.d; tx = e.x; ty = e.y; }
    const gx = clamp(tx, PLX.x0 + 10, PLX.x1 - 10), gy = clamp(ty, PLX.y0 + 20, PLX.y1 - 10), dx = gx - p.x, dy = gy - p.y; return dirInp(i, Math.abs(dx) > 8 ? Math.sign(dx) : 0, Math.abs(dy) > 8 ? Math.sign(dy) : 0); },
});
