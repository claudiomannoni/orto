// Fasi di vita della coltura (Node, nessun server). Uso: node tests/fase5-fasi.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { etaInGiorni, etaDellaPianta, faseAttuale, confrontaFase } = await import(pathToFileURL(path.join(radice, 'js/motore/fasi.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

// etaInGiorni: stessa data
check('etaInGiorni(oggi == inizio): 0', etaInGiorni('2026-11-01', '2026-11-01') === 0, String(etaInGiorni('2026-11-01', '2026-11-01')));

// Passaggio di mese e anno
check('passaggio di mese: 31/10 -> 1/11 = 1', etaInGiorni('2026-10-31', '2026-11-01') === 1);
check('passaggio di anno: 31/12 -> 1/1 = 1', etaInGiorni('2025-12-31', '2026-01-01') === 1);
check('un anno: 2025-01-01 -> 2026-01-01 = 365', etaInGiorni('2025-01-01', '2026-01-01') === 365);
check('gennaio -> marzo: 59 giorni (no bisestile)', etaInGiorni('2026-01-01', '2026-03-01') === 59);

// Bisestile
check('bisestile: 28/2/2024 -> 1/3/2024 = 2', etaInGiorni('2024-02-28', '2024-03-01') === 2);
check('bisestile: 29/2/2024 -> 1/3/2024 = 1', etaInGiorni('2024-02-29', '2024-03-01') === 1);
check('no bisestile: 28/2/2023 -> 1/3/2023 = 1', etaInGiorni('2023-02-28', '2023-03-01') === 1);
check('29/2/2024 è una data valida', etaInGiorni('2024-02-29', '2024-03-10') === 10);

// Intervalli lungo
check('10 anni da marzo a marzo = 3652', etaInGiorni('2000-03-01', '2010-03-01') === 3652);
check('26 anni da marzo a marzo = 9496', etaInGiorni('2000-03-01', '2026-03-01') === 9496);

// Ora legale: non cambia i giorni di calendario
check('ora legale: 28/3 -> 30/3/2026 = 2', etaInGiorni('2026-03-28', '2026-03-30') === 2);
check('ora legale, ed estiva: 15/6 -> 31/10/2026 = 138', etaInGiorni('2026-06-15', '2026-10-31') === 138);

// Data futura e date strane
check('data futura: 0', etaInGiorni('2026-11-05', '2026-11-01') === 0);
check('oggi invalido: 0', etaInGiorni('2026-11-01', 'pasta') === 0);
check('data null: 0', etaInGiorni(null, '2026-11-01') === 0);
check('data vuota: 0', etaInGiorni('', '2026-11-01') === 0);
check('mese 13: 0', etaInGiorni('2026-13-01', '2026-11-01') === 0);
check('30 febbraio: 0', etaInGiorni('2026-02-30', '2026-11-01') === 0);
check('29/2/2026 (no bisestile): 0', etaInGiorni('2026-02-29', '2026-11-01') === 0);
check('formato senza trattini: 0', etaInGiorni('20261101', '2026-11-01') === 0);
check('formato ambiguity: 0', etaInGiorni('01-11-2026', '2026-11-01') === 0);
check('numero invece di stringa: 0', etaInGiorni(20261101, '2026-11-01') === 0);

// etaDellaPianta: da seme
check("seme: 31 giorni dalla semina", etaDellaPianta({ partenza: 'seme', data: '2026-10-01' }, '2026-11-01') === 31);
check('partenza mancante = seme', etaDellaPianta({ data: '2026-10-01' }, '2026-11-01') === 31);
check("partenza strana = seme", etaDellaPianta({ partenza: 'Trapianto', data: '2026-10-01' }, '2026-11-01') === 31);
check("partenza 'piantina' con maiuscolo = seme", etaDellaPianta({ partenza: 'PIANTINA', data: '2026-10-01' }, '2026-11-01') === 31);

// etaDellaPianta: da piantina
check('piantina: 12 + 14 = 26', etaDellaPianta({ partenza: 'piantina', data: '2026-10-20', piantinaEta: 14 }, '2026-11-01') === 26);
check('piantina senza piantinaEta: 12 + 0 = 12', etaDellaPianta({ partenza: 'piantina', data: '2026-10-20' }, '2026-11-01') === 12);
check('piantinaEta undefined: 0', etaDellaPianta({ partenza: 'piantina', data: '2026-10-20', piantinaEta: undefined }, '2026-11-01') === 12);
check('piantinaEta null: 0', etaDellaPianta({ partenza: 'piantina', data: '2026-10-20', piantinaEta: null }, '2026-11-01') === 12);
check("piantinaEta stringa '14': 0", etaDellaPianta({ partenza: 'piantina', data: '2026-10-20', piantinaEta: '14' }, '2026-11-01') === 12);
check('piantinaEta NaN: 0', etaDellaPianta({ partenza: 'piantina', data: '2026-10-20', piantinaEta: NaN }, '2026-11-01') === 12);
check('piantinaEta negativa: 0', etaDellaPianta({ partenza: 'piantina', data: '2026-10-20', piantinaEta: -3 }, '2026-11-01') === 12);
check('piantinaEta decimale 14.5: 0', etaDellaPianta({ partenza: 'piantina', data: '2026-10-20', piantinaEta: 14.5 }, '2026-11-01') === 12);
check('piantinaEta 0: valido', etaDellaPianta({ partenza: 'piantina', data: '2026-10-20', piantinaEta: 0 }, '2026-11-01') === 12);

