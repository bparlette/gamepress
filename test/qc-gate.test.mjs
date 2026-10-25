import test from 'node:test';
import assert from 'node:assert/strict';
import { publishDemo } from '../lib/tasks.mjs';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

test('QC Gate: publishDemo rejects games with low grade or missing assets', async () => {
  const tmpDir = '/tmp/gamepress-qc-test';
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(join(tmpDir, 'games', 'bad-game'), { recursive: true });
  mkdirSync(join(tmpDir, 'examples', 'bad-game'), { recursive: true });
  mkdirSync(join(tmpDir, 'press', 'video'), { recursive: true });

  // Minimal flat/broken game
  writeFileSync(join(tmpDir, 'games', 'bad-game', 'index.html'), `
    <!DOCTYPE html>
    <html><body><canvas id="c"></canvas><script>
      // Broken minimal code without hitstop, screenshake, sprites, audio
      const ctx = document.getElementById('c').getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0,0,100,100);
    </script></body></html>
  `);

  writeFileSync(join(tmpDir, 'examples', 'bad-game', 'meta.json'), JSON.stringify({
    title: 'Bad Game',
    slug: 'bad-game'
  }));

  writeFileSync(join(tmpDir, 'press', 'video', 'bad-game-hook.thumb.jpg'), 'fake-thumb');
  writeFileSync(join(tmpDir, 'catalog.json'), JSON.stringify({ games: [] }));

  let errorCaught = null;
  try {
    await publishDemo('bad-game', {
      catalog: join(tmpDir, 'catalog.json'),
      videoDir: join(tmpDir, 'press', 'video'),
      examples: join(tmpDir, 'examples'),
      push: false
    });
  } catch (err) {
    errorCaught = err;
  }

  assert.ok(errorCaught, 'publishDemo should throw when game fails QC gate');
  assert.match(errorCaught.message, /QC GATE REJECTED|render first/);

  // Cleanup
  rmSync(tmpDir, { recursive: true, force: true });
});
