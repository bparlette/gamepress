// gpsnd: Cat Arcade audio v2. Tone.js (vendored, loaded in the background) renders layered synth SFX through a
// limiter + reverb, and drives a looping chiptune sequencer with per-mood patterns. Until Tone arrives (or if it never
// does) every sound plays through the tiny WebAudio fallback in gpaudio.js, so the FIRST tap already has sound.
// Every call is still logged to window.__events ({t,type,pitch}) for the video pipeline.
import { sfx as rawSfx, comboPitch, setMuted as rawMute } from './gpaudio.js';
export const events = (window.__events = window.__events || []);
export { comboPitch };

/* ---------------------------------------------------------------- sound table
   layer = [wave, f0, f1, dur, vol, delay]; 'noise' = filtered noise sweep. pitch multiplies both frequencies. */
const L = {
  jump:      [['sine', 300, 780, .13, .5], ['triangle', 620, 1500, .09, .2]],
  coin:      [['sine', 988, 988, .06, .42], ['sine', 1319, 1319, .2, .4, .06], ['triangle', 2637, 2637, .1, .1, .06]],
  coinchain: [['sine', 1319, 1319, .05, .34], ['sine', 1760, 1760, .16, .3, .05]],
  hit:       [['square', 240, 62, .11, .34], ['sawtooth', 140, 42, .18, .28], ['noise', 1900, 420, .08, .34]],
  crit:      [['square', 320, 90, .09, .4], ['sine', 1500, 700, .16, .3], ['noise', 3200, 900, .1, .36]],
  boom:      [['sawtooth', 92, 28, .48, .5], ['square', 62, 22, .42, .3], ['noise', 950, 110, .42, .48]],
  explode:   [['sawtooth', 110, 24, .55, .52], ['noise', 2600, 90, .5, .5], ['sine', 70, 28, .5, .4]],
  shoot:     [['square', 880, 230, .08, .2], ['sawtooth', 460, 120, .07, .16]],
  laser:     [['sawtooth', 1450, 300, .15, .18], ['sine', 2100, 520, .09, .13]],
  zap:       [['square', 2200, 220, .12, .2], ['noise', 4200, 700, .1, .22]],
  pop:       [['sine', 520, 940, .055, .38], ['triangle', 1040, 1820, .045, .18]],
  ding:      [['sine', 1320, 1320, .32, .32], ['sine', 1980, 1980, .22, .13]],
  perfect:   [['sine', 1568, 1568, .16, .3], ['sine', 2093, 2093, .28, .22, .07], ['triangle', 3136, 3136, .3, .1, .07]],
  click:     [['square', 1240, 900, .028, .22], ['sine', 620, 520, .045, .22]],
  merge:     [['sine', 420, 920, .15, .38], ['triangle', 820, 1840, .13, .22], ['sine', 1240, 1240, .18, .13, .07]],
  powerup:   [['square', 523, 523, .06, .24], ['square', 659, 659, .06, .24, .06], ['square', 784, 784, .06, .24, .12], ['sine', 1046, 1046, .24, .28, .18]],
  unlock:    [['triangle', 659, 659, .1, .3], ['triangle', 988, 988, .1, .3, .1], ['triangle', 1319, 1319, .34, .28, .2]],
  fanfare:   [['triangle', 523, 523, .12, .3], ['triangle', 659, 659, .12, .3, .1], ['triangle', 784, 784, .12, .3, .2], ['triangle', 1046, 1046, .4, .3, .3]],
  thud:      [['sine', 150, 44, .17, .58], ['noise', 520, 100, .09, .3]],
  drum:      [['sine', 200, 60, .12, .42], ['noise', 1400, 300, .06, .22]],
  step:      [['triangle', 230, 150, .045, .16], ['noise', 800, 320, .035, .1]],
  whoosh:    [['noise', 320, 2400, .24, .28], ['triangle', 340, 90, .18, .13]],
  slice:     [['noise', 3200, 460, .13, .3], ['sine', 1700, 420, .12, .16]],
  meow:      [['sawtooth', 900, 430, .28, .19], ['sine', 1320, 620, .24, .14]],
  bark:      [['sawtooth', 320, 150, .11, .3], ['noise', 1300, 320, .07, .28]],
  groan:     [['sawtooth', 125, 58, .46, .2], ['sine', 92, 54, .46, .23]],
  glass:     [['noise', 5200, 1600, .22, .34], ['sine', 3120, 1700, .18, .16]],
  splat:     [['noise', 900, 180, .16, .34], ['sine', 220, 70, .14, .26]],
  splash:    [['noise', 1400, 260, .2, .3], ['sine', 420, 120, .18, .22]],
  charge:    [['sawtooth', 180, 900, .3, .2], ['square', 90, 450, .3, .14]],
  shield:    [['sine', 700, 1500, .18, .26], ['triangle', 1400, 2400, .2, .18]],
  snap:      [['noise', 2600, 900, .07, .32], ['square', 600, 200, .08, .22]],
  blip:      [['square', 1500, 1500, .03, .16]],
  pour:      [['noise', 700, 1600, .18, .2], ['sine', 500, 900, .16, .14]],
  tick:      [['square', 1800, 1800, .025, .13]],
  win:       [['triangle', 523, 523, .14, .32], ['triangle', 659, 659, .14, .32, .12], ['triangle', 784, 784, .28, .32, .24], ['sine', 1568, 1568, .38, .13, .24]],
  lose:      [['sawtooth', 420, 98, .55, .28], ['square', 300, 70, .55, .18], ['sine', 200, 48, .65, .23]],
};
/* names the fallback engine doesn't know, mapped onto the closest one it does */
const ALIAS = { explode: 'boom', crit: 'ding', perfect: 'ding', glass: 'hit', splat: 'hit', splash: 'pop', charge: 'powerup', shield: 'ding', unlock: 'powerup', fanfare: 'win', snap: 'hit', blip: 'pop', coinchain: 'coin', zap: 'laser', slice: 'whoosh', pour: 'pop' };

