# Super Smash Bros. Melee — Fighting-Game Mechanics Reference

**Source:** `github.com/doldecomp/melee` (C decompilation of NTSC 1.02, `/tmp/decomp/melee/`)
**Extracted:** October 19, 2026
**Scope:** mechanics only — formulas, constants structure, state machines, timing windows. No copyrighted assets (no models, textures, audio, stage geometry, move names, or per-character data tables).

## Honesty note (read first)

- This decomp has **all the formula structure but almost no numeric constants**. Global tunables live in a runtime-loaded `ftCommonData` struct (`p_ftCommonData = data->common`, `src/melee/ft/fighter.c:188`) that is read from the retail game binary — the C source only references them as offsets (e.g. `x154`, `x28C`). Where a constant is a code literal (e.g. `254`, `0.1f`), the number is given exactly.
- Per-character physics (gravity, fall speed, weight, dash speed…) are **named fields** in the `ftCo_DatAttrs` struct (`src/melee/ft/types.h:876`) — the field names and the per-frame integration code are extracted below; the per-character numeric tables are game data and are not included.
- Move frame data (startup/active/recovery) lives in per-move **subaction event scripts** (game data). The C side defines the hitbox payload struct and the event dispatch; exact per-move numbers are not in this repo.
- Where community-verified values are mentioned for orientation, they are explicitly flagged as *not* from this repo.

---

## 1. Knockback formula

File: `src/melee/ft/ftcoll.c` — `ftColl_80079AB0` / `ftColl_80079EA8`, via the `KNOCKBACK` macro.

```c
// w        = target weight * common.xF4
// dmgCount = target's current percent (or stamina value in stamina mode)
// tmpDmg   = fp->dmg.x1838_percentTemp  (damage of THIS hit, added to percent)
// moveDmg  = unk_count (the move's damage)
// kbg      = hit->x24 (knockback growth / "scaling")
// base     = hit->x2C (base knockback)

// damage term ("inner"):
inner = common.x110 * (dmgCount + tmpDmg)
      + common.x114 * (moveDmg * (dmgCount + tmpDmg));

// weight term: common.xF8 - (w * common.xF8)/(1 + w)  ==  common.xF8 / (1 + w)

knockback = defense * attack * arg3
          * (0.01 * kbg * (common.x11C * ( (common.xF8/(1+w)) * inner )
                                        + common.x120)
             + base);

knockback = min(knockback, common.x108);   // hard cap
```

**What each part controls:**
- `x110` — linear damage coefficient (community: 0.1)
- `x114` — quadratic damage coefficient (community: 0.05) — this is what makes knockback grow faster than linearly with percent
- `xF8` — weight numerator (community: 200)
- `x11C` — global knockback multiplier (community: 1.4)
- `x120` — flat knockback offset (community: 18)
- `x108` — maximum knockback clamp
- `attack` — attacker's attack ratio (`Player_GetAttackRatio`), `defense` — target's defense ratio, `arg3` — mode ratio (`gm_8016B248()`)
- `defense`/`attack`/`arg3` all default to 1.0 in the no-ratio variant `ftColl_80079EA8`

**Set-knockback branch** (`hit->x28 != 0`, e.g. fixed-knockback throws): the damage term ignores percent entirely:
```c
inner = common.x118 * common.x110 + common.x114 * (common.x118 * hit->x28);
```

**Post-processing** (`ftCo_Damage_CalcKnockback`, `src/melee/ft/kinds/ftCommon/ftCo_Damage.c`):
```c
if (squatting)                    kb *= common.kb_squat_mul;      // crouch cancel
if (frozen)                       kb *= common.kb_ice_mul;
if (charging smash)               kb *= common.kb_smashcharge_mul;
if (size != 1.0)                  kb  = YScaledKnockback(kb, scale);
kb -= max(armor0, armor1) (+ metal_armor if metal);
kb = max(kb, common.kb_min);      // kb_min — weak hits still launch a little
```

**Multi-hit stacking** (`ftCo_Damage_CalcVel`): if the new hit lands within `common.xFC` frames of the last, the knockback velocity is **overwritten**; otherwise it is merged per-axis — if the new component opposes the old one they add, otherwise the larger magnitude wins.

