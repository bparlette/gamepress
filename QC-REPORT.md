# Visual QC Report — 2026-10-17

**Scope:** 11 representative games from the Hawk demo page (`~/workspace/brad-demos-staging/`, 43 games in games.json).
**Method:** Headless Chromium (CDP), 12s boot + 30s re-check, screenshot at 1280×720, console error capture.
**Screenshots:** `qc/2026-10-17/<game-id>.png`

## Summary

| Result | Count |
|---|---|
| PASS | 3 |
| FAIL | 8 |

**3 of 11 games render. 8 are broken on screen despite passing bot checks.**

This confirms the audit finding: bot checks do not catch visual failures. Every game below "passes" automated grading.

## Game results

### PASS

| Game | Category | Notes |
|---|---|---|
| rta-ring-rush | Retro Arcade | Title screen renders: character, rings, instructions. Looks good. |
| rta-turbo-coast | Retro Arcade | Excellent — sunset, palm trees, road, cars, title. Best-looking of the batch. |
| moth-runner | Originals | Title screen renders cleanly. (Gameplay not verified — needs input.) |

### FAIL

| Game | Category | Screenshot | What's wrong |
|---|---|---|---|
| shell-shock-3d | Shell Shock | `qc/2026-10-17/shell-shock-3d.png` | **Black screen.** Canvas renders nothing. WebGL works in headless, no console errors — the render path is silently broken. |
| bakeoff-h-iso | Bake-off | `qc/2026-10-17/bakeoff-h-iso.png` | **Black screen.** Only the bake-off nav menu renders. Same silent render failure. |
| bakeoff-g-hd2d | Bake-off | `qc/2026-10-17/bakeoff-g-hd2d.png` | **Black screen.** Only nav menu. Same as above. |
| crystal-cave | Other games | `qc/2026-10-17/crystal-cave.png` | **Stuck on "LOADING..."** forever. No console errors — asset load never completes. |
| knockout | Other games | `qc/2026-10-17/knockout.png` | **Game canvas black.** Title bar, buttons, and control hints render — the canvas itself is empty. |
| gulf-thunder | Originals | `qc/2026-10-17/gulf-thunder.png` | **JS crash.** `index.html` loads `js/core.js`, `js/art.js`, `js/scenes.js`, `js/boat.js`, `js/brawl.js`, `js/kasbah.js` — the entire `js/` directory is **missing**. Uncaught error at boot. |
| sticker-kart | Sticker Series | `qc/2026-10-17/sticker-kart.png` | **Completely white/blank page.** No console errors, empty body. Page never renders anything. |
| beach-catch | Other games | `qc/2026-10-17/beach-catch.png` | **Completely white/blank page.** Identical blank screenshot (same bytes) as sticker-kart. |

All 8 failures persisted at 30s — not slowness, genuinely broken.

## Thumbnail audit

**14 thumbnails are placeholder junk** (600–1600 bytes, black screen + text title only):
`paintball-office`, `headbrawl`, `rampage`, `excitebike`, `punch-out`, `kung-fu-master`, `bad-dudes`, `whac-a-tank`, `space-in-veiners`, `robocock`, `sticker-paintball-office`, `sticker-excitebike`, `moth-runner`, `sticker-stomp`

Of these, 4 are live in games.json (showing dead tiles on the demo page):
- `sticker-stomp`, `sticker-paintball-office`, `sticker-excitebike`, `moth-runner`

**Misleading thumbnails** (show gameplay the live game doesn't render):
- `shell-shock-3d.webp` — shows real 3D street gameplay with HUD. Live game: black screen.
- `knockout.webp` — shows Punch-Out-style boxing gameplay. Live game: black canvas.
- `sticker-kart.webp` — shows title art. Live game: blank white page.
- `beach-catch.webp` — shows a **real photograph** of a football player on a beach. Not game art. Live game: blank white page.

The thumbnails were captured from working builds. The current games are broken. Users click a good-looking tile and get a black/white screen.

## Not covered

- Only 11 of 43 games checked. The remaining 32 need the same pass.
- Gameplay (not just boot) not verified — several PASS games were on title screens.
- No Pac Cat / Cat Peggle entries found in games.json or thumbs/ (may be renamed or removed).
- All games.json entries have index.html + thumbnail files present (the "18 broken entries" from the earlier audit appear fixed at the file level — the breakage is now at render time).

## Recommendation

1. Fix the 8 broken games (gulf-thunder's missing js/ is the easiest win).
2. Regenerate all thumbnails from live screenshots — never ship a thumbnail the game can't reproduce.
3. Add a visual smoke test to the pipeline: screenshot at boot, reject if >95% of pixels are one color.
