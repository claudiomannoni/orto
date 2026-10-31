// Livelli e traguardi dell'utente: si controllano dopo ogni cosa fatta e si festeggia quando c'è una novità.
import { tutte } from './db.js';
import { leggi, imposta } from './impostazioni.js';
import { traguardi as caricaTraguardi } from '../contenuti.js';
import { valuta, novita } from '../motore/progressi.js';
import { isoLocale } from '../util.js';
import { toast } from '../ui/toast.js';
import { t } from '../i18n.js';
import { festeggia } from '../ui/mascotte.js';

const PAUSA_FESTEGGIAMENTO = 1300;

async function leggiTutto() {
  const [eventi, colture, zone, foto, impostazioni] = await Promise.all([tutte('eventi'), tutte('colture'), tutte('zone'), tutte('foto'), leggi()]);
  return { eventi, colture, zone, foto: foto.map(({ id, data, diagnosi }) => ({ id, data, diagnosi })), quiz: impostazioni.quiz_risultati ?? {} }; // non servono le immagini
}

// Lo stato attuale (punti, livello, traguardi raggiunti), senza salvare né festeggiare.
export async function statoProgressi() {
  const dati = await caricaTraguardi();
  if (!dati) return null;
  return { dati, ...valuta(await leggiTutto(), dati) };
}

// Da chiamare all'apertura dell'app: chi usava già l'app ha subito i traguardi che si è guadagnato, senza festeggiare tutto insieme.
export async function inizializzaProgressi() {
  const s = await leggi();
  if (s.traguardi) return;
  const stato = await statoProgressi();
  if (!stato) return;
  await imposta('traguardi', Object.fromEntries(stato.raggiunti.map((id) => [id, isoLocale(new Date())])));
  await imposta('livello_raggiunto', stato.livello?.id ?? 1);
}

// Da chiamare dopo un lavoro fatto, una coltura, una zona, una foto: salva le novità e fa festeggiare i vermetti.
// Non lancia mai errori: i progressi sono un di più, non devono rompere quello che l'utente sta facendo.
export async function controllaProgressi() {
  try {
    const s = await leggi();
    const stato = await statoProgressi();
    if (!stato) return null;
    const gia = s.traguardi ?? {};
    const { nuovi, livelloSalito } = novita(gia, stato, { livelloPrecedente: s.livello_raggiunto ?? stato.livello?.id ?? 1 });
    if (!nuovi.length && !livelloSalito) return { ...stato, nuovi, livelloSalito };
    const adesso = isoLocale(new Date());
    await imposta('traguardi', { ...gia, ...Object.fromEntries(nuovi.map((id) => [id, adesso])) });
    await imposta('livello_raggiunto', stato.livello?.id ?? 1);
    // Il messaggio dice tutto quello che c'è di nuovo (un traguardo e magari anche il livello); i vermetti festeggiano
    // il livello se è salito, altrimenti il traguardo.
    const messaggi = [];
    if (nuovi.length) messaggi.push(t('progressi.traguardo_nuovo', { titolo: stato.dati.traguardi.find((x) => x.id === nuovi[0])?.titolo ?? '' }));
    if (livelloSalito) messaggi.push(t('progressi.livello_nuovo', { nome: stato.livello.nome }));
    // Un attimo dopo, così non copre il messaggio dell'azione appena fatta («Coltura aggiunta», «Segnato come fatto»).
    setTimeout(() => {
      toast(messaggi.join(' · '));
      if (livelloSalito) {
        const chi = Math.random() < 0.5 ? 'rosso' : 'rossella';
        festeggia('livello', { chi, testo: stato.livello[chi] }); // la battuta del livello raggiunto, detta da uno dei due
      } else {
        festeggia('traguardo');
      }
    }, PAUSA_FESTEGGIAMENTO);
    return { ...stato, nuovi, livelloSalito };
  } catch (errore) {
    console.warn('Progressi non aggiornati', errore);
    return null;
  }
}
