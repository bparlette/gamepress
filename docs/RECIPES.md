# Research, ask, make: a game from an idea without writing code

0. **Research:** `gamepress ideate "<idea>" [--live]` matches the idea to an archetype (eater, crowd, physics-launch, destruction, stack-climb, or generic) and prints known viral references, one-up twists, 10 recommended assets (`*` = not in the kit yet, build it with `build()` parts), search queries, and 3-5 questions. `--live` adds the top Shorts titles via yt-dlp. Saved to `research/<idea>.json`.
1. **Ask:** put the questions to the user (options + custom text where `custom: true`). Save answers as `{"theme":1,"mood":2,"seconds":0,"hook":"my own line","title":"My Game"}`.
2. **Make:** `gamepress make <id> --recipe hole-eater --answers answers.json [--spec extra.json]` (answers become spec patches; an explicit spec wins).
3. **Ship:** `gamepress all <id> --track demo`.

If nothing matches, the generic 10 assets still apply: cats, dogs, crowds of people, cars+buses, houses+towers, small and big trees, a golden rare item, explosive barrels, a giant boss creature, a surprise cameo. Add the playbook entries for new archetypes in `presets/viral.json`.

## Recipes: a whole game from a JSON spec

`gamepress make <id> --recipe <name> --spec spec.json` writes the game, the hook-video plan and `meta.json`. Then `gamepress all <id> --track demo` tests, films, grades, lints and publishes. A small model only fills in the spec.

| Recipe | Game | Spec keys (all optional, defaults give a working game) |
|---|---|---|
| `crowd-runner` | steer a crowd through math gates, topple a boss | `title sub hero(zombie\|cat) heroColors foe foeColors bossColor bossScale bossHP skyTop skyBottom bg ground road start gates bossText winText crowdLabel` |
| `hole-eater` | growing hole swallows a 16-type city (coins, cats, dogs, crowds, small/big trees, cars, buses, houses, towers, mansions, skyscrapers, explosive barrels with chain reactions, golden cats); animals and people run away | `title sub seconds ringColor skyTop skyBottom bg ground winScore countScale roster` (roster = list of prop ids to include) |

| `glass-drop` | hero drops through rows of two glass panes, one breaks (lives, replay) | `title sub hero(cat\|dog\|zombie) heroColors rows lives bg lavaColor glassColor pillarColor` |
| `demolition` | artillery vs a voxel structure (about 9,000 cubes), bystanders flee | `title sub shape(castle\|tower\|pyramid) bystander bystanderColors wall[4] roof[2] ammo winPct bg skyTop skyBottom` |

**Every recipe takes `style`:** `toon` (default), `roblox` (blocky plastic), `comic` (ink lines + halftone), `painted`, `pixel16`, `pixel8`. It is the first question `ideate` asks. Any game on the shared kit also previews in any style by adding `?style=comic` to its URL.

Colours are `"#rrggbb"`. Gates are strings: `"+20"`, `"x3"`, `"-15"` (minus gates are red). Meta keys also allowed in the spec: `hook` (first caption), `tagline`, `description`, `tags`, `youtubeTitle`, `category`.

Example: `{"title":"Cat Stampede","hero":"cat","foe":"zombie","bossText":"ZOMBIE KING","gates":["+25","x2","-20","x3"],"hook":"5 cats vs a ZOMBIE KING"}`

Adding a recipe: copy a finished game to `templates/recipes/<name>.html`, move its tunables into the `const S = {..., /*SPEC*/ ...{} /*END*/}` block, register it in `RECIPES` in `lib/extras.mjs`. Existing demos (zombie-horde, black-hole) are the recipe's first two outputs.

## Environment and safety checks
`gamepress doctor` lists missing tools with the install command. `gamepress lint <id>` blocks personal paths, secrets, external requests and oversized bundles; `all` runs it before `demo`/`pack`. `gamepress grade <id> --vision` adds a local vision-model check (Ollama, default `qwen3-vl:4b-instruct`, override `GP_VISION`) that asks fixed yes/no questions about 3 stills; it skips itself if Ollama is not running. `gamepress test` prints `hints` (known error -> one-line fix, `lib/hints.mjs`) and saves a screenshot.

## Which model can drive this
- Recipe path (spec only): a 4-8B local model (Qwen3-8B, tev1:4b) is enough; it edits JSON and runs `status`/`all`.
- New mechanics or debugging: use a 14B+ coder or a hosted model; the scripts give it `hints`, a screenshot and a score.
- Taste (is it fun, does it feel good): not scriptable; a human or a strong model looks at the stills from `grade`.
