// audio.js — procedural Web Audio: one noise buffer, envelope helpers, a compressor on the master,
// rate-limited SFX and a gothic step-sequenced score (organ pad, bass, harpsichord arps, drums, choir) whose
// layers follow intensity. Scheduled from the game loop against the audio clock; no timers.
export class Audio {
  constructor() { this.ctx = null; this.muted = false; this.intensity = 0; this.step = 0; this.next = 0; this.last = {}; this.heart = 0; this.boss = false; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !this.paused) this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -16; this.comp.ratio.value = 5; this.comp.attack.value = 0.004; this.comp.release.value = 0.2;
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(this.comp); this.comp.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.75; this.sfx.connect(this.master);
    this.mus = c.createGain(); this.mus.gain.value = 0.42; this.mus.connect(this.master);
    const len = c.sampleRate * 1.0, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = b; this.next = c.currentTime + 0.1;
    // reverb-ish: feedback delay for the score
    this.dl = c.createDelay(1); this.dl.delayTime.value = 0.31; this.fb = c.createGain(); this.fb.gain.value = 0.32;
    this.dlf = c.createBiquadFilter(); this.dlf.type = 'lowpass'; this.dlf.frequency.value = 1800;
    this.mus.connect(this.dl); this.dl.connect(this.dlf); this.dlf.connect(this.fb); this.fb.connect(this.dl); this.dlf.connect(this.master);
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.02); }
  pause(p) { this.paused = p; if (!this.ctx) return; if (p) this.ctx.suspend(); else this.ctx.resume(); }
  ok(name, gap) { if (!this.ctx || this.muted || this.ctx.state !== 'running') return false; const t = this.ctx.currentTime; if (this.last[name] && t - this.last[name] < gap) return false; this.last[name] = t; return true; }
  env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  tone(type, f0, f1, dur, vol, out = this.sfx, t = this.ctx.currentTime, a = 0.005) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    this.env(g, t, a, vol, dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + a + dur + 0.05);
  }
  hiss(dur, vol, type, f, q = 1, out = this.sfx, t = this.ctx.currentTime, f1) {
    const c = this.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; s.loop = true; fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this.env(g, t, 0.004, vol, dur); s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  play(name, a = 0) {
    switch (name) {
      case 'hit': if (this.ok('hit', 0.045)) { this.hiss(0.05, 0.12, 'bandpass', 1800 + Math.random() * 900, 2); this.tone('square', 260 + Math.random() * 60, 120, 0.05, 0.04); } break;
      case 'kill': if (this.ok('kill', 0.05)) { this.hiss(0.09, 0.1, 'lowpass', 2400, 1, undefined, undefined, 300); } break;
      case 'gem': if (this.ok('gem', 0.035)) { const f = 880 * Math.pow(2, Math.min(a, 24) / 24); this.tone('triangle', f, f * 1.5, 0.07, 0.07); } break;
      case 'gold': if (this.ok('gold', 0.06)) { this.tone('square', 1320, 1320, 0.05, 0.04); this.tone('square', 1760, 1760, 0.12, 0.04, this.sfx, this.ctx.currentTime + 0.05); } break;
      case 'slash': if (this.ok('slash', 0.08)) this.hiss(0.16, 0.18, 'bandpass', 900, 0.8, undefined, undefined, 4200); break;
      case 'throw': if (this.ok('throw', 0.07)) this.hiss(0.06, 0.07, 'highpass', 3000, 1); break;
      case 'zap': if (this.ok('zap', 0.08)) this.tone('sawtooth', 1400, 300, 0.12, 0.04); break;
      case 'whoosh': if (this.ok('whoosh', 0.1)) this.hiss(0.22, 0.1, 'bandpass', 500, 1.2, undefined, undefined, 1400); break;
      case 'splash': if (this.ok('splash', 0.1)) { this.hiss(0.3, 0.14, 'bandpass', 1200, 1.5, undefined, undefined, 400); this.tone('sine', 700, 1400, 0.12, 0.05); } break;
      case 'thunder': if (this.ok('thunder', 0.12)) { this.hiss(0.08, 0.3, 'highpass', 2500, 1); this.hiss(0.5, 0.25, 'lowpass', 600, 1, undefined, undefined, 80); } break;
      case 'aura': if (this.ok('aura', 0.4)) this.tone('sine', 140, 90, 0.18, 0.06); break;
      case 'books': this.ok('books', 0.5) && this.tone('triangle', 520, 780, 0.2, 0.06); break;
      case 'hurt': if (this.ok('hurt', 0.12)) { this.tone('sawtooth', 220, 70, 0.22, 0.16); this.hiss(0.15, 0.2, 'lowpass', 900, 1); } break;
      case 'dash': if (this.ok('dash', 0.1)) { this.hiss(0.22, 0.2, 'bandpass', 600, 1, undefined, undefined, 3000); this.tone('sine', 300, 900, 0.15, 0.06); } break;
      case 'level': if (this.ok('level', 0.2)) { const t = this.ctx.currentTime; [523, 659, 784, 1047].forEach((f, i) => this.tone('square', f, f, 0.16, 0.06, this.sfx, t + i * 0.07)); } break;
      case 'pick': if (this.ok('pick', 0.05)) this.tone('triangle', 660, 990, 0.08, 0.08); break;
      case 'chest': if (this.ok('chest', 0.3)) { const t = this.ctx.currentTime; [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone('triangle', f, f, 0.3, 0.07, this.sfx, t + i * 0.09)); this.hiss(1.2, 0.05, 'highpass', 6000, 1, this.sfx, t); } break;
      case 'evolve': { const t = this.ctx && this.ctx.currentTime; if (!this.ok('evolve', 0.5)) break; [261, 329, 392, 523].forEach((f) => { this.tone('sawtooth', f, f, 1.6, 0.035, this.sfx, t, 0.3); this.tone('sine', f * 2, f * 2, 1.6, 0.03, this.sfx, t, 0.3); }); break; }
      case 'heal': if (this.ok('heal', 0.3)) { this.tone('sine', 523, 1047, 0.3, 0.07); } break;
      case 'vacuum': if (this.ok('vacuum', 0.3)) { this.tone('sine', 200, 1600, 0.6, 0.08); this.hiss(0.6, 0.06, 'bandpass', 400, 2, undefined, undefined, 3000); } break;
      case 'break': if (this.ok('break', 0.08)) { this.hiss(0.2, 0.2, 'bandpass', 1400, 2, undefined, undefined, 500); this.tone('square', 900, 600, 0.06, 0.04); } break;
      case 'elite': if (this.ok('elite', 0.2)) { this.tone('sawtooth', 110, 40, 0.5, 0.18); this.hiss(0.4, 0.25, 'lowpass', 1200, 1, undefined, undefined, 100); } break;
      case 'warn': if (this.ok('warn', 0.25)) { this.tone('square', 196, 196, 0.12, 0.06); } break;
      case 'stinger': if (this.ok('stinger', 1)) { const t = this.ctx.currentTime; [[147, 0], [139, 0.3], [110, 0.6]].forEach(([f, d]) => { this.tone('sawtooth', f, f, 0.6, 0.09, this.sfx, t + d, 0.02); this.tone('sawtooth', f * 1.5, f * 1.5, 0.6, 0.05, this.sfx, t + d, 0.02); }); } break;
      case 'scythe': if (this.ok('scythe', 0.2)) { this.hiss(0.35, 0.3, 'bandpass', 400, 1, undefined, undefined, 3000); this.tone('sawtooth', 90, 50, 0.35, 0.12); } break;
      case 'die': if (this.ctx) { const t = this.ctx.currentTime; [392, 311, 261, 196].forEach((f, i) => this.tone('sawtooth', f, f * 0.98, 0.5, 0.08, this.sfx, t + i * 0.22)); this.hiss(1.2, 0.15, 'lowpass', 800, 1, this.sfx, t, 60); } break;
      case 'win': if (this.ctx) { const t = this.ctx.currentTime; [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone('square', f, f, 0.28, 0.06, this.sfx, t + i * 0.12)); [261, 329, 392].forEach((f) => this.tone('sawtooth', f, f, 2.4, 0.03, this.sfx, t + 0.8, 0.4)); } break;
      case 'ui': if (this.ok('ui', 0.04)) this.tone('square', 740, 740, 0.04, 0.04); break;
    }
  }
  // call every frame: schedules the score ~0.25s ahead on the audio clock
  tick(playing, hpFrac) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx, BPM = this.boss ? 132 : 112, sp = 60 / BPM / 4;
    if (this.next < c.currentTime - 0.5) this.next = c.currentTime + 0.05;
    // D harmonic minor progression, 4 bars of 16 steps
    const prog = [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]];
    while (this.next < c.currentTime + 0.25) {
      const t = this.next, s = this.step % 16, bar = (this.step >> 4) % 4, ch = prog[bar], I = playing ? this.intensity : 0.5;
      const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
      if (s === 0) for (const m of ch) { this.tone('sawtooth', mf(m), mf(m), sp * 15, 0.018, this.mus, t, 0.25); this.tone('triangle', mf(m + 12), mf(m + 12), sp * 15, 0.014, this.mus, t, 0.3); }
      if (s % 4 === 0 || s === 14) this.tone('triangle', mf(ch[0] - 12), mf(ch[0] - 12), sp * 3, 0.09, this.mus, t);
      if (I > 0.2) { const arp = [0, 1, 2, 1, 0, 2, 1, 2]; const m = ch[arp[s % 8]] + 12 + (s >= 8 ? 12 : 0); this.tone('square', mf(m), mf(m), sp * 0.9, 0.022, this.mus, t); }
      if (I > 0.45) { if (s % 8 === 0) { this.tone('sine', 120, 40, 0.18, 0.2, this.mus, t); } if (s % 8 === 4) this.hiss(0.12, 0.1, 'bandpass', 1800, 0.9, this.mus, t); if (s % 2 === 1) this.hiss(0.03, 0.03, 'highpass', 7000, 1, this.mus, t); }
      if (I > 0.75 && (s === 0 || s === 8)) { const m = ch[2] + 24; this.tone('sine', mf(m), mf(m), sp * 7, 0.025, this.mus, t, 0.15); this.tone('sine', mf(m) * 1.005, mf(m) * 1.005, sp * 7, 0.02, this.mus, t, 0.15); }
      this.next += sp; this.step++;
    }
    // heartbeat when low on health
    if (playing && hpFrac < 0.3 && c.currentTime > this.heart) {
      this.heart = c.currentTime + 0.55 + hpFrac * 1.5;
      this.tone('sine', 70, 45, 0.12, 0.25, this.sfx); this.tone('sine', 65, 40, 0.1, 0.18, this.sfx, c.currentTime + 0.16);
    }
  }
}
