// horde.js — reusable bullet-heaven horde: swap-packed structure-of-arrays enemy store, seek/line movement,
// knockback, hash-based separation, far-enemy relocation, plus a time-table wave director.
// No dependencies. Pairs with spatial-hash.js. Nothing here allocates per frame.
//
//   const H = new Horde(2600);
//   const i = H.spawn(typeIndex, x, y, { hpMul, elite, lineVX, lineVY });
//   H.update(dt, playerX, playerY, hash, frame, relocateFn);   // hash must be built from H.x/H.y this step
//   H.remove(i);                                               // swap-remove; uids stay stable for hit memory
//
// World plane is (x, y) = three.js (x, z). Units are metres-ish; the player is ~1.7 tall.

export const ENEMY_TYPES = [
  // name,     hp,  spd, dmg, xp, rad,  mass, fly, scale
  { name: 'bat',      hp: 3,  spd: 2.9, dmg: 4,  xp: 1, rad: 0.30, mass: 0.5, fly: 0.75, scale: 1.0, wobble: 1 },
  { name: 'ghoul',    hp: 8,  spd: 1.45, dmg: 6, xp: 1, rad: 0.36, mass: 1.0, fly: 0, scale: 1.0, wobble: 0 },
  { name: 'skeleton', hp: 15, spd: 1.85, dmg: 8, xp: 2, rad: 0.34, mass: 1.0, fly: 0, scale: 1.0, wobble: 0 },
  { name: 'wraith',   hp: 11, spd: 2.35, dmg: 7, xp: 2, rad: 0.34, mass: 0.7, fly: 0.25, scale: 1.0, wobble: 0.5 },
  { name: 'gargoyle', hp: 52, spd: 1.25, dmg: 12, xp: 4, rad: 0.52, mass: 3.0, fly: 0, scale: 1.25, wobble: 0 },
  { name: 'werewolf', hp: 38, spd: 2.65, dmg: 11, xp: 4, rad: 0.44, mass: 2.0, fly: 0, scale: 1.15, wobble: 0 },
];

