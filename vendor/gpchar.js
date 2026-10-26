// gpchar.js — procedural characters for gamepress. Zero external model files.
// Builds recognizable humanoids and animals from code: rounded shapes, real
// proportions, jointed rigs, procedural animation. No skeletal-animation files.
//
// CONVENTIONS:
//   Humanoids face +X (combat convention: the fight plane is XY, characters
//   flip with scale.x = facing). Animals face +Z (gpkit convention).
//   Units: 1 unit = ~1.1 m. Humanoid height ~1.52 (≈7.6 heads — real
//   proportions, not minecraft).
//
// Usage:
//   import { buildHumanoid, setPose, update } from './gpchar.js';
//   const rig = buildHumanoid({ gi: 0x3a6ea5, hair: 'headband' });
//   scene.add(rig.group);
//   setPose(rig, 'guard');
//   // per frame: update(rig, dt, { exclude: ['shoulderR','elbowR','wristR'] });
//   //   (exclude = joints your game drives directly, e.g. a weapon arm)
//
// Joints (rig.joints): hips, spine, chest, neck, head,
//   shoulderL/R, elbowL/R, wristL/R, hipL/R, kneeL/R, ankleL/R.
// Special targets: $hipsY (crouch), read/written via rig.targets.

import * as THREE from './three.module.min.js';

// ---------------------------------------------------------------- materials
let _grad = null;
function gradientMap() {
  if (_grad !== undefined && _grad !== null) return _grad;
  try {
    const data = new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
    const t = new THREE.DataTexture(data, 3, 1);
    t.needsUpdate = true;
    t.minFilter = THREE.NearestFilter;
    t.magFilter = THREE.NearestFilter;
    _grad = t;
  } catch (e) { _grad = null; }
  return _grad;
}
/** 3-step toon material. Falls back to Lambert if the gradient can't build. */
export function toon(color = 0xffffff, o = {}) {
  const g = gradientMap();
  if (g) return new THREE.MeshToonMaterial({ color, gradientMap: g, ...o });
  return new THREE.MeshLambertMaterial({ color, ...o });
}

// ---------------------------------------------------------------- helpers
/** mesh helper: geometry + material, positioned, shadow-casting. */
function M(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
/** joint helper: empty Group at a position. Children rotate around it. */
function J(x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  return g;
}
const sph = (r, w = 12, h = 10) => new THREE.SphereGeometry(r, w, h);
const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 4, 10);
const cyl = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

export const SKIN_TONES = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];

// ------------------------------------------------------------------ face
// Geometry face on a +X-facing head of radius hr. Bold simple features —
// Jet Set Radio / Wind Waker read: visible at 3/4 camera angle.
function addFace(headG, hr, skin, hairColor) {
  const dark = toon(0x1c1c22), white = toon(0xffffff);
  const fx = hr * 0.88; // face plane offset
  // eyes
  for (const s of [-1, 1]) {
    headG.add(M(sph(hr * 0.21, 10, 8), dark, fx, hr * 0.18, s * hr * 0.42));
    const glint = M(sph(hr * 0.07, 6, 5), white, fx + hr * 0.13, hr * 0.24, s * hr * 0.47);
    glint.castShadow = false;
    headG.add(glint);
  }
  // brows — angled, determined
  for (const s of [-1, 1]) {
    const b = M(box(hr * 0.12, hr * 0.14, hr * 0.5), toon(hairColor), fx - hr * 0.02, hr * 0.62, s * hr * 0.42);
    b.rotation.x = -s * 0.18;
    headG.add(b);
  }
  // nose hint
  headG.add(M(sph(hr * 0.15, 8, 6), toon(skin), fx + hr * 0.08, -hr * 0.05, 0));
  // mouth — flat determined line
  headG.add(M(box(hr * 0.08, hr * 0.12, hr * 0.55), toon(0x8a4030), fx - hr * 0.02, -hr * 0.52, 0));
  // ears
  for (const s of [-1, 1]) {
    const e = M(sph(hr * 0.28, 8, 6), toon(skin), 0, hr * 0.05, s * hr * 0.98);
    e.scale.set(0.55, 1, 0.75);
    headG.add(e);
  }
}

