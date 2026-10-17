// trace.mjs <gamesDir> <gameId> <seconds> [every=10] [expr=window.__game]: print game state every N frames on the virtual clock (bot debugging).
import { launchChrome } from '../lib/cdp.mjs'; import { serveDir } from '../lib/serve.mjs'; import { readFileSync } from 'node:fs'; import { join, dirname } from 'node:path'; import { fileURLToPath } from 'node:url';
const [dir, id, sec = '8', every = '10', expr = 'JSON.stringify(window.__game)'] = process.argv.slice(2), HERE = dirname(fileURLToPath(import.meta.url));
const server = await serveDir(dir), c = await launchChrome({ width: 540, height: 960 });
await c.send('Page.addScriptToEvaluateOnNewDocument', { source: readFileSync(join(HERE, '..', 'lib', 'inject.js'), 'utf8').replace('__SEED__', '7') });
await c.send('Page.navigate', { url: `http://127.0.0.1:${server.port}/${id}/index.html?auto=1&dpr=1&seed=${process.env.SEED || 7}${process.env.QS || ''}` });
for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 150)); if (await c.evaluate('document.readyState') === 'complete') break; }
for (let f = 0; f < +sec * 30; f++) { await c.evaluate('__gp.step(33.3)'); if (f % +every === 0) console.log((f / 30).toFixed(1), await c.evaluate(expr)); }
console.log('errors', [...new Set(c.logs)].slice(0, 3)); await c.close(); server.close();
