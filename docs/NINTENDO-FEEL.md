# NINTENDO-FEEL — Ground-Truth Game Feel for gamepress

`kit/gpfeel.js` packages physics constants, camera logic, enemy AI patterns,
and retro audio synthesis derived from decompiled Nintendo games. Drop it into
any gamepress recipe to get that "Nintendo feel" without guessing.

> API reference: the `gpfeel.js` row in `docs/KIT.md`. Recipe wiring: `docs/RECIPES.md`
> ("Wiring feel into recipes").

## What's in it

| Export | What it does | Source |
|---|---|---|
| `MARIO_PHYSICS` | All SM64 movement constants | n64decomp/sm64 |
| `applyMarioMovement(p, input, dt)` | Drop-in character controller | SM64 movement feel |
| `LAKITU_CAMERA` | Camera distance/height/yaw constants | sm64 camera.c |
| `lakituCamera(cam, target, dt)` | Smooth follow camera | SM64 radial camera |
| `makeFSM(states, initial)` | Deterministic enemy state machine | SM64 Goomba pattern |
| `nesPulse(ctx, opts)` | NES-style pulse wave SFX | NES APU docs |
| `nesNoise(ctx, opts)` | NES-style noise burst SFX | NES APU docs |
| `sfxJump/sfxStomp/sfxCoin(ctx)` | Ready-made retro SFX | — |
| `sphericalGravity(e, center, s, dt)` | Planet-style gravity toward a point + smooth up-vector | Super Mario Galaxy |
| `sphericalJump(e, impulse)` | Jump along surface normal | Super Mario Galaxy |
| `meleeKnockback(p, d, w, s, b, r)` | Smash-style knockback formula | SSBM decomp |
| `meleeHitstun(kb)` / `meleeLaunchSpeed(kb)` | Hitstun frames + launch velocity | SSBM decomp |

## Quick start

```js
import { MARIO_PHYSICS, applyMarioMovement, lakituCamera, makeFSM, sfxJump }
  from '../kit/gpfeel.js';

// Player setup
const player = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, grounded: true, coyoteTimer: 0 };

// Game loop
function update(dt) {
  const input = {
    moveX: keys.right ? 1 : keys.left ? -1 : 0,
    moveZ: keys.up ? 1 : keys.down ? -1 : 0,
    jumpPressed: justPressed('Space'),
    jumpHeld: isDown('Space'),
  };
  applyMarioMovement(player, input, dt);

  // Camera follows
  lakituCamera(camera, player, dt, { yaw: playerYaw });

  // Goomba-style enemy
  goomba.update({ x: goombaX, playerStomped: checkStomp() }, dt);
}

// Jump sound on jump
if (input.jumpPressed) sfxJump(audioCtx);
```

## The key constants (and why they matter)

### Variable jump height
```js
// If jump released early while ascending fast, velocity is quartered.
// Tap = short hop. Hold = full jump. This single mechanic is 50% of "game feel."
jumpCutThreshold: 20.0
jumpCutDivisor: 4.0
```
**Tweak:** Lower `jumpCutDivisor` (e.g. 2.0) for floatier jumps. Raise to 8.0 for snappier.

### Speed-scaled jump
```js
// Jump velocity = 52.0 + forwardSpeed * 0.25
// Running jumps go HIGHER. Rewards momentum.
jumpBaseVel: 52.0
jumpSpeedBonus: 0.25
```
**Tweak:** Increase `jumpSpeedBonus` to 0.4 for a game about speed. Set to 0 for fixed jump height.

### Diminishing-returns acceleration
```js
// forwardVel += 1.1 - forwardVel / 43.0
// Fast start, gentle approach to max. Never feels "capped."
walkAccelBase: 1.1
walkAccelFalloff: 43.0
```
**Tweak:** Lower `walkAccelFalloff` (e.g. 20) for snappier acceleration. This is the "tight vs floaty" knob.

