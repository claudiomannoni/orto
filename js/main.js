// Avvio dell'app: traduzioni, testata, barra in basso, schermate.
import { caricaTesti, t } from './i18n.js';
import { leggi, imposta, assicuraIdentita } from './store/impostazioni.js';
import { isoLocale, oggiISO } from './util.js';
import { giorniDiAssenza } from './motore/assenza.js';
import { impostaLingua } from './contenuti.js';
import { inizializzaProgressi } from './store/progressi.js';
import { costruisciTestata, costruisciBarra, aggiornaBarra, aggiornaTestata, ROTTE, SOTTOROTTE } from './ui/nav.js';
import { toast } from './ui/toast.js';
import { mostraGuida } from './ui/guida.js';
import { migraProduzioni } from './store/produzioni.js';
import { controllaAggiornamenti } from './ui/aggiornamento.js';
import { impostaGiorniAssenza } from './ui/sessione.js';
import { impostaVestiti, impostaPioggia } from './ui/mascotte.js';
import { pioveOggiDaCache } from './meteo.js';
import { applicaAccessibilita } from './ui/accessibilita.js';
import { elencoColture } from './store/dati.js';
import './ui/installa.js'; // ascolta subito l'offerta di installazione del browser

const schermate = {
  oggi: () => import('./screens/oggi.js'),
  calendario: () => import('./screens/calendario.js'),
  colture: () => import('./screens/colture.js'),
  impostazioni: () => import('./screens/impostazioni.js'),
  benvenuto: () => import('./screens/benvenuto.js'),
  zone: () => import('./screens/zone.js'),
  impara: () => import('./screens/impara.js'),
  scopri: () => import('./screens/scopri.js'),
  erbe: () => import('./screens/erbe.js'),
  quiz: () => import('./screens/quiz.js'),
  chiedi: () => import('./screens/chiedi.js'),
  raccolto: () => import('./screens/raccolto.js'),
  animali: () => import('./screens/animali.js'),
  semi: () => import('./screens/semi.js'),
  eccesso: () => import('./screens/eccesso.js'),
  pianta: () => import('./screens/pianta.js'),
  piano: () => import('./screens/piano.js'),
  alberi: () => import('./screens/alberi.js'),
  vermi: () => import('./screens/vermi.js'),
  rendita: () => import('./screens/rendita.js'),
  cucina: () => import('./screens/cucina.js'),
  dottore: () => import('./screens/dottore.js'),
  coltura: () => import('./screens/scheda.js'),
  diario: () => import('./screens/diario.js'),
  storia: () => import('./screens/storia.js'),
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
  const parametri = new URLSearchParams(location.hash.split('?')[1] ?? '');
  if (rotta === 'coltura' && parametri.has('id')) {
    const coltura = (await elencoColture()).find((c) => c.schedaId === parametri.get('id'));
    if (coltura) { location.replace(`#/pianta?id=${encodeURIComponent(coltura.id)}&scheda=scheda`); return; }
  }
  // Il piano (#/piano?zona=…) resta una schermata a parte: ridirigolo alla scheda «Piano» della pianta
  // era un clic in cerchio, perché quella scheda non mostra il piano ma solo il collegamento qui.
  if (rotta !== PRIMO_AVVIO && await primoAvvioDaFare()) {
    location.replace(`#/${PRIMO_AVVIO}`);
    return;
  }
  rottaCorrente = rotta;
  barra.hidden = rotta === PRIMO_AVVIO;
  document.body.classList.toggle('gioco-pieno', rotta === 'vermi'); // il gioco dei vermi occupa tutto lo schermo
  aggiornaBarra(barra, SOTTOROTTE[rotta] ?? rotta);
  aggiornaTestata(rotta);
  contenitore.replaceChildren();
  try {
    const modulo = await schermate[rotta]();
    await modulo.monta(contenitore, { alTermine: () => { location.hash = '#/oggi'; } });
    if (rottaCorrente === rotta) aggiornaTestata(rotta, contenitore);
    if (rottaCorrente === rotta) await mostraGuida(rotta, contenitore);
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
    applicaAccessibilita(iniziali);
    impostaVestiti(iniziali.vestiti, iniziali.orto_nato);
    impostaLingua(lingua); // i contenuti (traguardi, battute...) si leggono nella lingua giusta
    await inizializzaProgressi();
    await migraProduzioni(); // raccolti ed eccesso diventano lotti di produzione (una volta sola, senza cancellare niente)
  } catch (errore) {
    console.error(errore);
  }
  await caricaTesti(lingua);
  impostaLingua(lingua);
  document.title = t('app.nome');
  costruisciTestata(document.getElementById('testata'));
  costruisciBarra(barra);
  // Da quanti giorni non si apriva l'app: i vermetti danno il bentornato in «Oggi».
  try {
    const prima = await leggi();
    const oggi = oggiISO();
    impostaGiorniAssenza(prima.primo_avvio_fatto ? giorniDiAssenza(prima.ultimo_uso, oggi) : 0);
    await imposta('ultimo_uso', oggi);
  } catch (errore) {
    console.error(errore);
  }
  window.addEventListener('hashchange', mostra);
  // Tornando all'app dopo un po' (magari il giorno dopo) i giorni si aggiornano.
  // Non durante il primo avvio: ripartirebbe dalla prima domanda.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && rottaCorrente !== PRIMO_AVVIO) mostra();
  });
  await mostra();
  // Se le ultime previsioni dicono che piove, i vermetti hanno già l'ombrello (poi «Oggi» le aggiorna).
  pioveOggiDaCache().then(impostaPioggia).catch(() => {});

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then((registrazione) => controllaAggiornamenti(registrazione)).catch((errore) => console.warn('Service worker non registrato', errore));
  }
}

avvia();
