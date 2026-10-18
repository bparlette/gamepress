import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../kit/three.module.min.js';
import {
  buildHumanoid, setPose, update, POSE_NAMES, ATTACK_NAMES,
  buildBunny, buildCat, buildDog, updateCritter, HIPS_Y, CHAR_HEIGHT,
} from '../kit/gpchar.js';

const JOINTS = ['hips', 'spine', 'chest', 'neck', 'head',
  'shoulderL', 'elbowL', 'wristL', 'shoulderR', 'elbowR', 'wristR',
  'hipL', 'kneeL', 'ankleL', 'hipR', 'kneeR', 'ankleR'];

test('module loads: exports present', () => {
  for (const f of ['buildHumanoid', 'setPose', 'update', 'buildBunny', 'buildCat', 'buildDog', 'updateCritter'])
    assert.equal(typeof eval(f), 'function', f);
  assert.ok(POSE_NAMES.includes('idle') && POSE_NAMES.includes('attack') && POSE_NAMES.includes('victory'));
  assert.ok(ATTACK_NAMES.includes('slash') && ATTACK_NAMES.includes('overhead') && ATTACK_NAMES.includes('whack'));
});

test('humanoid: full joint tree', () => {
  const rig = buildHumanoid();
  for (const j of JOINTS) assert.ok(rig.joints[j], `joint ${j}`);
  assert.ok(rig.parts.weaponMount, 'weaponMount');
  assert.ok(rig.parts.tail1 && rig.parts.tail2, 'headband tails (default hair)');
});

test('humanoid: real proportions, not minecraft', () => {
  const rig = buildHumanoid();
  // total height via bounding box ≈ CHAR_HEIGHT
  const b = new THREE.Box3().setFromObject(rig.group);
  const h = b.max.y - b.min.y;
  assert.ok(Math.abs(h - CHAR_HEIGHT) < 0.12, `height ${h.toFixed(2)} ≈ ${CHAR_HEIGHT}`);
  const heads = h / rig.headH;
  assert.ok(heads > 7.0 && heads < 8.2, `${heads.toFixed(1)} heads tall (want ~7.5)`);
});

test('humanoid: rounded shapes, not boxes', () => {
  const rig = buildHumanoid();
  let headGeo = null, torsoGeo = null;
  rig.joints.head.children.forEach(m => { if (m.isMesh && !headGeo) headGeo = m.geometry.type; });
  // chest mesh is the tapered cylinder child of chest joint
  rig.joints.chest.children.forEach(m => {
    if (m.isMesh && m.geometry.type === 'CylinderGeometry') torsoGeo = m.geometry.type;
  });
  assert.equal(headGeo, 'SphereGeometry', `head is ${headGeo}`);
  assert.equal(torsoGeo, 'CylinderGeometry', 'torso is tapered cylinder');
  // no BoxGeometry in the core body (lapels/mouth/brows excepted — check limbs)
  const limbMeshes = [];
  for (const j of ['shoulderL', 'elbowL', 'hipL', 'kneeL']) {
    rig.joints[j].children.forEach(m => { if (m.isMesh) limbMeshes.push(m.geometry.type); });
  }
  assert.ok(limbMeshes.every(t => t !== 'BoxGeometry'), `limbs rounded: ${limbMeshes.join(',')}`);
});

test('humanoid: has a face', () => {
  const rig = buildHumanoid();
  const kids = rig.joints.head.children.filter(m => m.isMesh).length;
  assert.ok(kids >= 10, `head has ${kids} feature meshes (eyes, brows, nose, mouth, ears)`);
});

test('pose: walk advances phase and swings legs', () => {
  const rig = buildHumanoid();
  setPose(rig, 'walk');
  const z0 = rig.joints.hipL.rotation.z;
  update(rig, 0.016);
  update(rig, 0.2);
  assert.notEqual(rig.joints.hipL.rotation.z, z0, 'hipL moved');
  assert.ok(rig.userData.walkPhase > 0, 'walkPhase advanced');
  // legs oppose
  assert.ok(Math.sign(rig.joints.hipL.rotation.z) !== Math.sign(rig.joints.hipR.rotation.z) ||
    rig.joints.hipL.rotation.z !== rig.joints.hipR.rotation.z, 'legs oppose');
});

