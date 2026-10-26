// gpsprites: procedural characters (cat, dog, zombie, person) + small icons. Side view, feet at (x,y), `h` = pixel height, facing o.dir (1 right, -1 left).
// Styles are set once by createGame: STY.ow = outline width, STY.blocky = rectangles instead of ellipses (roblox / pixel styles).
import { isCast, drawCast, faceCast } from './gpcast.js';
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

// ---- hero set 2: meme/game-flavoured originals (all feet at (0,0), ~100 tall in local units; same footprint as the set above) ----
const pill = (c, x, y, w, h, fill, r = w / 2) => { c.beginPath(); if (STY.blocky) c.rect(x, y, w, h); else c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill(); if (STY.ow) { c.lineWidth = STY.ow; c.strokeStyle = INK; c.stroke(); } };
const sqz = (c, o) => { if (o.anim === 'walk') { const s = Math.sin((o.t || 0) * 9); c.scale(1 + s * .04, 1 - s * .04); } if (o.hurt) c.scale(1.1, .9); };
const legs = (c, o, col, len = 24, w = 8, xs = [-9, 7], shoe) => xs.forEach((lx, i) => { const sw = swing(o, i, 6); rct(c, lx - w / 2 + sw, -len, w, len, col); if (shoe) rct(c, lx - w / 2 - 3 + sw, -8, w + 11, 8, shoe); });
const mouth = (c, x, y, w, hurt) => { c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); if (hurt) { c.moveTo(x - w, y + 2); c.lineTo(x + w, y + 2); } else c.arc(x, y - 2, w, .15, Math.PI - .15); c.stroke(); };
const K = (def, fn) => (c, x, y, h, o = {}) => wrap(c, x, y, h, o, (c, t) => { c.save(); sqz(c, o); fn(c, t, o, o.color || def, hop(o, 3)); c.restore(); });
const gun = (c, x, y) => { rct(c, x, y - 4, 15, 6, '#555a66'); rct(c, x, y, 5, 9, '#3a3f4a'); };
export const spud = K('#b98a5c', (c, t, o, col, b) => {
  legs(c, o, shade(col, .8), 16, 8, [-9, 8], '#6b4a2e');
  rct(c, -29, -52 - b, 12, 9, shade(col, .9)); gun(c, -42, -48 - b);
  ell(c, 0, -46 - b, 27, 33, col); ell(c, -15, -62 - b, 9, 9, shade(col, .92)); ell(c, 14, -30 - b, 9, 8, shade(col, .9)); ell(c, -10, -28 - b, 3, 3, shade(col, .7)); ell(c, 8, -68 - b, 2.5, 2.5, shade(col, .7));
  rct(c, 17, -50 - b, 12, 9, shade(col, .9)); gun(c, 26, -48 - b);
  for (const dx of [-7, 11]) { if (o.hurt) X(c, dx, -56 - b); else { ell(c, dx, -56 - b, 6, 5, '#fff'); c.strokeStyle = '#e03a3a'; c.lineWidth = 1; c.beginPath(); c.moveTo(dx - 5, -56 - b); c.lineTo(dx - 1, -55 - b); c.moveTo(dx + 5, -57 - b); c.lineTo(dx + 1, -56 - b); c.stroke(); ell(c, dx + 1, -55 - b, 1.8, 1.8, INK); c.fillStyle = shade(col, .7); c.fillRect(dx - 6, -53 - b, 12, 3); } }
  mouth(c, 2, -36 - b, 0, true); });
