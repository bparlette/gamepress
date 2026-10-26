// weapons.js — reusable auto-fire arsenal for a bullet heaven: weapon + passive tables, level-ups, evolutions,
// a pooled structure-of-arrays projectile system and hash-based hit tests. No rendering, no dependencies.
//
// The game hands an Arsenal a ctx object:
//   ctx.horde (Horde), ctx.hash (SpatialHash built this step), ctx.px/py (player), ctx.fx/fy (facing unit vector),
//   ctx.stats (see baseStats), ctx.time,
//   ctx.hit(i, dmg, fromX, fromY, kb, src) -> marks damage (kills are reaped by the game after the step),
//   ctx.fx(name, a, b, c, d, e) visual/audio hooks, ctx.hurtPlayer(dmg, x, y), ctx.heal(hp), ctx.rand()
// Weapons only ever hit what their shapes overlap: nothing auto-hits.

export const MAX_WEAPONS = 6, MAX_PASSIVES = 6;

export const PASSIVES = {
  heart:   { name: 'Hollow Heart',     desc: 'Max health +20%.',            max: 5, icon: 'heart' },
  ember:   { name: 'Ember Heart',      desc: 'Damage +10%.',                max: 5, icon: 'ember' },
  tome:    { name: 'Hourglass Tome',   desc: 'Weapon cooldown −8%.',        max: 5, icon: 'tome' },
  candle:  { name: 'Candelabra',       desc: 'Weapon area +10%.',           max: 5, icon: 'candle' },
  bracer:  { name: 'Gilded Bracer',    desc: 'Projectile speed +10%.',      max: 5, icon: 'bracer' },
  binder:  { name: 'Spellbinder',      desc: 'Effect duration +10%.',       max: 5, icon: 'binder' },
  chalice: { name: 'Crimson Chalice',  desc: 'Recover 0.3 HP per second.',  max: 5, icon: 'chalice' },
  lode:    { name: 'Lodestone',        desc: 'Pickup range +30%.',          max: 5, icon: 'lode' },
  feather: { name: 'Raven Feather',    desc: 'Move speed +8%.',             max: 5, icon: 'feather' },
};

export function baseStats() {
  return { might: 1, cd: 1, area: 1, pspeed: 1, dur: 1, recovery: 0, magnet: 2.2, move: 1, maxhpMul: 1, armor: 0 };
}
export function applyPassives(S, passives) {
  for (const p of passives) {
    const l = p.lvl;
    switch (p.id) {
      case 'heart': S.maxhpMul += 0.2 * l; break;
      case 'ember': S.might += 0.1 * l; break;
      case 'tome': S.cd *= Math.pow(0.92, l); break;
      case 'candle': S.area += 0.1 * l; break;
      case 'bracer': S.pspeed += 0.1 * l; break;
      case 'binder': S.dur += 0.1 * l; break;
      case 'chalice': S.recovery += 0.3 * l; break;
      case 'lode': S.magnet *= 1 + 0.3 * l; break;
      case 'feather': S.move += 0.08 * l; break;
    }
  }
  return S;
}

