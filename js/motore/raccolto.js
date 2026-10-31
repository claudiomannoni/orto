// Il raccolto dell'orto: totali, gruppi per coltura e per mese, testo delle quantità. Funzioni pure.
import { daISO } from '../util.js';

const UNITA = new Set(['kg', 'g', 'pezzi']);

const arrotonda3 = (n) => Math.round(n * 1000) / 1000;

// Un evento di raccolto valido: tipo giusto, quantità positiva e unità conosciuta.
function eventoValido(e) {
  return e != null && e.tipo === 'raccolto'
    && typeof e.quantita === 'number' && Number.isFinite(e.quantita) && e.quantita > 0
    && UNITA.has(e.unita);
}

// I chili di un evento (i grammi diventano chili); per i pezzi non ha senso chiamarla.
const inChili = (e) => (e.unita === 'g' ? e.quantita / 1000 : e.quantita);

// Data giusta e che esiste davvero (2026-02-30 no): AAAA-MM-GG.
function dataValida(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = daISO(iso);
  return d.getFullYear() === Number(iso.slice(0, 4))
    && d.getMonth() + 1 === Number(iso.slice(5, 7))
    && d.getDate() === Number(iso.slice(8, 10));
}

// Totale del raccolto: { kg, pezzi, voci }. Scarta senza errori eventi rovinati o di altro tipo.
export function totaleRaccolto(eventi) {
  let kg = 0;
  let pezzi = 0;
  let voci = 0;
  for (const e of Array.isArray(eventi) ? eventi : []) {
    if (!eventoValido(e)) continue;
    voci++;
    if (e.unita === 'pezzi') pezzi += e.quantita;
    else kg += inChili(e);
  }
  return { kg: arrotonda3(kg), pezzi, voci };
}

// Raggruppa per nome della coltura: [{ nome, kg, pezzi, voci }], prima chi pesa di più.
export function perColtura(eventi) {
  const gruppi = new Map();
  for (const e of Array.isArray(eventi) ? eventi : []) {
    if (!eventoValido(e)) continue;
    const grezzo = typeof e.nomeColtura === 'string' ? e.nomeColtura.trim() : '';
    const nome = grezzo || 'Senza nome';
    const chiave = nome.toLowerCase();
    if (!gruppi.has(chiave)) gruppi.set(chiave, { nome, kg: 0, pezzi: 0, voci: 0 });
    const g = gruppi.get(chiave);
    g.voci++;
    if (e.unita === 'pezzi') g.pezzi += e.quantita;
    else g.kg += inChili(e);
  }
  return [...gruppi.values()]
    .map((g) => ({ ...g, kg: arrotonda3(g.kg) }))
    .sort((a, b) => b.kg - a.kg || b.pezzi - a.pezzi || a.nome.localeCompare(b.nome, 'it'));
}

// Chili raccolti in ogni mese (gennaio = indice 0) dell'anno dato; i pezzi non contano.
export function perMese(eventi, anno) {
  const mesi = new Array(12).fill(0);
  const a = Number(anno);
  if (!Number.isInteger(a)) return mesi;
  for (const e of Array.isArray(eventi) ? eventi : []) {
    if (!eventoValido(e) || e.unita === 'pezzi' || !dataValida(e.data)) continue;
    if (Number(e.data.slice(0, 4)) !== a) continue;
    mesi[Number(e.data.slice(5, 7)) - 1] += inChili(e);
  }
  return mesi.map(arrotonda3);
}

// Numero con la virgola italiana e senza zeri inutili: 1.5 -> «1,5», 2 -> «2».
const numeroIt = (n) => String(arrotonda3(n)).replace('.', ',');

// Quantità pronta da leggere: «1,5 kg», «250 g», «12 pezzi», «1 pezzo». Valori non validi: ''.
export function testoQuantita(quantita, unita) {
  if (typeof quantita !== 'number' || !Number.isFinite(quantita) || quantita <= 0) return '';
  if (unita === 'pezzi') {
    const n = arrotonda3(quantita);
    return `${numeroIt(n)} ${n === 1 ? 'pezzo' : 'pezzi'}`;
  }
  if (unita !== 'kg' && unita !== 'g') return '';
  const kg = unita === 'g' ? quantita / 1000 : quantita;
  return kg < 1 ? `${numeroIt(kg * 1000)} g` : `${numeroIt(kg)} kg`;
}
