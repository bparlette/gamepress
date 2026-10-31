window.SIXBTN = true;
// KEYS: Arrows move/crouch/jump. U I O = light/medium/heavy punch, J K L = light/medium/heavy kick (Z = medium punch, X = medium kick). Full move list: docs/G37-MOVELIST.md
/* ===== G37 RYU vs GUILE: one-round fighter with the SF2 move lists for both characters, on the native per-frame 8-bit rig (pixrig.js, IK poses).
   Inputs are real motion inputs read from a 40-frame command buffer: QCF (236), DP (623), QCB (214), charge back-forward (hold back >= TUNE.charge), charge down-up. 
   Moves are frame-data tables (startup/active/recover, damage, hit/block stun, pushback, hit height) so they can be tuned like the real game.
   ?char=guile plays Guile vs Ryu. BRIEF  genre: 1v1 fighter | win: KO or lead at the bell | bot/CPU: uses every move at the right range (zoning, anti-air, throws) ===== */
const TUNE37 = { time:60, hp:100, sc:88, walk:46, back:38, wall:[22, 234], sep:22, charge:50, grav:560, jumpV:210, jumpX:62, buf:40, intro:1.5, ko:1.8, ai:{ react:[.1, .26], block:.5 } };
const FY37 = 192, CH37 = 'ryu';
/* move table: f=[startup,active,recover] frames @60, d=damage, hs/bs=hit/block stun frames, kb=pushback px, rx/ry=hitbox (px in front of body / px above ground), lvl high|mid|low, kd=knockdown */
const NORMALS = {
  sLP:{ pose:'jab', f:[3, 3, 6], d:3, hs:12, bs:8, kb:2, rx:[8, 32], ry:[48, 80], lvl:'mid' }, sMP:{ pose:'cross', f:[5, 4, 10], d:7, hs:16, bs:11, kb:3, rx:[8, 38], ry:[48, 80], lvl:'mid' }, sHP:{ pose:'hpunch', f:[7, 5, 16], d:12, hs:20, bs:14, kb:5, rx:[8, 44], ry:[46, 80], lvl:'mid' },
  sLK:{ pose:'lkick', f:[4, 3, 8], d:3, hs:12, bs:8, kb:2, rx:[8, 38], ry:[8, 40], lvl:'mid' }, sMK:{ pose:'mkick', f:[6, 4, 12], d:8, hs:17, bs:12, kb:4, rx:[8, 44], ry:[22, 62], lvl:'mid' }, sHK:{ pose:'hkick', f:[9, 5, 18], d:13, hs:22, bs:15, kb:6, rx:[8, 52], ry:[40, 90], lvl:'mid' },
  cLP:{ pose:'cjab', f:[3, 3, 6], d:3, hs:12, bs:8, kb:2, rx:[8, 32], ry:[24, 44], lvl:'mid' }, cMP:{ pose:'cjab', f:[5, 4, 10], d:7, hs:16, bs:11, kb:3, rx:[8, 38], ry:[24, 46], lvl:'mid' }, cHP:{ pose:'cupper', f:[6, 6, 20], d:12, hs:24, bs:12, kb:3, rx:[6, 30], ry:[20, 104], lvl:'mid', kd:true, anti:true },
  cLK:{ pose:'clkick', f:[4, 3, 8], d:3, hs:12, bs:8, kb:2, rx:[8, 40], ry:[0, 14], lvl:'low' }, cMK:{ pose:'cmkick', f:[6, 4, 12], d:7, hs:16, bs:11, kb:3, rx:[8, 46], ry:[0, 16], lvl:'low' }, cHK:{ pose:'sweep', f:[8, 5, 26], d:12, hs:24, bs:14, kb:6, rx:[8, 58], ry:[0, 14], lvl:'low', kd:true },
  jLP:{ pose:'jpunch', f:[2, 40, 3], d:4, hs:14, bs:9, kb:2, rx:[6, 30], ry:[-10, 52], lvl:'high', air:true }, jMP:{ pose:'jpunch', f:[3, 40, 3], d:8, hs:18, bs:12, kb:3, rx:[6, 34], ry:[-10, 52], lvl:'high', air:true }, jHP:{ pose:'jpunch', f:[4, 40, 3], d:11, hs:20, bs:14, kb:4, rx:[6, 38], ry:[-12, 54], lvl:'high', air:true },
  jLK:{ pose:'jlkick', f:[2, 40, 3], d:4, hs:14, bs:9, kb:2, rx:[6, 34], ry:[-18, 34], lvl:'high', air:true }, jMK:{ pose:'jlkick', f:[3, 40, 3], d:8, hs:18, bs:12, kb:3, rx:[6, 40], ry:[-18, 36], lvl:'high', air:true }, jHK:{ pose:'jhkick', f:[4, 40, 3], d:11, hs:20, bs:14, kb:4, rx:[6, 46], ry:[-18, 40], lvl:'high', air:true },
  closeHP:{ pose:'closeh', f:[5, 5, 16], d:13, hs:22, bs:12, kb:3, rx:[4, 28], ry:[40, 96], lvl:'mid' }, closeHK:{ pose:'mkick', f:[6, 4, 14], d:12, hs:20, bs:12, kb:3, rx:[4, 28], ry:[14, 52], lvl:'mid' } };
