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
  assert.ok(src.includes("'sticker-retro'"), 'missing sticker-retro preset');
  assert.ok(src.includes("'sticker-night'"), 'missing sticker-night preset');
  assert.ok(src.includes("'sticker-warm'"), 'missing sticker-warm preset');
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

test('crystal-cave preset exists with dark cave lighting rig', () => {
  assert.ok(src.includes("preset === 'crystal-cave'"), 'crystal-cave preset branch missing');
  assert.ok(src.includes("'#1a2b55'"), 'crystal-cave hemisphere sky missing');
  assert.ok(src.includes("'#05070f'"), 'crystal-cave hemisphere ground missing');
  assert.ok(src.includes('0.5'), 'crystal-cave hemisphere intensity missing');
  assert.ok(src.includes('0.028'), 'crystal-cave fog density missing');
});

test('crystal-cave palette matches Crystal Cave source values', () => {
  for (const hex of ['#030816', '#eaf6ff', '#7ff0ff', '#38e8ff', '#ff8ae8', '#ff5ad8',
                     '#ff4f8b', '#fff3b0', '#ffc93a', '#c47d12', '#0d1526', '#06112c']) {
    assert.ok(src.includes(hex), `crystal-cave palette missing ${hex}`);
  }
});

test('crystal-cave exports crystal and glow helpers', () => {
  assert.ok(src.includes('export function makeCrystal'), 'makeCrystal missing');
  assert.ok(src.includes('export function makeGlowSprite3D'), 'makeGlowSprite3D missing');
  assert.ok(src.includes('export const crystalHUD'), 'crystalHUD missing');
  assert.ok(src.includes('emissiveIntensity'), 'crystal emissive missing');
  assert.ok(src.includes('AdditiveBlending'), 'glow additive blending missing');
  assert.ok(src.includes('OctahedronGeometry'), 'crystal geometry missing');
});

test('crystal-cave HUD CSS matches source values', () => {
  assert.ok(src.includes('linear-gradient(90deg,#7ff0ff,#ff8ae8)'), 'title gradient missing');
  assert.ok(src.includes('linear-gradient(90deg,#38e8ff,#ff5ad8)'), 'button gradient missing');
  assert.ok(src.includes('rgba(6,14,40,.55)'), 'pill background missing');
  assert.ok(src.includes('rgba(120,220,255,.35)'), 'pill border missing');
  assert.ok(src.includes('radial-gradient(circle at 35% 35%,#fff3b0,#ffc93a 55%,#c47d12)'), 'coin gradient missing');
});

test('crystal-cave camera uses side-on 2.5D FOV', () => {
  assert.ok(src.includes('camera.fov = 60'), 'crystal-cave FOV 60 missing');
});

test('gulf-thunder preset exists with 270x480 portrait resolution', () => {
  assert.ok(src.includes("preset === 'gulf-thunder'"), 'gulf-thunder preset branch missing');
  assert.ok(src.includes('applyGulfThunder2D'), 'applyGulfThunder2D missing');
  assert.ok(src.includes('RES_W: 270'), 'internal width 270 missing');
  assert.ok(src.includes('RES_H: 480'), 'internal height 480 missing');
  assert.ok(src.includes("PAGE_BG: '#0b0b18'"), 'page bg #0b0b18 missing');
});

test('gulf-thunder sunset palette matches source art', () => {
  for (const hex of ['#e8613a', '#f27b3b', '#f89a3c', '#ffed9d', '#ffeeb8',
                     '#fee295', '#f3b161', '#e99058', '#c8715a', '#280a1d']) {
    assert.ok(src.includes(hex), `gulf-thunder palette missing ${hex}`);
  }
});

test('gulf-thunder touch UI matches source CSS', () => {
  assert.ok(src.includes('rgba(255,90,70,.8)'), 'FIRE button accent missing');
  assert.ok(src.includes('rgba(90,200,255,.8)'), 'SPCL button accent missing');
  assert.ok(src.includes('STICK_BASE: 110'), 'stick base 110px missing');
  assert.ok(src.includes('STICK_KNOB: 48'), 'stick knob 48px missing');
  assert.ok(src.includes('BTN_FIRE: 84'), 'FIRE button 84px missing');
});

test('gulf-thunder arcade pacing matches source (5 stages, 5 bosses, 55s)', () => {
  assert.ok(src.includes('STAGES: 5'), 'stages 5 missing');
  assert.ok(src.includes('BOSSES: 5'), 'bosses 5 missing');
  assert.ok(src.includes('TARGET_SECONDS: 55'), 'target 55s missing');
});

