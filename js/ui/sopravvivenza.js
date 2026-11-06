// «Come farla sopravvivere»: voci apribili (all'aperto? talee? al riparo?) con passi, avvertenze, certezza e fonti.
// I dati vengono da data/it/sopravvivenza.json: niente è inventato, ogni voce dichiara certezza e fonti.
import { el } from '../util.js';
import { t } from '../i18n.js';

const certezza = (c) => el('span', { class: `etichetta certezza ${['alta', 'media'].includes(c) ? c : 'bassa'}` }, t(`animali.certezza.${c ?? 'bassa'}`));

// Un solo pannello apribile per ogni opzione; null se per questa coltura non ci sono dati.
export function bloccoSopravvivenza(schedaId, dati) {
  const opzioni = dati?.colture?.[schedaId]?.opzioni;
  if (!Array.isArray(opzioni) || !opzioni.length) return null;
  return el('section', { class: 'sopravvivenza', 'aria-label': t('sopravvivenza.titolo') },
    el('h3', {}, t('sopravvivenza.titolo')),
    el('p', { class: 'aiuto' }, t('sopravvivenza.intro')),
    opzioni.map((o) => {
      const fonti = (o.fonti ?? []).map((id) => dati.fonti?.[id]).filter(Boolean);
      return el('details', { class: `opzione-sopravvivenza esito-${o.esito}`, 'data-opzione': o.id },
        el('summary', {}, el('span', { class: 'opzione-titolo' }, o.titolo), el('span', { class: `esito esito-${o.esito}` }, t(`sopravvivenza.esito.${o.esito}`))),
        el('div', { class: 'corpo' },
          el('p', {}, o.riassunto),
          o.passi?.length ? el('div', {}, el('h4', {}, t('sopravvivenza.passi')), el('ol', { class: 'passi-sopravvivenza' }, o.passi.map((p) => el('li', {}, p)))) : null,
          o.attenzione?.length ? el('div', {}, el('h4', {}, t('sopravvivenza.attenzione')), el('ul', { class: 'elenco-semplice' }, o.attenzione.map((p) => el('li', {}, p)))) : null,
          el('p', {}, certezza(o.certezza)),
          fonti.length ? el('details', { class: 'meteo-dettagli' }, el('summary', {}, t('animali.fonti')),
            el('ul', { class: 'elenco-semplice' }, fonti.map((x) => el('li', {}, el('a', { href: x.url, target: '_blank', rel: 'noopener noreferrer' }, x.titolo), x.ente ? ` (${x.ente})` : '')))) : null));
    }));
}
