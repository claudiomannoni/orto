// Banca dei semi (Node, nessun server). Uso: node tests/fase5-semi.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { pulisciSeme, ordinaSemi, semiDaSeminare, statoSeme } = await import(pathToFileURL(path.join(radice, 'js/motore/semi.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

// ---------- pulisciSeme ----------
check('pulisciSeme(null): null', pulisciSeme(null) === null);
check('pulisciSeme(undefined): null', pulisciSeme(undefined) === null);
check('pulisciSeme("testo"): null', pulisciSeme('testo') === null);
check('pulisciSeme(42): null', pulisciSeme(42) === null);
check('pulisciSeme([]): null', pulisciSeme([]) === null);
check('pulisciSeme({}): null (id e nome mancanti)', pulisciSeme({}) === null);
check("pulisciSeme({ id: '' }): null", pulisciSeme({ id: '', nome: 'X' }) === null);
check("pulisciSeme({ id: '   ' }): null", pulisciSeme({ id: '   ', nome: 'X' }) === null);
check('pulisciSeme({ id: 12 }): null (id non stringa)', pulisciSeme({ id: 12, nome: 'X' }) === null);
check('pulisciSeme senza nome: null', pulisciSeme({ id: 's1' }) === null);
check("pulisciSeme nome di soli spazi: null", pulisciSeme({ id: 's1', nome: '   \t ' }) === null);
check('pulisciSeme nome non stringa: null', pulisciSeme({ id: 's1', nome: 7 }) === null);

const minimo = pulisciSeme({ id: 's1', nome: 'Pomodoro' });
check('bustina minima: id e nome', minimo.id === 's1' && minimo.nome === 'Pomodoro');
check('bustina minima: schedaId, anno e quantita vuoti', minimo.schedaId === null && minimo.anno === null && minimo.quantita === '');

const sporco = pulisciSeme({ id: '  s2  ', nome: '  Pomodoro   San \n Marzano ', schedaId: '  pomodori ', anno: 2020, quantita: '  mezza   bustina ' });
check('id ripulito dagli spazi', sporco.id === 's2', sporco.id);
check('nome con spazi doppi e bordi tolto', sporco.nome === 'Pomodoro San Marzano', sporco.nome);
check('schedaId ripulito', sporco.schedaId === 'pomodori', sporco.schedaId);
check('anno intero accettato', sporco.anno === 2020, String(sporco.anno));
check('quantita ripulita', sporco.quantita === 'mezza bustina', sporco.quantita);
check('solo i cinque campi della bustina', JSON.stringify(Object.keys(sporco).sort()) === '["anno","id","nome","quantita","schedaId"]', Object.keys(sporco).join(','));

const nomeLungo = pulisciSeme({ id: 's3', nome: 'A'.repeat(80) });
check('nome lungo tagliato a 60', nomeLungo.nome.length === 60, String(nomeLungo.nome.length));
const quantitaLunga = pulisciSeme({ id: 's4', nome: 'X', quantita: 'B'.repeat(55) });
check('quantita lunga tagliata a 40', quantitaLunga.quantita.length === 40, String(quantitaLunga.quantita.length));

check("schedaId '' diventa null", pulisciSeme({ id: 's5', nome: 'X', schedaId: '' }).schedaId === null);
check("schedaId di spazi diventa null", pulisciSeme({ id: 's5', nome: 'X', schedaId: '   ' }).schedaId === null);
check('schedaId non stringa diventa null', pulisciSeme({ id: 's5', nome: 'X', schedaId: 3 }).schedaId === null);

check('anno 1990 accettato', pulisciSeme({ id: 's6', nome: 'X', anno: 1990 }).anno === 1990);
check('anno 2100 accettato', pulisciSeme({ id: 's6', nome: 'X', anno: 2100 }).anno === 2100);
check('anno 1989 -> null', pulisciSeme({ id: 's6', nome: 'X', anno: 1989 }).anno === null);
check('anno 2101 -> null', pulisciSeme({ id: 's6', nome: 'X', anno: 2101 }).anno === null);
check("anno '2020' (stringa) -> null", pulisciSeme({ id: 's6', nome: 'X', anno: '2020' }).anno === null);
check('anno 2020.5 -> null', pulisciSeme({ id: 's6', nome: 'X', anno: 2020.5 }).anno === null);
check('anno NaN -> null', pulisciSeme({ id: 's6', nome: 'X', anno: NaN }).anno === null);
check('anno Infinity -> null', pulisciSeme({ id: 's6', nome: 'X', anno: Infinity }).anno === null);
check('anno true -> null', pulisciSeme({ id: 's6', nome: 'X', anno: true }).anno === null);

check('quantita non stringa -> ""', pulisciSeme({ id: 's7', nome: 'X', quantita: 12 }).quantita === '');
check('quantita null -> ""', pulisciSeme({ id: 's7', nome: 'X', quantita: null }).quantita === '');