export const bean = K('#9be15d', (c, t, o, col, b) => {
  legs(c, o, shade(col, .75), 10, 10, [-11, 10]);
  rct(c, -38, -58 - b, 13, 22, '#5a5f72');
  pill(c, -27, -86 - b, 54, 80, col, 27);
  pill(c, -14, -74 - b, 30, 20, '#a7dcff', 10); poly(c, [[-8, -70 - b], [-2, -70 - b], [-6, -60 - b]], '#e8f7ff');
  if (o.hurt) { X(c, -4, -66 - b); X(c, 8, -66 - b); } else { ell(c, -4, -64 - b, 3, 4, INK); ell(c, 8, -64 - b, 3, 4, INK); }
  ell(c, 2, -40 - b, 9, o.hurt ? 2 : 6, '#7a2a3a');
  c.strokeStyle = INK; c.lineWidth = 3.5; c.beginPath(); c.arc(0, -58 - b, 28, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); ell(c, -26, -62 - b, 5, 9, '#2b2f3a'); ell(c, 26, -62 - b, 5, 9, '#2b2f3a'); c.lineWidth = 2.5; c.beginPath(); c.moveTo(-28, -55 - b); c.quadraticCurveTo(-24, -42 - b, -12, -46 - b); c.stroke(); ell(c, -11, -46 - b, 3, 3, '#e63946'); });
export const jester = K('#f4e6d0', (c, t, o, col, b) => {
  const ck = (x, y, w, h) => { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) { c.fillStyle = (i + j) % 2 ? '#f5f5f5' : '#1c1c28'; c.fillRect(x + i * 7, y + j * 7, 7, 7); } c.strokeStyle = INK; c.lineWidth = STY.ow; c.strokeRect(x, y, w * 7, h * 7); };
  legs(c, o, '#7b2fbf', 22, 9, [-9, 8], '#e63946'); ck(-14, -62 - b, 4, 5); rct(c, -22, -60 - b + swing(o, 1, 3), 9, 24, '#7b2fbf'); rct(c, 13, -60 - b - swing(o, 1, 3), 9, 24, '#7b2fbf');
  poly(c, [[-14, -64 - b], [0, -54 - b], [14, -64 - b], [8, -72 - b], [-8, -72 - b]], '#e63946');
  poly(c, [[-15, -84 - b], [0, -70 - b], [16, -84 - b], [12, -92 - b], [-12, -92 - b]], col);
  poly(c, [[-14, -90 - b], [-30, -96 + Math.sin(t * 6) * 3 - b], [-34, -80 - b], [-12, -86 - b]], '#7b2fbf'); poly(c, [[14, -90 - b], [30, -96 - Math.sin(t * 6) * 3 - b], [34, -80 - b], [12, -86 - b]], '#e63946'); poly(c, [[-14, -90 - b], [14, -90 - b], [10, -96 - b], [-10, -96 - b]], '#1c1c28');
  ell(c, -33, -78 - b, 4, 4, '#ffd34d'); ell(c, 33, -78 - b, 4, 4, '#ffd34d');
  eyes(c, 0, -80 - b, o, o.hurt); mouth(c, 3, -72 - b, 8, o.hurt); });
export const vampire = K('#e9e6f0', (c, t, o, col, b) => {
  poly(c, [[-14, -74 - b], [-34, 0], [34, 0], [14, -74 - b]], '#e63946'); poly(c, [[-14, -74 - b], [-26, 0], [26, 0], [14, -74 - b]], '#1d1a2b');
  legs(c, o, '#1d1a2b', 20, 9, [-9, 8]); rct(c, -15, -68 - b, 30, 44, '#2a2540');
  poly(c, [[-4, -66 - b], [0, -58 - b], [4, -66 - b]], '#f5f5f5');
  poly(c, [[-18, -64 - b], [-28, -84 - b], [-8, -70 - b]], '#e63946'); poly(c, [[18, -64 - b], [28, -84 - b], [8, -70 - b]], '#e63946');
  poly(c, [[-14, -72 - b], [-15, -96 - b], [0, -90 - b], [15, -96 - b], [14, -72 - b], [0, -66 - b]], col);
  poly(c, [[-15, -96 - b], [0, -86 - b], [15, -96 - b], [8, -102 - b], [-8, -102 - b]], '#1d1a2b');
  if (o.hurt) { X(c, -5, -82 - b); X(c, 5, -82 - b); } else { c.fillStyle = '#e63946'; c.fillRect(-8, -84 - b, 5, 4); c.fillRect(3, -84 - b, 5, 4); }
  poly(c, [[-5, -74 - b], [-3, -69 - b], [-1, -74 - b]], '#fff'); poly(c, [[1, -74 - b], [3, -69 - b], [5, -74 - b]], '#fff'); });
