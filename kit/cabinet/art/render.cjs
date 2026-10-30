// render SVGs to PNG: node render.cjs hero.svg zombie.svg  -> ../out/art_<name>.png (and contact sheet on a dark floor)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => { const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1100, height: 640 } });
  const names = process.argv.slice(2); const svgs = names.map(n => fs.readFileSync(path.resolve(__dirname, n), 'utf8'));
  await pg.setContent(`<body style="margin:0;background:linear-gradient(#2f3f48,#1b262e);display:flex;gap:20px;padding:20px">${svgs.map(s => `<div style="width:480px;height:600px">${s}</div>`).join('')}</body>`);
  await pg.screenshot({ path: path.resolve(__dirname, '../out/art_sheet.png') }); await b.close(); })();
