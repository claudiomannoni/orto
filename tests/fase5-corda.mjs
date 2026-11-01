// Corda con fisica di Verlet (Node, nessun server). Uso: node tests/fase5-corda.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { creaCorda, passoCorda, lanciaCorda, centroCorda, lunghezzaMassimaErrore } = await import(
  pathToFileURL(path.join(radice, 'js/motore/corda.js')).href
);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

const finito = (v) => typeof v === 'number' && Number.isFinite(v);
const tuttiFiniti = (corda) => corda.p.every((p) => finito(p.x) && finito(p.y) && finito(p.px) && finito(p.py));
const vicino = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// Generatore pseudo-casuale deterministico per la prova lunga.
let seme = 123456789;
const casuale = () => {
  seme = (seme * 1664525 + 1013904223) % 4294967296;
  return seme / 4294967296;
};

// Creazione
const cMini = creaCorda(1, 10, 0, 0);
check('creaCorda(1): almeno 2 punti', cMini.p.length === 2, `punti=${cMini.p.length}`);
const cGrande = creaCorda(100, 10, 0, 0);
check('creaCorda(100): massimo 40 punti', cGrande.p.length === 40, `punti=${cGrande.p.length}`);
check('creaCorda(5.4): arrotonda a 5', creaCorda(5.4, 10, 0, 0).p.length === 5);
check('creaCorda(5.6): arrotonda a 6', creaCorda(5.6, 10, 0, 0).p.length === 6);

const cFila = creaCorda(4, 10, 5, 7);
check('creaCorda: lunghezza salvata', cFila.l === 10);
check(
  'creaCorda: punti in fila orizzontale',
  cFila.p.every((p, i) => vicino(p.x, 5 + i * 10) && vicino(p.y, 7) && vicino(p.px, p.x) && vicino(p.py, p.y)),
  cFila.p.map((p) => `(${p.x},${p.y})`).join(' ')
);
const cStrana = creaCorda(NaN, 'x', undefined, null);
check('creaCorda con valori strani: nessun NaN', tuttiFiniti(cStrana) && cStrana.p.length === 2);

// Caduta libera con gravità
const caduta = creaCorda(5, 10, 0, 0);
for (let i = 0; i < 10; i++) passoCorda(caduta);
check('gravità: dopo 10 passi la y è aumentata', caduta.p.every((p) => p.y > 0), `y=${caduta.p[0].y.toFixed(3)}`);

// Distanze dopo 200 passi e un lancio forte
const tesa = creaCorda(8, 10, 100, 100);
lanciaCorda(tesa, 45, -30);
for (let i = 0; i < 200; i++) passoCorda(tesa, { iterazioni: 6 });
const errore = lunghezzaMassimaErrore(tesa);
check('distanze entro il 10% dopo 200 passi e lancio forte', errore <= 0.1, `errore=${errore.toExponential(2)}`);

// Limiti per 500 passi dopo un lancio verso l'esterno
const dentro = creaCorda(10, 10, 100, 100);
const limiti = { x0: 0, y0: 0, x1: 200, y1: 200 };
lanciaCorda(dentro, 100, -100);
for (let i = 0; i < 500; i++) passoCorda(dentro, { limiti, iterazioni: 6 });
check(
  'limiti rispettati per 500 passi',
  dentro.p.every((p) => p.x >= limiti.x0 - 1e-9 && p.x <= limiti.x1 + 1e-9 && p.y >= limiti.y0 - 1e-9 && p.y <= limiti.y1 + 1e-9),
  dentro.p.map((p) => `(${p.x.toFixed(1)},${p.y.toFixed(1)})`).join(' ')
);

// Terra
const aTerra = creaCorda(8, 10, 0, 0);
const terra = { y: 100, attrito: 0.8 };
lanciaCorda(aTerra, 20, -10);
for (let i = 0; i < 500; i++) passoCorda(aTerra, { terra, iterazioni: 6 });
check('terra: nessun punto sotto terra.y', aTerra.p.every((p) => p.y <= terra.y + 1e-9), `ymax=${Math.max(...aTerra.p.map((p) => p.y)).toFixed(3)}`);

// Punto afferrato
const presa = creaCorda(6, 10, 0, 0);
const mano = { indice: 0, x: 50, y: 20 };
for (let i = 0; i < 60; i++) passoCorda(presa, { afferrato: mano });
check(
  'afferrato: resta esattamente su (x, y)',
  presa.p[0].x === 50 && presa.p[0].y === 20 && presa.p[0].px === 50 && presa.p[0].py === 20,
  `p0=(${presa.p[0].x},${presa.p[0].y})`
);
check('afferrato: trascina gli altri punti', presa.p[1].x > 20 && presa.p[5].x > 10, `p1.x=${presa.p[1].x.toFixed(2)} p5.x=${presa.p[5].x.toFixed(2)}`);

// Lancio: dopo un passo senza gravità il centro si sposta di (vx, vy)
const lanciata = creaCorda(5, 10, 0, 0);
const prima = centroCorda(lanciata);
lanciaCorda(lanciata, 3, 4);
passoCorda(lanciata, { gravita: 0, attrito: 1 });
const dopo = centroCorda(lanciata);
check(
  'lanciaCorda: il centro si sposta di circa (3, 4)',
  vicino(dopo.x - prima.x, 3, 1e-9) && vicino(dopo.y - prima.y, 4, 1e-9),
  `delta=(${(dopo.x - prima.x).toFixed(6)},${(dopo.y - prima.y).toFixed(6)})`
);

// Opzioni strane: si usano i default, mai NaN
const strana = creaCorda(6, 10, 0, 0);
passoCorda(strana, {
  gravita: NaN,
  attrito: 'x',
  iterazioni: 'a',
  rimbalzo: undefined,
  limiti: { x0: NaN, y0: 0, x1: 100, y1: 100 },
  terra: { y: 'x', attrito: 'y' },
  afferrato: { indice: 'a', x: 1, y: 2 },
});
passoCorda(strana, { gravita: Infinity, attrito: -Infinity, iterazioni: NaN, rimbalzo: null, limiti: 7, terra: 'x' });
passoCorda(strana);
lanciaCorda(strana, NaN, 'x');
check('opzioni strane: nessun NaN o infinito', tuttiFiniti(strana), strana.p.map((p) => `(${p.x},${p.y})`).join(' '));

// 5000 passi con lanci casuali deterministici
const lunga = creaCorda(12, 8, 50, 50);
const limitiLunga = { x0: 0, y0: 0, x1: 300, y1: 300 };
const terraLunga = { y: 300, attrito: 0.7 };
let sempreFiniti = true;
for (let i = 0; i < 5000; i++) {
  if (i % 37 === 0) lanciaCorda(lunga, (casuale() - 0.5) * 40, (casuale() - 0.5) * 40);
  passoCorda(lunga, { limiti: limitiLunga, terra: terraLunga, iterazioni: 6 });
  if (!tuttiFiniti(lunga)) {
    sempreFiniti = false;
    break;
  }
}
check('5000 passi con lanci casuali: nessun NaN o infinito', sempreFiniti);
check('5000 passi: limiti ancora rispettati', lunga.p.every((p) => p.x >= limitiLunga.x0 - 1e-9 && p.x <= limitiLunga.x1 + 1e-9 && p.y >= limitiLunga.y0 - 1e-9 && p.y <= limitiLunga.y1 + 1e-9));
check('5000 passi: terra ancora rispettata', lunga.p.every((p) => p.y <= terraLunga.y + 1e-9));

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
