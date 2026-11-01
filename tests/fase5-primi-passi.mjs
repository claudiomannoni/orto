// «I tuoi primi passi»: quali cose ha già provato chi usa l'app (Node, nessun server). Uso: node tests/fase5-primi-passi.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { primiPassi, prossimoPasso, avanzamento } = await import(pathToFileURL(path.join(radice, 'js/motore/primi-passi.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
const ids = (p) => p.map((x) => x.id).join(',');

let p = primiPassi({});
check('stato vuoto: sei passi in ordine, nessuno fatto', ids(p) === 'coltura,lavoro,foto,zona,semi,quiz' && p.every((x) => x.fatto === false), ids(p));
check('ogni passo ha rotta e chiave primi.<id>', p.every((x) => /^#\//.test(x.rotta) && x.chiave === `primi.${x.id}`));
check('fatto è sempre un booleano vero', primiPassi({ colture: [1], quizGiocati: 3 }).every((x) => x.fatto === true || x.fatto === false));
check('una coltura: passo «coltura» fatto', primiPassi({ colture: [{}] })[0].fatto === true);
check('lavoro fatto solo con un evento «lavoro_fatto»', primiPassi({ eventi: [{ tipo: 'nota' }, { tipo: 'raccolto' }] })[1].fatto === false && primiPassi({ eventi: [{ tipo: 'nota' }, { tipo: 'lavoro_fatto' }] })[1].fatto === true);
check('foto, zone, semi: bastano elenchi non vuoti', (() => { const q = primiPassi({ foto: [1], zone: [1], semi: [1] }); return q[2].fatto && q[3].fatto && q[4].fatto; })());
check('quiz: serve almeno 1 partita', primiPassi({ quizGiocati: 0 })[5].fatto === false && primiPassi({ quizGiocati: 1 })[5].fatto === true && primiPassi({ quizGiocati: 7 })[5].fatto === true);
check('tipi sbagliati valgono «non fatto»', primiPassi({ colture: 'x', eventi: 5, foto: {}, zone: null, semi: 'a', quizGiocati: '3' }).every((x) => x.fatto === false));
check('quiz NaN o infinito: non fatto', primiPassi({ quizGiocati: NaN })[5].fatto === false && primiPassi({ quizGiocati: Infinity })[5].fatto === false);
check('stato null, stringa, numero: tutto non fatto ma sei passi', [null, 'x', 4, undefined].every((s) => primiPassi(s).length === 6 && primiPassi(s).every((x) => !x.fatto)));
check('eventi con elementi strani non rompono', primiPassi({ eventi: [null, 3, 'x', {}] })[1].fatto === false);

p = primiPassi({ colture: [1], foto: [1] });
check('prossimo passo: il primo non fatto', prossimoPasso(p).id === 'lavoro');
check('prossimo passo: null se sono tutti fatti', prossimoPasso(primiPassi({ colture: [1], eventi: [{ tipo: 'lavoro_fatto' }], foto: [1], zone: [1], semi: [1], quizGiocati: 1 })) === null);
check('prossimo passo: null per elenchi non validi o vuoti', prossimoPasso(null) === null && prossimoPasso([]) === null && prossimoPasso('x') === null);
check('avanzamento: 2 su 6', JSON.stringify(avanzamento(p)) === '{"fatti":2,"totale":6}');
check('avanzamento: elenco non valido -> 0 su 0', JSON.stringify(avanzamento(null)) === '{"fatti":0,"totale":0}' && JSON.stringify(avanzamento('x')) === '{"fatti":0,"totale":0}');
check('avanzamento: conta solo fatto === true', avanzamento([{ fatto: true }, { fatto: 'si' }, { fatto: false }, null]).fatti === 1);

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