export class Horde {
  constructor(max = 2600, coolSlots = 3) {
    this.max = max; this.K = coolSlots; this.n = 0; this.nextUid = 1;
    const F = () => new Float32Array(max);
    this.x = F(); this.y = F(); this.kx = F(); this.ky = F(); this.lx = F(); this.ly = F();
    this.hp = F(); this.maxhp = F(); this.flash = F(); this.phase = F(); this.spd = F(); this.dmg = F();
    this.rad = F(); this.mass = F(); this.xp = F(); this.scale = F(); this.stun = F(); this.age = F();
    this.type = new Uint8Array(max); this.elite = new Uint8Array(max); this.face = new Int8Array(max);
    this.uid = new Int32Array(max); this.cool = new Float32Array(max * coolSlots);
  }
  clear() { this.n = 0; }
  spawn(t, x, y, o) {
    if (this.n >= this.max) return -1;
    const i = this.n++, T = ENEMY_TYPES[t], hpMul = (o && o.hpMul) || 1, el = (o && o.elite) || 0;
    this.type[i] = t; this.x[i] = x; this.y[i] = y; this.kx[i] = 0; this.ky[i] = 0;
    this.lx[i] = (o && o.lineVX) || 0; this.ly[i] = (o && o.lineVY) || 0;
    const hp = T.hp * hpMul * (el ? 14 : 1);
    this.hp[i] = hp; this.maxhp[i] = hp; this.flash[i] = 0; this.phase[i] = Math.random() * 6.283; this.stun[i] = 0; this.age[i] = 0;
    this.spd[i] = T.spd * (el ? 1.05 : 0.9 + Math.random() * 0.2) * ((o && o.spdMul) || 1);
    this.dmg[i] = T.dmg * (el ? 1.8 : 1) * ((o && o.dmgMul) || 1);
    this.rad[i] = T.rad * (el ? 1.9 : 1); this.mass[i] = T.mass * (el ? 8 : 1);
    this.xp[i] = el ? 0 : T.xp; this.scale[i] = T.scale * (el ? 1.9 : 1); this.elite[i] = el;
    this.face[i] = 1; this.uid[i] = this.nextUid++;
    for (let k = 0; k < this.K; k++) this.cool[i * this.K + k] = 0;
    return i;
  }
  remove(i) {
    const j = --this.n; if (i === j) return;
    this.x[i] = this.x[j]; this.y[i] = this.y[j]; this.kx[i] = this.kx[j]; this.ky[i] = this.ky[j];
    this.lx[i] = this.lx[j]; this.ly[i] = this.ly[j]; this.hp[i] = this.hp[j]; this.maxhp[i] = this.maxhp[j];
    this.flash[i] = this.flash[j]; this.phase[i] = this.phase[j]; this.spd[i] = this.spd[j]; this.dmg[i] = this.dmg[j];
    this.rad[i] = this.rad[j]; this.mass[i] = this.mass[j]; this.xp[i] = this.xp[j]; this.scale[i] = this.scale[j];
    this.stun[i] = this.stun[j]; this.age[i] = this.age[j];
    this.type[i] = this.type[j]; this.elite[i] = this.elite[j]; this.face[i] = this.face[j]; this.uid[i] = this.uid[j];
    for (let k = 0; k < this.K; k++) this.cool[i * this.K + k] = this.cool[j * this.K + k];
  }
  // knockback impulse (units/s) scaled by mass; elites barely budge
  push(i, dx, dy, force) {
    const l = Math.hypot(dx, dy) || 1, f = force / this.mass[i];
    this.kx[i] += dx / l * f; this.ky[i] += dy / l * f; this.stun[i] = Math.max(this.stun[i], 0.12);
  }
  update(dt, px, py, hash, frame, farR, relocate, slowMul = 1) {
    const n = this.n, X = this.x, Y = this.y, KX = this.kx, KY = this.ky, kd = Math.exp(-9 * dt);
    const st = hash.start, it = hash.items, cols = hash.cols, rows = hash.rows, far2 = farR * farR;
    for (let i = 0; i < n; i++) {
      this.age[i] += dt; this.phase[i] += dt * this.spd[i] * 3.2;
      if (this.flash[i] > 0) this.flash[i] -= dt;
      let vx, vy;
      if (this.lx[i] !== 0 || this.ly[i] !== 0) { vx = this.lx[i]; vy = this.ly[i]; }
      else {
        const dx = px - X[i], dy = py - Y[i], d = Math.sqrt(dx * dx + dy * dy) + 1e-6;
        let s = this.spd[i] * slowMul; if (this.stun[i] > 0) { this.stun[i] -= dt; s *= 0.15; }
        vx = dx / d * s; vy = dy / d * s;
        if (ENEMY_TYPES[this.type[i]].wobble) { const w = Math.sin(this.phase[i] * 0.7) * s * 0.55; vx += -dy / d * w; vy += dx / d * w; }
        if (d * d > far2 && relocate) { relocate(i); continue; }
      }
      if (vx > 0.05) this.face[i] = 1; else if (vx < -0.05) this.face[i] = -1;
      KX[i] *= kd; KY[i] *= kd;
      X[i] += (vx + KX[i]) * dt; Y[i] += (vy + KY[i]) * dt;
      // separation (half the crowd per step, alternating) — only pushes i, neighbours handle themselves
      if (((i ^ frame) & 1) === 0 && i < hash.n) {
        const c = hash.cell[i], ccx = c % cols, ccy = (c / cols) | 0, ri = this.rad[i], mi = this.mass[i];
        let sx = 0, sy = 0, seen = 0;
        for (let oy = -1; oy <= 1 && seen < 14; oy++) {
          const yy = ccy + oy; if (yy < 0 || yy >= rows) continue;
          for (let ox = -1; ox <= 1 && seen < 14; ox++) {
            const xx = ccx + ox; if (xx < 0 || xx >= cols) continue;
            const cc = yy * cols + xx;
            for (let q = st[cc], e = st[cc + 1]; q < e; q++) {
              const j = it[q]; if (j === i || j >= n) continue;
              const ddx = X[i] - X[j], ddy = Y[i] - Y[j], rr = ri + this.rad[j], d2 = ddx * ddx + ddy * ddy;
              if (d2 < rr * rr && d2 > 1e-8) {
                const d = Math.sqrt(d2), o = (rr - d) / d, w = this.mass[j] / (mi + this.mass[j]);
                sx += ddx * o * w; sy += ddy * o * w;
              }
              if (++seen >= 14) break;
            }
          }
        }
        X[i] += sx * 0.9; Y[i] += sy * 0.9;
      }
    }
  }
}

// Time-table wave director. phases: [{ t0, t1, min, rate, types: [[typeIndex, weight], ...] }]
// events: [{ t, id, ...anything }] fired once each via onEvent(ev). Call update(t, dt) every sim step.
export class WaveDirector {
  constructor(phases, events) { this.phases = phases; this.events = events; this.reset(); }
  reset() { this.ei = 0; this.acc = 0; this.cur = this.phases[0]; }
  phaseAt(t) { for (let i = this.phases.length - 1; i >= 0; i--) if (t >= this.phases[i].t0) return this.phases[i]; return this.phases[0]; }
  pickType(p, r) { let tot = 0; for (const tw of p.types) tot += tw[1]; let x = r * tot; for (const tw of p.types) { x -= tw[1]; if (x <= 0) return tw[0]; } return p.types[0][0]; }
  // returns how many regular spawns are due this step (top up to min, plus the trickle rate)
  update(t, dt, alive, onEvent) {
    while (this.ei < this.events.length && t >= this.events[this.ei].t) onEvent(this.events[this.ei++]);
    const p = (this.cur = this.phaseAt(t));
    this.acc += p.rate * dt; let due = this.acc | 0; this.acc -= due;
    if (alive + due < p.min) due = Math.min(p.min - alive, p.burst || 40);
    return due;
  }
}