/* specials, per character. spd = projectile px/s (L/M/H); dmg arrays are L/M/H */
const SPECIALS = {
  ryu:{ hadoken:{ pose:'hado', f:[11, 1, 34], proj:{ spd:[80, 110, 140], d:[8, 10, 12], hs:16, bs:11, kb:4, spawn:[26, 26] }, ry:[0, 0] },
    shoryu:{ pose:'dp', f:[3, 14, 32], d:[10, 14, 18], hs:30, bs:16, kb:6, rx:[2, 30], ry:[10, 110], lvl:'mid', kd:true, vy:[185, 205, 225], vx:[24, 32, 40], inv:7 },
    tatsu:{ pose:'tatsu', f:[9, 26, 16], d:[4, 4, 4], hits:[1, 2, 3], hs:22, bs:12, kb:3, rx:[0, 40], ry:[4, 70], lvl:'mid', kd:true, mv:[56, 74, 92], spin:true } },
  guile:{ sonic:{ pose:'sonic', f:[10, 1, 26], proj:{ spd:[90, 120, 150], d:[8, 10, 12], hs:16, bs:11, kb:4, spawn:[28, 22] }, ry:[0, 0], charge:'b' },
    flash:{ pose:'flash', f:[4, 22, 24], d:[10, 12, 14], hs:30, bs:16, kb:5, rx:[-6, 40], ry:[10, 118], lvl:'mid', kd:true, vy:[190, 205, 220], vx:[-26, -34, -42], inv:8, flip:true, charge:'d' } } };
const THROWS = { ryu:{ fwd:{ d:14, name:'SEOI NAGE' }, back:{ d:12, name:'TOMOE NAGE' } }, guile:{ fwd:{ d:14, name:'JUDO THROW' }, back:{ d:12, name:'SUPLEX' } } };
const BTN = ['p1', 'p2', 'p3', 'k1', 'k2', 'k3'];
function mk37(x, ch) { return { x, ch, y:0, vy:0, vx:0, hp:TUNE37.hp, hpShow:TUNE37.hp, st:'idle', t:0, face:1, ph:0, flash:0, buf:[], prev:{}, chB:0, chD:0, lastB:{ n:0, at:-99 }, lastD:{ n:0, at:-99 }, fr:0, mv:null, stun:0, inv:0, cr:false, air:false, ai:0, plan:{}, hitDone:false, hits:0, lock:null, kb:0 }; }
const dirNum = (i, face) => { const fx = ((i.ax !== undefined ? i.ax : (i.r ? 1 : 0) - (i.l ? 1 : 0)) * face), dy = i.d ? -1 : i.u ? 1 : (i.ay !== undefined && i.ay > .5 ? -1 : (i.ay < -.5 ? 1 : 0)); const f = fx > .3 ? 1 : fx < -.3 ? -1 : 0; return [[1, 2, 3], [4, 5, 6], [7, 8, 9]][1 + dy][f + 1]; };
const subseq = (buf, seq, win, gap) => { let k = seq.length - 1, last = -1; for (let i = buf.length - 1; i >= Math.max(0, buf.length - win) && k >= 0; i--) { if (buf[i].d === seq[k] || (seq[k] === 6 && (buf[i].d === 3 || buf[i].d === 9) && k === seq.length - 1) || (seq[k] === 4 && buf[i].d === 7 && k === seq.length - 1)) { if (last >= 0 && last - i > gap) return false; last = i; k--; } } return k < 0; };
const hasDir = (d, set) => set.includes(d);
function buttons37(i) { return { p1:!!i.p1, p2:!!(i.p2 || i.a), p3:!!i.p3, k1:!!i.k1, k2:!!(i.k2 || i.b), k3:!!i.k3 }; }
/* special detection at a button press: returns { id, str } or null */
function special37(f, key) {
  const str = +key[1] - 1, sp = SPECIALS[f.ch], b = f.buf, now = b[b.length - 1] || { d:5 }, punch = key[0] === 'p';
  if (f.ch === 'ryu') { if (punch && subseq(b, [6, 2, 3], 22, 12)) return { id:'shoryu', str }; if (punch && (subseq(b, [2, 3, 6], 22, 14) || subseq(b, [2, 6], 14, 10))) return { id:'hadoken', str };
    if (!punch && (subseq(b, [2, 1, 4], 22, 14) || subseq(b, [2, 4], 14, 10))) return { id:'tatsu', str }; }
  else { const fwd = hasDir(now.d, [6, 3, 9]) || b.slice(-8).some(q => hasDir(q.d, [6, 3, 9])), up = hasDir(now.d, [7, 8, 9]) || b.slice(-8).some(q => hasDir(q.d, [7, 8, 9]));
    if (punch && fwd && f.lastB.n >= TUNE37.charge && f.fr - f.lastB.at <= 12) return { id:'sonic', str }; if (!punch && up && f.lastD.n >= TUNE37.charge && f.fr - f.lastD.at <= 12) return { id:'flash', str }; }
  return null; }
function normal37(f, o, key) {
  const str = +key[1] - 1, punch = key[0] === 'p', d = f.cr ? 2 : (f.buf.length ? f.buf[f.buf.length - 1].d : 5), close = Math.abs(o.x - f.x) < 34;
  if (f.air) return (punch ? 'jP' : 'jK').replace('P', ['LP', 'MP', 'HP'][str]).replace('K', ['LK', 'MK', 'HK'][str]);
  const pre = f.cr ? 'c' : 's', nm = pre + ['L', 'M', 'H'][str] + (punch ? 'P' : 'K');
  if (!f.cr && close && str === 2) return punch ? 'closeHP' : 'closeHK'; return nm; }
