# img2threejs Workflow — Start Your Game from an Image

img2threejs ([github.com/img2threejs/img2threejs](https://github.com/img2threejs/img2threejs),
Apache 2.0) rebuilds a 2D reference image as **pure procedural Three.js code** —
a `THREE.Group` factory with pivots, sockets, and colliders. Zero binary
`.glb` blobs, so the mesh is diffable, editable, and animation-ready. Pair it
with `kit/gpfeel.js` for physics and you have a fully code-driven hero asset.

## The critical rule

**NEVER feed full-scene screenshots.** img2threejs translates 2D visual
structures into procedural geometry. A busy scene (characters + terrain +
clouds + UI) confuses the mesh generator: limbs merge into floor geometry
and the polygon budget explodes.

Generate **isolated, orthographic hero assets on pure white `#FFFFFF`**
backgrounds only:

- No shadows, no ground planes, no UI elements
- 3/4 isometric or orthographic front-quarter view
- Single subject per image (one kart, one character, one hero)
- Studio lighting, sharp edges

Convert each asset into its own discrete `.ts`/`.js` mesh factory, then
assemble the final level inside your gamepress scene. Terrain, hazards,
and background are built separately in code.

## The 4-step pipeline

| Step | Tool | Input | Action | Output |
|---|---|---|---|---|
| 1. Hero concepting | Gemini image gen | Text prompt (see templates) | Generate isolated asset on pure white #FFFFFF, no shadows/ground/UI | Clean 2D PNG |
| 2. Mesh extraction | img2threejs | Step 1 PNG | Run with low-poly budget + pivot spec (see agent prompt) | `createModelInstance()` ES module |
| 3. Physics rigging | `kit/gpfeel.js` | Procedural mesh | Attach bounding box to `RetroController` / `characterStep()` (coyote time, jump buffer, squash-stretch) | Playable controller |
| 4. Viral capture | bot engine | Assembled scene | `?auto=1` bot script: attempt 0 fails in 3s, attempt 1 threads near-misses | Deterministic 1080×1920 MP4 |

## Gemini prompt templates

Strict visual constraints in every prompt: isolated subject, pure white
background, no ground, no shadow, no UI.

**Kart-racer (hover-kart):**
> "A 16-bit arcade red hover-kart with chunky neon-blue exhaust thrusters,
> low-poly retro aesthetic, 3/4 isometric front-quarter view, isolated on a
> solid pure white background, studio lighting, no ground, no shadow, no UI,
> sharp edges."

**Arena-brawler (character):**
> "A stylized chunky retro arcade brawler character wearing an orange bomber
> jacket, low-poly geometry, clean silhouette, T-pose or slight neutral
> A-pose, isolated on a solid pure white background, no floor, no background
> elements."

**One-tap-reflex (hero):**
> "A chunky low-poly arcade hero character, bright primary colors, simple
> readable silhouette, neutral A-pose, 3/4 isometric view, isolated on a
> solid pure white background, studio lighting, no ground, no shadow, no UI."

**Generic fallback (any recipe):**
> "A [describe hero asset] in low-poly retro arcade style, clean readable
> silhouette, neutral pose, 3/4 isometric view, isolated on a solid pure
> white background, studio lighting, no ground, no shadow, no UI elements."

## img2threejs agent prompt

Hand the isolated PNG to your AI coding agent (Claude Code, Cursor, or any
agent with the img2threejs skill installed via
`npx --yes img2threejs@latest install`):

```
Run img2threejs on this image with the following constraints:

1. Target: Low-poly Three.js procedural group (<1,200 polygons total).
2. Hierarchy:
   - Root: THREE.Group
   - Pivots: Isolate moving parts (wheels/thrusters or arms/legs) as
     separate child Groups.
   - Sockets: Add empty THREE.Group markers at socket_head,
     socket_weapon, and socket_exhaust.
3. Material: THREE.MeshStandardMaterial with vertex colors or
   low-roughness plastic specularity.
4. Export: Standalone ES module:
   export function createModelInstance() { ... return { mesh, pivots, tick(dt) }; }
```

Expected output: a single `.js` file exporting
`createModelInstance()` returning `{ mesh, pivots, tick(dt) }` —
`mesh` is the `THREE.Group`, `pivots` are the named moving parts,
`tick(dt)` runs the looping idle animation (e.g. squash-and-stretch).

## Wiring into a gamepress recipe

1. Save the factory as `g/<id>/hero.js` (ES module, import Three.js from
   the same path your game uses).
2. In the recipe's game code, replace the placeholder primitive
   (`new THREE.BoxGeometry(...)`) with `createModelInstance().mesh`.
3. Bind movement: `mesh.position` ← `gpfeel.performAirStep()` /
   `characterStep()` entity position.
4. Hook child pivots into the run loop's `tick(dt)` for procedural
   squash-and-stretch on landings (`gpfeel.squashStretch()`).
5. Attach a bounding box for collisions; wire `RetroController` for
   coyote time + jump buffering.

## Verification checklist

- [ ] **Asset isolation**: Gemini PNG has zero floor shadows, gradients,
      or background elements before running extraction.
- [ ] **Extraction**: img2threejs output is a single ES module with
      `createModelInstance()`, <1,200 polygons, named pivots and sockets.
- [ ] **Recipe binding**: factory imported in `g/<id>/index.html` (or
      `hero.js`), placeholder geometry removed, mesh renders in scene.
- [ ] **Controls wiring**: `mesh.position` driven by gpfeel.js physics;
      pivots animate via `tick(dt)`; collisions use the bounding box.
- [ ] **Capture**: `?auto=1` bot choreography produces the 9:16 viral clip.

## Install

```bash
npx --yes img2threejs@latest install   # base skill
npx --yes img2threejs@latest doctor    # verify
```

Also works as a manual clone: `git clone https://github.com/img2threejs/img2threejs.git ~/.claude/skills/img2threejs`

## Next step

With the mesh wired in, film it: `gamepress drive examples/<id>/hook.drive.json`
(see `docs/DRIVING.md`), then `gamepress viral g/<id>` to plan the clip.
