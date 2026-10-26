/**
 * kit/gpblade.js — Bushido Blade-style one-hit lethal sword combat.
 *
 * Pure logic, zero dependencies. Works with plain {x,y,z} vectors so it can
 * run in Node (tests, bots) and in the browser (three.js hands it world
 * positions via a segment getter).
 *
 * Core rules (reverse-engineered from Bushido Blade's design):
 *  1. STANCE TRIANGLE — HIGH/MID/LOW stances change attack direction AND
 *     hurtbox. HIGH beats LOW, LOW beats MID, MID beats HIGH.
 *  2. BLADE CLASH — swept line-segment collision between weapons. Segments
 *     within CLASH_DIST during active frames → spark, 12-frame recoil both
 *     fighters, hit-stop, camera trauma.
 *  3. NO HEALTH BARS — 4 hit zones: HEAD (instant death), TORSO (lethal),
 *     LEGS (permanent cripple: kneel/crawl, no dash/jump), ARM (disarm).
 *  4. TIP SWEET-SPOT — full lethal damage only on the outer 25% of the blade
 *     (t >= 0.75 along hilt→tip). Hilt contact = weak pushback.
 */

// ---------------------------------------------------------------- stances

export const STANCE = { HIGH: 0, MID: 1, LOW: 2 };
export const STANCE_NAMES = ['HIGH', 'MID', 'LOW'];
/** stance triangle: attacker stance beats defender stance (attack direction) */
export const STANCE_BEATS = { [STANCE.HIGH]: STANCE.LOW, [STANCE.LOW]: STANCE.MID, [STANCE.MID]: STANCE.HIGH };

// ---------------------------------------------------------------- weapons

/**
 * Weapon stat block. All frames at 60fps.
 *  reach      — blade length in world units (hilt→tip)
 *  windup     — frames before active window
 *  active     — active (can-hit) frames
 *  recover    — recovery frames after active
 *  clashR     — clash radius multiplier (parry-friendly weapons are higher)
 *  sweetSpot  — t along blade (0=hilt, 1=tip) where lethal damage starts
 *  killAny    — true: any contact kills regardless of zone/sweet-spot
 *  nonLethal  — true: never kills (stun/blind/comedy weapons)
 *  crippleLegs— true: any leg contact cripples even on glance
 *  durability — hits before the weapon breaks (Infinity = unbreakable)
 *  knockback  — pushback impulse multiplier on glance hits
 *  stun / blind — frames of stun/blind applied on hit (non-lethal weapons)
 *  fx         — particle/sfx keys the game layer maps to real effects
 */
