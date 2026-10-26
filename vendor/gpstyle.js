// gpstyle.js — gamepress visual standards. One call sets up the full look.
// Presets extracted from Cherie's favorite games:
//   'cel'            — Cel City (Jet Set Radio: toon bands + ink outlines + halftone)
//   'shellshock'     — Shell Shock 3D (night city: Lambert + painted textures + exp fog)
//   'hoa'            — HOA Warfare (daytime suburban: Lambert + real shadows + PICO-8 retro mode)
//   'roadkill'       — Roadkill Rig (desert wasteland: warm toon + halftone + inverted-hull outlines + gradient sky dome)
//   'shellshock-live'— Shell Shock Live (2D painted brawler: exposure grade + additive glow lights + weather)
//   'shellshock-16bit'— Shell Shock 16-bit (2D pixel art: 384x224 internal res + CRT overlay + skyline layers)
//   'iso-city'       — ISO City (Hades-style painted isometric: rotatable iso camera + painted sprites + CRT)
//   'toad-city'      — Toad Street 32 (chunky 32-bit: pixelated upscale + square HUD + Press Start 2P)
//   'crystal-cave'   — Crystal Cave (2.5D side-scroller: dark cave + emissive crystals + additive glow bloom)
//   'blox-fruits'    — Blox Fruits (tropical anime archipelago: saturated sky/ocean + fruit-power particles + chunky UI)
//   'poly-track'     — Poly Track (low-poly browser racer: flat-shaded facets + gradient sky + soft shadows, NO outlines)
//   'poly-track'     — Poly Track (low-poly browser racer: flat-shaded facets + gradient sky + soft shadows, NO outlines)
//   'sticker-retro'  — Notebook Arcade base (daylight): lined paper #f4efe0 + blue rules + red margin + #1b1b1b ink + Patrick Hand/Caveat
//   'sticker-night'  — Notebook Arcade dark variant: black/navy "night paper" + neon ink (space-in-veiners, paintball-office)
//   'sticker-warm'   — Notebook Arcade vintage variant: warm aged paper #f6f1df + tan tones (punch-out)
//   'gulf-thunder'   — Gulf Thunder (portrait pixel-art naval arcade: synthwave sunset seascape + slatted retro sun + palm silhouettes)
//
// Usage:
//   import { applyVisualStandard, PALETTES } from './gpstyle.js';
//   applyVisualStandard(scene, camera, renderer, 'cel'); // 'cel' | 'shellshock' | 'hoa' | 'roadkill' | 'shellshock-live' | 'shellshock-16bit' | 'crystal-cave' | 'blox-fruits' | 'iso-city' | 'toad-city' | 'gulf-thunder' | 'sticker-retro' | 'sticker-night' | 'sticker-warm'
//   // 2D games use the 'shellshock-live' / 'shellshock-16bit' / 'toad-city' / 'sticker-retro' presets (no scene/camera/renderer needed):
//   const style = applyVisualStandard(null, null, null, 'sticker-retro', { w: 1280, h: 720 });
//   style.paper(ctx); // draws the notebook paper background — call first every frame
//
// Also exports: makeToonMaterial(), makeOutlineMesh(), makeSkyDome(), INK, makeGlowSystem(), etc. for manual use.

import * as THREE from './three.module.min.js';

export const INK = '#14101f';

