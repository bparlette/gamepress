import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadThemes, themeRecipeIds, themeSpec, themedId } from '../lib/themes.mjs';
import { CHAR, face, STY } from '../kit/gpsprites.js';

test('themes: 30 recipes per theme, valid hero sprite, noun swapped in every title and hook', () => {
  const T = loadThemes(), ids = themeRecipeIds();
  assert.equal(ids.length, 30); assert.ok(Object.keys(T).length >= 4);
  for (const [tid, t] of Object.entries(T)) for (const r of ids) {
    const s = themeSpec(r, tid);
    assert.ok(CHAR[s.hero] || /^cast:\w+:\w+$/.test(s.hero), `${tid}/${r}: hero ${s.hero} is not a sprite kind`);
    assert.ok(s.title && s.hook, `${tid}/${r}: missing title/hook`);
    if (t.noun !== 'CAT') assert.ok(!/\bcats?\b/i.test(s.title + ' ' + s.hook), `${tid}/${r}: still says cat: ${s.title} / ${s.hook}`);
  }
});
test('themes: ids are unique across themes', () => {
  const all = Object.keys(loadThemes()).flatMap(t => themeRecipeIds().map(r => themedId(r, t)));
  assert.equal(new Set(all).size, all.length);
});
test('themes: every theme title fits the HUD (<= 18 chars) and each new sprite draws without throwing', () => {
  const T = loadThemes(), ids = themeRecipeIds();
  for (const tid of Object.keys(T)) for (const r of ids) assert.ok(themeSpec(r, tid).title.length <= 18, `${tid}/${r}: title too long`);
  const calls = []; const ctx = new Proxy({}, { get: (_, k) => k === 'canvas' ? {} : k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : (...a) => { calls.push(k); }, set: () => true });
  for (const k of Object.keys(CHAR)) for (const o of [{}, { anim: 'walk', t: .4, dir: -1 }, { hurt: true }]) CHAR[k](ctx, 50, 100, 90, o);
  assert.ok(calls.length > 100);
});
test('sprites: blocky mode and face() work for every kind', () => {
  const ctx = new Proxy({}, { get: (_, k) => k === 'canvas' ? {} : k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  for (const b of [false, true]) { STY.blocky = b; for (const k of Object.keys(CHAR)) { CHAR[k](ctx, 50, 100, 110, { anim: 'walk', t: .3 }); face(ctx, k, 10, 10, 12); } }
  STY.blocky = false;
});
