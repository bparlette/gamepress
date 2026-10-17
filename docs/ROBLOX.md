# Publishing a Roblox game (Open Cloud, no Studio clicking)

```
export ROBLOX_API_KEY=...            # never commit; create at create.roblox.com/dashboard/credentials
node bin/gamepress.mjs roblox MyPets.rbxl --universe 123456789 --place 987654321            # dry run: prints the request plan
node bin/gamepress.mjs roblox MyPets.rbxl --universe 123456789 --place 987654321 --live     # publish (goes live)
node bin/gamepress.mjs roblox MyPets.rbxl ... --type Saved --live                           # upload as a saved draft only
node bin/gamepress.mjs roblox --rojo default.project.json --universe ... --place ... --live # build with Rojo first, then publish
```

Ids can come from env instead of flags: `ROBLOX_UNIVERSE_ID`, `ROBLOX_PLACE_ID` (keep them in your shell profile, not the repo).
The place id is NOT in the experience overview URL (that URL holds the universe id). Get it from Creator Dashboard > the experience > **Places** (or open the place in Studio: Game Explorer shows it; `game.PlaceId` in the command bar prints it). A private/unpublished experience hides its place id from public APIs.

## Easiest: `scripts/roblox-key.sh`
Opens TextEdit with a template: paste the key (and place id), save, close. The key goes into the macOS Keychain (`gamepress-roblox-api-key`), ids into `~/.config/gamepress/roblox.env`, and the temp file is wiped. gamepress reads them automatically (env vars still win). Remove later: `security delete-generic-password -s gamepress-roblox-api-key`.

## API key permissions (exactly these, nothing else)
Dashboard > Credentials > Create API Key > **Access Permissions** > "Select API System", then add the scopes below and pick **this experience only** (never "all experiences").
| API system (search box) | Scope / operation | Lets gamepress |
|---|---|---|
| `universe-places` (shown as `universe.place`) | **write** (`universe.place.write`) | `roblox` / `roblox-ship`: upload a place file as Saved or Published |
| `luau-execution-session` | **read** and **write** (`universe.place.luau-execution-session:read` / `:write`) | `roblox-test`: run Luau test scripts headlessly on a saved version |
That is the whole set for test + publish. Do not add assets, datastores, game-passes, developer-products, thumbnails, ad, creator-store or universe settings: not needed, and each widens what a leaked key can do.
Set an expiry (90 days), and an IP allowlist if your address is stable. If a scope name differs in the dropdown, search for "place" and "luau": pick the place-publish and luau-execution entries.

## Control flow: test, then publish
```
node bin/gamepress.mjs roblox-ship ~/RobloxWork/YeetPets_latest.rbxl --universe 10770585988 --place <place id> --test templates/roblox-smoke.luau
# 1) uploads as Saved  2) runs the Luau test against that exact version  3) publishes only if the test passed
node bin/gamepress.mjs roblox-test my-test.luau [--version N]      # run a test alone
```
Copy `templates/roblox-smoke.luau` and add checks for the pets game (spawns, remotes, pet tables). Tests run server-side in an Open Cloud session: they can inspect the DataModel and run code but not play with a client.
The Luau Execution API endpoints and scope names follow Roblox's open-beta docs; verify against https://create.roblox.com/docs/cloud/open-cloud/luau-execution if a call returns 403/404.

## One-time setup (owner, 5 minutes)
1. **Ids**: Creator Dashboard > Creations > your experience. The universe id is in the experience URL (`/experiences/<universeId>/...`); open the place and take the place id from its URL or Game Settings > Basic Info.
2. **API key**: Creator Dashboard > Credentials > Create API Key. Access Permissions: API System **Place Publishing** (`universe-places`), operation **write**, select the experience. Restrict by IP if you can. Copy the key once into `ROBLOX_API_KEY` (shell profile or keychain, not the repo).
3. **The place file**: Studio > File > **Save to File As...** > `.rbxl` (binary; preferred) or `.rbxlx`. Or keep the game in Rojo source form and use `--rojo` (needs `rojo` installed; the project builds to `build.rbxl`).

## What it does
POSTs the file to `https://apis.roblox.com/universes/v1/{universe}/places/{place}/versions?versionType=Published` with `x-api-key`. Response: `{ "versionNumber": N }`. `Saved` stores a version without making it live. The file size limit and rate limits are Roblox's (see the Place Publishing docs); one publish per place per call.

## Pitfalls
- 401/403: key missing `universe-places` write, wrong experience, or IP restriction. 404: wrong universe/place id.
- Open Cloud publishes the **place file contents**. Settings (name, thumbnail, monetization, game passes) stay in the dashboard.
- Studio's own Publish dialog failing on a stale place conflict is avoided entirely: this uploads a file you choose. Make sure it is the newest save (check the modified time).
- A stale `.rbxl` is the usual mistake: save from Studio immediately before publishing. Keep only one "latest" file.
- Never paste the key into chat, commits or logs.

## Retention audit of Yeet Pets (Oct 2026, read via `roblox-test`)
Has: 4-step skippable tutorial with persistence (TutorialGuide + FirstSession), welcome coins and a free lucky trait roll, near-miss/squash/shake/pet-effect feedback, egg hatching, collection book, daily rewards with streaks, leaderboard.
Missing: analytics funnel events (AnalyticsService onboarding/progression), performance/error monitoring, an in-game report/community link, a timed check that first reward lands inside ~5 minutes.
Audit scripts: write a Luau file that walks `game:GetDescendants()` for LuaSourceContainer, greps keywords, `print()`s; run `gamepress roblox-test`. Logs come back in the result.

## Yeet Pets source of truth and the draft-verify loop
Source: Rojo project in the Roblox repo (`~/RobloxWork/Roblox/prototype`, github.com/bparlette/Roblox). Its AGENTS.md says a Rojo build replaces the whole place and publishing is owner-approved.
Safe loop for code changes: `sh scripts/check.sh` (tests + build) -> `rojo build -o /tmp/x.rbxl` -> `gamepress roblox /tmp/x.rbxl --type Saved --live` (draft, not live; prints versionNumber) -> `gamepress roblox-test <verify.luau> --version N` (loads real modules in Roblox's engine; this caught a wrong `require` path that Lune tests missed) -> owner approves -> publish.
Caution: the live version 9 was published from a Studio-saved file, not from the Rojo build. Before publishing a Rojo build, diff what the live place has that the repo lacks (hand edits in Studio are lost).