export const joker = K('#fbf7ee', (c, t, o, col, b) => {
  legs(c, o, '#1c1c28', 16, 7, [-9, 8], '#e63946');
  const r = Math.sin(t * 7) * (o.anim === 'walk' ? .05 : 0); c.rotate(r);
  rct(c, -26, -96 - b, 52, 82, '#ffd34d', 7); rct(c, -22, -92 - b, 44, 74, col, 5);
  c.fillStyle = '#e63946'; c.font = 'bold 13px sans-serif'; c.fillText('J', -19, -79 - b); c.save(); c.rotate(Math.PI); c.fillText('J', -19, 79 - b - 16 + 16); c.restore();
  ell(c, 0, -52 - b, 14, 14, '#f4e6d0'); poly(c, [[-14, -58 - b], [-26, -76 - b], [-6, -64 - b]], '#7b2fbf'); poly(c, [[14, -58 - b], [26, -76 - b], [6, -64 - b]], '#e63946'); ell(c, -26, -77 - b, 3, 3, '#ffd34d'); ell(c, 26, -77 - b, 3, 3, '#ffd34d');
  eyes(c, 0, -55 - b, o, o.hurt); if (!o.hurt) { c.fillStyle = INK; c.beginPath(); c.arc(0, -46 - b, 7, 0, Math.PI); c.fill(); c.fillStyle = '#fff'; c.fillRect(-4, -46 - b, 8, 2); } else mouth(c, 0, -46 - b, 6, true);
  rct(c, -30, -50 - b + swing(o, 1, 3), 7, 20, '#7b2fbf'); rct(c, 23, -50 - b - swing(o, 1, 3), 7, 20, '#7b2fbf'); });
export const ragdoll = K('#f7efe4', (c, t, o, col, b) => {
  const s = o.anim === 'walk' ? Math.sin(t * 9) : Math.sin(t * 2) * .4; c.translate(0, -2); c.rotate(-.16 + s * .05);
  const lm = (x, y, ang, len, w) => { c.save(); c.translate(x, y); c.rotate(ang); rct(c, -w / 2, 0, w, len, col); ell(c, 0, len, w * .62, w * .62, col); c.restore(); };
  lm(-8, -30, .25 + s * .4, 30, 10); lm(9, -30, -.3 - s * .4, 30, 10);
  lm(-22, -62 - b, .7 + s * .5, 30, 9); lm(22, -62 - b, -.9 - s * .5, 30, 9);
  ell(c, 0, -48 - b, 21, 24, col); ell(c, 2, -86 - b, 20, 17, col); ell(c, -3, -88 - b, 10, 6, shade(col, .94));
  if (o.hurt) { X(c, -6, -88 - b); X(c, 9, -88 - b); } else { ell(c, -6, -88 - b, 3.5, 3.5, '#fff'); ell(c, 9, -88 - b, 3.5, 3.5, '#fff'); c.fillStyle = INK; c.fillRect(-6, -89 - b, 1.5, 1.5); c.fillRect(9, -89 - b, 1.5, 1.5); }
  c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-3, -78 - b); c.lineTo(8, -78 - b); for (let i = 0; i < 4; i++) { c.moveTo(-1 + i * 3, -80 - b); c.lineTo(-1 + i * 3, -76 - b); } c.stroke(); });
export const noob = K('#ffd23c', (c, t, o, col, b) => {
  legs(c, o, '#4caf50', 28, 12, [-8, 8]);
  rct(c, -16, -66 - b, 32, 40, '#2f7fe0'); rct(c, -23, -64 - b + swing(o, 1, 4), 8, 32, col); rct(c, 15, -64 - b - swing(o, 1, 4), 8, 32, col);
  rct(c, -13, -92 - b, 26, 26, col, 4); ell(c, 0, -92 - b, 13, 4, shade(col, 1.08));
  eyes(c, 3, -80 - b, o, o.hurt); mouth(c, 3, -74 - b, 6, o.hurt); });
