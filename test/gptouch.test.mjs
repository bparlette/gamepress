import test from 'node:test';
import assert from 'node:assert/strict';
import { isTouchDevice, clampStick, stickVector, TouchController } from '../kit/gptouch.js';

test('module loads: exports present', () => {
  assert.equal(typeof isTouchDevice, 'function');
  assert.equal(typeof clampStick, 'function');
  assert.equal(typeof stickVector, 'function');
  assert.equal(typeof TouchController, 'function');
});

test('isTouchDevice: false in Node (no DOM)', () => {
  assert.equal(isTouchDevice(), false);
});

test('clampStick: zero vector -> zero', () => {
  const v = clampStick(0, 0, 56);
  assert.deepEqual(v, { x: 0, y: 0, mag: 0 });
});

test('clampStick: inside radius passes through scaled', () => {
  const v = clampStick(28, 0, 56); // half throw
  assert.ok(Math.abs(v.x - 0.5) < 1e-9, `x=${v.x}`);
  assert.ok(Math.abs(v.y) < 1e-9, `y=${v.y}`);
  assert.ok(Math.abs(v.mag - 0.5) < 1e-9, `mag=${v.mag}`);
});

test('clampStick: beyond radius clamps to 1.0, keeps direction', () => {
  const v = clampStick(100, 0, 56);
  assert.ok(Math.abs(v.x - 1) < 1e-9, `x=${v.x}`);
  assert.ok(Math.abs(v.mag - 1) < 1e-9, `mag=${v.mag}`);
});

test('clampStick: diagonal keeps direction', () => {
  const v = clampStick(56, 56, 56); // dist ~79 > 56 -> clamped
  assert.ok(Math.abs(v.mag - 1) < 1e-9);
  assert.ok(Math.abs(v.x - v.y) < 1e-9, `x=${v.x} y=${v.y}`);
  assert.ok(v.x > 0.7 && v.x < 0.71, `x=${v.x}`); // 1/sqrt(2)
});

test('stickVector: below deadzone -> zero', () => {
  const v = stickVector(5, 0, 56, 0.18);
  assert.deepEqual(v, { x: 0, y: 0, mag: 0 });
});

test('stickVector: full throw -> mag 1 after deadzone rescale', () => {
  const v = stickVector(200, 0, 56, 0.18);
  assert.ok(Math.abs(v.mag - 1) < 1e-9, `mag=${v.mag}`);
  assert.ok(Math.abs(v.x - 1) < 1e-9, `x=${v.x}`);
});

test('stickVector: negative direction preserved', () => {
  const v = stickVector(-200, 0, 56, 0.18);
  assert.ok(Math.abs(v.x + 1) < 1e-9, `x=${v.x}`);
});

test('TouchController: no-op without DOM — sane defaults', () => {
  const tc = new TouchController();
  assert.equal(tc.enabled, false);
  const i = tc.getInput();
  assert.equal(i.x, 0);
  assert.equal(i.y, 0);
  assert.equal(i.a, false);
  assert.equal(i.b, false);
  assert.equal(i.aPressed, false);
  assert.equal(i.bPressed, false);
});

test('TouchController: force without document stays disabled, no crash', () => {
  const tc = new TouchController({ force: true, buttons: [{ id: 'a', label: 'JUMP' }] });
  assert.equal(tc.enabled, false);
  const i = tc.getInput();
  assert.equal(i.a, false);
  tc.destroy(); // safe no-op
});

test('TouchController: *Pressed edges auto-consume on read', () => {
  const tc = new TouchController();
  // white-box: simulate a press the DOM layer would have recorded
  tc._buttons = { a: { held: true, pressed: true }, b: { held: false, pressed: false } };
  const first = tc.getInput();
  assert.equal(first.a, true);
  assert.equal(first.aPressed, true);
  const second = tc.getInput();
  assert.equal(second.a, true);       // held persists
  assert.equal(second.aPressed, false); // edge consumed
});
