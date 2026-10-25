# Viral "best of" cuts (Shorts + long YouTube video)

Compilation of the game's best recorded one-liners and kill shots, rendered by the director (`../../README.md`).
Video tooling only: nothing under `web/` imports it. **All content is data in `cuts.json`; no JS to write.**

```sh
make.sh dry               # timeline check of every chapter (~10 s). Each scene must produce a kill.
make.sh still <chapter>   # render ONE chapter + contact sheet PNG: look at it before the full batch
make.sh shorts            # vertical 1080x1920 Shorts -> dist/director/viral/shorts/
make.sh long              # landscape 1920x1080 cut   -> dist/director/viral/long/best-of.mp4
```
From the gamepress repo the same flow is `gamepress cuts lines|lint|dry|still|shorts|long --game <this repo>`
(see gamepress `docs/GAME-VIRAL-CUTS.md`). Needs Google Chrome + ffmpeg. Never commit the MP4s
(`dist/director/` is gitignored). Parts are cached in `dist/director/viral/parts/`; **delete the folder after
the voice manifest changes** (re-recorded lines change durations and audio).

## Files
- `cuts.json`: `paths`, `cta`, `defaultLoadout`, `shorts[]`, `joined{}`, `long[]`, `chapters{}`. A chapter is
  `{ map?, seed?, hook, outro, scenes[] }` where hook/outro are a string or `{short, long}` (`"cta"` = the CTA card,
  `null` = none). A scene is `{ killer, victim, line, head?, loadout?, caption?, grenade?, victimHp? }`
  (factions + a recorded voice line id). `type: "features"` chapters are caption cards over an orbit shot.
- `_kit.mjs`: builds one director script from scenes (open duel spot per scene, camera, aim, fire, line after the kill).
- `chapters.mjs` / `chapter.mjs`: spec -> script; `CUT=<chapter> node tools/director/direct.mjs .../chapter.mjs`.
- `make.sh`: renders what `cuts.json` lists, caches, joins with ffmpeg.

## Changing a cut
1. Find lines: `gamepress cuts lines --game . --faction karens --event kill` (or read `web/vo/manifest.json`:
   it is what was RECORDED, which can differ from `data/hoa_content.json`).
2. Add/replace a scene in `cuts.json`. `gamepress cuts lint` catches unknown lines/factions/loadouts, Shorts over 58 s.
3. `make.sh dry`, then `make.sh still <chapter>` and look at the sheet, then `shorts` / `long`.

## Gotchas
- Grenade (`The Lawsuit`) flies ~12.4 units before its fuse ends and does 130 dmg at the centre down to 0 at
  radius 5: the kit moves the victim to the landing point; set `victimHp: 25`.
- No melee cue exists in the director, so melee kills are not scriptable (add one to `stage.js` if wanted).
- Keep the content rules in the game's `AGENTS.md` (every group roasted equally, nothing that only works as hate).
- Audio is loudness-normalised to -14 LUFS per clip; the join stream-copies video.