// ------------------------------------------------------------------ hair
function addHair(headG, hr, style, hairColor, bandColor) {
  const hm = toon(hairColor);
  const parts = {};
  if (style === 'spiky') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spike = M(new THREE.ConeGeometry(hr * 0.28, hr * 0.7, 7), hm,
        -hr * 0.25 + Math.cos(a) * hr * 0.25, hr * 0.95, Math.sin(a) * hr * 0.55);
      spike.rotation.z = 0.9;
      spike.rotation.y = -a;
      headG.add(spike);
    }
    const capM = M(sph(hr * 1.02, 12, 8), hm, -hr * 0.1, hr * 0.45, 0);
    capM.scale.set(1, 0.62, 1);
    headG.add(capM);
  } else if (style === 'topknot') {
    const capM = M(sph(hr * 1.03, 12, 8), hm, -hr * 0.08, hr * 0.4, 0);
    capM.scale.set(1, 0.66, 1);
    headG.add(capM);
    headG.add(M(sph(hr * 0.34, 8, 6), hm, -hr * 0.35, hr * 1.15, 0)); // bun
  } else if (style === 'long') {
    const capM = M(sph(hr * 1.03, 12, 8), hm, -hr * 0.08, hr * 0.4, 0);
    capM.scale.set(1, 0.66, 1);
    headG.add(capM);
    const tail = M(cap(hr * 0.32, hr * 0.9), hm, -hr * 1.0, -hr * 0.4, 0);
    tail.rotation.z = 0.25;
    headG.add(tail);
  } else if (style === 'headband' || style === 'band') {
    const band = M(cyl(hr * 1.04, hr * 1.04, hr * 0.55, 14), toon(bandColor), 0, hr * 0.35, 0);
    band.rotation.z = Math.PI / 2; // ring around the X axis
    headG.add(band);
    const knot = M(sph(hr * 0.3, 8, 6), toon(bandColor), -hr * 0.95, hr * 0.45, 0);
    headG.add(knot);
    // fluttering tails (animated by the game)
    const t1 = M(box(hr * 0.18, hr * 1.6, hr * 0.3), toon(bandColor), -hr * 1.05, -hr * 0.5, hr * 0.25);
    const t2 = M(box(hr * 0.18, hr * 1.3, hr * 0.3), toon(bandColor), -hr * 1.1, -hr * 0.4, -hr * 0.2);
    headG.add(t1); headG.add(t2);
    parts.tail1 = t1; parts.tail2 = t2;
  }
  // 'bald' → nothing
  return parts;
}

// ---------------------------------------------------------------- humanoid
// Faces +X. Total height ~1.52 (≈7.6 heads). Proportions: real humanoid —
// tapered torso (wide shoulders, narrow waist), jointed limbs, rounded head
// with a face. NOT boxes.
//
// Options: {
//   skin, gi (top), giTrim, pants, belt, hairColor, bandColor,
//   hair: 'headband'|'spiky'|'topknot'|'long'|'bald',
//   armor: bool (shoulder pads), skirt: bool (hakama flare),
// }
export const HIPS_Y = 0.745;
export const CHAR_HEIGHT = 1.52;

