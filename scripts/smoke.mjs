// smoke.mjs — load Cat Arcade v2 games in headless Chrome, report errors / fps / ends, save screenshots.
// usage: node scripts/smoke.mjs <id> [id...]   (env SECS, SHOTS=1, HOLD=1, Q=1 to add ?hold=1)
import { serveDir } from '../lib/serve.mjs';
import { launchChrome } from '../lib/cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMOS = resolve(HERE, '../../hawk-main/brad-demos');
const ids = process.argv.slice(2);
const SECS = +(process.env.SECS || 9);
const OUT = process.env.OUT || '/tmp/catv2';
mkdirSync(OUT, { recursive: true });
const srv = await serveDir(DEMOS);
const base = `http://127.0.0.1:${srv.port}`;

const results = [];
for (const id of ids) {
  const page = await launchChrome({ width: 540, height: 960, scale: 2 });
  const qs = `?auto=1&pack=1&dpr=${process.env.DPR || 1}${process.env.Q ? '&hold=1' : ''}${process.env.ARGS ? '&' + process.env.ARGS : ''}`;
  const url = `${base}/g/_v2/${id}/index.html${qs}`;
  let info = { id, url };
  try {
    await page.send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, SECS * 1000));
    info.state = await page.evaluate('JSON.stringify(window.__game||null)').catch(e => 'ERR ' + e.message);
    info.stats = await page.evaluate('JSON.stringify(window.__gpStats||null)').catch(() => null);
    info.ends = await page.evaluate('JSON.stringify(window.__ends||[])').catch(() => '[]');
    info.fps = await page.evaluate(`new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<1000)requestAnimationFrame(f);else r(n)};requestAnimationFrame(f)})`).catch(() => -1);
    info.result = await page.evaluate('JSON.stringify(window.__result||null)').catch(() => null);
    if (process.env.SHOTS) {
      const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
      writeFileSync(`${OUT}/${id}.jpg`, Buffer.from(shot.result.data, 'base64'));
    }
  } catch (e) { info.fatal = e.message; }
  info.errors = page.logs.slice(0, 12);
  await page.close();
  results.push(info);
  const ok = !info.fatal && !info.errors.length && info.fps > 20;
  console.log(`${ok ? '✅' : '❌'} ${id}  fps=${info.fps} errors=${info.errors.length}`);
  if (info.errors.length) info.errors.forEach(e => console.log('    ! ' + String(e).slice(0, 300)));
  if (info.fatal) console.log('    !! ' + info.fatal);
  console.log('    state ' + String(info.state).slice(0, 200));
}
writeFileSync(`${OUT}/report.json`, JSON.stringify(results, null, 2));
srv.close(); process.exit(0);
