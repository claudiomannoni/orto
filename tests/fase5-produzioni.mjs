// Lotti e movimenti delle produzioni: quantità calcolate, controlli, conversione dei dati vecchi (Node, nessun server).
// Uso: node tests/fase5-produzioni.mjs <cartella-app>
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const m = await import(pathToFileURL(path.join(radice, 'js/motore/produzioni.js')).href);
const { pulisciProduzione, pulisciMovimento, quantita, puoRegistrare, lottoDaRaccolto, daEccesso, TIPI_MOVIMENTO } = m;
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

const lotto = (extra = {}) => pulisciProduzione({ id: 'p', categoria: 'ortaggi', prodotto: 'Pomodori', unita: 'kg', quantita_ottenuta: 20, origine: { tipo: 'manuale' }, data: '2026-07-01', ...extra });
const mov = (tipo, q, extra = {}) => ({ id: `m-${tipo}-${q}-${Math.random()}`, produzioneId: 'p', tipo, quantita: q, ...extra });
const q = (ms, l = lotto()) => quantita(l, ms);

check('i sette tipi di movimento', TIPI_MOVIMENTO.join() === 'consumo,riserva,rilascio_riserva,pubblicazione,ritiro_pubblicazione,cessione,perdita');

// --- pulizia del lotto
let l = lotto({ prodotto: '  Pomodori   cuore di bue ' });
check('lotto: prodotto pulito, quantità e data intatte', l && l.prodotto === 'Pomodori cuore di bue' && l.quantita_ottenuta === 20 && l.data === '2026-07-01');
check('lotto: id, categoria, prodotto, unità obbligatori', [{ id: '' }, { id: 7 }, { categoria: '' }, { prodotto: '   ' }, { unita: '' }, { unita: null }].every((x) => lotto(x) === null));
check('lotto: quantità solo numeri finiti > 0 (non stringhe), tetto un milione', [0, -3, NaN, Infinity, '5', null].every((x) => lotto({ quantita_ottenuta: x }) === null) && lotto({ quantita_ottenuta: 5e9 }).quantita_ottenuta === 1000000);
check('lotto: data impossibile -> null ma lotto valido; data in UTC (nessun scarto di fuso)', lotto({ data: '2026-02-30' }).data === null && lotto({ data: '2026-07-10' }).data === '2026-07-10' && lotto({ data: '2026-01-01' }).data === '2026-01-01');
check('lotto: origine strana -> manuale, id tenuti solo se testo', (() => { const a = lotto({ origine: { tipo: 'boh', colturaId: 5 } }); const b = lotto({ origine: { tipo: 'coltura', colturaId: 'c1', zonaId: 'z' } }); return a.origine.tipo === 'manuale' && !('colturaId' in a.origine) && b.origine.colturaId === 'c1' && b.origine.zonaId === 'z'; })());
check('lotto: proprieta non oggetto -> {}, note lunghe tagliate, prodotto tagliato a 80', (() => { const a = lotto({ proprieta: [1], note: 'x'.repeat(500), prodotto: 'y'.repeat(200) }); return JSON.stringify(a.proprieta) === '{}' && a.note.length === 300 && a.prodotto.length === 80; })());
check('lotto: input non oggetti -> null', [null, undefined, 3, 'x', [], true].every((x) => pulisciProduzione(x) === null));

// --- pulizia del movimento
check('movimento valido', pulisciMovimento({ id: 'a', produzioneId: 'p', tipo: 'consumo', quantita: 2, data: '2026-07-02' })?.quantita === 2);
check('movimento: tipo sconosciuto, quantità non valida, id mancanti -> null', [{ tipo: 'rubato' }, { quantita: 0 }, { quantita: '2' }, { id: '' }, { produzioneId: null }].every((x) => pulisciMovimento({ id: 'a', produzioneId: 'p', tipo: 'consumo', quantita: 2, ...x }) === null));
check('movimento: annuncioId, controparte, note ripuliti', (() => { const a = pulisciMovimento({ id: 'a', produzioneId: 'p', tipo: 'cessione', quantita: 1, annuncioId: 'x', controparte: '  Maria   R. ', note: 5 }); return a.annuncioId === 'x' && a.controparte === 'Maria R.' && a.note === ''; })());

