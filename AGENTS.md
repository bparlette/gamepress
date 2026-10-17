# AGENTS.md: point an AI here to ship a viral game demo

## Pick a track first (`node bin/gamepress.mjs tracks` or read `tracks.json`)
| Track | Use when | Read |
|---|---|---|
| shared | always: research, build, test, film, images | `docs/tracks/shared.md` |
| hook | only a viral vertical video of a game (no hosting) | `docs/tracks/hook.md` |
| demo | free web game on the GitHub Pages demo page only | `docs/tracks/demo.md` |
| web-store | release on itch.io / CrazyGames / Steam / YouTube | `docs/tracks/web-store.md` |
| roblox | the game is a Roblox experience | `docs/tracks/roblox.md` |
**Zero-AI path:** `gamepress auto "<idea>" --track demo` (maps to a recipe or builds a composable `gplego` game in 0 tokens; add `--local-ai` if local Ollama is available to enrich specs/captions). **Least-AI path:** `gamepress context` (~400-token cheat sheet in 1 command), `gamepress doctor`, `gamepress ideate "<idea>"`, then `gamepress make <id> --recipe <name> --spec spec.json` or `gamepress lego <id> --idea "<idea>"`, then `gamepress all <id> --track demo --heal`. Only write custom game code when neither a recipe nor a Lego combination fits.

**Token-saving entry points:** `gamepress context [--2d|--3d|--lego|--recipe <name>]` (compact JSON API & workflow digest), `gamepress status <id> --json` (what is done/stale, what is next), `gamepress all <id> --track hook|demo|web-store [--heal] [--local-ai]` (runs only what is missing; `--heal` auto-repairs lint/test bugs), `gamepress grade <id> [--vision]` (runtime telemetry + static quality score + exact fixes + 3 stills), `gamepress hooks <id>` (3 opening hook A/B variants), `gamepress stats [id]` (analytics & promotion verdict), `gamepress local-ai` (probe optional local Ollama). Paths: `--games`/`--catalog` or env `GP_GAMES`/`GP_CATALOG` or `gamepress.config.json`. Add `--json` to any command for machine output; errors are one line.

The 11-step pipeline below is the web path (shared + demo + web-store). Roblox follows its own track doc.

Goal: research a concept, build a one-screen web game that looks as good as the Hawk showpieces (Roadkill Rig, Cinema City, Shell Shock 3D),
test it, drive it into a viral vertical video + store images, and package everything for hosting on itch.io, CrazyGames, Steam and YouTube.
Run everything from this repo's root. Requirements: `docs/TOOLING.md`. Never log in to accounts or commit secrets; hosting is a separate step.

## Pipeline (each step is one command; stop and fix on any failure)
| # | Step | Command | Output |
|---|---|---|---|
| 1 | Research | `node bin/gamepress.mjs research <youtube shorts url>` then web-search per the `todo` in `research/brief.json` | `research/brief.json` with a chosen `concept` |
| 2 | Replicate the look | study `docs/QUALITY.md`; open 2 reference demos from `brad-demos/g/` (`zombie-plow`, `cat-avalanche`) | notes |
| 3 | Scaffold | `node bin/gamepress.mjs new <id> --games <games dir> --title "Title"` | `games/<id>/index.html`, `examples/<id>/{hook.drive.json,meta.json}` |
| 4 | Build | edit `index.html` using `_vendor/gp3d.js` + `_vendor/gpkit.js` (characters, particles, sky, toon) | playable game |
| 5 | Test | `node bin/gamepress.mjs test <games dir>/<id>` (must print `"ok": true`) | verdict JSON |
| 6 | Control + film | write `examples/<id>/hook.drive.json` (`docs/DRIVING.md`), `gamepress drive ... --quick 8`, then full | `press/video/<id>-hook.mp4` + `.thumb.jpg` |
| 7 | Watch it | extract frames (`ffmpeg -ss T -i v.mp4 -frames:v 1 f.png`) at 1s, mid, end; check against the QUALITY checklist; iterate 4-6 | approved video |
| 8 | Package | `node bin/gamepress.mjs publish-pack <id> --games <games dir> [--catalog <games.json>]` (adds the demo-page entry too) | `publish/<id>/` (zip, store images, GIF, trailer, `manifest.json`) |
| 9 | Check | `node bin/gamepress.mjs check --dir publish/<id>/press` | all good |
| 10 | **Demo page (required)** | `node bin/gamepress.mjs publish-demo <id> --catalog <Hawk>/brad-demos/games.json --push` (thumbnail + entry from `meta.json` incl. `keys`/`labels`; `replaces` removes a renamed id; commits and pushes the demo-page repo). Then open the live page and confirm the game loads | live card on https://bparlette.github.io/Hawk/brad-demos/ |
| 11 | Host (other agent) | `node bin/gamepress.mjs host <itch\|crazygames\|steam\|youtube> <id>` (dry run by default) | see `docs/HOSTING.md` |

