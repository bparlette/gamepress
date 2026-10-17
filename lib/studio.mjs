// gamepress studio tools: voices (Edge TTS + post-processing), version (bump + changelog),
// icons (PWA icon set). No npm dependencies; needs ffmpeg.
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, basename, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

const ensure = d => mkdirSync(d, { recursive: true });

// ------------------------------------------------------------------ Edge TTS (pure Node, no deps)
// Reverse-engineered WebSocket protocol for speech.platform.bing.com (Edge Read Aloud).
const EDGE_WS = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const EDGE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';

function timestamp() {
  return new Date().toISOString();
}

function ssml(text, voice, rate, pitch) {
  // rate: "+5%" / "-10%" / "1.0" (multiplier); pitch: "-15Hz" / "+0Hz"
  let rateAttr = String(rate || '+0%');
  if (/^[\d.]+$/.test(rateAttr)) rateAttr = `+${Math.round((Number(rateAttr) - 1) * 100)}%`;
  if (/^[+-]?\d+$/.test(rateAttr)) rateAttr += '%';
  const pitchAttr = String(pitch || '+0Hz').endsWith('Hz') ? pitch : `${pitch}Hz`;
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
    `<voice name='${voice}'><prosody rate='${rateAttr}' pitch='${pitchAttr}'>${esc}</prosody></voice></speak>`;
}

/** Synthesize text to an MP3 file via Edge TTS. Returns bytes written. */
export async function edgeTts(text, voice, outMp3, { rate, pitch, timeoutSec = 60 } = {}) {
  // Prefer the `edge-tts` CLI if installed (pip install edge-tts) — it handles tokens/retries.
  // Otherwise use the built-in WebSocket client (may be blocked from some networks).
  const cli = (() => { try { return execFileSync(process.platform === 'win32' ? 'where' : 'which', ['edge-tts'], { encoding: 'utf8' }).trim().split('\n')[0]; } catch { return null; } })();
  if (cli) {
    let rateArg = String(rate || '+0%');
    if (/^[\d.]+$/.test(rateArg)) rateArg = `+${Math.round((Number(rateArg) - 1) * 100)}%`;
    if (/^[+-]?\d+$/.test(rateArg)) rateArg += '%';
    const pitchArg = String(pitch || '+0Hz').endsWith('Hz') ? pitch : `${pitch}Hz`;
    execFileSync(cli, ['--voice', voice, '--rate', rateArg, '--pitch', pitchArg, '--write-media', outMp3, '--text', text],
      { stdio: ['ignore', 'ignore', 'pipe'], timeout: timeoutSec * 1000 });
    if (!existsSync(outMp3)) throw new Error('edge-tts CLI produced no output');
    return statSync(outMp3).size;
  }
  return edgeTtsSocket(text, voice, outMp3, { rate, pitch, timeoutSec });
}

