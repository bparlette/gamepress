/* hdkit.js: painted-HD rendering helpers (global HD). Used only when the page is built with --hd (canvas 768x672, ctx pre-scaled 3x,
   so all drawing here is in the same 256x224 logical coordinates as the game rules). Game opts in with drawHD(S, g) in kit().
   Sprites are painted once with gradients/outlines into cached canvases (frames), lighting is a dark layer cut by light gradients. */
const HD = (() => {
  const SC = 3, H = { SC }, cache = {};
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w * SC); c.height = Math.ceil(h * SC); return c; };
  H.mk = mk;
  H.spr = (key, w, h, fn) => { if (!cache[key]) { const c = mk(w, h), g = c.getContext('2d'); g.scale(SC, SC); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g, w, h); cache[key] = c; } return cache[key]; };
  /* draw a cached sprite anchored bottom-centre at (x,y) */
  H.put = (g, c, x, y, flip, a) => { const w = c.width / SC, h = c.height / SC; g.save(); if (a !== undefined) g.globalAlpha = a; if (flip) { g.translate(x, 0); g.scale(-1, 1); g.drawImage(c, -w / 2, y - h, w, h); } else g.drawImage(c, x - w / 2, y - h, w, h); g.restore(); };
  H.lg = (g, x0, y0, x1, y1, stops) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => r.addColorStop(o, c)); return r; };
  H.rg = (g, x, y, r0, r1, stops) => { r1 = Math.max(0.01, r1); r0 = Math.max(0, Math.min(r0, r1)); const r = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => r.addColorStop(o, c)); return r; };
  H.rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  /* filled+outlined rounded part with top-left light gradient */
  H.part = (g, x, y, w, h, r, c1, c2, line = '#10131a') => { H.rr(g, x, y, w, h, r); g.fillStyle = H.lg(g, x, y, x + w, y + h, [[0, c1], [1, c2]]); g.fill(); g.lineWidth = 0.5; g.strokeStyle = line; g.stroke(); };
  H.ball = (g, x, y, r, c1, c2, line = '#10131a') => { g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fillStyle = H.rg(g, x - r * 0.35, y - r * 0.4, r * 0.1, r * 1.1, [[0, c1], [1, c2]]); g.fill(); g.lineWidth = 0.5; g.strokeStyle = line; g.stroke(); };
  H.shadow = (g, x, y, rx, ry, a = 0.45) => { g.save(); g.translate(x, y); g.scale(1, ry / rx); g.fillStyle = H.rg(g, 0, 0, 0, rx, [[0, `rgba(0,0,0,${a})`], [1, 'rgba(0,0,0,0)']]); g.beginPath(); g.arc(0, 0, rx, 0, 6.283); g.fill(); g.restore(); };
  H.glow = (g, x, y, r, rgb, a = 0.6) => { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = H.rg(g, x, y, 0, r, [[0, `rgba(${rgb},${a})`], [1, `rgba(${rgb},0)`]]); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); };
  /* deterministic noise grain over a rect of a baked canvas */
  H.grain = (g, x, y, w, h, a = 0.08, step = 0.5) => { for (let j = 0; j < h; j += step) for (let i = 0; i < w; i += step) { const v = hash(Math.floor(i * 4) + x, Math.floor(j * 4) + y); if (v > 0.5) { g.fillStyle = v > 0.8 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.4})`; g.fillRect(x + i, y + j, step, step); } } };
  /* lighting: beginLight(ambient) -> addLight(x,y,r,strength) ... -> endLight(g) */
  let LC = null, LG = null;
  H.beginLight = (amb = 'rgba(3,6,12,0.78)') => { if (!LC) { LC = mk(256, 224); LG = LC.getContext('2d'); } LG.setTransform(SC, 0, 0, SC, 0, 0); LG.globalCompositeOperation = 'source-over'; LG.clearRect(0, 0, 256, 224); LG.fillStyle = amb; LG.fillRect(0, 0, 256, 224); };
  H.addLight = (x, y, r, a = 1) => { LG.globalCompositeOperation = 'destination-out'; LG.fillStyle = H.rg(LG, x, y, r * 0.1, r, [[0, `rgba(0,0,0,${a})`], [0.6, `rgba(0,0,0,${a * 0.45})`], [1, 'rgba(0,0,0,0)']]); LG.fillRect(x - r, y - r, r * 2, r * 2); };
  H.endLight = g => { g.drawImage(LC, 0, 0, 256, 224); };
  /* particles on S.hd.parts: {x,y,vx,vy,t,t0,c,r,g} (g=gravity) */
  H.burst = (list, x, y, c, n, sp = 60, r = 1.1) => { for (let i = 0; i < n; i++) { const a = vr() * 6.283, v = sp * (0.3 + vr() * 0.9); list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 15, t: 0.35 + vr() * 0.35, t0: 0.6, c, r: r * (0.6 + vr() * 0.8), g: 140 }); } if (list.length > 220) list.splice(0, list.length - 220); };
  H.parts = (g, list, dt = 1 / 60) => { for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; p.t -= dt; if (p.t <= 0) { list.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; g.globalAlpha = Math.min(1, p.t * 4); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); } g.globalAlpha = 1; };
  /* painted framed bar, v 0..1 */
  H.bar = (g, x, y, w, h, v, c1, c2) => { H.rr(g, x - 1, y - 1, w + 2, h + 2, 2.5); g.fillStyle = '#0a0d12'; g.fill(); H.rr(g, x, y, w, h, 2); g.fillStyle = '#242c36'; g.fill(); const f = Math.max(0, Math.min(1, v)) * w; if (f > 1) { H.rr(g, x, y, f, h, 2); g.fillStyle = H.lg(g, 0, y, 0, y + h, [[0, c1], [1, c2]]); g.fill(); g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(x + 1, y + 0.6, Math.max(0, f - 2), h * 0.28); } };
  return H;
})();
