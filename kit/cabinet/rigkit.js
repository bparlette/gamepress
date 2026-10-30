/* rigkit.js: part-based skeletal animation from an SVG atlas (global RIG). Each character = ordered parts drawn in the shared SVG coordinate
   space; a pose rotates/offsets/scales each part about its pivot, so one illustration walks, shambles, recoils and squashes smoothly.
   RIG.def('hero', {scale, anchor:[x,y], order:[...], pivots:{part:[x,y]}, attach:[{key,at:[x,y],scale,to:'arm'}]})
   RIG.draw(g, 'hero', x, y, {flip, sx, sy, pose:{part:{rot,ox,oy,sx,sy}}, a, tint, ta}) draws with the anchor (feet) at logical (x,y). */
const RIG = (() => {
  const R = { img:{}, defs:{}, cv:{} }, SC = 3;
  R.load = atlas => { for (const k in atlas) { const im = new Image(); im.src = atlas[k].url; R.img[k] = { im, w:atlas[k].w, h:atlas[k].h }; } };
  R.def = (name, d) => { R.defs[name] = d; };
  R.ready = name => { const d = R.defs[name]; return !!d && d.order.every(p => R.img[name + '.' + p] && R.img[name + '.' + p].im.complete && R.img[name + '.' + p].im.naturalWidth); };
  const prep = (key, scale) => { if (R.cv[key]) return R.cv[key]; const a = R.img[key]; if (!a || !a.im.complete || !a.im.naturalWidth) return null;
    const tw = Math.max(2, Math.round(a.w * scale * SC * 2)), th = Math.max(2, Math.round(a.h * scale * SC * 2)); let src = a.im, w = a.im.naturalWidth, h = a.im.naturalHeight;
    while (w / 2 > tw) { const c = document.createElement('canvas'); c.width = w = Math.ceil(w / 2); c.height = h = Math.ceil(h / 2); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, w, h); src = c; }
    const c = document.createElement('canvas'); c.width = tw; c.height = th; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, tw, th); return (R.cv[key] = c); };
  R.draw = (g, name, X, Y, o = {}) => { const d = R.defs[name]; if (!d) return false; const pose = o.pose || {}, sc = d.scale;
    g.save(); g.translate(X, Y); g.scale((o.flip ? -1 : 1) * (o.sx || 1), o.sy || 1); g.scale(sc, sc); g.translate(-d.anchor[0], -d.anchor[1]); if (o.a !== undefined) g.globalAlpha = o.a;
    const put = (key, p, w, h, at, as) => { const c = prep(key, sc * (as || 1)); if (!c) return; g.save(); const pv = d.pivots[p] || [0, 0], q = pose[p] || {};
      g.translate(pv[0] + (q.ox || 0), pv[1] + (q.oy || 0)); g.rotate(q.rot || 0); g.scale(q.sx || 1, q.sy || 1); g.translate(-pv[0], -pv[1]);
      if (at) { g.translate(at[0], at[1]); g.scale(as || 1, as || 1); } g.drawImage(c, 0, 0, w, h);
      if (o.tint && o.ta > 0) { g.globalAlpha = (o.a === undefined ? 1 : o.a) * o.ta; g.drawImage(HD.tinted(c, o.tint), 0, 0, w, h); } g.restore(); };
    for (const p of d.order) { const a = R.img[name + '.' + p]; if (a) put(name + '.' + p, p, a.w, a.h); for (const at of d.attach || []) if (at.to === p) { const b = R.img[at.key]; if (b) put(at.key, p, b.w, b.h, at.at, at.scale); } }
    g.restore(); return true; };
  if (typeof window !== 'undefined' && window.ATLAS) R.load(window.ATLAS);
  return R;
})();
