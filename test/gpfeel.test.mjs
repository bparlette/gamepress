import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../kit/gpfeel.js';
import gpfeel from '../kit/gpfeel.js';

const DT = 1 / 60;

// --- minimal mock Web Audio context for APU tests ---
function mockCtx() {
  const param = (v) => ({
    value: v,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  });
  return {
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    createOscillator: () => ({ type: '', frequency: param(440), connect() {}, start() {}, stop() {} }),
    createGain: () => ({ gain: param(0), connect() {} }),
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
    createBufferSource: () => ({ buffer: null, connect() {}, start() {}, stop() {} }),
    createBiquadFilter: () => ({ type: '', frequency: param(1000), connect() {} }),
  };
}

test('clean exports: default gpfeel object has the documented surface', () => {
  for (const k of ['characterStep', 'updateCamera', 'playTone', 'makeFSM', 'APU', 'MARIO_PHYSICS',
    'DeterministicRNG', 'VirtualAPU', 'SONIC_PHYSICS']) {
    assert.ok(gpfeel[k], `missing gpfeel.${k}`);
  }
  assert.equal(typeof gpfeel.characterStep, 'function');
});

test('coyote time: jump still works 3 frames after walking off a ledge', () => {
  // ground exists only left of x=50
  const world = {
    groundHeightAt: (x) => (x < 50 ? 0 : -Infinity),
    isSolid: () => false,
  };
  const e = { x: 40, y: 0, z: 0, vx: 32, vy: 0, vz: 0, grounded: true };
  let jumpVy = null;
  for (let frame = 0; frame < 8; frame++) {
    const press = frame === 3; // walks off during frame 0; frames 1-4 are coyote
    F.characterStep(e, { moveX: 1, moveZ: 0, jumpPressed: press, jumpHeld: press || frame > 3 }, DT, world);
    if (press) jumpVy = e.vy;
  }
  assert.ok(!e.grounded || jumpVy > 0, 'entity should be airborne after walking off');
  assert.ok(jumpVy > 40, `coyote jump should fire with full impulse, got vy=${jumpVy}`);
});

test('coyote expires: jump pressed 6 frames after ledge does NOT fire (buffers instead)', () => {
  const world = {
    groundHeightAt: (x) => (x < 50 ? 0 : -Infinity),
    isSolid: () => false,
  };
  const e = { x: 40, y: 0, z: 0, vx: 32, vy: 0, vz: 0, grounded: true };
  let jumpVy = null;
  for (let frame = 0; frame < 10; frame++) {
    const press = frame === 6; // 6 frames after walking off (frame 0) — past coyote
    F.characterStep(e, { moveX: 1, moveZ: 0, jumpPressed: press, jumpHeld: false }, DT, world);
    if (press) jumpVy = e.vy;
  }
  assert.ok(jumpVy <= 0, `late jump must not fire, got vy=${jumpVy}`);
  assert.ok(e.jumpBufferFrames >= 0, 'buffer state should exist');
});

test('jump buffer: press 4 frames before landing fires on touchdown', () => {
  const world = { groundHeightAt: () => 0, isSolid: () => false };
  const e = { x: 0, y: 60, z: 0, vx: 0, vy: -10, vz: 0, grounded: false };
  let firedAt = -1;
  let firedVy = 0;
  for (let frame = 0; frame < 20; frame++) {
    const wasAirborne = !e.grounded;
    F.characterStep(e, { jumpPressed: frame === 0, jumpHeld: frame === 0 }, DT, world);
    if (wasAirborne && e.vy > 40) {
      firedAt = frame;
      firedVy = e.vy;
      break;
    }
  }
  assert.ok(firedAt >= 0 && firedAt <= 6, `buffered jump should fire on touchdown, fired at frame ${firedAt}`);
  assert.ok(firedVy > 40, `should fire with full impulse, got ${firedVy}`);
});

test('sub-stepping: fast entity does not tunnel through a thin wall', () => {
  // wall 8 units thick at x in [100,108]; entity moves 48/frame (> 8)
  const world = {
    groundHeightAt: () => 0,
    isSolid: (x, y) => x >= 100 && x <= 108 && y >= -10 && y <= 50,
  };
  const e = { x: 0, y: 0, z: 0, vx: 48, vy: 0, vz: 0, grounded: true, radius: 0 };
  for (let frame = 0; frame < 4; frame++) {
    F.characterStep(e, { moveX: 0, moveZ: 0 }, DT, world);
  }
  assert.ok(e.x < 100, `tunneled through wall! x=${e.x}`);
  assert.equal(e.vx, 0, 'velocity should zero on wall hit');
});

