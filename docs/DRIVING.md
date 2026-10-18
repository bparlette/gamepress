# `gamepress drive`: scripted, deterministic game footage

`drive` is how every video in `examples/` is made. It plays a **web game** (HTML + JS, any engine) in headless Chrome
while *you* control time, input, captions and sound from a JSON plan. Same plan in, same video out.

```
gamepress drive examples/tiny-kaiju/hook.drive.json            # full quality -> press/video/tiny-kaiju-hook.mp4
gamepress drive plan.json --quick 6                            # smoke test: 6 s, 540x960, 15 fps (about 10x faster)
gamepress drive plan.json --out some/dir
gamepress drive --batch seg1.json,seg2.json,seg3.json --out press/video/v3   # N plans, ONE Chrome session
gamepress drive --batch-dir press/plans/                       # all *.json in dir, sorted
```

## How it works

1. **Serve**: `plan.root` (a folder, relative to the plan file) is served on a random loopback port by `lib/serve.mjs`.
   `root` may use `${ENV}` or `${ENV:-default}` so plans work on any checkout (`GAMES_DIR=~/code/Hawk/brad-demos/g`). Or give `plan.url` for any page. (Games that import `../shared/x.js` need `root` to be the parent folder.)
2. **Launch**: `lib/cdp.mjs` starts headless Chrome with a throwaway profile (deleted afterwards) and speaks the
   Chrome DevTools Protocol over a WebSocket: no Playwright or Puppeteer dependency.
3. **Virtual clock**: `lib/inject.js` is injected before the game's scripts. It replaces `requestAnimationFrame`,
   `setTimeout`/`setInterval`, `performance.now`, `Date.now` and `Math.random`. Time only moves when `drive` calls
   `__gp.step(ms)`. So a slow machine cannot change the result, and a game that uses `Math.random` replays identically
   for the same `plan.seed`.
4. **Frame loop** (for each video frame, at `fps`):
   fire due input -> update the caption overlay -> `__gp.step(1000/fps * slowmoFactor)` -> `Page.captureScreenshot` (JPEG).
5. **Audio**: reads `window.__events` (`[{t, type}]`, `t` = game seconds, from `performance.now()/1000`), maps each
   type to a synthesized sound (`presets/sfx.json`, ffmpeg `aevalsrc`) placed at the video time of that frame, adds
   an optional music bed, and mixes with `loudnorm` to -14 LUFS.
6. **Encode**: ffmpeg x264 CRF 18 + AAC, `+faststart`. A `*.thumb.jpg` is written if `plan.thumb` is set.

## Plan reference

```jsonc
{
  "name": "tiny-kaiju-hook",
  "root": "../../../hawk-pub/brad-demos/g", "path": "tiny-kaiju/index.html?clean=1",   // or "url": "https://..."
  "viewport": [540, 960], "scale": 2,          // CSS px x device scale factor -> 1080x1920 output
  "fps": 30, "seed": 7, "duration": 18,        // seconds of VIDEO
  "ready": "window.startDemo()",               // optional JS run once after load (skip menus)
  "report": "window.__game",                   // optional JS whose value is printed at the end (state check)
  "thumb": 9.2,                                // optional: write <name>.thumb.jpg from this video time

  "input": [                                   // times are VIDEO seconds
    { "t": 0.3, "down": "d" }, { "t": 0.9, "up": "d" },    // hold a key
    { "t": 1.5, "key": " ", "hold": 0.08 },                // tap
    { "t": 2.0, "click": [270, 480] },                     // mouse click at CSS px
    { "t": 3.0, "eval": "game.spawnBoss()" }               // any JS
  ],
  "captions": [ { "t": 0, "until": 2.6, "text": "He is 2 inches tall", "pos": "top", "style": "hook" } ],
  "slowmo":   [ { "t": 4.3, "until": 5.0, "factor": 0.3 } ],   // game runs at 30% speed, video stays 30 fps
  "audio": {
    "source": "window.__events",               // event log from the game
    "map": { "crunch": "crunch", "boom": null }, // event -> sfx preset or file; null drops it; default = same name
    "gain": 1.0, "music": "bed", "musicGain": 0.3,   // "bed" = synth loop, or a path to an mp3/wav
    "bed": { "bpm": 128, "root": 55, "pattern": [0,0,7,5,0,0,10,7] }
  }
}
```