export const PALETTES = {
  cel: {
    INK: '#14101f', YELLOW: '#ffd23c', PINK: '#ff5fa2', CYAN: '#2fd3ff',
    GREEN: '#5ccf3a', GREEN_DK: '#49b52c', BLUE: '#1f7bff', CREAM: '#fff0d6',
    FOG: '#ffc2d4', HEMI_SKY: '#dfe6ff', HEMI_GND: '#ffd9c9', SUN: '#fff3dc',
  },
  shellshock: {
    FOG: 0x1a1426, MOON: 0x9fb0ff, HEMI_SKY: 0x8a8ac8, HEMI_GND: 0x3a2a30,
    LAMP: 0xffe0a0, ASPHALT: 0x3a3a42, DARK: 0x1e2026,
    FOG_SEWER: 0x0c160c, FOG_SUBWAY: 0x0b0c0e, FOG_INSIDE: 0x141410,
  },
  hoa: {
    SKY: '#5ec4ff', FOG: '#a8dcff',
    HEMI_SKY: '#dff4ff', HEMI_GND: '#6a8d4a', SUN: '#fff3d6',
    MUZZLE: '#ffec27',
  },
  // Roadkill Rig (desert wasteland racer). Exact values from source.
  roadkill: {
    INK: '#1a0f12', CREAM: '#fff4dc',
    HEMI_SKY: '#ffe9cf', HEMI_GND: '#c9876a', SUN: '#fff1d6',
    FOG: '#f6c99a',
    SKY_TOP: '#47a7e0', SKY_HORIZON: '#ffd9a6',
    YELLOW: '#ffcf2e', RED: '#e8312a', PINK: '#ff4fd8', GREEN: '#7dffb0',
    SAND: '#ecb47c', SAND2: '#dc9a66', FLAT: '#f4cf98',
    RUST: '#bd6644', DEEP: '#a4523b', BERM: '#d98557',
    ROAD_DASH: '#fff2c8',
  },
  'shellshock-live': {
    BOOM: '#ff9a2a', SPARK: '#fff2c0', SPARK_CYAN: '#7fdcff',
    MUZZLE: '#ffb050', RING: '#fff0a0', CLINK: '#bfe4ff', NEON: '#ff7a1a',
    RAIN: 'rgba(170,190,255,0.35)', SNOW: '#eef4ff',
    SKY_TOP: '#141428', SKY_BOTTOM: '#2a2a3a', GROUND: '#2e2a30',
    BG_EXPOSE: 'brightness(1.3) contrast(1.05)',
    SPRITE_EXPOSE: 'brightness(1.28) contrast(1.08)',
  },
  // Shell Shock 16-bit (2D pixel art). Exact values from source.
  'shellshock-16bit': {
    // Internal render resolution (Sega Genesis). Canvas stays 384x224; CSS scales up.
    RES_W: 384, RES_H: 224,
    IMAGE_RENDERING: 'pixelated',
    // Skyline: two layers, far then near. [color, baseY, hMin, hVar]
    SKY_FAR: '#161a38', SKY_FAR_BASE: 112, SKY_FAR_HMIN: 30, SKY_FAR_HVAR: 50,
    SKY_NEAR: '#0a0b18', SKY_NEAR_BASE: 136, SKY_NEAR_HMIN: 20, SKY_NEAR_HVAR: 50,
    WINDOW: '#ffd27a', // near-layer lit windows, 2x3 px on a 6x7 px grid
    // Neon level glows (same additive-light engine as shellshock-live)
    NEON: '#ff7a1a', NEON_R: 70, NEON_A: 0.30, NEON_FLICKER: 0.25,
    // Core palette (most-used hex colors from source)
    YELLOW: '#ffe060', YELLOW_WARM: '#ffd27a', RED: '#e8302a', RED_HOT: '#ff4a3a',
    ORANGE: '#ff8c1a', GREEN: '#7fd85a', GREEN_DK: '#3fae3a', CYAN: '#7fdcff',
    GREY: '#c8ccd6', GREY_DK: '#9aa3ad', INK: '#05040a', INK_BLUE: '#10101c',
    PURPLE_DK: '#1a0e2c', BROWN: '#8a5a2a',
    // Hit feedback
    SHAKE_MAX: 6, ZOOM_PUNCH: 1.03,
  },
  // Crystal Cave (2.5D side-scroller: dark cave + emissive crystals + bloom glow). Exact values from source.
  'crystal-cave': {
    BG: '#030816',        // page/canvas background — near-black blue
    TEXT: '#eaf6ff',      // pale ice (body text, HUD numbers)
    CYAN: '#7ff0ff',      // crystal cyan (light)
    CYAN_DK: '#38e8ff',   // primary action cyan (buttons, links)
    PINK: '#ff8ae8',      // crystal magenta (light)
    PINK_DK: '#ff5ad8',   // primary action magenta (big touch button)
    HEART: '#ff4f8b',     // health hearts
    GOLD_LT: '#fff3b0',   // coin highlight
    GOLD: '#ffc93a',      // coin
    GOLD_DK: '#c47d12',   // coin shadow
    HEMI_SKY: '#1a2b55',  // faint blue ambient (top)
    HEMI_GND: '#05070f',  // near-black ground bounce
    ROCK: '#0d1526',      // cave rock
    PILL_BG: 'rgba(6,14,40,.55)',
    PILL_BORDER: 'rgba(120,220,255,.35)',
    BTN_TEXT: '#06112c',  // dark text on gradient buttons
  },
  // Blox Fruits (Roblox anime pirate adventure). Tropical archipelago look:
  // bright saturated anime sky, cyan ocean, chunky UI, particle-heavy fruit combat.
  'blox-fruits': {
    SKY: '#5fb8ff',        // bright daytime sky blue (scene.background)
    FOG: '#bfe4ff',        // clear tropical air
    HEMI_SKY: '#8fd4ff',   // bright sky bounce
    HEMI_GND: '#f2d8a0',   // warm sand bounce
    SUN: '#fff8e8',        // tropical noon sun
    SKY_TOP: '#2a90ff',    // sky-dome top (saturated anime blue)
    SKY_HORIZON: '#cfeaff',// sky-dome horizon
    SUNSET_TOP: '#2a1a5e', // day/night cycle: dusk top
    SUNSET_HOR: '#ff9a5a', // day/night cycle: dusk horizon
    NIGHT_TOP: '#060a24',  // day/night cycle: night top
    NIGHT_HOR: '#1a2a55',  // day/night cycle: night horizon
    OCEAN: '#2ad4e8',      // bright cyan water
    OCEAN_DEEP: '#1a9fc4', // deep water
    FOAM: '#ffffff',       // wave foam / surf
    SAND: '#f2d9a0',       // warm beach sand
    GRASS: '#3fd13a',      // saturated island grass
    GRASS_DK: '#2fae3a',   // grass shadow
    PALM_TRUNK: '#8a5a2a', // palm trunk
    PALM_LEAF: '#2fae3a',  // palm fronds
    WOOD: '#a06a35',       // docks, boats, huts
    STONE: '#9aa3ad',      // cliffs, ruins
    // Fruit power signature colors (combat particles)
    FLAME: '#ff6a1a',      // Flame fruit
    FLAME_HOT: '#ff2a00',
    LIGHT: '#ffe93c',      // Light fruit
    MAGMA: '#ff4400',      // Magma fruit
    ICE: '#7fdcff',        // Ice fruit
    DARK: '#7a1aff',       // Dark fruit
    RUMBLE: '#2a9fff',     // Rumble / lightning
    DRAGON: '#2aff7a',     // Dragon fruit
    HAKI: '#1a0a14',       // Busoshoku haki aura (black-red)
    HAKI_RED: '#ff2a2a',   // haki crackle
    // Chunky UI
    HP: '#3fd13a',         // health bar
    ENERGY: '#2a9fff',     // energy bar
    XP: '#ffd23c',         // xp bar
    DMG: '#ffd23c',        // damage numbers
    CRIT: '#ff7a1a',       // crit numbers
    UI_PANEL: 'rgba(10,14,26,0.72)', // quest tracker / panels
    UI_BORDER: '#ffffff',  // chunky white borders
    INK: '#101828',        // UI text outline (dark navy, never pure black)
  },
  // Sticker Retro — Notebook Arcade base (daylight). Exact values from source:
  // sticker-excitebike/js/game.js paper(), sticker-bad-dudes + sticker-kung-fu-master
  // + sticker-rampage bundles. Lined notebook paper, ink drawings, hand fonts.
  'sticker-retro': {
    PAPER: '#f4efe0',      // notebook paper cream (excitebike paper(), bad-dudes theme)
    PAPER_HI: '#fffdf6',   // paper highlight (kung-fu-master)
    PAPER_SHADOW: '#ddd6c4', // paper edge shadow (kung-fu-master)
    RULE: '#5a8cbe55',     // blue ruled lines, 8-digit alpha (excitebike: lineWidth 1)
    RULE_GAP: 34,          // rule spacing px (excitebike)
    RULE_START: 36,        // first rule y (excitebike)
    MARGIN: '#d24646aa',   // red margin line, 8-digit alpha (excitebike: lineWidth 3)
    MARGIN_X: 78,          // margin x position (excitebike)
    MARGIN_RED: '#d96a6a', // margin red variant (headbrawl favicon)
    INK: '#1b1b1b',        // near-black ink — ALL linework (excitebike drawBike: lineWidth 3.2, round caps/joins)
    INK_SOFT: '#1b1b1b88', // ink at 50% (excitebike track hatch marks: lineWidth 1.4)
    GROUND: '#e7d8b0',     // tan ground fill (excitebike drawTrack)
    CPU_RED: '#8b1e1e',     // opponent 1 — muted dark red (excitebike cpus)
    CPU_BLUE: '#1e4a8b',    // opponent 2 — muted dark blue (excitebike cpus)
    HIT_ORANGE: '#ef8c2b', // hit spark orange (kung-fu-master)
    DMG_RED: '#d32f2f',     // damage red (kung-fu-master)
    FONT_HUD: '"Patrick Hand", cursive', // HUD/labels (excitebike hud(): 700 28px)
    FONT_TITLE: '"Caveat", cursive',     // titles/emphasis (bad-dudes, kung-fu-master)
    INK_WIDTH: 3.2,        // standard stroke width (excitebike drawBike)
    INK_WIDTH_THIN: 1.4,   // detail/hatch stroke width (excitebike track marks)
  },
  // Sticker Night — Notebook Arcade dark variant. Exact values from source:
  // sticker-space-in-veiners + sticker-paintball-office + sticker-kart CSS.
  // Black/dark-navy "night paper" with neon ink. Same hand-drawn language, inverted.
  'sticker-night': {
    PAPER: '#0b1018',      // night paper — deep navy-black (paintball-office)
    PAPER_HI: '#14101a',   // paper highlight (paintball-office)
    PAPER_DEEP: '#000000', // deepest black (space-in-veiners)
    INK: '#ffffff',        // white ink — inverted from retro
    INK_DIM: '#5a5a5a',    // dim ink (space-in-veiners)
    NEON_BLUE: '#7aa2ff',  // neon blue accent (paintball-office)
    NEON_TEAL: '#3dd6c6',  // neon teal accent (paintball-office)
    NEON_YELLOW: '#ffe566',// neon yellow (space-in-veiners)
    WARM: '#ffe08a',       // warm yellow glow (paintball-office)
    SALMON: '#ff8a78',     // salmon accent (paintball-office)
    MINT: '#8be9a8',       // mint accent (paintball-office)
    PERIWINKLE: '#8ab4ff', // periwinkle accent (paintball-office)
    PEACH: '#ffcc88',      // peach accent (paintball-office)
    GOLD: '#c9a227',       // muted gold (paintball-office)
    NIGHT_GREEN: '#061018',// dark green-black (sticker-kart)
    FONT_HUD: '"Patrick Hand", cursive',
    FONT_TITLE: '"Caveat", cursive',
    INK_WIDTH: 3.2,
    INK_WIDTH_THIN: 1.4,
  },
  // Sticker Warm — Punch-Out vintage variant. Exact values from source:
  // sticker-punch-out og.jpg + CSS. Warmer aged paper, tan tones, red accent.
  // Hand-drawn boxers with rounded filled bodies, binder holes, crowd stick figures.
  'sticker-warm': {
    PAPER: '#f6f1df',      // warm aged paper (punch-out theme-color, CSS)
    PAPER_TAN: '#cfc6ad',  // tan paper tone (punch-out CSS)
    PAPER_SAND: '#efe6c8', // sand paper (punch-out CSS)
    CREAM: '#fff4c2',      // cream highlight (sticker-kart CSS)
    INK: '#1b1b1b',        // same near-black ink
    RED_ACCENT: '#e07b7b', // soft red accent (punch-out CSS)
    BLUE_TINT: '#b7d3ea',  // pale blue tint (punch-out CSS)
    BROWN_DK: '#7a3b00',   // dark brown (sticker-kart CSS)
    GREEN_DK: '#143018',   // dark green (sticker-kart CSS)
    RULE: '#5a8cbe55',     // same blue rules
    MARGIN: '#d24646aa',   // same red margin
    MARGIN_X: 78,
    FONT_HUD: '"Patrick Hand", cursive',
    FONT_TITLE: '"Caveat", cursive',
    INK_WIDTH: 3.2,
    INK_WIDTH_THIN: 1.4,
  },
  // Gulf Thunder (portrait pixel-art naval arcade). Exact values from source:
  // canvas 270x480 + image-rendering:pixelated, page bg #0b0b18 (index.html CSS);
  // sky/water hex sampled from the thumbnail art.
  'gulf-thunder': {
    // Internal render resolution (portrait phone). Canvas stays 270x480; CSS scales up.
    RES_W: 270, RES_H: 480,
    IMAGE_RENDERING: 'pixelated',
    PAGE_BG: '#0b0b18',    // page/canvas background — near-black navy (also theme-color)
    // Sunset sky: banded gradient, sampled top -> horizon
    SKY_TOP: '#e8613a',    // burnt orange-red
    SKY_MID: '#f27b3b',    // mid orange
    SKY_HORIZON: '#f89a3c',// golden horizon
    // Retro sun: pale cream disc with horizontal slat gaps (outrun style)
    SUN: '#ffed9d',
    SUN_LT: '#ffeeb8',
    // Water: gradient horizon -> bottom, sampled
    WATER_TOP: '#fee295',  // pale gold at horizon
    WATER_MID: '#f3b161',  // dusty orange
    WATER_LOW: '#e99058',  // burnt orange
    WATER_BOTTOM: '#c8715a',// dusty rose/mauve
    // Palm-island silhouettes flanking the horizon (near-black warm brown)
    SILHOUETTE: '#280a1d',
    // Touch UI accents (from index.html CSS)
    FIRE_BORDER: 'rgba(255,90,70,.8)',  // FIRE button accent
    SPCL_BORDER: 'rgba(90,200,255,.8)', // SPCL button accent
    BTN_BORDER: 'rgba(255,255,255,.55)',
    BTN_BG: 'rgba(20,20,40,.32)',
    BTN_DOWN_BG: 'rgba(255,200,60,.45)',
    BTN_DOWN_BORDER: '#ffd84a',
    STICK_BASE: 110, // px diameter
    STICK_KNOB: 48,  // px diameter
    BTN_FIRE: 84, BTN_JUMP: 62, BTN_SPCL: 62, // px diameters
    // Arcade pacing: "5 stages, 5 bosses, 55 seconds of chaos"
    STAGES: 5, BOSSES: 5, TARGET_SECONDS: 55,
  },
  // ISO City (Hades-style painted isometric). Exact values from source shell.
  'iso-city': {
    INK: '#0d0a14',        // deep near-black purple (outlines)
    GOLD: '#ffd23c',       // divine accents, highlights
    BLOOD: '#c8323c',      // Hades red (danger, damage)
    STYX: '#1a2a3a',       // dark teal-blue (depths, shadows)
    EMBER: '#ff7a1a',      // torchlight orange (key light feel)
    BONE: '#e8dcc8',       // marble white (architecture)
    LAUREL: '#5ccf3a',     // laurel green (accents)
    FOG: '#2a1a2e',        // dark purple fog
    BG: '#07070a',         // page/canvas background
    HEMI_SKY: '#8a7ab8',   // cool violet ambient (top)
    HEMI_GND: '#3a2a1e',   // warm dark ground bounce
    KEY: '#ffd9a0',        // warm key light (torchlight)
    RIM: '#6a8aff',        // cool rim light (underworld blue)
    // Render + presentation (source shell values)
    RES_W: 384, RES_H: 224,
    IMAGE_RENDERING: 'pixelated',
    BLOOM_BLUR: 'blur(2px)', BLOOM_OPACITY: 0.35,
    // Isometric camera: elevation atan(1/sqrt(2)) = 35.264 deg, azimuth 45 deg
    ISO_ELEVATION: 35.264, ISO_AZIMUTH: 45,
  },
  // Toad Street 32 (chunky 32-bit Mario-style). Exact values from source.
  'toad-city': {
    // 32-bit mode uses pure BLACK borders — not cel's purple ink
    INK: '#000',
    GOLD: '#ffe08a',       // names, highlights, joystick knob
    RED: '#c83a2a',        // damage, HP lag bar
    RED_DK: '#a02a2a',     // dark red (title shadow)
    GREEN: '#9dd84a',      // HP fill (light stripe)
    GREEN_DK: '#6aa82a',   // HP fill (dark stripe)
    PINK: '#f0b0d8',       // partner pink
    PINK_DK: '#e0379b',    // partner dark
    BTN_A: '#c87a3a',      // SWING button
    BTN_B: '#6a9ac8',      // JUMP button
    BTN_C: '#e8e0c8',      // ACT button
    BTN_C_HOT: '#ffe08a',  // ACT button (hot)
    BG: '#0b0f17',         // page background
    BAR_BG: '#1a1010',     // HP bar background
    FACE_GREEN: '#6f7f34', // hero face icon
    // Chunky square HUD spec (source CSS)
    HUD_BORDER: '3px solid #000',
    HUD_SHADOW: '3px 3px 0 #000',
    HUD_RADIUS: 0,         // border-radius: 0 everywhere — square, never round
    TEXT_SHADOW: '2px 2px 0 #000',
    FONT: "'PX', 'Courier New', monospace", // Press Start 2P
    IMAGE_RENDERING: 'pixelated',
    // Segmented HP bar (source: repeating-linear-gradient stripes)
    HP_FILL: 'repeating-linear-gradient(90deg, #9dd84a 0 6px, #6aa82a 6px 8px)',
  },
  // Poly Track (low-poly browser racer, Kodub). Flat-shaded Unity look:
  // NO outlines, NO toon bands, NO halftone. Bright gradient sky, soft shadows,
  // flat single-color facets. Colors sampled from gameplay screenshots
  // (kodub.com + itch.io devlog).
  'poly-track': {
    // Sky (gradient dome: vivid blue top -> pale horizon, bright sun glow)
    SKY_TOP: '#5da9e8',     // sampled #6290ba / #42a5fa from screenshots
    SKY_HORIZON: '#bfe0f2', // sampled #9cc5da / #b4d2dd at horizon
    SUN_GLOW: '#fffbe8',    // sun disc + halo
    FOG: '#cfe4f2',         // light blue-white, horizon melts into sky
    // Lighting
    HEMI_SKY: '#a8d4f0',    // bright sky bounce
    HEMI_GND: '#9fd8a8',    // light grass-green ground bounce
    SUN: '#fff5e0',         // warm white high sun
    // Track
    TRACK: '#7a8b9d',       // grey-blue road surface (sampled, consistent across shots)
    TRACK_EDGE: '#16181c',  // thick near-black curbs/borders
    TRACK_DASH: '#f2f2f2',  // start/finish + lane dashes
    // Terrain
    GRASS: '#5fbf77',       // mint green fields
    GRASS_DK: '#4aa862',    // grass facet variation
    SAND: '#f3cd83',        // sampled desert sand
    SAND_DK: '#e0b96e',     // sand facet variation
    MOUNTAIN: '#c99a5e',    // geometric tan mountains
    MOUNTAIN_DK: '#a87f4c', // mountain facet variation
    // Props
    TREE_TRUNK: '#8a5a2a',
    TREE_LEAF: '#4fae5c',   // simple cone/sphere canopies
    ROCK: '#9aa3ad',
    // Vehicles (bold single colors, chunky black tires)
    CAR_RED: '#e63b2e',
    CAR_BLUE: '#2e7de6',
    CAR_PURPLE: '#7b3fe4',  // sampled hero car
    CAR_WHITE: '#f2f2f2',
    TIRE: '#1a1a1a',
    // Minimal UI (dark translucent boxes, white mono numbers)
    UI_PANEL: 'rgba(16,18,30,0.88)',
    UI_TEXT: '#ffffff',
    UI_GREEN: '#4ade80',    // ahead-of-record delta
    UI_AMBER: '#ffb020',
  },
};

