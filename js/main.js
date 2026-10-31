// Avvio dell'app: traduzioni, testata, barra in basso, schermate.
import { caricaTesti, t } from './i18n.js';
import { leggi, imposta, assicuraIdentita } from './store/impostazioni.js';
import { isoLocale } from './util.js';
import { impostaLingua } from './contenuti.js';
import { inizializzaProgressi } from './store/progressi.js';
import { costruisciTestata, costruisciBarra, aggiornaBarra, ROTTE, SOTTOROTTE } from './ui/nav.js';
import { toast } from './ui/toast.js';
import { impostaVestiti } from './ui/mascotte.js';
import './ui/installa.js'; // ascolta subito l'offerta di installazione del browser

const schermate = {
  oggi: () => import('./screens/oggi.js'),
  calendario: () => import('./screens/calendario.js'),
  colture: () => import('./screens/colture.js'),
  impostazioni: () => import('./screens/impostazioni.js'),
  benvenuto: () => import('./screens/benvenuto.js'),
  zone: () => import('./screens/zone.js'),
  diario: () => import('./screens/diario.js'),
};

const contenitore = document.getElementById('schermata');
const barra = document.getElementById('barra');

// Il primo avvio guidato non sta nella barra in basso: si apre da solo la prima volta
// e da Impostazioni quando si vuole rifarlo.
const PRIMO_AVVIO = 'benvenuto';
let rottaCorrente = null;

async function primoAvvioDaFare() {
  try {
    return !(await leggi()).primo_avvio_fatto;
  } catch (errore) {
    console.error(errore);
    return false;
  }
}

async function mostra() {
  const richiesta = location.hash.replace(/^#\//, '').split('?')[0];
  const rotta = ROTTE.includes(richiesta) || richiesta in SOTTOROTTE || richiesta === PRIMO_AVVIO ? richiesta : 'oggi';
  if (rotta !== PRIMO_AVVIO && await primoAvvioDaFare()) {
    location.replace(`#/${PRIMO_AVVIO}`);
    return;
  }
  rottaCorrente = rotta;
  barra.hidden = rotta === PRIMO_AVVIO;
  aggiornaBarra(barra, SOTTOROTTE[rotta] ?? rotta);
  contenitore.replaceChildren();
  try {
    const modulo = await schermate[rotta]();
    await modulo.monta(contenitore, { alTermine: () => { location.hash = '#/oggi'; } });
  } catch (errore) {
    console.error(errore);
    toast(t('errore.generico'));
  }
  window.scrollTo(0, 0);
}

async function avvia() {
  let lingua = 'it';
  try {
    await assicuraIdentita();
    let iniziali = await leggi();
    // Chi usava già l'app ha il «compleanno dell'orto» dal primo giorno in cui lo riapre.
    if (iniziali.primo_avvio_fatto && !iniziali.orto_nato) {
      await imposta('orto_nato', isoLocale(new Date()));
      iniziali = await leggi();
    }
    lingua = iniziali.lingua || 'it';
    impostaVestiti(iniziali.vestiti, iniziali.orto_nato);
    impostaLingua(lingua); // i contenuti (traguardi, battute...) si leggono nella lingua giusta
    await inizializzaProgressi();
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
  // Non durante il primo avvio: ripartirebbe dalla prima domanda.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && rottaCorrente !== PRIMO_AVVIO) mostra();
  });
  await mostra();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((errore) => console.warn('Service worker non registrato', errore));
  }
}

avvia();