export const WEAPONS = {
  katana: {
    id: 'katana', name: 'Katana', reach: 1.1, windup: 12, active: 8, recover: 18,
    clashR: 1.0, sweetSpot: 0.75, killAny: false, nonLethal: false,
    crippleLegs: false, durability: Infinity, knockback: 1.0,
    stun: 0, blind: 0, fx: 'slash',
    blurb: 'The authentic duelist. Fast, precise, honest.',
  },
  chainsaw: {
    id: 'chainsaw', name: 'Chainsaw', reach: 0.95, windup: 30, active: 14, recover: 34,
    clashR: 0.7, sweetSpot: 0.0, killAny: true, nonLethal: false,
    crippleLegs: true, durability: Infinity, knockback: 2.2,
    stun: 0, blind: 0, fx: 'chainsaw',
    blurb: 'Slow windup. LOUD. Kills on ANY contact. Hard to aim.',
  },
  pillow: {
    id: 'pillow', name: 'Pillow', reach: 0.8, windup: 10, active: 10, recover: 14,
    clashR: 1.4, sweetSpot: 1.01, killAny: false, nonLethal: true,
    crippleLegs: false, durability: 6, knockback: 0.8,
    stun: 60, blind: 90, fx: 'feathers',
    blurb: 'Feather explosion. Stuns + blinds. Zero kills. Maximum comedy.',
  },
  bunny: {
    id: 'bunny', name: 'Stuffed Bunny', reach: 0.5, windup: 8, active: 8, recover: 12,
    clashR: 0.8, sweetSpot: 0.75, killAny: false, nonLethal: false,
    crippleLegs: false, durability: Infinity, knockback: 0.3,
    stun: 20, blind: 0, fx: 'squeak',
    headshotLethal: true, tickle: 20,
    blurb: 'Squeaks on hit. Tiny range. Headshot = instant kill. Absurd.',
  },
  fryingpan: {
    id: 'fryingpan', name: 'Frying Pan', reach: 0.7, windup: 14, active: 10, recover: 20,
    clashR: 2.0, sweetSpot: 0.6, killAny: false, nonLethal: false,
    crippleLegs: false, durability: Infinity, knockback: 3.0,
    stun: 30, blind: 0, fx: 'bonk',
    blurb: 'BONK. Huge parry window. Knockback king.',
  },
  bat: {
    id: 'bat', name: 'Spiked Bat', reach: 1.0, windup: 16, active: 9, recover: 22,
    clashR: 1.0, sweetSpot: 0.7, killAny: false, nonLethal: false,
    crippleLegs: true, durability: Infinity, knockback: 1.6,
    stun: 0, blind: 0, fx: 'spike',
    blurb: 'Any leg hit cripples. Brutal mid-range bully.',
  },
  baguette: {
    id: 'baguette', name: 'Baguette', reach: 1.2, windup: 11, active: 9, recover: 16,
    clashR: 0.9, sweetSpot: 0.8, killAny: false, nonLethal: false,
    crippleLegs: false, durability: 3, knockback: 0.7,
    stun: 0, blind: 0, fx: 'crumb',
    blurb: 'Longest reach. Floppy. Breaks after 3 hits.',
  },
  chicken: {
    id: 'chicken', name: 'Rubber Chicken', reach: 0.6, windup: 9, active: 10, recover: 12,
    clashR: 1.2, sweetSpot: 1.01, killAny: false, nonLethal: true,
    crippleLegs: false, durability: Infinity, knockback: 0.5,
    stun: 25, blind: 0, fx: 'squeak', stanceBreak: true,
    blurb: 'Squeak. Drops the enemy stance on hit. Pure disrespect.',
  },
};
export const WEAPON_IDS = Object.keys(WEAPONS);

// ------------------------------------------------------------------ zones

export const ZONE = { HEAD: 'HEAD', TORSO: 'TORSO', LEGS: 'LEGS', ARM: 'ARM' };
export const CLASH_DIST = 0.12;
export const CLASH_RECOIL = 12; // frames

// ------------------------------------------------------------------ math

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const len2 = a => dot(a, a);

/**
 * Closest distance between segments p1→p2 and p3→p4.
 * Returns { dist, t, u } where t/u are 0..1 along each segment at closest approach.
 */
export function segmentDistance(p1, p2, p3, p4) {
  const d1 = sub(p2, p1), d2 = sub(p4, p3), r = sub(p1, p3);
  const a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r);
  let t, u;
  if (a <= 1e-8 && e <= 1e-8) { t = u = 0; }
  else if (a <= 1e-8) { t = 0; u = Math.min(1, Math.max(0, f / e)); }
  else {
    const c = dot(d1, r);
    if (e <= 1e-8) { u = 0; t = Math.min(1, Math.max(0, -c / a)); }
    else {
      const b = dot(d1, d2), den = a * e - b * b;
      t = den > 1e-8 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
      u = (b * t + f) / e;
      if (u < 0) { u = 0; t = Math.min(1, Math.max(0, -c / a)); }
      else if (u > 1) { u = 1; t = Math.min(1, Math.max(0, (b - c) / a)); }
    }
  }
  const c1 = { x: p1.x + d1.x * t, y: p1.y + d1.y * t, z: p1.z + d1.z * t };
  const c2 = { x: p3.x + d2.x * u, y: p3.y + d2.y * u, z: p3.z + d2.z * u };
  const dx = c1.x - c2.x, dy = c1.y - c2.y, dz = c1.z - c2.z;
  return { dist: Math.sqrt(dx * dx + dy * dy + dz * dz), t, u, point: { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2, z: (c1.z + c2.z) / 2 } };
}

/** distance from point p to segment a→b, returns { dist, t } */
export function pointSegmentDistance(p, a, b) {
  const ab = sub(b, a), t = Math.min(1, Math.max(0, dot(sub(p, a), ab) / Math.max(1e-8, len2(ab))));
  const c = { x: a.x + ab.x * t, y: a.y + ab.y * t, z: a.z + ab.z * t };
  const dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z;
  return { dist: Math.sqrt(dx * dx + dy * dy + dz * dz), t };
}

// ---------------------------------------------------------------- fighter

