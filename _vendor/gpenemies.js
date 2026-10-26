// gpenemies: universal ENEMY layer in the flat outlined hero style, kept visually apart from hero skins
// (crimson / acid green / deep + neon purple, never the hero roster colours). ESM, no deps.
// Draw: drawEnemy(id, c, x, y, size, o). Feet (or hover base) at (x,y), `size` = pixel height, o.dir 1 right / -1 left.
//   o.t animation clock (s)   o.flash 1-frame pure white hit flash (source-atop on an offscreen)   o.warn 0..1 (or true) red telegraph
//   o.count 3|2|1 fuse digit (bad_bomb)
// Behaviour: updateEnemy(e, hero, dt, rng) is pure-deterministic (seeded rng passed in, no Math.random). Mutates e, returns events.
// Games opt in with the spec key enemies:'viral' (docs/ENEMIES.md); 'classic' (default) keeps the old drawChar look.
import { STY } from './gpsprites.js';

const INK = '#151515';
const C = { crim: '#c1121f', crimHi: '#ff2d4f', acid: '#9be000', acidD: '#4f8a0f', acidDD: '#2f5a0a', pur: '#4a1a6b', purD: '#2a1040', neon: '#c026d3', vio: '#a855f7', bone: '#e9e3cf', metal: '#586074', metalD: '#2f3544', brown: '#7a4a21', brownL: '#a06a35', fire: '#ff7a1a' };

const ell = (c, x, y, rx, ry, fill) => { c.beginPath(); if (STY.blocky) c.rect(x - rx, y - ry, rx * 2, ry * 2); else c.ellipse(x, y, rx, ry, 0, 0, 7); c.fillStyle = fill; c.fill(); if (STY.ow) { c.lineWidth = STY.ow; c.strokeStyle = INK; c.stroke(); } };
const poly = (c, pts, fill) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = fill; c.fill(); if (STY.ow) { c.lineWidth = STY.ow; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke(); } };
const rct = (c, x, y, w, h, fill) => { c.beginPath(); if (STY.blocky) c.rect(x, y, w, h); else c.roundRect(x, y, w, h, Math.min(w, h) / 3); c.fillStyle = fill; c.fill(); if (STY.ow) { c.lineWidth = STY.ow; c.strokeStyle = INK; c.stroke(); } };
const wrap = (c, x, y, h, o, fn) => { c.save(); c.translate(x, y); c.scale((o.dir || 1) * h / 100, h / 100); const ow = STY.ow; STY.ow = ow * 100 / h; try { fn(c, o.t || 0, o); } finally { STY.ow = ow; c.restore(); } };
const fillp = (c, pts, fill) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = fill; c.fill(); };