export function buildHumanoid(o = {}) {
  const {
    skin = SKIN_TONES[0], gi = 0x3a6ea5, giTrim = 0xf0e6d2, pants = 0x2a2438,
    belt = 0x14141e, hair = 'headband', hairColor = 0x2a2018, bandColor = 0xc22a2a,
    armor = false, skirt = false,
  } = o;
  const skinM = toon(skin), giM = toon(gi), trimM = toon(giTrim),
        pantsM = toon(pants), beltM = toon(belt);

  const group = new THREE.Group();
  const joints = {}, parts = {};

  // ---- hips / pelvis
  const hips = joints.hips = J(0, HIPS_Y, 0);
  group.add(hips);
  const pelvis = M(sph(0.14, 12, 10), pantsM, 0, 0.02, 0);
  pelvis.scale.set(1.0, 0.72, 1.15);
  hips.add(pelvis);
  const beltMsh = M(new THREE.TorusGeometry(0.15, 0.032, 8, 18), beltM, 0, 0.10, 0);
  beltMsh.rotation.y = Math.PI / 2;
  hips.add(beltMsh);
  if (skirt) { // hakama flare
    hips.add(M(cyl(0.20, 0.30, 0.28, 10), pantsM, 0, -0.06, 0));
  }

  // ---- spine → chest
  const spine = joints.spine = J(0, 0.10, 0);
  hips.add(spine);
  const belly = M(cyl(0.150, 0.135, 0.20, 12), giM, 0, 0.08, 0);
  belly.scale.x = 0.72;
  spine.add(belly);
  const chest = joints.chest = J(0, 0.20, 0);
  spine.add(chest);
  parts.torso = chest;
  const chestMsh = M(cyl(0.205, 0.150, 0.34, 12), giM, 0, 0.12, 0);
  chestMsh.scale.x = 0.68;
  chest.add(chestMsh);
  // gi lapel cross on the chest front (+X)
  for (const s of [-1, 1]) {
    const lap = M(box(0.02, 0.30, 0.10), trimM, 0.128, 0.12, s * 0.055);
    lap.rotation.x = s * 0.5;
    chest.add(lap);
  }
  if (armor) {
    for (const s of [-1, 1]) {
      const pad = M(sph(0.11, 10, 8), toon(0x3a3450), 0.02, 0.28, s * 0.26);
      pad.scale.set(1, 0.62, 1);
      chest.add(pad);
    }
  }

  // ---- neck → head
  const neck = joints.neck = J(0, 0.30, 0);
  chest.add(neck);
  neck.add(M(cyl(0.048, 0.048, 0.10, 8), skinM, 0, 0.03, 0));
  const head = joints.head = J(0, 0.10, 0);
  neck.add(head);
  parts.head = head;
  const hr = 0.10; // head radius → 0.20 head height
  const headMsh = M(sph(hr, 14, 12), skinM, 0, 0, 0);
  headMsh.scale.set(0.95, 1.05, 0.92); // faint egg, not a ball
  head.add(headMsh);
  addFace(head, hr, skin, hairColor);
  Object.assign(parts, addHair(head, hr, hair, hairColor, bandColor));

  // ---- arms (shoulder pivots; weapon arm = R)
  for (const s of [-1, 1]) {
    const nm = s < 0 ? 'L' : 'R';
    const sh = joints['shoulder' + nm] = J(0.0, 0.22, s * 0.26);
    chest.add(sh);
    sh.add(M(cap(0.062, 0.20), giM, 0, -0.13, 0)); // upper arm (sleeve)
    const el = joints['elbow' + nm] = J(0, -0.28, 0);
    sh.add(el);
    el.add(M(cap(0.052, 0.18), skinM, 0, -0.12, 0)); // forearm
    const wr = joints['wrist' + nm] = J(0, -0.26, 0);
    el.add(wr);
    const hand = M(sph(0.060, 10, 8), skinM, 0, -0.05, 0);
    hand.scale.set(0.9, 1.15, 0.85);
    wr.add(hand);
  }
  parts.armR = joints.shoulderR; parts.armL = joints.shoulderL;
  parts.hand = joints.wristR;
  // weapon mount on the right wrist (blade-duel convention)
  const weaponMount = new THREE.Group();
  weaponMount.position.set(0, -0.08, 0);
  joints.wristR.add(weaponMount);
  parts.weaponMount = weaponMount;

  // ---- legs (hip pivots)
  for (const s of [-1, 1]) {
    const nm = s < 0 ? 'L' : 'R';
    const hp = joints['hip' + nm] = J(-0.01, 0, s * 0.105);
    hips.add(hp);
    hp.add(M(cap(0.088, 0.22), pantsM, 0, -0.15, 0)); // thigh
    const kn = joints['knee' + nm] = J(0, -0.34, 0);
    hp.add(kn);
    kn.add(M(cap(0.068, 0.20), pantsM, 0, -0.14, 0)); // shin
    const an = joints['ankle' + nm] = J(0, -0.32, 0);
    kn.add(an);
    const foot = M(sph(0.075, 10, 8), skinM, 0.045, -0.045, 0); // bare foot, toes +X
    foot.scale.set(1.6, 0.55, 0.95);
    an.add(foot);
  }
  parts.legL = joints.hipL; parts.legR = joints.hipR;

  const rig = { group, joints, parts, height: CHAR_HEIGHT, headH: hr * 2 };
  rig.userData = { pose: 'idle', poseT: 0, walkPhase: 0, attackT: 0, poseOpts: {}, hipsBaseY: HIPS_Y };
  rig.targets = {}; // desired joint eulers, written by setPose
  return rig;
}

// ---------------------------------------------------------------- poses
// Sign conventions (+X-facing rig, rotations about Z):
//   hanging limb (-Y) rotated by +a → swings FORWARD (+X).
//   chest up (+Y) rotated by +a → leans BACKWARD. Forward lean = -a.
//   knee flexion (foot backward) = -a. Elbow bend (hand forward) = +a.
//   head nod down = -a.
//
// A pose = { joints: {name:[x,y,z]}, special: { $hipsY } } or a function
// (t, opts) => pose for dynamic poses (walk, attack).
const _J = (o) => ({ joints: o, special: {} });

