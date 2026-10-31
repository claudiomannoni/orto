// Pioggia e annaffiature (Node, nessun server). Uso: node tests/fase5-acqua.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { pioggiaCaduta, pioggiaPrevista, fabbisognoSettimanale, consigliAcqua } = await import(pathToFileURL(path.join(radice, 'js/motore/acqua.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
const voce = (data, pioggia, max = 25) => ({ data, pioggia, min: 12, max });
const vicino = (a, b) => Math.abs(a - b) < 0.001;

const oggi = '2026-06-15';
// Come le previsioni di Open-Meteo: ci sono anche i giorni passati e quelli futuri.
const giugno = [
  voce('2026-06-08', 100), // fuori dai 7 giorni
  voce('2026-06-09', 1),
  voce('2026-06-10', 2),
  voce('2026-06-11', 3),
  voce('2026-06-12', 4),
  voce('2026-06-13', 5),
  voce('2026-06-14', 6),
  voce('2026-06-15', 0.5),
  voce('2026-06-16', 100), // domani: non è caduta
];

// ---------- pioggiaCaduta ----------
check('caduta: 7 giorni che finiscono oggi, oggi compreso', vicino(pioggiaCaduta(giugno, oggi), 21.5), pioggiaCaduta(giugno, oggi));
check('caduta: 3 giorni', vicino(pioggiaCaduta(giugno, oggi, 3), 11.5), pioggiaCaduta(giugno, oggi, 3));
check('caduta: 1 giorno, solo oggi', vicino(pioggiaCaduta(giugno, oggi, 1), 0.5));
check('caduta: 0 giorni, nessuna pioggia', pioggiaCaduta(giugno, oggi, 0) === 0);
check('caduta: giorni passati e futuri fuori finestra non contano', pioggiaCaduta([voce('2026-06-08', 100), voce('2026-06-16', 100)], oggi) === 0);
check('caduta: elenco vuoto', pioggiaCaduta([], oggi) === 0);
check('caduta: elenco nullo o non elenco', pioggiaCaduta(null, oggi) === 0 && pioggiaCaduta(undefined, oggi) === 0 && pioggiaCaduta('boh', oggi) === 0);
check('caduta: pioggia stringa, mancante o NaN vale 0', pioggiaCaduta([voce(oggi, '10'), { data: oggi }, { data: oggi, pioggia: null }, { data: oggi, pioggia: NaN }], oggi) === 0);
check('caduta: pioggia negativa (numerica) conta così com è', vicino(pioggiaCaduta([voce('2026-06-14', 5), voce(oggi, -2)], oggi, 2), 3));
check('caduta: arrotonda a 1 decimale', pioggiaCaduta([voce('2026-06-14', 0.04), voce(oggi, 0.04), voce('2026-06-13', 0.04)], oggi) === 0.1 && pioggiaCaduta([voce(oggi, 0.05)], oggi) === 0.1);
check('caduta: cambio di mese (febbraio -> marzo)', vicino(pioggiaCaduta([voce('2026-02-25', 100), voce('2026-02-26', 1), voce('2026-02-27', 2), voce('2026-02-28', 3), voce('2026-03-01', 4), voce('2026-03-02', 5)], '2026-03-02', 5), 15));
check('caduta: cambio di anno (dicembre -> gennaio)', vicino(pioggiaCaduta([voce('2026-12-28', 100), voce('2026-12-29', 1), voce('2026-12-30', 2), voce('2026-12-31', 3), voce('2027-01-01', 4), voce('2027-01-02', 5)], '2027-01-02', 5), 15));
check('caduta: anno bisestile, c è il 29 febbraio', vicino(pioggiaCaduta([voce('2028-02-27', 100), voce('2028-02-28', 1), voce('2028-02-29', 2), voce('2028-03-01', 3)], '2028-03-01', 3), 6));
check('caduta: oggi non valido, zero senza errori', pioggiaCaduta(giugno, '2026-02-30') === 0 && pioggiaCaduta(giugno, null) === 0);

