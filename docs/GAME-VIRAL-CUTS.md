# Viral "best of" cuts for a finished game (Shorts + one long YouTube video)

Worked example: *Call of Karen: HOA Warfare* (repo `hoa-warfare`). Another AI can repeat this for any game
that has (a) a deterministic sim you can script, (b) recorded voice/sfx lines with a manifest. Kit lives in the
game repo at `tools/director/scripts/viral/` (README there has the commands); this page is the method.

## What was asked and what was built
Ask: "viral Short from the best one-liners of each faction, best kill shots, best levels and features; may need
several Shorts and one long video." Result: 8 vertical Shorts (hero best-of, 16 faction one-liners in 2 parts,
Karen greatest hits, headshots, rivalry call-outs, weapons, 3 maps) + a ~5 min landscape cut that reuses the same
chapters. All rendered from the real game sim/renderer, not screen recordings.

## Method (do it in this order)
1. **Find the game and its tooling.** `~/Games/hoa-warfare`: read `AGENTS.md`, `TASKS.md`, `tools/director/README.md`.
   The game already had a scripted-clip director (`tools/director/direct.mjs`): a shot script (actors, cues, camera,
   captions, voice line ids) -> frame-locked headless-Chrome render -> mixed audio -> 1080x1920 MP4. Owner rule:
   video code stays OUT of the shipped game.
2. **Curate from what was RECORDED.** Read `web/vo/manifest.json` (id, text, duration), not only the content JSON;
   59 of 1315 lines differ (stale recordings). Rank each faction's kill/headshot/rivalry/streak lines by humour and
   by duration (short punchy lines keep a Short fast). Skip anything that only works as hate; roast every group equally.
3. **Don't hand-write 100 scripts: generate them.** `_kit.mjs` `build(scenes)` makes one script from
   `{killer, victim, line}` scenes: finds an open duel spot per scene on the map (box overlap + `segmentClear`),
   places two scripted actors, camera behind shooter, aim -> fire -> say(line) after the kill, caption with the
   faction name, hook text at 0 s, CTA card at the end. One sim per chapter keeps it deterministic.
4. **Dry-run before rendering.** `direct.mjs <script> --dry` prints every hit/kill/say with timestamps in ~1 s;
   it must show one `kill` per scene and no `no recorded line` errors.
5. **Look at stills before the batch.** Render one chapter (~30 s), `ffmpeg -ss T -i x.mp4 -frames:v 1`, view a
   contact sheet. First framing had the victim a dot in the distance; fixed by raising/pulling the camera back.
6. **Render everything with `make.sh`** (`dry | shorts | long`), cached per chapter; landscape via
   `HOA_LANDSCAPE=1` (the only director change: `script.size` -> `const [W,H] = script.size || [1080,1920]`).
   Join with ffmpeg concat (video copy, audio re-encode). Each clip is loudness-normalised to -14 LUFS.

## Things that bit us
- Lawsuit grenade overshoots (flies ~12.4 u, fuse 1.6 s): put the victim at the landing point, low `victimHp`.
- Director has no melee cue, so no scripted melee kills.
- Some factions' recordings are outdated (e.g. wallstreetBets = old VC-bro audio): flag it, re-record, re-render.
- Shared checkout: edit targeted, stage only your own files, never the owner's untracked work; dist/director is gitignored.

## Re-doing it for another game
Copy `_kit.mjs`/`chapters.mjs`/`make.sh`, swap the content arrays and map/actor assumptions, keep steps 2-6.
The upload itself (titles, thumbnails, posting) stays a human decision; the CTA card points to the demo page.
