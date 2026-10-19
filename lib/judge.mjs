// gamepress judge: score REMOTE web games against the quality bar.
// Unlike `grade` (reads local source), judge loads the game in headless Chrome
// and scores what it can OBSERVE: rendering, animation, input response.
// Built for the Hawk catalog (115 remote games), works on any URL.
//
//   gamepress judge <url-or-hawk-id> [--landscape|--portrait] [--timeout 30] [--json]
//   gamepress judge --all [--landscape|--portrait] [--timeout 30] [--json]
//
// Canvas analysis approach adapted from threejs-qa-release/inspect-threejs-canvas.mjs
// (MIT, github.com/calasdan-sketch/threejs-game-skills): crop to the canvas rect,
// measure color entropy + edge density + luminance contrast on a coarse grid.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launchChrome } from './cdp.mjs';
import { bucketPixels, FLAT_THRESHOLD } from './visual.mjs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

export const HAWK_GAMES_JSON = 'https://raw.githubusercontent.com/bparlette/Hawk/main/brad-demos/games.json';
export const HAWK_BASE = 'https://bparlette.github.io/Hawk/brad-demos/';
export const PASS_THRESHOLD = 70;

export function getLuminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

export function contrastRatio(lum1, lum2) {
  const l1 = Math.max(lum1, lum2), l2 = Math.min(lum1, lum2);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function evaluateFacets(data, width = 64, height = 64, meta = {}) {
  const totalPixels = width * height;
  const bucketInfo = bucketPixels(data, totalPixels);
  const fixes = [];
  let paletteScore = 100;
  if (bucketInfo.topPct > FLAT_THRESHOLD) {
    paletteScore = Math.max(0, 100 - (bucketInfo.topPct - FLAT_THRESHOLD) * 20);
    fixes.push(`Renders flat: ${bucketInfo.topPct}% ${bucketInfo.dominant} (threshold ${FLAT_THRESHOLD}%)`);
  } else if (bucketInfo.topPct > 80) {
    paletteScore = 80 - (bucketInfo.topPct - 80) * 2;
  }
  if (bucketInfo.buckets < 8) {
    paletteScore = Math.min(paletteScore, 50);
    fixes.push(`Very low color variance: only ${bucketInfo.buckets} color buckets detected`);
  } else if (bucketInfo.buckets >= 30) {
    paletteScore = Math.min(100, paletteScore + 5);
  }
  paletteScore = Math.round(Math.max(0, Math.min(100, paletteScore)));

  const hw = Math.floor(width / 2), hh = Math.floor(height / 2);
  const quadCounts = [0, 0, 0, 0];
  let centerNonDominant = 0, totalNonDominant = 0;
  const domR = parseInt(bucketInfo.dominant.slice(1, 3), 16) || 0;
  const domG = parseInt(bucketInfo.dominant.slice(3, 5), 16) || 0;
  const domB = parseInt(bucketInfo.dominant.slice(5, 7), 16) || 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const diff = Math.abs(r - domR) + Math.abs(g - domG) + Math.abs(b - domB);
      if (diff > 48) {
        totalNonDominant++;
        const qIdx = (y >= hh ? 2 : 0) + (x >= hw ? 1 : 0);
        quadCounts[qIdx]++;
        if (x >= width * 0.25 && x < width * 0.75 && y >= height * 0.25 && y < height * 0.75) centerNonDominant++;
      }
    }
  }

  let cameraScore = 85, quadrantBalance = 1.0;
  if (totalNonDominant > 10) {
    const maxQ = Math.max(...quadCounts), minQ = Math.min(...quadCounts);
    quadrantBalance = Math.round((1 - (maxQ - minQ) / totalNonDominant) * 100) / 100;
    const centerRatio = centerNonDominant / totalNonDominant;
    if (maxQ / totalNonDominant > 0.88) {
      cameraScore -= 40;
      const qNames = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      fixes.push(`Camera framing off-center: ${Math.round(maxQ / totalNonDominant * 100)}% of visual features trapped in ${qNames[quadCounts.indexOf(maxQ)]}`);
    } else if (centerRatio < 0.15) {
      cameraScore -= 20;
      fixes.push('Action dead-zone: low visual activity in center 50% of viewport');
    } else if (centerRatio >= 0.35) cameraScore = Math.min(100, cameraScore + 15);
  } else if (bucketInfo.topPct < FLAT_THRESHOLD) cameraScore = 70;
  else cameraScore = 0;
  cameraScore = Math.round(Math.max(0, Math.min(100, cameraScore)));

  let layoutScore = 100;
  const canvases = meta.canvases || [];
  if (meta.canvases !== undefined) {
    if (!canvases.length) {
      layoutScore = 0;
      fixes.push('No <canvas> found on page');
    } else {
      const visible = canvases.some(c => (c.cssW > 0 && c.cssH > 0) || (c.w > 0 && c.h > 0));
      if (!visible) {
        layoutScore = 10;
        fixes.push('All canvases have zero width/height');
      } else if (meta.needs3D && !canvases.some(c => c.kind === 'webgl' || c.webgl)) {
        layoutScore -= 30;
        fixes.push('3D game expected WebGL canvas but found 2D context');
      }
    }
  }
  if (meta.bodyText && /stuck|error|exception/i.test(meta.bodyText)) {
    layoutScore = Math.min(layoutScore, 20);
    fixes.push(`Page text contains error markers: "${meta.bodyText.slice(0, 80)}"`);
  }
  layoutScore = Math.round(Math.max(0, Math.min(100, layoutScore)));

  let readabilityScore = 80;
  const domLum = getLuminance(domR, domG, domB);
  let bestContrast = 1.0;
  for (let i = 0; i < totalPixels; i += 8) {
    const cr = contrastRatio(getLuminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]), domLum);
    if (cr > bestContrast) bestContrast = cr;
  }
  bestContrast = Math.round(bestContrast * 10) / 10;
  if (bestContrast < 2.5 && bucketInfo.topPct < FLAT_THRESHOLD) {
    readabilityScore = 40;
    fixes.push(`Low foreground contrast ratio (${bestContrast}:1 against ${bucketInfo.dominant})`);
  } else if (bestContrast >= 4.5) {
    readabilityScore = Math.min(100, 80 + Math.min(20, Math.round((bestContrast - 4.5) * 4)));
  } else readabilityScore = 70;
  readabilityScore = Math.round(Math.max(0, Math.min(100, readabilityScore)));

  const score = Math.round(paletteScore * 0.30 + cameraScore * 0.25 + layoutScore * 0.25 + readabilityScore * 0.20);
  return {
    score,
    verdict: score >= 85 ? 'PASS' : score >= 65 ? 'NEEDS_POLISH' : 'FAIL',
    facets: {
      palette: { score: paletteScore, dominant: bucketInfo.dominant, flatPct: bucketInfo.topPct, buckets: bucketInfo.buckets },
      camera: { score: cameraScore, quadrantBalance },
      layout: { score: layoutScore, canvasCount: canvases.length },
      readability: { score: readabilityScore, maxContrast: bestContrast },
    },
    fixes,
  };
}

