// Raccolto: totali, per coltura, per mese e testo delle quantità (Node, nessun server). Uso: node tests/fase5-raccolto.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { totaleRaccolto, perColtura, perMese, testoQuantita } = await import(pathToFileURL(path.join(radice, 'js/motore/raccolto.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

// Elenco misto: raccolti buoni, altri tipi e casi rovinati.
const raccolti = [
  { tipo: 'raccolto', data: '2026-01-10', quantita: 1, unita: 'kg', nomeColtura: 'Pomodori' },
  { tipo: 'raccolto', data: '2026-06-01', quantita: 500, unita: 'g', nomeColtura: ' pomodori ' },
  { tipo: 'raccolto', data: '2026-06-20', quantita: 1, unita: 'kg', nomeColtura: 'Pomodori' },
  { tipo: 'raccolto', data: '2026-07-01', quantita: 12, unita: 'pezzi', nomeColtura: 'Zucchine' },
  { tipo: 'raccolto', data: '2026-07-02', quantita: 1, unita: 'pezzi', nomeColtura: null },
  { tipo: 'semina', data: '2026-07-03', quantita: 2, unita: 'kg', nomeColtura: 'Pomodori' },
  null,
  { tipo: 'raccolto', quantita: 0, unita: 'kg' },
  { tipo: 'raccolto', quantita: -3, unita: 'kg' },
  { tipo: 'raccolto', quantita: '3', unita: 'kg' },
  { tipo: 'raccolto', quantita: NaN, unita: 'kg' },
  { tipo: 'raccolto', quantita: 1, unita: 'litri' },
];

const t = totaleRaccolto(raccolti);
check('totale: kg con i grammi convertiti', t.kg === 2.5, String(t.kg));
check('totale: pezzi', t.pezzi === 13, String(t.pezzi));
check('totale: contano solo gli eventi validi', t.voci === 5, String(t.voci));
check('totale: elenco vuoto', (() => { const v = totaleRaccolto([]); return v.kg === 0 && v.pezzi === 0 && v.voci === 0; })());
check('totale: elenco null o pieno di roba rovinata', totaleRaccolto(null).voci === 0 && totaleRaccolto([null, undefined, 7]).voci === 0);
check('totale: arrotonda a tre decimali', totaleRaccolto([{ tipo: 'raccolto', quantita: 0.1, unita: 'kg' }, { tipo: 'raccolto', quantita: 0.2, unita: 'kg' }]).kg === 0.3);
check('totale: grammi sparsi fanno un chilo tondo', totaleRaccolto([{ tipo: 'raccolto', quantita: 333, unita: 'g' }, { tipo: 'raccolto', quantita: 333, unita: 'g' }, { tipo: 'raccolto', quantita: 334, unita: 'g' }]).kg === 1);

const c = perColtura(raccolti);
check('per coltura: raggruppa maiuscole e spazi ai lati', c.length === 3 && c[0].nome === 'Pomodori' && c[0].kg === 2.5 && c[0].voci === 3, JSON.stringify(c));
check('per coltura: ordina per kg poi pezzi', c[1].nome === 'Zucchine' && c[1].pezzi === 12 && c[2].nome === 'Senza nome' && c[2].pezzi === 1, JSON.stringify(c.map((x) => x.nome)));
check('per coltura: i pezzi restano separati dai kg', c[0].pezzi === 0 && c[1].kg === 0);
check('per coltura: elenco vuoto o null', perColtura([]).length === 0 && perColtura(null).length === 0);
check('per coltura: quantità rovinate ignorate', perColtura([
  { tipo: 'raccolto', quantita: 0, unita: 'kg', nomeColtura: 'X' },
  { tipo: 'raccolto', quantita: '2', unita: 'kg', nomeColtura: 'X' },
  { tipo: 'raccolto', quantita: 2, unita: 'litri', nomeColtura: 'X' },
]).length === 0);
const pari = perColtura([
  { tipo: 'raccolto', quantita: 1, unita: 'pezzi', nomeColtura: 'Zucchine' },
  { tipo: 'raccolto', quantita: 1, unita: 'pezzi', nomeColtura: 'aglio' },
]).map((x) => x.nome);
check('per coltura: a parità, ordine alfabetico', pari[0] === 'aglio' && pari[1] === 'Zucchine', JSON.stringify(pari));