const POSE_DEFS = {
  idle: () => _J({
    hips: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, -0.04], neck: [0, 0, 0], head: [0, 0, 0.02],
    shoulderL: [0, 0, 0.15], elbowL: [0, 0, 0.25], wristL: [0, 0, 0],
    shoulderR: [0, 0, 0.15], elbowR: [0, 0, 0.25], wristR: [0, 0, 0],
    hipL: [0, 0, 0.04], kneeL: [0, 0, -0.08], ankleL: [0, 0, 0.04],
    hipR: [0, 0, -0.04], kneeR: [0, 0, -0.08], ankleR: [0, 0, 0.04],
  }),
  guard: (t, o = {}) => {
    const lean = o.lean || 0, crouch = o.crouch || 0;
    return {
      joints: {
        hips: [0, 0, 0], spine: [0, 0, -0.06], chest: [0, 0, -0.14 - lean], neck: [0, 0, 0.06], head: [0, 0, 0],
        shoulderL: [0, 0, 0.9], elbowL: [0, 0, 1.1], wristL: [0, 0, 0],
        shoulderR: [0, 0, 1.5], elbowR: [0, 0, 0.9], wristR: [0, 0, 0],
        hipL: [0, 0, 0.18], kneeL: [0, 0, -0.35 - crouch * 1.2], ankleL: [0, 0, 0.2],
        hipR: [0, 0, -0.18], kneeR: [0, 0, -0.35 - crouch * 1.2], ankleR: [0, 0, 0.2],
      },
      special: { $hipsY: HIPS_Y - 0.06 - crouch * 0.30 },
    };
  },
  walk: (t, o = {}) => {
    const p = o.phase || 0, s = Math.sin(p), c = Math.cos(p);
    return {
      joints: {
        hips: [0, 0.06 * s, 0], spine: [0, -0.05 * s, -0.06], chest: [0, 0, -0.10], neck: [0, 0, 0.04], head: [0, 0, 0],
        shoulderL: [0, 0, -s * 0.45 + 0.1], elbowL: [0, 0, 0.45],
        shoulderR: [0, 0, s * 0.45 + 0.1], elbowR: [0, 0, 0.45],
        hipL: [0, 0, s * 0.55], kneeL: [0, 0, -Math.max(0, s) * 0.95 - 0.06], ankleL: [0, 0, -s * 0.2],
        hipR: [0, 0, -s * 0.55], kneeR: [0, 0, -Math.max(0, -s) * 0.95 - 0.06], ankleR: [0, 0, s * 0.2],
      },
      special: { $hipsY: HIPS_Y - Math.abs(c) * 0.035 },
    };
  },
  crouch: () => ({
    joints: {
      hips: [0, 0, 0], spine: [0, 0, -0.15], chest: [0, 0, -0.38], neck: [0, 0, 0.2], head: [0, 0, -0.1],
      shoulderL: [0, 0, 0.4], elbowL: [0, 0, 0.7],
      shoulderR: [0, 0, 0.7], elbowR: [0, 0, 0.8],
      hipL: [0, 0, 0.5], kneeL: [0, 0, -1.15], ankleL: [0, 0, 0.65],
      hipR: [0, 0, -0.5], kneeR: [0, 0, -1.15], ankleR: [0, 0, 0.65],
    },
    special: { $hipsY: HIPS_Y - 0.30 },
  }),
  hit: () => _J({
    hips: [0, 0, 0], spine: [0, 0, 0.18], chest: [0, 0, 0.38], neck: [0, 0, 0.25], head: [0, 0, 0.3],
    shoulderL: [0, 0, 1.4], elbowL: [0, 0, 0.4],
    shoulderR: [0, 0, 1.2], elbowR: [0, 0, 0.4],
    hipL: [0, 0, -0.15], kneeL: [0, 0, -0.25], ankleL: [0, 0, 0.1],
    hipR: [0, 0, 0.15], kneeR: [0, 0, -0.25], ankleR: [0, 0, 0.1],
  }),
  dead: () => ({
    joints: {
      hips: [0, 0, 0.1], spine: [0, 0, 0.25], chest: [0, 0, 0.3], neck: [0, 0, 0.3], head: [0, 0.4, 0.35],
      shoulderL: [0.3, 0, 0.5], elbowL: [0, 0, 0.2],
      shoulderR: [-0.3, 0, 0.7], elbowR: [0, 0, 0.3],
      hipL: [0, 0, 0.25], kneeL: [0, 0, -0.5], ankleL: [0, 0, 0.2],
      hipR: [0, 0, -0.2], kneeR: [0, 0, -0.7], ankleR: [0, 0, 0.3],
    },
    special: { $hipsY: HIPS_Y - 0.52 },
  }),
  victory: (t) => {
    const b = Math.abs(Math.sin(t * 6)) * 0.05;
    return {
      joints: {
        hips: [0, 0, 0], spine: [0, 0, 0.10], chest: [0, 0, 0.16], neck: [0, 0, -0.1], head: [0, 0, -0.22],
        shoulderL: [0, 0, 2.65], elbowL: [0, 0, 0.25],
        shoulderR: [0, 0, 2.65], elbowR: [0, 0, 0.25],
        hipL: [0, 0, 0.06], kneeL: [0, 0, -0.10], ankleL: [0, 0, 0.05],
        hipR: [0, 0, -0.06], kneeR: [0, 0, -0.10], ankleR: [0, 0, 0.05],
      },
      special: { $hipsY: HIPS_Y + b },
    };
  },
};
export const POSE_NAMES = [...Object.keys(POSE_DEFS), 'attack'];

