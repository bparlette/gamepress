# SM64 DS — Mario Movement Physics

**Source:** `github.com/tangosdev/sm64ds-decomp` (Super Mario 64 DS decompilation, ~100% matched)
**Extracted:** Oct 19, 2026
**Scope:** mechanics only — numbers, formulas, state machines. No textures, models, audio, or level data.

All player logic lives in `src/game/player/Player.cpp` (all `Player::St_*` states). Camera follow + wall collision in `src/unnamed/arm9/0200/func_02009e70.cpp`, C-button orbit/recenter in `func_0200bb28.c`, shared easing helpers in `src/ApproachAngle.cpp`.

## Number system

```c
// Fixed point: fx12 — 0x1000 == 1.0   (0x28000 == 40.0)
// FX_MUL(a, b) = (a * b) >> 12        (fixed-point multiply)
// Angles: binary, 0x10000 == 360°. So 0x4000 == 90°, 0x2000 == 45°, 0x8000 == 180°.
// All speeds are per FRAME at 30 fps (the game's logic tick).
```

fx12 → float (divide by 4096): `0x800`=0.5, `0xd00`=0.8125, `0x1000`=1.0, `0x1800`=1.5, `0x2000`=2.0, `0x3400`=3.25, `0x4000`=4.0, `0x8000`=8.0, `0xa000`=10.0, `0xc000`=12.0, `0x10000`=16.0, `0x12000`=18.0, `0x14000`=20.0, `0x1c000`=28.0, `0x1e000`=30.0, `0x20000`=32.0, `0x24000`=36.0, `0x25800`=37.5, `0x28000`=40.0, `0x2a000`=42.0, `0x2aa00`=42.625, `0x3c000`=60.0, `0x3e000`=62.0, `0x40000`=64.0, `0x4b000`=75.0, `0x4c000`=76.0, `0x64000`=100.0.

```c
// The two workhorse helpers (src/ApproachAngle.cpp):
int ApproachLinear(int &ref, int target, int step) {
    // steps ref toward target by ±step per frame; snaps and returns 1 on arrival
}
int ApproachAngle(short *cur, short target, int divisor, int band, int maxStep) {
    // step = (target - cur) / divisor, clamped to ±band;
    // if |step| <= maxStep, moves at least ±maxStep. Snaps on arrival.
}
```

## Ground movement (St_Walk / func_ov002_020d3b9c)

```c
// --- Stick magnitude → target speed (mode 1; mode 2 uses wider constants) ---
deadzone = 0x471;  stickMax = 0x955;             // out of ~0xFFF
if (stick <= deadzone)      target = 0;
else if (stick <= stickMax) {                    // gentle "walk" zone
    t = (stick * 0x24) >> 12;                    // t: 0xa .. 0x15 across the zone
    target = ((t - 0xa) << 15) / (0x15 - 0xa);   // → 0 .. 0x8000 (8.0)
} else
    target = clamp(0x28000 * charFactor, min 0xa000);   // full tilt: 40.0 × char

// --- Speed integration (every frame) ---
ApproachLinear(&mHorzSpeed, target, accel);
if (target != 0) ApplySlopeAccel();          // downhill/uphill modifier
```

| Constant | Value | What it controls |
|---|---|---|
| `0x1000` | 1.0 /frame² | ground acceleration (walk) |
| `0x1e000` | 30.0 /frame² | burst accel, applied with a ×1.2 speed kick (`FX_MUL(spd, 0x1333)`) |
| `0x2000` | 2.0 /frame² | skid friction on normal ground (~0.7 on class-3, ~0.2 on class-4/5 surfaces — see Slope) |
| `0x4000` | 4.0 /frame² | decel when stick released & mega |
| `0x10000` | 16.0 | **skid threshold** — releasing the stick above this clamps speed to 16.0 and plays the skid (friction 2.0 until stopped) |
| `0xa000` | 10.0 | below this on release → `mStateTimer = 0x3c` (60-frame "was moving" window) |

- **Speed cap on walk entry:** `mHorzSpeed` clamped to `char(0x28000)` = 40.0; reverse clamped to `-0xe000` = −14.0.

## Turning (ground)

```c
// Turn-around (entered from walk when ALL true):
//   stick turn angle diff > 0x6000 (135°) AND mHorzSpeed >= char(0x1c000) (28.0)
//   AND not mega
// St_TurnAround_Main, per frame:
ApproachAngle(&mPrevAngleY, desiredAngle + 0x8000, 0x10, 0x1000, 0x200);  // 2.8°/frame max
ApproachLinear(&mHorzSpeed, -char(0x28000), turnaroundDecel);             // toward -40.0
// exits when mHorzSpeed <= 0x12000 (18.0) after the turn anim finishes
turnaroundDecel = 8.0 /frame² on normal ground (~2.8 on class 3, ~0.8 on class 4/5)
```

