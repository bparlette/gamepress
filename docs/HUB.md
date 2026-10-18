# Arcade Hub

One app that contains all the mini-games, instead of 30 separate store listings. Reviews, wishlists and
installs pile onto a single Steam / itch / App Store entry. Build it with `gamepress hub <name> [--demo] [--games a,b] [--world w]`.

## Architecture
- `lib/hub.mjs` fills `templates/hub/hub.html` from `presets/hub.json` (title, tagline, accent, `demoGames`, `buyUrl`)
  and `presets/characters.json`, writes `<games>/<hub-id>/index.html` and adds a catalog entry (category "Arcade Hub").
  The game list defaults to the 30 recipe ids of `action15` + `brains15` in `presets/packs.json`. Missing games abort the build.
- The page is the same two-iframe rotation engine as `templates/packs/pack.html` (preload next game, 45 s cap, NICE!/TRY NEXT! toasts),
  plus menu, hero select, shop, best scores. Each game loads as `../<id>/index.html?pack=1&seed=..&hero=<kind>&heroColor=<hex>`;
  the kit reads `hero`/`heroColor`, bad guys stay per-game. Games report `{gp:'end', id, win, score}` via postMessage.
- Sprites are drawn with `CHAR` from `../_vendor/gpsprites.js` (the games folder must contain `_vendor`).
- `--demo` builds `<name>-demo`: 5 games, each cycle ends on an upsell linking `buyUrl`.

## Roster
20 heroes in `presets/characters.json`: 5 free (cat, capyyuzu, noob, spud, duckknife), 10 earned with coins
(50..500 ladder: mushfrog, raccoon, melon, slime, axolotl, doge, ragdoll, reaper, banana, hacker), 5 premium
(jester, vampire, joker, phantom, scrapper; $0.99 each, $2.99 all-access). The proposed "bean" was dropped: its sprite is a
pill body with a visor and backpack, too close to the Among Us crewmate; "scrapper" replaces it.

## Wallet and unlocks
Saved in `localStorage['gp-hub']`: coins, lifetime total, selected hero, earned unlocks, best score per game, first-win flags.
A finished game pays +10 for a win, +2 for a loss, +25 the first time a game is won, plus score/10 (max +40). Earn heroes
are bought with coins in HEROES. Locked heroes are greyed and cannot be selected.

## Where real IAP plugs in
`purchase(productId)` in the template is a STUB (productId = hero id or `all-access`). It returns false and unlocks nothing,
except under `?dev=1`, where it unlocks for the current session only (never saved). Replace it with Steamworks
microtransactions / App Store StoreKit / Play Billing, verify the receipt server-side, then persist the entitlement
and have `owned()` read it. Never fake a payment.
