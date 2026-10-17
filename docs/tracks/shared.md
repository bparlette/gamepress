# Shared tools (every track)

| Need | Command | Doc |
|---|---|---|
| Research a concept | `gamepress research <shorts url>` | `docs/VIRAL-PLAYBOOK.md` |
| Scaffold a web game | `gamepress new <id> --games <dir>` | `docs/MAKING-GAMES.md`, `docs/QUALITY.md` |
| Headless test | `gamepress test <game dir>` | `docs/DRIVING.md` |
| Scripted gameplay video (web games) | `gamepress drive <plan.json> [--quick N]` | `docs/DRIVING.md` |
| Footage from any game (screen recording) | `gamepress scenes <video>` | README |
| Store images, GIF, trailer | `gamepress pack`, `gamepress check` | README, `presets/platforms.json` |
| Self-contained HTML5 zip | `gamepress bundle <dir>` | `docs/HOSTING.md` |
| Git repo for a game (init + layout + GitHub) | `gamepress repo <id> [--github] [--private]` | idempotent; prints `gh repo create` if gh not authed |
| Code: `lib/cdp.mjs` Chrome client, `lib/serve.mjs`, `lib/inject.js` virtual clock | | |

Roblox games are not web games: `drive`/`test`/`bundle` do not apply to them. Use the roblox track; `pack`/`scenes` still work on recorded footage.
