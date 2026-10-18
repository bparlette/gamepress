// gamepress run: every recipe is reachable from a plain-English idea, and no recipe never starts a build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.HOME = mkdtempSync(join(tmpdir(), 'gp-run-home-'));
const { routeByKeywords, recipeChoices } = await import('../lib/ideate.mjs');
const { startRun, answerRun, statusRun } = await import('../lib/run.mjs');

const PHRASES = {
  'one-tap-reflex': 'flappy bird clone', 'daily-deduction': 'wordle style word game', 'precision-platformer': 'mario platformer',
  'cozy-farm': 'cozy farm with animals', 'bullet-heaven': 'vampire survivors with zombies', 'obby-gauntlet': 'roblox obby parkour',
  'rail-runner': 'subway surfers endless runner', 'ballistic-bouncer': 'peggle with pegs', 'grid-chaser': 'pacman maze chase',
  'falling-blocks': 'tetris falling blocks', 'merge-sandbox': 'suika watermelon merge', 'arena-brawler': 'beat em up street brawler',
  'scrolling-shmup': 'space shooter bullet hell', 'run-and-gun': 'contra run and gun', 'mini-metroidvania': 'hollow knight metroidvania',
  'footsies-duel': 'nidhogg sword duel', 'mini-zelda': 'zelda dungeon', 'turn-based-3v3': 'pokemon turn based battle',
  'micro-tower-defense': 'tower defense', 'kart-racer': 'mario kart racing', 'card-roguelite': 'balatro card game',
  'idle-tycoon': 'cookie clicker tycoon', 'hide-and-seek': 'prop hunt hide and seek', 'trajectory-artillery': 'worms artillery',
  'hole-eater': 'black hole that eats a city', 'crowd-runner': 'count masters crowd runner', 'glass-drop': 'squid game glass bridge',
  'demolition': 'demolition wrecking ball', 'plinko-drop': 'plinko', 'ragdoll-launch': 'ragdoll launch', 'rope-cut': 'cut the rope',
  'slice-swipe': 'slice fruit', 'sort-puzzle': 'sorting puzzle', 'stack-timing': 'stack blocks tower',
};
test('every recipe has a phrase that routes to it', () => {
  for (const c of recipeChoices()) assert.ok(PHRASES[c.id], 'no phrase for ' + c.id);
  for (const [id, p] of Object.entries(PHRASES)) assert.equal(routeByKeywords(p), id, p);
});
test('unknown idea routes nowhere', () => assert.equal(routeByKeywords('xyzzy quantum banana'), null));
test('no-recipe answer lists types and never builds', async () => {
  const { job } = await startRun();
  const r = await answerRun(job, { idea: 'xyzzy quantum banana' });
  assert.ok(!r.recipe && r.options.length >= 30);
  const r2 = await answerRun(job, { recipe: 'nonsense' });
  assert.ok(r2.options, 'still asking');
  assert.notEqual(statusRun(job).state, 'building');
  const r3 = await answerRun(job, { recipe: 'plinko-drop' });
  assert.equal(r3.recipe, 'plinko-drop');
  assert.equal(statusRun(job).state, 'awaiting_answers');
});
