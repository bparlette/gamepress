# The kit (`kit/` -> `<games>/_vendor/`)

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
| `gpfeel.js` | both | Nintendo-decomp-derived feel: `characterStep()` (4x sub-stepping, coyote time, jump buffering), `updateCamera()` (Lakitu occlusion), `VirtualAPU` (4-ch voice stealing), `DeterministicRNG` (LFSR). See `docs/NINTENDO-FEEL.md`. |
| `gpretro.js` | 3D/2D | Retro rendering: `bayerDither` (RGB555 GLSL), `vertexSnap` (fixed-point jitter), `affineWarp` (PS1 texture swimming), `lowResTarget` (320x240 nearest-neighbor), `mode7Ground` (SNES pseudo-3D), `scanlines`. |
| `gpshaders.js` | 3D | Ready-to-use retro effects for Three.js materials (onBeforeCompile wrappers over `gpretro.js` GLSL): `vertexJitter(material, intensity)`, `bayerDither(material)`, `scanlines(material)`, `applyRetro(material, opts)`, `applyRetroAll(scene, opts)`. Demo-stage visual polish. |
| `gbfixed.js` | ROM | 8.8 fixed-point math for homebrew: `f2x`/`x2f`/`fmul`/`fdiv`, `Fixed` sub-pixel accumulator class. Integer-only hot paths for SNES/Game Boy targets. See `docs/tracks/port.md`. |
| `gpmonetize.js` | all | Day-1 monetization: `requestRewarded`/`requestInterstitial` (CrazyGames/Poki SDKs, graceful fallback), `showPaywall` (1-tap Stripe overlay), `generateShareText`/`copyShareText`/`shareScore` (Wordle-style emoji cards). See `docs/tracks/monetize.md`. |

### Recommended external tools (not kit files — workflow integrations)

| Tool | Use for | Integration |
|---|---|---|
| **img2threejs** ([github.com/img2threejs/img2threejs](https://github.com/img2threejs/img2threejs), Apache 2.0) | 2D image → procedural Three.js hero asset (pivots, sockets, <1,200 polys; no binary blobs) | `gamepress auto --prompt` asks "Start from an image?" first; `--from-image` skips the question. Templates in `lib/img2threejs.mjs`. Full pipeline: `docs/IMG2THREEJS-WORKFLOW.md`. |
| **REA** ([github.com/morluto/rea](https://github.com/morluto/rea), MIT) | Agent-native reverse engineering: extract physics/logic from binaries, WASM, web games with an evidence trail for clean-room reimplementation | Install: `npx rea-agents setup`. See `docs/tracks/port.md`. |
| **Kokoro** ([github.com/thewh1teagle/kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx), MIT) | Local text-to-speech for trailer voiceovers and in-game voice lines. CPU-friendly ONNX, ~300MB, zero API cost — unblocks audio-first video production | `pip install kokoro-onnx`; download `kokoro-v1.0.onnx` + `voices-v1.0.bin` from the repo's releases. |

Rules for kit changes: keep it dependency-free, deterministic, and backward compatible; run `gamepress botcheck` on a few recipes after touching it.
