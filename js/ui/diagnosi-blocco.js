// Il riquadro con la diagnosi di Rossella: cosa vede, cause possibili con certezza, cosa controllare. Sempre «da verificare».
import { el, formattaData } from '../util.js';
import { t } from '../i18n.js';

export function bloccoDiagnosi(diagnosi) {
  const r = diagnosi.risultato;
  return el('section', { class: 'card diagnosi' },
    el('h3', {}, t('diagnosi.titolo')),
    el('p', {}, el('span', { class: 'etichetta certezza bassa' }, t('diagnosi.da_verificare'))),
    el('p', {}, el('strong', {}, t(`diagnosi.stato.${r.stato}`))),
    r.pianta ? el('p', {}, t('diagnosi.pianta', { nome: r.pianta.nome }), ' ', el('span', { class: `etichetta certezza ${r.pianta.confidenza === 'alta' ? 'media' : 'bassa'}` }, t(`foto.confidenza.${r.pianta.confidenza}`))) : null,
    r.problemi.length ? el('div', { class: 'elenco-proposte' }, r.problemi.map((p) => el('div', { class: 'problema' },
      el('strong', {}, p.nome), ' ', el('span', { class: `etichetta certezza ${p.confidenza === 'alta' ? 'media' : 'bassa'}` }, t(`foto.confidenza.${p.confidenza}`)),
      p.perche ? el('p', { class: 'aiuto' }, p.perche) : null,
      p.cosa_controllare ? el('p', {}, el('strong', {}, `${t('diagnosi.controlla')}: `), p.cosa_controllare) : null))) : null,
    r.fase_attesa ? el('p', {}, el('strong', {}, `${t('diagnosi.fase.titolo')}: `), t(`diagnosi.fase.${r.confronto_fase ?? 'incerto'}`, { attesa: r.fase_attesa.nome, osservata: r.fase_osservata?.nome ?? '', eta: r.fase_attesa.eta })) : null,
    r.avvisi ? el('p', { class: 'avviso' }, r.avvisi) : null,
    el('p', { class: 'aiuto' }, t('diagnosi.avvertenza')),
    el('p', { class: 'aiuto' }, t('diagnosi.data', { data: formattaData(diagnosi.data) })));
}
