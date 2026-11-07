// Scopri: tutto quello che non è «cosa devo fare oggi» o «le mie piante», in tre gruppi chiari (il tuo orto, impara e gioca, oltre l'orto).
import { el, aggiungi } from '../util.js';
import { t } from '../i18n.js';

const tessera = (href, titolo, spiega) => el('a', { class: 'tessera-scopri', href }, el('strong', {}, titolo), el('span', { class: 'aiuto' }, spiega));

export async function monta(contenitore) {
  const gruppo = (chiave, ...tessere) => el('section', { class: 'gruppo-scopri', 'aria-label': t(chiave) }, el('h3', {}, t(chiave)), el('div', { class: 'tessere-scopri' }, ...tessere));
  aggiungi(contenitore,
    el('h2', { class: 'titolo-schermata' }, t('scopri.titolo')),
    gruppo('scopri.orto',
      tessera('#/zone', t('colture.hub.zone'), t('colture.hub.zone.spiega')),
      tessera('#/diario', t('colture.hub.diario'), t('colture.hub.diario.spiega')),
      tessera('#/storia', t('colture.hub.storia'), t('colture.hub.storia.spiega')),
      tessera('#/raccolto', t('colture.hub.raccolto'), t('colture.hub.raccolto.spiega')),
      tessera('#/semi', t('colture.hub.semi'), t('colture.hub.semi.spiega')),
      tessera('#/eccesso', t('colture.hub.eccesso'), t('colture.hub.eccesso.spiega')),
      tessera('#/cucina', t('cucina.apri'), t('cucina.spiega'))),
    gruppo('scopri.impara',
      tessera('#/impara', t('scopri.schede'), t('scopri.schede.spiega')),
      tessera('#/chiedi', t('chiedi.invito'), t('oggi.gioca.chiedi.spiega')),
      tessera('#/quiz', t('quiz.invito'), t('quiz.invito.spiega')),
      tessera('#/vermi', t('impara.pausa'), t('impara.pausa.spiega'))),
    gruppo('scopri.oltre',
      tessera('#/erbe', t('scopri.erbe'), t('scopri.erbe.spiega')),
      tessera('#/animali', t('colture.hub.animali'), t('colture.hub.animali.spiega')),
      tessera('#/alberi', t('colture.hub.alberi'), t('colture.hub.alberi.spiega')),
      tessera('#/rendita', t('colture.hub.rendita'), t('colture.hub.rendita.spiega'))));
}
