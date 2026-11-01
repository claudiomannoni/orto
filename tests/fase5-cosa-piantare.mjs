// «Cosa posso piantare qui adesso?» (Node, nessun server). Uso: node tests/fase5-cosa-piantare.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { cosaPiantare, pianteInMq } = await import(pathToFileURL(path.join(radice, 'js/motore/cosa-piantare.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

const lav = (operazione, mesi, titolo = 'Lavoro') => ({ operazione, titolo, mesi });
const scheda = (id, nome, famiglia, calendario) => ({ id, nome, famiglia, calendario: { 'castelli-romani': calendario } });
const schede = [
  scheda('pomodori', 'Pomodori', 'Solanaceae', [lav('semina', [3, 4], 'Semina i pomodori')]),
  scheda('basilico', 'Basilico', 'Lamiaceae', [lav('semina', [4, 5], 'Semina il basilico')]),
  scheda('finocchi', 'Finocchi', 'Apiaceae', [lav('trapianto', [4], 'Trapianta i finocchi')]),
  scheda('patate', 'Patate', 'Solanaceae', [lav('semina', [4], 'Metti a dimora le patate')]),
  scheda('lattuga', 'Lattuga', 'Asteraceae', [lav('raccolta', [4], 'Raccogli')]),
  scheda('carote', 'Carote', 'Apiaceae', [lav('semina', [4, 5], 'Semina le carote')]),
  scheda('agli', 'Aglio', '', [lav('semina', [4], 'Aglio')]),
];
const relazioni = [
  { a: 'pomodori', b: 'basilico', tipo: 'amica', certezza: 'bassa' },
  { a: 'finocchi', b: 'pomodori', tipo: 'nemica', certezza: 'media' },
];
const base = { schede, zonaId: 'castelli-romani', mese: 4, colture: [], eventi: [], relazioni, oggi: '2026-04-10' };
const ids = (r) => r.map((x) => x.schedaId).join(',');

let r = cosaPiantare(base);
check('aiuola vuota ad aprile: tutte le seminabili o trapiantabili, non la sola raccolta', ids(r).split(',').sort().join() === 'agli,basilico,carote,finocchi,patate,pomodori', ids(r));
check('tutte consigliate se non c\'è niente di prima, in ordine alfabetico italiano', r.every((x) => x.stato === 'consigliata') && ids(r) === 'agli,basilico,carote,finocchi,patate,pomodori', ids(r));
check('titolo del primo lavoro che corrisponde', r.find((x) => x.schedaId === 'pomodori').titolo === 'Semina i pomodori');
check('mese fuori calendario: niente', cosaPiantare({ ...base, mese: 9 }).length === 0);
check('zona assente: niente', cosaPiantare({ ...base, zonaId: 'altrove' }).length === 0);

// pomodori già presenti: non si suggeriscono; il basilico è amico, i finocchi nemici, le patate stessa famiglia
r = cosaPiantare({ ...base, colture: [{ schedaId: 'pomodori', dataSemina: '2026-04-01' }] });
check('la coltura già presente non si suggerisce', !ids(r).includes('pomodori'));
const bas = r.find((x) => x.schedaId === 'basilico');
check('amico del pomodoro: motivo «amica» con il nome e la certezza in parole', bas.stato === 'consigliata' && bas.motivi[0].tipo === 'amica' && bas.motivi[0].con === 'Pomodori' && bas.motivi[0].certezza === 'bassa', JSON.stringify(bas));
const fin = r.find((x) => x.schedaId === 'finocchi');
check('nemico del pomodoro (relazione scritta al contrario): attenzione', fin.stato === 'attenzione' && fin.motivi.some((m) => m.tipo === 'nemica' && m.con === 'Pomodori'));
const pat = r.find((x) => x.schedaId === 'patate');
check('stessa famiglia presente: attenzione per rotazione', pat.stato === 'attenzione' && pat.motivi.some((m) => m.tipo === 'rotazione' && m.famiglia === 'Solanaceae'));
check('ordine: consigliate prima (amica in testa), poi le attenzione', r[0].schedaId === 'basilico' && r.at(-1).stato === 'attenzione' && r.findIndex((x) => x.stato === 'attenzione') > r.findLastIndex((x) => x.stato === 'consigliata'), ids(r));

// rotazione dagli eventi: 364 giorni sì, 366 no
const ev = (data) => cosaPiantare({ ...base, eventi: [{ schedaId: 'patate', data }] }).find((x) => x.schedaId === 'pomodori');
check('evento di una Solanacea 364 giorni fa: rotazione', ev('2025-04-11').motivi.some((m) => m.tipo === 'rotazione'));
check('evento 366 giorni fa: niente rotazione', !ev('2025-04-09').motivi.some((m) => m.tipo === 'rotazione'));
check('famiglia vuota: mai rotazione', !cosaPiantare({ ...base, colture: [{ schedaId: 'agli', dataSemina: '2026-04-01' }] }).some((x) => x.motivi.some((m) => m.tipo === 'rotazione')));

// input strani
check('input non validi: elenco vuoto', cosaPiantare({}).length === 0 && cosaPiantare({ ...base, schede: null }).length === 0 && cosaPiantare({ ...base, mese: 13 }).length === 0 && cosaPiantare({ ...base, mese: '4' }).length === 0);
check('elementi strani negli elenchi si ignorano', cosaPiantare({ ...base, colture: [null, 5, { schedaId: 7 }], eventi: [null, 'x'], relazioni: [null, {}, { a: 1 }], schede: [null, ...schede] }).length === 6);

// piante per metro quadro
const sc = { semina: { distanza_file_cm: 50, distanza_piante_cm: 40 } };
check('pianteInMq: 1 mq con 50x40 cm = 5 piante', pianteInMq(sc, 1) === 5);
check('pianteInMq: 4 mq con 50x40 cm = 20 piante', pianteInMq(sc, 4) === 20);
check('pianteInMq: dati mancanti, zero, negativi, NaN, testo -> null', [pianteInMq({}, 1), pianteInMq(sc, 0), pianteInMq(sc, -2), pianteInMq(sc, NaN), pianteInMq(sc, '1'), pianteInMq({ semina: { distanza_file_cm: null, distanza_piante_cm: 20 } }, 1), pianteInMq(null, 1)].every((x) => x === null));

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
