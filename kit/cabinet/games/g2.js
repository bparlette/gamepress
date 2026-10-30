/* ===== DISC FIGHTERS: Windjammers x Street Fighter II. Disc duel with fireball inputs, supers and parries. ===== */
const CX0 = 8, CX1 = 248, CY0 = 36, CY1 = 196, CMID = 116, WINPTS = 15, MATCH = 60;
let p1, p2, disc, pts1, pts2, tleft, phase, phaseT, popups, motion, supWin, att, rng, rally, shake, flashT, introT, lastTok, hint;
const SKIN = [S, T];
function mkPlayer(side) {
  return { side, x:side < 0 ? 44 : 212, y:CMID, vx:0, vy:0, face:side < 0 ? 1 : -1, hold:false, holdT:0, pose:'idle', poseT:0, stun:0, parry:0, parryCd:0,
           meter:0, think:0.5, err:0, willParry:false, aim:0, kind:'n', anim:0,
           pal: side < 0 ? { shirt:R, pants:B, hair:M, skin:S } : { shirt:Y, pants:GR, hair:K, skin:T } };
}
function popup(s, x, y, col) { popups.push({ s, x, y, col, t:0 }); if (popups.length > 4) popups.shift(); }
function reflectY(y) { const lo = CY0 + 4, hi = CY1 - 4, span = hi - lo; const m = (((y - lo) % (2 * span)) + 2 * span) % (2 * span); return lo + (m > span ? 2 * span - m : m); }
function giveDisc(p) {
  disc.state = 'held'; disc.owner = p; disc.super = false; disc.lob = false; disc.trail = [];
  p.hold = true; p.holdT = 0; p.think = 0.5 + rng() * 0.5; p.aim = 0;
}
function resetRound(server) {
  p1.x = 44; p2.x = 212; p1.y = p2.y = CMID; p1.hold = p2.hold = false; p1.stun = p2.stun = 0; p1.pose = p2.pose = 'idle';
  disc = { x:server.x, y:server.y, vx:0, vy:0, state:'held', owner:server, super:false, lob:false, age:0, x0:0, trail:[], speed:150 };
  giveDisc(server); rally = 0; phase = 'ready'; phaseT = 0.9;
}
function throwDisc(p, kind, aim) {
  const sp = Math.min(240, 150 + rally * 9);
  disc.state = 'fly'; disc.owner = p; disc.age = 0; disc.x0 = disc.x; disc.super = kind === 's'; disc.lob = kind === 'l'; disc.speed = sp;
  const ang = aim * 34 * rad;
  if (kind === 's') { disc.vx = p.face * 300; disc.vy = aim * 40; p.meter = 0; p.pose = 'super'; p.poseT = 0.45; popup('FIREBALL!', 128, 60, Y); sfx('super'); shake = 0.3; flashT = 0.15; }
  else if (kind === 'l') { disc.vx = p.face * 105; disc.vy = aim * 30; p.pose = 'throw'; p.poseT = 0.2; sfx('throw'); }
  else { disc.vx = p.face * sp * Math.cos(ang); disc.vy = sp * Math.sin(ang); p.pose = 'throw'; p.poseT = 0.2; sfx('throw'); }
  p.hold = false; rally++;
  const opp = p === p1 ? p2 : p1;
  opp.willParry = disc.super && rng() < (opp === p1 ? 0.65 : 0.3);
  opp.err = (rng() - 0.5) * 26;
}
function score(side, pts, label) {
  // side: who gets the points
  if (side < 0) pts1 += pts; else pts2 += pts;
  popup(label || ('+' + pts), side < 0 ? 70 : 186, 50, side < 0 ? R : Y); sfx(pts >= 5 ? 'win' : 'coin');
  shake = 0.2;
  disc.state = 'dead'; phase = 'point'; phaseT = 1.2; phase_loser = side < 0 ? p2 : p1;
}
let phase_loser = null;
function aiPlayer(p, opp, dt) {
  if (p.stun > 0) return;
  const inc = p.side > 0 ? disc.vx > 0 : disc.vx < 0;
  const spd = p === p2 ? 80 : 95;
  let tx = p.x, ty = p.y;
  if (!p.hold) {
    if (disc.state === 'fly' && inc) {
      const t = Math.abs((p.x - disc.x) / (disc.vx || 1));
      ty = reflectY(disc.y + disc.vy * t) + p.err;
      tx = clamp(disc.x + disc.vx * 0.15, p.side < 0 ? CX0 + 12 : 140, p.side < 0 ? 116 : CX1 - 12);
      if (disc.super && p.willParry && Math.hypot(disc.x - p.x, disc.y - p.y) < 38 && p.parryCd <= 0) { p.parry = 0.22; p.parryCd = 0.7; }
    } else { ty = CMID + Math.sin(tms * 0.9 + p.side) * 26; tx = p.side < 0 ? 52 : 204; }
    const dx = tx - p.x, dy = ty - p.y;
    p.vx = Math.abs(dx) > 3 ? Math.sign(dx) * spd : 0; p.vy = Math.abs(dy) > 3 ? Math.sign(dy) * spd : 0;
  } else {
    p.vx = p.vy = 0; p.holdT += dt;
    if (p.holdT > p.think) {
      const kind = p.meter >= 100 && rng() < 0.5 ? 's' : rng() < 0.2 ? 'l' : 'n';
      const aim = opp.y < CMID ? 1 : opp.y > CMID + 14 ? -1 : (rng() < 0.5 ? -1 : 1);
      throwDisc(p, kind, kind === 's' ? 0 : aim);
    }
  }
}
function humanPlayer(p, inp, dt) {
  if (p.stun > 0) return;
  const spd = p.hold ? 62 : 95;
  p.vx = ((inp.r ? 1 : 0) - (inp.l ? 1 : 0)) * spd; p.vy = ((inp.d ? 1 : 0) - (inp.u ? 1 : 0)) * spd;
  /* motion buffer: down, down-forward, forward */
  const tok = inp.d && inp.r ? 'DF' : inp.d ? 'D' : inp.r ? 'F' : '5';
  if (tok !== lastTok) { motion.push({ tok, t:tms }); lastTok = tok; if (motion.length > 8) motion.shift(); }
  const m = motion.filter(e => tms - e.t < 0.6).map(e => e.tok).join(',');
  if (/D,DF,F$/.test(m) || /D,F$/.test(m)) supWin = 0.35;
  if (p.hold) {
    p.holdT += dt;
    const aim = inp.u ? -1 : inp.d ? 1 : 0;
    if (inp.pa) { if (supWin > 0 && p.meter >= 100) throwDisc(p, 's', 0); else throwDisc(p, 'n', aim); }
    else if (inp.pb) throwDisc(p, 'l', aim);
    else if (p.holdT > 2.4) throwDisc(p, 'n', 0);
  } else if (inp.pb && p.parryCd <= 0) { p.parry = 0.22; p.parryCd = 0.5; }
}
function updatePlayer(p, dt) {
  if (p.stun > 0) { p.stun -= dt; p.vx = p.vy = 0; p.pose = 'stun'; }
  p.parry = Math.max(0, p.parry - dt); p.parryCd = Math.max(0, p.parryCd - dt);
  p.x = clamp(p.x + p.vx * dt, p.side < 0 ? CX0 + 12 : 132, p.side < 0 ? 124 : CX1 - 12);
  p.y = clamp(p.y + p.vy * dt, CY0 + 18, CY1 - 14);
  p.anim += dt * (Math.abs(p.vx) + Math.abs(p.vy) > 0 ? 1 : 0);
  if (p.poseT > 0) { p.poseT -= dt; if (p.poseT <= 0) p.pose = 'idle'; }
  else if (p.stun <= 0) p.pose = p.hold ? 'hold' : 'idle';
  if (p.hold) { disc.x = p.x + p.face * 11; disc.y = p.y - 4; }
}
function setupWorld(isAtt) {
  rng = mkRng(runSeed(isAtt ? 31 : null, 3));
  p1 = mkPlayer(-1); p2 = mkPlayer(1);
  pts1 = pts2 = 0; tleft = MATCH; popups = []; motion = []; supWin = 0; shake = 0; flashT = 0; lastTok = '5'; introT = 2.2; hint = 0;
  resetRace_();
}
function resetRace_() { resetRound(rng() < 0.5 ? p1 : p2); }

