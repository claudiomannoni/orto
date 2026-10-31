// Lombricoltura, api e pollaio: una scheda per ognuno, con cosa serve, come si parte, il calendario del mese, gli obblighi e le fonti.
// I contenuti stanno in data/it/animali.json: ogni dato ha la sua fonte e la sua certezza. Mai trattamenti o dosi.
import { el, aggiungi, meseDi, oggiISO, parametriRotta } from '../util.js';
import { t } from '../i18n.js';
import { animali } from '../contenuti.js';

const lista = (voci) => el('ul', { class: 'elenco-semplice' }, voci.map((v) => el('li', {}, v)));
const sezione = (titolo, ...figli) => el('section', { class: 'card' }, el('h3', {}, titolo), ...figli);
const certezza = (c) => el('span', { class: `etichetta certezza ${c === 'alta' ? 'media' : 'bassa'}` }, t(`animali.certezza.${c ?? 'bassa'}`));

function disegnaScheda(s) {
  const mese = String(meseDi(oggiISO()));
  const dMese = s.calendario?.[mese] ?? [];
  const nomeMese = new Date(2000, Number(mese) - 1, 1).toLocaleDateString('it-IT', { month: 'long' });
  return [
    el('p', {}, s.in_breve),
    s.perche?.length ? sezione(t('animali.perche'), lista(s.perche)) : null,
    Object.values(s.calendario ?? {}).some((m) => m.length) ? sezione(t('animali.questo_mese', { mese: nomeMese }), dMese.length ? lista(dMese) : el('p', { class: 'aiuto' }, t('animali.mese_calmo')), s.calendario_nota ? el('p', { class: 'avviso' }, s.calendario_nota) : null) : null,
    s.cosa_serve?.length ? sezione(t('animali.cosa_serve'), lista(s.cosa_serve.map((c) => (c.nota ? `${c.voce}: ${c.nota}` : c.voce)))) : null,
    s.come_si_parte?.length ? sezione(t('animali.come_si_parte'), el('ol', { class: 'elenco-semplice' }, s.come_si_parte.map((v) => el('li', {}, v)))) : null,
    s.ogni_giorno_o_settimana?.length ? sezione(t('animali.controlli'), lista(s.ogni_giorno_o_settimana)) : null,
    s.errori_comuni?.length ? sezione(t('animali.errori'), lista(s.errori_comuni)) : null,
    s.segnali_di_allarme?.length ? sezione(t('animali.allarmi'), el('div', { class: 'elenco-proposte' }, s.segnali_di_allarme.map((a) => el('div', { class: 'problema' }, el('strong', {}, a.segno), el('p', {}, a.cosa_fare))))) : null,
    s.obblighi?.length ? sezione(t('animali.obblighi'),
      el('p', { class: 'avviso' }, t('animali.obblighi.avviso')),
      el('div', { class: 'elenco-proposte' }, s.obblighi.map((o) => el('div', { class: 'problema' }, o.testo, ' ', certezza(o.certezza), o.fonte_url ? el('p', { class: 'aiuto' }, el('a', { href: o.fonte_url, target: '_blank', rel: 'noopener noreferrer' }, t('animali.fonte'))) : null)))) : null,
    s.collegamento_orto ? sezione(t('animali.con_orto'), el('p', {}, s.collegamento_orto)) : null,
    s.fonti?.length ? el('details', { class: 'meteo-dettagli' }, el('summary', {}, t('animali.fonti')),
      el('ul', { class: 'elenco-semplice' }, s.fonti.map((f) => el('li', {}, el('a', { href: f.url, target: '_blank', rel: 'noopener noreferrer' }, f.titolo), f.ente ? ` (${f.ente})` : '')))) : null,
  ];
}

export async function monta(contenitore) {
  const dati = await animali();
  const schede = dati?.schede ?? [];
  const scelta = parametriRotta().get('scheda');
  const attuale = schede.find((s) => s.id === scelta);
  if (!schede.length) {
    aggiungi(contenitore, el('h2', { class: 'titolo-schermata' }, t('animali.titolo')), el('p', { class: 'aiuto' }, t('animali.non_disponibile')));
    return;
  }
  aggiungi(contenitore,
    el('h2', { class: 'titolo-schermata' }, attuale ? attuale.nome : t('animali.titolo')),
    attuale ? el('a', { class: 'btn', href: '#/animali' }, t('animali.tutte')) : el('p', { class: 'aiuto' }, t('animali.spiega')),
    attuale ? null : el('div', { class: 'tessere-azione' }, schede.map((s) => el('a', { class: 'tessera-azione', href: `#/animali?scheda=${encodeURIComponent(s.id)}`, 'data-scheda': s.id }, el('strong', {}, s.nome), el('span', { class: 'aiuto' }, s.in_breve)))),
    ...(attuale ? disegnaScheda(attuale) : []),
    el('p', { class: 'aiuto' }, t('animali.avvertenza')));
}
