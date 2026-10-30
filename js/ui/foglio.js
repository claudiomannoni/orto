// Foglio che sale dal basso (usa <dialog>): comodo con il pollice.
import { el } from '../util.js';

export function apriFoglio({ titolo, contenuto }) {
  const dialogo = el('dialog', { class: 'foglio', 'aria-label': titolo },
    el('h2', { class: 'foglio-titolo' }, titolo),
    contenuto,
  );
  dialogo.addEventListener('close', () => dialogo.remove());
  // Un tocco fuori dal foglio lo chiude.
  dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); });
  document.body.append(dialogo);
  dialogo.showModal();
  return dialogo;
}
