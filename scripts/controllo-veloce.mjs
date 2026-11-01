// Il controllo veloce di Orto AI: un comando, poche righe di risposta, nessun costo (gira tutto sul computer).
//   node scripts/controllo-veloce.mjs          # tutte le prove + coerenza dei file + git + versione online
//   node scripts/controllo-veloce.mjs --link   # in più apre le fonti dei contenuti (serve internet, ~1 minuto)
// Dice «ok» o «ROSSO» per ogni punto e, se qualcosa non va, che cosa. Exit code 1 se c'è un ROSSO.
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const radice = resolve(import.meta.dirname, '..');
const conLink = process.argv.includes('--link');
const righe = [];
let rossi = 0;
const punto = (nome, ok, dettaglio = '') => { righe.push(`${ok ? 'ok   ' : 'ROSSO'} ${nome}${dettaglio ? ` - ${dettaglio}` : ''}`); if (!ok) rossi++; };
const lancia = (comando, args, opzioni = {}) => spawnSync(comando, args, { cwd: radice, encoding: 'utf8', timeout: 900000, ...opzioni });
const leggi = (percorso) => readFileSync(join(radice, percorso), 'utf8');

// 1. Tutte le prove automatiche
const prove = lancia('node', ['scripts/prova-tutto.mjs']);
const ultima = (prove.stdout ?? '').trim().split('\n').filter(Boolean).pop() ?? '';
punto('prove automatiche', prove.status === 0, ultima);

// 2. La versione dell'app e quella della cache offline devono coincidere (si aggiorna con aggiorna-cache)
const versione = /'([\d.]+)'/.exec(leggi('js/versione.js'))?.[1];
const cache = /orto-([\d.]+)/.exec(leggi('sw.js'))?.[1];
punto('versione e cache offline coincidono', Boolean(versione) && versione === cache, `app ${versione}, cache ${cache}`);
const prima = leggi('sw.js');
lancia('node', ['scripts/aggiorna-cache.mjs']);
punto('elenco dei file offline aggiornato', leggi('sw.js') === prima, 'se ROSSO: sw.js era indietro, ora è stato rigenerato: va salvato');

// 3. Contenuti: JSON validi, nessuna emoji (regola del progetto), nessun carattere rotto
const emoji = /\p{Extended_Pictographic}/u;
const rotti = [];
const emojiTrovate = [];
const visita = (cartella) => readdirSync(join(radice, cartella)).forEach((n) => {
  const rel = `${cartella}/${n}`;
  if (statSync(join(radice, rel)).isDirectory()) return visita(rel);
  if (!n.endsWith('.json')) return;
  const testo = leggi(rel);
  try { JSON.parse(testo); } catch { rotti.push(rel); }
  if (emoji.test(testo)) emojiTrovate.push(rel);
  if (testo.includes('�')) rotti.push(`${rel} (caratteri rotti)`);
});
['data', 'i18n'].forEach(visita);
punto('JSON validi e senza caratteri rotti', rotti.length === 0, rotti.join(', '));
punto('nessuna emoji nei contenuti', emojiTrovate.length === 0, emojiTrovate.join(', '));

// 4. Git: tutto salvato e pubblicato
const stato = lancia('git', ['status', '--porcelain']).stdout.trim();
punto('niente modifiche non salvate', stato === '', stato.split('\n').slice(0, 3).join(' | '));
lancia('git', ['fetch', '-q']);
const indietro = lancia('git', ['rev-list', '--count', 'origin/main..HEAD']).stdout.trim();
punto('tutto pubblicato su GitHub', indietro === '0', `${indietro} commit da pubblicare`);

// 5. La versione online è quella locale (GitHub Pages ci mette un minuto a pubblicare)
try {
  const online = await fetch('https://claudiomannoni.github.io/orto/js/versione.js', { signal: AbortSignal.timeout(15000), cache: 'no-store' }).then((r) => r.text());
  const v = /'([\d.]+)'/.exec(online)?.[1];
  punto('la versione online è quella di qui', v === versione, `online ${v}, qui ${versione}`);
} catch (e) {
  punto('la versione online è quella di qui', false, `non riesco a leggerla (${e.message})`);
}

// 6. Facoltativo: le fonti rispondono
if (conLink) {
  const link = lancia('node', ['scripts/controlla-link.mjs', '.']);
  const rottiLink = (link.stdout ?? '').split('\n').filter((l) => l.startsWith('ROTTO'));
  punto('le fonti dei contenuti rispondono', rottiLink.length === 0, rottiLink.slice(0, 3).map((l) => l.slice(0, 90)).join(' | '));
}

console.log(righe.join('\n'));
console.log(rossi ? `\n${rossi} da sistemare.` : '\nTutto in ordine.');
process.exit(rossi ? 1 : 0);
