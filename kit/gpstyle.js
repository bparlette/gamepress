// gpstyle.js — gamepress visual standards. One call sets up the full look.
// Presets extracted from Cherie's favorite games:
//   'cel'            — Cel City (Jet Set Radio: toon bands + ink outlines + halftone)
//   'shellshock'     — Shell Shock 3D (night city: Lambert + painted textures + exp fog)
//   'hoa'            — HOA Warfare (daytime suburban: Lambert + real shadows + PICO-8 retro mode)
//   'roadkill'       — Roadkill Rig (desert wasteland: warm toon + halftone + inverted-hull outlines + gradient sky dome)
//   'shellshock-live'— Shell Shock Live (2D painted brawler: exposure grade + additive glow lights + weather)
//   'shellshock-16bit'— Shell Shock 16-bit (2D pixel art: 384x224 internal res + CRT overlay + skyline layers)
//   'crystal-cave'   — Crystal Cave (2.5D side-scroller: dark cave + emissive crystals + additive glow bloom)
//
// Usage:
//   import { applyVisualStandard, PALETTES } from './gpstyle.js';
//   applyVisualStandard(scene, camera, renderer, 'cel'); // 'cel' | 'shellshock' | 'hoa' | 'roadkill' | 'shellshock-live' | 'shellshock-16bit' | 'crystal-cave'
//   // 2D games use the 'shellshock-live' / 'shellshock-16bit' presets (no scene/camera/renderer needed):
//   const style = applyVisualStandard(null, null, null, 'shellshock-16bit');
//
// Also exports: makeToonMaterial(), makeOutlineMesh(), makeSkyDome(), INK, makeGlowSystem(), etc. for manual use.

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
  // Roadkill Rig (desert wasteland racer). Exact values from source.
  roadkill: {
    INK: '#1a0f12', CREAM: '#fff4dc',
    HEMI_SKY: '#ffe9cf', HEMI_GND: '#c9876a', SUN: '#fff1d6',
    FOG: '#f6c99a',
    SKY_TOP: '#47a7e0', SKY_HORIZON: '#ffd9a6',
    YELLOW: '#ffcf2e', RED: '#e8312a', PINK: '#ff4fd8', GREEN: '#7dffb0',
    SAND: '#ecb47c', SAND2: '#dc9a66', FLAT: '#f4cf98',
    RUST: '#bd6644', DEEP: '#a4523b', BERM: '#d98557',
    ROAD_DASH: '#fff2c8',
  },
  'shellshock-live': {
    BOOM: '#ff9a2a', SPARK: '#fff2c0', SPARK_CYAN: '#7fdcff',
    MUZZLE: '#ffb050', RING: '#fff0a0', CLINK: '#bfe4ff', NEON: '#ff7a1a',
    RAIN: 'rgba(170,190,255,0.35)', SNOW: '#eef4ff',
    SKY_TOP: '#141428', SKY_BOTTOM: '#2a2a3a', GROUND: '#2e2a30',
    BG_EXPOSE: 'brightness(1.3) contrast(1.05)',
    SPRITE_EXPOSE: 'brightness(1.28) contrast(1.08)',
  },
  // Shell Shock 16-bit (2D pixel art). Exact values from source.
  'shellshock-16bit': {
    // Internal render resolution (Sega Genesis). Canvas stays 384x224; CSS scales up.
    RES_W: 384, RES_H: 224,
    IMAGE_RENDERING: 'pixelated',
    // Skyline: two layers, far then near. [color, baseY, hMin, hVar]
    SKY_FAR: '#161a38', SKY_FAR_BASE: 112, SKY_FAR_HMIN: 30, SKY_FAR_HVAR: 50,
    SKY_NEAR: '#0a0b18', SKY_NEAR_BASE: 136, SKY_NEAR_HMIN: 20, SKY_NEAR_HVAR: 50,
    WINDOW: '#ffd27a', // near-layer lit windows, 2x3 px on a 6x7 px grid
    // Neon level glows (same additive-light engine as shellshock-live)
    NEON: '#ff7a1a', NEON_R: 70, NEON_A: 0.30, NEON_FLICKER: 0.25,
    // Core palette (most-used hex colors from source)
    YELLOW: '#ffe060', YELLOW_WARM: '#ffd27a', RED: '#e8302a', RED_HOT: '#ff4a3a',
    ORANGE: '#ff8c1a', GREEN: '#7fd85a', GREEN_DK: '#3fae3a', CYAN: '#7fdcff',
    GREY: '#c8ccd6', GREY_DK: '#9aa3ad', INK: '#05040a', INK_BLUE: '#10101c',
    PURPLE_DK: '#1a0e2c', BROWN: '#8a5a2a',
    // Hit feedback
    SHAKE_MAX: 6, ZOOM_PUNCH: 1.03,
  },
  // Crystal Cave (2.5D side-scroller: dark cave + emissive crystals + bloom glow). Exact values from source.
  'crystal-cave': {
    BG: '#030816',        // page/canvas background — near-black blue
    TEXT: '#eaf6ff',      // pale ice (body text, HUD numbers)
    CYAN: '#7ff0ff',      // crystal cyan (light)
    CYAN_DK: '#38e8ff',   // primary action cyan (buttons, links)
    PINK: '#ff8ae8',      // crystal magenta (light)
    PINK_DK: '#ff5ad8',   // primary action magenta (big touch button)
    HEART: '#ff4f8b',     // health hearts
    GOLD_LT: '#fff3b0',   // coin highlight
    GOLD: '#ffc93a',      // coin
    GOLD_DK: '#c47d12',   // coin shadow
    HEMI_SKY: '#1a2b55',  // faint blue ambient (top)
    HEMI_GND: '#05070f',  // near-black ground bounce
    ROCK: '#0d1526',      // cave rock
    PILL_BG: 'rgba(6,14,40,.55)',
    PILL_BORDER: 'rgba(120,220,255,.35)',
    BTN_TEXT: '#06112c',  // dark text on gradient buttons
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
export function outlineMaterial(width, color = INK) {
  const key = width.toFixed(5) + '|' + color;
  if (_outlineMats[key]) return _outlineMats[key];
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uW: { value: width },
      uC: { value: new THREE.Color(color) },
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

// --- shellshock-live: 2D additive glow lights --------------------------------
// Mirrors Shell Shock Live's lighting: an offscreen buffer at 1/4 resolution,
// radial glow sprites stamped with 'lighter' composite, then drawn back over
// the scene with additive blending. Exact values from the source.
const _glowSprites = {};
function glowSprite(color) {
  if (_glowSprites[color]) return _glowSprites[color];
  const s = document.createElement('canvas');
  s.width = s.height = 32;
  const g = s.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, color);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  return (_glowSprites[color] = s);
}

export function makeGlowSystem(w, h, opts = {}) {
  const P = PALETTES['shellshock-live'];
  const div = opts.divisor || 4; // buffer at 1/div resolution (4 = source behavior)
  const bw = Math.ceil(w / div), bh = Math.ceil(h / div);
  const buf = document.createElement('canvas');
  buf.width = bw; buf.height = bh;
  const g = buf.getContext('2d');
  const list = [];
  const max = opts.maxLights || 48;
  return {
    // Light kinds from the source: boom/spark/wspark/ring/clink/muzzle/neon
    light(x, y, r, color, alpha) {
      if (list.length < max) list.push({ x, y, r, color, alpha });
    },
    boom(x, y, k) { this.light(x, y, 70 * Math.min(1, k * 3 + 0.4), P.BOOM, 0.95 * (1 - k)); },
    spark(x, y, k, big, cyan) { this.light(x, y, big ? 30 : 18, cyan ? P.SPARK_CYAN : P.SPARK, (big ? 0.7 : 0.45) * (1 - k)); },
    muzzle(x, y, k) { this.light(x, y, 36, P.MUZZLE, 0.6 * (1 - k)); },
    ring(x, y, k) { this.light(x, y, 50, P.RING, 0.5 * (1 - k)); },
    neon(x, y, r, flicker) { this.light(x, y, r, P.NEON, 0.30 * (flicker == null ? 1 : flicker)); },
    // Stamp all lights into the buffer and composite over the main ctx.
    draw(ctx, gain) {
      if (!list.length) return;
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, bw, bh);
      g.globalCompositeOperation = 'lighter';
      for (const L of list) {
        const r = L.r / div;
        g.globalAlpha = Math.min(1, L.alpha);
        g.drawImage(glowSprite(L.color), L.x / div - r, L.y / div - r, r * 2, r * 2);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = gain == null ? 1 : gain;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(buf, 0, 0, w, h);
      ctx.restore();
      list.length = 0;
    },
    clear() { list.length = 0; },
  };
}

// Weather particles (Shell Shock Live values: 70 rain drops, 60 snow flakes).
export function makeWeather(kind) {
  const P = PALETTES['shellshock-live'];
  return { kind, count: kind === 'rain' ? 70 : 60, color: kind === 'rain' ? P.RAIN : P.SNOW };
}

// --- roadkill: gradient sky dome with sun glow --------------------------------
export function makeSkyDome(palette) {
  const P = palette || PALETTES.roadkill;
  const uniforms = {
    uTop: { value: new THREE.Color(P.SKY_TOP) },
    uHor: { value: new THREE.Color(P.SKY_HORIZON) },
    uSun: { value: new THREE.Vector3(-0.55, 1.35, 0.5).normalize() },
    uRed: { value: 0 }, // raise toward 1 for danger/boss tint
  };
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(800, 32, 16),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSun; uniform float uRed; varying vec3 vP;
        void main(){ float y = max(vP.y, 0.0);
          vec3 top = mix(uTop, vec3(0.42,0.12,0.16), uRed); vec3 hor = mix(uHor, vec3(1.0,0.45,0.28), uRed);
          vec3 c = mix(hor, top, pow(smoothstep(0.0, 0.55, y), 0.8));
          float s = max(dot(normalize(vP), normalize(uSun)), 0.0);
          c += vec3(1.0, 0.85, 0.6) * pow(s, 220.0) * 1.2;
          c += vec3(1.0, 0.75, 0.45) * pow(s, 8.0) * 0.25;
          gl_FragColor = vec4(c, 1.0); }`,
    })
  );
  m.frustumCulled = false;
  return { mesh: m, uniforms };
}

// --- crystal-cave: emissive crystals + additive glow halos --------------------
// The bloom-glowing cave look: emissive crystal geometry plus cheap additive
// sprites standing in for post-processing bloom. Source: Crystal Cave 2.5D.
const _glowTex3D = {};
function glowTexture3D(color) {
  if (_glowTex3D[color]) return _glowTex3D[color];
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, color);
  gr.addColorStop(0.35, color);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return (_glowTex3D[color] = t);
}

// Additive halo sprite for a glow source (crystal, coin, muzzle). Cheap bloom.
export function makeGlowSprite3D(color, size, opacity = 0.55) {
  const m = new THREE.SpriteMaterial({
    map: glowTexture3D(color),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity,
  });
  const s = new THREE.Sprite(m);
  s.scale.set(size, size, 1);
  return s;
}

// Emissive crystal cluster: 3-5 octahedron shards around a base point.
// color: '#7ff0ff' (cyan) or '#ff8ae8' (pink) from the crystal-cave palette.
export function makeCrystal(size, color, opts = {}) {
  const P = PALETTES['crystal-cave'];
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.35),
    emissive: new THREE.Color(color),
    emissiveIntensity: opts.emissiveIntensity || 2.5,
    roughness: 0.25,
    metalness: 0.1,
    flatShading: true,
  });
  const shards = opts.shards || (3 + Math.floor(Math.random() * 3));
  for (let i = 0; i < shards; i++) {
    const h = size * (0.7 + Math.random() * 0.9);
    const geo = new THREE.OctahedronGeometry(size * 0.28, 0);
    geo.scale(0.55, h / (size * 0.28), 0.55); // elongate vertically
    const shard = new THREE.Mesh(geo, mat);
    const a = (i / shards) * Math.PI * 2 + Math.random() * 0.6;
    const r = size * 0.35 * Math.random();
    shard.position.set(Math.cos(a) * r, h * 0.32, Math.sin(a) * r);
    shard.rotation.set(
      (Math.random() - 0.5) * 0.5,
      Math.random() * Math.PI,
      (Math.random() - 0.5) * 0.5
    );
    group.add(shard);
  }
  // Halo sprite at cluster center — the bloom read at a glance.
  const halo = makeGlowSprite3D(color, size * 3.2, 0.5);
  halo.position.y = size * 0.5;
  group.add(halo);
  return group;
}

// Crystal Cave HUD CSS (exact values from source). Inject into a <style> tag
// or use the strings directly. Rounded font stack, glass pills, gradient CTAs.
export const crystalHUD = {
  FONT: 'ui-rounded,"SF Pro Rounded",system-ui,-apple-system,"Segoe UI",sans-serif',
  PILL: 'background:rgba(6,14,40,.55);border:1px solid rgba(120,220,255,.35);border-radius:999px;padding:5px 12px;backdrop-filter:blur(4px)',
  PILL_TEXT: 'font-weight:800;font-size:15px;color:#eaf6ff;text-shadow:0 2px 0 #0a1230,0 0 10px rgba(80,200,255,.5)',
  TITLE_GRADIENT: 'background:linear-gradient(90deg,#7ff0ff,#ff8ae8);-webkit-background-clip:text;background-clip:text;color:transparent',
  PRIMARY_BUTTON: 'font-weight:800;padding:10px 22px;border-radius:999px;border:0;background:linear-gradient(90deg,#38e8ff,#ff5ad8);color:#06112c;cursor:pointer',
  TOUCH_BUTTON: 'width:68px;height:68px;border-radius:50%;border:2px solid rgba(140,230,255,.55);background:rgba(10,30,70,.45);color:#dff6ff;backdrop-filter:blur(4px);touch-action:none;box-shadow:0 0 16px rgba(60,200,255,.25) inset',
  TOUCH_BUTTON_BIG: 'width:80px;height:80px;border-color:rgba(255,120,230,.7);box-shadow:0 0 18px rgba(255,80,220,.35) inset',
  HEART: 'background:#ff4f8b;filter:drop-shadow(0 0 4px #ff4f8b)',
  COIN: 'background:radial-gradient(circle at 35% 35%,#fff3b0,#ffc93a 55%,#c47d12);box-shadow:0 0 8px #ffb020',
};

// --- main entry -------------------------------------------------------------
export function applyVisualStandard(scene, camera, renderer, preset = 'cel', opts = {}) {

  // 2D preset: Shell Shock Live (no Three.js scene needed)
  if (preset === 'shellshock-live') {
    return applyShellshockLive2D(opts.w || 960, opts.h || 540, opts);
  }

  // 2D preset: Shell Shock 16-bit (no Three.js scene needed)
  if (preset === 'shellshock-16bit') {
    return apply16Bit2D(opts.w || 384, opts.h || 224, opts);
  }

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

  if (preset === 'roadkill') {
    const P = PALETTES.roadkill;
    const hemi = new THREE.HemisphereLight(P.HEMI_SKY, P.HEMI_GND, 1.55);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(P.SUN, 2.1);
    sun.position.set(-0.55, 1.35, 0.5).normalize().multiplyScalar(100);
    sun.castShadow = true;
    const shadowSize = opts.shadowSize || 2048;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    const sc = sun.shadow.camera;
    sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34;
    sc.near = 1; sc.far = 220;
    sun.shadow.bias = -0.0007;
    sun.shadow.normalBias = 0.05;
    scene.add(sun);
    scene.add(sun.target);
    scene.fog = new THREE.Fog(P.FOG, opts.fogNear || 90, opts.fogFar || 330);
    scene.background = new THREE.Color(P.FOG);
    if (camera && !opts.noCamera) {
      camera.fov = 62;
      camera.updateProjectionMatrix();
    }
    return {
      preset: 'roadkill', palette: P, sun,
      toonMaterial: makeToonMaterial, // 3-band gradient + halftone dots, same as cel
      withOutline, makeSkyDome,
      INK: P.INK,
      // Inverted-hull outline widths from Roadkill Rig source
      charOutline: 0.0036, cityOutline: 0.0030, propOutline: 0.0032,
      outlineFor: (kind) => outlineMaterial(
        { char: 0.0036, city: 0.0030, prop: 0.0032 }[kind] || 0.0032, P.INK),
      // Desert ground vertex colors (paint these per-vertex like the source)
      ground: {
        SAND: P.SAND, SAND2: P.SAND2, FLAT: P.FLAT,
        RUST: P.RUST, DEEP: P.DEEP, BERM: P.BERM,
      },
      // Rust prop palette for vehicles/scrap
      rusts: ['#9c4b2e', '#7d5a45', '#b86b3c', '#6f7d7a', '#a3896a', '#5d6b78'],
      lambert, canvasTexture,
    };
  }

  if (preset === 'crystal-cave') {
    const P = PALETTES['crystal-cave'];
    // Cave ambient: faint blue, no sun. Crystals carry the light.
    const hemi = new THREE.HemisphereLight(P.HEMI_SKY, P.HEMI_GND, 0.5);
    scene.add(hemi);
    // Crystal point lights — caller positions each at a crystal cluster.
    // Alternating cyan/magenta matches the source's two crystal colors.
    const crystalLights = [];
    const nLights = opts.lights || 8;
    for (let i = 0; i < nLights; i++) {
      const color = i % 2 === 0 ? P.CYAN : P.PINK;
      const L = new THREE.PointLight(color, 2, 18, 2);
      scene.add(L);
      crystalLights.push(L);
    }
    scene.fog = new THREE.FogExp2(P.BG, opts.fogDensity || 0.028);
    scene.background = new THREE.Color(P.BG);
    if (camera && !opts.noCamera) {
      camera.fov = 60; // side-on 2.5D framing
      camera.updateProjectionMatrix();
    }
    return {
      preset: 'crystal-cave', palette: P, crystalLights,
      makeCrystal, makeGlowSprite3D, crystalHUD,
      lambert, canvasTexture,
      // Cave rock material (very dark blue-grey, roughness 1)
      rockMaterial: (color) => new THREE.MeshLambertMaterial({ color: color || P.ROCK }),
    };
  }

  throw new Error(`gpstyle: unknown preset "${preset}"`);
}

// 2D entry point: Shell Shock Live visual standard for canvas games.
// No scene/camera/renderer — returns exposure grade, glow system factory,
// bloom CSS, weather, and fallback sky/ground. Call as:
//   const style = applyVisualStandard(null, null, null, 'shellshock-live');
//   style.glow.boom(x, y, k); ... style.glow.draw(ctx);
export function applyShellshockLive2D(w, h, opts = {}) {
  const P = PALETTES['shellshock-live'];
  return {
    preset: 'shellshock-live', palette: P,
    // Exposure grade (CSS filters applied to offscreen-exposed sprites — source values)
    bgExpose: P.BG_EXPOSE,       // 'brightness(1.3) contrast(1.05)'
    spriteExpose: P.SPRITE_EXPOSE, // 'brightness(1.28) contrast(1.08)'
    // Additive glow light system (1/4-res buffer, 'lighter' composite)
    glow: makeGlowSystem(w, h, opts),
    // Bloom overlay CSS for glow sources (source values)
    bloom: { filter: 'blur(2px)', opacity: 0.35, mixBlendMode: 'screen' },
    // Weather (source counts/colors)
    weather: { rain: makeWeather('rain'), snow: makeWeather('snow') },
    // Fallback sky/ground when no painted background (source values)
    skyFallback: { top: P.SKY_TOP, bottom: P.SKY_BOTTOM, ground: P.GROUND },
    // Hit feedback (source: white flash silhouette + particles)
    hitFlashFrames: 5,
  };
}

// 2D entry point: Shell Shock 16-bit visual standard for pixel-art canvas games.
// No scene/camera/renderer — returns the internal resolution, CRT overlay CSS,
// skyline layer spec, bloom config, and the shared additive glow system.
// Call as:
//   const style = applyVisualStandard(null, null, null, 'shellshock-16bit');
//   // canvas: <canvas id="game" width="384" height="224">
//   // css: image-rendering: pixelated; + style.crt.css applied to a ::after overlay
export function apply16Bit2D(w, h, opts = {}) {
  const P = PALETTES['shellshock-16bit'];
  const rw = P.RES_W, rh = P.RES_H;
  return {
    preset: 'shellshock-16bit', palette: P,
    // Internal render resolution. Canvas element stays rw x rh; CSS scales it up.
    res: { w: rw, h: rh },
    imageRendering: P.IMAGE_RENDERING, // 'pixelated' — chunky crisp pixels, never smooth
    // CRT overlay: a positioned ::after element with this exact background + shadow.
    // Source CSS: scanlines (9% black rows) + RGB aperture grille (5% 1px stripes)
    // + glass highlight top-left + vignette + barrel border-radius.
    crt: {
      css: `background:
      radial-gradient(120% 90% at 30% 18%, rgba(255,255,255,.10), rgba(255,255,255,.03) 35%, transparent 60%),
      radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.25) 100%),
      repeating-linear-gradient(to bottom, transparent 0 var(--row, 3px), rgba(0,0,0,.09) var(--row, 3px) calc(var(--row, 3px) * 2)),
      repeating-linear-gradient(to right, rgba(255,40,40,.05) 0 1px, rgba(40,255,80,.05) 1px 2px, rgba(60,90,255,.05) 2px 3px);
    box-shadow: inset 0 0 28px 8px rgba(0,0,0,.35), inset 0 0 10px 2px rgba(0,0,0,.3), inset 0 0 4px 1px rgba(0,0,0,.6);
    border-radius: 6% / 9%;`,
    },
    // Bloom: a second rw x rh canvas composited over the game canvas (source: id="bloom")
    bloom: { filter: 'blur(2px)', opacity: 0.35, mixBlendMode: 'screen' },
    // Skyline: two parallax layers, far then near. Drawn procedurally in source:
    // rects w=18..40, near layer adds 2x3 lit windows on a 6x7 grid where hash>0.8.
    skyline: {
      far: { color: P.SKY_FAR, base: P.SKY_FAR_BASE, hMin: P.SKY_FAR_HMIN, hVar: P.SKY_FAR_HVAR },
      near: { color: P.SKY_NEAR, base: P.SKY_NEAR_BASE, hMin: P.SKY_NEAR_HMIN, hVar: P.SKY_NEAR_HVAR },
      window: { color: P.WINDOW, w: 2, h: 3, gridX: 6, gridY: 7 },
    },
    // Additive glow light system (same engine as shellshock-live: 1/4-res buffer, 'lighter')
    glow: makeGlowSystem(rw, rh, opts),
    // Static neon level glows (source: r=70, #ff7a1a, a=0.30, flicker 0.25)
    neon: { color: P.NEON, r: P.NEON_R, alpha: P.NEON_A, flicker: P.NEON_FLICKER },
    // Hit feedback (source: shake scaled by hit strength, 1.03x zoom punch)
    shakeMax: P.SHAKE_MAX,
    zoomPunch: P.ZOOM_PUNCH,
  };
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
