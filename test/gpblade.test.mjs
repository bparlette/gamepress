import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STANCE, STANCE_NAMES, STANCE_BEATS, WEAPONS, WEAPON_IDS, ZONE,
  CLASH_DIST, CLASH_RECOIL, FSTATE,
  segmentDistance, pointSegmentDistance, stanceAdvantage, clashIntensity,
  BladeFighter, resolveExchange,
} from '../kit/gpblade.js';

const V = (x, y, z) => ({ x, y, z });

// fighter with fixed segment + zones (no three.js needed)
function dummyFighter(weaponId, segOverride) {
  const seg = segOverride || { hilt: V(0, 1, 0), tip: V(0, 1, 1.1) };
  const zones = {
    HEAD: { ...V(0, 1.7, 0), r: 0.22 },
    TORSO: { ...V(0, 1.1, 0), r: 0.3 },
    LEGS: { ...V(0, 0.4, 0), r: 0.25 },
    ARM: { ...V(0.3, 1.2, 0), r: 0.18 },
  };
  const events = [];
  const f = new BladeFighter(WEAPONS[weaponId], {
    getSegment: () => ({ ...seg }),
    getZones: () => zones,
    onEvent: (n, d) => events.push([n, d]),
  });
  f.events = events;
  return f;
}

test('weapons: 8 registered with sane stats', () => {
  assert.equal(WEAPON_IDS.length, 8);
  for (const id of WEAPON_IDS) {
    const w = WEAPONS[id];
    assert.ok(w.reach > 0, `${id} reach`);
    assert.ok(w.windup > 0 && w.active > 0, `${id} frames`);
    assert.ok(w.sweetSpot >= 0 && w.sweetSpot <= 1.01, `${id} sweetSpot`);
    assert.ok(w.blurb, `${id} blurb`);
  }
});

test('weapons: chainsaw kills on any contact, pillow never kills', () => {
  assert.ok(WEAPONS.chainsaw.killAny);
  assert.ok(WEAPONS.pillow.nonLethal);
  assert.ok(WEAPONS.chicken.nonLethal);
  assert.ok(!WEAPONS.katana.killAny && !WEAPONS.katana.nonLethal);
});

test('weapons: baguette has durability 3, katana unbreakable', () => {
  assert.equal(WEAPONS.baguette.durability, 3);
  assert.equal(WEAPONS.katana.durability, Infinity);
  assert.equal(WEAPONS.pillow.durability, 6);
});

test('segmentDistance: parallel segments 1 unit apart', () => {
  const r = segmentDistance(V(0, 0, 0), V(1, 0, 0), V(0, 1, 0), V(1, 1, 0));
  assert.ok(Math.abs(r.dist - 1) < 1e-6, `dist=${r.dist}`);
});

test('segmentDistance: crossing segments -> ~0', () => {
  const r = segmentDistance(V(-1, 0, 0), V(1, 0, 0), V(0, -1, 0), V(0, 1, 0));
  assert.ok(r.dist < 1e-6, `dist=${r.dist}`);
  assert.ok(Math.abs(r.t - 0.5) < 1e-6 && Math.abs(r.u - 0.5) < 1e-6);
});

test('segmentDistance: degenerate point segment', () => {
  const r = segmentDistance(V(0, 0, 0), V(0, 0, 0), V(0, 1, 0), V(0, 2, 0));
  assert.ok(Math.abs(r.dist - 1) < 1e-6);
});

test('pointSegmentDistance: midpoint t=0.5', () => {
  const r = pointSegmentDistance(V(0.5, 1, 0), V(0, 0, 0), V(1, 0, 0));
  assert.ok(Math.abs(r.dist - 1) < 1e-6 && Math.abs(r.t - 0.5) < 1e-6);
});

