/**
 * kit/gpretro.js — Retro rendering for Three.js / WebGL / 2D canvas.
 *
 * Zero dependencies. Exports GLSL shader chunks (strings) and JS helpers.
 * Goal: make modern renderers look like PS1 / N64 / SNES hardware.
 *
 * Sources: N64 RDP behavior, PS1 affine texture mapping, SNES Mode 7,
 * Bayer ordered dithering (standard 4x4 matrix).
 *
 * Usage (Three.js):
 *   import { bayerDither, vertexSnap, affineWarp, lowResTarget } from '../kit/gpretro.js';
 *   // inject bayerDither into your fragment shader before output
 *   // inject vertexSnap at the end of your vertex shader
 *
 * Usage (2D canvas):
 *   import { mode7Ground } from '../kit/gpretro.js';
 *   mode7Ground(canvas, { horizon: 120, cameraHeight: 64 });
 */

// ---------------------------------------------------------------------------
// 4x4 Bayer ordered dithering — reduces 32-bit color to 15-bit RGB555.
// Inject at the end of a fragment shader, operating on gl_FragColor.
// ---------------------------------------------------------------------------
export const bayerDither = /* glsl */`
  // gpretro: 4x4 Bayer ordered dither -> RGB555
  float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
  float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
  vec3 gpretro_dither(vec3 color, vec2 fragCoord) {
    // RGB555: 5 bits per channel = 32 levels
    float levels = 32.0;
    float d = bayer4(fragCoord) - 0.5;
    vec3 q = floor(color * levels + 0.5 + d) / levels;
    return clamp(q, 0.0, 1.0);
  }
`;

// Convenience: full fragment-shader tail that dithers gl_FragColor.
export const bayerDitherTail = /* glsl */`
  gl_FragColor.rgb = gpretro_dither(gl_FragColor.rgb, gl_FragCoord.xy);
`;

// ---------------------------------------------------------------------------
// Vertex snap — truncate clip-space coords to a fixed sub-grid.
// Simulates fixed-point 3D math: vertices jitter like real N64 hardware.
// Inject at the end of a vertex shader, after gl_Position is set.
// ---------------------------------------------------------------------------
export const vertexSnap = /* glsl */`
  // gpretro: vertex snap (fixed-point simulation)
  {
    vec4 snapPos = gl_Position;
    snapPos.xyz = floor(snapPos.xyz * 120.0) / 120.0;
    gl_Position = snapPos;
  }
`;

// ---------------------------------------------------------------------------
// Affine texture warp — omit the perspective divide on UVs.
// Recreates PS1-style "texture swimming" on polygons.
// Use: compute UVs without dividing by w, i.e. pass (uv * w) and sample
// with the raw interpolant instead of the perspective-correct one.
// ---------------------------------------------------------------------------
export const affineWarp = /* glsl */`
  // gpretro: affine UV (no perspective correction)
  // In your vertex shader:
  //   vAffineUv = uv * gl_Position.w;   // scale up by w
  //   vAffineW  = gl_Position.w;
  // In your fragment shader:
  //   vec2 affineUv = vAffineUv / vAffineW; // <- replace with:
  vec2 gpretro_affine(vec2 uvTimesW, float w) {
    // Deliberately skip perspective divide: use screen-space lerp
    return uvTimesW / max(w, 1e-5);
  }
  // TRUE affine (PS1): interpolate uv linearly in screen space.
  // Achieve by declaring 'noperspective' varyings (WebGL2 / GLSL ES 3.0):
  //   noperspective out vec2 vUvAffine;
`;

// ---------------------------------------------------------------------------
// Low-res render target — 320x240 internal framebuffer, nearest-neighbor
// upscale. The single biggest retro win for Three.js.
// ---------------------------------------------------------------------------
export function lowResTarget(renderer, w = 320, h = 240) {
  // renderer: THREE.WebGLRenderer (duck-typed — we only call setSize)
  const canvas = renderer.domElement;
  const prevW = canvas.width;
  const prevH = canvas.height;

  // Render small, display large with pixelated upscale.
  renderer.setSize(w, h, false);
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.imageRendering = 'pixelated';

  return {
    width: w,
    height: h,
    restore() {
      renderer.setSize(prevW, prevH, false);
      canvas.style.imageRendering = '';
    },
  };
}

// ---------------------------------------------------------------------------
// Mode 7 pseudo-3D ground plane — SNES-style, pure 2D canvas.
// Scanline scaling: each horizontal line scales proportionally to its
// distance from the horizon. Zero 3D math required.
//
//   const ground = mode7Ground(canvas, { horizon: 140, cameraHeight: 90 });
//   ground.draw(textureCanvas, { scrollX, scrollY, angle });
// ---------------------------------------------------------------------------
export function mode7Ground(canvas, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const horizon = opts.horizon ?? Math.floor(H * 0.35);
  const cameraHeight = opts.cameraHeight ?? 80;

  // Precompute per-scanline scale: lines near horizon are far (tiny),
  // lines at bottom are near (huge).
  const scales = new Float32Array(H);
  for (let y = horizon; y < H; y++) {
    const dy = y - horizon + 1;
    scales[y] = cameraHeight / dy;
  }

  return {
    horizon,
    cameraHeight,
    /**
     * Draw a Mode 7 plane.
     * @param {HTMLCanvasElement} tex — tileable ground texture
     * @param {object} o — { scrollX, scrollY, angle (radians), fovScale }
     */
    draw(tex, o = {}) {
      const tw = tex.width;
      const th = tex.height;
      const scrollX = o.scrollX ?? 0;
      const scrollY = o.scrollY ?? 0;
      const angle = o.angle ?? 0;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      ctx.clearRect(0, 0, W, horizon);
      for (let y = horizon; y < H; y++) {
        const s = scales[y];
        // Source sampling window shrinks with distance.
        const sw = W / s;
        const sh = 1 / s;
        // Rotate + translate in texture space.
        const cx = W / 2;
        // Sample a 1px-tall strip from the texture, stretched across.
        // Rotation applied around screen center.
        const srcCX = scrollX + cx * cos;
        const srcCY = scrollY + cx * sin;
        const sx = ((srcCX - sw / 2) % tw + tw) % tw;
        const sy = ((srcCY - sh / 2) % th + th) % th;
        ctx.drawImage(tex, sx, sy, Math.min(sw, tw - sx), sh, 0, y, W, 1);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// CRT scanline overlay — cheap post feel for 2D canvas.
// Returns a function that stamps scanlines over the canvas.
// ---------------------------------------------------------------------------
export function scanlines(canvas, opacity = 0.12) {
  const ctx = canvas.getContext('2d');
  const H = canvas.height;
  return function apply() {
    ctx.fillStyle = `rgba(0,0,0,${opacity})`;
    for (let y = 0; y < H; y += 3) {
      ctx.fillRect(0, y, canvas.width, 1);
    }
  };
}

export default {
  bayerDither,
  bayerDitherTail,
  vertexSnap,
  affineWarp,
  lowResTarget,
  mode7Ground,
  scanlines,
};
