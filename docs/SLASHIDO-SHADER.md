# SLASHIDO Painted Shader — gamepress port

Ported from the SLASHIDO/Slashers Paradise rendering source (shared via hark.site for study).
The look: 3D primitives rendered as painted game illustrations — Street Fighter V style.

## The 90/10 rule

SLASHIDO's characters are spheres and capsules — same as our gpchar output.
The difference is entirely rendering: **~90% shader and lighting, ~10% models.**

## Files

| File | What it does |
|---|---|
| `kit/slashido/1_toon_shader.js` | Custom toon ShaderMaterial: 3-tone ramp with noise-broken (painted) band edges, hue-shifted shadows, object-space stains/dirt, vertical gradient, dual rim lights (cool moon / warm fire), brush modulation, fog, kill tint. Plus `inked()` for inverted-hull ink outlines. |
| `kit/slashido/2_post_processing.js` | `Post` class: renders scene to half-float RT, then composite pass = Kuwahara paint filter → bloom → color grade (cool shadows/warm highlights/saturation 1.25) → paper grain → vignette. `setQuality('low')` disables paint + bloom for phones. |
| `kit/slashido/3_character_material.js` | `toonMat(opts)` — builds a toon material from plain options (`color`, `shade`, `stain`, `rim`, `emissive`, etc.). `autoShade()` derives painterly shadows when not specified. Includes `hollowMaterials()` as a usage example. |
| `kit/slashido/4_mapped_toon.js` | gamepress glue: extends the toon shader with texture-map support (`uMap`) so gpchar's painted face/gi textures survive the material swap. Auto-detects: original material had a canvas map → mapped toon, else flat toonMat. |

## Quick start

```js
import { buildHumanoid } from '../kit/gpchar.js';
import { toonMat, LIGHT } from '../kit/slashido/3_character_material.js';
import { inked } from '../kit/slashido/1_toon_shader.js';
import { Post } from '../kit/slashido/2_post_processing.js';
import { swapToToon } from '../kit/slashido/4_mapped_toon.js';

// 1. Build character normally
const rig = buildHumanoid({ gi: 0xf2ede2, hair: 'topknot' });

// 2. Swap materials to painted toon + add ink outlines
swapToToon(rig.group); // handles texture-mapped materials automatically

// 3. Set up lighting (warm key + cool fill for studio, or moon/fire for night)
LIGHT.uMoonCol.value.setRGB(0.92, 0.87, 0.80);

// 4. Post pipeline
const post = new Post(renderer, 'high');
// in render loop: post.render(scene, camera, time) instead of renderer.render()
```

## The 5 techniques (in impact order)

1. **Painted toon ramp** — 3 tones, band edges broken by object-space fbm noise (`bn*0.35`). This alone is most of the "painted" feel.
2. **Hue-shifted shadows** — never `base * 0.5`. Shadows rotate hue toward blue/purple, boost saturation, lightness × 0.42, mix 25% toward navy `#1c2340`.
3. **Dual rim lights** — fresnel rim colored cyan on the key-light side, orange on the accent side. Separates characters from backgrounds.
4. **Ink outlines** — inverted hull (BackSide, pushed along normal, thickness scales with camera distance). Fade to fog color at distance.
5. **Kuwahara paint filter** — per-pixel, picks the lowest-variance quadrant. Flattens render into brush-like patches while preserving edges.

## What NOT to do

Per the SLASHIDO author: don't try to fix the look with more polygons or higher-res textures. The problem is almost always **light and value**: clear light direction, warm/cool contrast, colored shadows, subject brighter than background, strong silhouette.

## Dependencies

- `three` (tested with 0.160–0.169)
- `three/examples/jsm/utils/BufferGeometryUtils.js` (for `mergeVertices` in outline smoothing) — vendored at `kit/vendor/`

## Source

Original: SLASHIDO/Slashers Paradise v0.3.0 rendering source, shared for study.
The ported files retain the original comments and tuning values.
