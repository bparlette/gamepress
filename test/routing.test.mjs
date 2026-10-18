// routing confidence: weak keyword matches ask for confirmation, strong ones build silently.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.HOME = mkdtempSync(join(tmpdir(), 'gp-routing-home-'));
const { routeWithConfidence, routeByKeywords } = await import('../lib/ideate.mjs');
const { startRun, answerRun, statusRun } = await import('../lib/run.mjs');

test('weak ideas get weak confidence', () => {
  assert.equal(routeWithConfidence('football game').confidence, 'weak');
  assert.equal(routeWithConfidence('cats').confidence, 'weak');
  assert.equal(routeWithConfidence('racing').confidence, 'weak');
  assert.equal(routeWithConfidence('mario').confidence, 'weak'); // platformer vs kart
});

test('strong ideas get strong confidence', () => {
  assert.equal(routeWithConfidence('precision platformer like mario').confidence, 'strong');
  assert.equal(routeWithConfidence('brick breaker').confidence, 'strong');
  assert.equal(routeWithConfidence('vampire survivors').confidence, 'strong');
  assert.equal(routeWithConfidence('tower defense').confidence, 'strong');
});

test('close race is weak', () => {
  const rc = routeWithConfidence('mario kart platformer');
  assert.equal(rc.confidence, 'weak');
  assert.ok(rc.matches.length >= 2);
});

test('no match is none', () => {
  assert.equal(routeWithConfidence('xyzzy quantum banana').confidence, 'none');
  assert.equal(routeByKeywords('xyzzy quantum banana'), null);
});

test('routeByKeywords still returns the top id', () => {
  assert.equal(routeByKeywords('football game'), 'ballistic-bouncer');
  assert.equal(routeByKeywords('precision platformer like mario'), 'precision-platformer');
  assert.equal(routeByKeywords('cats'), 'cozy-farm');
});

test('overlapping keywords do not double-count', () => {
  const rc = routeWithConfidence('football game');
  assert.deepEqual(rc.matches[0].hits, ['football game']);
});

test('weak match asks for confirmation instead of building', async () => {
  const { job } = await startRun();
  const r = await answerRun(job, { idea: 'football game' });
  assert.equal(statusRun(job).state, 'awaiting_confirm');
  assert.ok(!r.recipe, 'no recipe chosen yet');
  assert.ok(r.options.some(o => o.includes('ballistic-bouncer')), 'top candidate shown');
  assert.ok(r.options.some(o => /something else/i.test(o)), 'escape hatch shown');
  assert.match(r.ask, /did you mean/);
});

test('confirming a candidate proceeds to questions', async () => {
  const { job } = await startRun();
  await answerRun(job, { idea: 'football game' });
  const r2 = await answerRun(job, { recipe: 1 });
  assert.equal(r2.recipe, 'ballistic-bouncer');
  assert.equal(statusRun(job).state, 'awaiting_answers');
});

test('confirming by id also works', async () => {
  const { job } = await startRun();
  await answerRun(job, { idea: 'cats' });
  const r2 = await answerRun(job, { recipe: 'cozy-farm' });
  assert.equal(r2.recipe, 'cozy-farm');
  assert.equal(statusRun(job).state, 'awaiting_answers');
});

test('"something else" falls through to the full picker', async () => {
  const { job } = await startRun();
  const r = await answerRun(job, { idea: 'cats' });
  const r2 = await answerRun(job, { recipe: r.options.length }); // last option
  assert.equal(statusRun(job).state, 'awaiting_recipe');
  assert.ok(r2.options.length >= 30, 'full picker shown');
});

test('gibberish at confirm falls through to the full picker', async () => {
  const { job } = await startRun();
  await answerRun(job, { idea: 'racing' });
  const r2 = await answerRun(job, { recipe: 'definitely not a recipe' });
  assert.equal(statusRun(job).state, 'awaiting_recipe');
});

test('strong match skips confirmation', async () => {
  const { job } = await startRun();
  const r = await answerRun(job, { idea: 'precision platformer like mario' });
  assert.equal(r.recipe, 'precision-platformer');
  assert.equal(statusRun(job).state, 'awaiting_answers');
});
