import test from 'node:test';
import assert from 'node:assert/strict';
import { composeBGM, midiFreq, PRESETS } from '../kit/gpmusic.js';

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentaMaj: [0, 2, 4, 7, 9],
  pentaMin: [0, 3, 5, 7, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};

test('deterministic: same preset + seed composes the identical song', () => {
  assert.deepEqual(composeBGM('battle', 42), composeBGM('battle', 42));
  assert.deepEqual(composeBGM('field', 20261106), composeBGM('field', 20261106));
});

test('different seeds compose different melodies', () => {
  const a = composeBGM('field', 1).tracks.melody;
  const b = composeBGM('field', 2).tracks.melody;
  assert.notDeepEqual(a, b);
});

test('every preset: 128 steps, non-empty tracks, events in range and sorted', () => {
  for (const name of Object.keys(PRESETS)) {
    const song = composeBGM(name, 7);
    assert.equal(song.steps, 128, `${name} is 8 bars of 16ths`);
    assert.equal(song.bpm, PRESETS[name].bpm);
    for (const track of ['melody', 'bass', 'drums']) {
      const evs = song.tracks[track];
      assert.ok(evs.length > 0, `${name}/${track} is non-empty`);
      for (let i = 0; i < evs.length; i++) {
        assert.ok(evs[i].step >= 0 && evs[i].step < 128, `${name}/${track} step in range`);
        if (i > 0) assert.ok(evs[i].step >= evs[i - 1].step, `${name}/${track} sorted by step`);
      }
    }
  }
});

test('all melody and bass notes stay inside the preset scale', () => {
  for (const [name, P] of Object.entries(PRESETS)) {
    const scale = SCALES[P.scale];
    const song = composeBGM(name, 99);
    for (const track of ['melody', 'bass']) {
      for (const n of song.tracks[track]) {
        const pc = ((n.midi - P.root) % 12 + 12) % 12;
        assert.ok(scale.includes(pc), `${name}/${track} midi ${n.midi} is in ${P.scale}`);
        assert.ok(n.len === 2 || n.len === 4 || n.len === 8, `${name}/${track} len is a slot multiple`);
      }
    }
  }
});

test('drum skeletons match the preset weight', () => {
  const kinds = (song) => new Set(song.tracks.drums.map((d) => d.kind));
  const battle = kinds(composeBGM('battle', 3));
  assert.ok(battle.has('kick') && battle.has('snare') && battle.has('hat'), 'battle drives');
  const field = kinds(composeBGM('field', 3));
  assert.ok(field.has('kick') && field.has('hat'), 'field has a soft kit');
  assert.ok(!field.has('snare'), 'field stays gentle (no snare)');
});

test('melody phrases repeat: bar 5 restates bar 1 (A A-var A answer form)', () => {
  const song = composeBGM('chill', 5);
  const at = (bar) => song.tracks.melody.filter((n) => Math.floor(n.step / 16) === bar).map((n) => n.midi);
  assert.deepEqual(at(4), at(0), 'third phrase restates the motif');
});

test('midiFreq anchors at A4 = 440', () => {
  assert.equal(midiFreq(69), 440);
  assert.ok(Math.abs(midiFreq(60) - 261.63) < 0.01);
});

test('unknown preset throws with the valid list', () => {
  assert.throws(() => composeBGM('polka', 1), /unknown preset/);
});
