# Feel sheets: the numbers

Two kinds: **PROVEN** (measured in shipped code that a bot plays and wins) and **UNPROVEN START** (reasoned defaults, not yet tested in a starter; tune against the check). Each game keeps its own sheet as a `TUNE` constant at the top of its file; the starters are the live copies.

## A. Reference game sheet: Vampire Metroid (g17 family), PROVEN
| knob | value |
|---|---|
| player | 8-way, 58 px/s, hp 100, contact hit 5 (boss 14), invulnerable 0.6 s after a hit |
| weapon | auto-fire at nearest; every 0.42 s; pellets = 2 x spazer level (starts 2); speed 150; life 1.2 s; dmg 1 + 0.5 x level |
| spawn interval | **constant 0.09 s (about 11 spawns/s) from t = 0**, from the screen edges. (An earlier version of this sheet claimed a ramp; the source is `Math.min(0.09, 0.45 / (1 + 0.35 * T))`, and `min` makes the ramp dead code. Corrected 2026-10-31 while porting to `engine.js`.) |
| horde cap | 140 on screen |
| enemy kinds | grunt hp 2, elite hp 4 (20% of spawns once T > 12 s); speed uniform 16-32 px/s; boss (Hive Queen) at T = 20 s: hp 300, speed 24, size x2.4 |
| XP | 1 per kill (gem pickup radius 28); level-up needs 4, then +2 each level (4, 6, 8, ...). Zombie/close tiers: no pause, auto power-up on level |
| score | 5 per kill; win bonus 500 + 5 x remaining hp |
| win | kill the boss (it melts), ~48 s run |
| **crowd density (bot, seed 1)** | on-screen enemies: 45 @5 s, 71 @10 s, 79 @15 s, 92 @20 s, 96 @25 s, 104 @30 s, 139 @40 s; player level 14 at the end, score 1975 |

Use it: a "sparse" swarm game usually spawns slower than 0.2 s or caps under 60. To match this reference density: spawn every 0.09 s from the start, cap 140, enemy hp 2, speed 16-32, firepower that scales (about 10 pellets/s by minute 1).

## B. Starter sheets (live in the files), PROVEN
* **s1 arena** (`TUNE1`): win 40 s, hp 100, speed 58, hurt 8 / inv 0.8, fire every 0.16 s speed 170 pierce 1; spawn `max(0.16, 0.6 / (1 + 0.3T))`, cap 90, elite after 12 s (20%), bug hp 2 / elite hp 4. Result: bot wins 8/8 seeds, ends hp 28-100, ~150 kills.
* **s2 platformer** (`TUNE2`): run 84 px/s, accel 900, gravity 980, jump 310 (apex 49 px = 6 tiles of 8), variable-jump cut 0.45, coyote 0.10 s, buffer 0.12 s, max fall 420, 3 lives, stomp bounce 200.
* **s3 tower defense** (`TUNE3`): 10 lives, 70 start gold, tower cost 25, range 44 px, fire every 0.55 s, shot 200 px/s dmg 2; 8 waves; creep hp `3 + 2w`, speed `32 + 2w`, count `6 + 2w`, spawn gap `max(0.35, 0.8 - 0.05w)`; kinds norm / runner (hp x0.6, speed x1.6) / tank (hp x2.2, speed x0.7, bounty x2); bounty 6.

## C. Genre feel sheets
| genre | status | start values |
|---|---|---|
| platformer | PROVEN (s2) | as above; coyote 0.1, buffer 0.12, gap max 3 tiles at run 84 |
| arena survivor | PROVEN (s1, g17) | as above |
| tower defense | PROVEN (s3) | as above; ramp = linear hp+speed, 3 kinds |
| kart racer | **PROVEN (s4, measured)** | top speed 112 px/s, accel 150, brake 240, steer 2.5 rad/s scaled 0.45-1.0 by speed; drift = brake held while steering above 55 px/s: steer x1.5, grip 2.6 (vs 9); boost x1.3 for 0.8 s after a drift of 0.6 s or more; offroad (beyond 19 px of the line) caps speed at x0.5. Rivals: cap x1.05-1.15 of top speed, rubber-band +-10% per 80 px of gap, -12% in sharp corners. Measured (bot, seeds 1-8): lap about 4.5 s, lap length about 560 px, race about 19 s after a 3 s countdown, podium 8/8 (P1 x6, P2 x2), average speed 94 px/s over the whole race |
| mini-Zelda dungeon | **PROVEN (s5, measured)** | room 16x11 tiles of 16 px, player 10 px at 62 px/s, hp 6 half-hearts, sword reach 15 px, swing 0.16 s, cooldown 0.32 s, hit knockback 110 px/s decaying exp(-8t); slime hp 2, wanders 26 px/s (turn every 0.8-1.6 s), chases 44 px/s inside 80 px, 1 dmg; boss hp 8, 22 px/s, telegraph 0.7 s then dash 105 px/s for 0.45 s every 2.8 s, 1 dmg; 3-5 slimes and 3-5 blocks per room; every cleared room drops a heart (+2). Measured (bot, seeds 1-8): clear in 23-33 s, 7-10 kills, wins 8/8, ends at 3 of 6 hp. Note: before the guaranteed heart per room the bot lost 1 seed in 8 |
| turn-based arena | UNPROVEN START | 6x6 board, move 3, attack range 1-2, 40% hit-chance spread, hp 8-12, 4 units a side |
| deckbuilder | UNPROVEN START | deck 10, hand 5, energy 3, enemy intent shown, hp 40/20, elite every 3rd fight |
| tycoon | UNPROVEN START | income 1/s per building, cost x1.15 per owned, event every 45 s |
| 3D obby | UNPROVEN START | run 8 u/s, jump 9 u/s up, gravity 24, checkpoints every 8 platforms |
| prop hunt | UNPROVEN START | 90 s round, seeker speed x1.1, 20 props, 3 decoys per prop type |
| difficulty ramp shape | PROVEN | fast first 15 s (about 1.5x), plateau, boss/finale at about 50% of the run |

## D. Per-tier sheets: see `GENERIC-KIT.md` section 4 (what changes, what is invariant, the proving test).

## E. Engine port check (g17h)
`games/g17h.js` is the World edition with its sim rebuilt on `engine.js` (swarm, proj, hits, fx; no hand-rolled collision or aging). Same renderer code, same rules. Measured against `g17f` (bot, seed 1), on-screen enemies at 5/10/15/20/25/30 s: g17f 50/68/81/84/100/114, g17h 49/76/74/55/62/71. So early density matches within about 15%, but later the port thins out (circle hit tests and per-frame damage ordering differ from the original boxes), and the boss dies at about 36 s vs 38 s. It is the same game in spirit, **not** digit-for-digit identical to g17f. Pixel/HD/Art tiers of g17h match each other exactly (`tiers.cjs g17h g17h.hd g17h.art`, seeds 1-3).
