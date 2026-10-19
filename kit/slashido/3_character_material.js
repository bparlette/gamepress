// Slashers Paradise rendering source, extracted from game/src/render.js + src/chars/hollow.js.
// 3. Character material definitions. toonMat() builds a ShaderMaterial for the toon shader.
//    Shared via hark.site for study. Ported to gamepress kit/slashido/.
import * as THREE from 'three';
import { LIGHT, TOON_VERT, TOON_FRAG } from './1_toon_shader.js';

export function toonMat(opts = {}) {
  const c = (v, d) => new THREE.Color(v !== undefined ? v : d);
  const color = c(opts.color, 0x888888);
  const shade = opts.shade !== undefined ? c(opts.shade) : autoShade(color);
  const u = {
    ...LIGHT,
    uColor: { value: color }, uShade: { value: shade },
    uRimMoon: { value: c(opts.rimMoon, 0x6fd6ff) }, uRimFire: { value: c(opts.rimFire, 0xff8a3a) },
    uRimStr: { value: opts.rim ?? 0.75 }, uEmissive: { value: c(opts.emissive, 0x000000) },
    uBrush: { value: opts.brush ?? 1.0 }, uStain: { value: opts.stain ?? 0 }, uStainScale: { value: opts.stainScale ?? 3.0 },
    uStainCol: { value: c(opts.stainCol, 0x7a0a0e) }, uGrad: { value: opts.grad ?? 0.25 },
    uGradY0: { value: opts.gradY0 ?? 0 }, uGradY1: { value: opts.gradY1 ?? 2.0 }, uSpec: { value: opts.spec ?? 0 },
    uUseVCol: { value: opts.vcol ? 1 : 0 }, uDirt: { value: opts.dirt ?? 0.3 }, uGrain: { value: opts.grain ?? 0 },
  };
  const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: TOON_VERT, fragmentShader: TOON_FRAG, side: opts.side ?? THREE.FrontSide });
  return m;
}
export function autoShade(col) {
  const hsl = {}; col.getHSL(hsl);
  const s = new THREE.Color().setHSL((hsl.h + 0.62) % 1 * 0.25 + hsl.h * 0.75, Math.min(1, hsl.s * 1.1 + 0.08), hsl.l * 0.42);
  return s.lerp(new THREE.Color(0x1c2340), 0.25);
}

// ---- Example: HOLLOW's materials (from src/chars/hollow.js build) ----
export function hollowMaterials() {
  const skin = toonMat({ color: 0xc8b48c, shade: 0x4a4a5e, stain: 0.35, stainScale: 4, dirt: 0.6, rim: 0.85 });
  const denim = toonMat({ color: 0x3f6ea8, shade: 0x1a2340, stain: 0.55, stainScale: 3.2, stainCol: 0x5a0d10, dirt: 0.7, rim: 0.7 });
  const shirt = toonMat({ color: 0xa8382c, shade: 0x3a1430, stain: 0.4, stainCol: 0x3a0606, dirt: 0.8, rim: 0.9 });
  const burlap = toonMat({ color: 0xb7924f, shade: 0x4a3a35, stain: 0.3, stainScale: 5, dirt: 0.9, brush: 1.6, rim: 0.9 });
  const boot = toonMat({ color: 0x5b3a26, shade: 0x1d1418, rim: 0.5 });
  const ink = toonMat({ color: 0x140c0c, shade: 0x050304, rim: 0.0, brush: 0.3 });
  const rope = toonMat({ color: 0x7a5a32, shade: 0x2a1c18, rim: 0.4 });
  const glow = toonMat({ color: 0x000000, shade: 0x000000, emissive: 0xd6ff4a, rim: 0, brush: 0 });
  const steel = toonMat({ color: 0xb9c6d2, shade: 0x3d4656, spec: 1.2, stain: 0.7, stainScale: 3, stainCol: 0x8a0a12, rim: 1.1, brush: 0.6 });
  const handle = toonMat({ color: 0x2a2020, shade: 0x0b0808 });
  return { skin, denim, shirt, burlap, boot, ink, rope, glow, steel, handle };
}
