# Pikmin 2 — Pikmin AI & Throw Mechanics (from decompilation)

**Source:** `github.com/projectPiki/pikmin2` (Nintendo GameCube, decompiled C++)
**Extracted:** Oct 19, 2026 — decomp is ~86% complete; all values below come from
matched (decompiled + verified-against-original-binary) code unless noted.
**Key files:** `src/plugProjectKandoU/piki.cpp`, `pikiAI.cpp`, `pikiState.cpp`,
`navi.cpp`, `naviState.cpp`, `naviWhistle.cpp`, `aiFormation.cpp`, `aiAttack.cpp`,
`aiPrimitives.cpp`, `aiFree.cpp`, `gameCPlate.cpp`, `interactPiki.cpp`,
`include/Game/PikiParms.h`, `include/Game/NaviParms.h`, `include/Game/PikiState.h`,
`include/Game/CPlate.h`, `include/PikiAI.h`.

**Units:** game units; speeds are units/sec; times in seconds; frame counts assume 60 fps.
Mechanics only — no models, textures, or audio were copied.

---

## 1. Pikmin state machine (PIKISTATE_, `include/Game/PikiState.h`)

A classic FSM: `Walk` is the "do AI brain" state; everything else suspends the brain.

```
PIKISTATE_Walk        = 0   // default: runs the PikiAI brain each frame
PIKISTATE_DemoWait    = 1   // frozen during cutscenes
PIKISTATE_LookAt      = 2   // whistled: attention snap, then re-joins formation
PIKISTATE_GoHang      = 3   // running toward captain's hand to be grabbed for a throw
PIKISTATE_Hanged      = 4   // held in captain's hand, awaiting throw
PIKISTATE_WaterHanged = 5   // held while in water
PIKISTATE_Flying      = 6   // thrown, ballistic
PIKISTATE_KokeDamage  = 7   // tripped and hurt
PIKISTATE_Blow        = 8   // blown away (Puffy Blowhog etc.)
PIKISTATE_Flick       = 9   // knockback from enemy shake-off
PIKISTATE_Drown       = 10  // drowning
PIKISTATE_Swallowed   = 11  // being eaten
PIKISTATE_Nukare      = 12  // being plucked by hand
PIKISTATE_Absorb      = 13  // entering Onion (absorbed)
PIKISTATE_Growup      = 14  // nectar growth spurt
PIKISTATE_Tane        = 15  // seed: abducted/carried by Swooping Snitchbug
PIKISTATE_Dope        = 16  // ultra-spicy spray active
PIKISTATE_AutoNuki    = 17  // plucked by Pluckaphone upgrade
PIKISTATE_HipDrop     = 18  // purple pound (butt-stomp)
PIKISTATE_Emotion     = 19  // celebration emote (also used after a kill)
PIKISTATE_Pressed     = 20  // squashed flat
PIKISTATE_Panic       = 21  // on fire / in water / poison gas / generic panic
PIKISTATE_DenkiDying  = 22  // electrocuted
PIKISTATE_FallMeck    = 23  // fell from height, dazed
PIKISTATE_Dying       = 24  // death animation
PIKISTATE_Dead        = 25  // dead (soul leaving)
PIKISTATE_Suikomi     = 26  // sucked in (Toady / Piklopedia vacuum)
PIKISTATE_Holein      = 27  // entering a cave hole
PIKISTATE_Fountainon  = 28  // riding a geyser
PIKISTATE_Koke        = 30  // tripped (stumble)
PIKISTATE_Escape      = 31  // fleeing
PIKISTATE_Carrot      = 32  // Piklopedia carrot transformation
```

Key transitions observed in `pikiState.cpp`:
- Almost every state exits back to `Walk` (the brain re-decides). `Walk::exec` is literally
  just `piki->mBrain->exec()`.
- `Flying` → `Walk` on: ground bounce (240-frame timeout), hitting a flick-type enemy,
  or sticking to a plant top (then starts `ACT_Crop`).
- Whistle (`InteractFlute`) forces any `callable()` state → `LookAt`; `LookAt` plays the
  "notice" anim then starts `ACT_Formation` + `Walk`.

## 2. Pikmin AI action layer (PikiAI ACT_, `include/PikiAI.h`)

On top of the FSM sits a second, goal-level action system. `graspSituation_Fast()` scans a
300-unit sphere each tick and picks the nearest valid job:

