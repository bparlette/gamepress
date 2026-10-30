// render SVGs to PNG: node render.cjs hero.svg zombie.svg  -> ../out/art_<name>.png (and contact sheet on a dark floor)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => { const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1700, height: 620 } });
  const names = process.argv.slice(2); const svgs = names.map(n => fs.readFileSync(path.resolve(__dirname, n), 'utf8'));
  await pg.setContent(`<body style="margin:0;background:linear-gradient(#2f3f48,#1b262e);display:flex;gap:20px;padding:20px">${svgs.map(s => `<div style="width:400px;height:500px">${s}</div>`).join('')}</body>`);
  await pg.screenshot({ path: path.resolve(__dirname, '../out/art_sheet.png') }); await b.close(); })();
