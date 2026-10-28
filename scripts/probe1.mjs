// probe one game: load it directly, wait, dump logs + __dbg + __ends
import { serveDir } from '../lib/serve.mjs';
import { launchChrome } from '../lib/cdp.mjs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMOS = resolve(HERE, '../../hawk-main/brad-demos');
const id = process.argv[2];
const q = process.argv[3] || '?auto=1&pack=1&dpr=1';
const wait = +(process.argv[4] || 6000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = await serveDir(DEMOS);
const p = await launchChrome({ width: 540, height: 960, scale: 1 });
p.send('Runtime.enable').catch(() => {});
await p.send('Page.navigate', { url: `http://127.0.0.1:${srv.port}/g/_v2/${id}/index.html${q}` });
const t0 = Date.now();
for (let i = 0; i < wait / 1000; i++) {
  await sleep(1000);
  const dbg = await p.evaluate('JSON.stringify(window.__dbg?window.__dbg():(window.__game||null))').catch(e => 'EVALERR ' + e.message);
  const ends = await p.evaluate('JSON.stringify(window.__ends||[])').catch(() => '[]');
  console.log(`t=${((Date.now() - t0) / 1000).toFixed(0)}s dbg=${String(dbg).slice(0, 240)} ends=${ends}`);
  if (ends && ends !== '[]') break;
}
console.log('LOGS:', JSON.stringify(p.logs.slice(0, 5), null, 1));
await p.close(); srv.close(); process.exit(0);
