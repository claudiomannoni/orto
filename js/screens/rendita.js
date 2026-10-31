// Colture speciali e da rendita: zafferano, funghi, fiori edibili, varietà rare. Ogni dato ha la sua fonte e la sua certezza.
// Nessuna promessa di guadagno: si riportano solo cifre con una fonte. Contenuti in data/it/rendita.json.
import { el, aggiungi, meseDi, oggiISO, parametriRotta } from '../util.js';
import { t } from '../i18n.js';
import { rendita } from '../contenuti.js';

const lista = (voci) => el('ul', { class: 'elenco-semplice' }, voci.map((v) => el('li', {}, v)));
const sezione = (titolo, ...figli) => el('section', { class: 'card' }, el('h3', {}, titolo), ...figli);
const certezza = (c) => el('span', { class: `etichetta certezza ${c === 'alta' ? 'media' : 'bassa'}` }, t(`animali.certezza.${c ?? 'bassa'}`));
const link = (url, testo) => (url ? el('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, testo) : null);

function disegnaScheda(s) {
  const mese = String(meseDi(oggiISO()));
  const dMese = s.quando?.[mese] ?? [];
  const nomeMese = new Date(2000, Number(mese) - 1, 1).toLocaleDateString('it-IT', { month: 'long' });
  const testoVoce = (v) => (typeof v === 'string' ? v : `${v.voce ?? v.nome ?? ''}${v.nota ? `: ${v.nota}` : ''}`);
  return [
    el('p', {}, s.in_breve),
    s.dove_e_come ? sezione(t('rendita.dove'), typeof s.dove_e_come === 'string' ? el('p', {}, s.dove_e_come) : lista(Object.values(s.dove_e_come).filter(Boolean))) : null,
    Object.values(s.quando ?? {}).some((m) => m.length) ? sezione(t('rendita.quando', { mese: nomeMese }), dMese.length ? lista(dMese) : el('p', { class: 'aiuto' }, t('animali.mese_calmo'))) : null,
    s.cosa_serve?.length ? sezione(t('animali.cosa_serve'), lista(s.cosa_serve.map(testoVoce))) : null,
    s.resa_realistica ? sezione(t('rendita.resa'), el('p', {}, s.resa_realistica.testo, ' ', certezza(s.resa_realistica.certezza), ' ', link(s.resa_realistica.fonte_url, t('animali.fonte')))) : null,
    s.come_si_vende_o_si_usa?.length ? sezione(t('rendita.usi'), lista(s.come_si_vende_o_si_usa)) : null,
    s.vendita_e_legge?.length ? sezione(t('rendita.vendita'), el('p', { class: 'avviso' }, t('rendita.avviso')),
      el('div', { class: 'elenco-proposte' }, s.vendita_e_legge.map((o) => el('div', { class: 'problema' }, o.testo, ' ', certezza(o.certezza), ' ', link(o.fonte_url, t('animali.fonte')))))) : null,
    s.rischi?.length ? sezione(t('rendita.rischi'), el('div', { class: 'elenco-proposte' }, s.rischi.map((r) => el('div', { class: 'problema' }, el('strong', {}, r.cosa), el('p', {}, r.cosa_fare))))) : null,
    s.errori_comuni?.length ? sezione(t('animali.errori'), lista(s.errori_comuni)) : null,
    s.fonti?.length ? el('details', { class: 'meteo-dettagli' }, el('summary', {}, t('animali.fonti')),
      el('ul', { class: 'elenco-semplice' }, s.fonti.map((f) => el('li', {}, link(f.url, f.titolo), f.ente ? ` (${f.ente})` : '')))) : null,
  ];
}

export async function monta(contenitore) {
  const dati = await rendita();
  const schede = dati?.schede ?? [];
  if (!schede.length) {
    aggiungi(contenitore, el('h2', { class: 'titolo-schermata' }, t('rendita.titolo')), el('p', { class: 'aiuto' }, t('rendita.non_disponibile')));
    return;
  }
  const attuale = schede.find((s) => s.id === parametriRotta().get('scheda'));
  aggiungi(contenitore,
    el('h2', { class: 'titolo-schermata' }, attuale ? attuale.nome : t('rendita.titolo')),
    attuale ? el('a', { class: 'btn', href: '#/rendita' }, t('animali.tutte')) : el('p', { class: 'aiuto' }, t('rendita.spiega')),
    attuale ? null : el('div', { class: 'tessere-azione' }, schede.map((s) => el('a', { class: 'tessera-azione', href: `#/rendita?scheda=${encodeURIComponent(s.id)}`, 'data-scheda': s.id }, el('strong', {}, s.nome), el('span', { class: 'aiuto' }, s.in_breve)))),
    ...(attuale ? disegnaScheda(attuale) : []),
    el('p', { class: 'aiuto' }, t('animali.avvertenza')));
}