/** Resolve target: URL passthrough, or Hawk game id -> full URL. */
export async function resolveTarget(target) {
  if (/^(https?|file):\/\//.test(target)) return { url: target, id: null, title: null };
  const res = await fetch(HAWK_GAMES_JSON);
  if (!res.ok) throw new Error(`could not fetch Hawk catalog: ${res.status}`);
  const games = await res.json();
  const list = Array.isArray(games) ? games : games.games || [];
  const g = list.find(x => x.id === target);
  if (!g) throw new Error(`no Hawk game with id "${target}" (${list.length} games in catalog)`);
  if (!g.path) throw new Error(`Hawk game "${target}" has no path`);
  return { url: HAWK_BASE + g.path, id: g.id, title: g.title || g.id, orientation: g.orientation };
}

/** In-page: analyze the LARGEST canvas rect. Returns rich metrics.
 *  Adapted from threejs-qa-release computePixelMetrics: coarse-grid luminance
 *  sampling -> color entropy, edge density, contrast, dominant share. */
const CANVAS_METRICS_SRC = `async (pngB64) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('decode failed')); img.src = 'data:image/png;base64,' + pngB64; });
  // find largest canvas rect in CSS px
  let rect = null;
  for (const cv of document.querySelectorAll('canvas')) {
    const r = cv.getBoundingClientRect();
    if (r.width >= 32 && r.height >= 32 && (!rect || r.width * r.height > rect.w * rect.h))
      rect = { x: r.left, y: r.top, w: r.width, h: r.height };
  }
  if (!rect) return { hasCanvas: false };
  // draw full screenshot, then sample the canvas region on a coarse grid
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  // map CSS rect to device pixels
  const sx = img.naturalWidth / window.innerWidth, sy = img.naturalHeight / window.innerHeight;
  const x0 = Math.round(rect.x * sx), y0 = Math.round(rect.y * sy);
  const cw = Math.round(rect.w * sx), ch = Math.round(rect.h * sy);
  const stepX = Math.max(1, Math.floor(cw / 160)), stepY = Math.max(1, Math.floor(ch / 90));
  const cols = Math.floor(cw / stepX), rows = Math.floor(ch / stepY);
  const data = ctx.getImageData(x0, y0, cw, ch).data;
  const lum = new Float64Array(cols * rows);
  const buckets = new Map();
  let n = 0, minC = 255, maxC = 0;
  for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
    const o = ((gy * stepY) * cw + gx * stepX) * 4;
    const r = data[o], g = data[o+1], b = data[o+2];
    lum[gy * cols + gx] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const key = (r >> 4) * 256 + (g >> 4) * 16 + (b >> 4);
    buckets.set(key, (buckets.get(key) || 0) + 1);
    minC = Math.min(minC, r, g, b); maxC = Math.max(maxC, r, g, b);
    n++;
  }
  const sorted = Array.from(lum).sort((a, b) => a - b);
  const p5 = sorted[Math.floor(n * 0.05)], p95 = sorted[Math.floor(n * 0.95)];
  let entropy = 0, dom = 0;
  for (const c of buckets.values()) { const p = c / n; entropy -= p * Math.log2(p); dom = Math.max(dom, c); }
  let edges = 0, checked = 0;
  for (let gy = 0; gy < rows - 1; gy++) for (let gx = 0; gx < cols - 1; gx++) {
    const i = gy * cols + gx;
    if (Math.max(Math.abs(lum[i] - lum[i+1]), Math.abs(lum[i] - lum[i+cols])) > 12) edges++;
    checked++;
  }
  const r2 = v => Math.round(v * 100) / 100;
  return {
    hasCanvas: true, rect: { w: Math.round(rect.w), h: Math.round(rect.h) },
    colorBuckets: buckets.size,
    colorEntropyBits: r2(entropy),
    edgeDensity: r2(edges / Math.max(1, checked)),
    contrast: Math.round(p95 - p5),
    dominantShare: r2(dom / n),
    variance: maxC - minC,
    // threejs-qa-release "is anything drawn" rule:
    drawn: (maxC - minC) > 8 || buckets.size > 3,
  };
}`;

/** In-page: mean absolute channel difference between two screenshots (0-255 scale). */
const DIFF_SRC = `async (a64, b64) => {
  const load = s => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'data:image/png;base64,' + s; });
  const [ia, ib] = await Promise.all([load(a64), load(b64)]);
  const W = 32, H = 32, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const grab = im => { ctx.drawImage(im, 0, 0, W, H); return ctx.getImageData(0, 0, W, H).data; };
  const da = grab(ia), db = grab(ib);
  let sum = 0;
  for (let i = 0; i < da.length; i += 4) sum += Math.abs(da[i]-db[i]) + Math.abs(da[i+1]-db[i+1]) + Math.abs(da[i+2]-db[i+2]);
  return Math.round(sum / (W * H * 3) * 10) / 10;
}`;

async function screenshot(c) {
  const r = await c.send('Page.captureScreenshot', { format: 'png' });
  return r.result.data;
}

/** Wait for a visible canvas, up to timeoutMs. Returns true if found. */
async function waitForCanvas(c, timeoutMs = 10000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const n = await c.evaluate(`[...document.querySelectorAll('canvas')].filter(cv => { const r = cv.getBoundingClientRect(); return r.width >= 32 && r.height >= 32; }).length`).catch(() => 0);
    if (n > 0) return true;
    await sleep(500);
  }
  return false;
}