```
ACT_NULL      = -1
ACT_Formation = 0   // follow the captain (default for idle squad pikmin)
ACT_Free      = 1   // stray/idle: wander, get bored, re-scan for jobs
ACT_Enter     = 2   // enter the Onion at sunset
ACT_Exit      = 3   // exit the Onion
ACT_Transport = 4   // carry pellet/treasure to Onion/ship
ACT_Attack    = 5   // melee-approach an enemy (see §6)
ACT_BreakGate = 6   // chew a bramble gate
ACT_BreakRock = 7   // smash a breakable rock/clog
ACT_Crop      = 8   // harvest a plant top (stick to it, then crop action)
ACT_Weed      = 9   // pull weeds (Ivory Candypop / nectar plants)
ACT_Bridge    = 10  // build a bridge
ACT_Teki      = 11  // generic enemy interaction
ACT_Rescue    = 12  // blue pikmin rescuing a drowning pikmin
ACT_Battle    = 13  // versus-mode pikmin-vs-pikmin
```

Job auto-acquire ranges (from `pikiAI.cpp`):
```
PIKI_BATTLE_RANGE = 70.0f   // versus-mode: attack another player's pikmin
PIKI_RESCUE_RANGE = 140.0f  // blue: rescue a drowning pikmin
enemy search      = 60.0f   // mEnemySearchRange (p041)
pellet search     = 30.0f   // mPelletSearchRange (p042)
gate search       = 40.0f   // mGateSearchRange  (P011)
bridge search     = 100.0f  // mBridgeSearchRange (P012)
bomb-rock search  = 300.0f  // mBombSearchRange  (p066)
```
Only blues/bulbmin consider targets in water.

Idle strays (`ACT_Free`): 50/50 coin flip to enter a "bored" wander after a 90–180 frame
cooldown, then re-scan. Strays become re-callable; after `mTimeToFree = 15s` a separated
pikmin is fully free (wild).

## 3. Throw physics

### 3a. Grab & charge (captain side, `NaviThrowWaitState`, `naviState.cpp`)

- Press/hold A: nearest throwable pikmin in `Walk` within grab range enters `GoHang`
  (runs to captain's hand at up to 2× run speed + captain's own speed if far), then `Hanged`.
- Holding A accumulates `mHoldPikiTimer`, clamped at:
  ```
  mTimeLimitForThrowing = 2.5f   // p009, "time limit for throwing"
  ```
- Charge level 0→3 ticks up once per loop of the hold animation (`mHoldChargeLevel / 3.0`).
- Release A: throws. D-pad L/R cycles held pikmin color, U/D cycles growth stage while aiming.

**Charge-distance quirk:** the charge formula exists but is effectively dead:
```cpp
// naviState.cpp — computed every frame while holding, but NEVER READ anywhere:
mHoldPikiCharge  = (level/3.0f) * (mThrowDistanceMax  - mThrowDistanceMin ) + mThrowDistanceMin;
mHoldPikiCharge2 = (level/3.0f) * (mThrowHeightMax   - mThrowHeightMin   ) + mThrowHeightMin;
// include/Game/Navi.h: "neither charge is used for anything"
```
Shipped params have max == min, so even if wired up they'd do nothing:
```
mThrowDistanceMax = 140.0f  // p010
mThrowDistanceMin = 140.0f  // p011
mThrowHeightMax   = 75.0f   // p024
mThrowHeightMin   = 75.0f   // p025
```
**Real throw distance is set by the aim cursor** (C-stick moves it, max 100 units from
captain, `mMaxCursorMoveRadius = 100.0f` p046; rests 50 units ahead). The pikmin is
ballistically solved to land *at the cursor* — so "charge" in the shipped game only
matters via how long you take to aim.

### 3b. Trajectory solve (`Navi::throwPiki`, `navi.cpp:2296`)

Solves a parabola backwards from a chosen peak height and total flight time:

