# Feel sheets: the numbers

Two kinds: **PROVEN** (measured in shipped code that a bot plays and wins) and **UNPROVEN START** (reasoned defaults, not yet tested in a starter; tune against the check). Each game keeps its own sheet as a `TUNE` constant at the top of its file; the starters are the live copies.

## A. Reference game sheet: Vampire Metroid (g17 family), PROVEN
| knob | value |
|---|---|
| player | 8-way, 58 px/s, hp 100, contact hit 5 (boss 14), invulnerable 0.6 s after a hit |
| weapon | auto-fire at nearest; every 0.42 s; pellets = 2 x spazer level (starts 2); speed 150; life 1.2 s; dmg 1 + 0.5 x level |
| spawn interval | `max(0.09, 0.45 / (1 + 0.35 * T))` s; from the screen edges; hits the 0.09 s floor at T = 11.4 s (about 11 spawns/s) |
| horde cap | 140 on screen |
| enemy kinds | grunt hp 2, elite hp 4 (20% of spawns once T > 12 s); speed uniform 16-32 px/s; boss (Hive Queen) at T = 20 s: hp 300, speed 24, size x2.4 |
| XP | 1 per kill (gem pickup radius 28); level-up needs 4, then +2 each level (4, 6, 8, ...). Zombie/close tiers: no pause, auto power-up on level |
| score | 5 per kill; win bonus 500 + 5 x remaining hp |
| win | kill the boss (it melts), ~48 s run |
| **crowd density (bot, seed 1)** | on-screen enemies: 45 @5 s, 71 @10 s, 79 @15 s, 92 @20 s, 96 @25 s, 104 @30 s, 139 @40 s; player level 14 at the end, score 1975 |

Use it: a "sparse" swarm game usually has a spawn floor above 0.2 s or a cap under 60. To match this reference density: floor 0.09 s, cap 140, enemy hp 2, speed 16-32, firepower that scales (about 10 pellets/s by minute 1).

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
| kart racer | UNPROVEN START | top speed 120 px/s, accel 160, steer 2.4 rad/s scaled by speed, drift = steer x1.6 and grip 0.6 held 0.4 s for a boost +25% for 0.8 s, offroad drag x0.5; rubber-band AI +-8% by position |
| mini-Zelda dungeon | UNPROVEN START | move 60 px/s, sword arc 0.15 s, enemy hp 2-3, contact 1 heart, room 16x11 tiles of 16, 3-7 enemies/room, keys gate 1 in 3 doors |
| turn-based arena | UNPROVEN START | 6x6 board, move 3, attack range 1-2, 40% hit-chance spread, hp 8-12, 4 units a side |
| deckbuilder | UNPROVEN START | deck 10, hand 5, energy 3, enemy intent shown, hp 40/20, elite every 3rd fight |
| tycoon | UNPROVEN START | income 1/s per building, cost x1.15 per owned, event every 45 s |
| 3D obby | UNPROVEN START | run 8 u/s, jump 9 u/s up, gravity 24, checkpoints every 8 platforms |
| prop hunt | UNPROVEN START | 90 s round, seeker speed x1.1, 20 props, 3 decoys per prop type |
| difficulty ramp shape | PROVEN | fast first 15 s (about 1.5x), plateau, boss/finale at about 50% of the run |

## D. Per-tier sheets: see `GENERIC-KIT.md` section 4 (what changes, what is invariant, the proving test).
