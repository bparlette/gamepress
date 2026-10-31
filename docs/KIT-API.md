# Kit API: signatures and units (one page)
> **Starting a new game of any genre? Read [GENERIC-KIT.md](GENERIC-KIT.md) first** (one-command starters, engines, QA contract, traps, rig table), then [FEEL-SHEETS.md](FEEL-SHEETS.md) and [ART-TRANSFER.md](ART-TRANSFER.md).

Coordinates are LOGICAL: the game world is 256x224 units (y down). Pixel edition: 1 unit = 1 pixel. HD/Art editions: canvas is 768 px wide, ctx pre-scaled 3x, so you still draw in logical units. Tall games: canvas height = 3*`window.HD_H` (224..480), world stays 256 wide.
All colors are CSS strings in HD, palette indexes in the pixel `core.js` helpers.

## gamekit.js: `kit(config)` returns the GAME object
| field | signature / meaning |
|---|---|
| `id,t1,t2,sub,music,secs,seed,off` | ids/titles; `secs` = attract-loop length; `seed,off` feed `runSeed` |
| `dir` | `'4'` (only up/down/left/right), `'8'` (default, adds diagonals), `'any'` (360 degrees; read `inp.ax/inp.ay`) |
| `tall` | `true`: HD canvas fills a portrait screen (height follows the screen; read `window.HD_H`) |
| `setup(S, att)` | build state on `S` (all state lives on S; use `S.rng()` never `Math.random`) |
| `step(S, dt, inp, att)` | one 1/60 s tick. `inp = {l,r,u,d,a,b,pa,pb,start, ax,ay}`; `pa/pb` are edge presses; `ax,ay` in -1..1 (digital keys give -1/0/1). Return `'reset'` to restart attract |
| `draw(S)`, `ui(S)` | pixel edition. Pixel rect/sprite UI goes in draw/ui, NOT hud (hud runs after the blit) |
| `drawHD(S, g, mode)` | HD/Art editions. `g` = 2D ctx in logical units |
| `hud(S, mode)` | text on top of any edition |
| `bot(S, i)` | fill `i` (an `NI()` input) with the bot's move; return it |
| `info(S)` | small JSON of sim state (lvl, hp...) used by `tiers.cjs` and QA |

## hdkit.js `HD` (painted helpers, all take ctx `g` first, logical units)
| call | notes |
|---|---|
| `HD.spr(key,w,h,fn(g,w,h))` | paint once into a cached 3x canvas of w x h logical units; returns canvas |
| `HD.put(g,canvas,x,y,flip,a)` | draw cached sprite, anchor = bottom-centre at (x,y) |
| `HD.puts(g,canvas,x,y,flip,sx,sy,a,tintColor,tintAmt)` | same + squash/stretch scale, alpha, white-flash tint (0..1) |
| `HD.lg(g,x0,y0,x1,y1,[[0,c],[1,c]])`, `HD.rg(g,x,y,r0,r1,stops)` | gradients (radii clamped) |
| `HD.rr(g,x,y,w,h,r)` | rounded-rect path (not filled) |
| `HD.part(g,x,y,w,h,r,c1,c2,line)` | gradient rounded part with outline |
| `HD.ball(g,x,y,r,c1,c2)` | shaded sphere (c1 highlight, c2 shadow) |
| `HD.shadow(g,x,y,rx,ry,alpha)` | soft ellipse contact shadow |
| `HD.glow(g,x,y,r,'r,g,b',alpha)` | additive glow |
| `HD.beginLight(ambientRgba)`, `HD.addLight(x,y,r,intensity)`, `HD.endLight(g)` | 2D darkness layer cut by lights; r in logical units |
| `HD.burst(list,x,y,color,n,speed,size)`, `HD.parts(g,list)` | particles (visual RNG `vr()`, deterministic) |
| `HD.bar(g,x,y,w,h,value01,c1,c2)`, `HD.num(g,str,x,y,color,size,alpha)` | UI bar, floating number |
| `HD.tinted(canvas,color)` | cached colour-silhouette (used for hit flashes) |

## rigkit.js `RIG` (SVG skeletal characters)
| call | notes |
|---|---|
| `RIG.def(name,{scale,anchor:[x,y],order:[parts],pivots:{part:[x,y]},attach:[{key,to,at:[x,y],scale}]})` | `scale` = logical units per SVG unit; `anchor` = SVG point that lands on the (x,y) you draw at (the feet); `order` = back-to-front; `pivots` = SVG point each part rotates about; `attach` = an extra atlas image (e.g. `gun.all`) that follows part `to`, placed at SVG point `at` |
| `RIG.ready(name)` | true once all part images decoded (else fall back to code-painted sprite) |
| `RIG.draw(g,name,x,y,{flip,sx,sy,a,tint,ta,pose})` | `pose = {part:{rot (radians, +clockwise), ox,oy (SVG units), sx,sy}}`; `flip` mirrors horizontally about the anchor |
| `RIG.img['name.part']` | `{im,w,h}` raw atlas image (env tiles use this directly) |

## glpost.js `GLPOST` (WebGL overlay, needs `window.GLPOST_ON`)
| call | notes |
|---|---|
| `GLPOST.clear()` | once per frame before adding lights/haze |
| `GLPOST.light(x,y,r,i,[r,g,b])` | max 8. x,y SCREEN-normalised 0..1 (convert: `((wx-camX)*zoom+128+shakeX)/256`, `((wy-camY)*zoom+HH/2+shakeY)/HH`); r = fraction of screen width (0.3 = a third of the screen); i = intensity (0.5 soft, 2 flash) |
| `GLPOST.hazeAt(x,y,r,k)` | max 3, same coords; heat-distortion strength k 0..1 |
| `GLPOST.fx = {ca,hurt,flash,ember}` | chromatic kick (0..1.6), red low-HP vignette (0..1), white flash (0..1), ember density (0..1) |
| `GLPOST.q = {bloom,grade,ca,grain,vig}` | global strengths (default 1) |

## artkit.js `ART` (pixel-art helpers, 256x224 palette buffer)
`ART.bg(key,fn)` bake background once; `floor(y0,y1,base)`, `brick(y,h,rows)`, `lockers(n,x0,gap,y)`, `hazard(y)`, `pipes(y0,y1)`, `table(x,y)`, `crate(x,y)`, `barrel(x,y)`, `blood(n)`, `splat({x,y,k,el})`, `shadow(x,y,w)`, `depth([{y,draw}])`, `fog(cx,cy,r1,r2)`, `dim()`, `bar(x,y,w,v01,fg,bg)`, `heart(x,y)`, `modal(x,y,w,h)`, `card(x,y,w,h,selected)`.

## Input (core.js)
Touch pad looks like a d-pad but is a stick: angle+strength decide output. `GAME.dir` picks the mapping (see table). Keyboard feeds the same fields.
