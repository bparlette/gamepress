// rigs.js — procedural cel rigs: the hunter, six horde creatures, the Reaper, graveyard props, pickups and weapon models.
// Every rig is a group of toon parts with ink hulls plus an anim(rig, phase, t, move) pose function.
import * as THREE from './three.module.min.js';
import { G, part, grp, toonMat, mergeGroup, INK } from './cel.js';

const P = (g, mat) => { g.userData.mat = mat; return g; };
function limbs(J, root, mat, d) {
  for (const [s, k] of [[1, 'L'], [-1, 'R']]) {
    J['lg' + k] = P(grp(J.hips, s * d.legX, 0, 0), mat); J['kn' + k] = P(grp(J['lg' + k], 0, -d.thigh, 0), mat);
    J['sh' + k] = P(grp(J.torso, s * d.shX, d.shY, 0), mat); J['el' + k] = P(grp(J['sh' + k], 0, -d.upper, 0), mat);
  }
}
function base(d, mat) {
  const J = {}; J.root = P(new THREE.Group(), mat); J.mat = mat;
  J.body = P(grp(J.root), mat); J.hips = P(grp(J.body, 0, d.hip, 0), mat); J.torso = P(grp(J.hips, 0, d.torsoY, 0), mat); J.neck = P(grp(J.torso, 0, d.neckY, 0), mat);
  limbs(J, J.root, mat, d); J.d = d; return J;
}
function walkPose(J, ph, amp, armAmp, bob, armBase = 0) {
  const s = Math.sin(ph), c = Math.cos(ph);
  J.lgL.rotation.x = s * amp; J.lgR.rotation.x = -s * amp;
  J.knL.rotation.x = Math.max(0, -c) * amp * 1.1; J.knR.rotation.x = Math.max(0, c) * amp * 1.1;
  J.shL.rotation.x = armBase - s * armAmp; J.shR.rotation.x = armBase + s * armAmp;
  J.body.position.y = Math.abs(Math.cos(ph)) * bob;
}

// ---------------- the hunter (player) ----------------
// ---------------- Ryu Street Fighter Rig ----------------
export function buildRyu() {
  const mat = toonMat(); const d = { hip: 0.74, torsoY: 0.05, neckY: 0.6, legX: 0.15, thigh: 0.35, shin: 0.35, shX: 0.34, shY: 0.48, upper: 0.28, fore: 0.26 };
  const J = base(d, mat);
  const GI = '#f0ede6', BELT = '#1a1818', RED = '#e52521', SKIN = '#ffd0ad', HAIR = '#2a1a15';
  // White Karate Gi Pants
  part(J.hips, G.sph(0.25, 0.18, 0.22), GI, 0, 0.02, 0);
  part(J.hips, G.cyl(0.28, 0.28, 0.12, 16), BELT, 0, 0.12, 0);
  // Hanging Black Belt Tails
  part(J.hips, G.box(0.08, 0.35, 0.03), BELT, -0.06, -0.08, 0.22, { rot: [0.1, 0, 0.2] });
  part(J.hips, G.box(0.07, 0.42, 0.03), BELT, 0.04, -0.12, 0.21, { rot: [0.15, 0, -0.15] });
  // Torso / Open Gi
  part(J.torso, G.sph(0.32, 0.36, 0.25), GI, 0, 0.28, 0);
  // Muscular chest V-neck exposure
  part(J.torso, G.box(0.14, 0.32, 0.06), SKIN, 0, 0.34, 0.22, { outline: false });
  // Head
  const head = J.head = P(grp(J.neck, 0, 0.02, 0), mat);
  part(head, G.sph(0.24, 0.25, 0.23), SKIN, 0, 0.18, 0.02);
  part(head, G.sph(0.25, 0.18, 0.22), HAIR, 0, 0.32, -0.04);
  // Red Headband (Hachimaki)
  part(head, G.tor(0.25, 0.05, 8, 20), RED, 0, 0.26, 0.01, { rot: [Math.PI / 2, 0, 0] });
  // Headband flowing tails behind head
  J.bandTails = P(grp(head, 0, 0.26, -0.22), mat);
  part(J.bandTails, G.box(0.07, 0.03, 0.42), RED, 0.05, -0.02, -0.2, { rot: [-0.2, 0.3, 0] });
  part(J.bandTails, G.box(0.06, 0.028, 0.36), RED, -0.04, -0.04, -0.18, { rot: [-0.3, -0.2, 0] });
  // Eyes & Eyebrows
  for (const s of [1, -1]) {
    part(head, G.sph(0.06, 0.07, 0.03), '#fff', s * 0.08, 0.19, 0.22, { outline: false });
    part(head, G.sph(0.035, 0.045, 0.02), '#20120a', s * 0.08, 0.19, 0.24, { outline: false });
    part(head, G.box(0.12, 0.035, 0.03), HAIR, s * 0.085, 0.25, 0.22, { outline: false, rot: [0, 0, s * -0.25] });
  }
  // Gi sleeveless shoulders + red karate sparring gloves
  for (const k of ['L', 'R']) {
    part(J['sh' + k], G.cyl(0.14, 0.12, 0.12, 12), GI, 0, -0.04, 0);
    part(J['sh' + k], G.cap(0.11, 0.18), SKIN, 0, -0.16, 0);
    part(J['el' + k], G.cap(0.10, 0.16), SKIN, 0, -0.12, 0);
    // Red Ryu Gloves
    part(J['el' + k], G.cyl(0.12, 0.11, 0.14, 12), RED, 0, -0.22, 0);
    part(J['el' + k], G.sph(0.11, 0.11, 0.11), RED, 0, -0.30, 0);
    // Gi Pants Legs
    part(J['lg' + k], G.cap(0.13, 0.20), GI, 0, -0.15, 0);
    part(J['kn' + k], G.cap(0.12, 0.18), GI, 0, -0.14, 0);
    // Bare feet
    part(J['kn' + k], G.sph(0.11, 0.09, 0.17), SKIN, 0, -0.32, 0.06);
  }
  J.anim = (ph, t, mv, atk) => {
    walkPose(J, ph, 0.75 * mv, 0.6 * mv, 0.08 * mv);
    J.torso.rotation.x = 0.08 * mv;
    J.head.rotation.x = -0.05 * mv;
    J.bandTails.rotation.x = -0.2 - mv * 0.6 + Math.sin(t * 12) * 0.18;
    J.bandTails.rotation.y = Math.sin(t * 8) * 0.2;
    if (atk > 0) {
      // HADOUKEN thrust pose: both arms extended forward together!
      const k = Math.sin(Math.min(1, atk) * Math.PI);
      J.shR.rotation.x = -1.4 * k; J.shR.rotation.z = -0.25 * k;
      J.shL.rotation.x = -1.4 * k; J.shL.rotation.z = 0.25 * k;
      J.elR.rotation.x = -0.2 * k; J.elL.rotation.x = -0.2 * k;
      J.torso.rotation.y = 0;
    } else {
      J.shR.rotation.z = -0.15; J.shL.rotation.z = 0.15;
      J.elR.rotation.x = -0.55; J.elL.rotation.x = -0.55;
    }
  };
  return J;
}

