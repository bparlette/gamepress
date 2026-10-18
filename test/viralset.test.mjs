import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { setName, preflight, contactSheet } from '../lib/viralset.mjs';

test('viral set: names, repo-games guard, empty contact sheet', () => {
  assert.equal(setName('dogs'), 'dogs'); assert.equal(setName('dogs', 'dungeon'), 'dogs-dungeon');
  assert.throws(() => preflight({ games: join(new URL('..', import.meta.url).pathname, 'games') }), /refusing to write/);
  assert.throws(() => contactSheet(['nope'], '/tmp/gp-no-catalog/games.json', '/tmp/gp-no-sheet.jpg'), /no thumbnails/);
});