// Weapon-aware attack keyframes. Each = [t, pose] list, t in 0..1.
// windup (0→0.38, easeInOut) → strike (0.38→0.58, accelerating snap) → recover.
const ATTACKS = {
  slash: [ // katana, bat, baguette, bunny, chicken — diagonal cleave
    [0.00, { shoulderR: [0, 0, 1.1], elbowR: [0, 0, 0.9], chest: [0, -0.2, -0.05], hipsY: 0 }],
    [0.38, { shoulderR: [0, 0, 3.6], elbowR: [0, 0, 1.3], chest: [0, -0.55, 0.10], hipsY: -0.03 }],
    [0.58, { shoulderR: [0, 0, 0.55], elbowR: [0, 0, 0.12], chest: [0, 0.5, -0.22], hipsY: -0.05 }],
    [1.00, { shoulderR: [0, 0, 1.5], elbowR: [0, 0, 0.9], chest: [0, 0, -0.14], hipsY: -0.06 }],
  ],
  thrust: [ // mid-stance pierce
    [0.00, { shoulderR: [0, 0, 1.2], elbowR: [0, 0, 1.2], chest: [0, -0.15, -0.05], hipsY: 0 }],
    [0.38, { shoulderR: [0, 0, 0.9], elbowR: [0, 0, 1.6], chest: [0, -0.35, 0.05], hipsY: -0.02 }],
    [0.58, { shoulderR: [0, 0, 1.65], elbowR: [0, 0, 0.05], chest: [0, 0.15, -0.30], hipsY: -0.04 }],
    [1.00, { shoulderR: [0, 0, 1.5], elbowR: [0, 0, 0.9], chest: [0, 0, -0.14], hipsY: -0.06 }],
  ],
  overhead: [ // chainsaw — two hands, slam down
    [0.00, { shoulderR: [0, 0, 1.0], shoulderL: [0, 0, 1.0], elbowR: [0, 0, 0.8], elbowL: [0, 0, 0.8], chest: [0, 0, -0.05], hipsY: 0 }],
    [0.38, { shoulderR: [0, 0, 3.9], shoulderL: [0, 0, 3.9], elbowR: [0, 0, 0.9], elbowL: [0, 0, 0.9], chest: [0, 0, 0.18], hipsY: -0.02 }],
    [0.58, { shoulderR: [0, 0, 0.35], shoulderL: [0, 0, 0.35], elbowR: [0, 0, 0.2], elbowL: [0, 0, 0.2], chest: [0, 0, -0.38], hipsY: -0.10 }],
    [1.00, { shoulderR: [0, 0, 1.5], shoulderL: [0, 0, 0.9], elbowR: [0, 0, 0.9], elbowL: [0, 0, 1.1], chest: [0, 0, -0.14], hipsY: -0.06 }],
  ],
  whack: [ // pillow — wide horizontal swat, big body twist
    [0.00, { shoulderR: [0.9, 0, 1.0], elbowR: [0, 0, 0.6], chest: [0, -0.5, -0.05], hipsY: 0 }],
    [0.38, { shoulderR: [1.5, 0, 1.2], elbowR: [0, 0, 0.7], chest: [0, -0.9, 0.05], hipsY: -0.02 }],
    [0.58, { shoulderR: [-0.7, 0, 1.1], elbowR: [0, 0, 0.25], chest: [0, 0.7, -0.15], hipsY: -0.04 }],
    [1.00, { shoulderR: [0, 0, 1.5], elbowR: [0, 0, 0.9], chest: [0, 0, -0.14], hipsY: -0.06 }],
  ],
};
export const ATTACK_NAMES = Object.keys(ATTACKS);