export function buildHunter() {
  const mat = toonMat(); const d = { hip: 0.74, torsoY: 0.05, neckY: 0.6, legX: 0.14, thigh: 0.34, shin: 0.34, shX: 0.32, shY: 0.47, upper: 0.26, fore: 0.24 };
  const J = base(d, mat);
  const COAT = '#e8344e', COAT2 = '#b8203a', GOLD = '#ffd23c', PANTS = '#2b2f6b', BOOT = '#5a3420', SKIN = '#ffd2b0', HAT = '#3a2450', HAIR = '#f4f0ff';
  part(J.hips, G.sph(0.24, 0.16, 0.2), PANTS, 0, 0.02, 0);
  part(J.hips, G.cyl(0.27, 0.27, 0.1, 16), '#5b3324', 0, 0.12, 0);
  part(J.hips, G.box(0.13, 0.11, 0.06), GOLD, 0, 0.12, 0.25);
  // coat skirt (open cone) with gold hem
  part(J.hips, G.cyl(0.27, 0.42, 0.52, 16, true), COAT, 0, -0.18, -0.02);
  part(J.hips, G.cyl(0.43, 0.43, 0.05, 16, true), GOLD, 0, -0.43, -0.02, { outline: false });
  // torso
  part(J.torso, G.sph(0.3, 0.34, 0.24), COAT, 0, 0.28, 0);
  part(J.torso, G.box(0.08, 0.5, 0.05), GOLD, 0, 0.27, 0.235, { outline: false });
  for (const y of [0.14, 0.27, 0.4]) part(J.torso, G.sph(0.035, 0.035, 0.02), '#fff6c8', 0.09, y, 0.25, { outline: false });
  part(J.torso, G.sph(0.17, 0.08, 0.13), COAT2, 0.28, 0.5, 0, { rot: [0, 0, -0.4] });
  part(J.torso, G.sph(0.17, 0.08, 0.13), COAT2, -0.28, 0.5, 0, { rot: [0, 0, 0.4] });
  // scarf: ring + flowing tail
  part(J.torso, G.tor(0.17, 0.07, 8, 16), GOLD, 0, 0.6, 0, { rot: [Math.PI / 2, 0, 0] });
  J.scarf = P(grp(J.torso, 0.08, 0.6, -0.16), mat);
  part(J.scarf, G.box(0.13, 0.04, 0.46), GOLD, 0, 0, -0.22);
  part(J.scarf, G.box(0.1, 0.035, 0.3), '#ffb02e', 0.02, -0.04, -0.5, { rot: [0.3, 0.2, 0] });
  // head
  const head = J.head = P(grp(J.neck, 0, 0.02, 0), mat);
  part(head, G.sph(0.25, 0.26, 0.24), SKIN, 0, 0.18, 0.02);
  part(head, G.sph(0.24, 0.16, 0.22), HAIR, 0, 0.3, -0.06);
  part(head, G.sph(0.06, 0.12, 0.06), HAIR, 0.2, 0.17, -0.04, { outline: false });
  part(head, G.sph(0.06, 0.12, 0.06), HAIR, -0.2, 0.17, -0.04, { outline: false });
  for (const s of [1, -1]) {
    part(head, G.sph(0.07, 0.085, 0.03), '#fff', s * 0.09, 0.2, 0.235, { outline: false });
    part(head, G.sph(0.035, 0.05, 0.02), '#2a1c4a', s * 0.085, 0.195, 0.26, { outline: false });
    part(head, G.box(0.11, 0.028, 0.03), INK, s * 0.09, 0.29, 0.235, { outline: false, rot: [0, 0, s * -0.2] });
  }
  part(head, G.box(0.08, 0.02, 0.02), '#a5544a', 0, 0.075, 0.245, { outline: false });
  // hat: wide brim + crown + gold band, rakish tilt
  J.hat = P(grp(head, 0, 0.4, -0.02), mat); J.hat.rotation.set(-0.12, 0, 0.12);
  part(J.hat, G.cyl(0.48, 0.5, 0.05, 20), HAT, 0, 0, 0);
  part(J.hat, G.cyl(0.21, 0.26, 0.32, 16), HAT, 0, 0.17, 0);
  part(J.hat, G.cyl(0.265, 0.265, 0.07, 16, true), GOLD, 0, 0.05, 0, { outline: false });
  part(J.hat, G.sph(0.05, 0.05, 0.03), '#ff3d6e', 0.22, 0.06, 0.1, { outline: false });
  // arms + boots
  for (const k of ['L', 'R']) {
    part(J['sh' + k], G.cap(0.085, 0.16), COAT, 0, -0.12, 0);
    part(J['el' + k], G.cap(0.075, 0.14), COAT, 0, -0.1, 0);
    part(J['el' + k], G.cyl(0.095, 0.095, 0.07, 10), GOLD, 0, -0.2, 0, { outline: false });
    part(J['el' + k], G.sph(0.085, 0.085, 0.085), SKIN, 0, -0.27, 0);
    part(J['lg' + k], G.cap(0.1, 0.18), PANTS, 0, -0.14, 0);
    part(J['kn' + k], G.cap(0.09, 0.16), PANTS, 0, -0.12, 0);
    part(J['kn' + k], G.sph(0.12, 0.1, 0.17), BOOT, 0, -0.29, 0.05);
    part(J['kn' + k], G.cyl(0.11, 0.11, 0.05, 10), GOLD, 0, -0.2, 0, { outline: false });
  }
  // whip handle in the right hand
  J.whip = P(grp(J.elR, 0, -0.28, 0.02), mat);
  part(J.whip, G.cyl(0.035, 0.03, 0.3, 8), '#4a2a18', 0, 0, 0.1, { rot: [Math.PI / 2, 0, 0] });
  part(J.whip, G.sph(0.05, 0.05, 0.05), GOLD, 0, 0, -0.06, { outline: false });
  J.anim = (ph, t, mv, atk) => {
    walkPose(J, ph, 0.7 * mv, 0.55 * mv, 0.07 * mv);
    J.torso.rotation.x = 0.08 * mv; J.head.rotation.x = -0.05 * mv;
    J.scarf.rotation.x = -0.25 - mv * 0.5 + Math.sin(t * 9) * 0.12; J.scarf.rotation.y = Math.sin(t * 6) * 0.15;
    if (atk > 0) { const k = Math.sin(Math.min(1, atk) * Math.PI); J.shR.rotation.x = -1.6 * k; J.shR.rotation.z = -0.9 * k; J.torso.rotation.y = -0.5 * k; }
    else { J.shR.rotation.z = 0; J.torso.rotation.y = 0; }
    J.elL.rotation.x = -0.3; J.elR.rotation.x = -0.4;
  };
  return J;
}