/* ---------------------------------------------------------------- Tone.js boot (background, non-blocking) */
let Tone = null, booted = false, bootP = null, muted = false, oneShot = null, verb = null, masterVol = .85;
export const isMuted = () => muted;

function loadTone() {
  if (bootP) return bootP;
  bootP = new Promise(res => {
    if (window.Tone) { Tone = window.Tone; return res(); }
    const s = document.createElement('script');
    s.src = '../_vendor/tone.min.js'; s.async = true;
    s.onload = () => { Tone = window.Tone; res(); };
    s.onerror = () => res();
    document.head.appendChild(s);
  });
  return bootP;
}

const voices = { synth: [], noise: [] };
function pool(kind) {
  const arr = voices[kind];
  for (const v of arr) if (!v.busy) { v.busy = true; return v; }
  const v = kind === 'synth'
    ? new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: .002, decay: .12, sustain: 0, release: .03 } }).connect(oneShot)
    : new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: .001, decay: .1, sustain: 0 } }).connect(oneShot);
  v.busy = true; arr.push(v);
  while (arr.length > 14) arr.shift().dispose?.();
  return v;
}

export function boot() {
  if (booted) return Promise.resolve();
  booted = true;
  return loadTone().then(async () => {
    if (!Tone) return;
    try {
      await Tone.start();
      const lim = new Tone.Limiter(-1).toDestination();
      const comp = new Tone.Compressor({ threshold: -16, ratio: 3, attack: .004, release: .12 }).connect(lim);
      const gain = new Tone.Gain(masterVol).connect(comp);
      const bus = new Tone.Gain(1).connect(gain);
      try { verb = new Tone.Freeverb({ roomSize: .7, dampening: 2800, wet: .16 }).connect(gain); } catch (e) { verb = null; }
      oneShot = new Tone.Gain(1).connect(bus); if (verb) oneShot.connect(verb);
      makeMusic(bus);
      if (queuedMood) music(queuedMood);
    } catch (e) { console.warn('[gpsnd] tone init failed, using fallback synth', e); Tone = null; }
  });
}
if (typeof window !== 'undefined') {
  const go = () => { boot(); for (const t of ['pointerdown', 'keydown', 'touchstart']) removeEventListener(t, go, true); };
  for (const t of ['pointerdown', 'keydown', 'touchstart']) addEventListener(t, go, true);
}
export function resume() { try { if (Tone) Tone.start(); } catch (e) {} }
export const setMuted = m => { muted = !!m; rawMute(m); try { if (Tone) Tone.getDestination().mute = muted; } catch (e) {} };
export const toggleMuted = () => { setMuted(!muted); return muted; };
export function setVolume(v) { masterVol = v; try { if (Tone) Tone.getDestination().volume.value = 20 * Math.log10(Math.max(.001, v)); } catch (e) {} }

