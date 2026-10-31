// «Cosa cucino?»: ingredienti dal raccolto, prompt per l'IA e lettura delle ricette (Node, nessun server).
// Uso: node tests/fase5-ricette.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { ingredientiDaRaccolto, costruisciPromptRicette, leggiRicette } = await import(pathToFileURL(path.join(radice, 'js/ai/ricette.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
const codice = (fn) => { try { fn(); return 'nessuno'; } catch (e) { return e.codice; } };

// --- ingredientiDaRaccolto ---
const oggi = '2026-10-31';
const raccolti = [
  { tipo: 'raccolto', data: '2026-10-01', quantita: 1, unita: 'kg', nomeColtura: 'Pomodori' }, // primo giorno incluso
  { tipo: 'raccolto', data: '2026-09-30', quantita: 9, unita: 'kg', nomeColtura: 'Melanzane' }, // un giorno fuori
  { tipo: 'raccolto', data: '2026-11-01', quantita: 9, unita: 'kg', nomeColtura: 'Peperoni' }, // nel futuro
  { tipo: 'raccolto', data: '2026-10-31', quantita: 3, unita: 'pezzi', nomeColtura: 'Zucchine' }, // ultimo giorno, 0,6 kg
  { tipo: 'raccolto', data: '2026-10-20', quantita: 500, unita: 'g', nomeColtura: ' pomodori ' }, // +0,5 kg
  { tipo: 'raccolto', data: '2026-10-15', quantita: 200, unita: 'g', nomeColtura: 'POMODORI' }, // +0,2 kg
  { tipo: 'semina', data: '2026-10-10', quantita: 100, unita: 'kg', nomeColtura: 'Fagioli' },
  { tipo: 'raccolto', data: '2026-10-10', quantita: 0, unita: 'kg', nomeColtura: 'Zero' },
  { tipo: 'raccolto', data: '2026-10-10', quantita: -1, unita: 'kg', nomeColtura: 'Negativo' },
  { tipo: 'raccolto', data: '2026-10-10', quantita: '2', unita: 'kg', nomeColtura: 'Testo' },
  { tipo: 'raccolto', data: '2026-10-10', quantita: NaN, unita: 'kg', nomeColtura: 'Nan' },
  { tipo: 'raccolto', data: '2026-10-10', quantita: 2, unita: 'litri', nomeColtura: 'Litri' },
  { tipo: 'raccolto', data: '2026-02-30', quantita: 2, unita: 'kg', nomeColtura: 'Data impossibile' },
  { tipo: 'raccolto', data: 'boh', quantita: 2, unita: 'kg', nomeColtura: 'Data rovinata' },
  { tipo: 'raccolto', data: '2026-10-10', quantita: 2, unita: 'kg', nomeColtura: '   ' },
  null,
  undefined,
  7,
];
const ing = ingredientiDaRaccolto(raccolti, 30, oggi);
check('raccolto: solo colture buone, prima chi pesa di più', ing.join('|') === 'Pomodori|Zucchine', JSON.stringify(ing));
check('raccolto: primo giorno incluso, quello prima no', ingredientiDaRaccolto([{ tipo: 'raccolto', data: '2026-10-01', quantita: 1, unita: 'kg', nomeColtura: 'Primo' }], 30, oggi).length === 1 && ingredientiDaRaccolto([{ tipo: 'raccolto', data: '2026-09-30', quantita: 1, unita: 'kg', nomeColtura: 'Fuori' }], 30, oggi).length === 0);
check('raccolto: oggi incluso, domani no', ingredientiDaRaccolto([{ tipo: 'raccolto', data: '2026-10-31', quantita: 1, unita: 'kg', nomeColtura: 'Oggi' }], 30, oggi).length === 1 && ingredientiDaRaccolto([{ tipo: 'raccolto', data: '2026-11-01', quantita: 1, unita: 'kg', nomeColtura: 'Domani' }], 30, oggi).length === 0);
check('raccolto: finestra di zero giorni = solo oggi', ingredientiDaRaccolto([{ tipo: 'raccolto', data: '2026-10-31', quantita: 1, unita: 'kg', nomeColtura: 'Oggi' }, { tipo: 'raccolto', data: '2026-10-30', quantita: 1, unita: 'kg', nomeColtura: 'Ieri' }], 0, oggi).join('|') === 'Oggi');
check('raccolto: finestra di un giorno', ingredientiDaRaccolto([{ tipo: 'raccolto', data: '2026-10-30', quantita: 1, unita: 'kg', nomeColtura: 'Ieri' }, { tipo: 'raccolto', data: '2026-10-29', quantita: 1, unita: 'kg', nomeColtura: 'L altro ieri' }], 1, oggi).join('|') === 'Ieri');
check('raccolto: senza giorni usa 30', ingredientiDaRaccolto([{ tipo: 'raccolto', data: '2026-10-01', quantita: 1, unita: 'kg', nomeColtura: 'Primo' }], undefined, oggi).join('|') === 'Primo');
check('raccolto: grammi e chili insieme', ingredientiDaRaccolto([
  { tipo: 'raccolto', data: '2026-10-20', quantita: 1, unita: 'kg', nomeColtura: 'A' },
  { tipo: 'raccolto', data: '2026-10-20', quantita: 500, unita: 'g', nomeColtura: 'A' },
  { tipo: 'raccolto', data: '2026-10-20', quantita: 1400, unita: 'g', nomeColtura: 'B' },
], 30, oggi).join('|') === 'A|B');
check('raccolto: cinque pezzi valgono un chilo', ingredientiDaRaccolto([
  { tipo: 'raccolto', data: '2026-10-20', quantita: 5, unita: 'pezzi', nomeColtura: 'Zucchine' },
  { tipo: 'raccolto', data: '2026-10-20', quantita: 0.9, unita: 'kg', nomeColtura: 'Patate' },
], 30, oggi).join('|') === 'Zucchine|Patate');
check('raccolto: maiuscole diverse sono la stessa coltura', (() => { const n = ingredientiDaRaccolto([
  { tipo: 'raccolto', data: '2026-10-20', quantita: 1, unita: 'kg', nomeColtura: '  Basilico ' },
  { tipo: 'raccolto', data: '2026-10-21', quantita: 1, unita: 'kg', nomeColtura: 'BASILICO' },
], 30, oggi); return n.length === 1 && n[0] === 'Basilico'; })());
check('raccolto: al massimo otto colture', (() => { const tante = Array.from({ length: 10 }, (_, i) => ({ tipo: 'raccolto', data: '2026-10-20', quantita: i + 1, unita: 'kg', nomeColtura: `Coltura ${i + 1}` })); const n = ingredientiDaRaccolto(tante, 30, oggi); return n.length === 8 && n[0] === 'Coltura 10' && n[7] === 'Coltura 3'; })());
check('raccolto: elenco vuoto, null o rovinato', ingredientiDaRaccolto([], 30, oggi).length === 0 && ingredientiDaRaccolto(null, 30, oggi).length === 0 && ingredientiDaRaccolto([null, undefined, 7], 30, oggi).length === 0);
check('raccolto: oggi rovinato non fa errori', ingredientiDaRaccolto([{ tipo: 'raccolto', data: '2026-10-20', quantita: 1, unita: 'kg', nomeColtura: 'A' }], 30, 'boh').length === 0);

