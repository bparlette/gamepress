// gpfeel.js — Nintendo-decomp-derived game feel for gamepress.
//
// Ground-truth physics constants, camera logic, enemy FSM patterns, and
// retro audio synthesis extracted from decompiled Nintendo games.
// All values are clean-room reimplementations: numbers and algorithms only.
// No Nintendo assets, sprites, music, or verbatim code.
//
// Sources:
//   - n64decomp/sm64 (Super Mario 64 decompilation)
//   - NES APU hardware documentation (public domain specs)
//
// Usage:
//   import { MARIO_PHYSICS, characterStep, updateCamera, makeFSM, APU } from '../kit/gpfeel.js';
//   import gpfeel from '../kit/gpfeel.js'; // default export: everything above

// ============================================================================
// MARIO_PHYSICS — Super Mario 64 movement constants
// Source: n64decomp/sm64
// ============================================================================

export const MARIO_PHYSICS = {
  // --- Gravity ---
  // sm64 src/game/mario_step.c: apply_gravity()
  // Standard gravity applied per frame (at 30fps N64, scaled for 60fps here)
  gravity: 4.0,              // vel[1] -= 4.0f per frame
  terminalVelocity: -75.0,    // vel[1] clamped to -75.0f

  // --- Variable jump height ---
  // sm64 src/game/mario_step.c: should_strengthen_gravity_for_jump_ascent()
  // If jump button released while ascending fast, velocity is quartered.
  // This is THE secret to responsive jumping: tap = short hop, hold = full jump.
  jumpCutThreshold: 20.0,     // only cuts if vel[1] > 20.0f
  jumpCutDivisor: 4.0,        // vel[1] /= 4.0f on early release

  // --- Jump velocity ---
  // sm64 src/game/mario.c: set_mario_y_vel_based_on_fspeed(m, 52.0f, 0.25f)
  // Jump height scales with running speed: faster run = higher jump.
  jumpBaseVel: 52.0,          // base upward velocity
  jumpSpeedBonus: 0.25,       // + forwardVel * 0.25f
  // Double jump second bounce (mario_actions_airborne.c, act_double_jump)
  doubleJumpVel: 42.0,        // vel[1] = 42.0f on second bounce

  // --- Ground movement ---
  // sm64 src/game/mario_actions_moving.c: update_walking_speed()
  walkMaxSpeed: 32.0,         // maxTargetSpeed on normal ground
  walkMaxSpeedSlow: 24.0,     // maxTargetSpeed on SURFACE_SLOW
  walkAccelBase: 1.1,         // forwardVel += 1.1f - forwardVel / 43.0f
  walkAccelFalloff: 43.0,     // diminishing returns divisor (the "feel" curve)
  walkDecel: 1.0,             // forwardVel -= 1.0f when over target speed
  absoluteMaxSpeed: 48.0,     // hard clamp on forwardVel
  turnRate: 0x800,            // 2048/65536 of full turn per frame (~11.25°)

  // --- Air control ---
  // sm64: air steering is intentionally weaker than ground (commitment matters)
  airControl: 0.5,            // fraction of ground accel applied in air
  airDrag: 0.995,             // slight horizontal drag per frame in air
};

// ============================================================================
// applyMarioMovement — drop-in character controller
//
// player: { x, y, z, vx, vy, vz, grounded, coyoteTimer }
// input:  { moveX, moveZ (normalized -1..1), jumpPressed, jumpHeld }
// dt:     delta time in seconds (assumes 60fps base)
// Returns updated player object.
//
// Clean-room implementation of SM64's movement feel. Not a copy of Nintendo
// code — same constants, original structure.
// ============================================================================

export function applyMarioMovement(player, input, dt) {
  const P = MARIO_PHYSICS;
  const f = dt * 60; // frame scaling factor (SM64 ran at 30fps, we use 60fps base)

  // --- Horizontal movement ---
  const targetSpeedX = input.moveX * P.walkMaxSpeed;
  const targetSpeedZ = input.moveZ * P.walkMaxSpeed;

  if (player.grounded) {
    // SM64 acceleration curve: fast start, diminishing returns near max
    // forwardVel += 1.1f - forwardVel / 43.0f
    const accelX = Math.sign(targetSpeedX - player.vx) * (P.walkAccelBase - Math.abs(player.vx) / P.walkAccelFalloff);
    const accelZ = Math.sign(targetSpeedZ - player.vz) * (P.walkAccelBase - Math.abs(player.vz) / P.walkAccelFalloff);

    player.vx += accelX * f;
    player.vz += accelZ * f;

    // Clamp to max
    const speed = Math.hypot(player.vx, player.vz);
    if (speed > P.absoluteMaxSpeed) {
      player.vx = (player.vx / speed) * P.absoluteMaxSpeed;
      player.vz = (player.vz / speed) * P.absoluteMaxSpeed;
    }
  } else {
    // Air control: weaker, with slight drag
    player.vx += input.moveX * P.walkAccelBase * P.airControl * f;
    player.vz += input.moveZ * P.walkAccelBase * P.airControl * f;
    player.vx *= Math.pow(P.airDrag, f);
    player.vz *= Math.pow(P.airDrag, f);
  }

  // --- Vertical movement ---
  if (!player.grounded) {
    // sm64 mario_step.c: apply_gravity()
    player.vy -= P.gravity * f;
    if (player.vy < P.terminalVelocity) player.vy = P.terminalVelocity;

    // Variable jump height: cut velocity if button released early
    // sm64 mario_step.c: should_strengthen_gravity_for_jump_ascent()
    if (!input.jumpHeld && player.vy > P.jumpCutThreshold) {
      player.vy /= P.jumpCutDivisor;
    }
  }

  // --- Jump ---
  if (input.jumpPressed && (player.grounded || player.coyoteTimer > 0)) {
    const speed = Math.hypot(player.vx, player.vz);
    // sm64 mario.c: vel[1] = 52.0f + forwardVel * 0.25f
    player.vy = P.jumpBaseVel + speed * P.jumpSpeedBonus;
    player.grounded = false;
    player.coyoteTimer = 0;
  }

  // --- Integrate ---
  player.x += player.vx * f;
  player.y += player.vy * f;
  player.z += player.vz * f;

  // Coyote time decay (standard 6 frames / 0.1s)
  if (player.coyoteTimer > 0) player.coyoteTimer -= dt;

  return player;
}

// ============================================================================
// LAKITU_CAMERA — Super Mario 64 camera essentials
// Source: n64decomp/sm64 src/game/camera.c
//
// The legendary Lakitu camera: smooth radial follow with wall avoidance.
// Simplified for gamepress: yaw-follow + pitch clamp + distance pull-in.
// ============================================================================

export const LAKITU_CAMERA = {
  // sm64 camera.c: update_radial_camera()
  baseDistance: 1000.0,       // baseDist = 1000.f
  heightOffset: 125.0,        // yOff = 125.f (look slightly above player)
  yawRotateSpeed: 0x1000,     // rotateSpeed (4096/65536 per frame ≈ 22.5°)
  maxYawOffset: 60,           // ±60° from behind-player

  // sm64 camera.c: collide_with_walls(cPos, 10.f, 80.f)
  wallRadius: 10.0,           // collision check radius
  wallPullIn: 80.0,           // pull camera in by this much on wall hit

  // Camera height smoothing (approach_camera_height rates)
  heightApproachSlow: 5.0,    // gentle height transitions
  heightApproachFast: 20.0,   // snap on big changes

  // Pitch limits (N64 pitch bounded to ±90°, practical range smaller)
  minPitch: -30,              // degrees, don't go under floor
  maxPitch: 60,               // degrees, don't go too top-down
};

/**
 * lakituCamera — smooth follow camera.
 *
 * camera: { x, y, z, lookX, lookY, lookZ }
 * target: { x, y, z } — player position
 * dt: delta time
 * opts: { distance, heightOffset, yaw } — overrides
 *
 * Clean-room implementation inspired by SM64's radial camera.
 * Camera orbits behind player, pulls in on walls, smooth-damps height.
 */
export function lakituCamera(camera, target, dt, opts = {}) {
  const C = LAKITU_CAMERA;
  const dist = opts.distance || C.baseDistance;
  const hOff = opts.heightOffset || C.heightOffset;
  const yaw = opts.yaw || 0; // radians, camera yaw offset from behind-player

  // Desired camera position: behind and above target
  const desiredX = target.x - Math.sin(yaw) * dist;
  const desiredZ = target.z - Math.cos(yaw) * dist;
  const desiredY = target.y + hOff;

  // Smooth-damp position (exponential approach)
  // SM64 uses approach_f32 with variable rates; we use lerp factor
  const smooth = 1 - Math.pow(0.001, dt); // ~fast smooth

  camera.x += (desiredX - camera.x) * smooth;
  camera.z += (desiredZ - camera.z) * smooth;

  // Height uses slower approach (SM64: approach_camera_height 5.f / 20.f)
  const heightSmooth = 1 - Math.pow(0.01, dt);
  camera.y += (desiredY - camera.y) * heightSmooth;

  // Look at target (slightly above player position)
  camera.lookX = target.x;
  camera.lookY = target.y + hOff * 0.5;
  camera.lookZ = target.z;

  return camera;
}

