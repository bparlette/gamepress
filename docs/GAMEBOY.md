# Gameboy — the cabinet use case (Use case 5)

**Trigger: "gamepress gameboy" (Cherie, 2026-10-30).** A complete, small,
single-file NES-cabinet game. The game itself is the product: played on a
phone held upright, finished in one sitting, with a persistent high score.
Not a viral demo (no video deliverable required) and not a full game —
scope is one loop / level / boss, at full quality (QUALITY.md: length is
the only difference).

Reference builds (Oct 2026, live in Hawk `games/`, all verified against
this doc): Block Commando (Contra x Tetris), Disc Fighters (Windjammers x
Street Fighter II), Paper Rash (Paperboy x Road Rash), Boom Balloons
(Balloon Fight x Bomberman), Grapple Ninja (Bionic Commando x Ninja
Gaiden), Kung Fu Knockout (Kung-Fu Master x Punch-Out!!), and Maze
Wrecker (Pac-Man x Wrecking Crew) — the seventh, and the first one
authored against the frozen shell by a different builder than the
shell's author, which is the recipe's transfer test. Build detail —
the brief in practice, the feel table, the QA loop as run — lives in
`docs/RECIPE.md`; this doc is the standard, that one is the logbook.
**Not a reference:** BMX Downhill Rush looks similar but is a separate
lineage (no GAME contract, own hi-score key) — do not template from it.

## The brief (the recipe every gameboy game is built from)

No genre template — a five-line brief:

- **Host game:** the camera, the core verb, and the loop.
- **Donor mechanic:** ONE rule or system transplanted from a second game.
  Host structure + donor tension is what makes a mashup read instantly.
- **Player verbs:** D-pad + A + B only. If a design needs a third button,
  the design is wrong for this form.
- **Win condition:** a survive timer, a clear count, a goal gate, or a
  boss KO.
- **Lose condition:** HP, lives, or a timer.
- **Attract bot:** mandatory — the game must be able to play itself
  unattended behind its title screen.

## The form (what must not change between games)

- 256x224 indexed buffer, 22-colour palette, pixelated upscale.
- Fixed 60 Hz timestep.
- One fullscreen stage: the page IS the screen (100dvh, no margins, no
  cabinet furniture). The game canvas scales with object-fit:contain
  inside a full-viewport black stage — as large as the display allows,
  never cropped, never distorted — and the NES-style pad floats over
  the stage's lower area on a soft dark gradient (D-pad left, A/B
  right, SOUND/START pills below). The keyboard hints line shows on
  fine pointers only. Safe-area insets respected. (Fullscreen stage
  layout Cherie 2026-10-30 — "make theirs fill the screen" — superseding
  both the original shrink-wrapped beige column and the first
  filled-column attempt.) The cabinet pad is this form's touch
  standard — it never covers the drawn game on a normal phone.
  (gptouch, docs/TOUCH.md, remains the standard for every non-cabinet
  game.)
- One HTML file, zero binary assets. Sprites are string arrays (one
  palette letter per pixel, `.` = transparent) drawn by
  `spr(rows, x, y, flip, pal)` with optional per-call palette remap; the
  rest is procedural (`rect`, `fillCircle`) — backdrops mostly, some
  games entirely.
- Only external dependency: the Press Start 2P font (Google Fonts CDN,
  monospace fallback offline).
- The GAME contract and the shell hooks below.
- High-score key: `nes6-hi-<id>` (localStorage).

## The GAME contract

A game file provides `id`, `t1`, `t2`, `sub`, `music`, and:

- `init(isAtt)` — `isAtt` true in attract mode.
- `update(dt, inp, mode)`, `render()`, `hud(mode)`, `info()`, `bot()`.
- `inp` is `{l, r, u, d, a, b, pa, pb, start}`; `pa`/`pb` are press edges.
- Games end by calling `endGame(score, msg)`. A message matching
  `/CLEAR|WIN|KO!|FINISH/` plays the win jingle; anything else plays
  game-over.
- `info()` returns the game's state for tests and recording — keep it
  honest and free of debug leftovers.

Input map: arrows or WASD move; A = Z / Space / K; B = X / Shift / J;
Enter starts; M mutes.

## Hooks and determinism

- `window.__norun` and `window.__shell` — testing and recording depend
  on them. `window.__log` captures the sound log inside `tone()` and
  `noise()`.
- Seeded RNG everywhere gameplay is decided (mulberry-style `mkRng`,
  identical in every build). Attract seeds are fixed per game; real play
  seeds from `Date.now() & 0xffff` plus a per-game offset. Particles use
  `Math.random()` — visual only, so gameplay is deterministic but
  replays are not pixel-exact.
