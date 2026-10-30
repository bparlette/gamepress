# How another AI makes the three versions of a cabinet game
Example id `gN` (Vampire Metroid = `g17`, reference implementation: `kit/cabinet/games/g17.js`). All commands run from `kit/cabinet`.
Setup once: `export NODE_PATH=$(npm root -g)`; needs node + playwright (chromium), python3 with numpy + pillow, ffmpeg. No network needed.
**One command for all three: `./make-all.sh gN`** (add `--no-video` to skip the movie). Details below.

## Version 1: 8-bit pixel game (`out/gN.html`, the base game)
1. Write the brief: mashup, one level, bots, original art (never copy known characters), ~60 s for a human.
2. `python3 new.py gN "Title" A B "controls text" "X x Y"` scaffolds `games/gN.js` and the manifest entry.
3. Fill the `kit({...})` config: `setup(S)` (ALL state on S), `step(S,dt,inp,att)`, `draw(S)`, `hud(S)` (text only), `bot(S,i)`, `info(S)`. Helpers: `gamekit.js` (popup, hintS, bfs, burst, hurtS...), `artkit.js` (`ART.*` room, props, sprites, fog, bars, cards, effects). Rules: no Math.random/Date.now, `// KEYS:` line for controls.
4. `./check.sh gN 60` must show `errors: []`, `repeat-equal true`, `other-seed-differs true`, no LINT line, and the bot reaching the win screen. `./qa.sh 60 1 2 3` runs every game on three seeds.
5. Look at it: `node snap.cjs gN 300 900` then read `out/gN_f*_x3.png` (3x zoom). Iterate until it reads as a real game, not noise.
6. Publish: Artifact tool with `out/gN.html`; copy to `hawk/games/gN/index.html`; add a landing card.

## Version 2: HD painted edition (`out/gN.hd.html`)
Same rules and bot, richer drawing. Add `drawHD(S, g, mode)` to the same `kit({...})`:
1. Sprites: `HD.spr(key,w,h,paint)` caches a painted canvas (use `HD.part/ball` for gradient+outline shapes; 4 walk frames; sprite size is in logical units, hero about 14x22).
2. Room: one `HD.spr('room',256,224,...)` baked background (floor tiles with bevel/mold/cracks, blood, brick walls, props, `HD.grain`).
3. Frame: draw room, decals, pickups, depth-sorted entities with `HD.shadow`, bullets and `HD.glow`, `HD.parts` particles, then lighting (`HD.beginLight`, `addLight` for the hero/lamps/pickups/explosions, `HD.endLight`), screen shake, hit vignette, painted bars (`HD.bar`) and menus. Radii must never be negative (`HD.rg` clamps).
4. Keep `hud()` text in the same positions as the pixel bars so one `hud()` serves both.
5. `python3 build.py gN --hd` then `HD=1 node snap.cjs gN 700 1500` and read the PNGs. Compare against the reference frame the user gave.
6. Publish `out/gN.hd.html` as its own artifact; copy to `hawk/games/gN-hd/index.html`.

## Version 3: the movie (YouTube Short, 1080x1920)
`video/short.sh out.mp4 gN [gM ...]` records each game's bot run (`rec2.cjs`), picks the busiest 10 s window (most sfx + score gain), and builds the Short (`mk2.py`): per game a 2 s "X MEETS Y" title over dimmed gameplay, then 10 s of play with live chiptune music and the game's real sfx, score ticker, "PLAY FREE LINK IN BIO". 4 games = 48 s. Use `HD=1 video/short.sh ...` to film the HD edition (build it first). Frames/audio temp files go to `$FR` (default `/tmp/frames`).
Rules: never commit videos to git; deliver the mp4 in chat. Titles for posting must be 100 characters or fewer; list every mashup in the title or description. Check one frame with `ffmpeg -ss 6 -i x.mp4 -frames:v 1 f.png` and read it.

## Gotchas learned the hard way
- `hud()` runs after the pixel blit: rect/spr/ART in hud() vanish. Pixel UI goes in `draw()`/`ui()`. check.sh lints this.
- Never declare a global that collides with kit names (`hint`, `bar`, `burst`, `hit`...); use the kit's or prefix yours.
- State leaking between runs breaks determinism: every field lives on `S`.
- Canvas radial gradients throw on negative radii: clamp.
- Videos from the bot show whatever the bot does: tune the bot so the best 10 s is exciting.