// ---- sprites (100-unit tall space, feet at 0, facing +x) ----
function badZombie(c, t) {
  const w = Math.sin(t * 7) * 5, b = Math.abs(Math.sin(t * 7)) * 2;
  rct(c, -15 + w * .5, -30, 13, 30, C.purD); rct(c, 2 - w * .5, -30, 13, 30, C.purD);
  rct(c, -20, -76 - b, 40, 48, C.acidD); rct(c, -20, -42 - b, 40, 8, C.purD); poly(c, [[-20, -34 - b], [-12, -24 - b], [-4, -34 - b], [4, -22 - b], [12, -34 - b], [20, -26 - b], [20, -34 - b]], C.pur);
  rct(c, 12, -72 - b + w * .3, 40, 11, C.acid); rct(c, 8, -56 - b - w * .3, 38, 11, C.acid);
  rct(c, -17, -104 - b, 34, 30, C.acid); fillp(c, [[-17, -96 - b], [-5, -92 - b], [-17, -88 - b]], C.acidDD);
  rct(c, -10, -94 - b, 8, 7, C.crimHi); rct(c, 4, -94 - b, 8, 7, C.crimHi); c.fillStyle = INK; c.fillRect(-9, -91 - b, 4, 3); c.fillRect(5, -91 - b, 4, 3);
  c.fillStyle = INK; c.fillRect(-9, -80 - b, 20, 5); c.fillStyle = C.bone; for (let i = 0; i < 4; i++) c.fillRect(-8 + i * 5, -80 - b, 3, 3);
}
function badBat(c, t) {
  const f = Math.sin(t * 16) * 22, bob = Math.sin(t * 5) * 3;
  for (const s of [-1, 1]) poly(c, [[s * 8, -62 + bob], [s * 40, -90 + bob + f], [s * 70, -78 + bob + f * 1.4], [s * 56, -64 + bob + f * .8], [s * 48, -50 + bob + f * .6], [s * 34, -56 + bob + f * .4], [s * 22, -42 + bob]], C.pur);
  ell(c, 0, -56 + bob, 17, 22, C.purD); poly(c, [[-13, -72 + bob], [-9, -94 + bob], [-2, -74 + bob]], C.purD); poly(c, [[13, -72 + bob], [9, -94 + bob], [2, -74 + bob]], C.purD);
  ell(c, 0, -60 + bob, 10, 9, '#fff'); ell(c, 2, -60 + bob, 5.5, 6, C.crimHi); c.fillStyle = INK; c.beginPath(); c.arc(3, -60 + bob, 2.2, 0, 7); c.fill();
  poly(c, [[-7, -46 + bob], [-4, -38 + bob], [-1, -46 + bob]], C.bone); poly(c, [[1, -46 + bob], [4, -38 + bob], [7, -46 + bob]], C.bone);
}
function badSkull(c, t) {
  const bob = Math.sin(t * 8) * 3, fl = Math.sin(t * 30) * 5;
  poly(c, [[-22, -56 + bob], [-70 - fl, -46 + bob], [-34, -64 + bob]], C.crim); poly(c, [[-22, -52 + bob], [-96 - fl * 1.5, -58 + bob + fl * .4], [-30, -70 + bob]], C.fire); poly(c, [[-22, -50 + bob], [-52 - fl, -52 + bob], [-28, -60 + bob]], '#ffd34d');
  poly(c, [[-14, -78 + bob], [-24, -100 + bob - fl], [-6, -88 + bob]], C.crim);
  ell(c, 0, -62 + bob, 28, 26, C.bone); rct(c, -17, -42 + bob, 34, 15, C.bone); c.fillStyle = INK; for (const x of [-9, 0, 9]) c.fillRect(x - 1, -40 + bob, 2, 12);
  ell(c, -10, -64 + bob, 8, 9, '#0c0c12'); ell(c, 11, -64 + bob, 8, 9, '#0c0c12'); ell(c, -10, -64 + bob, 3.5, 3.5, C.crimHi); ell(c, 11, -64 + bob, 3.5, 3.5, C.crimHi);
  poly(c, [[0, -54 + bob], [-3, -48 + bob], [3, -48 + bob]], '#0c0c12');
}
function badSlime(c, t, o) {
  const s = Math.sin(t * 8), sx = 1 + .1 * s, sy = 1 - .1 * s;
  c.save(); c.scale(sx, sy);
  c.beginPath(); if (STY.blocky) c.rect(-36, -70, 72, 70); else { c.moveTo(-38, 0); c.bezierCurveTo(-44, -96, 44, -96, 38, 0); c.closePath(); }
  c.fillStyle = C.acid; c.fill(); if (STY.ow) { c.lineWidth = STY.ow; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke(); }
  c.restore();
  ell(c, -20, -42, 7, 4, '#d6ff6a'); ell(c, -10, -52, 3, 2, '#d6ff6a');
  for (const x of [-12, 12]) { ell(c, x, -30, 8, 9, '#fff'); ell(c, x + (x < 0 ? 2 : -2), -28, 3.6, 4, INK); }
  poly(c, [[-22, -46], [-4, -38], [-4, -42], [-22, -52]], C.purD); poly(c, [[22, -46], [4, -38], [4, -42], [22, -52]], C.purD);
  c.fillStyle = INK; c.fillRect(-9, -12, 18, 4);
}
function badReaper(c, t) {
  const bob = Math.sin(t * 3) * 4, j = Math.sin(t * 6) * 4;
  const hem = []; for (let i = 0; i <= 8; i++) hem.push([36 - i * 9, -6 + bob + ((i % 2) ? 10 + j : -2)]);
  poly(c, [[0, -104 + bob], [-24, -86 + bob], [-34, -50 + bob], ...hem, [34, -50 + bob], [24, -86 + bob]], '#0e0b16');
  poly(c, [[0, -96 + bob], [-16, -84 + bob], [-18, -60 + bob], [0, -50 + bob], [18, -60 + bob], [16, -84 + bob]], '#000');
  for (const s of [-1, 1]) { poly(c, [[s * 5, -76 + bob], [s * 15, -72 + bob], [s * 14, -68 + bob], [s * 5, -71 + bob]], C.neon); }
  fillp(c, [[-34, -50 + bob], [-28, -26 + bob], [-20, -20 + bob + j], [-26, -50 + bob]], C.purD);
  ell(c, 30, -44 + bob, 6, 6, C.bone); c.strokeStyle = INK; c.lineWidth = STY.ow; c.beginPath(); c.moveTo(42, -90 + bob); c.lineTo(36, -30 + bob); c.stroke(); poly(c, [[42, -92 + bob], [64, -84 + bob], [46, -78 + bob]], C.vio);
}
function badDrone(c, t, o) {
  const bob = Math.sin(t * 4) * 4, p = (o.warn ? 1 : 0) + .5 + .5 * Math.sin(t * 10), r = 6 + p * 4;
  c.strokeStyle = INK; c.lineWidth = 2.5 + STY.ow * .3; c.beginPath(); c.moveTo(0, -92 + bob); c.lineTo(0, -106 + bob); c.stroke(); ell(c, 0, -108 + bob, 3.5, 3.5, C.crimHi);
  poly(c, [[-14, -86 + bob], [14, -86 + bob], [34, -70 + bob], [34, -44 + bob], [14, -28 + bob], [-14, -28 + bob], [-34, -44 + bob], [-34, -70 + bob]], C.metal);
  poly(c, [[-14, -86 + bob], [14, -86 + bob], [24, -76 + bob], [-24, -76 + bob]], '#7b8498'); rct(c, -34, -58 + bob, 68, 6, C.metalD);
  for (const s of [-1, 1]) { rct(c, s * 40 - 6, -64 + bob + Math.sin(t * 40) * 1.5, 12, 4, C.metalD); poly(c, [[s * 12, -28 + bob], [s * 20, -28 + bob], [s * 16, -16 + bob + Math.sin(t * 30) * 3]], C.fire); }
  ell(c, 0, -57 + bob, 16, 16, C.metalD); ell(c, 0, -57 + bob, r, r, C.crimHi); ell(c, -1.5, -59 + bob, r * .3, r * .3, '#fff');
}
function badGoblin(c, t) {
  const w = Math.sin(t * 13) * 6, b = Math.abs(Math.sin(t * 13)) * 2;
  rct(c, -14 + w * .5, -18, 11, 18, C.brown); rct(c, 3 - w * .5, -18, 11, 18, C.brown);
  ell(c, 0, -34 - b, 24, 20, C.brownL); rct(c, -22, -40 - b, 44, 7, C.purD);
  ell(c, -22, -34 - b, 11, 12, C.pur); ell(c, -22, -40 - b, 3, 3, '#ffd34d');
  rct(c, 16, -42 - b + w * .4, 22, 9, C.brown);
  poly(c, [[-12, -64 - b], [-46, -80 - b], [-16, -52 - b]], C.brownL); poly(c, [[12, -64 - b], [46, -80 - b], [16, -52 - b]], C.brownL);
  ell(c, 0, -62 - b, 21, 18, C.brownL); poly(c, [[-14, -68 - b], [-3, -64 - b], [-14, -62 - b]], C.purD); poly(c, [[14, -68 - b], [3, -64 - b], [14, -62 - b]], C.purD);
  ell(c, -8, -62 - b, 4.5, 4.5, '#ffe34d'); ell(c, 8, -62 - b, 4.5, 4.5, '#ffe34d'); c.fillStyle = INK; c.fillRect(-9, -64 - b, 2, 5); c.fillRect(7, -64 - b, 2, 5);
  poly(c, [[-9, -52 - b], [9, -52 - b], [0, -46 - b]], INK); fillp(c, [[-6, -52 - b], [-3, -49 - b], [0, -52 - b]], C.bone); fillp(c, [[0, -52 - b], [3, -49 - b], [6, -52 - b]], C.bone);
}
function badBomb(c, t, o) {
  const s = 1 + (o.warn ? .05 * Math.sin(t * 30) : 0), fl = Math.sin(t * 25) * 3;
  rct(c, -14, -10, 12, 10, C.purD); rct(c, 2, -10, 12, 10, C.purD);
  c.save(); c.scale(s, s); ell(c, 0, -40, 30, 30, o.warn ? '#3a0a14' : '#17131f'); c.restore();
  ell(c, -12, -54, 7, 5, '#5a5470'); rct(c, -7, -76, 14, 9, C.metalD);
  c.strokeStyle = INK; c.lineWidth = 3 + STY.ow * .4; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -76); c.quadraticCurveTo(10, -88, 4, -96); c.stroke();
  poly(c, [[4 - 6, -96], [4 + fl, -112 - Math.abs(fl)], [4 + 7, -96]], C.fire); poly(c, [[4 - 3, -97], [4, -106 - Math.abs(fl)], [4 + 3, -97]], '#ffe34d');
  for (const x of [-11, 11]) { ell(c, x, -42, 7, 7, '#fff'); ell(c, x, -41, 3, 3.5, C.crimHi); }
  poly(c, [[-20, -56], [-4, -48], [-4, -52], [-20, -62]], INK); poly(c, [[20, -56], [4, -48], [4, -52], [20, -62]], INK);
  if (o.count) { c.fillStyle = C.crimHi; c.strokeStyle = INK; c.lineWidth = 3; c.font = 'bold 26px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; const tx = 0, ty = -22; c.scale(Math.abs(o.dir || 1), 1); if ((o.dir || 1) < 0) c.scale(-1, 1); c.strokeText(String(o.count), tx, ty); c.fillText(String(o.count), tx, ty); }
}
function badCyclops(c, t) {
  const w = Math.sin(t * 4) * 3, b = Math.abs(Math.sin(t * 4)) * 2;
  rct(c, -26 + w * .4, -30, 22, 30, C.purD); rct(c, 4 - w * .4, -30, 22, 30, C.purD);
  rct(c, -34, -80 - b, 68, 56, C.pur); rct(c, -34, -42 - b, 68, 9, C.purD); rct(c, -8, -44 - b, 16, 13, C.crim);
  rct(c, -48, -76 - b + w, 18, 40, C.crim); ell(c, -39, -34 - b + w, 11, 10, C.crimHi);
  rct(c, 30, -76 - b - w, 18, 40, C.crim); ell(c, 39, -34 - b - w, 11, 10, C.crimHi);
  rct(c, -24, -108 - b, 48, 32, C.pur); poly(c, [[-22, -106 - b], [-30, -122 - b], [-12, -108 - b]], C.bone); poly(c, [[22, -106 - b], [30, -122 - b], [12, -108 - b]], C.bone);
  ell(c, 0, -92 - b, 14, 14, '#fff'); ell(c, 3, -92 - b, 8, 8, C.crimHi); ell(c, 4, -92 - b, 4, 4, INK);
  poly(c, [[-18, -104 - b], [18, -98 - b], [18, -102 - b], [-18, -110 - b]], INK); c.fillStyle = INK; c.fillRect(-11, -80 - b, 22, 4);
}
function badBoss(c, t, o) {
  const b = Math.abs(Math.sin(t * 3)) * 2, p = .5 + .5 * Math.sin(t * 9) + (o.warn ? 1 : 0);
  rct(c, -30, -34, 24, 34, C.purD); rct(c, 6, -34, 24, 34, C.purD);
  rct(c, -36, -86 - b, 72, 58, '#2a1740'); rct(c, -36, -48 - b, 72, 8, C.purD);
  c.strokeStyle = C.neon; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-26, -80 - b); c.lineTo(-18, -62 - b); c.lineTo(-26, -50 - b); c.moveTo(24, -78 - b); c.lineTo(18, -60 - b); c.lineTo(26, -52 - b); c.stroke();
  ell(c, 0, -62 - b, 9 + p * 2, 9 + p * 2, C.crimHi); ell(c, 0, -62 - b, 4, 4, '#fff');
  for (const s of [-1, 1]) {
    rct(c, s * 44 - 9, -72 - b, 18, 46, C.pur); ell(c, s * 44, -34 - b, 13, 12, C.crim);
    ell(c, s * 40, -88 - b, 22, 15, C.purD);
    poly(c, [[s * 26, -96 - b], [s * 30, -122 - b], [s * 38, -98 - b]], C.bone); poly(c, [[s * 38, -98 - b], [s * 48, -124 - b], [s * 52, -96 - b]], C.bone); poly(c, [[s * 52, -92 - b], [s * 66, -112 - b], [s * 62, -84 - b]], C.bone);
  }
  rct(c, -20, -118 - b, 40, 30, '#3b0764'); rct(c, -24, -122 - b, 48, 7, C.purD);
  for (const s of [-1, 1]) { ell(c, s * 9, -103 - b, 7 + p, 7 + p, C.crimHi); ell(c, s * 9, -103 - b, 3, 3, '#fff'); }
  c.fillStyle = INK; c.fillRect(-9, -92 - b, 18, 4);
}

