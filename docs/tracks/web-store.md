# Track: web store release (itch.io, CrazyGames, Steam, YouTube)

Prereq: the demo track is done (tested game, rendered video, `meta.json`).
1. `gamepress publish-pack <id> --games <dir>`: bundle zip, store images (`pack`), GIF, trailer, YouTube assets -> `publish/<id>/manifest.json`.
2. `gamepress check --dir publish/<id>/press`.
3. Hosting (separate agent): `gamepress host <itch|crazygames|steam|youtube> <id>` (dry run by default; stubs in `lib/hosts/`). Order and field mapping: `docs/HOSTING.md`.
Steam needs a desktop wrapper (not built here). Credentials: owner supplies, env/keychain only. Verify store specs in `presets/platforms.json` before upload.

## Build and copy
- `gamepress build <id> --target web` zip for itch/CrazyGames; `--target steam` Electron wrapper + `app_build.vdf` template in `publish/<id>/steam/` (run `npm i && npm run pack`, fill APPID/DEPOTID, `steamcmd +run_app_build`); `--target roblox` runs `rojo build`.
- `gamepress copy <id>` drafts store copy, tags and age-rating answers to `publish/<id>/copy.json`. Polish it; answer each store questionnaire truthfully.
- `gamepress host <host> <id> [--live]` is the upload entry point (dry run by default; `deploy` is a deprecated alias). CrazyGames has no upload API, so it is a checklist.
- CrazyGames: games already call `CrazyGames.SDK.game.gameplayStart/Stop` when the SDK is loaded (via the shell); add the SDK script tag in the submitted build only.
