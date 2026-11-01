// «Quanto hai raccolto?»: un foglio per segnare chili, grammi o pezzi di una coltura. Si apre da Oggi (dopo un lavoro di raccolta) e dalla schermata del raccolto.
import { el, oggiISO } from '../util.js';
import { t } from '../i18n.js';
import { apriFoglio } from './foglio.js';
import { toast } from './toast.js';
import { nuovoEvento, registraEvento } from '../store/dati.js';
import { controllaProgressi } from '../store/progressi.js';
import { salvaProduzione } from '../store/produzioni.js';
import { lottoDaRaccolto } from '../motore/produzioni.js';

const UNITA = ['kg', 'g', 'pezzi'];

// colture: le colture dell'utente. opzioni: { colturaId, nome, data, alSalvare(evento) }. Restituisce il foglio.
export function apriRaccolto(colture, { colturaId = null, nome = '', data = oggiISO(), alSalvare = null } = {}) {
  const scelta = el('select', { name: 'coltura' },
    colture.map((c) => el('option', { value: c.id, selected: c.id === colturaId }, c.nome)),
    el('option', { value: '', selected: !colturaId && !colture.length }, t('raccolto.altra_coltura')));
  const nomeLibero = el('input', { name: 'nome', maxlength: 60, placeholder: t('raccolto.nome.esempio'), value: nome });
  const form = el('form', { class: 'form', autocomplete: 'off' },
    el('label', {}, t('raccolto.coltura'), scelta),
    el('label', { class: 'campo-nome', hidden: true }, t('raccolto.nome'), nomeLibero),
    el('div', { class: 'riga' },
      el('label', {}, t('raccolto.quantita'), el('input', { name: 'quantita', type: 'number', inputmode: 'decimal', step: 'any', min: '0', required: true, placeholder: '1,5' })),
      el('label', {}, t('raccolto.unita'), el('select', { name: 'unita' }, UNITA.map((u) => el('option', { value: u }, t(`raccolto.unita.${u}`)))))),
    el('label', {}, t('diario.data'), el('input', { name: 'data', type: 'date', required: true, value: data, max: oggiISO() })),
    el('div', { class: 'riga' },
      el('button', { class: 'btn', type: 'button', onclick: () => foglio.close() }, t('form.annulla')),
      el('button', { class: 'btn primario', type: 'submit' }, t('diario.salva'))));
  const mostraNome = () => { form.querySelector('.campo-nome').hidden = scelta.value !== ''; };
  scelta.addEventListener('change', mostraNome);
  mostraNome();
  const foglio = apriFoglio({ titolo: t('raccolto.titolo_foglio'), contenuto: form });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const quantita = Number(String(d.get('quantita')).replace(',', '.'));
    if (!Number.isFinite(quantita) || quantita <= 0) { toast(t('raccolto.quantita.errore')); return; }
    const coltura = colture.find((c) => c.id === d.get('coltura'));
    const nomeColtura = coltura ? coltura.nome : String(d.get('nome') ?? '').trim().slice(0, 60);
    const evento = {
      ...nuovoEvento({
        tipo: 'raccolto', zonaId: coltura?.zonaId ?? null,
        colturaId: coltura?.id ?? null, schedaId: coltura?.schedaId ?? null, data: d.get('data'), esito: 'ok',
      }),
      quantita, unita: UNITA.includes(d.get('unita')) ? d.get('unita') : 'kg', nomeColtura,
    };
    const lotto = lottoDaRaccolto(evento); // il raccolto è anche un lotto di produzione: da lì si consuma, si riserva, si regala o si pubblica
    if (lotto) evento.produzioneId = lotto.id;
    await registraEvento(evento);
    if (lotto) await salvaProduzione(lotto);
    foglio.close();
    toast(t('raccolto.salvato'));
    controllaProgressi();
    if (alSalvare) alSalvare(evento);
  });
  return foglio;
}