// ---- registry ----
// radius: collider radius in game px (24 small, 48 brute/boss). speed px/s used by updateEnemy. hp = default.
export const ENEMY_TYPES = [
  { id: 'bad_zombie', name: 'Zombie', behavior: 'chase', radius: 24, speed: 55, hp: 3, threat: 'Slow, never stops. Reaches for you; dangerous in crowds.', draw: badZombie },
  { id: 'bad_bat', name: 'Bat', behavior: 'sine-flier', radius: 24, speed: 110, hp: 1, threat: 'Fast and weaving, hard to line up a shot.', draw: badBat },
  { id: 'bad_skull', name: 'Fire Skull', behavior: 'flash-dash', radius: 24, speed: 60, hp: 2, threat: 'Flashes red, then dashes in a straight line. Sidestep it.', draw: badSkull },
  { id: 'bad_slime', name: 'Acid Slime', behavior: 'hop-split', radius: 24, speed: 120, hp: 3, threat: 'Hops at you; splits into two small blobs when it dies.', draw: badSlime },
  { id: 'bad_reaper', name: 'Reaper', behavior: 'phase-chase', radius: 24, speed: 70, hp: 3, threat: 'Floats through walls. You cannot hide behind cover.', draw: badReaper },
  { id: 'bad_drone', name: 'Laser Drone', behavior: 'hover-shoot', radius: 24, speed: 80, hp: 2, threat: 'Keeps its distance and fires a laser bolt on a pulse.', draw: badDrone },
  { id: 'bad_goblin', name: 'Goblin', behavior: 'thief', radius: 24, speed: 90, hp: 2, threat: '1.5x speed. Steals coins on touch, then runs.', draw: badGoblin },
  { id: 'bad_bomb', name: 'Bomb', behavior: 'fuse-blast', radius: 24, speed: 50, hp: 1, threat: 'Counts 3-2-1 near you, then blasts a wide radius.', draw: badBomb },
  { id: 'bad_cyclops', name: 'Cyclops', behavior: 'brute-knockback', radius: 48, speed: 35, hp: 12, threat: 'Heavy and slow. Big hits knock you back.', draw: badCyclops },
  { id: 'bad_boss', name: 'Corrupted Golem', behavior: 'ground-pound', radius: 48, speed: 30, hp: 40, threat: 'Telegraphs a ground-pound; the shockwave covers a huge ring.', draw: badBoss },
];
export const ENEMY = Object.fromEntries(ENEMY_TYPES.map(t => [t.id, t]));
export const ENEMY_IDS = ENEMY_TYPES.map(t => t.id);

