# gamepress Visual Standards

The visual design bible. Extracted from Cherie's favorite-looking games:
**Shell Shock 3D** (TMNT 3D brawler — her #1), **Cel City** (Jet Set Radio cel-shaded bakeoff winner),
**HOA Warfare** (daytime suburban FPS), **Shell Shock Live** (2D painted TMNT brawler),
**Shell Shock 16-bit** (2D pixel-art TMNT brawler),
and **Roadkill Rig** (desert wasteland racer — warm toon + halftone + inverted-hull outlines).

Every gamepress game must look like it belongs in this family. These are rules, not suggestions.

---

## The Presets

`kit/gpstyle.js` implements all presets. One call:

```js
import { applyVisualStandard } from './kit/gpstyle.js';
applyVisualStandard(scene, camera, renderer, 'cel'); // 'cel' | 'shellshock' | 'hoa' | 'roadkill' | 'shellshock-live' | 'shellshock-16bit'
```

`shellshock-live` and `shellshock-16bit` are the **2D presets** — no Three.js scene needed:

```js
const style = applyVisualStandard(null, null, null, 'shellshock-live', { w: 960, h: 540 });
// or the pixel-art preset:
const style16 = applyVisualStandard(null, null, null, 'shellshock-16bit'); // 384x224 internal res
style.glow.boom(x, y, k); style.glow.spark(x, y, k, big, cyan); style.glow.draw(ctx);
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

Source: `brad-demos/g/wasteland-van/index.html` ("ROADKILL RIG — Hark Original", spiked war-van stunt racer × zombie horde survival, Three.js r160).

**Lighting rig**
```
HEMI  HemisphereLight('#ffe9cf', '#c9876a', 1.55)   (warm cream sky / dusty rose ground bounce)
SUN   DirectionalLight('#fff1d6', 2.1) at (-0.55, 1.35, 0.5) normalized
      castShadow: true, PCFShadowMap, 2048 (1024 on touch)
      ortho shadow camera ±34, near 1, far 220
      bias -0.0007, normalBias 0.05
```

**Fog + background**
```
FOG #f6c99a  linear, near 90, far 330
scene.background = same #f6c99a  (horizon melts into fog — no hard line)
```

**Sky dome** — custom shader sphere (r=800, BackSide, no fog):
```
top     #47a7e0   (warm blue)
horizon #ffd9a6   (peachy)
sun glow: tight specular lobe + wide warm halo around sun dir
uRed uniform: raise toward 1 for danger/boss tint
  → top mixes to rgb(0.42, 0.12, 0.16), horizon to rgb(1.0, 0.45, 0.28)
```
Use `makeSkyDome(PALETTES.roadkill)` — returns `{ mesh, uniforms }`; animate `uniforms.uRed.value`.

**Materials** — `MeshToonMaterial` with the same 3-band gradient `[0,0,0,0,120,120,255,255]` (NearestFilter) as cel, plus the halftone dot shader: 45°-rotated dot grid (`uDot = 5.0 × DPR`), dots darken the shadow band up to 32% with a cool-blue shift (`× vec3(0.84, 0.78, 1.08)`). Every toon material also carries `uFlash`/`uFlashC` uniforms — spike `uFlash` to 1 for hit flash. Use `makeToonMaterial()` (shared with cel).

**Outlines** — inverted hull, BackSide, pushed along per-vertex mitred normal (`odir` attribute = average of distinct face normals). Ink is `#1a0f12` (warmer/darker than cel's `#14101f`):
```
char/vehicle  0.0036
world         0.0030
prop          0.0032
```
Use `withOutline(mesh, kind)` or `outlineMaterial(width, '#1a0f12')` directly.

**Ground** — procedural vertex-colored desert (no texture). Paint per-vertex:
```
SAND  #ecb47c   base dunes
SAND2 #dc9a66   dune variation
FLAT  #f4cf98   cracked salt flats (patches where noise crosses threshold)
RUST  #bd6644   scorched zones
DEEP  #a4523b   deep scorch
BERM  #d98557   raised berm ring (lerp by radius 148→175)
```
Plus painted road: dashed hazard stripes `#fff2c8` along the track line.

**Vehicle/prop rust palette** (scrap, barrels, war-van armor):
```
#9c4b2e  #7d5a45  #b86b3c  #6f7d7a  #a3896a  #5d6b78
```

**Camera** — FOV 62, chase cam behind the vehicle.

**UI** — Impact / "Arial Black", ink `#1a0f12` 3–4px borders, hard offset shadows (`box-shadow: 0 3px 0 #1a0f12`), cream text `#fff4dc`:
```
YELLOW #ffcf2e  (accents, active states)
RED    #e8312a  (goals, danger)
PINK   #ff4fd8  (evolution cards)
GREEN  #7dffb0  (repair cards)
```
No floating un-stroked text, ever.

**When to use it:** desert/wasteland/outdoor vehicle games, warm golden-hour action. Not for night, not for cities (use shellshock), not for cute (use cel).

---

## PRESET 5: `shellshock-live` — Shell Shock Live (2D painted brawler)

For 2D canvas games. **Key insight: punchy exposure grade + additive glow lights on a dark base.** Everything pops because the backgrounds are hot (brightness 1.3) and every explosion, spark, and muzzle flash stamps a radial glow with `lighter` composite.

### Exposure grade (exact — CSS filters)
- Backgrounds: `brightness(1.3) contrast(1.05)` — applied to painted bg images
- Sprites: `brightness(1.28) contrast(1.08)` — applied to character/enemy sheets
- Expose via offscreen canvas, cache per-image (WeakMap), never re-filter per frame

### Additive glow lights (exact)
- Offscreen buffer at **1/4 resolution**, `globalCompositeOperation = 'lighter'`
- Radial gradient sprites (32×32), stamped at light positions, buffer drawn back over scene with `lighter` composite
- Light kinds (radius, color, alpha from source):
  - `boom`: r=70, `#ff9a2a`, 0.95 — explosions
  - `spark`: r=18 (big: 30), `#fff2c0` (cyan variant `#7fdcff`), 0.45–0.7 — hits
  - `muzzle`: r=36, `#ffb050`, 0.6 — gunfire
  - `ring`: r=50, `#fff0a0`, 0.5 — shockwaves
  - `clink`: r=16, `#bfe4ff`, 0.5 — metal hits
  - `neon`: r=70, `#ff7a1a`, 0.30 — static level glows (flicker animated)
- Max 48 lights per frame (16 on low-power mode)

### Bloom overlay (exact)
- `filter: blur(2px)`, `opacity: .35`, `mix-blend-mode: screen` — glow sources only

### Weather (exact)
- Rain: 70 drops, `rgba(170,190,255,0.35)`, 1px lines
- Snow: 60 flakes, `#eef4ff`, 1–2px squares

### Backgrounds
- Painted images, parallax-tiled horizontally, optional mirror flip per tile
- Fallback (no art): vertical gradient `#141428` → `#2a2a3a`, ground `#2e2a30`
- Optional color grade overlay (`S.grade`) on top

### Characters
- **Hand-painted sprite sheets** (webp) — NOT procedural. 4+ frame walk, attack frames
- White flash silhouette on hit: 5 frames
- Enemies: distinct silhouettes, color-coded by type

### Hit feedback (mandatory)
- White flash silhouette (5 frames)
- Screen shake on heavy hits
- Hit-stop: freeze on clash/kill
- Particle burst: 6–12 sprites, gravity, fade
- Every impact stamps a glow light (boom/spark) — light IS the juice

### Palette (exact)
```
BOOM       #ff9a2a  (explosions)
SPARK      #fff2c0  (hit sparks)
SPARK_CYAN #7fdcff  (cyan sparks)
MUZZLE     #ffb050  (gunfire)
RING       #fff0a0  (shockwaves)
CLINK      #bfe4ff  (metal hits)
NEON       #ff7a1a  (static level glows)
RAIN       rgba(170,190,255,0.35)
SNOW       #eef4ff
SKY_TOP    #141428
SKY_BOTTOM #2a2a3a
GROUND     #2e2a30
BG_EXPOSE  brightness(1.3) contrast(1.05)
SPRITE_EXPOSE brightness(1.28) contrast(1.08)
```

### 2D usage
```js
import { applyVisualStandard } from './kit/gpstyle.js';
const style = applyVisualStandard(null, null, null, 'shellshock-live', { w: 960, h: 540 });
// per frame: stamp lights, then composite
style.glow.boom(x, y, k);      // k = 0..1 progress
style.glow.spark(x, y, k, big, cyan);
style.glow.muzzle(x, y, k);
style.glow.draw(ctx);          // call after drawing sprites, before HUD
```

---

## PRESET 6: `shellshock-16bit` — Shell Shock 16-bit (2D pixel art)

For 2D pixel-art canvas games. **Key insight: authentic Genesis-era rendering — a tiny 384×224 internal canvas, chunky pixels, and a full CRT treatment on top.** The game never renders at display resolution; it renders small and lets the browser upscale with `image-rendering: pixelated`.

### Internal resolution (exact)
- Canvas element: **384 × 224** (Sega Genesis). Never change this.
- CSS: `image-rendering: pixelated` — chunky crisp pixels, never smoothed
- A second 384×224 canvas (`id="bloom"`) holds glow sources: `filter: blur(2px)`, `opacity: .35`, `mix-blend-mode: screen`

### CRT overlay (exact — a positioned `::after` element)
Four stacked layers, in this order:
1. **Glass highlight:** `radial-gradient(120% 90% at 30% 18%, rgba(255,255,255,.10), rgba(255,255,255,.03) 35%, transparent 60%)`
2. **Vignette:** `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.25) 100%)`
3. **Scanlines:** `repeating-linear-gradient(to bottom, transparent 0 3px, rgba(0,0,0,.09) 3px 6px)`
4. **Aperture grille:** `repeating-linear-gradient(to right, rgba(255,40,40,.05) 0 1px, rgba(40,255,80,.05) 1px 2px, rgba(60,90,255,.05) 2px 3px)`
- Plus: `box-shadow: inset 0 0 28px 8px rgba(0,0,0,.35), inset 0 0 10px 2px rgba(0,0,0,.3), inset 0 0 4px 1px rgba(0,0,0,.6)` and `border-radius: 6% / 9%` (barrel curvature)

### Skyline (exact — procedural, two parallax layers)
- **Far layer:** `#161a38`, baseline y=112, heights 30–80px, widths 18–40px
- **Near layer:** `#0a0b18`, baseline y=136, heights 20–70px; **lit windows** `#ffd27a`, 2×3px, on a 6×7px grid wherever the hash > 0.8
- Drawn as flat rects — no gradients on the buildings themselves

### Additive glow lights (same engine as shellshock-live)
- Offscreen buffer at 1/4 resolution, `globalCompositeOperation = 'lighter'`, gain 0.62
- Static neon level glows: `#ff7a1a`, r=70, alpha 0.30, flicker ±0.25
- Max 48 lights per frame; auto-degrade to 16 at 1/8 res, then off, on low-power devices

### Hit feedback (exact)
- **Screen shake** scaled by hit strength (max ~6px at 384×224 scale)
- **Zoom punch:** scale 1.03× on big events
- Camera shake toggleable: `?shake=off` / localStorage `ssla_shake`

### Palette (exact — most-used colors from source)
```
YELLOW     #ffe060  (highlights, UI)
YELLOW_WM  #ffd27a  (warm yellow, lit windows)
RED        #e8302a  (damage, danger)
RED_HOT    #ff4a3a  (hot red)
ORANGE     #ff8c1a  (fire, neon)
GREEN      #7fd85a  (turtle green)
GREEN_DK   #3fae3a  (dark green)
CYAN       #7fdcff  (cyan sparks)
GREY       #c8ccd6  (concrete, steel)
GREY_DK    #9aa3ad
INK        #05040a  (near-black backgrounds)
INK_BLUE   #10101c
PURPLE_DK  #1a0e2c  (night purple)
BROWN      #8a5a2a  (wood, dirt)
```

### 2D usage
```js
import { applyVisualStandard } from './kit/gpstyle.js';
const style = applyVisualStandard(null, null, null, 'shellshock-16bit');
// canvas: <canvas id="game" width="384" height="224"> with image-rendering: pixelated
// overlay: apply style.crt.css to a ::after element on the screen wrapper
// skyline: style.skyline.far / .near / .window drive procedural building drawing
// per frame: style.glow.boom(x, y, k); ... style.glow.draw(ctx);
style.glow.neon(x, y, r, flicker);  // static level glows
```

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