Caption `style`: `hook` (big outlined white), `pop` (huge yellow), `sub` (small on a bar), `cta` (yellow button).
`pos`: `top`, `upper`, `center`, `lower`, `bottom`. Captions pop in with a 0.16 s scale animation.
Keys: names like `"d"`, `" "`, `"ArrowLeft"`, `"Enter"`. Input is real `Input.dispatchKeyEvent`, so games need no changes.

### Batch mode
`--batch` / `--batch-dir` renders N plans in **one Chrome session** — one browser launch instead of N, one command instead of N. Each plan gets its own `<name>.mp4` + `.thumb.jpg` + `.stats.json` from its `name` field. The viewport resizes per plan; the seeded clock script is swapped per plan. Use it for multi-segment videos (one segment per faction/map/moment), then concat or cut together.

### Spectate mode (preferred)
`"spectate": true` in the plan makes the game perform itself — no scripted input needed:

```jsonc
{
  "name": "karens-culdesac",
  "root": "../../games", "path": "hoa-warfare/index.html",
  "viewport": [1280, 720], "fps": 30, "seed": 42, "duration": 20,
  "spectate": true,   // -> ?spectate=1&autostart=1&seed=42 appended automatically
  "captions": [ { "t": 0, "text": "Sixteen factions. One cul-de-sac.", "style": "hook" } ]
}
```

`drive` appends `?spectate=1&autostart=1&seed=<plan.seed>` to the URL and **ignores `input`** (it logs what it skipped). The game must implement the spectate contract (`docs/SPECTATE.md`): bots play, `spectateCamera()` directs. This is the default capture strategy — scripted input is the fallback for games that can't self-play. If the game doesn't support `?spectate=1` yet, the plan renders whatever the URL gives you (usually a menu); add spectate support to the game first.

### Polish options
`"blur": 2` (motion blur via frame blend), `"fade": {"in": .2, "out": .4}` (video and audio), `audio.bed.lead` (arpeggio level, default .35). Audio is two-pass loudnorm to -14 LUFS. `gamepress drive <plan> --dry-run --json` validates a plan without Chrome. Chrome is auto-found (`CHROME=` overrides).

## Making any web game "driveable"

Nothing is required for plain play: keys, mouse, captions and slow-mo work on any page. To get **sound** and **state
checks**, add two optional hooks (about 5 lines):

```js
window.__events = [];   // when something sound-worthy happens:
window.__events.push({ t: performance.now() / 1000, type: 'boom' });
window.__game = { score, time, over };   // read by "report", handy for asserting a script did what you intended
```

Conventions that keep games capture-friendly (the demos in `brad-demos/g` follow all of them):
- Drive the game from one `requestAnimationFrame` loop; use a **fixed timestep** inside it (e.g. 1/60 s steps), so a
  33 ms virtual frame is two identical sim steps.
- Use `Math.random()` for all randomness (the plan seeds it) and `performance.now()` for time. Avoid `new Date()` ordering.
- Support `?clean=1` (hide the on-screen hint text), `?dpr=1` (cap pixel ratio for fast renders), and a pacing knob
  (`?speed=`, `?grow=`) so a 10-minute game can show its payoff in 15 seconds without code changes.
- An attract-mode autopilot (`?auto=1`) is the easiest way to script games with hard-to-time steering. For video
  capture, prefer the full spectate contract (`?spectate=1&autostart=1&seed=N`, docs/SPECTATE.md) — self-playing
  game + self-directing camera, no scripted input at all.
- Keep the canvas filling the viewport and lay out for **portrait** first; landscape then comes free.

## Gotchas learned building the examples

- A blank white frame means a module import failed. `root` must contain every file the page imports
  (`../_vendor/...` lives outside a per-game folder). `drive` now fails loudly on a 404 page.
- WebGL transmission/refraction (glass) and 24,000-instance scenes are heavy at 1080x1920: expect 0.5 to 1 s per frame
  on a busy laptop. Use `--quick` while iterating; render at full size once.
- ffmpeg's `aevalsrc` has no `sign()`; use `gt(x,0)*2-1`.
- Slow-motion changes game time only. Audio events are placed by the *video* time of the frame they happened in, so
  they stretch with the slow-mo automatically.
- Chrome profiles are temp dirs: `lib/cdp.mjs` kills Chrome and deletes the profile even on errors. If a run is killed
  with SIGKILL, remove stale `gamepress-*` dirs under `$TMPDIR`.
- Parallel renders: each uses a random CDP port (9300-9900); three at once is fine on a laptop.

## Other game types