const GAME = {
  id:'g2', t1:'DISC', t2:'FIGHTERS', sub:'CATCH. THROW. FIREBALL.',
  music:{ bpm:132, lead:'square', chords:[{ root:-24, tones:[0,4,7] }, { root:-19, tones:[2,7,11] }, { root:-21, tones:[0,4,9] }, { root:-17, tones:[0,5,9] }],
          arp:[0,-1,2,-1,1,-1,2,-1,0,2,-1,1,2,-1,1,-1], bass:[0,3,6,8,11,14], snare:[4,12], kick:[0,6,8], hat:true },
  init(isAtt) { att = !!isAtt; setupWorld(att); },
  update(dt, inp, mode) {
    att = mode === 'title';
    supWin = Math.max(0, supWin - dt);
    if (shake > 0) shake -= dt; if (flashT > 0) flashT -= dt;
    if (introT > 0) introT -= dt;
    if (phase === 'ready') { phaseT -= dt; updatePlayer(p1, dt); updatePlayer(p2, dt); if (phaseT <= 0) { phase = 'play'; popup('FIGHT!', 128, 60, E); sfx('go'); } }
    else if (phase === 'point') {
      phaseT -= dt; updatePlayer(p1, dt); updatePlayer(p2, dt);
      if (phaseT <= 0) {
        if (pts1 >= WINPTS || pts2 >= WINPTS || tleft <= 0) { finish(); }
        else resetRound(phase_loser);
      }
    } else if (phase === 'play') {
      tleft -= dt;
      if (inp.__ai) aiPlayer(p1, p2, dt); else humanPlayer(p1, inp, dt);
      aiPlayer(p2, p1, dt);
      updatePlayer(p1, dt); updatePlayer(p2, dt);
      if (disc.state === 'fly') {
        disc.age += dt;
        const prog = Math.abs(disc.x - disc.x0) / 120;
        if (disc.lob && prog >= 1 && Math.abs(disc.vx) < 150) { disc.vx = Math.sign(disc.vx) * 230; sfx('tick'); }
        let wave = 0; if (disc.super) wave = Math.cos(disc.age * 14) * 70;
        disc.x += disc.vx * dt; disc.y += (disc.vy + wave) * dt;
        if (disc.y < CY0 + 4) { disc.y = CY0 + 4; disc.vy = Math.abs(disc.vy); sfx('tick'); }
        if (disc.y > CY1 - 4) { disc.y = CY1 - 4; disc.vy = -Math.abs(disc.vy); sfx('tick'); }
        disc.trail.push({ x:disc.x, y:disc.y }); if (disc.trail.length > 9) disc.trail.shift();
        for (const p of [p1, p2]) {
          const toward = p.side < 0 ? disc.vx < 0 : disc.vx > 0;
          if (!toward || disc.owner === p) continue;
          const dist = Math.hypot(disc.x - p.x, disc.y - (p.y - 2));
          if (disc.super) {
            if (p.parry > 0 && dist < 22) {
              disc.super = false; disc.vx = -disc.vx * 0.65; disc.vy = (rng() - 0.5) * 80; disc.owner = p; disc.trail = [];
              p.meter = Math.min(100, p.meter + 30); (p === p1 ? p2 : p1).stun = 0.9; popup('PARRY!', 128, 60, CY); sfx('catch'); flashT = 0.1; rally += 2;
            } else if (dist < 10) {
              p.stun = 1.1; popup(p === p1 ? 'OUCH!' : 'BOOM!', 128, 60, R); sfx('boom'); score(p.side < 0 ? 1 : -1, 5, '+5 FIREBALL'); break;
            }
          } else if (!(disc.lob && prog < 1) && dist < 13) {
            giveDisc(p); p.meter = Math.min(100, p.meter + 15); p.pose = 'hold'; sfx('catch'); break;
          }
        }
        if (disc.state === 'fly') {
          if (disc.x < CX0 - 2) { const z = Math.abs(disc.y - CMID) < 24 ? 5 : 3; score(1, z); p2.meter = Math.min(100, p2.meter + 25); }
          else if (disc.x > CX1 + 2) { const z = Math.abs(disc.y - CMID) < 24 ? 5 : 3; score(-1, z); p1.meter = Math.min(100, p1.meter + 25); }
        }
      }
      if (tleft <= 0 || pts1 >= WINPTS || pts2 >= WINPTS) { tleft = Math.max(0, tleft); if (disc.state !== 'dead') { phase = 'point'; phaseT = 0.6; disc.state = 'dead'; phase_loser = p1; } }
    }
    for (let i = popups.length - 1; i >= 0; i--) { popups[i].t += dt; if (popups[i].t > 1.3) popups.splice(i, 1); }
    if (att && (phase === 'over')) setupWorld(true);
  },
  render() {
    clear(N);
    /* crowd */
    rect(0, 22, VW, 14, M);
    for (let x = 0; x < VW; x += 6) { const c = [R, Y, B, E, O, PU][Math.floor(hash(x, 5) * 6)]; const bob = (Math.floor(tms * 3 + hash(x, 1) * 5) & 1); rect(x, 26 - bob, 5, 5, c); rect(x + 1, 24 - bob, 3, 3, S); }
    /* sand court */
    rect(0, CY0, VW, CY1 - CY0 + 8, V);
    for (let y = CY0; y < CY1; y++) for (let x = CX0; x < CX1; x++) if (hash(x, y) > 0.965) px(x, y, Y);
    rect(0, CY0 - 4, VW, 4, B); rect(0, CY0 - 4, VW, 1, CY);
    rect(0, CY1, VW, 8, B); rect(0, CY1, VW, 1, CY);
    /* goals: 3 / 5 / 3 */
    for (const gx of [0, CX1]) {
      rect(gx, CY0, 8, CY1 - CY0, B); rect(gx, CMID - 24, 8, 48, R);
      rect(gx, CY0, 8, 1, W); rect(gx, CMID - 24, 8, 1, W); rect(gx, CMID + 24, 8, 1, W);
    }
    /* court lines + net */
    rect(CX0, CY0, 1, CY1 - CY0, T); rect(CX1 - 1, CY0, 1, CY1 - CY0, T);
    for (let y = CY0; y < CY1; y += 12) rect(127, y, 2, 7, W);
    rect(CX0 + 22, CY0, 1, CY1 - CY0, L); rect(CX1 - 23, CY0, 1, CY1 - CY0, L);
    /* fighters, disc */
    const draw = p => drawFighter(p);
    const ents = [{ y:p1.y, f:() => draw(p1) }, { y:p2.y, f:() => draw(p2) }].sort((a, b) => a.y - b.y);
    ents.forEach(e => e.f());
    drawDisc();
    if (flashT > 0) for (let y = CY0; y < CY1; y += 2) rect(0, y, VW, 1, W);
    /* bottom panel */
    rect(0, 204, VW, 20, N); rect(0, 204, VW, 1, W);
    for (const [p, x0] of [[p1, 8], [p2, 148]]) {
      rect(x0 - 1, 211, 102, 9, K); rect(x0, 212, 100, 7, DG);
      const full = p.meter >= 100;
      rect(x0, 212, Math.round(p.meter), 7, full ? (Math.floor(tms * 8) & 1 ? Y : W) : p === p1 ? R : Y);
    }
    if (shake > 0) for (let y = CY0; y < CY1; y += 6) if (hash(y, Math.floor(tms * 40)) > 0.6) { const o = Math.round((hash(y, 8) - 0.5) * 4); const row = buf.slice(y * VW, (y + 1) * VW); buf.set(row.subarray(Math.max(0, -o), VW - Math.max(0, o)), y * VW + Math.max(0, o)); }
  },
  hud(mode) {
    txt('YOU ' + String(pts1).padStart(2, '0'), 8, 8, R === 6 ? W : W, 8);
    txt('CPU ' + String(pts2).padStart(2, '0'), 248, 8, W, 8, 'right');
    txt(fmt(Math.max(0, tleft)).replace(/\.\d/, ''), 128, 8, Y, 8, 'center');
    txt('SUPER', 8, 196, W, 8, 'left', false); txt('SUPER', 148, 196, W, 8, 'left', false);
    for (const p of popups) txt(p.s, p.x, Math.round(p.y - p.t * 12), p.col, 8, 'center');
    if (phase === 'ready' && mode === 'play') txt('READY?', 128, 100, W, 16, 'center');
    if (mode === 'play') {
      let h = '';
      if (p1.meter >= 100 && p1.hold) h = 'D DF F + A = FIREBALL!';
      else if (p1.hold) h = 'A THROW  B LOB';
      else if (disc.super && disc.owner === p2) h = 'PRESS B TO PARRY!';
      else if (introT > 0) h = 'CATCH THE DISC';
      if (h && (Math.floor(tms * 3) & 1 || introT > 0)) txt(h, 128, 188, W, 8, 'center');
    }
  },
  info() { return { pts1, pts2, tleft:+tleft.toFixed(1), phase, meter1:Math.round(p1.meter), meter2:Math.round(p2.meter), rally }; },
  bot() { return { l:0, r:0, u:0, d:0, a:0, b:0, pa:0, pb:0, start:0, __ai:1 }; },
};
function finish() {
  phase = 'over';
  const win = pts1 > pts2, tie = pts1 === pts2;
  if (!att) endGame(Math.max(0, pts1 * 100 + (win ? 1000 : 0)), win ? 'YOU WIN!' : tie ? 'DRAW' : 'YOU LOSE');
}
function drawFighter(p) {
  const x = Math.round(p.x), y = Math.round(p.y), f = p.face, pal = p.pal;
  const Rr = (ox, oy, w, h, c) => rect(f > 0 ? x + ox : x - ox - w, y + oy, w, h, c);
  Rr(-7, 11, 15, 3, T);
  const run = (Math.abs(p.vx) + Math.abs(p.vy) > 0) ? (Math.floor(p.anim * 8) & 1) : 0;
  Rr(-4, 4, 4, 8 - run, pal.pants); Rr(1, 4, 4, 7 + run, pal.pants);
  Rr(-4, 11 - run, 5, 2, K); Rr(1, 10 + run, 5, 2, K);
  if (p.pose === 'stun') { Rr(-5, -7, 11, 11, pal.shirt); Rr(-5, 2, 11, 4, pal.pants); Rr(-3, -12, 7, 7, pal.skin); Rr(-3, -12, 7, 3, pal.hair);
    const s = Math.floor(tms * 10) & 1; px(x - 4 + s * 2, y - 17, Y); px(x + 3 - s * 2, y - 18, Y); px(x, y - 16, W); Rr(-7, -4, 3, 7, pal.skin); Rr(5, -4, 3, 7, pal.skin); return; }
  Rr(-5, -7, 11, 11, pal.shirt); Rr(-5, 2, 11, 4, pal.pants); Rr(-5, -7, 11, 2, pal.hair === M ? W : L);
  Rr(-3, -14, 7, 7, pal.skin); Rr(-3, -14, 7, 3, pal.hair); Rr(2, -10, 1, 1, K);
  Rr(-8, -6, 3, 8, pal.skin);
  if (p.pose === 'throw') Rr(5, -6, 10, 3, pal.skin);
  else if (p.pose === 'hold') Rr(5, -6, 6, 3, pal.skin);
  else if (p.pose === 'super') { Rr(4, -16, 3, 10, pal.skin); Rr(-8, -16, 3, 10, pal.skin); const g = Math.floor(tms * 16) & 1; for (let i = 0; i < 8; i++) px(x - 8 + (i * 5 + g * 2) % 17, y - 18 - (i % 3) * 2, i % 2 ? Y : O); }
  else Rr(5, -5, 3, 8, pal.skin);
  if (p.parry > 0) { for (let a = 0; a < 20; a++) { const an = a / 20 * 6.283; px(x + Math.cos(an) * 15 * f, y - 2 + Math.sin(an) * 15, CY); } }
}
function drawDisc() {
  if (disc.state === 'dead' && phase === 'point') return;
  const dx = Math.round(disc.x);
  if (disc.state === 'fly' && disc.lob) {
    const prog = clamp(Math.abs(disc.x - disc.x0) / 120, 0, 1), z = Math.sin(prog * Math.PI) * 24;
    rect(dx - 3, disc.y + 3, 7, 2, T); disc_(dx, Math.round(disc.y - z), false); return;
  }
  if (disc.super) {
    disc.trail.forEach((q, i) => { const r = Math.floor(i / 3) + 1; disc_c(q.x, q.y, r, i < 3 ? R : i < 6 ? O : Y); });
    disc_c(dx, disc.y, 5, Y); disc_c(dx, disc.y, 3, W); return;
  }
  if (disc.state === 'fly') rect(dx - 3, disc.y + 4, 7, 2, T);
  disc_(dx, Math.round(disc.y), false);
}
function disc_c(x, y, r, c) { fillCircle(Math.round(x), Math.round(y), r, c); }
function disc_(x, y) { fillCircle(x, y, 4, W); fillCircle(x, y, 3, R); rect(x - 2, y - 1, 2, 1, W); if (Math.floor(tms * 12) & 1) px(x + 2, y + 1, Y); }