// ---------------- horde creatures (baked into impostor frames) ----------------
function buildBat() {
  const mat = toonMat({ emissive: new THREE.Color('#000') }); const J = { root: P(new THREE.Group(), mat) };
  const B = '#5b3f8c', W = '#3a2768', M = '#8a63c9';
  J.body = P(grp(J.root, 0, 0.8, 0), mat);
  part(J.body, G.sph(0.2, 0.22, 0.19), B, 0, 0, 0);
  part(J.body, G.sph(0.15, 0.14, 0.14), B, 0, 0.2, 0.05);
  for (const s of [1, -1]) {
    part(J.body, G.cone(0.06, 0.18, 6), W, s * 0.08, 0.38, 0.03, { rot: [0, 0, -s * 0.3] });
    part(J.body, G.sph(0.04, 0.035, 0.02), '#ff4a4a', s * 0.055, 0.22, 0.175, { outline: false });
    part(J.body, G.cone(0.018, 0.06, 4), '#fff', s * 0.03, 0.12, 0.17, { outline: false, rot: [Math.PI, 0, 0] });
    const w = J['w' + (s > 0 ? 'L' : 'R')] = P(grp(J.body, s * 0.14, 0.05, 0), mat);
    part(w, G.sph(0.32, 0.03, 0.2), W, s * 0.3, 0, 0, { rot: [0, 0, 0] });
    part(w, G.sph(0.22, 0.025, 0.12), M, s * 0.3, -0.012, 0.03, { outline: false });
    part(w, G.cone(0.06, 0.14, 4), W, s * 0.58, 0, 0.08, { rot: [Math.PI / 2, 0, 0] });
  }
  J.anim = (ph) => { const f = Math.sin(ph * 2.2); J.wL.rotation.z = 0.2 + f * 0.85; J.wR.rotation.z = -0.2 - f * 0.85; J.body.position.y = 0.8 + Math.sin(ph * 2.2 + 1.2) * 0.07; J.body.rotation.x = 0.25; };
  return J;
}
function buildGhoul() {
  const mat = toonMat(); const d = { hip: 0.62, torsoY: 0.04, neckY: 0.5, legX: 0.13, thigh: 0.3, shin: 0.3, shX: 0.27, shY: 0.4, upper: 0.24, fore: 0.22 };
  const J = base(d, mat); const SK = '#8fb36b', SK2 = '#6c8f4e', RAG = '#6b5a7a', PANT = '#3d3a55';
  part(J.hips, G.sph(0.2, 0.15, 0.17), PANT, 0, 0, 0);
  part(J.torso, G.sph(0.25, 0.3, 0.21), RAG, 0, 0.24, 0);
  part(J.torso, G.sph(0.14, 0.1, 0.06), SK2, 0.05, 0.12, 0.18, { outline: false });
  part(J.torso, G.cone(0.08, 0.16, 4), RAG, 0.14, -0.04, 0.12, { rot: [Math.PI, 0, 0] });
  part(J.torso, G.cone(0.07, 0.14, 4), RAG, -0.1, -0.04, 0.14, { rot: [Math.PI, 0, 0.3] });
  const head = J.head = P(grp(J.neck, 0, 0, 0.08), mat);
  part(head, G.sph(0.2, 0.21, 0.2), SK, 0, 0.14, 0);
  part(head, G.sph(0.16, 0.08, 0.14), SK2, 0, 0.03, 0.06);
  for (const s of [1, -1]) {
    part(head, G.sph(0.055, 0.06, 0.02), '#ffe14a', s * 0.075, 0.18, 0.185, { outline: false });
    part(head, G.sph(0.022, 0.03, 0.01), INK, s * 0.075, 0.18, 0.2, { outline: false });
  }
  part(head, G.box(0.14, 0.04, 0.02), '#2a1320', 0, 0.05, 0.19, { outline: false });
  part(head, G.sph(0.05, 0.04, 0.04), SK, 0.18, 0.26, -0.02);
  for (const k of ['L', 'R']) {
    part(J['sh' + k], G.cap(0.07, 0.16), SK, 0, -0.12, 0);
    part(J['el' + k], G.cap(0.06, 0.14), SK, 0, -0.1, 0);
    part(J['el' + k], G.sph(0.08, 0.06, 0.09), SK2, 0, -0.24, 0.02);
    part(J['lg' + k], G.cap(0.085, 0.16), PANT, 0, -0.12, 0);
    part(J['kn' + k], G.cap(0.075, 0.15), PANT, 0, -0.12, 0);
    part(J['kn' + k], G.sph(0.09, 0.07, 0.13), SK2, 0, -0.27, 0.04);
  }
  J.anim = (ph) => { walkPose(J, ph, 0.45, 0.12, 0.05, -1.35); J.torso.rotation.x = 0.35; J.torso.rotation.z = Math.sin(ph) * 0.1; J.head.rotation.z = Math.sin(ph * 0.5) * 0.25; J.elL.rotation.x = -0.2; J.elR.rotation.x = -0.2; };
  return J;
}
function buildSkeleton() {
  const mat = toonMat(); const d = { hip: 0.66, torsoY: 0.04, neckY: 0.52, legX: 0.12, thigh: 0.32, shin: 0.32, shX: 0.25, shY: 0.42, upper: 0.25, fore: 0.23 };
  const J = base(d, mat); const BN = '#e9e1c8', BN2 = '#bfb59a';
  part(J.hips, G.sph(0.17, 0.09, 0.12), BN, 0, 0, 0);
  part(J.torso, G.cyl(0.04, 0.04, 0.42, 6), BN2, 0, 0.2, -0.06);
  for (let k = 0; k < 4; k++) part(J.torso, G.tor(0.16 - k * 0.015, 0.03, 6, 14), BN, 0, 0.14 + k * 0.09, 0, { rot: [Math.PI / 2, 0, 0] });
  part(J.torso, G.sph(0.2, 0.06, 0.12), BN, 0, 0.45, 0);
  const head = J.head = P(grp(J.neck, 0, 0, 0.02), mat);
  part(head, G.sph(0.2, 0.2, 0.19), BN, 0, 0.16, 0);
  part(head, G.sph(0.14, 0.07, 0.12), BN2, 0, 0.02, 0.05);
  for (const s of [1, -1]) {
    part(head, G.sph(0.06, 0.065, 0.03), '#1c1430', s * 0.08, 0.17, 0.165, { outline: false });
    part(head, G.sph(0.022, 0.022, 0.01), '#ff4a5a', s * 0.08, 0.17, 0.19, { outline: false });
  }
  for (let k = -2; k <= 2; k++) part(head, G.box(0.025, 0.04, 0.02), '#fffbea', k * 0.035, 0.02, 0.16, { outline: false });
  for (const k of ['L', 'R']) {
    part(J['sh' + k], G.cap(0.04, 0.18), BN, 0, -0.12, 0);
    part(J['el' + k], G.cap(0.035, 0.16), BN, 0, -0.1, 0);
    part(J['el' + k], G.sph(0.055, 0.05, 0.06), BN, 0, -0.23, 0);
    part(J['lg' + k], G.cap(0.045, 0.2), BN, 0, -0.14, 0);
    part(J['kn' + k], G.cap(0.04, 0.18), BN, 0, -0.13, 0);
    part(J['kn' + k], G.sph(0.07, 0.04, 0.11), BN2, 0, -0.3, 0.04);
  }
  const sw = grp(J.elR, 0, -0.24, 0); P(sw, mat);
  part(sw, G.box(0.05, 0.05, 0.62), '#9aa1b8', 0, 0, 0.3);
  part(sw, G.box(0.2, 0.04, 0.05), '#6b4a2a', 0, 0, 0.0);
  J.anim = (ph) => { walkPose(J, ph, 0.6, 0.5, 0.06); J.shR.rotation.x = -0.6 + Math.sin(ph) * 0.3; J.head.rotation.y = Math.sin(ph * 0.5) * 0.2; J.torso.rotation.z = Math.sin(ph) * 0.06; };
  return J;
}
function buildWraith() {
  const mat = toonMat({ emissive: new THREE.Color('#0f3a40') }); const J = { root: P(new THREE.Group(), mat) };
  const R = '#6fe0d8', R2 = '#2f9aa4', V = '#11202e';
  J.body = P(grp(J.root, 0, 0.3, 0), mat);
  part(J.body, G.cone(0.42, 1.0, 12), R2, 0, 0.42, 0);
  part(J.body, G.sph(0.28, 0.32, 0.26), R, 0, 0.78, 0);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; part(J.body, G.cone(0.1, 0.28, 4), R2, Math.cos(a) * 0.33, -0.12, Math.sin(a) * 0.33, { rot: [Math.PI, 0, 0] }); }
  J.head = P(grp(J.body, 0, 1.05, 0), mat);
  part(J.head, G.sph(0.25, 0.28, 0.25), R, 0, 0, 0);
  part(J.head, G.cone(0.12, 0.3, 8), R, 0, 0.26, -0.1, { rot: [-0.6, 0, 0] });
  part(J.head, G.sph(0.17, 0.19, 0.08), V, 0, -0.02, 0.19, { outline: false });
  for (const s of [1, -1]) part(J.head, G.sph(0.045, 0.06, 0.02), '#fdfdff', s * 0.07, 0.0, 0.26, { outline: false });
  for (const s of [1, -1]) {
    const a = J['a' + (s > 0 ? 'L' : 'R')] = P(grp(J.body, s * 0.26, 0.78, 0.05), mat);
    part(a, G.cone(0.1, 0.5, 6), R, s * 0.08, -0.2, 0.15, { rot: [-1.1, 0, s * 0.4] });
    part(a, G.sph(0.06, 0.06, 0.06), '#cffff9', s * 0.12, -0.32, 0.38, { outline: false });
  }
  J.anim = (ph) => { J.body.position.y = 0.3 + Math.sin(ph * 0.8) * 0.1; J.body.rotation.z = Math.sin(ph * 0.6) * 0.12; J.aL.rotation.x = Math.sin(ph) * 0.4; J.aR.rotation.x = -Math.sin(ph) * 0.4; J.head.rotation.z = Math.sin(ph * 0.5) * 0.15; };
  return J;
}
function buildGargoyle() {
  const mat = toonMat(); const d = { hip: 0.58, torsoY: 0.05, neckY: 0.62, legX: 0.2, thigh: 0.26, shin: 0.28, shX: 0.42, shY: 0.5, upper: 0.28, fore: 0.26 };
  const J = base(d, mat); const S = '#8a8fa3', S2 = '#5e6378', H = '#3e4152';
  part(J.hips, G.sph(0.28, 0.2, 0.24), S2, 0, 0, 0);
  part(J.torso, G.sph(0.42, 0.42, 0.33), S, 0, 0.32, -0.02);
  part(J.torso, G.sph(0.3, 0.22, 0.12), S2, 0, 0.26, 0.24, { outline: false });
  for (const s of [1, -1]) {
    part(J.torso, G.cone(0.22, 0.6, 4), H, s * 0.3, 0.6, -0.3, { rot: [-0.7, 0, -s * 0.7] });
    part(J.torso, G.sph(0.2, 0.17, 0.18), S, s * 0.4, 0.58, 0);
  }
  const head = J.head = P(grp(J.neck, 0, -0.04, 0.16), mat);
  part(head, G.sph(0.22, 0.2, 0.22), S, 0, 0.1, 0);
  part(head, G.sph(0.16, 0.08, 0.12), S2, 0, -0.02, 0.12);
  for (const s of [1, -1]) {
    part(head, G.cone(0.05, 0.22, 6), H, s * 0.14, 0.3, -0.04, { rot: [-0.3, 0, -s * 0.4] });
    part(head, G.sph(0.05, 0.035, 0.02), '#ff9a3c', s * 0.08, 0.13, 0.205, { outline: false });
  }
  for (const k of ['L', 'R']) {
    part(J['sh' + k], G.cap(0.12, 0.16), S, 0, -0.12, 0);
    part(J['el' + k], G.cap(0.11, 0.14), S, 0, -0.1, 0);
    part(J['el' + k], G.sph(0.15, 0.12, 0.15), S2, 0, -0.27, 0.02);
    part(J['lg' + k], G.cap(0.12, 0.12), S2, 0, -0.1, 0);
    part(J['kn' + k], G.cap(0.11, 0.12), S2, 0, -0.1, 0);
    part(J['kn' + k], G.sph(0.14, 0.08, 0.17), H, 0, -0.26, 0.05);
  }
  J.anim = (ph) => { walkPose(J, ph, 0.38, 0.35, 0.07, -0.2); J.torso.rotation.x = 0.2; J.torso.rotation.z = Math.sin(ph) * 0.12; };
  return J;
}
function buildWerewolf() {
  const mat = toonMat(); const d = { hip: 0.66, torsoY: 0.05, neckY: 0.58, legX: 0.15, thigh: 0.32, shin: 0.32, shX: 0.34, shY: 0.48, upper: 0.28, fore: 0.26 };
  const J = base(d, mat); const F = '#94643f', F2 = '#d0a070', D = '#5a3a28';
  part(J.hips, G.sph(0.22, 0.17, 0.2), D, 0, 0, 0);
  part(J.hips, G.cone(0.07, 0.4, 6), F, 0, 0.0, -0.3, { rot: [-2.2, 0, 0] });
  part(J.torso, G.sph(0.33, 0.38, 0.27), F, 0, 0.3, 0);
  part(J.torso, G.sph(0.22, 0.26, 0.1), F2, 0, 0.26, 0.2, { outline: false });
  part(J.torso, G.sph(0.3, 0.2, 0.25), F, 0, 0.55, -0.05);
  const head = J.head = P(grp(J.neck, 0, 0, 0.14), mat);
  part(head, G.sph(0.22, 0.2, 0.22), F, 0, 0.1, 0);
  part(head, G.sph(0.12, 0.1, 0.18), F2, 0, 0.03, 0.2);
  part(head, G.sph(0.05, 0.04, 0.04), INK, 0, 0.08, 0.37, { outline: false });
  for (const s of [1, -1]) {
    part(head, G.cone(0.08, 0.22, 4), F, s * 0.14, 0.3, -0.04, { rot: [-0.2, 0, -s * 0.3] });
    part(head, G.sph(0.05, 0.035, 0.02), '#ffd23c', s * 0.085, 0.16, 0.2, { outline: false });
    part(head, G.cone(0.02, 0.06, 4), '#fff', s * 0.04, -0.03, 0.33, { outline: false, rot: [Math.PI, 0, 0] });
  }
  for (const k of ['L', 'R']) {
    part(J['sh' + k], G.cap(0.1, 0.17), F, 0, -0.12, 0);
    part(J['el' + k], G.cap(0.085, 0.15), F, 0, -0.1, 0);
    part(J['el' + k], G.sph(0.1, 0.08, 0.11), D, 0, -0.26, 0.02);
    for (const s of [-1, 0, 1]) part(J['el' + k], G.cone(0.02, 0.1, 4), '#f4ead2', s * 0.04, -0.33, 0.06, { outline: false, rot: [2.6, 0, 0] });
    part(J['lg' + k], G.cap(0.11, 0.16), F, 0, -0.13, 0);
    part(J['kn' + k], G.cap(0.08, 0.16), F, 0, -0.12, 0);
    part(J['kn' + k], G.sph(0.1, 0.07, 0.15), D, 0, -0.29, 0.05);
  }
  J.anim = (ph) => { walkPose(J, ph, 0.8, 0.7, 0.1, -0.5); J.torso.rotation.x = 0.45; J.head.rotation.x = -0.3; J.elL.rotation.x = -0.6; J.elR.rotation.x = -0.6; };
  return J;
}
export const CREATURES = [buildBat, buildGhoul, buildSkeleton, buildWraith, buildGargoyle, buildWerewolf];

