# G37 Ryu vs Guile: move list and what is real

One-round 1v1, native per-frame 8-bit rig (`pixrig.js`, IK poses). `?char=guile` plays Guile vs Ryu; `?dummy=1` makes the CPU stand still (used by `kit/cabinet/test37.cjs`, which drives every move below with real key sequences: 48/48 pass).

## Controls
Arrows: walk, crouch (down), jump (up / up-forward / up-back). **U I O** = light / medium / heavy punch, **J K L** = light / medium / heavy kick. **Z / X** = medium punch / medium kick (shortcut; also what touch buttons A / B give). Forward = toward the opponent. Hold back to block (down-back to block low).
Inputs are read from a 40-frame command buffer; motions must be completed within ~0.4 s. Charge time is `TUNE37.charge` (50 frames, shorter than SF2's 2 s so a 60 s round stays playable).

## Normals (all three strengths exist for every row; L/M/H differ in startup, active, recovery, damage, stun, reach; they share one pose per row)
| Group | Moves | Notes |
|---|---|---|
| Standing | LP MP HP, LK MK HK | far versions |
| Close (within ~34 px) | close HP (uppercut-style), close HK (knee) | automatic when close |
| Crouching | LP MP, **HP (uppercut, hits air, knockdown)**, LK MK (low), **HK (sweep, low, knockdown)** | low hits must be blocked crouching |
| Jumping | LP MP HP, LK MK HK | neutral / forward / back jump; blockable high or low |
| Throws | forward throw, back throw (hold direction + MP or HP when close) | Ryu: Seoi Nage / Tomoe Nage. Guile: Judo Throw / Suplex. Names shown on screen; the animations are simplified |

## Ryu
| Move | Input | Strengths |
|---|---|---|
| Hadoken | QCF + P (down, down-forward, forward) | L / M / H = projectile speed 80 / 110 / 140 px/s, damage 8 / 10 / 12 |
| Shoryuken | DP + P (forward, down, down-forward) | invulnerable startup, rises, knockdown, damage 10 / 14 / 18 |
| Tatsumaki Senpukyaku | QCB + K (down, down-back, back) | 1 / 2 / 3 hits, travels forward 56 / 74 / 92 px/s, last hit knocks down |

## Guile
| Move | Input | Strengths |
|---|---|---|
| Sonic Boom | hold back (charge), then forward + P | projectile speed 90 / 120 / 150 px/s, damage 8 / 10 / 12 |
| Flash Kick | hold down (charge), then up + K | backflip anti-air, invulnerable startup, knockdown, damage 10 / 12 / 14 |

Special cancels are allowed from a normal that connected. Projectiles cancel each other. Chip damage 1 on blocked specials and projectiles.

## What is NOT in it (be straight about "all the moves")
- No super combos / Ultra (these are SF2-era move sets), no air Tatsumaki, no taunts, no dizzy, no throw techs, no Guile/Ryu alternate costumes or per-button unique poses (strengths share a pose).
- Frame data and damage are approximations of SF2/SF2 Turbo feel, not copied from a frame-data table. Hitboxes are simple rectangles.
- Two buttons on touch (medium punch / medium kick only); the full six-button layout needs a keyboard.
- The CPU uses every special at plausible ranges (fireball zoning, anti-air Shoryuken/Flash Kick, sweeps, throws) but is a simple decision loop, not a tuned SF2 AI. The test bot wins about 10 of 16 rounds (8 seeds x 2 characters).
