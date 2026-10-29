# MISO-LESSONS — what building Miso twice taught gamepress

Case study: **Miso: Starlight Adventure** was built twice — first as an
original Nintendo-style 2D platformer (painterly meadow, yarn-ball weapon),
then rebuilt as a rain-soaked photoreal city version with a grapple-swing
yarn and a vertical second level. Everything below was learned by shipping
it, measuring it, and having the owner reject what didn't work. Short
*filming* lessons from Miso already live in `docs/SHORT-PIPELINE.md`; this
doc is the *building* lessons.

## 1. The Nintendo-style build (2D platformer juice)

Physics constants and enemy patterns live in `docs/NINTENDO-FEEL.md`
(`kit/gpfeel.js`). The production checklist that made Miso *read* as a
Nintendo game:

- **Squash & stretch on the hero, always.** Stretch scales with vertical
  speed in the air; landings squash (~0.13s) with dust puffs; hard falls
  (>300 px/s) squash harder. A static-shaped hero reads as a tech demo.
- **Hitstop on kills** (a few frozen frames), floating score pops, 1-frame
  white hit-flash on enemies, hurt = knockback + 1.6s invincibility blink.
- **Screen flow is part of the game:** title → world card → play → clear
  (bell + fanfare + score tally) → game over. Skipping the card/clear
  screens makes a demo; including them makes a *game*.
- **A signature weapon with a readable arc.** Miso's yarn ball is thrown,
  lands, *rolls along the ground killing*, and reels back — kills in both
  directions. Judge physics toys **in motion, never in stills**: the yarn
  looks dangly in screenshots and right in play.
- **Original characters, Nintendo manners.** No Nintendo assets, names, or
  layouts — mechanics and feel are facts; expression is not. (Legal note in
  `docs/NINTENDO-FEEL.md`.)

## 2. iOS WebAudio: the silent-switch fix (every web game needs this)

In Safari/WKWebView, an AudioContext is **muted by the iPhone silent
switch** unless the page opts into playback. Miso shipped silent on the
owner's iPhone because audio init only created/resumed the context. The
standard init for every gamepress game:

1. On audio init: `if (navigator.audioSession) navigator.audioSession.type = 'playback';` (iOS 17+).
2. Inside the **first user gesture**, play a 1-sample silent buffer to unlock.
3. Resume the context on every `pointerdown`/`touchend` and on
   `visibilitychange` (returning to the tab).
4. Expose the context state in `window.__dbg` (`ac: AC.state`) so headless
   probes can prove `'running'` instead of assuming sound works.

A game is not "fixed" until the owner hears it on her phone.

## 3. The realistic build: painting a world

Reference: a Blender + image-gen workflow post (build simple 3D, paint over
it) applied to a rainy night-market street.

### The Visual Reference Rule (hard rule)

**Never generate art from a text description of a visual target.** Three
generations from words produced bright storybook streets; one generation
*anchored on an actual frame of the target video* (passed as the style
reference) produced the weathered, cinematic look immediately. A written
report about a video is not seeing it. Get the frames in front of your own
eyes, anchor on them, then generate.

### Blockout first, then paint

Paint from a rendered blockout (flat-shaded boxes for stalls, signs, street)
so perspective and composition are right *before* the paint pass. The image
model paints light, weather, and signage onto your geometry instead of
inventing its own.

### Segment backdrops for long levels

One painting is one screen. For a full level, paint **segments** (street,
corner, food-cart street, alley) and sequence them — `A C B L B C A` —
crossfading the seams with horizontal-gradient masks on offscreen canvases,
scrolled at ~0.45 parallax. A corner segment every few screens sells a
world that turns, even in a side-scroller.

### Integrate the gameplay into the painting

Flat vector tiles over a painting clash. Reskin every tile type as scene
furniture: platforms → stall awnings, blocks → market crates and shop
shutters, ?-blocks → glowing paper lanterns, pickups → sparkles, checkpoints
→ lantern flags. Grade the sprites down slightly (`ctx.filter` brightness/
saturate) so characters sit *in* the scene's light instead of on top of it.

### The floor rule (learned the hard way, three attempts)