// per-level tables (index 0 = level 1). evo = evolved form (single stat row).
export const WEAPONS = {
    hadouken: {
    name: 'Hadouken Special', icon: 'hadouken', evo: 'shinku', with: 'candle',
    desc: [
      'Level 1: Fires a surging Hadouken ki blast forward.',
      'Level 2: Dual Hadouken blast from twin angles.',
      'Level 3: Triple Hadouken fan volley tearing through crowds.',
      'Level 4: Quad 4-way Hadouken blast penetrating deep hordes.',
      'Level 5: 5-way Hadouken pentagon barrage encircling Ryu.',
      'Level 6: 6-way Omni Hadouken blasting all 360 surrounding zombies!'
    ],
    cd: [1.1, 1.0, 0.95, 0.9, 0.85, 0.75],
    dmg: [22, 28, 34, 42, 52, 65],
    amount: [1, 2, 3, 4, 5, 6],
    pierce: [3, 4, 5, 6, 8, 12],
    speed: 13,
  },
  dagger: {
    name: 'Silver Dagger', icon: 'dagger', evo: 'edges', with: 'bracer',
    desc: ['Throws a dagger the way you face.', 'One more dagger.', 'One more dagger, damage +2.', 'Pierces one more enemy.', 'One more dagger.', 'Damage +2, faster.', 'One more dagger.', 'Pierces one more, damage +2.'],
    cd: [1.0, 1.0, 0.95, 0.95, 0.9, 0.85, 0.85, 0.8], dmg: [7, 7, 9, 9, 9, 11, 11, 13], amount: [1, 2, 3, 3, 4, 4, 5, 5], pierce: [1, 1, 1, 2, 2, 2, 2, 3], speed: 14,
  },
  bolt: {
    name: 'Arcane Bolt', icon: 'bolt', evo: 'storm', with: 'tome',
    desc: ['Fires at the nearest enemy.', 'One more bolt.', 'Cooldown −0.1s.', 'One more bolt.', 'Damage +5.', 'One more bolt.', 'Pierces one more enemy.', 'Damage +5, cooldown −0.1s.'],
    cd: [1.2, 1.2, 1.1, 1.1, 1.1, 1.1, 1.1, 1.0], dmg: [10, 10, 10, 10, 15, 15, 15, 20], amount: [1, 2, 2, 3, 3, 4, 4, 4], pierce: [1, 1, 1, 1, 1, 1, 2, 2], speed: 11,
  },
  axe: {
    name: 'Bone Axe', icon: 'axe', evo: 'spiral', with: 'candle',
    desc: ['High damage, high arc, pierces.', 'One more axe.', 'Damage +10.', 'Pierces 2 more enemies.', 'One more axe.', 'Damage +10.', 'Pierces 2 more enemies.', 'Damage +10, one more axe.'],
    cd: [3.2, 3.2, 3.1, 3.0, 3.0, 2.9, 2.8, 2.7], dmg: [20, 20, 30, 30, 30, 40, 40, 50], amount: [1, 2, 2, 2, 3, 3, 3, 4], pierce: [3, 3, 3, 5, 5, 5, 7, 7],
  },
  censer: {
    name: 'Censer of Thorns', icon: 'censer', evo: 'souleater', with: 'chalice',
    desc: ['Burns enemies around you and pushes them back.', 'Area +10%, damage +1.', 'Damage +2, faster ticks.', 'Area +10%.', 'Damage +2.', 'Area +10%, faster ticks.', 'Damage +2.', 'Area +10%, damage +2.'],
    dmg: [5, 6, 8, 8, 10, 10, 12, 14], radius: [1.45, 1.6, 1.6, 1.76, 1.76, 1.92, 1.92, 2.08], tick: [0.8, 0.8, 0.7, 0.7, 0.7, 0.6, 0.6, 0.6],
  },
  psalter: {
    name: 'Iron Psalter', icon: 'psalter', evo: 'vespers', with: 'binder',
    desc: ['Tomes orbit you, knocking enemies away.', 'One more tome.', 'Faster, area +25%.', 'Lasts longer, damage +10.', 'One more tome.', 'Faster, area +25%.', 'Lasts longer, damage +10.', 'One more tome.'],
    dmg: [10, 10, 10, 20, 20, 20, 30, 30], amount: [1, 2, 2, 2, 3, 3, 3, 4], radius: [2.0, 2.0, 2.5, 2.5, 2.5, 3.0, 3.0, 3.0], spin: [3.0, 3.0, 3.6, 3.6, 3.6, 4.2, 4.2, 4.2],
    on: [3, 3, 3, 3.5, 3.5, 3.5, 4, 4], off: [3.4, 3.4, 3.4, 3.4, 3.2, 3.2, 3.0, 3.0],
  },
  flask: {
    name: 'Holy Flask', icon: 'flask', evo: null, with: null,
    desc: ['Shatters into a burning pool of holy water.', 'One more flask, area +20%.', 'Damage +5, lasts longer.', 'One more flask, area +20%.', 'Damage +5.', 'One more flask.', 'Area +20%, lasts longer.', 'Damage +10.'],
    cd: [4.2, 4.2, 4.0, 4.0, 3.8, 3.8, 3.6, 3.4], dmg: [8, 8, 13, 13, 18, 18, 18, 28], amount: [1, 2, 2, 3, 3, 4, 4, 4], radius: [1.3, 1.55, 1.55, 1.8, 1.8, 1.8, 2.1, 2.1], dur: [2.2, 2.2, 2.6, 2.6, 2.6, 2.6, 3.0, 3.0],
  },
  rune: {
    name: 'Storm Rune', icon: 'rune', evo: null, with: null,
    desc: ['Lightning strikes random enemies.', 'One more strike.', 'Area +20%, damage +10.', 'One more strike.', 'Cooldown −0.4s.', 'One more strike, damage +10.', 'Area +20%.', 'One more strike, damage +10.'],
    cd: [4.0, 4.0, 4.0, 4.0, 3.6, 3.6, 3.6, 3.2], dmg: [16, 16, 26, 26, 26, 36, 36, 46], amount: [2, 3, 3, 4, 4, 5, 5, 6], radius: [0.9, 0.9, 1.1, 1.1, 1.1, 1.1, 1.3, 1.3],
  },
};
export const EVOS = {
    shinku: { name: 'Shinku Hadouken', from: 'hadouken', icon: 'shinku', desc: 'Overcharged vacuum Hadouken waves disintegrating all zombies.', cd: 0.65, dmg: 90, amount: 6, pierce: 999, speed: 16 },
  edges:     { name: 'Thousand Edges',  from: 'dagger',  icon: 'edges',   desc: 'An endless stream of silver.', cd: 0.09, dmg: 16, amount: 1, pierce: 4, speed: 17 },
  storm:     { name: 'Stormwand',       from: 'bolt',    icon: 'storm',   desc: 'Bolts with almost no cooldown.', cd: 0.22, dmg: 24, amount: 2, pierce: 3, speed: 13 },
  spiral:    { name: 'Death Spiral',    from: 'axe',     icon: 'spiral',  desc: 'Scythes spiral out in every direction.', cd: 2.0, dmg: 55, amount: 10, pierce: 999 },
  souleater: { name: 'Soul Eater',      from: 'censer',  icon: 'souleater', desc: 'A huge ring that feeds on what it burns.', dmg: 18, radius: 2.9, tick: 0.45 },
  vespers:   { name: 'Unholy Vespers',  from: 'psalter', icon: 'vespers', desc: 'Five tomes that never stop.', dmg: 40, amount: 5, radius: 3.4, spin: 4.4, on: 1e9, off: 0 },
};