function throw37(S, f, o, key) {
  const d = f.buf.length ? f.buf[f.buf.length - 1].d : 5, back = hasDir(d, [4, 1, 7]), fwd = hasDir(d, [6, 3, 9]);
  if (!(back || fwd) || key[0] !== 'p' || key === 'p1' || f.air || f.cr) return false; if (Math.abs(o.x - f.x) > 28 || o.y > 4 || !['idle', 'walk', 'crouch', 'block'].includes(o.st)) return false;
  f.st = 'grab'; f.t = 0; f.lock = { o, kind:fwd ? 'fwd' : 'back', x0:o.x }; o.st = 'held'; o.t = 0; sfx('catch'); return true; }
function startMove(S, f, id, str, special) {
  const C = special ? SPECIALS[f.ch][id] : NORMALS[id], S0 = special ? str : 0; const mv = { id, special, str:S0, C, t:0, hit:false, hitsDone:0, spawned:false, fl:C.f };
  if (!special && C.air) { /* air attack lasts until landing */ } f.st = 'atk'; f.mv = mv; f.hitDone = false; sfx(special ? 'power' : (id.includes('K') ? 'swing' : 'punch'));
  if (special && C.vy) { f.vy = C.vy[S0]; f.vx = C.vx[S0] * f.face; f.y = Math.max(f.y, 0.1); f.air = true; f.inv = C.inv; } if (special && C.mv) f.vx = C.mv[S0] * f.face; }
const fdmg = (m) => m.special ? (Array.isArray(m.C.d) ? m.C.d[m.str] : m.C.d) : m.C.d;
function boxHit37(f, o, m) {   /* is o inside f's active hitbox? */
  const C = m.C, rx = C.rx, ry = C.ry; if (!rx) return false; const x0 = f.x + f.face * rx[0], x1 = f.x + f.face * rx[1], lo = Math.min(x0, x1), hi = Math.max(x0, x1);
  const hb = o.st === 'knock' || o.st === 'ko' ? [0, 12] : o.cr || ['hitc', 'crouch'].includes(o.st) ? [0, 54] : [o.y, o.y + 84]; if (o.cr && o.st !== 'knock') hb[1] = 54 + o.y;
  const ay0 = f.y + ry[0], ay1 = f.y + ry[1]; return hi > o.x - 11 && lo < o.x + 11 && ay1 > hb[0] && ay0 < hb[1]; }
function applyHit37(S, f, o, m, dmg, hs, bs, kb, lvl, kd, proj) {
  const back = o.buf.length && hasDir(o.buf[o.buf.length - 1].d, [4, 1, 7]), crouchBlk = o.buf.length && hasDir(o.buf[o.buf.length - 1].d, [1, 2, 3]);
  const canBlock = ['idle', 'walk', 'crouch', 'block'].includes(o.st) && back && !o.air && (lvl !== 'low' || crouchBlk) && S.over <= 0;
  const aiBlock = o.cpu && ['idle', 'walk', 'crouch', 'block'].includes(o.st) && o.plan.blk && (lvl !== 'low' || o.plan.crouch) && !o.air;
  if (canBlock || aiBlock) { o.hp -= (m && m.special) || proj ? 1 : 0; o.st = 'block'; o.t = 0; o.stun = bs; o.cr = crouchBlk || (o.cpu && o.plan.crouch); o.vx = f.face * kb * 12; f.kb = -f.face * Math.max(2, kb) * 10; sfx('tick'); S.spk.push({ x:o.x - f.face * 8, y:FY37 - 54 - o.y, t:0, blk:true }); ENG.shake(S, 1); return 'block'; }
  o.hp -= dmg; S.score += dmg * 10; sfx('hit'); const crouching = o.cr; o.cr = o.cr && !o.air; o.hit = 1;
  if (kd || o.air) { o.st = 'knock'; o.t = 0; o.vy = 120 + (kd ? 40 : 0); o.vx = f.face * (50 + kb * 6); o.y = Math.max(o.y, .2); o.air = true; o.mv = null; o.lock = null; }
  else { o.st = 'hit'; o.t = 0; o.stun = hs; o.vx = f.face * kb * 14; o.mv = null; o.cr = crouching; f.kb = -f.face * kb * 7; }
  S.spk.push({ x:(f.x + o.x) / 2 + f.face * 8, y:FY37 - Math.min(70, (m && m.C.ry ? (m.C.ry[0] + m.C.ry[1]) / 2 : 54)) - f.y, t:0 }); burst(S, o.x, FY37 - 56 - o.y, W, 4); ENG.impact(S, dmg >= 11 || kd ? 'strong' : 'weak');
  S.combo = S.last === f ? S.combo + 1 : 1; S.last = f; S.comboT = 1.3; if (o.hp <= 0) { o.hp = 0; o.st = 'knock'; o.vy = Math.max(o.vy, 150); o.vx = f.face * 70; o.air = true; o.y = Math.max(o.y, .3); S.over = .001; S.loser = o; sfx('die'); ENG.impact(S, { stop:.22, shake:10, flash:.6 }); } return 'hit'; }
