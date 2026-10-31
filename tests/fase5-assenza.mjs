// Assenza (Node, nessun server). Uso: node tests/fase5-assenza.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { giorniDiAssenza, umoreDeiVermi, chiaveBentornato } = await import(pathToFileURL(path.join(radice, 'js/motore/assenza.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

// Stessa data
check('giorniDiAssenza(2026-05-10, 2026-05-10): 0', giorniDiAssenza('2026-05-10', '2026-05-10') === 0);

// Giorni consecutivi
check('giorniDiAssenza(2026-05-10, 2026-05-11): 1', giorniDiAssenza('2026-05-10', '2026-05-11') === 1);
check('giorniDiAssenza(2026-05-10, 2026-05-12): 2', giorniDiAssenza('2026-05-10', '2026-05-12') === 2);

// Passaggio di mese
check('maggio-giugno: 2026-05-31 -> 2026-06-01 è 1', giorniDiAssenza('2026-05-31', '2026-06-01') === 1);
check('attraverso il mese: 2026-05-28 -> 2026-06-02 è 5', giorniDiAssenza('2026-05-28', '2026-06-02') === 5);
check('mese corto: 2026-02-28 -> 2026-03-01 è 1', giorniDiAssenza('2026-02-28', '2026-03-01') === 1);

// Passaggio di anno
check('anno: 2025-12-31 -> 2026-01-01 è 1', giorniDiAssenza('2025-12-31', '2026-01-01') === 1);
check('attraverso l\u2019anno: 2025-12-29 -> 2026-01-03 è 5', giorniDiAssenza('2025-12-29', '2026-01-03') === 5);

// Anno bisestile: 29 febbraio 2028
check('bisestile: 2028-02-28 -> 2028-02-29 è 1', giorniDiAssenza('2028-02-28', '2028-02-29') === 1);
check('bisestile: 2028-02-29 -> 2028-03-01 è 1', giorniDiAssenza('2028-02-29', '2028-03-01') === 1);
check('bisestile: 2028-02-27 -> 2028-03-01 è 3', giorniDiAssenza('2028-02-27', '2028-03-01') === 3);

// Ora legale 2026: 30 marzo (passaggio estivo) e 26 ottobre (passaggio invernale)
check('ora legale inizio: 2026-03-29 -> 2026-03-30 è 1', giorniDiAssenza('2026-03-29', '2026-03-30') === 1);
check('ora legale inizio: 2026-03-30 -> 2026-03-31 è 1', giorniDiAssenza('2026-03-30', '2026-03-31') === 1);
check('ora legale fine: 2026-10-26 è una data buona', giorniDiAssenza('2026-10-25', '2026-10-26') === 1);
check('ora legale fine: 2026-10-26 -> 2026-10-27 è 1', giorniDiAssenza('2026-10-26', '2026-10-27') === 1);

// ultimo dopo oggi
check('ultimo dopo oggi: 0', giorniDiAssenza('2026-05-12', '2026-05-10') === 0);
check('ultimo un anno dopo oggi: 0', giorniDiAssenza('2027-05-10', '2026-05-10') === 0);

// Valori mancanti o strani
check('ultimo null: 0', giorniDiAssenza(null, '2026-05-10') === 0);
check('ultimo undefined: 0', giorniDiAssenza(undefined, '2026-05-10') === 0);
check('oggi null: 0', giorniDiAssenza('2026-05-10', null) === 0);
check('ultimo numero: 0', giorniDiAssenza(20260510, '2026-05-10') === 0);
check('ultimo stringa non data: 0', giorniDiAssenza('ieri', '2026-05-10') === 0);
check('ultimo formato sbagliato (GG/AA/AAAA): 0', giorniDiAssenza('10/05/2026', '2026-05-10') === 0);
check('data impossibile 2026-02-30: 0', giorniDiAssenza('2026-02-30', '2026-03-05') === 0);
check('data impossibile 2026-13-01: 0', giorniDiAssenza('2026-13-01', '2026-05-10') === 0);
check('data impossibile 2027-02-29 (non bisestile): 0', giorniDiAssenza('2027-02-29', '2026-05-10') === 0);
check('data impossibile come oggi (2026-02-30): 0', giorniDiAssenza('2026-02-20', '2026-02-30') === 0);
check('entrambe mancanti: 0', giorniDiAssenza(null, undefined) === 0);

// Umori: soglie esatte
check('umoreDeiVermi(0): allegro', umoreDeiVermi(0) === 'allegro');
check('umoreDeiVermi(1): allegro', umoreDeiVermi(1) === 'allegro');
check('umoreDeiVermi(2): tranquillo', umoreDeiVermi(2) === 'tranquillo');
check('umoreDeiVermi(3): annoiato', umoreDeiVermi(3) === 'annoiato');
check('umoreDeiVermi(6): annoiato', umoreDeiVermi(6) === 'annoiato');
check('umoreDeiVermi(7): dorme', umoreDeiVermi(7) === 'dorme');
check('umoreDeiVermi(29): dorme', umoreDeiVermi(29) === 'dorme');
check('umoreDeiVermi(30): dorme', umoreDeiVermi(30) === 'dorme');
check('umoreDeiVermi(100): dorme', umoreDeiVermi(100) === 'dorme');

// Umori: input non numerici
check('umoreDeiVermi(NaN): allegro (0)', umoreDeiVermi(NaN) === 'allegro');
check("umoreDeiVermi('5'): allegro (0)", umoreDeiVermi('5') === 'allegro');
check('umoreDeiVermi(-3): allegro (0)', umoreDeiVermi(-3) === 'allegro');
check('umoreDeiVermi(2.5): allegro (0)', umoreDeiVermi(2.5) === 'allegro');
check('umoreDeiVermi(null): allegro (0)', umoreDeiVermi(null) === 'allegro');
check('umoreDeiVermi(undefined): allegro (0)', umoreDeiVermi(undefined) === 'allegro');

// Bentornato: soglie esatte
check("chiaveBentornato(0): null", chiaveBentornato(0) === null);
check("chiaveBentornato(1): null", chiaveBentornato(1) === null);
check("chiaveBentornato(2): pochi", chiaveBentornato(2) === 'verme.bentornato.pochi');
check("chiaveBentornato(3): pochi", chiaveBentornato(3) === 'verme.bentornato.pochi');
check("chiaveBentornato(6): pochi", chiaveBentornato(6) === 'verme.bentornato.pochi');
check("chiaveBentornato(7): tanti", chiaveBentornato(7) === 'verme.bentornato.tanti');
check("chiaveBentornato(29): tanti", chiaveBentornato(29) === 'verme.bentornato.tanti');
check("chiaveBentornato(30): moltissimi", chiaveBentornato(30) === 'verme.bentornato.moltissimi');
check("chiaveBentornato(100): moltissimi", chiaveBentornato(100) === 'verme.bentornato.moltissimi');

// Bentornato: input non numerici
check("chiaveBentornato(NaN): null (0)", chiaveBentornato(NaN) === null);
check("chiaveBentornato('5'): null (0)", chiaveBentornato('5') === null);
check("chiaveBentornato(-3): null (0)", chiaveBentornato(-3) === null);
check("chiaveBentornato(2.5): null (0)", chiaveBentornato(2.5) === null);
check("chiaveBentornato(null): null (0)", chiaveBentornato(null) === null);
check("chiaveBentornato(undefined): null (0)", chiaveBentornato(undefined) === null);

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