- **Native/console builds**: record the screen, then `gamepress scenes recording.mp4` (scene detection) and `gamepress pack`.
- **Engines with a headless mode** (Unity WebGL, Godot HTML5, Phaser, three.js): these are web games; use `drive` directly.
- **Games with their own deterministic sim and replay system** (like the HOA Warfare director in its repo): export the
  frames from the sim and use `gamepress pack`/`social` for the encoding side.

## Viral capture: film the game, not the menu

A drive plan that just moves and clicks is a **failed video**. Before writing any plan for an existing game:

1. **Identify the 3-5 viral features.** Play the game (or read its README/docs). What makes someone stop scrolling? For a shooter: kill shots, killcams, voice lines, weapon variety, ragdoll physics. For a builder: the satisfying snap, the before/after. Write them down.
2. **Every viral feature gets screen time.** If the game has 900 voice lines, the video MUST have voice audio. If it has kill confirmations, the plan MUST get kills on camera. A plan without the game's signature moments is a reshoot.
3. **Capture real game audio.** If the game has sound (music, SFX, voice), the video needs it. `drive` synthesizes from `window.__events` — for existing games, prefer capturing the actual Web Audio output. Silent gameplay footage with a synth bed is a placeholder, not a deliverable.
4. **Play to win.** The input script should actually play well: aim at enemies, use abilities, trigger the cool stuff. Random WASD + clicks produces menu footage and walking-into-walls. If you can't script skilled play, use the game's bot/debug API or `eval` to stage the moments.
5. **Checklist before render:** [ ] hook in first second [ ] each viral feature visible [ ] real game audio [ ] kills/action on camera (not menus) [ ] CTA only in last 5s

A video that shows menus + walking + synth music failed the brief. Reshoot it.

## Dual orientation: every render produces both 16:9 and 9:16

Cherie's rule: **every video-producing run outputs both orientations.** The plan's
`viewport` decides the primary (e.g. `[540, 960]` → 1080×1920 vertical at scale 2,
`[1280, 720]` → 1280×720 horizontal). After the primary encodes, `drive` derives the
alternate with a center-cropped re-encode (action stays centered; audio copied untouched):

- `<name>.mp4` (primary) + `<name>-horizontal.mp4` (1280×720) or `<name>-vertical.mp4` (1080×1920)
- Flags: `--horizontal-only` / `--vertical-only` when you explicitly want just one
- `gamepress all <id> --track hook|demo|web-store` passes the flags through to the video step

Lay out for **portrait first** — a center crop from vertical to horizontal keeps the action;
a center crop from horizontal to vertical can cut the sides. Design the plan's viewport for
the platform that matters most, knowing the other comes free.

## Advanced: in-engine director scripts

For games with complex combat or choreography, `eval` steps in the plan get unwieldy.
The battle-tested pattern (from Hawk/Cinema City and HOA Warfare shoots) is a **director
script** that runs inside the game, one frame at a time:

```javascript
// In the game (or injected via a plan "eval" step):
window.__D = { f: 0 };                    // persistent director state, f = frame counter
window.__dir = function(D) {
  const H = game.hero, enemy = game.enemies[0];
  if (D.f === 0) {                        // frame 0: stage the shot
    H.pos.set(-12.5, 0, 1.6); H.yaw = -Math.PI / 2;
    enemy.pos.set(-11.0, 0, 3.8);
    game.camera.yaw = Math.PI / 2;        // dramatic angle, aligned before action
    game.camera.pivot.set(-12.5, 1.55, 1.6);
  }
  if (enemy.isStunned) {                  // state machine on game state, not timers
    // ...move hero in, press the finisher key
    return;
  }
  if (!enemy.alive && D.f > D.deadAt + 30) return 'END';
};
```

Drive it from the plan with a single `eval` per frame, or step it manually:

```javascript
// Manual step loop: decouple sim from rAF for frame-perfect capture
window.__capStep = function(steps = 1) {
  for (let i = 0; i < steps; i++) sim.step(1 / 30);
  renderer.render(scene, camera);
};
// Director input injection: override movement per frame without touching input code
function getPlayerMovement() {
  if (window.__CAPMV) return { x: window.__CAPMV[0], y: window.__CAPMV[1] };  // [dx, dz] in camera space
  return keyboardInput();
}
```

Camera choreography rules that sell scale: open on a wide establishing move
(`st.cine` or manual orbit), punch in on impact frames, hold the kill shot for
~0.5 s before cutting. The 9:16 composition is four layers — meme hook banner
(top 15%), clean action viewport (center 70%), voice-bark subtitles (lower 15%,
yellow `#FFE600` with heavy black stroke), CTA pill (bottom).