// --- l'esempio dei 20 kg
let r = q([mov('riserva', 8), mov('consumo', 4), mov('pubblicazione', 8)]);
check('esempio: 20 kg, riserva 8, consumo 4, pubblicazione 8 -> disponibile 0, pubblicata 8, riservata 8, consumata 4', r.ottenuta === 20 && r.disponibile === 0 && r.pubblicata === 8 && r.riservata === 8 && r.consumata === 4, JSON.stringify(r));
r = q([mov('riserva', 8), mov('consumo', 4), mov('pubblicazione', 8), mov('cessione', 3, { annuncioId: 'ann' })]);
check('esempio: cessione di 3 kg dall\'annuncio -> ceduta 3, pubblicata 5, disponibile 0', r.ceduta === 3 && r.pubblicata === 5 && r.disponibile === 0, JSON.stringify(r));
check('i conti tornano sempre: consumata + riservata + pubblicata + ceduta + disponibile + persa = ottenuta', (() => { const s = r.consumata + r.riservata + r.pubblicata + r.ceduta + r.disponibile + r.persa; return Math.abs(s - r.ottenuta) < 1e-9; })());
r = q([mov('cessione', 5), mov('perdita', 2)]);
check('cessione senza annuncio e perdita escono dalla disponibile', r.ceduta === 5 && r.persa === 2 && r.disponibile === 13, JSON.stringify(r));
r = q([mov('riserva', 6), mov('rilascio_riserva', 2)]);
check('rilascio della riserva: riservata 4, disponibile 16', r.riservata === 4 && r.disponibile === 16, JSON.stringify(r));
r = q([mov('pubblicazione', 10), mov('ritiro_pubblicazione', 4)]);
check('ritiro dalla pubblicazione: pubblicata 6, disponibile 14', r.pubblicata === 6 && r.disponibile === 14, JSON.stringify(r));
r = q([mov('riserva', 5, { produzioneId: 'altro' }), mov('consumo', 3)]);
check('i movimenti di un altro lotto non contano', r.riservata === 0 && r.consumata === 3 && r.disponibile === 17);
r = q([null, 7, 'x', { tipo: 'consumo', quantita: 2 }, mov('consumo', -1), mov('consumo', 2)]);
check('movimenti rovinati ignorati', r.consumata === 2 && r.disponibile === 18, JSON.stringify(r));
r = q([mov('consumo', 25)]);
check('mai sotto zero (anche con dati incoerenti)', r.disponibile === 0 && r.riservata === 0 && r.pubblicata === 0, JSON.stringify(r));
check('arrotondamento a 3 decimali', q([mov('consumo', 0.1), mov('consumo', 0.2)]).consumata === 0.3 && q([mov('consumo', 0.1), mov('consumo', 0.2)]).disponibile === 19.7);
check('lotto non valido: tutto a zero', (() => { const z = quantita(null, [mov('consumo', 1)]); return Object.values(z).every((v) => v === 0); })());
check('unità g con quantità piccole: nessun errore di virgola', quantita(lotto({ unita: 'g', quantita_ottenuta: 750 }), [mov('consumo', 250.5)]).disponibile === 499.5);

// --- controlli prima di registrare
const base = [mov('riserva', 8), mov('consumo', 4), mov('pubblicazione', 5)]; // disponibile 3, riservata 8, pubblicata 5
check('puoRegistrare: dentro la disponibile -> ok', puoRegistrare(lotto(), base, mov('consumo', 3)).ok === true);
check('puoRegistrare: oltre la disponibile -> troppo', (() => { const x = puoRegistrare(lotto(), base, mov('consumo', 3.01)); return x.ok === false && x.motivo === 'produzione.errore.troppo'; })());
check('riserva, pubblicazione, perdita e cessione senza annuncio rispettano la disponibile', ['riserva', 'pubblicazione', 'perdita', 'cessione'].every((t) => puoRegistrare(lotto(), base, mov(t, 3)).ok && puoRegistrare(lotto(), base, mov(t, 3.5)).motivo === 'produzione.errore.troppo'));
check('rilascio riserva: fino a quanto riservato', puoRegistrare(lotto(), base, mov('rilascio_riserva', 8)).ok && puoRegistrare(lotto(), base, mov('rilascio_riserva', 8.5)).motivo === 'produzione.errore.riserva');
check('ritiro pubblicazione e cessione con annuncio: fino a quanto pubblicato', puoRegistrare(lotto(), base, mov('ritiro_pubblicazione', 5)).ok && puoRegistrare(lotto(), base, mov('ritiro_pubblicazione', 5.5)).motivo === 'produzione.errore.pubblicata' && puoRegistrare(lotto(), base, mov('cessione', 5, { annuncioId: 'a' })).ok && puoRegistrare(lotto(), base, mov('cessione', 6, { annuncioId: 'a' })).motivo === 'produzione.errore.pubblicata');
check('movimento non valido o di un altro lotto -> errore movimento', puoRegistrare(lotto(), base, { tipo: 'consumo', quantita: 1 }).motivo === 'produzione.errore.movimento' && puoRegistrare(lotto(), base, mov('consumo', 1, { produzioneId: 'altro' })).motivo === 'produzione.errore.movimento' && puoRegistrare(null, base, mov('consumo', 1)).ok === false);