**When the backdrop is a complete painting, any flat-filled gameplay tile
painted over it reads as a box or a wall** — no matter how carefully it's
textured, shaded, or beveled. The winning solution is *invisible collision*:
ground tiles collide but draw nothing; the painting's own street is the
floor, sprite reflections smear into its gloss, and pits read as soft dark
gradient breaks in the street. Corollary: thin things must be thin — an
awning platform is a scalloped canvas sheet with a soft shadow, never a
slab with an underside.

### Reflections: offscreen or not at all

Flipping a sprite with `destination-out` **on the main canvas** punches
rectangular holes in everything already drawn. Build the reflection on an
offscreen canvas (flip, low alpha ~0.30, gradient fade, slight sine
shimmer), then blit it. Same rule for any composite trick: offscreen first.

## 4. Portrait adaptation (2D canvas games)

Phones are portrait; platformers are landscape. The pattern that worked:

- Keep the world 270 units tall forever. Make the *view* dynamic: portrait
  → viewport 270×480, landscape → 480×270.
- Bottom-anchor the world with a single offset `OY = VH − 270` added at
  every world-space draw site; the taller portrait view then shows more
  sky/city above, nothing re-layouts.
- HUD reflows: two-row HUD when the view is narrow; wrap the title.
- Vertical levels (see §5): make the camera offset part of the same
  number — `OY = layoutOY − camY` — and every draw site written for the
  flat game works in the climbing game unchanged.

## 5. The grapple yarn + vertical level (Unravel × Bionic Commando)

One button, context-aware: **X throws the yarn ball when there's nothing to
hook; X hooks when there is.**

- **Targeting:** raycast from the hand, up-diagonal (or straight up if the
  player holds Up), ~200px. First solid wins. Show a soft pulsing ring at
  the would-be anchor whenever a target is in range — players learn the
  verb from the hint, not from instructions.
- **Swing:** pendulum via constraint, not simulation — apply gravity and
  input normally, run normal collision, then pull the player back onto the
  rope circle and strip the outward radial velocity. Direction input pumps
  the swing tangentially. Robust in an evening; a full rope sim is not.
- **Reel:** Up/Down shorten/lengthen the rope (38–200px). Reeling to the
  top and pressing Jump = **pop**: detach with a full jump boost. The pop
  must ignore the variable-jump release cut for ~0.18s, or a tap-release
  kills the fling.
- **Release keeps momentum.** X while hooked detaches; hurt detaches;
  landing with a clearly slack rope auto-detaches (require real slack —
  `dist < L − 18` — or standing latches self-cancel the frame they form).
- **Vertical level design:** steps ≤3 tiles; grapple beams are ceilings
  with *nothing* under them; leave line-of-sight play in (a crate beside
  the awning shadows part of the beam — step right to hook it). Falls are
  forgiving: the street at the bottom catches you, checkpoints are
  height-triggered, and the goal (rooftop bell) checks *y* as well as *x*.
- Backdrop for a climb: don't scroll the street painting upward — deep
  gradient sky + hash-scattered lit windows at half parallax, with the
  painted street world-anchored at the bottom where it belongs.

## 6. Shipping to a phone (GitHub Pages reality)

- Pages deploys **lag** (minutes) and phones cache hard (~10 min). A push
  being on origin is not the game being live.
- **Cache-bust every script tag** (`game.js?v=N`, bump N on every deploy).
- **Verify the live file, not the repo:** fetch the served JS and grep for
  the new markers before telling anyone it's fixed. If the live bytes are
  old, say it's still deploying — never "try refreshing" as a diagnosis.
- Silent dead code is the default failure mode of conditional art: a
  shading pass guarded by a helper that doesn't exist (or wrong grid
  indexing) runs zero times and looks like "the art didn't take." When a
  visual feature has no effect, first prove its condition executes.

## 7. The 3D build: Miso City Level 1 (three.js, Oct 29, 2026)

Third build of the character: a side-scroller fighter street → alley
runner → boss fight, all-3D cast from the local procedural pipeline
(`docs/SPRITE-TO-3D.md`), shipped as a browser game on itch. The
pipeline lessons live in SPRITE-TO-3D; these are the *engine-integration*
lessons — what happens when the GLBs meet three.js.

