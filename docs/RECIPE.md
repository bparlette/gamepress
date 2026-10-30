# Cabinet recipe: NES-style single-file demos

Source: `kit/cabinet/` (shell + six reference games). Build: `python3 kit/cabinet/build.py [g1..g6] [--out DIR] [--local-font]`.
Test: `node kit/cabinet/test.cjs g1 60 [seed]` (headless bot run, screenshots, errors) and `node kit/cabinet/seedcheck.cjs` (determinism proof). Both need Playwright.

## 1. Brief recipe (one per game)
Write these seven lines before any code. Every shipped game was designed from exactly this shape:
1. **Host game**: camera, core verb, the loop (e.g. Paperboy: side-scroll, throw at mailboxes).
2. **Donor mechanic**: the single rule or system bolted on (e.g. Road Rash: punch rival riders).
3. **Verbs**: D-pad plus A and B only. Name what A and B do in the pad labels (`la`, `lb` in `build.py`).
4. **Win**: survive a timer, clear a count, reach a goal gate, or KO a boss. Message must match `/CLEAR|WIN|KO!|FINISH/` to play the win jingle.
5. **Lose**: HP, lives or a timer. Anything else plays the game-over jingle.
6. **Attract bot**: `bot()` must play the game unattended and mostly survive (it is the title-screen demo and the QA oracle).
7. **Tell and counter**: every enemy threat telegraphs, and every telegraph has an answer on A, B or the D-pad.

## 2. The `GAME` contract
```
const GAME = {
  id, t1, t2, sub,              // title screen strings
  music: { bpm, lead, chords:[{root,tones}], arp[16], bass[], snare[], kick[], hat },
  init(isAtt),                  // reset ALL state here; isAtt=true for the title-screen demo
  update(dt, inp, mode),        // mode: 'title' | 'play'; fixed dt = 1/60
  render(), hud(mode),
  info(),                       // JSON-able state for tests (score, lives, progress ...)
  bot(),                        // returns an inp object
};
inp = { l, r, u, d, a, b, pa, pb, start }   // pa/pb are press edges
```
Finish with `endGame(score, msg)`. Seed RNG only through `runSeed(fixed, off)`: `rng = mkRng(runSeed(isAtt ? 77 : null, 1))`.
Visual-only randomness (particles, popup jitter) uses `vr()`. Never use `Math.random()` or `Date.now()` in game code.

## 3. Frozen shell: never change per game
- 256x224 indexed buffer, the 22-colour palette in `core.js`, fixed 60 Hz timestep.
- The `GAME` contract above, `endGame()`, the win-message regex, the `nes6-hi-<id>` high-score key.
- `window.__norun`, `window.__shell` (`start`, `bot`, `ff`, `render`, `step`, `info`, `go`, `mode`, `music`, `seed`, `seedFromUrl`) and the `window.__log` redirect in `tone()` / `noise()`: testing and offline video capture depend on them.
- Pad layout, safe-area gutters, `Press Start 2P` font, key map (arrows/WASD, Z/Space/K = A, X/Shift/J = B, Enter start, M mute).
- Run start calls `tms = 0; blink = 0;` before `GAME.init(false)`. Games must reset every piece of state in `init`, including anything stored on `GAME` (`GAME._x`). Leaked state broke determinism twice (g4 flap counter, g2 time base).

## 4. Seeds
`?seed=N` (number, or any string, hashed) reproduces a run. The active seed is `window.__shell.seed` (per-game offset added: g1 +1, g2 +3, g3 +5, g4 +9, g6 +11, g5 +0); `window.__shell.seedFromUrl` is the raw value or null.
Without `?seed=`: attract mode uses its fixed seed, real play uses a per-run seed, and g5's level generator is always seed 55.
`node kit/cabinet/seedcheck.cjs` verifies: same seed gives the same state after 1500 bot frames, a different seed differs.

## 5. Sprites and art
Pixel art is arrays of strings; each character is a palette letter (`W R Y B ...` from `CH` in `core.js`), `.` is transparent: `spr(rows, x, y, flip, pal)`. Much of the art is procedural (`rect`, `fillCircle`); game 6 is entirely procedural. Text is drawn on the 2D context after the buffer blit.
Readability checks are manual: render at 256x224, character at least about 16 px tall, high-contrast against the background. No automated lint exists yet.

