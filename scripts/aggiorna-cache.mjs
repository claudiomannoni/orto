// Aggiorna sw.js: nome della cache (da js/versione.js) ed elenco dei file da tenere offline.
// Uso, dalla radice del progetto:  node scripts/aggiorna-cache.mjs
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const radice = fileURLToPath(new URL('..', import.meta.url));
const CARTELLE = ['css', 'js', 'i18n', 'data', 'assets', 'icons'];
const FILE_SINGOLI = ['index.html', 'manifest.webmanifest'];

function elenca(cartella) {
  const percorso = join(radice, cartella);
  if (!existsSync(percorso)) return [];
  return readdirSync(percorso, { withFileTypes: true }).flatMap((voce) => {
    const relativo = `${cartella}/${voce.name}`;
    return voce.isDirectory() ? elenca(relativo) : [relativo];
  });
}

const versione = readFileSync(join(radice, 'js/versione.js'), 'utf8').match(/APP_VERSIONE\s*=\s*'([^']+)'/)?.[1];
if (!versione) throw new Error('APP_VERSIONE non trovata in js/versione.js');

const file = [...FILE_SINGOLI, ...CARTELLE.flatMap(elenca)].sort().map((f) => `  './${f}',`);
const elencoFile = ['  // <<FILE', "  './',", ...file, '  // FILE>>'].join('\n');

let sw = readFileSync(join(radice, 'sw.js'), 'utf8');
sw = sw.replace(/const VERSIONE = '[^']*';/, `const VERSIONE = 'orto-${versione}';`);
sw = sw.replace(/ {2}\/\/ <<FILE[\s\S]*?\/\/ FILE>>/, elencoFile);
writeFileSync(join(radice, 'sw.js'), sw);
console.log(`sw.js aggiornato: orto-${versione}, ${file.length + 1} file in cache`);
