# Cat Arcade Viral Polish & Engagement Specification

This document provides a complete guide to the Phase 2 Viral Engagement & Polish upgrades across the 30-game Cat Arcade suite. Any AI or developer extending, polishing, or fixing games should reference this specification to seamlessly incorporate and align with these mechanics without redundant architectural rework.

---

## 1. Design Philosophy: "Zero-Compromise Quality / Best Game First"

The arcade follows two non-negotiable pillars:
1. **Uncompromised Quality**: We do not artificially restrict games to flat beeps or rigid boxes when spring physics (`gptween.js`), 2D rigid bodies (`gpmatter.js`), Web Audio synths (`gpaudio.js`), or Three.js post-processing shaders (`gp3d.js`) make them 10x more fun.
2. **Instant Zero-Friction Web Delivery**: Pure ESM modules in `_vendor/` load in `< 200ms` with zero bundlers, zero build steps, and zero external runtime network dependencies.
3. **Ethical Progression**: All 20 heroes and 30 games are unlocked purely through gameplay skill and loop completions—no fake currency, no IAP, no predatory microtransactions.

---

## 2. The 7 Viral Mechanics & APIs

### 1. Near-Miss Bullet-Time (Graze Mechanics)
In top viral games, narrowly escaping danger produces an immediate adrenaline surge.

* **In 2D (`gp2d.js`)**:
  ```javascript
  // In game update loop:
  hazards.forEach(h => {
    // Standard collision (player dies)
    if (collides(player, h)) return g.end({ win: false });

    // Near-miss graze check (safe close brush)
    g.checkGraze(player, h, 36);
  });
  ```
  * **What it triggers automatically**:
    * Hit-stop slow motion (`g.slowmo(0.35, 0.18)`).
    * Golden screen flash (`g.flash('rgba(255,215,0,0.35)', 0.15)`).
    * Tactile ASMR sfx (`sfx('nearMiss')`).
    * Floating popup text (`+25 CLOSE!`).
    * Bonus score (+25 pts, or +50 pts during Fever Mode).
    * Marks `hazard._grazed = true` to avoid duplicate triggers.

* **In 3D (`gp3d.js`)**:
  ```javascript
  st.checkGraze(player.position, obstacle.position, 1.4);
  ```

---

### 2. Fever / Overdrive Mode
When players chain successful actions (e.g. 5 consecutive jumps, 3 gem pickups, or a 10x combo), reward them with an audiovisual dopamine rush!

* **API**:
  ```javascript
  g.triggerFever(4.5); // Activates 4.5 seconds of Fever Mode
  ```
* **Engine Behaviors During Fever**:
  * `g.fever > 0` tracks remaining duration.
  * Canvas automatically renders a pulsating rainbow border.
  * Near-miss graze points are doubled (50 pts).
  * Banner announcement (`🔥 FEVER MODE! 🔥`).
  * Upbeat audio chime (`sfx('fever')`).
  * Spring scale punch (`g.punch(g, 'k', 1.05, 0.3)`).

---

### 3. Comic Fail States & "SO CLOSE!" Screen
In casual games, a flat "GAME OVER" causes churn. A near-win (70%+ progress) triggers the "near-win effect" that makes players immediately tap for one more run.

* **API**:
  ```javascript
  // Pass progress (0.0 to 1.0) on round end:
  g.end({ win: false, score: g.score, progress: distance / targetDistance });
  ```
* **Display Logic**:
  * If `progress >= 0.70` or `score >= best * 0.70`:
    * Headline switches from red "GAME OVER" to golden/amber "SO CLOSE!".
    * Renders an animated progress bar with `💥 XX% COMPLETED! 💥`.
    * Prompt changes to `👉 tap for 1 more run! 👈`.

---

### 4. Tactile ASMR Sound Design (`kit/gpaudio.js`)
Flat beeps have been replaced with crisp, layered micro-synthesizers.

