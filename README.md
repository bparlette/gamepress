# gamepress

**The goal:** point an AI at this repo and a game idea, and everything is taken care of — from idea to
hosted game trailer on YouTube, playable demo website, or published game on itch.io / CrazyGames / Steam.
Three tiers, each building on the last:

| Tier | What you get | Setup needed |
|---|---|---|
| **Local** | Playable game, screenshots, videos, store assets — all on your machine | None. Just Node, ffmpeg, Chrome. |
| **GitHub Pages** | Hosted playable demo at `username.github.io` | GitHub account. That's it. |
| **Published** | YouTube trailer, itch.io / CrazyGames / Steam store pages | API keys per platform (YouTube OAuth, itch.io key, Steamworks app, etc.) — the [setup wizard](setup/index.html) walks through each one |

The local tier must always work with zero setup. If you just want a playable game with images and videos
on your own machine, you should never need an account or API key for anything.

Any AI should be able to pick up gamepress, run the parts it needs, and spend as few tokens as possible
doing it: one command per step, machine-readable output, idempotent re-runs, one-line actionable errors.
No npm dependencies (Node 22+, ffmpeg, and Chrome for web captures).

```
gamepress context [--2d|--3d|--lego] # ~400-token JSON cheat sheet for AI agents
gamepress auto "<idea>" [--local-ai] # idea -> playable game + hook video + demo/store pack
gamepress lego <id> --idea "<idea>"  # composable mechanic engine (controller + spawner + hook + progression)
gamepress heal <id> [--local-ai]     # deterministic + optional local-AI auto-repair for lint/test failures
gamepress hooks <id>                 # render 3 opening A/B hook variants (fail / satisfying / question)
gamepress stats [id]                 # aggregate grade + YouTube/itch stats into a promotion verdict
gamepress init                       # press/ folder + starter capture plan
gamepress capture press/plan.json    # web game -> raw stills + clips (headless Chrome)
gamepress scenes recording.mp4       # ANY game: pick the best stills and clips out of a screen recording
gamepress pack [--title "Game"]      # raw -> out/steam, out/itch, out/crazygames, out/social (auto-composited capsule logos)
gamepress check                      # verify sizes, counts, GIF size, video length per store
gamepress drive plan.json [--vo ".."]# scripted, frame-locked playthrough -> captioned MP4 + SFX + TTS voiceover
gamepress catalog games.json ...     # add a game + thumbnail to a demo-page catalog
gamepress approve <id> [--levels N]  # approve vertical-slice demo & define full-game expansion goals
gamepress expand <id> [--blueprint]  # token-saving AI blueprint or scaffold multi-level world (gplevels.js)
gamepress host <host> <id> [--live] # github, itch, crazygames, steam, youtube, cloudflare (dry-run by default; `deploy` is a deprecated alias)
```

> **AI agents: start at [`AGENTS.md`](AGENTS.md) or run `node bin/gamepress.mjs context`.** On the owner's Mac this repo is at `~/.gemini/antigravity/scratch/gamepress`; AGENTS.md lists the other local paths (games clone, videos, Roblox files, keychain item names). It drives research, build, test, film, package and the hosting hand-off.

> **Optional Local AI (`--local-ai`):** Everything in `gamepress` works out-of-the-box with **zero local AI** using deterministic templates and heuristics. If you have a local Ollama instance (`qwen2.5-coder:14b`, `qwen3-vl`, etc.), pass `--local-ai` (or set `GAMEPRESS_LOCAL_AI=1` / `.gamepress.json` `{"localAi": true}`) to offload spec enrichment, viral hook copywriting, vision grading (`grade --vision`), and code self-healing (`heal`) for 0 cloud tokens. Check availability anytime with `gamepress local-ai`.

> **Tracks:** shared tools, `demo` (browser demo page only), `web-store` (itch.io / CrazyGames / Steam / YouTube), `roblox`. Run `node bin/gamepress.mjs tracks` or see `tracks.json`.

> This repo is intended to be renamed `tools`. Nothing in it depends on the name; all paths are relative.

Run from your game's folder; everything lives in `./press` (`--dir` changes it).

## Goal and status
Script everything from game idea to hosted game, each step usable alone, for four tracks (hook video, local demo, store release, Roblox), so any AI can run it cheaply.

| Piece | State |
|---|---|
| `context` / `status` / `all` / `grade` / `heal` / `--json` | built: the token-saving layer (runtime telemetry + static rubric + auto-repair) |
| `lego` (`kit/gplego.js`) + `make` recipes | built: 24 fixed recipes (+ 4 legacy) + composable Lego engine (5 controllers × 4 spawners × 5 hooks × 4 progressions) |
| `drive --vo` / `hooks` / `pack --title` | built: TTS hook voiceover (Edge TTS + macOS `say` fallback), 3-variant A/B hooks, auto-composited capsule logos |
| `new --target web\|roblox`, `copy`, `build --target web\|steam\|roblox` | built (Steam needs a Steamworks app to go live) |
| `deploy github\|itch\|crazygames\|steam\|youtube` + `stats` | built: GitHub Pages branch deploy, itch `butler push`, YouTube Shorts Data API v3 upload, Steam `steamcmd` VDF builder, CrazyGames bundle validator, analytics feedback loop |
| Game kit (`gp2d.js`, `gp3d.js`, `gpkit.js`, `gplego.js`) | built with runtime `__gpStats` telemetry |
| Optional Local AI (`--local-ai` / `lib/local_ai.mjs`) | built: 100% optional Ollama coprocessor with deterministic fallbacks when disabled or offline |

