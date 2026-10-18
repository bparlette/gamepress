import test from 'node:test';
import assert from 'node:assert/strict';
import { bucketPixels, FLAT_THRESHOLD } from '../lib/visual.mjs';

// Synthetic RGBA pixel data: no Chrome needed.

function solid(w, h, r, g, b) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; }
  return d;
}

test('all-black frame is 100% flat', () => {
  const r = bucketPixels(solid(64, 64, 0, 0, 0), 64 * 64);
  assert.equal(r.topPct, 100);
  assert.equal(r.dominant, '#000000');
  assert.ok(r.topPct > FLAT_THRESHOLD);
});

test('all-white frame is 100% flat', () => {
  const r = bucketPixels(solid(64, 64, 255, 255, 255), 64 * 64);
  assert.equal(r.topPct, 100);
  assert.equal(r.dominant, '#ffffff');
});

test('noisy game frame is not flat', () => {
  const d = new Uint8ClampedArray(64 * 64 * 4);
  let s = 123456789;
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s % 256; };
  for (let i = 0; i < d.length; i++) d[i] = rnd();
  const r = bucketPixels(d, 64 * 64);
  assert.ok(r.topPct < FLAT_THRESHOLD, `noisy frame flagged flat at ${r.topPct}%`);
  assert.ok(r.buckets > 100);
});

test('mostly-flat with a title logo still passes', () => {
  // 90% black + 10% white text block — like a title screen
  const d = solid(64, 64, 0, 0, 0);
  for (let y = 28; y < 36; y++) for (let x = 10; x < 54; x++) {
    const i = (y * 64 + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255;
  }
  const r = bucketPixels(d, 64 * 64);
  assert.ok(r.topPct < FLAT_THRESHOLD, `title screen flagged flat at ${r.topPct}%`);
  assert.ok(r.topPct > 85); // sanity: it really is mostly black
});

test('near-flat (97%) loading screen fails', () => {
  const d = solid(64, 64, 20, 20, 40);
  for (let i = 0; i < 100; i++) { const o = i * 4; d[o] = d[o + 1] = d[o + 2] = 200; } // tiny spinner
  const r = bucketPixels(d, 64 * 64);
  assert.ok(r.topPct > FLAT_THRESHOLD, `near-flat passed at ${r.topPct}%`);
});

test('quantization tolerates near-identical shades', () => {
  // gradient-ish noise within one 16-level bucket stays together
  const d = new Uint8ClampedArray(64 * 64 * 4);
  for (let i = 0; i < 64 * 64; i++) {
    d[i * 4] = 8 + (i % 8); d[i * 4 + 1] = 8 + (i % 8); d[i * 4 + 2] = 8 + (i % 8); d[i * 4 + 3] = 255;
  }
  const r = bucketPixels(d, 64 * 64);
  assert.equal(r.topPct, 100); // all in the same quantized bucket
});
