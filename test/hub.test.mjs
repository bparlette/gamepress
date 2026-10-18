import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildHub, defaultGames } from '../lib/hub.mjs';
import { CHAR } from '../kit/gpsprites.js';
const chars = JSON.parse(readFileSync(new URL('../presets/characters.json', import.meta.url), 'utf8'));

test('characters: 5 free / 10 earn / 5 premium, unique ids, real sprite kinds', () => {
  const h = chars.heroes, n = t => h.filter(x => x.tier === t);
  assert.equal(h.length, 20); assert.equal(n('free').length, 5); assert.equal(n('earn').length, 10); assert.equal(n('premium').length, 5);
  assert.equal(new Set(h.map(x => x.id)).size, 20);
  for (const x of h) { assert.ok(CHAR[x.kind], `${x.id}: kind ${x.kind} not in CHAR`); assert.match(x.color, /^#[0-9a-f]{6}$/i); assert.ok(x.name && x.blurb); }
  assert.deepEqual(n('earn').map(x => x.cost), [50, 100, 150, 200, 250, 300, 350, 400, 450, 500]);
  for (const x of n('premium')) assert.match(x.cost, /^\$\d/);
  assert.ok(!h.some(x => x.id === 'bean'), 'bean is an Among Us lookalike');
});

function fakeGames(ids) { const d = mkdtempSync(join(tmpdir(), 'hub-')); for (const g of ids) { mkdirSync(join(d, g)); writeFileSync(join(d, g, 'index.html'), '<html></html>'); } return d; }

test('hub: defaults to 30 distinct games, builds from fake folders, refuses when missing', () => {
  const ids = defaultGames(); assert.equal(ids.length, 30); assert.equal(new Set(ids).size, 30);
  assert.throws(() => buildHub({ games: fakeGames(ids.slice(1)) }), /build these first/);
  const d = fakeGames(ids), r = buildHub({ games: d, name: 'arcade-hub' });
  assert.equal(r.games, 30); assert.ok(existsSync(r.path));
  const html = readFileSync(r.path, 'utf8');
  assert.ok(!html.includes('__CONFIG__') && !html.includes('__TITLE__'));
  const demo = buildHub({ games: d, name: 'arcade-hub', demo: true }); assert.equal(demo.id, 'arcade-hub-demo'); assert.equal(demo.games, 5);
});

test('hub template: purchase stub never unlocks premium without the dev flag', () => {
  const t = readFileSync(new URL('../templates/hub/hub.html', import.meta.url), 'utf8');
  assert.match(t, /function purchase\(productId\)/);
  assert.match(t, /Steamworks/); assert.match(t, /if \(!DEV\) return false/);
  assert.match(t, /Q\.get\('dev'\) === '1'/);
  assert.ok(!/unlocked\.push\([^)]*premium/.test(t));
  assert.match(t, /\.\.\/_vendor\/gpsprites\.js/); assert.match(t, /pack=1&seed/);
});
