# Automated Game Director & Deterministic Capture Guide

This guide documents the battle-tested patterns developed across **Hawk / Cinema City** and **Call of Karen: HOA Warfare** for programmatically scripting character controls, camera choreography, and deterministic game recording to generate viral 9:16 vertical shorts (TikTok, YouTube Shorts, Reels) and high-impact store trailers.

---

## 1. The Core Viral Engine Architecture

Capturing chaotic gameplay by accident produces inconsistent, low-converting videos. Programmatic control enables:
1. **Deterministic Sim & Replay:** Fixed delta-time stepping (`__capStep(dt)`) and seeded PRNG (`Math.random`).
2. **Actor Director / Puppeteer Script:** Scripted behavior trees that guide actors to execute combat combos, finishers, and dramatic poses on exact frame ticks.
3. **Cinematic Camera Choreography:** Camera orbits, slow-mo triggers (`slowat` / `slowdt`), and dynamic depth-of-field.
4. **Viral Layout Compositing:** 9:16 vertical canvas (1080x1920) with punchy meme hooks, real-time voice bark subtitles, and CTA watermarks.

```
┌────────────────────────────────────────────────────────┐
│ Headless Chrome (Playwright / CDP) @ 540x960 @2x      │
│  ├─ Seeded PRNG: window.__CAPM = true, s = 1234567    │
│  ├─ Deterministic Time: __capStep(1/30)               │
│  ├─ Director Script: window.__dir(D)                  │
│  │    ├─ Frame 0-30: Position & Cam Orbit             │
│  │    ├─ Frame 30-60: Approach target & bait attack   │
│  │    ├─ Frame 60-90: Trigger QTE / Finisher / Impact │
│  │    └─ Frame 90+: Slow-mo & ragdoll tumble          │
│  └─ In-Engine Shorts Compositor (or FFmpeg Post-Proc) │
└────────────────────────────────────────────────────────┘
```

---

## 2. In-Engine Hooks Pattern (Game Side)

To make any HTML5/JS/WebGL game scriptable for capture without modifying production code, expose standard capture hooks when `?cap=1` or `?spectate=1` is passed in the URL.

### A. Seeded PRNG (Deterministic Replays)
Place this at the very beginning of the initialization or inject via Chrome CDP / Playwright `addInitScript`:

```javascript
// Seeded Linear Congruential Generator (LCG)
window.__CAPM = true;
let s = 1234567;
Math.random = () => {
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 4294967296;
};
```

### B. Manual Step Loop (`__capStep`)
Decouple physics and rendering from `requestAnimationFrame`:

```javascript
let capMode = new URLSearchParams(location.search).has('cap');
let capDt = 1 / 30;

window.__capStep = function(steps = 1) {
  for (let i = 0; i < steps; i++) {
    const dt = window.__CAPDT || capDt;
    sim.step(dt);
  }
  renderer.render(scene, camera);
};

if (!capMode) {
  // Normal rAF loop
  function loop(time) {
    sim.step(1/60);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
```

### C. Director Input Injection
Allow an external Director script to override movement and actions per frame:

```javascript
// In player input handling:
function getPlayerMovement() {
  if (window.__CAPMV) {
    // [dx, dz] normalized in camera space
    return { x: window.__CAPMV[0], y: window.__CAPMV[1] };
  }
  return keyboardInput();
}
```

---

## 3. The Scripted Director Script (`dir.js`)

A Director script runs every simulation frame (`D.f++`). It inspects internal state and drives characters with frame-perfect precision.

### Example: Combo & Finisher Director (`dir_finisher.js`)