## Rules
- A game is not done until step 5 passes AND step 7 shows: a readable hook in the first second, characters (not primitives), particles on every impact, screen shake on big events, sfx on every event, on-screen numbers that climb.
- Keep the control contract in `docs/DRIVING.md` (fixed step, `Math.random`, `window.__game`, `window.__events`, `?clean ?dpr ?auto`).
- Videos 12 to 25 s, 1080x1920, caption hook at t=0, CTA only in the last 5 s. Titles state a payoff; never "trailer" (`docs/VIRAL-PLAYBOOK.md`).
- Tune with `window.__game` numbers, not by eye. Use `--quick` while iterating; full render once.
- Commit small; `git pull --rebase` before push; no secrets, no personal paths (public repos).
- Roblox games: `docs/ROBLOX.md` (`gamepress roblox <place.rbxl> --universe N --place N`, dry run by default). Needs the owner's `ROBLOX_API_KEY`.

## Roblox: proven flow (verified live)
1. Credentials: `scripts/roblox-key.sh` (paste key in an editor -> macOS Keychain item `gamepress-roblox-api-key`; ids in `~/.config/gamepress/roblox.env`). Key scopes: `universe.place.write` + luau-execution-session read/write, one experience only. Rotate after it has been pasted in chat.
2. Place id is not in dashboard overview URLs. Find it in Studio's local logs: `grep -h "dstPlaceId\|telemetryLog\] placeid:" ~/Library/Logs/Roblox/*` (look for the line with the experience's universe id), then confirm with `GET https://apis.roblox.com/cloud/v2/universes/<u>/places/<p>` and the key.
3. Save the open place so the file is current: `osascript -e 'tell application "RobloxStudio" to activate' -e 'delay 1' -e 'tell application "System Events" to keystroke "s" using command down'` (needs Accessibility permission for the terminal), then check the `.rbxl` mtime changed.
4. `node bin/gamepress.mjs roblox-ship <file.rbxl> --test templates/roblox-smoke.luau` (save draft -> Luau test on that version -> publish). Publish path is `/universes/v1/{universe}/places/{place}/versions` (no second "universes").
5. Open the live game and spot-check. Details and pitfalls: `docs/ROBLOX.md`.
Share links (`roblox.com/share?...ExperienceDetails`) only resolve for a signed-in user: do not use them to find ids.

## Where things live on the owner's Mac (no secrets here)
| What | Where |
|---|---|
| This repo (gamepress) | `~/.gemini/antigravity/scratch/gamepress` |
| Demo-page repo clone used for games (Hawk `main`) | `~/.gemini/antigravity/scratch/hawk-pub` (`brad-demos/g/<id>/`, `brad-demos/games.json`) |
| HOA Warfare repo | `~/.gemini/antigravity/scratch/hoa-warfare` |
| Rendered videos / store assets | `gamepress/press/video`, `gamepress/publish/<id>` (gitignored) |
| Roblox files | `~/RobloxWork/*.rbxl` (Studio logs: `~/Library/Logs/Roblox`) |
| Credentials | macOS Keychain (`gamepress-roblox-api-key`), `~/.config/gamepress/` |
| ES-DE frontend settings | `~/ES-DE/settings/es_settings.xml` (quit key F4; menu: Start > Quit) |
Other agents share some of these checkouts: check `git status` for foreign uncommitted work before committing; never commit credentials or personal paths in public repos.

## Session log pointers (what exists and why)
Demos: 12 one-screen games (cats/zombies look kit `_vendor/gpkit.js`), plans in `examples/<id>/`, picker scales to hundreds (`docs/HOSTING.md`). Hosting stubs are for another agent: `docs/HOSTING.md`, `lib/hosts/*.mjs`.
