# Decomp reference — fan-rebuilt console games on PC

Master index: **github.com/SubmitGame/awesome-decomp-games** — 1,829+ fan-rebuilt console games running natively on PC (no emulator). Highlights:
- Zelda: Ocarina of Time at 60fps widescreen with randomizers
- Majora's Mask ultrawide
- Mario 64 with 16-player online co-op
- 42 playable directly in the browser

**Legal note:** many require files from legally-owned copies (ROMs dumped from your own cartridges). Check each project's requirements before use.

Relevance to gamepress: the Bushido Blade thread and other decomp work use community RE repos (alexbeavs-ps1-ports, tgg12321/BushidoBladeDecompile, etc.). This index is the starting point for finding a decomp/recomp project for any console game.

Source: [@soflysojoe](https://x.com/soflysojoe/status/2111729353989988663) (Oct 18, 2026).

## Mac-native ports
**github.com/ly05010419/MacNativeGames** — Zelda: Tears of the Kingdom running natively on M4 MacBook Air at 90fps with instant loading, open source. Shows what's possible when decomp/recomp targets Apple Silicon directly — relevant for anyone porting games to Mac.

Source: [@liyong2077](https://x.com/liyong2077/status/2111751050000769517) (Oct 18, 2026).

## October 2026 decomp wave — mechanics extracted for gamepress

Four decompilations reached major milestones this month. We pulled the repos (shallow clones, Oct 19, 2026) and extracted **mechanics only** — numbers, formulas, state machines. No copyrighted assets (no models, textures, audio, level data). Clean reference docs live in `docs/decomp-mechanics/`:

- **Super Mario 64 DS** — [github.com/tangosdev/sm64ds-decomp](https://github.com/tangosdev/sm64ds-decomp), 100% matched (11,389/11,389 functions, AI-assisted, ~4 months). Extracted: fx12 fixed-point system, stick→speed mapping, accel/decel, jump combo logic, gravity tables (falling −4.0, rising −8.0/−3.25), slope classes, camera follow/collision. → `docs/decomp-mechanics/sm64ds-movement.md`. Recipe fits: precision-platformer, obby-gauntlet, mini-zelda.
- **Super Smash Bros. Melee** — [github.com/doldecomp/melee](https://github.com/doldecomp/melee), 100% decompiled to C (6-year effort, finished Sep 2026). Extracted: exact knockback formula structure, hitstun = floor(kb × factor), trajectory/SDI/ASDI directional influence, Sakurai angle, shield/shieldstun math, L-cancel + tech timing windows, wavedash physics, gravity/fall-speed system. Note: numeric tunables live in the retail binary, not the C source — formulas are exact, numbers need the ROM. → `docs/decomp-mechanics/melee-framedata.md`. Recipe fits: footsies-duel, arena-brawler.
- **Super Mario Galaxy** — [github.com/shibbo/Petari](https://github.com/shibbo/Petari) (SMGCommunity). Extracted: 8-shape gravity field system with priority resolution, jump velocity tables, spin attack hitbox/cooldown, terminal velocity clamps, zone-matrix camera, tangent projection primitive. Completeness varies by subsystem — reported in the doc. → `docs/decomp-mechanics/galaxy-physics.md`. Recipe fits: precision-platformer, obby-gauntlet, mini-zelda.
- **Pikmin 2** — [github.com/projectPiki/pikmin2](https://github.com/projectPiki/pikmin2), ~86% complete. Extracted: 33-state Pikmin AI machine, throw trajectory solver (per-color peak heights), verified run speeds (leaf 120/bud 140/flower 170), follow/formation logic, latch-on attack, whistle radius ramp, carry mechanics. → `docs/decomp-mechanics/pikmin2-ai.md`. Recipe fits: cozy-farm, hide-and-seek, crowd-runner, micro-tower-defense.

**Why this matters for gamepress:** these are the actual numbers behind Nintendo's game feel — movement, physics, frame data — usable as reference constants and formulas when tuning recipes. Each doc ends with a recipe-mapping section.
