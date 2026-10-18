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
export function car(c, x, y, h, o = {}) { const col = o.color || '#e63946', b = o.anim === 'walk' ? Math.abs(Math.sin((o.t || 0) * 18)) * 2 : 0; wrap(c, x, y, h, o, (c) => {
  poly(c, [[-46, -22 - b], [-40, -44 - b], [-22, -66 - b], [14, -66 - b], [32, -44 - b], [50, -40 - b], [52, -22 - b]], col);
  poly(c, [[-18, -60 - b], [-30, -44 - b], [-4, -44 - b], [-4, -60 - b]], '#bfe9ff'); poly(c, [[2, -60 - b], [2, -44 - b], [26, -44 - b], [12, -60 - b]], '#bfe9ff');
  ell(c, 51, -32 - b, 4, 5, '#ffe66d'); ell(c, -50, -32 - b, 3, 5, '#ff5b5b');
  for (const wx of [-26, 28]) { ell(c, wx, -12, 13, 13, '#2a2a2a'); ell(c, wx, -12, 6, 6, '#c9ced6'); }
  if (o.hurt) { c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(-6, -40); c.lineTo(8, -28); c.moveTo(8, -40); c.lineTo(-6, -28); c.stroke(); } }); }

// ---- viral hero set (generic animals + robot): duck, penguin, capybara, axolotl, dino, bunny, frog, robot ----
const hop = (o, a = 3) => (o.anim === 'walk' ? Math.abs(Math.sin((o.t || 0) * 9)) * a : 0);
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join(''); };
const X = (c, x, y) => { c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - 3, y - 3); c.lineTo(x + 3, y + 3); c.moveTo(x + 3, y - 3); c.lineTo(x - 3, y + 3); c.stroke(); };
const eye1 = (c, x, y, o, r = 4) => { if (o.hurt) return X(c, x, y); ell(c, x, y, r * .85, r, '#fff'); c.fillStyle = INK; c.beginPath(); c.arc(x + 1, y, r * .5, 0, 7); c.fill(); };
export function duck(c, x, y, h, o = {}) { const col = o.color || '#ffd23c'; wrap(c, x, y, h, o, (c) => {
  const b = hop(o);
  for (const [i, lx] of [-6, 8].entries()) rct(c, lx - 3 + swing(o, i, 6), -16, 6, 16, '#ff9a2e');
  for (const [i, lx] of [-6, 8].entries()) rct(c, lx - 7 + swing(o, i, 6), -4, 15, 5, '#ff9a2e');
  poly(c, [[-26, -40 - b], [-46, -58 - b], [-34, -26 - b]], col);
  ell(c, 0, -38 - b, 30, 22, col); ell(c, -4, -36 - b, 15, 10, shade(col, .88));
  ell(c, 20, -66 - b, 17, 16, col); ell(c, 38, -61 - b, 13, 6, '#ff9a2e'); eye1(c, 24, -70 - b, o); }); }
export function penguin(c, x, y, h, o = {}) { const col = o.color || '#2f3b52'; wrap(c, x, y, h, o, (c) => {
  const b = hop(o), w = swing(o, 0, 5);
  rct(c, -16 + w, -8, 16, 8, '#ff9a2e'); rct(c, 2 - w, -8, 16, 8, '#ff9a2e');
  ell(c, 0, -46 - b, 25, 38, col); ell(c, 5, -42 - b, 16, 28, '#fff');
  poly(c, [[-22, -56 - b], [-36, -38 - b + w], [-20, -34 - b]], col);
  ell(c, 8, -74 - b, 15, 11, col); ell(c, 12, -72 - b, 9, 8, '#fff'); poly(c, [[16, -75 - b], [30, -71 - b], [16, -67 - b]], '#ff9a2e'); eye1(c, 10, -78 - b, o, 3.2); }); }
