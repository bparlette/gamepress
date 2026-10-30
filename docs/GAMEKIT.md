# Cabinet game kit (fast path)

A game file is only rules. Shared code lives in `core.js` (draw/audio/sfx), `gamekit.js` (state, bots, popups, BFS) and `loop.js` (title/end/touch).

- `kit({id,t1,t2,sub,music,secs,seed,off,setup(S,att),step(S,dt,inp,att),draw(S),hud(S,mode),bot(S,i),info(S)})` returns `GAME`. Put **all** state on `S` (fresh each run, so no determinism leaks). `S.rng` seeded, `S.T` seconds, `S.score`, `S.pops`.
- Helpers: `popup(S,txt,x,y,col)`, `finish(S,'CLEAR!',bonus)` (attract loops, play ends), `hit(a,b)` AABB, `dist`, `rint(S,n)`, `pick(S,arr)`, `bfs(w,h,pass,sx,sy,goal)` → `{dx,dy,d}`, `dirInp(i,dx,dy)`, `S.edge(inp,'a')` press edge, `MUS(bpm,root,minor)` music preset.
- Never use Math.random/Date.now. Keep art original/generic. Bot must beat or visibly play the level in 30-45 s.
- Put `// KEYS: ...` in the game file for the on-page controls text.

Commands (from `kit/cabinet`): `new.py gN "Title" A B "keys" "mashup"` scaffold, `check.sh gN [secs]` build + bot run + determinism, `ship.sh HAWK_DIR gN…` copy into a Hawk checkout.

More helpers: `lerp`, `bar(x,y,w,h,v,max,col)`, `hintS(S,text,secs)` (real play only), `burst(S,x,y,col,n)` particles (auto-updated/drawn by kit), `hurtS(S,n,[fx,fy])` hp + invulnerability (`S.inv` auto-decays).
Scripts: `qa.sh [secs] [seeds]` builds everything and runs every game on every seed in parallel (table: outcome, time, errors); `sheet.py` makes `out/sheet.png` contact sheet.

## Art quality pass (artkit.js, global `ART`)
Reference target: layered, shaded, lit scenes. Recipe that took Vampire Metroid from flat to rich:
1. **Room**: `ART.bg('gN', fn)` bakes a static room once (floor tiles, brick bands, lockers, pipes, tables, crates, blood) then copies it each frame.
2. **Sprites**: shaded string-grid sprites (`ART.hero/grunt/queen` or your own via `spr`, with palette remap), a 2-frame walk, a shadow under every body, `ART.depth()` to sort by y.
3. **Feedback**: `ART.splat` decals where things die (cap ~70), `ART.gem`, `ART.bullet` trails, `ART.blast` layered explosions, `ART.ring` auras, `ART.flash` on hit, `ART.marker` ring under the hero.
4. **Light**: `ART.fog(x,y)` dithered fog of war after entities, before UI. `ART.dim()` behind menus.
5. **UI**: `ART.bar`, `ART.heart`, `ART.modal`/`ART.card`. **Pixel UI goes in `draw()` or `ui(S)`; `hud()` is text only** (hud runs after the blit, so rect/spr there are silently dropped). `check.sh` lints this.
Judge with `node snap.cjs gN 300 900` (3x zoom frames in out/) and `python3 sheet.py`, not the tiny test screenshots.
Honest ceiling: 22 colours at 256x224 gets "rich 8-bit"; painted HD art like a modern mobile game needs a different renderer (see `docs/ART-UPGRADE.md`).

## Libraries added
`glpost.js` (GLPOST: WebGL overlay, enabled by `window.GLPOST_ON`) and `rigkit.js` (RIG.def/draw/ready, atlas from `window.ATLAS`). Avoid global name collisions: use `RIG.*`, `GLPOST.*`, `HD.*`, `ART.*`.
