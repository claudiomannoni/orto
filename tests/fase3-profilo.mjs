// Prova del calcolo del profilo del terreno e della bussola (Node, nessun server).
// Uso: node tests/fase3-profilo.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const carica = (p) => import(pathToFileURL(path.join(radice, p)).href);
const { calcolaProfilo, tessituraDaPercentuali, barattoloValido } = await carica('js/motore/terreno.js');
const { normalizzaZona, normalizzaGradi, direzioneDa, superficie } = await carica('js/store/zone.js');

let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

const dati = {
  questionario: [
    { id: 'mano', opzioni: [{ id: 'si-modella', valori: { tessitura: 'argilloso', drenaggio: 'lento' } }, { id: 'sgretola', valori: { tessitura: 'sabbioso', drenaggio: 'rapido' } }, { id: 'boh' }] },
    { id: 'pioggia', opzioni: [{ id: 'ristagna', valori: { drenaggio: 'lento' } }, { id: 'assorbe', valori: { drenaggio: 'buono' } }] },
    { id: 'scuro', opzioni: [{ id: 'si', valori: { humus: 'ricco' } }, { id: 'no', valori: { humus: 'povero' } }] },
  ],
  piante_indicatrici: [
    { id: 'romice', indica: [{ asse: 'drenaggio', valore: 'lento' }] },
    { id: 'rosmarino', indica: [{ asse: 'drenaggio', valore: 'rapido' }, { asse: 'tessitura', valore: 'sabbioso' }] },
  ],
};

let p = calcolaProfilo({ risposte: { mano: 'si-modella', pioggia: 'ristagna', scuro: 'si' } }, dati);
check('argilloso, lento, humus ricco', p.tessitura === 'argilloso' && p.drenaggio === 'lento' && p.humus === 'ricco', JSON.stringify(p));
p = calcolaProfilo({}, dati);
check('nessuna risposta: tutto null', p.tessitura === null && p.drenaggio === null && p.humus === null, JSON.stringify(p));
p = calcolaProfilo({ risposte: { mano: 'boh' } }, dati);
check('risposta senza valori: tutto null', Object.values(p).every((v) => v === null));
p = calcolaProfilo({ risposte: { mano: 'si-modella', pioggia: 'assorbe' } }, dati);
check('drenaggio in parità (lento 1, buono 1): non si sa', p.drenaggio === null, JSON.stringify(p));
p = calcolaProfilo({ risposte: { pioggia: 'assorbe' }, piante: ['romice'] }, dati);
check('una pianta pesa meno di una risposta: vince la risposta', p.drenaggio === 'buono', JSON.stringify(p));
p = calcolaProfilo({ piante: ['romice'] }, dati);
check('solo una pianta: basta come indizio', p.drenaggio === 'lento');
p = calcolaProfilo({ piante: ['romice', 'rosmarino'] }, dati);
check('due piante in disaccordo: parità, non si sa', p.drenaggio === null);
p = calcolaProfilo({ risposte: { mano: 'si-modella' }, barattolo: { sabbia_pct: 80, limo_pct: 12, argilla_pct: 8 } }, dati);
check('il barattolo vale più del questionario per la tessitura', p.tessitura === 'sabbioso', JSON.stringify(p));
p = calcolaProfilo({ risposte: { mano: 'si-modella' }, barattolo: { sabbia_pct: 80, limo_pct: 80, argilla_pct: 80 } }, dati);
check('barattolo con somma assurda: ignorato', p.tessitura === 'argilloso', JSON.stringify(p));
p = calcolaProfilo({ risposte: { inesistente: 'x', mano: 'nonce' }, piante: ['sconosciuta'] }, dati);
check('id che non esistono: nessun crash', Object.values(p).every((v) => v === null));
check('senza dati: nessun crash', JSON.stringify(calcolaProfilo({ risposte: { a: 'b' } }, null)) === '{"tessitura":null,"drenaggio":null,"humus":null}');

check('tessitura: 85/10/5 sabbioso', tessituraDaPercentuali({ sabbia_pct: 85, argilla_pct: 5 }) === 'sabbioso');
check('tessitura: 20/30/50 argilloso', tessituraDaPercentuali({ sabbia_pct: 20, argilla_pct: 50 }) === 'argilloso');
check('tessitura: 40/40/20 medio impasto', tessituraDaPercentuali({ sabbia_pct: 40, argilla_pct: 20 }) === 'medio');
check('tessitura: valori fuori scala = null', tessituraDaPercentuali({ sabbia_pct: 120, argilla_pct: 5 }) === null && tessituraDaPercentuali({}) === null);
check('barattolo valido: 40/40/20 sì, 40/40/40 no, testo no', barattoloValido({ sabbia_pct: 40, limo_pct: 40, argilla_pct: 20 }) && !barattoloValido({ sabbia_pct: 40, limo_pct: 40, argilla_pct: 40 }) && !barattoloValido({ sabbia_pct: 'a' }));

// Zone: misure, gradi, normalizzazione
check('superficie 4 x 1,5 = 6', superficie(4, 1.5) === 6);
check('superficie con un lato mancante = null', superficie(4, null) === null);
let z = normalizzaZona({ nome: '  Aiuola  ', misure: { lunghezza_m: '4,5', larghezza_m: '2' } });
check('zona: nome ripulito, misure con la virgola, superficie 9', z.nome === 'Aiuola' && z.misure.lunghezza_m === 4.5 && z.superficie_mq === 9, JSON.stringify(z));
z = normalizzaZona({ nome: 'x', misure: { lunghezza_m: -3, larghezza_m: 'abc' } });
check('zona: misure negative o testo = null', z.misure.lunghezza_m === null && z.misure.larghezza_m === null && z.superficie_mq === null);
z = normalizzaZona({});
check('zona vuota: valori di partenza', z.tipo === 'aiuola' && z.stato === 'coltivata' && z.esposizione.gradi === null && z.terreno === null && z.schemaVersion === 3 && z.id.length > 0);
check('zona importata incompleta: nessun crash', normalizzaZona({ id: 'a', nome: 'b', esposizione: 'sbagliato', terreno: 'sbagliato' }).terreno === null);
check('gradi: 370 -> 10, -90 -> 270, 360 -> 0', normalizzaGradi(370) === 10 && normalizzaGradi(-90) === 270 && normalizzaGradi(360) === 0);
check('gradi: testo/null = null', normalizzaGradi('x') === null && normalizzaGradi(null) === null && normalizzaGradi('') === null);
check('direzioni: 0 nord, 135 sud-est, 350 nord, 210 sud-ovest, 200 sud',
  direzioneDa(0) === 'nord' && direzioneDa(135) === 'sud-est' && direzioneDa(350) === 'nord' && direzioneDa(210) === 'sud-ovest' && direzioneDa(200) === 'sud');

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
