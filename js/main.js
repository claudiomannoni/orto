// Avvio dell'app: traduzioni, testata, barra in basso, schermate.
import { caricaTesti, t } from './i18n.js';
import { leggi } from './store/impostazioni.js';
import { impostaLingua } from './contenuti.js';
import { costruisciTestata, costruisciBarra, aggiornaBarra, ROTTE } from './ui/nav.js';
import { toast } from './ui/toast.js';

const schermate = {
  oggi: () => import('./screens/oggi.js'),
  colture: () => import('./screens/colture.js'),
  impostazioni: () => import('./screens/impostazioni.js'),
};

const contenitore = document.getElementById('schermata');
const barra = document.getElementById('barra');

async function mostra() {
  const richiesta = location.hash.replace(/^#\//, '');
  const rotta = ROTTE.includes(richiesta) ? richiesta : 'oggi';
  aggiornaBarra(barra, rotta);
  contenitore.replaceChildren();
  try {
    const modulo = await schermate[rotta]();
    await modulo.monta(contenitore);
  } catch (errore) {
    console.error(errore);
    toast(t('errore.generico'));
  }
  window.scrollTo(0, 0);
}

async function avvia() {
  let lingua = 'it';
  try {
    lingua = (await leggi()).lingua || 'it';
  } catch (errore) {
    console.error(errore);
  }
  await caricaTesti(lingua);
  impostaLingua(lingua);
  document.title = t('app.nome');
  costruisciTestata(document.getElementById('testata'));
  costruisciBarra(barra);
  window.addEventListener('hashchange', mostra);
  // Tornando all'app dopo un po' (magari il giorno dopo) i giorni si aggiornano.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') mostra();
  });
  await mostra();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((errore) => console.warn('Service worker non registrato', errore));
  }
}

avvia();
