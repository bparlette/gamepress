// Vampire Survivors Remake — Hark Edition (fan remake). Cel-shaded three.js r160, procedural everything.
// Sim: fixed 60 Hz accumulator, one game clock (hitstop + slow-mo scale it), game-time event queue.
// Horde: swap-packed SoA (horde.js) + counting-sort spatial hash (spatial-hash.js) + pooled arsenal (weapons.js),
// drawn as ONE instanced draw of cel impostors baked at boot from the real 3D rigs (rigs.js).
import * as THREE from './three.module.min.js';
import { SpatialHash } from './spatial-hash.js';
import { Horde, ENEMY_TYPES, WaveDirector } from './horde.js';
import { Arsenal, WEAPONS, PASSIVES, EVOS, PK, baseStats, applyPassives, MAX_WEAPONS, MAX_PASSIVES } from './weapons.js';
import { DOT, toonMat, InstLayer, SpriteLayer, OUT_CHAR, OUT_PROP, OUT_THIN } from './cel.js';
import { buildRyu, buildHunter, CREATURES, buildReaper, buildGeometries, GEO, buildIconModel } from './rigs.js';
import { buildFxAtlas, buildGroundTexture } from './fxatlas.js';
import { Audio } from './audio.js';

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const TOUCH = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !matchMedia('(hover: hover)').matches);
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const damp = (a, b, r, dt) => a + (b - a) * (1 - Math.exp(-r * dt));
let SEED = 1234567; const rand = () => ((SEED = (SEED * 16807) % 2147483647) / 2147483647);
window.__vsErr = { n: 0, last: '' };
addEventListener('error', (e) => { __vsErr.n++; __vsErr.last = String(e.message); });

// ---------------- renderer, camera, lights ----------------
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !TOUCH, powerPreference: 'high-performance' });
const DPR = Math.min(window.devicePixelRatio || 1, TOUCH ? 1.5 : 1.25);
renderer.setPixelRatio(DPR); DOT.value = 5 * DPR;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor('#1a1326');
const scene = new THREE.Scene();
const FOG = new THREE.Color('#231a36');
scene.fog = new THREE.Fog(FOG, 30, 70);
const camera = new THREE.PerspectiveCamera(34, 1, 1, 200);
const PITCH = 50 * Math.PI / 180;
const hemi = new THREE.HemisphereLight('#c8beff', '#3a2a4a', 1.9);
const moon = new THREE.DirectionalLight('#e6e0ff', 1.7); moon.position.set(-4, 10, 6);
scene.add(hemi, moon, moon.target);
const lantern = new THREE.PointLight('#ffb46b', 7, 11, 1.4); scene.add(lantern);