---

## 2. Launch velocity & hitstun

File: `src/melee/ft/kinds/ftCommon/ftCo_Damage.c`.

```c
// initial launch velocity (ftCo_8008DCE0):
speed     = kb_applied * common.x100;   // knockback -> world-units/frame
vel.x     = speed * cos(angle) * -facing_dir... (direction from angle)
vel.y     = speed * sin(angle)

// hitstun timer (the x221C_b6 flag == "is in hitstun", cf. ftLib_IsInHitstun):
hitstun_frames = max(1, (int)(kb_applied * common.x154));
// decremented once per frame in ftCo_8008F744; when it hits 0, hitstun ends
// (x221C_b6 cleared, x2098 = common.x4CC — the post-hitstun tech-jump buffer)
```

**What each controls:**
- `x100` — knockback-to-velocity scale (world units per frame per knockback point)
- `x154` — hitstun frames per knockback point (community: 0.4). **This is Melee's famous linear hitstun rule: hitstun ≈ 0.4 × knockback, minimum 1 frame.**
- Airborne-with-recent-L/R-press case (`ftCo_Damage_CheckAirMotion`): launch speed is additionally multiplied by `common.x190` when the victim pressed L/R within `common.x18C` frames before being hit while in a jump/fall/airdodge/tumble state.

**Order of operations on a hit** (this ordering matters for DI):
1. Hitlag (both fighters frozen; SDI processed here)
2. Exit hitlag → ASDI position shift → trajectory DI angle adjust → L/R knockback scale
3. Launch velocity written, hitstun timer set, damage state entered

---

## 3. DI — directional influence (all three kinds)

### 3a. Trajectory DI (the "real" DI) — `ftCo_8008E5A4`
Applied once, on hitlag exit, to the knockback **velocity vector**:

```c
// kb = current knockback velocity (x8c_kb_vel), s = control-stick vector (|s| <= 1)
perp_dot = kb.y * s.x + (-kb.x) * s.y;      // stick projected onto kb-perpendicular
f        = (perp_dot * perp_dot) / |kb|^2;   // = |s|^2 * sin^2(stick angle vs kb dir)
sign     = sign(cross(kb, s).z);            // which side of kb the stick is on
angle    = atan2(kb.y, kb.x) + sign * f * deg2rad(common.x1A8);
kb.x     = |kb| * cos(angle);
kb.y     = |kb| * sin(angle);
```

- `x1A8` — **maximum DI angle change in degrees** (community: 18°).
- Effectiveness follows a **sin² law**: holding exactly perpendicular to the launch gives full `x1A8`; holding parallel/antiparallel gives zero. Stick magnitude also scales it (|s|²).
- Only applies if the stick is non-zero.

### 3b. SDI (smash DI) — `ftCo_Damage_OnEveryHitlag`
During **every frame of hitlag**, if enabled and the stick is flicked:

```c
if (allow_sdi
    && |lstick| >= common.sdi_min_stick_mag
    && (stick_timer.x < common.sdi_stick_window || stick_timer.y < common.sdi_stick_window))
{
    pos.x += lstick.x * common.sdi_pos_scale;   // teleport, not velocity
    pos.y += lstick.y * common.sdi_pos_scale;
    stick_timer.x = stick_timer.y = 254;        // one SDI input per stick flick
}
```

- `sdi_pos_scale` — SDI teleport distance per flick (units)
- `sdi_stick_window` — the stick must have been *freshly* flicked (timer below window); setting the timer to 254 after an SDI input forces a release-and-reflick for the next one
- Grounded-shield variant (`ftCo_80093240`) shifts along the floor tangent with `common.x4C0 * stick.x * sdi_pos_scale`

### 3c. ASDI (automatic smash DI) — `ftCo_Damage_OnExitHitlag`
On hitlag exit, if the stick (or C-stick, via `ftCo_800DF608`) is held past the minimum magnitude:

```c
pos.x += stick.x * common.x4BC;   // single automatic shift
pos.y += stick.y * common.x4BC;
```

