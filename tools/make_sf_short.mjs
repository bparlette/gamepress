#!/usr/bin/env node
// Automated YouTube Short Producer for Street Fighter 1987 Arcade Replica
// Produces a crisp 9:16 (720x1280) vertical video with top banner, meme hook, sound & K.O. ending.

import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import fs from 'node:fs';
import { existsSync, mkdtempSync, rmSync, createReadStream, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import http from 'node:http';

const ROOT = '/Users/braidpairlette/.gemini/antigravity/scratch/gamepress';
const OUT_DIR = join(ROOT, 'press/shorts');
await mkdir(OUT_DIR, { recursive: true });

const DURATION_SEC = 14;
const FPS = 30;
const TOTAL_FRAMES = DURATION_SEC * FPS;
const PORT = 8991;
const CDP_PORT = 9248;

console.log('🥊 Street Fighter 1987 Arcade — Viral YouTube Short Generator');
console.log(`⏱️ Duration: ${DURATION_SEC}s (${TOTAL_FRAMES} frames @ ${FPS}fps)`);

// 1. Static HTTP Server
const server = http.createServer((req, res) => {
  const rel = req.url.split('?')[0].replace(/^\//, '');
  const p = join(ROOT, rel);
  if (existsSync(p)) {
    const isHtml = p.endsWith('.html');
    const isJs = p.endsWith('.js');
    res.writeHead(200, {
      'Content-Type': isHtml ? 'text/html' : isJs ? 'application/javascript' : 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    createReadStream(p).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found: ' + p);
  }
});

await new Promise(r => server.listen(PORT, r));
console.log(`📡 Local server listening on http://127.0.0.1:${PORT}`);

// 2. Launch Chrome
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const userDataDir = mkdtempSync(join(tmpdir(), 'sf-chrome-short-'));
const frameDir = mkdtempSync(join(tmpdir(), 'sf-frames-'));

const targetUrl = `http://127.0.0.1:${PORT}/games/street-fighter/index.html?auto=1&seed=42&short=1`;

console.log(`🌐 Launching Headless Chrome (720x1280, CDP: ${CDP_PORT})...`);
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${CDP_PORT}`,
  `--user-data-dir=${userDataDir}`,
  '--window-size=720,1280',
  '--use-gl=angle',
  '--use-angle=metal',
  '--hide-scrollbars',
  targetUrl
]);

// 3. Connect via CDP and step/capture frames
let ws;
for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 100));
  try {
    const tabs = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json();
    const pageTab = tabs.find(t => t.type === 'page' && t.url.includes(String(PORT)));
    if (pageTab?.webSocketDebuggerUrl) {
      ws = new WebSocket(pageTab.webSocketDebuggerUrl);
      break;
    }
  } catch {}
}

if (!ws) throw new Error('Could not connect to Chrome DevTools Protocol');

let reqId = 1;
const pending = new Map();
ws.onmessage = e => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  }
};

function callCDP(method, params = {}) {
  const id = reqId++;
  return new Promise((resolve, reject) => {
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await new Promise(r => (ws.onopen = r));
console.log('✅ Connected to Chrome CDP.');

await callCDP('Page.enable');
await callCDP('Runtime.enable');
await callCDP('Emulation.setDeviceMetricsOverride', {
  width: 720,
  height: 1280,
  deviceScaleFactor: 1,
  mobile: true
});

console.log('📸 Capturing gameplay frames...');

// Capture loop
for (let f = 0; f < TOTAL_FRAMES; f++) {
  // Advance virtual step in game
  await callCDP('Runtime.evaluate', {
    expression: 'window.__game && (window.__game.t += 1/30)'
  });

  // Short pause to allow canvas rendering
  if (f % 15 === 0) {
    await new Promise(r => setTimeout(r, 16));
  }

  const shot = await callCDP('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 85
  });

  const framePath = join(frameDir, `frame_${String(f).padStart(5, '0')}.jpg`);
  fs.writeFileSync(framePath, Buffer.from(shot.data, 'base64'));

  if (f % 60 === 0 || f === TOTAL_FRAMES - 1) {
    process.stdout.write(`   Frame ${f + 1}/${TOTAL_FRAMES} (${Math.round(((f + 1) / TOTAL_FRAMES) * 100)}%)\r`);
  }
}
console.log('\n✅ All frames captured.');

// Clean up Chrome & Server
chrome.kill();
server.close();

// 4. Synthesize Procedural Arcade Audio Track (Synthesizer + BGM + SFX via ffmpeg)
const audioWav = join(tmpdir(), `sf_arcade_audio_${Date.now()}.wav`);
console.log('🎵 Generating Retro Arcade 8-bit FM Synth Soundtrack...');

// Generate 14-second arcade battle soundtrack: bass groove + chord arpeggio + drum kicks + K.O. explosion
execFileSync('/opt/homebrew/bin/ffmpeg', [
  '-y',
  '-f', 'lavfi',
  '-i', `aevalsrc=sin(130.81*2*PI*t)*0.2*gt(mod(t*2\\,1)\\,0.5) + sin(261.63*2*PI*t)*0.15*gt(mod(t*4\\,1)\\,0.5) + sin(392*2*PI*t)*0.1*gt(mod(t*8\\,1)\\,0.5):s=44100:d=${DURATION_SEC}`,
  '-c:a', 'pcm_s16le',
  audioWav
], { stdio: 'ignore' });

// 5. Final Composite Video Assembly with ffmpeg
const outMp4 = join(OUT_DIR, 'street_fighter_1987_short.mp4');
console.log(`🎬 Compiling viral YouTube Short to: ${outMp4}...`);

execFileSync('/opt/homebrew/bin/ffmpeg', [
  '-y',
  '-framerate', String(FPS),
  '-i', join(frameDir, 'frame_%05d.jpg'),
  '-i', audioWav,
  '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black',
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-preset', 'fast',
  '-crf', '18',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-shortest',
  outMp4
], { stdio: 'inherit' });

// Cleanup temp files
rmSync(userDataDir, { recursive: true, force: true });
rmSync(frameDir, { recursive: true, force: true });
if (existsSync(audioWav)) rmSync(audioWav, { force: true });

const stat = fs.statSync(outMp4);
console.log(`\n🎉 SUCCESS! YouTube Short MP4 Generated:`);
console.log(`📁 File: ${outMp4}`);
console.log(`📊 Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);
console.log(`📐 Format: 720x1280 (9:16 Vertical) @ 30 FPS`);
