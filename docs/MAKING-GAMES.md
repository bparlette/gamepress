# How the demo games were made

Ten one-screen demos (plus Tiny Kaiju and Gravity Janitor) built to be **filmed**: each has one visual that works in the
first second, a payoff inside 15 seconds, and a scriptable control scheme. They live in `brad-demos/g/<id>/` of the
Hawk repo and are published on the demo page. This document is the recipe, so a new demo takes an afternoon.

## Stack (and why)

| Layer | Choice | Why |
|---|---|---|
| Language | Plain JavaScript (ES modules), no build step, no TypeScript | edit-refresh loop; a game is one `index.html` that GitHub Pages serves as is |
| 2D games | Canvas 2D, ~250 lines each | fastest to write, perfectly crisp, trivially portrait-adaptive |
| 3D games | three.js r160, vendored at `g/_vendor/three.module.min.js` | no CDN dependency, works offline, same version as other Hawk games |
| Shared glue | `g/_vendor/gp3d.js` (~100 lines) | stage setup, portrait camera fit, fixed-step loop, input, HUD, synth sound, instancing helper |
| Physics | hand-written, per game | see below |
| Audio | WebAudio oscillators (`sfx()` in gp3d.js); events also logged to `window.__events` for the video pipeline | zero assets to download |
| Hosting | GitHub Pages (static) | the demo page is `brad-demos/`; each game is a folder |

### Why no physics engine
Rapier/cannon-es are excellent, but each demo needs only one kind of contact, so custom code is shorter, fully
deterministic (needed for scripted videos) and has no WASM load:
- **Ball Avalanche**: pegs are a lattice, so a ball's nearby pegs are computed arithmetically: O(1), 24,000 balls at once.
- **Ragdoll Launch / Rope Bridge**: Verlet integration (points + distance constraints, 6 to 18 relaxation passes).
- **Marble Elimination**: circle-vs-segment and circle-vs-circle, 3 substeps per frame.
- **Voxel Demolition**: sleeping voxels cost nothing; a blast wakes a radius; a woken voxel wakes the one on top of it.
- **Bulldozer Wedge**: 10,000 pegs, a spatial hash used only for moving pegs.
- **Black Hole**: no contact at all: anything smaller than the hole shrinks toward its centre. (The "stencil buffer" version
  is possible, but shrink-and-sink needs no stencil and looks the same from above.)
Swap in Rapier later if you want stacking and friction; the update functions are the only thing that changes.

## Anatomy of a demo

```
g/<id>/index.html          # one file: <script type="module"> importing ../_vendor/gp3d.js
```
```js
import { createStage, instances, sfx, rand, clamp, THREE } from '../_vendor/gp3d.js';
const st = createStage({ bg: 0x101820, fitWidth: 12 });   // portrait-first: fitWidth is the world width that must fit
st.light();
// ...build the scene, one InstancedMesh per repeated thing...
function update(dt) { /* fixed 1/60 s step: input -> sim -> HUD -> window.__game */ }
function pre()      { /* once per rendered frame: write instance matrices, move the camera */ }
st.run(update, pre);
```

Rules every demo follows (they are what make the videos reproducible; see `docs/DRIVING.md`):
1. Fixed-timestep `update(1/60)`; rendering separate.
2. `Math.random()` for randomness, `performance.now()` for time.
3. `window.__game` (state) and `window.__events` (sound cues) for the capture tools.
4. Query switches: `?clean=1` (no hint text), `?dpr=1` (cheap pixels), plus a pacing knob where useful.
5. Keys are the primary control (so the shell's on-screen pad and the scripted driver both work); pointer is the
   mobile control. The demo-page shell injects KeyboardEvents named by `code` (`KeyA`, `Space`, `ArrowUp`).

## The twelve demos

| Folder | Hook | Core technique | Controls |
|---|---|---|---|
| `tiny-kaiju` | a 2-inch monster vs a dollhouse | Canvas 2D; support-chain collapse; hit-stop | A/D, Space stomp, Z tail, X fire |
| `gravity-janitor` | mop a space station while gravity flips | Canvas 2D; spills peel off and rain on the new floor | A/D, hold Space |
| `ball-avalanche` | 5 balls become 24,000 | InstancedMesh + lattice pegs; gate = clone spawner | A/D or drag |
| `ragdoll-launch` | cannon, crash dummy, bricks, glass, TNT | 12-point Verlet ragdoll; sleeping bricks wake their column | W/S, hold Space |
| `voxel-demolition` | a ~9,000-voxel castle | SDF-ish shape to voxels; wake-on-blast; support chain | arrows, Space, A/D orbit |
| `marble-elimination` | 36 named marbles, last 30% out each round | segment and circle collisions; no input | none (Space skips) |
| `glass-stairs` | which pane holds? | MeshPhysicalMaterial transmission .95 | Space / tap |
| `black-hole` | hole eats coins to skyscrapers | shrink-and-sink; size from eaten volume | WASD / drag |
| `speed-ramp` | impossible ramp, barge landing | analytic ramp, ballistic air phase, FOV kick, CSS speed lines | hold Space, W/S, A/D |
| `rope-bridge` | stack heavier vehicles until it snaps | Verlet chain; per-link snap threshold | Space / tap |
| `crowd-multiplier` | stickmen through math gates, topple a castle | 450 drawn instances, real count in HUD; `?auto=1` autopilot | A/D or drag |
| `bulldozer-wedge` | a plow sweeps 10,000 pegs | spatial hash for moving pegs; edge = abyss | A/D or drag |

## Adding a game to the demo page

```bash
# 1. build g/<id>/index.html (copy a similar demo; keep the rules above)
# 2. film it: write examples/<id>/hook.drive.json, then
gamepress drive examples/<id>/hook.drive.json --quick 8        # smoke test
gamepress drive examples/<id>/hook.drive.json                  # final video + <id>-hook.thumb.jpg
# 3. register it with a thumbnail
gamepress catalog brad-demos/games.json --id <id> --title "Title" --category "Viral Demos" \
  --path g/<id>/index.html --orientation portrait --still press/video/<id>-hook.thumb.jpg \
  --keys '{"left":"KeyA","right":"KeyD","attack":"Space"}' --labels '{"attack":"FIRE"}'
# 4. commit + push; GitHub Pages republishes
```

## Process notes (what actually went wrong, so you can skip it)
- Build each game, then `gamepress drive --quick` it **before** writing the real plan: three games needed physics tuning
  (bridge strength, ramp range, ragdoll power) that only showed up once a script played them.
- Tune with `window.__game` numbers, not by eye: the bridge's max link stretch told us the snap threshold (1.07).
- Keep the first second visual: captions carry the hook, the game carries the payoff.
