// gpfighter.js: Code-driven 2D fighting game pipeline (Neon Alley Brawl architecture)
// ---------------------------------------------------------------------------------------------
// Core capabilities:
// 1. Joint-pose skeletal sprite pipeline: lineR limb segments, black outline pass, directional 3D shading.
// 2. Multi-layer parallax stage generator with 4x4 Bayer dither gradients, skyline, neon glow, and animated crowd.
// 3. Frame-perfect combat engine: active hitboxes, hurtboxes, duck under high punch, jump over low sweep,
//    block, hitstop, screenshake, combo counter, super meter, and instant replay buffer.
// 4. Native 9:16 vertical short mode with title/caption overlay banners for automated video capture.

export const BY = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

export function mkc(w, h) {
  const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!c) return { width: w, height: h, getContext: () => null };
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return c;
}

export function lineR(a, b, width, color) {
  const rects = [];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const half = Math.floor(width / 2);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = Math.round(a[0] + dx * t);
    const y = Math.round(a[1] + dy * t);
    rects.push([x - half, y - half, width, width, color]);
  }
  return rects;
}

export function pz(defaults, overrides = {}) {
  return { ...defaults, ...overrides };
}

/**
 * Directional light shading pass:
 * Pixels with empty left/bottom neighbor darkened by 32% (shadow).
 * Pixels with empty top/right neighbor lightened by 33% (highlight).
 */
export function shadeCanvas(ctx, w, h) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const isSolid = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return false;
    return d[(y * w + x) * 4 + 3] > 40;
  };

  const copy = new Uint8ClampedArray(d);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (copy[idx + 3] <= 40) continue;

      const hasTop = isSolid(x, y - 1);
      const hasRight = isSolid(x + 1, y);
      const hasLeft = isSolid(x - 1, y);
      const hasBottom = isSolid(x, y + 1);

      if (!hasLeft || !hasBottom) {
        // Shadow pass
        d[idx] = Math.round(copy[idx] * 0.68);
        d[idx + 1] = Math.round(copy[idx + 1] * 0.68);
        d[idx + 2] = Math.round(copy[idx + 2] * 0.68);
      } else if (!hasTop || !hasRight) {
        // Highlight pass
        d[idx] = Math.min(255, Math.round(copy[idx] * 1.33));
        d[idx + 1] = Math.min(255, Math.round(copy[idx + 1] * 1.33));
        d[idx + 2] = Math.min(255, Math.round(copy[idx + 2] * 1.33));
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Builds white silhouette hit-flash sprite
 */
export function whitenCanvas(srcCanvas) {
  const c = mkc(srcCanvas.width, srcCanvas.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(srcCanvas, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

/**
 * Multi-ring pixel dithered energy orb sprite
 */
export function buildOrbSprite(colors, radius) {
  const size = radius * 2 + 4;
  const cv = mkc(size, size);
  const ctx = cv.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      if (dist <= radius) {
        const ring = Math.floor((dist / radius) * colors.length);
        const col = colors[Math.min(ring, colors.length - 1)];
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      } else if (dist <= radius + 2) {
        // Checker dither halo
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = colors[colors.length - 1];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }
  return cv;
}