export const hacker = K('#171b26', (c, t, o, col, b) => {
  legs(c, o, '#2a3042', 24, 9, [-9, 8], '#10131b');
  rct(c, -19, -70 - b, 38, 46, col); rct(c, -27, -66 - b + swing(o, 1, 3), 10, 30, col); rct(c, 17, -66 - b - swing(o, 1, 3), 10, 30, col);
  rct(c, -9, -42 - b, 18, 10, shade('#2a3042', 1.2)); c.strokeStyle = '#3a4258'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-4, -70 - b); c.lineTo(-4, -56 - b); c.moveTo(5, -70 - b); c.lineTo(5, -56 - b); c.stroke();
  ell(c, 1, -88 - b, 21, 22, col); ell(c, 5, -86 - b, 14, 14, '#0a0c12');
  const g = c.createLinearGradient(-14, 0, 24, 0); g.addColorStop(0, '#2fe6ff'); g.addColorStop(1, '#7ffcff'); c.save(); c.shadowColor = '#22e5ff'; c.shadowBlur = o.hurt ? 0 : 10; rct(c, -10, -92 - b, 28, 9, o.hurt ? '#4a5568' : g); c.restore(); if (o.hurt) { X(c, 0, -88 - b); X(c, 10, -88 - b); } });
export const melon = K('#3fae4f', (c, t, o, col, b) => {
  legs(c, o, '#2e8a3c', 14, 8, [-10, 9], '#f5f5f5');
  ell(c, 0, -46 - b, 35, 34, col);
  c.save(); c.beginPath(); if (STY.blocky) c.rect(-35, -80 - b, 70, 68); else c.ellipse(0, -46 - b, 35, 34, 0, 0, 7); c.clip(); c.fillStyle = '#1f6b2c';
  for (const sx of [-26, -10, 8, 24]) { c.beginPath(); c.moveTo(sx, -82 - b); for (let i = 0; i < 6; i++) c.lineTo(sx + (i % 2 ? 4 : -3), -82 - b + (i + 1) * 12); c.lineTo(sx + 7, -10 - b); for (let i = 5; i >= 0; i--) c.lineTo(sx + 7 + (i % 2 ? 1 : -4), -82 - b + i * 12 + 6); c.closePath(); c.fill(); } c.restore();
  ell(c, 0, -46 - b, 35, 34, 'rgba(0,0,0,0)'); ell(c, 14, -56 - b, 12, 11, '#ffd0d6'); eyes(c, 14, -58 - b, o, o.hurt); mouth(c, 15, -49 - b, 4, o.hurt);
  ell(c, -18, -72 - b, 6, 4, 'rgba(255,255,255,.5)'); c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -80 - b); c.lineTo(3, -90 - b); c.stroke(); });
export const scrapper = K('#ff7a1a', (c, t, o, col, b) => {
  legs(c, o, col, 26, 10, [-9, 8], '#3a3f4a');
  rct(c, -17, -68 - b, 34, 44, col); rct(c, -17, -46 - b, 34, 6, '#ffd23c'); c.fillStyle = '#ffd23c'; for (const bx of [-14, -2, 10]) c.fillRect(bx, -45 - b, 5, 4);
  rct(c, -25, -64 - b + swing(o, 1, 3), 9, 30, col); rct(c, 16, -64 - b - swing(o, 1, 3), 9, 30, col);
  rct(c, 20, -42 - b - swing(o, 1, 3), 22, 6, '#9aa3b2'); ell(c, 44, -39 - b, 6, 6, '#9aa3b2');
  ell(c, 0, -84 - b, 20, 20, '#8b94a6'); rct(c, -17, -90 - b, 34, 14, '#2a2f3a');
  for (const dx of [-8, 8]) { ell(c, dx, -83 - b, 7, 7, o.hurt ? '#555' : '#d8ff3a'); ell(c, dx, -83 - b, 3, 3, o.hurt ? '#222' : '#fff'); }
  rct(c, -3, -100 - b, 6, 8, '#ffd23c'); });
