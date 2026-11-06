# SPRITE-ATLAS — Production Sprite Sheets + Canvas Atlas Rendering

How to ship hand-drawn or AI-assisted sprite sheets for 2D canvas games, and how
to render them in vanilla JS with zero dependencies. Proven on **Retro Pickleball
Smash** (Spike vs Ace, 47 frames, 320×960 sheet).

> Related: `kit/gpsprites.js` is the *procedural* alternative (draws cat/dog/zombie/
> person with canvas primitives — no image assets). Use the atlas pattern below when
> you have real pixel-art frames; use `gpsprites` when you don't. The
> `shellshock-16bit` preset in `docs/VISUAL-STANDARDS.md` covers the CRT/pixel
> presentation that pairs with this.

## 1. The production standard

A sprite sheet is production-ready when a script can slice it with no human in the
loop. The rules:

| Rule | Why |
|---|---|
| **Uniform grid** — every frame is the same cell size (e.g. 64×64) | One slicing formula, no per-frame bookkeeping |
| **Transparent PNG, no background** | Slices composite cleanly over any scene |
| **No text, labels, or guides on the sheet** | Labels break slicing and ship to players |
| **JSON manifest** — `character → action → [[x,y,w,h], …]` | The game never hardcodes source coordinates |
| **Pivot consistency** — feet land on the same cell Y in every frame (e.g. y≈56–59 of a 64px cell) | Animation doesn't bounce vertically between frames |
| **Limited palette** — ~8 colors per character | Reads as authentic 8-bit; small file size |
| **Heavy dark outlines** (~2px at full scale) | Sprites read at small sizes against busy backgrounds |
| **Characters face right by default** | Flip at render time for the other direction |

Example layout (15 rows × 64px, 5 columns, 320×960):

```
rows 0–6   Spike: idle×2, walk×4, serve×4, forehand×3, backhand×3, dink×2, slam×3
rows 7–13  Ace:   same 7 actions, same frame counts
row 14     Pickleball ×3 (normal, h-blur, v-blur) + impact starburst ×2
```

Example manifest (`spritesheet.json`):

```json
{
  "spike": {
    "idle":     [[0,0,64,64], [64,0,64,64]],
    "walk":     [[0,64,64,64], [64,64,64,64], [128,64,64,64], [192,64,64,64]],
    "serve":    [[0,128,64,64], [64,128,64,64], [128,128,64,64], [192,128,64,64]]
  },
  "ace":   { "idle": [[0,448,64,64], [64,448,64,64]] },
  "ball":  [[0,896,64,64], [64,896,64,64], [128,896,64,64]],
  "impact":[[192,896,64,64], [256,896,64,64]]
}
```

Each rect is `[sx, sy, sw, sh]` into the sheet.

## 2. Canvas atlas rendering pattern

One function handles every character, every pose. Anchor at **bottom-center ground
contact** so world position = where the feet touch.

```js
// Build once from the manifest, adding per-frame anchors.
const SPRITES = {};
for (const [char, actions] of Object.entries(manifest)) {
  SPRITES[char] = {};
  for (const [action, frames] of Object.entries(actions)) {
    SPRITES[char][action] = frames.map(([sx, sy, sw, sh]) => ({
      sx, sy, sw, sh,
      // Anchor: bottom-center of the cell. Feet are the pivot.
      anchorX: sw / 2,
      anchorY: sh - (64 - 59), // feet at y≈59 inside the 64px cell
    }));
  }
}

// Per-action animation state lives on the character object.
function frameFor(char) {
  const frames = SPRITES[char.id][char.state];
  const speed = { idle: 4, walk: 8, serve: 10, forehand: 12, backhand: 12, dink: 8, slam: 12 }[char.state] || 8;
  return frames[Math.floor(char.animT * speed) % frames.length];
}

function drawCharacter(ctx, sheet, char) {
  const f = frameFor(char);
  ctx.save();
  ctx.translate(char.x, char.y);
  if (char.facing < 0) ctx.scale(-1, 1); // face left
  ctx.drawImage(sheet, f.sx, f.sy, f.sw, f.sh, -f.anchorX, -f.anchorY, f.sw, f.sh);
  ctx.restore();
}
```

Rules of thumb:

- **State → frame mapping** is a lookup, never arithmetic. `char.state = 'dink'`
  picks the dink strip; `char.animT` (seconds in state) picks the frame.
- **Non-looping actions** (serve, slam): clamp to the last frame instead of
  wrapping (`Math.min(i, frames.length - 1)`).
