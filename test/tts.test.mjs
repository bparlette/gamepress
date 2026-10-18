import test from 'node:test';
import assert from 'node:assert/strict';
import { VOICE_PRESETS, MODEL_FILE, VOICES_FILE, ttsReady, modelPaths } from '../lib/tts.mjs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync } from 'node:fs';

test('VOICE_PRESETS has trailer/character/narrator with voice ids and speeds', () => {
  for (const name of ['trailer', 'character', 'narrator']) {
    const p = VOICE_PRESETS[name];
    assert.ok(p, `${name} preset exists`);
    assert.match(p.voice, /^(af|am|bf|bm)_/, `${name} has a kokoro voice id`);
    assert.ok(p.speed > 0 && p.speed < 2, `${name} speed sane`);
    assert.ok(p.desc, `${name} has a description`);
  }
});

test('MODEL_FILE is the int8 quantized model', () => {
  assert.match(MODEL_FILE, /\.int8\.onnx$/, 'int8 model');
  assert.equal(VOICES_FILE, 'voices-v1.0.bin');
});

test('ttsReady is false for an empty dir (no download triggered)', () => {
  const empty = mkdtempSync(join(tmpdir(), 'gp-tts-empty-'));
  assert.equal(ttsReady(empty), false);
});

test('modelPaths resolves model + voices under the dir', () => {
  const p = modelPaths('/tmp/fake-tts');
  assert.equal(p.model, '/tmp/fake-tts/' + MODEL_FILE);
  assert.equal(p.voices, '/tmp/fake-tts/' + VOICES_FILE);
});

test('speak throws a friendly setup error when the model is missing', async () => {
  const { speak } = await import('../lib/tts.mjs');
  const empty = mkdtempSync(join(tmpdir(), 'gp-tts-empty2-'));
  assert.throws(() => speak('hello', { dir: empty }), /gamepress setup --tts/);
});
