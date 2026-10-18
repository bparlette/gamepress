# The kit (`kit/` -> `<games>/_vendor/`)

Feel constants and their sources: `docs/NINTENDO-FEEL.md`. Recipe wiring: `docs/RECIPES.md`.

`gamepress make` copies the kit next to your games (`syncKit`), so every game imports `../_vendor/<file>.js`.

| File | For | What it gives you |
|---|---|---|
| `gp2d.js` | 2D games | `createGame({id,title,sub,hook,bg,style})`: 540x960 canvas, fixed 1/60 step, touch + keys, `g.btn` on-screen buttons, juice (`hitstop slowmo shake flash popup burst tween showBanner`), title/pause/results/replay/best, 6 art styles, `?auto` bot hook (`g.dumb()`), `g.end({win,score})` (banner always visible), `window.__game`, `window.__ends`. Re-exports `gpmath` and `sfx`. |
| `gpmath.js` | all | seeded `R rnd ri pick shuffle chance`, `clamp lerp dist ang smooth ease.*`, `aabb circ inRect`, `shade`, `tweens`. |
| `gpaudio.js` | all | layered `sfx(type,{pitch,vol})` (jump coin hit boom shoot laser pop ding click merge powerup thud step whoosh meow bark groan win lose tick), `comboPitch(n)`. |
| `gpsprites.js` | 2D | `cat dog zombie person` side-view characters (`drawChar(kind,...)`), `face`, `heart star coin ship`; style-aware outlines. |
| `gpphys.js` | 2D | `World` (circles, gravity, walls, impulses: merge, peggle), `Terrain` (destructible heightfield: artillery), `moveBox` (tile platformer movement). |
| `gpgrid.js` | 2D | `tileMap` (ASCII), `bfs`, `DIRS`, `manhattan`. |
| `gp3d.js` | 3D | `createStage` (three.js r160, 6 styles incl. post-process), input, HUD, `st.shell/st.end/st.rearm`, juice, `st.cine` camera moves. |
| `gpkit.js` | 3D | toon material, merged low-poly models (cat dog zombie person crowd tree house tower bus car barrel bench coin), instanced `crowd` with walk cycle, `hero`, `particles`, `sky`, `groundTex`. |
| `gplego.js` | both | composable mechanic blocks for brand-new hybrids (`gamepress lego`). |
| `gpfeel.js` | both | Nintendo-decomp-derived feel: `characterStep()` (4x sub-stepping, coyote time, jump buffering), `updateCamera()` (Lakitu occlusion), `VirtualAPU` (4-ch voice stealing), `DeterministicRNG` (LFSR), `spectateCamera()` + `parseSpectateParams()` (attract mode — docs/SPECTATE.md). See `docs/NINTENDO-FEEL.md`. |
| `gpretro.js` | 3D/2D | Retro rendering: `bayerDither` (RGB555 GLSL), `vertexSnap` (fixed-point jitter), `affineWarp` (PS1 texture swimming), `lowResTarget` (320x240 nearest-neighbor), `mode7Ground` (SNES pseudo-3D), `scanlines`. |
| `gpshaders.js` | 3D | Ready-to-use retro effects for Three.js materials (onBeforeCompile wrappers over `gpretro.js` GLSL): `vertexJitter(material, intensity)`, `bayerDither(material)`, `scanlines(material)`, `applyRetro(material, opts)`, `applyRetroAll(scene, opts)`. Demo-stage visual polish. |
| `gpfx.js` | both | Fullscreen post-processing game effects (WebGL2, zero deps, engine-agnostic): `new PostFX(gameCanvas)` then `fx.render(dt)` each frame. `fx.glitch.burst(s)` — screen tear + RGB split on big hits; `fx.vhs.set(true)` — CRT overlay (tracking wobble, scanlines, grain, vignette) for retro mode/trailers; `fx.shatter.trigger()` — voronoi screen-break on death/game-over; `fx.ripple.trigger(x, y)` — shockwave refraction at a point. Standalone 2D helpers: `applyVHSOverlay(canvas)` (static CRT for title screens), `glitchFrame(canvas)` (one-shot glitch for thumbnails/trailer cards). Shader techniques adapted from Canvas UI (MIT). Complements `gpshaders.js` (material-level) — gpfx is screen-level. |
| `gbfixed.js` | ROM | 8.8 fixed-point math for homebrew: `f2x`/`x2f`/`fmul`/`fdiv`, `Fixed` sub-pixel accumulator class. Integer-only hot paths for SNES/Game Boy targets. See `docs/tracks/port.md`. |
| `gpmonetize.js` | all | Day-1 monetization: `requestRewarded`/`requestInterstitial` (CrazyGames/Poki SDKs, graceful fallback), `showPaywall` (1-tap Stripe overlay), `generateShareText`/`copyShareText`/`shareScore` (Wordle-style emoji cards). See `docs/tracks/monetize.md`. |
| `gpviewport.js` | all | Safe-zone helpers for the viral pipeline: tightened caption/action zones, `actionBand()`/`captionZone()` for 9:16 safe areas, 1.35x FOV compensation. Used by `drive` caption layout. |
| `gptouch.js` | mobile | Modern mobile touch standard: floating virtual joystick on the left half (anchors under the thumb), circular action buttons on the right (`TouchController`, PointerEvent `pointerId` isolation, `getInput()` with auto-consuming `*Pressed` edges). No-op on desktop; `?touch=0` forces off. See `docs/TOUCH.md`. |
| `gpstyle.js` | 3D (+2D) | Visual standards from Cherie's favorite games: `applyVisualStandard(scene, camera, renderer, preset)` sets up lighting/fog/materials in one call. Presets: `cel` (Cel City toon + outlines + halftone), `shellshock` (Shell Shock 3D night city), `hoa` (HOA Warfare daytime + shadows), `roadkill` (Roadkill Rig desert toon + sky dome), `blox-fruits` (tropical anime archipelago + fruit-power particles + chunky UI), `shellshock-live` (2D painted brawler glow), `shellshock-16bit` (2D pixel art), `crystal-cave` (2.5D emissive crystals). Includes `PALETTES`, `makeToonMaterial()`, `withOutline()`, `portraitFov()`, `makeBloxParticles()`, `bloxHUD`, `makeSkyDome()`. See `docs/VISUAL-STANDARDS.md`. |
| `gplevels.js` | both | Multi-level progression for full-game expansions: `createLevelManager()` (unlock/star/save schema), `createCamera()` (follow + world-bounds clamp). Injected by `gamepress expand`. |
| `gpchar.js` | 3D | Procedural characters — zero model files: `buildHumanoid()` (real ~7.5-head proportions, sphere head with face, tapered torso, jointed limbs, hair/headband variants), `buildBunny()`/`buildCat()`/`buildDog()` (silhouette-first animals), `setPose()`/`update()` (damped procedural animation: idle/guard/walk/crouch/weapon-aware attacks/hit/dead/victory). See Character Design Rules in `docs/VISUAL-STANDARDS.md`. |
| `three.module.min.js` | 3D | Vendored three.js r160 (single file, no npm). Imported by `gp3d.js`/`gpkit.js`. |