- `?seed=` is SHIPPED (in `core.js`): it takes a number or any string,
  each game adds its own offset, and the active seed is exposed as
  `window.__shell.seed` (`seedFromUrl` gives the raw value). It was
  added in the shell and the games rebuilt from it — never hand-edit a
  built game file to add a shell feature; that forks the game from the
  template. Determinism is proven by `kit/cabinet/seedcheck.cjs`
  (same seed = same `info()` after 1,500 fast-forwarded frames,
  different seed = different state). State leaks are the known failure
  mode: reset EVERYTHING in `init()`, including `GAME._x` fields —
  three reference games shipped bot state that survived restarts.

## Music (one format for every game)

`GAME.music` is `{bpm, lead, chords:[{root, tones}], arp[16], bass[],
snare[], kick[], hat}`:

- One bar = 16 sixteenth-note steps; chords cycle one per bar.
- `arp[s]` indexes into the current chord's tones; an index past the last
  tone adds an octave; -1 is a rest.
- `bass`, `snare`, `kick` are lists of step numbers.
- Voices: square or triangle lead, triangle bass, noise snare and hat,
  sine kick. One looping progression per game — no sections. To lift the
  system into the kit, take `scheduleMusic()` and the SFX table from
  `core.js`.

## Feel constants (starter table — extract, don't guess)

Tuning was per-game intuition in the reference builds; these are the
verified numbers, and the shared table grows by extraction:

| Constant | Value (Kung Fu Knockout) |
|---|---|
| Player walk speed | 58 px/s |
| Jump velocity / gravity | 205 / 560 |
| Grunt walk speed | 38 px/s |
| Knife speed | 105 px/s |
| Boss tell | 0.62 s (0.42 s in the hard phase) |
| Dodge duration | 0.45 s |
| Boss HP / jab / hook damage | 12 / 1 / 2 |

Disc Fighters: super meter +15 per catch; CPU super usage and parry rates
are per-side probabilities in code. When a new game needs a constant,
check the reference builds before inventing one.

## Shell status

The shell is source, not one frozen file: `head.html`, `core.js`,
`loop.js`, and `build.py` (which stitches shell + game file into the
single HTML page), plus the game sources in `kit/cabinet/games/`,
`test.cjs` (headless bot run) and `seedcheck.cjs`. It is frozen as a
versioned template at `kit/cabinet/` — build with
`python3 kit/cabinet/build.py [g1..g7] [--out DIR]`. The built games in
Hawk are outputs; the shell is the source of truth.

The iOS audio fix is IN the shell's `audioInit`
(`navigator.audioSession.type = 'playback'`, a silent-buffer unlock,
resume on touchend/click/keydown/pointerup, and a visibilitychange
resume — see MISO-LESSONS.md), and the reference builds on Hawk main
were rebuilt from the shell with it. Silent-switch behaviour is still
untested on a real device — that remains the human gate.

## QC gates (learned from the first batch — do not repeat its gaps)

- **Bot pass:** fast-forward the attract bot to 25% / 60% / 100% of a
  time budget; read the screenshots and the `info()` state, not just the
  exit code. A bot that cannot progress is a failed game (the Grapple
  Ninja bot stalls at ~80% of its level — known, documented, not a pass).
- **Human input paths get tested explicitly.** Disc Fighters shipped
  with its fireball input (down, forward, A) never once executed by a
  human path — the mechanics were real, the input buffer was unproven.
  Every special input in the brief gets its own probe.
- **Sprite readability:** characters at least ~16 px tall, high contrast
  against their backdrop, judged on rendered screenshots at native
  256x224. A contrast / minimum-size lint does not exist yet.
- **Real-device gate:** touch controls and WebAudio on a real phone are
  a human playtest, not a probe. No gameboy game is "done" until it has
  been played once on a real phone and heard with the silent switch on
  and off.
- **Array-reset loops:** a state reset inside a loop that iterates the
  same array crashed Kung Fu Knockout late (the knife loop). Grep for
  resets inside iteration before shipping.

## Done

"Done" = the single file live at a permanent playable link, registered
wherever the other games live (in Hawk: `games/<slug>/` + demo-page
registry + games list + a thumbnail), bot-verified, special inputs
probed, and played once on a real phone. Public naming rules apply:
original game names, the mashup credited as "X x Y" in notes only, no
third-party assets — all art is string sprites or procedural.
