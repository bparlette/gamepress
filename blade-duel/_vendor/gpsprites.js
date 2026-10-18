// gpsprites: procedural characters (cat, dog, zombie, person) + small icons. Side view, feet at (x,y), `h` = pixel height, facing o.dir (1 right, -1 left).
// Styles are set once by createGame: STY.ow = outline width, STY.blocky = rectangles instead of ellipses (roblox / pixel styles).
export const STY = { ow: 3, blocky: false };
const INK = '#151515';
const ell = (c, x, y, rx, ry, fill) => { c.beginPath(); if (STY.blocky) c.rect(x - rx, y - ry, rx * 2, ry * 2); else c.ellipse(x, y, rx, ry, 0, 0, 7); c.fillStyle = fill; c.fill(); if (STY.ow) { c.lineWidth = STY.ow; c.strokeStyle = INK; c.stroke(); } };
const poly = (c, pts, fill) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = fill; c.fill(); if (STY.ow) { c.lineWidth = STY.ow; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke(); } };
const rct = (c, x, y, w, h, fill) => { c.beginPath(); if (STY.blocky) c.rect(x, y, w, h); else c.roundRect(x, y, w, h, Math.min(w, h) / 3); c.fillStyle = fill; c.fill(); if (STY.ow) { c.lineWidth = STY.ow; c.strokeStyle = INK; c.stroke(); } };
const eyes = (c, x, y, o, hurt) => { if (hurt) { c.strokeStyle = INK; c.lineWidth = 2.5; for (const dx of [-6, 6]) { c.beginPath(); c.moveTo(x + dx - 3, y - 3); c.lineTo(x + dx + 3, y + 3); c.moveTo(x + dx + 3, y - 3); c.lineTo(x + dx - 3, y + 3); c.stroke(); } } else for (const dx of [-6, 6]) { ell(c, x + dx, y, 3.4, 4.4, '#fff'); c.fillStyle = INK; c.beginPath(); c.arc(x + dx + 1, y, 1.8, 0, 7); c.fill(); } };
function wrap(c, x, y, h, o, fn) { c.save(); c.translate(x, y); c.scale((o.dir || 1) * h / 100, h / 100); const ow = STY.ow; STY.ow = ow * 100 / h; fn(c, o.t || 0, o); STY.ow = ow; c.restore(); }
const swing = (o, i, a = 7) => (o.anim === 'walk' ? Math.sin((o.t || 0) * 14 + i * 1.7) * a : 0);

export function cat(c, x, y, h, o = {}) { const col = o.color || '#ff9a3c'; wrap(c, x, y, h, o, (c, t) => {
  c.lineCap = 'round'; c.beginPath(); c.moveTo(-26, -40); c.quadraticCurveTo(-54, -52, -44, -88 + Math.sin(t * 5) * 5); c.strokeStyle = INK; c.lineWidth = 9 + STY.ow * 2; c.stroke(); c.strokeStyle = col; c.lineWidth = 9; c.stroke();
  for (const [i, lx] of [-22, -10, 12, 24].entries()) rct(c, lx - 4 + swing(o, i) * .5, -22, 9, 22, col);
  ell(c, 0, -40, 32, 21, col); ell(c, 28, -62, 19, 17, col);
  poly(c, [[16, -74], [20, -94], [30, -76]], col); poly(c, [[28, -76], [40, -94], [44, -72]], col); poly(c, [[19, -76], [21, -88], [26, -77]], '#ff9fb0');
  eyes(c, 31, -64, o, o.hurt); ell(c, 44, -58, 3, 2.4, '#ff9fb0'); c.strokeStyle = INK; c.lineWidth = 1.5; for (const dy of [-3, 2]) { c.beginPath(); c.moveTo(42, -57 + dy); c.lineTo(58, -60 + dy * 2); c.stroke(); } }); }
export function dog(c, x, y, h, o = {}) { const col = o.color || '#c98a4b'; wrap(c, x, y, h, o, (c, t) => {
  c.lineCap = 'round'; c.beginPath(); c.moveTo(-28, -46); c.quadraticCurveTo(-44, -58 + Math.sin(t * 12) * 6, -40, -74); c.strokeStyle = INK; c.lineWidth = 9 + STY.ow * 2; c.stroke(); c.strokeStyle = col; c.lineWidth = 9; c.stroke();
  for (const [i, lx] of [-22, -10, 14, 26].entries()) rct(c, lx - 4 + swing(o, i) * .5, -24, 9, 24, col);
  ell(c, 0, -42, 34, 20, col); ell(c, 30, -64, 17, 16, col); ell(c, 46, -58, 13, 9, '#f3e6d0'); ell(c, 54, -62, 3.5, 3, INK);
  rct(c, 14, -76, 10, 22, '#6b4a2e'); eyes(c, 33, -68, o, o.hurt); }); }