```cpp
startPos = captainPos + (-15*sin(face), 10, -15*cos(face)); // 15 behind, 10 up

timeToPeak = 0.5 * mLandingTime;          // mLandingTime = 1.0f (p026)
if (purple) timeToPeak *= 0.5;            // purples stop AT the peak (then pound)

// vertical: ySpeed chosen so vy == 0 exactly at the peak height
ySpeed = timeToPeak * (0.5 * g) + (throwHeight / timeToPeak);
// back-solve actual time-to-peak from ySpeed: t = ySpeed / g
newTimeToPeak = ySpeed / g;
if (purple) newTimeToPeak *= 0.5;

// horizontal: constant velocity, distance / total flight time
xSpeed = dist2D / (2.0 * newTimeToPeak);
piki.velocity = (xSpeed*sin(aim), ySpeed, xSpeed*cos(aim));

// add the captain's own ground momentum (XZ only, ×1.0) — moving throws go farther
piki.velocity += captain.velocity_XZ;
```

Per-color peak heights (`Piki::getThrowHeight`, `piki.cpp:812`):
```
mThrowHeightYellow = 115.0f  // p054 — yellows fly highest
mThrowHeightMin    = 75.0f   // p025 — red, blue, bulbmin
mThrowWhiteHeight  = 75.0f   // q001 — white
mThrowBlackHeight  = 30.0f   // q000 — purple (low arc, then HipDrop)
```
Notes: gravity `g` is `_aiConstants->mGravity`, loaded at runtime from data file
`/user/Kando/aiConstants.txt` (not present in the decomp — value not recoverable from source).
Purple's halved `timeToPeak` doubles its initial velocity so it reaches a low peak fast,
then `Flying::exec` swaps purple to `HipDrop` the moment `vy <= 0`.

### 3c. In-flight (`PikiFlyingState::exec`, `pikiState.cpp:2385`)

- Hard cap: lands after **240 frames (4 s)** no matter what.
- **Flower glide:** when a flower-stage pikmin starts falling (`vy <= 0`), horizontal speed
  is rescaled once by `throwMagnitude` derived from throw height + landing time, vertical
  velocity eases from 0.8×g down to `mFlowerPikiGravity = 0.01 × g` over 0.15 s, plus a
  ±0.5% random wobble. Result: flowers float ~100× slower fall than normal.
- **Collisions while flying:**
  - living enemy + stickable part → `startStick()` (latch on, §6). If falling, first tries
    a press (stomp) interaction; purples *always* stomp on the way down.
  - plant top → stick + start `ACT_Crop`.
  - flick-type enemy (shake-off) → knocked back to `Walk`.
  - anything captain/pikmin → ignored (`ignoreAtari`).
- Bounce callback → `Walk`, then brain restarts (`ACT_Free` if the brain declines).

## 4. Movement speeds (verified against pikipedia's 120/140/170)

From `include/Game/PikiParms.h` (`Piki::Parms`, shipped defaults):

```
mWalkSpeed              = 84.0f    // p000 — idle/dismiss shuffle, knockdown crawl
mRunSpeed               = 120.0f   // p001 — leaf stage full run  ✓
mBudRunSpeed            = 140.0f   // p065 — bud stage            ✓
mFlowerRunSpeed         = 170.0f   // p054 — flower stage         ✓
mDopeRunSpeed           = 190.0f   // P009 — ultra-spicy spray
mWhiteRunSpeedMultiplier= 2.0f    // P001 — white: 240 leaf / 340 flower (!)
mPurpleRunSpeedMultiplier=0.6f    // P002 — purple: 72 leaf / 102 flower
```

Blended speed function (`Piki::getSpeed`, `piki.cpp:634`) — multiplier `m` eases between
walk and run:
```cpp
float Piki::getSpeed(float m) {
    if (doped()) return 190.0f;
    float base = 120.0f;                    // leaf
    if (happa == Flower) base = 170.0f;
    if (happa == Bud)    base = 140.0f;
    float speed = m * (base - 84.0f) + 84.0f;  // m=0 -> 84 (walk), m=1 -> base (run)
    if (kind == White)  speed *= 2.0f;
    if (kind == Purple) speed *= 0.6f;
    return speed;
}
```
Captain (for scale): `mMoveSpeed = mRunSpeed = 160.0f` — captains outrun leaf pikmin
(120) but flower pikmin (170) outrun captains.

Animation switch points: WALK anim above 35 u/s, RUN anim above 70 u/s (p018/p019).

## 5. Swarm / follow (formation)

Each captain owns a **CPlate** (`gameCPlate.cpp`) — a disc of formation slots trailing
*behind* the captain (angle = facing + π):

