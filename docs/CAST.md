# Casts: a roster of characters with art and voices

A cast swaps the hero in every game for a character image and adds voice barks (a line when you start, score, power up, win or lose). The first cast is **karen** (the 20 HOA Warfare factions and their clean voice lines). The same mechanism works for any roster.

## Run the Karen Arcade demo (5 games)

```
export HOA_WARFARE_DIR=<folder of the HOA Warfare repo>   # art + voices source, never committed here
gamepress cast karen                                       # copies art + clean clips into <games>/_cast/karen/
gamepress theme karen --only slice-swipe,one-tap-reflex,ballistic-bouncer,bullet-heaven,kart-racer
gamepress hub karen-arcade --cast karen --demo --no-catalog
```

Result: `<games>/karen-arcade-demo/index.html` (hero select with 3 free factions, locked ones shown, no unlocks in the demo, loops forever). `--factions a,b` copies only some characters (smaller upload).

## Do the next 15

1. Pick the recipes (the other 25 are in `presets/packs.json`). For each, check it honours the hero: `grep -c "heroKind\|urlHero" templates/recipes/<r>.html` (0 means add `drawChar(heroKind(S.hero), ...)` for 2D or `buildHero(urlHero(S.hero), ...)` for 3D).
2. Add titles and any skin in `presets/themes.json` under `karen`: `titles` (per recipe) and `spec` (per-recipe extras such as slice-swipe's `"skin": "suburb"`, coupons / flamingos / HOA notice instead of fish / melons / bomb). New skins are a few lines in the recipe keyed off `S.skin`.
3. `gamepress theme karen --only <ids>`, then add the ids to `presets/casts/karen.json` `hub.demoRecipes` (or leave it and build the full hub with `gamepress hub karen-arcade --cast karen` once all 30 exist).
4. Check each game: `node bin/gamepress.mjs botcheck karen-<id>`, then open it with `?pack=1&hero=cast%3Akaren%3Akarens` and confirm the character shows and barks fire.

## How it works

- Hero kind string `cast:<cast>:<faction>` (e.g. `cast:karen:karens`). `kit/gpsprites.js` `drawChar`/`face` and `kit/gphero3d.js` `buildHero` draw the image (2D sprite or a camera-facing 3D sprite).
- `kit/gpcast.js` reads `<games>/_cast/<cast>/cast.json`, plays a clip per event with a ~3.5 s cooldown. Events: sound effects map to barks (`coin/ding/pop/boom/hit` → kill, `powerup` → power), plus start (first tap) and win/lose (game end). Call `window.__castBark?.('low')` from a recipe for game-specific moments (low health, miss).
- Voices are off for capture runs (`?auto`, `?clean`) and with `?mute`.
- Presets: `presets/casts/<id>.json` (characters, free/locked order, event mapping, hub title and demo recipes). Only the clean (`_c_`) clips are used, never the `_s_` ones.

## Known gaps

- Characters are single standing images, so they bob and tilt but do not animate walk cycles. The 3D games use a camera-facing sprite, not the low-poly models from HOA Warfare.
- Two factions have art but no voice lines (vcBros, theGays); they are silent.
- Weapon and shield perks per faction (megaphone, tape measure, tumbler) are not wired; every faction plays the same.
- Videos / thumbnails for the gallery are not rendered for this demo.