export const reaper = K('#161320', (c, t, o, col, b) => {
  c.strokeStyle = INK; c.lineWidth = 4 + STY.ow * 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(32, -4); c.lineTo(32, -92 - b); c.stroke(); c.strokeStyle = '#7a5a3a'; c.lineWidth = 4; c.stroke();
  poly(c, [[32, -94 - b], [8, -98 - b], [-4, -84 - b], [12, -88 - b], [34, -84 - b]], '#cfd6e4');
  const w = Math.sin(t * 6) * 2;
  poly(c, [[-18, -66 - b], [-26, 0], [-14, -6 + w], [-6, 0], [4, -5 - w], [14, 0], [24, -4], [18, -66 - b]], col);
  rct(c, 12, -62 - b, 20, 8, '#e8e8ee');
  poly(c, [[0, -104 - b], [-22, -86 - b], [-18, -60 - b], [18, -60 - b], [22, -86 - b]], col);
  ell(c, 1, -80 - b, 13, 14, '#f1efe6'); rct(c, -6, -70 - b, 14, 7, '#f1efe6');
  if (o.hurt) { X(c, -4, -82 - b); X(c, 7, -82 - b); } else { ell(c, -4, -82 - b, 3.4, 4, INK); ell(c, 7, -82 - b, 3.4, 4, INK); poly(c, [[1, -77 - b], [0, -74 - b], [3, -74 - b]], INK); }
  c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); for (const x0 of [-3, 1, 5]) { c.moveTo(x0, -69 - b); c.lineTo(x0, -64 - b); } c.stroke(); });
export const raccoon = K('#8e96a3', (c, t, o, col, b) => {
  c.lineCap = 'round'; const tw = Math.sin(t * 7) * 4;
  poly(c, [[-18, -34 - b], [-58, -34 + tw], [-62, -64 + tw], [-44, -78 + tw], [-26, -54 - b]], col);
  c.save(); c.beginPath(); c.moveTo(-18, -34 - b); c.lineTo(-58, -34 + tw); c.lineTo(-62, -64 + tw); c.lineTo(-44, -78 + tw); c.lineTo(-26, -54 - b); c.closePath(); c.clip(); c.fillStyle = '#2f3440'; for (const k of [0, 1, 2]) c.fillRect(-70, -40 - k * 13 + tw / 2, 60, 6); c.restore();
  legs(c, o, '#4a505c', 20, 9, [-10, 12]);
  ell(c, 0, -38 - b, 25, 24, col); ell(c, 4, -34 - b, 14, 15, '#e8ebf0'); rct(c, 14, -42 - b + swing(o, 1, 3), 9, 18, '#4a505c');
  poly(c, [[-14, -72 - b], [-12, -94 - b], [0, -76 - b]], col); poly(c, [[10, -76 - b], [20, -94 - b], [26, -72 - b]], col);
  ell(c, 6, -66 - b, 22, 19, col); ell(c, 10, -60 - b, 10, 8, '#e8ebf0');
  rct(c, -14, -76 - b, 40, 13, '#2f3440'); eye1(c, -1, -69 - b, o, 3.4); eye1(c, 17, -69 - b, o, 3.4); ell(c, 26, -61 - b, 4, 3, INK); });
export const doge = K('#e8b062', (c, t, o, col, b) => {
  c.lineCap = 'round'; c.beginPath(); c.moveTo(-18, -26); c.quadraticCurveTo(-48, -30 + Math.sin(t * 10) * 3, -40, -58); c.strokeStyle = INK; c.lineWidth = 9 + STY.ow * 2; c.stroke(); c.strokeStyle = col; c.lineWidth = 9; c.stroke();
  legs(c, o, col, 18, 11, [-9, 9], '#fff');
  ell(c, 0, -40 - b, 24, 26, col); ell(c, 3, -36 - b, 13, 18, '#fbf1e0');
  rct(c, -16, -46 - b, 34, 10, shade(col, .88)); rct(c, 4, -44 - b, 20, 9, shade(col, .95)); rct(c, -20, -37 - b, 28, 9, shade(col, .88));
  poly(c, [[-18, -74 - b], [-16, -102 - b], [-2, -84 - b]], col); poly(c, [[14, -84 - b], [28, -102 - b], [30, -72 - b]], col); poly(c, [[-14, -78 - b], [-14, -94 - b], [-6, -84 - b]], '#f4a6a0');
  ell(c, 6, -72 - b, 27, 23, col); ell(c, 14, -64 - b, 17, 13, '#fbf1e0'); ell(c, 24, -68 - b, 4, 3, INK);
  if (o.hurt) { X(c, -2, -76 - b); X(c, 15, -76 - b); } else for (const dx of [-3, 14]) { ell(c, dx, -76 - b, 5, 3.4, '#fff'); c.fillStyle = INK; c.beginPath(); c.arc(dx + 2.5, -75.5 - b, 1.7, 0, 7); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(dx - 5, -81 - b); c.lineTo(dx + 5, -79 - b); c.stroke(); }
  c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(12, -58 - b); c.quadraticCurveTo(20, -56 - b, 27, -61 - b); c.stroke(); });
