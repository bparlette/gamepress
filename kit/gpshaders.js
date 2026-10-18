/**
 * kit/gpshaders.js — Retro screen-space effects for Three.js materials.
 *
 * Zero dependencies. Works with any built-in Three.js material
 * (MeshStandardMaterial, MeshToonMaterial, MeshBasicMaterial, ...).
 *
 * Unlike kit/gpretro.js (raw GLSL chunks you inject by hand), this file
 * gives you ready-to-use JS wrappers: pass a material, get the effect.
 * All wrappers compose — call any combination on the same material.
 *
 * Usage:
 *   import { applyRetro, vertexJitter, bayerDither, scanlines } from '../_vendor/gpshaders.js';
 *   const mat = new THREE.MeshStandardMaterial({ color: 0xff5533 });
 *   applyRetro(mat, { jitter: 160, dither: true, scanlines: true });
 *   const mesh = new THREE.Mesh(geo, mat);
 *
 * Demo-stage tool: cheap, high-impact visual polish for viral clips.
 * For full games the same calls carry through unchanged.
 */

// ---------------------------------------------------------------------------
// Internal: chain onBeforeCompile so wrappers compose instead of overwriting.
// ---------------------------------------------------------------------------
function chainOnBeforeCompile(material, fn, key) {
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev.call(material, shader, renderer);
    fn(shader, renderer);
  };
  material.customProgramCacheKey = () => (typeof prevKey === 'function' ? prevKey() + '|' : '') + key;
  return material;
}

// ---------------------------------------------------------------------------
// vertexJitter(material, intensity=160)
// Truncates clip-space vertex positions to a fixed sub-grid, simulating
// 16-bit integer fixed-point math. Vertices wobble like real N64 hardware.
// Higher intensity = finer grid = subtler jitter. PS1/N64 range: 120-240.
// ---------------------------------------------------------------------------
export function vertexJitter(material, intensity = 160) {
  const n = Math.max(1, Math.round(intensity));
  return chainOnBeforeCompile(material, (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      // gpshaders: vertex jitter (16-bit fixed-point simulation)
      { vec4 _jp = gl_Position; _jp.xyz = floor(_jp.xyz * ${n}.0) / ${n}.0; gl_Position = _jp; }`
    );
  }, 'gpshaders-jitter-' + n);
}

// ---------------------------------------------------------------------------
// bayerDither(material)
// 4x4 Bayer ordered dither clamping output to 15-bit RGB555 (32 levels per
// channel). Injects before the dithering_fragment chunk so it composes with
// Three.js's own dithering. The authentic SNES/PS1 color-quantization look.
// ---------------------------------------------------------------------------
export function bayerDither(material) {
  return chainOnBeforeCompile(material, (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
      // gpshaders: 4x4 Bayer matrix -> RGB555
      float _bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
      float _bayer4(vec2 a) { return _bayer2(0.5 * a) * 0.25 + _bayer2(a); }
      vec3 _dither555(vec3 c, vec2 fc) {
        float d = _bayer4(fc) - 0.5;
        return clamp(floor(c * 32.0 + 0.5 + d) / 32.0, 0.0, 1.0);
      }`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
      gl_FragColor.rgb = _dither555(gl_FragColor.rgb, gl_FragCoord.xy);`);
  }, 'gpshaders-dither');
}

// ---------------------------------------------------------------------------
// scanlines(material, { darkness=0.18, gap=3 })
// CRT scanline overlay: darkens every `gap`-th pixel row by `darkness`.
// Cheap, reads instantly as "retro" in a 9:16 clip thumbnail.
// ---------------------------------------------------------------------------
export function scanlines(material, { darkness = 0.18, gap = 3 } = {}) {
  const d = Math.min(0.9, Math.max(0, darkness));
  const g = Math.max(2, Math.round(gap));
  return chainOnBeforeCompile(material, (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
      // gpshaders: CRT scanlines
      { float _sl = step(fract(gl_FragCoord.y / ${g}.0), ${(1 / g).toFixed(3)});
        gl_FragColor.rgb *= 1.0 - ${d.toFixed(3)} * _sl; }`
    );
  }, `gpshaders-scanlines-${d}-${g}`);
}

// ---------------------------------------------------------------------------
// applyRetro(material, { jitter=160, dither=true, scanlines=true })
// Convenience wrapper: applies any combination in one call.
// Pass false/null to skip an effect.
// ---------------------------------------------------------------------------
export function applyRetro(material, { jitter = 160, dither = true, scanlines: sl = true } = {}) {
  if (jitter) vertexJitter(material, jitter);
  if (dither) bayerDither(material);
  if (sl) scanlines(material, typeof sl === 'object' ? sl : {});
  return material;
}

// ---------------------------------------------------------------------------
// applyRetroAll(scene, opts)
// Applies applyRetro to every material in a scene/object subtree.
// Useful for the demo stage: one call, whole scene goes retro.
// ---------------------------------------------------------------------------
export function applyRetroAll(root, opts) {
  const seen = new Set();
  root.traverse((obj) => {
    const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
    for (const m of mats) {
      if (!seen.has(m)) { seen.add(m); applyRetro(m, opts); }
    }
  });
  return root;
}