- **Steering while walking:** `ApproachAngle(&mPrevAngleY, target, dv, 0x2000, step)` — divisor starts at 4 (snappy) and degrades toward 16 the longer you hold a sharp turn, i.e. turning gets harder the longer you hold it. Minimum turn rate 0.18°–0.7°/frame, up to 45°/frame.
- **Visual facing:** `ApproachAngle(&mAngleY, mPrevAngleY, 4, 0x2000, 0x800)` — the model lags the movement direction, max 11.25°/frame.

## Air movement (func_ov002_020e28d4)

Called every airborne frame: St_Jump_Main with `(accel=0xd00, decel=0x800)`, St_Fall_Main/St_WallJump_Main with `(0x1800, 0x800)`:

```c
target = clamp(char(0x21000), min char(0xa000));   // 33.0 max air target, 10.0 min
ApproachAngle(&mPrevAngleY, stickYaw, 0x10, 0x100, 0);   // ~1.4°/frame, decaying
ApproachLinear(&mHorzSpeed, target, accel);              // accel 0.8125 or 1.5 /frame²
// Air brake: turn > 0x4000 (90°) while speed >= 0x10000 (16.0):
//   mHorzSpeed -= 0x2000 (2.0) that frame
```

## Jumps

**Combo logic (St_Jump_Init):** stage advances `(stage+1) % 3` if `mJumpComboTimer != 0` (timer = 0x14 = 20 frames ≈ 0.67 s, armed on landing). Reset to stage 0 by: sink depth > 0x1000, carrying an object, mega, or — at stage 2 without wings — speed ≤ `char(0x14000)` (20.0).

```c
// Vertical launch:
v = jumpTable[mJumpComboStage] + (mHorzSpeed >> 2);   // table = ROM .data (see below)
mVertSpeed = FX_MUL(v, charVertFactor);
if (mIsMega) v = FX_MUL(v, 0x1400);                   // mega jump × 1.25
// Horizontal on jump:
mHorzSpeed = FX_MUL(mHorzSpeed, 0xccc);               // × 0.8
if (AngleDiff(mPrevAngleY, mAngleY) >= 0x4000)         // ≥ 90° snap-turn
    mHorzSpeed >>= 2;                                 // quartered
mHorzSpeed = min(mHorzSpeed, char(0x64000));           // hard cap 100.0
```

| Jump | Vertical speed | Horizontal |
|---|---|---|
| Single / double / triple | `jumpTable[stage] + horz/4`, × char factor | × 0.8, cap 100.0 |
| Wall jump | `0x3e000` = 62.0 (× char factor); char 2 fixed `0x2aa00` = 42.625 | `0x18000` = 24.0, instant 180° snap (`mAngleY += 0x8000`) |
| Backflip | `0x3e000` = 62.0; `0x4c000` = 76.0 if param1==1 | `0x10000` = 16.0, 180° snap |
| Long jump | `0x1e000` = 30.0 | `× 1.5` (FX_MUL 0x1800), cap `0x3c000` = 60.0 |
| Dive | `0x1e000` = 30.0 | clamped to 40.0 |
| Ground pound | slam `-0x20000` = **−32.0** (fixed, instant) | 0 |
| Cannon launch | `0x20000` = 32.0 | `0xc000` = 12.0 |
| Bonk rebound (wall) | `0x8000` = 8.0 up | `0x40000` = 64.0 away from wall |
| Ceiling bonk | set to `-0x1000` = −1.0 | — |
| Landing bounce (bonk state) | `(−impactSpeed) / 3`, zeroed if ≤ `0x1000` | — |

> **Could not recover:** `data_ov002_0210a59c[3]` — the per-stage base launch velocities — and the two character factor tables (`data_ov002_020ff140` vertical factor, `data_ov002_020ff170` general speed factor, per character 0..3 = Mario/Luigi/Yoshi/Wario). These are ROM `.data` literals; the repo contains no baserom dump. The formulas above are exact; only the table contents need the ROM.

## Gravity & terminal velocity

One of four per-character handlers runs each airborne frame (pmf table `data_ov002_0211073c[param1]`, param1 = character). Three bodies recovered; which character maps to which is **unresolved** (table is ROM-initialized data).