export function capybara(c, x, y, h, o = {}) { const col = o.color || '#b9824f'; wrap(c, x, y, h, o, (c) => {
  const b = hop(o, 2);
  for (const [i, lx] of [-24, -12, 16, 28].entries()) rct(c, lx - 4 + swing(o, i, 5) * .5, -18, 9, 18, shade(col, .85));
  ell(c, 0, -36 - b, 38, 22, col); ell(c, 30, -44 - b, 17, 15, col); rct(c, 36, -50 - b, 20, 20, col); ell(c, 54, -46 - b, 4, 3.5, INK);
  ell(c, 22, -58 - b, 4.5, 4, shade(col, .8)); eye1(c, 38, -52 - b, o, 3.2);
  if (!o.hurt) { c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(42, -38 - b); c.lineTo(52, -38 - b); c.stroke(); } }); }
export function axolotl(c, x, y, h, o = {}) { const col = o.color || '#ffb3c7'; wrap(c, x, y, h, o, (c, t) => {
  const b = hop(o, 2), fr = '#ff5f87';
  c.lineCap = 'round'; c.beginPath(); c.moveTo(-26, -26); c.quadraticCurveTo(-56, -22, -58 + Math.sin(t * 6) * 4, -44 + Math.sin(t * 6) * 5); c.strokeStyle = INK; c.lineWidth = 12 + STY.ow * 2; c.stroke(); c.strokeStyle = col; c.lineWidth = 12; c.stroke();
  for (const [i, lx] of [-18, -4, 16, 28].entries()) rct(c, lx - 4 + swing(o, i, 5) * .5, -12, 9, 12, col);
  ell(c, 0, -26 - b, 34, 17, col);
  for (const [tx, ty, by] of [[10, -80, -54], [-2, -64, -48], [-2, -48, -40]]) poly(c, [[34, by - 10 - b], [tx, ty - b], [tx - 6, ty + 12 - b], [32, by + 8 - b]], fr);
  ell(c, 34, -42 - b, 18, 15, col); eye1(c, 38, -47 - b, o, 3.4);
  if (o.hurt) X(c, 44, -47 - b); c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.arc(44, -40 - b, 6, .2, 2.9); c.stroke(); ell(c, 32, -39 - b, 3.4, 2.2, fr); }); }
export function dino(c, x, y, h, o = {}) { const col = o.color || '#5fc46a'; wrap(c, x, y, h, o, (c, t) => {
  const b = hop(o, 2), w = swing(o, 0, 7);
  poly(c, [[-18, -50 - b], [-58, -26 + Math.sin(t * 5) * 3], [-20, -30 - b]], col);
  rct(c, -16 + w, -26, 14, 26, shade(col, .85)); rct(c, 4 - w, -26, 14, 26, shade(col, .85)); rct(c, -20 + w, -6, 22, 7, shade(col, .85)); rct(c, 2 - w, -6, 22, 7, shade(col, .85));
  ell(c, 0, -48 - b, 24, 26, col); ell(c, 6, -40 - b, 14, 17, '#d9f5c4');
  rct(c, 18, -52 - b + swing(o, 1, 2), 12, 5, col);
  rct(c, 2, -92 - b, 44, 32, col); ell(c, 14, -78 - b, 0.1, 0.1, col);
  c.fillStyle = '#fff'; for (const tx of [20, 29, 38]) { c.beginPath(); c.moveTo(tx, -63 - b); c.lineTo(tx + 3.5, -63 - b); c.lineTo(tx + 1.7, -57 - b); c.closePath(); c.fill(); }
  c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(14, -64 - b); c.lineTo(46, -64 - b); c.stroke();
  eye1(c, 28, -82 - b, o, 3.6); for (const sx of [-14, -4, 6]) poly(c, [[sx - 5, -73 - b], [sx, -83 - b + sx * .2], [sx + 5, -73 - b]], shade(col, .75)); }); }