// etaDellaPianta: date strane
check('seme con data futura: 0', etaDellaPianta({ partenza: 'seme', data: '2026-12-01' }, '2026-11-01') === 0);
check('piantina con data futura: solo piantinaEta', etaDellaPianta({ partenza: 'piantina', data: '2026-12-01', piantinaEta: 14 }, '2026-11-01') === 14);
check('piantina con data invalida: solo piantinaEta', etaDellaPianta({ partenza: 'piantina', data: 'pasta', piantinaEta: 14 }, '2026-11-01') === 14);
check('argomento pianta mancante: 0', etaDellaPianta(undefined, '2026-11-01') === 0);

// faseAttuale: elenco di esempio
const fasi = [
  { id: 'germinazione', nome: 'Germinazione', da_giorno: 0, a_giorno: 4 },
  { id: 'vegetativa', nome: 'Vegetativa', da_giorno: 5, a_giorno: 19 },
  { id: 'fioritura', nome: 'Fioritura', da_giorno: 20, a_giorno: 34 },
  { id: 'raccolto', nome: 'Raccolto', da_giorno: 35, a_giorno: null },
];

// Dentro ogni fase
check('faseAttuale(2): germinazione', faseAttuale(fasi, 2).fase.id === 'germinazione');
check('faseAttuale(10): vegetativa', faseAttuale(fasi, 10).fase.id === 'vegetativa');
check('faseAttuale(25): fioritura', faseAttuale(fasi, 25).fase.id === 'fioritura');
check('faseAttuale(50): raccolto (a_giorno null)', faseAttuale(fasi, 50).fase.id === 'raccolto');

// Esattamente su da_giorno e su a_giorno
check('faseAttuale(0): su da_giorno = germinazione', faseAttuale(fasi, 0).fase.id === 'germinazione');
check('faseAttuale(4): su a_giorno = ancora germinazione', faseAttuale(fasi, 4).fase.id === 'germinazione');
check('faseAttuale(5): il giorno dopo a_giorno = vegetativa', faseAttuale(fasi, 5).fase.id === 'vegetativa');
check('faseAttuale(19): su a_giorno = ancora vegetativa', faseAttuale(fasi, 19).fase.id === 'vegetativa');
check('faseAttuale(35): su da_giorno raccolto', faseAttuale(fasi, 35).fase.id === 'raccolto');

// Posizione e giorni nella fase
check('faseAttuale(2): indice 0', faseAttuale(fasi, 2).indice === 0);
check('faseAttuale(2): giorniNellaFase 2', faseAttuale(fasi, 2).giorniNellaFase === 2);
check('faseAttuale(2): giorniAllaProssima 3', faseAttuale(fasi, 2).giorniAllaProssima === 3);
check('faseAttuale(0): giorniNellaFase 0', faseAttuale(fasi, 0).giorniNellaFase === 0);
check('faseAttuale(0): giorniAllaProssima 5', faseAttuale(fasi, 0).giorniAllaProssima === 5);
check('faseAttuale(4): giorniAllaProssima 1', faseAttuale(fasi, 4).giorniAllaProssima === 1);
check('faseAttuale(10): indice 1', faseAttuale(fasi, 10).indice === 1);
check('faseAttuale(10): giorniNellaFase 5', faseAttuale(fasi, 10).giorniNellaFase === 5);
check('faseAttuale(19): giorniAllaProssima 1', faseAttuale(fasi, 19).giorniAllaProssima === 1);
check('faseAttuale(25): giorniAllaProssima 10', faseAttuale(fasi, 25).giorniAllaProssima === 10);

// Oltre l'ultima fase chiusa / prima della prima
check('faseAttuale(36): oltre ultima chiusa = raccolto', faseAttuale(fasi, 36).fase.id === 'raccolto');
check('faseAttuale(36): indice 3', faseAttuale(fasi, 36).indice === 3);
check('faseAttuale(36): giorniNellaFase 1', faseAttuale(fasi, 36).giorniNellaFase === 1);
check('faseAttuale(36): giorniAllaProssima null', faseAttuale(fasi, 36).giorniAllaProssima === null);
check('faseAttuale(999): sempre raccolto', faseAttuale(fasi, 999).fase.id === 'raccolto');
check('faseAttuale(-3): prima della prima = germinazione', faseAttuale(fasi, -3).fase.id === 'germinazione');
check('faseAttuale(-3): giorniNellaFase -3', faseAttuale(fasi, -3).giorniNellaFase === -3);
check('faseAttuale(-3): giorniAllaProssima 8', faseAttuale(fasi, -3).giorniAllaProssima === 8);

