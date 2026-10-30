// Rossella (la scienziata prudente) e Rosso (il contadino all'antica).
import { el } from '../util.js';
import { t } from '../i18n.js';

// variante: 'pensa' (Rossella) o 'ride' (Rosso); senza variante, l'espressione neutra.
export function percorsoMascotte(chi, variante) {
  return `assets/mascotte/${chi}${variante ? `-${variante}` : ''}.svg`;
}

export function avatar(chi, variante) {
  return el('img', { class: `avatar ${chi}`, src: percorsoMascotte(chi, variante), alt: '', width: 72, height: 72 });
}

// battute = [{ chi: 'rosso' | 'rossella', testo, variante? }]
export function conversazione(battute) {
  return el('div', { class: 'conversazione' },
    battute.map(({ chi, testo, variante }) =>
      el('div', { class: `battuta ${chi}` },
        avatar(chi, variante),
        el('div', { class: 'fumetto' },
          el('strong', { class: 'chi' }, t(`mascotte.${chi}`)),
          el('p', {}, testo),
        ),
      )),
  );
}