export const slime = K('#4fdc7a', (c, t, o, col, b) => {
  const j = Math.sin(t * 6) * (o.anim === 'walk' ? .08 : .03), hh = 66 * (1 - j), ww = 38 * (1 + j * 1.2);
  c.beginPath(); if (STY.blocky) c.rect(-ww, -hh, ww * 2, hh); else { c.moveTo(-ww, 0); c.bezierCurveTo(-ww, -hh * 1.3, ww, -hh * 1.3, ww, 0); c.closePath(); }
  const g = c.createLinearGradient(0, -hh, 0, 0); g.addColorStop(0, 'rgba(160,255,190,.85)'); g.addColorStop(1, 'rgba(50,200,100,.9)'); c.fillStyle = g; c.fill(); if (STY.ow) { c.lineWidth = STY.ow; c.strokeStyle = INK; c.stroke(); }
  ell(c, -18, -hh * .62, 7, 11, 'rgba(255,255,255,.7)'); ell(c, 2, -hh * .38 + Math.sin(t * 4) * 3, 7, 7, '#1fa04c'); ell(c, 2, -hh * .38 + Math.sin(t * 4) * 3, 3, 3, '#c8ffd8');
  const ey = -hh * .52; if (o.hurt) { X(c, 10, ey); X(c, 26, ey); } else { ell(c, 12, ey, 3.6, 5, '#fff'); ell(c, 26, ey, 3.6, 5, '#fff'); c.fillStyle = INK; c.fillRect(13, ey - 2, 2.5, 4); c.fillRect(27, ey - 2, 2.5, 4); } mouth(c, 19, ey + 12, 5, o.hurt); });
export const phantom = K('#1b1b2c', (c, t, o, col, b) => {
  const w = n => Math.sin(t * 5 + n) * 4;
  for (const [i, px] of [-18, 0, 18].entries()) ell(c, px + w(i), -6 - Math.abs(w(i + 2)), 13 - i % 2 * 3, 9, 'rgba(70,70,110,.75)');
  poly(c, [[-24, -78 - b], [-30, -14], [-18, -4 + w(0)], [-8, -14], [2, -2 + w(1)], [12, -14], [22, -4 + w(2)], [30, -16], [24, -78 - b]], col);
  poly(c, [[-26, -92 - b], [-34, -60 - b], [-12, -66 - b], [12, -66 - b], [34, -60 - b], [26, -92 - b], [0, -100 - b]], shade('#2b2b44', 1));
  ell(c, 0, -80 - b, 15, 17, '#07070d');
  if (o.hurt) { c.strokeStyle = '#7fe3ff'; c.lineWidth = 2; for (const dx of [-5, 6]) { c.beginPath(); c.moveTo(dx - 3, -82 - b); c.lineTo(dx + 3, -76 - b); c.stroke(); } } else { c.save(); c.shadowColor = '#7ff'; c.shadowBlur = 8; c.fillStyle = '#9ffcff'; c.fillRect(-9, -83 - b, 7, 3); c.fillRect(3, -83 - b, 7, 3); c.restore(); }
  poly(c, [[-30, -62 - b], [-14, -48 - b], [-4, -66 - b]], '#4a4a6e'); poly(c, [[30, -62 - b], [14, -48 - b], [4, -66 - b]], '#4a4a6e'); });
