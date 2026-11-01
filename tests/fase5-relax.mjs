// Motore relax (Node, nessun server). Uso: node tests/fase5-relax.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { pulisciRelax, aggiungiSecondi, minutiDelGiorno, minutiTotali, serieRilassata } = await import(pathToFileURL(path.join(radice, 'js/motore/relax.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

// Genera n date «AAAA-MM-GG» consecutive a partire da inizio, andando a ritroso.
const dateDa = (inizio, n) => {
  const elenco = [];
  let corrente = inizio;
  for (let i = 0; i < n; i++) { elenco.push(corrente); corrente = giornoPrimaDi(corrente); }
  return elenco;
};
const giornoPrimaDi = (data) => {
  const [a, m, g] = data.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, g) - 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

// ——— pulisciRelax: input non oggetto ———
check('pulisciRelax([]): array -> oggetto vuoto', JSON.stringify(pulisciRelax([])) === '{}');
check('pulisciRelax(null): oggetto vuoto', JSON.stringify(pulisciRelax(null)) === '{}');
check('pulisciRelax(undefined): oggetto vuoto', JSON.stringify(pulisciRelax(undefined)) === '{}');
check("pulisciRelax('x'): oggetto vuoto", JSON.stringify(pulisciRelax('x')) === '{}');
check('pulisciRelax(42): oggetto vuoto', JSON.stringify(pulisciRelax(42)) === '{}');

// ——— pulisciRelax: chiavi ———
check('pulisciRelax: data valida tenuta', pulisciRelax({ '2026-01-02': 30 })['2026-01-02'] === 30);
check('pulisciRelax: chiave non data scartata', !('pippo' in pulisciRelax({ pippo: 5, '2026-01-02': 30 })));
check("pulisciRelax: '2026-02-30' impossibile scartata", !('2026-02-30' in pulisciRelax({ '2026-02-30': 10 })));
check("pulisciRelax: '2023-02-29' non bisestile scartata", !('2023-02-29' in pulisciRelax({ '2023-02-29': 10 })));
check("pulisciRelax: '2024-02-29' bisestile tenuta", pulisciRelax({ '2024-02-29': 10 })['2024-02-29'] === 10);
check("pulisciRelax: '2000-02-29' bisestile secolare tenuta", pulisciRelax({ '2000-02-29': 10 })['2000-02-29'] === 10);
check("pulisciRelax: '1900-02-29' non bisestile scartata", !('1900-02-29' in pulisciRelax({ '1900-02-29': 10 })));
check("pulisciRelax: '2026-13-01' mese 13 scartata", !('2026-13-01' in pulisciRelax({ '2026-13-01': 10 })));
check("pulisciRelax: '2026-00-10' mese 0 scartata", !('2026-00-10' in pulisciRelax({ '2026-00-10': 10 })));
check("pulisciRelax: '2026-01-00' giorno 0 scartata", !('2026-01-00' in pulisciRelax({ '2026-01-00': 10 })));
check("pulisciRelax: '2026-1-1' formato sbagliato scartata", !('2026-1-1' in pulisciRelax({ '2026-1-1': 10 })));
check("pulisciRelax: '2026/01/01' formato sbagliato scartata", !('2026/01/01' in pulisciRelax({ '2026/01/01': 10 })));
check("pulisciRelax: '01-01-2026' formato sbagliato scartata", !('01-01-2026' in pulisciRelax({ '01-01-2026': 10 })));

// ——— pulisciRelax: valori ———
check('pulisciRelax: valore negativo scartato', !('2026-01-02' in pulisciRelax({ '2026-01-02': -5 })));
check('pulisciRelax: NaN scartato', !('2026-01-02' in pulisciRelax({ '2026-01-02': NaN })));
check('pulisciRelax: Infinity scartato', !('2026-01-02' in pulisciRelax({ '2026-01-02': Infinity })));
check("pulisciRelax: stringa scartata", !('2026-01-02' in pulisciRelax({ '2026-01-02': '10' })));
check('pulisciRelax: 0 tenuto', pulisciRelax({ '2026-01-02': 0 })['2026-01-02'] === 0);
check('pulisciRelax: 90.7 monnegato a 90', pulisciRelax({ '2026-01-02': 90.7 })['2026-01-02'] === 90);
check('pulisciRelax: tetto 86400', pulisciRelax({ '2026-01-02': 100000 })['2026-01-02'] === 86400);
check('pulisciRelax: 86400 esatto invariato', pulisciRelax({ '2026-01-02': 86400 })['2026-01-02'] === 86400);

