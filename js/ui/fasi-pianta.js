// «Cosa fare in questa fase»: per ogni coltura che ha i dati delle fasi (data/it/fasi.json), dice a che punto è la pianta
// (dall'età, da seme o da piantina), cosa fare adesso e le accortezze del periodo, e porta all'esame con la foto.
import { el } from '../util.js';
import { t } from '../i18n.js';
import { etaDellaPianta, faseAttuale } from '../motore/fasi.js';

// L'età e la fase di una coltura; null se per quella coltura non ci sono dati.
export function statoFase(coltura, fasiDati, oggi) {
  const dati = fasiDati?.colture?.[coltura?.schedaId];
  if (!dati) return null;
  const piantinaEta = Number.isInteger(dati.piantina_eta_giorni?.valore) ? dati.piantina_eta_giorni.valore : 0;
  const eta = etaDellaPianta({ partenza: coltura.partenza, data: coltura.dataSemina, piantinaEta }, oggi);
  const att = faseAttuale(dati.fasi, eta);
  return att ? { ...att, eta, dati } : null;
}

const certezza = (c) => el('span', { class: `etichetta certezza ${c === 'alta' ? 'media' : 'bassa'}` }, t(`animali.certezza.${c ?? 'bassa'}`));
const lista = (voci) => el('ul', { class: 'elenco-semplice' }, voci.map((v) => el('li', {}, v)));

export function bloccoFase(coltura, fasiDati, oggi, { conFoto = true } = {}) {
  const st = statoFase(coltura, fasiDati, oggi);
  if (!st) return null;
  const f = st.fase;
  const prossima = st.dati.fasi[st.indice + 1];
  const fonti = (f.fonti ?? []).map((id) => fasiDati.fonti?.[id]).filter(Boolean);
  return el('section', { class: 'card fase-pianta', 'data-coltura': coltura.id },
    el('h3', {}, coltura.varieta ? `${coltura.nome} · ${coltura.varieta}` : coltura.nome),
    el('p', { class: 'meta' }, t(coltura.partenza === 'piantina' ? 'fase.eta.piantina' : 'fase.eta', { n: st.eta }), ' · ', el('strong', {}, f.nome), ' ', certezza(f.certezza)),
    prossima && st.giorniAllaProssima != null
      ? el('p', { class: 'aiuto' }, t('fase.prossima', { n: st.giorniAllaProssima, nome: prossima.nome }))
      : el('p', { class: 'aiuto' }, t('fase.ultima')),
    el('h4', {}, t('fase.cosa_fare')), lista(f.cosa_fare),
    el('h4', {}, t('fase.accortezze')), lista(f.accortezze),
    f.come_riconoscerla ? el('p', { class: 'aiuto' }, t('fase.riconoscerla', { testo: f.come_riconoscerla })) : null,
    conFoto ? el('a', { class: 'btn', href: `#/dottore?coltura=${encodeURIComponent(coltura.id)}` }, t('fase.esamina')) : null,
    fonti.length ? el('details', { class: 'meteo-dettagli' }, el('summary', {}, t('animali.fonti')),
      el('ul', { class: 'elenco-semplice' }, fonti.map((x) => el('li', {}, el('a', { href: x.url, target: '_blank', rel: 'noopener noreferrer' }, x.titolo), x.ente ? ` (${x.ente})` : '')))) : null,
    el('p', { class: 'aiuto' }, t('fase.avvertenza')));
}
