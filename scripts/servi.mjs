import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const radice = resolve(import.meta.dirname, '..');
const PORTA = 8101;
const TIPI = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  const percorso = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^([/\\])+/, '') || 'index.html';
  const file = join(radice, percorso);
  if (!file.startsWith(radice) || !existsSync(file) || !readdirSync(radice).length) { res.writeHead(404); res.end(); return; }
  try { res.writeHead(200, { 'content-type': TIPI[extname(file)] ?? 'application/octet-stream' }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
server.listen(PORTA);