export function bunny(c, x, y, h, o = {}) { const col = o.color || '#f2f2f7'; wrap(c, x, y, h, o, (c) => {
  const b = hop(o, 5);
  ell(c, -32, -34 - b, 11, 11, '#fff'); for (const [i, lx] of [-20, 16].entries()) rct(c, lx - 5 + swing(o, i, 4) * .5, -14, 12, 14, col);
  ell(c, 0, -36 - b, 30, 21, col); ell(c, 24, -62 - b, 18, 16, col);
  ell(c, 12, -92 - b, 6, 20, col); ell(c, 12, -92 - b, 2.8, 14, '#ffa6bd'); ell(c, 28, -94 - b, 6, 18, col); ell(c, 28, -94 - b, 2.8, 12, '#ffa6bd');
  eye1(c, 30, -66 - b, o, 3.6); ell(c, 41, -60 - b, 3, 2.4, '#ff8fa8'); ell(c, 22, -55 - b, 3.6, 2.6, '#ffb3c4'); }); }
export function frog(c, x, y, h, o = {}) { const col = o.color || '#4cc36b'; wrap(c, x, y, h, o, (c) => {
  const b = hop(o, 5);
  poly(c, [[-30, -4], [-14, -30 - b], [-4, -8]], shade(col, .85)); rct(c, -34, -6, 22, 7, shade(col, .85));
  rct(c, 14, -14, 8, 14, shade(col, .85)); rct(c, 10, -5, 20, 6, shade(col, .85));
  ell(c, 0, -34 - b, 32, 24, col); ell(c, 4, -26 - b, 20, 14, '#e3f8c8');
  ell(c, 12, -58 - b, 11, 11, col); ell(c, 30, -56 - b, 11, 11, col); eye1(c, 14, -60 - b, o, 5.5); eye1(c, 32, -58 - b, o, 5.5);
  c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(4, -38 - b); c.quadraticCurveTo(26, o.hurt ? -40 - b : -28 - b, 42, -40 - b); c.stroke(); ell(c, 36, -48 - b, 1.6, 1.6, INK); }); }
export function robot(c, x, y, h, o = {}) { const col = o.color || '#7aa7d9'; wrap(c, x, y, h, o, (c, t) => {
  const b = hop(o, 3), w = swing(o, 0, 7);
  rct(c, -16 + w, -28, 12, 28, '#4d5566'); rct(c, 4 - w, -28, 12, 28, '#4d5566'); rct(c, -20 + w, -8, 18, 8, '#3a4152'); rct(c, 2 - w, -8, 18, 8, '#3a4152');
  rct(c, -22, -68 - b, 44, 42, col); rct(c, -12, -58 - b, 24, 16, '#e8f2ff');
  ell(c, 0, -50 - b, 5, 5, o.hurt ? '#ff5b5b' : (Math.sin(t * 8) > 0 ? '#ffd34d' : '#ffa23a'));
  rct(c, -30, -64 - b + swing(o, 1, 4), 9, 28, '#4d5566'); rct(c, 21, -64 - b - swing(o, 1, 4), 9, 28, '#4d5566');
  rct(c, -20, -100 - b, 40, 30, col); rct(c, -13, -92 - b, 29, 14, '#1b2433');
  if (o.hurt) { c.strokeStyle = '#ff5b5b'; c.lineWidth = 2.5; for (const dx of [-5, 8]) { c.beginPath(); c.moveTo(dx - 3, -89 - b); c.lineTo(dx + 3, -81 - b); c.moveTo(dx + 3, -89 - b); c.lineTo(dx - 3, -81 - b); c.stroke(); } } else { c.fillStyle = '#6ff0ff'; c.fillRect(-8, -90 - b, 7, 9); c.fillRect(6, -90 - b, 7, 9); }
  c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, -100 - b); c.lineTo(0, -110 - b); c.stroke(); ell(c, 0, -112 - b, 4, 4, '#ff5b5b'); }); }
export const CHAR = { cat, dog, zombie, person, car, duck, penguin, capybara, axolotl, dino, bunny, frog, robot };
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
