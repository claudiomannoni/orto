// «Le tue piante hanno bisogno di te»: regole pure (Node, nessun server). Uso: node tests/fase5-bisogni.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { bisogniPiante } = await import(pathToFileURL(path.join(radice, 'js/motore/bisogni.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

const OGGI = '2026-11-09';
const c = (id, nome, extra = {}) => ({ id, nome, varieta: '', schedaId: id, ...extra });
const raccogli = { azione: 'raccogliere-tutto', cosa_fare: 'Raccogli i frutti rimasti prima delle gelate.' };
const proteggi = { azione: 'proteggere', cosa_fare: 'Pacciama intorno alla pianta.' };
const lascia = { azione: 'lasciare-in-campo', cosa_fare: 'Lasciala dov\'è.' };

let v = bisogniPiante({ oggi: OGGI, piante: [
  { coltura: c('fave', 'Fave'), giudizio: { stato: 'ok' }, fase: { nome: 'Germinazione', cosa_fare: ['Tieni il terreno umido.', 'Altro'] } },
  { coltura: c('lattuga', 'Lattuga'), giudizio: { stato: 'fine-stagione', fine: proteggi } },
  { coltura: c('pomodori', 'Pomodori'), giudizio: { stato: 'gelo-in-arrivo', minima: -1.4, fine: raccogli } },
] });
check('ordine: prima il gelo, poi la fine stagione, poi la fase', v.map((x) => x.colturaId).join() === 'pomodori,lattuga,fave', v.map((x) => x.colturaId).join());
check('gelo: urgente, azione «raccogli», minima riportata', v[0].urgenza === 'urgente' && v[0].tipo === 'gelo' && v[0].azione === 'raccogli' && v[0].minima === -1.4);
check('fine stagione con protezione: presto, azione «proteggi», frase dai dati', v[1].urgenza === 'presto' && v[1].azione === 'proteggi' && v[1].dettaglio === proteggi.cosa_fare);
check('fase: normale, con la prima cosa da fare dei dati', v[2].urgenza === 'normale' && v[2].dettaglio === 'Tieni il terreno umido.');
check('una voce sola per pianta', new Set(v.map((x) => x.colturaId)).size === v.length);

v = bisogniPiante({ oggi: OGGI, piante: [{ coltura: c('asparagi', 'Asparagi'), giudizio: { stato: 'fine-stagione', fine: lascia } }] });
check('fine stagione «lasciare in campo» senza fase: niente da fare, nessuna voce', v.length === 0, JSON.stringify(v));
v = bisogniPiante({ oggi: OGGI, piante: [{ coltura: c('carciofi', 'Carciofo'), giudizio: { stato: 'gelo-in-arrivo', minima: -3, fine: proteggi } }] });
check('gelo su una pianta da proteggere: «proteggi»', v[0]?.azione === 'proteggi');
v = bisogniPiante({ oggi: OGGI, piante: [{ coltura: c('x', 'Pianta'), giudizio: { stato: 'gelo-in-arrivo', minima: 0 } }] });
check('gelo senza indicazioni nei dati: «controlla», minima 0 riportata', v[0]?.azione === 'controlla' && v[0].minima === 0);
v = bisogniPiante({ oggi: OGGI, piante: [{ coltura: c('basilico', 'Basilico'), giudizio: { stato: 'fuori-stagione' } }] });
check('fuori stagione: presto, «controlla»', v[0]?.tipo === 'fuori-stagione' && v[0].urgenza === 'presto');
v = bisogniPiante({ oggi: OGGI, piante: [{ coltura: c('zucchine', 'Zucchine'), giudizio: { stato: 'ok' }, cicloFinito: true, fase: { cosa_fare: ['x'] } }] });
check('ciclo finito: vince sulla fase', v[0]?.tipo === 'ciclo');
v = bisogniPiante({ oggi: OGGI, piante: [{ coltura: c('p', 'Senza dati'), giudizio: { stato: 'ok' }, fase: null }, { coltura: c('q', 'Fase vuota'), giudizio: { stato: 'ok' }, fase: { cosa_fare: [] } }] });
check('pianta senza dati o con fase vuota: nessuna voce (niente inventato)', v.length === 0);

// «Fatto»: la voce non torna subito
const pom = { coltura: c('pomodori', 'Pomodori'), giudizio: { stato: 'fine-stagione', fine: raccogli } };
const ev = (data, tipo = 'lavoro_fatto', lavoroId = 'bisogno-fine-stagione', colturaId = 'pomodori') => ({ tipo, colturaId, lavoroId, data });
check('fatto oggi: sparisce', bisogniPiante({ oggi: OGGI, piante: [pom], eventi: [ev(OGGI)] }).length === 0);
check('fatto 6 giorni fa: ancora in pausa', bisogniPiante({ oggi: OGGI, piante: [pom], eventi: [ev('2026-11-03')] }).length === 0);
check('fatto 7 giorni fa: torna', bisogniPiante({ oggi: OGGI, piante: [pom], eventi: [ev('2026-11-02')] }).length === 1);
check('fatto su un\'altra pianta o un altro tipo: non conta', bisogniPiante({ oggi: OGGI, piante: [pom], eventi: [ev(OGGI, 'lavoro_fatto', 'bisogno-fine-stagione', 'altra'), ev(OGGI, 'lavoro_fatto', 'bisogno-gelo')] }).length === 1);
check('evento con data futura: ignorato', bisogniPiante({ oggi: OGGI, piante: [pom], eventi: [ev('2026-11-20')] }).length === 1);
const gelo = { coltura: c('pomodori', 'Pomodori'), giudizio: { stato: 'gelo-in-arrivo', minima: -1, fine: raccogli } };
check('gelo fatto ieri: in pausa; fatto 2 giorni fa: torna', bisogniPiante({ oggi: OGGI, piante: [gelo], eventi: [ev('2026-11-08', 'lavoro_fatto', 'bisogno-gelo')] }).length === 0 && bisogniPiante({ oggi: OGGI, piante: [gelo], eventi: [ev('2026-11-07', 'lavoro_fatto', 'bisogno-gelo')] }).length === 1);
check('aver fatto la «fine stagione» non nasconde il gelo che arriva dopo', bisogniPiante({ oggi: OGGI, piante: [gelo], eventi: [ev(OGGI)] }).length === 1);

// ingressi strani
check('senza piante, senza argomenti o con data sbagliata: elenco vuoto', bisogniPiante({ oggi: OGGI }).length === 0 && bisogniPiante().length === 0 && bisogniPiante({ oggi: 'ieri', piante: [pom] }).length === 0);
check('piante senza id o nulle: saltate', bisogniPiante({ oggi: OGGI, piante: [null, { coltura: { nome: 'x' }, giudizio: { stato: 'fuori-stagione' } }, pom] }).length === 1);
v = bisogniPiante({ oggi: OGGI, piante: [{ coltura: { id: 'k', nome: 'Pomodoro', varieta: 'Grappolo', schedaId: 'pomodori' }, giudizio: { stato: 'fine-stagione', fine: raccogli } }] });
check('il nome porta la varietà', v[0]?.nome === 'Pomodoro · Grappolo');
console.log(`Totale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