/** Score one game URL. Returns full breakdown. */
export async function judgeGame(url, { landscape = false, portrait = false, timeout = 30, shotDir = '.gp/judge', seed = 1 } = {}) {
  const W = landscape ? 1280 : portrait ? 720 : 960;
  const H = landscape ? 720 : portrait ? 1280 : 800;
  const r = { url, score: 0, pass: false, checks: {}, screenshots: [], errors: [] };
  const t0 = Date.now();
  const timedOut = () => Date.now() - t0 > timeout * 1000;
  const loadUrl = url + (url.includes('?') ? '&' : '?') + `seed=${seed}&dpr=1`;
  // Start Chrome AT the target URL: avoids Local Network Access blocks when
  // navigating from about:blank to localhost, and saves one navigation.
  const c = await launchChrome({ width: W, height: H, initialUrl: loadUrl });

  const metricsOf = async (b64) => c.evaluate(`(${CANVAS_METRICS_SRC})(${JSON.stringify(b64)})`).catch(() => ({ hasCanvas: false, error: true }));

  try {
    // Already at loadUrl via initialUrl; wait for ready.
    for (let i = 0; i < 80 && (await c.evaluate('document.readyState').catch(() => '')) !== 'complete'; i++) await sleep(150);
    if (timedOut()) throw new Error('load timeout');

    const canvasFound = await waitForCanvas(c, 10000);
    await sleep(1500); // let first frames render
    const b0 = await screenshot(c);
    const m0 = await metricsOf(b0);

    // --- 1. renders at all (20 pts) ---
    const pageErrors = [...new Set(c.logs)].slice(0, 3);
    r.errors = pageErrors;
    const renders = m0.hasCanvas && m0.drawn && !m0.error;
    r.checks.renders = { pts: renders ? 20 : 0, max: 20,
      detail: renders ? `canvas ${m0.rect.w}x${m0.rect.h} drawing (entropy ${m0.colorEntropyBits} bits)`
        : !m0.hasCanvas ? 'no canvas found' : `canvas present but not drawing (variance ${m0.variance}, buckets ${m0.colorBuckets})` };
    r.score += r.checks.renders.pts;

    // --- 2. animating, not frozen (20 pts) ---
    await sleep(3000);
    const b1 = await screenshot(c);
    await sleep(3000);
    const b2 = await screenshot(c);
    let d1 = 0, d2 = 0;
    try {
      d1 = await c.evaluate(`(${DIFF_SRC})(${JSON.stringify(b0)}, ${JSON.stringify(b1)})`);
      d2 = await c.evaluate(`(${DIFF_SRC})(${JSON.stringify(b1)}, ${JSON.stringify(b2)})`);
    } catch {}
    let bestDiff = Math.max(d1, d2), viaSpectate = false;
    // static? try spectate mode — many Hawk games need ?spectate=1&autostart=1 to perform
    if (bestDiff <= 2.0 && !url.includes('spectate')) {
      try {
        await c.send('Page.navigate', { url: loadUrl + '&spectate=1&autostart=1' });
        for (let i = 0; i < 40 && (await c.evaluate('document.readyState').catch(() => '')) !== 'complete'; i++) await sleep(150);
        await waitForCanvas(c, 8000);
        await sleep(3000);
        const sb0 = await screenshot(c);
        await sleep(3000);
        const sb1 = await screenshot(c);
        const sd = await c.evaluate(`(${DIFF_SRC})(${JSON.stringify(sb0)}, ${JSON.stringify(sb1)})`).catch(() => 0);
        if (sd > bestDiff) { bestDiff = sd; viaSpectate = true; }
      } catch {}
    }
    const animated = bestDiff > 1.0;
    r.checks.animating = { pts: animated ? 20 : 0, max: 20,
      detail: animated ? `motion detected (frame diff ${bestDiff})${viaSpectate ? ' via spectate mode' : ''}` : `static (frame diff ${bestDiff})` };
    r.score += r.checks.animating.pts;

    // --- 3. not flat single color (15 pts) ---
    // dominantShare > 0.95 on the CANVAS rect = flat. (Page-level 95% rule was too strict;
    // canvas-level analysis from threejs-qa-release is the right scope.)
    const m2 = await metricsOf(b2);
    const notFlat = m2.hasCanvas && m2.dominantShare <= 0.95;
    r.checks.notFlat = { pts: notFlat ? 15 : 0, max: 15,
      detail: m2.hasCanvas ? `dominant ${(m2.dominantShare * 100).toFixed(1)}% of canvas, ${m2.colorBuckets} buckets` : 'no canvas to measure' };
    r.score += r.checks.notFlat.pts;

    // --- 4. discernible game elements (15 pts) ---
    // Rich scene: entropy + edge density + contrast all signal "game" vs "blank/loader".
    // threejs-qa-release uses entropy/edges/contrast as the visual scorecard.
    const bodyText = (await c.evaluate(`document.body ? document.body.innerText.slice(0, 300) : ''`).catch(() => '')).trim();
    const stuckLoading = /loading/i.test(bodyText) && (m2.dominantShare || 1) > 0.9;
    const rich = m2.hasCanvas && ((m2.colorEntropyBits > 2.0 && m2.contrast > 20) || m2.edgeDensity > 0.02);
    const elements = m2.hasCanvas && !stuckLoading && rich;
    r.checks.elements = { pts: elements ? 15 : 0, max: 15,
      detail: elements ? `entropy ${m2.colorEntropyBits} bits, edges ${m2.edgeDensity}, contrast ${m2.contrast}`
        : [!m2.hasCanvas && 'no canvas', stuckLoading && 'stuck on loading', m2.hasCanvas && !rich && `sparse scene (entropy ${m2.colorEntropyBits}, edges ${m2.edgeDensity}, contrast ${m2.contrast})`].filter(Boolean).join('; ') };
    r.score += r.checks.elements.pts;

    // --- 5. responds to input (15 pts) ---
    let inputOk = false, inputDiff = 0;
    try {
      const before = await screenshot(c);
      await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: W / 2, y: H / 2, button: 'left', clickCount: 1 });
      await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: W / 2, y: H / 2, button: 'left', clickCount: 1 });
      await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
      await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
      await sleep(1500);
      const after = await screenshot(c);
      inputDiff = await c.evaluate(`(${DIFF_SRC})(${JSON.stringify(before)}, ${JSON.stringify(after)})`).catch(() => 0);
      inputOk = inputDiff > 1.0;
    } catch {}
    r.checks.input = { pts: inputOk ? 15 : 0, max: 15,
      detail: inputOk ? `visual change after click+space (diff ${inputDiff})` : `no response (diff ${inputDiff})` };
    r.score += r.checks.input.pts;

    // --- 6. orientation (15 pts) ---
    const vp = await c.evaluate(`({ w: window.innerWidth, h: window.innerHeight })`).catch(() => ({ w: W, h: H }));
    const isLandscapeVp = vp.w > vp.h;
    const wantOk = landscape ? isLandscapeVp : portrait ? !isLandscapeVp : true;
    const fillsVp = m2.hasCanvas && m2.rect.w >= vp.w * 0.5 && m2.rect.h >= vp.h * 0.5;
    const orientPts = wantOk && fillsVp ? 15 : wantOk || fillsVp ? 8 : 0;
    r.checks.orientation = { pts: orientPts, max: 15,
      detail: `${vp.w}x${vp.h} ${isLandscapeVp ? 'landscape' : 'portrait'}${m2.hasCanvas ? `, canvas ${m2.rect.w}x${m2.rect.h}` : ''}` };
    r.score += r.checks.orientation.pts;

    r.pass = r.score >= PASS_THRESHOLD;

    // save screenshots (redacted from JSON)
    const shots = [['boot', b0], ['t4s', b1], ['t7s', b2]];
    if (shotDir) {
      mkdirSync(shotDir, { recursive: true });
      const slug = (r.id || url.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)).replace(/^-+|-+$/g, '');
      for (const [label, b64] of shots) {
        const p = join(shotDir, `${slug}.${label}.png`);
        writeFileSync(p, Buffer.from(b64, 'base64'));
        r.screenshots.push(p);
      }
    }
    r.metrics = { entropy: m2.colorEntropyBits, edges: m2.edgeDensity, contrast: m2.contrast, dominantShare: m2.dominantShare, buckets: m2.colorBuckets };
  } finally { await c.close(); }
  return r;
}

/** Judge every game in the Hawk catalog. Returns ranked array. */
export async function judgeAll({ landscape = false, portrait = false, timeout = 30, shotDir = '.gp/judge', onGame = null } = {}) {
  const res = await fetch(HAWK_GAMES_JSON);
  if (!res.ok) throw new Error(`could not fetch Hawk catalog: ${res.status}`);
  const games = await res.json();
  const list = Array.isArray(games) ? games : games.games || [];
  const results = [];
  for (const g of list) {
    if (!g.path) { results.push({ id: g.id, title: g.title, score: 0, pass: false, error: 'no path' }); continue; }
    try {
      const r = await judgeGame(HAWK_BASE + g.path, { landscape, portrait, timeout, shotDir });
      r.id = g.id; r.title = g.title || g.id;
      results.push(r);
    } catch (e) {
      results.push({ id: g.id, title: g.title || g.id, score: 0, pass: false, error: String(e.message).split('\n')[0] });
    }
    if (onGame) onGame(results[results.length - 1], results.length, list.length);
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}
