// Prova di livelli e traguardi (Node, nessun server). Uso: node tests/fase5-progressi.mjs <cartella-app>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { seriePiuLunga, misure, valuta, novita } = await import(pathToFileURL(path.join(radice, 'js/motore/progressi.js')).href);
const dati = JSON.parse(fs.readFileSync(path.join(radice, 'data/it/traguardi.json'), 'utf8'));

let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
const fatto = (data) => ({ tipo: 'lavoro_fatto', data });

check('serie: nessuna data = 0', seriePiuLunga([]) === 0);
check('serie: una data = 1', seriePiuLunga(['2026-11-10']) === 1);
check('serie: tre giorni di fila = 3', seriePiuLunga(['2026-11-10', '2026-11-11', '2026-11-12']) === 3);
check('serie: date doppie e in disordine', seriePiuLunga(['2026-11-12', '2026-11-10', '2026-11-11', '2026-11-11', '2026-11-20']) === 3);
check('serie: un buco spezza (10, 11, 13, 14, 15 = 3)', seriePiuLunga(['2026-11-10', '2026-11-11', '2026-11-13', '2026-11-14', '2026-11-15']) === 3);
check('serie: a cavallo di mese e di anno', seriePiuLunga(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']) === 4 && seriePiuLunga(['2027-02-27', '2027-02-28', '2027-03-01']) === 3);
check('serie: 29 febbraio di un anno bisestile', seriePiuLunga(['2028-02-28', '2028-02-29', '2028-03-01']) === 3);

const m0 = misure({});
check('senza niente: tutte le misure a zero', Object.values(m0).every((v) => v === 0), JSON.stringify(m0));
const stato = {
  eventi: [fatto('2026-11-10'), fatto('2026-11-11'), fatto('2026-11-11'), { tipo: 'lavoro_saltato', data: '2026-11-12' }, fatto('2026-07-01'), fatto('2026-07-02'), fatto('2026-07-03'), fatto('2026-07-04'), fatto('2026-07-05')],
  colture: [{ schedaId: 'fave', nome: 'Fave' }, { schedaId: 'fave', nome: 'Fave 2' }, { schedaId: null, nome: ' Pomodoro ' }, { schedaId: null, nome: 'pomodoro' }],
  zone: [{ terreno: { tessitura: 'sabbioso' } }, { terreno: null }, { terreno: { tessitura: null, drenaggio: null, humus: null } }],
  foto: [{ data: '2026-11-10', diagnosi: { data: 'x' } }, { data: '2026-11-15', diagnosi: null }],
};
const m = misure(stato);
check('lavori fatti: solo «fatto» (8, non il saltato)', m.lavori_fatti === 8, String(m.lavori_fatti));
check('colture e colture diverse (4 e 2: stessa scheda o stesso nome contano una volta)', m.colture === 4 && m.colture_diverse === 2, `${m.colture} ${m.colture_diverse}`);
check('zone 3, con terreno capito solo 1', m.zone === 3 && m.terreno_capito === 1);
check('foto 2, diagnosi 1', m.foto === 2 && m.diagnosi === 1);
check('giorni attivi: 10, 11 nov, 5 di luglio, 15 nov (foto) = 8', m.giorni_attivi === 8, String(m.giorni_attivi));
check('giorni di fila: 5 di luglio', m.giorni_di_fila === 5);
check('stagioni con almeno 5 lavori: solo l\'estate (luglio) = 1', m.stagioni === 1, String(m.stagioni));

const v = valuta(stato, dati);
const attesiPunti = 8 * 10 + 4 * 5 + 3 * 5 + 2 * 2 + v.raggiunti.length * 20;
check('punti = lavori x10 + colture x5 + zone x5 + foto x2 + traguardi x20', v.punti === attesiPunti, `${v.punti} vs ${attesiPunti}`);
check('traguardi raggiunti: «primo-lavoro» e «prima-diagnosi» sì, «cento-lavori» no', v.raggiunti.includes('primo-lavoro') && v.raggiunti.includes('prima-diagnosi') && !v.raggiunti.includes('cento-lavori'));
check('livello e prossimo coerenti con i punti', v.livello.da <= v.punti && (v.prossimo === null || v.prossimo.da > v.punti));

const v0 = valuta({}, dati);
check('senza niente: livello 1, zero punti, nessun traguardo', v0.livello.id === 1 && v0.punti === 0 && v0.raggiunti.length === 0);
check('senza dati: nessun crash', valuta(stato, null).livello === null && valuta(stato, {}).punti === 0);
const tantissimo = valuta({ eventi: Array.from({ length: 500 }, (_, i) => fatto(`2026-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`)) }, dati);
check('con tantissimi lavori: livello massimo, nessun prossimo', tantissimo.livello.id === dati.livelli.length && tantissimo.prossimo === null && tantissimo.aPunti === null);

// Novità
const prima = { 'primo-lavoro': '2026-11-10' };
let n = novita(prima, { raggiunti: ['primo-lavoro', 'prima-zona'], livello: { id: 2 } }, { livelloPrecedente: 1 });
check('novità: un traguardo nuovo e il livello salito', n.nuovi.join() === 'prima-zona' && n.livelloSalito === true);
n = novita(prima, { raggiunti: ['primo-lavoro'], livello: { id: 1 } }, { livelloPrecedente: 1 });
check('novità: niente di nuovo', n.nuovi.length === 0 && n.livelloSalito === false);
n = novita({}, { raggiunti: ['a'], livello: { id: 3 } }, { livelloPrecedente: null });
check('novità: senza livello di partenza il livello non «sale»', n.livelloSalito === false && n.nuovi.length === 1);
n = novita(prima, { raggiunti: ['primo-lavoro'], livello: { id: 1 } }, { livelloPrecedente: 4 });
check('novità: il livello non scende mai (4 -> 1 non è una salita)', n.livelloSalito === false);

// Coerenza del contenuto vero
check(`i ${dati.livelli.length} livelli partono da 0 e salgono`, dati.livelli[0].da === 0 && dati.livelli.every((l, i) => !i || l.da > dati.livelli[i - 1].da));
const piano = valuta({ eventi: [fatto('2026-11-10')] }, dati);
check('un solo lavoro fatto: si prende «Si comincia» e si resta al livello 1 o 2', piano.raggiunti.includes('primo-lavoro') && piano.livello.id <= 2, `${piano.punti} punti, livello ${piano.livello.id}`);

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
