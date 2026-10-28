import { serveDir } from '../lib/serve.mjs';
import { launchChrome } from '../lib/cdp.mjs';
const srv = await serveDir('/Users/braidpairlette/.gemini/antigravity/scratch/hawk-main/brad-demos');
const p = await launchChrome({ width: 540, height: 960, scale: 1 });
await p.send('Page.navigate', { url: `http://127.0.0.1:${srv.port}/g/_v2/micro-tower-defense/index.html?auto=1` });
for (let i = 0; i < 17; i++) { await new Promise(r => setTimeout(r, 4000)); console.log(4*(i+1)+'s', await p.evaluate("JSON.stringify({w:__dbg().wave,lv:__dbg().lives,g:__dbg().gold,ph:__dbg().phase,t:__dbg().t,tw:__dbg().towers,ends:(window.__ends||[]).length})")); }
console.log('LOGS:', JSON.stringify(p.logs.slice(0,2)).slice(0,300));
await p.close(); srv.close();
