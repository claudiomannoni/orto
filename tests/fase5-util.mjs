// Funzioni pure di js/util.js: date, normalizzazione, formattazione (Node, nessun server).
// Uso: node tests/fase5-util.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');

// giorniDa passa da oggiISO(), che legge location.search: in Node non esiste.
// Simuliamo la pagina con una data fissa, così i test non dipendono dal giorno in cui si lanciano.
let oggiForzato = '2026-06-10';
globalThis.location = { get search() { return '?oggi=' + oggiForzato; } };

const { aggiungiGiorni, giorniDa, isoLocale, dataValida, normalizza, meseDi, formattaData, daISO } =
  await import(pathToFileURL(path.join(radice, 'js/util.js')).href);

let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

// ---------- aggiungiGiorni ----------
check('aggiungiGiorni: +1 giorno semplice', aggiungiGiorni('2026-06-01', 1) === '2026-06-02', aggiungiGiorni('2026-06-01', 1));
check('aggiungiGiorni: +0 non cambia la data', aggiungiGiorni('2026-06-01', 0) === '2026-06-01', aggiungiGiorni('2026-06-01', 0));
check('aggiungiGiorni: a cavallo di mese (31 gennaio -> 1 febbraio)', aggiungiGiorni('2026-01-31', 1) === '2026-02-01', aggiungiGiorni('2026-01-31', 1));
check('aggiungiGiorni: a cavallo di mese corto (28 febbraio 2026 -> 1 marzo)', aggiungiGiorni('2026-02-28', 1) === '2026-03-01', aggiungiGiorni('2026-02-28', 1));
check('aggiungiGiorni: a cavallo di anno (31 dicembre 2025 -> 1 gennaio 2026)', aggiungiGiorni('2025-12-31', 1) === '2026-01-01', aggiungiGiorni('2025-12-31', 1));
check('aggiungiGiorni: 29 febbraio 2028 (+1 da 28 febbraio)', aggiungiGiorni('2028-02-28', 1) === '2028-02-29', aggiungiGiorni('2028-02-28', 1));
check('aggiungiGiorni: da 29 febbraio 2028 a 1 marzo (+2 da 28 febbraio)', aggiungiGiorni('2028-02-28', 2) === '2028-03-01', aggiungiGiorni('2028-02-28', 2));
check('aggiungiGiorni: giorni negativi dentro il mese', aggiungiGiorni('2026-06-10', -3) === '2026-06-07', aggiungiGiorni('2026-06-10', -3));
check('aggiungiGiorni: -1 a marzo -> 28 febbraio (anno non bisestile)', aggiungiGiorni('2026-03-01', -1) === '2026-02-28', aggiungiGiorni('2026-03-01', -1));
check('aggiungiGiorni: -1 a gennaio -> 31 dicembre dell anno prima', aggiungiGiorni('2026-01-01', -1) === '2025-12-31', aggiungiGiorni('2026-01-01', -1));
check('aggiungiGiorni: -31 da fine marzo -> fine febbraio', aggiungiGiorni('2026-03-31', -31) === '2026-02-28', aggiungiGiorni('2026-03-31', -31));
check('aggiungiGiorni: -1 da 29 febbraio 2028 (bisestile) -> 28 febbraio', aggiungiGiorni('2028-02-29', -1) === '2028-02-28', aggiungiGiorni('2028-02-29', -1));

// ---------- giorniDa ----------
oggiForzato = '2026-06-10';
check('giorniDa: 9 giorni fa', giorniDa('2026-06-01') === 9, String(giorniDa('2026-06-01')));
check('giorniDa: oggi = 0', giorniDa('2026-06-10') === 0, String(giorniDa('2026-06-10')));
check('giorniDa: data futura = negativo', giorniDa('2026-06-15') === -5, String(giorniDa('2026-06-15')));
oggiForzato = '2026-01-01';
check('giorniDa: a cavallo di anno (31 dicembre -> 1 giorno)', giorniDa('2025-12-31') === 1, String(giorniDa('2025-12-31')));
oggiForzato = '2026-03-30';
check('giorniDa: a cavallo del cambio ora legale (28 -> 30 marzo)', giorniDa('2026-03-28') === 2, String(giorniDa('2026-03-28')));
oggiForzato = '2028-03-01';
check('giorniDa: 29 febbraio 2028 = 1 giorno', giorniDa('2028-02-29') === 1, String(giorniDa('2028-02-29')));