```javascript
// D = persistent director state object { f: 0, finAt: null, deadAt: null }
const C = window.__cel || window.game;
const H = C.hero;
const enemy = C.enemies.find(e => e.id === (D.tid || 0));

// Frame 0: Setup arena and initial positions
if (D.f === 0) {
  H.invincible = true;
  H.pos.set(-12.5, 0, 1.6);
  H.yaw = -Math.PI / 2;
  
  // Position enemy right in front of camera
  enemy.pos.set(-11.0, 0, 3.8);
  enemy.yaw = Math.PI / 2;
  
  // Align camera for dramatic angle
  C.camera.yaw = Math.PI / 2;
  C.camera.pivot.set(-12.5, 1.55, 1.6);
}

// Helper: move hero toward target (tx, tz) relative to camera forward
const moveTo = (tx, tz, stopDist) => {
  const dx = tx - H.pos.x;
  const dz = tz - H.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < stopDist) {
    window.__CAPMV = null;
    return dist;
  }
  const fwd = C.camForward(C.camera.yaw);
  const right = [-fwd[1], fwd[0]];
  window.__CAPMV = [
    (dx * right[0] + dz * right[1]) / dist,
    (dx * fwd[0] + dz * fwd[1]) / dist
  ];
  return dist;
};

// State Machine Execution:
if (C.inCinematicFinisher) {
  window.__CAPMV = null;
  if (!D.finAt) {
    D.finAt = D.f;
    console.log('DIR: Finisher started at frame', D.f);
  }
  return;
}

if (!enemy.alive) {
  window.__CAPMV = null;
  if (!D.deadAt) D.deadAt = D.f;
  if (D.f > D.deadAt + 30) return 'END'; // End capture 1 sec after death
  return;
}

// Stunned enemy -> Trigger QTE Finisher
if (enemy.isStunned) {
  const dist = moveTo(enemy.pos.x, enemy.pos.z, 1.4);
  if (dist < 1.6) {
    C.pressKey('e'); // Finisher interact key
    console.log('DIR: Executed Finisher Key at frame', D.f);
  }
  return;
}

// Normal engagement -> Close in and attack
const dist = moveTo(enemy.pos.x, enemy.pos.z, 1.2);
if (dist < 1.8 && D.f % 6 === 0) {
  C.pressKey('j'); // Attack key
}
```

---

## 4. Headless Frame Capture Engine (`cap.js`)

Using Playwright or Puppeteer to run the director and capture pixel-perfect 60fps / 30fps frames without frame drops:

```javascript
import playwright from 'playwright-core';
import fs from 'fs';

async function captureDirector(url, directorFile, outDir, totalFrames) {
  fs.mkdirSync(outDir, { recursive: true });
  const directorCode = fs.readFileSync(directorFile, 'utf8');

  const browser = await playwright.chromium.launch({
    args: ['--use-gl=angle', '--use-angle=metal', '--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 540, height: 960 }, // 9:16 vertical
    deviceScaleFactor: 2 // Output 1080x1920
  });

  // Inject deterministic seed
  await context.addInitScript(() => {
    window.__CAPM = true;
    let s = 1234567;
    Math.random = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  });

  const page = await context.newPage();
  await page.goto(url);
  await page.waitForFunction(() => window.__capStep != null);

  // Install director
  await page.evaluate(`
    window.__D = { f: 0 };
    window.__dir = function(D) {
      ${directorCode}
    };
  `);

  // Frame-by-frame loop
  let saved = 0;
  for (let f = 0; f < totalFrames; f++) {
    const status = await page.evaluate(() => {
      const res = window.__dir(window.__D);
      window.__capStep(1);
      window.__D.f++;
      return res;
    });

    const filename = `${outDir}/f${String(saved).padStart(5, '0')}.jpg`;
    await page.screenshot({ path: filename, type: 'jpeg', quality: 95 });
    saved++;

    if (status === 'END') break;
  }

  await browser.close();
  return saved;
}
```

---

## 5. Viral 9:16 Social Video Composition Rules

The highest converting short-form videos (TikTok, YouTube Shorts, Instagram Reels) follow a strict 4-layer composition:

| Layer | Position | Purpose | Style Specs |
|---|---|---|---|
| **Meme Hook Banner** | Top 15% (`y: 0..280px`) | Grabs attention in first 0.5s | Impact / Montserrat Bold font, black border, uppercase, e.g. `"POV: YOU DIDN'T MOW AT 7:00 AM"` |
| **High-Action Viewport** | Center 70% | Clean, uncluttered gameplay action | 9:16 crop focused on character combat, camera tracking, and impact sparks |
| **Dynamic Bark Subtitles** | Lower 15% (`y: 1400..1650px`) | Highlights voice acting / humor | Yellow `#FFE600` text with heavy black stroke, large font (52-64px), synced to audio barks |
| **CTA / Watermark** | Bottom Footer (`y: 1800px`) | Directs player to store | Monospace / Subtitle pill: `"CALL OF KAREN: HOA WARFARE - WISHLIST ON STEAM ($4.99)"` |

### FFmpeg Command for High-Framerate Encoding

Once frames are captured, stitch into high-bitrate H.264 MP4 with loudnorm audio:

```bash
ffmpeg -y -framerate 30 -i frames/f%05d.jpg -i voice_audio.wav \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -af "loudnorm=I=-14:LRA=7:TP=-1" \
  -movflags +faststart \
  output_short.mp4
```
