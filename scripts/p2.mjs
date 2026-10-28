import { serveDir } from '../lib/serve.mjs';
import { launchChrome } from '../lib/cdp.mjs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const id = process.argv[2], secs = +(process.argv[3] || 20);
const srv = await serveDir('/Users/braidpairlette/.gemini/antigravity/scratch/hawk-main/brad-demos');
const p = await launchChrome({ width: 540, height: 960, scale: 1 });
await p.send('Page.navigate', { url: `http://127.0.0.1:${srv.port}/g/_v2/${id}/index.html?auto=1&pack=1&dpr=1` });
for (let i = 0; i < secs; i++) {
  await sleep(1000);
  let st = 'ERR';
  try { st = await p.evaluate('JSON.stringify({s:window.__game,e:(window.__ends||[]).length, l:(window.__logs||[]).length})'); } catch (e) { st = 'EVAL ' + e.message; }
  console.log(i + 1, String(st).slice(0, 300));
}
console.log('LOGS', JSON.stringify(p.logs.slice(0, 4)));
await p.close(); srv.close(); process.exit(0);
