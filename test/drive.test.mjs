import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActions, captionsAt, speedAt, videoTimeOf } from '../lib/drive.mjs';
import { upsertGame } from '../lib/catalog.mjs';

test('buildActions expands taps and sorts by time', () => {
  const a = buildActions([{ t: 2, key: ' ', hold: 0.5 }, { t: 1, down: 'd' }, { t: 3, up: 'd' }]);
  assert.deepEqual(a.map(x => [x.t, x.type, x.key]), [[1, 'down', 'd'], [2, 'down', ' '], [2.5, 'up', ' '], [3, 'up', 'd']]);
  assert.throws(() => buildActions([{ t: 1, bogus: 1 }]));
});

test('captionsAt and speedAt are windowed', () => {
  const caps = [{ t: 1, until: 2, text: 'a' }, { t: 1.5, text: 'b', style: 'pop' }];
  assert.equal(captionsAt(caps, 0.5).length, 0);
  assert.equal(captionsAt(caps, 1.6).length, 2);
  assert.equal(captionsAt(caps, 1.6)[0].age.toFixed(1), '0.6');
  assert.equal(captionsAt(caps, 4.4).length, 1); // default length 3 s
  assert.equal(speedAt([{ t: 1, until: 2, factor: 0.3 }], 1.5), 0.3);
  assert.equal(speedAt([{ t: 1, until: 2, factor: 0.3 }], 2.5), 1);
});

test('videoTimeOf maps game time to the frame it happened in', () => {
  const gts = [33.3, 66.7, 100, 110, 120]; // slow-mo after frame 3
  assert.equal(videoTimeOf(50, gts, 30), 1 / 30);
  assert.equal(videoTimeOf(115, gts, 30), 4 / 30);
});

test('upsertGame adds categories and replaces by id', () => {
  const c = { categories: ['A'], games: [{ id: 'x', title: 'old' }] };
  upsertGame(c, { id: 'x', title: 'new', category: 'B' });
  upsertGame(c, { id: 'y', title: 'y', category: 'B' });
  assert.deepEqual(c.categories, ['A', 'B']);
  assert.equal(c.games.length, 2);
  assert.equal(c.games[0].title, 'new');
});
