// «Il tuo eccesso»: pulizia, ordine e totali delle voci (Node, nessun server). Uso: node tests/fase5-eccesso.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const m = await import(pathToFileURL(path.join(radice, 'js/motore/eccesso.js')).href);
const { CATEGORIE, UNITA, STATI, pulisciEccesso, ordinaEccesso, totaliEccesso } = m;
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

check('costanti', CATEGORIE.join() === 'ortaggi,uova_miele,piantine_semi,speciali' && UNITA.join() === 'kg,g,pezzi,vasetti' && STATI.join() === 'disponibile,regalato,scambiato,venduto');
const base = { id: 'a1', categoria: 'ortaggi', nome: '  Zucchine   belle ', quantita: 3, unita: 'kg', stato: 'disponibile', data: '2026-07-10' };
let v = pulisciEccesso(base);
check('voce valida: nome pulito dagli spazi', v && v.nome === 'Zucchine belle' && v.quantita === 3 && v.data === '2026-07-10', JSON.stringify(v));
check('id e nome obbligatori', pulisciEccesso({ ...base, id: '' }) === null && pulisciEccesso({ ...base, id: '  ' }) === null && pulisciEccesso({ ...base, nome: '   ' }) === null && pulisciEccesso({ ...base, id: 5 }) === null);
check('categoria sconosciuta: scartata', pulisciEccesso({ ...base, categoria: 'frutta' }) === null && pulisciEccesso({ ...base, categoria: undefined }) === null);
check('quantità: solo numeri finiti > 0, le stringhe no', [0, -1, NaN, Infinity, '3', null, undefined].every((q) => pulisciEccesso({ ...base, quantita: q }) === null));
check('quantità enorme: tetto 100000', pulisciEccesso({ ...base, quantita: 5e9 }).quantita === 100000);
check('unità sbagliata -> pezzi; stato sbagliato -> disponibile', (() => { const x = pulisciEccesso({ ...base, unita: 'litri', stato: 'rubato' }); return x.unita === 'pezzi' && x.stato === 'disponibile'; })());
check('data impossibile o assente: voce valida con data null', pulisciEccesso({ ...base, data: '2026-02-30' }).data === null && pulisciEccesso({ ...base, data: 'ieri' }).data === null && pulisciEccesso({ ...base, data: undefined }).data === null);
check('nome lungo tagliato a 60', pulisciEccesso({ ...base, nome: 'x'.repeat(200) }).nome.length === 60);
check('input non oggetti: null', [null, undefined, 3, 'x', [], true].every((x) => pulisciEccesso(x) === null));

const lista = [
  { id: '1', categoria: 'ortaggi', nome: 'Pomodori', quantita: 2, unita: 'kg', stato: 'venduto', data: '2026-07-01' },
  { id: '2', categoria: 'ortaggi', nome: 'Zucchine', quantita: 3, unita: 'kg', stato: 'disponibile', data: '2026-07-05' },
  { id: '3', categoria: 'uova_miele', nome: 'Uova', quantita: 12, unita: 'pezzi', stato: 'regalato', data: '2026-07-09' },
  { id: '4', categoria: 'uova_miele', nome: 'Miele', quantita: 4, unita: 'vasetti', stato: 'scambiato', data: '2026-06-20' },
  { id: '5', categoria: 'ortaggi', nome: 'Basilico', quantita: 500, unita: 'g', stato: 'regalato', data: '2026-07-08' },
  { id: '6', categoria: 'piantine_semi', nome: 'Piantine', quantita: 6, unita: 'pezzi', stato: 'disponibile', data: '2026-07-09' },
  { id: '7', categoria: 'speciali', nome: 'Aglio rosso', quantita: 1, unita: 'kg', stato: 'disponibile', data: null },
];
const originale = JSON.stringify(lista);
const ord = ordinaEccesso(lista);
check('ordine: prima i disponibili (data recente prima, senza data in fondo), poi gli altri', ord.map((x) => x.id).join() === '6,2,7,3,5,1,4', ord.map((x) => x.id).join());
check('ordina non modifica l\'elenco e non-array dà []', JSON.stringify(lista) === originale && ordinaEccesso(null).length === 0 && ordinaEccesso('x').length === 0);
check('a pari data e stato: nome in ordine alfabetico', ordinaEccesso([{ id: 'a', nome: 'Zeta', stato: 'disponibile', data: '2026-01-01' }, { id: 'b', nome: 'Alfa', stato: 'disponibile', data: '2026-01-01' }]).map((x) => x.id).join() === 'b,a');

const tot = totaliEccesso(lista);
check('totali: disponibili 3, salvate 4', tot.disponibili === 3 && tot.salvate === 4, JSON.stringify(tot));
check('kg salvati: 2 kg + 500 g = 2,5', tot.kgSalvati === 2.5, String(tot.kgSalvati));
check('pezzi salvati: 12 uova + 4 vasetti = 16', tot.pezziSalvati === 16, String(tot.pezziSalvati));
check('conteggi per stato (tutte le chiavi)', JSON.stringify(tot.perStato) === '{"disponibile":3,"regalato":2,"scambiato":1,"venduto":1}', JSON.stringify(tot.perStato));
check('conteggi per categoria (tutte le chiavi)', JSON.stringify(tot.perCategoria) === '{"ortaggi":3,"uova_miele":2,"piantine_semi":1,"speciali":1}', JSON.stringify(tot.perCategoria));
check('elenco vuoto o non valido: tutto a zero', (() => { const z = totaliEccesso(null); return z.disponibili === 0 && z.salvate === 0 && z.kgSalvati === 0 && z.pezziSalvati === 0 && Object.values(z.perStato).every((n) => n === 0) && Object.values(z.perCategoria).every((n) => n === 0) && Object.keys(z.perStato).length === 4; })());
check('elementi strani o con stato/categoria sconosciuti non contano', (() => { const z = totaliEccesso([null, 3, 'x', { categoria: 'boh', stato: 'venduto', unita: 'kg', quantita: 9 }, { categoria: 'ortaggi', stato: 'boh', unita: 'kg', quantita: 9 }]); return z.salvate === 0 && z.kgSalvati === 0 && z.disponibili === 0; })());
check('arrotondamento a 2 decimali', totaliEccesso([{ categoria: 'ortaggi', stato: 'venduto', unita: 'g', quantita: 333 }, { categoria: 'ortaggi', stato: 'venduto', unita: 'g', quantita: 333 }]).kgSalvati === 0.67);

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
