// Build-path test for the four 3D viral recipes (hole-eater, crowd-runner, glass-drop, demolition):
// each one must `make` without errors and produce a game + hook plan + meta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { make, RECIPES, REGISTRY } from '../lib/extras.mjs';

const FOUR = ['hole-eater', 'crowd-runner', 'glass-drop', 'demolition'];

test('3D recipes are in the registry with full metadata', () => {
  for (const id of FOUR) {
    const r = REGISTRY[id];
    assert.ok(r, id + ' in REGISTRY');
    assert.equal(r.engine, '3d', id + ' engine');
    for (const k of ['title', 'hook', 'hooks', 'seconds', 'match', 'keywords', 'refs', 'oneUps', 'dontBuild', 'threeSecond', 'touch', 'viral', 'feel', 'category'])
      assert.ok(r[k], `${id} has ${k}`);
    assert.ok(r.viral.hook && r.viral.bot && r.viral.escalation && r.viral.climax && r.viral.personality, id + ' viral spec complete');
    assert.ok(Array.isArray(r.feel.use) && r.feel.use.length && r.feel.why, id + ' feel spec complete');
    assert.ok(RECIPES[id]?.reg, id + ' flows through registry (no hardcoded override)');
  }
});

for (const id of FOUR) {
  test(`make --recipe ${id} builds cleanly`, () => {
    const games = mkdtempSync(join(tmpdir(), 'gp-games-')), examples = mkdtempSync(join(tmpdir(), 'gp-ex-'));
    const out = make('test-' + id, { recipe: id, spec: { title: 'Test ' + id, hook: 'test hook', seed: 7 }, games, examples, force: true });
    const html = readFileSync(join(games, 'test-' + id, 'index.html'), 'utf8');
    assert.ok(html.includes('<script type="module">'), 'has module script');
    assert.ok(!html.includes('/*SPEC*/ ...{} /*END*/'), 'SPEC marker was replaced');
    assert.ok(existsSync(join(examples, 'test-' + id, 'hook.drive.json')), 'hook plan written');
    assert.ok(existsSync(join(examples, 'test-' + id, 'meta.json')), 'meta written');
    assert.match(out.next, /gamepress all/, 'next step returned');
  });
}

test('restored viral recipes have feel specs', () => {
  for (const id of ['slice-swipe', 'stack-timing', 'plinko-drop', 'ragdoll-launch', 'sort-puzzle', 'rope-cut']) {
    const f = REGISTRY[id]?.feel;
    assert.ok(f, id + ' has feel');
    assert.ok(Array.isArray(f.use) && f.use.length, id + ' feel.use non-empty');
    assert.ok(f.why && f.why.length > 20, id + ' feel.why explains the mapping');
  }
});
