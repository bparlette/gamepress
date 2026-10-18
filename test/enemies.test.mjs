import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STY } from '../kit/gpsprites.js';
import { ENEMY_TYPES, ENEMY_IDS, drawEnemy, updateEnemy, makeEnemy, hitFlash, spawnSplit, foeId, enemySheet, ENEMY_SHEET } from '../kit/gpenemies.js';

const ctx = () => new Proxy({ calls: 0 }, { get: (t, k) => k in t ? t[k] : (...a) => { t.calls++; }, set: (t, k, v) => { t[k] = v; return true; } });
const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

test('10 enemies, radii 24 or 48, all draw in every state in both blocky modes', () => {
  assert.equal(ENEMY_TYPES.length, 10);
  for (const T of ENEMY_TYPES) { assert.ok([24, 48].includes(T.radius), T.id); assert.ok(T.threat && T.name && T.behavior); }
  const was = { ...STY };
  globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return ctx(); } };
  try {
    for (const blocky of [false, true]) { STY.blocky = blocky; for (const id of ENEMY_IDS) for (const o of [{}, { t: 1.3, dir: -1 }, { flash: true }, { warn: true }, { warn: .4, count: 2 }]) { const c = ctx(); drawEnemy(id, c, 100, 100, 110, o); assert.ok(c.calls > (o.flash ? 0 : 5), id); } }
    const c = ctx(); assert.equal(enemySheet(c).rows, 10); assert.equal(ENEMY_SHEET.length, 10);
  } finally { delete globalThis.OffscreenCanvas; Object.assign(STY, was); }
  assert.equal(STY.ow, was.ow);
});
test('updateEnemy is deterministic and never touches Math.random', () => {
  const orig = Math.random; Math.random = () => { throw new Error('Math.random used'); };
  try {
    const run = id => { const e = makeEnemy(id, 400, 300), r = seeded(5), log = []; for (let i = 0; i < 900; i++) { const ev = updateEnemy(e, { x: 100 + i % 50, y: 200, r: 20 }, 1 / 60, r); log.push(JSON.stringify([e.x, e.y, e.state, ev])); } return log.join('|'); };
    for (const id of ENEMY_IDS) assert.equal(run(id), run(id), id);
  } finally { Math.random = orig; }
});
test('behaviours: shoot, blast, steal, shockwave, split, flash', () => {
  const kinds = id => { const e = makeEnemy(id, 300, 0), r = seeded(1), s = new Set(); for (let i = 0; i < 1200; i++) for (const v of updateEnemy(e, { x: 0, y: 0, r: 20 }, 1 / 60, r)) s.add(v.kind); return s; };
  assert.ok(kinds('bad_drone').has('shoot')); assert.ok(kinds('bad_bomb').has('blast')); assert.ok(kinds('bad_goblin').has('steal'));
  assert.ok(kinds('bad_boss').has('shockwave')); assert.ok(kinds('bad_cyclops').has('knockback'));
  const sl = makeEnemy('bad_slime', 0, 0), kids = spawnSplit(sl, seeded(2)); assert.equal(kids.length, 2); assert.deepEqual(spawnSplit(kids[0], seeded(2)), []);
  const e = hitFlash(makeEnemy('bad_zombie', 0, 0)); assert.equal(e.flash, 1); updateEnemy(e, { x: 9, y: 9 }, 1 / 60, seeded(1)); assert.equal(e.flash, 0);
  assert.equal(foeId('zombie', 2), 'bad_boss'); assert.equal(foeId('ghost'), 'bad_reaper');
});
