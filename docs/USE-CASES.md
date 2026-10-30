# gamepress use cases

gamepress builds games for four different jobs. Know which one you're doing before you start — each one changes what "done" looks like.

## 1. Viral video demo ("gamepress youtube")

**The game exists to be filmed.** The video is the product; the game is the set.

- Shorthand: when Cherie says "gamepress youtube," this is what she means.
- Optimize for: spectate/auto-play modes, juicy readable moments, vertical 9:16, action in the first second.
- The demo only needs to look amazing for ~30 seconds and play itself.
- **Always delivers three things:**
  1. **Playable link** — the game URL, verified loading (not blank).
  2. **Downloadable video** — a filmed clip of the demo (bot/spectate capture), hosted as a permanent direct link she can download.
  3. **Viral title for the YT Short** — a hook title following VIRAL-PLAYBOOK.md rules (surprising claim or payoff, never "trailer," one gag visible in the first second).
- "Done" = all three delivered. A demo without the video and title is incomplete.
- **5-PLAY RULE (Cherie 2026-10-21): the video is NOT one continuous playthrough.** Record the bot playing 5 separate runs, then edit the best clips from each round into one highlight reel. Pick the juiciest moments — biggest combos, closest calls, funniest glitches, best payoffs. A single run is boring; 5 runs gives you 5x the chances for a viral moment.
- **Capture standard: `docs/SHORT-PIPELINE.md`** — one-command pipeline (`tools/make_short.mjs`): in-game `?short=1` recorder (canvas stream + WebAudio tap = one fused, synced stream), deterministic coordinate/event stunt bot, full beginning-to-end runs, full-bleed 1080×1920 render, and the **ffprobe MEASURE gate** (real fps + per-stream durations + loudness/frame checks) before any spec is quoted. Real captured game audio only — never a dubbed or "representative" track.
- Examples: Steal the Treat, Catfishin' (Oct 2026).

## 2. Store assets

Captures, capsules, covers, banners, screenshots, GIFs for Steam / itch.io / CrazyGames listings.

- The game exists; gamepress captures and packages it.
- One command per asset type, no npm deps.
- "Done" = upload-ready files meeting each store's spec.

## 3. Trailer production

Cinematic trailers and vertical clips cut from gameplay. Overlaps with videopress territory — gamepress handles the capture, videopress handles the edit.

- "Done" = a trailer file ready to upload.

## 4. Playable game

The actual game people play start to finish. The end of the funnel: 24 demos → viral signals → 3–4 real games.

- Full game feel, balance, progression, polish.
- "Done" = a game a stranger would actually play (see ORCHESTRATOR.md QC gate).

## Choosing

**DEFAULT RULE (Cherie 2026-10-21): every game request is Use case 1 (viral video demo) unless she explicitly names another use case.** "Make [game]", "build [game]", or any game idea without a qualifier = viral demo: playable link + downloadable video + viral title. Never ask which use case — just build the demo. She specifies otherwise only with explicit words like "full game", "assets", "trailer", or "playable game".

| She says | She means |
|---|---|
| "gamepress youtube" / "make [game]" / "build [game]" (no qualifier) | Use case 1: viral video demo (DEFAULT) |
| "gamepress assets" / "store assets" | Use case 2: store assets |
| "gamepress trailer" | Use case 3: trailer |
| "full game" / "playable game" (explicit) | Use case 4: playable game |