function _attackPose(weapon, attackT) {
  const keys = ATTACKS[weapon] || ATTACKS.slash;
  let i = 0;
  while (i < keys.length - 2 && attackT > keys[i + 1][0]) i++;
  const [t0, p0] = keys[i], [t1, p1] = keys[i + 1];
  let u = Math.min(1, Math.max(0, (attackT - t0) / (t1 - t0)));
  // strike segment snaps (accelerating), others ease
  u = i === 1 ? u * u : u * u * (3 - 2 * u);
  const joints = {};
  const names = new Set([...Object.keys(p0), ...Object.keys(p1)]);
  names.delete('hipsY');
  for (const n of names) {
    const a = p0[n] || [0, 0, 0], b = p1[n] || [0, 0, 0];
    joints[n] = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  }
  // fill the rest of the body with guard-ish defaults
  const base = POSE_DEFS.guard(0, {});
  for (const [n, e] of Object.entries(base.joints)) if (!joints[n]) joints[n] = e;
  const hy = (p0.hipsY || 0) + ((p1.hipsY || 0) - (p0.hipsY || 0)) * u;
  return { joints, special: { $hipsY: HIPS_Y - 0.06 + hy } };
}

function _targetsFor(rig, name, t, opts) {
  if (name === 'attack') return _attackPose(opts.weapon || 'slash', opts.attackT || 0);
  const def = POSE_DEFS[name] || POSE_DEFS.idle;
  return def(t, opts);
}

/** Set the target pose. Smooth interpolation happens in update().
 *  opts: { weapon:'slash'|'thrust'|'overhead'|'whack', dur, next, speed,
 *          lean, crouch, rate }.
 *  'attack' plays once then moves to opts.next (default 'guard'). */
export function setPose(rig, name, opts = {}) {
  const u = rig.userData;
  u.pose = name; u.poseT = 0; u.poseOpts = opts;
  if (name === 'attack') u.attackT = 0;
  return rig;
}

/** Advance pose interpolation. Call every frame.
 *  exclude: joint names your game drives directly (e.g. a weapon arm). */
export function update(rig, dt, o = {}) {
  const u = rig.userData;
  u.poseT += dt;
  if (u.pose === 'attack') {
    u.attackT += dt / (u.poseOpts.dur || 0.45);
    if (u.attackT >= 1) setPose(rig, u.poseOpts.next || 'guard', {});
  }
  if (u.pose === 'walk') u.walkPhase += dt * (u.poseOpts.rate || 9);
  const { joints, special } = _targetsFor(rig, u.pose, u.poseT,
    { ...u.poseOpts, phase: u.walkPhase, attackT: u.attackT });
  // idle breathing — layered on top
  if (u.pose === 'idle') {
    const b = Math.sin(u.poseT * 2.2) * 0.03;
    joints.chest = [joints.chest[0], joints.chest[1], joints.chest[2] + b];
  }
  const k = 1 - Math.exp(-dt * (u.poseOpts.speed || 12));
  const ex = new Set(o.exclude || []);
  for (const [name, e] of Object.entries(joints)) {
    if (ex.has(name)) continue;
    const j = rig.joints[name];
    if (!j) continue;
    j.rotation.x += (e[0] - j.rotation.x) * k;
    j.rotation.y += (e[1] - j.rotation.y) * k;
    j.rotation.z += (e[2] - j.rotation.z) * k;
  }
  if (special && special.$hipsY !== undefined && !ex.has('hips')) {
    const h = rig.joints.hips;
    h.position.y += (special.$hipsY - h.position.y) * k;
  }
  return rig;
}

// ---------------------------------------------------------------- animals
// Face +Z (gpkit convention). Silhouette-first: each must read as its animal
// from the shadow alone — ears for the bunny, tail + whiskers for the cat,
// snout + floppy ears for the dog.

function critterBase() {
  const group = new THREE.Group();
  const parts = {};
  const userData = { mode: 'idle', phase: 0 };
  return { group, parts, userData };
}

