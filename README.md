# gamepress

Capture scenes from a game and build every asset its store pages need: Steam capsules and screenshots,
itch.io cover/banner/GIF, CrazyGames covers, trailers, and vertical social clips. One command per step, no
npm dependencies (Node 22+, ffmpeg, and Chrome for web captures).

```
gamepress init                      # press/ folder + starter capture plan
gamepress capture press/plan.json   # web game -> raw stills + clips (headless Chrome)
gamepress scenes recording.mp4      # ANY game: pick the best stills and clips out of a screen recording
gamepress pack                      # raw -> out/steam, out/itch, out/crazygames, out/social
gamepress check                     # verify sizes, counts, GIF size, video length per store
gamepress drive plan.json           # scripted, frame-locked playthrough of ANY web game -> captioned MP4 with audio
gamepress catalog games.json ...    # add a game + thumbnail to a demo-page catalog
```

> This repo is intended to be renamed `tools`. Nothing in it depends on the name; all paths are relative.

Run from your game's folder; everything lives in `./press` (`--dir` changes it).

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

For advanced automation and viral shorts (9:16 vertical for TikTok, Reels, YouTube Shorts), see:
- [`docs/game-director-scripting.md`](docs/game-director-scripting.md): Complete blueprint on deterministic frame stepping (`__capStep`), seeded PRNG, headless Playwright puppeteering, camera choreography, and scripted character combat directors.

- **GIFs:** `pack` shrinks size, fps and palette until the GIF fits the itch limit. Keep the source clip short.
- **Real footage only:** stores reject or hurt trust with fake or heavily staged shots; capture the real game.

## Not included (do these by hand)

Store copy, the Steam logo PNG, age ratings, and uploads. `gamepress` stops at files ready to upload.

## License

MIT
