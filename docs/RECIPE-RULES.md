# Recipe rules (every recipe and every game built from one)

A demo exists to make one clip. These seven rules keep rapid builds finishable and filmable.

1. **Scope discipline: ONE screen, ONE mechanic.** Each recipe ships a *don't build* list (see `docs/RECIPES-CATALOG.md`, source `presets/recipes.json`). Always excluded: inventory, save systems, settings, menus beyond start/restart, a second mechanic. Scope creep is the number-one killer of rapid builds; if an idea needs more, make it a second recipe.
2. **The 2-second rule.** (2026 data: gaming Shorts need the hook in 2s, not 3s — oversupplied category, 85%+ retention on first 100 impressions.) A viewer must see within 2 s of video: what is the player, what is the enemy, what is the goal. Every recipe states it in one line (`threeSecond`) and the hook caption at t=0 names the stakes. Check the stills from `gamepress grade` against it.
3. **Seeded RNG.** Same seed, same game. Use `R()/rnd()/ri()/pick()/shuffle()` from `gpmath.js` (2D) or the gp3d helpers (3D); never raw `Math.random()` in gameplay. `?seed=` selects the run; `gamepress drive` also seeds the clock. Non-negotiable for repeatable takes.
4. **Sound is half the juice.** `sfx()` layers 2-3 oscillators per sound and takes `{pitch}`; streaks and combos climb with `comboPitch(n)` (one semitone per step, capped at an octave). Offline video audio comes from the same `window.__events` log, with pitch applied. A silent demo feels dead.
5. **Show failure.** Every recipe has a visible lose state, and the `?auto=1` bot is built to *lose first, then win*: attempt 0 plays badly on purpose (`g.dumb()`), the banner and shake sell the stakes, the game restarts itself after 2.4 s, and attempt 1 wins. `gamepress botcheck <id>` prints the timeline (`L9.2 W18.6` = lose at 9.2 s, win at 18.6 s). A demo where nothing bad can happen looks fake.
6. **Touch first.** Every recipe plays with one finger: tap, drag, swipe, or on-screen buttons (`g.btn`). Keys are a bonus. `gamepress test` sends a tap every second; a game that ignores touch fails.
7. **Name + hook per recipe.** Each recipe ships a working title and a one-line video hook (and two alternates) in the registry. `make` uses them for the title card, the first caption, the YouTube title and the store tagline, so the packaging is never an afterthought.

## Bot contract (`?auto=1`)
- `g.auto` is true; `g.dumb()` is true only on attempt 0 (override with `&failfirst=0`).
- The smart bot must win within the recipe's `seconds` minus the first loss and the 2.4 s restart (`botcheck` reports it).
- Debug a bot with `node scripts/trace.mjs <gamesDir> <gameId> <seconds> [every] [js expr]` (prints `window.__game` over virtual time). Expose what the bot needs in `g.state`.

## Shared code, not copies
Physics and math live in the kit (`docs/KIT.md`): circles and craters in `gpphys.js`, tile movement in `moveBox`, BFS and ASCII maps in `gpgrid.js`, seeded math in `gpmath.js`, layered audio in `gpaudio.js`, characters in `gpsprites.js`. If two recipes need the same helper, move it into the kit.
