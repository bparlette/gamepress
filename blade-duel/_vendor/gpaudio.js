// gpaudio: layered synth sfx (2-3 oscillators per sound) with pitch control, so combos/streaks can climb in pitch. Every call is logged to
// window.__events as {t,type,pitch}; `gamepress drive` rebuilds the audio offline from that log (presets/sfx.json, pitch via asetrate).
export const events = (window.__events = window.__events || []);
let ac, muted = false;
export const setMuted = m => { muted = m; };
/** layer = [wave, f0, f1, dur, vol, delay]; wave 'noise' = filtered noise burst */
const L = {
  jump: [['sine', 300, 760, .14, .5], ['triangle', 600, 1500, .1, .22]],
  coin: [['sine', 988, 988, .07, .45], ['sine', 1319, 1319, .22, .45, .07], ['triangle', 2637, 2637, .12, .12, .07]],
  hit: [['square', 220, 60, .12, .35], ['sawtooth', 130, 40, .2, .3], ['noise', 1800, 400, .09, .35]],
  boom: [['sawtooth', 90, 28, .5, .5], ['square', 60, 20, .45, .3], ['noise', 900, 120, .45, .5]],
  shoot: [['square', 880, 220, .09, .22], ['sawtooth', 440, 110, .08, .18]],
  laser: [['sawtooth', 1400, 300, .16, .2], ['sine', 2100, 500, .1, .15]],
  pop: [['sine', 500, 900, .06, .4], ['triangle', 1000, 1800, .05, .2]],
  ding: [['sine', 1320, 1320, .35, .35], ['sine', 1980, 1980, .25, .15]],
  click: [['square', 1200, 900, .03, .25], ['sine', 600, 500, .05, .25]],
  merge: [['sine', 400, 900, .16, .4], ['triangle', 800, 1800, .14, .25], ['sine', 1200, 1200, .2, .15, .08]],
  powerup: [['square', 523, 523, .07, .25], ['square', 659, 659, .07, .25, .07], ['square', 784, 784, .07, .25, .14], ['sine', 1046, 1046, .25, .3, .21]],
  thud: [['sine', 140, 45, .18, .6], ['noise', 500, 100, .1, .3]],
  step: [['triangle', 220, 160, .05, .18], ['noise', 700, 300, .04, .12]],
  whoosh: [['noise', 300, 2200, .25, .3], ['triangle', 320, 90, .2, .15]],
  meow: [['sawtooth', 900, 420, .3, .2], ['sine', 1300, 600, .25, .15]],
  bark: [['sawtooth', 300, 150, .12, .3], ['noise', 1200, 300, .08, .3]],
  groan: [['sawtooth', 120, 60, .5, .22], ['sine', 90, 55, .5, .25]],
  win: [['triangle', 523, 523, .15, .35], ['triangle', 659, 659, .15, .35, .13], ['triangle', 784, 784, .3, .35, .26], ['sine', 1568, 1568, .4, .15, .26]],
  lose: [['sawtooth', 400, 100, .6, .3], ['square', 300, 70, .6, .2], ['sine', 200, 50, .7, .25]],
  tick: [['square', 1800, 1800, .03, .15]],
};
let nbuf;
export function sfx(type, { pitch = 1, vol = 1 } = {}) {
  events.push({ t: +(performance.now() / 1000).toFixed(2), type, pitch: +pitch.toFixed(3) });
  if (muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (!nbuf) { nbuf = ac.createBuffer(1, ac.sampleRate * .5, ac.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t0 = ac.currentTime;
    for (const [w, f0, f1, dur, v, delay = 0] of L[type] || L.pop) {
      const g = ac.createGain(); g.connect(ac.destination); const t = t0 + delay; g.gain.setValueAtTime(v * vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur + .02);
      if (w === 'noise') { const s = ac.createBufferSource(), f = ac.createBiquadFilter(); s.buffer = nbuf; f.type = 'bandpass'; f.frequency.setValueAtTime(f0 * pitch, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1 * pitch), t + dur); s.connect(f); f.connect(g); s.start(t); s.stop(t + dur + .05); }
      else { const o = ac.createOscillator(); o.type = w; o.frequency.setValueAtTime(f0 * pitch, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * pitch), t + dur); o.connect(g); o.start(t); o.stop(t + dur + .05); }
    }
  } catch {}
}
/** Pitch for the nth hit of a streak: one semitone per step, capped at an octave. */
export const comboPitch = n => 2 ** (Math.min(Math.max(n, 0), 12) / 12);
