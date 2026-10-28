// qa.mjs — the quality gate every Cat Arcade v2 game must pass before it ships.
// usage: node scripts/qa.mjs <id> [id...]        (env BASE=g/_v2  SECS=14  TOUCH=1  VERBOSE=1)
// Checks, per game:
//   1 load      first paint < 200 ms
//   2 errors    zero console errors / exceptions
//   3 hold      ?pack=1&hold=1 freezes the simulation until the first touch (no black frame)
//   4 started   first real touch inside the iframe posts {gp:'started'} to the parent
//   5 end       a full run posts {gp:'end', win, score} with a numeric score
//   6 bot       ?auto=1&pack=1 reaches an end on its own (bot can actually play it)
//   7 fps       sustained frame rate
import { serveDir } from '../lib/serve.mjs';
import { launchChrome } from '../lib/cdp.mjs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMOS = resolve(HERE, '../../hawk-main/brad-demos');
const BASE = process.env.BASE || 'g/_v2';
const SECS = +(process.env.SECS || 14);
const BOTSECS = +(process.env.BOTSECS || 45);   // the bot needs real time: dumb attempt + reset + a winning run
const ids = process.argv.slice(2);
if (!ids.length) { console.error('usage: node scripts/qa.mjs <id> [id...]'); process.exit(2); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = await serveDir(DEMOS);
const URL0 = `http://127.0.0.1:${srv.port}`;

/* watchdog: a crashed or wedged Chrome must not hang the whole suite (73 files, 3 lanes) */
const HARD = +(process.env.HARD || 300) * 1000;
const watchdog = setTimeout(() => {
  console.log(`FAIL  ${ids.join(' ')}  watchdog: no verdict after ${HARD / 1000}s (chrome wedged?)`);
  process.exit(3);
}, HARD);
watchdog.unref?.();

const FPS = `new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<1000)requestAnimationFrame(f);else r(n)};requestAnimationFrame(f)})`;
const FIRSTPAINT = `requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__firstPaint=performance.now()}));`;

/* this box's ceiling: a trivial canvas at the same size. fps is only meaningful relative to it. */
const BLANK = 'data:text/html,' + encodeURIComponent(`<!doctype html><body style="margin:0;background:#000">
<canvas id=c width=540 height=960></canvas><script>const c=document.getElementById('c'),x=c.getContext('2d');
function f(){x.fillStyle='#123';x.fillRect(0,0,540,960);x.fillStyle='#fff';for(let i=0;i<200;i++)x.fillRect(Math.random()*540,Math.random()*960,8,8);requestAnimationFrame(f)}f()<\/script>`);
async function measureBaseline() {
  const p = await launchChrome({ width: 540, height: 960, scale: 1 });
  await p.send('Page.navigate', { url: BLANK });
  await sleep(900);
  const f = await p.evaluate(FPS).catch(() => 30);
  await p.close();
  return f;
}
const FPS_FLOOR = base => Math.max(8, Math.round(base * .35));   // 35% of the ceiling sampled at the same moment

async function touch(page, x, y) {
  await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await sleep(40);
  await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function checkGame(id) {
  const r = { id, fails: [], notes: {} };
  const page = await launchChrome({ width: 540, height: 960, scale: 1 });
  try {
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: FIRSTPAINT });

    /* ---------- 1-5: rotation contract through the harness ---------- */
    await page.send('Page.navigate', { url: `${URL0}/_qa/harness.html?id=${id}&base=${BASE}` });
    await sleep(1600);
    r.notes.firstPaint = Math.round((await page.evaluate('window.__frame().contentWindow.__firstPaint||0').catch(() => 0)) || 0);
    if (!r.notes.firstPaint) r.fails.push('load:no-first-paint');
    else if (r.notes.firstPaint > 200) r.fails.push(`load:slow(${r.notes.firstPaint}ms)`);

    // 3 hold: the sim must be frozen before the first touch
    const s1 = await page.evaluate('JSON.stringify(window.__frame().contentWindow.__game||null)').catch(() => null);
    await sleep(700);
    const s2 = await page.evaluate('JSON.stringify(window.__frame().contentWindow.__game||null)').catch(() => null);
    r.notes.frozenState = s1 === s2;
    if (!s1) r.fails.push('hold:no-game-object');
    else if (s1 !== s2) r.fails.push('hold:sim-running-before-touch');

    // 4 started: a real touch on the iframe
    await touch(page, 270, 700);
    await sleep(500);
    const msgs1 = await page.evaluate('JSON.stringify(window.__msgs)');
    const gotStarted = JSON.parse(msgs1).some(m => m.gp === 'started');
    r.notes.started = gotStarted;
    if (!gotStarted) r.fails.push('started:no-postMessage');

    // 5 end: drive it until the round resolves
    let msgs = [];
    for (let i = 0; i < SECS * 4; i++) {
      msgs = JSON.parse(await page.evaluate('JSON.stringify(window.__msgs)'));
      if (msgs.some(m => m.gp === 'end')) break;
      await touch(page, 60 + (i * 37) % 420, 620 + (i * 53) % 260);
      await sleep(250);
    }
    const end = msgs.find(m => m.gp === 'end');
    r.notes.end = end || null;
    if (!end) r.notes.endMissing = true;          // judged after the bot phase: a long game may not resolve in 14s
    else if (typeof end.score !== 'number' || Number.isNaN(end.score)) r.fails.push('end:bad-score');
    else if (typeof end.win !== 'boolean') r.fails.push('end:bad-win');

    r.notes.errors = page.logs.slice(0, 6);
    if (page.logs.length) r.fails.push(`errors:${page.logs.length}`);
  } catch (e) { r.fails.push('fatal:' + e.message); }
  await page.close();

  /* ---------- 6-7: bot + fps, straight load ---------- */
  const p2 = await launchChrome({ width: 540, height: 960, scale: 1 });
  try {
    await p2.send('Page.navigate', { url: `${URL0}/${BASE}/${id}/index.html?auto=1&pack=1&dpr=1` });
    await sleep(3000);
    r.notes.fps = await p2.evaluate(FPS).catch(() => -1);
    r.notes.base = await measureBaseline();
    let ends = [];
    for (let i = 0; i < BOTSECS * 4; i++) {
      ends = JSON.parse(await p2.evaluate('JSON.stringify(window.__ends||[])').catch(() => '[]'));
      if (ends.some(e => e.win === true)) break;   // attempt 0 is a DELIBERATE loss — wait for the real winning run
      await sleep(250);
    }
    r.notes.botEnds = ends.length;
    r.notes.botWin = ends.some(e => e.win === true);
    if (!ends.length) { r.fails.push(r.notes.endMissing ? 'end:never-posted' : 'bot:never-finished'); }
    else if (!r.notes.botWin) r.fails.push('bot:cannot-win');
    else if (r.notes.endMissing) r.warns = [...(r.warns || []), 'end:slow-manual-phase'];
    if (r.notes.fps > 0 && r.notes.fps < FPS_FLOOR(r.notes.base)) r.warns = [...(r.warns || []), `fps:slow(${r.notes.fps}/${r.notes.base})`];
    r.notes.botErrors = p2.logs.slice(0, 6);
    if (p2.logs.length && !r.notes.errors) { r.notes.errors = p2.logs.slice(0, 6); r.fails.push(`errors:${p2.logs.length}`); }
  } catch (e) { r.fails.push('fatal2:' + e.message); }
  await p2.close();
  r.pass = r.fails.length === 0;
  return r;
}

console.log('fps is sampled against a blank-canvas baseline taken at the same moment each run.\n');
const out = [];
for (const id of ids) {
  const r = await checkGame(id);
  out.push(r);
  const mark = r.pass ? (r.warns?.length ? 'PASS~' : 'PASS ') : 'FAIL ';
  const fpsCol = `${r.notes.fps}/${r.notes.base}`.padStart(7);
  console.log(`${mark} ${id.padEnd(22)} paint=${String(r.notes.firstPaint).padStart(4)}ms fps=${fpsCol} bot=${r.notes.botEnds || 0}${r.notes.botWin ? '(win)' : ''} ${r.fails.length ? '  ← ' + r.fails.join(', ') : r.warns?.length ? '  ~ ' + r.warns.join(', ') : ''}`);
  if (process.env.VERBOSE && r.notes.errors?.length) r.notes.errors.forEach(e => console.log('        err:', String(e).slice(0, 200)));
}
clearTimeout(watchdog); srv.close();
const bad = out.filter(r => !r.pass);
console.log(`\n${out.length - bad.length}/${out.length} pass`);
if (process.env.JSON) console.log(JSON.stringify(out, null, 1));
process.exit(bad.length ? 1 : 0);
