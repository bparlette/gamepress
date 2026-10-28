import { serveDir } from '../lib/serve.mjs';
import { launchChrome } from '../lib/cdp.mjs';
const srv = await serveDir('/Users/braidpairlette/.gemini/antigravity/scratch/hawk-main/brad-demos');
const p = await launchChrome({ width: 540, height: 960, scale: 1 });
await p.send('Page.navigate', { url: `http://127.0.0.1:${srv.port}/g/_v2/micro-tower-defense/index.html?auto=1` });
for (let i = 0; i < 9; i++) {
  await new Promise(r => setTimeout(r, 5000));
  console.log(5 * (i + 1) + 's', await p.evaluate("JSON.stringify(Object.assign(window.__dbg(), {ends:(window.__ends||[]).length}))"));
}
console.log('logs:', p.logs.length ? JSON.stringify(p.logs.slice(0, 3)).slice(0, 400) : 'clean');
await p.close(); srv.close();