// ---------------- world: ground, props ----------------
const groundTex = buildGroundTexture(); const TILE = 10;
groundTex.repeat.set(240 / TILE, 240 / TILE);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), toonMat({ map: groundTex, vertexColors: false, color: '#ffffff' }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);
buildGeometries();
const PROPS = ['grave', 'cross', 'pillar', 'tree', 'candles', 'bones'].map((k) => new InstLayer(scene, GEO[k], 140, { olMat: OUT_PROP }));
const BRAZ = new InstLayer(scene, GEO.brazier, 16, { olMat: OUT_PROP });
const CH = 14; let propChunkX = 1e9, propChunkY = 1e9;
function hash2(i, j) { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function rebuildProps(px, py) {
  const cx = Math.floor(px / CH), cy = Math.floor(py / CH); if (cx === propChunkX && cy === propChunkY) return;
  propChunkX = cx; propChunkY = cy; for (const L of PROPS) L.begin();
  for (let i = cx - 4; i <= cx + 4; i++) for (let j = cy - 4; j <= cy + 4; j++) {
    const n = (hash2(i, j) * 4) | 0;
    for (let k = 0; k < n; k++) {
      const h1 = hash2(i * 7 + k, j * 13 - k), h2 = hash2(i - k * 31, j + k * 17), h3 = hash2(i + k * 5, j * 3 + k);
      const x = (i + h1) * CH, z = (j + h2) * CH; if (Math.abs(x) < 3 && Math.abs(z) < 3) continue;
      const t = (h3 * 100 | 0) % 10, idx = t < 3 ? 0 : t < 5 ? 1 : t < 6 ? 2 : t < 7 ? 3 : t < 9 ? 5 : 4;
      PROPS[idx].push(x, 0, z, (h1 - 0.5) * 0.8 + (idx === 0 ? 0 : h2 * 6), 0.9 + h3 * 0.4);
      if (idx === 0 && h2 > 0.5) PROPS[0].push(x + 1.2, 0, z + 0.3, (h2 - 0.5) * 0.6, 0.85);
    }
  }
  for (const L of PROPS) L.end();
}

// ---------------- impostor bake: every creature rig, 8 walk frames, plus card icons ----------------
const BAKE = { uv: [], anchor: 0.2, box: 2.7, icons: {} };
const CELL = 192, ATW = 2048, ATH = 1024, ICON = 128;
const ICON_IDS = ['lash', 'dagger', 'bolt', 'axe', 'censer', 'psalter', 'flask', 'rune', 'reaver', 'edges', 'storm', 'spiral', 'souleater', 'vespers',
  'heart', 'ember', 'tome', 'candle', 'bracer', 'binder', 'chalice', 'lode', 'feather', 'gold', 'chicken'];
function bake() {
  const rt = new THREE.WebGLRenderTarget(ATW, ATH, { depthBuffer: true, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const bs = new THREE.Scene();
  bs.add(new THREE.HemisphereLight('#c8beff', '#3a2a4a', 1.9)); const ml = new THREE.DirectionalLight('#e6e0ff', 1.7); ml.position.set(-4, 10, 6); bs.add(ml, ml.target);
  const h = BAKE.box / 2, cam = new THREE.OrthographicCamera(-h, h, h, -h, 0.1, 40);
  const tgt = new THREE.Vector3(0, 1.05, 0);
  cam.position.set(0, tgt.y + Math.sin(PITCH) * 12, Math.cos(PITCH) * 12); cam.lookAt(tgt); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const foot = new THREE.Vector3(0, 0, 0).project(cam); BAKE.anchor = (foot.y + 1) / 2;
  const olW = [OUT_CHAR.uniforms.uW.value, OUT_PROP.uniforms.uW.value];
  OUT_CHAR.uniforms.uW.value = 0.0062; OUT_PROP.uniforms.uW.value = 0.0062;
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear();
  rt.scissorTest = true;
  const cellsX = Math.floor(ATW / CELL);
  for (let t = 0; t < CREATURES.length; t++) {
    const J = CREATURES[t](); bs.add(J.root); J.root.rotation.y = Math.PI / 2 - 0.6;
    for (let f = 0; f < 8; f++) {
      const k = t * 8 + f, x = (k % cellsX) * CELL, y = Math.floor(k / cellsX) * CELL;
      J.anim((f / 8) * TAU); J.root.updateMatrixWorld(true);
      rt.viewport.set(x, y, CELL, CELL); rt.scissor.set(x, y, CELL, CELL); renderer.setRenderTarget(rt);
      renderer.render(bs, cam);
      BAKE.uv[k] = [x / ATW, (y + CELL) / ATH, (x + CELL) / ATW, y / ATH];
    }
    bs.remove(J.root);
  }
  rt.scissorTest = false; renderer.setRenderTarget(null);
  OUT_CHAR.uniforms.uW.value = olW[0]; OUT_PROP.uniforms.uW.value = olW[1];
  // card icons: render each model into the corner of the main canvas and copy it out in the same task (no readPixels)
  const icam = new THREE.PerspectiveCamera(30, 1, 0.1, 20); icam.position.set(0, 0.35, 2.7); icam.lookAt(0, 0, 0); icam.updateMatrixWorld();
  OUT_CHAR.uniforms.uW.value = 0.006;
  const c2 = document.createElement('canvas'); c2.width = c2.height = ICON; const g2 = c2.getContext('2d');
  const sz = renderer.getSize(new THREE.Vector2()); if (sz.x < ICON || sz.y < ICON) renderer.setSize(Math.max(ICON, sz.x), Math.max(ICON, sz.y), false);
  const cvH = renderer.domElement.height;
  renderer.setScissorTest(true); renderer.setClearColor(0x000000, 0);
  for (const id of ICON_IDS) {
    const m = buildIconModel(id); m.rotation.y = 0.35; bs.add(m);
    renderer.setViewport(0, 0, ICON / DPR, ICON / DPR); renderer.setScissor(0, 0, ICON / DPR, ICON / DPR); renderer.clear(); renderer.render(bs, icam);
    g2.clearRect(0, 0, ICON, ICON); g2.drawImage(renderer.domElement, 0, cvH - ICON, ICON, ICON, 0, 0, ICON, ICON);
    BAKE.icons[id] = c2.toDataURL(); bs.remove(m);
  }
  renderer.setScissorTest(false); renderer.setClearColor('#1a1326', 1); OUT_CHAR.uniforms.uW.value = olW[0];
  return rt.texture;
}
const hordeTex = bake();
const FX = buildFxAtlas(); const R = FX.R;

// batched layers (draw order: ground decals -> shadows -> 3D -> horde impostors -> fx -> numbers)
const L_DECAL = new SpriteLayer(scene, FX.tex, 400, { mode: 'ground', blend: 'alpha', order: 1, polygonOffset: true });
const L_SHADOW = new SpriteLayer(scene, FX.tex, 2800, { mode: 'ground', blend: 'alpha', order: 2, polygonOffset: true });
const L_GADD = new SpriteLayer(scene, FX.tex, 300, { mode: 'ground', blend: 'add', order: 3, polygonOffset: true });
const L_HORDE = new SpriteLayer(scene, hordeTex, 2700, { mode: 'bill', blend: 'cut', anchor: 0, order: 4 });
const L_ADD = new SpriteLayer(scene, FX.tex, 1800, { mode: 'bill', blend: 'add', anchor: 0.5, order: 6 });
const L_TOP = new SpriteLayer(scene, FX.tex, 900, { mode: 'bill', blend: 'alpha', anchor: 0.5, order: 8, depthTest: false });
L_HORDE.uniforms.uAnchor.value = BAKE.anchor;
const BILL = [L_HORDE, L_ADD, L_TOP];
const I_GEM = new InstLayer(scene, GEO.gem, 800, { olMat: OUT_THIN });
const I_COIN = new InstLayer(scene, GEO.coin, 80, { olMat: OUT_THIN });
const I_CHEST = new InstLayer(scene, GEO.chest, 8, { olMat: OUT_PROP });
const I_CHICK = new InstLayer(scene, GEO.chicken, 16, { olMat: OUT_THIN });
const I_ORB = new InstLayer(scene, GEO.orb, 8, { olMat: OUT_THIN, emissive: '#1a4a55' });
const I_KNIFE = new InstLayer(scene, GEO.knife, 240, { olMat: OUT_THIN });
const I_AXE = new InstLayer(scene, GEO.axe, 60, { olMat: OUT_THIN });
const I_FLASK = new InstLayer(scene, GEO.flask, 20, { olMat: OUT_THIN });
const I_BOOK = new InstLayer(scene, GEO.book, 8, { olMat: OUT_THIN });
const I_SCY = new InstLayer(scene, GEO.scythe, 60, { olMat: OUT_THIN });
const I_SICK = new InstLayer(scene, GEO.sickle, 80, { olMat: OUT_THIN, emissive: '#4a0a40' });
const GEMCOL = [new THREE.Color('#5fb8ff'), new THREE.Color('#5cff8a'), new THREE.Color('#ff3d5e')];

// ---------------- actors ----------------
const HERO = buildRyu(); scene.add(HERO.root);
const REAPER = buildReaper(); REAPER.root.visible = false; scene.add(REAPER.root);
const audio = new Audio();

// ---------------- state ----------------
const H = new Horde(2600, 3);
const HASH = new SpatialHash(1.0, 112, 112, 2600);
const A = new Arsenal();
const BOSS_T = ENEMY_TYPES.length; ENEMY_TYPES.push({ name: 'reaper', hp: 1, spd: 0, dmg: 26, xp: 0, rad: 1.0, mass: 400, fly: 0, scale: 1, wobble: 0 });
const PHASES = [
  { t0: 0, min: 16, rate: 1.0, types: [[1, 3], [0, 1]] },
  { t0: 40, min: 34, rate: 1.8, types: [[1, 2], [0, 2]] },
  { t0: 90, min: 70, rate: 3, types: [[0, 2], [1, 2], [2, 1]] },
  { t0: 150, min: 140, rate: 5, types: [[2, 3], [1, 1], [0, 1]] },
  { t0: 210, min: 250, rate: 4, types: [[2, 2], [3, 2], [0, 1]] },
  { t0: 255, min: 400, rate: 5, types: [[3, 3], [4, 1], [1, 2]] },
  { t0: 300, min: 650, rate: 6, types: [[0, 4], [3, 2], [1, 2]], burst: 60 },
  { t0: 360, min: 900, rate: 7, types: [[5, 2], [2, 3], [0, 1]], burst: 60 },
  { t0: 420, min: 1150, rate: 8, types: [[2, 2], [4, 1], [5, 2], [3, 2]], burst: 70 },
  { t0: 480, min: 1500, rate: 9, types: [[1, 3], [2, 2], [3, 2], [4, 1], [5, 1]], burst: 80 },
  { t0: 540, min: 1750, rate: 10, types: [[0, 2], [2, 2], [3, 2], [4, 2], [5, 2]], burst: 80 },
  { t0: 600, min: 30, rate: 2, types: [[0, 1]] },
];
const EVENTS = [
  { t: 60, id: 'swarm', type: 0, n: 36 }, { t: 105, id: 'elite', type: 1 }, { t: 165, id: 'ring', type: 1, n: 60 },
  { t: 210, id: 'elite', type: 2 }, { t: 270, id: 'swarm', type: 0, n: 60 }, { t: 300, id: 'bloodmoon' }, { t: 300, id: 'elite', type: 4 },
  { t: 340, id: 'swarm', type: 3, n: 80 }, { t: 360, id: 'moonset' }, { t: 365, id: 'elite', type: 5 }, { t: 420, id: 'elite', type: 3 },
  { t: 450, id: 'ring', type: 2, n: 110 }, { t: 480, id: 'elite', type: 4 }, { t: 510, id: 'swarm', type: 0, n: 120 },
  { t: 540, id: 'elite', type: 5 }, { t: 565, id: 'ring', type: 4, n: 90 }, { t: 585, id: 'warn' }, { t: 600, id: 'reaper' },
];
const WD = new WaveDirector(PHASES, EVENTS);
const XPN = (l) => (l < 20 ? 5 + (l - 1) * 8 : l < 40 ? 157 + (l - 20) * 10 : 357 + (l - 40) * 12);

const Gs = {}; const PL = { x: 0, y: 0, vx: 0, vy: 0 };
const GEM_MAX = 800, gem = { n: 0, x: new Float32Array(GEM_MAX), y: new Float32Array(GEM_MAX), v: new Float32Array(GEM_MAX), fly: new Uint8Array(GEM_MAX), sp: new Float32Array(GEM_MAX), c: new Uint8Array(GEM_MAX), sp0: new Float32Array(GEM_MAX) };
const PK_MAX = 64, pk = { n: 0, x: new Float32Array(PK_MAX), y: new Float32Array(PK_MAX), k: new Uint8Array(PK_MAX), fly: new Uint8Array(PK_MAX), t: new Float32Array(PK_MAX) };
const PKK = { COIN: 0, CHEST: 1, CHICKEN: 2, ORB: 3, BAG: 4 };
const BR_MAX = 8, br = { n: 0, x: new Float32Array(BR_MAX), y: new Float32Array(BR_MAX) };
const PT_MAX = 1400, pt = { n: 0, x: new Float32Array(PT_MAX), y: new Float32Array(PT_MAX), z: new Float32Array(PT_MAX), vx: new Float32Array(PT_MAX), vy: new Float32Array(PT_MAX), vz: new Float32Array(PT_MAX), life: new Float32Array(PT_MAX), max: new Float32Array(PT_MAX), s: new Float32Array(PT_MAX), sp: new Uint8Array(PT_MAX), r: new Float32Array(PT_MAX), g: new Float32Array(PT_MAX), b: new Float32Array(PT_MAX), grav: new Float32Array(PT_MAX), add: new Uint8Array(PT_MAX) };
const PSPR = [R.dot, R.spark, R.smoke, R.star, R.glow, R.flame];
const DN_MAX = 70, dn = { n: 0, x: new Float32Array(DN_MAX), y: new Float32Array(DN_MAX), z: new Float32Array(DN_MAX), v: new Int32Array(DN_MAX), life: new Float32Array(DN_MAX), c: new Uint8Array(DN_MAX) };
const DNC = [[1, 1, 1], [1, 0.82, 0.24], [1, 0.25, 0.4], [0.62, 1, 0.42]];
const FXL_MAX = 120, fxl = { n: 0, k: new Uint8Array(FXL_MAX), x: new Float32Array(FXL_MAX), y: new Float32Array(FXL_MAX), a: new Float32Array(FXL_MAX), b: new Float32Array(FXL_MAX), c: new Float32Array(FXL_MAX), life: new Float32Array(FXL_MAX), max: new Float32Array(FXL_MAX), e: new Uint8Array(FXL_MAX) };
const FXK = { SLASH: 1, BOLT: 2, SPLASH: 3, WORD: 4, RING: 5, AFTER: 6 };
let queue = [];
const later = (dt, fn) => queue.push({ t: Gs.clock + dt, fn });

function resetState(opts = {}) {
  SEED = opts.seed || ((Date.now() % 2147483646) + 1);
  Object.assign(Gs, {
    state: opts.attract ? 'attract' : 'play', attract: !!opts.attract, t: opts.t || 0, clock: 0, hitstop: 0, slow: 1, slowT: 0, frame: 0,
    kills: 0, gold: 0, level: 1, xp: 0, xpNext: XPN(1), pendingLv: 0, hp: 100, maxhp: 100, hurtCD: 0, iframe: 0, blink: 0,
    dashCD: 0, dashT: 0, dashX: 0, dashY: 0, faceX: 1, faceY: 0, lastHX: 1, moveAmt: 0, walkPh: 0, atkT: 0, yaw: 0,
    shake: 0, bloodmoon: 0, boss: -1, bossHp: 0, bossMax: 1, bossPhase: 1, bossAtk: null, bossCD: 3, bossSwing: 0, won: false, dying: 0,
    killFrame: 0, numFrame: 0, sparkFrame: 0, braT: 2, vacuum: 0, vacT: 0, invuln: !!opts.invuln, minHorde: opts.minHorde || 0,
    stats: baseStats(), lastEvent: '', reaperWarned: false, endT: 0, chestsOpened: 0, evolved: [],
  });
  PL.x = 0; PL.y = 0; PL.vx = 0; PL.vy = 0;
  H.clear(); A.reset(); gem.n = 0; pk.n = 0; br.n = 0; pt.n = 0; dn.n = 0; fxl.n = 0; queue = [];
  WD.reset(); if (Gs.t > 0) { while (WD.ei < EVENTS.length && EVENTS[WD.ei].t <= Gs.t) WD.ei++; }
  A.addWeapon('lash');
  recomputeStats(); Gs.hp = Gs.maxhp;
  REAPER.root.visible = false; propChunkX = 1e9;
  audio.boss = false; audio.intensity = 0;
  document.body.classList.toggle('bloodmoon', false); document.body.classList.toggle('attract', !!opts.attract);
  hemi.color.set('#c8beff');
  UI.refreshSlots(); UI.boss(false);
}
function recomputeStats() {
  const S = applyPassives(baseStats(), A.passives); Gs.stats = S;
  const old = Gs.maxhp; Gs.maxhp = Math.round(120 * S.maxhpMul); if (Gs.maxhp > old) Gs.hp += Gs.maxhp - old;
}

// ---------------- view extents (ground visible region around the target) ----------------
const VIEW = { hx: 9, hyUp: 8, hyDn: 7, dist: 26 };
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), RIGHT = new THREE.Vector3(), UP = new THREE.Vector3();
function layout() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
  const tf = Math.tan(camera.fov * Math.PI / 360);
  const portrait = w / h < 0.8;
  // desktop: ~8.5 units of ground above/below the hunter; portrait: at least ~5.4 units either side
  const dDepth = (portrait ? 9.6 : 6.9) * Math.sin(PITCH) / tf, dWide = (portrait ? 4.5 : 0) / (tf * camera.aspect);
  VIEW.dist = Math.max(dDepth, dWide, 14);
  camera.near = VIEW.dist * 0.4; camera.far = VIEW.dist * 3;
  scene.fog.near = VIEW.dist * 0.95; scene.fog.far = VIEW.dist * 1.9;
  camera.updateProjectionMatrix();
  placeCamera(0, 0, 0); camera.updateMatrixWorld();
  const ext = (sx, sy) => { _v.set(sx, sy, 0.5).unproject(camera); _v.sub(camera.position).normalize(); const t = -camera.position.y / _v.y; return _v2.copy(camera.position).addScaledVector(_v, t); };
  const tl = ext(-1, 1), br2 = ext(1, -1); VIEW.hyUp = Math.min(30, -tl.z); VIEW.hyDn = br2.z; VIEW.hx = Math.max(Math.abs(br2.x), 4); VIEW.hxTop = Math.min(30, Math.abs(tl.x));
  VIEW.portrait = portrait;
  document.body.classList.toggle('portrait', portrait);
}
let camX = 0, camY = 0;
function placeCamera(x, y, shake) {
  const sx = shake ? (rand() - 0.5) * shake : 0, sy = shake ? (rand() - 0.5) * shake : 0;
  camera.position.set(x + sx, Math.sin(PITCH) * VIEW.dist, y + Math.cos(PITCH) * VIEW.dist + sy);
  camera.lookAt(x + sx, 0, y + sy);
}
addEventListener('resize', layout);

// ---------------- spawning ----------------
function spawnPos(out, ahead) {
  let a; const mv = Math.hypot(PL.vx, PL.vy);
  if (ahead && mv > 0.5 && rand() < 0.6) a = Math.atan2(PL.vy, PL.vx) + (rand() - 0.5) * 2.0; else a = rand() * TAU;
  const ca = Math.cos(a), sa = Math.sin(a);
  const rx = (sa < 0 ? VIEW.hxTop : VIEW.hx) + 1.6, ry = (sa < 0 ? VIEW.hyUp : VIEW.hyDn) + 1.6;
  out[0] = PL.x + ca * rx * 1.05; out[1] = PL.y + sa * ry * 1.05;
}
const SP = [0, 0];
function hpMul() { return 0.85 + (Gs.t / 60) * 0.3; }
function spawnEnemy(type, x, y, o) {
  const i = H.spawn(type, x, y, o); if (i < 0) return -1;
  if (Gs.bloodmoon) H.spd[i] *= 1.18;
  return i;
}
function relocate(i) { if (H.type[i] === BOSS_T || H.elite[i]) { /* elites follow */ const a = Math.atan2(H.y[i] - PL.y, H.x[i] - PL.x); H.x[i] = PL.x + Math.cos(a) * (VIEW.hx + 2); H.y[i] = PL.y + Math.sin(a) * (VIEW.hyDn + 2); return; } spawnPos(SP, true); H.x[i] = SP[0]; H.y[i] = SP[1]; H.kx[i] = H.ky[i] = 0; }
function onEvent(ev) {
  if (Gs.attract && (ev.id === 'reaper' || ev.id === 'warn')) return;
  switch (ev.id) {
    case 'swarm': {
      const a = rand() * TAU, dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx, start = Math.max(VIEW.hx, VIEW.hyUp) + 3;
      for (let k = 0; k < ev.n; k++) { const o = (k / ev.n - 0.5) * 9, b = (rand() - 0.5) * 3; spawnEnemy(ev.type, PL.x - dx * (start + b) + px * o, PL.y - dy * (start + b) + py * o, { hpMul: hpMul(), lineVX: dx * 4.2, lineVY: dy * 4.2 }); }
      UI.banner(ev.type === 0 ? 'BAT SWARM!' : 'WRAITH TIDE!', '#c9a6ff'); audio.play('warn'); break;
    }
    case 'ring': {
      const r = Math.min(VIEW.hx, VIEW.hyDn) + 1.2;
      for (let k = 0; k < ev.n; k++) { const a = (k / ev.n) * TAU; spawnEnemy(ev.type, PL.x + Math.cos(a) * r, PL.y + Math.sin(a) * r * 0.9, { hpMul: hpMul() * 1.2 }); }
      UI.banner('SURROUNDED!', '#ff8a3d'); audio.play('warn'); break;
    }
    case 'elite': {
      spawnPos(SP, true); const i = spawnEnemy(ev.type, SP[0], SP[1], { hpMul: hpMul(), elite: 1 });
      if (i >= 0) { UI.banner('ELITE ' + ENEMY_TYPES[ev.type].name.toUpperCase() + '!', '#ffd23c'); audio.play('elite'); }
      break;
    }
    case 'bloodmoon': Gs.bloodmoon = 1; document.body.classList.add('bloodmoon'); hemi.color.set('#ff9aa8'); UI.banner('BLOOD MOON!', '#ff3d5e', 2.4); audio.play('stinger'); for (let i = 0; i < H.n; i++) H.spd[i] *= 1.18; break;
    case 'moonset': Gs.bloodmoon = 0; document.body.classList.remove('bloodmoon'); hemi.color.set('#c8beff'); break;
    case 'warn': UI.banner('THE REAPER APPROACHES', '#c9a6ff', 3); audio.play('stinger'); break;
    case 'reaper': startReaper(); break;
  }
}
function startReaper() {
  // the horde burns away at the tolling hour
  let burnt = 0;
  for (let i = H.n - 1; i >= 0; i--) { if (burnt < 160) { burst(H.x[i], H.y[i], 0.8, 1, 0.55, 0.3, 2, 2); burnt++; } H.remove(i); }
  spawnPos(SP, false);
  const i = H.spawn(BOSS_T, PL.x, PL.y - Math.min(VIEW.hyUp, 9), {}); if (i < 0) return;
  // HP scales a little with how strong the build is, so a fully evolved run still has a fight
  const power = A.weapons.reduce((s, w) => s + w.lvl + (w.evo ? 6 : 0), 0);
  H.hp[i] = H.maxhp[i] = 4000 + power * 160; H.rad[i] = 1.0; H.mass[i] = 400; H.spd[i] = 0; H.scale[i] = 1;
  Gs.boss = H.uid[i]; Gs.bossMax = H.maxhp[i]; Gs.bossPhase = 1; Gs.bossCD = 2.2; Gs.bossAtk = null;
  REAPER.root.visible = true; audio.boss = true;
  UI.banner('THE REAPER!', '#ff5fe0', 2.6); UI.boss(true); audio.play('stinger'); Gs.shake = 0.8;
}
function bossIndex() { if (Gs.boss < 0) return -1; for (let i = 0; i < H.n; i++) if (H.uid[i] === Gs.boss) return i; return -1; }

// ---------------- combat hooks ----------------
const ctx = {
  horde: H, hash: HASH, px: 0, py: 0, fx_: 1, fy_: 0, lastHX: 1, stats: null, time: 0, viewHX: 9, viewHY: 7, rand,
  hit(i, dmg, fx, fy, kb, src) {
    if (H.hp[i] <= 0) return;
    H.hp[i] -= dmg; H.flash[i] = 0.12;
    if (H.type[i] !== BOSS_T) H.push(i, H.x[i] - fx, H.y[i] - fy, kb); else { Gs.bossHp = H.hp[i]; if (Gs.bossPhase === 1 && H.hp[i] < Gs.bossMax * 0.5) { Gs.bossPhase = 2; UI.banner('THE REAPER RAGES!', '#ff3d5e', 2); audio.play('stinger'); Gs.shake = 0.6; } }
    if ((Gs.numFrame < (VIEW.portrait ? 3 : 5) && (dmg >= 8 || H.n < 300)) || (dmg > 60 && Gs.numFrame < 10)) { Gs.numFrame++; addNum(H.x[i], H.y[i], ENEMY_TYPES[H.type[i]].fly + 1.4 * H.scale[i], dmg, dmg >= 30 ? 1 : 0); }
    if (Gs.sparkFrame < 8) { Gs.sparkFrame++; const a = Math.atan2(H.y[i] - fy, H.x[i] - fx); for (let k = 0; k < 2; k++) addPt(H.x[i], 0.8 * H.scale[i], H.y[i], Math.cos(a + (rand() - 0.5)) * 6, 2 + rand() * 3, Math.sin(a + (rand() - 0.5)) * 6, 0.18, 0.5, 1, 1, 0.95, 0.75, 6, 1); }
    audio.play('hit');
  },
  fx(name, a, b, c, d, e, f) {
    switch (name) {
      case 'slash': addFx(FXK.SLASH, a, b, c, d, e, 0.2, f ? 1 : 0); audio.play('slash'); Gs.atkT = 0.001; breakNear(a, b, d * 0.5); break;
      case 'lightning': addFx(FXK.BOLT, a, b, c, 0, 0, 0.32, 0); audio.play('thunder'); burst(a, b, 0.2, 0.7, 0.9, 1, 3, 6); breakNear(a, b, c); break;
      case 'splash': addFx(FXK.SPLASH, a, b, c, 0, 0, 0.3, 0); audio.play('splash'); breakNear(a, b, c); break;
      default: audio.play(name);
    }
  },
  hurtPlayer(dmg, x, y) { hurtPlayer(dmg, x, y); },
  heal(h) { Gs.hp = Math.min(Gs.maxhp, Gs.hp + h); },
};
function hurtPlayer(dmg, x, y) {
  if (Gs.iframe > 0 || Gs.invuln || Gs.state !== 'play' && Gs.state !== 'attract') return false;
  if (Gs.attract) dmg *= 0.35;
  dmg = Math.max(1, dmg - Gs.stats.armor);
  Gs.hp -= dmg; Gs.iframe = 0.45; Gs.blink = 0.45; Gs.shake = Math.max(Gs.shake, 0.35);
  HERO.mat.userData.flash.value = 1; HERO.mat.userData.flashC.value.set('#ff3d5e');
  addNum(PL.x, PL.y, 2.2, dmg, 2); audio.play('hurt'); UI.hurt();
  if (Gs.hp <= 0) { Gs.hp = 0; die(); }
  return true;
}
function breakNear(x, y, r) { for (let i = br.n - 1; i >= 0; i--) { const dx = br.x[i] - x, dy = br.y[i] - y; if (dx * dx + dy * dy < (r + 0.6) * (r + 0.6)) breakBrazier(i); } }
function breakBrazier(i) {
  const x = br.x[i], y = br.y[i]; br.n--; br.x[i] = br.x[br.n]; br.y[i] = br.y[br.n];
  burst(x, y, 1.1, 1, 0.7, 0.25, 6, 10); audio.play('break');
  const r = rand(); addPickup(r < 0.45 ? PKK.COIN : r < 0.8 ? PKK.CHICKEN : r < 0.95 ? PKK.ORB : PKK.BAG, x, y);
}

// ---------------- effects helpers ----------------
function addPt(x, z, y, vx, vz, vy, life, s, sp, r, g, b, grav = 0, add = 1) {
  if (pt.n >= PT_MAX) return; const i = pt.n++;
  pt.x[i] = x; pt.y[i] = y; pt.z[i] = z; pt.vx[i] = vx; pt.vy[i] = vy; pt.vz[i] = vz; pt.life[i] = life; pt.max[i] = life; pt.s[i] = s; pt.sp[i] = sp;
  pt.r[i] = r; pt.g[i] = g; pt.b[i] = b; pt.grav[i] = grav; pt.add[i] = add;
}
function burst(x, y, z, r, g, b, n, spd) { for (let k = 0; k < n; k++) { const a = rand() * TAU, s = spd * (0.4 + rand() * 0.6); addPt(x, z, y, Math.cos(a) * s, 2 + rand() * spd * 0.6, Math.sin(a) * s, 0.35 + rand() * 0.3, 0.35 + rand() * 0.3, 0, r, g, b, 9, 1); } }
function addNum(x, y, z, v, c) { if (dn.n >= DN_MAX) return; for (let k = dn.n - 1, m = Math.max(0, dn.n - 24); k >= m; k--) { const dx = dn.x[k] - x, dy = dn.y[k] - y; if (dx * dx + dy * dy < 0.6 && dn.life[k] > 0.35) { dn.v[k] += Math.max(1, Math.round(v)); return; } } const i = dn.n++; dn.x[i] = x + (rand() - 0.5) * 0.5; dn.y[i] = y; dn.z[i] = z; dn.v[i] = Math.max(1, Math.round(v)); dn.life[i] = 0.6; dn.c[i] = c; }
function addFx(k, x, y, a, b, c, life, e) { if (fxl.n >= FXL_MAX) return; const i = fxl.n++; fxl.k[i] = k; fxl.x[i] = x; fxl.y[i] = y; fxl.a[i] = a; fxl.b[i] = b; fxl.c[i] = c; fxl.life[i] = life; fxl.max[i] = life; fxl.e[i] = e; }
function word(name, x, y) { addFx(FXK.WORD, x, y, 0, 0, 0, 0.9, WORDS.indexOf(name)); }
const WORDS = ['wSlay', 'wCrit', 'wDodge', 'wHeal', 'wGold', 'wLevel', 'wOuch'];

// ---------------- drops ----------------
function addGem(x, y, v) {
  if (v <= 0) return;
  if (gem.n >= GEM_MAX - 4) { // overflow: the farthest gem folds into this new one (no XP is ever lost; big ones turn red)
    let far = 0, fd = -1; for (let i = 0; i < gem.n; i++) { if (gem.fly[i]) continue; const dx = gem.x[i] - PL.x, dy = gem.y[i] - PL.y, d = dx * dx + dy * dy; if (d > fd) { fd = d; far = i; } }
    v += gem.v[far]; const j = --gem.n; gem.x[far] = gem.x[j]; gem.y[far] = gem.y[j]; gem.v[far] = gem.v[j]; gem.fly[far] = gem.fly[j]; gem.sp[far] = gem.sp[j]; gem.c[far] = gem.c[j]; gem.sp0[far] = gem.sp0[j];
  }
  const i = gem.n++; gem.x[i] = x; gem.y[i] = y; gem.v[i] = v; gem.fly[i] = 0; gem.sp[i] = 0; gem.c[i] = v >= 12 ? 2 : v >= 3.5 ? 1 : 0; gem.sp0[i] = rand() * TAU;
}
function addPickup(k, x, y) { if (pk.n >= PK_MAX) { if (k !== PKK.CHEST) return; for (let j = 0; j < pk.n; j++) if (pk.k[j] === PKK.COIN) { pk.k[j] = PKK.CHEST; pk.x[j] = x; pk.y[j] = y; pk.fly[j] = 0; return; } return; } const i = pk.n++; pk.x[i] = x; pk.y[i] = y; pk.k[i] = k; pk.fly[i] = 0; pk.t[i] = 0; }
function reap() {
  for (let i = H.n - 1; i >= 0; i--) {
    if (H.hp[i] > 0) continue;
    const x = H.x[i], y = H.y[i], t = H.type[i], el = H.elite[i];
    if (t === BOSS_T) { bossDeath(x, y); H.remove(i); continue; }
    Gs.kills++;
    addGem(x, y, H.xp[i] * (1 + Gs.t / 600));
    if (rand() < 0.012 && pk.n < 40) addPickup(PKK.COIN, x + 0.3, y);
    if (el) {
      addPickup(PKK.CHEST, x, y); Gs.hitstop = 0.085; Gs.shake = Math.max(Gs.shake, 0.6); word('wSlay', x, y); audio.play('elite');
      burst(x, y, 1.2, 1, 0.82, 0.24, 18, 9); addFx(FXK.RING, x, y, 3.2, 0, 0, 0.5, 0);
    } else if (Gs.killFrame < 16) {
      Gs.killFrame++; const c = t === 3 ? [0.5, 1, 0.95] : t === 0 ? [0.75, 0.5, 1] : t === 2 ? [1, 0.95, 0.8] : [0.6, 0.9, 0.45];
      burst(x, y, 0.7, c[0], c[1], c[2], 3, 4.5);
      if (Gs.killFrame < 8) addPt(x, 0.6, y, 0, 1.0, 0, 0.35, 0.7, 2, 0.35, 0.25, 0.45, 0, 1);
    }
    audio.play('kill'); H.remove(i);
  }
}
function bossDeath(x, y) {
  Gs.boss = -1; Gs.won = true; Gs.kills++; UI.boss(false);
  Gs.hitstop = 0.14; Gs.slow = 0.25; Gs.slowT = 1.8; Gs.shake = 1.2;
  for (let k = 0; k < 4; k++) burst(x, y, 1.6 + k * 0.4, 1, 0.4 + k * 0.15, 1, 24, 10);
  addFx(FXK.RING, x, y, 7, 0, 0, 0.8, 0); word('wSlay', x, y);
  REAPER.root.visible = false; audio.boss = false; audio.play('win');
  for (let i = H.n - 1; i >= 0; i--) if (H.type[i] !== BOSS_T) { burst(H.x[i], H.y[i], 0.8, 1, 0.8, 0.5, 2, 3); H.hp[i] = -1e9; H.xp[i] = 0; }
  UI.banner('DAWN BREAKS!', '#ffd23c', 3);
  later(2.0, () => finish(true));
}
function die() {
  if (Gs.dying) return;
  if (Gs.attract) { later(1.2, () => startAttract()); Gs.dying = 1; Gs.slow = 0.3; Gs.slowT = 1.2; return; }
  Gs.dying = 1; Gs.slow = 0.25; Gs.slowT = 1.6; Gs.shake = 1; audio.play('die');
  burst(PL.x, PL.y, 1, 1, 0.24, 0.35, 30, 7); UI.banner('YOU FELL!', '#ff3d5e', 2);
  later(1.2, () => finish(false));
}
function finish(won) {
  Gs.state = won ? 'win' : 'dead'; Gs.endT = Gs.t;
  const run = { time: Gs.t, kills: Gs.kills, level: Gs.level, gold: Gs.gold, win: won };
  let best = null; try { best = JSON.parse(localStorage.getItem('survivorsPlus.best') || 'null'); } catch (e) { best = null; }
  const better = !best || (run.win && !best.win) || (run.win === best.win && (run.time > best.time + 0.01 || (Math.abs(run.time - best.time) < 0.01 && run.kills > best.kills)));
  if (better) { try { localStorage.setItem('survivorsPlus.best', JSON.stringify(run)); } catch (e) { /* storage off */ } best = run; }
  UI.results(won, run, best, better);
}

// ---------------- level-ups & chests ----------------
function gainXp(v) {
  Gs.xp += v;
  while (Gs.xp >= Gs.xpNext) { Gs.xp -= Gs.xpNext; Gs.level++; Gs.xpNext = XPN(Gs.level); Gs.pendingLv++; }
}
function openLevelUp() {
  const offers = A.offers(Gs.level % 5 === 0 ? 4 : 3, rand);
  if (!offers.length) { Gs.pendingLv = 0; Gs.gold += 25; Gs.hp = Math.min(Gs.maxhp, Gs.hp + 20); return; }
  Gs.state = 'level'; audio.play('level'); if (Gs.clock - (Gs.lvWord || -9) > 1.2) { Gs.lvWord = Gs.clock; word('wLevel', PL.x, PL.y); }
  UI.levelUp(offers, (o) => {
    A.take(o); recomputeStats(); Gs.pendingLv--; UI.refreshSlots(); audio.play('pick');
    Gs.state = Gs.attract ? 'attract' : 'play'; if (o.type === 'w' && o.isNew) prewarm();
  });
}
function openChest() {
  const results = []; const ev = A.evolvable();
  if (ev.length) { const w = ev[0]; const E = A.evolve(w); results.push({ evo: true, icon: E.icon, name: E.name, desc: E.desc }); Gs.evolved.push(E.name); }
  const extra = ev.length ? 0 : (rand() < 0.3 ? 3 : 1);
  for (let k = 0; k < extra; k++) { const it = A.chestUpgrade(rand); if (!it) break; const d = WEAPONS[it.id] || PASSIVES[it.id]; results.push({ icon: d.icon, name: d.name, desc: 'Level ' + it.lvl }); }
  const g = 30 + ((rand() * 50) | 0); Gs.gold += g; results.push({ icon: 'gold', name: g + ' gold', desc: '' });
  recomputeStats(); UI.refreshSlots(); Gs.chestsOpened++;
  Gs.state = 'chest'; audio.play(ev.length ? 'evolve' : 'chest');
  UI.chest(results, ev.length > 0, () => { Gs.state = Gs.attract ? 'attract' : 'play'; });
}
function prewarm() { /* shaders are shared; nothing to compile per weapon */ }

// ---------------- input ----------------
const keys = new Set(); const stick = { on: false, id: -1, ox: 0, oy: 0, x: 0, y: 0 }; const bot = { on: false, x: 0, y: 0, dash: false, t: 0 };
let dashQueued = 0;
const MOVE_KEYS = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
addEventListener('keydown', (e) => {
  if (e.repeat && !MOVE_KEYS[e.code]) return;
  audio.init();
  const c = e.code;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c)) e.preventDefault();
  if (UI.onKey(c, e)) return;
  if (Gs.state === 'attract') { if (!['ShiftLeft', 'ShiftRight', 'ControlLeft', 'AltLeft', 'MetaLeft', 'Tab'].includes(c)) { startRun(); keys.add(c); } return; }
  keys.add(c);
  if (Gs.state === 'play') {
    if (c === 'Space' || c === 'KeyK' || c === 'ShiftLeft' || c === 'ShiftRight' || c === 'KeyJ') dashQueued = 0.12;
    if (c === 'KeyP' || c === 'Escape') pauseGame(true);
  } else if (Gs.state === 'pause' && (c === 'KeyP' || c === 'Escape')) pauseGame(false);
  if (c === 'KeyM') toggleMute();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); stick.on = false; UI.stick(false); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); if (Gs.state === 'play') pauseGame(true); } });
