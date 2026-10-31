// Saluti del giorno. Funzioni pure, nessun DOM, nessun import dall'app.

// Restituisce la fascia del giorno in base all'ora.
// ora: intero 0-23. Restituisce 'mattina' (5-11), 'pomeriggio' (12-17), 'sera' (18-21), 'notte' (22-23 e 0-4).
// Se ora non è un intero tra 0 e 23, restituisce 'giorno'.
export function fasciaDelGiorno(ora) {
  if (!Number.isInteger(ora) || ora < 0 || ora > 23) return 'giorno';
  if (ora >= 5 && ora <= 11) return 'mattina';
  if (ora >= 12 && ora <= 17) return 'pomeriggio';
  if (ora >= 18 && ora <= 21) return 'sera';
  if ((ora >= 22 && ora <= 23) || (ora >= 0 && ora <= 4)) return 'notte';
  return 'giorno';
}

// Restituisce una chiave di saluto.
// Se festa è una stringa non vuota restituisce 'saluto.festa' (vince sull'ora).
// stagione per ora non cambia nulla ma deve essere accettata.
export function chiaveSaluto(ora, { stagione = null, festa = null } = {}) {
  if (typeof festa === 'string' && festa.length > 0) return 'saluto.festa';
  const fascia = fasciaDelGiorno(ora);
  if (fascia === 'giorno') return 'saluto.giorno';
  return `saluto.${fascia}`;
}