```cpp
// plate radius for N pikmin — constant density, grows with sqrt(N):
mMaxRadius = (2.0 + 0.1) * mMaxPositionSize * sqrt(N / PI);
// mMaxPositionSize = 6.0f (p002) -> radius ~12.6*sqrt(N/PI); N=100 -> ~71 units
// plate center offset behind captain:
mStartingOffset = 17.5f;   // p000 — collapses to 0 when captain moves fast (>5 u/s)
```

Per-pikmin steering (`ActFormation::exec`, `aiFormation.cpp`) — distance-to-slot bands:
- **≤ 7 units:** arrived — stop, face the captain.
- **7–15 units:** braking zone — approach speed solved from current speed + accel
  (`v = 0.5*sqrt(v² + 8·a·d) + v`), i.e. arrive without overshoot.
- **> 15 units:** full `setSpeed(1.0, dir)` toward slot.
- **> 60 units & walled:** abandon direct path, follow the captain's **footmark breadcrumb
  trail** (`mFootmarks->findNearest2`).
- Crossing the plate's center line adds an alternating sideways impulse (slot parity)
  so pikmin don't pile up single-file.

Separation / strays:
```
mWhiteDistance = 600.0f   // p029 — inside: hold slot, timer reset
mGrayDistance  = 1000.0f  // p030 — 600..1000: slot released, countdown runs
mLostChildTime = 10.0f    // p031 — beyond: fail formation -> stray (ACT_Free)
mTimeToFree    = 15.0f    // p040 — fully wild after 15 s separated
```
Free-stray distances are tighter: 200 / 800 (p032/p033).

Quirks worth stealing:
- **Trip RNG:** every 100 units traveled at speed > 110 u/s, ~0.3% chance to trip
  (`randFloat() >= 0.99 && randFloat() > 0.7` → `PIKISTATE_Koke`). Leaf pikmin (120)
  trip; it's slapstick, not punishment.
- **"Numbness":** after throw/whistle, pikmin stand stunned briefly (`mPikiLoseNumbnessTime`)
  before the sort animation runs — sells the impact.

## 6. Attack: latch-on & damage

Ground approach (`ActAttack::init`, `aiAttack.cpp`):
```
if (already stuck to enemy) -> ATTACK_Stick
else if (randFloat() > 0.8) -> ATTACK_JumpAdjust   // 20%: leap at the enemy
else                        -> ATTACK_Adjust        // 80%: run at the enemy
```
- `ATTACK_Jump` → on touching a stickable part: `startStick()` + `ATTACK_Stick`.
- `ATTACK_Adjust` → run to (attack-sphere radius + 10) then `ATTACK_Stick`.

Stuck biting (`ActStickAttack`, `aiPrimitives.cpp:1426`):
- **1 damage instance per bite-animation cycle** — animation keyframe `KEYEVENT_2` arms the
  hit, `KEYEVENT_3` re-primes. No fixed timer; cadence = the bite anim length.
- Damage per bite = `Piki::getAttackDamage()` (`piki.cpp`):
  ```
  Red    = 15.0f   // p012
  Blue   = 10.0f   // p004
  Yellow = 10.0f   // p013
  Purple = 10.0f   // P003
  White  = 1.0f    // P004 — whites are poison, not muscle
  Spicy  = 25.0f   // P008 — ultra-spicy overrides everything
  ```
- Detach when: target dies (auto `endStick`), bite anim ends, or pikmin is flicked off.
- Wild (unclaimed) pikmin deal **0** damage.

Specials:
- **Purple pound:** thrown purple → `HipDrop` at apex: `mPoundDamage = 100.0f` (P022),
  `mPoundAOERange = 60.0f` (P017).
- **Bomb-rocks** (pikmin carrying them): `mPikiBombAOERange = 50.0f` (p058),
  `mPikiBombTekiDamage = 120.0f` (p076), fuse `mPikiBombFuseTime = 2.0s` (p057).

HP pool: 100 normal / 150 white (p010) / 200 purple (p011). Fire kills in `mPanicMaxTime
= 3.0s` (p055). Drowning: `mMaxDrowningFrames = 30` + up to 10 random frames (p062/p063).

## 7. Whistle (call-back)