// Ultima fase aperta lontano nel tempo
check('faseAttuale(200): raccolto per sempre', faseAttuale(fasi, 200).giorniAllaProssima === null);
const fasiSenzaChiusura = [
  { id: 'germinazione', da_giorno: 0, a_giorno: 4 },
  { id: 'vegetativa', da_giorno: 5, a_giorno: null },
];
check('ultima aperta: eta 100 -> vegetativa', faseAttuale(fasiSenzaChiusura, 100).fase.id === 'vegetativa');
check('ultima aperta: giorniAllaProssima null', faseAttuale(fasiSenzaChiusura, 100).giorniAllaProssima === null);
check('ultima aperta: eta 4 -> germinazione', faseAttuale(fasiSenzaChiusura, 4).fase.id === 'germinazione');

// Un solo elemento
const una = [{ id: 'sola', da_giorno: 0, a_giorno: null }];
check('una sola fase: eta 0 = sola', faseAttuale(una, 0).fase.id === 'sola');
check('una sola fase: indice 0', faseAttuale(una, 100).indice === 0);
check('una sola fase: giorniAllaProssima null', faseAttuale(una, 100).giorniAllaProssima === null);
check('una sola fase: giorniNellaFase 100', faseAttuale(una, 100).giorniNellaFase === 100);
check('una sola fase chiusa, eta oltre a_giorno', faseAttuale([{ id: 'sola', da_giorno: 0, a_giorno: 9 }], 20).fase.id === 'sola');

// Elenco non valido o vuoto
check('faseAttuale([]): null', faseAttuale([], 1) === null);
check('faseAttuale(null): null', faseAttuale(null, 1) === null);
check('faseAttuale(undefined): null', faseAttuale(undefined, 1) === null);
check("faseAttuale('non array'): null", faseAttuale('non array', 1) === null);
check('faseAttuale(elementi non validi): null', faseAttuale([{ nome: 'x' }, { id: '', da_giorno: 0 }], 1) === null);
check('faseAttuale(da_giorno non numero): ignora e resta null', faseAttuale([{ id: 'a', da_giorno: '0' }], 1) === null);
check('faseAttuale: elemento valido regge tra invalidi (da_giorno 1)', faseAttuale([{ nome: 'x' }, { id: 'b', da_giorno: 1, a_giorno: null }], 2).fase.id === 'b');
check('faseAttuale(id numero non valido): null', faseAttuale([{ id: 42, da_giorno: 0 }], 1) === null);

// confrontaFase
const ordine = ['germinazione', 'vegetativa', 'fioritura'];
check("confrontaFase uguali: 'in-linea'", confrontaFase('vegetativa', 'vegetativa', ordine) === 'in-linea');
check("confrontaFase prima e ultima: 'in-linea'", confrontaFase('germinazione', 'germinazione', ordine) === 'in-linea');
check("confrontaFase osservata prima: 'in-ritardo'", confrontaFase('fioritura', 'germinazione', ordine) === 'in-ritardo');
check("confrontaFase osservata vicina prima: 'in-ritardo'", confrontaFase('fioritura', 'vegetativa', ordine) === 'in-ritardo');
check("confrontaFase osservata dopo: 'in-anticipo'", confrontaFase('germinazione', 'fioritura', ordine) === 'in-anticipo');
check("confrontaFase vicina dopo: 'in-anticipo'", confrontaFase('vegetativa', 'fioritura', ordine) === 'in-anticipo');
check("confrontaFase attesa sconosciuta: 'incerto'", confrontaFase('mistero', 'germinazione', ordine) === 'incerto');
check("confrontaFase osservata sconosciuta: 'incerto'", confrontaFase('germinazione', 'mistero', ordine) === 'incerto');
check("confrontaFase entrambe sconosciute: 'incerto'", confrontaFase('uno', 'due', ordine) === 'incerto');
check('confrontaFase attesa non stringa: incerto', confrontaFase(null, 'germinazione', ordine) === 'incerto');
check('confrontaFase ordine null: incerto', confrontaFase('germinazione', 'fioritura', null) === 'incerto');
check('confrontaFase ordine vuoto: incerto', confrontaFase('germinazione', 'fioritura', []) === 'incerto');
check("confrontaFase ordine non array: incerto", confrontaFase('germinazione', 'fioritura', 'germinazione,fioritura') === 'incerto');
check('confrontaFase ordine senza i due id: incerto', confrontaFase('germinazione', 'fioritura', ['altrove']) === 'incerto');

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
