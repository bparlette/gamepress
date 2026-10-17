import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// isolate preset storage per test run
process.env.GP_PRESET_DIR = mkdtempSync(join(tmpdir(), 'gp-presets-'));
const P = await import('../lib/presets.mjs');

const QS = [
  { id: 'style', ask: 'Art style?', options: [{ label: 'toon' }, { label: 'comic' }], default: 0 },
  { id: 'hook', ask: 'Hook?', custom: true, options: [{ label: 'a' }, { label: 'b' }], default: 0 },
];

test('sanitizeAnswers drops unknown ids and out-of-range indices', () => {
  const c = P.sanitizeAnswers({ style: 1, nope: 0, hook: 9, bad: 'x' }, QS);
  assert.deepEqual(c, { style: 1 }); // hook:9 out of range, bad:'x' not custom, nope unknown
});

test('sanitizeAnswers keeps custom text for custom questions', () => {
  const c = P.sanitizeAnswers({ hook: 'my custom hook' }, QS);
  assert.deepEqual(c, { hook: 'my custom hook' });
});

test('save/load/list/delete roundtrip', () => {
  P.savePreset('cherie', { answers: { style: 2, theme: 0 }, archetype: 'eater', recipe: 'hole-eater' });
  const l = P.loadPreset('cherie');
  assert.equal(l.answers.style, 2);
  assert.equal(l.archetype, 'eater');
  assert.ok(l.created);
  const names = P.listPresets().map(p => p.name);
  assert.ok(names.includes('cherie'));
  P.deletePreset('cherie');
  assert.ok(!P.listPresets().map(p => p.name).includes('cherie'));
  assert.throws(() => P.loadPreset('cherie'), /not found/);
});

test('save rejects bad names and empty answers', () => {
  assert.throws(() => P.savePreset('../evil', { answers: { a: 1 } }), /bad preset name/);
  assert.throws(() => P.savePreset('empty', { answers: {} }), /nothing to save/);
});

test('readAnswersFile accepts bare map and {answers} wrapper', () => {
  const d = mkdtempSync(join(tmpdir(), 'gp-ans-'));
  const f1 = join(d, 'a.json'), f2 = join(d, 'b.json');
  writeFileSync(f1, JSON.stringify({ style: 1 }));
  writeFileSync(f2, JSON.stringify({ name: 'x', answers: { style: 1 } }));
  assert.deepEqual(P.readAnswersFile(f1), { style: 1 });
  assert.deepEqual(P.readAnswersFile(f2), { style: 1 });
});

test('last-answers record/read roundtrip', () => {
  const d = mkdtempSync(join(tmpdir(), 'gp-state-'));
  assert.equal(P.readLastAnswers(d), null);
  P.recordLastAnswers(d, { idea: 'x', answers: { style: 1 } });
  assert.deepEqual(P.readLastAnswers(d).answers, { style: 1 });
});