function spawnProj(S, f, m) { const P = m.C.proj; S.pr.push({ x:f.x + f.face * P.spawn[0], y:P.spawn[1], vx:f.face * P.spd[m.str], f:f, face:f.face, d:P.d[m.str], P, t:0, kind:f.ch === 'ryu' ? 'hado' : 'sonic', m }); sfx('shoot'); }
function think37(S, me, foe, lvl) {   /* CPU / bot: returns a plan the step turns into walking, blocking, jumping and moves */
  me.ai -= 1; if (me.ai > 0) return me.plan; const A = TUNE37.ai; me.ai = Math.round(60 * (A.react[0] + S.rng() * (A.react[1] - A.react[0])) / lvl); const dx = Math.abs(foe.x - me.x), P = {}, r = S.rng();
  const foeAtk = foe.st === 'atk' && foe.mv, foeAir = foe.air && foe.st !== 'knock'; const ch = me.ch;
  if (me.st === 'knock' || me.st === 'ko' || me.st === 'hit' || me.st === 'held') return (me.plan = P);
  if (foeAtk && dx < 70 && r < A.block * lvl) { P.blk = true; P.crouch = foe.mv.C.lvl === 'low' || r < .3; return (me.plan = P); }
  if (foeAir && dx < 60 && foe.vy < 40) { if (ch === 'ryu') P.move = 'shoryu'; else P.move = me.lastB.n >= TUNE37.charge || true ? 'flash' : 'cHP'; P.str = 1; P.fwd = 0; return (me.plan = P); }
  if (dx > 118) { if (r < .4 && (ch === 'ryu' ? true : me.chB >= TUNE37.charge || true)) { P.move = ch === 'ryu' ? 'hadoken' : 'sonic'; P.str = Math.floor(S.rng() * 3); } else P.fwd = 1; }
  else if (dx > 62) { if (r < .22) { P.move = ch === 'ryu' ? 'hadoken' : 'sonic'; P.str = Math.floor(S.rng() * 3); } else if (r < .3 && ch === 'ryu') { P.move = 'tatsu'; P.str = 1; } else if (r < .45) { P.jump = 1; P.fwd = 1; } else if (r < .6) P.move = ['sHK', 'sMK'][Math.floor(S.rng() * 2)]; else P.fwd = 1; }
  else if (dx > 34) { if (r < .22) P.move = 'cHK'; else if (r < .42) P.move = ['sMP', 'sHP', 'sMK'][Math.floor(S.rng() * 3)]; else if (r < .5 && ch === 'ryu') { P.move = 'tatsu'; P.str = 0; } else if (r < .6) P.move = 'cMK'; else if (r < .68) P.back = 1; else P.fwd = r < .8 ? 1 : 0; }
  else { if (r < .28) P.throw = r < .14 ? 'fwd' : 'back'; else if (r < .5) P.move = ['sLP', 'sMP', 'cLP', 'closeHP'][Math.floor(S.rng() * 4)]; else if (r < .6) P.move = 'cHP'; else if (r < .72) P.move = ['sLK', 'cLK', 'closeHK'][Math.floor(S.rng() * 3)]; else if (r < .82) P.back = 1; else P.move = 'sMK'; }
  return (me.plan = P); }
function exec37(S, f, o, P) {   /* run a CPU plan as if it were inputs */
  if (!P) return; const ok = ['idle', 'walk', 'crouch'].includes(f.st) || (f.st === 'atk' && f.mv && f.mv.hit && !f.mv.special && P.move && SPECIALS[f.ch][P.move]);
  if (P.blk) { f.cr = !!P.crouch; if (f.st === 'idle' || f.st === 'walk' || f.st === 'crouch') f.st = f.cr ? 'crouch' : 'idle'; }
  if (!ok) return; if (P.throw && f.st !== 'atk') { f.buf.push({ d:P.throw === 'fwd' ? 6 : 4 }); if (throw37(S, f, o, 'p2')) { P.throw = null; return; } }
  if (P.jump && !f.air && f.st !== 'atk') { f.vy = TUNE37.jumpV; f.vx = (P.fwd ? 1 : P.back ? -1 : 0) * f.face * TUNE37.jumpX; f.air = true; f.y = .1; f.st = 'jump'; sfx('jump'); P.jump = 0; return; }
  if (P.move && !(f.st === 'atk' && !SPECIALS[f.ch][P.move])) { const sp = SPECIALS[f.ch][P.move]; if (sp) startMove(S, f, P.move, P.str || 0, true); else { f.cr = /^c/.test(P.move); startMove(S, f, P.move, 0, false); } P.move = null; return; }
  if (f.st !== 'atk') { f.cr = !!P.crouch; const mvx = (P.fwd ? 1 : 0) - (P.back ? 1 : 0); f.x += mvx * f.face * (mvx < 0 ? TUNE37.back : TUNE37.walk) / 60; f.st = mvx ? 'walk' : (f.cr ? 'crouch' : 'idle'); if (mvx) f.ph += mvx * .18; } }
