# Brief for an AI that can make painted raster art (give this whole file to it)

Goal: replace the hand-drawn SVG characters/environment in the "Vampire Metroid" cabinet game with painted, high-detail raster art in the style of mobile hit "Last Extract" (Voodoo): chunky cartoon proportions, thick soft outlines, rich gradients, rim light, saturated colours, dark moody lab-floor world. Original characters only (do not copy any existing game's characters).

## What to deliver
Layered transparent PNGs, one file per body part, plus full-body previews. All parts of one character share one canvas size and are painted in place in the neutral pose (so stacking all parts reproduces the character).

| set (folder under `kit/cabinet/art/painted/`) | canvas aspect | suggested px | parts (file names, back to front) |
|---|---|---|---|
| `hero` | 120:150 | 960x1200 | `pack, legB, legF, armFar, torso, head, arm` (arm holds nothing; gun is separate) |
| `zombie`, `zombieR` (fast, lean, orange hoodie), `zombieT` (slow, fat, purple coat), `elite` (pale, spiky hair) | 120:150 | 960x1200 | `legB, legF, armFar, torso, head, arm` |
| `queen` (hive boss, huge) | 160:140 | 1280x1120 | `legsL, legsR, body, head` |
| `gun` | 3:1 | 720x240 | `all` |
| `envF` floor tiles (seamless, top-down 3/4 view, steel plates) | 1:1 | 256x256 | `a` plain, `b` grate with green glow, `c` cracked |
| `envW` wall (brick, bottom edge darker) | 32:18 | 512x288 | `wall` |
| `envP` props sheet (crate, barrel, lab table with flasks, locker) | 10:3 | 1600x480 | `crate, barrel, table, locker` each at fixed spots, see `art/env_props.svg` |

Look at the current SVG versions first as the layout/pose reference: `kit/cabinet/art/*_rig.svg` and the contact sheet `node art/render.cjs hero_rig.svg zombie_rig.svg` -> `out/art_sheet.png`. Rules (facing right, feet at ~(50%, 94%) of the canvas, pivots at hip/shoulder/neck, near arm points along +x at rest) are in `docs/ART-CONVENTIONS.md`. Keep characters 15-25 logical units tall, readable at 60 px on a phone, strong silhouette, light from top-left, 1-2% of canvas as outline.

## Suggested workflow
1. Generate one clean full-body concept per character (neutral side/3/4 pose, plain background) with an image model. Keep a consistent style line: "stylized 2D mobile game character, thick clean outline, soft gradient shading, rim light, saturated colours, transparent background, full body, facing right".
2. Split into parts: either generate parts directly (prompt each limb separately on a plain background, same scale) or cut the full body into layers (Photopea/Krita/Segment Anything) and inpaint hidden areas (behind-arm torso, neck under head, far leg) so rotating a part never shows a hole.
3. Remove background (rembg), export each part as same-size transparent PNG into `kit/cabinet/art/painted/<set>/<part>.png`.
4. Pack and build: `source env.sh && node art/build-art.cjs && node art/pack-painted.cjs && python3 build.py gN --art` (pack overrides only the keys you supplied; anything missing keeps the SVG art). The script skips files whose aspect is wrong and says why.
5. Verify: `ART=1 SEED=7 node snap.cjs gN 420 900` and LOOK; check joints at the walk/aim poses. If a part seems to float, adjust `pivots` in the game's `RIG.def` (SVG units of the 120x150 box), not the PNG.

## Links that help (verify they are current before relying on them)
- Image generation APIs/tools: OpenAI image generation guide https://platform.openai.com/docs/guides/image-generation, Google Gemini image generation https://ai.google.dev/gemini-api/docs/image-generation, Stability AI https://platform.stability.ai/docs, Adobe Firefly https://firefly.adobe.com, Leonardo https://leonardo.ai, Midjourney https://www.midjourney.com, Scenario (game-asset focused, consistent-style models) https://www.scenario.com
- Background removal / cutting: rembg https://github.com/danielgatis/rembg, Segment Anything https://segment-anything.com, Photopea (browser layered editor) https://www.photopea.com, Krita https://krita.org
- Rigging a painted character (alternatives to this kit's rig): Spine https://esotericsoftware.com, DragonBones https://github.com/DragonBones/DragonBonesJS
- Free asset sources/style references (check licences): https://kenney.nl/assets, https://opengameart.org, https://itch.io/game-assets
- Reference game for the target look: search "Last Extract Voodoo" (screenshot only as inspiration; do not copy its characters).

## Acceptance
`node tiers.cjs` still passes (art never changes rules), `./check.sh gN 40` has no errors, atlas size stays under ~6 MB (resize PNGs to the suggested px and quantize if needed), and a human compares `snap` frames before/after.
