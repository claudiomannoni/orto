// Lettura ad alta voce con la voce del telefono (nessun dato esce dal telefono, di norma). Utile con le mani sporche,
// col sole sullo schermo o con la vista stanca. Il pulsante compare solo dove il telefono sa parlare.
import { el } from '../util.js';
import { t } from '../i18n.js';

export const vocePossibile = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

let inLettura = null;

export function smettiDiLeggere() {
  if (vocePossibile()) window.speechSynthesis.cancel();
  inLettura = null;
}

// Legge un testo in italiano; richiama `fine` quando finisce o si ferma.
export function leggi(testo, fine = () => {}) {
  if (!vocePossibile() || !testo) return false;
  window.speechSynthesis.cancel();
  const parola = new SpeechSynthesisUtterance(testo);
  parola.lang = 'it-IT';
  parola.rate = 0.95;
  const voci = window.speechSynthesis.getVoices();
  const italiana = voci.find((v) => v.lang === 'it-IT') ?? voci.find((v) => (v.lang ?? '').startsWith('it'));
  if (italiana) parola.voice = italiana;
  parola.onend = parola.onerror = () => { if (inLettura === parola) inLettura = null; fine(); };
  inLettura = parola;
  window.speechSynthesis.speak(parola);
  return true;
}

// Un pulsante «Ascolta»/«Ferma». testo: una stringa o una funzione che la restituisce (si legge al tocco).
// Non compare se il telefono non sa parlare.
export function pulsanteAscolta(testo) {
  if (!vocePossibile()) return null;
  const b = el('button', { class: 'btn piccolo ascolta', type: 'button', 'aria-pressed': 'false' }, t('voce.ascolta'));
  const aTesto = () => (typeof testo === 'function' ? testo() : testo);
  b.addEventListener('click', () => {
    if (b.getAttribute('aria-pressed') === 'true') { smettiDiLeggere(); b.setAttribute('aria-pressed', 'false'); b.textContent = t('voce.ascolta'); return; }
    const ok = leggi(aTesto(), () => { b.setAttribute('aria-pressed', 'false'); b.textContent = t('voce.ascolta'); });
    if (ok) { b.setAttribute('aria-pressed', 'true'); b.textContent = t('voce.ferma'); }
  });
  return b;
}