const GAME = kit({ id:'g37', t1:'RYU VS', t2:'GUILE', sub:'EVERY MOVE. ONE ROUND.', seed:937, off:37, secs:60, music:MUS(156, -16, true),
  setup(S) { const q = new URLSearchParams(location.search).get('char'), me = q === 'guile' ? 'guile' : 'ryu'; S.p1 = mk37(78, me); S.p2 = mk37(178, me === 'ryu' ? 'guile' : 'ryu'); S.p2.face = -1; S.p2.cpu = true; S.pr = []; S.spk = []; S.intro = 0; S.over = 0; S.loser = null; S.combo = 0; S.comboT = 0; S.last = null; S.rt = 0; S.timeLeft = TUNE37.time; S.fight = false; S.log = ''; S.throwName = ''; S.dummy = !!new URLSearchParams(location.search).get('dummy'); },
  step(S, dt, inp) { const C = TUNE37, A = S.p1, B = S.p2; S.rt += dt;
    if (S.over > 0) { S.over += dt; if (S.over > C.ko) return finish(S, S.loser === B ? 'YOU WIN' : 'YOU LOSE', S.loser === B ? Math.round(A.hp) * 5 : 0); }
    S.intro += dt; if (S.intro < C.intro) { A.ph += dt * 4; B.ph += dt * 4; return; } if (!S.fight) { S.fight = true; sfx('go'); }
    if (S.over <= 0) { S.timeLeft -= dt; if (S.timeLeft <= 0) { S.timeLeft = 0; S.over = .001; S.loser = A.hp >= B.hp ? B : A; } }
    for (const [f, o] of [[A, B], [B, A]]) { f.fr++; f.face = f.lock || ['atk', 'grab'].includes(f.st) && f.mv ? f.face : (o.x >= f.x ? 1 : -1); if (f.st !== 'atk') f.face = o.x >= f.x ? 1 : -1; f.flash = Math.max(0, f.flash - dt); f.hpShow += (f.hp - f.hpShow) * Math.min(1, dt * 2.2); if (f.inv > 0) f.inv--; f.cr = f.cr && !f.air;
      const free = S.over <= 0 && !['ko', 'knock', 'held'].includes(f.st); let I = {}, plan = null;
      if (f === A && !S.att && !S.botOn) I = inp; else if (f === A) { I = inp.cmdI || {}; plan = think37(S, f, o, 1.0); } else plan = S.dummy ? {} : think37(S, f, o, .5);
      const d = plan ? 5 : dirNum(I, f.face); f.buf.push({ d }); if (f.buf.length > C.buf) f.buf.shift();
      const backNow = hasDir(d, [1, 4, 7]), downNow = hasDir(d, [1, 2, 3]), upNow = hasDir(d, [7, 8, 9]);
      if (backNow) f.chB++; else if (f.chB) { f.lastB = { n:f.chB, at:f.fr }; f.chB = 0; } if (downNow) f.chD++; else if (f.chD) { f.lastD = { n:f.chD, at:f.fr }; f.chD = 0; }
      const bt = plan ? {} : buttons37(I), pressed = []; for (const k of BTN) if (bt[k] && !f.prev[k]) pressed.push(k); f.prev = bt;
      if (!free) { if (f.st === 'ko' || f.st === 'knock') {} }
      // ---- state machine
      if (f.st === 'hit' || f.st === 'block') { f.stun--; if (f.stun <= 0) { f.st = f.cr ? 'crouch' : 'idle'; } f.t++; }
      else if (f.st === 'held') { f.t++; }
      else if (f.st === 'knock') { f.t++; }
      else if (f.st === 'ko') { f.t++; if (f.t > 34 && S.over <= 0) { f.st = 'getup'; f.t = 0; f.inv = 24; } }
      else if (f.st === 'getup') { f.t++; if (f.t > 18) { f.st = 'idle'; f.t = 0; } }
      else if (f.st === 'grab') { f.t++; const L = f.lock; const T = 28; const k = Math.min(1, f.t / T);
        if (f.t === 12) { sfx('punch'); S.throwName = THROWS[f.ch][L.kind].name; S.throwT = 1.2; }
        if (f.t >= 12) { const p = (f.t - 12) / (T - 12); const ox = L.kind === 'fwd' ? f.x + f.face * 18 - f.face * 44 * p : f.x + f.face * 18 + f.face * 14 * p; L.o.x = ox; L.o.y = Math.sin(Math.min(1, p) * Math.PI) * (L.kind === 'fwd' ? 50 : 34); }
        if (f.t >= T) { const o2 = L.o; o2.st = 'knock'; o2.t = 0; o2.vy = L.kind === 'fwd' ? 60 : 90; o2.vx = (L.kind === 'fwd' ? -1 : 1) * f.face * 30; o2.air = true; o2.y = Math.max(o2.y, .3); o2.hp -= THROWS[f.ch][L.kind].d; S.score += 140; ENG.impact(S, 'strong'); sfx('hit'); if (o2.hp <= 0) { o2.hp = 0; S.over = .001; S.loser = o2; } f.st = 'idle'; f.lock = null; } }
      else if (f.st === 'atk') {
        const m = f.mv, Cc = m.C; m.t++; const [s, a, r] = Cc.f; const act = m.t > s && m.t <= s + a, total = s + a + r;
        if (m.special && Cc.proj && m.t === s && !m.spawned) { m.spawned = true; spawnProj(S, f, m); }
        if (act && !m.special && !f.hitDone && boxHit37(f, o, m) && o.inv <= 0 && !['ko', 'held', 'getup'].includes(o.st)) { f.hitDone = true; m.hit = true; const res = applyHit37(S, f, o, m, Cc.d, Cc.hs, Cc.bs, Cc.kb, Cc.lvl, Cc.kd, false); f.hold = res === 'hit' ? 6 : 3; }
        if (act && m.special && !Cc.proj) { const hits = Cc.hits ? Cc.hits[m.str] : 1, every = Cc.hits ? Math.floor(a / hits) : a; if (m.hitsDone < hits && (m.t - s) % Math.max(1, every) === 1 && boxHit37(f, o, m) && o.inv <= 0 && !['ko', 'held', 'getup'].includes(o.st)) { m.hitsDone++; const last = m.hitsDone >= hits; m.hit = true; applyHit37(S, f, o, m, Array.isArray(Cc.d) ? Cc.d[Cc.hits ? 0 : m.str] : Cc.d, Cc.hs, Cc.bs, last ? Cc.kb : 1, Cc.lvl, last && Cc.kd, false); if (!last && o.st === 'hit') o.stun = 8; } }
        if (Cc.mv) { f.x += f.vx * (1 / 60); if (m.t > s + a) f.vx = 0; } if (!Cc.air && !Cc.vy && !Cc.mv) f.vx = 0;
        if (m.t >= total && !(Cc.air && f.air)) { f.st = f.air ? 'jump' : (f.cr ? 'crouch' : 'idle'); f.mv = null; if (!f.air) f.vx = 0; f.hold = 0; } }
      else if (free && f.st !== 'atk') {
        const hold = (S.fight && !f.air);
        if (pressed.length && !plan) { let did = false; for (const k of pressed) { const sp = special37(f, k); if (sp) { startMove(S, f, sp.id, sp.str, true); did = true; break; } if (throw37(S, f, o, k)) { did = true; break; } const id = normal37(f, o, k); if (id) { f.cr = f.cr || /^c/.test(id); startMove(S, f, id, 0, false); did = true; break; } } }
        if (plan) exec37(S, f, o, plan);
        if (f.st !== 'atk' && f.st !== 'grab') {
          const mvx = plan ? 0 : (I.ax !== undefined ? I.ax : (I.r ? 1 : 0) - (I.l ? 1 : 0)) * f.face, wantJump = !plan && upNow && !f.air;
          if (wantJump) { f.vy = C.jumpV; f.vx = (hasDir(d, [9]) ? 1 : hasDir(d, [7]) ? -1 : 0) * f.face * C.jumpX; f.air = true; f.y = .1; f.st = 'jump'; sfx('jump'); }
          else if (!f.air && !plan) { f.cr = downNow; f.st = f.cr ? 'crouch' : (mvx ? 'walk' : (backNow ? 'idle' : 'idle')); if (!f.cr) { f.x += mvx * (mvx < 0 ? C.back : C.walk) / 60 * f.face; if (mvx) f.ph += mvx * f.face * .2 * f.face; } } }
      }
      if (f.st === 'idle' || f.st === 'crouch' || f.st === 'walk') f.ph += .05;
      // airborne physics
      if (f.air) { f.vy -= C.grav * dt; f.y += f.vy * dt; f.x += f.vx * dt; if (f.y <= 0 && f.vy < 0) { f.y = 0; f.air = false; burst(S, f.x, FY37, L, 3); sfx('land'); f.vy = 0;
          if (f.st === 'knock') { f.st = 'ko'; f.t = 0; f.vx = 0; ENG.shake(S, 3); } else { if (f.st === 'atk' && f.mv && (f.mv.C.air || f.mv.C.vy)) { f.st = 'idle'; f.mv = null; } else if (f.st === 'jump') f.st = 'idle'; f.vx = 0; } } }
      else if (f.vx && ['hit', 'block'].includes(f.st)) { f.x += f.vx * dt; f.vx *= .86; if (Math.abs(f.vx) < 2) f.vx = 0; } else if (f.st === 'ko') f.vx = 0;
      if (f.kb) { f.x += f.kb * dt; f.kb *= .8; if (Math.abs(f.kb) < 1) f.kb = 0; } if (f.hp <= 0 && f.st === 'ko') f.inv = 99; }
    if (S.dummy) { B.hp = TUNE37.hp; A.hp = TUNE37.hp; S.timeLeft = TUNE37.time; S.over = 0; }   /* ?dummy=1: CPU stands still and nobody dies (move-list test) */
    // projectiles
    for (const p of S.pr) { p.t += dt; p.x += p.vx * dt; const o = p.f === A ? B : A; const hb = o.cr ? [0, 54] : [o.y, o.y + 84];
      if (Math.abs(p.x - o.x) < 13 && p.y + 8 > hb[0] && p.y - 8 < hb[1] && o.inv <= 0 && !['ko', 'knock', 'getup', 'held'].includes(o.st)) { p.dead = true; applyHit37(S, p.f, o, null, p.d, p.P.hs, p.P.bs, p.P.kb, 'mid', false, true); } if (p.x < -30 || p.x > 290) p.dead = true; }
    for (let i = 0; i < S.pr.length; i++) for (let j = i + 1; j < S.pr.length; j++) if (S.pr[i].f !== S.pr[j].f && Math.abs(S.pr[i].x - S.pr[j].x) < 14) { S.pr[i].dead = S.pr[j].dead = true; S.spk.push({ x:S.pr[i].x, y:FY37 - 28, t:0 }); sfx('boom'); }
    S.pr = S.pr.filter(p => !p.dead);
    if (Math.abs(A.x - B.x) < C.sep && A.y < 20 && B.y < 20 && !['held'].includes(A.st) && !['held'].includes(B.st) && A.st !== 'grab' && B.st !== 'grab') { const m = (A.x + B.x) / 2, s = A.x <= B.x ? 1 : -1; A.x = m - s * C.sep / 2; B.x = m + s * C.sep / 2; }
    for (const f of [A, B]) f.x = clamp(f.x, C.wall[0], C.wall[1]); S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; if (S.throwT > 0) S.throwT -= dt; for (const s of S.spk) s.t += dt; S.spk = S.spk.filter(s => s.t < .22); },
  draw(S) { const C = TUNE37, sh = S.ecam && S.ecam.sh > 0 ? Math.round((S.rng() - .5) * S.ecam.sh * .5) : 0, sy = S.ecam && S.ecam.sh > 3 ? Math.round((S.rng() - .5) * S.ecam.sh * .3) : 0;
    rect(0, 0, 256, 224, K); const bands = [B, B, B, SKY, SKY, PK, PK, O]; for (let i = 0; i < 8; i++) { rect(0, i * 14, 256, 14, bands[i]); if (i) for (let x = (i % 2) * 2; x < 256; x += 4) px(x, i * 14, bands[i - 1]); }
    for (let i = 0; i < 12; i++) { const bx = i * 24 - ((S.rt * 2) % 24) + sh * .3, bh = 24 + ((i * 37) % 5) * 10; rect(bx, 110 - bh, 18, bh + 4, N); for (let w = 0; w < bh; w += 8) rect(bx + 3, 110 - bh + 4 + w, 3, 3, (i + w) % 3 ? Y : DG); }
    rect(0, 108, 256, 54, D); rect(0, 108, 256, 2, L); for (let x = 0; x < 256; x += 8) rect(x + sh * .5, 112, 2, 40, DG); rect(0, 120, 256, 2, D);
    for (let i = 0; i < 18; i++) { const cx = i * 15 + 6 + sh * .6, bob = Math.round(Math.sin(S.rt * 5 + i * 1.7) * (S.over > 0 || S.combo > 1 ? 3 : 1)), col = [R, B, GR, Y, PU][i % 5]; rect(cx - 2, 132 + bob, 6, 8, col); rect(cx - 1, 126 + bob, 4, 5, i % 3 ? S : T); rect(cx - 2, 124 + bob, 6, 2, K); }
    rect(0, 148, 256, 14, M); rect(0, 148, 256, 1, T); rect(0, 162, 256, 62, DG); for (let y = 0; y < 62; y += 6) rect(0, 162 + y, 256, 1, D);
    for (let i = -6; i < 14; i++) { const x0 = 128 + (i - 4) * 14, x1 = 128 + (i - 4) * 40; for (let t = 0; t < 1; t += .02) px(x0 + (x1 - x0) * t + sh, 162 + t * 62, D); } rect(0, 162, 256, 2, L);
    const fs = [S.p1, S.p2].sort((p, q) => (p.st === 'knock' || p.st === 'ko') - (q.st === 'knock' || q.st === 'ko'));
    for (const f of fs) { const w = f.st === 'ko' ? 30 : Math.max(8, 17 - f.y * .08); for (let y = -3; y <= 3; y++) for (let x = -Math.round(w); x <= w; x++) if ((x * x) / (w * w) + (y * y) / 10 < 1 && (x + y) % 2 === 0) px(f.x + x + sh, FY37 + 2 + y, K); }
    for (const f of fs) { const r = poseOf37(S, f); PRIG.draw('fighter', f.ch, r.pose, f.x + sh, FY37 - f.y + sy, f.face, r.ph, { sc:C.sc, flash:f.flash > 0 ? 1 : 0, env:r.env, rot:r.rot }); }
    for (const p of S.pr) { const x = p.x + sh, y = FY37 - p.y - 4; if (p.kind === 'hado') { const r = 11 + (Math.floor(p.t * 20) & 1) * 2; for (let a = 0; a < 6.283; a += .1) for (let q = 0; q < r; q += 1) px(x + Math.cos(a) * q * 1.3, y + Math.sin(a) * q, q > r - 3 ? CY : q > r - 5 ? SKY : W); for (let k = 1; k < 4; k++) { rect(x - p.face * (r + k * 5) - 2, y + (k % 2 ? 2 : -3), 5, 2, k % 2 ? SKY : CY); } }
      else { for (let a = -1.2; a < 1.2; a += .08) { const rr = 19; for (let q = 0; q < 4; q++) px(x + Math.cos(a) * (rr - q) * p.face * .55, y + Math.sin(a) * (rr - q), q < 2 ? Y : V); } rect(x - 1, y - 1, 3, 3, W); } }
    for (const s of S.spk) { const x = s.x + sh, y = s.y, r = 4 + s.t * 60, c = s.blk ? CY : Y; for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, r2 = k % 2 ? r : r * .5; for (let q = r2 * .4; q < r2; q += 1) px(x + Math.cos(a) * q, y + Math.sin(a) * q, k % 3 ? c : W); } if (s.t < .08) rect(x - 3, y - 3, 7, 7, W); }
    const bar = (x, w, f, rev) => { rect(x - 2, 14, w + 4, 12, W); rect(x - 1, 15, w + 2, 10, K); const cur = Math.round(w * f.hp / C.hp), tr = Math.round(w * f.hpShow / C.hp); rect(rev ? x + w - tr : x, 17, tr, 6, R); rect(rev ? x + w - cur : x, 17, cur, 6, f.hp > 30 ? Y : (Math.floor(S.rt * 6) & 1 ? R : Y)); rect(rev ? x + w - cur : x, 17, cur, 2, V); };
    bar(14, 96, S.p1, false); bar(146, 96, S.p2, true); rect(112, 12, 32, 18, W); rect(113, 13, 30, 16, N); },
  hud(S) { txt(S.p1.ch.toUpperCase(), 14, 6, W, 8); txt(S.p2.ch.toUpperCase(), 242, 6, W, 8, 'right'); txt(String(Math.ceil(S.timeLeft)).padStart(2, '0'), 128, 14, Y, 16, 'center');
    if (S.intro < TUNE37.intro) { if (S.intro < .85) txt('ROUND 1', 128, 84, Y, 24, 'center'); else txt('FIGHT!', 128, 84, R, 32, 'center'); }
    if (S.combo > 1) txt(S.combo + ' HIT COMBO', 128, 40, Y, 8, 'center'); if (S.throwT > 0) txt(S.throwName, 128, 52, W, 8, 'center');
    if (S.over > 0) txt(S.timeLeft <= 0 ? 'TIME' : 'K.O.!', 128, 80, Y, 32, 'center'); hintS(S, 'UIO PUNCH  JKL KICK  623+P DP  236+P FIREBALL', 8, 212); },
  info(S) { const q = f => f.mv ? f.mv.id : f.st; return { x1:Math.round(S.p1.x), x2:Math.round(S.p2.x), hp1:Math.round(S.p1.hp), hp2:Math.round(S.p2.hp), st1:S.p1.st, st2:S.p2.st, mv1:q(S.p1), mv2:q(S.p2), y1:Math.round(S.p1.y), pr:S.pr.length, tl:+S.timeLeft.toFixed(1), c1:S.p1.chB, cr1:S.p1.cr ? 1 : 0, face1:S.p1.face }; },
  bot(S, i) { S.botOn = true; i.cmdI = {}; return i; } });