- `x4BC` — ASDI shift distance (community: 3.0 units). No flick required — just holding the stick.

### 3d. L/R knockback reduction — `ftCo_Damage_OnExitHitlag`
```c
if (held_buttons & HSD_PAD_LR) {
    |kb_vel| *= common.x1AC;   // scales the whole launch vector
}
```
Holding a shield button through hitlag release scales the launch speed by `x1AC`.

---

## 4. Launch angle & the Sakurai angle (361°)

`ftCo_Damage_CalcAngle` (`ftCo_Damage.c`):
```c
if (kb_angle != 361) return deg2rad(kb_angle);          // normal angle
if (airborne)        return common.x144_radians;       // Sakurai angle in air
if (kb < common.x14C) return 0;                        // grounded, weak: horizontal
// grounded, stronger: linear ramp from 1° up to x148°:
a = deg2rad(common.x148 * ((kb - common.x14C) / (common.x150 - common.x14C)) + 1);
return min(a, deg2rad(common.x148));
```

- `x144_radians` — Sakurai launch angle when airborne
- `x14C` — knockback threshold below which grounded Sakurai hits go perfectly horizontal
- `x148` — max Sakurai angle; `x150` — knockback at which the ramp saturates
- Angle 361 hits also set `mv.co.damage.x1A = 1, x1B = common.x7F0`: a countdown during which a jump input **cancels the knockback entirely** (meteor-cancel-style escape — `doIasa` zeroes velocity when `x1B` expires midair with downward velocity).

---

## 5. Shield mechanics

### 5a. Shield health — `Fighter_procCollResolve` (`src/melee/ft/fighter.c:2805`)
```c
// regen (only while NOT shielding):
if (!shielding && shield_health < common.x260_startShieldHealth)
    shield_health = min(shield_health + common.x27C, common.x260_startShieldHealth);  // per frame

// drain while shielding (x221A_b7), per frame:
shield_health -= common.x284
               * (shieldDamageTaken * (1 - (lightshield_amount * (common.x2E0 - common.x2DC)
                                           + common.x2DC)))
               + common.x288;
if (shield_health < 0) { shield_break(); shield_health = common.x280_unkShieldHealth; }
```
- `x260_startShieldHealth` — max shield HP (community: 60)
- `x27C` — regen per frame when shield is down
- `x288` — flat per-frame drain while shielding; `x284` — scales with `x19A0_shieldDamageTaken` (accumulated damage absorbed since shield went up; reset on shield drop)
- Lightshield (`lightshield_amount` 0→1 from analog trigger past `analog_shoulder_deadzone`) lerps the `x284` term between `x2DC` and `x2E0` — lightshield drains **slower** from absorbed hits

### 5b. Shield size — `inlineB0` (`ftCo_Guard.c`)
```c
n1 = (shield_health / max_health) * (lightshield_amount * (x2D8 - x2D4) + x2D4);
n3 = (1 - x264) * n1 + x264;
shield_scale = n3 * co_attrs.initial_shield_size;
```
Shield bubble shrinks as health drops (never below `x264` fraction); lightshield lerps the size factor between `x2D4` (full press) and `x2E8`/`x2D8` (light). Yoshi uses `initial_shield_size` directly (no shrink).

### 5c. Shieldstun — `ftCo_80092F2C` (`ftCo_Guard.c`)
```c
// x19A4 = max damage of the blocked hit
shieldstun_frames = common.x28C
                  * (x19A4 * (1 - (lightshield_amount * (common.x2E8 - common.x2E4)
                                                    + common.x2E4)))
                  + common.x290;
// the GuardSetOff animation's playback rate is set so it lasts exactly this long:
//   anim_rate = (anim_length + 0.1) / shieldstun_frames
```
- `x28C` — shieldstun per damage point (community: 0.58); `x290` — flat base frames (community: 4)
- **Lightshield reduces shieldstun** (lerp between `x2E4` and `x2E8`)