### Gravity and terminal velocity
```js
gravity: 4.0           // per frame at 60fps
terminalVelocity: -75.0
```
**Tweak:** These are tuned together. If you change gravity, scale terminal velocity proportionally.

## Enemy FSM pattern

```js
import { makeFSM } from '../kit/gpfeel.js';

const enemy = makeFSM({
  patrol: {
    enter: (c) => { c.dir = 1; },
    update: (c, dt) => {
      c.x += c.dir * 30 * dt;
      if (c.hitWall) c.dir *= -1;
      if (c.seesPlayer) this.transition('chase');
    },
  },
  chase: {
    update: (c, dt) => {
      c.x += Math.sign(c.playerX - c.x) * 60 * dt;
      if (c.playerGone) this.transition('patrol');
      if (c.stomped) this.transition('dead');
    },
  },
  dead: {
    enter: (c) => { playDeathAnim(c); },
    update: () => {},
  },
}, 'patrol');
```

## Ball sports: pseudo-3D height via separate Z

Classic Technōs / NES sports trick (proven in Retro Pickleball Smash). Track the
ball's **court position** as `(x, y)` and its **aerial elevation** as `z` — three
independent numbers, one render rule:

```js
// Physics
ball.z += ball.vz; ball.vz -= GRAVITY * dt;
if (ball.z <= 0) { ball.z = 0; ball.vz = -ball.vz * BOUNCE; onBounce(); }

// Render
shadow(ball.x, ball.y);                 // shadow stays on the ground
drawSprite(ball.x, ball.y - ball.z);    // ball floats above it
```

Why it wins:

- **Bounce is one comparison** (`z <= 0`). No plane math, no raycasts.
- **Kitchen / no-volley rules become trivial**: a volley is illegal when the
  ball is hit while `ball.z > NET_CLEARANCE` and the hitter stands in the zone —
  ground collision only ever cares about `(x, y)`.
- **Two-bounce rules** (serve + return must bounce before volleys) are just a
  bounce counter per side: `if (ball.z > 5 && !twoBounceOK) fault()`.
- **AI ball tracking** predicts the landing `(x, y)` by simulating the `z`
  parabola — cheap and exact.

**Tweak:** `GRAVITY` and `BOUNCE` set the rally rhythm. Higher gravity = faster,
spikier rallies. Lower bounce = dink-heavy kitchen battles.

## Hit-stop without screen shake

`kit/gp2d.js` ships `g.hitstop(seconds)` and `gpfeel.js` documents a
`HitStopManager` — but the usual pairing is hit-stop *plus* screen shake.
Lesson from the pickleball build: **the freeze alone delivers ~90% of the arcade
"crunch."** When screen shake is vetoed (or the game is too calm for it), freeze
all updates for **4–6 frames (60–100ms)** while still rendering:

```js
if (hitstopFrames > 0) { hitstopFrames--; render(); return; } // skip update
// on a solid slam/volley connect:
hitstopFrames = 5;   // freeze
spawnImpactStarburst(x, y);  // the visible payoff during the freeze
sfx('smash');
```

- Render the frozen frame **plus** the impact effect — the starburst sells the
  hit while the world holds still.
- Trigger on the *connection* frame (paddle meets ball), not on the score.
- 4 frames for volleys, 6 for match-point slams. Longer than ~100ms reads as a
  bug, not juice.

## Legal note

All constants and algorithms in `gpfeel.js` are **mathematical facts** extracted
from reverse-engineered code. Game mechanics are not copyrightable — only
creative expression (art, music, level design, story) is protected.

**What's in here:** Numbers, formulas, state machine patterns. Fair game.

**What's NOT in here:** No Nintendo sprites, models, textures, music, sound
samples, level layouts, or character names. No verbatim code copies — everything
is clean-room reimplemented in JavaScript with source citations in comments.

If you're ever unsure: constants and math = safe. Assets and expression = don't touch.
