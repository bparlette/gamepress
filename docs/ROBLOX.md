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

## One-time setup (owner, 5 minutes)
1. **Ids**: Creator Dashboard > Creations > your experience. The universe id is in the experience URL (`/experiences/<universeId>/...`); open the place and take the place id from its URL or Game Settings > Basic Info.
2. **API key**: Creator Dashboard > Credentials > Create API Key. Access Permissions: API System **Place Publishing** (`universe-places`), operation **write**, select the experience. Restrict by IP if you can. Copy the key once into `ROBLOX_API_KEY` (shell profile or keychain, not the repo).
3. **The place file**: Studio > File > **Save to File As...** > `.rbxl` (binary; preferred) or `.rbxlx`. Or keep the game in Rojo source form and use `--rojo` (needs `rojo` installed; the project builds to `build.rbxl`).

## What it does
POSTs the file to `https://apis.roblox.com/universes/v1/universes/{universe}/places/{place}/versions?versionType=Published` with `x-api-key`. Response: `{ "versionNumber": N }`. `Saved` stores a version without making it live. The file size limit and rate limits are Roblox's (see the Place Publishing docs); one publish per place per call.

## Pitfalls
- 401/403: key missing `universe-places` write, wrong experience, or IP restriction. 404: wrong universe/place id.
- Open Cloud publishes the **place file contents**. Settings (name, thumbnail, monetization, game passes) stay in the dashboard.
- Studio's own Publish dialog failing on a stale place conflict is avoided entirely: this uploads a file you choose. Make sure it is the newest save (check the modified time).
- A stale `.rbxl` is the usual mistake: save from Studio immediately before publishing. Keep only one "latest" file.
- Never paste the key into chat, commits or logs.
