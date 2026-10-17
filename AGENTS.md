# AGENTS.md: point an AI here to ship a viral game demo

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
| 8 | Package | `node bin/gamepress.mjs publish-pack <id> --games <games dir>` | `publish/<id>/` (zip, store images, GIF, trailer, `manifest.json`) |
| 9 | Check | `node bin/gamepress.mjs check --dir publish/<id>/press` | all good |
| 10 | Register | `node bin/gamepress.mjs catalog <games.json> --id <id> ... --still press/video/<id>-hook.thumb.jpg` | demo-page entry |
| 11 | Host (other agent) | `node bin/gamepress.mjs host <itch\|crazygames\|steam\|youtube> <id>` (dry run by default) | see `docs/HOSTING.md` |

## Rules
- A game is not done until step 5 passes AND step 7 shows: a readable hook in the first second, characters (not primitives), particles on every impact, screen shake on big events, sfx on every event, on-screen numbers that climb.
- Keep the control contract in `docs/DRIVING.md` (fixed step, `Math.random`, `window.__game`, `window.__events`, `?clean ?dpr ?auto`).
- Videos 12 to 25 s, 1080x1920, caption hook at t=0, CTA only in the last 5 s. Titles state a payoff; never "trailer" (`docs/VIRAL-PLAYBOOK.md`).
- Tune with `window.__game` numbers, not by eye. Use `--quick` while iterating; full render once.
- Commit small; `git pull --rebase` before push; no secrets, no personal paths (public repos).
- Roblox games: `docs/ROBLOX.md` (`gamepress roblox <place.rbxl> --universe N --place N`, dry run by default). Needs the owner's `ROBLOX_API_KEY`.
