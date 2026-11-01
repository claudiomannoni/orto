// Aggiornamenti dell'app: quando arriva una versione nuova (il service worker cambia) compare un avviso con «Aggiorna ora».
// Senza, il telefono continua a mostrare la versione vecchia fino alla riapertura successiva.
import { el } from '../util.js';
import { t } from '../i18n.js';

export function controllaAggiornamenti(registrazione) {
  // c'era già un service worker al caricamento? Allora un cambio di controllore vuol dire «versione nuova pronta»
  const giaControllata = Boolean(navigator.serviceWorker.controller);
  let mostrato = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!giaControllata || mostrato) return;
    mostrato = true;
    const avviso = el('div', { class: 'aggiornamento', role: 'status' },
      el('span', {}, t('aggiornamento.pronto')),
      el('button', { class: 'btn primario', type: 'button', onclick: () => location.reload() }, t('aggiornamento.ora')),
      el('button', { class: 'btn', type: 'button', onclick: () => avviso.remove() }, t('aggiornamento.dopo')));
    document.body.append(avviso);
  });
  // ogni volta che si torna sull'app, e subito all'avvio, si chiede se c'è una versione nuova
  const chiedi = () => registrazione?.update?.().catch(() => {});
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') chiedi(); });
  chiedi();
}