// ---- bunny: long ears, round body, fluffy tail. Hops.
export function buildBunny(o = {}) {
  const { fur = 0xf5f0e8, inner = 0xf2b8c6 } = o;
  const furM = toon(fur), pinkM = toon(inner), darkM = toon(0x1c1c22);
  const c = critterBase();
  const { group, parts } = c;

  const body = parts.body = J(0, 0.34, 0);
  group.add(body);
  const belly = M(sph(0.30, 14, 12), furM, 0, 0, 0);
  belly.scale.set(1, 0.95, 1.25);
  body.add(belly);
  // haunch fluff
  for (const s of [-1, 1]) {
    const h = M(sph(0.13, 10, 8), furM, s * 0.20, -0.05, -0.12);
    body.add(h);
  }
  // head
  const head = parts.head = J(0, 0.68, 0.30);
  group.add(head);
  head.add(M(sph(0.21, 14, 12), furM, 0, 0, 0));
  // LONG ears — the silhouette
  for (const s of [-1, 1]) {
    const ear = J(s * 0.09, 0.16, -0.02);
    head.add(ear);
    const outer = M(cap(0.055, 0.30), furM, 0, 0.18, 0);
    outer.scale.z = 0.55;
    ear.add(outer);
    ear.add(M(cap(0.028, 0.22), pinkM, 0, 0.16, 0.035));
    ear.rotation.z = -s * 0.14;
    ear.rotation.x = -0.12;
    parts[s < 0 ? 'earL' : 'earR'] = ear;
  }
  // face
  for (const s of [-1, 1]) head.add(M(sph(0.035, 8, 6), darkM, s * 0.085, 0.04, 0.185));
  head.add(M(sph(0.025, 8, 6), pinkM, 0, -0.03, 0.205));
  head.add(M(box(0.05, 0.055, 0.02), toon(0xffffff), 0, -0.085, 0.195)); // buck teeth
  // fluffy tail
  const tail = parts.tail = M(sph(0.10, 10, 8), toon(0xffffff), 0, 0.38, -0.40);
  group.add(tail);
  // legs
  for (const s of [-1, 1]) {
    const hind = M(cap(0.09, 0.20), furM, s * 0.17, 0.20, -0.02);
    hind.rotation.x = 0.5;
    group.add(hind);
    const foot = M(cap(0.07, 0.16), furM, s * 0.17, 0.07, 0.14);
    foot.rotation.x = Math.PI / 2;
    group.add(foot);
    const front = M(cap(0.055, 0.16), furM, s * 0.12, 0.22, 0.30);
    group.add(front);
  }
  c.userData.kind = 'bunny';
  return c;
}

// ---- shared quadruped rig (cat, dog): pivot legs + head + tail for walk.
function quadBase(o) {
  const { bodyR = 0.17, bodyLen = 0.45, bodyY = 0.40, coat = 0xcccccc } = o;
  const c = critterBase();
  const { group, parts } = c;
  const coatM = toon(coat);
  const bodyM = M(cap(bodyR, bodyLen), coatM, 0, bodyY, 0);
  bodyM.rotation.x = Math.PI / 2; // capsule axis → Z
  group.add(bodyM);
  parts.body = bodyM;
  // legs: pivot groups at shoulder/hip so walk can swing them
  parts.legs = {};
  const legPos = { FL: [-0.11, bodyY - 0.05, 0.20], FR: [0.11, bodyY - 0.05, 0.20], BL: [-0.11, bodyY - 0.05, -0.20], BR: [0.11, bodyY - 0.05, -0.20] };
  for (const [nm, p] of Object.entries(legPos)) {
    const piv = J(p[0], p[1], p[2]);
    group.add(piv);
    piv.add(M(cap(0.055, 0.16), coatM, 0, -0.12, 0));
    const paw = M(sph(0.06, 8, 6), coatM, 0, -0.26, 0.01);
    paw.scale.set(1, 0.7, 1.25);
    piv.add(paw);
    parts.legs[nm] = piv;
  }
  const head = parts.head = J(0, bodyY + 0.24, bodyLen / 2 + 0.10);
  group.add(head);
  return c;
}

function quadFace(head, o) {
  const { headR, eyeColor = 0x1c1c22 } = o;
  const darkM = toon(0x1c1c22);
  for (const s of [-1, 1]) {
    head.add(M(sph(headR * 0.22, 8, 6), toon(eyeColor), s * headR * 0.42, headR * 0.18, headR * 0.82));
    const pup = M(box(headR * 0.08, headR * 0.22, headR * 0.06), darkM, s * headR * 0.42, headR * 0.18, headR * 0.99);
    head.add(pup);
  }
  head.add(M(sph(headR * 0.13, 8, 6), toon(0xf2a0a8), 0, -headR * 0.05, headR * 0.94)); // nose
}