### 5d. Shield pushback ("shield KB")
```c
push_vel = shieldstun_frames * common.x294;
if (!powershield) push_vel *= common.x2BC;
push_vel = min(push_vel, common.x298);          // cap
gr_vel   = ±push_vel;                            // away from attacker
```
- `x294` — pushback per shieldstun frame; `x298` — pushback cap; `x2BC` — non-powershield multiplier
- Powershield (`x221C_b2`, `ftCo_80092E50` with element check) instead triggers the reflect path (`ftCo_800C36DC`)

### 5e. Shield tilt
`ftCo_80091BC4`: the guard angle chases the stick angle with exponential smoothing factor `common.x44C` per frame; tilt magnitude chases stick magnitude with the same factor. Stick angle is mirrored by `facing_dir`.

---

## 6. Frame-data structure (how moves store timing)

**Hitbox payload** — `struct HitCapsule` (`src/melee/lb/types.h:34`), the complete per-hitbox data:
```c
struct HitCapsule {
    HitCapsuleState state;   // enabled/disabled
    u32 x4;                  // hit group id
    u32 unk_count;           // (used as moveDmg in the KB formula)
    float damage;            // percent damage
    Vec3  b_offset;          // position offset (bone-relative)
    float scale;             // size
    int   kb_angle;          // launch angle (361 = Sakurai)
    u32   x24;               // knockback growth (kbg)
    u32   x28;               // set-knockback flag/weight
    u32   x2C;               // base knockback
    u32   element;           // fire/electric/ice/dark/...
    int   x34;               // bonus shield damage
    int   sfx_severity, sfx_kind;
    // ...bitflags, victim lists, bone joint
};
```

**Timing is data, not code.** Moves are driven by *subaction event scripts*: a dispatch table of ~49 script commands (`ftAction_803C06E8` in `src/melee/ft/ftaction.c`), one of which is the "create hitbox" event (`ftAction_80072E24`-family, `ftaction.c:286`):
```c
// "Spawns Hitboxes" subaction event:
hitbox = &fp->x914[cmd->create_hitbox_0.id];
if (hitbox->state == Disabled || hitbox->x4 != hit_group) {
    hitbox->x4 = hit_group;
    hitbox->state = HitCapsule_Enabled;
    ftColl_800768A0(fp, hitbox);
}
```
So: **startup = frame the hitbox-create event fires, active = frames the capsule stays enabled, recovery = remaining animation frames** — all encoded in each move's script data (not present in this C repo). Interruptibility uses the standard `allow_interrupt`/IASA flag per state.

---

## 7. L-canceling

Two-part mechanism (`src/melee/ft/kinds/ftCommon/ftCo_LandingAir.c`, `src/melee/ft/fighter.c:2105`):

```c
// per-frame input bookkeeping (fighter.c), runs always:
if (pressed_buttons & HSD_PAD_LR)  x67F = 0;       // L/R/Z press timestamp
else if (x67F < 255)               x67F++;          // frames since press

// on landing during an aerial (ftCo_LandingAir_EnterWithLag):
if (move_script_set_lcancel_flag /* fp->cmd_vars[0] */
    && x67F < common.xE4)                          // pressed within window
{
    lag = max(1, (int)(co_attrs.landing_lag / common.xE8));  // halve it
}
```
- `xE4` — L-cancel input window: press must be within `xE4` frames before landing (community: 11 frames — **flagged, not from this repo**)
- `xE8` — lag divisor (community: 2.0 = halved, min 1 frame)
- Per-aerial landing lag values are named per-character attrs: `landingairn_lag`, `landingairf_lag`, `landingairb_lag`, `landingairhi_lag`, `landingairlw_lag`
- Note: the flag itself (`cmd_vars[0]`) is set by the move's subaction script on L/R/Z press during the aerial — the C side only consumes it.

## 8. Teching

Window check — `ftCo_800986B0` (`ftCo_DownAttack.c:86`):
```c
// x680 = frames since L/R pressed (fighter.c:2111 — reset on press, like x67F)
// x684 = frames between the last two L/R presses (anti-mash timer)
bool can_tech = (x680 < common.x250)     // pressed within window before impact
             && (x684 >= common.x1C);    // not too soon after previous press (lockout)
```
- `x250` — tech input window (community: 20 frames)
- `x1C` — tech lockout after a previous L/R press (community: 40 frames)