// ---------- pioggiaPrevista ----------
const previsioni = [
  voce('2026-06-14', 50), // ieri: non conta
  voce('2026-06-15', 40), // oggi: non conta
  voce('2026-06-16', 1),
  voce('2026-06-17', 2),
  voce('2026-06-18', 3),
  voce('2026-06-19', 4),
];
check('prevista: 3 giorni da domani', vicino(pioggiaPrevista(previsioni, oggi), 6), pioggiaPrevista(previsioni, oggi));
check('prevista: 1 giorno, solo domani', vicino(pioggiaPrevista(previsioni, oggi, 1), 1));
check('prevista: 0 giorni', pioggiaPrevista(previsioni, oggi, 0) === 0);
check('prevista: oggi e ieri non contano', pioggiaPrevista([voce('2026-06-14', 50), voce('2026-06-15', 40)], oggi) === 0);
check('prevista: elenco vuoto, nullo o non elenco', pioggiaPrevista([], oggi) === 0 && pioggiaPrevista(null, oggi) === 0 && pioggiaPrevista(undefined, oggi) === 0);
check('prevista: pioggia stringa o NaN vale 0', pioggiaPrevista([voce('2026-06-16', '10'), { data: '2026-06-17', pioggia: NaN }, { data: '2026-06-18' }], oggi) === 0);
check('prevista: arrotonda a 1 decimale', pioggiaPrevista([voce('2026-06-16', 0.04), voce('2026-06-17', 0.04), voce('2026-06-18', 0.04)], oggi) === 0.1);
check('prevista: cambio di anno', vicino(pioggiaPrevista([voce('2026-12-31', 50), voce('2027-01-01', 2), voce('2027-01-02', 3), voce('2027-01-03', 4), voce('2027-01-04', 100)], '2026-12-31', 3), 9));
check('prevista: oggi non valido, zero senza errori', pioggiaPrevista(previsioni, 'boh') === 0);

// ---------- fabbisognoSettimanale ----------
const attesi = [8, 8, 12, 18, 28, 38, 38, 38, 28, 18, 12, 8];
const tuttiMesi = attesi.every((mm, i) => fabbisognoSettimanale(i + 1) === mm);
check('fabbisogno: tutti i mesi da gennaio a dicembre', tuttiMesi, attesi.map((_, i) => `${i + 1}:${fabbisognoSettimanale(i + 1)}`).join(' '));
check('fabbisogno: mesi non validi valgono 20', [0, 13, -1, 2.5, null, undefined, 'boh'].every((m) => fabbisognoSettimanale(m) === 20));

// ---------- consigliAcqua ----------
check('consigli: elenco non valido restituisce null', [null, undefined, 'boh', 42, {}].every((g) => consigliAcqua(g, oggi) === null));
check('consigli: oggi non valido restituisce null', consigliAcqua([], '2026-02-30') === null && consigliAcqua([], null) === null);

const vuotoGiu = consigliAcqua([], oggi);
check('consigli: giugno senza pioggia, terreno secco', vuotoGiu.mm7 === 0 && vuotoGiu.previsti === 0 && vuotoGiu.fabbisogno === 38 && vuotoGiu.livello === 'secca' && vuotoGiu.annaffia === 'si' && vuotoGiu.chiave === 'acqua.si.secca', JSON.stringify(vuotoGiu));
check('consigli: restituisce solo i campi previsti', Object.keys(vuotoGiu).sort().join(',') === 'annaffia,chiave,fabbisogno,livello,mm7,previsti');