// ——— pulisciRelax: oltre 400 date ———
const elegte = dateDa('2026-06-01', 405);
const molte = {};
for (const data of elegte) molte[data] = 1;
const puliteMolte = pulisciRelax(molte);
const chiaviMolte = Object.keys(puliteMolte);
check('pulisciRelax: al massimo 400 date', chiaviMolte.length === 400);
check('pulisciRelax: resta la più recente', puliteMolte[elegte[0]] === 1);
check('pulisciRelax: la 400ª più recente resta', puliteMolte[elegte[399]] === 1);
check('pulisciRelax: la 401ª in poi scartata', !('2025-04-27' in puliteMolte) && chiaviMolte.every((c) => c >= elegte[399]));

// ——— aggiungiSecondi ———
check("aggiungiSecondi: giorno nuovo creato", aggiungiSecondi({}, '2026-01-02', 70)['2026-01-02'] === 70);
const originale = { '2026-01-02': 30 };
const copia = aggiungiSecondi(originale, '2026-01-02', 20);
check('aggiungiSecondi: somma sul giorno', copia['2026-01-02'] === 50);
check('aggiungiSecondi: originale immutato', originale['2026-01-02'] === 30 && Object.keys(originale).length === 1);
check('aggiungiSecondi: restituisce oggetto nuovo (non lo stesso)', copia !== originale);
check('aggiungiSecondi: tetto 3600 per chiamata', aggiungiSecondi({}, '2026-01-02', 9999)['2026-01-02'] === 3600);
check('aggiungiSecondi: 3600 esatto accettato', aggiungiSecondi({}, '2026-01-02', 3600)['2026-01-02'] === 3600);
check('aggiungiSecondi: 90.7 monnegato a 90', aggiungiSecondi({}, '2026-01-02', 90.7)['2026-01-02'] === 90);
check('aggiungiSecondi: 0 non cambia nulla', JSON.stringify(aggiungiSecondi(originale, '2026-01-02', 0)) === '{"2026-01-02":30}');
check('aggiungiSecondi: negativo non cambia nulla', JSON.stringify(aggiungiSecondi(originale, '2026-01-02', -5)) === '{"2026-01-02":30}');
check('aggiungiSecondi: NaN non cambia nulla', JSON.stringify(aggiungiSecondi(originale, '2026-01-02', NaN)) === '{"2026-01-02":30}');
check('aggiungiSecondi: Infinity non cambia nulla', JSON.stringify(aggiungiSecondi(originale, '2026-01-02', Infinity)) === '{"2026-01-02":30}');
check("aggiungiSecondi: stringa non cambia nulla", JSON.stringify(aggiungiSecondi(originale, '2026-01-02', '10')) === '{"2026-01-02":30}');
check("aggiungiSecondi: data impossibile non cambia nulla", JSON.stringify(aggiungiSecondi(originale, '2026-02-30', 10)) === '{"2026-01-02":30}');
check("aggiungiSecondi: data malformata non cambia nulla", JSON.stringify(aggiungiSecondi(originale, 'abc', 10)) === '{"2026-01-02":30}');
check('aggiungiSecondi: input strano pulito prima', JSON.stringify(aggiungiSecondi([['2022-01-01', 7]], '2026-01-02', 5)) === '{"2026-01-02":5}');
check('aggiungiSecondi: tetto giornaliero 86400', aggiungiSecondi({ '2026-01-02': 86350 }, '2026-01-02', 100)['2026-01-02'] === 86400);
check('aggiungiSecondi: due chiamate sotto tetto', aggiungiSecondi(aggiungiSecondi({}, '2026-01-02', 3600), '2026-01-02', 3600)['2026-01-02'] === 7200);
check('aggiungiSecondi: chiavi spurie scartate durante la copia', !('pippo' in aggiungiSecondi({ pippo: 99, '2026-01-02': 5 }, '2026-01-02', 5)));

// ——— minutiDelGiorno ———
check('minutiDelGiorno: 59 s -> 0', minutiDelGiorno({ '2026-03-01': 59 }, '2026-03-01') === 0);
check('minutiDelGiorno: 60 s -> 1', minutiDelGiorno({ '2026-03-01': 60 }, '2026-03-01') === 1);
check('minutiDelGiorno: 119 s -> 1', minutiDelGiorno({ '2026-03-01': 119 }, '2026-03-01') === 1);
check('minutiDelGiorno: 120 s -> 2', minutiDelGiorno({ '2026-03-01': 120 }, '2026-03-01') === 2);
check('minutiDelGiorno: giorno mancante -> 0', minutiDelGiorno({ '2026-03-01': 120 }, '2026-03-02') === 0);
check('minutiDelGiorno: data non valida -> 0', minutiDelGiorno({ '2026-03-01': 120 }, 'x') === 0);
check('minutiDelGiorno: input null -> 0', minutiDelGiorno(null, '2026-03-01') === 0);
check('minutiDelGiorno: input array -> 0', minutiDelGiorno([], '2026-03-01') === 0);
check("minutiDelGiorno: input stringa -> 0", minutiDelGiorno('x', '2026-03-01') === 0);
check('minutiDelGiorno: input sporco pulito', minutiDelGiorno({ '2026-03-01': 121.9, brutta: 5 }, '2026-03-01') === 2);

