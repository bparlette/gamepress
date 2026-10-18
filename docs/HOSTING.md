# Hosting

`gamepress publish-pack <id>` writes `publish/<id>/manifest.json`; every host reads only that file.
`gamepress host <platform> <id>` runs `lib/hosts/<platform>.mjs`. Dry run by default — add `--live` to actually upload.

Every host follows the same contract: **try the real thing first, fall back to an exact manual checklist.** No silent stubs — if a step can't be automated, the command prints copy-paste steps instead of failing.

## Automation status

| Platform | `--live` does | Needs | Can't automate |
|---|---|---|---|
| GitHub Pages | unpacks zip → commits → force-pushes `gh-pages` branch | git push credentials for the repo | enabling Pages in repo Settings (one-time) |
| itch.io | `butler push <zip> <user>/<id>:html5` | `butler` CLI + `BUTLER_API_KEY` (or macOS Keychain `gamepress-butler`) + `--user`/`ITCH_USER` | page fields (title, description, cover) — dashboard only |
| Cloudflare Pages | `wrangler pages deploy <dir> --project-name <id>` | `wrangler` + `CLOUDFLARE_API_TOKEN` (or `~/.config/gamepress/cloudflare.env`) | — |
| YouTube | Data API v3 resumable upload + thumbnail set | `YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET` + `YOUTUBE_REFRESH_TOKEN` (or `YOUTUBE_ACCESS_TOKEN`, or macOS Keychain) | OAuth consent-screen verification (one-time, Google Cloud Console) |
| Steam | generates `app_build`/`depot_build` VDFs + `steamcmd +run_app_build` | `steamcmd` + `STEAM_USER` + `STEAM_APP_ID` (+ `STEAM_DEPOT_ID`) | store page (capsules, description) — Steamworks UI; the $100 app fee |
| CrazyGames | **manual only** — validates bundle + writes `crazygames-portal.json` + prints portal steps | — | CrazyGames has no public upload API; submission is via https://developer.crazygames.com/ |

## Credentials

Environment variables or OS keychain only. **Never in the repo, logs, or manifests. Never print a credential value.**

| Variable | Where to get it | Used by |
|---|---|---|
| `BUTLER_API_KEY` | https://itch.io/user/settings/api-keys | itch |
| `ITCH_USER` | your itch.io username (or `--user` flag) | itch |
| `CLOUDFLARE_API_TOKEN` | dash.cloudflare.com → My Profile → API Tokens → "Edit Cloudflare Workers" template | cloudflare |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` / `YOUTUBE_REFRESH_TOKEN` | Google Cloud Console → YouTube Data API v3 → OAuth client (Desktop app); see `youtube.setupGuide()` | youtube |
| `STEAM_USER` / `STEAM_APP_ID` / `STEAM_DEPOT_ID` | https://partner.steamgames.com/ (App ID after paying the $100 fee) | steam |

macOS alternative: `security add-generic-password -s <service> -a $USER -w '<value>'` with services `gamepress-butler`, `gamepress-youtube-oauth`, `gamepress-youtube-token`.

## Order

itch first (gives the URL), then YouTube (link in description/pinned comment), CrazyGames, Steam last. Cloudflare Pages is the free hosted-URL option — deploy any time after `publish-pack` for a shareable playable link.

Verify each store's current spec before upload (`presets/platforms.json`).
Result contract per host: `{ ok, url, id }`; write results to `publish/<id>/hosted.json`.

## itch.io page fields

`butler push` uploads the build only. Page fields (title, tagline, description, tags, cover, screenshots, GIF) are dashboard-only: https://itch.io/game/new → Kind: HTML, tick "playable in browser", viewport 540×960, mobile friendly, GIF under 3 MB.

## CrazyGames SDK (optional)

For ads on CrazyGames: `kit/gpmonetize.js` auto-detects the CrazyGames SDK. Include `https://sdk.crazygames.com/crazygames-sdk-v3.js` in `index.html` to enable rewarded/interstitial ads. No store logos, prices, or "coming soon" text on covers; QA review takes days.

## Demo page at scale (hundreds of games)
`brad-demos/shell.js` handles 100s of games from one `games.json` (about 600 bytes per game): a search box (title, category, tags), collapsible
categories (only the first two are open past 60 games, and only open categories create cards), 60 cards per page with "Show more", lazy thumbnails,
and only the playing game's iframe alive. Give each game `tags` in `meta.json` so search finds it. Past ~2,000 games, split `games.json` into per-category
files and fetch a category on first expand (the picker's `makeCard`/`fillGrid` need no change). A landing page that links to several demo pages also works:
host each page as its own `brad-demos`-style folder and list them in a small index.