test('camera pulls in when a wall blocks line-of-sight', () => {
  const cam = { x: 0, y: 125, z: 1000, lookX: 0, lookY: 0, lookZ: 0 };
  const target = { x: 0, y: 0, z: 0 };
  // thin slab directly between camera and target
  const wall = { minX: -500, maxX: 500, minY: -100, maxY: 400, minZ: 490, maxZ: 510 };
  F.updateCamera(cam, target, [wall], { dt: DT, distance: 1000, yaw: Math.PI });
  const dist = Math.hypot(cam.x - target.x, cam.y - target.y, cam.z - target.z);
  assert.ok(dist < 1000, `camera should pull in, dist=${dist.toFixed(1)}`);
  assert.ok(cam.z < 490, `camera should sit on the near side of the wall, z=${cam.z.toFixed(1)}`);
});

test('camera deadzone: tiny target fidgets do not move the camera', () => {
  const cam = { x: 0, y: 125, z: 1000, lookX: 0, lookY: 0, lookZ: 0 };
  const target = { x: 0, y: 0, z: 0 };
  F.updateCamera(cam, target, [], { dt: DT, distance: 1000, yaw: Math.PI, deadzone: 6 });
  const cx = cam.x;
  const cy = cam.y;
  const cz = cam.z;
  // fidget under the deadzone
  F.updateCamera(cam, { x: 2, y: 1, z: -1 }, [], { dt: DT, distance: 1000, yaw: Math.PI, deadzone: 6 });
  assert.equal(cam.x, cx, 'camera x should not move on sub-deadzone fidget');
  assert.equal(cam.y, cy, 'camera y should not move on sub-deadzone fidget');
  assert.equal(cam.z, cz, 'camera z should not move on sub-deadzone fidget');
});

test('squashStretch + tickSquash: land pose squashes then recovers to 1', () => {
  const e = {};
  F.squashStretch(e, 'land');
  assert.ok(e._ss, 'tween state should be set');
  // advance past the full duration
  for (let i = 0; i < 20; i++) F.tickSquash(e, 1 / 60);
  assert.equal(e._ss, null, 'tween should complete');
  assert.deepEqual([e.scale.x, e.scale.y, e.scale.z], [1, 1, 1], 'scale must recover to 1');
  // mid-tween the y scale should dip below 1 (squash)
  const e2 = {};
  F.squashStretch(e2, 'land');
  F.tickSquash(e2, 0.02);
  assert.ok(e2.scale.y < 1, `mid-tween should squash, sy=${e2.scale.y}`);
});

test('ledgeCheck: true when no ground ahead, false on solid ground', () => {
  const world = { groundHeightAt: (x) => (x < 50 ? 0 : -Infinity) };
  assert.equal(F.ledgeCheck({ x: 0, z: 0, y: 0, yaw: Math.PI / 2 }, world), false, 'ground ahead');
  assert.equal(F.ledgeCheck({ x: 45, z: 0, y: 0, yaw: Math.PI / 2 }, world), true, 'ledge ahead');
});

test('APU: playTone occupies a channel; lower priority cannot steal', () => {
  const apu = new F.APU(mockCtx());
  const v1 = apu.playTone('pulse1', 440, 0.2, {}, 5);
  assert.ok(v1, 'first tone should play');
  const v2 = apu.playTone('pulse1', 880, 0.2, {}, 3);
  assert.equal(v2, null, 'lower priority must not steal');
  assert.equal(apu.voices.pulse1, v1, 'original voice should hold the channel');
});

test('APU: sfx steals pulse1 from music, then music resumes', async () => {
  const apu = new F.APU(mockCtx());
  apu.music('pulse1', 220);
  assert.ok(apu.voices.pulse1 && apu.voices.pulse1.music, 'music should hold pulse1');
  apu.sfx(880, 0.05);
  assert.ok(apu.voices.pulse1 && !apu.voices.pulse1.music, 'sfx should steal the channel');
  assert.equal(apu.voices.pulse1.priority, 10, 'sfx runs at priority 10');
  await new Promise((r) => setTimeout(r, 400));
  assert.ok(apu.voices.pulse1 && apu.voices.pulse1.music, 'music should resume after sfx');
});

