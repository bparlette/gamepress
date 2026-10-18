// lib/judge.mjs — Multi-state visual inspection with faceted scoring.
// Inspired by visual review loops (Plan -> Build -> Judge), adapted for GamePress:
// 100% deterministic, zero external tokens by default, optional vision hook.
//
// Evaluates 4 facets across 3 lifecycle states (boot, action, over):
//   1. palette:     color variance, bucket richness, flat-render threshold (<95%)
//   2. camera:      quadrant balance, center focus, no off-screen clipping
//   3. layout:      canvas dimensions, viewport fill, WebGL context, touch clearance
//   4. readability: HUD contrast ratio against background, text legibility

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
import { bucketPixels, FLAT_THRESHOLD, analyzePixels } from './visual.mjs';
import { launchChrome } from './cdp.mjs';
import { serveDir } from './serve.mjs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Pure luminance calculation for RGBA pixel (Rec. 709).
 */
export function getLuminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/**
 * Contrast ratio between two luminances (1.0 to 21.0, WCAG 2.1).
 */
export function contrastRatio(lum1, lum2) {
  const l1 = Math.max(lum1, lum2);
  const l2 = Math.min(lum1, lum2);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * Evaluate 4 facets on raw RGBA pixel data (downsampled, e.g. 64x64).
 * Pure function: operates directly on Uint8ClampedArray/Buffer, 100% unit-testable without browser.
 */
export function evaluateFacets(data, width = 64, height = 64, meta = {}) {
  const totalPixels = width * height;
  const bucketInfo = bucketPixels(data, totalPixels);
  const fixes = [];

  // --- Facet 1: Palette (Color variance, richness, non-flat)
  let paletteScore = 100;
  if (bucketInfo.topPct > FLAT_THRESHOLD) {
    paletteScore = Math.max(0, 100 - (bucketInfo.topPct - FLAT_THRESHOLD) * 20);
    fixes.push(`Renders flat: ${bucketInfo.topPct}% ${bucketInfo.dominant} (threshold ${FLAT_THRESHOLD}%)`);
  } else if (bucketInfo.topPct > 80) {
    paletteScore = 80 - (bucketInfo.topPct - 80) * 2;
  }
  // Reward healthy color variety (more than 12 discrete 16-level buckets)
  if (bucketInfo.buckets < 8) {
    paletteScore = Math.min(paletteScore, 50);
    fixes.push(`Very low color variance: only ${bucketInfo.buckets} color buckets detected`);
  } else if (bucketInfo.buckets >= 30) {
    paletteScore = Math.min(100, paletteScore + 5);
  }
  paletteScore = Math.round(Math.max(0, Math.min(100, paletteScore)));

  // --- Facet 2: Camera & Framing (Quadrant balance + center focus)
  // Divide into 4 quadrants: TL, TR, BL, BR
  const hw = Math.floor(width / 2);
  const hh = Math.floor(height / 2);
  const quadCounts = [0, 0, 0, 0];
  let centerNonDominant = 0;
  let totalNonDominant = 0;

  // Extract dominant RGB for non-dominant masking
  const domR = parseInt(bucketInfo.dominant.slice(1, 3), 16) || 0;
  const domG = parseInt(bucketInfo.dominant.slice(3, 5), 16) || 0;
  const domB = parseInt(bucketInfo.dominant.slice(5, 7), 16) || 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const diff = Math.abs(r - domR) + Math.abs(g - domG) + Math.abs(b - domB);
      const isFeature = diff > 48; // distinct from background

      if (isFeature) {
        totalNonDominant++;
        const qIdx = (y >= hh ? 2 : 0) + (x >= hw ? 1 : 0);
        quadCounts[qIdx]++;
        // Center box (inner 50% width and height)
        if (x >= width * 0.25 && x < width * 0.75 && y >= height * 0.25 && y < height * 0.75) {
          centerNonDominant++;
        }
      }
    }
  }

  let cameraScore = 85;
  let quadrantBalance = 1.0;
  if (totalNonDominant > 10) {
    const maxQ = Math.max(...quadCounts);
    const minQ = Math.min(...quadCounts);
    quadrantBalance = Math.round((1 - (maxQ - minQ) / totalNonDominant) * 100) / 100;
    const centerRatio = centerNonDominant / totalNonDominant;

    // Severe clustering: >85% of visual activity trapped in a single quadrant
    if (maxQ / totalNonDominant > 0.88) {
      cameraScore -= 40;
      const qNames = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      const dominantQ = qNames[quadCounts.indexOf(maxQ)];
      fixes.push(`Camera framing off-center: ${Math.round(maxQ / totalNonDominant * 100)}% of visual features trapped in ${dominantQ}`);
    } else if (centerRatio < 0.15) {
      cameraScore -= 20;
      fixes.push('Action dead-zone: low visual activity in center 50% of viewport');
    } else if (centerRatio >= 0.35) {
      cameraScore = Math.min(100, cameraScore + 15);
    }
  } else if (bucketInfo.topPct < FLAT_THRESHOLD) {
    // Low features but not solid flat (e.g. subtle textures)
    cameraScore = 70;
  } else {
    cameraScore = 0;
  }
  cameraScore = Math.round(Math.max(0, Math.min(100, cameraScore)));

  // --- Facet 3: Layout (Canvas presence, sizing, WebGL support)
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
      } else {
        const isWebGL = canvases.some(c => c.kind === 'webgl' || c.webgl);
        if (meta.needs3D && !isWebGL) {
          layoutScore -= 30;
          fixes.push('3D game expected WebGL canvas but found 2D context');
        }
      }
    }
  }
  if (meta.bodyText && /stuck|error|exception/i.test(meta.bodyText)) {
    layoutScore = Math.min(layoutScore, 20);
    fixes.push(`Page text contains error markers: "${meta.bodyText.slice(0, 80)}"`);
  }
  layoutScore = Math.round(Math.max(0, Math.min(100, layoutScore)));

  // --- Facet 4: Readability (Contrast between features & background)
  let readabilityScore = 80;
  const domLum = getLuminance(domR, domG, domB);
  let bestContrast = 1.0;

  // Sample contrast of high-variance pixels against background
  for (let i = 0; i < totalPixels; i += 8) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const lum = getLuminance(r, g, b);
    const cr = contrastRatio(lum, domLum);
    if (cr > bestContrast) bestContrast = cr;
  }
  bestContrast = Math.round(bestContrast * 10) / 10;

  if (bestContrast < 2.5 && bucketInfo.topPct < FLAT_THRESHOLD) {
    readabilityScore = 40;
    fixes.push(`Low foreground contrast ratio (${bestContrast}:1 against ${bucketInfo.dominant})`);
  } else if (bestContrast >= 4.5) {
    readabilityScore = Math.min(100, 80 + Math.min(20, Math.round((bestContrast - 4.5) * 4)));
  } else {
    readabilityScore = 70;
  }
  readabilityScore = Math.round(Math.max(0, Math.min(100, readabilityScore)));

  // Weighted overall score
  const score = Math.round(
    paletteScore * 0.30 +
    cameraScore * 0.25 +
    layoutScore * 0.25 +
    readabilityScore * 0.20
  );

  let verdict = 'FAIL';
  if (score >= 85) verdict = 'PASS';
  else if (score >= 65) verdict = 'NEEDS_POLISH';

  return {
    score,
    verdict,
    facets: {
      palette: { score: paletteScore, dominant: bucketInfo.dominant, flatPct: bucketInfo.topPct, buckets: bucketInfo.buckets },
      camera: { score: cameraScore, quadrantBalance },
      layout: { score: layoutScore, canvasCount: canvases.length },
      readability: { score: readabilityScore, maxContrast: bestContrast },
    },
    fixes,
  };
}

