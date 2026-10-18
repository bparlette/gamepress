# Arcade Hub

One app that contains all the mini-games, instead of 30 separate store listings. Reviews, wishlists and
installs pile onto a single Steam / itch / App Store entry. Build it with `gamepress hub <name> [--demo] [--games a,b] [--world w]`
(`--games` takes ids; a directory path there still sets the games folder; `--only` is the unambiguous ids flag).

## Architecture
- `lib/hub.mjs` fills `templates/hub/hub.html` from `presets/hub.json` (title, tagline, accent, `demoGames`, `buyUrl`)
  and `presets/characters.json`, writes `<games>/<hub-id>/index.html` and adds a catalog entry (category "Arcade Hub").
  The game list defaults to the 30 recipe ids of `action15` + `brains15` in `presets/packs.json`. Missing games abort the build.
- The page is the same two-iframe rotation engine as `templates/packs/pack.html` (preload next game, 45 s cap, NICE!/TRY NEXT! toasts),
  plus menu (PLAY, HEROES, BEST SCORES, FREE DEMO), hero select and the loop-complete screen. Each game loads as
  `../<id>/index.html?pack=1&seed=..&hero=<kind>&heroColor=<hex>`; the kit reads `hero`/`heroColor`, bad guys stay per-game.
  Games report `{gp:'end', id, win, score}` via postMessage.
- Sprites are drawn with `CHAR` from `../_vendor/gpsprites.js` (the games folder must contain `_vendor`).

## Roster and unlocks
20 heroes in `presets/characters.json`. Tier `free` (5, available at the start): cat, capyyuzu, noob, spud, duckknife.
Tier `locked` (15): unlocked one at a time. Each time the rotation completes a FULL loop (all configured games, 30 by default),
the hub shows "LOOP COMPLETE! CHOOSE A HERO TO UNLOCK": a carousel of the still-locked heroes. Tapping one and confirming unlocks it
permanently (`localStorage['gp-hub']`: selected hero, unlocked ids, best score per game, won flags); "USE NOW" also selects it.
When all 20 are unlocked the screen is skipped and an "ALL HEROES UNLOCKED" toast shows instead.
Locked heroes are greyed in hero select ("Complete a loop to unlock") and cannot be picked.

## Demo
`--demo` (or FREE DEMO in the menu) plays only the 5 `demoGames`. No unlocks, no character-choice screen; only the 5 free heroes are
usable ("Full game only" on the rest). Each demo loop ends on an upsell linking `buyUrl`.

## Testing
`window.__hub.finishLoop()` triggers loop completion without playing every game; `?loop=1` shortens a loop to 2 games.

## Why one hub
One listing aggregates reviews and wishlists, one store fee, and the hero choice up front gives every game the same
character hook. There is no in-app purchasing of any kind.
