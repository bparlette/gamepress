import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { approveDemo, getApproval, listApprovals, generateBlueprint, scaffoldExpansion } from '../lib/expand.mjs';
import { createLevelManager, createCamera } from '../kit/gplevels.js';

test('approveDemo records approval with notes, levels, and worlds', () => {
  const root = mkdtempSync(join(tmpdir(), 'gp-app-'));
  const gamesDir = join(root, 'games');
  const stateDir = join(root, 'state');
  const gameDir = join(gamesDir, 'test-hero');
  mkdirSync(gameDir, { recursive: true });
  writeFileSync(join(gameDir, 'index.html'), '<!doctype html><html><body>/*RECIPE bullet-heaven*/</body></html>');

  const res = approveDemo('test-hero', {
    notes: 'Approved! Expand into 5 worlds with boss fights.',
    levels: 6,
    worlds: ['Green Meadow', 'Dark Forest', 'Obsidian Keep'],
    gamesDir,
    stateDir
  });

  assert.equal(res.ok, true);
  assert.equal(res.approval.approved, true);
  assert.equal(res.approval.expansion.levels, 6);
  assert.deepEqual(res.approval.expansion.worlds, ['Green Meadow', 'Dark Forest', 'Obsidian Keep']);

  const loaded = getApproval('test-hero', stateDir);
  assert.equal(loaded.approved, true);
  assert.equal(loaded.expansion.levels, 6);

  const list = listApprovals(stateDir);
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'test-hero');
});

test('generateBlueprint outputs token-efficient level curves and world bounds', () => {
  const root = mkdtempSync(join(tmpdir(), 'gp-bp-'));
  const gamesDir = join(root, 'games');
  const stateDir = join(root, 'state');
  const gameDir = join(gamesDir, 'cat-jump');
  mkdirSync(gameDir, { recursive: true });
  writeFileSync(join(gameDir, 'index.html'), '<!doctype html><html><body>title: "Cat Jump"</body></html>');

  approveDemo('cat-jump', {
    notes: 'Scale to 4 levels',
    levels: 4,
    worlds: ['Forest', 'Castle'],
    gamesDir,
    stateDir
  });

  const bp = generateBlueprint('cat-jump', { gamesDir, stateDir });
  assert.equal(bp.id, 'cat-jump');
  assert.equal(bp.approvalStatus, 'APPROVED');
  assert.equal(bp.totalLevels, 4);
  assert.equal(bp.levels.length, 4);
  assert.equal(bp.levels[0].world, 'Forest');
  assert.ok(bp.levels[0].worldBounds.w >= 540);
  assert.ok(bp.levels[3].isBoss); // last level is marked boss
  assert.ok(bp.saveSystem.storageKey.includes('cat-jump'));
});

test('scaffoldExpansion backs up demo and injects gplevels.js and LEVELS array', () => {
  const root = mkdtempSync(join(tmpdir(), 'gp-sc-'));
  const gamesDir = join(root, 'games');
  const stateDir = join(root, 'state');
  const gameDir = join(gamesDir, 'speed-cat');
  mkdirSync(gameDir, { recursive: true });
  const initialHtml = `<!doctype html><html><body><script type="module">
import { createGame } from '../_vendor/gp2d.js';
const g = createGame({ id: 'speed-cat', title: 'SPEED CAT' });
function init() {}
</script></body></html>`;
  writeFileSync(join(gameDir, 'index.html'), initialHtml);

  approveDemo('speed-cat', { levels: 3, gamesDir, stateDir });

  const res = scaffoldExpansion('speed-cat', { gamesDir, stateDir, levels: 3 });
  assert.equal(res.ok, true);
  assert.equal(res.levels, 3);

  // Verify backup exists
  assert.equal(readFileSync(join(gameDir, 'index.demo.html'), 'utf8'), initialHtml);

  // Verify expanded content
  const expandedHtml = readFileSync(join(gameDir, 'index.html'), 'utf8');
  assert.ok(expandedHtml.includes('gplevels.js'));
  assert.ok(expandedHtml.includes('const LEVELS ='));
  assert.ok(expandedHtml.includes('createLevelManager'));
});

test('kit/gplevels.js createCamera follows target and clamps to world bounds', () => {
  const cam = createCamera({ w: 500, h: 500, worldW: 2000, worldH: 2000, deadzone: 20, damping: 10 });
  assert.equal(cam.x, 1000);
  assert.equal(cam.y, 1000);

  // Target far right
  cam.follow(1800, 1000, 1.0);
  assert.ok(cam.x > 1000);
  assert.ok(cam.x <= 1750); // worldW (2000) - w/2 (250) = 1750 clamp
});

test('kit/gplevels.js createLevelManager tracks unlock and star progression', () => {
  const levels = [
    { id: 1, name: 'L1', world: 'W1', bounds: { w: 540, h: 960 }, goal: 'Run' },
    { id: 2, name: 'L2', world: 'W1', bounds: { w: 800, h: 960 }, goal: 'Jump' },
    { id: 3, name: 'L3', world: 'W2', bounds: { w: 1200, h: 960 }, goal: 'Win' }
  ];

  const mgr = createLevelManager({ id: 'test-mgr', levels });
  assert.equal(mgr.currentIndex, 0);
  assert.equal(mgr.unlocked, 1);
  assert.equal(mgr.getCurrentLevel().name, 'L1');

  // Win Level 1 with 3 stars
  mgr.completeLevel({ score: 1200, stars: 3, coins: 50 });
  assert.equal(mgr.mode, 'win_modal');
  assert.equal(mgr.stars[0], 3);
  assert.equal(mgr.scores[0], 1200);
  assert.equal(mgr.coins, 50);
  assert.equal(mgr.unlocked, 2); // Unlocked Level 2

  // Advance
  mgr.nextLevel();
  assert.equal(mgr.currentIndex, 1);
  assert.equal(mgr.mode, 'play');
  assert.equal(mgr.getCurrentLevel().name, 'L2');
});
