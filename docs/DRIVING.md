# `gamepress drive`: scripted, deterministic game footage

`drive` is how every video in `examples/` is made. It plays a **web game** (HTML + JS, any engine) in headless Chrome
while *you* control time, input, captions and sound from a JSON plan. Same plan in, same video out.

```
gamepress drive examples/tiny-kaiju/hook.drive.json            # full quality -> press/video/tiny-kaiju-hook.mp4
gamepress drive plan.json --quick 6                            # smoke test: 6 s, 540x960, 15 fps (about 10x faster)
gamepress drive plan.json --out some/dir
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
- An attract-mode autopilot (`?auto=1`) is the easiest way to script games with hard-to-time steering.
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