const eventiMese = [
  { tipo: 'raccolto', data: '2026-01-05', quantita: 2, unita: 'kg', nomeColtura: 'A' },
  { tipo: 'raccolto', data: '2026-01-20', quantita: 500, unita: 'g', nomeColtura: 'A' },
  { tipo: 'raccolto', data: '2026-06-01', quantita: 1.5, unita: 'kg', nomeColtura: 'B' },
  { tipo: 'raccolto', data: '2026-06-02', quantita: 10, unita: 'pezzi', nomeColtura: 'C' },
  { tipo: 'raccolto', data: '2025-06-01', quantita: 9, unita: 'kg', nomeColtura: 'D' },
  { tipo: 'raccolto', data: '2026-02-30', quantita: 4, unita: 'kg', nomeColtura: 'E' },
  { tipo: 'raccolto', data: 'boh', quantita: 4, unita: 'kg', nomeColtura: 'F' },
  { tipo: 'raccolto', data: '2026-12-31', quantita: 300, unita: 'g', nomeColtura: 'G' },
];
const m26 = perMese(eventiMese, 2026);
const somma26 = m26.reduce((s, x) => s + x, 0);
check('per mese: dodici mesi', Array.isArray(m26) && m26.length === 12);
check('per mese: gennaio somma kg e grammi', m26[0] === 2.5, String(m26[0]));
check('per mese: giugno solo kg, i pezzi non contano', m26[5] === 1.5, String(m26[5]));
check('per mese: dicembre', m26[11] === 0.3, String(m26[11]));
check('per mese: data impossibile e altro anno fuori', m26[1] === 0 && Math.abs(somma26 - 4.3) < 1e-9, JSON.stringify(m26));
check('per mese: un altro anno', perMese(eventiMese, 2025)[5] === 9 && perMese(eventiMese, 2025)[0] === 0);
check('per mese: anno come testo', perMese(eventiMese, '2026')[0] === 2.5);
check('per mese: elenco null e anno strano', perMese(null, 2026).every((x) => x === 0) && perMese(eventiMese, undefined).every((x) => x === 0));

check('testo: 1,5 kg con la virgola', testoQuantita(1.5, 'kg') === '1,5 kg', testoQuantita(1.5, 'kg'));
check('testo: niente zeri inutili', testoQuantita(2, 'kg') === '2 kg', testoQuantita(2, 'kg'));
check('testo: sotto il chilo mostra i grammi', testoQuantita(0.25, 'kg') === '250 g', testoQuantita(0.25, 'kg'));
check('testo: grammi sotto il chilo', testoQuantita(500, 'g') === '500 g', testoQuantita(500, 'g'));
check('testo: grammi sopra il chilo tornano kg', testoQuantita(1500, 'g') === '1,5 kg', testoQuantita(1500, 'g'));
check('testo: pezzi al plurale', testoQuantita(12, 'pezzi') === '12 pezzi', testoQuantita(12, 'pezzi'));
check('testo: un pezzo al singolare', testoQuantita(1, 'pezzi') === '1 pezzo', testoQuantita(1, 'pezzi'));
check('testo: quantità non valide', ['', '', '', ''].join('|') === [testoQuantita(0, 'kg'), testoQuantita(-1, 'kg'), testoQuantita('2', 'kg'), testoQuantita(NaN, 'kg')].join('|'));
check('testo: unità sconosciuta', testoQuantita(2, 'litri') === '', testoQuantita(2, 'litri'));

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
