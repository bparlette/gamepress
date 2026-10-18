# Enemies (kit/gpenemies.js)

A universal enemy layer in the flat outlined style, kept visually apart from hero skins: crimson, acid green, deep/neon purple, bone and metal, never the colourful hero roster, so hazards always read.

Opt in per game with the spec key `enemies: 'viral'` (default `'classic'` = the old `drawChar` look, byte-identical). Supported by bullet-heaven, arena-brawler, run-and-gun, micro-tower-defense and mini-zelda. Only drawing and the hit flash change; collisions, speeds and bots are untouched, so botcheck results are identical.

`foeId(S.foe, tier)` maps the classic foe to a sprite (tier 0 small, 1 big, 2 boss): zombie -> bad_zombie / bad_cyclops / bad_boss, ghost/phantom/reaper -> bad_reaper, slime -> bad_slime, robot -> bad_drone, bat -> bad_bat.

## Drawing
`drawEnemy(id, c, x, y, size, o)`: feet at (x,y), size = pixel height, `o.dir` 1/-1, `o.t` clock, `o.flash` pure white 1-frame hit flash (offscreen + source-atop), `o.warn` (true or 0..1) red ground ring + "!", `o.count` fuse digit for bad_bomb.

## Roster
| id | behaviour | radius | threat |
|---|---|---|---|
| bad_zombie | chase | 24 | slow, relentless |
| bad_bat | sine flier | 24 | fast, weaving |
| bad_skull | flash then dash | 24 | telegraphed straight dash |
| bad_slime | hop, splits into 2 small blobs | 24 | splits on death |
| bad_reaper | floats through walls | 24 | cover is useless |
| bad_drone | hover + periodic bolt | 24 | ranged |
| bad_goblin | 1.5x speed, steals coins | 24 | thief |
| bad_bomb | 3-2-1 fuse, radius blast | 24 | area denial |
| bad_cyclops | brute, knockback | 48 | high HP |
| bad_boss | ground-pound shockwave | 48 | big telegraphed ring |

## Behaviour (new content / hub / tests)
`makeEnemy(id, x, y)`, `updateEnemy(e, hero, dt = 1/60, rng)` mutates `e` and returns events (`shoot`, `blast`, `steal`, `knockback`, `shockwave`, `split`, `dead`). Deterministic: pass the seeded rng, no `Math.random`. `hitFlash(e)` sets a 1-frame flash; `spawnSplit(e, rng)` returns the two small slimes. `ENEMY_TYPES`, `ENEMY_SHEET` and `enemySheet(c, {size})` give contact-sheet metadata/drawing. The recipes' own behaviour code is not replaced by `updateEnemy`.