export const banana = K('#ffe14d', (c, t, o, col, b) => {
  legs(c, o, '#c9a82a', 22, 4, [-6, 8], '#e63946');
  c.beginPath(); c.moveTo(-6, -24 - b); c.bezierCurveTo(-34, -40 - b, -30, -84 - b, 4, -98 - b); c.bezierCurveTo(26, -96 - b, 30, -84 - b, 22, -74 - b); c.bezierCurveTo(30, -50 - b, 22, -32 - b, 10, -24 - b); c.closePath(); c.fillStyle = col; c.fill(); if (STY.ow) { c.lineWidth = STY.ow; c.strokeStyle = INK; c.stroke(); }
  c.strokeStyle = '#d9b020'; c.lineWidth = 2; c.beginPath(); c.moveTo(-4, -34 - b); c.bezierCurveTo(-20, -52 - b, -16, -80 - b, 2, -90 - b); c.stroke();
  rct(c, 0, -104 - b, 9, 9, '#7a5a2a'); rct(c, -3, -28 - b, 14, 6, '#7a5a2a');
  eyes(c, 6, -64 - b, o, o.hurt); mouth(c, 8, -52 - b, 6, o.hurt);
  rct(c, -34, -62 - b + swing(o, 1, 3), 8, 22, col); rct(c, 26, -60 - b - swing(o, 1, 3), 8, 22, col); });
export const capyyuzu = (c, x, y, h, o = {}) => { capybara(c, x, y, h, o); wrap(c, x, y, h, o, (c) => { const b = hop(o, 2); sqz(c, o); ell(c, 31, -68 - b, 11, 10, '#ff9a1f'); ell(c, 28, -71 - b, 3, 2.4, 'rgba(255,255,255,.55)'); poly(c, [[31, -77 - b], [40, -84 - b], [38, -75 - b]], '#3fae4f'); rct(c, 30, -80 - b, 2.6, 5, '#7a5a2a'); }); };
export const duckknife = (c, x, y, h, o = {}) => { duck(c, x, y, h, o); wrap(c, x, y, h, o, (c) => { const b = hop(o); sqz(c, o); const a = Math.sin((o.t || 0) * 9) * (o.anim === 'walk' ? .15 : .04);
  ell(c, 14, -32 - b, 7, 5, '#ffd23c'); c.save(); c.translate(18, -34 - b); c.rotate(-.5 + a); rct(c, -3, 0, 7, 12, '#7a5a3a'); poly(c, [[-5, 0], [-6, -22], [4, -34], [6, 0]], '#e8eef5'); c.strokeStyle = '#9aa7b8'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-3, -4); c.lineTo(-3, -20); c.stroke(); c.restore();
  ell(c, 18, -38 - b, 5, 4.4, '#ffd23c'); }); };
export const mushfrog = (c, x, y, h, o = {}) => { frog(c, x, y, h, o); wrap(c, x, y, h, o, (c) => { const b = hop(o, 5); sqz(c, o); poly(c, [[10, -66 - b], [32, -66 - b], [30, -60 - b], [12, -60 - b]], '#f3e9d2');
  c.beginPath(); if (STY.blocky) c.rect(-2, -88 - b, 46, 24); else c.ellipse(21, -66 - b, 25, 22, 0, Math.PI, 0); c.closePath(); c.fillStyle = '#e63946'; c.fill(); if (STY.ow) { c.lineWidth = STY.ow; c.strokeStyle = INK; c.stroke(); }
  ell(c, 8, -78 - b, 4.4, 3.6, '#fff'); ell(c, 26, -82 - b, 5, 4, '#fff'); ell(c, 36, -73 - b, 3.4, 3, '#fff'); ell(c, 15, -70 - b, 2.6, 2.2, '#fff'); }); };