test('stanceAdvantage: HIGH>LOW> MID>HIGH triangle', () => {
  assert.ok(stanceAdvantage(STANCE.HIGH, STANCE.LOW));
  assert.ok(stanceAdvantage(STANCE.LOW, STANCE.MID));
  assert.ok(stanceAdvantage(STANCE.MID, STANCE.HIGH));
  assert.ok(!stanceAdvantage(STANCE.HIGH, STANCE.MID));
  assert.ok(!stanceAdvantage(STANCE.HIGH, STANCE.HIGH));
});

test('fighter: stance locked during attack', () => {
  const f = dummyFighter('katana');
  assert.ok(f.attack());
  assert.equal(f.state, FSTATE.WINDUP);
  assert.equal(f.setStance(STANCE.HIGH), false);
  assert.equal(f.stance, STANCE.MID);
});

test('fighter: windup -> attacking -> neutral frame flow', () => {
  const f = dummyFighter('katana');
  f.attack();
  for (let i = 0; i < WEAPONS.katana.windup; i++) f.update();
  assert.equal(f.state, FSTATE.ATTACKING);
  assert.ok(f.inActiveFrames);
  for (let i = 0; i < WEAPONS.katana.active; i++) f.update();
  assert.equal(f.state, FSTATE.NEUTRAL);
});

test('fighter: katana tip hit to HEAD is lethal', () => {
  const att = dummyFighter('katana');
  const def = dummyFighter('katana');
  const out = def.takeHit(ZONE.HEAD, 0.9, att);
  assert.equal(out, 'lethal');
  assert.equal(def.state, FSTATE.DEAD);
  assert.equal(att.kills, 1);
});

test('fighter: katana hilt graze to HEAD is a glance', () => {
  const att = dummyFighter('katana');
  const def = dummyFighter('katana');
  const out = def.takeHit(ZONE.HEAD, 0.2, att);
  assert.equal(out, 'glance');
  assert.ok(def.alive);
});

test('fighter: leg sweet-spot cripples permanently', () => {
  const att = dummyFighter('katana');
  const def = dummyFighter('katana');
  const out = def.takeHit(ZONE.LEGS, 0.85, att);
  assert.equal(out, 'cripple');
  assert.ok(def.crippled);
  assert.equal(def.state, FSTATE.CRIPPLED);
  assert.ok(def.alive);
});

test('fighter: arm sweet-spot disarms', () => {
  const att = dummyFighter('katana');
  const def = dummyFighter('katana');
  const out = def.takeHit(ZONE.ARM, 0.9, att);
  assert.equal(out, 'disarm');
  assert.ok(def.disarmed);
});

test('fighter: chainsaw kills on hilt graze to torso', () => {
  const att = dummyFighter('chainsaw');
  const def = dummyFighter('katana');
  const out = def.takeHit(ZONE.TORSO, 0.1, att);
  assert.equal(out, 'lethal');
  assert.equal(def.state, FSTATE.DEAD);
});

test('fighter: pillow stuns + blinds, never kills', () => {
  const att = dummyFighter('pillow');
  const def = dummyFighter('katana');
  const out = def.takeHit(ZONE.HEAD, 0.95, att);
  assert.equal(out, 'stunned');
  assert.ok(def.alive);
  assert.equal(def.state, FSTATE.STUNNED);
  assert.ok(def.blindFrames > 0);
});

test('fighter: bunny headshot lethal, torso tickle stuns', () => {
  const att = dummyFighter('bunny');
  const def = dummyFighter('katana');
  assert.equal(def.takeHit(ZONE.HEAD, 0.5, att), 'lethal');
  const def2 = dummyFighter('katana');
  assert.equal(def2.takeHit(ZONE.TORSO, 0.5, att), 'stunned');
  assert.ok(def2.alive);
});

test('fighter: bat cripples legs even on glance', () => {
  const att = dummyFighter('bat');
  const def = dummyFighter('katana');
  assert.equal(def.takeHit(ZONE.LEGS, 0.2, att), 'cripple');
});

