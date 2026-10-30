// Prova del motore "Oggi" (js/motore/oggi.js) con dati finti. Uso: node fase2-motore.mjs <cartella-app>
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const cartella = path.resolve(process.argv[2] || '..');
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

// Il motore importa util.js che per giorniDa legge location.search: in Node non esiste.
// Lo simuliamo, e segnaliamo che il motore "puro" in realtà dipende dalla pagina.
let oggiForzato = '2026-11-10';
globalThis.location = { get search() { return '?oggi=' + oggiForzato; } };
const { calcolaLavori } = await import(pathToFileURL(path.join(cartella, 'js/motore/oggi.js')).href);

const L = (id, extra = {}) => ({ id, titolo: id, certezza: 'bassa', ...extra });
const scheda = (id, cal = [], lav = []) => ({ id, nome: id, calendario: { z: cal }, lavori: lav });
const run = (oggi, o) => { oggiForzato = oggi; return calcolaLavori({ oggi, zonaId: 'z', schede: [], colture: [], eventi: [], ...o }); };
const ids = (r) => r.map((x) => x.lavoro.id);

// 1. massimo 5
{
  const schede = Array.from({ length: 9 }, (_, i) => scheda('s' + i, [L('c' + i, { mesi: [11] })]));
  check('max 5 lavori', run('2026-11-10', { schede }).length === 5);
  check('massimo configurabile 2', run('2026-11-10', { schede, massimo: 2 }).length === 2);
}
// 2. ordine
{
  const schede = [
    scheda('a', [L('possibile', { mesi: [10, 11, 12] })]),
    scheda('b', [L('ottimale', { mesi: [10, 11, 12], ottimale: [11] })]),
    scheda('c', [L('ultimo', { mesi: [10, 11] })]),
    scheda('d', [L('ultimo-e-ottimale', { mesi: [10, 11], ottimale: [11] })]),
  ];
  const r = ids(run('2026-11-10', { schede }));
  check('ordine: ultimo+ottimale > ultimo > ottimale > possibile', JSON.stringify(r) === JSON.stringify(['ultimo-e-ottimale', 'ultimo', 'ottimale', 'possibile']), r.join(','));
  const r2 = run('2026-11-10', { schede });
  check('motivi corretti', r2.map((x) => x.motivo).join() === 'ultima_finestra,ultima_finestra,ottimale,possibile', r2.map((x) => x.motivo).join());
}
// 3. finestre di giorni e urgenza, ritardo
{
  const sc = scheda('f', [], [L('w', { dopo_giorni: [10, 30] })]);
  const col = (d) => ({ id: 'u1', nome: 'F', schedaId: 'f', dataSemina: d });
  const at = (giorni) => run('2026-11-30', { schede: [sc], colture: [col(new Date(2026, 10, 30 - giorni).toISOString().slice(0, 10))] });
  // evita toISOString (UTC): calcolo a mano
  const sem = (g) => { const d = new Date(2026, 10, 30 - g); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const a = (g) => run('2026-11-30', { schede: [sc], colture: [col(sem(g))] });
  check('giorno 9: non ancora', a(9).length === 0);
  check('giorno 10: compare, in_finestra', a(10).length === 1 && a(10)[0].motivo === 'in_finestra' && a(10)[0].n === 10);
  check('giorno 30 (ultimo): compare', a(30).length === 1 && a(30)[0].motivo === 'in_finestra');
  check('urgenza cresce: p(10) < p(20) < p(30)', a(10)[0].priorita < a(20)[0].priorita && a(20)[0].priorita < a(30)[0].priorita, [10, 20, 30].map((g) => a(g)[0].priorita).join('<'));
  check('giorno 31: ritardo di 1', a(31)[0]?.motivo === 'ritardo' && a(31)[0].n === 1);
  check('giorno 37 (max+7): ancora in ritardo', a(37).length === 1 && a(37)[0].n === 7);
  check('giorno 38: sparito', a(38).length === 0);
  check('coltura nel futuro (semina domani): niente', a(-1).length === 0);
  // legato a coltura batte calendario
  const sc2 = scheda('f', [L('cal', { mesi: [11, 12], ottimale: [11] })], [L('w', { dopo_giorni: [10, 30] })]);
  const r = run('2026-11-30', { schede: [sc2], colture: [col(sem(10))] });
  check('lavoro di coltura (80) davanti a calendario ottimale (70)', ids(r)[0] === 'w' && r.length === 2, ids(r).join(','));
  const sc3 = scheda('f', [L('cal-ultimo', { mesi: [10, 11] })], [L('w', { dopo_giorni: [10, 30] })]);
  const r3 = run('2026-11-30', { schede: [sc3], colture: [col(sem(10))] });
  check('inizio finestra (80) davanti all\'ultimo mese utile (75)', ids(r3)[0] === 'w', ids(r3).join(','));
  const r4 = run('2026-11-30', { schede: [sc3], colture: [col(sem(30))] });
  check('fine finestra (100) davanti all\'ultimo mese (75)', ids(r4)[0] === 'w', ids(r4).join(','));
  const r5 = run('2026-11-30', { schede: [sc3], colture: [col(sem(31))] });
  check('ritardo (78) davanti all\'ultimo mese (75)', ids(r5)[0] === 'w' && ids(r5)[1] === 'cal-ultimo', ids(r5).join(','));
}
// 4. fatto / saltato
{
  const sc = scheda('a', [L('x', { mesi: [11, 12] })], [L('w', { dopo_giorni: [1, 99] })]);
  const col = { id: 'u1', nome: 'A', schedaId: 'a', dataSemina: '2026-11-01' };
  const ev = (tipo, data, extra = {}) => ({ tipo, data, schedaId: 'a', lavoroId: 'x', colturaId: null, ...extra });
  check('base: x visibile', ids(run('2026-11-10', { schede: [sc] })).includes('x'));
  check('fatto oggi: sparisce', !ids(run('2026-11-10', { schede: [sc], eventi: [ev('lavoro_fatto', '2026-11-10')] })).includes('x'));
  check('fatto 29 giorni fa: ancora nascosto', !ids(run('2026-11-30', { schede: [sc], eventi: [ev('lavoro_fatto', '2026-11-01')] })).includes('x'));
  check('fatto 30 giorni fa: ricompare', ids(run('2026-12-01', { schede: [sc], eventi: [ev('lavoro_fatto', '2026-11-01')] })).includes('x'));
  check('saltato oggi: sparisce', !ids(run('2026-11-10', { schede: [sc], eventi: [ev('lavoro_saltato', '2026-11-10')] })).includes('x'));
  check('saltato ieri: ricompare', ids(run('2026-11-11', { schede: [sc], eventi: [ev('lavoro_saltato', '2026-11-10')] })).includes('x'));
  const evw = (tipo, data, colturaId) => ({ tipo, data, schedaId: 'a', lavoroId: 'w', colturaId });
  check('fatto per coltura u1 nasconde w di u1', !ids(run('2026-11-10', { schede: [sc], colture: [col], eventi: [evw('lavoro_fatto', '2026-11-10', 'u1')] })).includes('w'));
  check('fatto per coltura u2 NON nasconde w di u1', ids(run('2026-11-10', { schede: [sc], colture: [col], eventi: [evw('lavoro_fatto', '2026-11-10', 'u2')] })).includes('w'));
  check('evento "nota" non nasconde', ids(run('2026-11-10', { schede: [sc], eventi: [ev('nota', '2026-11-10')] })).includes('x'));
}
// 5. schedaId assente, vuoto, stabile
{
  const sc = scheda('a', [], [L('w', { dopo_giorni: [1, 99] })]);
  check('coltura con schedaId null ignorata', run('2026-11-10', { schede: [sc], colture: [{ id: 'u', nome: 'X', schedaId: null, dataSemina: '2026-11-01' }] }).length === 0);
  check('coltura con schedaId inesistente ignorata', run('2026-11-10', { schede: [sc], colture: [{ id: 'u', nome: 'X', schedaId: 'boh', dataSemina: '2026-11-01' }] }).length === 0);
  check('luglio: elenco vuoto con dati reali-like', run('2026-07-15', { schede: [scheda('a', [L('x', { mesi: [10, 11] })])] }).length === 0);
  check('nessuna scheda: vuoto', run('2026-11-10', {}).length === 0);
  const schede = [scheda('z', [L('Zeta', { mesi: [11] })]), scheda('a', [L('Alfa', { mesi: [11] })]), scheda('m', [L('Mela', { mesi: [11] })])];
  const r1 = ids(run('2026-11-10', { schede })), r2 = ids(run('2026-11-10', { schede: [...schede].reverse() }));
  check('parità: ordine stabile per titolo, indipendente dall\'ordine d\'ingresso', r1.join() === 'Alfa,Mela,Zeta' && r2.join() === r1.join(), r1 + ' | ' + r2);
  const sc2 = scheda('q', [{ id: 'senza-mesi', titolo: 'q' }]);
  let ex = null; try { run('2026-11-10', { schede: [sc2] }); } catch (e) { ex = e; }
  check('lavoro di calendario senza "mesi" non fa crashare', !ex, ex?.message);
  // mesi vuoto
  let ex2 = null; try { run('2026-11-10', { schede: [scheda('q', [L('m', { mesi: [] })])] }); } catch (e) { ex2 = e; }
  check('mesi:[] non fa crashare', !ex2, ex2?.message);
}
// 6. purezza: il motore non dipende dalla pagina (nessun "location"): la data è solo il parametro "oggi"
{
  const fs = await import('node:fs');
  const src = fs.readFileSync(path.join(cartella, 'js/motore/oggi.js'), 'utf8');
  check('il motore non importa giorniDa/oggiISO (che leggono la pagina)', !/giorniDa|oggiISO|location/.test(src.replace(/\/\/.*$/gm, '')));
  oggiForzato = '2026-11-30';
  const sc = scheda('f', [], [L('w', { dopo_giorni: [10, 30] })]);
  const dati = { zonaId: 'z', schede: [sc], colture: [{ id: 'u', nome: 'F', schedaId: 'f', dataSemina: '2026-11-01' }], eventi: [] };
  const r = calcolaLavori({ oggi: '2026-11-10', ...dati });
  check('calcolaLavori({oggi:10/11}) con semina 1/11 = giorno 9: nessun lavoro, anche se la pagina dicesse 30/11', r.length === 0, `risultato: ${r.length} lavori, n=${r[0]?.n}`);
  delete globalThis.location;
  let errore = null; let r2 = [];
  try { r2 = calcolaLavori({ oggi: '2026-11-15', ...dati }); } catch (e) { errore = e; }
  check('senza "location" (Node puro) il motore funziona', !errore && r2.length === 1 && r2[0].n === 14, errore?.message ?? `n=${r2[0]?.n}`);
}
console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
