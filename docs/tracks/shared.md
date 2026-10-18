# Shared tools (every track)

The commands below work on every track. Pick your track first (`gamepress tracks`),
then read its doc for the order to run them in.

| Need | Command | Doc |
|---|---|---|
| Research a concept | `gamepress research <shorts url>` | `docs/VIRAL-PLAYBOOK.md` |
| Scaffold a web game | `gamepress new <id> --games <dir>` | `docs/MAKING-GAMES.md`, `docs/QUALITY.md` |
| Zero-AI build (idea → game + video) | `gamepress auto "<idea>" --track demo` | `docs/AI-CONTRACT.md` |
| Build from a recipe | `gamepress make <id> --recipe <name> --spec spec.json` | `docs/RECIPES.md`, `docs/RECIPE-RULES.md` |
| Composable hybrid game | `gamepress lego <id> --idea "<idea>"` | `docs/KIT.md` (`gplego.js`) |
| Headless test | `gamepress test <game dir>` | `docs/DRIVING.md` |
| Prove the bot loses then wins | `gamepress botcheck <id>` | `docs/DRIVING.md` |
| Scripted gameplay video (web games) | `gamepress drive <plan.json> [--quick N]` | `docs/DRIVING.md` |
| Footage from any game (screen recording) | `gamepress scenes <video>` | README |
| Voiceover / voice lines (local, free) | `gamepress voice "..."`, `gamepress voices <script.json>` | `docs/KIT.md` (Kokoro), `docs/TOOLING.md` |
| Store images, GIF, trailer | `gamepress pack`, `gamepress check` | README, `presets/platforms.json` |
| Self-contained HTML5 zip | `gamepress bundle <dir>` | `docs/HOSTING.md` |
| Git repo for a game (init + layout + GitHub) | `gamepress repo <id> [--github] [--private]` | idempotent; prints `gh repo create` if gh not authed |
| Approve demo → expand to full game | `gamepress approve <id>`, `gamepress expand <id>` | `docs/tracks/full-game.md` |
| Cheat sheet (400 tokens) | `gamepress context` | the token-saving entry point |
| Full help | `gamepress --help`, `gamepress <cmd> --help` | generated from the CLI |

Code: `lib/cdp.mjs` Chrome client, `lib/serve.mjs`, `lib/inject.js` virtual clock.

Roblox games are not web games: `drive`/`test`/`bundle` do not apply to them. Use the roblox track; `pack`/`scenes` still work on recorded footage.

## Read next
- AI drivers: `docs/AI-CONTRACT.md` (behavioral contract), `AGENTS.md` (the 11-step pipeline).
- Game feel: `docs/NINTENDO-FEEL.md` + `docs/RECIPES.md` ("Wiring feel into recipes").
- Viral craft: `docs/VIRAL-PLAYBOOK.md` (retention, hooks, juice).
- Environment: `docs/TOOLING.md` (requirements, `gamepress setup`, tools registry).
