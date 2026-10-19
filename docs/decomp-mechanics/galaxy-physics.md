# Super Mario Galaxy — Physics Mechanics (Decomp Reference)

**Source:** `github.com/shibbo/Petari` (SMGCommunity Petari decompilation of Super Mario Galaxy)
**Extracted:** October 19, 2026
**Scope:** mechanics only — numbers, formulas, state machines. No assets, models, textures, audio, or level data.

## Decompilation completeness (honest note)

The repo README describes itself as "a work-in-progress decompilation" and tracks progress on decomp.dev (badges in README). Community reports variously claim the project is ~23% complete (retroreversing-style aggregate) or ~100% of main.dol matched; I did not verify either claim — what I actually found in the local copy:

- `src/Game/Gravity/` — **13 of 14 files fully decompiled** (the 14th, `GravityInfo.cpp`, is a trivial 15-line constructor; all shapes fully readable)
- `src/Game/Player/` — **~101 of 107 files decompiled** (6 short stubs; `MarioMoveSphere.cpp` is constructor-only, but its logic lives in `MarioMove.cpp` which is complete)
- `src/Game/Camera/` — **~88 of 127 files decompiled** (39 short stubs; `CameraFollow` and the planet-camera translators are complete)
- `src/Game/MapObj/` — **~310 of 317 files decompiled**
- `src/Game/Util/` — **~71 of 76 files decompiled**
- **Zero `NONMATCHING` markers** in `Gravity/` and `Player/`

Everything quoted below was read from actual decompiled source in the repo, not inferred from gameplay. Where something was *not* in the decomp, I say so. File paths are relative to the Petari repo root.

**Units:** 1 unit/frame, game runs at 60 fps. Mario's body hit-sensor radius is **100 units** (so ~200 units tall) — use that as your yardstick. All "jump heights" in the const table are **initial velocities**, not heights; true apex = v² / (2·g).

---

## 1. The gravity system

### Architecture (`src/Game/Gravity/`)

Gravity fields are placed in stages by designers. Each field is a `PlanetGravity` subclass registered with `PlanetGravityManager`, which computes the total gravity *direction* at any point.

Gravity types and powers (`include/Game/Gravity/PlanetGravity.hpp`):

```cpp
// Gravity type flags (bitmask — an actor can filter which it responds to)
#define GRAVITY_TYPE_NORMAL         1
#define GRAVITY_TYPE_SHADOW         2
#define GRAVITY_TYPE_MAGNET         4
#define GRAVITY_TYPE_MARIO_LAUNCHER 8

// Gravity power
#define GRAVITY_POWER_LIGHT   0
#define GRAVITY_POWER_NORMAL  1
#define GRAVITY_POWER_HEAVY   2
```

Each field also has: `mRange` (influence radius; -1 = infinite), `mDistant` (shell offset subtracted from distance before falloff), `mPriority`, `mIsInverse` (flips direction), `mActivated`, `mValidFollower` (valid only if its host object is alive/visible).

### The master gravity formula (`PlanetGravity::calcGravity`)

```cpp
// radius = distance from mass center, minus mDistant (shell offset), clamped >= 1.0
radius = max(radius - mDistant, 1.0f);
f32 scalar = 4000000.0f / (radius * radius);   // inverse-square falloff
gravity = directionToMass * scalar;
if (mIsInverse) gravity = -gravity;
```

What it controls:
- Gravity strength falls off with the **square of distance** from the planet center.
- The constant **4,000,000** sets the falloff steepness; `mDistant` lets designers model a solid shell (e.g. a planet with radius 500 uses `mDistant = 500` so the shell surface is distance zero).

### Priority resolution (`PlanetGravityManager::calcTotalGravityVector`)

```cpp
// gravities are sorted by mPriority, descending
// for each active, matching-type gravity that contains the point:
//   - same priority as current best  -> ADD its vector to the total
//   - higher priority than current   -> REPLACE the total with its vector
//   - lower priority                 -> stop (list is sorted)
// result = normalize(total)          // <-- magnitude is DISCARDED
return (at least one gravity applied);
```

