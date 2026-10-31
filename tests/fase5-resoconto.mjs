// Resoconto della settimana (Node, nessun server). Uso: node tests/fase5-resoconto.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { resocontoSettimana, chiaveFrase } = await import(pathToFileURL(path.join(radice, 'js/motore/resoconto.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

// Una settimana con dentro un po' di tutto e qualcosa fuori finestra.
const r = resocontoSettimana({
  eventi: [
    { tipo: 'lavoro_fatto', data: '2026-03-04' },
    { tipo: 'lavoro_fatto', data: '2026-03-09' },
    { tipo: 'lavoro_fatto', data: '2026-03-10' },
    { tipo: 'lavoro_fatto', data: '2026-03-03' },
    { tipo: 'lavoro_fatto', data: '2026-03-11' },
    { tipo: 'lavoro_saltato', data: '2026-03-05' },
    { tipo: 'nota', data: '2026-03-06' },
    { tipo: 'raccolto', data: '2026-03-07', quantita: 500, unita: 'g', nomeColtura: 'Basilico' },
    { tipo: 'raccolto', data: '2026-03-08', quantita: 1.2, unita: 'kg', nomeColtura: 'Pomodoro' },
    { tipo: 'raccolto', data: '2026-03-08', quantita: 3, unita: 'pezzi', nomeColtura: 'Zucchina' },
  ],
  foto: [{ data: '2026-03-05' }, { data: '2026-03-03' }, { data: 'boh' }, null],
}, '2026-03-10');

check('finestra: primo e ultimo giorno compresi', r.da === '2026-03-04' && r.a === '2026-03-10', `${r.da} .. ${r.a}`);
check('fuori finestra scartato: 3 lavori su 5', r.lavori === 3, String(r.lavori));
check('conta saltati e note', r.saltati === 1 && r.note === 1, `${r.saltati}/${r.note}`);
check('foto solo quelle dentro e valide', r.foto === 1, String(r.foto));
check('raccolto: grammi in chili, pezzi a parte, tre voci', r.raccolto.kg === 1.7 && r.raccolto.pezzi === 3 && r.raccolto.voci === 3, JSON.stringify(r.raccolto));
check('giorni attivi: sette date diverse', r.giorniAttivi === 7, String(r.giorniAttivi));
check('migliore giorno: pareggio vinto dal più recente', r.miglioreGiorno === '2026-03-10', String(r.miglioreGiorno));
check('coltura del raccolto: chi pesa di più', r.colturaDelRaccolto === 'Pomodoro', String(r.colturaDelRaccolto));
check('non è vuoto', r.vuoto === false);
check('frase di una settimana piena: top', chiaveFrase(r) === 'resoconto.frase.top', chiaveFrase(r));

// Grammi e arrotondamento a tre decimali.
const grammi = resocontoSettimana({
  eventi: [
    { tipo: 'raccolto', data: '2026-03-10', quantita: 250, unita: 'g', nomeColtura: 'Prezzemolo' },
    { tipo: 'raccolto', data: '2026-03-10', quantita: 1, unita: 'g', nomeColtura: 'Prezzemolo' },
    { tipo: 'raccolto', data: '2026-03-10', quantita: 2, unita: 'pezzi', nomeColtura: 'Prezzemolo' },
  ],
}, '2026-03-10');
check('grammi: 250 + 1 diventano 0,251 kg', grammi.raccolto.kg === 0.251, String(grammi.raccolto.kg));
check('pezzi: due pezzi e tre voci', grammi.raccolto.pezzi === 2 && grammi.raccolto.voci === 3, JSON.stringify(grammi.raccolto));
check('solo pezzi: coltura senza kg non conta', resocontoSettimana({
  eventi: [{ tipo: 'raccolto', data: '2026-03-10', quantita: 4, unita: 'pezzi', nomeColtura: 'Ravanello' }],
}, '2026-03-10').colturaDelRaccolto === null);

// Pareggio nel miglior giorno: due lavori il 8 e due il 10.
const pareggio = resocontoSettimana({
  eventi: [
    { tipo: 'lavoro_fatto', data: '2026-03-08' },
    { tipo: 'lavoro_fatto', data: '2026-03-08' },
    { tipo: 'lavoro_fatto', data: '2026-03-10' },
    { tipo: 'lavoro_fatto', data: '2026-03-10' },
  ],
}, '2026-03-10');
check('pareggio lavori: vince il giorno più recente', pareggio.miglioreGiorno === '2026-03-10', String(pareggio.miglioreGiorno));

// Pareggio nei chili: vince la prima in ordine alfabetico.
const colturaPari = resocontoSettimana({
  eventi: [
    { tipo: 'raccolto', data: '2026-03-10', quantita: 500, unita: 'g', nomeColtura: 'Zucchina' },
    { tipo: 'raccolto', data: '2026-03-09', quantita: 0.5, unita: 'kg', nomeColtura: 'Basilico' },
    { tipo: 'raccolto', data: '2026-03-09', quantita: 0.5, unita: 'kg', nomeColtura: 'Aneto' },
  ],
}, '2026-03-10');
check('pareggio chili: prima in ordine alfabetico', colturaPari.colturaDelRaccolto === 'Aneto', String(colturaPari.colturaDelRaccolto));