### The color-space trap (headline lesson)

**Procedural GLBs store raw sRGB numbers in `baseColorFactor`; three.js
reads them as linear, so the sRGB output pass washes the cast to
pastels** — Miso's orange coat rendered cream-yellow, the green headband
rendered mint, charcoal wraps rendered grey. The models were never
wrong; the loader numbers were. **Fix: `material.color.convertSRGBToLinear()`
once per material at load.** Ground truth for the palette is the Blender
still of the same GLB — if the in-game character doesn't match the
still's hues, suspect color space before touching art.

### flattenToBasic is a dead end

An early build "fixed" invisible characters by flattening every material
to `MeshBasicMaterial`. Two lessons in that: (1) three r170's GLTFLoader
splits multi-primitive meshes into separate single-material
`SkinnedMesh`es — **no material arrays ever reach the renderer on this
path, so the "array on a groupless geometry draws nothing" workaround
was treating a bug that doesn't exist here**; (2) flattening only
destroyed the shading and compounded the pastel problem. Keep the
exported `MeshStandardMaterial`s, and light the characters instead:
hemisphere + warm directional key + cool fill. Directional lights earn
their keep twice — they also cover far set zones (the runner alley sits
~400 units from the street) where the street's point lights can't reach.
Character saturation and identity must be **screenshot-checked against
the Blender stills**, not assumed from "it renders".

### Combat readability: probes passing ≠ the fight reads

The shipped fight was mechanically correct — 21/21 harness probes green —
and the owner's playtest verdict was still: *"Can't see punches or
kicks."* Subtle 0.5s attack clips on small characters are invisible in
play, however correct their hitboxes are. Rules from the verdict:

- **Verify combat with frozen action stills judged by eye** (mid-swing,
  contact frame), the same way §5 of SPRITE-TO-3D verifies walks. A
  damage-number probe is not evidence a hit can be *seen*.
- **Ship fighting exaggerated:** anticipation and overshoot on every
  swing, plus comic impact language — hit-stop, impact bursts,
  onomatopoeia popups. Understatement is the failure mode.
- A dedicated combat-feel overhaul followed the verdict.

**Overhaul implementation (slot — fill in when it ships):**
_hit-stop duration, popup/burst system details, attack timing numbers._

### The verify harness pattern (proven twice)

Playwright against a local static server, network intercepted to the
local origin. The game exposes `window.__game` (mode, hearts, score,
district, player position, enemies alive, boss HP) and a `__gameStart()`
hook; ~21 probes cover: load with zero console errors, movement,
per-move damage, mode transitions (street → runner → boss), boss spawn
and kill, win screen, game-over path — and a **touch probe against the
real `gptouch` overlay** (drag moves the player; buttons act). Two
calibration warnings: headless SwiftShader runs the game clock at
~0.06× real time (dt-clamped frames), so size probe iteration budgets
for the slow clock, and **never quote headless fps as device
performance** — it measures the software rasterizer, not the game.

### Shipping a three.js game to itch

Zip with **`index.html` at the root**; vendor three under
`node_modules/three/` (the module + `three/addons/` imports resolve
relatively, so the folder ships as-is); include `assets/` (GLBs), art
plates, and audio. Exclude dev files: the verify harness, screenshots,
source generation files. The shipped Level 1 zip: **126 files, 5.7 MB**
— itch took it as browser-playable with room to spare. Before zipping,
run the public-naming check over every shipped text file: no owner
names, no GitHub URLs in anything a player can download.

## See also

- `docs/SHORT-PIPELINE.md` — filming Miso (recorder, choreographed bot,
  MEASURE gate, honesty rules); its bot section carries the level-1 stunt
  coordinates.
- `docs/NINTENDO-FEEL.md` — the decompiled constants behind §1.
- `docs/TOUCH.md` — the floating-joystick standard used for the phone build.
- `docs/SPRITE-TO-3D.md` — the pipeline that produced the §7 cast:
  routes (Meshy / HF Spaces / Colab / local procedural), the shared-rig
  action contract, tail and grounding rules, proof-render verification.
