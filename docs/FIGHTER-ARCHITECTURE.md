# FIGHTER ARCHITECTURE: High-Fidelity 1-Round Fighter Engine

Based on the verified architecture of **Neon Alley Brawl** (the golden standard for single-file, 1-round procedural fighting game demos), this specification defines how Gamepress builds commercial-grade, high-tempo 2D fighters with pixel-perfect physics and zero asset bloat.

---

## 1. Resolution & Pixel-Art Scaling Contract
- **Native Resolution**: `W = 384, H = 216` (16:9 arcade display), Ground line at `GY = 198`.
- **9:16 Vertical Short Mode**: `VW = 384, VH = 683, VOFF = 233`.
  - The 16:9 active combat arena is rendered cleanly at `y = VOFF`.
  - Upper band: Stylized title marquee and dynamic high-contrast battle captions.
  - Lower band: Super meter status, combo streak tickers, and call-to-action.
- **Rendering Rule**: `imageSmoothingEnabled = false` on ALL canvas buffers and viewports. CSS integer scale (`1x, 2x, 3x`) with `image-rendering: pixelated`.

---

## 2. Sprite Method: Real Sprite Sheets vs Procedural Rasterizer
**The resolution, palette, and sprite method are the user's explicit choice.**
- **Real Sprite Sheets (Default / Preferred First Replacement)**:
  - When real sprite sheets (PNG atlases with idle, walk, punch, kick, hadouken, shoryuken, hurt, ko frames) are available or requested, **replace the procedural code-rasterizer first**.
  - Frame mapping uses clean atlas rectangles `[x, y, w, h]` or texture slices directly into `SP[fighter][poseName]`.
  - Enables authentic arcade fidelity (e.g. authentic Street Fighter, Darkstalkers, or custom pixel sheets) without compromising the game loop, combat logic, hitboxes, or audio.
- **Code-Driven Fallback (`kit/gpfighter.js`)**:
  - When no sprite sheet assets exist on disk, use the procedural skeletal pipeline (joint poses -> `lineR` limb segments -> black outline pass -> 3D directional light shading -> hit flash white mask) to build a standalone self-contained fighter with zero dependencies.

---

## 3. High-Tempo 1-Round Match Progression (Zero Dead Time)
A demo video or 1-round arcade brawl must NEVER have idle fighters standing around waiting:

```
0.0s - 0.8s:  [INTRO] Announcer "ROUND 1 · FIGHT!". Fighters immediately sprint into active combat range.
0.8s - 2.0s:  [CLASH] Projectile / Blast launch -> Mid-air projectile cancellation with particle burst.
2.0s - 3.8s:  [PRESSURE] High jump-in attack, crouching counter-sweep, and heavy block stun.
3.8s - 5.5s:  [BAIT & COUNTER] Whiffed heavy attack punished with frame-1 multi-hit combo (3-hit/5-hit combo ticker).
5.5s - 7.5s:  [CLIMAX] Super Meter reaches 100% (flashing white) -> Cinematic EX move / Shoryuken launch.
7.5s - 9.0s:  [K.O. & INSTANT REPLAY] Fatal impact -> Hit-stop freeze (300ms), 2x camera zoom on loser, slow-mo (0.3x), screen rumble, and instant half-speed replay.
```

---

## 4. Combat Mechanics & Frame Data
- **Active Frames**: Attacks only deal damage during `[startFrame, endFrame]`, strictly evaluated once per swing (`f.hit = true`).
- **Hit Invulnerability**: Once struck into `hurt` state, target possesses 10 frames of invulnerability to prevent multi-hit frame traps unless juggled.
- **High/Low Mixup**:
  - High punches miss crouching targets.
  - Low sweeps miss jumping targets.
  - Uppercuts possess anti-air priority and launch grounded/airborne opponents.
- **Block Physics**: Holding back away from opponent reduces incoming damage to 15%, halves knockback, and triggers guard spark audio.

---

## 5. Web Audio Chiptune & Synthesizer (`gpaudio.js` / Web Audio)
- **Zero Audio Files Required**: 100% procedurally synthesized in real-time.
- **Yamaha YM2151 FM Synth Emulation**:
  - Chiptune bass groove: Triangle wave on even 16th steps.
  - Square wave arpeggios on odd steps.
  - Sine drop kick on step 0, filtered white-noise snare on steps 4 and 12.
- **Dynamic SFX**:
  - `whoosh`: bandpass-filtered noise sweep.
  - `heavy_hit`: 140Hz square drop to 35Hz + punchy transient.
  - `clash`: 1600Hz / 2400Hz sine ping.
  - `ko`: 90Hz sawtooth exponential decay with low-frequency rumble.