// ---------------- the Reaper (final boss, real 3D) ----------------
export function buildReaper() {
  const mat = toonMat({ emissive: new THREE.Color('#000') }); const J = { root: P(new THREE.Group(), mat), mat };
  const R = '#2a1f3d', R2 = '#1a1326', TR = '#b04cff', BN = '#f2ecdf';
  J.body = P(grp(J.root, 0, 0.5, 0), mat);
  part(J.body, G.cone(0.9, 2.4, 14), R, 0, 0.95, 0);
  part(J.body, G.cyl(0.9, 0.95, 0.12, 14, true), TR, 0, -0.22, 0, { outline: false });
  for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; part(J.body, G.cone(0.2, 0.55, 4), R2, Math.cos(a) * 0.78, -0.42, Math.sin(a) * 0.78, { rot: [Math.PI, 0, 0] }); }
  part(J.body, G.sph(0.62, 0.42, 0.5), R, 0, 1.75, 0);
  J.head = P(grp(J.body, 0, 2.3, 0.08), mat);
  part(J.head, G.sph(0.5, 0.55, 0.5), R, 0, 0.05, -0.08);
  part(J.head, G.cone(0.25, 0.5, 8), R, 0, 0.45, -0.3, { rot: [-0.7, 0, 0] });
  part(J.head, G.sph(0.33, 0.36, 0.3), BN, 0, -0.02, 0.18);
  part(J.head, G.sph(0.22, 0.12, 0.2), '#d8d0bf', 0, -0.24, 0.22);
  for (const s of [1, -1]) {
    part(J.head, G.sph(0.1, 0.11, 0.05), '#140b1c', s * 0.13, 0.04, 0.44, { outline: false });
    part(J.head, G.sph(0.045, 0.045, 0.02), '#ff3df0', s * 0.13, 0.04, 0.485, { outline: false });
  }
  for (let k = -2; k <= 2; k++) part(J.head, G.box(0.05, 0.08, 0.03), '#fffbea', k * 0.06, -0.26, 0.42, { outline: false });
  // arms + scythe
  for (const s of [1, -1]) {
    const a = J['a' + (s > 0 ? 'L' : 'R')] = P(grp(J.body, s * 0.62, 1.85, 0), mat);
    part(a, G.cone(0.24, 0.9, 8), R, s * 0.1, -0.35, 0.1, { rot: [-0.5, 0, s * 0.3] });
    part(a, G.sph(0.11, 0.13, 0.11), BN, s * 0.2, -0.75, 0.32);
  }
  J.scythe = P(grp(J.aR, -0.2, -0.75, 0.32), mat);
  part(J.scythe, G.cyl(0.06, 0.06, 3.4, 8), '#4a3a2a', 0, 0.4, 0);
  part(J.scythe, G.tor(0.95, 0.09, 6, 14, Math.PI * 0.75), '#cfd8ff', -0.95, 2.05, 0, { rot: [0, 0, 0.2] });
  part(J.scythe, G.tor(0.88, 0.03, 4, 14, Math.PI * 0.72), '#ffffff', -0.95, 2.02, 0.04, { outline: false, rot: [0, 0, 0.22] });
  part(J.scythe, G.cyl(0.11, 0.11, 0.18, 8), TR, 0, 2.05, 0, { outline: false });
  J.anim = (ph, t, swing) => {
    J.body.position.y = 0.5 + Math.sin(t * 2) * 0.15; J.body.rotation.z = Math.sin(t * 1.3) * 0.06;
    J.aL.rotation.x = Math.sin(t * 1.7) * 0.2;
    const k = swing > 0 ? Math.sin(Math.min(1, swing) * Math.PI) : 0;
    J.aR.rotation.x = -0.2 - k * 1.2; J.aR.rotation.z = -k * 1.2; J.body.rotation.y = k * 1.4;
    J.scythe.rotation.z = 0.3 - k * 0.6;
  };
  return J;
}