/** Built-in WebSocket Edge TTS client (no dependencies). May be blocked from datacenter IPs. */
async function edgeTtsSocket(text, voice, outMp3, { rate, pitch, timeoutSec = 60 } = {}) {
  const ws = new WebSocket(EDGE_WS, { headers: { 'User-Agent': EDGE_UA, Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfoldn' } });
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('Edge TTS connect failed (network or blocked)')); });
  const chunks = [];
  const done = new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error(`Edge TTS timed out after ${timeoutSec}s for: ${text.slice(0, 40)}...`)), timeoutSec * 1000);
    ws.onmessage = async ev => {
      const data = ev.data;
      if (typeof data === 'string') {
        if (data.includes('Path:turn.end')) { clearTimeout(to); ws.close(); res(); }
        else if (data.includes('Path:turn.start')) { /* ignore */ }
      } else {
        // Binary: 2-byte header length, header text, then audio payload
        const buf = Buffer.from(await data.arrayBuffer());
        const hlen = buf.readUInt16BE(0);
        const header = buf.subarray(2, 2 + hlen).toString('utf8');
        if (header.includes('Path:audio')) chunks.push(buf.subarray(2 + hlen));
      }
    };
    ws.onerror = () => { clearTimeout(to); rej(new Error('Edge TTS socket error')); };
  });
  const ts = () => timestamp().replace('Z', '') + 'Z';
  ws.send(`X-Timestamp:${ts()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
    `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`);
  ws.send(`X-RequestId:${randomUUID()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts()}\r\nPath:ssml\r\n\r\n${ssml(text, voice, rate, pitch)}`);
  await done;
  if (!chunks.length) throw new Error(`Edge TTS returned no audio for voice ${voice} (voice removed? try another)`);
  writeFileSync(outMp3, Buffer.concat(chunks));
  return statSync(outMp3).size;
}

/** ffprobe duration in seconds. */
function duration(file) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());
}

/**
 * Post-process chain (matches the HOA Warfare voice standard):
 *  - 0.2s leading silence, 0.3s trailing silence
 *  - 80ms fade-out at the end
 *  - MP3 -> OGG (libvorbis)
 */
export function postProcess(inMp3, outOgg) {
  const d = duration(inMp3);
  const total = 0.2 + d + 0.3;
  const fadeStart = Math.max(0, total - 0.08).toFixed(3);
  // 24kHz mono matches Edge output; concat silence + audio + silence, then fade the tail
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono:d=0.2',
    '-i', inMp3,
    '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono:d=0.3',
    '-filter_complex', `[0:a][1:a][2:a]concat=n=3:v=0:a=1,aresample=48000,afade=t=out:st=${fadeStart}:d=0.08[a]`,
    '-map', '[a]', '-c:a', 'libvorbis', '-q:a', '4', outOgg],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  return duration(outOgg);
}

// ------------------------------------------------------------------ voices
/**
 * voices <script.json>: batch Edge TTS + standard post-processing.
 * script.json: { lines: [{id, text, voice, rate?, pitch?}], defaults?: {voice, rate, pitch} }
 * Output: press/vo/<id>.ogg + press/vo/manifest.json. Resumable: skips ids already in the manifest.
 */
export async function voices(scriptFile, { dir = 'press', out = 'vo' } = {}) {
  const script = JSON.parse(readFileSync(scriptFile, 'utf8'));
  const lines = script.lines || script;
  if (!Array.isArray(lines) || !lines.length) throw new Error('script.json needs a lines array: [{id, text, voice}]');
  const defaults = script.defaults || {};
  const voDir = join(dir, out);
  ensure(voDir);
  const manFile = join(voDir, 'manifest.json');
  const manifest = existsSync(manFile) ? JSON.parse(readFileSync(manFile, 'utf8')) : { generated_at: null, lines: {} };

  let done = 0, skipped = 0;
  for (const [i, line] of lines.entries()) {
    const { id } = line;
    if (!id || !line.text) throw new Error(`line ${i}: needs {id, text}`);
    const ogg = join(voDir, `${id}.ogg`);
    if (manifest.lines[id] && existsSync(ogg)) { skipped++; continue; }
    const voice = line.voice || defaults.voice || 'en-US-AriaNeural';
    const rate = line.rate || defaults.rate || '+0%';
    const pitch = line.pitch || defaults.pitch || '+0Hz';
    // Trailing "..." gives the TTS a natural trailing pause (HOA Warfare standard)
    const text = line.text.endsWith('...') ? line.text : line.text + '...';
    const mp3 = join(voDir, `${id}.mp3`);
    process.stdout.write(`  [${i + 1}/${lines.length}] ${id} (${voice}) ... `);
    try {
      await edgeTts(text, voice, mp3, { rate, pitch });
      const dur = postProcess(mp3, ogg);
      manifest.lines[id] = { file: `${id}.ogg`, duration: Math.round(dur * 100) / 100, voice, rate, pitch, chars: line.text.length };
      try { (await import('node:fs')).unlinkSync(mp3); } catch {}
      console.log(`${dur.toFixed(2)}s`);
      done++;
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
      if (e.message.includes('connect failed') || e.message.includes('403') || e.message.includes('timed out')) {
        console.log(`  hint: Edge TTS may block this network. Install the CLI: pip install edge-tts`);
      }
      manifest.lines[id] = { file: null, error: e.message, voice };
    }
    // Save manifest incrementally so a crash doesn't lose progress
    manifest.generated_at = new Date().toISOString();
    writeFileSync(manFile, JSON.stringify(manifest, null, 2));
  }
  manifest.generated_at = new Date().toISOString();
  writeFileSync(manFile, JSON.stringify(manifest, null, 2));
  return { total: lines.length, synthesized: done, skipped, failed: lines.length - done - skipped, manifest: manFile };
}

// ------------------------------------------------------------------ version
/**
 * version [major|minor|patch]: bump version in package.json (or press/version.json),
 * prepend a changelog template to CHANGELOG.md.
 */
export function bumpVersion(part = 'patch', { dir = '.' } = {}) {
  if (!['major', 'minor', 'patch'].includes(part)) throw new Error('usage: gamepress version [major|minor|patch]');
  const pkgFile = join(dir, 'package.json');
  const verFile = join(dir, 'press', 'version.json');
  let file, data;
  if (existsSync(pkgFile)) { file = pkgFile; data = JSON.parse(readFileSync(pkgFile, 'utf8')); }
  else { file = verFile; ensure(dirname(verFile)); data = existsSync(verFile) ? JSON.parse(readFileSync(verFile, 'utf8')) : { version: '0.0.0' }; }
  const [maj, min, pat] = String(data.version || '0.0.0').split('.').map(Number);
  const next = part === 'major' ? `${maj + 1}.0.0` : part === 'minor' ? `${maj}.${min + 1}.0` : `${maj}.${min}.${pat + 1}`;
  data.version = next;
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');

  const cl = join(dir, 'CHANGELOG.md');
  const today = new Date().toISOString().slice(0, 10);
  const entry = `## [${next}] - ${today}\n\n- \n\n`;
  const prev = existsSync(cl) ? readFileSync(cl, 'utf8') : '# Changelog\n\n';
  writeFileSync(cl, prev.replace(/^# Changelog\n/, `# Changelog\n\n${entry}`));
  return { from: `${maj}.${min}.${pat}`, to: next, file, changelog: cl };
}

// ------------------------------------------------------------------ icons
/**
 * icons --logo <png>: PWA icon set + manifest + Open Graph snippet from one logo.
 * Output: press/out/icons/
 */
export function makeIcons(logoFile, { dir = 'press', name = 'Game', shortName } = {}) {
  if (!logoFile || !existsSync(logoFile)) throw new Error('usage: gamepress icons --logo <logo.png>');
  const out = join(dir, 'out', 'icons');
  ensure(out);
  const sizes = [
    ['favicon-32x32.png', 32], ['apple-touch-icon.png', 180],
    ['icon-192x192.png', 192], ['icon-512x512.png', 512],
  ];
  for (const [f, s] of sizes) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', logoFile, '-vf', `scale=${s}:${s}:force_original_aspect_ratio=increase,crop=${s}:${s},setsar=1`, join(out, f)]);
  }
  const manifest = {
    name, short_name: shortName || name, display: 'standalone', start_url: '.', background_color: '#000000', theme_color: '#000000',
    icons: [
      { src: 'icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const og =
`<!-- gamepress icons: paste into <head> -->
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32x32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="manifest" href="icons/manifest.json">
<meta property="og:image" content="icons/icon-512x512.png">
<meta property="og:title" content="${name}">
<meta name="twitter:card" content="summary_large_image">
`;
  writeFileSync(join(out, 'og-snippet.html'), og);
  return { dir: out, files: [...sizes.map(([f]) => f), 'manifest.json', 'og-snippet.html'] };
}

// ------------------------------------------------------------------ ttsHook (Edge TTS + macOS say fallback)
/**
 * Synthesize a single punchy voiceover hook line to WAV (48kHz mono).
 * Uses Edge TTS if reachable, otherwise falls back to macOS `say` (works 100% offline).
 */
export async function ttsHook(text, outWav, { voice = 'en-US-ChristopherNeural', rate = '+8%', pitch = '+0Hz' } = {}) {
  const clean = String(text || '').replace(/[#*_~`]/g, '').trim();
  if (!clean) return null;
  ensure(dirname(outWav));
  const tmpMp3 = outWav.replace(/\.wav$/i, '.tmp.mp3');
  try {
    await edgeTts(clean, voice, tmpMp3, { rate, pitch, timeoutSec: 12 });
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmpMp3, '-ar', '48000', '-ac', '1', outWav]);
    try { (await import('node:fs')).unlinkSync(tmpMp3); } catch {}
    return outWav;
  } catch {
    if (process.platform === 'darwin') {
      const tmpAiff = outWav.replace(/\.wav$/i, '.tmp.aiff');
      try {
        execFileSync('say', ['-r', '205', '-o', tmpAiff, clean], { stdio: 'ignore' });
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmpAiff, '-ar', '48000', '-ac', '1', outWav]);
        try { (await import('node:fs')).unlinkSync(tmpAiff); } catch {}
        return outWav;
      } catch {}
    }
    return null;
  }
}

// ------------------------------------------------------------------ compositeCapsuleLogo
/**
 * Composite a high-contrast game title logo overlay onto a store capsule image using ffmpeg drawbox/drawtext.
 * Used by `pack` for Steam/itch capsules that require the game's title/logo in the art.
 */
export function compositeCapsuleLogo(imgPath, title, { subtitle = '', pos = 'bottom' } = {}) {
  if (!title || !existsSync(imgPath)) return false;
  const fontCandidates = [
    '/System/Library/Fonts/Supplemental/Impact.ttf',
    '/System/Library/Fonts/Helvetica.ttc',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  ];
  const font = fontCandidates.find(f => existsSync(f));
  if (!font) return false;
  const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'json', imgPath]).toString());
  const s = (info.streams || [])[0] || {};
  const w = s.width || 460, h = s.height || 215;
  const cleanTitle = String(title).toUpperCase().replace(/[':\\]/g, '');
  const fontSize = Math.max(16, Math.min(Math.round(h * 0.2), Math.round((w * 0.84) / Math.max(6, cleanTitle.length * 0.62))));
  const boxH = Math.round(fontSize * (subtitle ? 2.1 : 1.55));
  const boxY = pos === 'center' ? Math.round((h - boxH) / 2) : Math.round(h - boxH - h * 0.06);
  const textY = boxY + Math.round((boxH - fontSize) / 2) + 2;
  const tmp = imgPath.replace(/(\.\w+)$/, '.logo$1');
  const vf = [
    `drawbox=x=0:y=${boxY}:w=${w}:h=${boxH}:color=black@0.62:t=fill`,
    `drawtext=fontfile='${font}':text='${cleanTitle}':fontsize=${fontSize}:fontcolor=#ffd34d:borderw=${Math.max(2, Math.round(fontSize / 10))}:bordercolor=black:shadowcolor=black@0.85:shadowx=3:shadowy=3:x=(w-text_w)/2:y=${textY}`,
  ].join(',');
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', imgPath, '-vf', vf, '-frames:v', '1', tmp]);
    if (existsSync(tmp)) {
      writeFileSync(imgPath, readFileSync(tmp));
      try { execFileSync('rm', ['-f', tmp]); } catch {}
      return true;
    }
  } catch {}
  return false;
}

