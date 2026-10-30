# Getting from rich 8-bit to painted-HD (the "Last Extract" look)
The cabinet renders a 256x224, 22-colour indexed buffer, so it tops out at rich 8-bit. A painted look needs: (1) a higher-res canvas (e.g. 640x360 RGBA) with a `?hd=1` shell path that skips the palette, (2) real sprite sheets (hand-drawn or generated, transparent PNG, 3-4 frame walk cycles, base64 inlined) drawn with `drawImage`, (3) layered parallax room backgrounds as images, (4) lighting: radial gradients + additive blend glows, (5) particles/screen shake, (6) the same GAME contract and bots, so every game keeps working. Plan: add `core-hd.js`, keep games on `kit()` and `ART` facades, port one game (Vampire Metroid) first, compare against the reference frame.

## Status: HD path exists (Vampire Metroid HD)
- Build: `python3 build.py gN --hd` -> `out/gN.hd.html` (768x672 canvas, ctx pre-scaled 3x so drawing uses the same 256x224 logical coordinates as the rules). Without `--hd` nothing changes.
- A game opts in by adding `drawHD(S, g, mode)` to its `kit({...})`. Rules, bot, seeds and `hud()` text are shared, so pixel and HD editions play identically.
- `hdkit.js` (global `HD`): `spr` (paint once into a cached canvas), `put`, `part`/`ball` (gradient + outline shapes), `shadow`, `glow` (additive), `grain`, lighting (`beginLight/addLight/endLight` = dark layer cut by gradients), `burst/parts` particles, `bar`. Reference implementation: `games/g17.js` (heroHD, zomHD, queenHD, roomHD, drawHD).
- Judge with `HD=1 node snap.cjs gN 700 1500`.
- Pipeline for all three versions: docs/HOWTO-THREE-VERSIONS.md (make-all.sh).
- Next: port more games by copying the g17 pattern (painted room + 3-4 sprite frames + light pass); real raster art would replace `HD.spr` painters with inlined PNGs.

## Tier 4 added
SVG skeletal rigs (`rigkit.js`, `art/`) and a WebGL post pass (`glpost.js`) are the fourth tier. See `HD-ART-TIER.md`. Remaining gaps: environment art still code-painted; no real lighting normals; no particles in shader.
