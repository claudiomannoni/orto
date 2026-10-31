// Coerenza della scheda terreno. Uso: node tests/fase3-terreno.mjs <cartella-app>
import fs from 'node:fs';
import path from 'node:path';

const R = path.resolve(process.argv[2] || '..');
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; if (!c) console.log(`FAIL  ${n}${d ? `  -> ${d}` : ''}`); };
const file = path.join(R, 'data/it/terreno.json');
let d;
try { d = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch (e) { console.log(`FAIL  JSON valido  -> ${e.message}`); process.exit(1); }

const fonti = new Set(Object.keys(d.fonti ?? {}));
const assi = { tessitura: ['sabbioso', 'medio', 'argilloso'], drenaggio: ['rapido', 'buono', 'lento'], humus: ['povero', 'medio', 'ricco'] };
const valoriValidi = (v) => Object.entries(v ?? {}).every(([a, x]) => assi[a]?.includes(x));
const fontiValide = (xs) => (xs ?? []).every((x) => fonti.has(x));
const certa = (x, dove) => {
  check(`${dove}: certezza valida`, ['alta', 'media', 'bassa'].includes(x.certezza), x.certezza);
  if (['alta', 'media'].includes(x.certezza)) check(`${dove}: fonti per certezza ${x.certezza}`, x.fonti?.length > 0);
  check(`${dove}: fonti esistenti`, fontiValide(x.fonti), x.fonti);
};
const testo = (v) => typeof v === 'string' && v.trim().length > 0;

check('versione 1', d.versione === 1);
check('questionario da 6 a 8 domande', d.questionario?.length >= 6 && d.questionario.length <= 8, d.questionario?.length);
check('id domande unici', new Set((d.questionario ?? []).map((x) => x.id)).size === d.questionario?.length);
for (const q of d.questionario ?? []) {
  check(`domanda ${q.id}: testi presenti`, testo(q.testo) && testo(q.perche));
  check(`domanda ${q.id}: da 2 a 4 opzioni`, q.opzioni?.length >= 2 && q.opzioni.length <= 4);
  check(`domanda ${q.id}: id opzioni unici`, new Set((q.opzioni ?? []).map((x) => x.id)).size === q.opzioni?.length);
  for (const o of q.opzioni ?? []) { check(`${q.id}/${o.id}: testo e valori validi`, testo(o.testo) && valoriValidi(o.valori)); }
  certa(q, `domanda ${q.id}`);
}

check('piante da 8 a 12', d.piante_indicatrici?.length >= 8 && d.piante_indicatrici.length <= 12, d.piante_indicatrici?.length);
check('id piante unici', new Set((d.piante_indicatrici ?? []).map((x) => x.id)).size === d.piante_indicatrici?.length);
for (const p of d.piante_indicatrici ?? []) {
  check(`pianta ${p.id}: testi presenti`, testo(p.nome) && testo(p.nome_scientifico) && testo(p.come_riconoscerla) && testo(p.note) && p.note.length > 15);
  check(`pianta ${p.id}: indicazioni valide`, p.indica?.length > 0 && p.indica.every((x) => assi[x.asse]?.includes(x.valore)));
  check(`pianta ${p.id}: certezza bassa`, p.certezza === 'bassa', p.certezza);
  check(`pianta ${p.id}: fonti esistenti`, fontiValide(p.fonti), p.fonti);
}

const b = d.test_barattolo;
check('barattolo: testi e materiali', testo(b?.titolo) && b.materiali?.length >= 3 && b.materiali.every(testo) && testo(b.lettura));
check('barattolo: passi presenti e una frase', b?.passi?.length >= 5 && b.passi.every((x) => testo(x.testo) && (x.testo.match(/[.!?]/g) ?? []).length === 1));
check('barattolo: tre tipi', b?.tipi?.length === 3);
check('barattolo: id tipi unici', new Set((b?.tipi ?? []).map((x) => x.id)).size === b?.tipi?.length);
for (const t of b?.tipi ?? []) {
  check(`barattolo/${t.id}: nomi e descrizione`, testo(t.nome) && testo(t.come_si_riconosce));
  for (const k of ['sabbia_pct', 'limo_pct', 'argilla_pct']) check(`barattolo/${t.id}: ${k} sensata`, Array.isArray(t[k]) && t[k].length === 2 && t[k][0] >= 0 && t[k][0] <= t[k][1] && t[k][1] <= 100);
  check(`barattolo/${t.id}: fasce compatibili con 100%`, t.sabbia_pct[0] + t.limo_pct[0] + t.argilla_pct[0] <= 100 && t.sabbia_pct[1] + t.limo_pct[1] + t.argilla_pct[1] >= 100);
}
certa(b, 'barattolo');

check('almeno 9 consigli', d.consigli?.length >= 9, d.consigli?.length);
for (const a of Object.keys(assi)) for (const v of assi[a]) check(`consiglio ${a}/${v}`, d.consigli?.some((x) => x.asse === a && x.valore === v));
for (const c of d.consigli ?? []) { check(`consiglio ${c.asse}/${c.valore}: testo presente`, testo(c.testo)); certa(c, `consiglio ${c.asse}/${c.valore}`); }

for (const [id, f] of Object.entries(d.fonti ?? {})) {
  check(`fonte ${id}: titolo, ente, nota`, testo(f.titolo) && testo(f.ente) && testo(f.nota));
  check(`fonte ${id}: url https`, /^https:\/\//.test(f.url ?? ''), f.url);
  check(`fonte ${id}: consultazione`, f.consultata === '2026-11-01', f.consultata);
}
check('da_verificare presenti', d.da_verificare?.length > 0 && d.da_verificare.every(testo));
const raw = fs.readFileSync(file, 'utf8');
check('UTF-8 senza BOM', !raw.startsWith('\uFEFF'));
const mojibake = new RegExp('[\\u00c3\\u00c2].|\\u00e2\\u20ac|\\u00ef\\u00bb\\u00bf|\\ufffd', 'u');
check('nessun carattere rovinato', !mojibake.test(raw));
console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