// ——— minutiTotali ———
check('minutiTotali: oggetto vuoto -> 0', minutiTotali({}) === 0);
check('minutiTotali: somma su più giorni, per difetto', minutiTotali({ '2026-03-01': 59, '2026-03-02': 120 }) === 2);
check('minutiTotali: giorno secco 119 s -> 1', minutiTotali({ '2026-03-01': 119 }) === 1);
check('minutiTotali: giorno secco 120 s -> 2', minutiTotali({ '2026-03-01': 120 }) === 2);
check('minutiTotali: tre giorni pieni', minutiTotali({ '2026-03-01': 120, '2026-03-02': 60, '2026-03-03': 30 }) === 3);
check('minutiTotali: input null -> 0', minutiTotali(null) === 0);
check('minutiTotali: input array -> 0', minutiTotali([]) === 0);
check('minutiTotali: chiavi e valori sporchi ignorati', minutiTotali({ brutta: 5, '2026-13-01': 1000, '2026-03-01': 120, '2026-03-02': -7, '2026-03-03': 'x' }) === 2);
check('minutiTotali: overflow tetto giornaliero normalizzato', minutiTotali({ '2026-03-01': 90000 }) === 1440);

// ——— serieRilassata ———
check('serieRilassata: tre giorni a ritroso,altro ieri sotto 60 -> 2',
  serieRilassata({ '2026-03-02': 60, '2026-03-03': 60, '2026-03-01': 59 }, '2026-03-03') === 2);
check('serieRilassata: oggi 60 e ieri 60 e laltroieri 0 -> 2',
  serieRilassata({ '2026-03-03': 60, '2026-03-02': 60 }, '2026-03-03') === 2);
check('serieRilassata: oggi 59, ieri 60, altroieri 60 -> 2 (la serie non si rompe)',
  serieRilassata({ '2026-03-03': 59, '2026-03-02': 60, '2026-03-01': 60 }, '2026-03-03') === 2);
check('serieRilassata: oggi 59 e ieri 0 -> 0',
  serieRilassata({ '2026-03-03': 59, '2026-03-02': 59 }, '2026-03-03') === 0);
check('serieRilassata: buco di un giorno -> 1',
  serieRilassata({ '2026-03-03': 60, '2026-03-01': 60 }, '2026-03-03') === 1);
const lunghe = {};
for (const data of dateDa('2026-05-10', 10)) lunghe[data] = 60;
check('serieRilassata: serie lunga di 10 giorni', serieRilassata(lunghe, '2026-05-10') === 10);
check('serieRilassata: serie lunga ma oggi a 59 resta 9 (di ieri a ritroso)', serieRilassata({ ...lunghe, '2026-05-10': 59 }, '2026-05-10') === 9);
check('serieRilassata: passaggio di mese (28-2 / 1-3)',
  serieRilassata({ '2026-03-01': 60, '2026-02-28': 60 }, '2026-03-01') === 2);
check('serieRilassata: buco al passaggio di mese (28-2 manca) -> 1',
  serieRilassata({ '2026-03-01': 60, '2026-02-27': 60, '2026-02-26': 60 }, '2026-03-01') === 1);
check('serieRilassata: passaggio di anno (31-12 / 1-1)',
  serieRilassata({ '2026-01-01': 60, '2025-12-31': 60 }, '2026-01-01') === 2);
check('serieRilassata: 29 febbraio nei bisestili',
  serieRilassata({ '2024-03-01': 60, '2024-02-29': 60, '2024-02-28': 60 }, '2024-03-01') === 3);
check('serieRilassata: oggi non valida -> 0', serieRilassata(lunghe, 'x') === 0);
check('serieRilassata: oggi mancante -> 0', serieRilassata(lunghe, undefined) === 0);
check('serieRilassata: input null -> 0', serieRilassata(null, '2026-05-10') === 0);
check('serieRilassata: input array -> 0', serieRilassata([], '2026-05-10') === 0);
check('serieRilassata: inizio da oggi se ha 60 secondi esatti',
  serieRilassata({ '2026-03-03': 60 }, '2026-03-03') === 1);
check('serieRilassata: oggi sporco ma pulibile conta',
  serieRilassata({ '2026-03-03': 65.5 }, '2026-03-03') === 1);

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