const abbondante = consigliAcqua([voce(oggi, 38)], oggi);
check('consigli: 38 mm a giugno sono abbondanti, non annaffiare', abbondante.livello === 'abbondante' && abbondante.annaffia === 'no' && abbondante.chiave === 'acqua.no.abbondante');
check('consigli: 37.9 mm sono sufficienti, non abbondanti', consigliAcqua([voce(oggi, 37.9)], oggi).livello === 'sufficiente');
check('consigli: confine 60% incluso (22.8 mm)', consigliAcqua([voce(oggi, 22.8)], oggi).livello === 'sufficiente');
check('consigli: sotto il 60% (22.7 mm) è poca', consigliAcqua([voce(oggi, 22.7)], oggi).livello === 'poca');
check('consigli: confine 25% incluso (9.5 mm) è poca', consigliAcqua([voce(oggi, 9.5)], oggi).livello === 'poca');
check('consigli: sotto il 25% (9.4 mm) è secca', consigliAcqua([voce(oggi, 9.4)], oggi).livello === 'secca');
check('consigli: sufficiente non fa mai annaffiare', consigliAcqua([voce(oggi, 22.8)], oggi).annaffia === 'forse');
check('consigli: poca con 2.9 mm previsti e 25 gradi, annaffiare', consigliAcqua([voce(oggi, 9.5), voce('2026-06-16', 2.9)], oggi).annaffia === 'si');
check('consigli: massima di oggi a 22 gradi basta per annaffiare', consigliAcqua([voce(oggi, 9.5, 22)], oggi).annaffia === 'si');
check('consigli: massima di oggi a 21.9 gradi, solo forse', consigliAcqua([voce(oggi, 9.5, 21.9)], oggi).annaffia === 'forse');
check('consigli: senza massima di oggi non serve il caldo', consigliAcqua([voce('2026-06-16', 0, 30)], oggi).annaffia === 'si');
check('consigli: massima non numerica vale come assente', consigliAcqua([voce(oggi, 9.4, '30')], oggi).annaffia === 'si');
check('consigli: 3 mm previsti sono troppi per annaffiare', consigliAcqua([voce(oggi, 9.5), voce('2026-06-16', 3)], oggi).annaffia === 'forse');
check('consigli: 5.9 mm previsti, solo forse', consigliAcqua([voce(oggi, 9.5), voce('2026-06-16', 5.9)], oggi).annaffia === 'forse');
check('consigli: 6 mm previsti, non annaffiare', consigliAcqua([voce(oggi, 9.5), voce('2026-06-16', 6)], oggi).annaffia === 'no');
check('consigli: 5.95 mm arrotondati a 6, non annaffiare', consigliAcqua([voce(oggi, 9.5), voce('2026-06-16', 5.95)], oggi).annaffia === 'no');
check('consigli: abbondante resta no anche con 0 mm previsti', consigliAcqua([voce(oggi, 38)], oggi).annaffia === 'no');

const genVuoto = consigliAcqua([], '2026-01-10');
check('consigli: a gennaio bastano 8 mm', genVuoto.fabbisogno === 8 && genVuoto.livello === 'secca' && genVuoto.annaffia === 'si');
check('consigli: gennaio, 8 mm sono abbondanti', consigliAcqua([voce('2026-01-10', 8)], '2026-01-10').livello === 'abbondante');
check('consigli: gennaio, 4.8 mm sono sufficienti', consigliAcqua([voce('2026-01-10', 4.8)], '2026-01-10').livello === 'sufficiente');
check('consigli: gennaio, 4.7 mm sono poca', consigliAcqua([voce('2026-01-10', 4.7)], '2026-01-10').livello === 'poca');
check('consigli: gennaio, 2 mm sono poca', consigliAcqua([voce('2026-01-10', 2)], '2026-01-10').livello === 'poca');
check('consigli: gennaio, 1.9 mm sono secca', consigliAcqua([voce('2026-01-10', 1.9)], '2026-01-10').livello === 'secca');

const capodanno = consigliAcqua([voce('2026-12-31', 3.2), voce('2027-01-01', 4.8), voce('2027-01-02', 6)], '2027-01-01');
check('consigli: cambio di anno, 8 mm in 7 giorni e 6 previsti', capodanno.mm7 === 8 && capodanno.previsti === 6 && capodanno.fabbisogno === 8 && capodanno.livello === 'abbondante' && capodanno.annaffia === 'no', JSON.stringify(capodanno));

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
