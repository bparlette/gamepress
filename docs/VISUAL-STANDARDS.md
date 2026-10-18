# gamepress Visual Standards

The visual design bible. Extracted from Cherie's three favorite-looking games:
**Shell Shock 3D** (TMNT 3D brawler — her #1), **Cel City** (Jet Set Radio cel-shaded bakeoff winner),
and **Roadkill Rig** (pending — could not locate source; send Cherie's link to add it).

Every gamepress game must look like it belongs in this family. These are rules, not suggestions.

---

## The Three Presets

`kit/gpstyle.js` implements all three. One call:

```js
import { applyVisualStandard } from './kit/gpstyle.js';
applyVisualStandard(scene, camera, renderer, 'cel'); // 'cel' | 'shellshock' | 'roadkill'
```

---

## PRESET 1: `cel` — Cel City (Jet Set Radio style)

The default for stylized 3D games. Bold outlines, flat toon bands, comic halftone shadows.

### Lighting rig (exact)
- `HemisphereLight('#dfe6ff', '#ffd9c9', 1.7)` — cool sky, warm peach ground bounce
- `DirectionalLight('#fff3dc', 1.8)` — warm sun, position high at an angle
- No shadows needed — the toon bands + outlines carry the depth

### Materials
- `MeshToonMaterial` with a **3-band gradientMap**: `[0, 0, 0, 0, 120, 120, 255, 255]` as a DataTexture with NearestFilter. This gives exactly 3 bands: unlit, mid, lit. Never use smooth gradients.
- Shadow areas get **screen-space halftone dots** (comic book dots) via onBeforeCompile shader injection. Dot size: 5px × devicePixelRatio.
- All colors as `vertexColors: true` — paint color into geometry, not materials.

### Outlines (inverted hull — mandatory)
- Render a second copy of every mesh with `side: THREE.BackSide`, pushed outward along per-vertex averaged normals.
- Widths (world units, scaled by distance clamped 2.5–36):
  - Characters: `0.0042`
  - City/buildings: `0.0034`
  - Props: `0.0030`
- Outline color: `#14101f` (near-black purple). Never pure black.

### Ink color
- `#14101f` is THE ink. Every stroke, every text outline, every UI border uses it.

### Camera
- FOV 62 (widen to 84 in portrait via aspect compensation)
- Chase: pitch 0.36 rad, distance 6.6, pivot at character + (0, 1.5, 0)
- Screen shake: decay shake² × 0.25 per frame on hits

### Fog & sky
- `THREE.Fog('#ffc2d4', 75, 210)` — pink fog, never grey
- Sky: big background sphere/plane, warm sunset gradient, visible sun disc sprite

### Character construction
- Build from primitives: spheres (0.2–0.4 radius for head/torso), capsules for limbs, boxes for accessories
- Proportions: big head (0.27 radius), chunky torso, short limbs — chibi-adjacent, NOT realistic
- Every part gets an outline mesh
- Distinct silhouette per character: bandana tails, mohawk, beanie, shell rim — readable at 20px tall

### Environment
- Ground: flat color planes with painted canvas textures (road markings, sidewalk seams)
- Buildings: boxes with canvas-painted windows/signs, ink borders on every texture edge
- Background: layered silhouette skyline sprites, parallax

### UI/HUD
- Font: `Impact, "Arial Black", sans-serif` — always italic for numbers/banners
- Text: `-webkit-text-stroke: 1-2px #14101f` + `text-shadow: 3px 3px 0 #14101f` (hard offset, no blur)
- Buttons: 3px ink border, `box-shadow: 3px 3px 0 #14101f`, press = translate(2px,2px) + shadow shrinks to 1px
- HP bars: skewed (`transform: skewX(-14deg)`), ink border, lag bar (pink #ff3d6e) behind fill (green gradient #9dff6b→#3fd13a)
- Accent yellow: `#ffd23c` for names, highlights, primary buttons
- Accent pink: `#ff5fa2` for attack buttons, KO counters
- Accent cyan: `#2fd3ff` for secondary buttons

### Palette (exact hex)
```
INK      #14101f  (outlines, text stroke, UI borders)
YELLOW   #ffd23c  (names, highlights, primary)
PINK     #ff5fa2  (attack, KO, banners)
CYAN     #2fd3ff  (secondary, jump)
GREEN    #5ccf3a  (hero skin, HP fill)
GREEN_DK #49b52c  (shading)
BLUE     #1f7bff  (bands, details)
CREAM    #fff0d6  (wraps, bandages)
FOG      #ffc2d4  (fog color)
SKY_TOP  #dfe6ff  (hemisphere sky)
SKY_BOT  #ffd9c9  (hemisphere ground)
SUN      #fff3dc  (directional)
```

---

## PRESET 2: `shellshock` — Shell Shock 3D (night city brawler)

For gritty urban games. **Key insight: characters are hand-painted 2D sprite billboards in a 3D world** (HD-2D approach). The 3D world is Lambert-shaded; the characters are painted art.

### Lighting rig (exact)
- `HemisphereLight(0x8a8ac8, 0x3a2a30, 1.25)` — cool blue-violet sky, warm dark ground
- `DirectionalLight(0x9fb0ff, 0.7)` — moonlight, position (-40, 80, 60)
- 6 `PointLight(0xffffff, 0, 10, 1.6)` — street lamps, intensity animated per-frame
- Scene: "Big Apple, 3 A.M." — everything is night

### Materials
- `MeshLambertMaterial` with **procedural canvas textures** (painted brick, asphalt grain, neon signs)
- `vertexColors: true` everywhere
- Emissive for anything that glows: windows, lamps, neon (`emissive` + `MeshBasicMaterial` for pure glow)
- Sky: textured plane (`skyT`), `MeshBasicMaterial`, `fog: false`, `depthWrite: false`, repeat 3×

### Fog
- `THREE.FogExp2(0x1a1426, 0.0085)` — dark purple exponential fog
- Zone variants: sewer `0x0c160c`, subway `0x0b0c0e`, interior `0x141410`

### Camera
- FOV 52 (portrait: widen up to 118 via aspect compensation)
- Side-scrolling brawler: camera follows player X with smoothing, slight look-ahead
- FOV kick on special moves + speed lines

### Characters
- **Painted sprite atlases** (webp), billboarded to face camera
- Hero: 4-frame walk, attack frames, climb frames — hand-drawn, NOT procedural
- Enemies: distinct silhouettes, color-coded by type
- White flash on hit: `e.flash = 5` frames, sprite drawn with brightness filter
- If you can't paint sprites: use the `cel` preset instead. Bad 3D models look worse than good sprites.

### Hit feedback (mandatory)
- White flash on the hit sprite (5 frames)
- Screen shake on heavy hits
- Hit-stop: freeze 4 frames on clash, 8 on kill
- Particle burst: 6-12 sprites, gravity, fade

### Post-processing
- CRT overlay in cabinet mode: scanlines (`repeating-linear-gradient`), RGB separation (1px offset color fringes), vignette (`radial-gradient` dark edges), screen curvature glow
- Bloom canvas: `filter: blur(2px)`, `opacity: .35`, `mix-blend-mode: screen` — only for glow sources

### Palette (exact hex)
```
FOG      0x1a1426  (street fog)
MOON     0x9fb0ff  (moonlight)
HEMI_SKY 0x8a8ac8
HEMI_GND 0x3a2a30
LAMP     0xffe0a0  (lamp glow)
DUSK_1   0xa8c0dc  (sky lerp target)
DUSK_2   0xd8906a  (dusk warmth)
ASPHALT  0x3a3a42
DARK     0x1e2026
```

---

## PRESET 3: `hoa` — HOA Warfare (daytime suburban FPS)

For bright daytime games. Clean Lambert shading, REAL shadow mapping, chunky boxy characters with faction-readable details.

### Lighting rig (exact)
- `HemisphereLight('#dff4ff', '#6a8d4a', 1.8)` — bright sky blue, grass-green ground bounce
- `DirectionalLight('#fff3d6', 2.1)` — warm sun at (30, 50, 20), **castShadow: true**
- Shadow camera: ortho 110×110 (±55), near 1, far 140, bias -0.0015, mapSize from quality setting
- Muzzle-flash `PointLight('#ffec27', 0, 15)` attached to camera, intensity spiked on shot

### Materials
- `MeshLambertMaterial` everywhere — no toon, no standard
- **Procedural canvas textures**: grass (tiled 60×60), shirt patterns per faction, face textures per faction+skin tone
- `castShadow = true` on characters and props, `receiveShadow = true` on ground

### Fog & sky
- `THREE.Fog('#a8dcff', 55, 130)` — light blue, NOT grey
- Background: `#5ec4ff` bright sky blue
- Horizon: cheap flat-colored houses beyond the fence so it's never empty

### Camera
- FOV 75 (FPS), portrait widening up to 98 via aspect compensation
- Camera-attached muzzle light for gunfire illumination

### Character construction
- Chunky boxy proportions, total height ~1.8 units:
  - Head: 0.38×0.40×0.38 box at y=1.62, face texture on front (+Z)
  - Torso: 0.56×0.62×0.30 box
  - Legs: 0.20×0.72×0.24 boxes, hips at ±0.13
  - Shoes: 0.22×0.10×0.30 + sphere toe caps
- **Faction readability**: distinct face textures, hats/headwear per faction, team sashes (0.58×0.08×0.32), armbands
- Skin tones: varied palette, hashed from seed

### Post-processing (retro mode)
- Render to low-res target → Bayer dither → quantize to **PICO-8 32-color palette**
- Dither amount: 0.09
- Toggleable: modern (full-res) vs retro (16-bit look)

### Performance
- Adaptive resolution: drop 15% after 1.5s over frame budget, recover 10% after 4s under
- Pixel ratio capped, shadows scale with quality setting

### Palette (exact hex)
```
SKY      #5ec4ff  (background)
FOG      #a8dcff  (fog)
HEMI_SKY #dff4ff
HEMI_GND #6a8d4a  (grass bounce)
SUN      #fff3d6
MUZZLE   #ffec27  (muzzle flash)
```
Plus the PICO-8 32-color palette for retro mode (see `PALETTE` in render.js).

---

## PRESET 4: `roadkill` — Roadkill Rig

**STATUS: source not found.** Searched `~/workspace`, memory, and the web — no match for a game by this name in Cherie's collection. The preset slot exists in `gpstyle.js` but falls back to `cel` until the source is studied.

**Action for parent:** ask Cherie for the link. Once provided, study it and fill in this section.

---

## Universal Rules (all presets)

1. **Never pure black outlines.** Use `#14101f` (cel) or dark purple-grey (shellshock).
2. **Never grey fog.** Fog is always a color: pink, purple, warm.
3. **Characters must read at 20px tall.** If you can't tell what it is as a thumbnail, the silhouette is wrong.
4. **Hit feedback is non-negotiable:** white flash + shake + particles on every hit. No exceptions.
5. **UI text always has ink stroke + hard shadow.** No floating un-outlined text.
6. **Portrait FOV compensation:** widen FOV as aspect drops below 1, so the action stays framed on phones.
7. **Tone mapping:** `ACESFilmicToneMapping`, exposure 1.1.
8. **Max pixel ratio:** 2. Never render at 3× DPR on mobile.
9. **Touch controls:** always `gptouch.js` (floating joystick left, round buttons right).
10. **Spectate mode:** always `?spectate=1` + `?autostart=1` + `?seed=N` (see SPECTATE.md).

## What NOT to do

- No `MeshStandardMaterial` with default grey — everything gets explicit color
- No realistic proportions on stylized games — big heads, chunky bodies
- No smooth gradient shading on toon games — 3 bands, hard steps
- No tiny UI text — minimum 14px on mobile, always stroked
- No silent hits — every impact gets flash + shake + sound
- No untextured grey boxes — every surface gets color or a painted texture
