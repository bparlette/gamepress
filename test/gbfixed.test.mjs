// kit/gbfixed.js: frame-rate conversion helpers (port track, Contra NES->VB).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateRatio, convVelocity, convAccel, convFrames } from '../kit/gbfixed.js';

test('rateRatio is source_hz / target_hz', () => {
  assert.ok(Math.abs(rateRatio(60.1, 50) - 1.202) < 1e-6);
  assert.equal(rateRatio(60, 60), 1);
  assert.throws(() => rateRatio(60.1, 0), /nonzero/);
});

test('Contra NES->VB example: velocities x K', () => {
  const K = rateRatio(60.1, 50);
  // 2.5 px/frame on NES -> 3.005 px/frame on VB (same distance per second)
  assert.ok(Math.abs(convVelocity(2.5, K) - 3.005) < 1e-6);
  assert.equal(convVelocity(0, K), 0);
  assert.ok(convVelocity(-2.5, K) < 0, 'sign preserved');
});

test('Contra NES->VB example: accelerations x K^2', () => {
  const K = rateRatio(60.1, 50);
  // 0.4 px/frame^2 on NES -> 0.57792 px/frame^2 on VB
  assert.ok(Math.abs(convAccel(0.4, K) - 0.5779216) < 1e-6);
  assert.equal(convAccel(2, 1), 2, 'K=1 is identity');
});

test('Contra NES->VB example: frame-count durations rescale proportionally', () => {
  const K = rateRatio(60.1, 50);
  assert.equal(convFrames(30, K), 36); // 30-frame jump hold -> 36 frames
  assert.equal(convFrames(4, K), 5); // coyote time 4 -> 5
  assert.equal(convFrames(60, 1), 60, 'K=1 is identity');
});