// ---- projectiles ----
export const PK = { KNIFE: 1, BOLT: 2, AXE: 3, FLASK: 4, POOL: 5, BOOK: 6, SPIRAL: 7, SICKLE: 8 };
const PF = ['x', 'y', 'h', 'vx', 'vy', 'vh', 'life', 'maxLife', 'dmg', 'pierce', 'rad', 'rot', 'rotv', 'a', 'b', 'c'];
export class Projectiles {
  constructor(max = 900) {
    this.max = max; this.n = 0; const F = () => new Float32Array(max);
    this.kind = new Uint8Array(max); this.slot = new Int8Array(max); this.hostile = new Uint8Array(max);
    this.x = F(); this.y = F(); this.h = F(); this.vx = F(); this.vy = F(); this.vh = F();
    this.life = F(); this.maxLife = F(); this.dmg = F(); this.pierce = F(); this.rad = F(); this.rot = F(); this.rotv = F();
    this.a = F(); this.b = F(); this.c = F(); this.evo = new Uint8Array(max);
    this.hits = new Int32Array(max * 8); this.hitN = new Uint8Array(max);
  }
  clear() { this.n = 0; }
  add(kind, x, y, vx, vy, life, dmg, pierce, rad, slot) {
    if (this.n >= this.max) return -1;
    const i = this.n++;
    this.kind[i] = kind; this.x[i] = x; this.y[i] = y; this.h[i] = 0.9; this.vx[i] = vx; this.vy[i] = vy; this.vh[i] = 0;
    this.life[i] = life; this.maxLife[i] = life; this.dmg[i] = dmg; this.pierce[i] = pierce; this.rad[i] = rad;
    this.rot[i] = Math.atan2(vy, vx); this.rotv[i] = 0; this.slot[i] = slot; this.hostile[i] = 0;
    this.a[i] = 0; this.b[i] = 0; this.c[i] = 0; this.evo[i] = 0; this.hitN[i] = 0;
    return i;
  }
  remove(i) {
    const j = --this.n; if (i === j) return;
    for (let k = 0; k < PF.length; k++) { const arr = this[PF[k]]; arr[i] = arr[j]; }
    this.kind[i] = this.kind[j]; this.slot[i] = this.slot[j]; this.hostile[i] = this.hostile[j]; this.evo[i] = this.evo[j];
    this.hitN[i] = this.hitN[j]; for (let k = 0; k < 8; k++) this.hits[i * 8 + k] = this.hits[j * 8 + k];
  }
}

