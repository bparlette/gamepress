# Viral set: 30 games, one hero, one world, four products

`gamepress theme <hero> [--world w]` turns the 30 recipe games into one themed collection and ships it as four products: **two 15-game packs** (Action 15, Brains 15) and **two free 5-game demo packs** that upsell their full pack. One level per game, rotating nonstop (`?pack=1`, `presets/packs.json`).

```
export GP_GAMES=<demo-page>/g GP_CATALOG=<demo-page>/games.json   # never the repo's games/
gamepress theme dogs --world dungeon --render --qc               # ~90 min, resumable
gamepress theme dogs --world dungeon --publish                   # commit + push the demo-page repo
```

- **hero** (`presets/themes.json`, sprites in `kit/gpsprites.js`, 3D in `kit/gphero3d.js`): cat, dog, person, car, duck, penguin, capybara, axolotl, dino, bunny, frog, robot, spud, bean, jester, vampire, joker, ragdoll, noob, hacker, melon, scrapper, reaper, raccoon, doge, slime, phantom, banana and prop variants. A hero swaps the sprite, colour and the noun in titles and hooks.
- **world** (`presets/worlds.json`, `kit/gpworld.js`): grassland, dungeon, cyber, cosmic. Ground, hazards, pickups and a 3-layer parallax backdrop. Default is no world (the original look).
- `--render` renders each game (hook video, thumbnail, catalog entry). It keeps a state file in `.gp/`, so a timeout or crash resumes where it stopped; one failing game is recorded and the rest continue. `--budget N` stops after N minutes (default 100); run it again to resume. `--force` redoes everything.
- `--qc` writes `publish/<set>/qc-sheet.jpg` (one thumbnail per game, for a human to skim) and smoke-tests every pack in headless Chrome: it starts, rotates through the games, demo packs end on the upsell, no console errors.
- `--publish` refuses if anything failed or is pending or a pack failed its smoke test. It pulls before and after pushing; on a catalog conflict it aborts the rebase and tells you, never guessing.

## The standards every game in the set meets
- **Controls:** the mobile touch standard (`docs/TOUCH.md`): floating stick on the left half, circular A/B on the right, per-pointer tracking. Tap-only games keep whole-screen tap.
- **Per game:** one clear goal, instant start, action in the first 3 seconds, the bot loses once then wins (`gamepress botcheck`: first loss by ~10 s, win by ~25 s), seeded RNG, fixed 1/60 step.
- **Art:** flat outlined shapes, a bold silhouette and one iconic prop per character; high-contrast backgrounds so hazards read instantly.

## Rules learned
- Never build into the repo's `games/` folder (guarded): set `GP_GAMES`.
- Do not copy other games' characters (an Among Us crewmate, Brotato's potato with guns, Roblox's look). Keep ours distinct.
- Nobody can promise sales. Sprites and backgrounds help the hook video read; price, hook and discovery decide the rest. Measure, don't assume.
- Cloud rendering needs a Node 22 runner and the games committed to the gamepress repo; this set renders locally.
- A human still has to look at the QC sheet and play a few games on a phone before publishing.

## Ship it as one app: the hub
Sell one listing, not 30 (one $100 Steam fee, one pool of reviews and wishlists). `gamepress hub <name> [--demo]` builds the Arcade Hub from the built games (`docs/HUB.md`): hero select up front (`presets/characters.json`: 5 free, 10 earned with coins, 5 premium), a coin wallet, and the rotating games. Each game receives the chosen hero through `?hero=&heroColor=`. `--demo` is the free 5-game taster that upsells the hub. Purchases are a marked stub until Steamworks / StoreKit is wired.
Enemies come from each game, not the hero roster: `kit/gpenemies.js` (`docs/ENEMIES.md`) holds 10 high-contrast bad guys with uniform collider sizes; set `enemies: 'viral'` in a recipe spec to use them.
