// Controlli dei livelli e dei traguardi. Uso: node tests/traguardi.mjs <cartella-app>
import fs from 'node:fs';
import path from 'node:path';

const R = path.resolve(process.argv[2] || '..');
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; if (!c) console.log(`FAIL  ${n}  -> ${d}`); };
const file = path.join(R, 'data/it/traguardi.json');
let dati;
try {
  dati = JSON.parse(fs.readFileSync(file, 'utf8'));
  check('JSON valido', true);
} catch (e) {
  check('JSON valido', false, e.message);
  console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
  process.exit(1);
}

const tipi = ['lavori_fatti', 'colture', 'colture_diverse', 'zone', 'terreno_capito', 'foto', 'diagnosi', 'giorni_attivi', 'giorni_di_fila', 'stagioni'];
const soglieLivelli = [0, 40, 100, 200, 350, 550, 800, 1100, 1500, 2000];
const malcodifiche = /Ã.|Â.|â€|ï¿½|�/u;
const emoji = /\p{Extended_Pictographic}/u;
check('versione = 1', dati.versione === 1, dati.versione);
check('punti previsti', JSON.stringify(dati.punti) === JSON.stringify({ lavoro_fatto: 10, coltura: 5, zona: 5, foto: 2, traguardo: 20 }));
check('10 livelli', Array.isArray(dati.livelli) && dati.livelli.length === 10, dati.livelli?.length);
const livelli = Array.isArray(dati.livelli) ? dati.livelli : [];
for (const [i, l] of livelli.entries()) {
  check(`livello ${i + 1}: id`, l?.id === i + 1, l?.id);
  check(`livello ${i + 1}: soglia crescente prevista`, l?.da === soglieLivelli[i] && (i === 0 || l.da > livelli[i - 1]?.da), l?.da);
  check(`livello ${i + 1}: nome`, typeof l?.nome === 'string' && l.nome.trim().length > 0 && [...l.nome].length <= 28, l?.nome);
  for (const p of ['rosso', 'rossella']) {
    const s = l?.[p];
    check(`livello ${i + 1}.${p}: battuta`, typeof s === 'string' && s.trim().length > 0 && [...s].length <= 90, s);
    if (typeof s === 'string') { check(`livello ${i + 1}.${p}: codifica integra`, !malcodifiche.test(s)); check(`livello ${i + 1}.${p}: senza emoji`, !emoji.test(s)); }
  }
}

const traguardi = Array.isArray(dati.traguardi) ? dati.traguardi : [];
check('almeno 28 traguardi', traguardi.length >= 28, traguardi.length);
const ids = new Set();
const coperti = new Set();
const testi = [];
for (const [i, t] of traguardi.entries()) {
  const id = `traguardo ${i + 1}`;
  check(`${id}: oggetto`, t && typeof t === 'object' && !Array.isArray(t));
  check(`${id}: id valido`, typeof t?.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.id), t?.id);
  check(`${id}: id unico`, !ids.has(t?.id), t?.id);
  ids.add(t?.id);
  for (const [campo, max] of [['titolo', 36], ['descrizione', 90]]) {
    const s = t?.[campo];
    check(`${id}: ${campo}`, typeof s === 'string' && s.trim().length > 0 && [...s].length <= max, s);
    if (typeof s === 'string') testi.push(s);
  }
  const c = t?.condizione;
  check(`${id}: condizione ammessa`, tipi.includes(c?.tipo), c?.tipo);
  if (tipi.includes(c?.tipo)) coperti.add(c.tipo);
  check(`${id}: n intero positivo`, Number.isInteger(c?.n) && c.n >= 1, c?.n);
}
check('tutti i tipi di condizione coperti', tipi.every((x) => coperti.has(x)), [...coperti].join(', '));
for (const s of testi) { check('codifica integra', !malcodifiche.test(s), s); check('senza emoji', !emoji.test(s), s); }
const stringhe = [];
const raccogli = (v) => { if (Array.isArray(v)) v.forEach(raccogli); else if (v && typeof v === 'object') Object.values(v).forEach(raccogli); else if (typeof v === 'string') stringhe.push(v); };
raccogli(dati);
const sospette = stringhe.filter((s) => /\?\?|[\p{L}]\?[\p{L}]|(?:^|\s)\?(?:\s|$)|[\p{L}]\?:|[\p{L}]\? [a-zàèéìòù]/u.test(s));
check('nessun carattere perso o sequenza ??', sospette.length === 0, sospette.slice(0, 3).join(' | '));

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
