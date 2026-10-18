// Minimal Chrome DevTools Protocol client: launch headless Chrome with a throwaway profile, talk to one page.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Find a Chrome/Chromium binary: $CHROME, then the usual macOS/Linux/Playwright locations, then PATH. Throws one actionable line. */
export function findChrome() {
  const globs = []; try { for (const d of readdirSync('/opt/pw-browsers')) globs.push(join('/opt/pw-browsers', d, 'chrome-linux', 'chrome'), join('/opt/pw-browsers', d, 'chrome-linux64', 'chrome')); } catch {}
  const c = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/opt/pw-browsers/chromium', ...globs,
    ...['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map(n => { try { return execFileSync('which', [n]).toString().trim(); } catch { return null; } })].filter(Boolean);
  const hit = c.find(p => existsSync(p));
  if (!hit) throw new Error('no Chrome found: install Google Chrome or set CHROME=/path/to/chrome');
  return hit;
}

export async function launchChrome({ width, height, scale = 1, chrome = findChrome(), onEvent = null }) {
  const profile = mkdtempSync(join(tmpdir(), 'gamepress-'));
  const port = 9300 + Math.floor(Math.random() * 600);
  const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--window-size=${width},${height}`, ...(process.platform === 'darwin' ? ['--use-angle=metal'] : ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']), '--hide-scrollbars',
    '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--allow-file-access-from-files', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  const close = async () => {
    if (proc.exitCode === null) { const ex = new Promise(r => proc.once('exit', r)); proc.kill('SIGKILL'); await Promise.race([ex, sleep(3000)]); }
    rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  };
  try {
    let wsUrl;
    for (let i = 0; i < 60 && !wsUrl; i++) { await sleep(250); try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
    if (!wsUrl) throw new Error('Chrome did not start (set CHROME=/path/to/chrome)');
    const ws = new WebSocket(wsUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const pending = new Map(); const logs = [];
    ws.onmessage = m => { const d = JSON.parse(m.data);
      if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
      else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') logs.push(d.params.args.map(a => a.value ?? a.description).join(' '));
      else if (d.method === 'Runtime.exceptionThrown') logs.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
      else if (onEvent && d.method) onEvent(d.method, d.params, send); };
    const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
    const evaluate = async expression => {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
      return r.result?.result?.value;
    };
    return { send, evaluate, logs, close: async () => { ws.close(); await close(); } };
  } catch (e) { await close(); throw e; }
}
