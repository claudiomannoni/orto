// Ricerca pura nei contenuti locali. Restituisce risultati ordinati per pertinenza.
export function normalizzaRicerca(valore) {
  return String(valore ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function distanzaUno(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, errori = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++errori > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return errori + (i < a.length || j < b.length ? 1 : 0) <= 1;
}

function punteggio(campo, query) {
  const testo = normalizzaRicerca(campo);
  if (!testo || !query) return 0;
  if (testo === query) return 100;
  if (testo.startsWith(query)) return 80;
  if (testo.includes(query)) return 60;
  const parole = testo.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const termini = query.split(' ').filter(Boolean);
  if (termini.some((q) => parole.some((p) => p.startsWith(q)))) return 45;
  if (termini.some((q) => parole.some((p) => p.includes(q)))) return 35;
  if (termini.some((q) => q.length >= 4 && parole.some((p) => distanzaUno(p, q)))) return 20;
  return 0;
}

export function cerca(testo, elementi) {
  const query = normalizzaRicerca(testo);
  if (query.length < 2 || !Array.isArray(elementi)) return [];
  return elementi.map((voce, indice) => ({ ...voce, pertinenza: Math.max(...(voce.termini ?? [voce.titolo]).map((x) => punteggio(x, query))), indice }))
    .filter((x) => x.pertinenza > 0)
    .sort((a, b) => b.pertinenza - a.pertinenza || a.titolo.localeCompare(b.titolo) || a.indice - b.indice)
    .map(({ indice, ...voce }) => voce);
}