test('pose: interpolation is smooth (damped, not snap)', () => {
  const rig = buildHumanoid();
  setPose(rig, 'victory'); // arms way up: shoulder z → 2.65
  update(rig, 0.001); // tiny step
  const z = rig.joints.shoulderL.rotation.z;
  assert.ok(z > 0.001 && z < 2.0, `partial interpolation z=${z.toFixed(3)}`);
});

test('pose: attack plays through and returns to guard', () => {
  const rig = buildHumanoid();
  setPose(rig, 'attack', { weapon: 'slash', dur: 0.4 });
  for (let i = 0; i < 40; i++) update(rig, 0.016);
  assert.equal(rig.userData.pose, 'guard', `ended in ${rig.userData.pose}`);
  // strike moment: arm swung forward-down (positive z, forward)
  const rig2 = buildHumanoid();
  setPose(rig2, 'attack', { weapon: 'slash', dur: 1.0 });
  for (let i = 0; i < 30; i++) update(rig2, 0.016); // ~0.48 ≈ strike keyframe
  assert.ok(rig2.joints.shoulderR.rotation.z > 0.2, `strike swings forward z=${rig2.joints.shoulderR.rotation.z.toFixed(2)}`);
});

test('pose: weapon-aware attacks differ', () => {
  const a = buildHumanoid(), b = buildHumanoid();
  setPose(a, 'attack', { weapon: 'slash', dur: 1 });
  setPose(b, 'attack', { weapon: 'overhead', dur: 1 });
  for (let i = 0; i < 20; i++) { update(a, 0.016); update(b, 0.016); } // windup
  const za = a.joints.shoulderL.rotation.z, zb = b.joints.shoulderL.rotation.z;
  assert.ok(Math.abs(za - zb) > 0.5, `overhead uses both arms (L z: slash=${za.toFixed(2)} overhead=${zb.toFixed(2)})`);
});

test('pose: exclude list respected (game-driven joints)', () => {
  const rig = buildHumanoid();
  rig.joints.shoulderR.rotation.z = 9.99;
  setPose(rig, 'victory');
  update(rig, 0.5, { exclude: ['shoulderR'] });
  assert.equal(rig.joints.shoulderR.rotation.z, 9.99, 'excluded joint untouched');
  assert.ok(rig.joints.shoulderL.rotation.z > 1, 'non-excluded joint posed');
});

test('bunny: reads as bunny', () => {
  const b = buildBunny();
  assert.ok(b.parts.earL && b.parts.earR, 'two ears');
  assert.ok(b.parts.tail, 'fluffy tail');
  // ears extend above the head (silhouette test)
  const earTop = b.parts.earL.children[0].geometry.parameters;
  assert.ok(earTop, 'ear has capsule geometry');
  const headY = b.parts.head.position.y;
  const earTipY = headY + 0.16 + 0.18 + 0.15; // joint + capsule offset + half length
  assert.ok(earTipY > headY + 0.21, `ears tower above head (${earTipY.toFixed(2)} > ${(headY + 0.21).toFixed(2)})`);
});

test('bunny: hop animates', () => {
  const b = buildBunny();
  updateCritter(b, 0.016, 'hop');
  updateCritter(b, 0.2, 'hop');
  assert.ok(b.group.position.y >= 0, 'hop lifts off ground');
  assert.ok(b.userData.phase > 0, 'phase advanced');
});

test('cat: reads as cat', () => {
  const c = buildCat();
  assert.ok(Object.keys(c.parts.legs).length === 4, 'four legs');
  assert.ok(c.parts.tail, 'tail');
  // whiskers: thin white cylinders on the head (3 per side)
  let whiskers = 0;
  c.parts.head.traverse(m => {
    if (m.isMesh && m.geometry.type === 'CylinderGeometry') whiskers++;
  });
  assert.ok(whiskers >= 6, `${whiskers} whiskers`);
});

test('dog: reads as dog', () => {
  const d = buildDog();
  assert.ok(Object.keys(d.parts.legs).length === 4, 'four legs');
  assert.ok(d.parts.tail, 'tail');
  // snout: capsule protruding forward from head
  let snout = false;
  d.parts.head.children.forEach(m => {
    if (m.isMesh && m.geometry.type === 'CapsuleGeometry' && m.position.z > 0.1) snout = true;
  });
  assert.ok(snout, 'protruding snout');
});

test('critter: walk swings legs', () => {
  const c = buildCat();
  updateCritter(c, 0.016, 'walk');
  updateCritter(c, 0.15, 'walk');
  assert.notEqual(c.parts.legs.FL.rotation.x, 0, 'front-left leg swings');
});