On ground/wall/ceiling contact while tumbling (`DamageFly`/`DamageFlyRoll` coll handlers), priority order:
1. **Tech roll** (`ftCo_80098928`): if tech window valid and `|stick.x| >= common.x254` → `PassiveStandF/B` in the stick direction
2. **Tech in place** (`ftCo_8009872C`): if tech window valid → `Passive` (neutral tech)
3. Otherwise: bounce (`ftCo_80097D40`) → downed state

Wall techs (`ftCo_PassiveWall.c`) and ceiling techs (`ftCo_PassiveCeil.c`) use the same `ftCo_800986B0` window check.

---

## 9. Dash physics

`ftCo_Dash_Enter` (`src/melee/ft/kinds/ftCommon/ftCo_Dash.c`):
```c
init = facing_dir * co_attrs.dash_initial_velocity;
delta = (gr_vel * facing_dir < 0) ? init : init - gr_vel;  // impulse to reach init speed
// applied via ftCommon_800804A0 on frame 1; afterwards:
```
`ftCo_Dash_Phys` (subsequent frames):
```c
accel      = stick.x * co_attrs.dash_accel_mul + sign(stick.x) * co_attrs.dash_accel_base;
target_vel = stick.x * co_attrs.dash_max_velocity;
// approach target_vel at `accel`, with friction = ground_friction
//     * common.run_dash_turn_friction_multiplier when overshooting;
// hard cap at co_attrs.ground_max_horizontal_velocity
```
(`ftCommon_CalcGroundAccel_DashRun`, `src/melee/ft/ftcommon.c:61`)

- `dash_initial_velocity` — frame-1 dash speed (per character)
- `dash_accel_mul` / `dash_accel_base` — stick-scaled + constant accel terms
- `dash_max_velocity` — top speed toward which accel converges
- `ground_friction` — decel when no input / overshoot (× `run_dash_turn_friction_multiplier` during dash/run)
- Dash trigger: `|stick.x| >= common.dash_smash_stick_threshold` within `common.dash_smash_window` frames of the flick (`active_timer.lstick.x`)

## 10. Wavedash (airdodge → landing slide)

`ftCo_EscapeAir_*` (`src/melee/ft/kinds/ftCommon/ftCo_EscapeAir.c`):
```c
// on airdodge enter (inlineA0):
if (|stick.x| < common.escapeair_deadzone.x && |stick.y| < common.escapeair_deadzone.y)
    self_vel = (0, 0);                                   // neutral airdodge: no momentum
else {
    a = stick_angle;
    self_vel.x = common.escapeair_force * cos(a);        // fixed impulse
    self_vel.y = common.escapeair_force * sin(a);
}
// every airborne frame:
self_vel *= common.escapeair_decay;                      // exponential decay (unless cmd_skip_decay)

// landing during airdodge (ftCo_80099D70):
ftCo_LandingFallSpecial_Enter(gobj, false, common.x344); // x344 = landing lag frames
```
- `escapeair_force` — airdodge impulse magnitude (same for all characters)
- `escapeair_decay` — per-frame velocity multiplier (< 1)
- `x334` — airdodge state duration; `x344` — landing lag on airdodge landing
- Wavedash slide distance then emerges from: impulse angle × force, decay, and the character's `ground_friction` during `LandingFallSpecial`

---

## 11. Gravity / fall-speed system (general, not per-character)

Named per-character attributes (`ftCo_DatAttrs`, `src/melee/ft/types.h:876`):
```c
float gravity;                 // added to downward velocity every frame
float terminal_velocity;       // max fall speed (positive number, applied as -tv)
float fast_fall_velocity;      // fall speed while fast-falling
float air_drift_stick_mul;     // (named; drift accel factor)
float aerial_drift_base;       // base horizontal drift accel
float air_drift_max;           // drift accel cap
float aerial_friction;         // horizontal air friction
float air_max_horizontal_velocity;
float weight;                  // feeds the knockback formula (section 1)
```

