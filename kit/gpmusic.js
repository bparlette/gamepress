// gpmusic: seeded procedural BGM composer — one call turns a genre preset +
// a seed into a full loop (melody / bass / drums as step data), the way
// Pyxel's gen_bgm does it for its fantasy console. gamepress had SFX
// (gpaudio) and a music drone (gpfeel) but nothing that composes a song;
// this fills that gap. The generator is pure and deterministic — same
// preset + seed, same song, on every machine — so a game's music passes
// the same seedcheck discipline as its gameplay. playBGM is a thin
// WebAudio scheduler over the generated data; games may also render the
// tracks themselves (offline trailer audio, gpfeel's virtual APU, ...).
//
// composeBGM(preset, seed) -> { preset, seed, bpm, steps: 128,
//   tracks: { melody: [{step, midi, len}], bass: [...], drums: [{step, kind}] } }
// Steps are 16th notes; 128 steps = 8 bars. Melody/bass events are placed
// on 8th-note slots (even steps). len is in steps.

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentaMaj: [0, 2, 4, 7, 9],
  pentaMin: [0, 3, 5, 7, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};

// prog = chord roots as scale degrees, one per bar, looped over 8 bars.
export const PRESETS = {
  field:   { bpm: 116, root: 60, scale: 'pentaMaj', prog: [0, 4, 5, 3], density: 0.62, bass: 'pulse',  drums: 'soft',  arp: false, wave: 'triangle' },
  battle:  { bpm: 138, root: 57, scale: 'minor',    prog: [0, 5, 3, 6], density: 0.80, bass: 'drive',  drums: 'drive', arp: false, wave: 'square' },
  chill:   { bpm: 84,  root: 62, scale: 'pentaMaj', prog: [0, 3, 4, 5], density: 0.40, bass: 'sparse', drums: 'soft',  arp: false, wave: 'sine' },
  dungeon: { bpm: 96,  root: 55, scale: 'phrygian', prog: [0, 0, 6, 5], density: 0.50, bass: 'sparse', drums: 'soft',  arp: false, wave: 'triangle' },
  title:   { bpm: 104, root: 60, scale: 'major',    prog: [0, 4, 5, 3], density: 0.66, bass: 'pulse',  drums: 'soft',  arp: true,  wave: 'square' },
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const midiFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

const STEPS = 128; // 8 bars of 16ths
const SLOTS = 64;  // 8th-note slots melody/bass are written on

export function composeBGM(presetName, seed = 1) {
  const P = PRESETS[presetName];
  if (!P) throw new Error(`gpmusic: unknown preset "${presetName}" (have: ${Object.keys(PRESETS).join(', ')})`);
  const rnd = mulberry32(seed * 2654435761 + 97);
  const scale = SCALES[P.scale];
  const nDeg = scale.length;
  // melody pool: two octaves of scale degrees above the root
  const poolSize = nDeg * 2 + 1;
  const degToMidi = (deg, base) => base + scale[deg % nDeg] + 12 * Math.floor(deg / nDeg);
  const chordDeg = (bar) => P.prog[bar % P.prog.length];
  const chordTones = (bar) => {
    const c = chordDeg(bar);
    return [0, 2, 4].map((o) => (c + o) % nDeg);
  };
  const isChordTone = (deg, bar) => chordTones(bar).includes(deg % nDeg);

  // ---- melody: phrases [A, A-variation, A, answer] of 2 bars each.
  // slotDeg[slot] = pool degree, -1 = sustain previous, null = rest.
  const slotDeg = new Array(SLOTS).fill(null);
  const walkPhrase = (startSlot, startDeg, endDeg) => {
    let deg = startDeg;
    let sounding = 0; // slots remaining in the current note
    for (let s = 0; s < 16; s++) {
      const slot = startSlot + s;
      if (sounding > 0) { slotDeg[slot] = -1; sounding--; continue; }
      const lastSlot = s === 15;
      if (!lastSlot && rnd() > P.density) { slotDeg[slot] = null; continue; }
      if (lastSlot || (s >= 12 && rnd() < 0.5)) {
        // land the phrase on the requested degree (nearest pool position)
        let best = deg, bd = 1e9;
        for (let d = 0; d < poolSize; d++) if (d % nDeg === endDeg % nDeg && Math.abs(d - deg) < bd) { bd = Math.abs(d - deg); best = d; }
        deg = best;
      } else if (P.arp) {
        const bar = Math.floor(slot / 8);
        const tones = [];
        for (let d = 0; d < poolSize; d++) if (isChordTone(d, bar)) tones.push(d);
        deg = tones[Math.floor(rnd() * tones.length)];
      } else {
        const step = [0, -1, 1, -2, 2, -3, 3][Math.floor(rnd() * 7)];
        deg = Math.min(poolSize - 1, Math.max(0, deg + step));
      }
      slotDeg[slot] = deg;
      if (rnd() < 0.25 && s < 14) sounding = 1; // occasional 2-slot note
    }
    return deg;
  };
  const startDeg = nDeg + 2;
  const endA = walkPhrase(0, startDeg, chordDeg(0));
  // A-variation: replay A's rhythm, re-walk the last 4 slots
  for (let s = 0; s < 12; s++) slotDeg[16 + s] = slotDeg[s];
  let deg = slotDeg[27] >= 0 ? slotDeg[27] : startDeg;
  slotDeg.fill(null, 28, 32);
  let sounding = 0;
  for (let s = 28; s < 32; s++) {
    if (sounding > 0) { slotDeg[s] = -1; sounding--; continue; }
    if (s === 31) {
      let best = deg, bd = 1e9;
      for (let d = 0; d < poolSize; d++) if (d % nDeg === chordDeg(2) % nDeg && Math.abs(d - deg) < bd) { bd = Math.abs(d - deg); best = d; }
      deg = best;
    } else {
      deg = Math.min(poolSize - 1, Math.max(0, deg + [0, -1, 1, -2, 2][Math.floor(rnd() * 5)]));
    }
    slotDeg[s] = deg;
    if (rnd() < 0.25 && s < 30) sounding = 1;
  }
  for (let s = 0; s < 16; s++) slotDeg[32 + s] = slotDeg[s]; // A again
  walkPhrase(48, endA, 0); // answer phrase, lands on the tonic

  const melody = [];
  for (let s = 0; s < SLOTS; s++) {
    const d = slotDeg[s];
    if (d === null || d === -1) continue;
    let len = 2;
    if (slotDeg[s + 1] === -1) len = 4;
    melody.push({ step: s * 2, midi: degToMidi(d, P.root + 12), len });
  }

  // ---- bass: chord roots (and fifths) an octave+ below the melody base.
  const bass = [];
  const bassMidi = (bar, off) => degToMidi(chordDeg(bar) + off, P.root - 12);
  for (let bar = 0; bar < 8; bar++) {
    const b0 = bar * 16;
    if (P.bass === 'sparse') {
      bass.push({ step: b0, midi: bassMidi(bar, 0), len: 8 });
      bass.push({ step: b0 + 8, midi: bassMidi(bar, 4), len: 8 });
    } else {
      // pulse/drive: root on every 8th, fifth on the bar's second half beats
      for (let e = 0; e < 8; e++) {
        const off = e === 4 || e === 6 ? 4 : 0;
        bass.push({ step: b0 + e * 2, midi: bassMidi(bar, off), len: 2 });
      }
    }
  }

  // ---- drums: fixed bar skeletons + seeded ghost hats.
  const drums = [];
  for (let bar = 0; bar < 8; bar++) {
    const b0 = bar * 16;
    if (P.drums === 'drive') {
      for (const s of [0, 4, 8, 12]) drums.push({ step: b0 + s, kind: 'kick' });
      for (const s of [4, 12]) drums.push({ step: b0 + s, kind: 'snare' });
      for (let s = 0; s < 16; s += 2) drums.push({ step: b0 + s, kind: 'hat' });
      if (rnd() < 0.6) drums.push({ step: b0 + 14, kind: 'ohat' });
    } else { // soft
      drums.push({ step: b0, kind: 'kick' });
      if (P.bpm >= 100) drums.push({ step: b0 + 8, kind: 'kick' });
      for (let s = 4; s < 16; s += 4) drums.push({ step: b0 + s, kind: 'hat' });
      if (rnd() < 0.4) drums.push({ step: b0 + 7, kind: 'hat' });
    }
  }
  drums.sort((a, b) => a.step - b.step);

  return { preset: presetName, seed, bpm: P.bpm, steps: STEPS, tracks: { melody, bass, drums } };
}

// ---- WebAudio playback (browser only; the data above is the product).
export function playBGM(song, { vol = 0.5 } = {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ac = new AC();
  const master = ac.createGain();
  master.gain.value = vol;
  master.connect(ac.destination);
  const stepDur = 60 / song.bpm / 4;
  let nextStep = 0;
  let nextTime = ac.currentTime + 0.06;
  let stopped = false;

  const noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  const tone = (midi, t, lenSteps, type, v) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = midiFreq(midi);
    const dur = Math.max(0.05, lenSteps * stepDur * 0.92);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  };
  const drum = (kind, t) => {
    if (kind === 'kick') {
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.16);
    } else {
      const src = ac.createBufferSource(); src.buffer = noiseBuf;
      const f = ac.createBiquadFilter();
      f.type = kind === 'snare' ? 'bandpass' : 'highpass';
      f.frequency.value = kind === 'snare' ? 1800 : 7000;
      const g = ac.createGain();
      const dur = kind === 'hat' ? 0.04 : kind === 'ohat' ? 0.16 : 0.11;
      g.gain.setValueAtTime(kind === 'snare' ? 0.28 : 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t); src.stop(t + dur + 0.02);
    }
  };

  const byStep = new Map();
  const add = (step, fn) => { if (!byStep.has(step)) byStep.set(step, []); byStep.get(step).push(fn); };
  for (const n of song.tracks.melody) add(n.step, (t) => tone(n.midi, t, n.len, PRESETS[song.preset].wave, 0.16));
  for (const n of song.tracks.bass) add(n.step, (t) => tone(n.midi, t, n.len, 'triangle', 0.22));
  for (const d of song.tracks.drums) add(d.step, (t) => drum(d.kind, t));

  const timer = setInterval(() => {
    if (stopped) return;
    while (nextTime < ac.currentTime + 0.12) {
      const fns = byStep.get(nextStep);
      if (fns) for (const fn of fns) fn(nextTime);
      nextTime += stepDur;
      nextStep = (nextStep + 1) % song.steps;
    }
  }, 40);

  return {
    stop() {
      stopped = true;
      clearInterval(timer);
      master.disconnect();
      ac.close();
    },
  };
}
