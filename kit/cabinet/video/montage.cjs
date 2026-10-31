// Showcase montage: 3 clips x 3.33 s per game (30 fps, 2 sim ticks per frame) -> $OUT/c<n>/*.png + meta.json.  node video/montage.cjs [gameFilter...]   then  python3 video/montage.py out.mp4
// Each clip is its own run from the start (bot or scripted keys), fast-forwarded until its `when(info)` condition holds, then 100 frames are captured.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'); const OUT = process.env.OUT || '/tmp/montage';
const G = (g, title, a, b, c, keys) => [[a, 'bot'], [b, keys || 'bot'], [c, 'bot']].map(([w, m], k) => ({ g, title, clip:k, when:w, mode:m }));
const CLIPS = [
  ...G('g38', 'FLOPPY RACE', i => i.t >= 1.9, i => i.st === 'fall' && i.t > 3, i => i.x[0] >= 1560, 'keys'),
  ...G('g39', 'TRAINING DOJO', i => i.score >= 250, i => i.score >= 800, i => i.score >= 1300),
  ...G('g40', 'TOURNAMENT LADDER', i => i.t >= 1.7, i => i.pr > 0 && i.hp2 < 90, i => i.rd === 3 && i.hp2 < 70),
  ...G('g41', 'BOSS RUSH', i => i.t >= 1.7, i => i.pr > 0 && i.hp2 < 95, i => i.hp2 < 45),
  ...G('g42', 'STREET BRAWL', i => i.wave === 1 && i.en >= 3, i => i.wave === 2 && i.en >= 4, i => i.wave >= 3 && i.en >= 1),
  ...G('g43', 'SUMO SHOVE', i => i.t >= 1.3, i => i.pos > .4, i => i.pos > .8),
  ...G('g44', 'FIREBALL DODGEBALL', i => i.t >= 1.05, i => i.balls >= 2 && i.t > 6, i => i.ch <= 2),
  ...G('g45', 'GRAPPLE DUEL', i => i.n === 1 && i.ph === 'reveal', i => i.ph === 'reveal' && (i.pc === 2 || i.cc === 2) && i.res !== 0 && i.rt < .15 && i.n >= 3, i => i.ch <= 40 && i.ph === 'reveal') ];
const NF = 100, only = process.argv.slice(2);
(async () => { fs.mkdirSync(OUT, { recursive:true }); const b = await chromium.launch(); const meta = fs.existsSync(OUT + '/meta.json') && only.length ? JSON.parse(fs.readFileSync(OUT + '/meta.json')) : [];
  for (let n = 0; n < CLIPS.length; n++) { const C = CLIPS[n]; if (only.length && !only.includes(C.g)) continue; let ok2 = false; for (let attempt = 0; attempt < 5 && !ok2; attempt++) { const pg = await b.newPage({ viewport:{ width:400, height:760 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + path.resolve(__dirname, '../out/' + C.g + '.html') + '?seed=1'); await pg.waitForTimeout(300); await pg.evaluate(() => document.fonts.ready);
    await pg.evaluate(() => window.__shell.start()); if (C.mode === 'bot') await pg.evaluate(() => window.__shell.bot(true, 'expert'));
    let found = false, ticks = 0; for (; ticks < 9000; ticks += 2) { const i = await pg.evaluate(() => window.__shell.info()); if (i.mode !== 'play') break; let ok = false; try { ok = C.when(i); } catch (_) {} if (ok) { found = true; break; }
      if (C.mode === 'keys') { const k = (Math.floor(ticks / 8) & 1) ? 'KeyX' : 'KeyZ'; if (ticks % 8 === 0) await pg.keyboard.down(k); if (ticks % 8 === 4) { await pg.keyboard.up('KeyZ'); await pg.keyboard.up('KeyX'); } } await pg.evaluate(() => window.__shell.ff(2)); }
    const dir = OUT + '/c' + String(n).padStart(2, '0'); fs.rmSync(dir, { recursive:true, force:true }); fs.mkdirSync(dir);
    for (let f = 0; f < NF; f++) { const u = await pg.evaluate(() => { window.__shell.render(); return document.getElementById('screen').toDataURL('image/png'); }); fs.writeFileSync(dir + '/' + String(f).padStart(3, '0') + '.png', Buffer.from(u.split(',')[1], 'base64'));
      if (C.mode === 'keys') { const k = (Math.floor((ticks + f * 2) / 8) & 1) ? 'KeyX' : 'KeyZ'; if ((ticks + f * 2) % 8 === 0) await pg.keyboard.down(k); if ((ticks + f * 2) % 8 === 4) { await pg.keyboard.up('KeyZ'); await pg.keyboard.up('KeyX'); } }
      await pg.evaluate(() => window.__shell.ff(2)); }
    const fin = await pg.evaluate(() => window.__shell.info().result); ok2 = found && !(fin && fin.win === false); const m = { n, g:C.g, title:C.title, clip:C.clip, found, atTick:ticks, attempt, lost:!!(fin && fin.win === false), errs:errs.slice(0, 1) }; const ix = meta.findIndex(x => x.n === n); if (ix >= 0) meta[ix] = m; else meta.push(m); console.log(JSON.stringify(m)); await pg.close(); }
  }
  meta.sort((a, b) => a.n - b.n); fs.writeFileSync(OUT + '/meta.json', JSON.stringify(meta)); await b.close(); })();
