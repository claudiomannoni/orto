// «Come curarla»: luce, acqua, terreno, vaso, sostegni ed errori da evitare, da data/it/cura.json (ogni consiglio ha certezza e fonti).
import { el } from '../util.js';
import { t } from '../i18n.js';

const ORDINE = ['luce', 'acqua', 'terreno', 'vaso', 'sostegni', 'errori'];
const certezza = (c) => el('span', { class: `etichetta certezza ${['alta', 'media'].includes(c) ? c : 'bassa'}` }, t(`animali.certezza.${c ?? 'bassa'}`));

// Le schede agricole scrivono tutto in una riga: le prime due frasi si leggono subito, il resto sta sotto «Altri dettagli».
function corpo(testo) {
  const parti = String(testo).split(/;\s+/).filter(Boolean);
  if (parti.length <= 2) return [testo];
  return [`${parti.slice(0, 2).join('; ')}.`.replace(/\.\.$/, '.'), el('details', { class: 'altri-dettagli' }, el('summary', {}, t('cura.dettagli')), el('p', {}, `${parti.slice(2).join('; ')}`))];
}

// Un riquadro con un consiglio per riga; null se per questa coltura non ci sono dati.
export function bloccoCura(schedaId, dati) {
  const consigli = (dati?.colture?.[schedaId]?.consigli ?? []).filter((c) => ORDINE.includes(c.argomento));
  if (!consigli.length) return null;
  consigli.sort((a, b) => ORDINE.indexOf(a.argomento) - ORDINE.indexOf(b.argomento));
  const fonti = [...new Set(consigli.flatMap((c) => c.fonti ?? []))].map((id) => dati.fonti?.[id]).filter(Boolean);
  return el('section', { class: 'card cura', 'aria-label': t('cura.titolo') },
    el('h3', {}, t('cura.titolo')),
    el('dl', { class: 'dati-cura' }, consigli.map((c) => el('div', { class: `consiglio-cura cura-${c.argomento}` },
      el('dt', {}, t(`cura.${c.argomento}`)),
      el('dd', {}, ...corpo(c.testo), ' ', certezza(c.certezza))))),
    fonti.length ? el('details', { class: 'meteo-dettagli' }, el('summary', {}, t('animali.fonti')),
      el('ul', { class: 'elenco-semplice' }, fonti.map((x) => el('li', {}, el('a', { href: x.url, target: '_blank', rel: 'noopener noreferrer' }, x.titolo), x.ente ? ` (${x.ente})` : '')))) : null);
}
