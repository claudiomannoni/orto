// «Scarica l'app»: l'invito a installare l'app sul telefono.
// Su Android (Chrome) il browser offre l'installazione con un evento: qui lo si tiene da parte
// e lo si usa quando si tocca il pulsante. Su iPhone non c'è: si spiegano i due tocchi.
import { el, sostituisci } from '../util.js';
import { t } from '../i18n.js';
import { leggi, imposta } from '../store/impostazioni.js';
import { toast } from './toast.js';

const GIORNI_DI_PAUSA = 7;
let richiesta = null;
const ascoltatori = new Set();

let appenaInstallata = false;
export const giaInstallata = () => appenaInstallata || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const suIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Da registrare appena parte l'app: l'evento arriva presto e una volta sola.
window.addEventListener('beforeinstallprompt', (evento) => {
  evento.preventDefault();
  richiesta = evento;
  ascoltatori.forEach((f) => f());
});
window.addEventListener('appinstalled', () => {
  richiesta = null;
  appenaInstallata = true;
  ascoltatori.forEach((f) => f());
});

async function installa() {
  if (!richiesta) return;
  const evento = richiesta;
  richiesta = null;
  try {
    await evento.prompt();
    const scelta = await evento.userChoice;
    if (scelta?.outcome === 'accepted') { appenaInstallata = true; toast(t('installa.fatto')); }
  } catch (errore) {
    console.warn('Installazione non partita', errore);
  }
  ascoltatori.forEach((f) => f());
}

const inPausa = (rimandato) => {
  if (!rimandato) return false;
  const giorni = (Date.now() - Date.parse(rimandato)) / 86400000;
  return giorni >= 0 && giorni < GIORNI_DI_PAUSA;
};

// Il riquadro «Scarica l'app». rimandabile: aggiunge «Non ora», che lo nasconde per una settimana.
// Sparisce da solo se l'app è già installata.
export function bloccoInstalla({ rimandabile = false } = {}) {
  const radice = el('section', { class: 'card installa', hidden: true });
  let disegnato = false;

  const disegna = async () => {
    if (disegnato && !radice.isConnected) { ascoltatori.delete(disegna); return; }
    disegnato = true;
    if (giaInstallata()) { radice.hidden = true; return; }
    if (rimandabile && inPausa((await leggi()).installa_rimandato)) { radice.hidden = true; return; }
    sostituisci(radice,
      el('h3', {}, t('installa.titolo')),
      el('p', {}, t('installa.spiega')),
      richiesta
        ? el('button', { class: 'btn primario grande', type: 'button', onclick: installa }, t('installa.bottone'))
        : el('p', { class: 'aiuto' }, suIphone() ? t('installa.iphone') : t('installa.android')),
      rimandabile ? el('button', {
        class: 'btn pericolo', type: 'button',
        onclick: async () => { await imposta('installa_rimandato', new Date().toISOString()); radice.hidden = true; },
      }, t('installa.dopo')) : null,
    );
    radice.hidden = false;
  };

  ascoltatori.add(disegna);
  disegna();
  return radice;
}