// Which sprite replaces a classic foe when the spec says enemies:'viral'. tier 0 small, 1 big, 2 boss.
const FOE_MAP = { zombie: ['bad_zombie', 'bad_cyclops', 'bad_boss'], ghost: ['bad_reaper', 'bad_reaper', 'bad_boss'], phantom: ['bad_reaper', 'bad_reaper', 'bad_boss'], reaper: ['bad_reaper', 'bad_reaper', 'bad_boss'], slime: ['bad_slime', 'bad_slime', 'bad_boss'], robot: ['bad_drone', 'bad_cyclops', 'bad_boss'], bat: ['bad_bat', 'bad_bat', 'bad_boss'] };
export const foeId = (foe, tier = 0) => (FOE_MAP[foe] || FOE_MAP.zombie)[Math.min(2, Math.max(0, tier | 0))];

// ---- drawing ----
let _oc = null;
function offscreen(w, h) {
  if (!_oc || _oc.width !== w || _oc.height !== h) {
    if (typeof OffscreenCanvas !== 'undefined') _oc = new OffscreenCanvas(w, h);
    else if (typeof document !== 'undefined') { _oc = document.createElement('canvas'); _oc.width = w; _oc.height = h; } else return null;
  }
  return _oc;
}
function warnGround(c, x, y, h, o) {
  const k = h / 100, a = typeof o.warn === 'number' ? Math.min(1, Math.max(0, o.warn)) : 1, big = ENEMY[o._id]?.radius > 30, r = (o.warnR || (big ? 70 : 42)) * k, p = .5 + .5 * Math.sin((o.t || 0) * 18);
  c.save(); c.translate(x, y); c.globalAlpha = (.18 + .22 * p) * (c.globalAlpha || 1); c.beginPath(); c.ellipse(0, 0, r, r * .42, 0, 0, 7); c.fillStyle = C.crimHi; c.fill();
  c.globalAlpha = .9 * (0.5 + 0.5 * a); c.lineWidth = Math.max(2, 3 * k); c.strokeStyle = C.crim; c.stroke(); c.restore();
}
function warnMark(c, x, y, h, o) {
  const k = h / 100, top = ENEMY[o._id]?.radius > 30 ? 138 : 118; c.save(); c.translate(x, y - top * k - Math.abs(Math.sin((o.t || 0) * 12)) * 4 * k);
  c.fillStyle = C.crimHi; c.strokeStyle = INK; c.lineWidth = Math.max(2, 3 * k); c.beginPath(); c.moveTo(-8 * k, -22 * k); c.lineTo(8 * k, -22 * k); c.lineTo(5 * k, -6 * k); c.lineTo(-5 * k, -6 * k); c.closePath(); c.stroke(); c.fill();
  c.beginPath(); c.arc(0, 0, 3.4 * k, 0, 7); c.stroke(); c.fill(); c.restore();
}
export function drawEnemy(id, c, x, y, size = 96, o = {}) {
  const T = ENEMY[id] || ENEMY.bad_zombie, oo = { ...o, _id: T.id };
  if (oo.warn) warnGround(c, x, y, size, oo);
  if (oo.flash) {
    const k = size / 100, W = Math.ceil(260 * k), H = Math.ceil(240 * k), oc = offscreen(W, H);
    if (oc) {
      const g = oc.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
      wrap(g, 130 * k, 170 * k, size, oo, T.draw);
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
      c.drawImage(oc, x - 130 * k, y - 170 * k);
    } else wrap(c, x, y, size, oo, T.draw);
  } else wrap(c, x, y, size, oo, T.draw);
  if (oo.warn) warnMark(c, x, y, size, oo);
}
export const ENEMY_SPRITES = Object.fromEntries(ENEMY_TYPES.map(t => [t.id, (c, x, y, h, o) => drawEnemy(t.id, c, x, y, h, o)]));