// --- costruisciPromptRicette ---
const prompt = costruisciPromptRicette(['Pomodori', 'Zucchine'], { persone: 4, stagione: 'autunno' });
check('prompt: elenca gli ingredienti e le persone', prompt.includes('Pomodori, Zucchine') && prompt.includes('4 persone') && prompt.includes('autunno'));
check('prompt: tre ricette, passaggi e tempo', prompt.includes('3 ricette') && prompt.includes('3 a 5 passaggi') && prompt.includes('tempo in minuti'));
check('prompt: dispensa ammessa', prompt.includes('olio, sale, pasta, riso, uova, farina, aglio, cipolla'));
check('prompt: cautele per fave e funghi', prompt.includes('fave crude') && prompt.includes('funghi'));
check('prompt: niente consigli medici o dieta', prompt.includes('Non dare consigli medici o di dieta'));
check('prompt: risposta solo JSON con il formato', prompt.includes('SOLO con JSON') && prompt.includes('{"ricette"') && prompt.includes('"titolo"') && prompt.includes('"minuti"'));
check('prompt: persone di default due', costruisciPromptRicette(['Pomodori']).includes('2 persone') && costruisciPromptRicette(['Pomodori'], null).includes('2 persone'));
check('prompt: senza ingredienti chiede ricette stagionali', (() => { const p = costruisciPromptRicette([]); return p.includes('stagionali') && p.includes('ortaggi comuni di stagione') && !p.includes('Ingredienti raccolti'); })());
check('prompt: ingredienti null o rovinati non rompono', costruisciPromptRicette(null).includes('stagionali') && costruisciPromptRicette([null, 7, '  ']).includes('stagionali'));