function poseOf37(S, f) {
  const e = x => Math.max(0, Math.min(1, x));
  if (f.st === 'atk' && f.mv) { const m = f.mv, [s, a, r] = m.C.f, t = m.t; let env = t <= s ? e(t / s) : t <= s + a ? 1 : e(1 - (t - s - a) / r); let pose = m.C.pose, rot = 0, ph = f.ph;
    if (m.C.air && !m.special) env = e(t / 3); if (m.special && m.C.flip) { rot = 340 * Math.min(1, (t - m.C.f[0]) / 20); if (t < m.C.f[0]) rot = 0; env = 1; } if (m.special && m.C.spin) { pose = (Math.floor(t / 4) & 1) ? 'tatsu2' : 'tatsu'; env = t < s ? e(t / s) : 1; if (t > s + a) env = e(1 - (t - s - a) / r); }
    if (m.special && m.C.pose === 'dp') { env = t < s ? e(t / s) : 1; } return { pose, env, ph, rot }; }
  if (f.st === 'hit') return { pose:f.cr ? 'hitc' : 'hit', env:1, ph:0 }; if (f.st === 'block') return { pose:f.cr ? 'blockc' : 'block', env:1, ph:0 };
  if (f.st === 'knock') return { pose:'knock', env:1, ph:0, rot:Math.min(120, f.t * 8) * -1 * 0 + Math.min(140, f.t * 10) };
  if (f.st === 'ko') return { pose:'ko', env:1, ph:0 }; if (f.st === 'getup') return { pose:'getup', env:1, ph:0 };
  if (f.st === 'held') return { pose:'hit', env:1, ph:0 }; if (f.st === 'grab') return { pose:f.t < 12 ? 'grab' : 'throw', env:f.t < 12 ? Math.min(1, f.t / 6) : 1, ph:0 };
  if (f.st === 'jump') return { pose:'jump', env:1, ph:0 }; if (f.st === 'crouch' || f.cr) return { pose:'crouch', env:1, ph:f.ph }; if (f.st === 'walk') return { pose:'walk', env:1, ph:f.ph * 1.0 };
  return { pose:'idle', env:1, ph:f.ph }; }
/* QA/doc hook: window.__posesheet(char, [poses]) draws a labelled pose sheet into the screen canvas and returns a data URL (used for docs/G37-MOVELIST.md art) */
window.__posesheet = (ch, names) => { rect(0, 0, 256, 224, K); rect(0, 150, 256, 74, DG); rect(0, 150, 256, 2, L);
  names.forEach((p, i) => { const col = i % 4, row = Math.floor(i / 4), x = 32 + col * 64, y = 70 + row * 70, free = /^j|dp|flash|tatsu|knock/.test(p); PRIG.draw('fighter', ch, p, x, y + (free ? -6 : 0), 1, 0.5, { sc:56, env:1, rot:p === 'flash' ? 200 : p === 'knock' ? 60 : 0 }); txt(p, x, y + 6, W, 8, 'center'); });
  for (let i = 0; i < buf.length; i++) px32[i] = PAL32[buf[i]]; ctx.putImageData(img, 0, 0); return document.getElementById('screen').toDataURL(); };