// ---------- ordinaSemi ----------
check('ordinaSemi(null): []', Array.isArray(ordinaSemi(null)) && ordinaSemi(null).length === 0);
check('ordinaSemi("x"): []', Array.isArray(ordinaSemi('x')) && ordinaSemi('x').length === 0);
check('ordinaSemi({}): []', Array.isArray(ordinaSemi({})) && ordinaSemi({}).length === 0);

const daOrdinare = [
  { id: 'a', nome: 'Zucchina', anno: 2020 },
  { id: 'b', nome: 'anguria', anno: 2021 },
  { id: 'c', nome: 'Basilico', anno: null },
];
const ordinate = ordinaSemi(daOrdinare, []);
check('ordine alfabetico senza badare alle maiuscole', ordinate.map((s) => s.id).join('') === 'bca', ordinate.map((s) => s.nome).join(' | '));

const conAccenti = ordinaSemi([{ id: '1', nome: 'basilico' }, { id: '2', nome: 'àglio' }, { id: '3', nome: 'carota' }], []);
check('gli accenti restano vicini alla lettera base', conAccenti.map((s) => s.id).join('') === '213', conAccenti.map((s) => s.nome).join(' | '));

const stessoNome = ordinaSemi([
  { id: 'vecchio', nome: 'Pomodoro', anno: 2018 },
  { id: 'recente', nome: 'Pomodoro', anno: 2024 },
  { id: 'senza', nome: 'Pomodoro', anno: null },
  { id: 'mezzo', nome: 'pomodoro', anno: 2020 },
], []);
check('pari nome: prima la più recente, null per ultimo', stessoNome.map((s) => s.id).join(',') === 'recente,mezzo,vecchio,senza', stessoNome.map((s) => s.id).join(','));

const senzaAnni = ordinaSemi([{ id: 'x', nome: 'Lattuga', anno: null }, { id: 'y', nome: 'Lattuga', anno: null }], []);
check('pari nome e anno null: ordine stabile', senzaAnni.map((s) => s.id).join('') === 'xy', senzaAnni.map((s) => s.id).join(''));

const prima = daOrdinare.map((s) => s.id).join(',');
check("ordinaSemi non modifica l'elenco passato", prima === 'a,b,c', prima);
check("ordinaSemi restituisce una copia", ordinate !== daOrdinare);

// ---------- semiDaSeminare ----------
const schede = [
  {
    id: 'pomodori',
    nome: 'Pomodori',
    calendario: {
      orto: [
        { operazione: 'cura', mesi: [3, 4], titolo: 'Cimare i getti' },
        { operazione: 'semina', mesi: [3, 4], titolo: 'Semina in semenzaio' },
        { operazione: 'semina', mesi: [4, 5], titolo: 'Semina diretta' },
      ],
      serra: [{ operazione: 'semina', mesi: [2, 3], titolo: 'Semina in serra' }],
    },
  },
  {
    id: 'basilico',
    nome: 'Basilico',
    calendario: { orto: [{ operazione: 'trapianto', mesi: [4, 5], titolo: 'Trapianto' }] },
  },
  {
    id: 'zucchine',
    nome: 'Zucchine',
    calendario: { orto: [{ operazione: 'semina', mesi: [5], titolo: 'Semina zucche' }] },
  },
  { id: 'lattuga', nome: 'Lattuga' },
  { id: 'ravanelli', nome: 'Ravanelli', calendario: {} },
];

const semi = [
  { id: 's1', schedaId: 'pomodori', nome: 'Pomodoro San Marzano', anno: 2024, quantita: '' },
  { id: 's2', schedaId: 'basilico', nome: 'Basilico', anno: 2023, quantita: '' },
  { id: 's3', schedaId: 'zucchine', nome: 'Zucchina', anno: 2022, quantita: '' },
  { id: 's4', schedaId: null, nome: 'Piantina misteriosa', anno: null, quantita: '' },
  { id: 's5', schedaId: 'inesistente', nome: 'Fuori elenco', anno: null, quantita: '' },
  { id: 's6', schedaId: 'lattuga', nome: 'Lattuga', anno: null, quantita: '' },
  { id: 's7', schedaId: 'ravanelli', nome: 'Ravanello', anno: null, quantita: '' },
  { id: 's8', schedaId: 'pomodori', nome: 'Pomodoro ciliegino', anno: 2021, quantita: '' },
];

const marzo = semiDaSeminare(semi, schede, 'orto', 3);
check('marzo orto: solo i due pomodori', marzo.map((r) => r.seme.id).join(',') === 's1,s8', marzo.map((r) => r.seme.id).join(','));
check('marzo orto: titolo del primo lavoro di semina', marzo[0].titolo === 'Semina in semenzaio', marzo[0].titolo);
check('risultato fatto di { seme, titolo }', marzo[0].seme === semi[0] && Object.keys(marzo[0]).sort().join(',') === 'seme,titolo');

