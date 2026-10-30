// Link a Google Calendar con l'evento già compilato (nessuna chiave, nessun accesso all'account).
import { aggiungiGiorni } from './util.js';

// Evento di tutto il giorno: la data di fine è esclusiva (il giorno dopo).
export function urlCalendar({ titolo, data, descrizione }) {
  const inizio = data.replaceAll('-', '');
  const fine = aggiungiGiorni(data, 1).replaceAll('-', '');
  const parametri = new URLSearchParams({
    action: 'TEMPLATE',
    text: titolo,
    dates: `${inizio}/${fine}`,
    details: descrizione,
  });
  return `https://calendar.google.com/calendar/render?${parametri}`;
}
