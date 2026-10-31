# Four-style stills: how each was made, and what is weak (2026-10-31)
Frame 768x448, floor line y=300, feet y=392, figure height ~150 px, same x per moment (WALK / SHOOT / DOWN). Regenerate: `python3 render8.py; python3 render16.py; python3 renderhd.py; python3 render3d.py` (needs Playwright; 3D uses `vendor/three.cjs`).

| # | Style | What the renderer actually is | Frame ceiling |
|---|---|---|---|
| 1 | 8-bit cabinet | code-RENDERED: skeleton -> primitives -> 256x150 buffer, 2-band ramp shading + checker dither, 1 px outline, one shared 22-colour palette (verified: 22 unique colours across all three stills), x3 nearest | unlimited poses |
| 2 | 16-bit code-drawn | code-GENERATED sprites: `art/cast/gen_cast.py` parametric generator (palette ramps, seeded local detail, light layer), 56x44 frames at x4 on a 192x112 stage | finite: 23 frames per character (idle 4, walk 8, attack 5, hit 2, down 4); recolours free via ramps |
| 3 | HD art | code-RENDERED vector rig (SVG rasterised by Chromium): per-part gradients, rim highlights, glass/chrome, reflections, bloom, soft shadows, muzzle light. Not a filter over the pixel cast | unlimited poses |
| 4 | 3D | real three.js scene: perspective camera off-axis (~14 deg), extruded lockers, floor, shadow-casting key light, point light that fires with the muzzle; articulated figures (capsule limbs, box torso, sphere head), NOT billboards | unlimited poses |

## Known defects
**All:** zombies and soldier in styles 1/3/4 share one skeleton and part list, so poses are identical by construction (fair, but zombies move less differently than a hand-animated cast). The DOWN soldier lies flat with the rifle dropped; no blood/pool. Moment poses are single keyframes, no motion cue.
**1 8-bit:** zombie faces are 3-4 px, the eye/jaw read only by colour; the muzzle flash is a plain polygon; 22-colour budget forces one flat stage palette (lockers are simple slabs); dither on the muzzle glow is coarse. Variant skins were made more saturated than styles 2-4 to stay distinguishable inside 22 colours.
**2 16-bit:** the generated soldier is about 10% taller on screen than the other three (4x integer scale keeps the pixel grid honest, so it cannot be fitted to 150 px). The frame set is finite: SHOOT uses attack frame 1, the hit zombie uses hit frame 1 (frame 0 is a full white flash). Soldier face is only a few pixels. Cast is not integrated into a game yet.
**3 HD:** limbs are tapered capsules, so elbows/knees look rubbery; hands and feet are simple; zombie reflection is faint; faces are schematic (eye, mouth line, no nose). The "rig" is a procedural skeleton, not an authored illustration, so it does not reach painted-art quality.
**4 3D:** figures are low-poly primitives (no skinning, no real faces beyond spheres/boxes); the camera angle makes the floor line tilt slightly across the frame (matches y=300 only near the centre); the muzzle point light makes a bright floor pool below the gun, and a light bounce on the floor is unfiltered; no ambient occlusion or bloom pass beyond sprites. Soft shadows are PCF only.
**Fairness:** stage geometry/colours are matched by construction in 1-3; style 4 has real depth, so its wall and floor are lit differently (intentional, noted). Heights: styles 1/3/4 fitted to 150 px, style 2 ~165 px.
