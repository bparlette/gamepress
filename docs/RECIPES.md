# Recipes: a whole game from a JSON spec (no code written)

`gamepress make <id> --recipe <name> --spec spec.json` writes the game, the hook-video plan and `meta.json`. Then `gamepress all <id> --track demo` tests, films, grades, lints and publishes. A small model only fills in the spec.

| Recipe | Game | Spec keys (all optional, defaults give a working game) |
|---|---|---|
| `crowd-runner` | steer a crowd through math gates, topple a boss | `title sub hero(zombie\|cat) heroColors foe foeColors bossColor bossScale bossHP skyTop skyBottom bg ground road start gates bossText winText crowdLabel` |
| `hole-eater` | growing hole swallows a city, 90 s timer, replay | `title sub seconds ringColor skyTop skyBottom bg ground levels winScore` |

Colours are `"#rrggbb"`. Gates are strings: `"+20"`, `"x3"`, `"-15"` (minus gates are red). Meta keys also allowed in the spec: `hook` (first caption), `tagline`, `description`, `tags`, `youtubeTitle`, `category`.

Example: `{"title":"Cat Stampede","hero":"cat","foe":"zombie","bossText":"ZOMBIE KING","gates":["+25","x2","-20","x3"],"hook":"5 cats vs a ZOMBIE KING"}`

Adding a recipe: copy a finished game to `templates/recipes/<name>.html`, move its tunables into the `const S = {..., /*SPEC*/ ...{} /*END*/}` block, register it in `RECIPES` in `lib/extras.mjs`. Existing demos (zombie-horde, black-hole) are the recipe's first two outputs.

## Environment and safety checks
`gamepress doctor` lists missing tools with the install command. `gamepress lint <id>` blocks personal paths, secrets, external requests and oversized bundles; `all` runs it before `demo`/`pack`. `gamepress grade <id> --vision` adds a local vision-model check (Ollama, default `qwen3-vl:4b-instruct`, override `GP_VISION`) that asks fixed yes/no questions about 3 stills; it skips itself if Ollama is not running. `gamepress test` prints `hints` (known error -> one-line fix, `lib/hints.mjs`) and saves a screenshot.

## Which model can drive this
- Recipe path (spec only): a 4-8B local model (Qwen3-8B, tev1:4b) is enough; it edits JSON and runs `status`/`all`.
- New mechanics or debugging: use a 14B+ coder or a hosted model; the scripts give it `hints`, a screenshot and a score.
- Taste (is it fun, does it feel good): not scriptable; a human or a strong model looks at the stills from `grade`.
