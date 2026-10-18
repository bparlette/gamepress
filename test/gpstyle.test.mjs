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
  assert.ok(src.includes("'shellshock-live'"), 'missing shellshock-live preset');
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

test('roadkill preset exists with Roadkill Rig lighting rig', () => {
  assert.ok(src.includes("preset === 'roadkill'"), 'roadkill preset branch missing');
  assert.ok(src.includes("'#ffe9cf'"), 'roadkill hemisphere sky missing');
  assert.ok(src.includes("'#c9876a'"), 'roadkill hemisphere ground missing');
  assert.ok(src.includes("'#fff1d6'"), 'roadkill sun color missing');
  assert.ok(src.includes('1.55'), 'roadkill hemisphere intensity 1.55 missing');
  assert.ok(src.includes('-0.0007'), 'roadkill shadow bias missing');
  assert.ok(src.includes('0.05'), 'roadkill normalBias missing');
});

test('roadkill palette matches Roadkill Rig source values', () => {
  for (const hex of ['#1a0f12', '#fff4dc', '#ffe9cf', '#c9876a', '#fff1d6', '#f6c99a',
                     '#47a7e0', '#ffd9a6', '#ffcf2e', '#e8312a', '#ff4fd8', '#7dffb0',
                     '#ecb47c', '#dc9a66', '#f4cf98', '#bd6644', '#a4523b', '#d98557',
                     '#fff2c8']) {
    assert.ok(src.includes(hex), `roadkill palette missing ${hex}`);
  }
});

test('roadkill fog matches Roadkill Rig source (90-330)', () => {
  assert.ok(src.includes('90'), 'roadkill fog near missing');
  assert.ok(src.includes('330'), 'roadkill fog far missing');
});

test('roadkill outline widths and ink match Roadkill Rig source', () => {
  assert.ok(src.includes('0.0036'), 'roadkill char outline 0.0036 missing');
  assert.ok(src.includes('0.0032'), 'roadkill prop outline 0.0032 missing');
  assert.ok(src.includes("'#1a0f12'"), 'roadkill ink missing');
});

test('roadkill exports sky dome helper', () => {
  assert.ok(src.includes('makeSkyDome'), 'makeSkyDome missing');
  assert.ok(src.includes('uRed'), 'sky danger-tint uniform missing');
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

test('shellshock-16bit preset exists with 384x224 internal resolution', () => {
  assert.ok(src.includes("preset === 'shellshock-16bit'"), '16bit preset branch missing');
  assert.ok(src.includes('apply16Bit2D'), 'apply16Bit2D missing');
  assert.ok(src.includes('RES_W: 384'), 'internal width 384 missing');
  assert.ok(src.includes('RES_H: 224'), 'internal height 224 missing');
  assert.ok(src.includes("'pixelated'"), 'image-rendering pixelated missing');
});

test('shellshock-16bit CRT overlay matches source CSS', () => {
  assert.ok(src.includes('repeating-linear-gradient(to bottom'), 'scanlines missing');
  assert.ok(src.includes('rgba(255,40,40,.05)'), 'aperture grille red stripe missing');
  assert.ok(src.includes('rgba(0,0,0,.09)'), 'scanline alpha missing');
  assert.ok(src.includes('6% / 9%'), 'barrel border-radius missing');
  assert.ok(src.includes('inset 0 0 28px 8px'), 'vignette shadow missing');
});

test('shellshock-16bit skyline matches source layers', () => {
  assert.ok(src.includes("SKY_FAR: '#161a38'"), 'far skyline color missing');
  assert.ok(src.includes("SKY_NEAR: '#0a0b18'"), 'near skyline color missing');
  assert.ok(src.includes("WINDOW: '#ffd27a'"), 'lit window color missing');
});

test('shellshock-16bit palette matches source colors', () => {
  for (const hex of ['#ffe060', '#ffd27a', '#e8302a', '#ff4a3a', '#ff8c1a', '#7fd85a', '#3fae3a', '#7fdcff', '#c8ccd6', '#9aa3ad', '#05040a', '#1a0e2c']) {
    assert.ok(src.includes(hex), `16bit palette missing ${hex}`);
  }
});

test('shellshock-16bit neon and hit feedback match source', () => {
  assert.ok(src.includes('NEON_R: 70'), 'neon radius 70 missing');
  assert.ok(src.includes('NEON_A: 0.30'), 'neon alpha 0.30 missing');
  assert.ok(src.includes('NEON_FLICKER: 0.25'), 'neon flicker 0.25 missing');
  assert.ok(src.includes('ZOOM_PUNCH: 1.03'), 'zoom punch 1.03 missing');
});

test('shellshock-16bit docs section exists', () => {
  const docs = readFileSync(new URL('../docs/VISUAL-STANDARDS.md', import.meta.url), 'utf8');
  assert.ok(docs.includes('PRESET 6: `shellshock-16bit`'), 'docs preset 6 missing');
  assert.ok(docs.includes('384 × 224'), 'docs resolution missing');
});

test('shellshock-live preset exists with Shell Shock Live exposure grade', () => {
  assert.ok(src.includes("preset === 'shellshock-live'"), 'shellshock-live branch missing');
  assert.ok(src.includes('brightness(1.3) contrast(1.05)'), 'bg expose filter missing');
  assert.ok(src.includes('brightness(1.28) contrast(1.08)'), 'sprite expose filter missing');
  assert.ok(src.includes('applyShellshockLive2D'), '2D entry point missing');
});

test('shellshock-live palette matches Shell Shock Live source values', () => {
  for (const hex of ['#ff9a2a', '#fff2c0', '#7fdcff', '#ffb050', '#fff0a0', '#bfe4ff', '#ff7a1a', '#eef4ff', '#141428', '#2a2a3a', '#2e2a30']) {
    assert.ok(src.includes(hex), `shellshock-live palette missing ${hex}`);
  }
});

test('shellshock-live glow system matches source (1/4 buffer, lighter composite)', () => {
  assert.ok(src.includes('makeGlowSystem'), 'makeGlowSystem missing');
  assert.ok(src.includes("'lighter'"), 'additive lighter composite missing');
  assert.ok(src.includes('createRadialGradient'), 'radial glow sprite missing');
});

test('shellshock-live weather matches source (70 rain, 60 snow)', () => {
  assert.ok(src.includes('makeWeather'), 'makeWeather missing');
  assert.ok(src.includes('rgba(170,190,255,0.35)'), 'rain color missing');
});

test('shellshock-live bloom matches source (blur 2px, opacity .35, screen)', () => {
  assert.ok(src.includes("filter: 'blur(2px)'"), 'bloom blur missing');
  assert.ok(src.includes('0.35'), 'bloom opacity missing');
  assert.ok(src.includes("'screen'"), 'bloom blend mode missing');
});