export function zombie(c, x, y, h, o = {}) { const skin = o.color || '#8fcf7a'; wrap(c, x, y, h, o, (c, t) => {
  const b = o.anim === 'walk' ? Math.abs(Math.sin(t * 9)) * 3 : 0;
  rct(c, -11 + swing(o, 0, 9), -34, 11, 36, '#3d3d52'); rct(c, 2 - swing(o, 0, 9), -34, 11, 36, '#3d3d52');
  rct(c, -16, -72 - b, 32, 40, o.shirt || '#5b7a99'); rct(c, -16, -40 - b, 32, 7, '#2c2c3c');
  rct(c, 8, -64 - b + swing(o, 1, 3), 34, 9, skin); rct(c, 4, -54 - b - swing(o, 1, 3), 30, 9, skin);
  ell(c, 2, -86 - b, 15, 15, skin); c.fillStyle = '#e22'; c.fillRect(6, -90 - b, 5, 5); c.fillRect(-4, -90 - b, 5, 5); c.fillStyle = INK; c.fillRect(0, -80 - b, 11, 3); if (o.hurt) { c.strokeStyle = '#e22'; c.lineWidth = 2; c.strokeRect(-17, -73, 34, 41); } }); }
export function person(c, x, y, h, o = {}) { wrap(c, x, y, h, o, (c, t) => {
  const b = o.anim === 'walk' ? Math.abs(Math.sin(t * 9)) * 3 : 0;
  rct(c, -11 + swing(o, 0, 9), -34, 11, 36, '#2c3e66'); rct(c, 2 - swing(o, 0, 9), -34, 11, 36, '#2c3e66');
  rct(c, -15, -72 - b, 30, 40, o.color || '#e63946'); rct(c, -21, -68 - b + swing(o, 1, 4), 9, 30, '#f1c27d'); rct(c, 12, -68 - b - swing(o, 1, 4), 9, 30, '#f1c27d');
  ell(c, 0, -86 - b, 14, 14, '#f1c27d'); ell(c, 0, -94 - b, 15, 8, '#3a2a1a'); eyes(c, 5, -86 - b, o, o.hurt); }); }
export const CHAR = { cat, dog, zombie, person };
export const drawChar = (kind, c, x, y, h, o) => (CHAR[kind] || cat)(c, x, y, h, o);
/** Cat/dog/zombie head only (for icons, HUD lives, card art): centered at (x,y), radius r. */
export function face(c, kind, x, y, r, color) { c.save(); c.translate(x, y); const k = r / 20; c.scale(k, k); const ow = STY.ow; STY.ow = ow / k;
  const col = color || { cat: '#ff9a3c', dog: '#c98a4b', zombie: '#8fcf7a', person: '#f1c27d' }[kind] || '#ff9a3c';
  if (kind === 'cat' || kind === 'dog') { poly(c, [[-18, -8], [-14, -26], [-4, -14]], col); poly(c, [[18, -8], [14, -26], [4, -14]], col); }
  ell(c, 0, 0, 20, 17, col); eyes(c, 0, -3, {}, false); ell(c, 0, 6, 4, 3, kind === 'zombie' ? INK : '#ff9fb0'); STY.ow = ow; c.restore(); }
export function heart(c, x, y, s, fill = '#ff4d6d') { c.save(); c.translate(x, y); c.scale(s / 20, s / 20); c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(-18, -4, -10, -18, 0, -8); c.bezierCurveTo(10, -18, 18, -4, 0, 8); c.fillStyle = fill; c.fill(); c.lineWidth = STY.ow; c.strokeStyle = INK; if (STY.ow) c.stroke(); c.restore(); }
export function star(c, x, y, r, fill = '#ffd34d') { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fillStyle = fill; c.fill(); if (STY.ow) { c.lineWidth = STY.ow; c.strokeStyle = INK; c.stroke(); } }
export function coin(c, x, y, r, t = 0) { const w = Math.abs(Math.cos(t * 4)) * r + r * .25; ell(c, x, y, w, r, '#ffd34d'); ell(c, x, y, w * .6, r * .6, '#ffe89a'); }
/** Little spaceship with a cat/dog/zombie pilot. */
export function ship(c, x, y, s, o = {}) { c.save(); c.translate(x, y); c.scale(s / 50, s / 50); const col = o.color || '#4aa8ff'; poly(c, [[-26, 12], [-12, -4], [12, -4], [26, 12], [10, 22], [-10, 22]], col); ell(c, 0, -6, 11, 11, '#bfeaff'); face(c, o.pilot || 'cat', 0, -7, 8, o.pilotColor);
  poly(c, [[-26, 12], [-38, 28], [-14, 18]], '#e63946'); poly(c, [[26, 12], [38, 28], [14, 18]], '#e63946'); if (o.flame !== false) poly(c, [[-6, 22], [0, 38 + Math.sin((o.t || 0) * 40) * 5], [6, 22]], '#ffd34d'); c.restore(); }