## The workflow

1. **Get footage.**
   - *Web game:* write a plan (`examples/hoa-warfare.plan.json` is a worked one) with the game's URL and steps:
     `wait`, `key`, `click`, `move`, `eval` (run JS in the page: start a match, hide the HUD, move the camera),
     `shot` (a still; `"hero"` is the key image) and `record` (a clip while nested steps run).
     Then `gamepress capture plan.json`.
   - *Any other game (native, console, engine builds):* screen-record 5 to 10 minutes of good play with the
     system recorder (macOS: Cmd+Shift+5; Windows: Win+G; OBS works too) and run `gamepress scenes play.mp4`.
     It finds the cuts where the picture changes, takes the most detailed frame of each scene as a still, and
     saves each scene as a short clip.
2. **Curate.** Open `press/raw/shots`, delete the weak stills, and copy your single best image to
   `press/raw/hero.png`. Keep gameplay in `raw/shots` (stores want real gameplay, not mockups).
   Put a finished trailer at `press/raw/trailer.mp4` if you have one; otherwise the clips in `raw/clips` are
   joined (in file-name order) into the trailer, GIF and social video.
3. **Pack.** `gamepress pack [--platforms steam,itch] [--focus 0.5,0.4]`. Capsules and covers are cropped from
   the hero; `--focus x,y` (0..1) picks which part of the hero survives tall/wide crops (e.g. `0.3,0.5` keeps the
   left third). Portrait art (vertical capsule, 2:3 covers, 9:16 video) puts the whole frame over a blurred copy
   instead of cropping the action away.
4. **Check.** `gamepress check` lists anything missing or out of spec (wrong size, fewer than 5 Steam
   screenshots, GIF over 3 MB, video too long).

## What it makes

| Store | Output |
|---|---|
| Steam | header 460x215, small 231x87, main 616x353, vertical 374x448, page background 1438x810, library capsule 600x900, library hero 3840x1240, community icon 184x184, 5+ screenshots 1920x1080, trailer MP4 |
| itch.io | cover 630x500, banner 1920x540, 3 to 10 screenshots 1280x720, animated cover GIF under 3 MB, trailer MP4 |
| CrazyGames | covers 1920x1080 (16:9), 800x1200 (2:3), 800x800 (1:1), 30 s preview MP4 |
| Social | 1080x1920 MP4 (TikTok, Reels, Shorts) |

Specs live in `presets/platforms.json`. Stores change them, so verify against the store's current docs
before uploading and edit that file, not the code. Add a platform by adding a block there.

## Tips that matter for store pages

- **Steam logo and library hero:** the library hero must have no text or logo; the logo is a separate transparent
  PNG (1280x720 max) that you supply. Header and capsules should carry your logo: add it in an image editor over
  the generated capsule, or generate the hero with the logo already in the shot.
- **Clean hero:** hide the HUD in the plan (`{ "eval": "document.getElementById('hud').style.display='none'" }`
  before the hero `shot`) so capsules show the scene, not a scoreboard.
- **CrazyGames:** no Steam or price on covers; their covers are shown small, so keep text minimal.
- **Capture speed:** web captures are as smooth as the game renders in headless Chrome (a heavy 3D game may
  manage 10 to 15 fps). For smooth trailers, screen-record at 60 fps and use `scenes`.

## Scripted viral videos (`gamepress drive`)

`drive` plays a web game under a virtual clock (so every run is identical), presses keys and clicks at exact
times, overlays captions, applies slow-motion, mixes sound effects from the game's event log plus a music bed,
and writes a 1080x1920 MP4. Worked plans for ten games are in `examples/`; the full reference is
[`docs/DRIVING.md`](docs/DRIVING.md). How those games were built: [`docs/MAKING-GAMES.md`](docs/MAKING-GAMES.md).
Everything the pipeline needs installed: [`docs/TOOLING.md`](docs/TOOLING.md). What to make and why it works:
[`docs/VIRAL-PLAYBOOK.md`](docs/VIRAL-PLAYBOOK.md). Render every example: `scripts/render-all.sh`.

## Programmatic Game Director & Viral Videos

For advanced automation and viral shorts (9:16 vertical for TikTok, Reels, YouTube Shorts), see
[`docs/DRIVING.md`](docs/DRIVING.md) ("Advanced: in-engine director scripts" — deterministic frame
stepping, `__capStep`, director input injection, camera choreography).

- **GIFs:** `pack` shrinks size, fps and palette until the GIF fits the itch limit. Keep the source clip short.
- **Real footage only:** stores reject or hurt trust with fake or heavily staged shots; capture the real game.

## Not included (do these by hand)

Store copy, the Steam logo PNG, age ratings, and uploads. `gamepress` stops at files ready to upload.

## License

MIT