const CAND = new Int32Array(1024);

export class Arsenal {
  constructor() { this.proj = new Projectiles(900); this.reset(); }
  reset() {
    this.weapons = []; this.passives = []; this.proj.clear();
    this.auraR = 0; this.auraT = 0; this.auraEvo = false; this.bookOn = 0; this.bookAng = 0; this.bookShow = 0; this.healBudget = 0;
  }
  has(id) { return this.weapons.find((w) => w.id === id) || this.passives.find((p) => p.id === id); }
  addWeapon(id) { const w = { id, lvl: 1, t: 0.25, evo: null, pend: 0, pendT: 0, total: 0 }; this.weapons.push(w); return w; }
  addPassive(id) { const p = { id, lvl: 1 }; this.passives.push(p); return p; }
  // evolutions currently unlockable from a chest: weapon at max level + its paired passive owned
  evolvable() {
    const out = [];
    for (const w of this.weapons) { const d = WEAPONS[w.id]; if (!w.evo && d.evo && w.lvl >= 8 && this.passives.some((p) => p.id === d.with)) out.push(w); }
    return out;
  }
  evolve(w) { w.evo = WEAPONS[w.id].evo; w.t = 0.1; return EVOS[w.evo]; }
  // level-up offers: up to n distinct choices {type:'w'|'p', id, lvl(next), isNew}
  offers(n, rand) {
    const pool = [];
    for (const w of this.weapons) if (!w.evo && w.lvl < 8) pool.push({ type: 'w', id: w.id, lvl: w.lvl + 1, isNew: false, wgt: 3 });
    for (const p of this.passives) if (p.lvl < PASSIVES[p.id].max) pool.push({ type: 'p', id: p.id, lvl: p.lvl + 1, isNew: false, wgt: 2 });
    if (this.weapons.length < MAX_WEAPONS) for (const id in WEAPONS) if (!this.weapons.some((w) => w.id === id)) pool.push({ type: 'w', id, lvl: 1, isNew: true, wgt: 2 });
    if (this.passives.length < MAX_PASSIVES) for (const id in PASSIVES) if (!this.passives.some((p) => p.id === id)) pool.push({ type: 'p', id, lvl: 1, isNew: true, wgt: 1.5 });
    const out = [];
    while (out.length < n && pool.length) {
      let tot = 0; for (const o of pool) tot += o.wgt; let r = rand() * tot, k = 0;
      for (; k < pool.length - 1; k++) { r -= pool[k].wgt; if (r <= 0) break; }
      out.push(pool[k]); pool.splice(k, 1);
    }
    return out;
  }
  take(o) {
    if (o.type === 'w') { const w = this.weapons.find((x) => x.id === o.id); if (w) w.lvl++; else this.addWeapon(o.id); }
    else { const p = this.passives.find((x) => x.id === o.id); if (p) p.lvl++; else this.addPassive(o.id); }
  }
  // random upgrades a chest grants when nothing can evolve
  chestUpgrade(rand) {
    const c = [];
    for (const w of this.weapons) if (!w.evo && w.lvl < 8) c.push(w);
    for (const p of this.passives) if (p.lvl < PASSIVES[p.id].max) c.push(p);
    if (!c.length) return null;
    const it = c[(rand() * c.length) | 0]; it.lvl++; return it;
  }