/* ---------------------------------------------------------------- SFX */
export function sfx(type, { pitch = 1, vol = 1 } = {}) {
  events.push({ t: +(performance.now() / 1000).toFixed(2), type, pitch: +pitch.toFixed(3) });
  if (muted) return;
  if (!booted) boot();
  if (!Tone || !oneShot) { rawSfx(ALIAS[type] || type, { pitch, vol }); return; }
  try {
    const t0 = Tone.now() + .002;
    for (const [w, f0, f1, dur, v, delay = 0] of (L[type] || L.pop)) {
      const at = t0 + delay;
      if (w === 'noise') {
        const n = pool('noise');
        n.triggerAttackRelease(dur, at, Math.min(1, v * vol));
        setTimeout(() => { n.busy = false; }, (delay + dur + .1) * 1000);
      } else {
        const s = pool('synth');
        try { s.oscillator.type = w; } catch (e) {}
        s.frequency.cancelScheduledValues(at);
        s.frequency.setValueAtTime(Math.max(24, f0 * pitch), at);
        s.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * pitch), at + dur);
        s.triggerAttackRelease(Math.max(24, f0 * pitch), dur, at, Math.min(1, v * vol * 1.5));
        setTimeout(() => { s.busy = false; }, (delay + dur + .12) * 1000);
      }
    }
  } catch (e) { rawSfx(ALIAS[type] || type, { pitch, vol }); }
}

/* ---------------------------------------------------------------- music
   16-step loops. '.' = rest, letters = note names (c d e f g a b, # allowed), digits 0-9 = semitone offsets. */
