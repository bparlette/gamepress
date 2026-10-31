# Generic kit: start any game here

One page for an AI that has never seen this kit. Everything below is backed by code and a check that passes today; nothing here depends on opening a finished game's source.

## 1. Start from green (one command)

```bash
cd kit/cabinet && source env.sh
python3 new.py --starter arena      g40 "Ant Storm"      # top-down swarm survival      (from s1)
python3 new.py --starter platformer g41 "Sky Hopper"     # side-scroll run + jump        (from s2)
python3 new.py --starter tower      g42 "Moat Keeper"    # tower defense: path + waves   (from s3)
```
That copies the starter, renames ids/seed, registers it in `games.json`, builds it and runs `check.sh` (build, HUD lint, bot run, determinism + seed-sensitivity). You land on a playable, bot-winnable, deterministic page. Then iterate on: the `TUNE*` constant (numbers), `draw`/`drawHD` (look), `step` (rules). Each starter's header holds the filled 7-line BRIEF.

| genre | starter | proof it is complete |
|---|---|---|
| arena survivor | `games/s1.js` | bot survives 40 s on seeds 1-8 (8/8), final hp 28-100 |
| platformer | `games/s2.js` | bot clears a generated level on seeds 1-8 (8/8), no life lost |
| tower defense | `games/s3.js` | bot holds the gate through 8 waves on seeds 1-8 (8/8), 9-10 lives left |

**Not yet shipped as code** (honest list): kart racer, mini-Zelda dungeon, turn-based arena, deckbuilder, tycoon, 3D obby, prop hunt. For those, copy the nearest starter's *shape* (TUNE sheet + engine calls + info/bot contract below) and the feel notes in `FEEL-SHEETS.md`; they are labelled "unproven start values" there.

## 2. Engines: `kit/cabinet/engine.js` (global `ENG`)
`move` (AABB vs solid fn), `grid`, `path`, `proj`, `swarm`, `hits`, `imp` (knockback), `cam`/`shake`, `fx`. Full signatures are the header comment of `engine.js`. **Rule: engines own lifecycles.** `kit()` calls `ENG.tick(S, dt)` every sim step, so effects (`S.efx`), projectiles (`S.eproj`), knockback and camera shake age in the simulation, never inside a renderer. Renderers only *read*. (The bug this prevents: explosion effects aged inside the pixel renderer and piled up forever in HD/Art.) A game that imports the engine contains no hand-rolled collision, swarm or effect aging: see `s1.js`, 45 lines of rules.

## 3. The QA contract (any genre)
A game is checkable if it exposes exactly four things; the harness needs nothing else.
1. **Controls**: `inp = {l,r,u,d,a,b,pa,pb,start,ax,ay}`. Use `inp.ax !== undefined ? inp.ax : (r - l)` for analog. Declare `dir:'4'|'8'|'any'`.
2. **State**: `info(S)` returns small JSON of everything that matters to the sim (positions rounded, counters, resources). It is the parity fingerprint: tiers must produce identical `info()`.
3. **Win/lose**: `return finish(S, 'MSG', bonus)` from `step`. The bot must reach win; losing ends via `finish` too.
4. **Checkpoints**: none to write. The harness calls `__shell.ff(n)` (n fixed steps) and reads `info()`; `seed` via `?seed=`.

Rules: all state on `S`; randomness only `S.rng` (gameplay) or `vr()` (visual); no `Math.random`/`Date.now`.

Checks (all run by `check.sh`, `tiers.cjs`):
* `seedcheck.cjs`: same seed => same `info()` AND same frame hash; other seed => different, compared at **25 s and 60 s** plus a frame hash (fixes the old blind spot). Demonstrated: it flagged `s3` as seed-insensitive on the first draft (all creeps identical) and cleared it after enemy kinds were randomised.
* `tiers.cjs g.hd g.art ...`: renders only at checkpoints (sim never depends on renders), so art/WebGL tiers cost seconds. Generic games compare the whole `info()`.

