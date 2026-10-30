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
Gaiden), Kung Fu Knockout (Kung-Fu Master x Punch-Out!!).
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
- One arcade-cabinet column: screen on top, NES-style pad below, safe-area
  gutters. The cabinet pad is this form's touch standard — it sits below
  the screen and never overlays play. (gptouch, docs/TOUCH.md, remains
  the standard for every non-cabinet game.)
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
- `?seed=` is PLANNED, not shipped: it goes in `core.js`, the active seed
  gets exposed via `window.__shell`, and games are rebuilt from the
  shell. Never hand-edit a built game file to add it — that forks the
  game from the template.

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
single HTML page). As of 2026-10-30 those sources live only in the
originating build session; they are being frozen as a versioned template
at `kit/cabinet/`. Until that lands, the six reference builds are the
source of truth — diff a built game against this doc, not against memory.

Known retrofit pending in the shell: the iOS audio fix in `audioInit`
(`navigator.audioSession.type = 'playback'`, resume on gesture — see
MISO-LESSONS.md). One shell change fixes every future game; the reference
builds predate it.

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
