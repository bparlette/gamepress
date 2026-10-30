// record a bot run of one built game: node rec2.js gN [maxPlayFrames]  -> $FR/f_gN/*.png + $FR/gN.json (meta, sfx, music)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const g = process.argv[2], maxPlay = +(process.argv[3] || 6500), root = process.env.FR || path.resolve(__dirname, '../out/frames'), html = path.resolve(__dirname, '../out', g + (process.env.ART ? '.art' : process.env.HD ? '.hd' : '') + '.html');
  const dir = `${root}/f_${g}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 400, height: 760 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { window.__norun = true; window.__log = []; window.__now = 0; });
  await pg.goto('file://' + html); await pg.evaluate(() => document.fonts.load('8px "Press Start 2P"')); await pg.waitForTimeout(300);
  const meta = []; let i = 0, overAt = -1;
  while (true) {
    if (i === 100) await pg.evaluate(() => { window.__shell.start(); window.__shell.bot(true); });
    const r = await pg.evaluate(() => { window.__shell.step(); window.__shell.render(); const f = window.__shell.info(); return { u: (document.getElementById('gl') || document.getElementById('screen')).toDataURL('image/png'), m: f.mode, s: f.score || 0 }; });
    fs.writeFileSync(`${dir}/f${String(i).padStart(5, '0')}.png`, Buffer.from(r.u.split(',')[1], 'base64'));
    meta.push({ m: r.m, s: r.s }); if (r.m === 'over' && overAt < 0) overAt = i;
    if ((overAt >= 0 && i - overAt > 60) || i > 100 + maxPlay) break; i++;
  }
  const o = await pg.evaluate(() => ({ sfx: window.__log, music: window.__shell.music(), res: window.__shell.info().result }));
  fs.writeFileSync(`${root}/${g}.json`, JSON.stringify({ meta, sfx: o.sfx, music: o.music, res: o.res, overAt }));
  console.log(g, 'frames', i + 1, 'overAt', overAt, JSON.stringify(o.res), 'errs', JSON.stringify(errs)); await b.close();
})();
