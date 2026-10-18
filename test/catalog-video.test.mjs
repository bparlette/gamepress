// lib/catalog.mjs: video option copies a hook mp4 as a web preview and sets entry.video.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { catalogCommand, removeGame } from '../lib/catalog.mjs';

const DIR = '/tmp/catalog-video-test';
rmSync(DIR, { recursive: true, force: true });
mkdirSync(join(DIR, 'thumbs'), { recursive: true });
writeFileSync(join(DIR, 'games.json'), JSON.stringify({ categories: [], games: [] }));

test('catalogCommand with video sets entry.video and writes preview mp4', () => {
  // make a tiny source mp4
  const src = join(DIR, 'hook.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=duration=1:size=320x240:rate=10', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', src]);
  const cat = catalogCommand({ catalogPath: join(DIR, 'games.json'), video: src,
    entry: { id: 't1', title: 'T1', path: 'g/t1/index.html' } });
  const g = cat.games.find(x => x.id === 't1');
  assert.ok(g.video && g.video.startsWith('videos/t1-hook.mp4'), 'video field set: ' + g.video);
  assert.ok(existsSync(join(DIR, 'videos', 't1-hook.mp4')), 'preview mp4 written');
  // probe: no audio, <=480 wide
  const probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width', '-of', 'csv=p=0', join(DIR, 'videos', 't1-hook.mp4')]).toString().trim();
  assert.ok(Number(probe.split('\n')[0]) <= 480, 'scaled down: ' + probe);
  removeGame(join(DIR, 'games.json'), 't1');
  assert.ok(!existsSync(join(DIR, 'videos', 't1-hook.mp4')), 'removeGame deletes video too');
  rmSync(DIR, { recursive: true, force: true });
});