// --- cel: 3-band toon gradient ---------------------------------------------
let _grad = null;
export function toonGradient() {
  if (_grad) return _grad;
  const v = [0, 0, 0, 0, 120, 120, 255, 255];
  const d = new Uint8Array(v.length * 4);
  v.forEach((x, i) => { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = x; d[i * 4 + 3] = 255; });
  const t = new THREE.DataTexture(d, v.length, 1, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return (_grad = t);
}

// Halftone dot shader injected into toon materials (comic-book shadow dots).
const HALFTONE_GLSL = `
  { float lumD = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
    float lumO = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
    float rr = lumO / max(lumD, 1e-4);
    vec2 hp = gl_FragCoord.xy / uDot;
    hp = vec2(hp.x + hp.y, hp.y - hp.x) * 0.7071;
    float dd = length(fract(hp) - 0.5);
    float shade = smoothstep(0.66, 0.5, rr);
    float rad = 0.36 * shade;
    float dm = 1.0 - smoothstep(rad - 0.05, rad + 0.05, dd);
    outgoingLight *= 1.0 - 0.3 * dm;
    outgoingLight = mix(outgoingLight, outgoingLight * vec3(0.86, 0.84, 1.12), shade * 0.6);
    outgoingLight = mix(outgoingLight, uFlashC, uFlash);
  }
  #include <opaque_fragment>`;

export function makeToonMaterial(opts = {}) {
  const m = new THREE.MeshToonMaterial(
    Object.assign({ gradientMap: toonGradient(), vertexColors: true }, opts)
  );
  m.userData.flash = { value: 0 };
  m.userData.flashC = { value: new THREE.Color(1, 1, 1) };
  const dpr = Math.min(devicePixelRatio || 1, 2);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFlash = m.userData.flash;
    sh.uniforms.uFlashC = m.userData.flashC;
    sh.uniforms.uDot = { value: 5.0 * dpr };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFlash; uniform vec3 uFlashC; uniform float uDot;')
      .replace('#include <opaque_fragment>', HALFTONE_GLSL);
  };
  m.customProgramCacheKey = () => 'gpstyle-toon';
  return m;
}

// --- cel: inverted-hull outline --------------------------------------------
const _outlineMats = {};
export function outlineMaterial(width, color = INK) {
  const key = width.toFixed(5) + '|' + color;
  if (_outlineMats[key]) return _outlineMats[key];
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uW: { value: width },
      uC: { value: new THREE.Color(color) },
    },
    vertexShader: `
      attribute vec3 odir; uniform float uW; varying float vD;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec3 wd = mat3(modelMatrix) * odir;
        float d = distance(wp.xyz, cameraPosition);
        wp.xyz += wd * uW * clamp(d, 2.5, 36.0);
        vD = d;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform vec3 uC; varying float vD;
      void main() { gl_FragColor = vec4(uC, 1.0); }`,
    side: THREE.BackSide,
  });
  return (_outlineMats[key] = m);
}

// Compute per-vertex mitred outline directions (average of face normals).
export function computeOutlineDirs(geometry) {
  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  const odir = new Float32Array(pos.count * 3);
  const map = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(i);
  }
  const avg = new THREE.Vector3();
  for (const idxs of map.values()) {
    avg.set(0, 0, 0);
    for (const i of idxs) avg.add(new THREE.Vector3(norm.getX(i), norm.getY(i), norm.getZ(i)));
    avg.normalize();
    for (const i of idxs) odir.set([avg.x, avg.y, avg.z], i * 3);
  }
  geometry.setAttribute('odir', new THREE.BufferAttribute(odir, 3));
  return geometry;
}

// Wrap a mesh with an inverted-hull outline. kind: 'char' | 'city' | 'prop'
export function withOutline(mesh, kind = 'char') {
  const w = { char: 0.0042, city: 0.0034, prop: 0.0030 }[kind] || 0.0042;
  computeOutlineDirs(mesh.geometry);
  const outline = new THREE.Mesh(mesh.geometry, outlineMaterial(w));
  outline.raycast = () => {};
  const group = new THREE.Group();
  // Reparent: caller adds `group` instead of `mesh`
  if (mesh.parent) mesh.parent.add(group);
  group.add(mesh);
  group.add(outline);
  return group;
}

// --- shellshock: painted canvas texture -------------------------------------
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function lambert(color, opts = {}) {
  return new THREE.MeshLambertMaterial(Object.assign({ color, vertexColors: false }, opts));
}

// --- poly-track: flat-shaded low-poly material --------------------------------
// The defining trait of the Poly Track look: NO toon bands, NO outlines.
// Unity-style per-face flat shading with soft diffuse. Use for everything:
// terrain, track, props, vehicles.
export function makeFlatMaterial(color, opts = {}) {
  return new THREE.MeshStandardMaterial(Object.assign({
    color, vertexColors: false, flatShading: true, roughness: 0.95, metalness: 0,
  }, opts));
}