test('APU: unknown channel throws', () => {
  const apu = new F.APU(mockCtx());
  assert.throws(() => apu.playTone('pcm', 440), /unknown channel/);
});

test('DeterministicRNG: same seed, same sequence; state save/restore replays', () => {
  const a = new F.DeterministicRNG(0xace1);
  const b = new F.DeterministicRNG(0xace1);
  for (let i = 0; i < 10; i++) assert.equal(a.next(), b.next(), 'same seed must match');
  const c = new F.DeterministicRNG(1234);
  c.next(); c.next(); c.next();
  const s = c.getState();
  const tail1 = [c.next(), c.next(), c.nextInt(100)];
  c.setState(s);
  const tail2 = [c.next(), c.next(), c.nextInt(100)];
  assert.deepEqual(tail1, tail2, 'setState(getState()) must replay identically');
  const d = new F.DeterministicRNG();
  for (let i = 0; i < 100; i++) {
    const v = d.next();
    assert.ok(v >= 0 && v < 1, 'next() in [0,1)');
    const n = d.nextInt(10);
    assert.ok(n >= 0 && n < 10, 'nextInt in range');
  }
});

test('VirtualAPU: triggerSFX hard-steals pulse1; playBGMNote yields when busy', () => {
  const apu = new F.VirtualAPU(mockCtx());
  const bgm = apu.playBGMNote('pulse1', 220);
  assert.ok(bgm, 'bgm note should play on a free channel');
  assert.equal(apu.playBGMNote('pulse1', 330), null, 'bgm must yield when channel occupied');
  apu.triggerSFX(880);
  assert.equal(apu.voices.pulse1.priority, 10, 'sfx steals at priority 10');
  assert.ok(apu.playBGMNote('pulse2', 440), 'a free channel should still play');
});

test('slope slide: surface steeper than 45° overrides input, slides downhill', () => {
  // ramp y = 2x -> ~63° slope, downhill is -x
  const world = { groundHeightAt: (x) => x * 2, isSolid: () => false };
  const e = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, grounded: true };
  for (let f = 0; f < 10; f++) {
    F.characterStep(e, { moveX: 1, moveZ: 0 }, DT, world); // pushing uphill (+x)
  }
  assert.equal(e.sliding, true, 'should be in slide state on 63° slope');
  assert.ok(e.vx < 0, `should slide downhill (-x) despite uphill input, vx=${e.vx.toFixed(2)}`);
});

test('no slide on gentle slopes: input works normally under 45°', () => {
  // ramp y = 0.5x -> ~27° slope
  const world = { groundHeightAt: (x) => x * 0.5, isSolid: () => false };
  const e = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, grounded: true };
  for (let f = 0; f < 10; f++) {
    F.characterStep(e, { moveX: 1, moveZ: 0 }, DT, world);
  }
  assert.equal(e.sliding, false, 'should NOT slide on 27° slope');
  assert.ok(e.vx > 0, `input should drive uphill, vx=${e.vx.toFixed(2)}`);
});

test('sonic preset: jump cut retains ~45% on release (not Mario 25%)', () => {
  const world = { groundHeightAt: () => 0, isSolid: () => false };
  const mario = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, grounded: true };
  const sonic = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, grounded: true };
  // press and instantly release (jumpHeld false the whole frame)
  F.characterStep(mario, { jumpPressed: true, jumpHeld: false }, DT, world, F.MARIO_PHYSICS);
  F.characterStep(sonic, { jumpPressed: true, jumpHeld: false }, DT, world, F.SONIC_PHYSICS);
  assert.ok(mario.vy > 8 && mario.vy < 20, `mario cut -> ~25% (~13), got ${mario.vy.toFixed(1)}`);
  assert.ok(sonic.vy > 15 && sonic.vy < 35, `sonic cut -> ~45% (~23), got ${sonic.vy.toFixed(1)}`);
  assert.ok(sonic.vy > mario.vy * 1.4, 'sonic should retain clearly more velocity than mario');
});
