// Visual smoke test: bots verify game LOGIC; this verifies the game actually RENDERS.
// A black/white/blank screen, stuck loader, or JS crash all pass bot checks —
// this catches them with pixel-variance analysis + console + canvas checks.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { launchChrome } from './cdp.mjs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Pure pixel bucketing: quantize to 16 levels/channel (tolerates compression noise),
 *  count the dominant bucket. Shared by in-page analysis and unit tests — self-contained. */
export function bucketPixels(data, pixels) {
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  let top = 0, topKey = 0;
  for (const [k, n] of buckets) if (n > top) { top = n; topKey = k; }
  const hex = v => ((v << 4) | v).toString(16).padStart(2, '0');
  return { pixels, topPct: Math.round(top / pixels * 1000) / 10,
    dominant: '#' + hex((topKey >> 8) & 0xF) + hex((topKey >> 4) & 0xF) + hex(topKey & 0xF),
    buckets: buckets.size };
}

/** Flat-render threshold: above this % of one color, the game is not visibly rendering. */
export const FLAT_THRESHOLD = 95;

/** In-page pixel analysis: downsample screenshot to 64x64, then bucket.
 *  The bucketing fn is embedded by source so in-page logic can never drift from the tested one. */
const ANALYZE_SRC = `async (src) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('screenshot decode failed')); img.src = src; });
  const W = 64, H = 64, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  return (${bucketPixels.toString()})(ctx.getImageData(0, 0, W, H).data, W * H);
}`;

/** In-page canvas inventory: size + whether each canvas is WebGL-backed. */
const CANVASES_SRC = `() => [...document.querySelectorAll('canvas')].map(cv => {
  const r = cv.getBoundingClientRect();
  let kind = '2d';
  try { const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    if (gl) kind = 'webgl'; } catch {}
  return { w: cv.width, h: cv.height, cssW: Math.round(r.width), cssH: Math.round(r.height), kind,
    visible: r.width > 0 && r.height > 0 };
})`;

/** Analyze a base64 PNG screenshot via an open CDP client. Pure analysis, no navigation. */
export async function analyzePixels(c, pngBase64) {
  return c.evaluate(`(${ANALYZE_SRC})(${JSON.stringify('data:image/png;base64,' + pngBase64)})`);
}

/** Full standalone visual smoke test: load, wait, screenshot, analyze.
 *  target: game dir, index.html path, or http(s) URL.
 *  Returns { ok, problems[], flatPct, dominant, webglAvailable, canvases[], errors[], screenshot }. */
export async function visualSmokeTest(target, { seconds = 10, width = 540, height = 960, shotDir = '.gp', seed = 1 } = {}) {
  const v = { target, ok: false, problems: [], errors: [] };
  const base = /^https?:/.test(target) ? target
    : 'file://' + (resolve(target).endsWith('.html') ? resolve(target) : join(resolve(target), 'index.html'));
  const url = base + (base.includes('?') ? '&' : '?') + `dpr=1&clean=1&auto=1&seed=${seed}`;
  v.url = url;
  const c = await launchChrome({ width, height });
  try {
    await c.send('Page.navigate', { url });
    for (let i = 0; i < 80 && (await c.evaluate('document.readyState').catch(() => '')) !== 'complete'; i++) await sleep(150);
    await sleep(seconds * 1000); // real boot time — let loaders, shaders, and first frames settle
    const shot = await c.send('Page.captureScreenshot', { format: 'png' });
    const b64 = shot.result.data;
    v.shotBytes = Buffer.from(b64, 'base64').length;
    const a = await analyzePixels(c, b64);
    v.flatPct = a.topPct; v.dominant = a.dominant; v.colorBuckets = a.buckets;
    v.webglAvailable = await c.evaluate(`!!(document.createElement('canvas').getContext('webgl2')||document.createElement('canvas').getContext('webgl'))`).catch(() => false);
    v.canvases = await c.evaluate(`(${CANVASES_SRC})()`).catch(() => []);
    v.errors = [...new Set(c.logs)].slice(0, 5);
    v.bodyText = (await c.evaluate(`document.body ? document.body.innerText.slice(0, 200) : ''`).catch(() => '')).trim();
    const problems = [];
    if (a.topPct > FLAT_THRESHOLD) problems.push(`renders flat: ${a.topPct}% ${a.dominant}`);
    if (v.errors.length) problems.push('page errors: ' + v.errors[0].slice(0, 120));
    if (!v.canvases.length) problems.push('no <canvas> found');
    else if (!v.canvases.some(k => k.cssW > 0 && k.cssH > 0)) problems.push('all canvases zero-size');
    if (/loading/i.test(v.bodyText) && a.topPct > 90) problems.push('stuck on loading screen');
    v.problems = problems; v.ok = !problems.length;
    if (shotDir) {
      mkdirSync(shotDir, { recursive: true });
      v.screenshot = join(shotDir, (basename(resolve(target).replace(/\/index\.html$/, '')) || 'visual') + '.visual.png');
      writeFileSync(v.screenshot, Buffer.from(b64, 'base64'));
    }
  } finally { await c.close(); }
  return v;
}