- **Facing**: draw everything facing right; `ctx.scale(-1, 1)` for left. Never
  store mirrored frames on the sheet — it doubles the art budget for nothing.
- **Scale at render**: characters drawn at ~32px inside 64px cells are authentic
  8-bit scale; render at 2× (`dw = sw * 2`) for chunky visibility on phones.
- **White flash on hit**: draw the same frame, then redraw with
  `ctx.globalCompositeOperation = 'source-atop'` + white fill on an offscreen
  copy, or stamp a semi-transparent white rect clipped to the sprite bounds.
  5 frames is the standard (see `shellshock-16bit` in VISUAL-STANDARDS.md).

## 3. Pixel-perfect scaling

Keep the logical canvas tiny and let CSS do the upscale. The browser's
`image-rendering: pixelated` gives chunky crisp pixels with zero shader work.

```css
canvas#game {
  image-rendering: pixelated;
  image-rendering: crisp-edges; /* Firefox */
  width: 100vw;
  height: 100vh;
  object-fit: contain; /* letterbox, never stretch */
  background: #000;
}
```

- Logical sizes that work: **320×180** (16:9), **384×224** (Genesis),
  **256×224** (SNES), **270×480** (portrait phone).
- Draw sprites at integer scale factors (1×, 2×, 3×). Fractional scales shimmer.
- Never smooth the upscale (`image-rendering: auto`) on a pixel-art game — it
  turns deliberate chunk into blur.

## 4. Binary delivery via the GitHub connector

The GitHub connector **corrupts binary files** (UTF-8-encodes the content string —
a 5KB PNG came back as ~8KB of garbage, verified 2026-10-07). Never push
`.png`/`.jpg`/`.woff2`/`.mp4` through `push_files` / `create_or_update_file`.

**The workaround: ship sprites as base64 text.** Split the base64 into ~90KB text
chunks (stays well under the 128KB single-argv limit), push the chunks as `.txt`,
decode to a data URI at runtime.

```bash
# Pack (Python, run locally — not in the browser)
python3 - <<'EOF'
import base64, json, os
with open('spritesheet.png', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('ascii')
chunks = [b64[i:i+90*1024] for i in range(0, len(b64), 90*1024)]
os.makedirs('sprite-b64', exist_ok=True)
for i, c in enumerate(chunks):
    open(f'sprite-b64/sprites_b64_{i:02d}.txt', 'w').write(c)
open('sprite-b64/chunk_count.txt', 'w').write(str(len(chunks)))
print(f'{len(chunks)} chunks, {len(b64)/1024:.0f}KB total')
EOF
```

```js
// Unpack at runtime (game fetches its own chunks, same origin)
async function loadSheet(base) {
  const n = parseInt(await (await fetch(base + 'chunk_count.txt')).text(), 10);
  let b64 = '';
  for (let i = 0; i < n; i++)
    b64 += await (await fetch(base + `sprites_b64_${String(i).padStart(2, '0')}.txt`)).text();
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64.trim();
  await img.decode();
  return img;
}
```

- Files under ~100KB total can be inlined as a single data URI in `game.js`.
- Prefer `fetch` over embedding when the sheet exceeds that — keeps the JS editable.
- Small images (< a few KB) can also go straight in as data URIs.

## 5. AI sprite sheet generation — prompt engineering

When you don't have a pixel artist, an image-generation model can produce a usable
sheet — if you constrain it hard. Loose prompts give you pretty pictures; tight
prompts give you sliceable assets. This is the 3-step method proven on
**Retro Pickleball Smash** (assets in `assets/pickleball-ai-sprites/`).

### Step 1: Force a consistent grid and horizon

The model must output a rigid grid, not a collage. Spell out the layout, the cell
size, and the ground line — otherwise feet drift between frames and the animation
bounces.

```
An NES 8-bit game production sprite sheet featuring 2D side-scrolling pixel art
characters on a dark charcoal-gray background (hex #22252a).
Organize the sprites into a perfect, strictly aligned grid:
- Row 1 features "Spike" (a red-and-white athletic character).
- Row 2 features "Ace" (a green-and-white athletic character with a headband).

LAYOUT AND ALIGNMENT RULES:
- 8 columns, 2 rows. Every sprite cell is identical in size (64x64px),
  resulting in 16 perfectly grid-aligned sprite frames.
- A faint, thin horizontal gray ground-level baseline anchors the feet of every
  character across both rows, ensuring uniform vertical positioning and zero
  "bouncing" when animated.
- Avoid overlapping sprites. Provide comfortable, equal blank pixel margins
  between each character cell with zero visual crowding.
- Render no labels, HUD elements, numbers, UI text, or decorative UI borders.
  The image contains ONLY the pixel sprites on the grid.

FRAME SEQUENCES (left-to-right on each row):
1. IDLE: Stand facing right, paddle loosely in hand.
2. RUN 1: Passing/contact frame, arms back.
3. RUN 2: Recoil/anticipation, knee up.
4. RUN 3: High-point push, forward stride.
5. SWING: Forehand wind-up & hit.
6. STRIKE: Low backhand, dink pose.
7. DINK: Crouch-ready, forward push.
8. SMASH: Airborne jump, overhead paddle extension.
```

