// fpsprobe.mjs — where are the frames going? measures fps with post on vs off, and at a few post scales.
//   node scripts/fpsprobe.mjs cat-runner mini-metroidvania rail-runner
import { serveDir } from '../lib/serve.mjs';
import { launchChrome } from '../lib/cdp.mjs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMOS = resolve(HERE, '../../hawk-main/brad-demos');
const ids = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FPS = `new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<1500)requestAnimationFrame(f);else r(Math.round(n/1.5))};requestAnimationFrame(f)})`;

const srv = await serveDir(DEMOS);
const variants = [
  ['post on  ', '?auto=1'],
  ['post off ', '?auto=1&nopost=1'],
  ['post .45 ', '?auto=1&postq=.45'],
  ['post .30 ', '?auto=1&postq=.30'],
];

for (const id of ids) {
  const row = [];
  for (const [label, qs] of variants) {
    const page = await launchChrome({ width: 540, height: 960, scale: 1 });
    await page.send('Page.navigate', { url: `http://127.0.0.1:${srv.port}/g/_v2/${id}/index.html${qs}` });
    await sleep(1200);
    await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 270, y: 700, id: 1 }] });
    await sleep(50);
    await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(400);
    const f = await page.evaluate(FPS).catch(() => -1);
    await page.close();
    row.push(`${label}${String(f).padStart(4)}`);
  }
  console.log(id.padEnd(22) + row.join('  '));
}
srv.close();
