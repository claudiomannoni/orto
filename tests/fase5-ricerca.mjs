import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(process.argv[2] || '.');
const { cerca, normalizzaRicerca } = await import(pathToFileURL(path.join(root, 'js/motore/ricerca.js')).href);
let ok = 0, ko = 0;
const check = (n, c) => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}`); };
const voci = [
  { titolo: 'Pomodoro', termini: ['Pomodoro', 'Solanum lycopersicum'], gruppo: 'colture' },
  { titolo: 'Annaffiatura', termini: ['Annaffiatura', 'dare acqua'], gruppo: 'glossario' },
  { titolo: 'Lombricoltura', termini: ['Lombricoltura', 'lombrichi'], gruppo: 'animali' },
];
check('normalizza accenti e maiuscole', normalizzaRicerca('POMODÓRO') === 'pomodoro');
check('prefisso', cerca('pomo', voci)[0]?.titolo === 'Pomodoro');
check('sottostringa', cerca('nnaffia', voci)[0]?.titolo === 'Annaffiatura');
check('tollera un errore piccolo', cerca('pomodro', voci)[0]?.titolo === 'Pomodoro');
check('ordina titolo esatto prima della definizione', cerca('lombricoltura', voci)[0]?.titolo === 'Lombricoltura');
check('query corta e vuota non producono risultati', cerca('a', voci).length === 0 && cerca('', voci).length === 0);
console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