### Step 2: Protect the style

Generative models default to soft, anti-aliased, gradient-heavy art. Override that
explicitly, and lock asset persistence (what each character holds) so props don't
morph between frames:

- **Outlines & palette:** "chunky black outlines", "color-accurate NES 8-bit
  palette (under 16 colors per character)". This is what keeps the art genuinely
  low-res instead of a blurred imitation.
- **Crispness:** "pixel-art style, non-anti-aliased, crisp, distinct pixel
  rendering". After download, open in Aseprite/Piskel/Photoshop and confirm
  resampling is **Nearest Neighbor** — never Bicubic/Bilinear, which blends the
  deliberate pixels into mush.
- **Prop persistence:** state exactly what each character holds in every frame,
  e.g. "always hold their distinct paddles — red for Spike, yellow-green for
  Ace". Models will otherwise swap, drop, or recolor props mid-row.
- **Effect placement:** restrict extras to specific frames, e.g. "a tiny yellow
  perforated pickleball appears only in the swinging/striking impact frames".

## 5a. 8-bit vs 16-bit — always generate both

**Cherie's rule (2026-10-21):** in the art-first workflow, never generate just one
sprite style. Generate **both** versions of the sheet and present them side by
side. She picks the winner; the background is then generated in the winning
style.

| | 8-bit (NES style) | 16-bit (SNES/Genesis style) |
|---|---|---|
| Pixel size | Chunky, large visible pixels | Finer, more pixels per character |
| Palette | ~16 colors per character | ~64+ colors per character |
| Outlines | Heavy 2-3px black | Thinner 1-2px, sometimes colored |
| Shading | Flat fills, minimal shadow | Smooth gradient shading with dithering |
| Character height | 48-64px | 64-96px |
| Anatomical detail | Exaggerated, simple | More proportional, more detail |
| Reads best at | Small sizes, bold silhouettes | Larger sizes, expressive faces/poses |
| Feel | Nostalgic, bold | Richer, more modern retro |

**Prompt-engineering difference** — everything else in the prompt (grid layout,
ground baseline, pose list, prop persistence) stays identical. Only the style
block changes:

- **8-bit:** "chunky pixels, limited 16-color NES palette, heavy 2-3px black
  outlines, simple flat shading, bold readable silhouettes"
- **16-bit:** "detailed 16-bit SNES-style pixel art, rich color palette (64+
  colors), smooth gradient shading with dithering, 1-2px outlines, more
  anatomical detail, expressive shading on clothing and faces"

