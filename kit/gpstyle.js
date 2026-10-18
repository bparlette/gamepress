// gpstyle.js — gamepress visual standards. One call sets up the full look.
// Presets extracted from Cherie's favorite games:
//   'cel'        — Cel City (Jet Set Radio: toon bands + ink outlines + halftone)
//   'shellshock' — Shell Shock 3D (night city: Lambert + painted textures + exp fog)
//   'hoa'        — HOA Warfare (daytime suburban: Lambert + real shadows + PICO-8 retro mode)
//   'roadkill'   — Roadkill Rig (source not found; falls back to 'cel')
//
// Usage:
//   import { applyVisualStandard, PALETTES } from './gpstyle.js';
//   applyVisualStandard(scene, camera, renderer, 'cel'); // 'cel' | 'shellshock' | 'hoa' | 'roadkill'
//
// Also exports: makeToonMaterial(), makeOutlineMesh(), INK, etc. for manual use.

import * as THREE from './three.module.min.js';

export const INK = '#14101f';

export const PALETTES = {
  cel: {
    INK: '#14101f', YELLOW: '#ffd23c', PINK: '#ff5fa2', CYAN: '#2fd3ff',
    GREEN: '#5ccf3a', GREEN_DK: '#49b52c', BLUE: '#1f7bff', CREAM: '#fff0d6',
    FOG: '#ffc2d4', HEMI_SKY: '#dfe6ff', HEMI_GND: '#ffd9c9', SUN: '#fff3dc',
  },
  shellshock: {
    FOG: 0x1a1426, MOON: 0x9fb0ff, HEMI_SKY: 0x8a8ac8, HEMI_GND: 0x3a2a30,
    LAMP: 0xffe0a0, ASPHALT: 0x3a3a42, DARK: 0x1e2026,
    FOG_SEWER: 0x0c160c, FOG_SUBWAY: 0x0b0c0e, FOG_INSIDE: 0x141410,
  },
  hoa: {
    SKY: '#5ec4ff', FOG: '#a8dcff',
    HEMI_SKY: '#dff4ff', HEMI_GND: '#6a8d4a', SUN: '#fff3d6',
    MUZZLE: '#ffec27',
  },
};

// --- cel: 3-band toon gradient ---------------------------------------------
let _grad = null;
export function toonGradient() {
  if (_grad) return _grad;
  const v = [0, 0, 0, 0, 120, 120, 255, 255];
  const d = new Uint8Array(v.length * 4);
  v.forEach((x, i) => { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = x; d[i * 4 + 3] = 255; });
  const t = new THREE.DataTexture(d, v.length, 1, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return (_grad = t);
}

// Halftone dot shader injected into toon materials (comic-book shadow dots).
const HALFTONE_GLSL = `
  { float lumD = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
    float lumO = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
    float rr = lumO / max(lumD, 1e-4);
    vec2 hp = gl_FragCoord.xy / uDot;
    hp = vec2(hp.x + hp.y, hp.y - hp.x) * 0.7071;
    float dd = length(fract(hp) - 0.5);
    float shade = smoothstep(0.66, 0.5, rr);
    float rad = 0.36 * shade;
    float dm = 1.0 - smoothstep(rad - 0.05, rad + 0.05, dd);
    outgoingLight *= 1.0 - 0.3 * dm;
    outgoingLight = mix(outgoingLight, outgoingLight * vec3(0.86, 0.84, 1.12), shade * 0.6);
    outgoingLight = mix(outgoingLight, uFlashC, uFlash);
  }
  #include <opaque_fragment>`;

export function makeToonMaterial(opts = {}) {
  const m = new THREE.MeshToonMaterial(
    Object.assign({ gradientMap: toonGradient(), vertexColors: true }, opts)
  );
  m.userData.flash = { value: 0 };
  m.userData.flashC = { value: new THREE.Color(1, 1, 1) };
  const dpr = Math.min(devicePixelRatio || 1, 2);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFlash = m.userData.flash;
    sh.uniforms.uFlashC = m.userData.flashC;
    sh.uniforms.uDot = { value: 5.0 * dpr };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFlash; uniform vec3 uFlashC; uniform float uDot;')
      .replace('#include <opaque_fragment>', HALFTONE_GLSL);
  };
  m.customProgramCacheKey = () => 'gpstyle-toon';
  return m;
}

// --- cel: inverted-hull outline --------------------------------------------
const _outlineMats = {};
export function outlineMaterial(width) {
  const key = width.toFixed(5);
  if (_outlineMats[key]) return _outlineMats[key];
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uW: { value: width },
      uC: { value: new THREE.Color(INK) },
    },
    vertexShader: `
      attribute vec3 odir; uniform float uW; varying float vD;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec3 wd = mat3(modelMatrix) * odir;
        float d = distance(wp.xyz, cameraPosition);
        wp.xyz += wd * uW * clamp(d, 2.5, 36.0);
        vD = d;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform vec3 uC; varying float vD;
      void main() { gl_FragColor = vec4(uC, 1.0); }`,
    side: THREE.BackSide,
  });
  return (_outlineMats[key] = m);
}

// Compute per-vertex mitred outline directions (average of face normals).
export function computeOutlineDirs(geometry) {
  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  const odir = new Float32Array(pos.count * 3);
  const map = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(i);
  }
  const avg = new THREE.Vector3();
  for (const idxs of map.values()) {
    avg.set(0, 0, 0);
    for (const i of idxs) avg.add(new THREE.Vector3(norm.getX(i), norm.getY(i), norm.getZ(i)));
    avg.normalize();
    for (const i of idxs) odir.set([avg.x, avg.y, avg.z], i * 3);
  }
  geometry.setAttribute('odir', new THREE.BufferAttribute(odir, 3));
  return geometry;
}