`NaviWhistle` (`naviWhistle.cpp`) — hold B, radius ramps **linearly** with hold time:
```cpp
radius = (activeTime / mMaxCallTime) * (maxSize - mPikiCallMinRadius) + mPikiCallMinRadius;
// mPikiCallMinRadius = 5.0f   (p053) — tap = tiny ring
// mPikiCallMaxRadius = 90.0f  (p001) — full 0.45 s hold
// mMaxCallTime       = 0.45f  (p002) — ramp time
// mWideWhistleRadius = 200.0f (q007) — with Amplified Amplifier upgrade
```
Pikmin inside the ring get `InteractFlute`: if their state is `callable()` and they're not
already in formation with you → reassigned to your squad, `PIKISTATE_LookAt` (0–0.3 s
random delay → "notice" anim → `ACT_Formation` + `Walk`).
- Whistling a **panicking** pikmin extinguishes fire / clears the panic state immediately.
- Whistling a **drowning** pikmin marks it called; it joins you on reaching shore.

## 8. Carrying

Carry strength per pikmin (`Piki::getPelletCarryPower`, `piki.cpp:836`):
```
base:  white = 1.5 (P006), purple = 0.5 (P005), others = 1.0
      + flower bonus 1.0 (P021) / bud bonus 0.5 (P020)   // spicy counts as flower
```
Caravan speed (`ActPathMove::getCarrySpeed`, `aiPrimitives.cpp:769`) — lerps between a
min and max by total strength vs. the object's weight range:
```cpp
maxSpeed = 120.0f * 0.7  = 84.0f;   // mCarryMaxFactor  = 0.7  (P018)
minSpeed = 120.0f * 0.35 = 42.0f;   // mCarryMinFactor  = 0.35 (P019)
speed = minSpeed + ((1 + totalPower - min) / max) * (maxSpeed - minSpeed);
// carrying a captain or VS cherry: full 120 u/s
```

## 9. Growth stages

```
enum EPikiHappa { Leaf = 0, Bud = 1, Flower = 2 };   // include/Game/Piki.h
nectar sips to bud    = 1   (mEnergyForBud,    p005)
nectar sips to flower = 2   (mEnergyForFlower, p006)
leaf -> bud    = 10 s       (p044)
bud  -> flower = 10 s       (p045)
flower -> wither = 10 s     (p046)
wither -> leaf   = 10 s     (p047)
```
Buried sprouts: `mBuriedSeedWaitTime = 1.0s` (p049) before the sprout pops;
`mUnpluckableTime = 1.0s` (p050) before it can be plucked (`Nukare` state).

## 10. Honest gaps (couldn't recover from the decomp)

- **Gravity numeric value** — `_aiConstants->mGravity` loads at runtime from data file
  `/user/Kando/aiConstants.txt`, which is not in the repo. All throw/glide formulas are
  exact; only the constant is missing.
- **Bite cadence in seconds** — damage is 1 hit per bite-animation loop, but the animation
  length lives in asset data, not source.
- **Max pikmin latched per enemy** — no single constant found; likely per-enemy data.
- **Slot layout pattern** — `getSlotPosition` offsets exist per slot but the exact
  spiral/ring assignment order wasn't fully traced.
- Some `PIKISTATE_` entries (FallMeck, Suikomi, Fountainon, Carrot) have thin or
  cutscene-only implementations; transitions listed are the observed ones, not exhaustive.

---

## gamepress recipe mapping

- **cozy-farm** — richest fit: `ACT_Crop` / `ACT_Weed` / `ACT_Transport` job actions,
  the 42→84 u/s carry-speed formula (§8), whistle call-back (§7), and the 10-second
  growth-stage timings (§9) all port directly to crop-tending critters.
- **hide-and-seek** — formation lost-child logic (600/1000-unit bands, 10 s stray timer,
  §5), footmark breadcrumb pathing for separated followers, and the linear whistle-radius
  ramp (§7) for the "call" mechanic.
- **crowd-runner** — CPlate disc formation with `sqrt(N)` density scaling (§5), the
  7/15/60-unit follow bands with braking-zone arrival, the 0.3% trip slapstick RNG,
  and the blended `getSpeed(m)` walk↔run function (§4).
- **micro-tower-defense** — latch-on DPS model: 1 hit per bite-cycle × per-type damage
  table (§6), purple pound 100 dmg / 60-unit AoE, bomb-rock 120 dmg / 50-unit AoE, and
  the `Navi::throwPiki` ballistic solver (§3b) for lobbing units onto towers.
