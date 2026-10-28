#!/usr/bin/env node
// make_short.mjs — generic viral Short pipeline (docs/SHORT-PIPELINE.md).
//
// One command: serve a game locally, drive headless Chrome to its
// ?short=1&auto=1 capture mode, receive the in-page MediaRecorder clip via
// POST /api/save_clip, render a full-bleed 1080x1920 MP4 with ffmpeg, and
// print the MEASURE report (real fps + per-stream durations — never quote
// the recorder's requested specs).
//
// Usage:
//   node tools/make_short.mjs --game-dir path/to/game --out dist/shorts/game_short.mp4
// Options:
//   --path /g/_v2/miso/        URL path the game is served at (default /)
//   --query short=1&auto=1     query string for capture mode (default shown, seed appended)
//   --seed 1337                RNG seed passed to the game
//   --max-seconds 240          give up if no clip arrives
//   --title-card none          reserved; the standard render is full-bleed, no card
// Env: CHROME (chrome binary), FFMPEG, FFPROBE.
// Node builtins + Chrome + ffmpeg only. No npm deps.

import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) { const k = a.slice(2); args[k] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; }
}
const gameDir = resolve(args['game-dir'] || '.');
const outPath = resolve(args.out || 'dist/shorts/short.mp4');
const urlPath = ('/' + (args.path || '')).replace(/\/{2,}/g, '/').replace(/\/?$/, '/');
const seed = args.seed || '1337';
const query = (args.query || 'short=1&auto=1') + `&seed=${seed}`;
const maxSeconds = parseInt(args['max-seconds'] || '240', 10);
const PORT = parseInt(args.port || '0', 10) || (18700 + Math.floor(Math.random() * 200));

const CHROME = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/opt/meta-chromium/chrome',
].find(p => existsSync(p));
const FFMPEG = process.env.FFMPEG || (existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg');
const FFPROBE = process.env.FFPROBE || (existsSync('/opt/homebrew/bin/ffprobe') ? '/opt/homebrew/bin/ffprobe' : 'ffprobe');
if (!CHROME) { console.error('No Chrome found. Set CHROME=<path>.'); process.exit(1); }
if (!existsSync(join(gameDir, 'index.html'))) { console.error(`No index.html in --game-dir ${gameDir}`); process.exit(1); }

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css', '.wasm': 'application/wasm' };

let clipResolve;
const clipArrived = new Promise(r => { clipResolve = r; });
const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/save_clip') {
    const parts = [];
    req.on('data', c => parts.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(parts);
      const tmp = outPath + '.webm';
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(tmp, buf);
      console.log(`[make_short] clip received: ${(buf.length / 1e6).toFixed(2)} MB`);
      res.writeHead(200); res.end('ok');
      clipResolve(tmp);
    });
    return;
  }
  let p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (p.startsWith(urlPath)) p = p.slice(urlPath.length);
  if (p === '' || p.endsWith('/')) p += 'index.html';
  const fp = join(gameDir, p);
  if (!fp.startsWith(gameDir) || !existsSync(fp)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(fp)] || 'application/octet-stream' });
  res.end(readFileSync(fp));
});

await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const url = `http://127.0.0.1:${PORT}${urlPath}?${query}`;
console.log(`[make_short] serving ${gameDir} at ${url}`);

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu-sandbox',
  '--autoplay-policy=no-user-gesture-required',
  '--window-size=1000,760', '--hide-scrollbars',
  url,
], { stdio: 'ignore' });

const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error(`no clip within ${maxSeconds}s`)), maxSeconds * 1000));
let webm;
try { webm = await Promise.race([clipArrived, timeout]); }
finally { chrome.kill('SIGKILL'); server.close(); }

// ---- render: full-bleed center-crop to 1080x1920, durations matched ----
const probe = (f) => JSON.parse(spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,avg_frame_rate,duration,nb_frames,sample_rate,channels', '-show_entries', 'format=duration', '-of', 'json', f], { encoding: 'utf8' }).stdout);
const src = probe(webm);
const vIn = src.streams.find(s => s.codec_type === 'video');
const aIn = src.streams.find(s => s.codec_type === 'audio');
const minDur = Math.min(parseFloat(vIn?.duration || 0), parseFloat(aIn?.duration || 0));
console.log(`[make_short] source: video ${vIn?.duration}s, audio ${aIn?.duration}s -> trim to ${minDur.toFixed(2)}s`);

const ff = spawnSync(FFMPEG, ['-y', '-v', 'error', '-i', webm,
  '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
  '-t', minDur.toFixed(3),
  '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', outPath], { encoding: 'utf8' });
if (ff.status !== 0) { console.error(ff.stderr); process.exit(1); }

// ---- MEASURE report: quote these numbers, not the recorder's request ----
const out = probe(outPath);
const v = out.streams.find(s => s.codec_type === 'video');
const a = out.streams.find(s => s.codec_type === 'audio');
const realFps = v && v.nb_frames && v.duration ? (parseInt(v.nb_frames, 10) / parseFloat(v.duration)) : NaN;
const gap = (v && a) ? Math.abs(parseFloat(v.duration) - parseFloat(a.duration)) : NaN;
console.log('\n[make_short] MEASURE report');
console.log(`  file:     ${outPath}`);
console.log(`  video:    ${v?.width}x${v?.height}, ${realFps ? realFps.toFixed(1) : '?'} fps (measured), ${v?.duration}s`);
console.log(`  audio:    ${a ? `aac ${a.sample_rate}Hz ${a.channels}ch, ${a.duration}s` : 'NONE'}`);
console.log(`  duration: ${out.format?.duration}s (format)`);
if (!a) console.log('  WARNING: no audio stream — the game audio tap is not connected.');
if (gap > 0.25) console.log(`  WARNING: A/V duration gap ${gap.toFixed(2)}s > 0.25s.`);
console.log('  Next: frame-grab the stunt timestamps and loudness-check a silent stretch before delivering.');