const aprile = semiDaSeminare(semi, schede, 'orto', 4);
check('aprile orto: primo lavoro di semina che corrisponde', aprile.length === 2 && aprile[0].titolo === 'Semina in semenzaio', aprile.map((r) => r.titolo).join(' | '));

const maggio = semiDaSeminare(semi, schede, 'orto', 5);
check('maggio orto: pomodori con la seconda semina e zucchine', maggio.map((r) => `${r.seme.id}:${r.titolo}`).join(',') === 's1:Semina diretta,s3:Semina zucche,s8:Semina diretta', maggio.map((r) => `${r.seme.id}:${r.titolo}`).join(','));

const serra = semiDaSeminare(semi, schede, 'serra', 3);
check('zona serra: solo i pomodori con la semina in serra', serra.length === 2 && serra.every((r) => r.titolo === 'Semina in serra'), serra.map((r) => r.titolo).join(' | '));
check('zona assente: []', semiDaSeminare(semi, schede, 'balcone', 3).length === 0);
check('calendario vuoto: []', semiDaSeminare(semi, schede, 'orto', 6).length === 0);
check('scheda con soli lavori non di semina: mai', semiDaSeminare(semi, schede, 'orto', 4).every((r) => r.seme.id !== 's2'));
check('schedaId null: mai', semiDaSeminare(semi, schede, 'orto', 5).every((r) => r.seme.id !== 's4'));
check('scheda mancante: mai', semiDaSeminare(semi, schede, 'orto', 5).every((r) => r.seme.id !== 's5'));
check('scheda senza calendario: mai', semiDaSeminare(semi, schede, 'orto', 3).every((r) => r.seme.id !== 's6'));

check('mese 0: []', semiDaSeminare(semi, schede, 'orto', 0).length === 0);
check('mese 13: []', semiDaSeminare(semi, schede, 'orto', 13).length === 0);
check("mese '5': []", semiDaSeminare(semi, schede, 'orto', '5').length === 0);
check('mese 5.5: []', semiDaSeminare(semi, schede, 'orto', 5.5).length === 0);
check('mese null: []', semiDaSeminare(semi, schede, 'orto', null).length === 0);
check('mese undefined: []', semiDaSeminare(semi, schede, 'orto', undefined).length === 0);
check('zonaId null: []', semiDaSeminare(semi, schede, null, 5).length === 0);
check("zonaId '': []", semiDaSeminare(semi, schede, '', 5).length === 0);
check('semi non elenco: []', semiDaSeminare('x', schede, 'orto', 5).length === 0);
check('schede non elenco: []', semiDaSeminare(semi, null, 'orto', 5).length === 0);

// ---------- statoSeme ----------
const conAnno = (anno) => ({ id: 's', schedaId: null, nome: 'X', anno, quantita: '' });
check('anno corrente: nuovo', statoSeme(conAnno(2026), 2026) === 'nuovo');
check("anno prima: nuovo", statoSeme(conAnno(2025), 2026) === 'nuovo');
check('due anni prima: datato', statoSeme(conAnno(2024), 2026) === 'datato');
check('tre anni prima: datato', statoSeme(conAnno(2023), 2026) === 'datato');
check('quattro anni prima: datato', statoSeme(conAnno(2022), 2026) === 'datato');
check('cinque anni prima: vecchio', statoSeme(conAnno(2021), 2026) === 'vecchio');
check('dieci anni prima: vecchio', statoSeme(conAnno(2016), 2026) === 'vecchio');
check('anno null: ignoto', statoSeme(conAnno(null), 2026) === 'ignoto');
check('anno undefined: ignoto', statoSeme(conAnno(undefined), 2026) === 'ignoto');
check('anno nel futuro: ignoto', statoSeme(conAnno(2027), 2026) === 'ignoto');
check("anno stringa '2020': ignoto", statoSeme(conAnno('2020'), 2026) === 'ignoto');
check('anno 2020.5: ignoto', statoSeme(conAnno(2020.5), 2026) === 'ignoto');
check('anno NaN: ignoto', statoSeme(conAnno(NaN), 2026) === 'ignoto');
check('seme null: ignoto', statoSeme(null, 2026) === 'ignoto');
check('annoCorrente null: ignoto', statoSeme(conAnno(2024), null) === 'ignoto');
check("annoCorrente '2026': ignoto", statoSeme(conAnno(2024), '2026') === 'ignoto');
check('annoCorrente 2026.5: ignoto', statoSeme(conAnno(2024), 2026.5) === 'ignoto');
check('annoCorrente 2025 e anno 2024: nuovo', statoSeme(conAnno(2024), 2025) === 'nuovo');
check('annoCorrente 2021 e anno 2021: nuovo', statoSeme(conAnno(2021), 2021) === 'nuovo');

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
