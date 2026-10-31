// Move-list test: node test37.cjs   -> drives g37 with REAL key sequences and checks each move starts. (dummy=1 makes the CPU stand still.)
const { chromium } = require('playwright'); let fails = 0, total = 0;
(async () => { const b = await chromium.launch();
  const open = async (char, extra) => { const pg = await b.newPage({ viewport: { width: 400, height: 760 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg._errs = errs; await pg.goto('file://' + __dirname + '/out/g37.html?dummy=1&seed=3&char=' + char + (extra || '')); await pg.waitForTimeout(250); await pg.evaluate(() => { __shell.start(); __shell.ff(100); }); return pg; };
  const hold = async (pg, keys, n) => { for (const k of keys) await pg.keyboard.down(k); await pg.evaluate(n => __shell.ff(n), n); };
  const rel = async (pg, keys) => { for (const k of keys) await pg.keyboard.up(k); };
  const seq = async (pg, steps) => { let prev = []; for (const [keys, n] of steps) { for (const k of prev) if (!keys.includes(k)) await pg.keyboard.up(k); for (const k of keys) if (!prev.includes(k)) await pg.keyboard.down(k); await pg.evaluate(n => __shell.ff(n), n); prev = keys; } for (const k of prev) await pg.keyboard.up(k); };
  const info = pg => pg.evaluate(() => __shell.info());
  const reset = async pg => { await pg.evaluate(() => __shell.ff(90)); };
  const check = async (name, pg, expect, within) => { total++; let got = []; for (let i = 0; i < (within || 4); i++) { const i1 = await info(pg); got.push(i1.mv1); await pg.evaluate(() => __shell.ff(1)); } const ok = got.includes(expect); if (!ok) fails++; const dbg = await info(pg); console.log(ok ? 'ok  ' : 'FAIL', name.padEnd(34), 'expect', expect, ok ? '' : 'got ' + got.slice(0, 4).join(',') + ' | x1 ' + dbg.x1 + ' x2 ' + dbg.x2 + ' st1 ' + dbg.st1 + ' st2 ' + dbg.st2 + ' y1 ' + dbg.y1 + ' c1 ' + dbg.c1 + ' mode ' + dbg.mode + ' tl ' + dbg.tl + ' mv2 ' + dbg.mv2); await reset(pg); };
  const R = 'ArrowRight', Lf = 'ArrowLeft', Dn = 'ArrowDown', Up = 'ArrowUp';
  // ---------- RYU
  let pg = await open('ryu');
  for (const [k, id] of [['KeyU', 'sLP'], ['KeyI', 'sMP'], ['KeyO', 'sHP'], ['KeyJ', 'sLK'], ['KeyK', 'sMK'], ['KeyL', 'sHK']]) { await seq(pg, [[[k], 1]]); await check('standing ' + k, pg, id, 3); }
  await seq(pg, [[['KeyZ'], 1]]); await check('Z = medium punch', pg, 'sMP', 3); await seq(pg, [[['KeyX'], 1]]); await check('X = medium kick', pg, 'sMK', 3);
  for (const [k, id] of [['KeyU', 'cLP'], ['KeyI', 'cMP'], ['KeyO', 'cHP'], ['KeyJ', 'cLK'], ['KeyK', 'cMK'], ['KeyL', 'cHK']]) { await seq(pg, [[[Dn], 2], [[Dn, k], 1]]); await check('crouching ' + k, pg, id, 3); }
  for (const [k, id] of [['KeyU', 'jLP'], ['KeyI', 'jMP'], ['KeyO', 'jHP'], ['KeyJ', 'jLK'], ['KeyK', 'jMK'], ['KeyL', 'jHK']]) { await seq(pg, [[[Up], 2], [[], 10], [[k], 1]]); await check('jumping ' + k, pg, id, 3); await pg.evaluate(() => __shell.ff(120)); }
  for (const [k, str, label] of [['KeyU', 'L', 'light'], ['KeyI', 'M', 'medium'], ['KeyO', 'H', 'heavy']]) { await seq(pg, [[[Dn], 3], [[Dn, R], 3], [[R, k], 1]]); await check('hadoken (236+P) ' + label, pg, 'hadoken', 14); await pg.evaluate(() => __shell.ff(60)); }
  for (const [k, label] of [['KeyU', 'light'], ['KeyI', 'medium'], ['KeyO', 'heavy']]) { await seq(pg, [[[R], 3], [[Dn], 3], [[Dn, R], 2], [[Dn, R, k], 1]]); await check('shoryuken (623+P) ' + label, pg, 'shoryu', 4); await pg.evaluate(() => __shell.ff(90)); }
  for (const [k, label] of [['KeyJ', 'light'], ['KeyK', 'medium'], ['KeyL', 'heavy']]) { await seq(pg, [[[Dn], 3], [[Dn, Lf], 3], [[Lf, k], 1]]); await check('tatsumaki (214+K) ' + label, pg, 'tatsu', 12); await pg.evaluate(() => __shell.ff(100)); }
  // close normals + throws: walk right until adjacent
  const near = async (g, d) => { for (let k = 0; k < 40; k++) { const i = await info(g); if (i.x2 - i.x1 <= d) break; await hold(g, [R], 6); } await rel(g, [R]); await g.evaluate(() => __shell.ff(8)); const i = await info(g); return i.x2 - i.x1; };
  console.log('   gap', await near(pg, 25));
  await seq(pg, [[['KeyO'], 1]]); await check('close heavy punch', pg, 'closeHP', 4); await seq(pg, [[['KeyL'], 1]]); await check('close heavy kick', pg, 'closeHK', 4);
  await seq(pg, [[[R, 'KeyO'], 1]]); const t1 = await info(pg); await check('forward throw (F+HP close)', pg, 'grab', 3); await pg.evaluate(() => __shell.ff(100));
  console.log('   gap', await near(pg, 25)); await seq(pg, [[[Lf, 'KeyI'], 1]]); await check('back throw (B+MP close)', pg, 'grab', 3);
  console.log('   page errors:', pg._errs.length ? pg._errs[0] : 'none'); await pg.close();
  // ---------- GUILE
  pg = await open('guile');
  for (const [k, id] of [['KeyU', 'sLP'], ['KeyO', 'sHP'], ['KeyJ', 'sLK'], ['KeyL', 'sHK']]) { await seq(pg, [[[k], 1]]); await check('guile standing ' + k, pg, id, 3); }
  for (const [k, id] of [['KeyU', 'cLP'], ['KeyO', 'cHP'], ['KeyL', 'cHK']]) { await seq(pg, [[[Dn], 2], [[Dn, k], 1]]); await check('guile crouching ' + k, pg, id, 3); }
  for (const [k, label] of [['KeyU', 'light'], ['KeyI', 'medium'], ['KeyO', 'heavy']]) { await seq(pg, [[[Lf], 70], [[R, k], 1]]); await check('sonic boom (charge B, F+P) ' + label, pg, 'sonic', 14); await pg.evaluate(() => __shell.ff(90)); await hold(pg, [R], 40); await rel(pg, [R]); }
  for (const [k, label] of [['KeyJ', 'light'], ['KeyK', 'medium'], ['KeyL', 'heavy']]) { await seq(pg, [[[Dn], 70], [[Up, k], 1]]); await check('flash kick (charge D, U+K) ' + label, pg, 'flash', 4); await pg.evaluate(() => __shell.ff(120)); }
  await seq(pg, [[[Lf], 20], [[R, 'KeyU'], 1]]); { total++; let bad = false; for (let i = 0; i < 6; i++) { if ((await info(pg)).mv1 === 'sonic') bad = true; await pg.evaluate(() => __shell.ff(1)); } if (bad) fails++; console.log(bad ? 'FAIL' : 'ok  ', 'short charge does NOT give sonic boom'); await reset(pg); }
  console.log('   gap', await near(pg, 25)); await seq(pg, [[[R, 'KeyO'], 1]]); await check('guile forward throw', pg, 'grab', 3); await pg.evaluate(() => __shell.ff(100));
  console.log('   page errors:', pg._errs.length ? pg._errs[0] : 'none'); await pg.close(); await b.close();
  console.log(`\n${total - fails}/${total} move checks passed`); process.exit(fails ? 1 : 0); })();