// Paint per-face facet variation on a geometry: multiplies each face's vertex
// colors by a small random factor (0.94–1.06) so flat-shaded low-poly surfaces
// show subtle facet breakup like PolyTrack's terrain. Call before creating
// the mesh; requires a non-indexed geometry (call toNonIndexed() first).
export function facetJitter(geometry, amount = 0.06, rng = Math.random) {
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const faces = pos.count / 3;
  for (let f = 0; f < faces; f++) {
    const k = 1 + (rng() * 2 - 1) * amount;
    for (let v = 0; v < 3; v++) {
      colors[(f * 3 + v) * 3] = k;
      colors[(f * 3 + v) * 3 + 1] = k;
      colors[(f * 3 + v) * 3 + 2] = k;
    }
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

// --- shellshock-live: 2D additive glow lights --------------------------------
// Mirrors Shell Shock Live's lighting: an offscreen buffer at 1/4 resolution,
// radial glow sprites stamped with 'lighter' composite, then drawn back over
// the scene with additive blending. Exact values from the source.
const _glowSprites = {};
function glowSprite(color) {
  if (_glowSprites[color]) return _glowSprites[color];
  const s = document.createElement('canvas');
  s.width = s.height = 32;
  const g = s.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, color);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  return (_glowSprites[color] = s);
}

export function makeGlowSystem(w, h, opts = {}) {
  const P = PALETTES['shellshock-live'];
  const div = opts.divisor || 4; // buffer at 1/div resolution (4 = source behavior)
  const bw = Math.ceil(w / div), bh = Math.ceil(h / div);
  const buf = document.createElement('canvas');
  buf.width = bw; buf.height = bh;
  const g = buf.getContext('2d');
  const list = [];
  const max = opts.maxLights || 48;
  return {
    // Light kinds from the source: boom/spark/wspark/ring/clink/muzzle/neon
    light(x, y, r, color, alpha) {
      if (list.length < max) list.push({ x, y, r, color, alpha });
    },
    boom(x, y, k) { this.light(x, y, 70 * Math.min(1, k * 3 + 0.4), P.BOOM, 0.95 * (1 - k)); },
    spark(x, y, k, big, cyan) { this.light(x, y, big ? 30 : 18, cyan ? P.SPARK_CYAN : P.SPARK, (big ? 0.7 : 0.45) * (1 - k)); },
    muzzle(x, y, k) { this.light(x, y, 36, P.MUZZLE, 0.6 * (1 - k)); },
    ring(x, y, k) { this.light(x, y, 50, P.RING, 0.5 * (1 - k)); },
    neon(x, y, r, flicker) { this.light(x, y, r, P.NEON, 0.30 * (flicker == null ? 1 : flicker)); },
    // Stamp all lights into the buffer and composite over the main ctx.
    draw(ctx, gain) {
      if (!list.length) return;
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, bw, bh);
      g.globalCompositeOperation = 'lighter';
      for (const L of list) {
        const r = L.r / div;
        g.globalAlpha = Math.min(1, L.alpha);
        g.drawImage(glowSprite(L.color), L.x / div - r, L.y / div - r, r * 2, r * 2);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = gain == null ? 1 : gain;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(buf, 0, 0, w, h);
      ctx.restore();
      list.length = 0;
    },
    clear() { list.length = 0; },
  };
}

// Weather particles (Shell Shock Live values: 70 rain drops, 60 snow flakes).
export function makeWeather(kind) {
  const P = PALETTES['shellshock-live'];
  return { kind, count: kind === 'rain' ? 70 : 60, color: kind === 'rain' ? P.RAIN : P.SNOW };
}

// --- roadkill: gradient sky dome with sun glow --------------------------------
export function makeSkyDome(palette) {
  const P = palette || PALETTES.roadkill;
  const uniforms = {
    uTop: { value: new THREE.Color(P.SKY_TOP) },
    uHor: { value: new THREE.Color(P.SKY_HORIZON) },
    uSun: { value: new THREE.Vector3(-0.55, 1.35, 0.5).normalize() },
    uRed: { value: 0 }, // raise toward 1 for danger/boss tint
  };
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(800, 32, 16),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSun; uniform float uRed; varying vec3 vP;
        void main(){ float y = max(vP.y, 0.0);
          vec3 top = mix(uTop, vec3(0.42,0.12,0.16), uRed); vec3 hor = mix(uHor, vec3(1.0,0.45,0.28), uRed);
          vec3 c = mix(hor, top, pow(smoothstep(0.0, 0.55, y), 0.8));
          float s = max(dot(normalize(vP), normalize(uSun)), 0.0);
          c += vec3(1.0, 0.85, 0.6) * pow(s, 220.0) * 1.2;
          c += vec3(1.0, 0.75, 0.45) * pow(s, 8.0) * 0.25;
          gl_FragColor = vec4(c, 1.0); }`,
    })
  );
  m.frustumCulled = false;
  return { mesh: m, uniforms };
}

// --- crystal-cave: emissive crystals + additive glow halos --------------------
// The bloom-glowing cave look: emissive crystal geometry plus cheap additive
// sprites standing in for post-processing bloom. Source: Crystal Cave 2.5D.
const _glowTex3D = {};
function glowTexture3D(color) {
  if (_glowTex3D[color]) return _glowTex3D[color];
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, color);
  gr.addColorStop(0.35, color);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return (_glowTex3D[color] = t);
}

// Additive halo sprite for a glow source (crystal, coin, muzzle). Cheap bloom.
export function makeGlowSprite3D(color, size, opacity = 0.55) {
  const m = new THREE.SpriteMaterial({
    map: glowTexture3D(color),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity,
  });
  const s = new THREE.Sprite(m);
  s.scale.set(size, size, 1);
  return s;
}

// Emissive crystal cluster: 3-5 octahedron shards around a base point.
// color: '#7ff0ff' (cyan) or '#ff8ae8' (pink) from the crystal-cave palette.
export function makeCrystal(size, color, opts = {}) {
  const P = PALETTES['crystal-cave'];
  const rand = opts.rng || Math.random; // pass a seeded rng for deterministic scenes
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.35),
    emissive: new THREE.Color(color),
    emissiveIntensity: opts.emissiveIntensity || 2.5,
    roughness: 0.25,
    metalness: 0.1,
    flatShading: true,
  });
  const shards = opts.shards || (3 + Math.floor(rand() * 3));
  for (let i = 0; i < shards; i++) {
    const h = size * (0.7 + rand() * 0.9);
    const geo = new THREE.OctahedronGeometry(size * 0.28, 0);
    geo.scale(0.55, h / (size * 0.28), 0.55); // elongate vertically
    const shard = new THREE.Mesh(geo, mat);
    const a = (i / shards) * Math.PI * 2 + rand() * 0.6;
    const r = size * 0.35 * rand();
    shard.position.set(Math.cos(a) * r, h * 0.32, Math.sin(a) * r);
    shard.rotation.set(
      (rand() - 0.5) * 0.5,
      rand() * Math.PI,
      (rand() - 0.5) * 0.5
    );
    group.add(shard);
  }
  // Halo sprite at cluster center — the bloom read at a glance.
  const halo = makeGlowSprite3D(color, size * 3.2, 0.5);
  halo.position.y = size * 0.5;
  group.add(halo);
  return group;
}

// Crystal Cave HUD CSS (exact values from source). Inject into a <style> tag
// or use the strings directly. Rounded font stack, glass pills, gradient CTAs.
export const crystalHUD = {
  FONT: 'ui-rounded,"SF Pro Rounded",system-ui,-apple-system,"Segoe UI",sans-serif',
  PILL: 'background:rgba(6,14,40,.55);border:1px solid rgba(120,220,255,.35);border-radius:999px;padding:5px 12px;backdrop-filter:blur(4px)',
  PILL_TEXT: 'font-weight:800;font-size:15px;color:#eaf6ff;text-shadow:0 2px 0 #0a1230,0 0 10px rgba(80,200,255,.5)',
  TITLE_GRADIENT: 'background:linear-gradient(90deg,#7ff0ff,#ff8ae8);-webkit-background-clip:text;background-clip:text;color:transparent',
  PRIMARY_BUTTON: 'font-weight:800;padding:10px 22px;border-radius:999px;border:0;background:linear-gradient(90deg,#38e8ff,#ff5ad8);color:#06112c;cursor:pointer',
  TOUCH_BUTTON: 'width:68px;height:68px;border-radius:50%;border:2px solid rgba(140,230,255,.55);background:rgba(10,30,70,.45);color:#dff6ff;backdrop-filter:blur(4px);touch-action:none;box-shadow:0 0 16px rgba(60,200,255,.25) inset',
  TOUCH_BUTTON_BIG: 'width:80px;height:80px;border-color:rgba(255,120,230,.7);box-shadow:0 0 18px rgba(255,80,220,.35) inset',
  HEART: 'background:#ff4f8b;filter:drop-shadow(0 0 4px #ff4f8b)',
  COIN: 'background:radial-gradient(circle at 35% 35%,#fff3b0,#ffc93a 55%,#c47d12);box-shadow:0 0 8px #ffb020',
};

// --- blox-fruits: anime fruit-power particle bursts ---------------------------
// The signature Blox Fruits combat read: big additive sprite bursts in fruit
// signature colors, expanding shockwave rings, rising embers. Pooled sprites,
// zero allocation per frame after warmup.
export function makeBloxParticles(scene, opts = {}) {
  const P = PALETTES['blox-fruits'];
  const max = opts.max || 96;
  const pool = [];
  const active = [];
  function spawn(color, size, life, vel, gravity, opacity) {
    let s = pool.pop();
    if (!s) {
      if (active.length >= max) return null;
      s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture3D('#ffffff'),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      }));
      scene.add(s);
    }
    s.material.color.set(color);
    s.material.opacity = opacity == null ? 0.9 : opacity;
    s.scale.set(size, size, 1);
    s.userData = { life, age: 0, maxLife: life, vel: vel.clone(), gravity: gravity || 0, size, opacity0: opacity == null ? 0.9 : opacity };
    s.visible = true;
    active.push(s);
    return s;
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  return {
    // Impact burst: flash + colored sparks flying outward. colorKey: 'flame' | 'light' | 'magma' | 'ice' | 'dark' | 'rumble' | 'dragon'
    burst(pos, colorKey, power = 1) {
      const C = { flame: P.FLAME, light: P.LIGHT, magma: P.MAGMA, ice: P.ICE, dark: P.DARK, rumble: P.RUMBLE, dragon: P.DRAGON }[colorKey] || P.LIGHT;
      spawn('#ffffff', 3.2 * power, 0.12, V(0, 0, 0), 0, 1); // white flash core
      const n = Math.round(10 * power);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (4 + Math.random() * 7) * power;
        spawn(C, 0.5 + Math.random() * 0.7, 0.5 + Math.random() * 0.4,
          V(Math.cos(a) * sp, 2 + Math.random() * 5 * power, Math.sin(a) * sp), -12, 0.9);
      }
    },
    // Expanding shockwave ring (flat sprite scaled up, fades out)
    ring(pos, colorKey, maxSize = 8) {
      const C = { flame: P.FLAME, light: P.LIGHT, magma: P.MAGMA, ice: P.ICE, dark: P.DARK, rumble: P.RUMBLE, dragon: P.DRAGON }[colorKey] || P.LIGHT;
      const s = spawn(C, 1, 0.45, V(0, 0.5, 0), 0, 0.75);
      if (s) { s.userData.grow = maxSize; s.position.copy(pos); }
      return s;
    },
    // Rising embers / aura wisps around a point (haki aura, charging fruit power)
    ember(pos, colorKey, n = 6) {
      const C = { flame: P.FLAME_HOT, light: P.LIGHT, magma: P.MAGMA, ice: P.ICE, dark: P.HAKI_RED, rumble: P.RUMBLE, dragon: P.DRAGON }[colorKey] || P.FLAME;
      for (let i = 0; i < n; i++) {
        const s = spawn(C, 0.35 + Math.random() * 0.4, 0.9 + Math.random() * 0.5,
          V((Math.random() - 0.5) * 2, 3 + Math.random() * 3, (Math.random() - 0.5) * 2), 2, 0.8);
        if (s) s.position.set(pos.x + (Math.random() - 0.5) * 1.6, pos.y + Math.random(), pos.z + (Math.random() - 0.5) * 1.6);
      }
    },
    // Haki aura: dark core + red crackle rising around a fighter
    haki(pos) {
      this.ember(pos, 'dark', 8);
    },
    update(dt) {
      for (let i = active.length - 1; i >= 0; i--) {
        const s = active[i];
        const u = s.userData;
        u.age += dt;
        const k = u.age / u.maxLife;
        if (k >= 1) {
          s.visible = false;
          active.splice(i, 1);
          pool.push(s);
          continue;
        }
        u.vel.y += u.gravity * dt;
        s.position.addScaledVector(u.vel, dt);
        if (u.grow) {
          const g = 1 + (u.grow - 1) * k;
          s.scale.set(u.size * g, u.size * g, 1);
        }
        s.material.opacity = u.opacity0 * (1 - k);
      }
    },
    clear() {
      for (const s of active) { s.visible = false; pool.push(s); }
      active.length = 0;
    },
  };
}

// Blox Fruits chunky UI CSS. Rounded bars, white borders, big stroked numbers.
// Inject into a <style> tag or use the strings directly.
export const bloxHUD = {
  FONT: 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
  BAR: 'height:18px;border-radius:9px;border:3px solid #ffffff;box-shadow:0 2px 0 rgba(16,24,40,.45);overflow:hidden;background:rgba(10,14,26,.55)',
  HP_FILL: 'height:100%;border-radius:6px;background:linear-gradient(180deg,#6bf06b,#3fd13a 60%,#2fae3a)',
  ENERGY_FILL: 'height:100%;border-radius:6px;background:linear-gradient(180deg,#6bc8ff,#2a9fff 60%,#1f7bff)',
  XP_FILL: 'height:100%;border-radius:6px;background:linear-gradient(180deg,#ffe97a,#ffd23c 60%,#e8a81a)',
  ABILITY_BTN: 'width:64px;height:64px;border-radius:14px;border:3px solid #ffffff;background:rgba(10,14,26,.72);color:#fff;font-weight:900;font-size:22px;box-shadow:0 3px 0 rgba(16,24,40,.45)',
  ABILITY_COOLDOWN: 'filter:grayscale(1) brightness(.55)',
  QUEST_TRACKER: 'background:rgba(10,14,26,.72);border:3px solid #ffffff;border-radius:12px;padding:10px 14px;color:#fff;box-shadow:0 3px 0 rgba(16,24,40,.45)',
  QUEST_TITLE: 'font-weight:900;font-size:15px;color:#ffd23c;-webkit-text-stroke:.5px #101828',
  DMG_NUM: 'font-weight:900;font-size:26px;color:#ffd23c;-webkit-text-stroke:1.5px #101828;text-shadow:0 3px 0 #101828',
  CRIT_NUM: 'font-weight:900;font-size:34px;color:#ff7a1a;-webkit-text-stroke:1.5px #101828;text-shadow:0 3px 0 #101828',
  COMPASS: 'background:rgba(10,14,26,.72);border:3px solid #ffffff;border-radius:999px;color:#fff;font-weight:800',
};

// --- main entry -------------------------------------------------------------
export function applyVisualStandard(scene, camera, renderer, preset = 'cel', opts = {}) {

  // 2D preset: Shell Shock Live (no Three.js scene needed)
  if (preset === 'shellshock-live') {
    return applyShellshockLive2D(opts.w || 960, opts.h || 540, opts);
  }

  // 2D preset: Shell Shock 16-bit (no Three.js scene needed)
  if (preset === 'shellshock-16bit') {
    return apply16Bit2D(opts.w || 384, opts.h || 224, opts);
  }

  // 2D preset: Toad Street 32 (no Three.js scene needed)
  if (preset === 'toad-city') {
    return applyToadCity2D(opts.w || 960, opts.h || 540, opts);
  }

  // 2D presets: Notebook Arcade sticker series (no Three.js scene needed)
  if (preset === 'sticker-retro' || preset === 'sticker-night' || preset === 'sticker-warm') {
    return applySticker2D(opts.w || 1280, opts.h || 720, { ...opts, variant: preset });
  }

  // 2D preset: Gulf Thunder (no Three.js scene needed)
  if (preset === 'gulf-thunder') {
    return applyGulfThunder2D(opts.w || 270, opts.h || 480, opts);
  }

  // Universal: tone mapping, pixel ratio cap
  if (renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  }

  if (preset === 'cel') {
    const P = PALETTES.cel;
    const hemi = new THREE.HemisphereLight(P.HEMI_SKY, P.HEMI_GND, 1.7);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(P.SUN, 1.8);
    const sd = opts.sunDir || [30, 50, 20];
    sun.position.set(sd[0], sd[1], sd[2]);
    scene.add(sun);
    scene.add(sun.target);
    scene.fog = new THREE.Fog(P.FOG, opts.fogNear || 75, opts.fogFar || 210);
    scene.background = new THREE.Color(opts.sky || '#ffd9e8');
    if (camera && !opts.noCamera) {
      camera.fov = 62;
      camera.updateProjectionMatrix();
    }
    return {
      preset: 'cel', palette: P,
      toonMaterial: makeToonMaterial,
      withOutline, INK,
      // Character-friendly defaults
      charOutline: 0.0042, cityOutline: 0.0034, propOutline: 0.0030,
    };
  }

  if (preset === 'shellshock') {
    const P = PALETTES.shellshock;
    const zone = opts.zone || 'street';
    const fogColor = { street: P.FOG, sewer: P.FOG_SEWER, subway: P.FOG_SUBWAY, inside: P.FOG_INSIDE }[zone];
    const hemi = new THREE.HemisphereLight(P.HEMI_SKY, P.HEMI_GND, 1.25);
    scene.add(hemi);
    const moon = new THREE.DirectionalLight(P.MOON, 0.7);
    moon.position.set(-40, 80, 60);
    scene.add(moon);
    scene.add(moon.target);
    // Street-lamp point lights (caller positions them via returned array)
    const lamps = [];
    for (let i = 0; i < (opts.lamps || 6); i++) {
      const L = new THREE.PointLight(0xffffff, 0, 10, 1.6);
      scene.add(L);
      lamps.push(L);
    }
    scene.fog = new THREE.FogExp2(fogColor, opts.fogDensity || 0.0085);
    scene.background = new THREE.Color(fogColor);
    if (camera && !opts.noCamera) {
      camera.fov = 52;
      camera.updateProjectionMatrix();
    }
    return {
      preset: 'shellshock', palette: P, lamps,
      lambert, canvasTexture,
      glowMaterial: (color) => new THREE.MeshBasicMaterial({ color }),
    };
  }

  if (preset === 'hoa') {
    const P = PALETTES.hoa;
    const hemi = new THREE.HemisphereLight(P.HEMI_SKY, P.HEMI_GND, 1.8);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(P.SUN, 2.1);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    const shadowSize = opts.shadowSize || 1024;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    const sc = sun.shadow.camera;
    sc.left = -55; sc.right = 55; sc.top = 55; sc.bottom = -55;
    sc.near = 1; sc.far = 140;
    sun.shadow.bias = -0.0015;
    scene.add(sun);
    scene.add(sun.target);
    // Muzzle-flash light attached to camera (intensity spiked on shot by caller)
    const muzzle = new THREE.PointLight(P.MUZZLE, 0, 15);
    if (camera) camera.add(muzzle);
    scene.fog = new THREE.Fog(P.FOG, opts.fogNear || 55, opts.fogFar || 130);
    scene.background = new THREE.Color(P.SKY);
    if (camera && !opts.noCamera) {
      camera.fov = 75;
      camera.updateProjectionMatrix();
    }
    return {
      preset: 'hoa', palette: P, sun, muzzle,
      lambert,
      // Chunky boxy character proportions from HOA Warfare (total height ~1.8)
      charDims: {
        head: [0.38, 0.40, 0.38], headY: 1.62,
        torso: [0.56, 0.62, 0.30],
        leg: [0.20, 0.72, 0.24], hipX: 0.13,
        shoe: [0.22, 0.10, 0.30],
      },
    };
  }

  if (preset === 'roadkill') {
    const P = PALETTES.roadkill;
    const hemi = new THREE.HemisphereLight(P.HEMI_SKY, P.HEMI_GND, 1.55);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(P.SUN, 2.1);
    sun.position.set(-0.55, 1.35, 0.5).normalize().multiplyScalar(100);
    sun.castShadow = true;
    const shadowSize = opts.shadowSize || 2048;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    const sc = sun.shadow.camera;
    sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34;
    sc.near = 1; sc.far = 220;
    sun.shadow.bias = -0.0007;
    sun.shadow.normalBias = 0.05;
    scene.add(sun);
    scene.add(sun.target);
    scene.fog = new THREE.Fog(P.FOG, opts.fogNear || 90, opts.fogFar || 330);
    scene.background = new THREE.Color(P.FOG);
    if (camera && !opts.noCamera) {
      camera.fov = 62;
      camera.updateProjectionMatrix();
    }
    return {
      preset: 'roadkill', palette: P, sun,
      toonMaterial: makeToonMaterial, // 3-band gradient + halftone dots, same as cel
      withOutline, makeSkyDome,
      INK: P.INK,
      // Inverted-hull outline widths from Roadkill Rig source
      charOutline: 0.0036, cityOutline: 0.0030, propOutline: 0.0032,
      outlineFor: (kind) => outlineMaterial(
        { char: 0.0036, city: 0.0030, prop: 0.0032 }[kind] || 0.0032, P.INK),
      // Desert ground vertex colors (paint these per-vertex like the source)
      ground: {
        SAND: P.SAND, SAND2: P.SAND2, FLAT: P.FLAT,
        RUST: P.RUST, DEEP: P.DEEP, BERM: P.BERM,
      },
      // Rust prop palette for vehicles/scrap
      rusts: ['#9c4b2e', '#7d5a45', '#b86b3c', '#6f7d7a', '#a3896a', '#5d6b78'],
      lambert, canvasTexture,
    };
  }

  if (preset === 'crystal-cave') {
    const P = PALETTES['crystal-cave'];
    // Cave ambient: faint blue, no sun. Crystals carry the light.
    const hemi = new THREE.HemisphereLight(P.HEMI_SKY, P.HEMI_GND, 0.5);
    scene.add(hemi);
    // Crystal point lights — caller positions each at a crystal cluster.
    // Alternating cyan/magenta matches the source's two crystal colors.
    const crystalLights = [];
    const nLights = opts.lights || 8;
    for (let i = 0; i < nLights; i++) {
      const color = i % 2 === 0 ? P.CYAN : P.PINK;
      const L = new THREE.PointLight(color, 2, 18, 2);
      scene.add(L);
      crystalLights.push(L);
    }
    scene.fog = new THREE.FogExp2(P.BG, opts.fogDensity || 0.028);
    scene.background = new THREE.Color(P.BG);
    if (camera && !opts.noCamera) {
      camera.fov = 60; // side-on 2.5D framing
      camera.updateProjectionMatrix();
    }
    return {
      preset: 'crystal-cave', palette: P, crystalLights,
      makeCrystal, makeGlowSprite3D, crystalHUD,
      lambert, canvasTexture,
      // Cave rock material (very dark blue-grey, roughness 1)
      rockMaterial: (color) => new THREE.MeshLambertMaterial({ color: color || P.ROCK }),
    };
  }

  if (preset === 'blox-fruits') {
    const P = PALETTES['blox-fruits'];
    // Tropical anime noon: bright sky bounce + warm sand bounce, strong warm sun.
    // Blox Fruits is BRIGHT — saturation and exposure carry the look.
    const hemi = new THREE.HemisphereLight(P.HEMI_SKY, P.HEMI_GND, 2.0);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(P.SUN, 2.3);
    sun.position.set(40, 90, 25);
    sun.castShadow = true;
    const shadowSize = opts.shadowSize || 2048;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    const sc = sun.shadow.camera;
    sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60;
    sc.near = 1; sc.far = 220;
    sun.shadow.bias = -0.001;
    scene.add(sun);
    scene.add(sun.target);
    scene.fog = new THREE.Fog(P.FOG, opts.fogNear || 90, opts.fogFar || 320);
    scene.background = new THREE.Color(opts.sky || P.SKY);
    if (camera && !opts.noCamera) {
      camera.fov = 70; // Roblox-style wide default
      camera.updateProjectionMatrix();
    }
    return {
      preset: 'blox-fruits', palette: P, sun,
      lambert, canvasTexture, makeSkyDome, makeBloxParticles, bloxHUD,
      // Fruit power signature colors for combat particles
      fruitColors: {
        flame: [P.FLAME, P.FLAME_HOT], light: [P.LIGHT, '#ffffff'],
        magma: [P.MAGMA, P.FLAME_HOT], ice: [P.ICE, '#ffffff'],
        dark: [P.DARK, P.HAKI_RED], rumble: [P.RUMBLE, '#ffffff'],
        dragon: [P.DRAGON, '#b0ffd0'],
      },
      // Ocean material helper (bright cyan Lambert + white foam ring painted by caller)
      oceanMaterial: () => lambert(P.OCEAN),
      sandMaterial: () => lambert(P.SAND),
      grassMaterial: () => lambert(P.GRASS),
    };
  }

  if (preset === 'poly-track') {
    const P = PALETTES['poly-track'];
    // Bright clean lighting: strong hemisphere + high warm sun, soft shadows.
    // PolyTrack has no harsh contrast — everything is evenly, brightly lit.
    const hemi = new THREE.HemisphereLight(P.HEMI_SKY, P.HEMI_GND, opts.hemiIntensity || 1.35);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(P.SUN, opts.sunIntensity || 1.6);
    const sd = opts.sunDir || [60, 90, 30];
    sun.position.set(sd[0], sd[1], sd[2]);
    sun.castShadow = true;
    const shadowSize = opts.shadowSize || 1024;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    const sc = sun.shadow.camera;
    const ext = opts.shadowExtent || 60;
    sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext;
    sc.near = 1; sc.far = 400;
    sun.shadow.bias = -0.0005;
    if (renderer) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene.add(sun);
    scene.add(sun.target);
    // Gradient sky dome (vivid blue -> pale horizon) + sun glow. Reuses the
    // roadkill sky shader with poly-track palette values.
    const sky = makeSkyDome(P);
    scene.add(sky.mesh);
    // Light blue-white fog: the horizon melts into the sky, no hard line.
    scene.fog = new THREE.Fog(P.FOG, opts.fogNear || 120, opts.fogFar || 450);
    scene.background = new THREE.Color(P.FOG);
    if (camera && !opts.noCamera) {
      camera.fov = opts.fov || 60; // chase-cam framing
      camera.updateProjectionMatrix();
    }
    return {
      preset: 'poly-track', palette: P, sun, sky,
      // The core look: flat-shaded materials. Use for EVERYTHING.
      makeFlatMaterial, facetJitter,
      lambert, canvasTexture,
      // Track colors: grey-blue road ribbon + black edge curbs.
      track: { surface: P.TRACK, edge: P.TRACK_EDGE, dash: P.TRACK_DASH },
      terrain: { grass: P.GRASS, grassDk: P.GRASS_DK, sand: P.SAND, sandDk: P.SAND_DK,
                 mountain: P.MOUNTAIN, mountainDk: P.MOUNTAIN_DK },
      props: { trunk: P.TREE_TRUNK, leaf: P.TREE_LEAF, rock: P.ROCK },
      cars: { red: P.CAR_RED, blue: P.CAR_BLUE, purple: P.CAR_PURPLE, white: P.CAR_WHITE, tire: P.TIRE },
      // Minimal UI spec: dark translucent boxes, white mono numbers.
      ui: { panel: P.UI_PANEL, text: P.UI_TEXT, green: P.UI_GREEN, amber: P.UI_AMBER,
            font: '"Roboto Mono", "SF Mono", Menlo, monospace' },
    };
  }

  if (preset === 'iso-city') {
    const P = PALETTES['iso-city'];
    // Painterly Hades feel: warm torchlight key + cool underworld rim
    const hemi = new THREE.HemisphereLight(P.HEMI_SKY, P.HEMI_GND, 1.1);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(P.KEY, 1.6);
    key.position.set(40, 60, 20);
    scene.add(key);
    scene.add(key.target);
    const rim = new THREE.DirectionalLight(P.RIM, 0.9);
    rim.position.set(-50, 30, -40);
    scene.add(rim);
    scene.add(rim.target);
    scene.fog = new THREE.Fog(P.FOG, opts.fogNear || 40, opts.fogFar || 120);
    scene.background = new THREE.Color(P.BG);
    if (camera && !opts.noCamera) {
      setupIsoCamera(camera, opts.isoAngle || 0, opts.isoTarget);
    }
    return {
      preset: 'iso-city', palette: P, key, rim,
      lambert, canvasTexture,
      setupIsoCamera, rotateIsoCamera,
      // Painted-sprite characters: paint onto canvasTexture, billboard in the 3D world
      spriteMaterial: (texture) => new THREE.SpriteMaterial({ map: texture }),
      // CRT overlay CSS (same treatment as 16-bit — source shell)
      crt: { css: CRT_CSS },
      bloom: { filter: 'blur(2px)', opacity: 0.35, mixBlendMode: 'screen' },
    };
  }

  throw new Error(`gpstyle: unknown preset "${preset}"`);
}

// 2D entry point: Shell Shock Live visual standard for canvas games.
// No scene/camera/renderer — returns exposure grade, glow system factory,
// bloom CSS, weather, and fallback sky/ground. Call as:
//   const style = applyVisualStandard(null, null, null, 'shellshock-live');
//   style.glow.boom(x, y, k); ... style.glow.draw(ctx);
export function applyShellshockLive2D(w, h, opts = {}) {
  const P = PALETTES['shellshock-live'];
  return {
    preset: 'shellshock-live', palette: P,
    // Exposure grade (CSS filters applied to offscreen-exposed sprites — source values)
    bgExpose: P.BG_EXPOSE,       // 'brightness(1.3) contrast(1.05)'
    spriteExpose: P.SPRITE_EXPOSE, // 'brightness(1.28) contrast(1.08)'
    // Additive glow light system (1/4-res buffer, 'lighter' composite)
    glow: makeGlowSystem(w, h, opts),
    // Bloom overlay CSS for glow sources (source values)
    bloom: { filter: 'blur(2px)', opacity: 0.35, mixBlendMode: 'screen' },
    // Weather (source counts/colors)
    weather: { rain: makeWeather('rain'), snow: makeWeather('snow') },
    // Fallback sky/ground when no painted background (source values)
    skyFallback: { top: P.SKY_TOP, bottom: P.SKY_BOTTOM, ground: P.GROUND },
    // Hit feedback (source: white flash silhouette + particles)
    hitFlashFrames: 5,
  };
}

// 2D entry point: Shell Shock 16-bit visual standard for pixel-art canvas games.
// No scene/camera/renderer — returns the internal resolution, CRT overlay CSS,
// skyline layer spec, bloom config, and the shared additive glow system.
// Call as:
//   const style = applyVisualStandard(null, null, null, 'shellshock-16bit');
//   // canvas: <canvas id="game" width="384" height="224">
//   // css: image-rendering: pixelated; + style.crt.css applied to a ::after overlay
export function apply16Bit2D(w, h, opts = {}) {
  const P = PALETTES['shellshock-16bit'];
  const rw = P.RES_W, rh = P.RES_H;
  return {
    preset: 'shellshock-16bit', palette: P,
    // Internal render resolution. Canvas element stays rw x rh; CSS scales it up.
    res: { w: rw, h: rh },
    imageRendering: P.IMAGE_RENDERING, // 'pixelated' — chunky crisp pixels, never smooth
    // CRT overlay: a positioned ::after element with this exact background + shadow.
    // Source CSS: scanlines (9% black rows) + RGB aperture grille (5% 1px stripes)
    // + glass highlight top-left + vignette + barrel border-radius.
    crt: {
      css: `background:
      radial-gradient(120% 90% at 30% 18%, rgba(255,255,255,.10), rgba(255,255,255,.03) 35%, transparent 60%),
      radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.25) 100%),
      repeating-linear-gradient(to bottom, transparent 0 var(--row, 3px), rgba(0,0,0,.09) var(--row, 3px) calc(var(--row, 3px) * 2)),
      repeating-linear-gradient(to right, rgba(255,40,40,.05) 0 1px, rgba(40,255,80,.05) 1px 2px, rgba(60,90,255,.05) 2px 3px);
    box-shadow: inset 0 0 28px 8px rgba(0,0,0,.35), inset 0 0 10px 2px rgba(0,0,0,.3), inset 0 0 4px 1px rgba(0,0,0,.6);
    border-radius: 6% / 9%;`,
    },
    // Bloom: a second rw x rh canvas composited over the game canvas (source: id="bloom")
    bloom: { filter: 'blur(2px)', opacity: 0.35, mixBlendMode: 'screen' },
    // Skyline: two parallax layers, far then near. Drawn procedurally in source:
    // rects w=18..40, near layer adds 2x3 lit windows on a 6x7 grid where hash>0.8.
    skyline: {
      far: { color: P.SKY_FAR, base: P.SKY_FAR_BASE, hMin: P.SKY_FAR_HMIN, hVar: P.SKY_FAR_HVAR },
      near: { color: P.SKY_NEAR, base: P.SKY_NEAR_BASE, hMin: P.SKY_NEAR_HMIN, hVar: P.SKY_NEAR_HVAR },
      window: { color: P.WINDOW, w: 2, h: 3, gridX: 6, gridY: 7 },
    },
    // Additive glow light system (same engine as shellshock-live: 1/4-res buffer, 'lighter')
    glow: makeGlowSystem(rw, rh, opts),
    // Static neon level glows (source: r=70, #ff7a1a, a=0.30, flicker 0.25)
    neon: { color: P.NEON, r: P.NEON_R, alpha: P.NEON_A, flicker: P.NEON_FLICKER },
    // Hit feedback (source: shake scaled by hit strength, 1.03x zoom punch)
    shakeMax: P.SHAKE_MAX,
    zoomPunch: P.ZOOM_PUNCH,
  };
}

// Draw the Notebook Arcade paper background. Call first every frame.
// Exact recipe from sticker-excitebike/js/game.js paper():
//   cream fill #f4efe0, blue rules #5a8cbe55 every 34px from y=36, red margin #d24646aa 3px at x=78.
export function drawNotebookPaper(ctx, w, h, variant = 'sticker-retro') {
  const P = PALETTES[variant] || PALETTES['sticker-retro'];
  ctx.fillStyle = P.PAPER;
  ctx.fillRect(0, 0, w, h);
  if (variant === 'sticker-night') return; // night paper: no rules, no margin — pure dark
  ctx.strokeStyle = P.RULE;
  ctx.lineWidth = 1;
  const gap = P.RULE_GAP || 34, start = P.RULE_START || 36;
  for (let y = start; y < h; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = P.MARGIN;
  ctx.lineWidth = 3;
  const mx = P.MARGIN_X || 78;
  ctx.beginPath();
  ctx.moveTo(mx, 0);
  ctx.lineTo(mx, h);
  ctx.stroke();
}

// Draw binder holes (3, left edge) like the punch-out key art.
export function drawBinderHoles(ctx, h, x = 36, r = 22) {
  for (const y of [h * 0.18, h * 0.5, h * 0.82]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#2a2622';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#4a443c';
    ctx.fill();
  }
}

// Set up round ink linework defaults on a 2D context (excitebike drawBike style).
export function inkStyle(ctx, width) {
  ctx.strokeStyle = '#1b1b1b';
  ctx.lineWidth = width || 3.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

// 2D entry point: Notebook Arcade visual standard for canvas games.
// No scene/camera/renderer — returns the palette, paper/margin/hole painters,
// ink linework defaults, hand fonts, and the shared NES-pad touch CSS contract.
// Call as:
//   const style = applyVisualStandard(null, null, null, 'sticker-retro', { w: 1280, h: 720 });
//   style.paper(ctx); // first call every frame
export function applySticker2D(w, h, opts = {}) {
  const variant = opts.variant || 'sticker-retro';
  const P = PALETTES[variant] || PALETTES['sticker-retro'];
  return {
    preset: variant, palette: P,
    // Paper background painter — call first every frame: style.paper(ctx)
    paper: (ctx) => drawNotebookPaper(ctx, w, h, variant),
    binderHoles: (ctx, x, r) => drawBinderHoles(ctx, h, x, r),
    // Ink linework: ctx settings for hand-drawn strokes (excitebike: 3.2px round)
    ink: (ctx, width) => inkStyle(ctx, width || P.INK_WIDTH),
    inkWidth: P.INK_WIDTH,
    inkWidthThin: P.INK_WIDTH_THIN,
    // Hand fonts (Google Fonts: Patrick Hand + Caveat — self-host like the sticker games)
    fontHud: P.FONT_HUD,     // '"Patrick Hand", cursive'
    fontTitle: P.FONT_TITLE, // '"Caveat", cursive'
    hudFont: (px, weight) => `${weight || 700} ${px}px ${P.FONT_HUD}`,
    titleFont: (px) => `${px}px ${P.FONT_TITLE}`,
    // Opponent colors (muted, from excitebike cpus)
    cpuColors: [P.CPU_RED || '#8b1e1e', P.CPU_BLUE || '#1e4a8b'],
    // Hit feedback colors
    hitOrange: P.HIT_ORANGE || '#ef8c2b',
    dmgRed: P.DMG_RED || '#d32f2f',
    // Audio: square-wave beeps like the sticker games (excitebike beep())
    beep: makeStickerBeep(),
    // Viewport hygiene CSS contract (from shared/nes-pad.css)
    touchCSS: 'touch-action:none;overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent',
  };
}

// 2D entry point: Gulf Thunder visual standard for portrait pixel-art canvas games.
// No scene/camera/renderer — returns the internal resolution, the sunset-seascape
// spec (banded sky, slatted retro sun, palm silhouettes, gradient water), the
// touch UI spec (exact CSS values from source), and the arcade pacing constants.
// Call as:
//   const style = applyVisualStandard(null, null, null, 'gulf-thunder');
//   // canvas: <canvas id="game" width="270" height="480"> with image-rendering: pixelated
//   // page:  background #0b0b18, theme-color #0b0b18
//   // per frame: draw style.sunset.skyStops / style.sunset.waterStops bands,
//   //            style.sunset.sun disc with slat gaps, style.sunset.islands silhouettes
export function applyGulfThunder2D(w, h, opts = {}) {
  const P = PALETTES['gulf-thunder'];
  const rw = P.RES_W, rh = P.RES_H;
  return {
    preset: 'gulf-thunder', palette: P,
    // Internal render resolution. Canvas element stays rw x rh; CSS scales it up.
    res: { w: rw, h: rh },
    imageRendering: P.IMAGE_RENDERING, // 'pixelated' — chunky crisp pixels, never smooth
    pageBg: P.PAGE_BG, // '#0b0b18' — page background + theme-color
    // Sunset seascape: draw top-to-bottom as horizontal bands (source: thumbnail).
    // Sky occupies roughly the top 55%, water the rest; horizon at ~0.55 * rh.
    sunset: {
      horizonFrac: 0.55,
      // Sky bands sampled top -> horizon (draw as rects, no smoothing — it's pixel art)
      skyStops: [
        { y: 0.00, color: P.SKY_TOP },     // '#e8613a' burnt orange-red
        { y: 0.18, color: P.SKY_MID },     // '#f27b3b' mid orange
        { y: 0.38, color: P.SKY_HORIZON },  // '#f89a3c' golden horizon
      ],
      // Retro sun: pale cream disc centered on the horizon with horizontal slat
      // gaps that widen toward the bottom (outrun style). Source: slats visible
      // in the lower third of the disc.
      sun: {
        color: P.SUN,           // '#ffed9d'
        hiColor: P.SUN_LT,      // '#ffeeb8'
        radiusFrac: 0.16,       // radius as fraction of canvas width
        cyFrac: 0.42,           // center y as fraction of canvas height
        slats: 5,               // number of horizontal gaps
        slatStartFrac: 0.55,    // slats begin at 55% down the disc
      },
      // Palm-island silhouettes: near-black islands flanking left/right at the
      // horizon, each with 2-3 palm trees (trunk + 5-6 fronds). Drawn as pure
      // silhouette in SILHOUETTE — no detail, shape reads at a glance.
      islands: {
        color: P.SILHOUETTE,    // '#280a1d'
        left: { xFrac: 0.06, wFrac: 0.30, palms: 3 },
        right: { xFrac: 0.64, wFrac: 0.30, palms: 2 },
        hFrac: 0.03,            // island height as fraction of canvas height
      },
      // Water bands sampled horizon -> bottom (horizontal shimmer bands in source)
      waterStops: [
        { y: 0.55, color: P.WATER_TOP },    // '#fee295' pale gold at horizon
        { y: 0.66, color: P.WATER_MID },    // '#f3b161' dusty orange
        { y: 0.78, color: P.WATER_LOW },    // '#e99058' burnt orange
        { y: 0.90, color: P.WATER_BOTTOM }, // '#c8715a' dusty rose/mauve
      ],
    },
    // Touch UI (exact CSS values from source index.html)
    touch: {
      font: 'bold 12px/1 monospace',
      btnBorder: P.BTN_BORDER,          // 'rgba(255,255,255,.55)'
      btnBg: P.BTN_BG,                  // 'rgba(20,20,40,.32)'
      btnDownBg: P.BTN_DOWN_BG,         // 'rgba(255,200,60,.45)'
      btnDownBorder: P.BTN_DOWN_BORDER,  // '#ffd84a'
      fire: { label: 'FIRE', size: P.BTN_FIRE, border: P.FIRE_BORDER },   // 84px, red-orange accent
      jump: { label: 'JUMP\nBOOST', size: P.BTN_JUMP, border: P.BTN_BORDER }, // 62px
      spcl: { label: 'SPCL', size: P.BTN_SPCL, border: P.SPCL_BORDER },   // 62px, cyan accent
      stick: {
        base: P.STICK_BASE,   // 110px diameter
        knob: P.STICK_KNOB,   // 48px diameter
        baseBorder: '3px solid rgba(255,255,255,.35)',
        baseBg: 'rgba(20,20,40,.22)',
        knobBg: 'rgba(255,255,255,.45)',
        knobBorder: '2px solid rgba(255,255,255,.7)',
        hintBorder: '2px dashed rgba(255,255,255,.18)', // idle hint ring
      },
    },
    // Arcade pacing from the source's own pitch: 5 stages, 5 bosses, 55 seconds.
    // Short-burst runs: a full run is under a minute of chaos.
    pacing: { stages: P.STAGES, bosses: P.BOSSES, targetSeconds: P.TARGET_SECONDS },
  };
}

// Square-wave beep factory — the sticker games' entire sound palette.
export function makeStickerBeep() {
  let audio = null;
  return function beep(freq, dur, vol = 0.04) {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.frequency.value = freq;
      o.type = 'square';
      g.gain.value = vol;
      o.connect(g);
      g.connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + dur);
    } catch { /* ignore */ }
  };
}

// Portrait FOV compensation: widen FOV as aspect drops below 1.
export function portraitFov(camera, baseFov, maxFov) {
  const aspect = innerWidth / innerHeight;
  if (aspect >= 1) {
    if (camera.fov !== baseFov) { camera.fov = baseFov; camera.updateProjectionMatrix(); }
    return;
  }
  const fov = Math.min(maxFov,
    2 * Math.atan(Math.tan((baseFov / 2) * Math.PI / 180) / aspect) * 180 / Math.PI);
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

// --- iso-city: shared CRT overlay CSS (same treatment as the source shell) ----
export const CRT_CSS = `background:
  radial-gradient(120% 90% at 30% 18%, rgba(255,255,255,.10), rgba(255,255,255,.03) 35%, transparent 60%),
  radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.25) 100%),
  repeating-linear-gradient(to bottom, transparent 0 3px, rgba(0,0,0,.09) 3px 6px),
  repeating-linear-gradient(to right, rgba(255,40,40,.05) 0 1px, rgba(40,255,80,.05) 1px 2px, rgba(60,90,255,.05) 2px 3px);
