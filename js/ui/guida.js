// La guida non invasiva: la prima volta che si apre una schermata, i vermetti dicono in due battute a cosa serve.
// Si chiude con «Ho capito» e non torna più (si rivede da Impostazioni). Mai su schermate senza testo di guida.
import { el } from '../util.js';
import { t, haTesto } from '../i18n.js';
import { leggi, imposta } from '../store/impostazioni.js';
import { conversazione } from './mascotte.js';

export async function mostraGuida(rotta, contenitore) {
  if (!haTesto(`guida.${rotta}.rossella`)) return;
  const viste = (await leggi()).guida_viste ?? [];
  if (viste.includes(rotta)) return;
  const battute = [{ chi: 'rossella', testo: t(`guida.${rotta}.rossella`), variante: 'pensa' }];
  if (haTesto(`guida.${rotta}.rosso`)) battute.push({ chi: 'rosso', testo: t(`guida.${rotta}.rosso`), variante: 'ride' });
  const riquadro = el('section', { class: 'card guida', 'aria-label': t('guida.titolo') },
    conversazione(battute),
    el('button', {
      class: 'btn', type: 'button', id: 'guida-capito',
      onclick: async () => {
        riquadro.remove();
        await imposta('guida_viste', [...new Set([...viste, rotta])]);
      },
    }, t('guida.capito')));
  contenitore.querySelector('.titolo-schermata')?.after(riquadro) ?? contenitore.prepend(riquadro);
}
