# Cabinet game kit (fast path)

A game file is only rules. Shared code lives in `core.js` (draw/audio/sfx), `gamekit.js` (state, bots, popups, BFS) and `loop.js` (title/end/touch).

- `kit({id,t1,t2,sub,music,secs,seed,off,setup(S,att),step(S,dt,inp,att),draw(S),hud(S,mode),bot(S,i),info(S)})` returns `GAME`. Put **all** state on `S` (fresh each run, so no determinism leaks). `S.rng` seeded, `S.T` seconds, `S.score`, `S.pops`.
- Helpers: `popup(S,txt,x,y,col)`, `finish(S,'CLEAR!',bonus)` (attract loops, play ends), `hit(a,b)` AABB, `dist`, `rint(S,n)`, `pick(S,arr)`, `bfs(w,h,pass,sx,sy,goal)` → `{dx,dy,d}`, `dirInp(i,dx,dy)`, `S.edge(inp,'a')` press edge, `MUS(bpm,root,minor)` music preset.
- Never use Math.random/Date.now. Keep art original/generic. Bot must beat or visibly play the level in 30-45 s.
- Put `// KEYS: ...` in the game file for the on-page controls text.

Commands (from `kit/cabinet`): `new.py gN "Title" A B "keys" "mashup"` scaffold, `check.sh gN [secs]` build + bot run + determinism, `ship.sh HAWK_DIR gN…` copy into a Hawk checkout.

More helpers: `lerp`, `bar(x,y,w,h,v,max,col)`, `hintS(S,text,secs)` (real play only), `burst(S,x,y,col,n)` particles (auto-updated/drawn by kit), `hurtS(S,n,[fx,fy])` hp + invulnerability (`S.inv` auto-decays).
Scripts: `qa.sh [secs] [seeds]` builds everything and runs every game on every seed in parallel (table: outcome, time, errors); `sheet.py` makes `out/sheet.png` contact sheet.