Per-frame integration (`ftCommon_Fall`, `src/melee/ft/ftcommon.c:480`):
```c
self_vel.y -= gravity;
if (self_vel.y < -terminal_velocity) self_vel.y = -terminal_velocity;
```
Fast fall (`ftCommon_FallFast`): `self_vel.y = -fast_fall_velocity;` — **set**, not added (instant).

Air drift (`ft_80084E1C`, `src/melee/ft/ft_084E.c:43`) — the standard aerial physics used by Fall states:
```c
drift_accel = stick.x * air_drift_max;      // (via threshold/target params)
target_vel  = stick.x * air_max_horizontal_velocity...;
CalcSelfAccel_AccelToVelClamped(fp, drift_accel, target_vel, aerial_friction);
```
i.e. horizontal air control = accelerate toward `stick.x × max` at `stick.x × drift` rate, opposed by `aerial_friction`; no-drift states (`ft_80084EEC`) just apply gravity + friction.

---

## 12. Damage-state machine (hit → tumble → down)

States involved (`ftCo_MS_*`, `src/melee/ft/kinds/ftCommon/forward.h`):
```
Damage (hitstun, x221C_b6 set)
  ├─ kb small & grounded  → Damage (grounded flinch), returns to Wait
  ├─ kb large             → DamageFly / DamageFlyRoll (tumble)
  │     ├─ ground contact + tech input   → Passive (tech) / PassiveStandF/B (tech roll)
  │     ├─ ground contact, no tech       → bounce → DownBound → DownWait (knockdown)
  │     └─ hitstun expires midair        → Fall (actionable)
  ├─ angle 361 "Sakurai" & jump input within x7F0 frames → knockback cancelled (doIasa)
  └─ frozen (ice element, kb_level ≥ 2)  → DamageIce
DamageScrew / DamageSong / DamageBind — special-element variants
DownDamage / DownAttack / DownStandU/D — knockdown subtree
```
Knockback severity tiers (`ftCo_8008D8E8`): `kb × x154` is bucketed by thresholds `x158 / x15C / x160` into 4 levels selecting the flinch/tumble animation (`ftCo_803C5520[air?][level][hurtbox_height]`).

---

## What was NOT found in this repo (honest gaps)

1. **Numeric values of `ftCommonData` tunables** — the formula constants (`x154` hitstun factor, `x28C`/`x290` shieldstun, `x1A8` DI degrees, `xE4` L-cancel window, `x250` tech window, etc.) are loaded from the retail binary at runtime. The decomp gives exact structure and semantics, not numbers.
2. **Per-move frame data** — startup/active/recovery live in subaction scripts (game data); the C repo only has the event dispatch + hitbox struct.
3. **Per-character attribute numbers** — field names (`gravity`, `weight`, `dash_initial_velocity`, …) are in `ftCo_DatAttrs`, but the per-character tables are game data.
4. **Hitlag formula** — exists in the codebase but was out of scope for this pass (it's in `ftcoll.c` near the damage application; the `x195c_hitlag_frames` field).
5. **SDI "sdi_stick_window" / quarter-circle SDI nuance** — the retrigger logic (`active_timer.lstick`) is present; full multi-flick behavior verified only at code-reading depth.

---

## gamepress recipe mapping

- **footsies-duel** (grounded neutral, spacing pokes): knockback formula (§1) + hitstun (§2) + DI (§3) are the core — they define combo percent windows, kill confirms, and DI mixups. Shieldstun/pushback (§5c–d) define block pressure safety. Dash physics (§9) defines footsies movement. Frame-data structure (§6) is the template for the move-data schema.
- **arena-brawler** (platform fighter, ring-outs): everything in footsies-duel, plus: Sakurai angle (§4) for weak-hit combo design, tech system (§8) for knockdown okizeme, L-cancel (§7) for aerial pressure design, gravity/fall system (§11) for character archetypes (floaty vs fast-faller), damage-state machine (§12) for tumble/knockdown flow.
- **ballistic-bouncer** (projectile/launch-heavy): knockback formula (§1) with the set-knockback branch for fixed-launch projectiles; multi-hit velocity stacking rules (§1, end); airdodge/wavedash physics (§10) for projectile-dodge movement design; shield health/drain (§5a–b) for projectile-vs-shield balance.
