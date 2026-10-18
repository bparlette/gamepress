import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { STY } from '../kit/gpsprites.js';
import { WORLD_SPRITES, WORLDS, drawWorld, drawBackdrop } from '../kit/gpworld.js';
import { themeSpec, themedId } from '../lib/themes.mjs';

// minimal recording 2D context: any method is a no-op, any property settable
const ctx = () => new Proxy({ calls: 0 }, { get: (t, k) => k in t ? t[k] : k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : (...a) => { t.calls++; }, set: (t, k, v) => { t[k] = v; return true; } });

test('26 world sprites draw in every state, blocky on/off, without throwing', () => {
  assert.ok(Object.keys(WORLD_SPRITES).length >= 20);
  const was = { ...STY };
  try { for (const blocky of [false, true]) for (const ow of [0, 3]) { STY.blocky = blocky; STY.ow = ow; for (const [k, f] of Object.entries(WORLD_SPRITES)) for (const o of [{}, { t: 0 }, { t: 1.7 }, { t: 99.3 }]) { const c = ctx(); f(c, 100, 100, 110, o); drawWorld(k, c, 50, 50, 48, o); assert.ok(c.calls > 3, k); } } } finally { Object.assign(STY, was); }
  assert.equal(STY.ow, was.ow);
});
test('drawWorld rejects unknown kinds', () => assert.throws(() => drawWorld('nope', ctx(), 0, 0, 10), /unknown sprite/));
test('WORLDS roles reference real sprites; presets/worlds.json mirrors them', () => {
  const json = JSON.parse(readFileSync(new URL('../presets/worlds.json', import.meta.url), 'utf8'));
  for (const [w, W] of Object.entries(WORLDS)) {
    for (const r of ['ground', 'platform', 'wall', 'hazard', 'barrier', 'spring', 'pickup', 'bonus', 'life', 'key', 'goal']) assert.ok(WORLD_SPRITES[W[r]], `${w}.${r}`);
    for (const d of [...W.deco, ...W.backdrop.mid]) assert.ok(WORLD_SPRITES[d], `${w} ${d}`);
    for (const k of ['bg', 'bgTop', 'bgBot']) assert.match(W[k], /^#[0-9a-f]{6}$/i);
    assert.deepEqual(json[w], W, `${w} in worlds.json`);
    const c = ctx(); drawBackdrop(w, c, 540, 960, 1234, 2.2); drawBackdrop(w, c, 540, 960, -50, 0); assert.ok(c.calls > 10);
  }
  assert.deepEqual(Object.keys(WORLDS).sort(), ['cosmic', 'cyber', 'dungeon', 'grassland']);
});
test('theme spec only gains `world` when asked; ids get a world prefix', () => {
  assert.equal('world' in themeSpec('one-tap-reflex', 'cats'), false);
  assert.equal(themeSpec('one-tap-reflex', 'dogs', 'dungeon').world, 'dungeon');
  assert.equal(themedId('one-tap-reflex', 'cats'), 'one-tap-reflex');
  assert.equal(themedId('one-tap-reflex', 'dogs', 'cyber'), 'dogs-cyber-one-tap-reflex');
  assert.throws(() => themeSpec('one-tap-reflex', 'cats', 'mars'), /world/);
});
test('2D templates keep the default look when spec.world is unset', () => {
  const dir = new URL('../templates/recipes/', import.meta.url);
  for (const f of readdirSync(dir).filter(f => /gpworld/.test(readFileSync(new URL(f, dir), 'utf8')))) { const s = readFileSync(new URL(f, dir), 'utf8'); assert.match(s, /const (W|WLD) = S\.world \? WORLDS\[S\.world\] : null/, f); assert.doesNotMatch(s, /world: ?'/, f + ' must not default a world'); }
});
