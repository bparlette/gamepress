// audit.mjs — score every Cat Arcade v2 game on objective "juice + pacing" signals.
// This is how we decide who gets the next round of fixes: lowest score first.
//
//   node scripts/audit.mjs [id ...]          (env SECS=30 JSON=1)
//
// Static score  (from game.js source): particles, camera punch, hitstop, combos, popups,
//                                      parallax layers, touch buttons, sound variety, art richness.
// Runtime score (headless Chrome):     first paint, sustained fps, round length in the
//                                      "one more go" window, and whether the bot's dumb
//                                      attempt is survivable (no challenge) or hopeless.
import { serveDir } from '../lib/serve.mjs';
import { launchChrome } from '../lib/cdp.mjs';
import { resolve } from 'node:path';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';

const DEMOS = resolve('/Users/braidpairlette/.gemini/antigravity/scratch/hawk-main/brad-demos');
const V2 = resolve(DEMOS, 'g/_v2');
const SECS = +(process.env.SECS || 45);
const ids = process.argv.slice(2).length ? process.argv.slice(2)
  : readdirSync(V2, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('_') && existsSync(resolve(V2, d.name, 'game.js'))).map(d => d.name).sort();


/* looks at the actual canvas: is the frame colourful, and is it MOVING? */
const VISUAL = `new Promise(res=>{
  const c=document.querySelector('canvas'); if(!c) return res(null);
  let x; try{ x=c.getContext('2d'); }catch(e){ return res(null); }
  if(!x || !x.getImageData) return res(null);
  const q=document.createElement('canvas'); q.width=32; q.height=56;
  const qx=q.getContext('2d');
  const grab=()=>{ qx.clearRect(0,0,32,56); try{qx.drawImage(c,0,0,32,56);}catch(e){} return qx.getImageData(0,0,32,56).data; };
  const a=grab();
  setTimeout(()=>{ const b=grab(); let col=new Set(), sum=0, diff=0;
    for(let i=0;i<a.length;i+=4){
      sum += a[i]*.3+a[i+1]*.59+a[i+2]*.11;
      col.add((a[i]>>4)+','+(a[i+1]>>4)+','+(a[i+2]>>4));
      diff += (Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]))/3;
    }
    const n=a.length/4;
    res(JSON.stringify({ lum:Math.round(sum/n), colors:col.size, motion:+((diff/n)/255*100).toFixed(1) }));
  }, 420);
})`;

