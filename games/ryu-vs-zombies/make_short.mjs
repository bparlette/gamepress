#!/usr/bin/env node
// Standalone Viral YouTube Short Producer for "Ryu vs 1000 Zombies"
// Produces 9:16 vertical 720x1280 MP4 video ready for YouTube Shorts / TikTok

import { spawn, execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { existsSync, mkdtempSync, rmSync, createReadStream, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import http from 'node:http';

const ROOT = '/Users/braidpairlette/.gemini/antigravity/scratch/gamepress/games/ryu-vs-zombies';
const OUT_DIR = join(ROOT, 'dist');
await mkdir(OUT_DIR, { recursive: true });

const DURATION_SEC = 11;
const FPS = 30;
const TOTAL_FRAMES = DURATION_SEC * FPS;
const PORT = 8996;
const CDP_PORT = 9256;

console.log('🥊 Street Fighter Ryu vs 1000 Zombies — YouTube Short Producer');
console.log(`⏱️ Duration: ${DURATION_SEC}s (${TOTAL_FRAMES} frames @ ${FPS}fps)`);

// 1. Static Server
const server = http.createServer((req, res) => {
  const rel = req.url.split('?')[0].replace(/^\//, '');
  const p = join(ROOT, rel || 'index.html');
  if (existsSync(p)) {
    const isHtml = p.endsWith('.html');
    const isJs = p.endsWith('.js');
    const isPng = p.endsWith('.png');
    const isJpg = p.endsWith('.jpg') || p.endsWith('.jpeg');
    res.writeHead(200, {
      'Content-Type': isHtml ? 'text/html' : isJs ? 'application/javascript' : isPng ? 'image/png' : isJpg ? 'image/jpeg' : 'application/octet-stream',
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

// 2. Launch Chrome Headless
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const userDataDir = mkdtempSync(join(tmpdir(), 'ryu-zombies-cdp-'));
const frameDir = mkdtempSync(join(tmpdir(), 'ryu-zombies-frames-'));

console.log(`🌐 Launching Headless Chrome (720x1280, CDP: ${CDP_PORT})...`);
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${CDP_PORT}`,
  `--user-data-dir=${userDataDir}`,
  '--window-size=720,1280',
  '--use-gl=angle',
  '--use-angle=metal',
  '--hide-scrollbars',
  `http://127.0.0.1:${PORT}/index.html`
], { stdio: ['ignore', 'pipe', 'pipe'] });

// Wait for Chrome CDP
let wsUrl = null;
for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 200));
  try {
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const tabs = await res.json();
    if (tabs && tabs[0] && tabs[0].webSocketDebuggerUrl) {
      wsUrl = tabs[0].webSocketDebuggerUrl;
      break;
    }
  } catch {}
}

if (!wsUrl) {
  console.error('❌ Failed to connect to Chrome CDP.');
  process.exit(1);
}

// 3. Connect WebSocket CDP (Standard Node.js global WebSocket)
let ws = null;
for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 200));
  try {
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const tabs = await res.json();
    const pageTab = tabs.find(t => t.type === 'page' || t.url.includes('index.html'));
    if (pageTab && pageTab.webSocketDebuggerUrl) {
      ws = new WebSocket(pageTab.webSocketDebuggerUrl);
      break;
    }
  } catch {}
}

if (!ws) {
  console.error('❌ Failed to connect to Chrome CDP.');
  process.exit(1);
}

await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let reqId = 1;
const pending = new Map();
ws.onmessage = e => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  }
};

function sendCdp(method, params = {}) {
  const id = reqId++;
  return new Promise(resolve => {
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

// Enable Page and Runtime
await sendCdp('Page.enable');
await sendCdp('Runtime.enable');
await sendCdp('Emulation.setDeviceMetricsOverride', {
  width: 720,
  height: 1280,
  deviceScaleFactor: 1,
  mobile: true
});

// Wait 1.5s for page and assets to load
await new Promise(r => setTimeout(r, 1500));

console.log(`🎬 Capturing ${TOTAL_FRAMES} gameplay frames...`);

for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
  // Advance simulation step in browser
  await sendCdp('Runtime.evaluate', {
    expression: 'if (window.__GAME__) { window.__GAME__.step(); window.__GAME__.render(); }'
  });

  // Capture screenshot of frame
  const shot = await sendCdp('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  if (shot && shot.data) {
    const framePath = join(frameDir, `frame_${String(frame).padStart(5, '0')}.jpg`);
    writeFileSync(framePath, Buffer.from(shot.data, 'base64'));
  }

  if (frame % 30 === 0) {
    process.stdout.write(`  ⏳ Rendered frame ${frame}/${TOTAL_FRAMES} (${Math.round((frame / TOTAL_FRAMES) * 100)}%)\r`);
  }
}
console.log(`\n✅ Rendered all ${TOTAL_FRAMES} frames!`);

// 4. Close Chrome & Server
ws.close();
chrome.kill();
server.close();

// 5. Generate Synth Audio Track with 8-bit arcade sounds
const audioPath = join(OUT_DIR, 'audio_retro.wav');
console.log('🎵 Generating 8-bit retro arcade audio track with sox / ffmpeg...');
const synthCommand = `
/opt/homebrew/bin/ffmpeg -y -f lavfi -i "sine=frequency=110:duration=${DURATION_SEC}" \
  -filter_complex "[0:a]volume=0.2,tremolo=f=8:d=0.8,firequalizer=gain_entry='entry(0,10);entry(200,8);entry(1000,-10)'[a]" \
  -map "[a]" "${audioPath}"
`;
try {
  execFileSync('/bin/sh', ['-c', synthCommand]);
} catch (e) {
  console.log('Audio synth fallback notice:', e.message);
}

// 6. Encode Viral Short MP4 with ffmpeg
const outMp4 = join(OUT_DIR, 'ryu_vs_1000_zombies_short.mp4');
console.log(`🎞️ Encoding final 9:16 YouTube Short to: ${outMp4}...`);

const ffmpegArgs = [
  '-y',
  '-framerate', String(FPS),
  '-i', join(frameDir, 'frame_%05d.jpg'),
];

if (existsSync(audioPath)) {
  ffmpegArgs.push('-i', audioPath);
  ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
}

ffmpegArgs.push(
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-crf', '19',
  '-preset', 'fast',
  outMp4
);

execFileSync('/opt/homebrew/bin/ffmpeg', ffmpegArgs, { stdio: 'inherit' });

// Also generate a keyframe preview image
const previewPath = join(OUT_DIR, 'ryu_zombies_preview.jpg');
const midFrame = join(frameDir, `frame_${String(Math.floor(TOTAL_FRAMES * 0.85)).padStart(5, '0')}.jpg`);
if (existsSync(midFrame)) {
  execFileSync('/bin/cp', [midFrame, previewPath]);
  console.log(`📸 Preview thumbnail saved to ${previewPath}`);
}

// Cleanup tmp
rmSync(userDataDir, { recursive: true, force: true });
rmSync(frameDir, { recursive: true, force: true });

console.log('\n🔥 VIRAL SHORT READY TO POST!');
console.log(`📁 Video: ${outMp4}`);
console.log(`📱 Specs: 720x1280 (9:16 Vertical) | ${DURATION_SEC}s @ ${FPS}fps`);
