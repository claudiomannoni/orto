// Curiosità del giorno (Node, nessun server). Uso: node tests/fase5-curiosita.mjs <cartella-app>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { curiositaDelGiorno } = await import(pathToFileURL(path.join(radice, 'js/motore/curiosita.js')).href);
const dati = JSON.parse(fs.readFileSync(path.join(radice, 'data/it/curiosita.json'), 'utf8')).curiosita;
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
check('stesso giorno, stessa curiosità', curiositaDelGiorno(dati, '2026-11-10')?.id === curiositaDelGiorno(dati, '2026-11-10')?.id);
const giorni = Array.from({ length: 30 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);
const viste = new Set(giorni.map((g) => curiositaDelGiorno(dati, g)?.id));
check('in 30 giorni se ne vedono molte diverse (almeno 20)', viste.size >= 20, String(viste.size));
let tuttiMesiOk = true;
for (let m = 1; m <= 12; m++) { const c = curiositaDelGiorno(dati, `2026-${String(m).padStart(2, '0')}-15`); if (!c || (c.mesi && !c.mesi.includes(m))) tuttiMesiOk = false; }
check('ogni mese ha una curiosità adatta al mese', tuttiMesiOk);
check('elenco vuoto o rovinato: null', curiositaDelGiorno([], '2026-11-10') === null && curiositaDelGiorno(undefined, '2026-11-10') === null && curiositaDelGiorno([{ id: 'x' }, null], '2026-11-10') === null);
check('rispetta i mesi: una curiosità solo di luglio non esce a novembre', curiositaDelGiorno([{ id: 'a', testo: 'x', mesi: [7] }], '2026-11-10') === null);
console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
