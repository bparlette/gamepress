# Tooling inventory

Everything needed to make a game demo, film it, and publish it. Nothing here is paid.

## Runtime requirements
| Tool | Version used | Used for | Install |
|---|---|---|---|
| Node.js | 22+ | gamepress itself (built-in `fetch`, `WebSocket`, `node:test`) | `brew install node` |
| Google Chrome | current | headless rendering via DevTools Protocol (`CHROME=/path` to override) | brew cask or google.com/chrome |
| ffmpeg + ffprobe | 7+ | frame encode, audio synth/mix, loudnorm, GIF palettes, scene detection, thumbnails | `brew install ffmpeg` |
| git + gh | any | publishing games and tools | `brew install git gh` |
| yt-dlp (optional) | any | read a channel's titles and view counts for the playbook | `brew install yt-dlp` |
| cwebp (optional) | any | smaller thumbnails (`gamepress catalog` falls back to ffmpeg's libwebp) | `brew install webp` |

No npm dependencies. three.js r160 is vendored as a single file.

## Languages and formats
- **JavaScript (ES modules)**: games and all tooling. **JSON**: capture plans (`*.drive.json`, `*.plan.json`), store presets, SFX recipes, demo-page catalog.
- **ffmpeg expression language** (`aevalsrc`, `-filter_complex`): synthesized sound effects and the music bed.
- **HTML/CSS**: caption overlay and HUD are DOM drawn into the page, so screenshots include them.
- **zsh**: `scripts/render-all.sh`.

## Commands (all `node bin/gamepress.mjs <cmd>`)
`init`, `capture`, `drive`, `scenes`, `pack`, `check`, `catalog`. See `README.md` and `docs/DRIVING.md`.

## Files
```
bin/gamepress.mjs        CLI
lib/cdp.mjs              Chrome launch + DevTools client
lib/serve.mjs            loopback static server
lib/inject.js            virtual clock + seeded Math.random + caption overlay (injected into the page)
lib/drive.mjs            the drive pipeline
lib/catalog.mjs          demo-page catalog + thumbnails
presets/platforms.json   store asset specs (verify against current store docs before uploading)
presets/sfx.json         synth recipes for sound effects
examples/<game>/*.json   worked plans for ten games
scripts/render-all.sh    render every example
test/                    node --test
```

## Where the games live
Hawk repo, `brad-demos/g/<id>/index.html` + `brad-demos/g/_vendor/{three.module.min.js,gp3d.js}`; catalog is
`brad-demos/games.json`; thumbnails `brad-demos/thumbs/`; published at https://bparlette.github.io/Hawk/brad-demos/.

## Publishing the videos
YouTube Shorts / TikTok / Reels take the 1080x1920 MP4 directly (`press/video/*.mp4`, under 60 s). Upload by hand:
tooling does not log in to accounts. Titles follow `docs/VIRAL-PLAYBOOK.md`.
