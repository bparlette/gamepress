# Best-of cuts: YouTube Shorts + one long video from a game's recorded lines

For ANY AI, including a small one: you edit ONE JSON file (`cuts.json`) and run `gamepress cuts ...`.
You never write JS or director scripts. Worked example: *Call of Karen: HOA Warfare* (8 Shorts + a ~4.5 min cut).

Needs a game with (a) a scripted-clip director at `tools/director/direct.mjs` (frame-locked headless render of the
real game: actors, cues, camera, captions, voice lines) and (b) a voice manifest (`id -> text, duration`).
Needs Google Chrome + ffmpeg. Never commit the MP4s.

## The loop (follow in order, do not skip steps)
```
gamepress cuts init  --game <repo>                 # once: installs tools/director/scripts/viral/ + a skeleton cuts.json
# edit <repo>/tools/director/scripts/viral/cuts.json  (paths first, then scenes)
gamepress cuts lines --game <repo> --faction karens --event kill     # find REAL recorded lines (shortest first)
gamepress cuts lint  --game <repo>                 # fix every ERROR it prints, rerun until "OK"
gamepress cuts dry   --game <repo>                 # every chapter must say N kill(s) for N scenes
gamepress cuts still hero --game <repo>            # renders one chapter -> dist/director/viral/still/hero.sheet.png; LOOK at it
gamepress cuts shorts --game <repo>                # all vertical 1080x1920 Shorts  -> dist/director/viral/shorts/
gamepress cuts long   --game <repo>                # landscape 1920x1080 cut        -> dist/director/viral/long/best-of.mp4
```
Rendering is quick (~1 min per 40 s of video). After the game's voice manifest changes, delete
`dist/director/viral/parts/` first (re-recorded lines change durations and audio, cached parts are stale).

## cuts.json
```json
{ "cta": "GAME NAME\nFREE DEMO ON ITCH.IO",
  "paths": { "manifest": "web/vo/manifest.json", "content": "data/content.json", "weapons": "data/weapons.json" },
  "defaultLoadout": "default",
  "shorts": ["hero"], "joined": { "maps": ["maps-a", "maps-b"] }, "long": ["hero", "maps-a", "maps-b"],
  "chapters": { "hero": { "map": "culdesac", "seed": 7,
      "hook":  { "short": "WAIT FOR THE LAST ONE", "long": "GAME NAME" },
      "outro": { "short": "cta", "long": null },
      "scenes": [ { "killer": "karens", "victim": "hoaDads", "line": "karens.kill.c.2", "head": false, "loadout": "sniper", "caption": "KAREN" } ] } } }
```
- `killer`/`victim` are faction ids from the content file; `line` is a recorded line id the killer says right after the kill.
- Hook and outro are a string or `{short, long}`; `"cta"` = the CTA card; `null` = none. Shorts need both.
- Chapter `type: "features"` = caption cards (`items[]`, `stage[2 factions]`) over an orbit shot.
- Optional per scene: `head` (headshot), `loadout`, `caption` (default is the faction name), `grenade` + `victimHp: 25`.

## How to pick content (this is what makes it viral)
1. Use RECORDED lines (`cuts lines`), not the content file: they can differ (stale recordings).
2. Funniest and shortest: under ~2 s each; 8-10 scenes per Short (lint enforces <= 58 s).
3. Hook in the first 2 s ("WAIT FOR THE LAST ONE", "EVERY FACTION'S BEST ONE-LINER"), CTA card last.
4. Series ideas that worked: one best line per faction (split 8/8), the mascot's greatest hits, headshots only
   (sniper loadout), rivalry call-outs, one scene per weapon, one clip per map; the long video = all chapters
   in order with landscape hooks + a features/CTA outro.
5. Content rules: every group roasted equally, nothing that only works as hate; `lint` warns on mature "steam" variants.

## Things that bit us (already handled, know why)
- Grenade flies ~12.4 units (fuse 1.6 s): the kit puts the victim at the landing point; needs `victimHp`.
- No melee cue exists in the director: no scripted melee kills.
- Low follow cameras hide the victim: the kit uses back 5.6 / up 3.3 (landscape 6.5 / 3.4). Always view a `still` sheet.
- Voices get re-recorded: durations move, so re-run `dry`/`lint` and clear cached parts.
- Shared checkout: stage only your own files; `dist/director/` is gitignored.

## Where things live
Kit templates: `templates/cuts/` (`_kit.mjs` scene builder, `chapters.mjs`, `chapter.mjs`, `make.sh`, `cuts.example.json`
= the full HOA example). CLI: `lib/cuts.mjs`, tests: `test/cuts.test.mjs`. For another game, `cuts init` installs the kit;
only `paths`, factions, lines and loadouts change. Upload (titles, thumbnails, posting) is a human decision.