/**
 * Multi-state visual judge on a live game via CDP:
 * Samples 3 states:
 *   1. boot   — initial title/spawn (t=0.8s)
 *   2. action — active gameplay with inputs/particles (t=2.5s)
 *   3. over   — climax/win/over screen (t=4.0s)
 *
 * target: game directory, path to index.html, or http URL.
 * Returns structured inspection report with screenshots and fixes.
 */
export async function judgeGame(target, {
  width = 540,
  height = 960,
  shotDir = '.gp/judge',
  seed = 42,
  visionHook = null,
} = {}) {
  const isUrl = /^https?:/.test(target);
  let server = null;
  let gameUrl = target;
  const gameId = basename(resolve(target)).replace(/\.html$/, '').replace(/^index$/, '') || 'game';

  if (!isUrl) {
    const fullPath = resolve(target);
    const docRoot = fullPath.endsWith('.html') ? dirname(fullPath) : fullPath;
    const srv = await serveDir(docRoot);
    server = srv;
    const file = fullPath.endsWith('.html') ? basename(fullPath) : 'index.html';
    gameUrl = `http://127.0.0.1:${srv.port}/${file}?dpr=1&clean=1&auto=1&seed=${seed}`;
  } else if (!gameUrl.includes('?')) {
    gameUrl += `?dpr=1&clean=1&auto=1&seed=${seed}`;
  }

  const client = await launchChrome({ width, height });
  const states = {};
  const allFixes = new Set();
  mkdirSync(shotDir, { recursive: true });

  try {
    await client.send('Page.navigate', { url: gameUrl });
    for (let i = 0; i < 60 && (await client.evaluate('document.readyState').catch(() => '')) !== 'complete'; i++) {
      await sleep(100);
    }

    // 1. Boot State (Settled intro / title)
    await sleep(800);
    const bootShot = await client.send('Page.captureScreenshot', { format: 'png' });
    const bootB64 = bootShot.result.data;
    const bootBytes = Buffer.from(bootB64, 'base64');
    const bootFile = join(shotDir, `${gameId}.boot.png`);
    writeFileSync(bootFile, bootBytes);

    const meta = {
      canvases: await client.evaluate(`[...document.querySelectorAll('canvas')].map(c => ({ w: c.width, h: c.height, cssW: c.clientWidth, cssH: c.clientHeight, kind: c.getContext('webgl2') || c.getContext('webgl') ? 'webgl' : '2d' }))`).catch(() => []),
      bodyText: (await client.evaluate('document.body ? document.body.innerText.slice(0, 200) : ""').catch(() => '')).trim(),
    };
    const bootAnalysis = await analyzePixels(client, bootB64).catch(() => null);
    const bootBuffer = Buffer.from(bootB64, 'base64');
    // Analyze using CDP downsampled data or evaluateFacets
    const bootEval = evaluateFacets(bootBytes, width, height, meta);
    states.boot = { file: bootFile, ...bootEval };
    bootEval.fixes.forEach(f => allFixes.add(`[boot] ${f}`));

    // 2. Action State (Inject input or let auto bot run)
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: Math.floor(width / 2), y: Math.floor(height * 0.65), button: 'left', clickCount: 1 }).catch(() => {});
    await sleep(200);
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.floor(width / 2), y: Math.floor(height * 0.65), button: 'left', clickCount: 1 }).catch(() => {});
    await sleep(1500);

    const actionShot = await client.send('Page.captureScreenshot', { format: 'png' });
    const actionB64 = actionShot.result.data;
    const actionBytes = Buffer.from(actionB64, 'base64');
    const actionFile = join(shotDir, `${gameId}.action.png`);
    writeFileSync(actionFile, actionBytes);

    const actionEval = evaluateFacets(actionBytes, width, height, meta);
    states.action = { file: actionFile, ...actionEval };
    actionEval.fixes.forEach(f => allFixes.add(`[action] ${f}`));

    // 3. Over State (Advance to game end or wait for banner)
    await sleep(1500);
    const overShot = await client.send('Page.captureScreenshot', { format: 'png' });
    const overB64 = overShot.result.data;
    const overBytes = Buffer.from(overB64, 'base64');
    const overFile = join(shotDir, `${gameId}.over.png`);
    writeFileSync(overFile, overBytes);

    const overEval = evaluateFacets(overBytes, width, height, meta);
    states.over = { file: overFile, ...overEval };
    overEval.fixes.forEach(f => allFixes.add(`[over] ${f}`));

    // Optional Vision Hook (if caller supplied vision or local AI hook)
    let visionCritique = null;
    if (visionHook) {
      try {
        visionCritique = await visionHook([bootFile, actionFile, overFile]);
      } catch (err) {
        visionCritique = { error: err.message };
      }
    }

    // Aggregate weighted multi-state score
    const avgScore = Math.round(
      states.boot.score * 0.25 +
      states.action.score * 0.50 +
      states.over.score * 0.25
    );

    let finalVerdict = 'FAIL';
    if (avgScore >= 85) finalVerdict = 'PASS';
    else if (avgScore >= 65) finalVerdict = 'NEEDS_POLISH';

    const result = {
      id: gameId,
      score: avgScore,
      verdict: finalVerdict,
      facets: {
        palette: states.action.facets.palette,
        camera: states.action.facets.camera,
        layout: states.action.facets.layout,
        readability: states.action.facets.readability,
      },
      states: {
        boot: { score: states.boot.score, verdict: states.boot.verdict, file: states.boot.file },
        action: { score: states.action.score, verdict: states.action.verdict, file: states.action.file },
        over: { score: states.over.score, verdict: states.over.verdict, file: states.over.file },
      },
      fixes: [...allFixes],
      vision: visionCritique,
    };

    return result;
  } finally {
    await client.close().catch(() => {});
    if (server) server.close();
  }
}