// ---------------- merged geometries: props, pickups, projectiles ----------------
function merged(build) { const mat = toonMat(); const g = P(new THREE.Group(), mat); build(g); return mergeGroup(g); }
export const GEO = {};
export function buildGeometries() {
  const STONE = '#7c7896', STONE2 = '#5d5a78', MOSS = '#3f8a6a';
  GEO.grave = merged((g) => {
    part(g, G.box(0.7, 0.75, 0.18), STONE, 0, 0.38, 0);
    part(g, G.cyl(0.35, 0.35, 0.18, 14), STONE, 0, 0.75, 0, { rot: [Math.PI / 2, 0, 0] });
    part(g, G.box(0.08, 0.36, 0.02), STONE2, 0, 0.55, 0.095, { outline: false });
    part(g, G.box(0.26, 0.08, 0.02), STONE2, 0, 0.62, 0.095, { outline: false });
    part(g, G.sph(0.25, 0.08, 0.14), MOSS, 0.18, 0.04, 0.1, { outline: false });
    part(g, G.box(0.9, 0.1, 0.4), STONE2, 0, 0.05, 0.05);
  });
  GEO.cross = merged((g) => {
    part(g, G.box(0.16, 1.3, 0.14), '#8a86a6', 0, 0.65, 0);
    part(g, G.box(0.66, 0.15, 0.14), '#8a86a6', 0, 0.95, 0);
    part(g, G.box(0.5, 0.14, 0.4), STONE2, 0, 0.07, 0);
  });
  GEO.pillar = merged((g) => {
    part(g, G.cyl(0.3, 0.32, 1.1, 10), '#9a96b4', 0, 0.55, 0);
    part(g, G.box(0.8, 0.18, 0.8), STONE2, 0, 0.09, 0);
    part(g, G.cyl(0.3, 0.3, 0.3, 10), '#9a96b4', 0.55, 0.15, 0.25, { rot: [0, 0, Math.PI / 2] });
    part(g, G.sph(0.3, 0.1, 0.3), MOSS, 0, 1.1, 0, { outline: false });
  });
  GEO.tree = merged((g) => {
    part(g, G.cyl(0.13, 0.26, 2.2, 8), '#3b2b3e', 0, 1.1, 0);
    part(g, G.cyl(0.04, 0.09, 1.1, 6), '#3b2b3e', 0.4, 1.9, 0, { rot: [0, 0, -0.9] });
    part(g, G.cyl(0.03, 0.08, 0.9, 6), '#3b2b3e', -0.35, 2.0, 0.1, { rot: [0.2, 0, 0.8] });
    part(g, G.cyl(0.03, 0.06, 0.7, 6), '#3b2b3e', 0.05, 2.4, -0.2, { rot: [-0.5, 0, 0.1] });
    part(g, G.sph(0.4, 0.12, 0.4), '#2b2030', 0, 0.06, 0);
  });
  GEO.candles = merged((g) => {
    for (const [x, z, h] of [[0, 0, 0.5], [0.18, 0.1, 0.34], [-0.15, 0.12, 0.28], [0.05, -0.16, 0.4]]) {
      part(g, G.cyl(0.06, 0.06, h, 8), '#f1e6c8', x, h / 2, z);
      part(g, G.sph(0.035, 0.06, 0.035), '#ffb02e', x, h + 0.06, z, { outline: false });
    }
  });
  GEO.bones = merged((g) => {
    part(g, G.sph(0.16, 0.15, 0.15), '#e9e1c8', 0, 0.13, 0);
    part(g, G.sph(0.04, 0.04, 0.02), INK, 0.06, 0.15, 0.13, { outline: false });
    part(g, G.sph(0.04, 0.04, 0.02), INK, -0.06, 0.15, 0.13, { outline: false });
    part(g, G.cap(0.04, 0.4), '#e9e1c8', 0.3, 0.05, 0.1, { rot: [0, 0.5, Math.PI / 2] });
    part(g, G.cap(0.04, 0.35), '#d8cfb4', -0.2, 0.05, 0.2, { rot: [0, -0.8, Math.PI / 2] });
  });
  // destructible brazier
  GEO.brazier = merged((g) => {
    part(g, G.cyl(0.07, 0.1, 1.0, 8), '#3a3348', 0, 0.5, 0);
    part(g, G.cyl(0.35, 0.18, 0.22, 10), '#c08a3a', 0, 1.08, 0);
    part(g, G.tor(0.34, 0.04, 6, 14), '#ffd23c', 0, 1.18, 0, { rot: [Math.PI / 2, 0, 0], outline: false });
    part(g, G.cyl(0.3, 0.36, 0.1, 10), '#3a3348', 0, 0.05, 0);
  });
  GEO.gem = merged((g) => { part(g, G.oct(0.2), '#ffffff', 0, 0, 0); });
  GEO.coin = merged((g) => { part(g, G.cyl(0.17, 0.17, 0.05, 14), '#ffcf3a', 0, 0, 0, { rot: [Math.PI / 2, 0, 0] }); part(g, G.cyl(0.1, 0.1, 0.06, 4), '#fff1a8', 0, 0, 0.0, { rot: [Math.PI / 2, 0, 0], outline: false }); });
  GEO.chest = merged((g) => {
    part(g, G.box(0.9, 0.5, 0.6), '#8a4b22', 0, 0.25, 0);
    part(g, G.cyl(0.3, 0.3, 0.9, 12, false), '#a55a28', 0, 0.5, 0, { rot: [0, 0, Math.PI / 2] });
    for (const x of [-0.32, 0, 0.32]) part(g, G.box(0.08, 0.82, 0.64), '#ffd23c', x, 0.4, 0, { outline: false });
    part(g, G.box(0.16, 0.2, 0.06), '#fff1a8', 0, 0.48, 0.32, { outline: false });
  });
  GEO.chicken = merged((g) => {
    part(g, G.sph(0.25, 0.2, 0.2), '#c9702e', 0, 0.2, 0);
    part(g, G.cap(0.05, 0.25), '#f4ead2', 0.3, 0.25, 0, { rot: [0, 0, 1.1] });
    part(g, G.sph(0.07, 0.07, 0.07), '#f4ead2', 0.45, 0.32, 0);
  });
  GEO.orb = merged((g) => { part(g, G.sph(0.22, 0.22, 0.22), '#7ff3ff', 0, 0, 0); part(g, G.tor(0.3, 0.035, 6, 18), '#ffd23c', 0, 0, 0, { outline: false }); });
  GEO.knife = merged((g) => {
    part(g, G.box(0.62, 0.035, 0.11), '#e8f0ff', 0.16, 0, 0);
    part(g, G.cone(0.055, 0.16, 4), '#ffffff', 0.54, 0, 0, { rot: [0, 0, -Math.PI / 2] });
    part(g, G.box(0.05, 0.05, 0.26), '#ffd23c', -0.16, 0, 0);
    part(g, G.cyl(0.035, 0.035, 0.2, 6), '#5a3420', -0.27, 0, 0, { rot: [0, 0, Math.PI / 2] });
  });
  GEO.axe = merged((g) => {
    part(g, G.cyl(0.05, 0.05, 0.9, 6), '#e9e1c8', 0, 0, 0);
    part(g, G.sph(0.32, 0.26, 0.05), '#d9d0b8', 0.2, 0.32, 0);
    part(g, G.sph(0.08, 0.08, 0.08), '#e9e1c8', 0, -0.45, 0);
  });
  GEO.flask = merged((g) => {
    part(g, G.sph(0.17, 0.2, 0.17), '#7ff3ff', 0, 0, 0);
    part(g, G.cyl(0.06, 0.07, 0.18, 8), '#cff9ff', 0, 0.22, 0);
    part(g, G.cyl(0.07, 0.07, 0.06, 8), '#8a4b22', 0, 0.33, 0);
  });
  GEO.book = merged((g) => {
    part(g, G.box(0.46, 0.12, 0.6), '#8f1f3a', 0, 0, 0);
    part(g, G.box(0.4, 0.13, 0.54), '#f4ead2', 0.03, 0, 0, { outline: false });
    part(g, G.box(0.08, 0.02, 0.4), '#ffd23c', 0, 0.07, 0, { outline: false });
    part(g, G.box(0.28, 0.02, 0.08), '#ffd23c', 0, 0.07, 0.04, { outline: false });
  });
  GEO.scythe = merged((g) => {
    part(g, G.tor(0.45, 0.07, 5, 12, Math.PI * 0.9), '#cfd8ff', 0, 0, 0, { rot: [Math.PI / 2, 0, 0] });
    part(g, G.cyl(0.04, 0.04, 0.6, 6), '#4a3a2a', 0.45, 0, -0.1, { rot: [Math.PI / 2, 0, 0] });
  });
  GEO.sickle = merged((g) => { part(g, G.tor(0.36, 0.08, 5, 12, Math.PI * 1.2), '#ff5fe0', 0, 0, 0, { rot: [Math.PI / 2, 0, 0] }); });
  return GEO;
}

