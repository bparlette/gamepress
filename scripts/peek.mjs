// peek.mjs — render a game in headless Chrome and print the canvas as ASCII + a colour grid,
// so composition / readability can be checked from the terminal.
// usage: node scripts/peek.mjs <id> [cols] [rows] [secs]
import { serveDir } from '../lib/serve.mjs';
import { launchChrome } from '../lib/cdp.mjs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const DEMOS = resolve(HERE, '../../hawk-main/brad-demos');
const [id, cols = 46, rows = 54, secs = 6] = process.argv.slice(2);
const srv = await serveDir(DEMOS);
const page = await launchChrome({ width: 540, height: 960, scale: 1 });
await page.send('Page.navigate', { url: `http://127.0.0.1:${srv.port}/g/_v2/${id}/index.html?auto=1&pack=1&dpr=1${process.env.QS || ''}` });
await new Promise(r => setTimeout(r, +secs * 1000));
const grid = await page.evaluate(`(()=>{
  const c=document.querySelector('canvas'), C=${cols}, R=${rows};
  const t=document.createElement('canvas'); t.width=C; t.height=R;
  const x=t.getContext('2d'); x.drawImage(c,0,0,C,R);
  const d=x.getImageData(0,0,C,R).data, out=[];
  for(let y=0;y<R;y++){const row=[];for(let i=0;i<C;i++){const o=(y*C+i)*4;row.push([d[o],d[o+1],d[o+2]]);}out.push(row);}
  return out;})()`);
const ramp = ' .:-=+*#%@';
const hueOf = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 26) return 'n';
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return h < 20 || h >= 330 ? 'R' : h < 45 ? 'O' : h < 70 ? 'Y' : h < 160 ? 'G' : h < 200 ? 'C' : h < 260 ? 'B' : 'M';
};
let art = '', hues = '';
for (const row of grid) {
  for (const [r, g, b] of row) {
    const l = (.299 * r + .587 * g + .114 * b) / 255;
    art += ramp[Math.min(9, Math.round(l * 9))];
    hues += hueOf(r, g, b);
  }
  art += '\n'; hues += '\n';
}
console.log(art);
console.log('hue map (.=grey/neutral, R red, O orange, Y yellow, G green, C cyan, B blue, M magenta)');
console.log(hues);
console.log('state', await page.evaluate('JSON.stringify(window.__game)'));
console.log('dbg  ', await page.evaluate('JSON.stringify(window.__dbg && window.__dbg())'));
console.log('stats', await page.evaluate(`(()=>{const c=document.querySelector('canvas');const t=document.createElement('canvas');t.width=54;t.height=96;const x=t.getContext('2d');x.drawImage(c,0,0,54,96);const d=x.getImageData(0,0,54,96).data;let s=0,mx=0;const bands=[0,0,0];for(let i=0;i<d.length;i+=4){const l=(.299*d[i]+.587*d[i+1]+.114*d[i+2])/255;s+=l;mx=Math.max(mx,l);const row=Math.floor((i/4)/54);bands[Math.min(2,Math.floor(row/32))]+=l;}return JSON.stringify({mean:+(s/(54*96)).toFixed(3),max:+mx.toFixed(3),bands:bands.map(b=>+(b/(54*32)).toFixed(3))})})()`));
console.log('errors', [...new Set(page.logs)].slice(0, 5));
await page.close(); srv.close(); process.exit(0);
