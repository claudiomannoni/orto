// Giudizio di stagione per ogni pianta: fuori stagione, gelo in arrivo, fine stagione (Node, nessun server). Uso: node tests/fase5-stagione.mjs <cartella-app>
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { giudizioStagione, mesiConsigliati } = await import(pathToFileURL(path.join(radice, 'js/motore/stagione.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

const scheda = (id) => JSON.parse(fs.readFileSync(path.join(radice, `data/it/colture/${id}.json`), 'utf8'));
const basilico = scheda('basilico');
const pomodori = scheda('pomodori');
const Z = 'castelli-romani';

// --- mesi consigliati dai dati veri
check('basilico: si trapianta da maggio a settembre, si semina a maggio e giugno', mesiConsigliati(basilico, Z, 'piantina').join() === '5,6,7,8,9' && mesiConsigliati(basilico, Z, 'seme').join() === '5,6');
check('zona senza dati o scheda strana: nessun mese', mesiConsigliati(basilico, 'altrove', 'seme').length === 0 && mesiConsigliati(null, Z, 'seme').length === 0 && mesiConsigliati({ calendario: { [Z]: 'x' } }, Z, 'seme').length === 0);

// --- fuori stagione (il caso dello schermo di Claudio: basilico trapiantato il 2 novembre)
const bas = { id: 'c1', schedaId: 'basilico', dataSemina: '2026-11-02', partenza: 'piantina' };
let g = giudizioStagione({ coltura: bas, scheda: basilico, zonaId: Z, oggi: '2026-11-02' });
check('basilico trapiantato il 2 novembre: fuori stagione, con i mesi giusti', g.stato === 'fuori-stagione' && g.mese === 11 && g.consigliati.join() === '5,6,7,8,9' && g.origine === 'calendario', JSON.stringify(g));
g = giudizioStagione({ coltura: { ...bas, dataSemina: '2026-07-10' }, scheda: basilico, zonaId: Z, oggi: '2026-07-12' });
check('basilico trapiantato a luglio: ok', g.stato === 'ok');
g = giudizioStagione({ coltura: { ...bas, dataSemina: '2026-09-12' }, scheda: basilico, zonaId: Z, oggi: '2026-11-02' });
check('messa a dimora vecchia (51 giorni): niente avviso di fuori stagione', g.stato === 'ok');
g = giudizioStagione({ coltura: { ...bas, partenza: 'seme', dataSemina: '2026-09-05' }, scheda: basilico, zonaId: Z, oggi: '2026-09-10' });
check('da seme si guardano i mesi di semina (settembre non va per il basilico)', g.stato === 'fuori-stagione' && g.partenza === 'seme');
g = giudizioStagione({ coltura: { id: 'c2', schedaId: 'pomodori', dataSemina: '2026-11-02', partenza: 'seme' }, scheda: pomodori, zonaId: Z, oggi: '2026-11-03' });
check('un pomodoro seminato a novembre: fuori stagione', g.stato === 'fuori-stagione');
g = giudizioStagione({ coltura: { ...bas, dataSemina: '2026-11-10' }, scheda: basilico, zonaId: Z, oggi: '2026-11-02' });
check('data di semina nel futuro: nessun avviso', g.stato === 'ok');
g = giudizioStagione({ coltura: bas, scheda: { id: 'x', calendario: {} }, zonaId: Z, oggi: '2026-11-02' });
check('scheda senza calendario: nessun avviso (non si inventa)', g.stato === 'ok');

// --- freddo e gelo (dati di prova nel formato del file stagione.json)
const dati = { colture: {
  basilico: { ciclo: 'annuale', freddo: { tolleranza: 'muore-col-gelo', soglia_c: null, nota: 'n', certezza: 'media', fonti: ['f1'] }, fine_stagione: { azione: 'raccogliere-tutto', cosa_fare: 'Raccogli tutte le foglie.', come: 'Taglia i rami.', perche: 'Il gelo la uccide.', certezza: 'media', fonti: ['f1'] } },
  pomodori: { ciclo: 'annuale', freddo: { tolleranza: 'teme-il-freddo', soglia_c: 5, nota: 'n', certezza: 'media', fonti: ['f2'] }, fine_stagione: { azione: 'togliere', cosa_fare: 'Togli le piante.', come: 'c', perche: 'p', certezza: 'media', fonti: ['f2'] } },
  fave: { ciclo: 'annuale', freddo: { tolleranza: 'resiste-al-gelo', soglia_c: -8, nota: 'n', certezza: 'media', fonti: ['f1'] }, fine_stagione: { azione: 'lasciare-in-campo', cosa_fare: 'Lascia.', come: 'c', perche: 'p', certezza: 'media', fonti: ['f1'] } },
} };
const vecchio = { ...bas, dataSemina: '2026-09-10' };
g = giudizioStagione({ coltura: vecchio, scheda: basilico, zonaId: Z, dati, oggi: '2026-11-02', minime: [8, 3, 1.5, 6] });
check('basilico con minima prevista 1,5: gelo in arrivo, con la cosa da fare e le fonti', g.stato === 'gelo-in-arrivo' && g.minima === 1.5 && g.fine.cosa_fare === 'Raccogli tutte le foglie.' && g.fonti.includes('f1'), JSON.stringify(g).slice(0, 160));
g = giudizioStagione({ coltura: vecchio, scheda: basilico, zonaId: Z, dati, oggi: '2026-11-02', minime: [8, 6, 5] });
check('niente gelo previsto ma novembre: fine stagione', g.stato === 'fine-stagione' && g.fine.azione === 'raccogliere-tutto');
g = giudizioStagione({ coltura: vecchio, scheda: basilico, zonaId: Z, dati, oggi: '2026-07-20', minime: [18, 20] });
check('in estate senza freddo: ok', g.stato === 'ok');
g = giudizioStagione({ coltura: { ...vecchio, dataSemina: '2026-06-01', schedaId: 'pomodori' }, scheda: pomodori, zonaId: Z, dati, oggi: '2026-10-20', minime: [9, 6, 4.5] });
check('con una soglia dalla fonte (5 °C) si avvisa anche sopra lo zero', g.stato === 'gelo-in-arrivo' && g.soglia === 5);
g = giudizioStagione({ coltura: { ...vecchio, dataSemina: '2026-06-01', schedaId: 'pomodori' }, scheda: pomodori, zonaId: Z, dati, oggi: '2026-10-20', minime: [9, 6, 5.5] });
check('sopra la soglia della fonte: ok (a ottobre non è fine stagione per legge)', g.stato === 'ok');
g = giudizioStagione({ coltura: { ...vecchio, schedaId: 'fave' }, scheda: scheda('fave'), zonaId: Z, dati, oggi: '2026-12-10', minime: [-3, -5] });
check('una pianta che resiste al gelo non viene allarmata', g.stato === 'ok');
g = giudizioStagione({ coltura: vecchio, scheda: basilico, zonaId: Z, dati: { colture: {} }, oggi: '2026-11-02', minime: [-2] });
check('senza dati sulla pianta non si inventa niente', g.stato === 'ok');
g = giudizioStagione({ coltura: vecchio, scheda: basilico, zonaId: Z, dati, oggi: '2026-11-02', minime: [null, 'x', NaN, 4] });
check('minime con valori strani: si ignorano', g.stato === 'fine-stagione');
g = giudizioStagione({ coltura: vecchio, scheda: basilico, zonaId: Z, dati, oggi: '2026-11-02' });
check('senza previsioni: si guarda solo il mese', g.stato === 'fine-stagione');
check('input non validi non rompono', ['', null, undefined, {}].every((x) => giudizioStagione(x).stato === 'ok') && giudizioStagione({ coltura: bas, oggi: 'ieri' }).stato === 'ok');

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