  update(dt, ctx) {
    const S = ctx.stats; this.healBudget = Math.min(8, this.healBudget + dt * 6);
    this.auraR = 0; this.bookShow = 0;
    for (let s = 0; s < this.weapons.length; s++) {
      const w = this.weapons[s], d = WEAPONS[w.id], E = w.evo ? EVOS[w.evo] : null, L = w.lvl - 1;
      const g = (k) => (E && E[k] !== undefined ? E[k] : d[k] ? d[k][L] : 0);
      switch (w.id) {
        case 'censer': {
          const r = g('radius') * S.area; this.auraR = r; this.auraEvo = !!E;
          w.t -= dt; if (w.t <= 0) { w.t = g('tick'); this.auraTick(ctx, r, g('dmg') * S.might, s, !!E); }
          continue;
        }
        case 'psalter': {
          const on = g('on') * S.dur, off = g('off') * S.cd;
          w.t -= dt; if (w.t <= 0) { if (this.bookOn > 0 || E) { this.bookOn = 0; w.t = off; if (E) { this.bookOn = 1; w.t = 1e9; } } else { this.bookOn = 1; w.t = on; ctx.fx('books'); } }
          if (this.bookOn || E) { this.bookOn = 1; this.updateBooks(dt, ctx, g('amount'), g('radius') * S.area, g('spin'), g('dmg') * S.might, s, !!E); }
          continue;
        }
      }
      // pending repeats (2nd lash, dagger fan) fire on the game clock
      if (w.pend > 0) { w.pendT -= dt; if (w.pendT <= 0) { w.pend--; w.pendT = w.id === 'lash' ? 0.14 : 0.06; this.fireOne(w, s, g, ctx, w.total - w.pend - 1); } }
      w.t -= dt;
      if (w.t <= 0) {
        w.t += g('cd') * S.cd; if (w.t < 0.02) w.t = 0.02;
        const amt = (g('amount') || 1); w.total = amt; w.pend = amt - 1; w.pendT = w.id === 'lash' ? 0.14 : 0.06;
        if (w.id === 'flask' || w.id === 'rune' || w.id === 'bolt' || (w.id === 'axe' && E)) { w.pend = 0; for (let k = 0; k < amt; k++) this.fireOne(w, s, g, ctx, k); }
        else this.fireOne(w, s, g, ctx, 0);
      }
    }
    this.updateProj(dt, ctx);
  }