// icon models for the level-up cards (rendered once to images)
export function buildIconModel(id) {
  const mat = toonMat(); const g = P(new THREE.Group(), mat);
  const add = (geo, ...a) => part(g, geo, ...a);
  switch (id) {
    case 'lash': case 'reaver': {
      const c = id === 'reaver' ? '#ff3d5e' : '#7a3a22';
      add(G.cyl(0.07, 0.06, 0.7, 8), '#4a2a18', -0.5, -0.35, 0, { rot: [0, 0, 0.8] });
      add(G.tor(0.45, 0.05, 6, 20, Math.PI * 1.4), c, 0.05, 0.1, 0, { rot: [0, 0, -0.6] });
      add(G.tor(0.22, 0.04, 6, 14, Math.PI * 1.2), c, 0.3, 0.5, 0, { rot: [0, 0, 1.2] });
      break;
    }
    case 'dagger': case 'edges': {
      const n = id === 'edges' ? 3 : 1;
      for (let k = 0; k < n; k++) { const s = new THREE.Group(); g.add(s); P(s, mat); s.rotation.z = 0.7 + (k - (n - 1) / 2) * 0.35; part(s, G.box(1.0, 0.06, 0.16), '#e8f0ff', 0.2, 0, 0); part(s, G.box(0.08, 0.08, 0.4), '#ffd23c', -0.32, 0, 0); part(s, G.cyl(0.05, 0.05, 0.3, 6), '#5a3420', -0.5, 0, 0, { rot: [0, 0, Math.PI / 2] }); }
      break;
    }
    case 'bolt': case 'storm': add(G.sph(0.32, 0.32, 0.32), id === 'storm' ? '#ffe14a' : '#7fb8ff', 0, 0, 0); add(G.cone(0.2, 0.7, 8), id === 'storm' ? '#ffb02e' : '#4f7dff', -0.45, -0.3, 0, { rot: [0, 0, 2.2] }); add(G.cyl(0.05, 0.05, 1.2, 6), '#5a3420', -0.3, -0.5, -0.3, { rot: [0, 0, 0.9] }); break;
    case 'axe': add(G.cyl(0.07, 0.07, 1.2, 6), '#e9e1c8', 0, 0, 0, { rot: [0, 0, -0.6] }); add(G.sph(0.42, 0.34, 0.07), '#d9d0b8', 0.35, 0.3, 0, { rot: [0, 0, -0.6] }); break;
    case 'spiral': for (let k = 0; k < 3; k++) add(G.tor(0.42, 0.07, 5, 12, Math.PI * 0.9), '#cfd8ff', Math.cos(k * 2.1) * 0.25, Math.sin(k * 2.1) * 0.25, 0, { rot: [0, 0, k * 2.1] }); break;
    case 'censer': case 'souleater': {
      add(G.sph(0.32, 0.3, 0.32), id === 'souleater' ? '#b04cff' : '#c08a3a', 0, -0.1, 0); add(G.tor(0.3, 0.05, 6, 16), '#ffd23c', 0, 0.05, 0, { rot: [Math.PI / 2, 0, 0], outline: false });
      add(G.cyl(0.02, 0.02, 0.7, 4), '#3a3348', 0, 0.5, 0); add(G.sph(0.14, 0.1, 0.14), '#ff7a3c', 0, 0.12, 0, { outline: false }); break;
    }
    case 'psalter': case 'vespers': add(G.box(0.7, 0.18, 0.9), id === 'vespers' ? '#3a1a5a' : '#8f1f3a', 0, 0, 0, { rot: [1.1, 0.4, 0] }); add(G.box(0.6, 0.19, 0.8), '#f4ead2', 0.04, 0, 0, { rot: [1.1, 0.4, 0], outline: false }); break;
    case 'flask': add(G.sph(0.32, 0.36, 0.32), '#7ff3ff', 0, -0.1, 0); add(G.cyl(0.11, 0.12, 0.34, 8), '#cff9ff', 0, 0.36, 0); add(G.cyl(0.12, 0.12, 0.1, 8), '#8a4b22', 0, 0.56, 0); break;
    case 'rune': add(G.box(0.7, 0.85, 0.16), '#5d5a78', 0, 0, 0); add(G.box(0.12, 0.6, 0.18), '#7ff3ff', 0.05, 0, 0, { outline: false, rot: [0, 0, 0.4] }); add(G.box(0.12, 0.35, 0.18), '#7ff3ff', -0.12, 0.1, 0, { outline: false, rot: [0, 0, -0.5] }); break;
    case 'heart': add(G.sph(0.3, 0.3, 0.25), '#e8344e', -0.17, 0.12, 0); add(G.sph(0.3, 0.3, 0.25), '#e8344e', 0.17, 0.12, 0); add(G.cone(0.42, 0.55, 10), '#e8344e', 0, -0.3, 0, { rot: [Math.PI, 0, 0] }); add(G.sph(0.1, 0.12, 0.05), '#140f1f', 0, 0.05, 0.24, { outline: false }); break;
    case 'ember': add(G.sph(0.34, 0.34, 0.3), '#ff7a3c', 0, 0, 0); add(G.cone(0.2, 0.5, 8), '#ffd23c', 0, 0.45, 0); break;
    case 'tome': add(G.box(0.7, 0.85, 0.2), '#2f5aa8', 0, 0, 0, { rot: [0, 0.4, 0] }); add(G.cone(0.18, 0.25, 4), '#ffd23c', 0.05, 0.12, 0.2, { outline: false, rot: [0, 0, Math.PI] }); add(G.cone(0.18, 0.25, 4), '#ffd23c', 0.05, -0.13, 0.2, { outline: false }); break;
    case 'candle': add(G.cyl(0.06, 0.08, 0.7, 6), '#c08a3a', 0, -0.2, 0); for (const x of [-0.35, 0, 0.35]) { add(G.cyl(0.07, 0.07, 0.4, 8), '#f1e6c8', x, 0.25, 0); add(G.sph(0.06, 0.11, 0.06), '#ffb02e', x, 0.52, 0, { outline: false }); } add(G.box(0.85, 0.06, 0.12), '#c08a3a', 0, 0.05, 0); break;
    case 'bracer': add(G.cyl(0.32, 0.38, 0.6, 14, true), '#ffcf3a', 0, 0, 0, { rot: [0.3, 0, 0.5] }); add(G.sph(0.09, 0.09, 0.05), '#e8344e', 0.1, 0.05, 0.36, { outline: false }); break;
    case 'binder': add(G.box(0.7, 0.85, 0.2), '#3f8a6a', 0, 0, 0, { rot: [0, -0.4, 0] }); add(G.tor(0.18, 0.05, 6, 14), '#ffd23c', 0, 0, 0.14, { outline: false }); break;
    case 'chalice': add(G.cyl(0.32, 0.12, 0.4, 14), '#ffcf3a', 0, 0.25, 0); add(G.cyl(0.05, 0.05, 0.35, 6), '#ffcf3a', 0, -0.1, 0); add(G.cyl(0.25, 0.25, 0.06, 12), '#ffcf3a', 0, -0.28, 0); add(G.cyl(0.28, 0.28, 0.03, 14), '#c2183a', 0, 0.44, 0, { outline: false }); break;
    case 'lode': add(G.tor(0.32, 0.12, 8, 16, Math.PI), '#e8344e', 0, 0.1, 0, { rot: [0, 0, Math.PI] }); add(G.box(0.24, 0.2, 0.24), '#e9e9f2', -0.32, 0.15, 0); add(G.box(0.24, 0.2, 0.24), '#e9e9f2', 0.32, 0.15, 0); break;
    case 'feather': add(G.sph(0.18, 0.55, 0.05), '#3a2768', 0, 0, 0, { rot: [0, 0, -0.6] }); add(G.cyl(0.02, 0.02, 1.1, 4), '#c9c3e6', 0, 0, 0.04, { rot: [0, 0, -0.6], outline: false }); break;
    case 'gold': add(G.cyl(0.38, 0.38, 0.1, 16), '#ffcf3a', 0, 0, 0, { rot: [Math.PI / 2, 0, 0] }); break;
    case 'chicken': add(G.sph(0.38, 0.3, 0.3), '#c9702e', 0, 0, 0); add(G.cap(0.07, 0.35), '#f4ead2', 0.42, 0.1, 0, { rot: [0, 0, 1.1] }); break;
  }
  return g;
}