const count = (s, re) => (s.match(re) || []).length;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function staticScore(id) {
  const src = readFileSync(resolve(V2, id, 'game.js'), 'utf8');
  const s = {};
  s.bytes = src.length;
  s.burst = count(src, /fx\.(burst|emit|spark|dust|trail)/g);
  s.punch = count(src, /\b(punch|shake|hitstop|zoom)\b/gi);
  s.combo = count(src, /\bcombo\b/gi);
  s.popup = count(src, /\b(popup|floatText|g\.text\()/gi);
  s.parallax = count(src, /\b(parallax|scrollFactor|layer)\b/gi);
  s.buttons = count(src, /\bg\.btn\(/g);
  s.sfx = new Set(src.match(/sfx\(\s*['"`]([a-zA-Z0-9_]+)/g) || []).size;
  s.sfxCalls = count(src, /\bsfx\(/g);
  s.music = /\bmusic\(/.test(src);
  s.sprite = /\bdrawChar\(/.test(src);
  s.grad = count(src, /createLinearGradient|createRadialGradient|addColorStop/g);
  s.glow = count(src, /shadowBlur/g);
  s.scan = /scan\s*:/.test(src);
  s.reset = /\bg\.onReset\s*=/g.test(src) ? count(src, /\bg\.onReset\s*=/g) : 0;

  let p = 0;
  for (const [k, w] of [['burst', 14], ['punch', 9], ['combo', 5], ['popup', 5], ['parallax', 6],
    ['buttons', 6], ['sfx', 8], ['music', 5], ['sprite', 4], ['grad', 6], ['glow', 5],
    ['scan', 3], ['reset', 4]]) {
    const v = s[k];
    p += typeof v === 'number' ? Math.min(3, v) * w / 3 : (v ? w : 0);
  }
  p += Math.min(10, s.bytes / 9000) * 2;   // content volume: more game = better, capped
  return { pts: Math.round(p), s };
}

async function runtimeScore(id, srv, port) {
  const page = await launchChrome({ width: 540, height: 960, scale: 1 });
  const r = {};
  try {
    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__fp=performance.now()}));`,
    });
    await page.send('Page.navigate', { url: `http://127.0.0.1:${port}/g/_v2/${id}/index.html?auto=1&pack=1` });
    await sleep(1800);
    r.paint = Math.round((await page.evaluate('window.__fp||0')) || 0);
    try { r.vis = JSON.parse(await page.evaluate(VISUAL) || 'null'); } catch(e) { r.vis = null; }
    r.fps = await page.evaluate(`new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<1200)requestAnimationFrame(f);else r(n)};requestAnimationFrame(f)})`).catch(() => -1);
    let ends = [];
    for (let i = 0; i < SECS * 4; i++) {
      ends = JSON.parse(await page.evaluate('JSON.stringify(window.__ends||[])').catch(() => '[]'));
      if (ends.length >= 3) break;
      await sleep(250);
    }
    r.ends = ends.length;
    r.round = ends[0] ? +(+ends[0].t).toFixed(1) : null;       // the deliberate dumb loss = rough round length
    r.dumbWon = !!(ends[0] && ends[0].win);
    r.win = ends.some(e => e.win);
    r.errors = page.logs.length;
  } catch (e) { r.fatal = e.message; }
  await page.close();
  return r;
}

const srv = await serveDir(DEMOS);
const out = [];
for (const id of ids) {
  const st = staticScore(id);
  const rt = await runtimeScore(id, srv, srv.port);
  /* pacing: a $4.99 arcade round wants ~8–30s; too short = no game, too long = no tension */
  let pace = 10;
  if (rt.round == null) pace = 0;
  else if (rt.round < 4) pace = 2; else if (rt.round < 8) pace = 6;
  else if (rt.round <= 30) pace = 14; else if (rt.round <= 60) pace = 9; else pace = 4;
  let health = 0;
  if (rt.fatal) health -= 40;
  else {
    if (rt.paint && rt.paint < 200) health += 6; else if (rt.paint && rt.paint < 450) health += 2; else health -= 4;
    if (rt.errors === 0) health += 8; else health -= Math.min(24, rt.errors * 4);
    if (!rt.ends) health -= 20;
    const v = rt.vis || {};
    if (v.colors >= 24) health += 4; else if (v.colors >= 12) health += 1; else health -= 5;
    if (v.motion >= 2) health += 4; else if (v.motion >= .4) health += 1; else health -= 6;
    if (v.lum < 12) health -= 4;
  }
  const total = Math.max(0, Math.min(100, st.pts + pace + health));
  out.push({ id, total, static: st.pts, pace, health, ...rt, ...st.s });
}

out.sort((a, b) => a.total - b.total);
const row = o => `${String(o.total).padStart(3)}  ${o.id.padEnd(22)} juice=${String(o.static).padStart(3)} pace=${String(o.pace).padStart(2)} health=${String(o.health).padStart(3)} | ${String(o.round).padStart(5)}s paint=${String(o.paint).padStart(4)} fps=${String(o.fps).padStart(3)} err=${o.errors} col=${o.vis?o.vis.colors:'-'} mov=${o.vis?o.vis.motion+'%':'-'} ${o.dumbWon ? 'DUMB-WON' : ''}${o.win ? '' : ' NO-BOT-WIN'}`;
console.log('score  game                   breakdown');
out.forEach(o => console.log(row(o)));
const avg = Math.round(out.reduce((a, o) => a + o.total, 0) / out.length);
console.log(`\naverage ${avg}/100 · weakest: ${out.slice(0, 5).map(o => o.id).join(', ')}`);
if (process.env.JSON) { writeFileSync('/tmp/audit.json', JSON.stringify(out, null, 1)); console.log('→ /tmp/audit.json'); }
srv.close();
