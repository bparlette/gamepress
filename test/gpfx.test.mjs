// Tests for kit/gpfx.js — fullscreen post-processing game effects.
// Browser tests need Chrome; they skip gracefully when unavailable.
// Pure-logic checks (shader source sanity) always run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SRC = readFileSync(new URL('../kit/gpfx.js', import.meta.url), 'utf8');

// --- always-run: shader source sanity ---

test('gpfx: all four shaders are WebGL2 GLSL', () => {
  for (const name of ['FRAG_GLITCH', 'FRAG_VHS', 'FRAG_SHATTER', 'FRAG_RIPPLE']) {
    assert.ok(SRC.includes(`const ${name} =`), `${name} missing`);
  }
  const count = (SRC.match(/#version 300 es/g) || []).length;
  assert.ok(count >= 5, `expected 5+ shaders (4 fx + blit), got ${count}`);
});

test('gpfx: PostFX exposes the documented API', () => {
  assert.ok(SRC.includes('export class PostFX'), 'PostFX class missing');
  for (const m of ['glitch.burst', 'vhs.set', 'shatter.trigger', 'ripple.trigger', 'render(dt)', 'destroy()']) {
    assert.ok(SRC.includes(m.split('(')[0]), `API missing: ${m}`);
  }
});

test('gpfx: 2D helpers exported', () => {
  assert.ok(SRC.includes('export function applyVHSOverlay'), 'applyVHSOverlay missing');
  assert.ok(SRC.includes('export function glitchFrame'), 'glitchFrame missing');
});

test('gpfx: credits Canvas UI (MIT attribution)', () => {
  assert.ok(SRC.includes('canvas-ui'), 'attribution missing');
});

// --- browser tests: real WebGL2 in headless Chrome ---

async function chromeAvailable() {
  try {
    const { findChrome } = await import('../lib/cdp.mjs');
    findChrome();
    return true;
  } catch { return false; }
}

const TEST_PAGE = `<!DOCTYPE html><html><body>
<canvas id="game" width="320" height="180"></canvas>
<script type="module">
import { PostFX, applyVHSOverlay, glitchFrame } from './kit/gpfx.js';
const results = [];
const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail: detail || '' });
const game = document.getElementById('game');
const gtx = game.getContext('2d');
function drawPattern() {
  const grad = gtx.createLinearGradient(0, 0, 320, 180);
  grad.addColorStop(0, '#ff0000'); grad.addColorStop(0.5, '#00ff00'); grad.addColorStop(1, '#0000ff');
  gtx.fillStyle = grad; gtx.fillRect(0, 0, 320, 180);
  gtx.fillStyle = '#fff'; gtx.fillRect(140, 70, 40, 40);
}
try {
  drawPattern();
  const fx = new PostFX(game);
  check('constructs', !!fx.canvas);
  fx.render(1/60); check('passthrough', true);
  fx.glitch.burst(1.5, 0.3);
  for (let i = 0; i < 10; i++) fx.render(1/60);
  check('glitch burst', true);
  fx.vhs.set(true); fx.render(1/60); check('vhs', true); fx.vhs.set(false);
  fx.shatter.trigger(6);
  for (let i = 0; i < 80; i++) fx.render(1/60);
  check('shatter completes', fx.shatter.t >= 1);
  fx.ripple.trigger(0.5, 0.5, 1.0);
  for (let i = 0; i < 30; i++) fx.render(1/60);
  check('ripple', true);
  const rb = document.createElement('canvas'); rb.width = 320; rb.height = 180;
  rb.getContext('2d').drawImage(fx.canvas, 0, 0);
  const d = rb.getContext('2d').getImageData(0, 0, 320, 180).data;
  let sum = 0; for (let i = 0; i < d.length; i += 400) sum += d[i] + d[i+1] + d[i+2];
  check('output not black', sum > 1000, 'sum=' + sum);
  fx.destroy(); check('destroy', true);
  drawPattern(); applyVHSOverlay(game); check('applyVHSOverlay', true);
  drawPattern(); glitchFrame(game); check('glitchFrame', true);
} catch (e) { check('no exceptions', false, e.message); }
document.body.innerHTML += '<pre id="gpfx-out">GPFX_DONE ' + JSON.stringify(results) + '</pre>';
</script></body></html>`;

test('gpfx: effects render in headless Chrome (WebGL2)', async (t) => {
  if (!(await chromeAvailable())) {
    t.skip('no Chrome available');
    return;
  }
  const { launchChrome } = await import('../lib/cdp.mjs');
  const pagePath = join(tmpdir(), `gpfx-test-${Date.now()}.html`);
  // serve from repo root so ./kit/gpfx.js resolves
  const { execSync } = await import('node:child_process');
  const repoRoot = new URL('..', import.meta.url).pathname;
  writeFileSync(join(repoRoot, '.gpfx-test-page.html'), TEST_PAGE);
  const chrome = await launchChrome({ width: 320, height: 180 });
  try {
    await chrome.send('Page.navigate', { url: 'file://' + join(repoRoot, '.gpfx-test-page.html') });
    let raw = null;
    for (let i = 0; i < 40 && !raw; i++) {
      await new Promise(r => setTimeout(r, 500));
      try { raw = await chrome.evaluate(`document.getElementById('gpfx-out')?.textContent?.replace('GPFX_DONE ', '')`); } catch {}
    }
    assert.ok(raw, 'test page did not finish; console: ' + chrome.logs.join(' | '));
    for (const r of JSON.parse(raw)) {
      assert.ok(r.ok, `gpfx browser test failed: ${r.name} ${r.detail || ''}`);
    }
  } finally {
    await chrome.close();
    try { execSync(`rm -f ${join(repoRoot, '.gpfx-test-page.html')}`); } catch {}
  }
});
