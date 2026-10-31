// Da quanto tempo l'utente non apre l'app. Funzioni pure: date in formato AAAA-MM-GG.
// I conti si fanno con Date.UTC così l'ora legale non sposta niente.

// Interpreta una stringa AAAA-MM-GG; restituisce i millisecondi UTC di quel giorno, o null se non valida.
function msDi(data) {
  if (typeof data !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!m) return null;
  const a = Number(m[1]), me = Number(m[2]), g = Number(m[3]);
  const d = new Date(Date.UTC(a, me - 1, g));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== me - 1 || d.getUTCDate() !== g) return null; // data impossibile
  return d.getTime();
}

// Giorni di calendario fra ultimo e oggi (oggi - ultimo), mai negativo; 0 se una data non va bene.
export function giorniDiAssenza(ultimo, oggi) {
  const a = msDi(ultimo), b = msDi(oggi);
  if (a === null || b === null) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

// Umore del verme in base ai giorni passati; valori strani valgono 0.
export function umoreDeiVermi(giorni) {
  const g = (typeof giorni === 'number' && giorni >= 0 && Number.isInteger(giorni)) ? giorni : 0;
  if (g < 2) return 'allegro';
  if (g === 2) return 'tranquillo';
  if (g < 7) return 'annoiato';
  return 'dorme';
}

// Chiave di traduzione per il bentornato; valori strani valgono 0 (quindi null).
export function chiaveBentornato(giorni) {
  const g = (typeof giorni === 'number' && giorni >= 0 && Number.isInteger(giorni)) ? giorni : 0;
  if (g < 2) return null;
  if (g < 7) return 'verme.bentornato.pochi';
  if (g < 30) return 'verme.bentornato.tanti';
  return 'verme.bentornato.moltissimi';
}
