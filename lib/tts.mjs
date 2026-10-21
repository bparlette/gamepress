// lib/tts.mjs — local text-to-speech via Kokoro (kokoro-onnx, MIT, CPU-friendly).
//
//   gamepress voice "Your script here" --voice trailer --out trailer.wav
//   gamepress setup --tts
//
// Zero API cost. The 311MB model + 27MB voices file download ONCE into
// ~/.gamepress/tts/ (override with GAMEPRESS_TTS_DIR) and are never committed.
import { existsSync, mkdirSync, writeFileSync, copyFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir, homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifest, toolDir, downloadTool } from './tools.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const BRIDGE = join(HERE, 'tts_bridge.py');

// Tool manifest is the single source of truth for URLs, sizes, sha256.
function ttsManifest() {
  const m = loadManifest()['kokoro-tts'];
  if (!m) throw new Error('kokoro-tts missing from tools.json');
  return m;
}
function fileUrl(name) {
  const f = ttsManifest().files.find(f => f.name === name);
  if (!f) throw new Error(`${name} missing from tools.json kokoro-tts files`);
  return f.url;
}

export const TTS_DIR = process.env.GAMEPRESS_TTS_DIR || toolDir('kokoro-tts');
export const MODEL_FILE = 'kokoro-v1.0.int8.onnx';
export const VOICES_FILE = 'voices-v1.0.bin';
// Back-compat exports (now read from tools.json instead of hardcoded).
export const MODEL_URL = fileUrl(MODEL_FILE);
export const VOICES_URL = fileUrl(VOICES_FILE);

// Kokoro v1.0 voice ids baked into voices-v1.0.bin.
export const VOICE_PRESETS = {
  trailer:   { voice: 'am_adam',  speed: 0.85, desc: 'deep, slow — trailers and hype' },
  character: { voice: 'af_sky',   speed: 1.15, desc: 'energetic — game characters, bots' },
  narrator:  { voice: 'af_sarah',  speed: 1.0,  desc: 'neutral — narration, explainers' },
};

export function modelPaths(dir = TTS_DIR) {
  return { dir, model: join(dir, MODEL_FILE), voices: join(dir, VOICES_FILE) };
}

export function ttsReady(dir = TTS_DIR) {
  const { model, voices } = modelPaths(dir);
  return existsSync(model) && statSync(model).size > 100_000_000 && existsSync(voices);
}

function download(url, dest) {
  // curl with progress bar; throws on failure.
  execFileSync('curl', ['-L', '--fail', '-o', dest, url], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (!existsSync(dest) || statSync(dest).size < 1_000_000) throw new Error(`download looks wrong: ${dest}`);
}

/** Download the Kokoro model + voices. Delegates to the tools manifest (single source of truth). */
export function setupTts({ dir = TTS_DIR } = {}) {
  const r = downloadTool('kokoro-tts');
  const files = r.files.map(f => f.verified ? `${f.file} (${f.verified})` : `${f.file} (${f.action})`);
  return { ok: ttsReady(dir), dir: r.dir, files };
}

function resolveVoice(name) {
  if (!name) return { ...VOICE_PRESETS.narrator, name: 'narrator' };
  if (VOICE_PRESETS[name]) return { ...VOICE_PRESETS[name], name };
  return { voice: name, speed: 1.0, name }; // raw kokoro voice id passthrough
}

/**
 * Synthesize text to a WAV file. Returns { file, seconds, voice, speed, ... }.
 * Throws a friendly error if the model is missing (run `gamepress setup --tts`).
 */
export async function speak(text, { voice = 'narrator', speed, output, dir = TTS_DIR, engine = 'kokoro' } = {}) {
  // Phonon-31m engine (Gradium, Apache-2.0, on-device)
  if (engine === 'phonon') {
    const { phononSpeak } = await import('./phonon.mjs');
    return phononSpeak(text, { voice, speed, output });
  }
  
  const t = String(text || '').trim();
  if (!t) throw new Error('empty text');
  if (!ttsReady(dir)) {
    throw new Error(`Kokoro TTS model not found in ${dir}. Run: gamepress setup --tts (downloads ~340MB once, never committed)`);
  }
  const v = resolveVoice(voice);
  const spd = speed != null ? Number(speed) : v.speed;
  const out = output ? resolve(output) : join(process.cwd(), `voice-${Date.now()}.wav`);
  mkdirSync(dirname(out), { recursive: true });
  const { model, voices } = modelPaths(dir);
  const textFile = join(tmpdir(), `gamepress-tts-${process.pid}.txt`);
  writeFileSync(textFile, t, 'utf8');
  let raw;
  try {
    raw = execFileSync('python3', [
      BRIDGE, '--model', model, '--voices', voices,
      '--voice', v.voice, '--speed', String(spd),
      '--text-file', textFile, '--out', out,
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 });
  } catch (e) {
    throw new Error(`tts bridge failed: ${(e.stderr || e.message || '').split('\n').filter(Boolean).pop()}`);
  }
  const r = JSON.parse(raw.trim().split('\n').pop());
  if (!r.ok) throw new Error(`tts failed: ${r.error}`);
  return { command: 'voice', file: r.file, seconds: r.seconds, sample_rate: r.sample_rate, chunks: r.chunks, chars: r.chars, voice: v.name, voiceId: v.voice, speed: spd };
}