* **Available Sound Effects (`sfx(type, { pitch, vol })`)**:
  * `sfx('nearMiss')` – Deep whoosh & resonant frequency drop for bullet-time.
  * `sfx('fever')` – Upbeat multi-oscillator celebratory chime.
  * `sfx('squelch')` – Satisfying organic squish.
  * `sfx('clack')` – Snappy mechanical wood/stone click.
  * `sfx('bubble')` – Bubbly water pop.
  * `sfx('chime')` – Harmonic triple-sine chord.
  * `sfx('glassCrack')` – High-frequency crunch for breaking blocks or opening capsules.
  * Classic sfx: `jump`, `coin`, `hit`, `boom`, `shoot`, `laser`, `pop`, `ding`, `thud`, `win`, `lose`.

* **Polyphonic Synthesis & BGM**:
  ```javascript
  import { playTone, playChord, startBgm, stopBgm } from '../_vendor/gpaudio.js';

  // Play melodic chord
  playChord([261.63, 329.63, 392.00]); // C-major triad

  // Start procedural rhythmic background music
  g.bgm({ bpm: 128, pattern: [261.63, 293.66, 329.63, 392.00] });
  g.stopBgm();
  ```

---

### 5. Wordle-Style 1-Tap Emoji Flex Card
Players can copy and share an emoji scorecard summarizing their run directly to social channels or messaging apps with one tap.

* **Visual Output**:
  ```
  🐱 CAT ARCADE HUB
  🟩🟩🟩🟩🟩
  🟩🟩🟨🟩🟩
  🏆 28/30 Won · Best: 24,180 pts
  👉 https://bparlette.github.io/Hawk/brad-demos/g/arcade/index.html
  ```
* **Implementation**:
  * Integrated on the Hub `scorescr`, `loopscr`, and `upsell` screens.
  * Integrated on all 4 pack runners (`action-demo`, `brains-demo`, `action15`, `brains15`).
  * Uses `navigator.clipboard.writeText()` with fallback prompt.

---

### 6. Gacha Prize Capsule Dispenser
Replacing static unlock buttons with an interactive, physical reward moment when a loop is completed.

* **Visual Presentation**:
  * Renders a vintage arcade prize capsule machine with bouncing two-tone spheres in a glass globe.
  * When the player presses `UNLOCK`, the turn-crank spins.
  * A golden capsule drops into the chute, wobbles with spring physics, and cracks open with `sfx('glassCrack')` and confetti particles, revealing the new Hero character.
* **Strict Ethical Guardrail**:
  * Zero microtransactions. The capsule dispenser operates purely on earned loop victories.

---

### 7. Greed Traps (High-Risk/High-Reward Collectibles)
In platformers, runners, and obstacle courses:
* Place golden coins/fish right on crumbling edges, under falling stompers, or between laser sweeps.
* Pair collection with `g.checkGraze()` so players skimming the hazard boundary earn double rewards.

---

## 3. Architecture & Integration Contract

### Repository Structure
```
hawk-main/brad-demos/g/
  ├── _vendor/            # Shared engines (gp2d, gp3d, gpaudio, gptween, gpmatter, gsap, tone, matter, three)
  ├── arcade/index.html   # 30-game central arcade hub with hero select and capsule dispenser
  ├── action-demo/        # 5-game Action Pack demo
  ├── brains-demo/        # 5-game Puzzle/Strategy Pack demo
  ├── action15/           # 15-game Action Pack
  ├── brains15/           # 15-game Puzzle/Strategy Pack
  └── <game-id>/          # 30 individual standalone games (e.g. one-tap-reflex, rail-runner, bullet-heaven, etc.)
```

### Automation & Testing Rules
1. **Preserve `postMessage` Lifecycle**:
   * On game boot / first input: `parent.postMessage({ gp: 'started' }, '*')`.
   * On game over / win: `parent.postMessage({ gp: 'end', id, win, score }, '*')`.
2. **Preserve Autonomous Bot Loop (`?auto=1`)**:
   * All games must inspect `g.dumb()` or `st.dumb()`. On attempt 0, bots deliberately fail first (to capture the fail state for marketing trailers), auto-restart after 2.4s, and then win.
3. **Preserve Pure ESM / No Bundlers**:
   * Do not introduce `npm run build` or bundler steps for the games. Every game must open directly in any browser over HTTP or GitHub Pages.
4. **Unit Tests**:
   * Run `npm test` in `gamepress`. All 235 tests must remain 100% green at all times.
