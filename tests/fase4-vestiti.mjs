// Prova dei vestiti dei vermetti (Node, nessun server). Uso: node tests/fase4-vestiti.mjs <cartella-app>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { VESTITI, vestitoDelGiorno, contestoDelVestito, altroVestito } = await import(pathToFileURL(path.join(radice, 'js/motore/vestiti.js')).href);

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
const mancano = VESTITI.flatMap((v) => ['rosso', 'rossella'].map((c) => `assets/mascotte/accessori/${c}-${v}.svg`)).filter((f) => !fs.existsSync(path.join(radice, f)));
check('per ogni vestito esiste il disegno di Rosso e di Rossella', mancano.length === 0, mancano.join(','));
const piccoli = VESTITI.flatMap((v) => ['rosso', 'rossella'].map((c) => `assets/mascotte/accessori/${c}-${v}.svg`)).filter((f) => fs.existsSync(path.join(radice, f)) && fs.statSync(path.join(radice, f)).size > 20000);
check('ogni SVG pesa meno di 20 KB', piccoli.length === 0, piccoli.join(','));
const strani = VESTITI.flatMap((v) => ['rosso', 'rossella'].map((c) => `assets/mascotte/accessori/${c}-${v}.svg`)).filter((f) => fs.existsSync(path.join(radice, f)) && /<script|<image|href=|<text/i.test(fs.readFileSync(path.join(radice, f), 'utf8')));
check('negli SVG niente script, immagini, link o testo', strani.length === 0, strani.join(','));

check('pioggia usa le battute generiche, gli altri le proprie', contestoDelVestito('pioggia') === 'tocco' && contestoDelVestito('halloween') === 'halloween');
check('altroVestito: sempre diverso dall\'attuale', VESTITI.every((v) => [0, 0.3, 0.99].every((x) => altroVestito(v, x) !== v && VESTITI.includes(altroVestito(v, x)))));

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