box-shadow: inset 0 0 28px 8px rgba(0,0,0,.35), inset 0 0 10px 2px rgba(0,0,0,.3), inset 0 0 4px 1px rgba(0,0,0,.6);
border-radius: 6% / 9%;`;

// --- iso-city: true isometric camera ------------------------------------------
// Classic 2:1 dimetric: elevation atan(1/sqrt(2)) = 35.264 deg, azimuth 45 deg.
// angleDeg rotates the azimuth in 90-degree steps (Q/R in the source).
export function setupIsoCamera(camera, angleDeg = 0, target = [0, 0, 0], dist = 24) {
  const P = PALETTES['iso-city'];
  const elev = (P.ISO_ELEVATION * Math.PI) / 180;
  const azim = ((P.ISO_AZIMUTH + angleDeg) * Math.PI) / 180;
  camera.position.set(
    target[0] + dist * Math.cos(elev) * Math.cos(azim),
    target[1] + dist * Math.sin(elev),
    target[2] + dist * Math.cos(elev) * Math.sin(azim)
  );
  camera.lookAt(target[0], target[1], target[2]);
  camera.updateProjectionMatrix();
  return camera;
}

// Rotate the iso camera 90 degrees left (-1) or right (+1). Returns new angle.
export function rotateIsoCamera(camera, currentAngle, dir, target = [0, 0, 0], dist = 24) {
  const next = currentAngle + dir * 90;
  setupIsoCamera(camera, next, target, dist);
  return next;
}

// 2D entry point: Toad Street 32 visual standard for chunky 32-bit canvas games.
// No scene/camera/renderer — returns the pixel font, square HUD spec, segmented
// HP bar CSS, square touch-button spec, and palette. Call as:
//   const style = applyVisualStandard(null, null, null, 'toad-city');
//   // canvas: image-rendering: pixelated; HUD: border-radius 0, 3px black borders
export function applyToadCity2D(w, h, opts = {}) {
  const P = PALETTES['toad-city'];
  return {
    preset: 'toad-city', palette: P,
    // Render small, upscale chunky (source: #gl canvas with image-rendering: pixelated)
    imageRendering: P.IMAGE_RENDERING, // 'pixelated' — chunky crisp pixels, never smooth
    // Press Start 2P pixel font — the ONLY font in 32-bit mode
    font: P.FONT,
    // Chunky square HUD (source CSS — every box is square, never round)
    hud: {
      border: P.HUD_BORDER,       // '3px solid #000'
      shadow: P.HUD_SHADOW,       // '3px 3px 0 #000' — hard offset, no blur
      borderRadius: P.HUD_RADIUS, // 0 — square, never round
      textShadow: P.TEXT_SHADOW,  // '2px 2px 0 #000' — hard, never stroked
    },
    // Segmented HP bar (source: repeating-linear-gradient stripes + red lag bar)
    hpBar: {
      fill: P.HP_FILL, // repeating-linear-gradient(90deg, #9dd84a 0 6px, #6aa82a 6px 8px)
      lag: P.RED,      // '#c83a2a' — damage lag bar behind the fill
      height: 12,
      background: P.BAR_BG,
    },
    // Square touch buttons (source: .tb — border-radius: 0 !important)
    buttons: {
      A: { label: 'SWING', color: P.BTN_A, size: 82 },
      B: { label: 'JUMP', color: P.BTN_B, size: 60 },
      C: { label: 'ACT', color: P.BTN_C, size: 62, hot: P.BTN_C_HOT },
    },
    // Square joystick + knob (source: #stick / #knob — border-radius: 0)
    stick: { size: 124, knob: 54, knobColor: P.GOLD },
    // Optional CRT overlay (same as 16-bit)
    crt: { css: CRT_CSS },
  };
}
