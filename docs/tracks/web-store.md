# Track: web store release (itch.io, CrazyGames, Steam, YouTube)

Prereq: the demo track is done (tested game, rendered video, `meta.json`).
1. `gamepress publish-pack <id> --games <dir>`: bundle zip, store images (`pack`), GIF, trailer, YouTube assets -> `publish/<id>/manifest.json`.
2. `gamepress check --dir publish/<id>/press`.
3. Hosting (separate agent): `gamepress host <itch|crazygames|steam|youtube> <id>` (dry run by default; stubs in `lib/hosts/`). Order and field mapping: `docs/HOSTING.md`.
Steam needs a desktop wrapper (not built here). Credentials: owner supplies, env/keychain only. Verify store specs in `presets/platforms.json` before upload.
