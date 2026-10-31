// Controlli delle battute delle mascotte. Uso: node tests/mascotte-battute.mjs <cartella-app>
import fs from 'node:fs';
import path from 'node:path';

const R = path.resolve(process.argv[2] || '..');
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; if (!c) console.log(`FAIL  ${n}  -> ${d}`); };
const file = path.join(R, 'data/it/battute.json');
let dati;
try {
  dati = JSON.parse(fs.readFileSync(file, 'utf8'));
  check('JSON valido', true);
} catch (e) {
  check('JSON valido', false, e.message);
  console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
  process.exit(1);
}

const contesti = ['tocco', 'inverno', 'estate', 'primavera', 'autunno', 'halloween', 'natale', 'festa', 'cambio_abito', 'pasqua', 'carnevale', 'compleanno', 'pioggia', 'fatto', 'traguardo', 'livello'];
check('versione = 1', dati.versione === 1, dati.versione);
check('contesti presenti', contesti.every((c) => Object.hasOwn(dati.contesti ?? {}, c)));
const minimi = { tocco: 14, inverno: 6, estate: 6, primavera: 6, autunno: 6, halloween: 6, natale: 6, festa: 6, cambio_abito: 5, pasqua: 6, carnevale: 6, compleanno: 6, pioggia: 6, fatto: 12, traguardo: 8, livello: 6 };
const battute = [];
for (const contesto of contesti) {
  const gruppo = dati.contesti?.[contesto] ?? {};
  for (const personaggio of ['rosso', 'rossella']) {
    const voci = gruppo[personaggio];
    check(`${contesto}.${personaggio}: elenco`, Array.isArray(voci));
    check(`${contesto}.${personaggio}: quantit? richiesta (${minimi[contesto]})`, Array.isArray(voci) && (['pasqua', 'carnevale', 'compleanno', 'pioggia', 'fatto'].includes(contesto) ? voci.length === minimi[contesto] : voci.length >= minimi[contesto]), voci?.length);
    for (const [i, testo] of (Array.isArray(voci) ? voci : []).entries()) battute.push({ id: `${contesto}.${personaggio}.${i + 1}`, testo });
  }
}

const malcodifiche = /Ã.|Â.|â€|ï¿½|�/u;
const emoji = /\p{Extended_Pictographic}/u;
for (const { id, testo } of battute) {
  check(`${id}: testo`, typeof testo === 'string' && testo.trim().length > 0);
  if (typeof testo !== 'string') continue;
  check(`${id}: massimo 90 caratteri (${[...testo].length})`, [...testo].length <= 90, testo);
  check(`${id}: codifica integra`, !malcodifiche.test(testo), testo);
  check(`${id}: senza emoji`, !emoji.test(testo), testo);
}
const viste = new Map();
for (const { id, testo } of battute) {
  if (typeof testo !== 'string') continue;
  const chiave = testo.trim().toLocaleLowerCase('it');
  check(`${id}: battuta unica`, !viste.has(chiave), viste.get(chiave));
  viste.set(chiave, id);
}

check('scambi: elenco', Array.isArray(dati.scambi));
const scambi = Array.isArray(dati.scambi) ? dati.scambi : [];
check('scambi tocco: almeno 8', scambi.filter((s) => s?.contesto === 'tocco').length >= 8);
for (const c of ['traguardo', 'livello']) check(`scambi ${c}: almeno 3`, scambi.filter((s) => s?.contesto === c).length >= 3);
for (const contesto of contesti.filter((c) => c !== 'cambio_abito')) {
  if (contesto !== 'tocco') check(`scambi ${contesto}: almeno 3`, scambi.filter((s) => s?.contesto === contesto).length >= 3);
}
for (const [i, s] of scambi.entries()) {
  const id = `scambi.${i + 1}`;
  check(`${id}: oggetto`, s && typeof s === 'object' && !Array.isArray(s));
  check(`${id}: contesto valido`, contesti.includes(s?.contesto), s?.contesto);
  for (const p of ['rosso', 'rossella']) {
    check(`${id}.${p}: pieno`, typeof s?.[p] === 'string' && s[p].trim().length > 0);
    if (typeof s?.[p] === 'string') {
      check(`${id}.${p}: massimo 90 caratteri (${[...s[p]].length})`, [...s[p]].length <= 90, s[p]);
      check(`${id}.${p}: codifica integra`, !malcodifiche.test(s[p]), s[p]);
      const chiave = s[p].trim().toLocaleLowerCase('it');
      check(`${id}.${p}: battuta unica`, !viste.has(chiave), viste.get(chiave));
      viste.set(chiave, id);
      check(`${id}.${p}: senza emoji`, !emoji.test(s[p]), s[p]);
    }
  }
}

// Un «?» in mezzo a una frase (non a fine frase) di solito è una lettera accentata persa nella codifica ("gi?", "per?").
{
  const tutte = [];
  const raccogli = (v) => { if (Array.isArray(v)) v.forEach(raccogli); else if (v && typeof v === 'object') Object.values(v).forEach(raccogli); else if (typeof v === 'string') tutte.push(v); };
  raccogli(JSON.parse(fs.readFileSync(path.join(R, 'data/it/battute.json'), 'utf8')));
  const sospette = tutte.filter((s) => /[\p{L}]\?[\p{L}]|(?:^|\s)\?(?:\s|$)|[\p{L}]\?:|[\p{L}]\? [a-zàèéìòù]/u.test(s));
  check('nessun «?» al posto di una lettera accentata', sospette.length === 0, sospette.slice(0, 3).join(' | '));
}

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
