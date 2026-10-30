// Coerenza dei contenuti agronomici. Uso: node fase2-contenuti.mjs <cartella-app>
import fs from 'node:fs';
import path from 'node:path';
const R = path.resolve(process.argv[2] || '..');
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; if (!c) console.log(`FAIL  ${n}  -> ${d}`); };
const avvisi = [];
const gl = JSON.parse(fs.readFileSync(path.join(R, 'data/it/glossario.json'), 'utf8'));
const idGl = new Set(gl.termini.map((t) => t.id));
check('glossario: id unici', idGl.size === gl.termini.length);
for (const t of gl.termini) { check(`glossario ${t.id}: ha definizione`, t.definizione?.length > 5); for (const v of t.vedi_anche ?? []) check(`glossario ${t.id}: vedi_anche ${v} esiste`, idGl.has(v), v); }
const dir = path.join(R, 'data/it/colture');
const indice = JSON.parse(fs.readFileSync(path.join(dir, 'indice.json'), 'utf8')).colture;
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'indice.json');
check('indice = file presenti', JSON.stringify([...indice].sort()) === JSON.stringify(files.map((f) => f.slice(0, -5)).sort()), indice + ' vs ' + files);
const PAROLE = /sessione|ricerca|fonti aperte|fonte aperta|in questa prova|\bprova\b|agronomo|banca dati|web|internet|google/i;
const MESI = /^(?:[1-9]|1[0-2])$/;
for (const f of files) {
  const nome = f.slice(0, -5);
  let d;
  try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { check(`${f}: JSON valido`, false, e.message); continue; }
  check(`${f}: id = nome file`, d.id === nome, d.id);
  const fonti = new Set(Object.keys(d.fonti ?? {}));
  for (const [k, v] of Object.entries(d.fonti ?? {})) check(`${f}: fonte ${k} con url https`, /^https:\/\//.test(v.url ?? ''), v.url);
  if (d.icona) check(`${f}: icona esiste (${d.icona})`, fs.existsSync(path.join(R, d.icona)), d.icona); else check(`${f}: ha icona`, false);
  const cal = Object.values(d.calendario ?? {}).flat();
  const lavori = [...cal, ...(d.lavori ?? [])];
  const idv = lavori.map((l) => l.id); check(`${f}: id lavori unici`, new Set(idv).size === idv.length, idv);
  check(`${f}: almeno un lavoro con mese 11`, cal.some((l) => l.mesi?.includes(11)));
  // certezza/fonti anche a livello scheda
  for (const campo of ['giorni_alla_raccolta', 'semina', 'consociazioni', 'rotazione']) {
    const c = d[campo]; if (!c) continue;
    if (['alta', 'media'].includes(c.certezza)) check(`${f}.${campo}: certezza ${c.certezza} senza fonti`, c.fonti?.length > 0);
    for (const x of c.fonti ?? []) check(`${f}.${campo}: fonte ${x} esiste`, fonti.has(x), x);
  }
  for (const l of lavori) {
    const w = `${f}/${l.id}`;
    check(`${w}: certezza valida`, ['alta', 'media', 'bassa'].includes(l.certezza), l.certezza);
    if (['alta', 'media'].includes(l.certezza)) check(`${w}: certezza ${l.certezza} SENZA fonti`, l.fonti?.length > 0);
    if (l.certezza === 'alta' && l.fonti?.length) { /* ok */ }
    for (const x of l.fonti ?? []) check(`${w}: fonte ${x} esiste`, fonti.has(x), x);
    for (const g of l.glossario ?? []) check(`${w}: glossario ${g} esiste`, idGl.has(g), g);
    check(`${w}: rosso <= 220 (${l.rosso?.length})`, l.rosso && l.rosso.length <= 220);
    check(`${w}: rossella <= 220 (${l.rossella?.length})`, l.rossella && l.rossella.length <= 220);
    check(`${w}: perche presente`, l.perche?.length > 10);
    check(`${w}: ha mesi XOR dopo_giorni`, Boolean(l.mesi) !== Boolean(l.dopo_giorni));
    if (l.mesi) { check(`${w}: ottimale ⊆ mesi`, (l.ottimale ?? []).every((m) => l.mesi.includes(m))); if (!(l.ottimale?.length)) avvisi.push(`${w}: "ottimale" vuoto -> l'etichetta "Periodo migliore" non puo' mai comparire`); }
    if (l.dopo_giorni) check(`${w}: dopo_giorni [min<=max]`, l.dopo_giorni.length === 2 && l.dopo_giorni[0] <= l.dopo_giorni[1], l.dopo_giorni);
    for (const m of l.metodi ?? []) {
      check(`${w}/${m.tipo}: tipo valido`, ['biologico', 'tradizionale', 'sinergico'].includes(m.tipo), m.tipo);
      check(`${w}/${m.tipo}: pro e contro`, m.pro?.length && m.contro?.length);
    }
    const tipi = (l.metodi ?? []).map((m) => m.tipo); check(`${w}: metodi senza doppioni`, new Set(tipi).size === tipi.length, tipi);
    const testi = { titolo: l.titolo, perche: l.perche, rosso: l.rosso, rossella: l.rossella };
    (l.metodi ?? []).forEach((m, i) => { testi['metodo' + i + '.come'] = m.come; (m.pro ?? []).forEach((x, j) => testi[`metodo${i}.pro${j}`] = x); (m.contro ?? []).forEach((x, j) => testi[`metodo${i}.contro${j}`] = x); });
    for (const [k, v] of Object.entries(testi)) { const m = PAROLE.exec(v ?? ''); if (m) avvisi.push(`${w}.${k}: contiene "${m[0]}": «${v.slice(Math.max(0, m.index - 30), m.index + 40)}»`); }
  }
  for (const a of d.avvisi ?? []) { const m = PAROLE.exec(a); if (m) avvisi.push(`${f}.avvisi: "${m[0]}"`); }
}
// i18n mostrati all'utente
const it = JSON.parse(fs.readFileSync(path.join(R, 'i18n/it.json'), 'utf8'));
for (const [k, v] of Object.entries(it)) if (/sessione|ricerca|fonti aperte|in questa prova|\bprova\b/i.test(v) && !/^ia\./.test(k)) avvisi.push(`i18n ${k}: «${v.slice(0, 120)}»`);
console.log(avvisi.length ? '\nAVVISI (da valutare):\n - ' + avvisi.join('\n - ') : '\nNessun avviso');
console.log(`\nTotale: ${ok} PASS, ${ko} FAIL  (${files.length} schede)`);
process.exit(ko ? 1 : 0);
