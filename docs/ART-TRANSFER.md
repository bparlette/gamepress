# Art transfer: carry the look to any game

Rule learned the hard way: **never generate art from a text description of a visual target. Anchor on an actual reference image.** The reference frames below are produced by the kit itself (see "Reference frames"), not described.

## 1. Scale and density anchors (logical 256x224 screen)
| genre | character height | tile | on-screen crowd | frames per action |
|---|---|---|---|---|
| arena survivor (g17, s1) | hero 22 px tall (rig 150 x 0.15), grunt 22 px, boss 56 px (140 x 0.4) | 16 px floor tile art, 32 px floor variants | 45 @5 s up to 140 | walk 4, hit flash 1 |
| platformer (s2) | 8 px tall hero (6 x 8) on 8 px tiles (use 16 px tall for HD art) | 8 | 0-3 walkers | run 4, jump 1, stomp 1 |
| tower defense (s3) | creep 10 px, tower 12 px on 16 px tiles | 16 | up to ~20 creeps | walk 2, fire 1 |
Rule of thumb: a hero should be 1.5-2.5 tiles tall; swarm enemies 1 to 1.5 tiles.

## 2. Reference frames (regenerate any time)
```bash
cd kit/cabinet && source env.sh
python3 build.py s1 --hd && python3 build.py g17 --art     # tiers to look at
node snap.cjs s1 700 1500 ; HD=1 node snap.cjs g17 700 1500
```
Hand these PNGs (not a prose description) to an art-generation step.

## 3. Painted-art pipeline, generalised (any character/prop)
1. Author an SVG with parts as `<g data-p="name">`. Declare the viewBox, the anchor (feet or base point) and each joint pivot (see rig table in `GENERIC-KIT.md`).
2. `node art/build-art.cjs` renders every part at 4x (8x for env tiles) into `art/atlas.json`. Add the file to `SETS` in `build-art.cjs`.
3. In the game: `RIG.def(name,{scale,anchor,order,pivots,attach})`, then `RIG.draw(g,name,x,y,{flip,pose,tint})`.
4. Painted raster upgrade: put PNGs at `art/painted/<set>/<part>.png`, run `node art/pack-painted.cjs`; it overrides atlas keys part by part with the same anchors, so no game code changes. Brief for the generator: `PAINTED-ART-BRIEF.md`.
Nothing in 1-4 is cabinet-specific: any game that draws through `HD`/`RIG` can use it.

## 4. Lux environment recipe (why it does not look like wallpaper)
The naive room tiles one 32 px floor texture and the repetition is obvious. g17f's `paintRoom` breaks it with five cheap rules, all deterministic:
1. **Variants with weights**: three floor tiles `a/b/c`; choose per cell by `hash(x,y)`: `h < 0.08` -> b, `h > 0.88` -> c, else a. (80% / 8% / 12%.)
2. **Per-cell scatter, not a grid**: decals (blood, stains, cracks) at `hash(k,3)*208+24, hash(k,5)*150+40`, random ellipse angle `hash(k,9)`, radial-gradient alpha falloff. 8 per room.
3. **Edge gradients**: dark band under the wall (alpha .55 -> 0 over 16 px) and a floor-bottom shade, so tiles read as one lit room.
4. **Props placed off-grid** at hand-set pixel positions with per-prop origins; never on tile corners.
5. **Bake once** into one cached canvas (`HD.spr`), then let `GLPOST` lights/haze animate over it, so the pattern cost is zero per frame.
Add flips/rotations per cell as a sixth rule when you have only one tile (mirror when `hash(x+9,y)>0.5`). Check: view the baked room at 3x; if you can point at a repeating motif in under 5 seconds, add a variant.

## 5. Acceptance (honest status)
The anchors, recipe and pipeline are documented and reproducible from the repo. What is not verifiable here: that a *different* AI matches the reference art from the published frames alone; that needs a fresh run by that AI.
