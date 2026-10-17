# Track: full-game (Scale vertical-slice demo into production)

Goal: take an approved 1-screen viral demo and expand it into a full production multi-level game with save persistence, level progression, world expansion, and pause/settings menus.

## The Two-Phase Rule
1. **Phase 1: Vertical-Slice Demo (Least Tokens)**:
   - Build a 1-screen, 1-mechanic demo (15–30s) via `auto`, `make`, or `lego`.
   - Verify core feel, touch controls, sound, and juice with `gamepress test` and `gamepress grade`.
   - Record hook clip with `gamepress drive`.
2. **Phase 2: Creator Approval Gate**:
   - Play or inspect the demo.
   - Run `gamepress approve <id> --notes "5 worlds, boss fights, coin shop" --levels 10 --worlds "Meadow,Desert,Castle"`.
   - Approval is recorded in `.gp/<id>.approved.json`.
3. **Phase 3: Full Production Expansion**:
   - Inspect token-saving blueprint: `gamepress expand <id> --blueprint`.
   - Scaffold multi-level architecture: `gamepress expand <id> --scaffold` (or `gamepress expand <id>`).
   - The original demo is safely preserved as `index.demo.html`.
   - `kit/gplevels.js` is synced to `_vendor/gplevels.js` providing:
     - `createLevelManager`: manages `currentLevel`, `unlocked`, `stars` (1–3 ⭐), `scores`, and `coins`.
     - `createCamera`: follows player smoothly across large multi-screen worlds with screen shake and boundary clamping.
     - Save persistence: auto-saves progress and upgrades to `localStorage`.
     - UI: Animated Level Complete modal, Star rating fanfare, and Level Select grid map.
   - Test full game with `gamepress test games/<id>`.
   - Package for stores with `gamepress publish-pack <id> --games <games dir>`.
