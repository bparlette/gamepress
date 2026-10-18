import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.window ??= globalThis;
const { heroKind, heroColor } = await import('../kit/gpsprites.js');
const { urlHero, urlHeroColor } = await import('../kit/gphero3d.js');

const setQ = s => { globalThis.location = { search: s }; };
test.afterEach(() => { delete globalThis.location; });

test('no params: spec values pass through, default cat', () => {
  assert.equal(heroKind('dog'), 'dog'); assert.equal(heroKind(), 'cat'); assert.equal(heroColor('#112233'), '#112233'); assert.equal(heroColor(undefined), undefined);
  assert.equal(urlHero('dog'), 'dog'); assert.equal(urlHero(), 'cat'); assert.equal(urlHeroColor(0xff9a3c), 0xff9a3c);
});
test('valid URL hero/color override', () => {
  setQ('?auto=1&hero=robot&heroColor=%2300aaff');
  assert.equal(heroKind('cat'), 'robot'); assert.equal(heroColor('#ff9a3c'), '#00aaff');
  assert.equal(urlHero('cat'), 'robot'); assert.equal(urlHeroColor(0xff9a3c), '#00aaff');
});
test('unknown kind and bad color are ignored', () => {
  setQ('?hero=nope&heroColor=red');
  assert.equal(heroKind('dog'), 'dog'); assert.equal(heroColor('#abcdef'), '#abcdef');
  assert.equal(urlHero('dog'), 'dog'); assert.equal(urlHeroColor(5), 5);
  setQ('?hero=constructor'); assert.equal(heroKind('cat'), 'cat'); assert.equal(urlHero('cat'), 'cat');
});