// --- dai dati vecchi
const evento = { id: 'e1', tipo: 'raccolto', quantita: 1.5, unita: 'kg', nomeColtura: 'Zucchine', colturaId: 'c1', schedaId: 'zucchine', zonaId: 'z1', data: '2026-07-04' };
const dr = lottoDaRaccolto(evento);
check('raccolto -> lotto: id deterministico, ortaggi, origine coltura', dr && dr.id === 'raccolto:e1' && dr.categoria === 'ortaggi' && dr.prodotto === 'Zucchine' && dr.origine.tipo === 'coltura' && dr.origine.colturaId === 'c1' && dr.quantita_ottenuta === 1.5 && dr.unita === 'kg' && dr.data === '2026-07-04');
check('raccolto -> lotto: uguale se lo si rifà (idempotente)', JSON.stringify(lottoDaRaccolto(evento)) === JSON.stringify(lottoDaRaccolto({ ...evento })));
check('raccolto non valido o di altro tipo -> null', lottoDaRaccolto({ ...evento, tipo: 'nota' }) === null && lottoDaRaccolto({ ...evento, quantita: 0 }) === null && lottoDaRaccolto(null) === null && lottoDaRaccolto({ ...evento, nomeColtura: '' }) === null);

const ecc = (extra = {}) => ({ id: 'x1', categoria: 'ortaggi', nome: 'Zucchine', quantita: 3, unita: 'kg', stato: 'disponibile', data: '2026-07-10', ...extra });
let e = daEccesso(ecc());
check('eccesso disponibile -> lotto senza movimenti', e && e.produzione.id === 'eccesso:x1' && e.produzione.origine.tipo === 'manuale' && e.movimenti.length === 0 && quantita(e.produzione, e.movimenti).disponibile === 3);
e = daEccesso(ecc({ stato: 'venduto' }));
check('eccesso venduto -> una cessione di tutto, controparte «venduto»', e.movimenti.length === 1 && e.movimenti[0].tipo === 'cessione' && e.movimenti[0].quantita === 3 && e.movimenti[0].controparte === 'venduto' && e.movimenti[0].id === 'eccesso:x1:cessione' && quantita(e.produzione, e.movimenti).ceduta === 3 && quantita(e.produzione, e.movimenti).disponibile === 0);
check('eccesso regalato e scambiato: controparte uguale allo stato', daEccesso(ecc({ stato: 'regalato' })).movimenti[0].controparte === 'regalato' && daEccesso(ecc({ stato: 'scambiato' })).movimenti[0].controparte === 'scambiato');
check('categorie: uova/miele, piantine/semi, speciali', daEccesso(ecc({ categoria: 'uova_miele', unita: 'pezzi' })).produzione.categoria === 'uova' && daEccesso(ecc({ categoria: 'uova_miele', unita: 'vasetti' })).produzione.categoria === 'miele' && daEccesso(ecc({ categoria: 'uova_miele', unita: 'kg' })).produzione.categoria === 'miele' && daEccesso(ecc({ categoria: 'piantine_semi', unita: 'pezzi' })).produzione.categoria === 'piantine' && daEccesso(ecc({ categoria: 'piantine_semi', unita: 'g' })).produzione.categoria === 'semi' && daEccesso(ecc({ categoria: 'speciali' })).produzione.categoria === 'speciali');
check('eccesso non valido o categoria sconosciuta -> null', daEccesso(null) === null && daEccesso(ecc({ categoria: 'boh' })) === null && daEccesso(ecc({ quantita: 0 })) === null && daEccesso(ecc({ nome: '' })) === null);

// le categorie usate dai moduli esistono nel registro
const registro = JSON.parse(fs.readFileSync(path.join(radice, 'data/it/categorie-produzione.json'), 'utf8'));
const idCat = registro.categorie.map((c) => c.id);
const usate = ['ortaggi', 'uova', 'miele', 'piantine', 'semi', 'speciali'];
check('le categorie prodotte dalle conversioni esistono nel registro', usate.every((c) => idCat.includes(c)));
check('registro: id unici, unità ammesse note, nessuna vendita presunta libera', new Set(idCat).size === idCat.length && registro.categorie.every((c) => c.unita_ammesse.every((u) => u in registro.unita) && c.vendita.stato === 'verifica' && c.vendita.informativa.length > 10));
check('le unità prodotte dalle conversioni sono ammesse dalla categoria', (() => { const prova = [daEccesso(ecc({ unita: 'pezzi', categoria: 'uova_miele' })), daEccesso(ecc({ unita: 'vasetti', categoria: 'uova_miele' })), daEccesso(ecc({ unita: 'g', categoria: 'piantine_semi' })), daEccesso(ecc())]; return prova.every((x) => registro.categorie.find((c) => c.id === x.produzione.categoria).unita_ammesse.includes(x.produzione.unita)); })());

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