// ---------- isoLocale ----------
check('isoLocale: mese e giorno a una cifra prendono lo zero', isoLocale(new Date(2026, 0, 5)) === '2026-01-05', isoLocale(new Date(2026, 0, 5)));
check('isoLocale: fine anno', isoLocale(new Date(2026, 11, 31)) === '2026-12-31', isoLocale(new Date(2026, 11, 31)));
check('isoLocale: 29 febbraio bisestile', isoLocale(new Date(2028, 1, 29)) === '2028-02-29', isoLocale(new Date(2028, 1, 29)));
check('isoLocale: andata e ritorno con daISO', isoLocale(daISO('2026-06-15')) === '2026-06-15', isoLocale(daISO('2026-06-15')));

// ---------- dataValida ----------
check('dataValida: data normale', dataValida('2026-06-01') === true);
check('dataValida: 29 febbraio di un anno bisestile', dataValida('2028-02-29') === true);
check('dataValida: 29 febbraio di un anno non bisestile', dataValida('2026-02-29') === false);
check('dataValida: 30 febbraio non esiste', dataValida('2026-02-30') === false);
check('dataValida: mese 13 non esiste', dataValida('2026-13-01') === false);
check('dataValida: giorno 45 non esiste', dataValida('2026-06-45') === false);
check('dataValida: formato senza zeri (2026-6-1)', dataValida('2026-6-1') === false);
check('dataValida: testo qualsiasi', dataValida('boh') === false);
check('dataValida: null', dataValida(null) === false);
check('dataValida: undefined', dataValida(undefined) === false);
check('dataValida: numero', dataValida(20260601) === false);

// ---------- normalizza ----------
check('normalizza: maiuscole diventano minuscole', normalizza('MAIUSCOLO') === 'maiuscolo', normalizza('MAIUSCOLO'));
check('normalizza: accento sulla vocale', normalizza('Città') === 'citta', normalizza('Città'));
check('normalizza: più accenti', normalizza('Però à è ì ò ù') === 'pero a e i o u', normalizza('Però à è ì ò ù'));
check('normalizza: spazi ai lati tolti', normalizza('  basilico  ') === 'basilico', `"${normalizza('  basilico  ')}"`);
check('normalizza: null diventa stringa vuota', normalizza(null) === '', `"${normalizza(null)}"`);
check('normalizza: undefined diventa stringa vuota', normalizza(undefined) === '', `"${normalizza(undefined)}"`);
check('normalizza: numero diventa testo', normalizza(2026) === '2026', normalizza(2026));

// ---------- meseDi ----------
check('meseDi: giugno', meseDi('2026-06-15') === 6, String(meseDi('2026-06-15')));
check('meseDi: gennaio', meseDi('2026-01-01') === 1, String(meseDi('2026-01-01')));
check('meseDi: dicembre', meseDi('2026-12-31') === 12, String(meseDi('2026-12-31')));
check('meseDi: febbraio bisestile', meseDi('2028-02-29') === 2, String(meseDi('2028-02-29')));

// ---------- formattaData ----------
check('formattaData: 1 giugno 2026', formattaData('2026-06-01') === '1 giugno 2026', formattaData('2026-06-01'));
check('formattaData: 15 dicembre 2025', formattaData('2025-12-15') === '15 dicembre 2025', formattaData('2025-12-15'));
check('formattaData: 29 febbraio 2028', formattaData('2028-02-29') === '29 febbraio 2028', formattaData('2028-02-29'));

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