export const FSTATE = {
  NEUTRAL: 'NEUTRAL', WINDUP: 'WINDUP', ATTACKING: 'ATTACKING',
  RECOIL: 'RECOIL', STUNNED: 'STUNNED', CRIPPLED: 'CRIPPLED',
  DISARMED: 'DISARMED', DEAD: 'DEAD',
};

export class BladeFighter {
  /**
   * @param {object} weapon — one of WEAPONS
   * @param {object} opts
   *   opts.getSegment(): {hilt:{x,y,z}, tip:{x,y,z}} — world-space weapon ends
   *   opts.getZones(): {HEAD:{x,y,z,r}, TORSO:{...}, LEGS:{...}, ARM:{...}}
   *   opts.onEvent(name, data) — 'clash' | 'hit' | 'kill' | 'cripple' | 'disarm' | 'stun' | 'blind' | 'break' | 'whiff'
   */
  constructor(weapon, opts = {}) {
    this.weapon = weapon;
    this.getSegment = opts.getSegment || (() => null);
    this.getZones = opts.getZones || (() => null);
    this.onEvent = opts.onEvent || (() => {});
    this.stance = STANCE.MID;
    this.state = FSTATE.NEUTRAL;
    this.frame = 0;          // frames in current state
    this.stunFrames = 0;
    this.blindFrames = 0;
    this.crippled = false;
    this.disarmed = false;
    this.hits = 0;           // weapon durability counter
    this.kills = 0;
  }

  get busy() { return this.state === FSTATE.WINDUP || this.state === FSTATE.ATTACKING || this.state === FSTATE.RECOIL || this.state === FSTATE.STUNNED || this.state === FSTATE.DEAD; }
  get alive() { return this.state !== FSTATE.DEAD; }

  setStance(s) {
    if (this.busy || !this.alive) return false;
    if (this.stance !== s) { this.stance = s; this.onEvent('stance', { stance: s }); return true; }
    return false;
  }

  attack() {
    if (this.busy || !this.alive || this.disarmed) return false;
    this.state = FSTATE.WINDUP; this.frame = 0;
    this.onEvent('windup', { weapon: this.weapon.id, stance: this.stance });
    return true;
  }

  /** advance one frame; returns events fired */
  update() {
    if (this.stunFrames > 0) { this.stunFrames--; if (this.stunFrames === 0 && this.state === FSTATE.STUNNED) this.state = FSTATE.NEUTRAL; }
    if (this.blindFrames > 0) this.blindFrames--;
    if (!this.alive) return;
    this.frame++;
    const w = this.weapon;
    if (this.state === FSTATE.WINDUP && this.frame >= w.windup) { this.state = FSTATE.ATTACKING; this.frame = 0; this.onEvent('swing', { weapon: w.id, stance: this.stance }); }
    else if (this.state === FSTATE.ATTACKING && this.frame >= w.active) {
      this.state = FSTATE.NEUTRAL; this.frame = 0;
      // recovery folded into neutral for snappy feel; weapon-specific recover handled by game layer
      this.onEvent('whiff', { weapon: w.id });
    }
    else if (this.state === FSTATE.RECOIL && this.frame >= CLASH_RECOIL) { this.state = FSTATE.NEUTRAL; this.frame = 0; }
  }

  get inActiveFrames() { return this.state === FSTATE.ATTACKING; }

  clash() {
    if (!this.alive) return;
    this.state = FSTATE.RECOIL; this.frame = 0;
    this.onEvent('clash', { weapon: this.weapon.id });
  }

  stun(frames) {
    if (!this.alive) return;
    this.state = FSTATE.STUNNED; this.frame = 0; this.stunFrames = frames;
    this.onEvent('stun', { frames });
  }
  blind(frames) { this.blindFrames = Math.max(this.blindFrames, frames); this.onEvent('blind', { frames }); }

