// Il riquadro con la diagnosi di Rossella: cosa vede, cause possibili con certezza, cosa controllare. Sempre «da verificare».
import { el, formattaData } from '../util.js';
import { t } from '../i18n.js';

export function bloccoDiagnosi(diagnosi, { fase = null } = {}) {
  const r = diagnosi.risultato;
  const livello = r.stato === 'problema' ? 'urgente' : r.stato === 'dubbio' ? 'attenzione' : r.stato === 'sana' ? 'ok' : 'ignoto';
  const azioni = [...(fase?.fase?.cosa_fare ?? []).map((testo, i) => ({ testo, perche: fase.fase.accortezze?.[i] || t('diagnosi.azione.fase') })), ...(r.problemi ?? []).filter((p) => p.cosa_controllare).map((p) => ({ testo: p.cosa_controllare, perche: p.perche || t('diagnosi.azione.problema') }))];
  return el('section', { class: 'card diagnosi' },
    el('h3', {}, t('diagnosi.titolo')),
    el('p', { class: `diagnosi-sintesi salute salute-${livello}`, role: 'status' }, t(`diagnosi.stato.${r.stato}`)),
    r.fase_attesa ? el('p', {}, el('strong', {}, `${t('diagnosi.fase.titolo')}: `), t(`diagnosi.fase.${r.confronto_fase ?? 'incerto'}`, { attesa: r.fase_attesa.nome, osservata: r.fase_osservata?.nome ?? '', eta: r.fase_attesa.eta })) : null,
    azioni.length ? el('div', {}, el('h4', {}, t('diagnosi.cosa_fare')), el('ul', { class: 'elenco-semplice' }, azioni.map((a) => el('li', {}, el('p', {}, el('strong', {}, `${t('diagnosi.come')}: `), a.testo), el('p', { class: 'aiuto' }, el('strong', {}, `${t('diagnosi.perche')}: `), a.perche))))) : null,
    r.problemi?.length ? el('h4', {}, t('diagnosi.problemi_rimedi')) : null,
    el('p', {}, el('span', { class: 'etichetta certezza bassa' }, t('diagnosi.da_verificare'))),
    r.pianta ? el('p', {}, t('diagnosi.pianta', { nome: r.pianta.nome }), ' ', el('span', { class: `etichetta certezza ${r.pianta.confidenza === 'alta' ? 'media' : 'bassa'}` }, t(`foto.confidenza.${r.pianta.confidenza}`))) : null,
    r.problemi.length ? el('div', { class: 'elenco-proposte' }, r.problemi.map((p) => el('div', { class: 'problema' },
      el('strong', {}, p.nome), ' ', el('span', { class: `etichetta certezza ${p.confidenza === 'alta' ? 'media' : 'bassa'}` }, t(`foto.confidenza.${p.confidenza}`)),
      p.perche ? el('p', { class: 'aiuto' }, p.perche) : null,
      p.cosa_controllare ? el('p', {}, el('strong', {}, `${t('diagnosi.controlla')}: `), p.cosa_controllare) : null))) : null,
    r.avvisi ? el('p', { class: 'avviso' }, r.avvisi) : null,
    el('p', { class: 'aiuto' }, t('diagnosi.avvertenza')),
    el('p', { class: 'aiuto' }, t('diagnosi.data', { data: formattaData(diagnosi.data) })));
}
