// Prova del calcolo delle fasi lunari (Node, nessun server). Uso: node tests/fase2-luna.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { faseLunare, fasiDelMese } = await import(pathToFileURL(path.join(radice, 'js/motore/luna.js')).href);

let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
const giorniTra = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 86400000);

// Date di riferimento di novembre 2026 (Star Walk, Sterngucker; ora UTC): ultimo quarto 1/11, nuova 9/11, primo quarto 17/11, piena 24/11.
const fasi = fasiDelMese(2026, 11);
const dove = (tipo) => fasi.find((f) => f.tipo === tipo)?.data;
check('novembre 2026: quattro fasi', fasi.length === 4, JSON.stringify(fasi));
for (const [tipo, atteso] of [['ultimo_quarto', '2026-11-01'], ['nuova', '2026-11-09'], ['primo_quarto', '2026-11-17'], ['piena', '2026-11-24']]) {
  const d = dove(tipo);
  check(`${tipo}: ${atteso} (tolleranza 1 giorno)`, d && Math.abs(giorniTra(d, atteso)) <= 1, d);
}
check('ordine: nuova -> primo quarto -> piena -> ultimo quarto', ['nuova', 'primo_quarto', 'piena', 'ultimo_quarto'].map(dove).every((d, i, v) => !i || d > v[i - 1]) || dove('ultimo_quarto') < dove('nuova'));

// Stato nei giorni intorno alle fasi
check('10/11/2026 luna crescente', faseLunare('2026-11-10').stato === 'crescente');
check('20/11/2026 luna crescente', faseLunare('2026-11-20').stato === 'crescente');
check('28/11/2026 luna calante', faseLunare('2026-11-28').stato === 'calante');
check('5/11/2026 luna calante', faseLunare('2026-11-05').stato === 'calante');
check('24/11/2026 è il giorno della luna piena', faseLunare('2026-11-24').nome === 'piena');
check('9/11/2026 è il giorno della luna nuova', faseLunare('2026-11-09').nome === 'nuova');
check('15/11/2026 nessun nome speciale', faseLunare('2026-11-15').nome === null);
const l = faseLunare('2026-11-24').luce, n = faseLunare('2026-11-09').luce;
check('luce: piena vicino a 1, nuova vicino a 0', l > 0.97 && n < 0.03, `piena=${l.toFixed(3)} nuova=${n.toFixed(3)}`);

// Su un anno ci sono 12-13 lune nuove e 12-13 lune piene, a circa 29,5 giorni l'una dall'altra
let nuove = [], piene = [];
for (let m = 1; m <= 12; m++) for (const f of fasiDelMese(2027, m)) (f.tipo === 'nuova' ? nuove : f.tipo === 'piena' ? piene : []).push(f.data);
check('2027: 12 o 13 lune nuove', nuove.length >= 12 && nuove.length <= 13, String(nuove.length));
check('2027: 12 o 13 lune piene', piene.length >= 12 && piene.length <= 13, String(piene.length));
check('2027: distanza fra lune nuove 29 o 30 giorni', nuove.every((d, i) => !i || [29, 30].includes(giorniTra(d, nuove[i - 1]))), nuove.join(' '));
check('mese invalido: nessun crash', Array.isArray(fasiDelMese(2026, 1)));
check('nessuna fase fuori dal mese', fasiDelMese(2026, 12).every((f) => f.data.startsWith('2026-12')));

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
