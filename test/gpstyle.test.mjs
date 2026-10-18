import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// gpstyle.js is a browser module (imports three.js). Verify statically:
// 1. It exports the required API surface.
// 2. Palettes contain the exact hex values from the source games.
// 3. The toon gradient is the 3-band [0,0,0,0,120,120,255,255] from Cel City.

const src = readFileSync(new URL('../kit/gpstyle.js', import.meta.url), 'utf8');

test('exports applyVisualStandard with cel/shellshock/roadkill presets', () => {
  assert.ok(src.includes('export function applyVisualStandard'), 'missing applyVisualStandard');
  assert.ok(src.includes("'cel'"), 'missing cel preset');
  assert.ok(src.includes("'shellshock'"), 'missing shellshock preset');
  assert.ok(src.includes("'roadkill'"), 'missing roadkill preset');
});

test('exports toon material, outline, palette, and portrait FOV helpers', () => {
  for (const fn of ['makeToonMaterial', 'withOutline', 'outlineMaterial', 'computeOutlineDirs', 'portraitFov', 'PALETTES', 'INK', 'canvasTexture', 'lambert']) {
    assert.ok(src.includes(fn), `missing export ${fn}`);
  }
});

test('cel palette matches Cel City source values', () => {
  for (const hex of ['#14101f', '#ffd23c', '#ff5fa2', '#2fd3ff', '#5ccf3a', '#49b52c', '#1f7bff', '#fff0d6', '#ffc2d4', '#dfe6ff', '#ffd9c9', '#fff3dc']) {
    assert.ok(src.includes(hex), `cel palette missing ${hex}`);
  }
});

test('cel lighting rig matches Cel City source', () => {
  assert.ok(src.includes('1.7'), 'hemisphere intensity 1.7 missing');
  assert.ok(src.includes('1.8'), 'directional intensity 1.8 missing');
});

test('toon gradient is the 3-band Cel City gradient', () => {
  assert.ok(src.includes('[0, 0, 0, 0, 120, 120, 255, 255]'), 'gradient bands wrong');
  assert.ok(src.includes('NearestFilter'), 'gradient must use NearestFilter');
});

test('outline widths match Cel City source', () => {
  assert.ok(src.includes('0.0042'), 'char outline 0.0042 missing');
  assert.ok(src.includes('0.0034'), 'city outline 0.0034 missing');
  assert.ok(src.includes('0.0030'), 'prop outline 0.0030 missing');
});

test('shellshock lighting rig matches Shell Shock 3D source', () => {
  assert.ok(src.includes('1.25'), 'hemisphere intensity 1.25 missing');
  assert.ok(src.includes('0.7'), 'moon intensity 0.7 missing');
  assert.ok(src.includes('-40, 80, 60'), 'moon position missing');
  assert.ok(src.includes('0.0085'), 'fog density 0.0085 missing');
});

test('shellshock fog zone variants present', () => {
  assert.ok(src.includes('0x1a1426'), 'street fog missing');
  assert.ok(src.includes('0x0c160c'), 'sewer fog missing');
  assert.ok(src.includes('0x0b0c0e'), 'subway fog missing');
});

test('tone mapping and pixel ratio rules enforced', () => {
  assert.ok(src.includes('ACESFilmicToneMapping'), 'ACES tone mapping missing');
  assert.ok(src.includes('1.1'), 'exposure 1.1 missing');
});

test('roadkill falls back to cel until studied', () => {
  assert.ok(src.includes("preset === 'roadkill'"), 'roadkill fallback missing');
});

test('hoa preset exists with HOA Warfare lighting rig', () => {
  assert.ok(src.includes("preset === 'hoa'"), 'hoa preset branch missing');
  assert.ok(src.includes("'#dff4ff'"), 'hoa hemisphere sky missing');
  assert.ok(src.includes("'#6a8d4a'"), 'hoa hemisphere ground missing');
  assert.ok(src.includes("'#fff3d6'"), 'hoa sun color missing');
  assert.ok(src.includes('2.1'), 'hoa sun intensity 2.1 missing');
  assert.ok(src.includes('castShadow = true'), 'hoa shadow mapping missing');
  assert.ok(src.includes('-0.0015'), 'hoa shadow bias missing');
});

test('hoa palette matches HOA Warfare source values', () => {
  for (const hex of ['#5ec4ff', '#a8dcff', '#dff4ff', '#6a8d4a', '#fff3d6', '#ffec27']) {
    assert.ok(src.includes(hex), `hoa palette missing ${hex}`);
  }
});

test('hoa fog matches HOA Warfare source (55-130)', () => {
  assert.ok(src.includes('55'), 'hoa fog near missing');
  assert.ok(src.includes('130'), 'hoa fog far missing');
});

test('hoa character proportions match HOA Warfare', () => {
  assert.ok(src.includes('0.38'), 'hoa head width missing');
  assert.ok(src.includes('1.62'), 'hoa head height missing');
  assert.ok(src.includes('charDims'), 'hoa charDims missing');
});
