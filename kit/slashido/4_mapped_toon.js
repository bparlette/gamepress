// Gamepress glue: texture-mapped variant of the SLASHIDO toon shader.
// Our gpchar fighters carry painted canvas textures (face, gi collar, hakama
// pleats, skin grain). The base toonMat() is untextured, so this extends the
// same TOON_VERT/TOON_FRAG with a uMap sampler. New file — slashido sources
// untouched.
import * as THREE from 'three';
import { TOON_VERT, TOON_FRAG } from './1_toon_shader.js';
import { toonMat } from './3_character_material.js';

const VERT = TOON_VERT
  .replace(
    'varying vec3 vW; varying vec3 vN; varying vec3 vO; varying vec3 vCol;',
    'varying vec3 vW; varying vec3 vN; varying vec3 vO; varying vec3 vCol; varying vec2 vUv;'
  )
  .replace(
    'vCol = mix(vec3(1.0), color, uUseVCol);',
    'vCol = mix(vec3(1.0), color, uUseVCol);\n  vUv = uv;'
  );

const FRAG = TOON_FRAG
  .replace(
    'varying vec3 vW; varying vec3 vN; varying vec3 vO; varying vec3 vCol;',
    'varying vec3 vW; varying vec3 vN; varying vec3 vO; varying vec3 vCol; varying vec2 vUv;\nuniform sampler2D uMap;'
  )
  .replace(
    'vec3 base = uColor * vCol;',
    'vec3 base = uColor * vCol * texture2D(uMap, vUv).rgb;'
  );

if (!VERT.includes('vUv = uv;') || !FRAG.includes('texture2D(uMap, vUv)')) {
  throw new Error('4_mapped_toon: shader patch did not apply — upstream TOON shader changed');
}

/** toonMat with a canvas texture map (for painted faces, gi, hakama). */
export function mappedToonMat(tex, opts = {}) {
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = toonMat({ ...opts, color: 0xffffff });
  m.vertexShader = VERT;
  m.fragmentShader = FRAG;
  m.uniforms.uMap = { value: tex };
  m.needsUpdate = true;
  return m;
}