What it controls:
- **Direction only is used by actors.** The 4,000,000/r² magnitude exists only to weight same-priority overlaps; Mario's actual fall *speed* comes from his own const table (see §5). This is the single most important design takeaway: **separate gravity direction (world geometry) from gravity strength (character tuning)**.
- If no field contains the point, gravity is the zero vector (zero-G drift).

### Gravity field shapes — direction computation

All return a *unit direction* + scalar distance via `calcOwnGravityVector`:

| Shape | Direction toward | Key behavior |
|---|---|---|
| **PointGravity** | `(mTranslation - position).normalized()` | Classic planetoid pull; epsilon-guarded at the exact center |
| **ParallelGravity** ("plane") | `-mWorldPlaneUpVec` | Flat uniform field, like classic platformers. Range can be sphere, axis-aligned **box**, or **cylinder** (radius/height from stage scale × 500) |
| **DiskGravity** | `∓mWorldNormal` (above/below the disk) | Pulls onto a flat disk surface. Optional: one-sided, edge gravity (pulls toward nearest rim point when outside the radius), angular sector limit (`mValidDegree`) |
| **ConeGravity** | Along cone axis / toward nearest cone surface point | Cone (frustum, with top-cut rate) fields |
| **CubeGravity** | Nearest point on active **faces**, then edges, then corners | Cuboid planets; per-face enable bitmask; falls back face→edge→corner |
| **SegmentGravity** | Nearest point on a line segment (+ optional hemisphere caps at ends) | Long capsule/rod planets; optional per-end caps and angular sector limit |
| **WireGravity** | Nearest perpendicular foot on a polyline rail | Gravity along a spline path (used with rail-following objects) |
| **DiskTorusGravity** | Toward the torus ring (edge type selectable) | Ring/donut planets; `mDiskRadius` arg sets inner radius |

Fields follow their host object: `GraviryFollower` updates the field's matrix from the host's matrix each frame (fields ride on moving platforms/planets).

---

## 2. Mario's gravity handling (`MarioActorGravity.cpp`)

Mario's gravity **vector** is recomputed every frame in `MarioActor::updateGravityVec`:

1. Sample the manager at Mario's position (and at a point 100 units ahead of him, to pre-empt transitions).
2. Normalize. If new direction vs. current direction has dot < **0.9**, pick whichever (new or position-based) aligns better with the *air* gravity — hysteresis against flicker.
3. **Gravity-shift state machine** on the angle between old and new gravity:
   - `< 30°` (π/6): smooth blend (bee-mode timer 8 frames)
   - `≥ 72°` (π × 0.4): **hard shift** — `_334 = 15` frames of transition, jump velocity's gravity-component is **halved (× 0.5)**, camera blend timer set, "short jump" anim
   - `≥ 120°` (2π/3): even harder cut (`cutGravityElementFromJumpVec`, jump vec × 0.75 and re-projected)
4. Mario's facing/front vectors are rotated about the old→new gravity axis by the same angle (so he doesn't visually snap).

What it controls: this is why walking around a small planetoid feels smooth (gradual rotation of your "up") but jumping *between* planetoids with sharply different gravity gives a deliberate "gravity shift" hitch with a velocity penalty.

**Zero-G:** if the computed gravity is the zero vector, Mario keeps his last gravity (`_240`) until he lands.

### Per-frame airborne gravity (`MarioJump.cpp`, ~line 1435)

```cpp
mJumpVec += gravityDir * jumpAcceleration * gravityScale;
```

- `jumpAcceleration` = `mGravityJumping[_430]` (jump-type index), with special cases: spin-jump (`_430 == 8`) uses `mSpinJumpGravity` (0.25, table 0) while rising, then × 0.25 of that while falling; trampoline-type 0xB uses index 0 while rising.
- `gravityScale` = 1.0 normally; × 0.5 during air-walk (`mGravityRatioA`); × 0.3 during a gravity-shift transition (`_334`), dropping to 0.0/-0.1 under 300/200 vertical speed (prevents clipping into the new surface mid-transition).

### Terminal velocity (same function, ~line 1451)

```cpp
// dropSpeed = component of mJumpVec along gravityDir
maxDrop = mMaxDropSpeed[gravityLevel];   // {35.0, 20.0, 5.0, 6.0, 15.0}
if (dropSpeed >= maxDrop)
    mJumpVec = gravityDir * maxDrop + tangentSide;
```