```c
// Typical handler (e.g. func_ov002_020e200c):
mVertAccel        = charGravityScale(-0x4000);   // falling: -4.0 /frame²
mTerminalVelocity = -0x4b000;                    // -75.0 /frame
if (mVertSpeed >= 0) {                           // rising:
    mVertAccel = -0x8000;                        // -8.0 /frame² (button released)
    if (jumpButtonHeld) mVertAccel = -0x3400;    // -3.25 /frame² (button held)
}
// Wing-cap glide (falling + button held + wings):
mVertAccel = -0x2000;                            // -2.0 /frame²
mTerminalVelocity = -0x25800;                     // -37.5 /frame
// Yoshi-style flutter handler: while falling + button held → mVertAccel = 0 (hover)
// Triple jump (St_Jump_Main, stage 2):
mVertAccel = -0x4000;                            // falling -4.0
if (mVertSpeed >= 0) mVertAccel = -0x3400;       // rising -3.25 (no -8.0 slam)
mTerminalVelocity = -0x4b000;                     // -75.0
```

- **Character gravity scaler** `func_ov002_020bf27c(c, r)`: mega → r; char 3 → `r × 0x5a/100` (× 0.9); char 1 → `r >> 2` (× 0.25); else r. Applied to fall gravity in some handlers.
- **Variable jump height** is the −8.0/−3.25 split: release the button early and gravity more than doubles on the way up. This is the core game-feel trick.
- **Head bonk:** ceiling contact zeroes upward speed to −1.0.

## Speed tiers

| fx12 | Float | Meaning |
|---|---|---|
| `0xa000` | 10.0 | minimum air/full-stick target; walk-timer cutoff |
| `0x10000` | 16.0 | skid threshold; air-brake threshold |
| `0x12000` | 18.0 | turn-around exit speed |
| `0x14000` | 20.0 | triple-jump speed gate |
| `0x1c000` | 28.0 | turn-around trigger speed (with 135° stick turn) |
| `0x24000` | 36.0 | walk "run tier" marker (anim/sound flag) |
| `0x28000` | 40.0 | **max walk speed**; dive clamp; turn-around target −40.0 |
| `0x3c000` | 60.0 | long-jump horizontal cap |
| `0x64000` | 100.0 | jump horizontal hard cap |
| `0x40000` | 64.0 | bonk rebound speed |

## Slope physics

Floor classes 0–5 (per-triangle collision data). Two thresholds per class:

```c
// Slide test (func_ov002_020f035c): slides if mFloorNormalY <= v
class 0: v = 0xf74  (~14.4°)    class 1,2: v = 0xf08  (~19.6°)
class 3: v = 0xfc1  (~10.0°)    class 4:   v = 0xff0  (~5.2°)
class 5: v = 0xfff  (~1.1°)      // nearly anything slides
// Skid/turn friction multiplier (func_ov002_020bf56c):
class 0,1,2: ×1.0   class 3: ×0.35   class 4,5: ×0.10
// Slope accel (func_ov002_020c04e0), only on slopes steep enough to slide:
accelBase = {0: 0x1b33 (1.7), 3: 0x2b33 (2.7), 4,5: 0x54cc (5.3), 1,2: 0};
speed = clamp(mHorzSpeed - 0x13000, 0x1000, 0x1800);   // ~1.0–1.5×
accel = FX_MUL(accelBase, speed);                       // × floor-normal horizontal length
mHorzSpeed += (facing downhill ? +accel : -accel);      // downhill = < 90° from move dir
```

## Camera

`dCamera_c` (include/dCamera_c.h): lookAt/pos pair, per-frame `Behavior()`.

**Follow (func_0200bb28, the standard overworld mode):**
```c
lookAt = player position (every frame)
// camera offset from CamMode tables (distance/height params), rotated by eased yaw
ApproachLinear(easedYaw, baseYaw + offset, 0x800);          // 11.25°/frame max
ApproachLinear(camPos, targetPos, recenter ? 0xc0000 : 0x40000);
camY eased via rate 0x300, limit 0x14000, step 0x100
// C-buttons: yaw offset steps ±0x2000 (45°), 0x14 (20-frame) repeat delay
// R/L-recenter (button 0x4000): ApproachAngle(easedYaw, behindPlayer, 4, 0x400, 0x100)
//   → 1.4°/frame max recenter swing
```

