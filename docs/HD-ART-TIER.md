# Tier 4: HD Art (SVG skeletal rig + WebGL post)

Editions of one game (example: Vampire Metroid): g17 pixel, g17-hd painted, g17b HD+ game feel, g17c HD Art. All share gameplay; only rendering differs.

## Pipeline
1. Author characters as SVG in `kit/cabinet/art/*.svg`. Each limb is a `<g data-p="part">` (pack, legB, legF, armFar, torso, head, arm...). Use unique gradient IDs per file.
2. `node art/build-art.cjs` renders every part (4x, transparent, playwright) into `art/atlas.json` ({key:{url,w,h}}). `node art/render.cjs` writes a preview sheet to `out/art_sheet.png`.
3. In the game file: `RIG.def(name,{scale,anchor,order,pivots,attach})`, then `RIG.draw(g,name,x,y,{flip,sx,sy,a,tint,ta,pose})`. `pose` maps part -> `{rot,ox,oy,sx,sy}` about its pivot. Guard with `RIG.ready(name)` and fall back to the code-painted sprite (see `drawZomR`, `hPose`, `zPose`, `qPose` in `games/g17c.js`).
4. Register the id in `games.json` FIRST (build.py builds all games if the id is unknown), then `python3 build.py gN --art` -> `out/gN.art.html` (injects `HD_MODE`, `GLPOST_ON`, `ATLAS`).
5. `glpost.js` overlays a WebGL canvas `#gl` (copies `#screen` to a texture, one fragment shader: vignette, bloom, grade). Enabled only by `window.GLPOST_ON`; it silently stays off if WebGL is unavailable.
6. Check: `./check.sh gN 40`; view `ART=1 SEED=7 node snap.cjs gN 420 900`. `make-all.sh gN` does all tiers + Short.

## Rules
Original art only. No Math.random/Date.now. Keep gameplay untouched between tiers. Atlas adds about 1 MB per HTML file.