const stage = $('stage');
stage.addEventListener('pointerdown', (e) => {
  audio.init();
  if (Gs.state === 'attract') { startRun(); }
  if (Gs.state !== 'play' || stick.on) return;
  stick.on = true; stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.x = 0; stick.y = 0;
  try { stage.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
  UI.stick(true, e.clientX, e.clientY, 0, 0);
});
stage.addEventListener('pointermove', (e) => {
  if (!stick.on || e.pointerId !== stick.id) return;
  let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy; const R0 = 52, l = Math.hypot(dx, dy);
  if (l > R0) { // floating: the base follows the finger
    stick.ox += dx - dx / l * R0; stick.oy += dy - dy / l * R0; dx = dx / l * R0; dy = dy / l * R0;
  }
  stick.x = dx / R0; stick.y = dy / R0; UI.stick(true, stick.ox, stick.oy, dx, dy);
});
const endStick = (e) => { if (e.pointerId !== stick.id) return; stick.on = false; stick.x = stick.y = 0; UI.stick(false); };
stage.addEventListener('pointerup', endStick); stage.addEventListener('pointercancel', endStick);
$('bDash').addEventListener('pointerdown', (e) => { e.stopPropagation(); audio.init(); if (Gs.state === 'attract') startRun(); else dashQueued = 0.12; $('bDash').classList.add('down'); });
$('bDash').addEventListener('pointerup', () => $('bDash').classList.remove('down'));
$('bDash').addEventListener('pointerleave', () => $('bDash').classList.remove('down'));
$('bPause').addEventListener('click', (e) => { e.stopPropagation(); audio.init(); if (Gs.state === 'attract') { startRun(); return; } if (Gs.state === 'play') pauseGame(true); else if (Gs.state === 'pause') pauseGame(false); });
$('bMute').addEventListener('click', (e) => { e.stopPropagation(); audio.init(); toggleMute(); });
for (const id of ['bPause', 'bMute']) $(id).addEventListener('pointerdown', (e) => e.stopPropagation());
function toggleMute() { audio.setMuted(!audio.muted); $('bMute').textContent = audio.muted ? '🔇' : '♪'; $('bMute').setAttribute('aria-label', audio.muted ? 'Sound off' : 'Sound on'); try { localStorage.setItem('survivorsPlus.mute', audio.muted ? '1' : '0'); } catch (e) { /* */ } }
function pauseGame(p) { if (p) { Gs.state = 'pause'; UI.pause(true); audio.pause(true); keys.clear(); } else { Gs.state = 'play'; UI.pause(false); audio.pause(false); } }

function inputVec(out) {
  let x = 0, y = 0;
  if (Gs.attract) { x = bot.x; y = bot.y; }
  else {
    for (const k of keys) { const m = MOVE_KEYS[k]; if (m) { x += m[0]; y += m[1]; } }
    if (stick.on) { x += stick.x; y += stick.y; }
    if (bot.on) { x += bot.x; y += bot.y; }
  }
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  out[0] = x; out[1] = y;
}
const IV = [0, 0];
const BQ = new Int32Array(256);
// autopilot: flee the crowd (inverse-square), drift to gems/chests/pickups, dash out of telegraphs. Drives attract mode.
function botThink(dt) {
  bot.t -= dt; if (bot.t > 0) return; bot.t = 0.06;
  // threats: inverse-square push from anything inside 2.4, plus the crowd centroid within 7 for orbiting
  let fx = 0, fy = 0, cx = 0, cy = 0, cn = 0, near = 99; const n = HASH.query(PL.x, PL.y, 7, BQ);
  for (let q = 0; q < n; q++) {
    const i = BQ[q]; if (i >= H.n) continue; const dx = PL.x - H.x[i], dy = PL.y - H.y[i], d2 = dx * dx + dy * dy;
    if (d2 > 49) continue; cx += H.x[i]; cy += H.y[i]; cn++;
    const d = Math.sqrt(d2) - H.rad[i]; if (d < near) near = d;
    if (d2 < 3.4) { const w = (H.elite[i] || H.type[i] === BOSS_T ? 5 : 1) / (d2 + 0.15); fx += dx * w; fy += dy * w; }
  }
  let x = 0, y = 0;
  if (cn) { cx = cx / cn - PL.x; cy = cy / cn - PL.y; const l = Math.hypot(cx, cy) || 1; const side = (Math.floor(Gs.clock / 9) % 2) ? 1 : -1; x += -cy / l * side * 0.9; y += cx / l * side * 0.9; if (near > 2.0) { x += cx / l * 0.6; y += cy / l * 0.6; } if (near > 1.2 && Math.abs(cy) > 0.6) y += Math.sign(cy) * 0.5; }
  const fl = Math.hypot(fx, fy); if (fl > 0) { const k = Math.min(near < 0.9 ? 6 : 3.5, fl * 0.8); x += fx / fl * k; y += fy / fl * k; }
  // pull to loot: chest > pickups > nearest gem
  let tx = 0, ty = 0, tw = 0;
  for (let i = 0; i < pk.n; i++) { const dx = pk.x[i] - PL.x, dy = pk.y[i] - PL.y, d = Math.hypot(dx, dy); if (d < 16 && (pk.k[i] !== PKK.CHICKEN || Gs.hp < Gs.maxhp * 0.75)) { const w = (pk.k[i] === PKK.CHEST ? 2.4 : 1.2) / (1 + d * 0.15); if (w > tw) { tw = w; tx = dx / (d + 0.01); ty = dy / (d + 0.01); } } }
  if (tw === 0 && gem.n) { let bd = 1e9, bi = -1; for (let i = 0; i < gem.n; i += 2) { const dx = gem.x[i] - PL.x, dy = gem.y[i] - PL.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } } if (bi >= 0 && bd < 144) { const d = Math.sqrt(bd) + 0.01; tx = (gem.x[bi] - PL.x) / d; ty = (gem.y[bi] - PL.y) / d; tw = 1.1; } }
  if (!cn && tw === 0) { const a = Gs.clock * 0.3; tx = Math.cos(a); ty = Math.sin(a); tw = 0.5; }
  x += tx * tw; y += ty * tw;
  const l = Math.hypot(x, y) || 1; bot.x = x / l; bot.y = y / l;
  bot.dash = (near < 0.5 && fl > 4) || (Gs.bossAtk && Gs.bossAtk.t > 0.15 && inTelegraph(PL.x, PL.y, 0.4));
  if (Gs.bossAtk && Gs.bossAtk.t > 0) { const b = bossIndex(); if (b >= 0) { const dx = PL.x - H.x[b], dy = PL.y - H.y[b], d = Math.hypot(dx, dy) || 1; if (Gs.bossAtk.k === 'dash') { bot.x = -dy / d; bot.y = dx / d; } else if (inTelegraph(PL.x, PL.y, 0.8)) { bot.x = dx / d; bot.y = dy / d; } } }
}

