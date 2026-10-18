# Themes: one set of 30 games, any subject

`gamepress theme <id>` re-skins every recipe game and builds that theme's four packs: the 2 full 15-game packs and the 2 free 5-game demo packs (`presets/packs.json`). Themes live in `presets/themes.json`: cats, dogs, people, cars. Adding a theme is one JSON entry (hero sprite from `kit/gpsprites.js`, colour, noun, optional per-recipe title overrides). Nothing else changes: recipes, bots, hook plans and packs are shared.

```
gamepress theme dogs                 # write the 30 games (seconds)
gamepress theme dogs --render        # + hook video, thumbnail and catalog entry per game (~3 min each), then the 4 packs
gamepress theme dogs --packs         # rebuild just the packs
gamepress theme cars --only one-tap-reflex,kart-racer
```

What a theme changes: the hero sprite and colour, and the noun in titles and hooks ("FLAP CAT" -> "FLAP CAR"). Games without a hero sprite (cards, tubes, blocks) change title and hook only. Game ids are prefixed (`dogs-one-tap-reflex`), the cat set keeps plain ids. Sprite kinds: cat, dog, person, zombie, car.
