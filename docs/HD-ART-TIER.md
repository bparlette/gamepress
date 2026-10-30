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

## Tier 5: HD Lux (g17d): SVG environment + WebGL lights
- Environment: `art/env_floor.svg` (parts a/b/c), `env_wall.svg`, `env_props.svg` (crate/barrel/table/locker) -> atlas keys `envF.a`, `envW.wall`, `envP.crate`... `roomEnv()` in `games/g17d.js` composites them into a cached 256x224 sprite and falls back to `roomHD()` until images load.
- Lighting (`glpost.js`): per frame call `GLPOST.clear()`, then `GLPOST.light(x,y,radius,intensity,[r,g,b])` (max 8, coords normalised 0..1 of the screen; convert world->screen with the camera: `(x-cx)*z+128+shakeX)/256`). The shader derives a pseudo-normal from luminance and adds diffuse + specular.
- Haze: `GLPOST.hazeAt(x,y,r,strength)` (max 3) warps the image around explosions.
- Screen FX: `GLPOST.fx = {ca, hurt, flash, ember}` (chromatic kick, red low-HP vignette, white flash, drifting embers).
- Build: add id to games.json, `python3 build.py gN --art`.
Limits: normals are fake (luminance), so flat art lights flat; embers are procedural, not simulated.
