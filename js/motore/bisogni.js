// «Le tue piante hanno bisogno di te»: da ogni pianta dell'orto, al massimo una cosa da fare oggi, in ordine di urgenza.
// Funzione pura: riceve i fatti già calcolati (giudizio di stagione, fase, eventi) e non inventa niente.
// Le frasi «cosa fare» vengono dai dati (stagione.json e fasi.json), che hanno le loro fonti.

const ORDINE = { urgente: 0, presto: 1, normale: 2 };
// Dopo «Fatto», per quanti giorni la stessa voce non torna.
const PAUSA = { gelo: 2, 'fine-stagione': 7, 'fuori-stagione': 7, ciclo: 7, fase: 3 };

const giorniFra = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

function fattoDiRecente(eventi, colturaId, tipo, oggi) {
  const id = `bisogno-${tipo}`;
  return (eventi ?? []).some((e) => e.colturaId === colturaId && e.lavoroId === id && ['lavoro_fatto', 'lavoro_saltato'].includes(e.tipo)
    && typeof e.data === 'string' && e.data <= oggi && giorniFra(e.data, oggi) < PAUSA[tipo]);
}

// piante: [{ coltura, giudizio, fase, cicloFinito }]
//   giudizio = risultato di giudizioStagione; fase = fase attuale (da fasi.json) o null;
//   cicloFinito = true se è una coltura annuale che ha superato i giorni massimi alla raccolta.
export function bisogniPiante({ piante = [], eventi = [], oggi } = {}) {
  if (typeof oggi !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(oggi)) return [];
  const voci = [];
  for (const p of piante) {
    const c = p?.coltura;
    if (!c?.id) continue;
    const g = p.giudizio ?? {};
    const azione = g.fine?.azione ?? null;
    let voce = null;
    if (g.stato === 'gelo-in-arrivo') {
      voce = { tipo: 'gelo', urgenza: 'urgente', azione: azione === 'proteggere' ? 'proteggi' : azione === 'raccogliere-tutto' ? 'raccogli' : 'controlla', minima: g.minima ?? null, dettaglio: g.fine?.cosa_fare ?? g.freddo?.nota ?? null };
    } else if (g.stato === 'fine-stagione' && azione && azione !== 'lasciare-in-campo') {
      voce = { tipo: 'fine-stagione', urgenza: 'presto', azione: azione === 'proteggere' ? 'proteggi' : 'raccogli', dettaglio: g.fine?.cosa_fare ?? null };
    } else if (g.stato === 'fuori-stagione') {
      voce = { tipo: 'fuori-stagione', urgenza: 'presto', azione: 'controlla', dettaglio: null };
    } else if (p.cicloFinito === true) {
      voce = { tipo: 'ciclo', urgenza: 'presto', azione: 'raccogli', dettaglio: null };
    } else if (Array.isArray(p.fase?.cosa_fare) && p.fase.cosa_fare.length) {
      voce = { tipo: 'fase', urgenza: 'normale', azione: 'fase', dettaglio: p.fase.cosa_fare[0], fase: p.fase.nome ?? null };
    }
    if (!voce || fattoDiRecente(eventi, c.id, voce.tipo, oggi)) continue;
    voci.push({ id: `${c.id}:${voce.tipo}`, colturaId: c.id, schedaId: c.schedaId ?? null, nome: c.varieta ? `${c.nome} · ${c.varieta}` : c.nome, lavoroId: `bisogno-${voce.tipo}`, ...voce });
  }
  return voci.sort((a, b) => ORDINE[a.urgenza] - ORDINE[b.urgenza] || a.nome.localeCompare(b.nome, 'it'));
}
