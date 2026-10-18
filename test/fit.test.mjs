import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const bin = new URL('../bin/gamepress.mjs', import.meta.url).pathname;
const skip = spawnSync('ffmpeg', ['-version']).status === 0 ? false : 'ffmpeg not installed';
const run = (...a) => execFileSync('node', [bin, ...a], { encoding: 'utf8' });
const mk = (file, size, dur = 0) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `testsrc2=s=${size}:r=30:d=${dur || 1}`, ...(dur ? ['-pix_fmt', 'yuv420p'] : ['-frames:v', '1']), file]);

test('pack builds every Steam/itch/CrazyGames/social asset at exact sizes and check passes', { skip }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'gp-test-'));
  mkdirSync(join(dir, 'raw', 'shots'), { recursive: true }); mkdirSync(join(dir, 'raw', 'clips'));
  mk(join(dir, 'raw', 'hero.png'), '1920x1080');
  for (let i = 1; i <= 5; i++) mk(join(dir, 'raw', 'shots', `s${i}.png`), '1920x1080');
  mk(join(dir, 'raw', 'clips', 'a.mp4'), '1280x720', 2);
  run('pack', '--dir', dir);
  assert.ok(existsSync(join(dir, 'out', 'steam', 'library_hero.png')));
  assert.ok(existsSync(join(dir, 'out', 'itch', 'cover.gif')));
  assert.match(run('check', '--dir', dir), /All good/);
});

test('check fails when Steam has fewer than 5 screenshots', { skip }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'gp-test-'));
  mkdirSync(join(dir, 'raw', 'shots'), { recursive: true }); mkdirSync(join(dir, 'raw', 'clips'));
  mk(join(dir, 'raw', 'hero.png'), '1920x1080');
  mk(join(dir, 'raw', 'shots', 's1.png'), '1920x1080');
  mk(join(dir, 'raw', 'clips', 'a.mp4'), '1280x720', 2);
  run('pack', '--dir', dir, '--platforms', 'steam');
  assert.throws(() => run('check', '--dir', dir), /Command failed/);
});