**Slicing:** both sheets go through the same `tools/slice_spritesheet.py`
pipeline. 16-bit frames are larger, so bump the uniform-grid cell size to fit
(the tool's `--cell-w/--cell-h` flags), but keep the same manifest format.

**Background matching:** whichever style wins, the background prompt uses the
same style block — an 8-bit background behind 16-bit sprites (or vice versa)
breaks the illusion instantly.

### Step 3: Wire it to the engine

Tell your code (or code assistant) the grid contract explicitly:

- Sprite-cell standard (e.g. 64×64) — one slicing formula for the whole sheet.
- Feet anchor: all animation positioning uses `cell height − 2px` as the y-origin
  (the ground baseline from Step 1). World position = where the feet touch.
- Frame offsets follow the row/column order from the prompt — state `dink`
  is column 7, etc. (see the manifest format in §1).

### Verify before you ship — models make these mistakes

AI sheets are good for **structure and layout**; hand-made pixel art still wins on
crispness and character quality. Every AI sheet we tested needed cleanup. Check
for all of these before the sheet goes in the game:

| Defect | What to look for |
|---|---|
| **Character drift** | Model swaps palettes or features mid-row (in our sheet, "Spike" turned green in frame 2 and most of "Ace" turned red) |
| **Neighbor bleed** | A tall/wide pose spills into the adjacent cell (our `spike_smash` caught part of the next frame — removed via connected-component cleanup) |
| **Prop morphing** | Paddles change color, size, or hand between frames |
| **Baseline drift** | Feet don't sit on the ground line in every frame |
| **Extra limbs/figures** | The model invents a partial second character at a cell edge |

Fix what you can in post (background keying, tight-crop, blob removal); regenerate
or hand-fix what you can't. Never ship an unverified AI sheet — one drifted frame
reads as a bug to players, not a style choice.

## 6. Why this works: the neural mechanics behind AI sprite generation

Section 5's prompt tricks aren't superstition — each one maps to a specific
limitation of how diffusion models process images. Knowing the *why* lets you
design around the next failure mode instead of memorizing incantations.

### Grid lines are latent-space firewalls

A diffusion model's self-attention computes correlations across spatial patches.
On an unbroken sheet, the queries from one character region attend to the keys
of neighboring regions — limbs, colors, and paddle shapes smear horizontally
across frames, because nothing in the latent field marks where one sprite ends
and the next begins.

Sharp grid borders fix this structurally. The high-contrast lines create steep
gradient boundaries during the early denoising steps, exactly when layout is
being decided. Those boundaries act as spatial masks: attention heads are forced
to resolve features *inside* each cell instead of cross-contaminating between
cells. The grid isn't decoration — it's the mechanism that makes the sheet
sliceable.

**Practical takeaway:** always include visible cell dividers in the generation
prompt, then strip them in post (background keying + tight-crop, same verify
step as §5).

### Chunky characters survive VAE compression

Standard diffusion VAEs compress images spatially by a factor of 8: every 8×8
pixel block (64 pixels) becomes a single latent token. Ask for a true 16×24px
NES sprite and the entire character fits inside a fraction of one token.
Micro-features — eyes, fingers, paddle edges — are mathematically obliterated
in that bottleneck, and the decoder hallucinates blurry approximations of what
it thinks was there.

Scaling up to chunky "Kunio-kun" proportions — roughly 48–64px of visual
character height, with exaggerated heads, 3px-wide limbs, oversized paddles —
puts each anatomical component across multiple latent tokens. Outlines and
silhouettes sit comfortably above the model's reconstruction frequency, so
edges come back clean instead of bleeding.

**Practical takeaway:** never ask a diffusion model for true 16×24 NES sprites.
Generate at 3–4× that size, then nearest-neighbor downscale in post. The crisp
pixel look comes from the downscale, not the generation.

### Key poses beat walk cycles — latent drift is real

Diffusion models have no memory across space. There is no skeleton, no rig, no
notion that frame 3 is the same character as frame 2 — every cell is generated
independently from the prompt's description.

Ask for a 12-frame walk cycle and the eye does sub-pixel differencing between
adjacent frames: any micro-shift in limb length, joint pivot, or head width
reads as warping or "boiling." But ask for decoupled, extreme key poses — idle,
wind-up, strike, airborne smash — and the kinetic actions differ so completely
that perception forgives minor variation in muscle mass or fabric folds. The
visual system checks continuity between *similar* poses far more strictly than
between *different* ones.

**Practical takeaway:** prompt for 4–8 distinct keyframes, not fluid cycles. The
gameplay code handles the rest — a 3-frame run cycle at 60fps reads fine even
when the frames were never rigged together.

### The VAE can't output true pixel edges — post-process instead

VAE decoders are trained with perceptual loss (LPIPS) that rewards smooth,
anti-aliased transitions between high-contrast boundaries. The model is
*optimized to remove* hard stair-step edges — it treats them as reconstruction
error. A diffusion model physically cannot emit true 1-bit pixel edges from
raw noise.

The workaround is two-stage: enforce bold, high-contrast outlines at macro
scale so the boundaries survive the decoder's smoothing filter, then
nearest-neighbor downscale + palette quantization in post to re-discretize them
into hard pixels. The generated sheet is an **intermediate asset**, not the
final one — it was never meant to load 1:1 into the engine.

**Practical takeaway:** budget a post pass (downscale → quantize → key → crop)
for every AI sheet. Generation gets you ~70% of the way; the last 30% is
discrete rasterization, and no prompt fixes that.

---

## When to use this

2D canvas games with real pixel-art frames: sports games, brawlers, platformers —
anywhere `gpsprites.js` procedural characters would look cheap. For 3D games with
sprite characters (HD-2D), see the `shellshock` / `iso-city` presets in
VISUAL-STANDARDS.md instead.
