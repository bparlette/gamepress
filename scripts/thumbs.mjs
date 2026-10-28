// thumbs.mjs — render real in-game card art for every Cat Arcade v2 game.
//   node scripts/thumbs.mjs [id ...]
// Loads each game in headless Chrome with ?auto=1 so it's mid-action (not a title card),
// grabs a frame at 540x960 @2x, and writes thumbs/<id>-v2.webp into the deploy repo.
import { serveDir } from '../lib/serve.mjs';
import { launchChrome } from '../lib/cdp.mjs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';

const DEMOS = resolve('/Users/braidpairlette/.gemini/antigravity/scratch/hawk-main/brad-demos');
const THUMBS = resolve(DEMOS, 'thumbs');
const AT = +(process.env.AT || 4200);      // ms into the run to grab the frame

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(resolve(DEMOS, 'g/_v2'), { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('_') && existsSync(resolve(DEMOS, 'g/_v2', d.name, 'game.js')))
      .map(d => d.name);

mkdirSync(THUMBS, { recursive: true });
const srv = await serveDir(DEMOS);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, bad = 0;

for (const id of ids) {
  const page = await launchChrome({ width: 540, height: 960, scale: 1 });
  try {
    await page.send('Page.navigate', { url: `http://127.0.0.1:${srv.port}/g/_v2/${id}/index.html?auto=1&dpr=2` });
    await sleep(AT);
    const shot = await page.send('Page.captureScreenshot', { format: 'png' });
    const png = resolve('/tmp', `thumb-${id}.png`);
    writeFileSync(png, Buffer.from(shot.result.data, 'base64'));
    const webp = resolve(THUMBS, `${id}-v2.webp`);
    execFileSync('cwebp', ['-quiet', '-q', '82', '-resize', '540', '0', png, '-o', webp]);
    const errs = page.logs.filter(l => /error|Error|Uncaught/.test(typeof l === 'string' ? l : JSON.stringify(l)));
    console.log(`✔ ${id.padEnd(22)} ${errs.length ? '⚠ ' + errs.length + ' console errors' : ''}`);
    ok++;
  } catch (e) {
    console.log(`✖ ${id.padEnd(22)} ${e.message}`);
    bad++;
  } finally { await page.close(); }
}
await srv.close?.();
console.log(`\n${ok} thumbnails written, ${bad} failed → ${THUMBS}`);
