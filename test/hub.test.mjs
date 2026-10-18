import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildHub, defaultGames } from '../lib/hub.mjs';
import { CHAR } from '../kit/gpsprites.js';
const chars = JSON.parse(readFileSync(new URL('../presets/characters.json', import.meta.url), 'utf8'));
const tpl = readFileSync(new URL('../templates/hub/hub.html', import.meta.url), 'utf8');

test('characters: 5 free / 15 locked, unique ids, real sprite kinds, no prices', () => {
  const h = chars.heroes, n = t => h.filter(x => x.tier === t);
  assert.equal(h.length, 20); assert.equal(n('free').length, 5); assert.equal(n('locked').length, 15);
  assert.deepEqual(n('free').map(x => x.id), ['cat', 'capyyuzu', 'noob', 'spud', 'duckknife']);
  assert.equal(new Set(h.map(x => x.id)).size, 20);
  for (const x of h) { assert.ok(CHAR[x.kind], `${x.id}: kind ${x.kind} not in CHAR`); assert.match(x.color, /^#[0-9a-f]{6}$/i); assert.ok(x.name && x.blurb); assert.ok(!('cost' in x)); }
  assert.ok(h.some(x => x.id === 'scrapper')); assert.ok(!h.some(x => x.id === 'bean'), 'bean is an Among Us lookalike');
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

test('hub template: no purchasing code, prices or wallet', () => {
  for (const re of [/purchase/i, /premium/i, /\bshop\b/i, /\$\d/, /\bIAP\b/, /wallet/i, /coins?\b/i, /all-access/i]) assert.ok(!re.test(tpl), String(re));
  for (const k of ['price', 'cost']) assert.ok(!(k in JSON.parse(readFileSync(new URL('../presets/hub.json', import.meta.url), 'utf8'))));
  assert.match(tpl, /LOOP COMPLETE/); assert.match(tpl, /CHOOSE A HERO TO UNLOCK/); assert.match(tpl, /ALL HEROES UNLOCKED/);
  assert.match(tpl, /Complete a loop to unlock/); assert.match(tpl, /Full game only/); assert.match(tpl, /finishLoop/);
});

test('hub template: demo loop ends on upsell and never unlocks (behaviour in the page script)', () => {
  const fl = tpl.slice(tpl.indexOf('function finishLoop'), tpl.indexOf('let chosen'));
  assert.ok(fl.indexOf('if (demoMode)') < fl.indexOf('lockedList'), 'demo branch comes before any unlock UI');
  assert.match(fl, /if \(demoMode\) \{.*go\('upsell'\); return; \}/);
  assert.equal((tpl.match(/S\.unlocked\.push/g) || []).length, 1, 'only one place unlocks (unlockChosen)');
});
