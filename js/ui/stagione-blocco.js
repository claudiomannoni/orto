// «Stagione»: l'avviso sotto una pianta quando è fuori stagione, sta arrivando il gelo o la stagione finisce, con cosa fare, come e perché.
// I dati vengono dal calendario della scheda (fuori stagione) e da data/it/stagione.json (freddo e fine stagione, con fonti e certezza).
import { el, oggiISO } from '../util.js';
import { t, locale } from '../i18n.js';
import { previsioni } from '../meteo.js';
import { giudizioStagione } from '../motore/stagione.js';

const nomeMese = (m) => new Date(2000, m - 1, 1).toLocaleDateString(locale(), { month: 'long' });
const certezza = (c) => el('span', { class: `etichetta certezza ${c === 'alta' ? 'media' : 'bassa'}` }, t(`animali.certezza.${c ?? 'bassa'}`));

// Costruisce il riquadro per un giudizio già calcolato; null se non c'è niente da dire.
export function bloccoStagione(g, dati) {
  if (!g || g.stato === 'ok') return null;
  const fonti = (g.fonti ?? []).map((id) => dati?.fonti?.[id]).filter(Boolean);
  const elencoFonti = fonti.length ? el('details', { class: 'meteo-dettagli' }, el('summary', {}, t('animali.fonti')),
    el('ul', { class: 'elenco-semplice' }, fonti.map((x) => el('li', {}, el('a', { href: x.url, target: '_blank', rel: 'noopener noreferrer' }, x.titolo), x.ente ? ` (${x.ente})` : '')))) : null;
  if (g.stato === 'fuori-stagione') {
    const mesi = g.consigliati.map(nomeMese).join(', ');
    return el('div', { class: 'stagione fuori-stagione', role: 'note' },
      el('strong', {}, t('stagione.fuori.titolo')),
      el('p', {}, t(g.partenza === 'piantina' ? 'stagione.fuori.piantina' : 'stagione.fuori.seme', { mese: nomeMese(g.mese), mesi })),
      el('p', {}, el('strong', {}, `${t('stagione.cosa')}: `), t('stagione.fuori.cosa', { mesi })),
      el('p', { class: 'aiuto' }, t('stagione.fuori.nota')));
  }
  const f = g.fine ?? {};
  const riga = (chiave, testo) => (testo ? el('p', {}, el('strong', {}, `${t(chiave)}: `), testo) : null);
  return el('div', { class: `stagione ${g.stato}`, role: g.stato === 'gelo-in-arrivo' ? 'alert' : 'note' },
    el('strong', {}, g.stato === 'gelo-in-arrivo' ? t('stagione.gelo.titolo', { minima: String(Math.round(g.minima * 10) / 10).replace('.', ',') }) : t('stagione.fine.titolo')),
    g.freddo?.nota ? el('p', { class: 'aiuto' }, g.freddo.nota) : null,
    riga('stagione.cosa', f.cosa_fare), riga('stagione.come', f.come), riga('stagione.perche', f.perche),
    el('p', {}, certezza(g.certezza)),
    elencoFonti);
}

// Calcola il giudizio di stagione per una coltura e riempie il contenitore: subito con il calendario, poi di nuovo quando arrivano le previsioni.
export function riempiStagione(contenitore, { coltura, scheda, zonaId, dati, oggi = oggiISO() }) {
  const mostra = (minime) => {
    const g = giudizioStagione({ coltura, scheda, zonaId, dati, oggi, minime });
    const blocco = bloccoStagione(g, dati);
    contenitore.replaceChildren(...(blocco ? [blocco] : []));
  };
  mostra(null);
  if (!dati) return;
  previsioni().then(({ giorni }) => {
    const prossime = giorni.filter((x) => x.data >= oggi).slice(0, 7).map((x) => x.min);
    mostra(prossime);
  }).catch(() => {});
}
