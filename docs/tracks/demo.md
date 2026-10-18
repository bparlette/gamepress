# Track: local/browser demo page (no store, no accounts)

Goal: a free playable web game on the owner's GitHub Pages demo page, with a thumbnail and viral videos in both orientations (16:9 + 9:16, natively captured by every `drive` run — the game is played twice, once per orientation).
1. Shared: research -> new -> build -> `test` -> `drive` (see `docs/tracks/shared.md`).
2. `gamepress publish-demo <id> --catalog <Hawk>/brad-demos/games.json --push` (thumbnail + catalog entry from `examples/<id>/meta.json`; `replaces` drops a renamed id).
3. Wait for Pages (`gh api repos/bparlette/Hawk/pages/builds/latest`), open the live page, confirm the card and game load.
Scale: search, collapsible categories and paging handle hundreds of games (`docs/HOSTING.md`). Pointers: demo repo `brad-demos/AI-NOTES.md`.
Output of this track is also the input of web-store: keep `meta.json` complete (title, tagline, description, tags).
