// shot.mjs <urlPath?query> <out.png> [w] [h] [waitMs]
import { launchChrome } from '/Users/braidpairlette/.gemini/antigravity/scratch/gamepress/lib/cdp.mjs';
import { serveDir } from '/Users/braidpairlette/.gemini/antigravity/scratch/gamepress/lib/serve.mjs';
import { writeFileSync } from 'node:fs';

const [, , path = 'roadster-flip/lab.html', out = '/tmp/shot.png', w = '1500', h = '950', wait = '2200'] = process.argv;
const dir = process.env.ROOT || '/Users/braidpairlette/.gemini/antigravity/scratch/gamepress';
const server = await serveDir(dir);
const chrome = await launchChrome({ width: +w, height: +h });
try {
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: false });
  await chrome.send('Page.navigate', { url: `http://127.0.0.1:${server.port}/${path}` });
  await new Promise(r => setTimeout(r, +wait));
  const r = await chrome.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(out, Buffer.from(r.result.data, 'base64'));
  const errs = chrome.logs.filter(l => /error|Error/.test(l));
  console.log('saved', out, errs.length ? '\nPAGE ERRORS:\n' + errs.slice(0, 8).join('\n') : '');
} catch (e) { console.error('FAIL', e.message, chrome.logs.slice(0, 8)); process.exitCode = 1; }
finally { await chrome.close(); server.close(); }
