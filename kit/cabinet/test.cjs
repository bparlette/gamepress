// usage: node test.cjs g1 [seconds]
const { chromium } = require('playwright');
(async () => {
  const g = process.argv[2], secs = +(process.argv[3] || 40);
  const dir = __dirname, seed = process.argv[4] || '';
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 400, height: 760 } });
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  pg.on('pageerror', e => console.log('PAGEERR', e.message)); await pg.goto('file://' + dir + '/out/' + g + '.html' + (seed ? '?seed=' + seed : ''));
  await pg.waitForTimeout(1200);
  await pg.screenshot({ path: `${dir}/out/${g}_title.png` });
  await pg.evaluate(() => { window.__shell.start(); window.__shell.bot(true); });
  const marks = [0.25, 0.6, 1.0].map(f => Math.floor(f * secs * 60));
  let done = 0;
  for (let k = 0; k < marks.length; k++) {
    await pg.evaluate(n => window.__shell.ff(n), marks[k] - done); done = marks[k];
    await pg.waitForTimeout(150);
    await pg.screenshot({ path: `${dir}/out/${g}_s${k}.png`, clip: { x: 0, y: 0, width: 400, height: 380 } });
    console.log(k, JSON.stringify(await pg.evaluate(() => window.__shell.info())));
  }
  console.log('errors:', JSON.stringify(errs));
  await b.close();
})();