// ============================================================================
// makeFSM — tiny deterministic enemy state machine
//
// Pattern from SM64 Goomba behavior:
//   src/game/behaviors/goomba.inc.c
//   States: GOOMBA_ACT_WALK → GOOMBA_ACT_ATTACKED_MARIO → GOOMBA_ACT_JUMP
//   Core loop: switch(o->oAction) { case WALK: goomba_act_walk(); break; ... }
//
// Clean-room helper, not a copy. Same pattern, original code.
// ============================================================================

/**
 * makeFSM(states, initial) — create a state machine.
 *
 * states: { stateName: { enter(ctx), update(ctx, dt), exit(ctx) } }
 * initial: starting state name
 *
 * Returns { state, transition(to), update(ctx, dt) }
 *
 * Example (Goomba-style):
 *   const goomba = makeFSM({
 *     walk: {
 *       enter: (c) => { c.speed = 5; },
 *       update: (c, dt) => {
 *         c.x += c.dir * c.speed * dt;
 *         if (c.hitWall) c.dir *= -1;
 *         if (c.playerStomped) this.transition('squashed');
 *       }
 *     },
 *     squashed: {
 *       enter: (c) => { c.squashTimer = 0.5; },
 *       update: (c, dt) => {
 *         c.squashTimer -= dt;
 *         if (c.squashTimer <= 0) this.transition('dead');
 *       }
 *     },
 *     dead: { update: () => {} }
 *   }, 'walk');
 */
export function makeFSM(states, initial) {
  const fsm = {
    state: initial,
    states,

    transition(to) {
      if (!this.states[to]) throw new Error(`FSM: unknown state "${to}"`);
      const current = this.states[this.state];
      if (current && current.exit) current.exit(fsm._ctx);
      this.state = to;
      const next = this.states[to];
      if (next && next.enter) next.enter(fsm._ctx);
    },

    update(ctx, dt) {
      fsm._ctx = ctx;
      const s = this.states[this.state];
      if (s && s.update) s.update(ctx, dt);
    },
  };

  // Call enter on initial state
  const init = states[initial];
  if (init && init.enter) {
    fsm._ctx = {};
    init.enter(fsm._ctx);
  }

  return fsm;
}

// ============================================================================
// RETRO AUDIO — NES APU-inspired synthesis
//
// Based on public NES APU hardware documentation.
// The NES had 5 channels: 2 pulse, 1 triangle, 1 noise, 1 DPCM.
// We implement pulse + noise (covers 90% of retro SFX needs).
//
// Key hardware facts:
//   - Pulse duty cycles: 12.5%, 25%, 50%, 75% (register-selectable)
//   - APU clock: ~1.79 MHz NTSC (we use Web Audio directly)
//   - Envelopes: linear decay, no true ADSR (simplified here)
// ============================================================================

export const NES_AUDIO = {
  // NES pulse duty cycle settings (2-bit register → 4 options)
  dutyCycles: {
    '12.5': 0.125,  // thin, nasal — classic "pew" laser
    '25': 0.25,     // bright, reedy — Mario jump
    '50': 0.5,      // square wave — full, hollow
    '75': 0.75,     // equivalent to 25% inverted — warm
  },

  // Classic pitch bend rates (in semitones per second)
  // Mario jump: rapid upward sweep. Derived from listening, not code.
  jumpSweepRate: 24,      // semitones/sec upward
  fallSweepRate: -18,     // semitones/sec downward

  // Noise channel: used for explosions, hits, footsteps
  // NES noise was a linear-feedback shift register (LFSR)
  noiseDecay: 0.15,       // seconds for noise burst decay
};

/**
 * nesPulse(audioCtx, { freq, duty, duration, volume, sweep })
 * Generate an authentic NES-style pulse wave blip.
 *
 * Uses a square wave oscillator with duty cycle approximated via
 * periodic wave, plus exponential volume decay (NES envelope style).
 */
export function nesPulse(audioCtx, opts = {}) {
  const {
    freq = 440,
    duty = 0.5,
    duration = 0.15,
    volume = 0.3,
    sweep = 0, // semitones per second (+ = up, - = down)
  } = opts;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const t = audioCtx.currentTime;

  // Approximate duty cycle using 'square' with periodic wave shaping
  // (True variable duty needs PeriodicWave; square = 50% is close enough
  // for most SFX, or use two detuned squares for other duties)
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, t);

  if (sweep !== 0) {
    const endFreq = freq * Math.pow(2, sweep * duration / 12);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + duration);
  }

  // NES-style linear decay envelope
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);

  return { osc, gain };
}

/**
 * nesNoise(audioCtx, { duration, volume, lowpass })
 * Generate NES-style noise burst (explosions, hits, footsteps).
 *
 * Uses a buffer of white noise with exponential decay.
 * The real NES used an LFSR; white noise + decay is perceptually identical
 * for short bursts.
 */