**Wall collision (func_02009e70):**
```c
// Every frame: line-probe from (playerPos at playerY + 0x82500 ≈ +130 units)
// to camera pos. On wall hit: store hit point + normal; steer camera yaw away:
//   targetYaw = atan2(normal.x, normal.z) + 0x8000 ± 0x4000 (away from wall face)
//   ApproachAngle(mAngleY, targetYaw, 0x10, 0x200, 0x100);  // 1.4°/frame max
// Dedup: ignore hits with a same-facing normal or within 0x80000 (128 units)
//        of the last wall hit
// Minimum camera distance: 0x1000 (1.0) — camera never closer to its lookAt
// Ceiling: probe camera pos + 0x100000 (256 units) up; clamp camera Y under it
// Auto-follow: when farther than the mode's near distance, ease yaw behind the
//   player at ApproachAngle(0x14, 0x600, 0x28) — very slow, 0.22°/frame max
```
- Projection seed: aspect `0x1555`, near `0x1000`, far `0x1388000`. FOV blend toward `0xaaa` on zoom states.
- Camera shake: `mShakeY` added to both lookAt and pos, decays and flips sign per frame; armed by hard landings (fall distance > `0xbb8000` ≈ 3000 units), bonks, quakes.

## State machine (player)

`Player::State` = {Init, Main, Cleanup} pointer-to-member triple; `ChangeState` runs cleanup (vetoable) then init. Movement-relevant states declared in Player.h:

```
Wait, Walk, TurnAround, Jump, Fall, Land, Bonk, SlideKick(+Recover), LongJump,
Dive, BackFlip, SideFlip, WallJump, WallSlide, OnWall, SlopeJump,
GroundPound, Climb, LedgeGrab, LedgeHang, Crawl, Crouch, ButtSlide,
StomachSlide, Swim, Shell, Spin, TornadoSpin, Headstand(+Jump),
HoldLight, HoldHeavy, PunchKick, SweepKick, Throw, Thrown,
Talk, Hurt(+Water), Squish, BurnFire, BurnLava, Electrocute, DizzyStars,
DeadHit, DeadPit, Respawn, LevelEnter, Balloon, Owl, MetalWater*,
Cannon, CameraZoom, NoControl, Teleport, WindCarry, CrazedCrate,
Grabbed, GrabBowserTail, StuckInGround, WaitQuicksand, JumpQuicksand
```

## Honest gaps

1. **Jump base velocities** `data_ov002_0210a59c[3]` — ROM `.data`, not in the repo. Formula is exact (`table[stage] + horz/4`, × char factor).
2. **Character factor tables** `data_ov002_020ff140` (vertical) / `data_ov002_020ff170` (general) — same, ROM `.data`.
3. **Which of the 4 per-character gravity handlers belongs to which character** — the dispatch table is ROM-initialized; 3 of 4 bodies recovered.
4. **30 fps** is the standard SM64DS logic tick and consistent with all frame-count timers in the code (e.g. 0x1e = 30-frame water-run), but the decomp never states it outright — treat "/frame" as the logic frame.
5. CamMode distance/height table literals (`data_02086cc8` etc.) — ROM `.data`; the follow algorithm is exact.

## gamepress recipe mapping

- **precision-platformer** — the big one. Variable jump height (−8.0 released vs −3.25 held) is the core game-feel formula; jump velocity `base + horzSpeed/4` makes running jumps go higher; the 20-frame combo window for double/triple jumps; ground accel 1.0 / air accel 0.8125 / air decel 0.5 split; the 90° air-brake (−2.0/frame) punishes bad air steering; speed tiers 10→16→20→28→40 give clean walk/run/sprint bands. Lift the whole Jump + Air + Gravity sections.
- **obby-gauntlet** — wall jump (62.0 vert / 24.0 horiz / instant 180° snap), long jump (30.0 vert, ×1.5 horiz capped 60.0), dive (30.0), triple-jump speed gate (20.0), bonk rebound (64.0 away + 8.0 up), ground-pound slam (−32.0). These are the obstacle-course verbs.
- **mini-zelda** — camera follow + wall-probe collision (the probe-from-player-height pattern and the 1.4°/frame steer-away are directly reusable), stick deadzone 0x471 + linear zone mapping, walk accel/decel + skid friction, slope classes with per-class slide angles (14.4°/19.6°/10°/5.2°/1.1°) and friction multipliers (×1.0/×0.35/×0.10).
- **kart-racer** — least direct fit, but reusable: `ApproachLinear`-based speed model, dash burst (speed ×1.2, accel 30.0) as a boost-pad formula, turn-around state as a drift/U-turn template (135° trigger at 28.0, decel 8.0 toward −40.0), and the surface-friction multipliers for off-road vs road. Note: no real kart physics in this source.
