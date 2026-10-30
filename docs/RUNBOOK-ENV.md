# Runbook: environment and registry

1. `source kit/cabinet/env.sh` first (sets NODE_PATH for playwright, checks node/python3/ffmpeg, sets `FR` to `kit/cabinet/out/frames`; never use /tmp, it is wiped on restart). If playwright is missing it prints the install line: `cd kit/cabinet && npm i playwright && npx playwright install chromium`. Python needs Pillow for thumbnails (`pip install pillow --break-system-packages` if required).
2. Build: `python3 build.py gN` (pixel), `--hd`, `--art`. Register the game id in `games.json` FIRST; an unknown id builds every game.
3. Verify: `./check.sh gN 40`, then `node tiers.cjs gN gN.hd gNb.hd gNc.art ...` (outcomes must match per seed), then look at `ART=1 SEED=7 node snap.cjs gN 420 900`.
4. Videos: `make-all.sh gN`; frames are in `$FR`. Do not commit videos.
5. Demo page registry: `python3 register-demo.py out/gN.art.html gN-art "Game Name Art" "short subtitle" --hawk /path/to/Hawk --thumb out/gN_art_f700_x3.png`. Slug = `<game>-<tier>` lowercase; title = "<Game name> <Tier>"; thumbnail <= 400x380 PNG in `games/shorts/<slug>.png`; one `<a class=c href=slug/>` card in `games/index.html` (the script replaces an existing card with the same slug).
6. Publish: each edition is its own artifact (path `out/gN....html`); keep ALL tiers.