// --- leggiRicette ---
const buone = JSON.stringify({
  ricette: [
    { titolo: 'Pasta e zucchine', ingredienti: ['2 zucchine', '200 g pasta'], passaggi: ['Lava le zucchine.', 'Cuoci la pasta.', 'Salta tutto.'], minuti: 25, avviso: '' },
    { titolo: 'Insalata di pomodori', ingredienti: ['3 pomodori', 'olio'], passaggi: ['Taglia i pomodori.', 'Condisci.'], minuti: 10, avviso: 'Nessuna cautela.' },
  ],
  avviso: 'Ricette semplici.',
});
const r = leggiRicette(buone);
check('lettura: due ricette con i campi', r.ricette.length === 2 && r.ricette[0].titolo === 'Pasta e zucchine' && r.ricette[0].ingredienti.length === 2 && r.ricette[0].passaggi.length === 3 && r.ricette[0].minuti === 25 && r.avviso === 'Ricette semplici.');
check('lettura: avviso della ricetta', r.ricette[1].avviso === 'Nessuna cautela.' && r.ricette[0].avviso === '');
check('lettura: JSON dentro il blocco ```json', (() => { const x = leggiRicette('```json\n' + buone + '\n```'); return x.ricette.length === 2 && x.ricette[0].titolo === 'Pasta e zucchine'; })());
check('lettura: più di tre ricette, ne restano tre', (() => { const tante = { ricette: Array.from({ length: 5 }, (_, i) => ({ titolo: `Ricetta ${i + 1}`, passaggi: ['Fai.'], minuti: 10 })) }; const x = leggiRicette(JSON.stringify(tante)); return x.ricette.length === 3 && x.ricette[2].titolo === 'Ricetta 3'; })());
check('lettura: scarta senza titolo o senza passaggi', (() => { const x = leggiRicette(JSON.stringify({ ricette: [
  { titolo: 'Solo titolo', passaggi: ['Fai.'] },
  { titolo: 'Senza passaggi', passaggi: [] },
  { passaggi: ['Fai.'] },
  { titolo: 'Titolo e ingredienti', ingredienti: ['sale'], passaggi: ['Fai.'], minuti: 30 },
] })); return x.ricette.length === 2 && x.ricette[0].titolo === 'Solo titolo' && x.ricette[0].ingredienti.length === 0 && x.ricette[0].minuti === null && x.ricette[1].titolo === 'Titolo e ingredienti'; })());
check('lettura: campi troppo lunghi tagliati', (() => { const lungo = 'x'.repeat(200); const x = leggiRicette(JSON.stringify({ ricette: [{
  titolo: lungo,
  ingredienti: Array.from({ length: 15 }, () => 'y'.repeat(100)),
  passaggi: Array.from({ length: 10 }, () => 'z'.repeat(250)),
  minuti: 30,
  avviso: lungo,
}], avviso: lungo })); const q = x.ricette[0]; return q.titolo.length === 80 && q.ingredienti.length === 12 && q.ingredienti.every((v) => v.length === 80) && q.passaggi.length === 8 && q.passaggi.every((v) => v.length === 200) && q.avviso.length === 150 && x.avviso.length === 150; })());
const minutiDi = (m) => leggiRicette(JSON.stringify({ ricette: [{ titolo: 'T', passaggi: ['P'], minuti: m }] })).ricette[0].minuti;
check('lettura: minuti validi', minutiDi(30) === 30 && minutiDi(1) === 1 && minutiDi(600) === 600);
check('lettura: minuti fuori misura o non interi', minutiDi(0) === null && minutiDi(700) === null && minutiDi(3.5) === null && minutiDi('boh') === null && minutiDi(null) === null);
check('lettura: minuti come testo numerico', minutiDi('30') === 30);
check('lettura: spazi doppi ripuliti', (() => { const x = leggiRicette(JSON.stringify({ ricette: [{ titolo: '  Pasta   e zucchine  ', ingredienti: ['  olio  '], passaggi: ['  Mescola   bene.  '] }] })); return x.ricette[0].titolo === 'Pasta e zucchine' && x.ricette[0].ingredienti[0] === 'olio' && x.ricette[0].passaggi[0] === 'Mescola bene.'; })());
check('lettura: testo non JSON, errore risposta', codice(() => leggiRicette('Ciao, ecco le ricette')) === 'risposta');
check('lettura: testo vuoto, errore risposta', codice(() => leggiRicette('')) === 'risposta' && codice(() => leggiRicette(undefined)) === 'risposta');
check('lettura: array o numero, errore risposta', codice(() => leggiRicette('[]')) === 'risposta' && codice(() => leggiRicette('7')) === 'risposta');
check('lettura: nessuna ricetta valida, errore risposta', codice(() => leggiRicette('{"ricette":[]}')) === 'risposta' && codice(() => leggiRicette(JSON.stringify({ ricette: [{ titolo: '', passaggi: ['Fai.'] }, { titolo: 'Senza passaggi' }] }))) === 'risposta');

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
