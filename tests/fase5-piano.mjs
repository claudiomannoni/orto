// Piano dell'orto (Node, nessun server). Uso: node tests/fase5-piano.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { limitaPosizione, distanzaMetri, vicini, giudizioVicinato, statoPerSegnaposto, postoLibero } = await import(pathToFileURL(path.join(radice, 'js/motore/piano.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
const uguale = (a, b) => JSON.stringify(a) === JSON.stringify(b);

check('limita dentro', uguale(limitaPosizione(0.2, 0.8), { x: 0.2, y: 0.8 }));
check('limita fuori', uguale(limitaPosizione(-2, 4), { x: 0, y: 1 }));
check('limita NaN/stringa/null', uguale(limitaPosizione(NaN, '0.2'), { x: 0.5, y: 0.5 }) && uguale(limitaPosizione(null, null), { x: 0.5, y: 0.5 }));
check('distanza orizzontale', distanzaMetri({ x: 0, y: 0 }, { x: 1, y: 0 }, 3, 4) === 3);
check('distanza verticale', distanzaMetri({ x: 0, y: 0 }, { x: 0, y: 1 }, 3, 4) === 4);
check('distanza diagonale', distanzaMetri({ x: 0, y: 0 }, { x: 1, y: 1 }, 3, 4) === 5);
check('distanza misure strane', distanzaMetri({ x: 0, y: 0 }, { x: 1, y: 1 }, NaN, 4) === null && distanzaMetri({ x: 0, y: 0 }, { x: 1, y: 1 }, 0, 4) === null);

const punti = [{ id: 'c', x: 0, y: 0 }, { id: 'a', x: 0.1, y: 0 }, { id: 'b', x: 0.3, y: 0 }];
const entro = vicini(punti, 10, 10, 2.1);
check('vicini raggio piccolo e ordine', entro.length === 2 && entro[0].a === 'a' && entro[0].b === 'c' && entro[1].a === 'a' && entro[1].b === 'b');
const ampi = vicini(punti, 10, 10, 10);
check('vicini coppie una volta e raggio grande', ampi.length === 3 && new Set(ampi.map((p) => p.a + p.b)).size === 3);
check('vicini un solo segnaposto', vicini([punti[0]], 10, 10, 10).length === 0);
check('vicini input non validi', vicini(null, 10, 10, 2).length === 0 && vicini(punti, 10, 10, NaN).length === 0 && vicini(punti, 0, 10, 2).length === 0);

const colture = [
  { id: 'uno', schedaId: 'pomodoro', x: 0, y: 0 },
  { id: 'due', schedaId: 'basilico', x: 0.1, y: 0 },
  { id: 'tre', schedaId: 'cavolo', x: 0.2, y: 0 },
  { id: 'quattro', schedaId: null, x: 0.3, y: 0 },
];
const relazioni = [{ a: 'basilico', b: 'pomodoro', tipo: 'amica' }, { a: 'basilico', b: 'cavolo', tipo: 'nemica' }];
const giudizi = giudizioVicinato(colture, relazioni, 10, 10, 2.1);
check('giudizio amica e nemica in entrambi i sensi', giudizi.length === 2 && giudizi[0].tipo === 'nemica' && giudizi[1].tipo === 'amica');
check('giudizio scheda nulla o relazione assente ignorati', giudizioVicinato([colture[0], colture[3]], relazioni, 10, 10, 10).length === 0 && giudizioVicinato([colture[0], { ...colture[1], schedaId: 'ignota' }], relazioni, 10, 10, 10).length === 0);
check('giudizio input non validi', giudizioVicinato(null, relazioni, 10, 10, 2).length === 0 && giudizioVicinato(colture, null, 10, 10, 2).length === 0);

const stati = statoPerSegnaposto([{ a: 'x', b: 'y', tipo: 'amica' }, { a: 'x', b: 'z', tipo: 'nemica' }, { a: 'm', b: 'n', tipo: 'amica' }, { a: 'q', b: 'r', tipo: 'altro' }]);
check('stato nemica prevale su amica', stati.x === 'attenzione' && stati.y === 'ok' && stati.z === 'attenzione');
check('stato solo amica e nessuno', stati.m === 'ok' && !('q' in stati) && !('r' in stati));

check('posto libero aiuola vuota', uguale(postoLibero([], 8, 8, 1), { x: 0.0625, y: 0.0625 }));
check('posto libero salta primo punto occupato', uguale(postoLibero([{ x: 0.0625, y: 0.0625 }], 8, 8, 0.1), { x: 0.1875, y: 0.0625 }));
check('posto libero tutto occupato', uguale(postoLibero(Array.from({ length: 64 }, (_, i) => ({ x: ((i % 8) + 0.5) / 8, y: (Math.floor(i / 8) + 0.5) / 8 })), 8, 8, 1), { x: 0.5, y: 0.5 }));
check('posto libero misure strane', uguale(postoLibero([], 0, 8, 1), { x: 0.5, y: 0.5 }) && uguale(postoLibero([], 8, 8, NaN), { x: 0.5, y: 0.5 }));

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
