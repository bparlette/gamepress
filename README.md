# gamepress

Point an AI at this repo and a game idea. gamepress builds a small playable web game from a recipe, films it deterministically in headless Chrome (virtual clock, seeded randomness), and produces trailer clips, screenshots, GIFs and store-sized assets (Steam, itch.io, CrazyGames, social). Publishing uploads are stubs: nothing is hosted for you yet. Node 22+, no npm dependencies.

## Start here

- **Humans:** [setup guide](https://bparlette.github.io/gamepress/setup/) (what to install, what is optional, what each tool enables).
- **AI agents:** read [`ORCHESTRATOR.md`](ORCHESTRATOR.md), then run `gamepress run`. Command reference: [`AGENTS.md`](AGENTS.md).

## Recipes (30)

Generated from `presets/recipes.json` (full detail: [`docs/RECIPES-CATALOG.md`](docs/RECIPES-CATALOG.md)).

| id | title | engine |
|---|---|---|
| `one-tap-reflex` | FLAP CAT | 2d |
| `daily-deduction` | WORD CAT | 2d |
| `precision-platformer` | CAT DASH | 2d |
| `cozy-farm` | COZY CAT FARM | 2d |
| `bullet-heaven` | ZOMBIE SURVIVORS | 2d |
| `obby-gauntlet` | CAT OBBY | 3d |
| `rail-runner` | SUBWAY CAT | 3d |
| `ballistic-bouncer` | CAT PEGGLE | 2d |
| `grid-chaser` | PAC CAT | 2d |
| `falling-blocks` | BLOCK CATS | 2d |
| `merge-sandbox` | MERGE PETS | 2d |
| `arena-brawler` | ZOMBIE BRAWL | 2d |
| `scrolling-shmup` | CAT FIGHTER | 2d |
| `run-and-gun` | CONTRA CAT | 2d |
| `mini-metroidvania` | CAT CAVE | 2d |
| `footsies-duel` | CAT DUEL | 2d |
| `mini-zelda` | CAT DUNGEON | 2d |
| `turn-based-3v3` | PET BATTLE | 2d |
| `micro-tower-defense` | CAT DEFENSE | 2d |
| `kart-racer` | CAT KART | 3d |
| `card-roguelite` | CARD CATS | 2d |
| `idle-tycoon` | CAT FACTORY | 2d |
| `hide-and-seek` | PROP CAT | 2d |
| `trajectory-artillery` | CAT ARTILLERY | 2d |
| `slice-swipe` | CAT NINJA | 2d |
| `stack-timing` | CAT STACK | 2d |
| `plinko-drop` | CAT PLINKO | 2d |
| `ragdoll-launch` | CAT CANNON | 2d |
| `sort-puzzle` | CAT SORT | 2d |
| `rope-cut` | CAT ROPE | 2d |

## Docs

`docs/KIT.md` (game kit API), `docs/RECIPES.md` and `docs/RECIPE-RULES.md`, `docs/DRIVING.md` (capture plans), `docs/TOOLING.md` (tools and commands), `docs/NINTENDO-FEEL.md`, `docs/MISO-LESSONS.md`, `docs/VIRAL-PLAYBOOK.md`, `docs/HOSTING.md`, `scripts/README.md`. Tests: `npm test`.

MIT
