// Dal questionario, dalle piante spontanee e dal test del barattolo al profilo del terreno.
// Funzioni pure (niente DOM, niente database): si provano con dati finti.

export const ASSI = {
  tessitura: ['sabbioso', 'medio', 'argilloso'],
  drenaggio: ['rapido', 'buono', 'lento'],
  humus: ['povero', 'medio', 'ricco'],
};

// Le erbe spontanee sono un indizio debole: contano la metà di una risposta.
const PESO_PIANTA = 0.5;

// Tessitura dalle percentuali del barattolo (indicativa, dal triangolo della tessitura):
// molta sabbia e poca argilla = sabbioso; tanta argilla = argilloso; il resto = medio impasto.
export function tessituraDaPercentuali({ sabbia_pct: sabbia, argilla_pct: argilla }) {
  if (![sabbia, argilla].every((v) => typeof v === 'number' && v >= 0 && v <= 100)) return null;
  if (sabbia >= 70 && argilla < 15) return 'sabbioso';
  if (argilla >= 35) return 'argilloso';
  return 'medio';
}

// Controlla le tre percentuali del barattolo: numeri 0-100 che sommano circa 100 (tolleranza 5).
export function barattoloValido({ sabbia_pct: s, limo_pct: l, argilla_pct: a } = {}) {
  if (![s, l, a].every((v) => typeof v === 'number' && v >= 0 && v <= 100)) return false;
  return Math.abs(s + l + a - 100) <= 5;
}

// dati = terreno.json. Restituisce { tessitura, drenaggio, humus } (null dove non si sa).
export function calcolaProfilo({ risposte = {}, piante = [], barattolo = null }, dati) {
  const voti = { tessitura: {}, drenaggio: {}, humus: {} };
  const aggiungi = (asse, valore, peso) => {
    if (voti[asse] && ASSI[asse].includes(valore)) voti[asse][valore] = (voti[asse][valore] ?? 0) + peso;
  };
  for (const domanda of dati?.questionario ?? []) {
    const opzione = domanda.opzioni?.find((o) => o.id === risposte[domanda.id]);
    for (const [asse, valore] of Object.entries(opzione?.valori ?? {})) aggiungi(asse, valore, 1);
  }
  for (const pianta of dati?.piante_indicatrici ?? []) {
    if (!piante.includes(pianta.id)) continue;
    for (const { asse, valore } of pianta.indica ?? []) aggiungi(asse, valore, PESO_PIANTA);
  }
  const profilo = {};
  for (const asse of Object.keys(ASSI)) {
    const ordinati = Object.entries(voti[asse]).sort((a, b) => b[1] - a[1]);
    // Parità al primo posto: non si sa.
    profilo[asse] = ordinati.length && (ordinati.length === 1 || ordinati[0][1] > ordinati[1][1]) ? ordinati[0][0] : null;
  }
  // La misura del barattolo vale più delle risposte per la tessitura.
  if (barattolo && barattoloValido(barattolo)) profilo.tessitura = tessituraDaPercentuali(barattolo) ?? profilo.tessitura;
  return profilo;
}
