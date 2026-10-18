import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config, status, TRACK_STEPS } from '../lib/pipeline.mjs';

test('TRACK_STEPS covers hook, demo, web-store', () => {
  assert.deepEqual(TRACK_STEPS.hook, ['test', 'video', 'grade']);
  assert.ok(TRACK_STEPS.demo.includes('demo'));
  assert.ok(TRACK_STEPS['web-store'].includes('pack'));
});

test('config resolves paths from flags', () => {
  const root = mkdtempSync(join(tmpdir(), 'gp-cfg-'));
  const c = config({ games: join(root, 'g'), video: join(root, 'v') });
  assert.equal(c.games, join(root, 'g'));
  assert.equal(c.videoDir, join(root, 'v'));
  assert.ok(c.state.length > 0);
});

test('status reports missing game and next step', () => {
  const root = mkdtempSync(join(tmpdir(), 'gp-status-'));
  const c = config({ games: join(root, 'games'), video: join(root, 'video'), publish: join(root, 'publish') });
  mkdirSync(c.state, { recursive: true });
  const s = status('no-such-game', c);
  assert.equal(s.steps.game, 'missing');
  assert.equal(s.next, 'game');
});

test('status reports done game shell', () => {
  const root = mkdtempSync(join(tmpdir(), 'gp-status2-'));
  const c = config({ games: join(root, 'games'), video: join(root, 'video'), publish: join(root, 'publish') });
  const gd = join(c.games, 'demo1');
  mkdirSync(gd, { recursive: true });
  writeFileSync(join(gd, 'index.html'), '<html>hi</html>');
  const s = status('demo1', c);
  assert.equal(s.steps.game, 'done');
  assert.equal(s.next, 'test');
});
