import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isLocalAiEnabled, probeLocalAi, askLocalAi, healGame } from '../lib/local_ai.mjs';
import { inferLegoSpecFromIdea, buildLegoGame } from '../lib/lego.mjs';
import { contextDigest } from '../lib/extras.mjs';
import { gatherStats } from '../lib/stats.mjs';
import * as hosts from '../lib/hosts/index.mjs';

test('local AI is strictly optional and disabled by default unless requested', async () => {
  assert.equal(isLocalAiEnabled({}), false);
  assert.equal(isLocalAiEnabled({ localAi: false }), false);
  assert.equal(isLocalAiEnabled({ noLocalAi: true }), false);
  assert.equal(isLocalAiEnabled({ localAi: true }), true);

  // When disabled, askLocalAi returns null immediately without network calls
  const res = await askLocalAi('hello', { enabled: false });
  assert.equal(res, null);

  // Probing an unreachable port returns available: false cleanly without throwing
  const deadProbe = await probeLocalAi({ host: 'http://127.0.0.1:59999', timeoutMs: 200 });
  assert.equal(deadProbe.available, false);
});

test('contextDigest outputs compact token-saving schema for 2d, 3d, lego, and recipes', () => {
  const all = contextDigest({ mode: 'all' });
  assert.ok(Array.isArray(all.workflow));
  assert.ok(all.recipes.includes('merge-sandbox'));
  assert.ok(all.gp2d && all.gp3d && all.gplego);

  const rec = contextDigest({ recipe: 'merge-sandbox' });
  assert.equal(rec.recipe, 'merge-sandbox');
  assert.ok(rec.command.includes('--recipe merge-sandbox'));
});

test('Lego hybrid game generator works deterministically without Local AI', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'gp-lego-test-'));
  try {
    const spec = inferLegoSpecFromIdea('merge exploding cats in a lane runner', 'cat-merge-run');
    assert.equal(spec.id, 'cat-merge-run');
    assert.equal(spec.controller, 'swerve');
    assert.equal(spec.hook, 'merge-tier');

    const built = await buildLegoGame('cat-merge-run', {
      idea: 'merge exploding cats in a lane runner',
      gamesDir: join(tmp, 'games'),
      examples: join(tmp, 'examples'),
      localAi: false,
    });
    assert.ok(existsSync(join(built.dir, 'index.html')));
    assert.ok(existsSync(built.plan));
    assert.ok(existsSync(built.meta));
    assert.ok(existsSync(join(tmp, 'games', '_vendor', 'gplego.js')));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('healGame applies deterministic repairs even when Local AI is disabled', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'gp-heal-test-'));
  try {
    const gdir = join(tmp, 'games', 'broken-3d');
    mkdirSync(gdir, { recursive: true });
    writeFileSync(join(gdir, 'index.html'), '<!doctype html><html><body><script type="module">const st = createStage({});</script></body></html>');
    const res = await healGame('broken-3d', {
      gamesDir: join(tmp, 'games'),
      examples: join(tmp, 'examples'),
      localAi: false,
    });
    assert.equal(res.ok, true);
    assert.equal(res.usedLocalAi, false);
    const patched = readFileSync(join(gdir, 'index.html'), 'utf8');
    assert.ok(patched.includes('window.__game = st'));
    assert.ok(patched.includes('st.shell('));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('all host publishers (itch, youtube, steam, crazygames, github) support dryRun', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'gp-hosts-test-'));
  try {
    const manifest = {
      id: 'demo-game',
      meta: { title: 'Demo Game', description: 'A fun demo' },
      bundle: { zip: join(tmp, 'demo.zip') },
      itch: { dir: join(tmp, 'itch'), zip: join(tmp, 'demo.zip') },
      youtube: { video: join(tmp, 'short.mp4'), thumbnail: join(tmp, 'thumb.png'), title: 'Demo #shorts', tags: ['shorts'] },
      steam: { dir: join(tmp, 'steam', 'out') },
      crazygames: { dir: join(tmp, 'cg'), zip: join(tmp, 'demo.zip'), preview: join(tmp, 'preview.mp4') },
    };
    for (const name of ['itch', 'youtube', 'steam', 'crazygames', 'github']) {
      const r = await hosts[name].upload(manifest, { dryRun: true });
      assert.equal(r.ok, true, `${name} dryRun should succeed`);
      assert.equal(r.dryRun, true);
      assert.equal(r.plan.platform, name);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('gatherStats computes promotion verdicts from grade and metrics', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'gp-stats-test-'));
  try {
    mkdirSync(join(tmp, 'games', 'alpha'), { recursive: true });
    mkdirSync(join(tmp, '.gp'), { recursive: true });
    writeFileSync(join(tmp, '.gp', 'alpha.grade.json'), JSON.stringify({ score: 92, pass: true }));
    const st = await gatherStats('alpha', {
      gamesDir: join(tmp, 'games'),
      publishDir: join(tmp, 'publish'),
      stateDir: join(tmp, '.gp'),
    });
    assert.equal(st.count, 1);
    assert.equal(st.games[0].id, 'alpha');
    assert.equal(st.games[0].gradeScore, 92);
    assert.equal(st.games[0].verdict, 'PROMOTE_TO_PACK');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
