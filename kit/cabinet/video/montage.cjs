// Montage: best moment of each game -> frames.  node video/montage.cjs  (OUT=/tmp/montage)  then python3 video/montage.py
// Per game: fast-forward (bot or scripted keys) until a "best moment" condition on info() holds, then capture N frames at 30 fps (2 sim ticks per frame).
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'); const OUT = process.env.OUT || '/tmp/montage';
const CLIPS = [
  { g:'g38', title:'FLOPPY RACE', keys:true, when:i => i.st === 'fall' && i.t > 3, note:'trip = real ragdoll flop' },
  { g:'g39', title:'TRAINING DOJO', when:i => i.score >= 900, note:'combo on the dummy' },
  { g:'g40', title:'TOURNAMENT LADDER', when:i => i.pr > 0 && i.hp2 < 90, note:'fireball in round 1' },
  { g:'g41', title:'BOSS RUSH', when:i => i.pr > 0 && i.hp2 < 90, note:'armoured boss' },
  { g:'g42', title:'STREET BRAWL', when:i => i.wave >= 2 && i.en >= 4, note:'gang wave 2' },
  { g:'g43', title:'SUMO SHOVE', when:i => i.pos > .8, note:'shove to the edge' },
  { g:'g44', title:'FIREBALL DODGEBALL', when:i => i.balls >= 2 && i.t > 6, note:'two balls in the air' },
  { g:'g45', title:'GRAPPLE DUEL', when:i => i.ph === 'reveal' && (i.pc === 2 || i.cc === 2) && i.res !== 0 && i.rt < .15 && i.n >= 3, note:'throw lands' } ];
const N = [38, 38, 38, 38, 37, 37, 37, 37];
(async () => { fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true }); const b = await chromium.launch(); const meta = [];
  for (let c = 0; c < CLIPS.length; c++) { const C = CLIPS[c], pg = await b.newPage({ viewport:{ width:400, height:760 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + path.resolve(__dirname, '../out/' + C.g + '.html') + '?seed=1'); await pg.waitForTimeout(300); await pg.evaluate(() => document.fonts.ready);
    await pg.evaluate(() => { window.__shell.start(); }); if (!C.keys) await pg.evaluate(() => window.__shell.bot(true, 'expert'));
    const fn = new Function('i', 'return (' + C.when.toString() + ')(i)'); let found = false, ticks = 0;
    for (; ticks < 7200; ticks += 2) { const i = await pg.evaluate(() => window.__shell.info()); if (i.mode !== 'play') break; let ok = false; try { ok = C.when(i); } catch (_) {} if (ok) { found = true; break; }
      if (C.keys) { const k = (Math.floor(ticks / 8) & 1) ? 'KeyX' : 'KeyZ'; if (ticks % 8 === 0) await pg.keyboard.down(k); if (ticks % 8 === 4) { await pg.keyboard.up('KeyZ'); await pg.keyboard.up('KeyX'); } }
      await pg.evaluate(() => window.__shell.ff(2)); }
    const dir = OUT + '/c' + c; fs.mkdirSync(dir); let shots = 0;
    for (let f = 0; f < N[c]; f++) { const u = await pg.evaluate(() => { window.__shell.render(); return document.getElementById('screen').toDataURL('image/png'); }); fs.writeFileSync(dir + '/' + String(f).padStart(3, '0') + '.png', Buffer.from(u.split(',')[1], 'base64')); shots++;
      if (C.keys && f < 14) { /* keep mashing to show the stumble then the flop */ } await pg.evaluate(() => window.__shell.ff(2)); }
    meta.push({ clip:c, g:C.g, title:C.title, found, atTick:ticks, shots, errs:errs.slice(0, 1) }); console.log(JSON.stringify(meta[meta.length - 1])); await pg.close(); }
  fs.writeFileSync(OUT + '/meta.json', JSON.stringify(meta)); await b.close(); })();
