// Compares info() at 25 s and 60 s plus a screen hash. A seed-insensitive game FAILS (other-seed-differs false).
// usage: node seedcheck.cjs [g1 g2 ...]  - proves ?seed= is deterministic and seed-sensitive (same seed => same state, different seed => different state)
const { chromium } = require('playwright');
(async () => {
  const gs = process.argv.slice(2).length ? process.argv.slice(2) : ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11'];
  const b = await chromium.launch(); let bad = 0;
  const run = async (g, seed) => {
    const pg = await b.newPage(); await pg.goto('file://' + __dirname + '/out/' + g + '.html' + (seed ? '?seed=' + seed : ''));
    await pg.waitForTimeout(300); await pg.evaluate(() => document.fonts.ready);   // text rasterises differently before/after the webfont settles
    const r = await pg.evaluate(() => { const s = window.__shell; s.start(); s.bot(true); const go = n => { for (let k = 0; k < n; k += 60) { if (s.info().mode !== 'play') return; s.ff(Math.min(60, n - k)); } };   // never step past game over (real play can't)
      go(1500); const i1 = JSON.stringify(s.info()); go(2100); const i2 = JSON.stringify(s.info()); s.render(); const c = document.getElementById('screen'); let h = 0; const d = s.info().mode === 'play' ? c.toDataURL() : '';   // ff only steps: render explicitly so the hash is of THIS state
    /* panels blink on wall-clock, so only hash live play frames */ for (let k = 0; k < d.length; k += 7) h = (h * 31 + d.charCodeAt(k)) | 0; return { seed: s.seed, info: i1 + '@25s|' + i2 + '@60s', px: h }; });
    await pg.close(); return r;
  };
  for (const g of gs) {
    let a, a2, c, d; try { a = await run(g, 123); a2 = await run(g, 123); c = await run(g, 124); d = await run(g, 0); } catch (e) { bad++; console.log(g, 'ERROR during 60 s bot run:', String(e.message).split('\n')[1] || e.message); continue; }
    const same = a.info === a2.info && a.px === a2.px, diff = a.info !== c.info || a.px !== c.px;   // compares state at 25 s AND 60 s plus a frame hash, so uniform-early-scoring games are not misread
    if (!same || !diff || a.seed == null) bad++;
    console.log(g, 'seed', a.seed, 'repeat-equal', same, 'other-seed-differs', diff, 'default-seed', d.seed);
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
