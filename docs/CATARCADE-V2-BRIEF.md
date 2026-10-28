# CAT ARCADE v2 — BUILD BRIEF (read this before writing a line)

You are rebuilding **one game** of a 30-game suite so that it feels like a **$4.99 premium arcade game**, not a canvas demo.
The player sees each game for **20–45 seconds** in a rotation. Every second must be alive.

---

## 0. The non-negotiables (the rotation runner breaks without these)

1. **File layout** — exactly two files, no others:
   - `hawk-main/brad-demos/g/_v2/<id>/index.html`
   - `hawk-main/brad-demos/g/_v2/<id>/game.js`
2. **`index.html` is always this** (only `<title>` changes):

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#060912">
<title>TITLE — Cat Arcade</title>
<style>html,body{margin:0;height:100%;background:#060912;overflow:hidden;touch-action:none}</style>
</head>
<body>
<script src="../_vendor/gsap.min.js"></script>
<script type="module" src="./game.js"></script>
</body>
</html>
```

3. **No network requests.** No CDN, no fonts, no images. Everything is drawn in canvas from `_vendor/`. Load target is **< 200 ms**.
4. **`postMessage` contract is handled by the engine — do not re-implement it.** `gp2d.js` posts `{gp:'started'}` on first input under `?hold=1` and `g.end()` posts `{gp:'end', win, score}` under `?pack=1`. You only have to **call `g.end(...)` on every terminal path** (win AND lose).
5. **`?auto=1` bot must be able to WIN.** `g.dumb()` is true on attempt 0 (bot loses on purpose for video). After the auto-reset, your bot branch must win reliably. If the bot cannot win, the game FAILS QA.
6. **Portrait 540 × 960.** Touch, mouse and keyboard all work. First touch must be the actual input — never a swallowed "tap to start".
7. **No `g.mode === 'title'` menu of your own.** Games start hot.

---

## 1. Import surface

```js
import { makeGame, sfx, music, comboPitch, setMuted, Matter, gsap, TAU,
         rr, circle, seg, lerpAngle, approach, damp, hexA, fmt, shadow, squish,
         panel, pill, FX, Phys, starfield, starPath, heartPath } from '../_vendor/gp2x.js';
import { clamp, lerp, rnd, ri, pick, chance, shuffle, R, sign, dist, ang, smooth,
         ease, aabb, circ, inRect, shade, tweens } from '../_vendor/gp2x.js';
import { drawChar } from '../_vendor/gpsprites.js';
```

`drawChar(kind, ctx, x, y, h, {dir, anim, t, color, hurt})` — the cast, verified present:
`cat dog zombie person car duck penguin capybara axolotl dino bunny frog robot spud bean
jester vampire joker ragdoll noob hacker melon scrapper reaper raccoon doge slime phantom
banana capyyuzu duckknife mushfrog`.
`y` is the **feet** baseline, `h` is height in px. The hero should be a `drawChar` sprite (or an
equally rich hand-drawn shape) — never a plain circle.

Verified `sfx()` names — using anything else throws:
`jump coin coinchain hit crit boom explode shoot laser zap pop ding perfect click merge
powerup unlock fanfare thud drum step whoosh slice meow bark groan glass splat splash
charge shield snap blip pour tick win lose`
Verified `music()` tracks: `action chase boss puzzle cozy tense epic menu`.

### `makeGame(opts)`
```js
const g = makeGame({
  id: 'kebab-id', title: 'SCREAMING TITLE', sub: 'TAP TO DO THE THING',
  hook: 'the one line a viewer reads', w: 540, h: 960, bg: '#060912',
  bloom: .8, ca: .35, vig: 1, scan: .2,   // post-processing strength
});
```
Available on `g`:
| | |
|---|---|
| `g.W g.H g.ctx g.t g.dt` | canvas + clock |
| `g.taps` | array of `{x,y}` taps this frame (cleared each frame) |
| `g.pressed` / `g.keys` | keyboard (codes) |
| `g.ptr` | `{x,y,down}` pointer |
| `g.btn(id,x,y,w,h,label,{key})` | on-screen button → `{held, pressed}`, bot can press via `g.sim[id]` |
| `g.fx` | particle engine: `.burst .blast .ring .dust .emit .trailDot .text .clear` |
| `g.impact(x,y,{punch,shake,stop,flash,flashA,rip,sfx,pitch})` | the one-call hit feel |
| `g.punch(a)` `g.shake(a)` `g.hitstop(s)` `g.slowmo(f,s)` `g.flash(c,a)` | individual juice |
| `g.combo` | `.hit(x,y,label)` `.miss()` `.mult` `.n` `.best` `.reset()` |
| `g.popup(text,x,y,color,size)` `g.showBanner(text,secs)` | floating text |
| `g.text(str,x,y,{size,color,align,stroke,ink})` `g.bar(...)` | text/bar helpers |
| `g.sky(ctx,[c1,c2,c3],{glow,gx,gy,gr})` | gradient backdrop |
| `g.hero(ctx,kind,x,y,h,{dir,color,glow,anim})` | hero + shadow + rim glow |
| `g.score` `g.state` `g.best` | score + the object exposed to tests via `window.__game` |
| `g.end({win,score,label,progress})` | **terminal path — call this** |
| `g.dumb()` `g.auto` | bot helpers |
| `g.onReset` `g.onStart` | hooks |
| `g.punch(target,key,amount)` `g.tween(o,k,to,d,ease,then)` | tweening |

Particles: `g.fx.burst(x,y,n,{kind,color,speed,life,size,ang,spread,g})` where `kind` ∈
`spark dot glow smoke debris ring shard confetti heart feather star bolt bubble`.
`g.fx.blast(x,y,{r,color,colors,n,speed,flashA,punch,shake})` = ring + sparks + smoke + flash + ripple + camera punch.
`g.fx.ring(x,y,{r,color,life,wide,ripple})` = one expanding ring + a screen ripple. The cheapest way to make a beat readable.

---

## 2. The $4.99 quality bar — all 10, every game

1. **Depth.** 3 layers minimum: sky/gradient → far parallax → mid → play field → foreground. A flat single-colour background is an automatic reject.
2. **Living hero.** Cat sprite with idle bob, squash on land, stretch on launch, direction flip, and a hurt flash. Never a static shape.
3. **Feedback on every input within 50 ms** — a squash, a spark, a sound, a punch. No silent taps.
4. **Particles on every event.** Collect, hit, land, kill, combo, win. `g.fx` is cheap; use it.
5. **Camera.** `g.impact()` on hits, `g.shake` on damage, `g.slowmo` on the big moment, `g.punch` on landings. Restraint: the camera should feel weighty, not drunk.
6. **Audio layers.** `music('chase'|'action'|'calm')` on start, `sfx(...)` with `comboPitch()` climbing on streaks, a distinct sound per event type. Read `gpsnd.js` for the sfx dictionary — only use names that exist.
7. **Difficulty curve.** Starts easy, ramps every 5–8 seconds, never spikes unfairly. The first 3 seconds must be winnable by a distracted human.
8. **A goal you can see.** HUD shows score + progress to the win (bar, counter, or distance). The player always knows how close they are.
9. **Legible at a glance.** 3-second rule: an orange cat, a clear enemy colour, a clear goal. High contrast, thick outlines, no muddy palettes.
10. **Win and lose both land.** Win = celebration (confetti, fanfare, slowmo). Lose = the SO CLOSE panel. Pass `progress` to `g.end` so the engine can show "💥 SO CLOSE! (78%)".

### Performance
- Target 60 fps on a 2020 phone. Cache gradients/layouts outside the draw loop; **zero allocations per frame** in hot paths (no `new`, no array literals inside `draw`).
- Cap particles: `if (g.fx.p.length > 400) …` — the engine caps at 900, you should stay well under.
- Never `ctx.filter`, never `shadowBlur` on more than ~20 objects per frame.

---

## 3. Bot contract (`?auto=1`)

```js
const isAuto = new URLSearchParams(location.search).has('auto');
// inside update:
if (isAuto && g.mode === 'play') botThink();
```
- `g.dumb()` true → play badly on purpose, lose inside ~6–10 s. This is the video's fail state.
- Otherwise → play near-perfectly and **reach the win condition**.
- Never let the bot stall forever: add a safety `if (autoT > 90) g.end({win:true,score,label})`.
- The bot must not rely on luck: if there is randomness, either remove it from the win path or seed it deterministically.

---

## 4. Verify before you say you're done

```bash
cd /Users/braidpairlette/.gemini/antigravity/scratch/gamepress
SECS=10 node scripts/qa.mjs <id>
```
Must print `PASS`. It checks: first paint < 200 ms · zero console errors · `hold` freezes the sim ·
first touch posts `started` · a run posts `end` with a numeric score · **bot wins** · fps.
Loop `node scripts/qa.mjs <id>` until it passes. Also sanity-check the picture:

```bash
node scripts/peek.mjs <id>      # renders the canvas as ASCII in the terminal
```

Then report: id, what the mechanic is, win condition, bot strategy, and the final QA line.

---

## 5. Style rules

- **Palette:** pick 2 dominant + 1 accent. Saturated, high contrast, dark backgrounds so bloom reads. No pure `#000` and no grey mush.
- **Type:** `Impact, "Arial Black"` via `g.text`. Big, chunky, black outline, tight leading. Numbers are the hero of the HUD.
- **Motion:** everything eases. `damp()`, `lerp()`, springs — never linear teleporting. Idle animation on *everything* on screen.
- **Sound design:** low thud for weight, bright ping for reward, rising pitch for streaks, a crunchy noise burst for destruction.
- **Restraint:** the post-processing is already strong (bloom + CA + vignette). Don't fight it with neon soup — let one or two colours glow.

Do **not** touch `_vendor/`, other games' folders, `games.json`, the pack pages, or the originals in `g/_v1/`.
