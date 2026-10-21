// lib/phonon.mjs — Gradium Phonon-31m TTS (Apache-2.0, on-device, 31M params).
//
//   gamepress voice "Your script here" --engine phonon --voice narrator
//   gamepress voices <script.json> --engine phonon
//
// Zero API cost. ~64MB model downloads ONCE from HuggingFace into
// ~/.cache/huggingface/ (override with HF_HOME) and is never committed.
// Voice files cached from gradium/phonon-voices.
//
// Phonon-31m is ~5x smaller than Kokoro (64MB vs 311MB+27MB) and
// vendor-claims better quality at 2.6x smaller (not independently verified).
import { existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { writeFileSync } from 'node:fs';

// Phonon voice presets (named voices from gradium/phonon-voices).
// Maps gamepress voice roles to Phonon named voices.
export const PHONON_VOICES = {
  trailer:   { voice: 'Easton',  speed: 0.85, desc: 'deep, slow — trailers and hype' },
  character: { voice: 'Easton',  speed: 1.15, desc: 'energetic — game characters, bots' },
  narrator:  { voice: 'Easton',  speed: 1.0,  desc: 'neutral — narration, explainers' },
};

export function resolvePhononVoice(voice) {
  if (PHONON_VOICES[voice]) return { name: voice, ...PHONON_VOICES[voice] };
  // Assume it's a direct Phonon voice name
  return { name: voice, voice, speed: 1.0, desc: 'custom Phonon voice' };
}

/**
 * Synthesize speech with Phonon-31m via the `ptts` CLI.
 * Requires: `uvx ptts` or `pip install ptts` (only dep: numpy, core is Rust).
 * First run downloads the 64MB model from HuggingFace (cached after).
 */
export function phononSpeak(text, { voice = 'narrator', speed, output } = {}) {
  const t = String(text || '').trim();
  if (!t) throw new Error('empty text');
  
  const v = resolvePhononVoice(voice);
  const spd = speed != null ? Number(speed) : v.speed;
  const out = output ? output : join(process.cwd(), `voice-phonon-${Date.now()}.wav`);
  mkdirSync(dirname(out), { recursive: true });
  
  // Use uvx to run ptts (no install needed) or fall back to ptts directly
  let cmd, args;
  try {
    execFileSync('uvx', ['--version'], { stdio: 'ignore' });
    cmd = 'uvx';
    args = ['ptts', '--lang', 'en', '--quant', 'q8', '--voice', v.voice, '--speed', String(spd), t, '-o', out];
  } catch {
    // Fall back to direct ptts (must be installed via pip)
    cmd = 'ptts';
    args = ['--lang', 'en', '--quant', 'q8', '--voice', v.voice, '--speed', String(spd), t, '-o', out];
  }
  
  try {
    execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 });
  } catch (e) {
    const err = (e.stderr || e.message || '').toString().split('\n').filter(Boolean).pop();
    throw new Error(`phonon tts failed: ${err} (is ptts installed? try: uvx ptts --help)`);
  }
  
  if (!existsSync(out)) throw new Error(`phonon tts failed: no output file at ${out}`);
  
  // Get duration via ffprobe if available
  let seconds = 0;
  try {
    const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', out], { encoding: 'utf8' });
    seconds = parseFloat(dur.trim()) || 0;
  } catch {}
  
  return {
    command: 'voice',
    file: out,
    seconds: Math.round(seconds * 100) / 100,
    sample_rate: 24000,
    chars: t.length,
    voice: v.name,
    voiceId: v.voice,
    speed: spd,
    engine: 'phonon',
  };
}
