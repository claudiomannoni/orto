// Coerenza delle traduzioni (Node, nessun server). Uso: node tests/i18n-chiavi.mjs <cartella-app>
import fs from 'node:fs';
import path from 'node:path';
const radice = path.resolve(process.argv[2] || '.');
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

const fileJs = (cartella) => fs.readdirSync(cartella, { withFileTypes: true })
  .flatMap((voce) => voce.isDirectory()
    ? fileJs(path.join(cartella, voce.name))
    : (voce.name.endsWith('.js') ? [path.join(cartella, voce.name)] : []));

const percorsoTesti = path.join(radice, 'i18n/it.json');
const grezzo = fs.readFileSync(percorsoTesti, 'utf8');

// 5. JSON valido e senza chiavi duplicate nel testo grezzo
let testi = null, erroreJson = '';
try {
  testi = JSON.parse(grezzo);
} catch (errore) {
  erroreJson = errore.message;
}
check('i18n/it.json è JSON valido', testi !== null, erroreJson);

const righeChiave = [...grezzo.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)];
const conteggio = new Map();
for (const riga of righeChiave) {
  let chiave = riga[1];
  try { chiave = JSON.parse(`"${riga[1]}"`); } catch { /* resta il testo grezzo */ }
  conteggio.set(chiave, (conteggio.get(chiave) || 0) + 1);
}
const duplicate = [...conteggio].filter(([, n]) => n > 1).map(([chiave, n]) => `${chiave} (${n} volte)`);
check('i18n/it.json non ha chiavi duplicate', duplicate.length === 0, duplicate.join('; '));

if (testi === null) {
  console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
  process.exit(1);
}

// 1. Ogni chiave letterale usata nel codice esiste in it.json (tn: serve la coppia .uno/.altri)
const RE_CHIAMATA = /\b(tn|t)\s*\(\s*(['"])((?:\\.|[^\\])*?)\2/g;
const usi = new Map();
for (const file of fileJs(path.join(radice, 'js'))) {
  const codice = fs.readFileSync(file, 'utf8');
  for (const trovata of codice.matchAll(RE_CHIAMATA)) {
    const funzione = trovata[1];
    const chiave = trovata[3];
    const dopo = codice.slice(trovata.index + trovata[0].length, trovata.index + trovata[0].length + 20);
    // Salta le chiavi composte (template literal) e le concatenazioni.
    if (chiave.includes('${') || /^\s*\+/.test(dopo)) continue;
    if (!usi.has(chiave)) usi.set(chiave, { funzione, file });
  }
}
const mancanti = [];
for (const [chiave, uso] of usi) {
  const dove = path.relative(radice, uso.file).replaceAll('\\', '/');
  if (uso.funzione === 'tn') {
    for (const suffisso of ['uno', 'altri']) {
      if (!(`${chiave}.${suffisso}` in testi)) mancanti.push(`${chiave}.${suffisso} (${dove})`);
    }
  } else if (!(chiave in testi)) {
    mancanti.push(`${chiave} (${dove})`);
  }
}
check('chiavi usate nel codice presenti in it.json', mancanti.length === 0, mancanti.join('; '));

// 2. Valori non vuoti, senza soli spazi e senza emoji
const vuoti = [];
const conEmoji = [];
const EMOJI = /\p{Extended_Pictographic}/u;
for (const [chiave, valore] of Object.entries(testi)) {
  if (typeof valore !== 'string' || !valore.trim()) vuoti.push(chiave);
  if (typeof valore === 'string' && EMOJI.test(valore)) conEmoji.push(chiave);
}
check('valori non vuoti e non fatti di soli spazi', vuoti.length === 0, vuoti.join('; '));
check('valori senza emoji', conEmoji.length === 0, conEmoji.join('; '));

// 3. Parametri {nome}: almeno uno e solo lettere, numeri, underscore
const parametriNonValidi = [];
for (const [chiave, valore] of Object.entries(testi)) {
  if (typeof valore !== 'string' || !valore.includes('{')) continue;
  const nomi = [...valore.matchAll(/\{([^}]*)\}/g)].map((trovato) => trovato[1]);
  if (nomi.length === 0) continue;
  const distinti = new Set(nomi);
  if (distinti.size === 0 || [...distinti].some((nome) => !/^[A-Za-z0-9_]+$/.test(nome))) {
    parametriNonValidi.push(`${chiave} (${[...distinti].join(', ')})`);
  }
}
check('parametri {nome} validi', parametriNonValidi.length === 0, parametriNonValidi.join('; '));

// 4. Coppie di plurali: X.uno <-> X.altri
const pluraliSenzaCoppia = [];
for (const chiave of Object.keys(testi)) {
  const coppia = chiave.match(/^(.*)\.(uno|altri)$/);
  if (!coppia) continue;
  const altro = `${coppia[1]}.${coppia[2] === 'uno' ? 'altri' : 'uno'}`;
  if (!(altro in testi)) pluraliSenzaCoppia.push(`${chiave} senza ${altro}`);
}
check('coppie di plurali .uno/.altri complete', pluraliSenzaCoppia.length === 0, pluraliSenzaCoppia.join('; '));

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