export function nesNoise(audioCtx, opts = {}) {
  const {
    duration = 0.2,
    volume = 0.4,
    lowpass = 4000, // Hz, lower = more "thud", higher = more "hiss"
  } = opts;

  const t = audioCtx.currentTime;
  const bufferSize = Math.floor(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start(t);

  return { source, gain };
}

/**
 * Convenience: classic Mario-style jump sound.
 * Rapid upward pitch sweep on a 50% pulse wave.
 */
export function sfxJump(audioCtx, volume = 0.25) {
  return nesPulse(audioCtx, {
    freq: 200,
    duty: 0.5,
    duration: 0.25,
    volume,
    sweep: NES_AUDIO.jumpSweepRate * 0.25, // ~6 semitones up
  });
}

/**
 * Convenience: classic stomp/hit sound.
 * Short noise burst with lowpass for "thud".
 */
export function sfxStomp(audioCtx, volume = 0.35) {
  return nesNoise(audioCtx, { duration: 0.12, volume, lowpass: 1200 });
}

/**
 * Convenience: coin/collect chime.
 * Two-tone arpeggio (B5 → E6, the classic interval).
 */
export function sfxCoin(audioCtx, volume = 0.25) {
  nesPulse(audioCtx, { freq: 988, duration: 0.08, volume }); // B5
  setTimeout(() => {
    nesPulse(audioCtx, { freq: 1319, duration: 0.3, volume }); // E6
  }, 80);
}

// ============================================================================
// SUB-FRAME STEPPING & FORGIVENESS
// Source: n64decomp/sm64 src/game/mario_step.c
//
// SM64 runs collision in quarter steps (4 sub-steps per frame). This is what
// prevents tunneling at high speed — each sub-step moves 1/4 the distance,
// so thin walls are never skipped. Static constants alone can't do this;
// the feel lives in the execution order.
//
// Also: coyote time (jump shortly after leaving a ledge) and input buffering
// (a jump pressed just before landing fires on touchdown). These forgiveness
// windows are why Nintendo platformers feel "fair" instead of finicky.
// ============================================================================

export const FEEL_TIMING = {
  subSteps: 4,            // sm64 mario_step.c: quarter-step collision
  coyoteFrames: 4,        // frames you can still jump after walking off a ledge
  jumpBufferFrames: 5,    // frames a pre-landing jump press is remembered
  flipDamping: 0.7,       // velocity multiplier/frame when reversing (no snap-turns)
};

/** doJump — shared jump impulse. sm64 mario.c: vel[1] = 52.0f + forwardVel * 0.25f */
function doJump(e, P) {
  const sp = Math.hypot(e.vx, e.vz);
  e.vy = P.jumpBaseVel + sp * P.jumpSpeedBonus;
  e.grounded = false;
  e.coyoteFrames = 0;
}

/**
 * integrateStep — one physics sub-step (1/4 frame).
 *
 * world (all optional):
 *   world.groundHeightAt(x, z) -> highest walkable y, or -Infinity
 *   world.isSolid(x, y, z)     -> true if the point is inside a wall
 *
 * Sets e._hardLanding (impact velocity) when landing hard — the caller can
 * then call squashStretch(e, 'land'). Never throws on missing world fns.
 */
function integrateStep(e, input, sf, P, world) {
  // --- horizontal ---
  if (e.grounded) {
    const slope = estimateSlope(e, world);
    if (slope && slope.angleDeg > 45) {
      // SLIDE STATE (Sonic Physics Guide): surface steeper than 45° —
      // input is overridden, gravity pulls along the surface tangent.
      // Δv = -g·sin θ applied along the downhill direction.
      // The horizontal surface normal already points downhill, so we
      // accelerate along (nx, nz) directly.
      e.sliding = true;
      const s = Math.sin((slope.angleDeg * Math.PI) / 180);
      const dl = Math.hypot(slope.nx, slope.nz);
      if (dl > 1e-6) {
        const k = (P.gravity * s * 2 * sf) / dl;
        e.vx += slope.nx * k;
        e.vz += slope.nz * k;
      }
      // sliding keeps momentum: no input accel, no ground friction
    } else {
      e.sliding = false;
      // SM64 ground curve: fast start, diminishing returns near max
      const tx = (input.moveX || 0) * P.walkMaxSpeed;
      const tz = (input.moveZ || 0) * P.walkMaxSpeed;
      const ax = Math.sign(tx - e.vx) * (P.walkAccelBase - Math.abs(e.vx) / P.walkAccelFalloff);
      const az = Math.sign(tz - e.vz) * (P.walkAccelBase - Math.abs(e.vz) / P.walkAccelFalloff);
      e.vx += ax * sf;
      e.vz += az * sf;
    }
    const sp = Math.hypot(e.vx, e.vz);
    if (sp > P.absoluteMaxSpeed) {
      const k = P.absoluteMaxSpeed / sp;
      e.vx *= k;
      e.vz *= k;
    }
  } else {
    // air: weaker steering + drag + gravity (sm64 mario_step.c: apply_gravity)
    e.vx += (input.moveX || 0) * P.walkAccelBase * P.airControl * sf;
    e.vz += (input.moveZ || 0) * P.walkAccelBase * P.airControl * sf;
    const dr = Math.pow(P.airDrag, sf);
    e.vx *= dr;
    e.vz *= dr;
    e.vy -= P.gravity * sf;
    if (e.vy < P.terminalVelocity) e.vy = P.terminalVelocity;
    // (variable jump height is applied once per frame in characterStep,
    // matching sm64's per-frame vy /= 4 — not per sub-step)
  }

  const r = e.radius || 0;

  // --- X axis (per-substep wall check = no tunneling) ---
  if (e.vx !== 0) {
    const ox = e.x;
    e.x += e.vx * sf;
    if (world.isSolid && world.isSolid(e.x + Math.sign(e.vx) * r, e.y, e.z)) {
      e.x = ox;
      e.vx = 0;
    }
  }
  // --- Z axis ---
  if (e.vz !== 0) {
    const oz = e.z;
    e.z += e.vz * sf;
    if (world.isSolid && world.isSolid(e.x, e.y, e.z + Math.sign(e.vz) * r)) {
      e.z = oz;
      e.vz = 0;
    }
  }
  // --- Y axis ---
  const oy = e.y;
  e.y += e.vy * sf;
  const gy = world.groundHeightAt ? world.groundHeightAt(e.x, e.z) : -Infinity;
  if (e.vy <= 0 && e.y <= gy) {
    e.y = gy;
    if (e.vy < -30) e._hardLanding = e.vy; // caller: squashStretch(e, 'land')
    e.vy = 0;
    e.grounded = true;
  } else if (e.vy > 0 && world.isSolid && world.isSolid(e.x, e.y + r, e.z)) {
    e.y = oy;
    e.vy = 0; // bonked ceiling
  } else if (e.grounded && e.y > gy + 2) {
    e.grounded = false; // walked off a ledge — coyote time starts now
  } else if (e.grounded) {
    e.y = gy; // stick to ground
  }
}

/**
 * characterStep(entity, input, dt, world) — full SM64-style character update.
 *
 * entity: { x, y, z, vx, vy, vz, grounded, radius?, scale? }
 * input:  { moveX, moveZ (-1..1), jumpPressed (edge), jumpHeld (level) }
 * dt:     seconds (default 1/60)
 * world:  { groundHeightAt(x,z), isSolid(x,y,z) } — both optional
 * phys:   physics preset — MARIO_PHYSICS (default) or SONIC_PHYSICS.
 *         SONIC_PHYSICS uses a gentler jump cut (45% retained on release).
 *
 * What it does beyond applyMarioMovement:
 *  1. Runs physics in 4 sub-steps (FEEL_TIMING.subSteps) — no tunneling.
 *  2. Coyote time: 4 frames of jump after walking off a ledge.
 *  3. Jump buffering: a press up to 5 frames before landing fires on touchdown.
 *  4. Flip deceleration: reversing direction bleeds speed first (no snap-turns).
 *  5. Slope slide: surfaces steeper than 45° override input (Sonic-style).
 *
 * Clean-room implementation. Same constants as MARIO_PHYSICS, original code.
 */
export function characterStep(entity, input = {}, dt = 1 / 60, world = {}, phys = MARIO_PHYSICS) {
  const P = phys;
  const T = FEEL_TIMING;
  const f = dt * 60; // velocities are per-(1/60s)-frame units

  const e = entity;
  e.vx ??= 0;
  e.vy ??= 0;
  e.vz ??= 0;
  e.coyoteFrames ??= 0;
  e.jumpBufferFrames ??= 0;

  const wasGrounded = !!e.grounded;

  // forgiveness upkeep from last frame (buffer decays; coyote handled at end)
  if (e.jumpBufferFrames > 0) e.jumpBufferFrames -= 1;

  const canJump = wasGrounded || e.coyoteFrames > 0;

  // jump edge — exactly once per frame, never per sub-step
  if (input.jumpPressed) {
    if (canJump) {
      doJump(e, P);
    } else {
      e.jumpBufferFrames = T.jumpBufferFrames; // pressed early — remember it
    }
  }

  // directional flip deceleration: stick opposing velocity kills speed first.
  // sm64 turning never snap-flips; forwardVel bleeds before reversing.
  const inMag = Math.hypot(input.moveX || 0, input.moveZ || 0);
  if (inMag > 0.1) {
    const ix = (input.moveX || 0) / inMag;
    const iz = (input.moveZ || 0) / inMag;
    const spd = Math.hypot(e.vx, e.vz);
    if (spd > 1.0 && (e.vx * ix + e.vz * iz) / spd < -0.2) {
      const d = Math.pow(T.flipDamping, f);
      e.vx *= d;
      e.vz *= d;
    }
  }

  // sub-stepped integration
  const sf = f / T.subSteps;
  for (let s = 0; s < T.subSteps; s++) {
    integrateStep(e, input, sf, P, world);
  }

  // ---- variable jump height: once per frame, not per sub-step ----
  // sm64 mario_step.c: should_strengthen_gravity_for_jump_ascent()
  // Early release cuts the ascent velocity by the preset's divisor
  // (Mario: /4 = 25% retained; Sonic preset: /2.222 = 45% retained).
  if (!e.grounded && !input.jumpHeld && e.vy > P.jumpCutThreshold) {
    e.vy /= P.jumpCutDivisor;
  }

  // buffered jump fires on touchdown
  if (!wasGrounded && e.grounded && e.jumpBufferFrames > 0) {
    doJump(e, P);
    e.jumpBufferFrames = 0;
  }

  // coyote upkeep (end of frame so the leaving frame still counts)
  if (wasGrounded) e.coyoteFrames = T.coyoteFrames;
  else if (e.coyoteFrames > 0) e.coyoteFrames -= 1;

  return e;
}

// ============================================================================
// CAMERA OCCLUSION
// Source: n64decomp/sm64 src/game/camera.c — wall collision + pan behavior
//
// SM64's Lakitu camera doesn't just lerp behind Mario — it raycasts from the
// camera to Mario every frame. When a wall blocks line-of-sight, the camera
// pulls INWARD along the focus vector (toward Mario), past the blocker,
// until the view is clear or it reaches minimum distance. It never clips
// through walls.
//
// Also: a pan-lag deadzone. Tiny player fidgets (under ~6 units) don't move
// the camera at all — this kills the micro-jitter that makes indie cameras
// feel nervous.
// ============================================================================

/**
 * rayAABB — slab-method ray vs axis-aligned box.
 * (ox,oy,oz) origin, (dx,dy,dz) full segment vector, b = {minX..maxZ}.
 * Returns entry t in [0,1], or null if no hit.
 */
function rayAABB(ox, oy, oz, dx, dy, dz, b) {
  let tmin = 0;
  let tmax = 1;
  const axes = [
    [ox, dx, b.minX, b.maxX],
    [oy, dy, b.minY, b.maxY],
    [oz, dz, b.minZ, b.maxZ],
  ];
  for (const [o, d, mn, mx] of axes) {
    if (Math.abs(d) < 1e-12) {
      if (o < mn || o > mx) return null;
    } else {
      let t1 = (mn - o) / d;
      let t2 = (mx - o) / d;
      if (t1 > t2) {
        const tt = t1;
        t1 = t2;
        t2 = tt;
      }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}

/** segmentBlocked — true if any collider intersects the a->b segment. */
function segmentBlocked(ax, ay, az, bx, by, bz, colliders) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  for (const c of colliders) {
    const t = rayAABB(ax, ay, az, dx, dy, dz, c);
    if (t !== null && t < 1) return true;
  }
  return false;
}

/**
 * updateCamera(cam, target, colliders, opts) — follow + occlusion + deadzone.
 *
 * cam:       { x, y, z, lookX, lookY, lookZ } (mutated; keeps _ptx/_settled cache)
 * target:    { x, y, z }
 * colliders: [{ minX, maxX, minY, maxY, minZ, maxZ }, ...] — may be empty
 * opts:      { dt, distance, heightOffset, yaw, deadzone=6, minDistance=120 }
 *            (distance/heightOffset/yaw forwarded to lakituCamera)
 *
 * Behavior:
 *  1. If the target moved less than `deadzone`, the camera holds still
 *     (look-at still refreshes) — no jitter from fidgets.
 *  2. Otherwise smooth-follow via lakituCamera().
 *  3. Raycast camera->target; on a hit, pull the camera inward along the
 *     focus vector until line-of-sight clears or minimum distance is hit.
 */
export function updateCamera(cam, target, colliders = [], opts = {}) {
  const dt = opts.dt || 1 / 60;
  const deadzone = opts.deadzone ?? 6;
  const minDist = opts.minDistance ?? 120;

  // --- pan-lag deadzone: ignore sub-threshold fidgets ---
  const px = cam._ptx ?? target.x;
  const py = cam._pty ?? target.y;
  const pz = cam._ptz ?? target.z;
  if (Math.hypot(target.x - px, target.y - py, target.z - pz) < deadzone && cam._settled) {
    cam.lookX = target.x;
    cam.lookY = target.y;
    cam.lookZ = target.z;
    return cam;
  }
  cam._ptx = target.x;
  cam._pty = target.y;
  cam._ptz = target.z;
  cam._settled = true;

  // --- base smooth follow ---
  lakituCamera(cam, target, dt, opts);

  const tx = cam.lookX;
  const ty = cam.lookY;
  const tz = cam.lookZ;
  const dx = tx - cam.x;
  const dy = ty - cam.y;
  const dz = tz - cam.z;

  // --- occlusion: nearest blocker along camera->target ---
  let best = 1;
  for (const c of colliders) {
    const t = rayAABB(cam.x, cam.y, cam.z, dx, dy, dz, c);
    if (t !== null && t < best) best = t;
  }

  if (best < 0.999) {
    // pull inward (toward target), past the blocker, until clear
    let placed = false;
    for (let t = best + 0.02; t < 1; t += 0.03) {
      const cx = cam.x + dx * t;
      const cy = cam.y + dy * t;
      const cz = cam.z + dz * t;
      if (Math.hypot(cx - tx, cy - ty, cz - tz) < minDist) break;
      if (!segmentBlocked(cx, cy, cz, tx, ty, tz, colliders)) {
        cam.x = cx;
        cam.y = cy;
        cam.z = cz;
        placed = true;
        break;
      }
    }
    if (!placed) {
      // nowhere clear — hug minimum distance from the target
      const full = Math.hypot(dx, dy, dz) || 1;
      const t = Math.max(0, 1 - minDist / full);
      cam.x += dx * t;
      cam.y += dy * t;
      cam.z += dz * t;
    }
  }

  return cam;
}

// ============================================================================
// SPECTATE / ATTRACT MODE
//
// The arcade attract-mode pattern, standardized (docs/SPECTATE.md):
//   ?spectate=1  -> bots play themselves; the camera directs itself at the action
//   ?autostart=1 -> skip menus, straight into gameplay
//   ?seed=N      -> deterministic run (same seed, same match, every take)
//
// Why it exists: scripted input ("walk forward, click at t=3") produces dead
// footage. A game playing itself with a heat-seeking camera produces real
// kills, real drama, real juice — the game is its own stunt performer.
// gamepress drive prefers spectate plans over scripted input (see DRIVING.md).
// ============================================================================

/**
 * parseSpectateParams(search) — read the spectate contract from a URL query.
 *
 * Accepts a query string ('?spectate=1&seed=42'), a URLSearchParams, or
 * nothing (reads location.search when available, else defaults).
 * Returns { spectate, autostart, seed } — seed always a finite int >= 0.
 */
export function parseSpectateParams(search) {
  let q;
  if (typeof search === 'string') q = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  else if (search && typeof search.get === 'function') q = search;
  else if (typeof location !== 'undefined' && location.search) q = new URLSearchParams(location.search);
  else q = new URLSearchParams();
  const rawSeed = parseInt(q.get('seed') ?? '1', 10);
  return {
    spectate: q.get('spectate') === '1',
    autostart: q.get('autostart') === '1',
    seed: Number.isFinite(rawSeed) && rawSeed >= 0 ? rawSeed : 1,
  };
}

/**
 * spectateCamera(cam, actors, events, opts) — attract-mode camera director.
 *
 * cam:    { x, y, z, lookX, lookY, lookZ } (mutated; keeps _spect* cache)
 * actors: [{ id, x, y?, z, alive, target? }] — camera candidates; target is
 *         the actor this one is fighting ({ x, y?, z, alive? }), optional
 * events: [{ type: 'kill'|'hit'|'score', x, z }] — world events; each is
 *         counted once (tracked via WeakSet on cam, no caller bookkeeping)
 * opts:   { dt,
 *           chaseDistance=140, chaseHeight=70,   // chase-cam framing
 *           heatDecay=0.5, heatRadius=200,       // interest model
 *           idleTimeout=4, orbitRadius=300,      // no-action fallback
 *           centerX=0, centerY=0, centerZ=0 }    // orbit anchor
 *
 * Behavior:
 *  1. Events add heat to the nearest alive actor (kill=3, hit=1, other=0.5);
 *     heat decays per second.
 *  2. The camera chases the hottest actor, positioned behind them relative
 *     to their target, looking at the target (or the actor if none).
 *  3. With no heat, it slow-orbits the arena center — never a dead frame.
 */
export function spectateCamera(cam, actors = [], events = [], opts = {}) {
  const dt = opts.dt || 1 / 60;
  const chaseDist = opts.chaseDistance ?? 140;
  const chaseHeight = opts.chaseHeight ?? 70;
  const heatDecay = opts.heatDecay ?? 0.5;
  const heatRadius = opts.heatRadius ?? 200;
  const orbitRadius = opts.orbitRadius ?? 300;

  cam._spectHeat = cam._spectHeat || new Map();
  cam._spectSeen = cam._spectSeen || new WeakSet();
  const heat = cam._spectHeat, seen = cam._spectSeen;

  // decay existing heat
  for (const [id, h] of heat) {
    const nh = h - heatDecay * dt;
    if (nh <= 0) heat.delete(id); else heat.set(id, nh);
  }
  // attribute new events to the nearest alive actor (each counted once)
  for (const e of events) {
    if (!e || seen.has(e)) continue;
    seen.add(e);
    const w = e.type === 'kill' ? 3 : e.type === 'hit' ? 1 : 0.5;
    let best = null, bestD = heatRadius;
    for (const a of actors) {
      if (!a || a.alive === false) continue;
      const d = Math.hypot((a.x ?? 0) - (e.x ?? 0), (a.z ?? 0) - (e.z ?? 0));
      if (d < bestD) { bestD = d; best = a; }
    }
    if (best) heat.set(best.id, (heat.get(best.id) || 0) + w);
  }

  // hottest alive actor is the star
  let star = null, starHeat = 0;
  for (const a of actors) {
    if (!a || a.alive === false) continue;
    const h = heat.get(a.id) || 0;
    if (h > starHeat) { starHeat = h; star = a; }
  }

  const k = 1 - Math.pow(0.001, dt); // frame-rate-independent smoothing
  if (star && starHeat > 0) {
    const tgt = star.target && star.target.alive !== false ? star.target : null;
    const lx = tgt ? (tgt.x ?? star.x) : star.x;
    const ly = tgt ? (tgt.y ?? 0) : (star.y ?? 0);
    const lz = tgt ? (tgt.z ?? star.z) : star.z;
    const dx = lx - star.x, dz = lz - star.z;
    const len = Math.hypot(dx, dz) || 1;
    cam.x += (star.x - (dx / len) * chaseDist - cam.x) * k;
    cam.y += ((star.y ?? 0) + chaseHeight - cam.y) * k;
    cam.z += (star.z - (dz / len) * chaseDist - cam.z) * k;
    cam.lookX = lx; cam.lookY = ly; cam.lookZ = lz;
  } else {
    // no action: slow cinematic orbit around the arena center
    const cx = opts.centerX ?? 0, cy = opts.centerY ?? 0, cz = opts.centerZ ?? 0;
    const ang = (cam._spectAng ?? 0) + dt * 0.15;
    cam._spectAng = ang;
    cam.x += (cx + Math.cos(ang) * orbitRadius - cam.x) * k;
    cam.y += (cy + chaseHeight - cam.y) * k;
    cam.z += (cz + Math.sin(ang) * orbitRadius - cam.z) * k;
    cam.lookX = cx; cam.lookY = cy; cam.lookZ = cz;
  }
  return cam;
}

// ============================================================================
// ENEMY FSM UPGRADES
//
// Two patterns from classic Nintendo enemy design:
//
//  1. Deterministic ledge turns. Goombas don't use physics queries or random
//     wandering — they probe the ground ahead (a downward raycast one step
//     in front) and turn around when there's no floor. Cheap, predictable,
//     and it never walks off cliffs by accident.
//     (Pattern from sm64 goomba.inc.c / classic 2D platformer enemies.)
//
//  2. Squash & stretch on state transitions. When Mario lands he squashes;
//     when he jumps he stretches. The scale tween is tied to the transition
//     frame, not the physics — it's pure juice, ~8 frames, ease-out-back.
// ============================================================================

/**
 * ledgeCheck(entity, world, opts) — probe for ground ahead of movement.
 *
 * Returns true if there is NO safe ground ahead (caller should turn).
 *
 * entity: { x, z, y, yaw?, radius? }
 * world:  { groundHeightAt(x, z) }
 * opts:   { dirX, dirZ } override, probe distance, maxDrop
 */
export function ledgeCheck(entity, world, opts = {}) {
  if (!world.groundHeightAt) return false;
  const dirX = opts.dirX ?? Math.sin(entity.yaw || 0);
  const dirZ = opts.dirZ ?? Math.cos(entity.yaw || 0);
  const probe = opts.probe ?? (entity.radius || 10) + 8;
  const maxDrop = opts.maxDrop ?? 24;
  const px = entity.x + dirX * probe;
  const pz = entity.z + dirZ * probe;
  const g = world.groundHeightAt(px, pz);
  return !(g > -Infinity) || g < entity.y - maxDrop;
}

const SS_PRESETS = {
  // transition: { squash/stretch pose, tween duration in seconds }
  land: { sx: 1.35, sy: 0.62, sz: 1.35, dur: 0.14 }, // squash on touchdown
  jump: { sx: 0.78, sy: 1.32, sz: 0.78, dur: 0.12 }, // stretch on takeoff
  hit: { sx: 1.25, sy: 1.25, sz: 0.55, dur: 0.1 }, // flatten on damage
  turn: { sx: 1.15, sy: 0.9, sz: 1.15, dur: 0.08 }, // quick squash on turn
};

/**
 * squashStretch(entity, transition) — start a scale tween.
 * transition: 'land' | 'jump' | 'hit' | 'turn'. Unknown -> no-op.
 * Call tickSquash(entity, dt) every frame to advance it.
 * entity.scale = { x, y, z } is created if missing.
 */
export function squashStretch(entity, transition) {
  const p = SS_PRESETS[transition];
  if (!p) return entity;
  entity.scale = entity.scale || { x: 1, y: 1, z: 1 };
  entity._ss = {
    t: 0,
    dur: p.dur,
    from: { x: entity.scale.x, y: entity.scale.y, z: entity.scale.z },
    to: { x: p.sx, y: p.sy, z: p.sz },
  };
  return entity;
}

function easeOutBack(x) {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * tickSquash(entity, dt) — advance an active squash tween.
 * Snaps to the pose in the first 35%, then ease-out-backs to (1,1,1).
 */
export function tickSquash(entity, dt) {
  const s = entity._ss;
  if (!s) return entity;
  entity.scale = entity.scale || { x: 1, y: 1, z: 1 };
  s.t += dt;
  const k = Math.min(1, s.t / s.dur);
  const snap = 0.35;
  if (k < snap) {
    const e = k / snap;
    entity.scale.x = lerp(s.from.x, s.to.x, e);
    entity.scale.y = lerp(s.from.y, s.to.y, e);
    entity.scale.z = lerp(s.from.z, s.to.z, e);
  } else {
    const e = easeOutBack((k - snap) / (1 - snap));
    entity.scale.x = lerp(s.to.x, 1, e);
    entity.scale.y = lerp(s.to.y, 1, e);
    entity.scale.z = lerp(s.to.z, 1, e);
  }
  if (k >= 1) {
    entity.scale.x = 1;
    entity.scale.y = 1;
    entity.scale.z = 1;
    entity._ss = null;
  }
  return entity;
}

// ============================================================================
// APU — 4-channel voice manager with priority stealing
//
// The NES APU had 5 channels (2 pulse, triangle, noise, DPCM). The critical
// design detail most reimplementations miss: CHANNEL PRIORITY. When a sound
// effect fires, it STEALS the Pulse 1 channel from the music — the music
// voice is parked, the SFX plays, then the music resumes. Without this,
// overlapping SFX either stack into mud or cut the music permanently.
//
// Channels: pulse1, pulse2, triangle, noise.
// Priority: higher number wins. Music runs at 1, SFX at 10.
// ============================================================================

const APU_CHANNELS = ['pulse1', 'pulse2', 'triangle', 'noise'];

export class APU {
  /**
   * @param {AudioContext} audioCtx — a real or mock Web Audio context
   */
  constructor(audioCtx) {
    if (!audioCtx) throw new Error('APU: needs an AudioContext');
    this.ctx = audioCtx;
    this.voices = { pulse1: null, pulse2: null, triangle: null, noise: null };
    this._resumeTimers = {};
  }

  _kill(channel) {
    const v = this.voices[channel];
    if (!v) return;
    if (v._timer) clearTimeout(v._timer);
    try {
      v.node.stop();
    } catch {
      /* already stopped */
    }
    try {
      v.node.disconnect();
      v.gain.disconnect();
    } catch {
      /* already disconnected */
    }
    this.voices[channel] = null;
  }

  _noiseSource(dur) {
    const ctx = this.ctx;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  /**
   * playTone(channel, freq, duration, envelope, priority)
   *
   * envelope: { attack, decay, sustain (0..1), release } in seconds,
   *           plus { volume (0..1), sweep (semitones/sec), lowpass (noise) }
   * priority: higher steals. Returns the voice, or null if a higher-
   *           priority voice is already on the channel.
   */
  playTone(channel, freq, duration = 0.2, envelope = {}, priority = 5) {
    if (!APU_CHANNELS.includes(channel)) {
      throw new Error(`APU: unknown channel "${channel}" (want ${APU_CHANNELS.join(', ')})`);
    }
    const cur = this.voices[channel];
    if (cur && cur.priority > priority) return null; // higher priority holds the channel

    this._kill(channel);

    const ctx = this.ctx;
    const t = ctx.currentTime;
    const {
      attack = 0.005,
      decay = 0.06,
      sustain = 0.55,
      release = 0.09,
      volume = 0.25,
      sweep = 0,
      lowpass = 5000,
      type,
    } = envelope;

    const gain = ctx.createGain();
    let node;
    if (channel === 'noise') {
      node = this._noiseSource(duration + attack + decay + release + 0.1);
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = lowpass;
      node.connect(filt);
      filt.connect(gain);
    } else {
      node = ctx.createOscillator();
      node.type = type || (channel === 'triangle' ? 'triangle' : 'square');
      node.frequency.setValueAtTime(Math.max(1, freq), t);
      if (sweep !== 0) {
        const end = Math.max(1, freq * Math.pow(2, (sweep * duration) / 12));
        node.frequency.exponentialRampToValueAtTime(end, t + duration);
      }
      node.connect(gain);
    }
    gain.connect(ctx.destination);

    // proper ADSR
    const a = Math.max(0.001, attack);
    const d = Math.max(0.001, decay);
    const r = Math.max(0.001, release);
    const peakT = t + a;
    const susT = peakT + d;
    const endT = t + Math.max(duration, a + d + 0.01);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(volume, peakT);
    gain.gain.linearRampToValueAtTime(volume * sustain, susT);
    gain.gain.setValueAtTime(volume * sustain, endT);
    gain.gain.linearRampToValueAtTime(0.0001, endT + r);

    node.start(t);
    const stopT = endT + r + 0.05;
    try {
      node.stop(stopT);
    } catch {
      /* mock contexts may not implement stop(t) */
    }

    const voice = { node, gain, priority, channel, music: null, _timer: null, stopT };
    this.voices[channel] = voice;
    voice._timer = setTimeout(() => {
      if (this.voices[channel] === voice) this.voices[channel] = null;
    }, Math.max(0, (stopT - t) * 1000) + 60);
    // don't hold the node process open for hour-long music drones
    if (voice._timer.unref) voice._timer.unref();
    return voice;
  }

  /**
   * music(channel, freq, opts) — start a low-priority drone on a channel.
   * Saved on the voice so sfx() can resume it after stealing the channel.
   */
  music(channel, freq, opts = {}) {
    const voice = this.playTone(
      channel,
      freq,
      opts.duration || 3600,
      { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.2, volume: 0.12, ...(opts.envelope || {}) },
      1
    );
    if (voice) voice.music = { freq, opts };
    return voice;
  }

  /**
   * sfx(freq, duration, opts) — steal pulse1 (or opts.channel), play the
   * effect at priority 10, then resume whatever music was parked.
   */
  sfx(freq, duration = 0.15, opts = {}) {
    const ch = opts.channel || 'pulse1';
    const prev = this.voices[ch];
    const savedMusic = prev && prev.music ? { ...prev.music } : null;
    const voice = this.playTone(
      ch,
      freq,
      duration,
      { attack: 0.002, decay: 0.04, sustain: 0.3, release: 0.05, volume: 0.3, ...(opts.envelope || {}) },
      10
    );
    if (savedMusic) {
      clearTimeout(this._resumeTimers[ch]);
      // resume only after the sfx voice has fully released the channel
      const delayMs = voice ? Math.max(0, (voice.stopT - this.ctx.currentTime) * 1000) + 80 : duration * 1000 + 80;
      this._resumeTimers[ch] = setTimeout(() => {
        this._kill(ch);
        this.music(ch, savedMusic.freq, savedMusic.opts);
      }, delayMs);
      if (this._resumeTimers[ch].unref) this._resumeTimers[ch].unref();
    }
    return voice;
  }
}

/**
 * playTone(apu, channel, freq, duration, envelope) — standalone helper
 * for one-off tones through an existing APU instance.
 */
export function playTone(apu, channel, freq, duration, envelope) {
  return apu.playTone(channel, freq, duration, envelope);
}

// (default export moved to end of file — see below)

// ============================================================================
// DETERMINISTIC RNG — 16-bit Galois LFSR
//
// Bot replays and procedural generation need randomness that can be rewound.
// Math.random() can't do that. This 16-bit Galois LFSR (taps 16,14,13,11 —
// polynomial x^16 + x^14 + x^13 + x^11 + 1) has period 65535 and full
// state save/restore, so any replay can be reproduced exactly from its seed.
//
// Default seed 0xACE1 (the canonical LFSR example seed).
// Note: state 0 is degenerate (LFSR locks up), so setState(0) maps to 1.
// ============================================================================

export class DeterministicRNG {
  constructor(seed = 0xACE1) {
    this.setState(seed);
  }

  /** next() — advance one step, return float in [0, 1). */
  next() {
    const lsb = this.state & 1;
    this.state >>>= 1;
    if (lsb) this.state ^= 0xb400;
    return this.state / 0x10000;
  }

  /** nextInt(n) — integer in [0, n). */
  nextInt(n) {
    return Math.floor(this.next() * n);
  }

  /** nextRange(a, b) — float in [a, b). */
  nextRange(a, b) {
    return a + this.next() * (b - a);
  }

  /** getState() — snapshot for replay save. */
  getState() {
    return this.state;
  }

  /** setState(s) — restore a snapshot; replay continues identically. */
  setState(s) {
    this.state = (s & 0xffff) || 1;
  }
}

// ============================================================================
// VIRTUAL APU — fire-and-forget variant for BGM/SFX multiplexing
//
// Extends APU with the two call patterns chiptune drivers actually use:
//
//   triggerSFX(freq, opts) — hard-steal Pulse1 for exactly 150ms, no questions.
//     For jump/shot/hit blips that must never be blocked or delayed.
//
//   playBGMNote(channel, freq, duration, envelope) — YIELD if the channel is
//     occupied. Background music never steals, never queues, never glitches:
//     if a SFX owns the channel, the note is simply skipped this tick.
//     (This is how NES drivers kept music clean under SFX fire.)
// ============================================================================

export class VirtualAPU extends APU {
  /**
   * triggerSFX(freq, opts) — steal Pulse1 for 150ms, fire-and-forget.
   * Unlike APU.sfx(), there is no music-resume bookkeeping: BGM voices are
   * expected to use playBGMNote(), which yields while the SFX owns the channel.
   */
  triggerSFX(freq, opts = {}) {
    const ch = 'pulse1';
    this._kill(ch); // hard steal regardless of priority
    return this.playTone(
      ch,
      freq,
      0.15,
      { attack: 0.002, decay: 0.05, sustain: 0.4, release: 0.04, volume: 0.3, ...(opts.envelope || {}) },
      10
    );
  }

  /**
   * playBGMNote(channel, freq, duration, envelope) — play only if free.
   * Returns the voice, or null (yielded) when the channel is occupied.
   */
  playBGMNote(channel, freq, duration = 0.25, envelope = {}) {
    if (this.voices[channel]) return null; // occupied → yield, no queue
    return this.playTone(
      channel,
      freq,
      duration,
      { attack: 0.01, decay: 0.08, sustain: 0.7, release: 0.1, volume: 0.14, ...envelope },
      1
    );
  }
}

// ============================================================================
// SLOPE SLIDE — Sonic-style steep-surface behavior
// Source: info.sonicretro.org/Sonic_Physics_Guide (slope physics)
//
// Sonic's rule: when the surface angle exceeds ~45°, the character enters a
// SLIDE state. Player input is overridden — gravity's component along the
// surface tangent takes over (Δv = -g·sin θ). This is what makes steep
// hills feel dangerous instead of just "slow".
//
// Implemented by sampling groundHeightAt around the entity to estimate the
// surface normal, then applying tangential gravity when steep.
// ============================================================================

/**
 * estimateSlope(e, world) — sample terrain, return { angleDeg, nx, nz } or null.
 * nx/nz: horizontal components of the surface normal (pointing uphill).
 */
function estimateSlope(e, world) {
  if (!world.groundHeightAt) return null;
  const px = (e.radius || 10) + 4;
  const gx1 = world.groundHeightAt(e.x + px, e.z);
  const gx0 = world.groundHeightAt(e.x - px, e.z);
  const gz1 = world.groundHeightAt(e.x, e.z + px);
  const gz0 = world.groundHeightAt(e.x, e.z - px);
  let nx = 0;
  let nz = 0;
  if (isFinite(gx1) && isFinite(gx0)) nx = -(gx1 - gx0) / (2 * px);
  if (isFinite(gz1) && isFinite(gz0)) nz = -(gz1 - gz0) / (2 * px);
  const ny = 1;
  const nl = Math.hypot(nx, ny, nz) || 1;
  nx /= nl;
  nz /= nl;
  const nyN = ny / nl;
  const angleDeg = (Math.acos(Math.min(1, nyN)) * 180) / Math.PI;
  return { angleDeg, nx, nz };
}

// ============================================================================
// SONIC_PHYSICS — Sonic the Hedgehog feel preset
// Source: info.sonicretro.org/Sonic_Physics_Guide
//
// Same fields as MARIO_PHYSICS (drop-in for characterStep's phys param).
// Key differences from Mario:
//   - Jump cut is gentler: release drops velocity to 45% (not 25%).
//     (divisor = 1/0.45 ≈ 2.222)
//   - Snappier acceleration, higher top speed, momentum preserved in air.
//   - Slopes matter: see the slide state above.
// ============================================================================

export const SONIC_PHYSICS = {
  ...MARIO_PHYSICS,
  // clean-room constants in the spirit of the Sonic Physics Guide;
  // field-compatible with MARIO_PHYSICS
  jumpCutDivisor: 1 / 0.45, // release -> 45% velocity retained
  walkAccelBase: 1.4,
  walkAccelFalloff: 52.0,
  walkMaxSpeed: 40.0,
  absoluteMaxSpeed: 60.0,
  airControl: 0.7, // Sonic keeps more air authority than Mario
  airDrag: 0.998, // momentum preserved
};

// ============================================================================
// THREE.JS ADAPTER
//
// Bridges gpfeel's plain-object camera interface to THREE.PerspectiveCamera
// without importing three.js (duck-typed — works with any camera-like object
// that has .position and .lookAt).
//
// Usage:
//   import { updateCamera, threeAdapter } from '../kit/gpfeel.js';
//   const cam = threeAdapter(threeCamera);       // wraps THREE.PerspectiveCamera
//   updateCamera(cam, target, colliders, { dt }); // gpfeel does its math
//   cam.update();                               // pushes to threeCamera
// ============================================================================

/**
 * threeAdapter(camera3) — wrap a Three.js camera for gpfeel.updateCamera().
 *
 * camera3: object with .position ({x,y,z} or .set(x,y,z)) and .lookAt(x,y,z).
 * Returns a proxy with x/y/z synced to camera3.position, lookX/lookY/lookZ
 * tracking, and .update() to push everything back to the real camera.
 */
export function threeAdapter(camera3) {
  if (!camera3 || !camera3.position || typeof camera3.lookAt !== 'function') {
    throw new Error('threeAdapter: expected a camera-like object with .position and .lookAt()');
  }
  const pos = camera3.position;
  const proxy = {
    // x/y/z proxy to the real camera position (supports both plain {x,y,z}
    // and THREE.Vector3-style objects)
    get x() { return pos.x; },
    set x(v) { pos.x = v; },
    get y() { return pos.y; },
    set y(v) { pos.y = v; },
    get z() { return pos.z; },
    set z(v) { pos.z = v; },
    // look target tracked by gpfeel.updateCamera / lakituCamera
    lookX: pos.x,
    lookY: pos.y,
    lookZ: pos.z,
    // internal gpfeel state (pan-lag deadzone bookkeeping)
    _ptx: undefined,
    _pty: undefined,
    _ptz: undefined,
    _settled: false,
    /**
     * update() — push proxy state to the real Three.js camera.
     * Call after gpfeel.updateCamera(proxy, ...) each frame.
     */
    update() {
      // position is already synced via getters/setters; just apply lookAt
      camera3.lookAt(proxy.lookX, proxy.lookY, proxy.lookZ);
      return camera3;
    },
    /** raw() — escape hatch to the wrapped camera. */
    raw() { return camera3; },
  };
  return proxy;
}

// ============================================================================
// RETROCONTROLLER — standalone input forgiveness
//
// Cleaner API than the inline coyote/buffer logic inside characterStep().
// Use when you want forgiveness decoupled from the full physics step
// (e.g. custom controllers, 2D recipes, touch input pipelines).
//
//   const ctl = new RetroController();
//   // each frame:
//   ctl.update(isGrounded, jumpPressed);
//   if (jumpPressed && ctl.canJump()) { doJump(); ctl.consumeJump(); }
// ============================================================================

export class RetroController {
  constructor() {
    this.coyoteTimer = 0;      // frames remaining to jump after leaving a ledge
    this.jumpBufferTimer = 0;  // frames remaining for an early jump press to fire
    this.COYOTE_MAX = 4;       // SM64-style: 4 frames of coyote time
    this.JUMP_BUFFER_MAX = 5;  // 5 frames of jump input buffering
  }

  /**
   * update(isGrounded, jumpPressed) — call once per frame.
   * isGrounded: boolean, whether the entity is on the ground this frame.
   * jumpPressed: boolean, edge-triggered jump input (true only on press frame).
   */
  update(isGrounded, jumpPressed) {
    if (isGrounded) {
      this.coyoteTimer = this.COYOTE_MAX;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer -= 1;
    }
    if (jumpPressed) {
      this.jumpBufferTimer = this.JUMP_BUFFER_MAX;
    } else if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= 1;
    }
  }

  /** canJump() — true if a buffered jump press overlaps the coyote window. */
  canJump() {
    return this.jumpBufferTimer > 0 && this.coyoteTimer > 0;
  }

  /** consumeJump() — call when the jump fires; clears both timers. */
  consumeJump() {
    this.jumpBufferTimer = 0;
    this.coyoteTimer = 0;
  }

  /** reset() — clear all state (e.g. on respawn or scene change). */
  reset() {
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
  }
}

// ============================================================================
// HITSTOP — freeze physics for N frames on impact (Smash Bros style)
//
// The single most impactful juice mechanic: on a heavy hit, freeze EVERYTHING
// for 2-6 frames. The contrast between motion and stillness makes impacts
// feel 10x heavier than particles or shake alone.
//
// Usage:
//   const hitstop = new HitStopManager();
//   // in game loop:
//   if (hitstop.update()) return; // skip physics this frame
//   // ... normal update ...
//   // on heavy impact:
//   hitstop.trigger(4); // freeze for 4 frames
// ============================================================================

export class HitStopManager {
  constructor() {
    this.freezeFrames = 0;
  }

  /** trigger(frames) — freeze the game for N frames. Heavier hit = more frames. */
  trigger(frames = 3) {
    this.freezeFrames = Math.max(this.freezeFrames, frames);
  }

  /**
   * update() — call at the top of the game loop.
   * Returns true if the game should skip physics this frame (frozen).
   */
  update() {
    if (this.freezeFrames > 0) {
      this.freezeFrames -= 1;
      return true;
    }
    return false;
  }

  /** isFrozen() — peek without consuming a frame. */
  isFrozen() {
    return this.freezeFrames > 0;
  }

  /** clear() — cancel any active freeze. */
  clear() {
    this.freezeFrames = 0;
  }
}

// ============================================================================
// CORNER NUDGE — Celeste-style ledge assist for 2D platformers
//
// When jumping upward and the player's head clips a ledge corner, nudge them
// horizontally so they land on the ledge instead of bonking. This is the
// forgiveness that makes Celeste's pixel-perfect jumps feel fair.
//
// entity: { x, y, vy } (x,y = center)
// worldColliders: { checkPoint(x, y) } returns truthy if solid
// ============================================================================

/**
 * applyCornerNudge2D(entity, worldColliders, width, height) — ledge assist.
 *
 * Only fires while moving upward (vy > 0 in y-down coords, i.e. ascending).
 * If the head's left or right edge hits but center is clear, nudge 3px
 * toward the clear side.
 */
export function applyCornerNudge2D(entity, worldColliders, width = 16, height = 16) {
  if (!worldColliders || typeof worldColliders.checkPoint !== 'function') return;
  if (entity.vy <= 0) return; // only while ascending (gpfeel uses y-up: vy>0 = rising)
  const headY = entity.y + height / 2 + 1;
  const leftHit = worldColliders.checkPoint(entity.x - width / 2, headY);
  const rightHit = worldColliders.checkPoint(entity.x + width / 2, headY);
  const centerHit = worldColliders.checkPoint(entity.x, headY);
  if (leftHit && !centerHit) entity.x += 3;
  else if (rightHit && !centerHit) entity.x -= 3;
}

// ============================================================================
// APEX GRAVITY — halve gravity at the jump peak (floaty apex)
//
// Real platformers (Mario, Celeste) don't use constant gravity through a jump.
// Near the apex (vy ≈ 0), gravity drops — the character hangs for a few extra
// frames, giving the player time to aim the landing. This is the "floaty"
// feeling players describe.
//
// Usage in a custom integrator:
//   const g = calculateApexGravity(baseGravity, entity.vy);
//   entity.vy += g * dt;
// ============================================================================

/**
 * calculateApexGravity(baseGravity, vy, threshold) — gravity scaled near apex.
 * Returns baseGravity * 0.5 when |vy| < threshold, else baseGravity.
 */
export function calculateApexGravity(baseGravity, vy, threshold = 1.5) {
  return Math.abs(vy) < threshold ? baseGravity * 0.5 : baseGravity;
}

// ============================================================================
// TRAUMA CAMERA — polynomial screen shake (GDC standard)
//
// From "Math for Game Programmers: Juicing Your Cameras With Math" (GDC).
// Trauma is a 0..1 value; shake magnitude = trauma². Small hits add a little
// trauma, big hits add a lot — but the quadratic falloff means small shakes
// stay subtle while big ones feel massive.
//
// Driven by gpfeel.DeterministicRNG for replay-deterministic bot captures.
//
// Usage:
//   const shake = new TraumaCamera();
//   const rng = new DeterministicRNG(seed);
//   // on impact: shake.addTrauma(0.4);
//   // each frame:
//   const offset = shake.update(dt, rng);
//   renderX = baseX + offset.x; renderY = baseY + offset.y;
// ============================================================================

export class TraumaCamera {
  constructor() {
    this.trauma = 0;
    this.decay = 1.8; // trauma/second decay rate
  }

  /** addTrauma(amount) — add shake, clamped to [0, 1]. */
  addTrauma(amount) {
    this.trauma = Math.min(this.trauma + amount, 1.0);
  }

  /**
   * update(dt, rng) — decay trauma, return shake offsets.
   * rng: object with .next() returning [0,1). Use DeterministicRNG for replays.
   * Returns { x, y, rotation } pixel/radian offsets to add to the camera.
   */
  update(dt, rng) {
    this.trauma = Math.max(this.trauma - this.decay * dt, 0);
    const shake = this.trauma * this.trauma; // polynomial falloff
    const r = rng && typeof rng.next === 'function' ? rng : { next: Math.random };
    return {
      x: (r.next() * 2 - 1) * shake * 12,
      y: (r.next() * 2 - 1) * shake * 12,
      rotation: (r.next() * 2 - 1) * shake * 0.08,
    };
  }

  /** isShaking() — true while any trauma remains. */
  isShaking() {
    return this.trauma > 0;
  }

  /** clear() — kill all shake immediately. */
  clear() {
    this.trauma = 0;
  }
}

// ============================================================================
// SQUASHSTRETCH — stateful landing/jump scale tweens
//
// Class version of the squashStretch()/tickSquash() helpers above.
// The helpers work on entity.scale objects; this class holds its own state
// for use in render pipelines that track scale separately.
//
//   const ss = new SquashStretch();
//   // on land: ss.onLand();  on jump: ss.onJump();
//   // each frame: ss.update(dt); apply ss.scaleX / ss.scaleY to the sprite.
// ============================================================================

export class SquashStretch {
  constructor() {
    this.scaleX = 1;
    this.scaleY = 1;
  }

  /** onLand() — squash: wide and flat. */
  onLand() {
    this.scaleX = 1.35;
    this.scaleY = 0.65;
  }

  /** onJump() — stretch: tall and thin. */
  onJump() {
    this.scaleX = 0.75;
    this.scaleY = 1.30;
  }

  /** onHit() — punch squash, stronger than landing. */
  onHit() {
    this.scaleX = 1.5;
    this.scaleY = 0.5;
  }

  /**
   * update(dt) — exponential recovery toward (1,1).
   * Rate 18/s: snappy but visible (~0.25s to settle).
   */
  update(dt) {
    const k = 1 - Math.exp(-18 * dt);
    this.scaleX += (1 - this.scaleX) * k;
    this.scaleY += (1 - this.scaleY) * k;
  }

  /** isActive() — true while visibly deformed. */
  isActive() {
    return Math.abs(this.scaleX - 1) > 0.01 || Math.abs(this.scaleY - 1) > 0.01;
  }

  /** reset() — snap back to neutral. */
  reset() {
    this.scaleX = 1;
    this.scaleY = 1;
  }
}

// ============================================================================
// SPHERICAL GRAVITY (Super Mario Galaxy — clean-room reimplementation)
// Sources:
//  - MarioWiki "Gravity": Sphere gravity vectors point toward the sphere center.
//    https://www.mariowiki.com/Gravity
//  - gamedeveloper.com "Super Mario Galaxy Demystified": cast a ray down from
//    Mario, grab the nearest surface normal; its inverse is the gravity direction.
//    Orientation interpolates smoothly between adjacent surface normals.
// Legal: math only — vector toward center, normal-based orientation. No assets.
// ============================================================================

/**
 * Apply spherical gravity: "down" is the vector from entity toward planet center.
 * Also returns the surface normal (pointing away from center) for orienting
 * the entity's up-axis, with optional smoothing.
 *
 * @param {object} entity - {x,y,z, vx,vy,vz}
 * @param {object} planetCenter - {x,y,z}
 * @param {number} strength - gravity acceleration (units/s^2)
 * @param {number} dt - timestep
 * @param {number} smooth - 0..1 lerp factor for up-vector (default 0.15)
 * @returns {object} {nx,ny,nz} — the surface normal (entity's new "up")
 */
export function sphericalGravity(entity, planetCenter, strength, dt, smooth = 0.15) {
  // Direction from entity toward planet center = gravity direction
  const dx = planetCenter.x - entity.x;
  const dy = planetCenter.y - entity.y;
  const dz = planetCenter.z - entity.z;
  const dist = Math.hypot(dx, dy, dz) || 1;
  const gx = dx / dist, gy = dy / dist, gz = dz / dist;

  entity.vx += gx * strength * dt;
  entity.vy += gy * strength * dt;
  entity.vz += gz * strength * dt;

  // Surface normal = opposite of gravity (points away from center).
  // Smooth-interpolate the entity's up vector so orientation transitions
  // are gradual across polygon boundaries (Galaxy's key smoothness trick).
  const nx = -gx, ny = -gy, nz = -gz;
  entity.ux = (entity.ux ?? nx) + (nx - (entity.ux ?? nx)) * smooth;
  entity.uy = (entity.uy ?? ny) + (ny - (entity.uy ?? ny)) * smooth;
  entity.uz = (entity.uz ?? nz) + (nz - (entity.uz ?? nz)) * smooth;
  // Re-normalize
  const ul = Math.hypot(entity.ux, entity.uy, entity.uz) || 1;
  entity.ux /= ul; entity.uy /= ul; entity.uz /= ul;

  return { nx, ny, nz };
}

/**
 * Jump on a spherical planet: impulse along the surface normal.
 * @param {object} entity
 * @param {number} impulse - jump velocity
 */
export function sphericalJump(entity, impulse) {
  const nx = entity.ux ?? 0, ny = entity.uy ?? 1, nz = entity.uz ?? 0;
  entity.vx += nx * impulse;
  entity.vy += ny * impulse;
  entity.vz += nz * impulse;
}

// ============================================================================
// MELEE KNOCKBACK (Super Smash Bros. Melee — clean-room reimplementation)
// Sources:
//  - SmashWiki "Knockback": Melee formula
//    ((((p/10 + (p*d)/20) * (200/(w+100)) * 1.4) + 18) * s) + b) * r
//    https://www.ssbwiki.com/Knockback
//  - SuperCombo Wiki SSBM/Game Mechanics — variable definitions.
//  - SmashWiki "Hitstun": Melee hitstun = knockback * 0.4 (frames per unit).
// Legal: math formulas only. No assets, no character data.
// ============================================================================

/**
 * Melee knockback formula.
 * @param {number} percent - target's percent AFTER damage is added
 * @param {number} damage - damage the attack dealt
 * @param {number} weight - target's weight (100 = weight-independent)
 * @param {number} scaling - knockback growth / 100 (e.g. 1.1 for 110)
 * @param {number} base - base knockback
 * @param {number} ratio - multiplier (1.0 standard; 0.667 crouch-cancel, 1.2 smash-charge-interrupt)
 * @returns {number} knockback units
 */
export function meleeKnockback(percent, damage, weight = 100, scaling = 1.0, base = 0, ratio = 1.0) {
  const p = percent, d = damage, w = weight, s = scaling, b = base, r = ratio;
  return (((((p / 10 + (p * d) / 20) * (200 / (w + 100)) * 1.4) + 18) * s) + b) * r;
}

/**
 * Melee hitstun in frames from knockback units.
 * @param {number} knockback
 * @returns {number} hitstun frames (floored, minus 1 per in-game convention)
 */
export function meleeHitstun(knockback) {
  return Math.max(0, Math.floor(knockback * 0.4) - 1);
}

/**
 * Melee launch velocity from knockback units.
 * @param {number} knockback
 * @returns {number} initial launch speed
 */
export function meleeLaunchSpeed(knockback) {
  return knockback * 0.03;
}

// ============================================================================
// CLEAN EXPORT SURFACE
// ============================================================================

const gpfeel = {
  // constants (ground truth, with source citations above)
  MARIO_PHYSICS,
  SONIC_PHYSICS,
  LAKITU_CAMERA,
  NES_AUDIO,
  FEEL_TIMING,
  // spherical gravity (Galaxy)
  sphericalGravity,
  sphericalJump,
  // melee combat
  meleeKnockback,
  meleeHitstun,
  meleeLaunchSpeed,
  // execution
  applyMarioMovement,
  characterStep,
  lakituCamera,
  updateCamera,
  // spectate / attract mode
  parseSpectateParams,
  spectateCamera,
  threeAdapter,
  RetroController,
  // juice
  HitStopManager,
  applyCornerNudge2D,
  calculateApexGravity,
  TraumaCamera,
  SquashStretch,
  ledgeCheck,
  squashStretch,
  tickSquash,
  makeFSM,
  DeterministicRNG,
  // audio
  APU,
  VirtualAPU,
  playTone,
  nesPulse,
  nesNoise,
  sfxJump,
  sfxStomp,
  sfxCoin,
};

export default gpfeel;