- `gravityLevel` = 1 if the current field is `GRAVITY_POWER_LIGHT`, else 0 → **normal planets: 35 u/frame; light-gravity fields: 20 u/frame**.
- The clamp preserves the tangential (sideways) component — only the fall speed is capped. This is the standard "split velocity into normal/tangent, clamp normal" recipe.

### Ground-stick (`Mario::checkForceGrounding`)

When grounded, the gravity-component of velocity is killed each frame (`vecKillElement(mVelocity, gravityVec, &mVelocity)`) and the stick ray is cast *along gravity*, not world-down. Grounding distance threshold: the shadow-position offset must be < 30 units, else Mario drops (becomes airborne).

---

## 3. Movement on curved surfaces

The core primitive, used ~50 times across the codebase:

```cpp
MR::vecKillElement(vec, gravityVec, &vec);  // remove the gravity-aligned component
```

What it controls: **velocity is projected onto the tangent plane** of the current gravity field every frame — for walking, jumping, knockback, enemy physics. The pattern is always:

1. Stick input is read in **camera space**, then re-based onto ground axes built from `-gravityDir` (Mario's up) crossed with camera axes (`MarioMove.cpp` ~line 1000–1056). Pushing "up" on the stick always means "away from camera," mapped onto the local tangent plane — this is why controls feel identical on a sphere's north pole and its side.
2. `mWalkSpeed` chases a target = `sWalkTargetTable[index] × mWalkSpeedConst` (index 0–7, driven by stick magnitude; full tilt = index 7 → 1.0 × const).
3. Velocity's gravity-component is stripped each frame (grounded) or integrated (airborne).

### Walk/run numbers (`MarioConst.cpp`, two tables — SMG1 and SMG2 variants)

```cpp
mWalkSpeed            = 13.0f   // table 0 (SMG1); 15.0f in table 1 (SMG2)
mDashMultiply         = 2.0f    // dash (spin while running) = 2x walk speed
mStartSpinTime        = 30      // frames of full-tilt before dash kicks in
mDashAfterTime        = 40      // frames dash persists after stick release
mInertiaStandardStop  = 0.94f   // velocity *= this per frame when stopping (normal)
mInertiaStandardMax   = 0.90f   // per-frame accel blend toward target at speed
mInertiaIceStandardStop = 0.985f // ice: barely any friction
mSlopeSpeedMax        = 22.0f
mFlatAngle            = 45.0f   // below: walkable
mSlipAngle            = 60.0f   // above: slide
mForceWallAngle       = 85.0f
```

So: full run = 13 u/frame (780 u/s), dash = 26 u/frame (1560 u/s). Friction is a per-frame multiplier — stopping from full speed takes ~ln(0.01)/ln(0.94) ≈ 74 frames (~1.2 s) on normal ground.

---

## 4. Jump state machine (`MarioJump.cpp`)

`_430` = jump-type index. Chained jumps within `mJumpConnectTime` = **7 frames** step the index up:

| `_430` | Jump | Initial velocity (`mJumpHeight[i]`) | Air gravity (`mGravityJumping[i]`) | Notes |
|---|---|---|---|---|
| 0 | Single jump | 22.0 | 1.8 | |
| 1 | Double jump | 26.0 | 1.8 | chained within 7f |
| 2 | Triple jump | 36.0 | 1.8 | chained, requires walk speed > 0.6 |
| 3 | Mud/slip jump | 24.0 | 1.8 | floor code 0x20; mud halves via `mMudFloorJumpWeakRatio` = 0.5 |
| 4 | Side flip (turn jump) | 32.0 | 1.8 | |
| 5 | Long jump (squat jump) | 15.0 | 0.95 | forward speed forced to 16.5 (`mSquatJumpFrontSpeed`) |
| 6 | Backflip | 32.0 | 1.8 | |
| 7 | Wall jump | 22.0 | 2.2 | XZ push 13.0 (`mWallJumpPowerXZ`), Y 30.0 |
| 8 | Spin jump / tornado | ~12.0* | 0.4 / special | *uses `mSpinJumpHeight` = 12.0 instead of table |
| 0xA | Hang slip-up | — | 1.8 | |
| 0xC/0xD | Force/power jumps | — | 1.8 / idx 9 (0.9) | scripted jumps |

Derived apex heights (v²/2g), SMG1 table:
- Single: 22²/(2×1.8) ≈ **134 units** (~0.67 Mario-heights), ~12 frames to apex
- Triple: 36²/(2×1.8) = **360 units** (~1.8 Mario-heights), 20 frames to apex
- Long jump: 15²/(2×0.95) ≈ **118 units** high, but with 16.5 u/frame forward and low 0.95 gravity it travels far — distance-optimized
- Backflip: 32²/3.6 ≈ **284 units**

Extra jump numbers: jump front speed 12.5 (`mJumpFrontSpeed`), front decay ×0.98/frame after 15 frames, max air speed 32.0 (`mMaxJumpSpeed`), back-jump air control ×3.0 (`mBackJumpRatio`, 60-frame window), coyote-style `mFutureJumpReqLimitTime` = 4 frames, hard-landing stun below -2500 height delta for 60 frames.

### Hip drop (ground pound)
```cpp
per-frame gravity = mGravityHipDrop (12.0), terminal = mLimitSpeedHipDrop (150.0)
mHipDropZeroGrTime = 2  // 2 frames of zero-G hang at the start
```
Falls ~4.3× faster than normal terminal velocity. Shock radius `mSensorRadiusHipDropAttack` = 80.

---

## 5. Spin attack (`MarioActorPunch.cpp`, `MarioCollision.cpp`, `MarioActorOffensiveMsg.cpp`)

The Wii-shake spin. Full state machine:

1. **Trigger:** `isRequestSpin()`; on success `_946 = mSpinIntervalTime + 0x22` = **45 + 34 = 79 frames cooldown** before the next spin.
2. **Active hit window:** `setPunchHitTimer(25)` grounded / `15` airborne (`0x19`/`0x1E` variants in other paths) — the hitbox is live for **25 frames (0.42 s) on ground, 15 frames (0.25 s) in air**.
3. **Hit volume:** not a sphere — a **240×240×240-unit box** swept ahead of Mario:
   ```cpp
   center = mPosition + mVelocity + mHeadVec * 80.0f;   // leads his motion by one frame
   box = center ± (frontVec*120 + sideVec*120 + headVec*120)
   // every map polygon in that box gets sendPunch()
   ```
4. **Storm radius:** `mSensorRadiusSpinStorm` = **600** — enemies within 600 + their radius get the `ACTMES_SPIN_STORM_RANGE` message (stun/activate at range without touching).
5. **Target cap:** max **8** simultaneous punch victims (`_974 >= 8`).
6. **On hit:** `reactionPunch` — if airborne, small hop (`jumpHop`); pads vibrate; hit-mark effect 200 units out.
7. **Spin pull:** while spinning, coins/star pieces within **450 units** are pulled toward Mario (`mSensorRadiusSpinPull`, `mSensorRadiusSpinPullOnGround`); coin-pull radius from const table is 600 (`mSpinCoinPullRadius`) for the tornado variant.

Air spin also acts as a mid-air jump (`trySpinJump`): initial velocity = `frontVec × walkSpeed × mJumpTornadoSpeed(5.0)` + `up × mSpinJumpHeight(12.0)`, with reduced gravity 0.25 while rising.

**Velocity imparted to enemies:** the spin itself deals no knockback velocity to Mario; enemy knockback is handled per-enemy on receiving the punch message (each enemy's own reaction code). `reactionPunch` caps Mario's walk speed to 0.1 on a grounded hit.

---

## 6. Star pointer mechanics (`StarPointerUtil.cpp`, `MarioActorSensor.cpp`)

The star pointer is the Wii-remote cursor system, not a gravity beam:
- Mario registers as a pointer target: `initStarPointerTarget(this, 80.0f, (0,80,0))` — **80-unit radius** sphere, centered 80 units above his feet (chest height).
- 2P (co-star) can point at Mario: `isRequestSpinJump2P()` — pointing at Mario and pressing A gives the **2P jump assist** (sets `_430 = 2`, triple-jump class boost).
- The spin-pull coin attraction (§5.7) is the "pointer-adjacent" collection mechanic — there is **no tractor-beam** in the player code; collection is proximity + spin state.

---

## 7. Pull-star / slingshot stars — NOT FOUND

Searched the entire decomp for pull-star mechanics (`PullStar`, `pullstar`, slingshot, swing-ball player code): **no matches**. `Swinger`/`SwingLight` are unrelated (a pendulum helper and a light-volume effect). The object that grabs Mario and flings him between planetoids is either not yet decompiled or lives under an unrecognizable internal name. Do not treat §6's spin-pull (450-unit coin attraction) as the pull-star — different mechanic.

---

## 8. Camera on planetoids (`CameraFollow.cpp`, `CamTranslatorFollow`)

The follow camera's **up vector comes from the zone matrix**, not world Y:

```cpp
TVec3f up(0.0f, 1.0f, 0.0f);
zoneMtx.mult33(up);                      // zone-local "up" -> world
CameraLocalUtil::setUpVecAndWatchUpVec(this, up);
```

What it controls: each zone (planetoid area) carries its own orientation matrix; the camera stays upright *relative to the zone*, so walking around a sphere never flips the camera — the camera orbits with you. All position math is done in zone-local space (transform in, compute, transform out).

Follow-cam tuning (`CameraFollow` constructor):
```cpp
mDistMax = 1200.0f;   mDistMin = 300.0f;          // camera distance clamp
mAngleXMin = 10°;     mAngleXRange = 20°;         // pitch: 10°..30°, soft-clamped (×0.5 lerp)
mAngleYRoundSpeed = 0.15f;                        // yaw follow speed, deg/frame scaled by move speed
sRoundInterval = 45°; sRoundAddition = 0.08f;     // manual rotate steps (L/R trigger)
sLookDownAngle = 75°;                             // max look-down pitch
```
- Distance: hard min 300; max 1200 with a soft spring (`dist = max + (dist-max)*0.5` per frame when exceeded).
- Yaw follows behind Mario's movement direction, speed-scaled by `clamp(moveSpeed/15, 0, 1) × 0.15°/frame` — the camera lazily swings behind you as you run.
- Roll: `isUpsideDownByRoll()` swaps left/right round inputs when the camera roll inverts.
- Dedicated translators exist per planet type (`CamTranslatorCubePlanet`, `CamTranslatorMedianPlanet`, `CamTranslatorWaterPlanet`, `CamTranslatorInwardSphere`...), i.e. camera behavior is **zone-typed**, selected by the area — not one-size-fits-all.

---

## 9. gamepress recipe mapping

Which gamepress recipes these mechanics feed:

- **precision-platformer** — the biggest win. Lift wholesale: the jump state machine table (§4) with per-type initial-velocity + per-type air-gravity pairs; the 7-frame chain window for double/triple jumps; terminal-velocity clamp that preserves tangential velocity; per-frame friction multipliers (0.94 normal / 0.985 ice). The "jump heights are velocities, apex = v²/2g" table gives you a pre-balanced move set.
- **obby-gauntlet** — the gravity-field system (§1) is the blueprint for multi-gravity obstacle courses: priority-ordered overlapping fields, highest-priority-wins with same-priority blending, and the 72°/120° gravity-shift state machine with its velocity penalty. The field-shape catalog (point / plane / disk / cube / segment / wire / torus) maps directly to obstacle archetypes. Hip-drop numbers (12.0/frame accel, 150 terminal) for slam-through-floor sections.
- **mini-zelda** — the spin attack (§5) as a melee template: 25f/15f active windows, 79f cooldown, 240³ swept box + 600-unit storm radius, 8-target cap, and the spin-pull (450-unit) as a pickup-magnet mechanic. The zone-matrix camera (§8) for rooms with rotated gravity.

Cross-cutting recipe for all three: **split gravity into direction (world) and strength (character)** — the decomp proves the shipped game normalizes the field vector and applies all fall speed from character constants. Implement `vecKillElement` (subtract the gravity-axis component) as your single tangent-projection primitive; everything else composes from it.