  /**
   * Resolve a landed hit. t = 0..1 along attacker's blade (0=hilt, 1=tip).
   * Returns the outcome string.
   */
  takeHit(zone, t, attacker) {
    if (!this.alive) return 'ignored';
    const w = attacker.weapon;
    this.hits++;
    if (w.durability !== Infinity && this.hits >= w.durability && attacker === this) { /* durability tracked on attacker */ }

    // Non-lethal weapons: stun / blind / stance-break, never kill
    if (w.nonLethal) {
      if (w.stun) this.stun(w.stun);
      if (w.blind) this.blind(w.blind);
      if (w.stanceBreak) { this.stance = STANCE.MID; this.onEvent('stancebreak', {}); }
      this.onEvent('hit', { zone, t, lethal: false, weapon: w.id });
      return 'stunned';
    }
    // Chainsaw rule: any contact kills
    if (w.killAny) { this.die('chainsaw', attacker); return 'lethal'; }

    const sweet = t >= w.sweetSpot;
    // Bunny absurdity: headshot always lethal regardless of sweet-spot
    if (w.headshotLethal && zone === ZONE.HEAD) { this.die('bunny-headshot', attacker); return 'lethal'; }

    if (zone === ZONE.HEAD || zone === ZONE.TORSO) {
      if (sweet) { this.die(zone.toLowerCase(), attacker); return 'lethal'; }
      if (w.tickle) { this.stun(w.tickle); this.onEvent('hit', { zone, t, lethal: false, weapon: w.id, tickle: true }); return 'stunned'; }
      this.onEvent('hit', { zone, t, lethal: false, weapon: w.id, glance: true });
      return 'glance'; // hilt graze: pushback only
    }
    if (zone === ZONE.LEGS) {
      if (sweet || w.crippleLegs) {
        this.crippled = true; this.state = FSTATE.CRIPPLED;
        attacker.kills += 0; this.onEvent('cripple', { weapon: w.id });
        return 'cripple';
      }
      this.onEvent('hit', { zone, t, lethal: false, weapon: w.id, glance: true });
      return 'glance';
    }
    if (zone === ZONE.ARM) {
      if (sweet) {
        this.disarmed = true; this.state = FSTATE.DISARMED;
        this.onEvent('disarm', { weapon: w.id });
        return 'disarm';
      }
      this.onEvent('hit', { zone, t, lethal: false, weapon: w.id, glance: true });
      return 'glance';
    }
    return 'glance';
  }

  die(cause, attacker) {
    this.state = FSTATE.DEAD; this.frame = 0;
    if (attacker) attacker.kills++;
    this.onEvent('kill', { cause, weapon: attacker ? attacker.weapon.id : null });
  }

  /** durability check for the ATTACKER after a landed hit */
  checkBreak() {
    const w = this.weapon;
    if (w.durability !== Infinity && this.hitsDealt >= w.durability) {
      this.onEvent('break', { weapon: w.id });
      return true;
    }
    return false;
  }
}

/**
 * Run one frame of weapon-vs-weapon + weapon-vs-body resolution.
 * Call every frame for each pair (a attacking, b defending) and vice versa.
 * Returns an event descriptor or null.
 */
export function resolveExchange(att, def) {
  if (!att.alive || !def.alive || !att.inActiveFrames) return null;
  const segA = att.getSegment(), segB = def.getSegment();
  const wA = att.weapon;

  // 1. Blade clash — only if defender is also attacking or just attacked (active/recoil/windup)
  if (segA && segB && (def.state === FSTATE.ATTACKING || def.state === FSTATE.WINDUP)) {
    const segBActive = def.getSegment();
    const c = segmentDistance(segA.hilt, segA.tip, segBActive.hilt, segBActive.tip);
    const thresh = CLASH_DIST * Math.max(wA.clashR, def.weapon.clashR);
    if (c.dist < thresh) {
      att.clash(); def.clash();
      return { type: 'clash', point: c.point, t: c.t, u: c.u };
    }
  }

  // 2. Body hit — test attacker's blade against defender's zones
  const zones = def.getZones();
  if (segA && zones) {
    let best = null;
    for (const z of Object.keys(ZONE)) {
      const zp = zones[z];
      if (!zp) continue;
      const r = pointSegmentDistance(zp, segA.hilt, segA.tip);
      if (r.dist < (zp.r || 0.22) && (!best || r.dist < best.dist)) best = { zone: z, ...r };
    }
    if (best) {
      const outcome = def.takeHit(best.zone, best.t, att);
      att.hitsDealt = (att.hitsDealt || 0) + 1;
      const broke = att.checkBreak();
      return { type: 'hit', zone: best.zone, t: best.t, outcome, broke, weapon: wA.id };
    }
  }
  return null;
}

/** stance advantage: does attacker stance beat defender stance? */
export function stanceAdvantage(attStance, defStance) {
  return STANCE_BEATS[attStance] === defStance;
}

/** clash spark intensity scales with combined clash radii */
export function clashIntensity(a, b) {
  return (a.weapon.clashR + b.weapon.clashR) / 2;
}
