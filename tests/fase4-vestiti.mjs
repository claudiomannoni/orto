// Prova dei vestiti dei vermetti (Node, nessun server). Uso: node tests/fase4-vestiti.mjs <cartella-app>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { VESTITI, vestitoDelGiorno, contestoDelVestito, altroVestito, pasqua } = await import(pathToFileURL(path.join(radice, 'js/motore/vestiti.js')).href);

let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

const casi = [
  ['2026-01-10', 'inverno'], ['2026-02-28', 'inverno'], ['2026-03-01', 'primavera'], ['2026-05-31', 'primavera'],
  ['2026-06-01', 'estate'], ['2026-08-31', 'estate'], ['2026-09-01', 'autunno'], ['2026-10-23', 'autunno'],
  ['2026-10-24', 'halloween'], ['2026-10-31', 'halloween'], ['2026-11-01', 'halloween'], ['2026-11-02', 'autunno'], ['2026-11-30', 'autunno'],
  ['2026-12-01', 'inverno'], ['2026-12-14', 'inverno'], ['2026-12-15', 'natale'], ['2026-12-25', 'natale'], ['2026-12-30', 'natale'],
  ['2026-12-31', 'festa'], ['2027-01-01', 'festa'], ['2027-01-02', 'natale'], ['2027-01-06', 'natale'], ['2027-01-07', 'inverno'],
];
for (const [data, atteso] of casi) check(`${data}: ${atteso}`, vestitoDelGiorno(data) === atteso, vestitoDelGiorno(data));

// Ogni giorno di un anno ha un vestito valido, e nessuno resta senza disegno
let tutti = true, giorni = 0;
for (let m = 1; m <= 12; m++) for (let g = 1; g <= new Date(2027, m, 0).getDate(); g++) {
  const iso = `2027-${String(m).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
  giorni++;
  if (!VESTITI.includes(vestitoDelGiorno(iso))) tutti = false;
}
check(`tutti i ${giorni} giorni del 2027 hanno un vestito valido`, tutti && giorni === 365);
const disegni = fs.readFileSync(path.join(radice, 'js/ui/vermetto.js'), 'utf8');
const mancano = VESTITI.filter((v) => !disegni.includes(`
  ${v}(c, h, hr`));
check('per ogni vestito esiste il disegno nel codice di Rosso e Rossella', mancano.length === 0, mancano.join(','));

check('ogni vestito ha il suo gruppo di battute; uno sconosciuto usa quelle generiche', VESTITI.every((v) => contestoDelVestito(v) === v) && contestoDelVestito('boh') === 'tocco');

// Pasqua (date vere) e le feste che ne dipendono
const attesaPasqua = { 2024: '03-31', 2025: '04-20', 2026: '04-05', 2027: '03-28', 2028: '04-16', 2029: '04-01', 2030: '04-21', 2038: '04-25', 2285: '03-22' };
for (const [a, md] of Object.entries(attesaPasqua)) { const [m, g] = pasqua(Number(a)); check(`Pasqua ${a}: ${md}`, `${String(m).padStart(2, '0')}-${String(g).padStart(2, '0')}` === md, `${m}-${g}`); }
const p26 = [['2026-04-01', 'primavera'], ['2026-04-02', 'pasqua'], ['2026-04-05', 'pasqua'], ['2026-04-06', 'pasqua'], ['2026-04-07', 'primavera'],
  ['2027-03-25', 'pasqua'], ['2027-03-29', 'pasqua'], ['2027-03-30', 'primavera'], ['2027-03-24', 'primavera']];
for (const [d, v] of p26) check(`${d}: ${v} (giovedì santo - Pasquetta)`, vestitoDelGiorno(d) === v, vestitoDelGiorno(d));
const c26 = [['2026-02-11', 'inverno'], ['2026-02-12', 'carnevale'], ['2026-02-17', 'carnevale'], ['2026-02-18', 'inverno'], ['2027-02-04', 'carnevale'], ['2027-02-09', 'carnevale'], ['2027-02-10', 'inverno']];
for (const [d, v] of c26) check(`${d}: ${v} (giovedì - martedì grasso)`, vestitoDelGiorno(d) === v, vestitoDelGiorno(d));

// Compleanno dell'orto: stesso giorno del primo avvio, dall'anno dopo; vince su tutto
const nato = '2026-11-10';
check('compleanno: un anno dopo', vestitoDelGiorno('2027-11-10', { nato }) === 'compleanno');
check('compleanno: nello stesso anno del primo avvio non c\'è', vestitoDelGiorno('2026-11-10', { nato }) === 'autunno');
check('compleanno: il giorno dopo no', vestitoDelGiorno('2027-11-11', { nato }) === 'autunno');
check('compleanno battuto solo da niente: vince anche su Natale', vestitoDelGiorno('2027-12-25', { nato: '2026-12-25' }) === 'compleanno');
check('compleanno: data del primo avvio rotta o assente = nessun compleanno', vestitoDelGiorno('2027-11-10', { nato: 'boh' }) === 'autunno' && vestitoDelGiorno('2027-11-10', { nato: null }) === 'autunno' && vestitoDelGiorno('2027-11-10') === 'autunno');
check('compleanno il 29 febbraio: senza bisogno, nessun crash negli anni non bisestili', vestitoDelGiorno('2027-03-01', { nato: '2024-02-29' }) !== 'compleanno');
check('feste vicine non si pestano: Capodanno resta «festa» e Pasqua non diventa mai Natale', vestitoDelGiorno('2027-01-01', { nato: '2026-02-02' }) === 'festa');
check('altroVestito: sempre diverso dall\'attuale', VESTITI.every((v) => [0, 0.3, 0.99].every((x) => altroVestito(v, x) !== v && VESTITI.includes(altroVestito(v, x)))));

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
