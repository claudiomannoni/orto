// Livelli e traguardi: dalle cose fatte (lavori, colture, zone, foto) ai punti, al livello e ai traguardi sbloccati.
// Funzioni pure (niente DOM, niente database): si provano con dati finti. Il contenuto sta in data/it/traguardi.json.

const GIORNO = 86400000;
const LAVORI_PER_STAGIONE = 5;

const numeroGiorno = (iso) => Math.floor(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / GIORNO);
const stagioneDi = (iso) => {
  const m = Number(iso.slice(5, 7));
  return m === 12 || m <= 2 ? 'inverno' : m <= 5 ? 'primavera' : m <= 8 ? 'estate' : 'autunno';
};

// La serie più lunga di giorni consecutivi (date AAAA-MM-GG, anche ripetute o in disordine).
export function seriePiuLunga(date) {
  const giorni = [...new Set(date)].map(numeroGiorno).sort((a, b) => a - b);
  let migliore = 0, corrente = 0, prima = null;
  for (const g of giorni) {
    corrente = prima !== null && g === prima + 1 ? corrente + 1 : 1;
    migliore = Math.max(migliore, corrente);
    prima = g;
  }
  return migliore;
}

// Le misure su cui si valutano i traguardi. eventi, colture, zone, foto: gli elenchi dell'utente.
export function misure({ eventi = [], colture = [], zone = [], foto = [] }) {
  const fatti = eventi.filter((e) => e.tipo === 'lavoro_fatto' && typeof e.data === 'string');
  const perStagione = {};
  for (const e of fatti) perStagione[stagioneDi(e.data)] = (perStagione[stagioneDi(e.data)] ?? 0) + 1;
  const giorniAttivi = new Set([...fatti.map((e) => e.data), ...foto.map((f) => f.data).filter(Boolean)]);
  return {
    lavori_fatti: fatti.length,
    colture: colture.length,
    colture_diverse: new Set(colture.map((c) => c.schedaId || String(c.nome ?? '').trim().toLowerCase()).filter(Boolean)).size,
    zone: zone.length,
    terreno_capito: zone.filter((z) => z.terreno && (z.terreno.tessitura || z.terreno.drenaggio || z.terreno.humus)).length,
    foto: foto.length,
    diagnosi: foto.filter((f) => f.diagnosi).length,
    giorni_attivi: giorniAttivi.size,
    giorni_di_fila: seriePiuLunga(fatti.map((e) => e.data)),
    stagioni: Object.values(perStagione).filter((n) => n >= LAVORI_PER_STAGIONE).length,
  };
}

// dati = traguardi.json. Restituisce { misure, raggiunti: [id], punti, livello, prossimo, daPunti, aPunti }.
export function valuta(stato, dati) {
  const m = misure(stato);
  const raggiunti = (dati?.traguardi ?? []).filter((x) => x?.condizione && m[x.condizione.tipo] >= x.condizione.n).map((x) => x.id);
  const p = dati?.punti ?? {};
  const punti = m.lavori_fatti * (p.lavoro_fatto ?? 0) + m.colture * (p.coltura ?? 0) + m.zone * (p.zona ?? 0)
    + m.foto * (p.foto ?? 0) + raggiunti.length * (p.traguardo ?? 0);
  const livelli = [...(dati?.livelli ?? [])].sort((a, b) => a.da - b.da);
  let indice = 0;
  livelli.forEach((l, i) => { if (punti >= l.da) indice = i; });
  const livello = livelli[indice] ?? null;
  const prossimo = livelli[indice + 1] ?? null;
  return { misure: m, raggiunti, punti, livello, prossimo, daPunti: livello?.da ?? 0, aPunti: prossimo?.da ?? null };
}

// Cosa c'è di nuovo rispetto a quanto già sbloccato (id -> data): traguardi nuovi e salita di livello.
export function novita(prima, adesso, { livelloPrecedente = null } = {}) {
  const nuovi = adesso.raggiunti.filter((id) => !(id in prima));
  const salito = adesso.livello && livelloPrecedente !== null && adesso.livello.id > livelloPrecedente;
  return { nuovi, livelloSalito: Boolean(salito) };
}
