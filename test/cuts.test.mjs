import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initCuts, findLines, lintCuts } from '../lib/cuts.mjs';

function fakeGame(scenes) {
  const g = mkdtempSync(join(tmpdir(), 'cuts-'));
  mkdirSync(join(g, 'tools/director'), { recursive: true }); writeFileSync(join(g, 'tools/director/direct.mjs'), '');
  mkdirSync(join(g, 'web/vo'), { recursive: true }); mkdirSync(join(g, 'data'), { recursive: true });
  writeFileSync(join(g, 'web/vo/manifest.json'), JSON.stringify({ lines: {
    'a.kill.c.0': { text: 'Hello there', duration: 1.2 }, 'a.kill.c.1': { text: 'Second line', duration: 0.8 }, 'b.kill.s.0': { text: 'Mature', duration: 1 } } }));
  writeFileSync(join(g, 'data/content.json'), JSON.stringify({ factions: { a: { name: 'A' }, b: { name: 'B' } } }));
  writeFileSync(join(g, 'data/weapons.json'), JSON.stringify({ loadouts: { default: {}, sniper: {} } }));
  initCuts(g);
  const spec = JSON.parse(JSON.stringify(JSON.parse(require_json(join(g, 'tools/director/scripts/viral/cuts.json')))));
  spec.chapters.hero.scenes = scenes; writeFileSync(join(g, 'tools/director/scripts/viral/cuts.json'), JSON.stringify(spec));
  return g;
}
import { readFileSync } from 'node:fs';
const require_json = f => readFileSync(f, 'utf8');

test('cuts init refuses a game without a director', () => {
  assert.throws(() => initCuts(mkdtempSync(join(tmpdir(), 'cuts-no-'))), /no tools\/director/);
});

test('cuts init installs the kit and the skeleton fails lint until scenes exist', () => {
  const g = fakeGame([]);
  assert.ok(existsSync(join(g, 'tools/director/scripts/viral/make.sh')));
  const r = lintCuts(g);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /no scenes/);
});

test('cuts lint: unknown line suggests recorded ones; unknown faction and loadout flagged', () => {
  const g = fakeGame([{ killer: 'a', victim: 'zz', line: 'a.kill.c.9', loadout: 'nope' }]);
  const r = lintCuts(g);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => /victim "zz" is not a faction/.test(e)));
  assert.ok(r.errors.some(e => /no recorded line "a.kill.c.9".*a\.kill\.c\.0/.test(e)));
  assert.ok(r.errors.some(e => /loadout "nope" unknown/.test(e)));
});

test('cuts lint: good spec passes; mature variant and unused factions warn; Short length enforced', () => {
  const good = fakeGame([{ killer: 'a', victim: 'b', line: 'a.kill.c.0' }, { killer: 'b', victim: 'a', line: 'b.kill.s.0' }]);
  const r = lintCuts(good);
  assert.equal(r.ok, true);
  assert.ok(r.warnings.some(w => /mature/.test(w)));
  const long = fakeGame(Array.from({ length: 20 }, () => ({ killer: 'a', victim: 'b', line: 'a.kill.c.0' })));
  assert.ok(lintCuts(long).errors.some(e => /over 58s/.test(e)));
});

test('cuts lines: search by text/faction, shortest first, variant filter', () => {
  const g = fakeGame([]);
  const r = findLines(g, { faction: 'a' });
  assert.equal(r.total, 2);
  assert.equal(r.lines[0].id, 'a.kill.c.1');
  assert.equal(findLines(g, { q: 'mature', variant: 'any' }).total, 1);
  assert.equal(findLines(g, { q: 'mature' }).total, 0);
});
