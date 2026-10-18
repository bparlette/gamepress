// Tiny loopback static file server so a plan can point at a game folder instead of a hosted URL.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, resolve, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.glb': 'model/gltf-binary' };

export function serveDir(dir) {
  const root = resolve(dir);
  const server = createServer(async (req, res) => {
    try {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
      if (rel.includes('_vendor/')) {
        const kitFile = join(ROOT, 'kit', rel.split('_vendor/').pop());
        if (existsSync(kitFile)) {
          res.writeHead(200, { 'content-type': MIME[extname(kitFile)] || 'application/octet-stream' }).end(await readFile(kitFile));
          return;
        }
      }
      let p = resolve(root, rel);
      if (p !== root && !p.startsWith(root + sep)) { res.writeHead(403).end(); return; }
      if (!existsSync(p)) {
        const fromGames = join(ROOT, 'games', rel);
        if (existsSync(fromGames)) p = fromGames;
        else {
          const parts = rel.split('/');
          const recipeId = parts[0];
          const templateFile = join(ROOT, 'templates', 'recipes', `${recipeId}.html`);
          if (existsSync(templateFile) && (parts.length === 1 || parts[1] === '' || parts[1] === 'index.html')) {
            p = templateFile;
          }
        }
      }
      if ((await stat(p)).isDirectory()) p = join(p, 'index.html');
      res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }).end(await readFile(p));
    } catch { res.writeHead(404).end('not found'); }
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r({ port: server.address().port, close: () => server.close() })));
}