test('gulf-thunder docs section exists', () => {
  const docs = readFileSync(new URL('../docs/VISUAL-STANDARDS.md', import.meta.url), 'utf8');
  assert.ok(docs.includes('PRESET: `gulf-thunder`'), 'docs gulf-thunder section missing');
  assert.ok(docs.includes('270 × 480'), 'docs resolution missing');
});

test('iso-city preset exists with Hades isometric camera spec', () => {
  assert.ok(src.includes("preset === 'iso-city'"), 'iso-city branch missing');
  assert.ok(src.includes('setupIsoCamera'), 'setupIsoCamera missing');
  assert.ok(src.includes('rotateIsoCamera'), 'rotateIsoCamera missing');
  assert.ok(src.includes('35.264'), 'iso elevation 35.264 missing');
  assert.ok(src.includes('CRT_CSS'), 'CRT_CSS missing');
});

test('iso-city palette matches source values', () => {
  for (const hex of ['#0d0a14', '#c8323c', '#1a2a3a', '#ff7a1a', '#e8dcc8', '#2a1a2e', '#07070a', '#8a7ab8', '#3a2a1e', '#ffd9a0', '#6a8aff']) {
    assert.ok(src.includes(hex), `iso-city palette missing ${hex}`);
  }
});

test('iso-city lighting rig matches source shell', () => {
  assert.ok(src.includes('1.1'), 'hemisphere intensity 1.1 missing');
  assert.ok(src.includes('1.6'), 'key intensity 1.6 missing');
  assert.ok(src.includes('0.9'), 'rim intensity 0.9 missing');
  assert.ok(src.includes('40, 60, 20'), 'key position missing');
});

test('toad-city preset exists with chunky 32-bit HUD spec', () => {
  assert.ok(src.includes("preset === 'toad-city'"), 'toad-city branch missing');
  assert.ok(src.includes('applyToadCity2D'), '2D entry point missing');
  assert.ok(src.includes('3px solid #000'), 'HUD border spec missing');
  assert.ok(src.includes('3px 3px 0 #000'), 'HUD shadow spec missing');
  assert.ok(src.includes('repeating-linear-gradient(90deg, #9dd84a 0 6px, #6aa82a 6px 8px)'), 'segmented HP bar missing');
});

test('toad-city palette matches Toad Street 32 source values', () => {
  for (const hex of ['#ffe08a', '#c83a2a', '#a02a2a', '#9dd84a', '#6aa82a', '#f0b0d8', '#e0379b', '#c87a3a', '#6a9ac8', '#e8e0c8', '#0b0f17', '#1a1010', '#6f7f34']) {
    assert.ok(src.includes(hex), `toad-city palette missing ${hex}`);
  }
});

test('toad-city docs sections exist', () => {
  const docs = readFileSync(new URL('../docs/VISUAL-STANDARDS.md', import.meta.url), 'utf8');
  assert.ok(docs.includes('PRESET 9: `iso-city`'), 'docs gulf-thunder section missing');
  assert.ok(docs.includes('PRESET 10: `toad-city`'), 'docs preset 10 missing');
  assert.ok(docs.includes('35.264'), 'docs iso elevation missing');
  assert.ok(docs.includes('border-radius: 0'), 'docs square HUD rule missing');
});

test('sticker-retro palette matches Notebook Arcade source values', () => {
  for (const hex of ['#f4efe0', '#fffdf6', '#ddd6c4', '#5a8cbe55', '#d24646aa', '#d96a6a', '#1b1b1b', '#1b1b1b88', '#e7d8b0', '#8b1e1e', '#1e4a8b', '#ef8c2b', '#d32f2f']) {
    assert.ok(src.includes(hex), `sticker-retro palette missing ${hex}`);
  }
});

test('sticker-retro paper spec matches excitebike source (34px rules, margin x=78)', () => {
  assert.ok(src.includes('RULE_GAP: 34'), 'rule gap 34 missing');
  assert.ok(src.includes('RULE_START: 36'), 'rule start 36 missing');
  assert.ok(src.includes('MARGIN_X: 78'), 'margin x=78 missing');
  assert.ok(src.includes('INK_WIDTH: 3.2'), 'ink width 3.2 missing');
  assert.ok(src.includes('INK_WIDTH_THIN: 1.4'), 'thin ink width 1.4 missing');
});

test('sticker-retro hand fonts are Patrick Hand + Caveat', () => {
  assert.ok(src.includes('Patrick Hand'), 'Patrick Hand font missing');
  assert.ok(src.includes('Caveat'), 'Caveat font missing');
});