test('fighter: chicken stance-breaks', () => {
  const att = dummyFighter('chicken');
  const def = dummyFighter('katana');
  def.setStance(STANCE.HIGH);
  def.takeHit(ZONE.TORSO, 0.5, att);
  assert.equal(def.stance, STANCE.MID);
});

test('resolveExchange: clash when both attacking and blades cross', () => {
  const seg = { hilt: V(0, 1, 0), tip: V(0, 1, 1) };
  const a = dummyFighter('katana', seg);
  const b = dummyFighter('katana', { hilt: V(0, 1, 0.9), tip: V(0, 1, 0.1) });
  a.attack(); b.attack();
  for (let i = 0; i < WEAPONS.katana.windup; i++) { a.update(); b.update(); }
  const r = resolveExchange(a, b);
  assert.ok(r && r.type === 'clash', `got ${r && r.type}`);
  assert.equal(a.state, FSTATE.RECOIL);
  assert.equal(b.state, FSTATE.RECOIL);
});

test('resolveExchange: recoil recovers after 12 frames', () => {
  const a = dummyFighter('katana');
  a.clash();
  for (let i = 0; i < CLASH_RECOIL; i++) a.update();
  assert.equal(a.state, FSTATE.NEUTRAL);
});

test('resolveExchange: no clash when blades far apart', () => {
  const a = dummyFighter('katana', { hilt: V(0, 1, 0), tip: V(0, 1, 1) });
  const b = dummyFighter('katana', { hilt: V(5, 1, 0), tip: V(5, 1, 1) });
  a.attack(); b.attack();
  for (let i = 0; i < WEAPONS.katana.windup; i++) { a.update(); b.update(); }
  const r = resolveExchange(a, b);
  assert.ok(!r || r.type !== 'clash');
});

test('resolveExchange: attacker blade through defender torso scores hit', () => {
  // attacker blade passes through defender torso zone
  const a = dummyFighter('katana', { hilt: V(-0.5, 1.1, 0), tip: V(0.5, 1.1, 0) });
  const b = dummyFighter('katana'); // zones at origin
  a.attack();
  for (let i = 0; i < WEAPONS.katana.windup; i++) a.update();
  const r = resolveExchange(a, b);
  assert.ok(r && r.type === 'hit', `got ${r && r.type}`);
  assert.equal(r.zone, 'TORSO');
});

test('resolveExchange: no hit when attacker not in active frames', () => {
  const a = dummyFighter('katana', { hilt: V(-0.5, 1.1, 0), tip: V(0.5, 1.1, 0) });
  const b = dummyFighter('katana');
  const r = resolveExchange(a, b); // a never attacked
  assert.equal(r, null);
});

test('clashIntensity: frying pan parries harder than katana', () => {
  const pan = dummyFighter('fryingpan');
  const kat = dummyFighter('katana');
  assert.ok(clashIntensity(pan, kat) > clashIntensity(kat, kat));
});

test('baguette: breaks after 3 landed hits', () => {
  const att = dummyFighter('baguette');
  const def = dummyFighter('katana');
  // simulate 3 landed hits through resolveExchange-like flow
  for (let i = 0; i < 3; i++) {
    att.hitsDealt = (att.hitsDealt || 0) + 1;
  }
  assert.ok(att.checkBreak());
  const fresh = dummyFighter('baguette');
  fresh.hitsDealt = 2;
  assert.ok(!fresh.checkBreak());
});

test('fighter: dead fighters ignore hits', () => {
  const att = dummyFighter('katana');
  const def = dummyFighter('katana');
  def.takeHit(ZONE.HEAD, 0.9, att);
  assert.equal(def.takeHit(ZONE.HEAD, 0.9, att), 'ignored');
});

test('fighter: stun wears off', () => {
  const f = dummyFighter('katana');
  f.stun(5);
  assert.equal(f.state, FSTATE.STUNNED);
  for (let i = 0; i < 5; i++) f.update();
  assert.equal(f.state, FSTATE.NEUTRAL);
});