// ---------------- boss ----------------
function inTelegraph(x, y, pad) {
  const a = Gs.bossAtk; if (!a) return false; const dx = x - a.x, dy = y - a.y;
  if (a.k === 'sweep') { const d = Math.hypot(dx, dy); if (d > a.r + pad) return false; let da = Math.atan2(dy, dx) - a.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); return Math.abs(da) < 1.05; }
  if (a.k === 'dash') { const ux = Math.cos(a.ang), uy = Math.sin(a.ang), along = dx * ux + dy * uy, side = Math.abs(-dx * uy + dy * ux); return along > -1 && along < a.r && side < 1.0 + pad; }
  if (a.k === 'nova') return Math.hypot(dx, dy) < a.r + pad;
  return false;
}
function bossUpdate(dt) {
  const b = bossIndex(); if (b < 0) return;
  const P2 = Gs.bossPhase === 2, bx = H.x[b], by = H.y[b], dx = PL.x - bx, dy = PL.y - by, d = Math.hypot(dx, dy) || 1;
  Gs.bossSwing = Math.max(0, Gs.bossSwing - dt * 2.5);
  const a = Gs.bossAtk;
  if (!a) {
    const sp = P2 ? 3.1 : 2.4; H.x[b] += dx / d * sp * dt; H.y[b] += dy / d * sp * dt;
    Gs.bossCD -= dt;
    if (Gs.bossCD <= 0) {
      const r = rand(); const k = d < 5.5 && r < 0.45 ? 'sweep' : r < 0.7 ? 'dash' : r < 0.9 ? 'nova' : 'summon';
      Gs.bossAtk = { k, t: k === 'summon' ? 0.3 : P2 ? 0.55 : 0.75, x: bx, y: by, ang: Math.atan2(dy, dx), r: k === 'sweep' ? 5 : k === 'dash' ? 13 : k === 'nova' ? 3.2 : 0, hit: false, go: 0 };
      audio.play('warn');
    }
  } else if (a.t > 0) {
    a.t -= dt; a.x = H.x[b]; a.y = H.y[b];
    if (a.k === 'sweep') a.ang = damp(a.ang, Math.atan2(dy, dx), 2, dt);
    if (a.t <= 0) {
      if (a.k === 'sweep') { Gs.bossSwing = 1; audio.play('scythe'); if (inTelegraph(PL.x, PL.y, 0)) hurtPlayer(P2 ? 36 : 28, bx, by); Gs.shake = 0.4; addFx(FXK.RING, bx, by, 5, 0, 0, 0.3, 1); }
      else if (a.k === 'dash') { a.go = 0.55; audio.play('scythe'); }
      else if (a.k === 'nova') { const n = P2 ? 18 : 12; for (let k = 0; k < n; k++) { const ang = (k / n) * TAU + (P2 ? Gs.clock : 0); const i = A.proj.add(PK.SICKLE, bx, by, Math.cos(ang) * 5.5, Math.sin(ang) * 5.5, 3.2, P2 ? 20 : 16, 1, 0.45, -1); if (i >= 0) { A.proj.hostile[i] = 1; A.proj.rotv[i] = 10; } } if (inTelegraph(PL.x, PL.y, 0)) hurtPlayer(22, bx, by); audio.play('thunder'); addFx(FXK.RING, bx, by, 3.2, 0, 0, 0.35, 1); }
      else if (a.k === 'summon') { const n = P2 ? 30 : 20; for (let k = 0; k < n; k++) { const ang = (k / n) * TAU; spawnEnemy(0, PL.x + Math.cos(ang) * 7, PL.y + Math.sin(ang) * 6, { hpMul: hpMul() }); } UI.banner('RISE, MY CHILDREN!', '#c9a6ff', 1.4); }
      if (a.go <= 0) { Gs.bossAtk = null; Gs.bossCD = P2 ? 1.3 : 2.0; }
    }
  } else if (a.go > 0) { // charging along the lane
    a.go -= dt; const ux = Math.cos(a.ang), uy = Math.sin(a.ang); H.x[b] += ux * 22 * dt; H.y[b] += uy * 22 * dt;
    if (Math.hypot(PL.x - H.x[b], PL.y - H.y[b]) < 1.5) hurtPlayer(P2 ? 32 : 26, H.x[b], H.y[b]);
    if (Gs.frame % 2 === 0) addPt(H.x[b], 1.2, H.y[b], 0, 0.5, 0, 0.4, 1.4, 2, 0.6, 0.3, 0.8, 0, 0);
    if (a.go <= 0) { Gs.bossAtk = null; Gs.bossCD = P2 ? 1.2 : 1.9; }
  }
  // keep the boss on screen-ish
  if (Math.abs(H.x[b] - PL.x) > VIEW.hx + 3) H.x[b] = PL.x + Math.sign(H.x[b] - PL.x) * (VIEW.hx + 3);
  if (Math.abs(H.y[b] - PL.y) > VIEW.hyUp + 3) H.y[b] = PL.y + Math.sign(H.y[b] - PL.y) * (VIEW.hyUp + 3);
}