  fireOne(w, s, g, ctx, k) {
    const S = ctx.stats, H = ctx.horde, P = this.proj, E = !!w.evo, might = S.might;
    switch (w.id) {
            case 'hadouken': {
        const amt = g('amount');
        const baseA = Math.atan2(ctx.fy_, ctx.fx_);
        // If 6 or more, shoot in a full 360 circle! If less, fan symmetrically
        let a;
        if (amt >= 6) {
          a = baseA + (k / amt) * Math.PI * 2;
        } else if (amt === 1) {
          a = baseA;
        } else {
          const spread = 0.35 * (amt - 1);
          a = baseA - spread * 0.5 + (k / (amt - 1)) * spread;
        }
        const dx = Math.cos(a), dy = Math.sin(a);
        const sp = (g('speed') || 13) * S.pspeed;
        const i = P.add(PK.BOLT, ctx.px + dx * 0.45, ctx.py + dy * 0.45, dx * sp, dy * sp, 1.8 * S.dur, g('dmg') * might, g('pierce'), 0.42 * S.area, s);
        if (i >= 0) { P.evo[i] = E ? 1 : 0; P.h[i] = 1.0; }
        if (k === 0) ctx.fx('zap', E ? 1 : 0);
        break;
      }
      case 'dagger': {
        const sp = (g('speed') || d0(w).speed) * S.pspeed, off = ((k % 2 ? 1 : -1) * Math.ceil(k / 2)) * 0.22;
        const fx = ctx.fx_, fy = ctx.fy_, i = P.add(PK.KNIFE, ctx.px - fy * off, ctx.py + fx * off, fx * sp, fy * sp, 1.3 * S.dur, g('dmg') * might, g('pierce'), 0.28, s);
        if (i >= 0) P.evo[i] = E ? 1 : 0;
        ctx.fx('throw', E ? 1 : 0); break;
      }
      case 'bolt': {
        const t = ctx.hash.nearest(ctx.px, ctx.py, 12, H.x, H.y, (id) => id < H.n && H.hp[id] > 0);
        let dx, dy; if (t >= 0) { dx = H.x[t] - ctx.px; dy = H.y[t] - ctx.py; const a = Math.atan2(dy, dx) + (k ? (ctx.rand() - 0.5) * 0.5 : 0); dx = Math.cos(a); dy = Math.sin(a); }
        else { const a = ctx.rand() * 6.283; dx = Math.cos(a); dy = Math.sin(a); }
        const sp = (g('speed') || d0(w).speed) * S.pspeed;
        const i = P.add(PK.BOLT, ctx.px + dx * 0.4, ctx.py + dy * 0.4, dx * sp, dy * sp, 1.6 * S.dur, g('dmg') * might, g('pierce'), 0.3, s);
        if (i >= 0) { P.evo[i] = E ? 1 : 0; P.h[i] = 1.0; }
        if (k === 0) ctx.fx('zap', E ? 1 : 0); break;
      }
      case 'axe': {
        if (E) {
          const n = g('amount'), sp = 7.5 * S.pspeed, a0 = ctx.rand() * 6.283, a = a0 + (k / n) * 6.283;
          const i = P.add(PK.SPIRAL, ctx.px, ctx.py, Math.cos(a) * sp, Math.sin(a) * sp, 2.4 * S.dur, g('dmg') * might, 999, 0.55 * S.area, s);
          if (i >= 0) { P.rotv[i] = 14; P.a[i] = 1.6; P.evo[i] = 1; }
          if (k === 0) ctx.fx('whoosh'); break;
        }
        const vx = (ctx.rand() - 0.5) * 5 + ctx.lastHX * 1.2, vy = -(9.5 + ctx.rand() * 2.5) * S.pspeed;
        const i = P.add(PK.AXE, ctx.px, ctx.py, vx, vy, 2.3 * S.dur, g('dmg') * might, g('pierce'), 0.5 * S.area, s);
        if (i >= 0) { P.rotv[i] = vx >= 0 ? 12 : -12; P.a[i] = S.area; }
        ctx.fx('whoosh'); break;
      }
      case 'flask': {
        let tx = ctx.px + (ctx.rand() - 0.5) * 8, ty = ctx.py + (ctx.rand() - 0.5) * 6;
        if (H.n) { const j = (ctx.rand() * H.n) | 0; const dx = H.x[j] - ctx.px, dy = H.y[j] - ctx.py; if (dx * dx + dy * dy < 64) { tx = H.x[j]; ty = H.y[j]; } }
        const T = 0.55, i = P.add(PK.FLASK, ctx.px, ctx.py, (tx - ctx.px) / T, (ty - ctx.py) / T, T, g('dmg') * might, 0, g('radius') * S.area, s);
        if (i >= 0) { P.h[i] = 1.2; P.vh[i] = 5.5; P.a[i] = g('dur') * S.dur; }
        break;
      }
      case 'rune': {
        const r = g('radius') * S.area; let tx, ty, tries = 0;
        do { if (H.n) { const j = (ctx.rand() * H.n) | 0; tx = H.x[j]; ty = H.y[j]; } else { tx = ctx.px + (ctx.rand() - 0.5) * 12; ty = ctx.py + (ctx.rand() - 0.5) * 8; } }
        while (++tries < 6 && (Math.abs(tx - ctx.px) > ctx.viewHX || Math.abs(ty - ctx.py) > ctx.viewHY));
        ctx.fx('lightning', tx, ty, r);
        const n = ctx.hash.query(tx, ty, r + 0.6, CAND);
        for (let q = 0; q < n; q++) { const i = CAND[q]; if (i >= H.n || H.hp[i] <= 0) continue; const dx = H.x[i] - tx, dy = H.y[i] - ty, rr = r + H.rad[i]; if (dx * dx + dy * dy < rr * rr) ctx.hit(i, g('dmg') * might, tx, ty, 2, s); }
        break;
      }
    }
  }

  auraTick(ctx, r, dmg, s, evo) {
    const H = ctx.horde, n = ctx.hash.query(ctx.px, ctx.py, r + 0.6, CAND); let hits = 0;
    for (let q = 0; q < n; q++) {
      const i = CAND[q]; if (i >= H.n || H.hp[i] <= 0) continue;
      const dx = H.x[i] - ctx.px, dy = H.y[i] - ctx.py, rr = r + H.rad[i];
      if (dx * dx + dy * dy < rr * rr) { ctx.hit(i, dmg, ctx.px, ctx.py, evo ? 3.5 : 2.4, s); hits++; }
    }
    if (evo && hits && this.healBudget > 0) { const h = Math.min(this.healBudget, hits * 0.12); this.healBudget -= h; ctx.heal(h); }
    if (hits) ctx.fx('aura', evo ? 1 : 0);
  }