## 4. Tiers for any game (ladder, one sim)
`python3 build.py gN` (Pixel) / `--hd` (HD canvas, `drawHD(S,g)`) / `--art` (HD + WebGL grade/bloom/lights via `GLPOST`). A starter needs only `draw` (pixel) and `drawHD`; the third tier is free. Parity proof today: `node tiers.cjs s1 s1.hd s1.art` (also s2, s3) => `OK: tiers match`. Per tier sheet:

| tier | changes vs below | invariant | proving test |
|---|---|---|---|
| Pixel | 256x224 palette art in `draw()` | sim, `info()` | `check.sh` |
| HD | canvas x3, `drawHD()` gradients/glows | `info()` identical | `tiers.cjs g g.hd` |
| Art/Lux | WebGL post, `GLPOST.light()`, RIG sprites (optional) | `info()` identical | `tiers.cjs g g.hd g.art` |
| Close/World/3D | camera, FX, auto-powerups, three.js | **intentionally differ**, list in `--expect-diff` | `tiers.cjs ... --expect-diff` |

## 5. Traps (each one cost an author time)
* **Pixel calls inside `hud()` are silently dropped** (the pipeline blits before hud). Put `rect/spr/fillCircle` in `draw()`/`ui()`; only `txt()` in `hud()`. `check.sh` lints this.
* **`kit()` does not expose extra config properties** on the game object. Keep fallbacks/constants at file scope (e.g. `const TUNE...`), not as `kit({ foo })` fields.
* **`THREE` is a top-level `const` inside the built page, not `window.THREE`.** Games with `// NEEDS: three, art` must be built with `--art`; `build.py` now exits non-zero naming the missing piece (try `python3 build.py g17g`).
* Engine state names are reserved: `S.efx S.eproj S.swarm S.ecam`. Global names also taken: `hintS ART.* HD.* RIG.* GLPOST.* ENG`.
* `build.py` with no game ids builds everything; art-requiring games are auto-built with `--art`.

## 6. Rig spec table (RIG.def values, shipped rigs)
viewBox / anchor are in SVG units; `scale` multiplies to logical px (256-wide screen). Pivots are joint points in SVG units. Draw order is back to front.

| rig | viewBox | anchor | scale | order | pivots |
|---|---|---|---|---|---|
| hero | 120x150 | [60,141] | 0.15 | pack, legB, legF, armFar, torso, head, arm | pack[30,80] legB[48,104] legF[68,104] armFar[46,74] torso[60,108] head[60,64] arm[66,74]; attach `gun.all` to arm at [60,62] scale 0.9 |
| zombie | 120x150 | [60,141] | 0.15 | legB, legF, armFar, torso, head, arm | legB[50,102] legF[68,102] armFar[44,76] torso[58,108] head[62,64] arm[64,76] |
| elite | 120x150 | [60,141] | 0.16 | same as zombie | same as zombie |
| zombieR (runner) | 120x150 | [60,141] | 0.135 | same | same |
| zombieT (tank) | 120x150 | [60,141] | 0.20 | same | same |
| queen | 160x140 | [80,134] | 0.30 (0.40 in g17f) | legsL, legsR, body, head | legsL[60,80] legsR[100,80] body[80,100] head[80,62] |
| gun | 90x30 | single image `gun.all` | n/a | attached to hero arm | n/a |
| envF (floor) | 32x32 tiles a,b,c | n/a | rendered 8x | variants a (common), b (8%), c (12%) | n/a |
| envW (wall) | 32x18 | n/a | 8x | one tile | n/a |
| envP (props) | 160x48 sheet crate, barrel, table, locker | per-prop `ox,oy` in `paintRoom` | 8x | n/a | n/a |

## 7. Where the rest lives
`FEEL-SHEETS.md` (numbers), `ART-TRANSFER.md` (anchors, Lux environment recipe, painted-art pipeline), `KIT-API.md`, `ART-CONVENTIONS.md`, `HD-ART-TIER.md`, `RUNBOOK-ENV.md`, `PAINTED-ART-BRIEF.md`.