### Recommended external tools (not kit files — workflow integrations)

| Tool | Use for | Integration |
|---|---|---|
| **img2threejs** ([github.com/img2threejs/img2threejs](https://github.com/img2threejs/img2threejs), Apache 2.0) | 2D image → procedural Three.js hero asset (pivots, sockets, <1,200 polys; no binary blobs) | `gamepress auto --prompt` asks "Start from an image?" first; `--from-image` skips the question. Templates in `lib/img2threejs.mjs`. Full pipeline: `docs/IMG2THREEJS-WORKFLOW.md`. |
| **REA** ([github.com/morluto/rea](https://github.com/morluto/rea), MIT) | Agent-native reverse engineering: extract physics/logic from binaries, WASM, web games with an evidence trail for clean-room reimplementation | Install: `npx rea-agents setup`. See `docs/tracks/port.md`. |
| **Kokoro** ([github.com/thewh1teagle/kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx), MIT) | Local text-to-speech for trailer voiceovers and in-game voice lines. CPU-friendly ONNX, ~137MB (int8), zero API cost — unblocks audio-first video production | `gamepress setup` (one-time model download, never committed) → `gamepress voice "script" --voice trailer\|character\|narrator --out out.wav`. Wrapper: `lib/tts.mjs` (`speak()`), bridge: `lib/tts_bridge.py`. |

### Voice (Kokoro TTS)

One-time setup (downloads the model, ~137MB, into `~/.gamepress/tts/` — never committed):

```sh
gamepress setup --tts
```

Then synthesize from the CLI:

```sh
gamepress voice "What if Vampire Survivors had Mario physics?" --voice trailer --out trailer-vo.wav
gamepress voice "Touchdown! Unbelievable run!" --voice character --out call.wav
gamepress voice "Previously, on Pigskin Bowl..." --voice narrator --out intro.wav
# any raw Kokoro voice id also works: --voice am_michael
# JSON for scripts: gamepress voice "..." --json
```

From another agent or script (`lib/tts.mjs`):

```js
import { speak } from './lib/tts.mjs';
const r = speak('One fat runner. One thousand defenders.', { voice: 'trailer', output: 'vo.wav' });
// → { file, seconds, voice, speed, sample_rate, ... }
```

Presets: `trailer` (deep, slow — `am_adam` @ 0.85x), `character` (energetic — `af_sky` @ 1.15x),
`narrator` (neutral — `af_sarah` @ 1.0x). Long text is auto-chunked on sentence
boundaries and concatenated. Model dir override: `GAMEPRESS_TTS_DIR`.

Rules for kit changes: keep it dependency-free, deterministic, and backward compatible; run `gamepress botcheck` on a few recipes after touching it.