const NEWCOL = { spud: '#b98a5c', bean: '#ff8a3c', jester: '#f4e6d0', vampire: '#e9e6f0', joker: '#fbf7ee', ragdoll: '#f7efe4', noob: '#ffd23c', hacker: '#171b26', melon: '#3fae4f', scrapper: '#ff7a1a', reaper: '#161320', raccoon: '#8e96a3', doge: '#e8b062', slime: '#4fdc7a', phantom: '#1b1b2c', banana: '#ffe14d', capyyuzu: '#b9824f', duckknife: '#ffd23c', mushfrog: '#4cc36b' };
export const CHAR = { cat, dog, zombie, person, car, duck, penguin, capybara, axolotl, dino, bunny, frog, robot, spud, bean, jester, vampire, joker, ragdoll, noob, hacker, melon, scrapper, reaper, raccoon, doge, slime, phantom, banana, capyyuzu, duckknife, mushfrog };
export const drawChar = (kind, c, x, y, h, o) => (isCast(kind) ? drawCast(c, kind, x, y, h, o) : (CHAR[kind] || cat)(c, x, y, h, o));
/** Cat/dog/zombie head only (for icons, HUD lives, card art): centered at (x,y), radius r. */
export function face(c, kind, x, y, r, color) { if (isCast(kind)) return faceCast(c, kind, x, y, r); c.save(); c.translate(x, y); const k = r / 20; c.scale(k, k); const ow = STY.ow; STY.ow = ow / k;
  const col = color || { cat: '#ff9a3c', dog: '#c98a4b', zombie: '#8fcf7a', person: '#f1c27d' }[kind] || '#ff9a3c';
  if (kind === 'cat' || kind === 'dog') { poly(c, [[-18, -8], [-14, -26], [-4, -14]], col); poly(c, [[18, -8], [14, -26], [4, -14]], col); }
  if (NEWCOL[kind]) { const nc = color || NEWCOL[kind]; ell(c, 0, 0, 20, 18, nc); eyes(c, 0, -3, {}, false); mouth(c, 0, 9, 5, false); STY.ow = ow; c.restore(); return; }
  ell(c, 0, 0, 20, 17, col); eyes(c, 0, -3, {}, false); ell(c, 0, 6, 4, 3, kind === 'zombie' ? INK : '#ff9fb0'); STY.ow = ow; c.restore(); }
export function heart(c, x, y, s, fill = '#ff4d6d') { c.save(); c.translate(x, y); c.scale(s / 20, s / 20); c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(-18, -4, -10, -18, 0, -8); c.bezierCurveTo(10, -18, 18, -4, 0, 8); c.fillStyle = fill; c.fill(); c.lineWidth = STY.ow; c.strokeStyle = INK; if (STY.ow) c.stroke(); c.restore(); }
export function star(c, x, y, r, fill = '#ffd34d') { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fillStyle = fill; c.fill(); if (STY.ow) { c.lineWidth = STY.ow; c.strokeStyle = INK; c.stroke(); } }
export function coin(c, x, y, r, t = 0) { const w = Math.abs(Math.cos(t * 4)) * r + r * .25; ell(c, x, y, w, r, '#ffd34d'); ell(c, x, y, w * .6, r * .6, '#ffe89a'); }
/** Little spaceship with a cat/dog/zombie pilot. */
export function ship(c, x, y, s, o = {}) { c.save(); c.translate(x, y); c.scale(s / 50, s / 50); const col = o.color || '#4aa8ff'; poly(c, [[-26, 12], [-12, -4], [12, -4], [26, 12], [10, 22], [-10, 22]], col); ell(c, 0, -6, 11, 11, '#bfeaff'); face(c, o.pilot || 'cat', 0, -7, 8, o.pilotColor);
  poly(c, [[-26, 12], [-38, 28], [-14, 18]], '#e63946'); poly(c, [[26, 12], [38, 28], [14, 18]], '#e63946'); if (o.flame !== false) poly(c, [[-6, 22], [0, 38 + Math.sin((o.t || 0) * 40) * 5], [6, 22]], '#ffd34d'); c.restore(); }

// Runtime hero override (hub pages): ?hero=<kind>&heroColor=<#rrggbb>. Unknown kind / bad colour are ignored.
const _q = () => { try { return new URLSearchParams(globalThis.location?.search || ''); } catch (e) { return new URLSearchParams(''); } };
export const heroKind = (specKind) => { const k = _q().get('hero'); return k && (isCast(k) || Object.prototype.hasOwnProperty.call(CHAR, k)) ? k : (specKind || 'cat'); };
export const heroColor = (specColor) => { const v = _q().get('heroColor'); return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : specColor; };
