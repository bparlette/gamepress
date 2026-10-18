import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCast, buildCast } from '../lib/cast.mjs';

test('cast: karen preset has 20 characters, 3 free, valid events', () => {
  const c = loadCast('karen');
  assert.equal(c.factions.length, 20);
  assert.deepEqual(c.factions.filter(f => f.tier === 'free').map(f => f.id), ['karens', 'hoaDads', 'fratHouse']);
  assert.equal(c.hub.demoRecipes.length, 5);
});

test('cast: buildCast copies art and clean clips only, writes a manifest', () => {
  const src = mkdtempSync(join(tmpdir(), 'cast-src-')), out = mkdtempSync(join(tmpdir(), 'cast-out-'));
  mkdirSync(join(src, 'web/assets/characters'), { recursive: true }); mkdirSync(join(src, 'web/vo'), { recursive: true });
  writeFileSync(join(src, 'web/assets/characters/karens.png'), 'x');
  writeFileSync(join(src, 'web/vo/karens_victory_c_0.ogg'), 'a'); writeFileSync(join(src, 'web/vo/karens_victory_s_0.ogg'), 'spicy');
  const r = buildCast('karen', { games: out, source: src, factions: ['karens', 'hoaDads'] });
  assert.equal(r.factions, 1); assert.equal(r.clips, 1);
  const m = JSON.parse(readFileSync(join(out, '_cast/karen/cast.json'), 'utf8'));
  assert.deepEqual(m.factions.karens.vo.victory, ['karens_victory_c_0.ogg']);
  assert.ok(!existsSync(join(out, '_cast/karen/vo/karens_victory_s_0.ogg')));
});

test('cast: a missing source gives one clear line', () => {
  assert.throws(() => buildCast('karen', { games: tmpdir(), source: '/nonexistent-dir-xyz' }), /HOA_WARFARE_DIR/);
});
