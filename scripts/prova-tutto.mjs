// Lancia TUTTI i test dell'app (quelli con il browser e quelli senza) e dice in fondo cosa è rosso.
// Uso, dalla cartella dell'app:  node scripts/prova-tutto.mjs
// Serve Playwright (vedi docs/STATO.md). Avvia da solo un piccolo server sulla porta 8101 e lo spegne alla fine.
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const radice = resolve(import.meta.dirname, '..');
const PORTA = 8101;
const TIPI = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const server = createServer((req, res) => {
  const percorso = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^([/\\])+/, '') || 'index.html';
  const file = join(radice, percorso);
  if (!file.startsWith(radice) || !existsSync(file) || !readdirSync(radice).length) { res.writeHead(404); res.end(); return; }
  try {
    res.writeHead(200, { 'content-type': TIPI[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok, ko) => { server.once('error', ko); server.listen(PORTA, ok); }).catch(() => { console.log(`(la porta ${PORTA} è già in uso: uso quel server)`); });

const tutti = readdirSync(join(radice, 'tests')).filter((f) => f.endsWith('.mjs') && !f.startsWith('_') && f !== 'lib.mjs');
const conBrowser = tutti.filter((f) => /^\d\d-|^fase2-oggi/.test(f) && !f.startsWith('04-')); // 04 fa solo gli screenshot di riferimento
const senzaBrowser = tutti.filter((f) => !conBrowser.includes(f) && !f.startsWith('04-'));

const rossi = [];
let verdi = 0;
for (const [elenco, argomento] of [[conBrowser, `http://localhost:${PORTA}`], [senzaBrowser, radice]]) {
  for (const f of elenco) {
    const r = spawnSync('node', [join('tests', f), argomento], { cwd: radice, encoding: 'utf8', timeout: 300000 });
    const fallite = (r.stdout ?? '').split('\n').filter((l) => /^FAIL/.test(l));
    if (r.status === 0 && !fallite.length) { verdi++; console.log(`verde   ${f}`); } else { rossi.push(f); console.log(`ROSSO   ${f}\n  ${fallite.slice(0, 3).join('\n  ') || (r.stderr ?? '').split('\n').slice(0, 3).join('\n  ')}`); }
  }
}
server.close();
spawnSync('git', ['checkout', '--', 'tests/schermate'], { cwd: radice }); // gli screenshot dei test non vanno committati
console.log(`\n${verdi} verdi, ${rossi.length} rossi${rossi.length ? `: ${rossi.join(', ')}` : ''}`);
process.exit(rossi.length ? 1 : 0);