// enemySheet: metadata for contact sheets / docs, plus a drawer. Frames: normal, flash, warn.
export const ENEMY_SHEET = ENEMY_TYPES.map(({ id, name, behavior, radius, threat }) => ({ id, name, behavior, radius, threat, frames: ['normal', 'flash', 'warn'] }));
export function enemySheet(c, { x = 0, y = 0, size = 110, pad = 24, t = 0.4 } = {}) {
  const cw = size * 1.9 + pad;
  ENEMY_TYPES.forEach((T, r) => ['normal', 'flash', 'warn'].forEach((f, i) => drawEnemy(T.id, c, x + pad + size + i * cw, y + pad + size * 1.5 + r * (size * 1.9 + pad), size, { t, dir: 1, flash: f === 'flash', warn: f === 'warn' })));
  return { cols: 3, rows: ENEMY_TYPES.length, cell: cw, rowH: size * 1.9 + pad };
}

// ---- behaviour (pure + deterministic: same e/hero/dt/rng sequence => same result) ----
export function makeEnemy(id, x, y, extra = {}) { const T = ENEMY[id]; if (!T) throw new Error('unknown enemy ' + id); return { id, x, y, hp: T.hp, max: T.hp, t: 0, cd: 0, state: 'move', st: 0, dir: 1, flash: 0, warn: 0, count: 0, small: false, ...extra }; }
export function hitFlash(e, frames = 1) { e.flash = frames; return e; }
export function spawnSplit(e, rng) {
  if (e.id !== 'bad_slime' || e.small) return [];
  const out = []; for (const s of [-1, 1]) out.push(makeEnemy('bad_slime', e.x + s * 14, e.y, { hp: 1, max: 1, small: true, size: .6, vx: s * (60 + rng() * 40), vy: -(30 + rng() * 30), cd: rng() * .5, state: 'move' }));
  return out;
}
const len = (x, y) => Math.hypot(x, y) || 1e-9;
function toward(e, hero, sp, dt) { const dx = hero.x - e.x, dy = hero.y - e.y, d = len(dx, dy); e.x += dx / d * sp * dt; e.y += dy / d * sp * dt; if (Math.abs(dx) > 1) e.dir = dx > 0 ? 1 : -1; return d; }
// returns an array of events: {kind:'shoot'|'blast'|'steal'|'shockwave'|'knockback'|'split'|'dead', ...}
export function updateEnemy(e, hero, dt = 1 / 60, rng = () => .5) {
  const T = ENEMY[e.id]; const ev = []; if (!T || e.hp <= 0) { if (T && e.hp <= 0 && !e.dead) { e.dead = true; if (e.id === 'bad_slime' && !e.small) ev.push({ kind: 'split', spawn: spawnSplit(e, rng) }); ev.push({ kind: 'dead' }); } return ev; }
  e.t += dt; if (e.flash > 0) e.flash = Math.max(0, e.flash - 1); const hr = hero.r || 20, dx = hero.x - e.x, dy = hero.y - e.y, d = len(dx, dy), reach = T.radius + hr, sp = T.speed;
  switch (e.id) {
    case 'bad_zombie': case 'bad_reaper': { toward(e, hero, e.id === 'bad_reaper' ? sp : sp, dt); if (e.id === 'bad_reaper') { e.phase = true; e.y += Math.sin(e.t * 3) * 14 * dt; } break; }
    case 'bad_bat': { e.base ??= e.y; const bx = hero.x - e.x; e.x += Math.sign(bx) * Math.min(Math.abs(bx), sp * dt); e.base += Math.sign(hero.y - e.base) * Math.min(Math.abs(hero.y - e.base), sp * .4 * dt); e.y = e.base + Math.sin(e.t * 4) * 40; if (Math.abs(bx) > 1) e.dir = bx > 0 ? 1 : -1; break; }
    case 'bad_skull': {
      if (e.state === 'move') { toward(e, hero, sp, dt); e.cd -= dt; if (e.cd <= 0 && d < 320) { e.state = 'tell'; e.st = .5; e.warn = 1; e.dx = dx / d; e.dy = dy / d; } }
      else if (e.state === 'tell') { e.st -= dt; e.flash = Math.floor(e.t * 20) % 2 ? 1 : 0; if (e.st <= 0) { e.state = 'dash'; e.st = .4; e.warn = 0; } }
      else { e.x += e.dx * 420 * dt; e.y += e.dy * 420 * dt; e.st -= dt; if (e.st <= 0) { e.state = 'move'; e.cd = 1.5 + rng(); } }
      break; }
    case 'bad_slime': {
      e.vx ??= 0; e.vy ??= 0; const k = e.small ? .7 : 1;
      if (e.state === 'move') { e.cd -= dt; if (e.cd <= 0) { e.state = 'hop'; e.st = .35; e.vx = dx / d * sp * k; e.vy = dy / d * sp * k; if (Math.abs(dx) > 1) e.dir = dx > 0 ? 1 : -1; } else { e.vx *= .85; e.vy *= .85; } }
      else { e.st -= dt; if (e.st <= 0) { e.state = 'move'; e.cd = .5 + rng() * .4; } }
      e.x += e.vx * dt; e.y += e.vy * dt; if (e.state === 'move') { e.vx *= .8; e.vy *= .8; }
      break; }
    case 'bad_drone': {
      const want = 220, dd = d - want; if (Math.abs(dd) > 10) { e.x += dx / d * Math.sign(dd) * sp * dt; e.y += dy / d * Math.sign(dd) * sp * dt; } else { e.x += -dy / d * sp * .5 * dt; e.y += dx / d * sp * .5 * dt; }
      if (Math.abs(dx) > 1) e.dir = dx > 0 ? 1 : -1; e.cd -= dt; e.warn = e.cd < .4 && e.cd > 0 ? 1 : 0;
      if (e.cd <= 0) { e.cd = 2 + rng() * .5; e.warn = 0; ev.push({ kind: 'shoot', x: e.x, y: e.y, vx: dx / d * 260, vy: dy / d * 260, dmg: 1 }); }
      break; }
    case 'bad_goblin': {
      if (e.state === 'flee') { e.x -= dx / d * sp * 1.2 * dt; e.y -= dy / d * sp * 1.2 * dt; e.dir = -dx > 0 ? 1 : -1; e.st -= dt; if (e.st <= 0) e.state = 'move'; }
      else { toward(e, hero, sp, dt); if (d < reach) { ev.push({ kind: 'steal', amount: 1 }); e.loot = (e.loot || 0) + 1; e.state = 'flee'; e.st = 2.5; } }
      break; }
    case 'bad_bomb': {
      if (e.state === 'move') { toward(e, hero, sp, dt); if (d < 90) { e.state = 'fuse'; e.st = 3; } }
      else { e.st -= dt; e.count = Math.max(1, Math.ceil(e.st)); e.warn = 1; if (e.st <= 0) { ev.push({ kind: 'blast', x: e.x, y: e.y, r: 120, dmg: 2 }); e.hp = 0; e.dead = true; e.count = 0; e.warn = 0; ev.push({ kind: 'dead' }); } }
      break; }
    case 'bad_cyclops': {
      toward(e, hero, sp, dt); e.cd -= dt;
      if (d < reach && e.cd <= 0) { e.cd = 1.2 + rng() * .2; ev.push({ kind: 'knockback', dx: dx / d, dy: dy / d, force: 260, dmg: 1 }); }
      break; }
    case 'bad_boss': {
      if (e.state === 'move') { toward(e, hero, sp, dt); e.cd -= dt; if (e.cd <= 0) { e.state = 'pound'; e.st = .8; } }
      else { e.st -= dt; e.warn = 1 - Math.max(0, e.st) / .8; if (e.st <= 0) { e.state = 'move'; e.cd = 3.5 + rng(); e.warn = 0; ev.push({ kind: 'shockwave', x: e.x, y: e.y, r: 260, dmg: 2 }); } }
      break; }
  }
  return ev;
}