// ---------------- simulation step ----------------
const DT = 1 / 60;
function step(dt) {
  const S = Gs.stats, playing = Gs.state === 'play' || Gs.state === 'attract';
  if (!playing) return;
  Gs.clock += dt; Gs.frame++; Gs.killFrame = 0; Gs.numFrame = 0; Gs.sparkFrame = 0;
  if (Gs.slowT > 0) { Gs.slowT -= dt / Math.max(Gs.slow, 0.05); if (Gs.slowT <= 0) Gs.slow = 1; }
  for (let i = 0; i < queue.length; i++) if (queue[i].t <= Gs.clock) { const q = queue[i]; queue.splice(i--, 1); q.fn(); if (Gs.state !== 'play' && Gs.state !== 'attract') return; }
  if (Gs.dying) { updateFx(dt); return; }
  if (Gs.boss < 0 && !Gs.won) Gs.t += dt;
  // player
  if (Gs.attract || bot.on) botThink(dt);
  inputVec(IV);
  if (Gs.attract && bot.dash) dashQueued = 0.1; if (bot.on && bot.dash) dashQueued = 0.1;
  const spd = 3.5 * S.move; let tx = IV[0] * spd, ty = IV[1] * spd;
  Gs.dashCD -= dt; dashQueued -= dt;
  if (dashQueued > 0 && Gs.dashCD <= 0 && Gs.dashT <= 0) {
    let dx = IV[0], dy = IV[1]; if (!dx && !dy) { dx = Gs.faceX; dy = Gs.faceY; } const l = Math.hypot(dx, dy) || 1;
    Gs.dashX = dx / l; Gs.dashY = dy / l; Gs.dashT = 0.18; Gs.dashCD = 2.2; Gs.iframe = Math.max(Gs.iframe, 0.34); dashQueued = 0; audio.play('dash');
    if (Gs.bossAtk && inTelegraph(PL.x, PL.y, 0.3)) word('wDodge', PL.x, PL.y);
  }
  if (Gs.dashT > 0) { Gs.dashT -= dt; PL.vx = Gs.dashX * 15; PL.vy = Gs.dashY * 15; if (Gs.frame % 2 === 0) addFx(FXK.AFTER, PL.x, PL.y, Gs.yaw, 0, 0, 0.25, 0); }
  else { const k = 1 - Math.exp(-14 * dt); PL.vx += (tx - PL.vx) * k; PL.vy += (ty - PL.vy) * k; }
  PL.x += PL.vx * dt; PL.y += PL.vy * dt;
  const mv = Math.hypot(PL.vx, PL.vy); Gs.moveAmt = damp(Gs.moveAmt, clamp(mv / 3.5, 0, 1), 12, dt); Gs.walkPh += mv * dt * 2.6;
  if (Math.hypot(IV[0], IV[1]) > 0.2) { const l = Math.hypot(IV[0], IV[1]); Gs.faceX = IV[0] / l; Gs.faceY = IV[1] / l; if (Math.abs(IV[0]) > 0.15) Gs.lastHX = Math.sign(IV[0]); }
  Gs.iframe -= dt; Gs.blink -= dt; Gs.hurtCD -= dt;
  Gs.hp = Math.min(Gs.maxhp, Gs.hp + S.recovery * dt);
  // horde
  const due = Gs.boss >= 0 ? (H.n < 30 && Gs.frame % 20 === 0 ? 1 : 0) : Gs.won ? 0 : WD.update(Gs.t, dt, H.n, onEvent);
  const p = WD.cur; let toSpawn = due;
  if (Gs.minHorde && H.n < Gs.minHorde) toSpawn = Math.min(Gs.minHorde - H.n, 120);
  for (let k = 0; k < toSpawn; k++) { spawnPos(SP, true); spawnEnemy(Gs.boss >= 0 ? 0 : WD.pickType(p, rand()), SP[0], SP[1], { hpMul: hpMul(), dmgMul: 0.55 + Gs.t / 600 * 0.75 }); }
  HASH.build(PL.x, PL.y, H.n, H.x, H.y);
  const farR = Math.max(VIEW.hx, VIEW.hyUp, VIEW.hyDn) * 1.5 + 4;
  H.update(dt, PL.x, PL.y, HASH, Gs.frame, farR, relocate);
  bossUpdate(dt);
  HASH.build(PL.x, PL.y, H.n, H.x, H.y);
  // contact damage
  if (Gs.hurtCD <= 0) {
    const n = HASH.query(PL.x, PL.y, 1.6, BQ); let dmg = 0, cnt = 0;
    for (let q = 0; q < n; q++) { const i = BQ[q]; if (i >= H.n) continue; const dx = H.x[i] - PL.x, dy = H.y[i] - PL.y, rr = H.rad[i] + 0.3; if (dx * dx + dy * dy < rr * rr) { const d = H.dmg[i]; dmg = cnt === 0 ? d : Math.max(dmg, d) + Math.min(dmg, d) * 0.35; if (++cnt >= 4) break; } }
    if (dmg > 0) { if (hurtPlayer(dmg, PL.x, PL.y)) Gs.hurtCD = 0.55; }
  }
  // weapons
  ctx.px = PL.x; ctx.py = PL.y; ctx.fx_ = Gs.faceX; ctx.fy_ = Gs.faceY; ctx.lastHX = Gs.lastHX; ctx.stats = S; ctx.time = Gs.clock;
  ctx.viewHX = VIEW.hx; ctx.viewHY = VIEW.hyDn;
  A.update(dt, ctx);
  for (let i = 0; i < A.proj.n; i++) { const kd = A.proj.kind[i]; if (kd === PK.KNIFE || kd === PK.AXE || kd === PK.BOLT || kd === PK.SPIRAL) for (let j = br.n - 1; j >= 0; j--) { const dx = br.x[j] - A.proj.x[i], dy = br.y[j] - A.proj.y[i]; if (dx * dx + dy * dy < 0.6) breakBrazier(j); } }
  reap();
  // gems & pickups
  const mag = S.magnet, mag2 = mag * mag;
  if (Gs.vacuum > 0) Gs.vacuum -= dt;
  for (let i = gem.n - 1; i >= 0; i--) {
    const dx = PL.x - gem.x[i], dy = PL.y - gem.y[i], d2 = dx * dx + dy * dy;
    if (!gem.fly[i] && (d2 < mag2 || Gs.vacuum > 0)) { gem.fly[i] = 1; gem.sp[i] = -3; }
    if (gem.fly[i]) {
      gem.sp[i] += dt * (Gs.vacuum > 0 ? 40 : 28); const d = Math.sqrt(d2) + 1e-5, s = Math.min(gem.sp[i] * dt, d);
      gem.x[i] += dx / d * s; gem.y[i] += dy / d * s;
      if (d < 0.45) { gainXp(gem.v[i]); audio.play('gem', Gs.level); const j = --gem.n; gem.x[i] = gem.x[j]; gem.y[i] = gem.y[j]; gem.v[i] = gem.v[j]; gem.fly[i] = gem.fly[j]; gem.sp[i] = gem.sp[j]; gem.c[i] = gem.c[j]; gem.sp0[i] = gem.sp0[j]; }
    }
  }
  for (let i = pk.n - 1; i >= 0; i--) {
    pk.t[i] += dt; const dx = PL.x - pk.x[i], dy = PL.y - pk.y[i], d = Math.hypot(dx, dy);
    if (pk.k[i] !== PKK.CHEST && d < mag) pk.fly[i] = 1;
    if (pk.fly[i]) { const s = Math.min(9 * dt, d); pk.x[i] += dx / (d + 1e-5) * s; pk.y[i] += dy / (d + 1e-5) * s; }
    if (d < (pk.k[i] === PKK.CHEST ? 1.0 : 0.5)) {
      const k = pk.k[i]; const j = --pk.n; pk.x[i] = pk.x[j]; pk.y[i] = pk.y[j]; pk.k[i] = pk.k[j]; pk.fly[i] = pk.fly[j]; pk.t[i] = pk.t[j];
      if (k === PKK.COIN) { Gs.gold += 1; audio.play('gold'); }
      else if (k === PKK.BAG) { Gs.gold += 25; audio.play('gold'); word('wGold', PL.x, PL.y); }
      else if (k === PKK.CHICKEN) { Gs.hp = Math.min(Gs.maxhp, Gs.hp + 30); audio.play('heal'); word('wHeal', PL.x, PL.y); }
      else if (k === PKK.ORB) { Gs.vacuum = 2.5; audio.play('vacuum'); for (let g = 0; g < gem.n; g++) { gem.fly[g] = 1; gem.sp[g] = -2; } }
      else if (k === PKK.CHEST) { openChest(); return; }
    }
  }
  // braziers: keep a few just off screen
  Gs.braT -= dt;
  if (Gs.braT <= 0) { Gs.braT = 4; for (let i = br.n - 1; i >= 0; i--) if (Math.hypot(br.x[i] - PL.x, br.y[i] - PL.y) > 32) { br.n--; br.x[i] = br.x[br.n]; br.y[i] = br.y[br.n]; } if (br.n < 5) { spawnPos(SP, true); br.x[br.n] = SP[0]; br.y[br.n] = SP[1]; br.n++; } }
  for (let i = br.n - 1; i >= 0; i--) if (Math.hypot(br.x[i] - PL.x, br.y[i] - PL.y) < 0.9) breakBrazier(i);
  updateFx(dt);
  if (Gs.pendingLv > 0 && Gs.state === (Gs.attract ? 'attract' : 'play')) openLevelUp();
  audio.intensity = clamp(Gs.t / 420, 0, 1) * 0.85 + (Gs.boss >= 0 ? 0.3 : 0) + (Gs.bloodmoon ? 0.2 : 0);
}
function updateFx(dt) {
  for (let i = pt.n - 1; i >= 0; i--) {
    pt.life[i] -= dt; if (pt.life[i] <= 0) { const j = --pt.n; pt.x[i] = pt.x[j]; pt.y[i] = pt.y[j]; pt.z[i] = pt.z[j]; pt.vx[i] = pt.vx[j]; pt.vy[i] = pt.vy[j]; pt.vz[i] = pt.vz[j]; pt.life[i] = pt.life[j]; pt.max[i] = pt.max[j]; pt.s[i] = pt.s[j]; pt.sp[i] = pt.sp[j]; pt.r[i] = pt.r[j]; pt.g[i] = pt.g[j]; pt.b[i] = pt.b[j]; pt.grav[i] = pt.grav[j]; pt.add[i] = pt.add[j]; continue; }
    pt.x[i] += pt.vx[i] * dt; pt.y[i] += pt.vy[i] * dt; pt.z[i] += pt.vz[i] * dt; pt.vz[i] -= pt.grav[i] * dt; if (pt.z[i] < 0.05) { pt.z[i] = 0.05; pt.vz[i] *= -0.3; pt.vx[i] *= 0.6; pt.vy[i] *= 0.6; }
    const k = Math.exp(-3 * dt); pt.vx[i] *= k; pt.vy[i] *= k;
  }
  for (let i = dn.n - 1; i >= 0; i--) { dn.life[i] -= dt; dn.z[i] += dt * 1.6; if (dn.life[i] <= 0) { const j = --dn.n; dn.x[i] = dn.x[j]; dn.y[i] = dn.y[j]; dn.z[i] = dn.z[j]; dn.v[i] = dn.v[j]; dn.life[i] = dn.life[j]; dn.c[i] = dn.c[j]; } }
  for (let i = fxl.n - 1; i >= 0; i--) { fxl.life[i] -= dt; if (fxl.life[i] <= 0) { const j = --fxl.n; fxl.k[i] = fxl.k[j]; fxl.x[i] = fxl.x[j]; fxl.y[i] = fxl.y[j]; fxl.a[i] = fxl.a[j]; fxl.b[i] = fxl.b[j]; fxl.c[i] = fxl.c[j]; fxl.life[i] = fxl.life[j]; fxl.max[i] = fxl.max[j]; fxl.e[i] = fxl.e[j]; } }
}

