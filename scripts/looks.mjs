// looks.mjs — the "does this look like a $5 game" audit that a headless bot *can* judge.
// Functional QA proves a game works; juice.mjs proves feedback exists in the source;
// this one looks at the actual pixels: a screen that is flat, dim or empty reads as cheap
// no matter how many particles the source claims to have.
//
//   node scripts/looks.mjs [id ...]
//
// Per game it samples 3 moments mid-run on the ?auto=1 bot and reports:
//   lum   mean brightness (0-255)          — too dark (<26) reads as unfinished
//   var   luminance spread (stddev)        — flat (<18) means no depth or detail
//   col   distinct hues present            — grey (<14) means a one-colour scene
//   edge  % of pixels on a hard edge       — busy enough to read at a glance
import { serveDir } from '../lib/serve.mjs';
import { launchChrome } from '../lib/cdp.mjs';
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DEMOS = resolve('/Users/braidpairlette/.gemini/antigravity/scratch/hawk-main/brad-demos');
const V2 = resolve(DEMOS, 'g/_v2');
const ids = process.argv.slice(2).length ? process.argv.slice(2)
  : readdirSync(V2, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('_') && existsSync(resolve(V2, d.name, 'game.js'))).map(d => d.name).sort();

const srv = await serveDir(DEMOS);
const sample = `(() => {
  const c = document.querySelector('canvas'); if (!c) return null;
  const g2 = c.getContext('2d'), W = c.width, H = c.height;
  if (c.width < 8) return null;
  const d = g2.getImageData(0, 0, W, H).data;
  let n = 0, sum = 0, sum2 = 0, hues = new Set(), edge = 0;
  const step = 4 * 7;                       // sample every 7th pixel
  for (let i = 0; i < d.length; i += step) {
    const r = d[i], gg = d[i + 1], b = d[i + 2];
    const l = .2126 * r + .7152 * gg + .0722 * b;
    sum += l; sum2 += l * l; n++;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), sat = mx ? (mx - mn) / mx : 0;
    if (sat > .28 && mx > 40) { let h = 0; if (mx === r) h = ((gg - b) / (mx - mn)) % 6; else if (mx === gg) h = (b - r) / (mx - mn) + 2; else h = (r - gg) / (mx - mn) + 4; hues.add(Math.round(((h * 60) + 360) % 360 / 24)); }
  }
  for (let y = 1; y < H - 1; y += 3) for (let x = 1; x < W - 1; x += 3) {
    const a = (y * W + x) * 4, b2 = (y * W + x + 2) * 4;
    if (Math.abs(d[a] - d[b2]) + Math.abs(d[a + 1] - d[b2 + 1]) + Math.abs(d[a + 2] - d[b2 + 2]) > 60) edge++;
  }
  const mean = sum / n, sd = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  const edges = edge / ((H / 3) * (W / 3));
  return { lum: +mean.toFixed(1), v: +sd.toFixed(1), col: hues.size, e: +(edges * 100).toFixed(1) };
})()`;

const rows = [];
for (const id of ids) {
  const p = await launchChrome({ width: 540, height: 960, scale: 1 });
  try {
    await p.send('Page.navigate', { url: `http://127.0.0.1:${srv.port}/g/_v2/${id}/index.html?auto=1` });
    const acc = [];
    let blank = 0;
    for (const wait of [1500, 1800, 1800, 1500, 1500]) {
      await new Promise(r => setTimeout(r, wait));
      const s = await p.evaluate(sample);
      if (!s) continue;
      if (s.lum === 0 && s.v === 0) { blank++; if (blank > 2) break; continue; }   // a cleared frame under load is not a verdict
      acc.push(s);
      if (acc.length === 3) break;
    }
    if (!acc.length) { console.log(`n/a   ${id.padEnd(22)} canvas unreadable (all-black frames)`); continue; }
    const avg = k => acc.reduce((a, s) => a + s[k], 0) / acc.length;
    const lum = avg('lum'), v = avg('v'), col = Math.max(...acc.map(s => s.col)), e = avg('e');
    const flags = [];
    if (lum < 26) flags.push('dark');
    if (v < 18) flags.push('flat');
    if (col < 14) flags.push('grey');
    if (e < 1.6) flags.push('empty');
    const verdict = flags.length >= 2 ? 'WEAK' : flags.length ? 'ok- ' : 'GOOD';
    console.log(`${verdict} ${id.padEnd(22)} lum=${String(lum.toFixed(0)).padStart(3)} var=${String(v.toFixed(0)).padStart(3)} hues=${String(col).padStart(2)} edge=${e.toFixed(1)}%${flags.length ? '  ← ' + flags.join(',') : ''}`);
    rows.push({ id, lum, v, col, e, flags });
  } catch (err) {
    console.log(`??    ${id.padEnd(22)} ${String(err.message).slice(0, 60)}`);
  } finally { await p.close(); }
}
srv.close();
const weak = rows.filter(r => r.flags.length >= 2);
console.log(`\n${rows.length} sampled · ${rows.length - weak.length} look alive · ${weak.length} need visual work${weak.length ? ': ' + weak.map(r => r.id).join(', ') : ''}`);
