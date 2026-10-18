# gamepress Visual Standards

The visual design bible. Extracted from Cherie's favorite-looking games:
**Shell Shock 3D** (TMNT 3D brawler — her #1), **Cel City** (Jet Set Radio cel-shaded bakeoff winner),
**HOA Warfare** (daytime suburban FPS), **Shell Shock Live** (2D painted TMNT brawler),
**Shell Shock 16-bit** (2D pixel-art TMNT brawler), **Roadkill Rig** (desert wasteland racer — warm toon + halftone + inverted-hull outlines),
**ISO City** (Hades-style painted isometric), **Toad City** (chunky 32-bit), **Crystal Cave** (2.5D dark cave + emissive crystals),
**Blox Fruits** (tropical anime archipelago), and **Poly Track** (low-poly browser racer — flat-shaded facets, NO outlines).
**Blox Fruits** (tropical anime archipelago — saturated sky/ocean + fruit-power particles + chunky UI),
and **Crystal Cave** (2.5D side-scroller — dark cave + emissive crystals + bloom glow),
**Blox Fruits** (tropical anime), **ISO City** (Hades-style isometric), **Toad City** (chunky 32-bit),
**Gulf Thunder** (portrait pixel-art naval), **Poly Track** (flat-shaded low-poly),
and the **Notebook Arcade** sticker series (`sticker-retro` daylight / `sticker-night` dark / `sticker-warm` vintage).

Every gamepress game must look like it belongs in this family. These are rules, not suggestions.

---

## The Presets

`kit/gpstyle.js` implements all presets. One call:

```js
import { applyVisualStandard } from './kit/gpstyle.js';
applyVisualStandard(scene, camera, renderer, 'cel'); // 'cel' | 'shellshock' | 'hoa' | 'roadkill' | 'shellshock-live' | 'shellshock-16bit' | 'crystal-cave' | 'blox-fruits' | 'poly-track'
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

## PRESET 7: `crystal-cave` — Crystal Cave (2.5D side-scroller)

Source: `brad-demos-staging/g/crystal-cave/index.html` ("A tiny 2.5D side-scroller vertical slice:
flat 2D tile physics inside a lit, bloom-glowing 3D crystal cave"). For dark underground/cave games.
Crystals carry the light — there is no sun.

### Lighting rig (exact)
- `HemisphereLight('#1a2b55', '#05070f', 0.5)` — faint blue ambient only
- **No directional light.** Cave has no sun.
- 8 `PointLight`s (default, `opts.lights` to change) — alternating `#7ff0ff` cyan / `#ff8ae8` pink,
  intensity 2, distance 18, decay 2. Caller positions each at a crystal cluster.
- Crystals are emissive: `MeshStandardMaterial` with `emissive: crystal color`, `emissiveIntensity: 2.5`,
  `flatShading: true`, roughness 0.25

### Bloom (mandatory)
No post-processing lib — the preset fakes bloom with **additive halo sprites**:
- `makeGlowSprite3D(color, size, opacity)` — `THREE.Sprite` with radial-gradient canvas texture,
  `AdditiveBlending`, `depthWrite: false`. Stamp one at every crystal cluster, coin, and muzzle.
- `makeCrystal(size, color, opts)` — 3–5 elongated octahedron shards (flat-shaded, emissive)
  around a base point + halo sprite at cluster center. `opts.rng` for deterministic placement.
- Cyan `#7ff0ff` and pink `#ff8ae8` crystals alternate. Gold coins get `#ffb020` halos.

### Fog & background
- `THREE.FogExp2('#030816', 0.028)` — dense dark blue; cave fades to the background color
- Background: `#030816` (near-black blue, NOT pure black)

### Camera
- FOV 60, side-on for 2.5D framing

### Cave rock
- `rockMaterial()` — `MeshLambertMaterial('#0d1526')`, roughness 1. Every rock surface gets explicit color.

### UI/HUD (exact CSS from source)
- Font: `ui-rounded,"SF Pro Rounded",system-ui` — rounded, friendly
- Pills: `rgba(6,14,40,.55)` bg, `1px solid rgba(120,220,255,.35)`, radius 999px, `blur(4px)`,
  text-shadow `0 2px 0 #0a1230, 0 0 10px rgba(80,200,255,.5)`
- Title gradient text: `linear-gradient(90deg,#7ff0ff,#ff8ae8)` with `background-clip:text`
- Primary button: `linear-gradient(90deg,#38e8ff,#ff5ad8)`, text `#06112c`, radius 999px
- Touch buttons: 68px circles (80px for primary), `2px solid rgba(140,230,255,.55)`,
  bg `rgba(10,30,70,.45)`, inset glow `0 0 16px rgba(60,200,255,.25)`
- Hearts: `#ff4f8b` with `drop-shadow(0 0 4px #ff4f8b)`
- Coins: `radial-gradient(circle at 35% 35%,#fff3b0,#ffc93a 55%,#c47d12)` + `box-shadow: 0 0 8px #ffb020`
- All values in `crystalHUD` export — inject into a `<style>` tag or use the strings directly.

### Usage
```js
import { applyVisualStandard, makeCrystal, crystalHUD } from './kit/gpstyle.js';
const style = applyVisualStandard(scene, camera, renderer, 'crystal-cave', { lights: 10 });
// place a crystal cluster and park a light on it:
const cluster = makeCrystal(1.2, style.palette.CYAN, { rng: seededRand });
cluster.position.set(4, 0, -6);
scene.add(cluster);
style.crystalLights[0].position.set(4, 1.5, -6);
```

### Palette (exact hex)
```
BG       #030816  (background / fog — near-black blue)
TEXT     #eaf6ff  (pale ice)
CYAN     #7ff0ff  (crystal cyan)
CYAN_DK  #38e8ff  (action cyan)
PINK     #ff8ae8  (crystal magenta)
PINK_DK  #ff5ad8  (action magenta)
HEART    #ff4f8b
GOLD_LT  #fff3b0
GOLD     #ffc93a
GOLD_DK  #c47d12
HEMI_SKY #1a2b55
HEMI_GND #05070f
ROCK     #0d1526
BTN_TEXT #06112c
```

---

## PRESET 8: `blox-fruits` — Blox Fruits (tropical anime archipelago)

For bright anime adventure games. **Key insight: saturation IS the style.** Tropical noon lighting, cyan ocean, saturated grass, and combat that reads through massive fruit-power particle bursts — not through detail.

### Lighting rig (exact)
- `HemisphereLight('#8fd4ff', '#f2d8a0', 2.0)` — bright sky-blue top, warm sand bounce. Brighter than every other preset on purpose.
- `DirectionalLight('#fff8e8', 2.3)` — tropical noon sun at (40, 90, 25), **castShadow: true**
- Shadow camera: ortho 120×120 (±60), near 1, far 220, bias -0.001, mapSize 2048 (1024 on touch)
- Tone mapping stays ACES exposure 1.1 — the brightness comes from light intensity, not exposure

### Materials
- `MeshLambertMaterial` everywhere — flat readable anime shading, no PBR
- Characters: rounded shapes (spheres, capsules), bright clothing, simple faces
- No outlines — Blox Fruits characters are clean un-outlined 3D

### Fog & sky
- `THREE.Fog('#bfe4ff', 90, 320)` — clear tropical air, light blue, never grey
- Background: `#5fb8ff` bright sky blue
- Sky dome option: `makeSkyDome(PALETTES['blox-fruits'])` — top `#2a90ff`, horizon `#cfeaff`
- Day/night cycle support: dusk (`#2a1a5e` → `#ff9a5a`), night (`#060a24` → `#1a2a55`) — lerp the dome uniforms

### Environment (tropical island kit)
- Ocean: big plane, `#2ad4e8` Lambert, deep zones `#1a9fc4`, white foam `#ffffff` ring at shore
- Sand: `#f2d9a0`; grass: `#3fd13a` saturated (shadow `#2fae3a`)
- Palms: trunk `#8a5a2a`, fronds `#2fae3a`; docks/boats `#a06a35`; cliffs `#9aa3ad`
- Islands read as: sand ring → grass interior → palm clusters → a landmark (volcano, fort, giant tree)

### Combat particles (mandatory — this IS the Blox Fruits look)
Use `makeBloxParticles(scene)`:
- `burst(pos, fruit)` — white flash core + 10 flying sparks in the fruit's signature color
- `ring(pos, fruit)` — expanding shockwave ring, fades over 0.45s
- `ember(pos, fruit)` — rising aura wisps (charging a power, haki aura)
- `haki(pos)` — dark core + red crackle rising around a fighter
- Fruit signature colors: flame `#ff6a1a`, light `#ffe93c`, magma `#ff4400`, ice `#7fdcff`, dark `#7a1aff`, rumble `#2a9fff`, dragon `#2aff7a`
- Every hit stamps a burst + ring. No silent hits — particles are the damage feedback.

### Camera
- FOV 70 (Roblox-style wide default), portrait compensation applies
- Third-person follow, slight top-down tilt — adventure framing, not cinematic

### UI/HUD (chunky — use `bloxHUD` CSS)
- Font: system-ui stack, weight 900 for numbers
- Bars: 18px tall, 9px radius, **3px white border**, hard offset shadow `0 2px 0 rgba(16,24,40,.45)`
  - HP fill: green gradient `#6bf06b → #3fd13a → #2fae3a`
  - Energy fill: blue gradient `#6bc8ff → #2a9fff → #1f7bff`
  - XP fill: yellow gradient `#ffe97a → #ffd23c → #e8a81a`
- Ability buttons: 64px rounded squares (14px radius), dark translucent bg, white 3px border, big key label (Z/X/C/V/F)
- Damage numbers: 26px, `#ffd23c`, 1.5px `#101828` stroke + hard shadow; crits 34px `#ff7a1a`
- Quest tracker: dark translucent panel `rgba(10,14,26,.72)`, white 3px border, 12px radius; objective text yellow `#ffd23c`
- Compass strip at top center (dark pill, white border)
- Ink is `#101828` (dark navy) — never pure black

### Palette (exact hex)
```
SKY      #5fb8ff  (background)
FOG      #bfe4ff  (fog)
HEMI_SKY #8fd4ff
HEMI_GND #f2d8a0  (sand bounce)
SUN      #fff8e8
SKY_TOP  #2a90ff  (dome top)
SKY_HOR  #cfeaff  (dome horizon)
OCEAN    #2ad4e8
OCEAN_DK #1a9fc4
FOAM     #ffffff
SAND     #f2d9a0
GRASS    #3fd13a
GRASS_DK #2fae3a
PALM_TRK #8a5a2a
PALM_LEF #2fae3a
WOOD     #a06a35
STONE    #9aa3ad
FLAME    #ff6a1a
FLAME_HOT #ff2a00
LIGHT    #ffe93c
MAGMA    #ff4400
ICE      #7fdcff
DARK     #7a1aff
RUMBLE   #2a9fff
DRAGON   #2aff7a
HAKI     #1a0a14
HAKI_RED #ff2a2a
HP       #3fd13a
ENERGY   #2a9fff
XP       #ffd23c
DMG      #ffd23c
CRIT     #ff7a1a
INK      #101828  (UI text outline)
```

### 3D usage
```js
import { applyVisualStandard } from './kit/gpstyle.js';
const style = applyVisualStandard(scene, camera, renderer, 'blox-fruits');
const fx = style.makeBloxParticles(scene);
fx.burst(hitPos, 'flame');   // per frame: fx.update(dt)
fx.ring(hitPos, 'light');
```

### When to use it
Bright anime adventure, tropical islands, power-fantasy combat with big readable effects. Not for night (use shellshock), not for desert (use roadkill), not for cute-chibi (use cel).

---

## PRESET 9: `iso-city` — ISO City (Hades-style painted isometric)

For painterly isometric action games. **Key insight: hand-painted 2D sprite characters standing in a low-poly 3D world, viewed from a rotatable isometric camera with a CRT on top.** The 3D world is Lambert-shaded and simple; all the artistry is in the painted sprites.

Source: `brad-demos/g/bakeoff-h-iso/index.html` ("H: Iso City" — Hades-style painted isometric bakeoff).

### Isometric camera (exact)
- Classic 2:1 dimetric: **elevation 35.264°** (atan(1/√2)), **azimuth 45°**
- Camera looks at the action from that fixed angle — never orbits freely
- **Rotatable in 90° steps**: Q/R keys (source also has on-screen ◀ ▶ buttons)
- Use `setupIsoCamera(camera, angleDeg, target, dist)` — `rotateIsoCamera(camera, angle, dir)` steps ±90°
- Distance ~24 world units for character-scale scenes

### Lighting rig (exact)
- `HemisphereLight('#8a7ab8', '#3a2a1e', 1.1)` — cool violet sky, warm dark ground
- `DirectionalLight('#ffd9a0', 1.6)` — warm torchlight key, position (40, 60, 20)
- `DirectionalLight('#6a8aff', 0.9)` — cool underworld-blue rim, position (-50, 30, -40)
- `THREE.Fog('#2a1a2e', 40, 120)` — dark purple fog, never grey

### Characters (painted sprites — mandatory)
- Characters are **hand-painted 2D sprite atlases** (source: `atlas_lenny.webp` etc. — one atlas per character), NOT 3D models
- Sprites billboard in the 3D world (`THREE.SpriteMaterial` with painted canvas texture)
- Paint style: Hades — rich saturated colors, visible brush strokes, dramatic rim light painted into the sprite
- Use `canvasTexture(w, h, draw)` to paint sprites procedurally when no artist atlas exists

### World
- Low-poly 3D geometry with `MeshLambertMaterial` + painted canvas textures
- Keep geometry simple — the sprites carry the detail, not the meshes

### Post-processing
- **CRT overlay** (same as 16-bit): scanlines + RGB grille + vignette + barrel curvature — `style.crt.css`
- **Bloom canvas**: second canvas, `filter: blur(2px)`, `opacity: .35`, `mix-blend-mode: screen`
- Internal render: **384 × 224**, `image-rendering: pixelated`

### Palette (exact hex)
```
INK      #0d0a14  (deep near-black purple, outlines)
GOLD     #ffd23c  (divine accents, highlights)
BLOOD    #c8323c  (Hades red, danger)
STYX     #1a2a3a  (dark teal-blue, depths)
EMBER    #ff7a1a  (torchlight orange)
BONE     #e8dcc8  (marble white, architecture)
LAUREL   #5ccf3a  (green accents)
FOG      #2a1a2e  (dark purple fog)
BG       #07070a  (canvas background)
```

### 3D usage
```js
import { applyVisualStandard } from './kit/gpstyle.js';
const style = applyVisualStandard(scene, camera, renderer, 'iso-city');
// rotate on Q/R: style.angle = style.rotateIsoCamera(camera, style.angle, dir);
```

### When to use it
Painterly action games, dungeon crawlers, tactics — anywhere the Hades look fits. Not for cute (use cel), not for realistic (use hoa).

---

## PRESET 10: `toad-city` — Toad Street 32 (chunky 32-bit Mario-style)

For chunky pixel-charm 3D games. **Key insight: render the 3D world small, upscale with `image-rendering: pixelated`, and put a chunky SQUARE HUD on top — border-radius: 0 everywhere, 3px black borders, hard offset shadows, Press Start 2P font.** Everything is square. Nothing is round.

Source: `brad-demos/g/toad-street-32/index.html` ("K · Toad Street 32" — 32-bit mode is the default Cherie likes).

### Pixel presentation (exact)
- 3D canvas fullscreen with `image-rendering: pixelated` — chunky crisp pixels, never smoothed
- 32-bit mode is the look; HD mode (`image-rendering: auto`) exists but is NOT the standard

### Chunky square HUD (exact — source CSS)
- **border-radius: 0 on EVERYTHING** — boxes, buttons, bars, face icons, joystick. Square, never round.
- Borders: `3px solid #000` — pure black, not cel's purple ink
- Shadows: `box-shadow: 3px 3px 0 #000` — hard offset, no blur
- Text: Press Start 2P (`'PX', 'Courier New', monospace`), `text-shadow: 2px 2px 0 #000` — hard shadow, never stroked
- Buttons press: `transform: translate(2px,2px)` + shadow shrinks to `1px 1px 0 #000`

### Segmented HP bar (exact)
- Fill: `repeating-linear-gradient(90deg, #9dd84a 0 6px, #6aa82a 6px 8px)` — visible stripes
- Lag bar behind: `#c83a2a` (red), transitions down over 0.5s
- Height 12px, `border: 2px solid #000`, NO skew (32-bit is square, unlike cel's skewed bars)

### Touch buttons (exact)
- Square buttons, 3px black borders, hard shadows:
  - A (SWING): 82px, `#c87a3a`
  - B (JUMP): 60px, `#6a9ac8`
  - C (ACT): 62px, `#e8e0c8` (hot: `#ffe08a`)
- Square joystick: 124px box, 54px `#ffe08a` knob, 3px black border

### Palette (exact hex)
```
INK      #000     (pure black borders — 32-bit uses black, not purple)
GOLD     #ffe08a  (names, highlights, knob)
RED      #c83a2a  (damage, HP lag)
RED_DK   #a02a2a  (dark red, title shadow)
GREEN    #9dd84a  (HP fill light stripe)
GREEN_DK #6aa82a  (HP fill dark stripe)
PINK     #f0b0d8  (partner)
PINK_DK  #e0379b  (partner dark)
BTN_A    #c87a3a  (SWING)
BTN_B    #6a9ac8  (JUMP)
BTN_C    #e8e0c8  (ACT)
BG       #0b0f17  (page background)
BAR_BG   #1a1010  (HP bar background)
```

### 2D usage
```js
import { applyVisualStandard } from './kit/gpstyle.js';
const style = applyVisualStandard(null, null, null, 'toad-city');
// canvas: image-rendering: pixelated
// HUD: style.hud.border / .shadow / .borderRadius / .textShadow
// HP: style.hpBar.fill (striped) / .lag / .height
// buttons: style.buttons.A / .B / .C (label, color, size)
```

### When to use it
Mario-style platformers, kart racers, party games — chunky cheerful 3D. Not for gritty (use shellshock), not for painterly (use iso-city).

---

## PRESET: `poly-track` — Poly Track (low-poly browser racer)

Source: PolyTrack by Kodub (Unity WebGL browser racer). For bright, clean 3D games.
**The defining trait: flat-shaded low-poly facets. NO outlines, NO toon bands, NO halftone.**
Everything is evenly, brightly lit; the horizon melts into a pale blue sky.

### Lighting rig (exact)
- `HemisphereLight('#a8d4f0', '#9fd8a8', 1.35)` — bright sky-blue bounce, light grass-green ground bounce
- `DirectionalLight('#fff5e0', 1.6)` — warm white high sun at (60, 90, 30), **castShadow: true**
- Shadow camera: ortho ±60, near 1, far 400, bias -0.0005, `PCFSoftShadowMap`, mapSize 1024
- No harsh contrast — PolyTrack never crushes blacks

### Materials (the whole look)
- `makeFlatMaterial(color)` → `MeshStandardMaterial` with `flatShading: true`, roughness 0.95, metalness 0
- **Use for EVERYTHING**: terrain, track, props, vehicles. Never smooth-shade.
- `facetJitter(geometry, amount)` — per-face value variation (0.94–1.06) on non-indexed
  geometry so flat surfaces show subtle facet breakup like PolyTrack's terrain.
  Paint into `geometry.attributes.color`; materials read `vertexColors: true` when jittered.

### Sky
- Gradient dome via `makeSkyDome(P)`: top `#5da9e8` → horizon `#bfe0f2`, sun glow `#fffbe8`
  (tight specular lobe + wide warm halo around sun dir). Colors sampled from screenshots.
- `scene.background` = `#cfe4f2` (same as fog — no hard horizon line)

### Fog
- `THREE.Fog('#cfe4f2', 120, 450)` — light blue-white linear fog. **Never grey fog**
  (rule #2), and here it must be PALE — the world fades into sky, not darkness.

### Camera
- FOV 60 (chase-cam framing behind the vehicle); portrait compensation via `portraitFov`

### Track construction
- Road ribbon: flat `TRACK #7a8b9d` surface (sampled — consistent across screenshots)
- Edges: thick near-black curbs `TRACK_EDGE #16181c` — the black border IS the read
- Dashes/start line: `TRACK_DASH #f2f2f2`
- `style.track` returns `{ surface, edge, dash }`

### Terrain & props
- Ground: flat planes, single colors with facet jitter — `GRASS #5fbf77` / `SAND #f3cd83`
- Mountains: simple geometric cones/prisms — `MOUNTAIN #c99a5e`, darker facet `#a87f4c`
- Trees: cylinder trunk `#8a5a2a` + cone/sphere canopy `#4fae5c` — nothing fancier
- `style.terrain` / `style.props` / `style.cars` return the color groups

### Vehicles
- Low-poly wedge bodies in bold single colors: `CAR_RED #e63b2e`, `CAR_BLUE #2e7de6`,
  `CAR_PURPLE #7b3fe4` (sampled hero car), `CAR_WHITE #f2f2f2`
- Tires: chunky black `#1a1a1a` cylinders — always darker than the body

### UI (minimal)
- Dark translucent boxes: `background: rgba(16,18,30,0.88)`, white text, NO borders
- Numbers: monospace (`Roboto Mono, SF Mono, Menlo`) — timer, speed, delta
- Ahead-of-record delta: green `#4ade80`; behind: amber `#ffb020`
- `style.ui` returns `{ panel, text, green, amber, font }`
- No Impact, no ink strokes, no hard shadows — this preset breaks universal rules 5's
  spirit deliberately: PolyTrack's UI is quiet so the track reads.

### Palette (sampled from screenshots)
```
SKY_TOP    #5da9e8  (gradient dome top; sampled #6290ba / #42a5fa)
SKY_HORIZON #bfe0f2 (dome horizon; sampled #9cc5da)
SUN_GLOW   #fffbe8  (sun disc + halo)
FOG        #cfe4f2  (fog + background)
HEMI_SKY   #a8d4f0
HEMI_GND   #9fd8a8
SUN        #fff5e0
TRACK      #7a8b9d  (road surface)
TRACK_EDGE #16181c  (curbs)
TRACK_DASH #f2f2f2
GRASS      #5fbf77
GRASS_DK   #4aa862
SAND       #f3cd83
SAND_DK    #e0b96e
MOUNTAIN   #c99a5e
MOUNTAIN_DK #a87f4c
TREE_TRUNK #8a5a2a
TREE_LEAF  #4fae5c
ROCK       #9aa3ad
CAR_RED    #e63b2e
CAR_BLUE   #2e7de6
CAR_PURPLE #7b3fe4
CAR_WHITE  #f2f2f2
TIRE       #1a1a1a
UI_PANEL   rgba(16,18,30,0.88)
UI_TEXT    #ffffff
UI_GREEN   #4ade80
UI_AMBER   #ffb020
```

### When to use it
Bright outdoor 3D games: racers, flyers, open explorers. The anti-cel: when you want
clean and readable, not comic-book. Not for night, not for grit, not for cute-chibi
(use cel) — this is the "Saturday morning sports" look.

---

## PRESET: `gulf-thunder` — Gulf Thunder (portrait pixel-art naval arcade)

For portrait pixel-art canvas games. **Key insight: a synthwave sunset seascape that fills the whole vertical frame — banded orange sky, slatted retro sun, black palm-island silhouettes, gradient water — behind fast short-burst arcade action.** The game's own pitch: "5 stages, 5 bosses, 55 seconds of chaos."

### Internal resolution (exact)
- Canvas element: **270 × 480** (portrait phone). Never change this.
- CSS: `image-rendering: pixelated` — chunky crisp pixels, never smoothed
- Page background + `theme-color`: `#0b0b18` (near-black navy)

### Sunset seascape (exact — procedural horizontal bands)
Draw top-to-bottom as flat rect bands (no smoothing — it's pixel art):
- **Sky** (top ~55%): `#e8613a` (burnt orange-red) → `#f27b3b` (mid orange) → `#f89a3c` (golden horizon)
- **Sun:** pale cream `#ffed9d` disc (highlight `#ffeeb8`), radius ~16% of canvas width, centered ~42% down; **horizontal slat gaps** (outrun style) starting 55% down the disc, ~5 slats widening toward the bottom
- **Islands:** near-black warm silhouette `#280a1d` — small islands flanking left/right at the horizon with 2–3 palm trees each (trunk + 5–6 fronds). Pure silhouette, no detail.
- **Water** (bottom ~45%): `#fee295` (pale gold at horizon) → `#f3b161` → `#e99058` → `#c8715a` (dusty rose/mauve at bottom), with horizontal shimmer bands

### Touch UI (exact CSS from source)
- **Stick:** 110px base (`3px solid rgba(255,255,255,.35)`, `rgba(20,20,40,.22)` bg), 48px knob (`rgba(255,255,255,.45)`, white border), dashed hint ring when idle
- **Buttons:** circular, `bold 12px/1 monospace`, border `3px solid rgba(255,255,255,.55)`, bg `rgba(20,20,40,.32)`; pressed: bg `rgba(255,200,60,.45)`, border `#ffd84a`
- **FIRE:** 84px, red-orange accent border `rgba(255,90,70,.8)` — the biggest button, bottom-right
- **JUMP BOOST:** 62px, white border
- **SPCL:** 62px, cyan accent border `rgba(90,200,255,.8)`

### Arcade pacing (from the source's own pitch)
- **5 stages, 5 bosses, 55 seconds of chaos** — a full run is under a minute. Design loops and escalation around short bursts, not long campaigns.

### Palette (exact — sampled from source art + CSS)
```
PAGE_BG    #0b0b18  (page bg, near-black navy)
SKY_TOP    #e8613a  (burnt orange-red)
SKY_MID    #f27b3b  (mid orange)
SKY_HOR    #f89a3c  (golden horizon)
SUN        #ffed9d  (retro sun)
SUN_LT     #ffeeb8  (sun highlight)
WATER_TOP  #fee295  (pale gold at horizon)
WATER_MID  #f3b161  (dusty orange)
WATER_LOW  #e99058  (burnt orange)
WATER_BOT  #c8715a  (dusty rose/mauve)
SILHOUETTE #280a1d  (palm islands, near-black warm)
```

### 2D usage
```js
import { applyVisualStandard } from './kit/gpstyle.js';
const style = applyVisualStandard(null, null, null, 'gulf-thunder');
// canvas: <canvas id="game" width="270" height="480"> with image-rendering: pixelated
// page:   background #0b0b18, theme-color #0b0b18
// per frame: draw style.sunset.skyStops bands, style.sunset.sun disc + slats,
//            style.sunset.islands silhouettes, style.sunset.waterStops bands
// touch:    style.touch.fire / .jump / .spcl / .stick drive the button DOM
// pacing:   style.pacing.stages = 5, .bosses = 5, .targetSeconds = 55
```

---

## PRESET 12: `sticker-retro` — Notebook Arcade base (daylight)

Source: Cherie's 14-game `sticker-*` retro arcade series (`brad-demos-staging/g/sticker-*/`).
Studied deeply: sticker-excitebike (readable source), sticker-bad-dudes, sticker-kung-fu-master,
sticker-punch-out (key art), sticker-rampage. Skimmed: the rest.

**The shared visual language** — what makes all 14 feel like one family:

**Paper** (exact recipe from `sticker-excitebike/js/game.js` `paper()`):
```
fill #f4efe0  (cream — bad-dudes theme-color #f4efe0, headbrawl #f4ecd4)
blue rules #5a8cbe55  (8-digit alpha), lineWidth 1, every 34px from y=36
red margin #d24646aa  (8-digit alpha), lineWidth 3, vertical at x=78
```
**Ink** — `#1b1b1b` near-black for ALL linework. Round caps AND round joins, ~3.2px strokes
(excitebike `drawBike`: `lineWidth 3.2, lineCap 'round', lineJoin 'round'`). Detail/hatch at 1.4px,
50% alpha (`#1b1b1b88`).

**Characters** — hand-drawn ink outlines with ROUNDED FILLED bodies (not stick figures).
Punch-out key art: big round heads, dot eyes, expressive brows, simple mouths. Crowds are tiny
stick figures. Motion marks are comic-style: speed lines, impact puffs, sweat drops.

**Typography** — Patrick Hand (HUD/labels, 700 weight) + Caveat (titles/emphasis).
Self-host the TTFs like the sticker games do (`fonts/patrick-hand.ttf`, `fonts/caveat-700.ttf`).

**Binder holes** — 3 dark punched circles on the left edge (punch-out key art).

**Ground** — tan fill `#e7d8b0` with `#1b1b1b` 3px outline (excitebike `drawTrack`).

**Opponent colors** — muted, never saturated: `#8b1e1e` (dark red), `#1e4a8b` (dark blue).

**Hit feedback** — `#ef8c2b` orange sparks, `#d32f2f` damage red (kung-fu-master).

**Audio** — square-wave beeps only (excitebike `beep()`: `oscillator.type = 'square'`).

**Touch** — shared `nes-pad-controls.js`: discrete NES hit zones (D-pad + A/B), no sliding.

**Usage** (2D preset — no Three.js needed):
```js
const style = applyVisualStandard(null, null, null, 'sticker-retro', { w: 1280, h: 720 });
style.paper(ctx);              // first call every frame — paper + rules + margin
style.binderHoles(ctx);        // optional: 3 punched holes, left edge
style.ink(ctx);                // set round ink linework defaults
ctx.font = style.hudFont(28);  // '700 28px "Patrick Hand", cursive'
ctx.font = style.titleFont(48);// '48px "Caveat", cursive'
style.beep(440, 0.08);         // square-wave blip
```

### Palette (exact hex)
```
PAPER      #f4efe0  (notebook cream)
PAPER_HI   #fffdf6  (paper highlight)
RULE       #5a8cbe55 (blue rules, 34px gap from y=36)
MARGIN     #d24646aa (red margin, 3px at x=78)
INK        #1b1b1b  (all linework, 3.2px round)
GROUND     #e7d8b0  (tan ground fill)
CPU_RED    #8b1e1e  (opponent 1)
CPU_BLUE   #1e4a8b  (opponent 2)
HIT_ORANGE #ef8c2b  (hit sparks)
DMG_RED    #d32f2f  (damage)
```

---

## PRESET 13: `sticker-night` — Notebook Arcade dark variant

Same hand-drawn language, inverted. For space shooters and night games.
Source: sticker-space-in-veiners (black `#000000`), sticker-paintball-office
("After-hours cubicle warfare", theme `#140e0a`), sticker-kart (theme `#061018`).

**Paper** — deep navy-black `#0b1018`. NO rules, NO margin — pure dark.
**Ink** — `#ffffff` white. Same 3.2px round linework.
**Accents** — neon: `#7aa2ff` blue, `#3dd6c6` teal, `#ffe566` yellow, `#ffe08a` warm,
`#ff8a78` salmon, `#8be9a8` mint.

```js
const style = applyVisualStandard(null, null, null, 'sticker-night', { w: 1280, h: 720 });
style.paper(ctx); // dark paper, no rules
```

---

## PRESET 14: `sticker-warm` — Notebook Arcade vintage variant

Warmer, aged-paper take. Source: sticker-punch-out (theme `#f6f1df`, og.jpg key art).

**Paper** — `#f6f1df` warm aged paper, `#cfc6ad` tan tones, `#efe6c8` sand.
Same blue rules + red margin + `#1b1b1b` ink as sticker-retro.
**Accents** — `#e07b7b` soft red, `#b7d3ea` pale blue tint.

```js
const style = applyVisualStandard(null, null, null, 'sticker-warm', { w: 1280, h: 720 });
style.paper(ctx);
style.binderHoles(ctx); // punch-out key art has the 3 holes
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