// ---------------- render ----------------
const PERF = { fps: 60, ms: 16.7, sim: 0, draw: 0, frames: 0, enemies: 0 };
const CBLACK = [0.08, 0.06, 0.12];
function render(rdt) {
  const t = Gs.clock;
  const lead = 0.35; camX = damp(camX, PL.x + PL.vx * lead, 5, rdt); camY = damp(camY, PL.y + PL.vy * lead, 5, rdt);
  Gs.shake = Math.max(0, Gs.shake - rdt * 2.2);
  placeCamera(camX, camY, Gs.shake * Gs.shake * 0.9); camera.updateMatrixWorld();
  RIGHT.setFromMatrixColumn(camera.matrixWorld, 0); UP.setFromMatrixColumn(camera.matrixWorld, 1);
  for (const Lr of BILL) { Lr.uniforms.uRight.value.copy(RIGHT); Lr.uniforms.uUp.value.copy(UP); }
  ground.position.set(Math.round(camX / TILE) * TILE, 0, Math.round(camY / TILE) * TILE);
  rebuildProps(camX, camY);
  lantern.position.set(PL.x, 1.6, PL.y + 0.4);
  moon.position.set(camX - 4, 10, camY + 6); moon.target.position.set(camX, 0, camY);
  // hero
  const hm = Gs.moveAmt; const targetYaw = Math.atan2(Gs.faceX, Gs.faceY);
  let dy = targetYaw - Gs.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); Gs.yaw += dy * (1 - Math.exp(-14 * rdt));
  if (Gs.atkT > 0) Gs.atkT += rdt * 4; if (Gs.atkT > 1) Gs.atkT = 0;
  const fl = HERO.mat.userData.flash; fl.value = Math.max(0, fl.value - rdt * 5);
  HERO.root.position.set(PL.x, 0, PL.y); HERO.root.rotation.y = Gs.yaw; HERO.anim(Gs.walkPh, t, hm, Gs.atkT);
  if (Gs.blink > 0 && fl.value < 0.3 && ((performance.now() / 70) | 0) % 2 === 0) { fl.value = 0.55; HERO.mat.userData.flashC.value.set('#ffffff'); }
  if (Gs.dying) { HERO.root.rotation.x = damp(HERO.root.rotation.x, -1.4, 6, rdt); } else HERO.root.rotation.x = 0;
  // reaper
  const b = bossIndex();
  if (b >= 0) {
    REAPER.root.position.set(H.x[b], 0, H.y[b]); const ya = Math.atan2(PL.x - H.x[b], PL.y - H.y[b]); REAPER.root.rotation.y = ya;
    REAPER.anim(0, t, Gs.bossSwing); REAPER.mat.userData.flash.value = H.flash[b] > 0 ? 0.7 : 0; REAPER.mat.userData.flashC.value.set('#ffffff');
    if (Gs.bossPhase === 2) REAPER.mat.emissive.set('#3a0a30'); else REAPER.mat.emissive.set('#000000');
    UI.bossHp(H.hp[b] / H.maxhp[b]);
  }
  // horde impostors + shadows (cull to view)
  L_HORDE.begin(); L_SHADOW.begin(); L_DECAL.begin(); L_GADD.begin(); L_ADD.begin(); L_TOP.begin();
  const x0 = camX - VIEW.hxTop - 2, x1 = camX + VIEW.hxTop + 2, y0 = camY - VIEW.hyUp - 2, y1 = camY + VIEW.hyDn + 3;
  let vis = 0;
  for (let i = 0; i < H.n; i++) {
    const x = H.x[i], y = H.y[i]; if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    const ty = H.type[i]; if (ty === BOSS_T) continue;
    const s = H.scale[i], T = ENEMY_TYPES[ty]; vis++;
    const f = ((H.phase[i] / TAU * 8) | 0) & 7, uv = BAKE.uv[ty * 8 + f], w = BAKE.box * s;
    const fla = H.flash[i] > 0 ? 1 + Math.min(1, H.flash[i] * 9) * 0.85 : 1;
    if (H.elite[i]) L_HORDE.push(x, T.fly * 0.3, y, H.face[i] < 0 ? -w : w, w, 0, uv, 1, 0.78 + Math.sin(t * 6) * 0.1, 0.7, fla);
    else L_HORDE.push(x, 0, y, H.face[i] < 0 ? -w : w, w, 0, uv, 1, 1, 1, fla);
    L_SHADOW.push(x, 0.02, y, 1.1 * s * (T.fly ? 0.8 : 1), 0.55 * s, 0, R.shadow, 1, 1, 1, T.fly ? 0.6 : 1);
    if (H.elite[i]) { L_GADD.push(x, 0.03, y, 2.6 * s * 0.6, 2.6 * s * 0.6, t * 1.5, R.aura, 1, 0.3, 0.2, 0.9); }
  }
  PERF.enemies = H.n; PERF.visible = vis;
  // player shadow + lantern pool + hp bar
  L_SHADOW.push(PL.x, 0.02, PL.y, 1.3, 0.65, 0, R.shadow);
  L_GADD.push(PL.x, 0.02, PL.y, 7, 7, 0, R.glow, 0.5, 0.32, 0.15, 0.45);
  if (Gs.state !== 'attract' || true) {
    const fr = clamp(Gs.hp / Gs.maxhp, 0, 1), bw = 1.3;
    L_TOP.push(PL.x, -0.25, PL.y + 0.75, bw + 0.12, 0.2, 0, R.white, CBLACK[0], CBLACK[1], CBLACK[2], 1);
    L_TOP.push(PL.x - (bw * (1 - fr)) / 2, -0.25, PL.y + 0.75, bw * fr, 0.12, 0, R.white, 1, fr < 0.3 ? 0.2 + Math.sin(t * 12) * 0.2 : 0.18, 0.3, 1);
  }
  // aura, books, telegraphs, pools
  if (A.auraR > 0) { const p = 1 + Math.sin(t * 5) * 0.03; const e = A.auraEvo; L_GADD.push(PL.x, 0.04, PL.y, A.auraR * 2 * p, A.auraR * 2 * p, t * 0.8, R.aura, e ? 0.7 : 1, e ? 0.3 : 0.55, e ? 1 : 0.2, 0.8); }
  if (Gs.dashCD > 0 && Gs.state === 'play') L_TOP.push(PL.x, -0.35, PL.y + 0.95, 1.3 * (1 - Gs.dashCD / 2.2), 0.06, 0, R.white, 0.5, 0.95, 1, 0.9);
  const ba = Gs.bossAtk;
  if (ba && ba.t > 0) {
    const pr = 1 - ba.t / (Gs.bossPhase === 2 ? 0.55 : 0.75), c = 0.8 + Math.sin(t * 30) * 0.2;
    if (ba.k === 'sweep') { L_DECAL.push(ba.x, 0.03, ba.y, ba.r, ba.r, ba.ang * -1, R.sector, c, 0.12, 0.2, 0.85); L_DECAL.push(ba.x, 0.035, ba.y, ba.r * pr, ba.r * pr, -ba.ang, R.sector, 1, 0.2, 0.3, 0.6); }
    else if (ba.k === 'dash') { L_DECAL.push(ba.x + Math.cos(ba.ang) * ba.r / 2, 0.03, ba.y + Math.sin(ba.ang) * ba.r / 2, ba.r, 2.0, -ba.ang, R.lane, c, 0.12, 0.2, 0.85); }
    else if (ba.k === 'nova') { L_DECAL.push(ba.x, 0.03, ba.y, ba.r * 2, ba.r * 2, 0, R.disk, c, 0.1, 0.5, 0.8); L_DECAL.push(ba.x, 0.035, ba.y, ba.r * 2 * pr, ba.r * 2 * pr, 0, R.disk, 1, 0.2, 0.6, 0.5); }
  }
  // gems / pickups / braziers
  I_GEM.begin(); for (let i = 0; i < gem.n; i++) { const x = gem.x[i], y = gem.y[i]; if (x < x0 || x > x1 || y < y0 || y > y1) continue; const c = gem.c[i], s = c === 2 ? 1.5 : c === 1 ? 1.15 : 0.9; I_GEM.push(x, 0.35 + Math.sin(t * 3 + gem.sp0[i]) * 0.08, y, t * 2 + gem.sp0[i], s); I_GEM.mesh.setColorAt(I_GEM.n - 1, GEMCOL[c]); } I_GEM.end(); if (I_GEM.mesh.instanceColor) I_GEM.mesh.instanceColor.needsUpdate = true;
  I_COIN.begin(); I_CHEST.begin(); I_CHICK.begin(); I_ORB.begin();
  for (let i = 0; i < pk.n; i++) {
    const x = pk.x[i], y = pk.y[i], k = pk.k[i], bob = Math.sin(t * 3 + i) * 0.08;
    if (k === PKK.COIN || k === PKK.BAG) I_COIN.push(x, 0.4 + bob, y, t * 4, k === PKK.BAG ? 1.8 : 1.2);
    else if (k === PKK.CHEST) { I_CHEST.push(x, Math.abs(Math.sin(t * 4)) * 0.15, y, Math.sin(t * 2) * 0.3, 1.2); L_GADD.push(x, 0.03, y, 3, 3, -t, R.aura, 1, 0.85, 0.3, 0.9); L_ADD.push(x, 1.8 + bob, y, 1.4, 1.4, 0, R.star, 1, 0.9, 0.4, 0.8); }
    else if (k === PKK.CHICKEN) I_CHICK.push(x, 0.2 + bob, y, t, 1.1);
    else if (k === PKK.ORB) { I_ORB.push(x, 0.6 + bob, y, t * 2, 1.2); L_ADD.push(x, 0.6 + bob, y, 1.6, 1.6, 0, R.glow, 0.4, 0.9, 1, 0.8); }
    L_SHADOW.push(x, 0.02, y, 0.7, 0.35, 0, R.shadow);
  }
  I_COIN.end(); I_CHEST.end(); I_CHICK.end(); I_ORB.end();
  BRAZ.begin(); for (let i = 0; i < br.n; i++) { BRAZ.push(br.x[i], 0, br.y[i], 0, 1); L_ADD.push(br.x[i], 1.15, br.y[i], 0.7, 0.9 + Math.sin(t * 13 + i) * 0.1, 0, R.flame, 1, 0.8, 0.5, 1); L_GADD.push(br.x[i], 0.03, br.y[i], 3.5, 3.5, 0, R.glow, 0.6, 0.35, 0.12, 0.6); } BRAZ.end();
  // projectiles
  const P = A.proj; I_KNIFE.begin(); I_AXE.begin(); I_FLASK.begin(); I_BOOK.begin(); I_SCY.begin(); I_SICK.begin();
  for (let i = 0; i < P.n; i++) {
    const x = P.x[i], y = P.y[i], k = P.kind[i];
    if (k === PK.KNIFE) { I_KNIFE.push(x, 0.9, y, -Math.atan2(P.vy[i], P.vx[i]), P.evo[i] ? 1.2 : 1); if (P.evo[i]) L_ADD.push(x, 0.9, y, 0.9, 0.9, 0, R.glow, 0.7, 0.85, 1, 0.5); }
    else if (k === PK.BOLT) { const e = P.evo[i]; L_ADD.push(x, 1.0, y, 1.1, 1.1, 0, R.glow, e ? 1 : 0.45, e ? 0.85 : 0.7, e ? 0.3 : 1, 1); L_ADD.push(x, 1.0, y, 0.45, 0.45, 0, R.dot, 1, 1, 1, 1); if ((Gs.frame + i) % 3 === 0) addPt(x, 1.0, y, 0, 0, 0, 0.25, 0.35, 0, e ? 1 : 0.5, e ? 0.8 : 0.7, e ? 0.3 : 1, 0, 1); }
    else if (k === PK.AXE) { const sc = P.a[i] || 1; I_AXE.push(x, 1.0, y, 0, sc * 1.15, Math.PI / 2 - 0.4, P.rot[i]); L_SHADOW.push(x, 0.02, y, 0.7, 0.35, 0, R.shadow); }
    else if (k === PK.FLASK) { I_FLASK.push(x, P.h[i], y, P.rot[i], 1.1, P.life[i] * 8); L_SHADOW.push(x, 0.02, y, 0.5, 0.25, 0, R.shadow); }
    else if (k === PK.POOL) { const fade = Math.min(1, P.life[i] * 3, (P.maxLife[i] - P.life[i]) * 8); L_GADD.push(x, 0.03, y, P.rad[i] * 2.2, P.rad[i] * 2.2, t * 0.6, R.pool, 0.6, 0.9, 1, fade); if ((Gs.frame + i) % 4 === 0) addPt(x + (rand() - 0.5) * P.rad[i] * 1.6, 0.1, y + (rand() - 0.5) * P.rad[i] * 1.4, 0, 2.5, 0, 0.5, 0.5, 5, 0.5, 0.9, 1, 0, 1); }
    else if (k === PK.SPIRAL) { I_SCY.push(x, 0.8, y, P.rot[i], 1.5); L_ADD.push(x, 0.8, y, 1.6, 1.6, 0, R.glow, 0.6, 0.7, 1, 0.45); }
    else if (k === PK.SICKLE) { I_SICK.push(x, 1.0, y, P.rot[i], 1.3); L_ADD.push(x, 1.0, y, 1.4, 1.4, 0, R.glow, 1, 0.3, 0.9, 0.8); }
  }
  if (A.bookShow) { for (let k = 0; k < A.bookShow; k++) { const a = A.bookAng + (k / A.bookShow) * TAU, bx = PL.x + Math.cos(a) * A.bookR, by = PL.y + Math.sin(a) * A.bookR * 0.85; I_BOOK.push(bx, 1.0, by, -a, A.bookEvo ? 1.4 : 1.2); L_ADD.push(bx, 1.0, by, 1.3, 1.3, 0, R.glow, A.bookEvo ? 0.7 : 1, 0.4, A.bookEvo ? 1 : 0.35, 0.55); L_SHADOW.push(bx, 0.02, by, 0.6, 0.3, 0, R.shadow); } }
  I_KNIFE.end(); I_AXE.end(); I_FLASK.end(); I_BOOK.end(); I_SCY.end(); I_SICK.end();
  // fx list
  for (let i = 0; i < fxl.n; i++) {
    const k = fxl.k[i], u = 1 - fxl.life[i] / fxl.max[i];
    if (k === FXK.SLASH) { const dir = fxl.a[i], len = fxl.b[i], wid = fxl.c[i], e = fxl.e[i], s = 0.6 + u * 0.5, al = 1 - u * u; L_GADD.push(fxl.x[i], 0.06, fxl.y[i], (dir > 0 ? len : -len) * s * 1.05, wid * 1.6, 0, R.slash, e ? 1 : 1, e ? 0.15 : 0.92, e ? 0.3 : 0.85, al); L_ADD.push(fxl.x[i], 0.9, fxl.y[i] + 0.1, (dir > 0 ? len : -len) * s, wid * 0.9, 0, R.slash, e ? 1 : 1, e ? 0.3 : 0.95, e ? 0.4 : 0.9, al * 0.8); }
    else if (k === FXK.BOLT) { const al = 1 - u; L_ADD.push(fxl.x[i], 0, fxl.y[i], 1.2, 9, 0, R.bolt, 0.75, 0.9, 1, al); L_GADD.push(fxl.x[i], 0.04, fxl.y[i], fxl.a[i] * 3, fxl.a[i] * 3, 0, R.glow, 0.6, 0.85, 1, al); }
    else if (k === FXK.SPLASH) { const al = 1 - u; L_GADD.push(fxl.x[i], 0.05, fxl.y[i], fxl.a[i] * 2 * (0.5 + u), fxl.a[i] * 2 * (0.5 + u), 0, R.ring, 0.6, 0.95, 1, al); }
    else if (k === FXK.RING) { const al = 1 - u, r = fxl.a[i] * (0.3 + u * 1.2); L_GADD.push(fxl.x[i], 0.05, fxl.y[i], r * 2, r * 2, 0, R.ring, fxl.e[i] ? 1 : 1, fxl.e[i] ? 0.3 : 0.85, fxl.e[i] ? 0.9 : 0.3, al); }
    else if (k === FXK.WORD) { const pop = u < 0.15 ? 0.6 + u / 0.15 * 0.5 : 1.1 - Math.min(0.1, (u - 0.15)); const al = u > 0.75 ? (1 - u) / 0.25 : 1; L_TOP.push(fxl.x[i], 2.6 + u * 0.8, fxl.y[i], 3.6 * pop, 1.27 * pop, 0, R[WORDS[fxl.e[i]]], 1, 1, 1, al); }
    else if (k === FXK.AFTER) { const al = (1 - u) * 0.6; L_ADD.push(fxl.x[i], 0.9, fxl.y[i], 1.4, 2.0, 0, R.glow, 1, 0.5, 0.4, al); }
  }
  for (let i = 0; i < pt.n; i++) { const u = pt.life[i] / pt.max[i], s = pt.s[i] * (pt.sp[i] === 2 ? 1.6 - u * 0.6 : 0.4 + u * 0.6); const Lr = pt.add[i] ? L_ADD : L_TOP; Lr.push(pt.x[i], pt.z[i], pt.y[i], s, pt.sp[i] === 1 ? s * 0.3 : s, pt.sp[i] === 1 ? Math.atan2(pt.vz[i], Math.hypot(pt.vx[i], pt.vy[i])) : 0, PSPR[pt.sp[i]], pt.r[i], pt.g[i], pt.b[i], pt.add[i] ? u : u * 0.5); }
  // damage numbers (comic digits)
  for (let i = 0; i < dn.n; i++) {
    let v = dn.v[i]; const c = DNC[dn.c[i]], u = dn.life[i] / 0.6, pop = u > 0.85 ? 1 + (u - 0.85) * 3 : 1, sz = (dn.c[i] === 1 ? 0.62 : dn.c[i] === 2 ? 0.7 : 0.48) * pop, al = Math.min(1, u * 3);
    let digits = 0, tmp = v; do { digits++; tmp = (tmp / 10) | 0; } while (tmp > 0);
    const dw = sz * 0.62; let x = dn.x[i] + (digits - 1) * dw * 0.5;
    do { const d = v % 10; L_TOP.push(x, dn.z[i], dn.y[i], dw, sz, 0, R['d' + d], c[0], c[1], c[2], al); x -= dw; v = (v / 10) | 0; } while (v > 0);
  }
  L_HORDE.end(); L_SHADOW.end(); L_DECAL.end(); L_GADD.end(); L_ADD.end(); L_TOP.end();
  renderer.render(scene, camera);
}

