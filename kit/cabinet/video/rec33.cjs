// Promo capture for g33 (Trick or Treat House): node video/rec33.cjs  -> $OUT/frames/*.jpg + meta.json (30 fps, variable game speed, events + sfx log)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const OUT = process.env.OUT || '/tmp/g33vid'; const dir = OUT + '/frames'; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const seed = process.env.SEED || 7, MAXF = +(process.env.MAXF || 2400);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const pg = await b.newPage({ viewport: { width: 400, height: 760 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { window.__norun = true; window.__log = []; window.__now = 0; });
  await pg.goto('file://' + path.resolve(__dirname, '../out/g33.art.html') + '?demo=1&seed=' + seed); await pg.evaluate(() => document.fonts.load('8px "Press Start 2P"')); await pg.waitForTimeout(500);
  const meta = []; let started = false, botOn = false, slow = 0, lastFam = 0, lastStash = 10, megaSeen = false, megaDoneAt = -1, idleTicks = 0, stealFrames = 0, endAt = -1;
  for (let f = 0; f < MAXF; f++) {
    const inf = await pg.evaluate(() => window.__shell.info());
    if (f === 45 && !started) { started = true; await pg.evaluate(() => window.__shell.start()); await pg.keyboard.down('ArrowRight'); }
    let tpf = 2;                                              // sim ticks per video frame (2 = real time)
    if (started && inf.mode === 'play') {
      if (idleTicks > 100) await pg.keyboard.up('ArrowRight');
      if (!botOn) { idleTicks += 2; tpf = idleTicks < 300 ? 2 : (inf.near > 120 ? 8 : 2); if (inf.stash < lastStash) stealFrames = 45; if (inf.stash <= 9 && f > 100) { botOn = true; await pg.evaluate(() => window.__shell.bot(true)); } stealFrames--; }
      else { tpf = 6; if (inf.fam > lastFam) slow = 90; if (inf.mega >= 0 && !megaSeen) { megaSeen = true; slow = 150; } if (slow > 0) { tpf = 2; slow--; } else if (inf.mega >= 0) tpf = inf.mega > 35 && inf.megaD > 130 ? 4 : 2; }
      if (inf.mega < 0 && megaSeen && megaDoneAt < 0) megaDoneAt = f; if (megaDoneAt >= 0 && f - megaDoneAt > 75 && endAt < 0) endAt = f;
      lastFam = inf.fam; lastStash = inf.stash;
    }
    const r = await pg.evaluate((tpf) => { const s = window.__shell; for (let i = 0; i < tpf; i++) s.step(); s.render(); const i = s.info(); return { u: (document.getElementById('gl') || document.getElementById('screen')).toDataURL('image/jpeg', 0.92), i }; }, tpf);
    fs.writeFileSync(`${dir}/f${String(f).padStart(5, '0')}.jpg`, Buffer.from(r.u.split(',')[1], 'base64'));
    meta.push({ tpf, m: r.i.mode, fam: r.i.fam, stash: r.i.stash, mega: r.i.mega, kills: r.i.kills, t: r.i.t, near: r.i.near });
    if (inf.mode === 'over' || (endAt >= 0 && f >= endAt)) { if (endAt < 0 || f >= endAt) { for (let k = 0; k < 20; k++) {} break; } }
  }
  const o = await pg.evaluate(() => ({ sfx: window.__log, music: window.__shell.music(), res: window.__shell.info().result }));
  fs.writeFileSync(OUT + '/meta.json', JSON.stringify({ meta, sfx: o.sfx, music: o.music, res: o.res }));
  console.log('frames', meta.length, 'last', JSON.stringify(meta[meta.length - 1]), 'errs', JSON.stringify(errs.slice(0, 2))); await b.close();
})();
