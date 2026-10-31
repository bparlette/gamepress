/* ===== PRIG: native 8-bit character rig. Draws a soldier / zombie FRESH EVERY FRAME from a skeleton into the cabinet buffer: no sprite assets, unlimited poses.
   PRIG.draw(kind, var, pose, x, y, face, ph, opts)   x,y = feet on screen (buffer px), face +1/-1, ph = walk phase (radians), opts {sc: height px (default 40), flash: 0..1 white hit flash}
   kind 'soldier' poses: walk aim down | 'zombie' poses: walk attack hit down     var (zombie): 'green' 'grey' 'yellow'
   All colours are cabinet palette indices (ramps = [dark, base, light]); lit from the upper-left with checker dither between ramp steps; 1 px black outline per figure.
   Ported from the four-style stills experiment (art/stills4); ?PRIG.skel(kind,pose,ph) gives the joints if a game wants hit boxes / muzzle point. ===== */
const PRIG = (() => {
  const RAMP = { cloth:[F, GR, E], vest:[DG, D, L], skin:[T, S, O], helm:[DG, F, GR], gun:[K, DG, D], boot:[K, M, T], pack:[K, M, BRK],
    green:[F, GR, E], grey:[DG, D, L], yellow:[T, Y, V], shirt:[M, BRK, O], pants:[N, B, SKY], hair:[K, K, DG], mouth:[K, M, R], teeth:[L, V, W], eye:[Y, V, V] };
  const rad = d => d * Math.PI / 180;
  const limb = (r, a1, l1, a2, l2) => { const m = [r[0] + l1 * Math.sin(rad(a1)), r[1] - l1 * Math.cos(rad(a1))]; return [m, [m[0] + l2 * Math.sin(rad(a2)), m[1] - l2 * Math.cos(rad(a2))]]; };
  /* skeleton in local units (150 = figure height), +x forward, y up, feet at 0 */
  function skel(kind, pose, ph) {
    ph = ph || 0; const sol = kind === 'soldier', J = {}; let lean, hipy, ta, tb;
    if (pose === 'walk') { const s = Math.sin(ph), c = Math.cos(ph); lean = sol ? 3 : 24; hipy = (sol ? 66 : 62) - 2.5 * Math.abs(s); ta = [(sol ? 26 : 22) * s, -10 + 34 * Math.max(0, c) * 0.5 - 2]; tb = [-(sol ? 26 : 16) * s, -10 + 34 * Math.max(0, -c) * 0.5 - 2]; }
    else if (pose === 'aim') { lean = -4; hipy = 66; ta = [8, 6]; tb = [-6, -2]; }
    else if (pose === 'attack') { lean = 34; hipy = 58; ta = [24, 4]; tb = [-14, -20]; }
    else if (pose === 'hit') { lean = -6; hipy = 62; ta = [2, 0]; tb = [-8, 0]; }
    else { lean = 0; hipy = 66; ta = [4, 0]; tb = [-5, 0]; }
    J.hip = [0, hipy]; const tl = sol ? 46 : 42, hl = lean + (sol ? 0 : 14), hd = sol ? 20 : 16;
    J.sh = [J.hip[0] + tl * Math.sin(rad(lean)), J.hip[1] + tl * Math.cos(rad(lean))]; J.head = [J.sh[0] + hd * Math.sin(rad(hl)), J.sh[1] + hd * Math.cos(rad(hl))];
    [J.kneeA, J.footA] = limb(J.hip, ta[0], 33, ta[1], 33); [J.kneeB, J.footB] = limb(J.hip, tb[0], 33, tb[1], 33);
    if (sol && pose === 'walk') { const s = Math.sin(ph); [J.kneeA, J.footA] = limb(J.hip, 26 * s, 33, 26 * s - 32 * Math.max(0, -s) , 33); [J.kneeB, J.footB] = limb(J.hip, -26 * s, 33, -26 * s - 32 * Math.max(0, s), 33); }
    if (sol && pose === 'aim') { J.handA = [J.sh[0] + 40, J.sh[1] - 5]; J.elbA = [J.sh[0] + 20, J.sh[1] - 16]; J.handB = [J.sh[0] + 6, J.sh[1] - 2]; J.elbB = [J.sh[0] - 6, J.sh[1] - 20]; }
    else if (sol && pose === 'walk') { J.handA = [J.sh[0] + 30, J.sh[1] - 40]; J.elbA = [J.sh[0] + 14, J.sh[1] - 26]; J.handB = [J.sh[0] + 8, J.sh[1] - 42]; J.elbB = [J.sh[0] - 6, J.sh[1] - 28]; }
    else if (sol) { [J.elbA, J.handA] = limb(J.sh, 20, 27, 40, 26); [J.elbB, J.handB] = limb(J.sh, -30, 27, -20, 26); }
    else { const A = { walk:[70, 80, 52, 76], attack:[74, 40, 60, 60], hit:[-30, -50, 10, 30], down:[0, 0, 0, 0] }[pose] || [70, 80, 52, 76]; const bob = pose === 'walk' ? 6 * Math.sin(ph) : 0;
      [J.elbA, J.handA] = limb(J.sh, A[0] + bob, 27, A[0] + 16 + bob, 26); [J.elbB, J.handB] = limb(J.sh, A[2], 27, A[2] + 28, 26); }
    J.lying = sol && pose === 'down';
    let low = Math.min(J.footA[1], J.footB[1]); for (const k in J) if (k !== 'lying') J[k] = [J[k][0], J[k][1] - low];
    if (sol) { const a = J.handB, b = J.handA; let dx = b[0] - a[0], dy = b[1] - a[1]; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n; J.stock = [a[0] - dx * 14, a[1] - dy * 14]; const e = pose === 'aim' ? 46 : 30; J.muzzle = [b[0] + dx * e, b[1] + dy * e]; }
    if (J.lying) { const c = J.hip; for (const k in J) if (k !== 'lying') { const x = J[k][0] - c[0], y = J[k][1] - c[1]; J[k] = [c[0] - y, c[1] + x]; }
      const my = (J.hip[1] + J.sh[1] + J.head[1] + J.footA[1] + J.footB[1]) / 5; for (const k in J) if (k !== 'lying') J[k] = [J[k][0] - 4, J[k][1] - my + 12];
      J.elbA = [J.sh[0] + 18, 8]; J.handA = [J.sh[0] + 36, 5]; J.elbB = [J.sh[0] - 6, 22]; J.handB = [J.sh[0] + 4, 30]; J.stock = [J.hip[0] + 40, 3]; J.muzzle = [J.hip[0] + 120, 5]; }
    return J;
  }
  /* scratch layer: palette index per pixel, -1 = empty; figure is drawn here, outlined, then blitted */
  const SW = 112, SH = 72, lay = new Int16Array(SW * SH); let ox = 0, oy = 0;
  const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < SW && y < SH) lay[y * SW + x] = c; };
  /* capsule: per-pixel shade from the signed distance across the limb (upper-left lit) */
  function cap(a, b, w1, w2, ramp, flat) {
    const x0 = Math.floor(Math.min(a[0] - w1, b[0] - w2)), x1 = Math.ceil(Math.max(a[0] + w1, b[0] + w2)), y0 = Math.floor(Math.min(a[1] - w1, b[1] - w2)), y1 = Math.ceil(Math.max(a[1] + w1, b[1] + w2));
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      let t = ((x - a[0]) * dx + (y - a[1]) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t; const cx = a[0] + dx * t, cy = a[1] + dy * t, w = w1 + (w2 - w1) * t, d = Math.hypot(x - cx, y - cy);
      if (d > w) continue; const s = ((x - cx) * -0.7 + (y - cy) * -0.7) / (w || 1);    // -1 lit .. +1 shadow
      let i = 1; if (!flat) { if (s < -0.45) i = 2; else if (s < -0.2 && (x + y) % 2 === 0) i = 2; else if (s > 0.5) i = 0; else if (s > 0.25 && (x + y) % 2 === 0) i = 0; }
      put(x, y, ramp[i]);
    }
  }
  function poly(pts, ramp, flat) {
    let y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); }
    for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if (((a[1] > y) !== (b[1] > y)) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; }
      if (!ins) continue; const s = ((x - x0) / (x1 - x0 || 1) + (y - y0) / (y1 - y0 || 1)) - 1; put(x, y, ramp[flat ? 1 : s < -0.55 ? 2 : s > 0.55 ? 0 : 1]); }
  }
  const quad = (a, b, w1, w2) => { const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1, nx = -dy / n, ny = dx / n; return [[a[0] + nx * w1, a[1] + ny * w1], [b[0] + nx * w2, b[1] + ny * w2], [b[0] - nx * w2, b[1] - ny * w2], [a[0] - nx * w1, a[1] - ny * w1]]; };
  function draw(kind, vr, pose, x, y, face, ph, o) {
    o = o || {}; const hpx = o.sc || 40, k = hpx / 150, sol = kind === 'soldier', J = skel(kind, pose, ph), R = RAMP, vk = vr || 'green';
    const cx = SW / 2, cy = SH - 8; lay.fill(-1);
    const P = n => [cx + face * J[n][0] * k, cy - J[n][1] * k]; const S = {}; for (const n in J) if (n !== 'lying') S[n] = P(n);
    const f = (dx, dy, b) => [b[0] + face * dx * k, b[1] + dy * k], w = v => Math.max(1, v * k);
    const C = (a, b, w1, w2, r, fl) => cap(a, b, w(w1), w(w2), R[r] || r, fl);
    if (sol) {
      C(S.sh, S.elbB, 6, 5, 'cloth'); C(S.elbB, S.handB, 5, 4, 'cloth'); C(S.hip, S.kneeB, 7, 6, 'cloth'); C(S.kneeB, S.footB, 6, 5, 'cloth'); C(S.footB, f(12, 0, S.footB), 4, 5, 'boot');
      poly(J.lying ? quad(f(0, 4, S.hip), f(0, 4, S.sh), 9 * k, 11 * k) : quad(f(-4, 0, S.hip), f(-4, 0, S.sh), 12 * k, 13 * k), R.pack);
      poly(quad(S.hip, S.sh, 11 * k, 12 * k), R.cloth); poly(quad(S.hip, S.sh, 8 * k, 11 * k), R.vest);
      C(S.hip, S.kneeA, 7, 6.5, 'cloth'); C(S.kneeA, S.footA, 6.5, 5.5, 'cloth'); C(S.footA, f(12, 0, S.footA), 4, 5, 'boot');
      C(f(0, 7, S.head), S.sh, 4, 5, 'skin'); cap(S.head, S.head, w(12), w(12), R.skin); const hd = S.head;
      poly([f(-13, -2, hd), f(-8, -14, hd), f(8, -14, hd), f(13, -2, hd), f(14, 1, hd), f(-13, 1, hd)], R.helm); C(f(2, -1, hd), f(16, 1, hd), 2, 2, 'helm', true); put(f(6, 3, hd)[0], f(6, 3, hd)[1], K);
      C(S.stock, S.muzzle, 3.5, 2.5, 'gun'); C(S.sh, S.elbA, 6.5, 5.5, 'cloth'); C(S.elbA, S.handA, 5.5, 4.5, 'cloth'); cap(S.handA, S.handA, w(4.5), w(4.5), R.skin); cap(S.handB, S.handB, w(4), w(4), R.skin);
    } else {
      const sk = R[vk]; C(S.sh, S.elbB, 5, 4, sk); C(S.elbB, S.handB, 4, 3.5, sk); C(S.hip, S.kneeB, 7, 6, 'pants'); C(S.kneeB, S.footB, 6, 4, sk); C(S.footB, f(10, 0, S.footB), 3.5, 4, sk);
      poly(quad(S.hip, S.sh, 10 * k, 12 * k), R.shirt); poly([f(-9, 0, S.hip), f(-12, 12, S.hip), f(-4, 8, S.hip), f(0, 16, S.hip), f(5, 8, S.hip), f(10, 14, S.hip), f(10, 0, S.hip)], R.shirt, true);
      C(S.hip, S.kneeA, 7, 6.5, 'pants'); C(S.kneeA, S.footA, 6.5, 5, 'pants'); C(S.footA, f(11, 0, S.footA), 4, 5, 'pants');
      const hd = S.head; C(f(0, 6, hd), S.sh, 4.5, 5.5, sk); cap(hd, hd, w(13), w(13), sk);
      poly([f(-15, 4, hd), f(-13, -12, hd), f(-2, -17, hd), f(8, -13, hd), f(2, -6, hd), f(-6, -4, hd), f(-10, 6, hd)], R.hair, true);
      poly([f(3, 4, hd), f(12, 3, hd), f(11, 11, hd), f(4, 12, hd)], R.mouth, true); put(f(5, 4, hd)[0], f(5, 5, hd)[1], W); put(f(9, 4, hd)[0], f(9, 5, hd)[1], W);
      cap(f(3, -3, hd), f(3, -3, hd), w(3), w(3), R.hair, true); put(f(8, -4, hd)[0], f(8, -4, hd)[1], Y);
      C(S.sh, S.elbA, 5.5, 4.5, sk); C(S.elbA, S.handA, 4.5, 3.5, sk); cap(S.handA, S.handA, w(4.5), w(4.5), R[vk]);
    }
    for (let yy = 0; yy < SH; yy++) for (let xx = 0; xx < SW; xx++) { const c = lay[yy * SW + xx]; if (c >= 0) continue;
      if ((xx > 0 && lay[yy * SW + xx - 1] >= 0 && lay[yy * SW + xx - 1] !== 99) || (xx < SW - 1 && lay[yy * SW + xx + 1] >= 0 && lay[yy * SW + xx + 1] !== 99) || (yy > 0 && lay[(yy - 1) * SW + xx] >= 0 && lay[(yy - 1) * SW + xx] !== 99) || (yy < SH - 1 && lay[(yy + 1) * SW + xx] >= 0 && lay[(yy + 1) * SW + xx] !== 99)) lay[yy * SW + xx] = 99; }
    const fl = o.flash > 0;
    for (let yy = 0; yy < SH; yy++) for (let xx = 0; xx < SW; xx++) { const c = lay[yy * SW + xx]; if (c < 0) continue; px(Math.round(x) + xx - cx, Math.round(y) + yy - cy, c === 99 ? K : (fl ? W : c)); }
    const m = S.muzzle; return { muzzle: m ? [Math.round(x) + m[0] - cx, Math.round(y) + m[1] - cy] : null, head: [Math.round(x) + S.head[0] - cx, Math.round(y) + S.head[1] - cy], chest: [Math.round(x) + S.sh[0] - cx, Math.round(y) + S.sh[1] - cy + 4] };
  }
  return { draw, skel };
})();
