/**
 * kit/gbfixed.js — 8.8 fixed-point math for ROM homebrew (SNES / Game Boy).
 *
 * Pure integer math. No floats in hot paths. Matches how real retro
 * hardware stores positions: 16-bit value, upper 8 bits = pixel,
 * lower 8 bits = sub-pixel fraction.
 *
 * Layout: 0xIIFF — II = integer pixels (signed), FF = fractional (0-255).
 *
 * Sources: SNES 65816 homebrew conventions (PVSnesLib), GBDK-2020,
 * Super Mario World disassembly sub-pixel handling.
 *
 * Usage:
 *   import { f2x, x2f, fadd, fmul, Fixed } from '../kit/gbfixed.js';
 *   let x = f2x(100);        // 100.0 pixels as fixed
 *   x = fadd(x, f2x(0.5));  // move half a pixel — no float drift
 *   renderX = x >> 8;        // snap to integer for the PPU
 */

// Raw conversions -----------------------------------------------------------
/** float -> 8.8 fixed (rounds) */
export function f2x(f) {
  return Math.round(f * 256);
}

/** 8.8 fixed -> float (for debug display only, never in hot paths) */
export function x2f(x) {
  return x / 256;
}

/** fixed -> integer pixels (render coordinate) */
export function x2i(x) {
  return x >> 8;
}

/** integer pixels -> fixed */
export function i2x(i) {
  return i << 8;
}

// Arithmetic (all integer ops) ------------------------------------------------
/** fixed + fixed */
export function fadd(a, b) {
  return (a + b) | 0;
}

/** fixed - fixed */
export function fsub(a, b) {
  return (a - b) | 0;
}

/** fixed * fixed -> fixed (8.8 x 8.8 = 16.16, shift back) */
export function fmul(a, b) {
  return (Math.imul(a, b) >> 8) | 0;
}

/** fixed / fixed -> fixed */
export function fdiv(a, b) {
  if (b === 0) return 0;
  return ((Math.imul(a, 256) / b) | 0) | 0;
}

/** fixed * integer -> fixed */
export function fmulInt(a, n) {
  return Math.imul(a, n) | 0;
}

/** absolute value */
export function fabs(a) {
  return a < 0 ? -a : a;
}

/** negate */
export function fneg(a) {
  return -a | 0;
}

/** min / max */
export function fmin(a, b) {
  return a < b ? a : b;
}
export function fmax(a, b) {
  return a > b ? a : b;
}

/** clamp fixed v to [lo, hi] */
export function fclamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Sub-pixel accumulator -------------------------------------------------------
/**
 * Fixed — stateful 8.8 position with velocity. The standard retro pattern:
 * accumulate fractional velocity every frame, render the integer part.
 *
 *   const px = new Fixed(100);   // 100 pixels
 *   px.add(f2x(0.3));            // += 0.3px/frame — accumulates cleanly
 *   sprite.x = px.int;           // integer for the PPU
 */
export class Fixed {
  constructor(pixels = 0) {
    this.v = f2x(pixels);
  }
  /** raw fixed value */
  get raw() {
    return this.v;
  }
  /** integer pixels (render coordinate) */
  get int() {
    return this.v >> 8;
  }
  /** fractional part 0-255 */
  get frac() {
    return this.v & 0xff;
  }
  add(fixedDelta) {
    this.v = (this.v + fixedDelta) | 0;
    return this;
  }
  sub(fixedDelta) {
    this.v = (this.v - fixedDelta) | 0;
    return this;
  }
  set(pixels) {
    this.v = f2x(pixels);
    return this;
  }
  setRaw(raw) {
    this.v = raw | 0;
    return this;
  }
  clone() {
    const f = new Fixed();
    f.v = this.v;
    return f;
  }
}

// 2D fixed-point vector ---------------------------------------------------------
export class FixedVec2 {
  constructor(x = 0, y = 0) {
    this.x = new Fixed(x);
    this.y = new Fixed(y);
  }
  add(dx, dy) {
    this.x.add(dx);
    this.y.add(dy);
    return this;
  }
}

// Common physics constants in 8.8 ----------------------------------------------
export const FIXED = {
  /** gravity per frame at 60fps, SMW-style (~0.35 px/frame^2) */
  GRAVITY: f2x(0.35),
  /** terminal fall speed */
  TERMINAL: f2x(7),
  /** coyote time in frames */
  COYOTE_FRAMES: 4,
  /** jump buffer in frames */
  BUFFER_FRAMES: 5,
};

// Frame-rate conversion -------------------------------------------------------
// Ports between platforms with different refresh rates need their per-frame
// physics rescaled, or the game plays faster/slower on the target. From the
// Contra NES -> Virtual Boy port (see docs/tracks/port.md):
//
//   K  = source_hz / target_hz
//   v' = v * K        velocities scale linearly with the ratio
//   a' = a * K * K    accelerations scale with the square of the ratio
//   T' = round(T * K) frame-count durations rescale proportionally
//
// Contra example: NES 60.1 Hz -> Virtual Boy ~50 Hz, so K = 60.1 / 50 = 1.202.
// A 2.5 px/frame run speed becomes 2.5 * 1.202 = 3.005 px/frame — same
// distance per second, fewer frames. A 0.4 px/frame^2 gravity becomes
// 0.4 * 1.202^2 = 0.578 px/frame^2. A 30-frame jump-hold window becomes
// round(30 * 1.202) = 36 frames.
//
// These are design-constant (float) helpers — apply BEFORE converting to
// 8.8 fixed with f2x(). The rescale is an approximation, not cycle-accurate:
// prefer matching durations and distances over per-frame positions; do not
// model source lag frames, sprite flicker, or OAM limits.

/** frame-rate ratio K = source_hz / target_hz (e.g. 60.1/50 = 1.202 for NES->VB) */
export function rateRatio(sourceHz, targetHz) {
  if (!targetHz) throw new Error('rateRatio: targetHz must be nonzero');
  return sourceHz / targetHz;
}

/** rescale a velocity (px/frame) from source to target frame rate: v * K */
export function convVelocity(v, k) {
  return v * k;
}

/** rescale an acceleration (px/frame^2) from source to target frame rate: a * K^2 */
export function convAccel(a, k) {
  return a * k * k;
}

/** rescale a frame-count duration (coyote time, jump buffer, anim timers): round(frames * K) */
export function convFrames(frames, k) {
  return Math.round(frames * k);
}

export default {
  f2x,
  x2f,
  x2i,
  i2x,
  fadd,
  fsub,
  fmul,
  fdiv,
  fmulInt,
  fabs,
  fneg,
  fmin,
  fmax,
  fclamp,
  Fixed,
  FixedVec2,
  FIXED,
  rateRatio,
  convVelocity,
  convAccel,
  convFrames,
};
