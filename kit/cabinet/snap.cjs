// zoomed bot-run snapshots: node snap.cjs gN 300 900 1500  -> out/gN_f<frame>_x3.png (768x672), to judge art quality
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => { const g = process.argv[2], at = process.argv.slice(3).map(Number), max = Math.max(...at);
  const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] }), pg = await b.newPage({ viewport: { width: 400, height: 760 } });
  await pg.addInitScript(() => { window.__norun = true; window.__log = []; window.__now = 0; });
  await pg.goto('file://' + path.resolve(__dirname, 'out', g + (process.env.ART ? '.art' : process.env.HD ? '.hd' : '') + '.html') + (process.env.SEED ? '?seed=' + process.env.SEED : '')); await pg.evaluate(() => document.fonts.load('8px "Press Start 2P"')); await pg.waitForTimeout(300);
  await pg.evaluate(() => { window.__shell.start(); window.__shell.bot(true); });
  for (let i = 0; i <= max; i++) { await pg.evaluate(() => { window.__shell.step(); window.__shell.render(); });
    if (at.includes(i)) { const u = await pg.evaluate(() => { const c = document.getElementById('screen'), z = document.createElement('canvas'); z.width = c.width; z.height = c.height; const x = z.getContext('2d'); x.drawImage(c, 0, 0); return z.toDataURL(); });
      fs.writeFileSync(path.resolve(__dirname, 'out', `${g}${process.env.ART ? '_art' : process.env.HD ? '_hd' : ''}_f${i}_x3.png`), Buffer.from(u.split(',')[1], 'base64')); } }
  await b.close(); })();