// ---- cat: triangle ears, whiskers, curl tail
export function buildCat(o = {}) {
  const { coat = 0xd8d8d8, eyeColor = 0x3fae5a } = o;
  const c = quadBase({ coat, bodyR: 0.17, bodyLen: 0.45, bodyY: 0.40 });
  const { group, parts } = c;
  const head = parts.head, headR = 0.17;
  head.add(M(sph(headR, 14, 12), toon(coat), 0, 0, 0));
  for (const s of [-1, 1]) { // triangle ears
    head.add(M(new THREE.ConeGeometry(0.07, 0.15, 6), toon(coat), s * 0.10, headR * 0.95, -0.01));
    head.add(M(new THREE.ConeGeometry(0.035, 0.08, 6), toon(0xf2b8c6), s * 0.10, headR * 0.92, 0.035));
  }
  quadFace(head, { headR, eyeColor });
  // whiskers
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const w = M(cyl(0.004, 0.004, 0.22, 4), toon(0xffffff), s * 0.20, -0.02 + i * 0.035, 0.14);
    w.rotation.z = Math.PI / 2 - s * 0.25;
    w.rotation.y = s * 0.35;
    w.castShadow = false;
    head.add(w);
  }
  // curl tail
  const tail = parts.tail = J(0, 0.48, -0.44);
  group.add(tail);
  const curl = M(new THREE.TorusGeometry(0.20, 0.045, 8, 14, 2.1), toon(coat), 0, 0.10, -0.08);
  curl.rotation.y = Math.PI / 2;
  curl.rotation.x = 0.5;
  tail.add(curl);
  c.userData.kind = 'cat';
  return c;
}

// ---- dog: long snout, floppy ears, wag tail
export function buildDog(o = {}) {
  const { coat = 0xc79a5e, eyeColor = 0x4a2f18 } = o;
  const c = quadBase({ coat, bodyR: 0.18, bodyLen: 0.50, bodyY: 0.42 });
  const { group, parts } = c;
  const head = parts.head, headR = 0.18;
  head.add(M(sph(headR, 14, 12), toon(coat), 0, 0, 0));
  // snout
  const snout = M(cap(0.085, 0.12), toon(coat), 0, -headR * 0.25, headR * 0.85);
  snout.rotation.x = Math.PI / 2;
  head.add(snout);
  head.add(M(sph(0.038, 8, 6), toon(0x1c1c22), 0, -headR * 0.18, headR * 1.35)); // nose
  // floppy ears
  for (const s of [-1, 1]) {
    const ear = M(cap(0.06, 0.16), toon(coat), s * headR * 0.95, headR * 0.25, -0.02);
    ear.scale.x = 0.55;
    ear.rotation.z = s * 0.55;
    head.add(ear);
  }
  quadFace(head, { headR, eyeColor });
  // wag tail
  const tail = parts.tail = J(0, 0.52, -0.48);
  group.add(tail);
  const tm = M(cap(0.045, 0.25), toon(coat), 0, 0.14, -0.06);
  tm.rotation.x = -0.7;
  tail.add(tm);
  c.userData.kind = 'dog';
  return c;
}

/** Animate a critter. mode: 'idle' | 'hop' (bunny) | 'walk' (cat/dog). */
export function updateCritter(c, dt, mode = 'idle') {
  const u = c.userData;
  u.mode = mode;
  u.phase += dt * (mode === 'hop' ? 7 : mode === 'walk' ? 9 : 2);
  const p = u.phase, parts = c.parts;
  if (u.kind === 'bunny') {
    if (mode === 'hop') {
      const h = Math.abs(Math.sin(p)) * 0.22;
      c.group.position.y = h;
      parts.body.rotation.x = -Math.sin(p) * 0.18;
      if (parts.earL) {
        parts.earL.rotation.x = -0.12 - Math.max(0, Math.sin(p - 0.7)) * 0.5; // ear lag
        parts.earR.rotation.x = -0.12 - Math.max(0, Math.sin(p - 0.7)) * 0.5;
      }
      parts.head.position.y = 0.68 + h * 0.3;
    } else { // idle: ear twitch + breath
      c.group.position.y *= 0.9;
      if (parts.earL) parts.earL.rotation.z = -0.14 + Math.sin(p * 0.7) * 0.06;
      parts.body.scale.y = 0.95 + Math.sin(p) * 0.012;
    }
  } else { // cat / dog quadruped walk
    const legs = parts.legs || {};
    const sw = mode === 'walk' ? Math.sin(p) * 0.5 : 0;
    if (legs.FL) legs.FL.rotation.x = sw;
    if (legs.BR) legs.BR.rotation.x = sw;
    if (legs.FR) legs.FR.rotation.x = -sw;
    if (legs.BL) legs.BL.rotation.x = -sw;
    if (parts.head) parts.head.position.y += (Math.sin(p * 0.5) * 0.008 - (parts.head.position.y - (parts.head.userData.by || (parts.head.userData.by = parts.head.position.y)))) * 0.1;
    if (parts.tail) {
      if (u.kind === 'dog') parts.tail.rotation.y = Math.sin(p * 3) * (mode === 'walk' ? 0.5 : 0.25); // wag
      else parts.tail.rotation.x = Math.sin(p * 0.8) * 0.12; // cat tail sway
    }
  }
  return c;
}
