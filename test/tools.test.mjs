import test from 'node:test';
import assert from 'node:assert/strict';
import { loadManifest, totalSizeMb, toolStatus, listTools } from '../lib/tools.mjs';

test('loadManifest reads tools.json with kokoro-tts and edge-tts', () => {
  const m = loadManifest();
  assert.ok(m['kokoro-tts'], 'kokoro-tts registered');
  assert.ok(m['edge-tts'], 'edge-tts registered');
  assert.equal(m['edge-tts'].type, 'network');
  assert.ok(m['kokoro-tts'].files.length >= 2, 'kokoro has model + voices files');
  for (const f of m['kokoro-tts'].files) {
    assert.ok(f.url.startsWith('https://'), `${f.name} has https URL`);
    assert.ok(f.size_mb > 0, `${f.name} has size`);
    assert.match(f.sha256 || '', /^[0-9a-f]{64}$/, `${f.name} has sha256`);
  }
});

test('totalSizeMb sums file sizes', () => {
  const m = loadManifest();
  assert.ok(totalSizeMb(m['kokoro-tts']) > 100, 'kokoro > 100MB');
  assert.equal(totalSizeMb(m['edge-tts']), 0, 'network tool = 0MB');
});

test('toolStatus reports install state without side effects', () => {
  const s = toolStatus();
  assert.ok(s['kokoro-tts'], 'kokoro status present');
  assert.equal(typeof s['kokoro-tts'].installed, 'boolean');
  assert.ok(Array.isArray(s['kokoro-tts'].files));
  assert.equal(s['edge-tts'].network, true, 'edge-tts marked as network service');
  assert.equal(s['edge-tts'].installed, null, 'network service has no install state');
});

test('listTools returns machine-readable rows', () => {
  const rows = listTools();
  assert.ok(rows.length >= 2);
  const k = rows.find(r => r.tool === 'kokoro-tts');
  assert.ok(k.version && k.description && k.license);
  assert.ok(Array.isArray(k.used_by));
});

test('another6502 is a pip tool with boolean install state', () => {
  const m = loadManifest();
  assert.ok(m['another6502'], 'another6502 registered');
  assert.deepEqual(m['another6502'].python_deps, ['another6502']);
  assert.equal(m['another6502'].files.length, 0, 'no files to download — pip install');
  const s = toolStatus();
  assert.equal(s['another6502'].network, false, 'not a network service');
  assert.equal(typeof s['another6502'].installed, 'boolean', 'installed is a real boolean');
  const r = listTools().find(x => x.tool === 'another6502');
  assert.equal(r.pip, true);
  assert.equal(typeof r.installed, 'boolean');
});
