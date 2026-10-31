// Whole-cabinet health baseline: node baseline.cjs [ids...]  -> JSON rows (bot outcome at up to 180 s of game time, page errors).
// PERSONAS=1 node baseline.cjs ids... -> per game idle / clumsy / expert runs + flags:
//   IDLE-OK    idle player WINS (or survives the whole 180 s) with >=50% of expert's score: game does not need input
//   (a run counts as won when the end message matches /CLEAR|WIN|KO!|FINISH/ - the shell's own rule, result.win)
//   EXPERT-DIES expert bot ends the run WITHOUT a win message (too hard, or bot too weak: read msg)
//   CLUMSY-0   clumsy player scores <10% of expert (cliff: sloppy play gets nothing)
// Complements seedcheck.cjs (determinism/seed sensitivity) and tiers.cjs (tier parity). Pages: out/<id>.html (art-only games: pass gNN.art).
const { chromium } = require('playwright');
(async () => { const ids = process.argv.slice(2); const P = process.env.PERSONAS ? ['idle', 'clumsy', 'expert'] : ['expert']; const b = await chromium.launch(); const rows = [];
  for (const g of ids) { const row = { g, runs: {}, errs: [] };
    for (const who of P) { const pg = await b.newPage({ viewport: { width: 400, height: 760 } }); pg.on('pageerror', e => row.errs.push(e.message.split('\n')[0]));
      try { await pg.goto('file://' + __dirname + '/out/' + g + '.html?seed=1'); await pg.waitForTimeout(300);
        row.runs[who] = await pg.evaluate(w => { const s = window.__shell; s.start(); s.bot(true, w); let t = 0; try { for (; t < 10800; t += 60) { if (s.info().mode !== 'play') break; s.ff(60); } } catch (e) { return { err: String(e.message), t }; } const i = s.info(); return { mode: i.mode, msg: i.result && i.result.msg || null, win: !!(i.result && i.result.win), score: i.score, t: i.t }; }, who);
      } catch (e) { row.runs[who] = { err: String(e.message).split('\n')[0] }; }
      await pg.close(); }
    row.errs = row.errs.slice(0, 1);
    if (P.length > 1) { const { idle, clumsy, expert } = row.runs, f = []; if (expert && !expert.err) {
        if (idle && !idle.err && (idle.win || idle.mode === 'play') && idle.score >= .5 * expert.score) f.push('IDLE-OK');
        if (expert.mode !== 'play' && !expert.win) f.push('EXPERT-DIES');
        if (clumsy && !clumsy.err && expert.score > 0 && clumsy.score < .1 * expert.score) f.push('CLUMSY-0'); } row.flags = f; }
    rows.push(row); }
  await b.close(); console.log(JSON.stringify(P.length > 1 ? rows : rows.map(r => ({ g: r.g, ...r.runs.expert, errs: r.errs })))); })();