## 6. Music format
`GAME.music = { bpm, lead:'square'|'triangle'|..., chords:[{root,tones:[a,b,c]}], arp:[16 ints], bass:[steps], snare:[steps], kick:[steps], hat:bool }`
- One bar is 16 sixteenth steps; one chord per bar, cycling through `chords`.
- `arp[s]` indexes the chord's `tones`; an index past the last tone is the first tone plus an octave; `-1` is a rest. Pitches are semitones from A4.
- `bass`, `snare`, `kick` are step numbers; `hat` plays on odd steps. Bass is a triangle, snare and hat are noise, kick is a sine drop.
- Limits: one lead voice, one progression per game, no sections. `kit/cabinet/core.js` `scheduleMusic()` and `SFX` are the reusable parts.

## 7. iOS audio
`audioInit()` sets `navigator.audioSession.type = 'playback'` (Safari 16.4+, keeps sound on with the silent switch on), resumes any non-running context (`suspended` or `interrupted`) and plays a one-sample silent buffer to unlock it. Gesture listeners on `touchend`, `click`, `keydown` and `pointerup` call it, and `visibilitychange` resumes it. Real-device verification is still a human gate.

## 8. Feel table (constants read from the game sources; units px and s, y down)
| Game | Gravity | Jump / flap | Walk / move | Other |
|---|---|---|---|---|
| g1 Block Commando | 520 | jump vy -205, variable (cut to -90 on release) | 70 | shot cooldown 0.16, enemy shot speed 85, 90 s survive, 2.2 s respawn invulnerability |
| g2 Disc Fighters | none (top-down) | none | player 95 (62 holding disc), CPU 80 (P1 bot 95) | parry window 0.22 s, parry cooldown 0.5 (CPU 0.7), match 60 s, first to 15 |
| g3 Paper Rash | none | none | cruise 115, +38 faster, -36 slower, accel 3/s | punch cooldown 0.38, crash stun 1.3 s, invulnerability 2.6 s, 75 s timer, 20 papers |
| g4 Boom Balloons | 380 / 200 / 120 by balloons 0 / 1 / 2 | flap vy -64 (1 balloon), -74 (2), stomp bounce -70 | max 46 ground, 64 air; accel 10/s ground, 2.4/s air | bomb fuse 2.1 s, blast range 3 tiles, enemy flap cooldown 0.32 to 0.77 s |
| g5 Grapple Ninja | 470 | jump vy -178 | 74 ground, 62 air; accel 14/s ground, 3/s air | rope pump 190, rope reel max length 138, level 3300 |
| g6 Kung Fu Knockout | 560 | jump vy +205 (y up in this game) | 58 | grunt 38, knife 105, boss tell 0.62 s (0.42 s at 6 HP or less), boss attack resolves at 0.12 s, dodge 0.45 s, boss HP 12 |
Not yet unified: units differ per game, and enemy AI reaction times are per-game. Next step for a shared table is a `kit/cabinet/feel.js` with named presets that games read.

## 9. QA loop
Build, run `test.cjs` (title screenshot, bot run, screenshots at 25 / 60 / 100 percent, info JSON, page errors), view the screenshots, fix, repeat. Add `seedcheck.cjs` after any change to state handling. Typical passes: 1 to 2 for simple games, 3 to 4 for balance (g2), many for a bot-driven mechanic (g5).
Known gates still open: human playtest of touch controls, real-device sound (incl. iOS silent switch), and g2's quarter-circle fireball buffer (down, down-forward, forward plus A).

## 10. Known weaknesses
- g1: Tetris AI and garbage pace tuned by bot runs only.
- g2: human fireball input untested; balance tuned against the bot (CPU super 50 percent, meter +15 per catch).
- g3, g4: tuned by bot runs; no human difficulty data.
- g5: bot reliably reaches about x=2882 of 3571 then dies; grapple needs a ring ahead and above; ledge assist covers 13 px; `info()` carries debug fields.
- g6: ring phase is one boss with four moves; "hard" only shortens the telegraph; a knife-loop crash (array reset mid-iteration) was found late, so audit other loops that reset arrays.