// Wrap a mesh with an inverted-hull outline. kind: 'char' | 'city' | 'prop'
export function withOutline(mesh, kind = 'char') {
  const w = { char: 0.0042, city: 0.0034, prop: 0.0030 }[kind] || 0.0042;
  computeOutlineDirs(mesh.geometry);
  const outline = new THREE.Mesh(mesh.geometry, outlineMaterial(w));
  outline.raycast = () => {};
  const group = new THREE.Group();
  // Reparent: caller adds `group` instead of `mesh`
  if (mesh.parent) mesh.parent.add(group);
  group.add(mesh);
  group.add(outline);
  return group;
}

// --- shellshock: painted canvas texture -------------------------------------
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function lambert(color, opts = {}) {
  return new THREE.MeshLambertMaterial(Object.assign({ color, vertexColors: false }, opts));
}

// --- main entry -------------------------------------------------------------
export function applyVisualStandard(scene, camera, renderer, preset = 'cel', opts = {}) {
  if (preset === 'roadkill') preset = 'cel'; // not yet studied; fallback

  // Universal: tone mapping, pixel ratio cap
  if (renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  }

  if (preset === 'cel') {
    const P = PALETTES.cel;
    const hemi = new THREE.HemisphereLight(P.HEMI_SKY, P.HEMI_GND, 1.7);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(P.SUN, 1.8);
    const sd = opts.sunDir || [30, 50, 20];
    sun.position.set(sd[0], sd[1], sd[2]);
    scene.add(sun);
    scene.add(sun.target);
    scene.fog = new THREE.Fog(P.FOG, opts.fogNear || 75, opts.fogFar || 210);
    scene.background = new THREE.Color(opts.sky || '#ffd9e8');
    if (camera && !opts.noCamera) {
      camera.fov = 62;
      camera.updateProjectionMatrix();
    }
    return {
      preset: 'cel', palette: P,
      toonMaterial: makeToonMaterial,
      withOutline, INK,
      // Character-friendly defaults
      charOutline: 0.0042, cityOutline: 0.0034, propOutline: 0.0030,
    };
  }

  if (preset === 'shellshock') {
    const P = PALETTES.shellshock;
    const zone = opts.zone || 'street';
    const fogColor = { street: P.FOG, sewer: P.FOG_SEWER, subway: P.FOG_SUBWAY, inside: P.FOG_INSIDE }[zone];
    const hemi = new THREE.HemisphereLight(P.HEMI_SKY, P.HEMI_GND, 1.25);
    scene.add(hemi);
    const moon = new THREE.DirectionalLight(P.MOON, 0.7);
    moon.position.set(-40, 80, 60);
    scene.add(moon);
    scene.add(moon.target);
    // Street-lamp point lights (caller positions them via returned array)
    const lamps = [];
    for (let i = 0; i < (opts.lamps || 6); i++) {
      const L = new THREE.PointLight(0xffffff, 0, 10, 1.6);
      scene.add(L);
      lamps.push(L);
    }
    scene.fog = new THREE.FogExp2(fogColor, opts.fogDensity || 0.0085);
    scene.background = new THREE.Color(fogColor);
    if (camera && !opts.noCamera) {
      camera.fov = 52;
      camera.updateProjectionMatrix();
    }
    return {
      preset: 'shellshock', palette: P, lamps,
      lambert, canvasTexture,
      glowMaterial: (color) => new THREE.MeshBasicMaterial({ color }),
    };
  }

  if (preset === 'hoa') {
    const P = PALETTES.hoa;
    const hemi = new THREE.HemisphereLight(P.HEMI_SKY, P.HEMI_GND, 1.8);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(P.SUN, 2.1);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    const shadowSize = opts.shadowSize || 1024;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    const sc = sun.shadow.camera;
    sc.left = -55; sc.right = 55; sc.top = 55; sc.bottom = -55;
    sc.near = 1; sc.far = 140;
    sun.shadow.bias = -0.0015;
    scene.add(sun);
    scene.add(sun.target);
    // Muzzle-flash light attached to camera (intensity spiked on shot by caller)
    const muzzle = new THREE.PointLight(P.MUZZLE, 0, 15);
    if (camera) camera.add(muzzle);
    scene.fog = new THREE.Fog(P.FOG, opts.fogNear || 55, opts.fogFar || 130);
    scene.background = new THREE.Color(P.SKY);
    if (camera && !opts.noCamera) {
      camera.fov = 75;
      camera.updateProjectionMatrix();
    }
    return {
      preset: 'hoa', palette: P, sun, muzzle,
      lambert,
      // Chunky boxy character proportions from HOA Warfare (total height ~1.8)
      charDims: {
        head: [0.38, 0.40, 0.38], headY: 1.62,
        torso: [0.56, 0.62, 0.30],
        leg: [0.20, 0.72, 0.24], hipX: 0.13,
        shoe: [0.22, 0.10, 0.30],
      },
    };
  }

  throw new Error(`gpstyle: unknown preset "${preset}"`);
}

// Portrait FOV compensation: widen FOV as aspect drops below 1.
export function portraitFov(camera, baseFov, maxFov) {
  const aspect = innerWidth / innerHeight;
  if (aspect >= 1) {
    if (camera.fov !== baseFov) { camera.fov = baseFov; camera.updateProjectionMatrix(); }
    return;
  }
  const fov = Math.min(maxFov,
    2 * Math.atan(Math.tan((baseFov / 2) * Math.PI / 180) / aspect) * 180 / Math.PI);
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
}