const MOODS = {
  action: { bpm: 150, bass: '0.0.7.0.0.5.7.b', bassOct: 0, arp: 'c.e.g.c.e.g.c.e', kick: 'x...x...x..x.x..', snare: '....x.......x...', hat: '..x...x...x...x.', cut: .5 },
  chase:  { bpm: 164, bass: '0.0.0.0.5.5.3.3', bassOct: 0, arp: 'g.e.c.e.g.b.e.g', kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', cut: .48 },
  boss:   { bpm: 138, bass: '0.0.1.0.0.3.0.5', bassOct: -1, arp: 'c.d#.g.c.d#.g.a#', kick: 'x..x..x..x..x..x', snare: '....x...x...x..x', hat: '..x..x..x..x..x.', cut: .42 },
  puzzle: { bpm: 104, bass: '0...5...3...7...', bassOct: 0, arp: 'c..e..g..c..e...', kick: 'x.......x.......', snare: '........x.......', hat: '..x...x...x...x.', cut: .55 },
  cozy:   { bpm: 96, bass: '0...4...5...2...', bassOct: 0, arp: 'c..g..e..a..c...', kick: 'x.......x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', cut: .6 },
  tense:  { bpm: 120, bass: '0...b...0...3...', bassOct: -1, arp: 'c..d#..c..f#.....', kick: 'x.....x...x.....', snare: '........x.......', hat: '..x.x...x.x.x...', cut: .5 },
  epic:   { bpm: 132, bass: '0.0.7.0.5.5.7.0', bassOct: -1, arp: 'c.g.c.e.g.c.e.g', kick: 'x...x...x...x..x', snare: '....x.......x..x', hat: 'x.x.x.x.x.x.x.x.', cut: .5 },
  menu:   { bpm: 112, bass: '0...0...5...5...', bassOct: 0, arp: 'c..e..g..b..g...', kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', cut: .58 },
};
const NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const ROOT = 48;
const tok = s => s.split('.');                       // '0.0.7' -> ['0','0','7']
const hit = (s, i) => s[i % s.length] === 'x';
const midiOf = (name, oct = 0) => {
  if (!name) return null;
  const n = NOTE[name[0]] ?? null;
  const acc = name[1] === '#' ? 1 : 0;
  if (n !== null) return ROOT + 12 + oct * 12 + n + acc;
  const d = parseInt(name, 10);
  return isNaN(d) ? null : ROOT + oct * 12 + d;
};
const noteName = m => Tone?.Frequency ? Tone.Frequency(m, 'midi').toNote() : 'C4';

let mus = null, queuedMood = null, curMood = null, musicOn = true;
function makeMusic(bus) {
  try {
    const kick = new Tone.MembraneSynth({ pitchDecay: .04, octaves: 5, envelope: { attack: .001, decay: .26, sustain: 0 } }).connect(bus);
    kick.volume.value = -4;
    const snare = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: .001, decay: .13, sustain: 0 } }).connect(bus);
    snare.volume.value = -8;
    const hat = new Tone.MetalSynth({ envelope: { attack: .001, decay: .04, release: .01 }, harmonicity: 6.1, modulationIndex: 24, resonance: 5200, octaves: 1.2 }).connect(bus);
    hat.volume.value = -26;
    const bassF = new Tone.Filter({ type: 'lowpass', frequency: 700, Q: 6 }).connect(bus);
    const bass = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: .005, decay: .2, sustain: .3, release: .12 },
      filterEnvelope: { attack: .005, decay: .22, sustain: .2, release: .2, baseFrequency: 180, octaves: 2.4 },
    }).connect(bassF);
    bass.volume.value = -10;
    const lead = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: .004, decay: .12, sustain: .1, release: .1 } }).connect(bus);
    lead.volume.value = -22;
    try { const dly = new Tone.FeedbackDelay({ delayTime: '8n.', feedback: .26, wet: .2 }).connect(bus); lead.connect(dly); } catch (e) {}
    const T = Tone.getTransport ? Tone.getTransport() : Tone.Transport;
    mus = { T, kick, snare, hat, bass, bassF, lead, step: 0, bar: 0, id: null };
    T.bpm.value = 150;
    mus.start = mood => {
      const M = MOODS[mood] || MOODS.action;
      try { T.bpm.rampTo(M.bpm, .5); } catch (e) { T.bpm.value = M.bpm; }
      try { bassF.frequency.rampTo(Math.max(300, M.cut * 1600), .4); } catch (e) {}
      if (mus.id) return;
      mus.id = T.scheduleRepeat(time => {
        const M2 = MOODS[curMood] || MOODS.action;
        const s = mus.step % 16;
        mus.step++;
        if (s === 15) mus.bar++;
        try {
          if (hit(M2.kick, s)) kick.triggerAttackRelease('C1', '8n', time, .9);
          if (hit(M2.snare, s)) snare.triggerAttackRelease('16n', time, .45);
          if (hit(M2.hat, s)) hat.triggerAttackRelease('32n', time, s % 4 ? .16 : .28);
          const bTok = tok(M2.bass)[s % tok(M2.bass).length];
          const bm = midiOf(bTok, M2.bassOct);
          if (bm != null) bass.triggerAttackRelease(noteName(bm), '16n', time, .75);
          if (s % 2 === 0) {
            const aTok = tok(M2.arp)[(s / 2) % tok(M2.arp).length];
            const am = midiOf(aTok, 0);
            if (am != null) lead.triggerAttackRelease(noteName(am + [0, 0, 7, 3][mus.bar % 4]), '16n', time, .3);
          }
        } catch (e) {}
      }, '16n');
      try { T.start(); } catch (e) {}
    };
    mus.stop = () => { if (mus.id) { T.clear(mus.id); mus.id = null; } };
  } catch (e) { console.warn('[gpsnd] music init failed', e); mus = null; }
}
/** Start / switch the loop. Call it any time; it queues until Tone is ready. */
export function music(mood = 'action') {
  queuedMood = mood;
  if (!booted) boot();
  if (!mus || !musicOn) return;
  if (curMood === mood) return;
  curMood = mood;
  mus.start(mood);
}
export function stopMusic() { if (mus) { mus.stop(); curMood = null; } }
export const pauseMusic = () => { try { mus?.T.pause(); } catch (e) {} };
export const resumeMusic = () => { try { mus?.T.start(); } catch (e) {} };
export const setMusic = on => { musicOn = on; if (!on) stopMusic(); else if (queuedMood) { curMood = null; music(queuedMood); } };
export const jingle = kind => sfx(kind === 'win' ? 'fanfare' : 'lose');