test('sticker-night is the dark variant (black paper, neon ink)', () => {
  for (const hex of ['#0b1018', '#14101a', '#000000', '#7aa2ff', '#3dd6c6', '#ffe566', '#ffe08a', '#ff8a78']) {
    assert.ok(src.includes(hex), `sticker-night palette missing ${hex}`);
  }
});

test('sticker-warm is the punch-out vintage variant', () => {
  for (const hex of ['#f6f1df', '#cfc6ad', '#efe6c8', '#fff4c2', '#e07b7b', '#b7d3ea']) {
    assert.ok(src.includes(hex), `sticker-warm palette missing ${hex}`);
  }
});

test('sticker 2D entry point exports paper/ink/font/beep helpers', () => {
  for (const fn of ['drawNotebookPaper', 'drawBinderHoles', 'inkStyle', 'applySticker2D', 'makeStickerBeep']) {
    assert.ok(src.includes(fn), `missing export ${fn}`);
  }
});

test('sticker presets wired into applyVisualStandard as 2D presets', () => {
  assert.ok(src.includes("preset === 'sticker-retro'"), 'sticker-retro not wired in applyVisualStandard');
  assert.ok(src.includes('applySticker2D'), 'applySticker2D not called from applyVisualStandard');
});

test('sticker docs section exists', () => {
  const docs = readFileSync(new URL('../docs/VISUAL-STANDARDS.md', import.meta.url), 'utf8');
  assert.ok(docs.includes('sticker-retro'), 'docs missing sticker-retro');
  assert.ok(docs.includes('Notebook Arcade'), 'docs missing Notebook Arcade reference');
});

test('poly-track preset exists with flat-shaded lighting rig', () => {
  assert.ok(src.includes("preset === 'poly-track'"), 'poly-track branch missing');
  assert.ok(src.includes('1.35'), 'poly-track hemisphere intensity 1.35 missing');
  assert.ok(src.includes('1.6'), 'poly-track sun intensity 1.6 missing');
  assert.ok(src.includes('60, 90, 30'), 'poly-track sun position missing');
  assert.ok(src.includes('PCFSoftShadowMap'), 'poly-track soft shadows missing');
  assert.ok(src.includes('-0.0005'), 'poly-track shadow bias missing');
});

test('poly-track exports flat-shaded material helpers', () => {
  assert.ok(src.includes('makeFlatMaterial'), 'makeFlatMaterial missing');
  assert.ok(src.includes('facetJitter'), 'facetJitter missing');
  assert.ok(src.includes('flatShading: true'), 'flatShading flag missing');
  assert.ok(src.includes('roughness: 0.95'), 'flat material roughness missing');
});

test('poly-track palette matches sampled screenshot values', () => {
  for (const hex of ['#5da9e8', '#bfe0f2', '#fffbe8', '#cfe4f2',
                     '#a8d4f0', '#9fd8a8', '#fff5e0',
                     '#7a8b9d', '#16181c', '#f2f2f2',
                     '#5fbf77', '#4aa862', '#f3cd83', '#e0b96e',
                     '#c99a5e', '#a87f4c', '#8a5a2a', '#4fae5c', '#9aa3ad',
                     '#e63b2e', '#2e7de6', '#7b3fe4', '#1a1a1a',
                     '#4ade80', '#ffb020']) {
    assert.ok(src.includes(hex), `poly-track palette missing ${hex}`);
  }
});

test('poly-track fog is light blue-white, far (120-450)', () => {
  assert.ok(src.includes("'#cfe4f2'"), 'poly-track fog color missing');
  assert.ok(src.includes('120'), 'poly-track fog near missing');
  assert.ok(src.includes('450'), 'poly-track fog far missing');
});

test('poly-track returns track/terrain/props/cars/ui color groups', () => {
  assert.ok(src.includes("track: { surface: P.TRACK"), 'track color group missing');
  assert.ok(src.includes("terrain: { grass: P.GRASS"), 'terrain color group missing');
  assert.ok(src.includes("cars: { red: P.CAR_RED"), 'cars color group missing');
  assert.ok(src.includes("ui: { panel: P.UI_PANEL"), 'ui spec group missing');
  assert.ok(src.includes('Roboto Mono'), 'poly-track UI font missing');
});

test('poly-track docs section exists', () => {
  const docs = readFileSync(new URL('../docs/VISUAL-STANDARDS.md', import.meta.url), 'utf8');
  assert.ok(docs.includes('`poly-track`'), 'docs poly-track missing');
  assert.ok(docs.includes('flat-shaded'), 'docs flat-shading trait missing');
  assert.ok(docs.includes('makeFlatMaterial'), 'docs makeFlatMaterial missing');
});
