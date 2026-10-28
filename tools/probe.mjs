// probe.mjs <path?query> [w] [h] [wait] — navigate, evaluate window.__probe(), print result + logs
import { launchChrome } from '/Users/braidpairlette/.gemini/antigravity/scratch/gamepress/lib/cdp.mjs';
import { serveDir } from '/Users/braidpairlette/.gemini/antigravity/scratch/gamepress/lib/serve.mjs';
const [, , path = 'roadster-flip/lab.html', w = '1200', h = '800', wait = '2500', expr = 'JSON.stringify(window.__probe ? window.__probe() : null)'] = process.argv;
const server = await serveDir(process.env.ROOT || '/Users/braidpairlette/.gemini/antigravity/scratch/gamepress');
const chrome = await launchChrome({ width: +w, height: +h });
try {
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: false });
  await chrome.send('Page.navigate', { url: `http://127.0.0.1:${server.port}/${path}` });
  await new Promise(r => setTimeout(r, +wait));
  const r = await chrome.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  console.log(JSON.stringify(r.result?.result?.value ?? r.result, null, 1));
  console.log('LOGS:', chrome.logs.slice(0, 12));
} catch (e) { console.error('FAIL', e.message); }
finally { await chrome.close(); server.close(); }
