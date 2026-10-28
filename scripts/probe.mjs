// probe.mjs — watch a game's auto-run over time and report every end + the reason.
import { serveDir } from '/Users/braidpairlette/.gemini/antigravity/scratch/gamepress/lib/serve.mjs';
import { launchChrome } from '/Users/braidpairlette/.gemini/antigravity/scratch/gamepress/lib/cdp.mjs';
import { resolve } from 'node:path';
const DEMOS = resolve('/Users/braidpairlette/.gemini/antigravity/scratch/hawk-main/brad-demos');
const BASE = process.env.BASE || 'g/_v2';
const [id, secs = 60] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = await serveDir(DEMOS);
const page = await launchChrome({ width: 540, height: 960, scale: 1 });
await page.send('Page.navigate', { url: `http://127.0.0.1:${srv.port}/${BASE}/${id}/index.html?auto=1&pack=1&dpr=1` });
const t0 = Date.now();
let last = '';
for (let i = 0; i < secs * 4; i++) {
  await sleep(250);
  const s = await page.evaluate(`JSON.stringify({e:window.__ends||[], d:(window.__dbg?window.__dbg():window.__game)})`).catch(() => '{}');
  if (s !== last) { const o = JSON.parse(s || '{}'); console.log(`${String(((Date.now() - t0) / 1000).toFixed(1)).padStart(5)}s  ${JSON.stringify(o.d)} ${o.e?.length ? 'ENDS=' + JSON.stringify(o.e) : ''}`); last = s; }
}
if (page.logs.length) console.log('ERRORS:', page.logs.slice(0, 8));
await page.close(); srv.close();
