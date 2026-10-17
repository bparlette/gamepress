# Hosting hand-off (stubs)

`gamepress publish-pack <id> --games <dir>` writes `publish/<id>/manifest.json`; every host reads only that file. `gamepress host <platform> <id>` runs
`lib/hosts/<platform>.mjs` (dry run unless `--live`). The stubs return a plan; the hosting agent implements `upload()`.

| Platform | Inputs (from manifest) | Mechanism | Notes |
|---|---|---|---|
| itch.io | `itch.zip`, `itch.dir/cover.png`, `screenshot_*.png`, `cover.gif`, title, tagline, description, tags | `butler push <zip> <user>/<id>:html5`; page fields + images via dashboard/API | kind=HTML, tick "playable in browser", viewport 540x960 mobile friendly, GIF under 3 MB |
| CrazyGames | `crazygames.zip`, `cover_*.png` (16:9, 2:3, 1:1), `preview.mp4` | developer portal form (no public API) | no store logos/prices in covers; QA review follows |
| Steam | `steam.dir/*.png` capsules, library art, 5+ screenshots, trailer | Steamworks UI for the store page; `steamcmd +run_app_build` for builds | $100 app fee is the owner's; web build needs a desktop wrapper |
| YouTube | `youtube.video`, `thumbnail`, title, description, tags | Data API v3 `videos.insert` (OAuth) then `thumbnails.set` | description has `<ITCH_URL>` placeholder: fill after itch is live |

Order: itch first (gives the URL), then YouTube (link in description/pinned comment), CrazyGames, Steam last.
Credentials: environment variables or OS keychain only; never in the repo, logs or manifests. Verify each store's current spec before upload (`presets/platforms.json`).
Result contract per host: `{ ok, url, id }`; write results to `publish/<id>/hosted.json`.

## Demo page at scale (hundreds of games)
`brad-demos/shell.js` handles 100s of games from one `games.json` (about 600 bytes per game): a search box (title, category, tags), collapsible
categories (only the first two are open past 60 games, and only open categories create cards), 60 cards per page with "Show more", lazy thumbnails,
and only the playing game's iframe alive. Give each game `tags` in `meta.json` so search finds it. Past ~2,000 games, split `games.json` into per-category
files and fetch a category on first expand (the picker's `makeCard`/`fillGrid` need no change). A landing page that links to several demo pages also works:
host each page as its own `brad-demos`-style folder and list them in a small index.