// ---------------- HUD / overlays ----------------
const UI = (() => {
  const el = {}; for (const id of ['xpfill', 'lv', 'timer', 'kills', 'gold', 'wslots', 'pslots', 'banner', 'bossbar', 'bossfill', 'stickB', 'stickK', 'ov', 'hurt', 'dashfill', 'title', 'best0']) el[id] = $(id);
  let last = { t: -1, k: -1, g: -1, xp: -1, lv: -1, dash: -1 }, bannerT = 0, sel = 0, cards = [], onPick = null, lock = 0, mode = '';
  const icon = (id) => `<img alt="" src="${BAKE.icons[id] || ''}">`;
  const fmt = (s) => { s = Math.floor(s); return String((s / 60) | 0).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  function show(html, cls) { el.ov.className = 'on ' + cls; el.ov.innerHTML = html; mode = cls; lock = performance.now() + 280; }
  function hide() { el.ov.className = ''; el.ov.innerHTML = ''; mode = ''; cards = []; }
  function selCard(i) { if (!cards.length) return; sel = (i + cards.length) % cards.length; el.ov.querySelectorAll('.card').forEach((c, k) => c.classList.toggle('sel', k === sel)); audio.play('ui'); }
  function pick(i, force) { if ((!force && performance.now() < lock) || !cards.length) return; const o = cards[i]; const f = onPick; hide(); f(o); }
  el.ov.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.ov.addEventListener('click', (e) => {
    const c = e.target.closest('[data-i]'); if (c && mode === 'level') { pick(+c.dataset.i); return; }
    const b = e.target.closest('[data-act]'); if (!b) return; audio.init();
    const a = b.dataset.act;
    if (a === 'continue' && mode === 'chest') { if (performance.now() < lock) return; const f = onPick; hide(); f(); }
    else if (a === 'resume') pauseGame(false);
    else if (a === 'restart') { hide(); audio.pause(false); startRun(); }
    else if (a === 'mute') { toggleMute(); b.textContent = audio.muted ? 'SOUND: OFF' : 'SOUND: ON'; }
    else if (a === 'retry') startRun();
  });
  return {
    tick(rdt) {
      const tsec = Math.floor(Gs.boss >= 0 || Gs.won ? 600 : Gs.t); if (tsec !== last.t) { last.t = tsec; el.timer.textContent = fmt(tsec); }
      if (Gs.kills !== last.k && (Gs.frame % 6 === 0 || Gs.kills - last.k > 50)) { last.k = Gs.kills; el.kills.textContent = Gs.kills.toLocaleString('en-US'); }
      if (Gs.gold !== last.g) { last.g = Gs.gold; el.gold.textContent = Gs.gold; }
      const xp = Math.round(Gs.xp / Gs.xpNext * 200) / 200; if (xp !== last.xp) { last.xp = xp; el.xpfill.style.transform = `scaleX(${xp})`; }
      if (Gs.level !== last.lv) { last.lv = Gs.level; el.lv.textContent = 'LV ' + Gs.level; }
      const dsh = Gs.dashCD > 0 ? Math.round((1 - Gs.dashCD / 2.2) * 20) / 20 : 1; if (dsh !== last.dash) { last.dash = dsh; el.dashfill.style.transform = `scaleY(${dsh})`; $('bDash').classList.toggle('ready', dsh >= 1); }
      if (bannerT > 0) { bannerT -= rdt; if (bannerT <= 0) el.banner.classList.remove('on'); }
    },
    banner(text, col, dur = 1.6) { el.banner.textContent = text; el.banner.style.color = col; el.banner.classList.remove('on'); void el.banner.offsetWidth; el.banner.classList.add('on'); bannerT = dur; },
    hurt() { el.hurt.classList.remove('on'); void el.hurt.offsetWidth; el.hurt.classList.add('on'); },
    boss(on) { el.bossbar.classList.toggle('on', on); },
    bossHp(f) { el.bossfill.style.transform = `scaleX(${Math.max(0, f)})`; },
    stick(on, x, y, dx, dy) { el.stickB.classList.toggle('on', on); if (on) { el.stickB.style.transform = `translate(${x}px,${y}px)`; el.stickK.style.transform = `translate(${dx}px,${dy}px)`; } },
    refreshSlots() {
      let h = ''; for (let i = 0; i < MAX_WEAPONS; i++) { const w = A.weapons[i]; h += w ? `<div class="slot${w.evo ? ' evo' : ''}">${icon(w.evo ? EVOS[w.evo].icon : w.id)}<b>${w.evo ? '★' : w.lvl}</b></div>` : '<div class="slot empty"></div>'; }
      el.wslots.innerHTML = h; h = '';
      for (let i = 0; i < MAX_PASSIVES; i++) { const p = A.passives[i]; h += p ? `<div class="slot">${icon(p.id)}<b>${p.lvl}</b></div>` : '<div class="slot empty"></div>'; }
      el.pslots.innerHTML = h;
    },
    levelUp(offers, cb) {
      cards = offers; onPick = cb; sel = 0;
      const html = `<div class="panel lvl"><h2>LEVEL UP!</h2><div class="cards">${offers.map((o, i) => {
        const d = o.type === 'w' ? WEAPONS[o.id] : PASSIVES[o.id];
        const desc = o.type === 'w' ? d.desc[o.lvl - 1] : d.desc;
        const evo = o.type === 'w' && d.evo ? `<i>Evolves with ${PASSIVES[d.with].name}</i>` : o.type === 'p' ? evoHint(o.id) : '';
        return `<button class="card${i === 0 ? ' sel' : ''}" data-i="${i}" type="button">${icon(o.id)}<div class="ct"><div class="cn">${d.name}<span>${o.isNew ? 'NEW!' : 'LV ' + o.lvl}</span></div><div class="cd">${desc}</div>${evo}</div><kbd>${i + 1}</kbd></button>`;
      }).join('')}</div><div class="hint">${TOUCH ? 'Tap a card' : '←/→ or 1-' + offers.length + ' · Enter to pick'}</div></div>`;
      show(html, 'level');
      if (Gs.attract) later(0.0, () => {});
    },
    chest(results, evo, cb) {
      onPick = cb; cards = [];
      show(`<div class="panel chest${evo ? ' evo' : ''}"><h2>${evo ? 'EVOLVED!' : 'TREASURE!'}</h2><div class="loot">${results.map((r) => `<div class="li${r.evo ? ' big' : ''}">${icon(r.icon)}<div><b>${r.name}</b><span>${r.desc}</span></div></div>`).join('')}</div><button class="btn" data-act="continue" type="button">CONTINUE</button></div>`, 'chest');
    },
    pause(on) {
      if (!on) { hide(); return; }
      show(`<div class="panel"><h2>PAUSED</h2><div class="col"><button class="btn" data-act="resume" type="button">RESUME</button><button class="btn alt" data-act="restart" type="button">RESTART RUN</button><button class="btn alt" data-act="mute" type="button">${audio.muted ? 'SOUND: OFF' : 'SOUND: ON'}</button></div><div class="build">${A.weapons.map((w) => icon(w.evo ? EVOS[w.evo].icon : w.id)).join('')}${A.passives.map((p) => icon(p.id)).join('')}</div></div>`, 'pause');
    },
    results(won, run, best, isBest) {
      const row = (k, v) => `<div class="st"><span>${k}</span><b>${v}</b></div>`;
      show(`<div class="panel res${won ? ' win' : ''}"><h2>${won ? 'DAWN BREAKS!' : 'YOU FELL'}</h2><div class="sub">${won ? 'The Reaper is slain. You survived the night.' : 'The night claims another hunter.'}</div>
        <div class="stats">${row('TIME', fmt(run.time))}${row('KILLS', run.kills.toLocaleString('en-US'))}${row('LEVEL', run.level)}${row('GOLD', run.gold)}</div>
        <div class="bestl">${isBest ? '<em>NEW BEST RUN!</em>' : `BEST: ${best.win ? 'CLEARED' : fmt(best.time)} · ${best.kills.toLocaleString('en-US')} kills · LV ${best.level}`}</div>
        ${Gs.evolved.length ? `<div class="evol">Evolved: ${Gs.evolved.join(', ')}</div>` : ''}
        <button class="btn big" data-act="retry" type="button">⟲ RETRY</button><div class="hint">${TOUCH ? 'Tap RETRY' : 'Enter / Space to retry'}</div></div>`, 'res');
    },
    title(on) { el.title.classList.toggle('on', on); if (on) { let best = null; try { best = JSON.parse(localStorage.getItem('survivorsPlus.best') || 'null'); } catch (e) { /* */ } el.best0.textContent = best ? `BEST RUN · ${best.win ? 'CLEARED' : fmt(best.time)} · ${best.kills.toLocaleString('en-US')} KILLS` : ''; } },
    onKey(c) {
      if (mode === 'level') {
        if (c === 'ArrowLeft' || c === 'KeyA' || c === 'ArrowUp' || c === 'KeyW') selCard(sel - 1);
        else if (c === 'ArrowRight' || c === 'KeyD' || c === 'ArrowDown' || c === 'KeyS') selCard(sel + 1);
        else if (c === 'Enter' || c === 'Space' || c === 'KeyJ' || c === 'KeyK') pick(sel);
        else if (/^Digit[1-4]$/.test(c)) { const i = +c.slice(5) - 1; if (i < cards.length) pick(i); }
        else if (c === 'KeyM') toggleMute();
        return true;
      }
      if (mode === 'chest') { if (c === 'Enter' || c === 'Space' || c === 'KeyJ' || c === 'KeyK' || c === 'Escape') { if (performance.now() < lock) return true; const f = onPick; hide(); f(); } else if (c === 'KeyM') toggleMute(); return true; }
      if (mode === 'res') { if ((c === 'Enter' || c === 'Space' || c === 'KeyJ' || c === 'KeyR') && performance.now() >= lock) startRun(); else if (c === 'KeyM') toggleMute(); return true; }
      return false;
    },
    autoPick() { const ok = bot.on || performance.now() >= lock + 500; if (mode === 'level' && ok) pick(botPick(cards), true); else if (mode === 'chest' && ok) { const f = onPick; hide(); f(); } },
    get mode() { return mode; }, hide,
  };
})();
function evoHint(pid) { for (const id in WEAPONS) if (WEAPONS[id].with === pid) return `<i>Evolves ${WEAPONS[id].name}</i>`; return ''; }
// bot card choice: build toward evolutions (weapon + its passive), then levels
function botPick(offers) {
  let best = 0, bs = -1;
  offers.forEach((o, i) => {
    let s = rand() * 0.5;
    if (o.type === 'w') { s += o.isNew ? (A.weapons.length < 4 ? 3 : 1) : 4 + o.lvl * 0.2; if (['lash', 'dagger', 'censer', 'psalter', 'bolt', 'axe'].includes(o.id)) s += 1; }
    else { const pairs = A.weapons.some((w) => WEAPONS[w.id].with === o.id); s += pairs ? 4.5 : o.isNew ? 1 : 2; if (o.id === 'heart' || o.id === 'chalice') s += 0.5; }
    if (s > bs) { bs = s; best = i; }
  });
  return best;
}

// ---------------- flow ----------------
function startRun() {
  UI.hide(); UI.title(false); bot.on = Q.has('bot'); stick.on = false; UI.stick(false);
  const bench = +Q.get('bench') || 0;
  resetState({ attract: false, t: +Q.get('t') || (bench ? 480 : 0), invuln: bench > 0 || Q.has('god'), minHorde: bench });
  if (bench) benchBuild();
  audio.pause(false);
  UI.banner('SURVIVE 10:00!', '#ffd23c', 2.2);
}
function benchBuild() {
  for (const id of ['dagger', 'censer', 'psalter', 'bolt', 'axe']) A.addWeapon(id);
  for (const id of ['heart', 'bracer', 'chalice', 'binder', 'tome', 'candle']) A.addPassive(id);
  for (const w of A.weapons) { w.lvl = 8; A.evolve(w); }
  for (const p of A.passives) p.lvl = 3;
  recomputeStats(); Gs.hp = Gs.maxhp; Gs.level = 40; Gs.xpNext = XPN(40); UI.refreshSlots();
}
function startAttract() {
  resetState({ attract: true, t: 200, seed: 4242 });
  for (const id of ['dagger', 'censer', 'psalter', 'bolt']) A.addWeapon(id);
  A.weapons[0].lvl = 6; A.weapons[1].lvl = 5; A.weapons[2].lvl = 3; A.weapons[3].lvl = 4; A.weapons[4].lvl = 3;
  A.addPassive('heart'); A.addPassive('ember'); A.passives[1].lvl = 2; Gs.level = 18; Gs.xpNext = XPN(18);
  recomputeStats(); Gs.hp = Gs.maxhp; UI.refreshSlots();
  for (let k = 0; k < 180; k++) { spawnPos(SP, false); spawnEnemy(WD.pickType(WD.phaseAt(200), rand()), SP[0] + (rand() - 0.5) * 4, SP[1] + (rand() - 0.5) * 4, { hpMul: hpMul() }); }
  UI.title(true);
}

// ---------------- main loop ----------------
let acc = 0, lastT = performance.now(), fpsAcc = 0, fpsN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let rdt = (now - lastT) / 1000; lastT = now; if (rdt > 0.1) rdt = 0.1; if (rdt < 0) rdt = 0;
  fpsAcc += rdt; fpsN++; if (fpsAcc >= 0.5) { PERF.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  const t0 = performance.now();
  if (Gs.hitstop > 0) { Gs.hitstop -= rdt; }
  else {
    acc += rdt * (Gs.slow || 1); let steps = 0;
    while (acc >= DT && steps < 4) { step(DT); acc -= DT; steps++; }
    if (steps >= 4) acc = 0;
  }
  if (Gs.state === 'attract' && UI.mode) UI.autoPick();
  if (bot.on && UI.mode && UI.mode !== 'res' && UI.mode !== 'pause') UI.autoPick();
  const t1 = performance.now();
  render(rdt); UI.tick(rdt); audio.tick(Gs.state === 'play', Gs.hp / Gs.maxhp);
  const t2 = performance.now();
  PERF.sim = damp(PERF.sim, t1 - t0, 4, rdt); PERF.draw = damp(PERF.draw, t2 - t1, 4, rdt); PERF.frames++;
}
try { if (localStorage.getItem('survivorsPlus.mute') === '1') { audio.muted = true; $('bMute').textContent = '🔇'; } } catch (e) { /* */ }
layout();
if (Q.has('play') || Q.has('bench') || Q.has('bot')) startRun(); else startAttract();
requestAnimationFrame((t) => { lastT = t; frame(t); });
document.body.classList.toggle('touch', TOUCH);

// QA hooks (headless tests drive the sim deterministically through these)
window.__vs = {
  Gs, H, A, PL, PERF, gem, pk, keys, bot, VIEW,
  hold: 0, holdUI(sec) { this.hold = Math.round(sec / DT); },
  advance(sec) { const n = Math.round(sec / DT); for (let i = 0; i < n; i++) { step(DT); if (UI.mode && this.hold > 0) { this.hold--; continue; } if (Gs.state === 'attract' && UI.mode) UI.autoPick(); if (bot.on && UI.mode && UI.mode !== 'res' && UI.mode !== 'pause') UI.autoPick(); } render(DT); UI.tick(DT); return this.snap(); },
  snap() { return { state: Gs.state, t: +Gs.t.toFixed(1), n: H.n, kills: Gs.kills, lv: Gs.level, hp: Math.round(Gs.hp), maxhp: Gs.maxhp, gold: Gs.gold, weapons: A.weapons.map((w) => w.id + w.lvl + (w.evo ? '*' + w.evo : '')), passives: A.passives.map((p) => p.id + p.lvl), boss: Gs.boss >= 0 ? Math.round(Gs.bossHp) : null, ui: UI.mode, gems: gem.n, proj: A.proj.n, evolved: Gs.evolved.slice() }; },
  start: startRun, attract: startAttract, setBot(on) { bot.on = on; }, setTime(t) { Gs.t = t; while (WD.ei < EVENTS.length && EVENTS[WD.ei].t <= t) WD.ei++; },
  spawnN(n) { for (let k = 0; k < n; k++) { spawnPos(SP, false); spawnEnemy(WD.pickType(WD.phaseAt(Gs.t), rand()), SP[0] + (rand() - 0.5) * 6, SP[1] + (rand() - 0.5) * 6, { hpMul: hpMul() }); } },
  zoom(f) { VIEW.dist *= f; camera.near = VIEW.dist * 0.4; camera.updateProjectionMatrix(); },
  build: benchBuild, chest() { addPickup(PKK.CHEST, PL.x + 0.5, PL.y); }, reaper: startReaper, hurt: (d) => hurtPlayer(d, PL.x, PL.y), ui: () => UI.mode,
};
