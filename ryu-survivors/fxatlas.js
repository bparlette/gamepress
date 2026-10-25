// fxatlas.js — one 2048x1024 canvas atlas for every effect sprite and ground decal, painted in code.
import * as THREE from './three.module.min.js';
export const FONT = 'Impact, "Haettenschweiler", "Arial Narrow Bold", "Arial Black", sans-serif';
const INK = '#140f1f';
export function buildFxAtlas() {
  const W = 2048, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); const R = {}; let x = 0, y = 0, row = 0;
  const cell = (name, w, h, fn) => {
    if (x + w > W) { x = 0; y += row + 2; row = 0; }
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.translate(x, y); fn(c, w, h); c.restore();
    R[name] = [(x + 0.5) / W, 1 - (y + 0.5) / H, (x + w - 0.5) / W, 1 - (y + h - 0.5) / H];
    x += w + 2; row = Math.max(row, h);
  };
  const rad = (g, w, h, stops) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) / 2); for (const [o, col] of stops) gr.addColorStop(o, col); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
  cell('white', 16, 16, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 16, 16); });
  cell('glow', 128, 128, (g, w, h) => rad(g, w, h, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.55)'], [0.6, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]));
  cell('dot', 64, 64, (g, w, h) => rad(g, w, h, [[0, '#fff'], [0.55, '#fff'], [0.75, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']]));
  cell('spark', 128, 32, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2, h / 4, 0, 0, 7); g.fill(); });
  cell('star', 96, 96, (g, w, h) => { g.translate(w / 2, h / 2); g.fillStyle = '#fff'; for (let k = 0; k < 2; k++) { g.beginPath(); g.ellipse(0, 0, w * 0.48, 5, k * Math.PI / 2, 0, 7); g.fill(); } rad(g, 0, 0, []); g.beginPath(); g.arc(0, 0, 10, 0, 7); g.fill(); });
  cell('shadow', 128, 64, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(10,6,20,.62)'); gr.addColorStop(0.6, 'rgba(10,6,20,.45)'); gr.addColorStop(1, 'rgba(10,6,20,0)'); g.fillStyle = gr; g.save(); g.scale(1, h / w); g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, 7); g.restore(); g.fill(); });
  cell('ring', 256, 256, (g, w, h) => { g.strokeStyle = '#fff'; g.lineWidth = 14; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 12, 0, 7); g.stroke(); g.lineWidth = 4; g.globalAlpha = 0.6; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 30, 0, 7); g.stroke(); });
  cell('disk', 256, 256, (g, w, h) => { g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 8; g.stroke(); });
  // telegraph sector: 120 degree wedge pointing +x from the left-middle
  cell('sector', 256, 256, (g, w, h) => { g.translate(0, h / 2); g.fillStyle = 'rgba(255,255,255,.35)'; g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.moveTo(6, 0); g.arc(6, 0, w - 12, -1.05, 1.05); g.closePath(); g.fill(); g.stroke(); });
  cell('lane', 256, 64, (g, w, h) => { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 6, w, h - 12); g.fillStyle = '#fff'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6); for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(k * 32 + 6, 16); g.lineTo(k * 32 + 22, h / 2); g.lineTo(k * 32 + 6, h - 16); g.lineWidth = 5; g.strokeStyle = '#fff'; g.stroke(); } });
  // whip crescent: comic swoosh with ink edge
  cell('slash', 512, 128, (g, w, h) => {
    g.translate(0, h / 2);
    const arc = (r0, col, lw) => { g.beginPath(); g.moveTo(8, 6); g.quadraticCurveTo(w * 0.5, -h * 0.55 + r0, w - 6, 0); g.quadraticCurveTo(w * 0.5, -h * 0.1 + r0, 8, 6); g.closePath(); g.fillStyle = col; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); } };
    arc(0, '#fff', 8); arc(10, 'rgba(255,255,255,.9)', 0);
    for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(40 + k * 70, 18 + (k % 2) * 8, 40, 5); }
  });
  cell('bolt', 96, 512, (g, w, h) => {
    const pts = [[48, 0]]; let yy = 0; while (yy < h) { yy += 40 + Math.random() * 30; pts.push([w / 2 + (Math.random() - 0.5) * 60, Math.min(h, yy)]); }
    for (const [lw, col] of [[22, 'rgba(160,220,255,.35)'], [12, '#bfe8ff'], [5, '#fff']]) { g.lineWidth = lw; g.strokeStyle = col; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke(); }
  });
  cell('flame', 96, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h * 0.7, 2, w / 2, h * 0.6, h * 0.55); gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.35, '#ffd23c'); gr.addColorStop(0.7, '#ff7a3c'); gr.addColorStop(1, 'rgba(255,60,40,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2, 4); g.quadraticCurveTo(w, h * 0.65, w / 2, h - 4); g.quadraticCurveTo(0, h * 0.65, w / 2, 4); g.fill(); });
  cell('smoke', 128, 128, (g, w, h) => { for (let k = 0; k < 7; k++) { const a = k * 0.9, r = 26 + (k % 3) * 8; const gr = g.createRadialGradient(w / 2 + Math.cos(a) * 22, h / 2 + Math.sin(a) * 22, 0, w / 2 + Math.cos(a) * 22, h / 2 + Math.sin(a) * 22, r); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
  // holy pool: blue flame ring with runes
  cell('pool', 256, 256, (g, w, h) => {
    rad(g, w, h, [[0, 'rgba(160,240,255,.45)'], [0.7, 'rgba(90,200,255,.35)'], [0.86, 'rgba(200,250,255,.9)'], [1, 'rgba(120,220,255,0)']]);
    g.translate(w / 2, h / 2); g.strokeStyle = '#fff'; g.lineWidth = 4;
    for (let k = 0; k < 12; k++) { g.save(); g.rotate(k / 12 * Math.PI * 2); g.beginPath(); g.moveTo(0, -84); g.lineTo(8, -100); g.lineTo(-8, -100); g.closePath(); g.stroke(); g.restore(); }
  });
  cell('aura', 256, 256, (g, w, h) => {
    rad(g, w, h, [[0, 'rgba(255,255,255,0)'], [0.6, 'rgba(255,255,255,.08)'], [0.9, 'rgba(255,255,255,.55)'], [0.96, 'rgba(255,255,255,.9)'], [1, 'rgba(255,255,255,0)']]);
    g.translate(w / 2, h / 2); g.fillStyle = 'rgba(255,255,255,.85)';
    for (let k = 0; k < 16; k++) { g.save(); g.rotate(k / 16 * Math.PI * 2); g.beginPath(); g.moveTo(-6, -112); g.lineTo(0, -126); g.lineTo(6, -112); g.closePath(); g.fill(); g.restore(); }
  });
  // comic numerals and words: white fill with thick ink stroke (tinted per use)
  c.font = `italic 900 76px ${FONT}`;
  for (let d = 0; d <= 9; d++) cell('d' + d, 56, 88, (g, w, h) => { g.font = `italic 900 76px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = 14; g.strokeStyle = INK; g.strokeText(String(d), w / 2, h / 2 + 4); g.fillStyle = '#fff'; g.fillText(String(d), w / 2, h / 2 + 4); });
  const word = (name, t, fill, rim, size = 120) => cell(name, 512, 180, (g, w, h) => {
    g.translate(w / 2, h / 2); g.rotate(-0.07); g.font = `italic 900 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const tw = g.measureText(t).width, s = Math.min(1, (w - 60) / tw); g.scale(s, 1);
    g.lineWidth = 44; g.strokeStyle = rim; g.strokeText(t, 6, 8); g.lineWidth = 28; g.strokeStyle = INK; g.strokeText(t, 6, 8);
    g.lineWidth = 20; g.strokeStyle = INK; g.strokeText(t, 0, 0); g.lineWidth = 9; g.strokeStyle = '#fff'; g.strokeText(t, 0, 0);
    const gr = g.createLinearGradient(0, -size / 2, 0, size / 2); gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, fill); gr.addColorStop(1, fill); g.fillStyle = gr; g.fillText(t, 0, 0);
  });
  word('wSlay', 'SLAY!', '#ffd23c', '#ff3d6e'); word('wCrit', 'CRUNCH!', '#ff5fa2', '#6b4cff'); word('wDodge', 'DODGE!', '#7ff3ff', '#2f5aa8');
  word('wHeal', '+HP', '#9dff6b', '#1f8a4a'); word('wGold', '+GOLD', '#ffd23c', '#c06a1a'); word('wLevel', 'LEVEL UP!', '#7ff3ff', '#6b4cff'); word('wOuch', 'OUCH!', '#ff3d6e', '#ffd23c');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.premultiplyAlpha = true;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 2; tex.needsUpdate = true;
  return { tex, R, canvas: cv };
}

// seamless painted graveyard floor (cel flats + ink lines + halftone shadow dots)
export function buildGroundTexture() {
  const S = 1024, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#211a2e'; g.fillRect(0, 0, S, S);
  const wrap = (fn) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.save(); g.translate(ox, oy); fn(); g.restore(); } };
  // flagstones on a jittered grid
  const N = 11, cs = S / N;
  const cols = ['#352b45', '#30283f', '#3a2f4b', '#2d253b', '#372d48'];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const off = (j % 2) * cs * 0.5, x0 = i * cs + off + 6, y0 = j * cs + 6, w = cs - 12, h = cs - 12, col = cols[(rnd() * cols.length) | 0];
    const pts = [[x0 + rnd() * 10, y0 + rnd() * 10], [x0 + w - rnd() * 10, y0 + rnd() * 10], [x0 + w - rnd() * 10, y0 + h - rnd() * 10], [x0 + rnd() * 10, y0 + h - rnd() * 10]];
    const crack = rnd() < 0.35, cx = x0 + w * (0.3 + rnd() * 0.4);
    wrap(() => {
      g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath();
      g.fillStyle = col; g.fill(); g.lineWidth = 5; g.strokeStyle = '#17111f'; g.stroke();
      // top-left light edge
      g.beginPath(); g.moveTo(pts[3][0] + 6, pts[3][1] - 8); g.lineTo(pts[0][0] + 6, pts[0][1] + 6); g.lineTo(pts[1][0] - 8, pts[1][1] + 6); g.lineWidth = 3; g.strokeStyle = 'rgba(170,150,220,.18)'; g.stroke();
      if (crack) { g.beginPath(); g.moveTo(cx, y0 + 4); g.lineTo(cx + 14, y0 + h * 0.35); g.lineTo(cx - 6, y0 + h * 0.6); g.lineTo(cx + 10, y0 + h * 0.85); g.lineWidth = 3; g.strokeStyle = '#1b1428'; g.stroke(); }
    });
  }
  // moss and grass tufts
  for (let k = 0; k < 26; k++) {
    const x = rnd() * S, y = rnd() * S, r = 20 + rnd() * 50, teal = rnd() < 0.5;
    wrap(() => { g.fillStyle = teal ? 'rgba(40,82,70,.55)' : 'rgba(52,70,54,.5)'; g.beginPath(); g.ellipse(x, y, r, r * 0.6, rnd() * 3, 0, 7); g.fill(); });
  }
  for (let k = 0; k < 90; k++) {
    const x = rnd() * S, y = rnd() * S;
    wrap(() => { g.strokeStyle = rnd() < 0.5 ? '#3e6e58' : '#4f7e60'; g.lineWidth = 3; for (let b = 0; b < 4; b++) { g.beginPath(); g.moveTo(x + b * 4, y); g.lineTo(x + b * 4 + (b - 1.5) * 4, y - 10 - b * 2); g.stroke(); } });
  }
  // fallen petals (blood red) and halftone dot shading
  for (let k = 0; k < 40; k++) { const x = rnd() * S, y = rnd() * S; wrap(() => { g.fillStyle = rnd() < 0.5 ? '#7a1830' : '#9a2f44'; g.beginPath(); g.ellipse(x, y, 5, 3, rnd() * 3, 0, 7); g.fill(); }); }
  g.fillStyle = 'rgba(16,10,30,.22)';
  for (let yy = 0; yy < S; yy += 10) for (let xx = (yy / 10) % 2 * 5; xx < S; xx += 10) { const v = Math.sin(xx * 0.006) * Math.cos(yy * 0.0061); if (v > 0.35) { g.beginPath(); g.arc(xx, yy, 2.2 * (v - 0.2), 0, 7); g.fill(); } }
  const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.needsUpdate = true;
  return tex;
}