  updateBooks(dt, ctx, amt, R, spin, dmg, s, evo) {
    const H = ctx.horde, K = H.K; this.bookAng += spin * dt; this.bookShow = amt; this.bookR = R; this.bookEvo = evo;
    for (let b = 0; b < amt; b++) {
      const a = this.bookAng + (b / amt) * 6.283, bx = ctx.px + Math.cos(a) * R, by = ctx.py + Math.sin(a) * R * 0.85;
      const n = ctx.hash.query(bx, by, 1.0, CAND);
      for (let q = 0; q < n; q++) {
        const i = CAND[q]; if (i >= H.n || H.hp[i] <= 0) continue;
        const dx = H.x[i] - bx, dy = H.y[i] - by, rr = 0.45 + H.rad[i];
        if (dx * dx + dy * dy < rr * rr && H.cool[i * K] <= ctx.time) { H.cool[i * K] = ctx.time + 0.55; ctx.hit(i, dmg, ctx.px, ctx.py, 4.5, s); }
      }
    }
  }

  updateProj(dt, ctx) {
    const P = this.proj, H = ctx.horde, K = H.K;
    for (let i = P.n - 1; i >= 0; i--) {
      P.life[i] -= dt; const kd = P.kind[i];
      if (kd === PK.AXE) P.vy[i] += 17 * dt;
      if (kd === PK.SPIRAL) { const a = Math.atan2(P.vy[i], P.vx[i]) + P.a[i] * dt, sp = Math.hypot(P.vx[i], P.vy[i]); P.vx[i] = Math.cos(a) * sp; P.vy[i] = Math.sin(a) * sp; }
      if (kd !== PK.POOL) { P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; }
      P.rot[i] += P.rotv[i] * dt;
      if (kd === PK.FLASK) {
        P.h[i] += P.vh[i] * dt; P.vh[i] -= 22 * dt;
        if (P.life[i] <= 0) {
          const x = P.x[i], y = P.y[i], r = P.rad[i], d = P.dmg[i], life = P.a[i], s = P.slot[i];
          P.remove(i); const j = P.add(PK.POOL, x, y, 0, 0, life, d, 0, r, s); if (j >= 0) { P.h[j] = 0; P.b[j] = 0; }
          ctx.fx('splash', x, y, r); continue;
        }
        continue;
      }
      if (P.life[i] <= 0) { P.remove(i); continue; }
      if (P.hostile[i]) {
        const dx = ctx.px - P.x[i], dy = ctx.py - P.y[i], rr = P.rad[i] + 0.35;
        if (dx * dx + dy * dy < rr * rr) { ctx.hurtPlayer(P.dmg[i], P.x[i], P.y[i]); P.remove(i); }
        continue;
      }
      if (kd === PK.POOL) {
        P.b[i] -= dt; if (P.b[i] > 0) continue; P.b[i] = 0.33;
        const r = P.rad[i], n = ctx.hash.query(P.x[i], P.y[i], r + 0.6, CAND);
        for (let q = 0; q < n; q++) { const e = CAND[q]; if (e >= H.n || H.hp[e] <= 0) continue; const dx = H.x[e] - P.x[i], dy = H.y[e] - P.y[i], rr = r + H.rad[e]; if (dx * dx + dy * dy < rr * rr) ctx.hit(e, P.dmg[i], P.x[i], P.y[i], 0.6, P.slot[i]); }
        continue;
      }
      // contact projectiles
      const r = P.rad[i], n = ctx.hash.query(P.x[i], P.y[i], r + 0.6, CAND);
      for (let q = 0; q < n; q++) {
        const e = CAND[q]; if (e >= H.n || H.hp[e] <= 0) continue;
        const dx = H.x[e] - P.x[i], dy = H.y[e] - P.y[i], rr = r + H.rad[e];
        if (dx * dx + dy * dy >= rr * rr) continue;
        if (kd === PK.SPIRAL) { if (H.cool[e * K + 1] > ctx.time) continue; H.cool[e * K + 1] = ctx.time + 0.5; }
        else { const u = H.uid[e]; let seen = false; for (let k = 0, m = P.hitN[i]; k < m; k++) if (P.hits[i * 8 + k] === u) { seen = true; break; } if (seen) continue; P.hits[i * 8 + (P.hitN[i] % 8)] = u; if (P.hitN[i] < 8) P.hitN[i]++; }
        ctx.hit(e, P.dmg[i], P.x[i] - P.vx[i], P.y[i] - P.vy[i], kd === PK.AXE ? 3.5 : 2.2, P.slot[i]);
        if (--P.pierce[i] <= 0) { P.life[i] = 0; break; }
      }
      if (P.life[i] <= 0) P.remove(i);
    }
  }
}
function d0(w) { return WEAPONS[w.id]; }
