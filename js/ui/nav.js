// Testata in alto e barra di navigazione in basso (pollice).
import { el } from '../util.js';
import { t } from '../i18n.js';

// Icone semplici disegnate a tratto (costanti nostre, non contenuto dell'utente).
const ICONE = {
  oggi: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  colture: '<path d="M12 21v-9"/><path d="M12 12c0-4 3-6.5 7.5-6.5 0 4-3 6.5-7.5 6.5z"/><path d="M12 15c0-3-2.4-5-6-5 0 3 2.4 5 6 5z"/>',
  dottore: '<path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.4"/>',
  impara: '<path d="M4 5.5c3-1.2 5.5-1 8 .8 2.5-1.8 5-2 8-.8V19c-3-1.2-5.5-1-8 .8-2.5-1.8-5-2-8-.8z"/><path d="M12 6.3v13.5"/>',
  vermi: '<path d="M4 17c0-4 3-4 3-8 0-3 3-4.5 5-3 2 1.5 2 4 .5 6-1.5 2-.5 4.5 2 4.5 2.500 0 3.500-1.500 3.500-3.500"/><circle cx="15.500" cy="6.500" r="1"/>',
  impostazioni: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
};

// Le cinque voci della barra: cosa fare oggi, il mio orto, la fotocamera (al centro), il mese, imparare. Le impostazioni stanno nell'ingranaggio in alto.
export const ROTTE = ['oggi', 'colture', 'dottore', 'calendario', 'impara'];
// Schermate che non hanno una voce propria nella barra: si evidenzia quella da cui si arriva
// (stringa vuota = nessuna voce: le impostazioni si aprono dall'ingranaggio).
export const SOTTOROTTE = { zone: 'colture', diario: 'colture', storia: 'colture', coltura: 'impara', quiz: 'impara', chiedi: 'impara', raccolto: 'colture', animali: 'colture', semi: 'colture', vermi: '', rendita: 'colture', cucina: 'colture', impostazioni: '' };

function icona(nome) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('class', 'icona');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONE[nome];
  return s;
}

export function costruisciTestata(contenitore) {
  contenitore.replaceChildren(
    el('img', { class: 'logo', src: 'assets/logo.svg', alt: '', width: 44, height: 44 }),
    el('div', { class: 'testata-testi' },
      el('h1', {}, t('app.nome')),
      el('p', {}, t('app.slogan')),
    ),
    el('a', { class: 'gioco-vermi', href: '#/vermi', 'aria-label': t('vermi.apri'), title: t('vermi.apri') }, icona('vermi')),
    el('a', { class: 'ingranaggio', href: '#/impostazioni', 'aria-label': t('nav.impostazioni') }, icona('impostazioni')),
  );
}

// Evidenzia l'ingranaggio quando si è nelle impostazioni.
export function aggiornaTestata(rotta) {
  const imp = document.querySelector('.ingranaggio');
  const gioco = document.querySelector('.gioco-vermi');
  if (imp) { if (rotta === 'impostazioni') imp.setAttribute('aria-current', 'page'); else imp.removeAttribute('aria-current'); }
  if (gioco) { if (rotta === 'vermi') gioco.setAttribute('aria-current', 'page'); else gioco.removeAttribute('aria-current'); }
}

export function costruisciBarra(contenitore) {
  contenitore.setAttribute('aria-label', t('nav.principale'));
  contenitore.replaceChildren(
    ...ROTTE.map((rotta) => el('a', { href: `#/${rotta}`, 'data-rotta': rotta }, icona(rotta), el('span', {}, t(`nav.${rotta}`)))),
  );
}

export function aggiornaBarra(contenitore, rotta) {
  contenitore.querySelectorAll('a').forEach((a) => {
    if (a.dataset.rotta === rotta) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}
