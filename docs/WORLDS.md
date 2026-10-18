# Worlds: environment sprites + parallax backdrops

`kit/gpworld.js` is the WORLD layer: 26 environment sprites in the same flat outlined toon style as `gpsprites.js` (honours `STY.ow` and `STY.blocky`). Roles per world live in `WORLDS` (mirrored in `presets/worlds.json`).

Sprites: grass_block, tree, bush, cloud, fence | brick, spikes, torch, tnt, chest, lava_brick | neon_block, saw, laser, spring, spawner, tower | asteroid, ice_block, crystal | coin, gem, crown, heart, key | ruins.

Signature: `drawWorld(kind, c, x, y, size, o)`. `(x, y)` is the centre of a size x size cell; `o.t` animates (flame flicker, saw spin, laser pulse, gem glint).

Worlds: `grassland`, `dungeon` (brick, lava-cracked platforms), `cyber` (neon blocks, saws, lasers, grid backdrop), `cosmic` (star-field, asteroid and ice terrain, crystals). Roles: `ground, platform, wall, hazard, barrier, spring, deco[], pickup, bonus, life, key, goal`, plus `bg, bgTop, bgBot, accent` and `backdrop { far, far2, far3, mid[], gap }`.

## Three layers
1. Backdrop: `drawBackdrop(world, c, w, h, scroll, t)`. Sky gradient plus far silhouette (mountains / stars / neon grid) at 0.1x, minimal and low contrast.
2. Midground: the world's `backdrop.mid` sprites at 0.3x, drawn at 55% alpha.
3. Gameplay: bold-outlined terrain, hazards, pickups drawn by the game with `drawWorld`.

## Using it in a template
```js
import { drawWorld, drawBackdrop, WORLDS } from '../_vendor/gpworld.js';
const W = S.world ? WORLDS[S.world] : null;     // undefined = the current look, unchanged
// createGame({ bg: W ? W.bg : S.bg }) ; in draw: if (W) drawBackdrop(W, c, 540, 960, cam, g.t);
// tiles: W ? drawWorld(W.ground, c, px + T / 2, py + T / 2, T, { t: g.t }) : <old drawing>
```
Only drawing and the bg colour change; collision shapes and bots are untouched, so botcheck results with no `world` are identical.

Templates that honour `world`: precision-platformer (ground/platform, spikes, coins), mini-metroidvania (tiles, spikes, key orb), run-and-gun (ground, turrets as hazard), one-tap-reflex (wall columns with barrier caps, ground), bullet-heaven (gems), grid-chaser (walls, pellets), scrolling-shmup (backdrop + bg).

## CLI
```
gamepress make my-game --recipe one-tap-reflex --spec spec.json    # spec: { "world": "dungeon" }
gamepress theme dogs --world cyber [--only a,b] [--packs]          # ids: dogs-cyber-<recipe>; pack label "Dog Arcade: Cyber"
```
Recipes without world support ignore the key.
