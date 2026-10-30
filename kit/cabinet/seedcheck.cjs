// usage: node seedcheck.cjs [g1 g2 ...]  - proves ?seed= is deterministic and seed-sensitive (same seed => same state, different seed => different state)
const { chromium } = require('playwright');
(async () => {
  const gs = process.argv.slice(2).length ? process.argv.slice(2) : ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7'];
  const b = await chromium.launch(); let bad = 0;
  const run = async (g, seed) => {
    const pg = await b.newPage(); await pg.goto('file://' + __dirname + '/out/' + g + '.html' + (seed ? '?seed=' + seed : ''));
    await pg.waitForTimeout(300);
    const r = await pg.evaluate(() => { const s = window.__shell; s.start(); s.bot(true); s.ff(1500); const px = document.getElementById('screen').toDataURL().length; return { seed: s.seed, info: JSON.stringify(s.info()), px }; });
    await pg.close(); return r;
  };
  for (const g of gs) {
    const a = await run(g, 123), a2 = await run(g, 123), c = await run(g, 124), d = await run(g, 0);
    const same = a.info === a2.info, diff = a.info !== c.info;
    if (!same || !diff || a.seed == null) bad++;
    console.log(g, 'seed', a.seed, 'repeat-equal', same, 'other-seed-differs', diff, 'default-seed', d.seed);
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
