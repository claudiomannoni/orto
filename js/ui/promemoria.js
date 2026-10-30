// Foglio "Promemoria": titolo, data e descrizione già compilati e modificabili,
// poi si apre Google Calendar.
import { el } from '../util.js';
import { t } from '../i18n.js';
import { apriFoglio } from './foglio.js';
import { urlCalendar } from '../calendario.js';

export function apriPromemoria({ titolo, data, descrizione }) {
  const campoTitolo = el('input', { name: 'titolo', required: true, value: titolo });
  const campoData = el('input', { name: 'data', type: 'date', required: true, value: data });
  const campoDescrizione = el('textarea', { name: 'descrizione', rows: 5 }, descrizione);

  const form = el('form', { class: 'form', method: 'dialog' },
    el('label', {}, t('promemoria.campo.titolo'), campoTitolo),
    el('label', {}, t('promemoria.campo.data'), campoData),
    el('label', {}, t('promemoria.campo.descrizione'), campoDescrizione),
    el('div', { class: 'riga' },
      el('button', { class: 'btn', value: 'annulla', formnovalidate: true }, t('form.annulla')),
      el('button', { class: 'btn primario', value: 'ok' }, t('promemoria.apri')),
    ),
  );
  const foglio = apriFoglio({ titolo: t('promemoria.titolo'), contenuto: form });

  // Calendar si apre nello stesso tocco, altrimenti il browser può bloccare la nuova scheda.
  form.addEventListener('submit', (e) => {
    if (e.submitter && e.submitter.value !== 'ok') return;
    e.preventDefault();
    const url = urlCalendar({
      titolo: campoTitolo.value.trim(),
      data: campoData.value,
      descrizione: campoDescrizione.value,
    });
    foglio.close();
    window.open(url, '_blank', 'noopener');
  });
}