// Niente di niente.
const vuoto = resocontoSettimana({}, '2026-03-10');
check('vuoto: tutti a zero e niente miglior giorno', vuoto.vuoto === true && vuoto.lavori === 0 && vuoto.foto === 0
  && vuoto.raccolto.kg === 0 && vuoto.raccolto.voci === 0 && vuoto.giorniAttivi === 0
  && vuoto.miglioreGiorno === null && vuoto.colturaDelRaccolto === null);
check('vuoto: frase del vuoto', chiaveFrase(vuoto) === 'resoconto.frase.vuoto', chiaveFrase(vuoto));
check('stato mancante: nessun errore, resoconto vuoto', resocontoSettimana(undefined, '2026-03-10').vuoto === true);

// Eventi e foto rovinati: scartati senza errori.
const rovinati = resocontoSettimana({
  eventi: [
    null,
    {},
    { tipo: 'lavoro_fatto', data: '2026-02-30' },
    { tipo: 'lavoro_fatto', data: '2026-03-10' },
    { tipo: 'raccolto', data: '2026-03-10', quantita: NaN, unita: 'kg' },
    { tipo: 'raccolto', data: '2026-03-10', quantita: -1, unita: 'kg' },
    { tipo: 'raccolto', data: '2026-03-10', quantita: 1, unita: 'litri' },
    { tipo: 'raccolto', data: '2026-03-10', quantita: '2', unita: 'kg' },
  ],
  foto: [null, {}, { data: '2026-13-40' }, { data: '2026-03-10' }],
}, '2026-03-10');
check('rovinati scartati senza errori', rovinati.lavori === 1 && rovinati.raccolto.voci === 0 && rovinati.foto === 1 && rovinati.vuoto === false, JSON.stringify(rovinati));

// Oggi non valido: null.
check('oggi non valido: null', resocontoSettimana({}, '2026-02-30') === null
  && resocontoSettimana({}, 'boh') === null && resocontoSettimana({}, null) === null
  && resocontoSettimana({}, undefined) === null);

// Cambio di mese: dal 28 febbraio al 2 marzo.
const cambioMese = resocontoSettimana({
  eventi: [
    { tipo: 'lavoro_fatto', data: '2026-02-28' },
    { tipo: 'lavoro_fatto', data: '2026-03-01' },
    { tipo: 'lavoro_fatto', data: '2026-02-27' },
  ],
}, '2026-03-02', 3);
check('cambio mese: finestra dal 28 febbraio', cambioMese.da === '2026-02-28' && cambioMese.a === '2026-03-02', `${cambioMese.da} .. ${cambioMese.a}`);
check('cambio mese: due lavori e miglior giorno', cambioMese.lavori === 2 && cambioMese.miglioreGiorno === '2026-03-01', `${cambioMese.lavori}/${cambioMese.miglioreGiorno}`);

// Cambio di anno: dal 28 dicembre al 3 gennaio.
const cambioAnno = resocontoSettimana({
  eventi: [
    { tipo: 'lavoro_fatto', data: '2025-12-31' },
    { tipo: 'lavoro_fatto', data: '2025-12-27' },
    { tipo: 'raccolto', data: '2026-01-01', quantita: 1, unita: 'kg', nomeColtura: 'Cavolo' },
    { tipo: 'nota', data: '2026-01-03' },
  ],
}, '2026-01-03');
check('cambio anno: finestra dal 28 dicembre', cambioAnno.da === '2025-12-28' && cambioAnno.a === '2026-01-03', `${cambioAnno.da} .. ${cambioAnno.a}`);
check('cambio anno: eventi contati bene', cambioAnno.lavori === 1 && cambioAnno.note === 1 && cambioAnno.raccolto.kg === 1
  && cambioAnno.giorniAttivi === 3 && cambioAnno.colturaDelRaccolto === 'Cavolo', JSON.stringify(cambioAnno));

// Le soglie della frase.
const frase = (lavori, giorniAttivi, voci = 0, vuoto = false) => chiaveFrase({
  vuoto, lavori, giorniAttivi, raccolto: { voci },
});
check('frase: 6 lavori è «bene»', frase(6, 2) === 'resoconto.frase.bene', frase(6, 2));
check('frase: 7 lavori è «top»', frase(7, 2) === 'resoconto.frase.top', frase(7, 2));
check('frase: 2 lavori è «poco»', frase(2, 2) === 'resoconto.frase.poco', frase(2, 2));
check('frase: 3 lavori è «bene»', frase(3, 2) === 'resoconto.frase.bene', frase(3, 2));
check('frase: 4 giorni attivi è «bene»', frase(0, 4) === 'resoconto.frase.bene', frase(0, 4));
check('frase: 5 giorni attivi è «top»', frase(0, 5) === 'resoconto.frase.top', frase(0, 5));
check('frase: raccolto 0 è «poco»', frase(0, 0, 0) === 'resoconto.frase.poco', frase(0, 0, 0));
check('frase: raccolto 1 è «bene»', frase(0, 0, 1) === 'resoconto.frase.bene', frase(0, 0, 1));
check('frase: resoconto vuoto', frase(0, 0, 0, true) === 'resoconto.frase.vuoto');
check('frase: resoconto nullo o mancante', chiaveFrase(null) === 'resoconto.frase.vuoto' && chiaveFrase(undefined) === 'resoconto.frase.vuoto');

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
