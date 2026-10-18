import test from 'node:test';
import assert from 'node:assert/strict';
import { getLuminance, contrastRatio, evaluateFacets } from '../lib/judge.mjs';

function solid(w, h, r, g, b) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
  }
  return d;
}

test('getLuminance: black is 0, white is 1', () => {
  assert.equal(getLuminance(0, 0, 0), 0);
  assert.equal(Math.round(getLuminance(255, 255, 255)), 1);
});

test('contrastRatio: black vs white is 21:1, identical is 1:1', () => {
  const maxCr = contrastRatio(getLuminance(255, 255, 255), getLuminance(0, 0, 0));
  assert.equal(Math.round(maxCr), 21);
  const minCr = contrastRatio(getLuminance(128, 128, 128), getLuminance(128, 128, 128));
  assert.equal(minCr, 1);
});

test('evaluateFacets: solid flat black image fails palette and camera', () => {
  const data = solid(64, 64, 0, 0, 0);
  const res = evaluateFacets(data, 64, 64, { canvases: [{ w: 540, h: 960, cssW: 540, cssH: 960, kind: 'webgl' }] });

  assert.equal(res.verdict, 'FAIL');
  assert.ok(res.facets.palette.score <= 20, `expected low palette score, got ${res.facets.palette.score}`);
  assert.ok(res.fixes.some(f => f.includes('Renders flat')), 'expected Renders flat fix');
});

test('evaluateFacets: vibrant centered game frame passes all facets', () => {
  const data = solid(64, 64, 30, 40, 70); // dark blue background

  // Draw colorful centered character and terrain elements
  for (let y = 16; y < 48; y++) {
    for (let x = 16; x < 48; x++) {
      const idx = (y * 64 + x) * 4;
      data[idx] = (x * 7) % 255;
      data[idx + 1] = 220; // high brightness yellow/green
      data[idx + 2] = 40;
    }
  }

  const res = evaluateFacets(data, 64, 64, {
    canvases: [{ w: 540, h: 960, cssW: 540, cssH: 960, kind: 'webgl' }],
  });

  assert.equal(res.verdict, 'PASS');
  assert.ok(res.score >= 85, `expected score >= 85, got ${res.score}`);
  assert.ok(res.facets.palette.score >= 80);
  assert.ok(res.facets.camera.score >= 80);
  assert.ok(res.facets.readability.score >= 80);
});

test('evaluateFacets: severe off-center clustering flags camera framing', () => {
  const data = solid(64, 64, 10, 10, 10);

  // Cluster 100% of non-dominant pixels in the top-left quadrant only (x: 2..14, y: 2..14)
  for (let y = 2; y < 14; y++) {
    for (let x = 2; x < 14; x++) {
      const idx = (y * 64 + x) * 4;
      data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 255;
    }
  }

  const res = evaluateFacets(data, 64, 64, {
    canvases: [{ w: 540, h: 960, cssW: 540, cssH: 960, kind: 'webgl' }],
  });

  assert.ok(res.facets.camera.score <= 50, `expected camera penalty, got ${res.facets.camera.score}`);
  assert.ok(res.fixes.some(f => f.includes('Camera framing off-center')), 'expected camera off-center fix');
});

test('evaluateFacets: missing canvas flags layout', () => {
  const data = solid(64, 64, 20, 20, 20);
  const res = evaluateFacets(data, 64, 64, { canvases: [] });

  assert.equal(res.facets.layout.score, 0);
  assert.ok(res.fixes.some(f => f.includes('No <canvas> found')));
});

test('evaluateFacets: low contrast foreground triggers readability warning', () => {
  const data = solid(64, 64, 20, 20, 20); // dark gray

  // Draw foreground elements with almost identical shade (#1b1b1b, minimal contrast)
  for (let y = 20; y < 44; y++) {
    for (let x = 20; x < 44; x++) {
      const idx = (y * 64 + x) * 4;
      data[idx] = 27; data[idx + 1] = 27; data[idx + 2] = 27;
    }
  }

  const res = evaluateFacets(data, 64, 64, {
    canvases: [{ w: 540, h: 960, cssW: 540, cssH: 960, kind: '2d' }],
  });

  assert.ok(res.facets.readability.score <= 75);
});
