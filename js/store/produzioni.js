// Lotti di produzione e movimenti, sul telefono (IndexedDB, archivi `produzioni` e `movimenti`, dalla versione 4 del database).
// La matematica sta in js/motore/produzioni.js; qui si legge, si salva e si migrano i dati vecchi (raccolti ed eccesso) senza perderli.
import { tutte, salva, ottieni, elimina } from './db.js';
import { leggi, imposta } from './impostazioni.js';
import { pulisciProduzione, pulisciMovimento, puoRegistrare, lottoDaRaccolto, daEccesso } from '../motore/produzioni.js';
import { nuovoId, oggiISO } from '../util.js';

const VERSIONE_MIGRAZIONE = 1;

export const elencoProduzioni = async () => (await tutte('produzioni')).map(pulisciProduzione).filter(Boolean);
export const elencoMovimenti = async () => (await tutte('movimenti')).map(pulisciMovimento).filter(Boolean);

// Salva un lotto nuovo o modificato; restituisce il lotto pulito o null se non è valido.
export async function salvaProduzione(grezzo) {
  const lotto = pulisciProduzione(grezzo);
  if (!lotto) return null;
  await salva('produzioni', lotto);
  return lotto;
}

// Nuovo lotto con id generato (per «Registra produzione»).
export const nuovoLotto = (campi) => pulisciProduzione({ id: nuovoId(), data: oggiISO(), origine: { tipo: 'manuale' }, proprieta: {}, note: '', ...campi });

// Registra un movimento (consumo, riserva, cessione...) solo se le quantità lo permettono.
// Restituisce { ok: true, movimento } oppure { ok: false, motivo } (chiave di traduzione).
export async function registraMovimento({ produzioneId, tipo, quantita, data = oggiISO(), annuncioId = null, controparte = '', note = '' }) {
  const lotto = pulisciProduzione(await ottieni('produzioni', produzioneId));
  const movimento = pulisciMovimento({ id: nuovoId(), produzioneId, tipo, quantita, data, annuncioId, controparte, note });
  if (!lotto || !movimento) return { ok: false, motivo: 'produzione.errore.movimento' };
  const movimenti = (await elencoMovimenti()).filter((m) => m.produzioneId === produzioneId);
  const esito = puoRegistrare(lotto, movimenti, movimento);
  if (!esito.ok) return esito;
  await salva('movimenti', movimento);
  return { ok: true, movimento };
}

// Porta nei nuovi archivi i dati di prima: ogni raccolto diventa un lotto, ogni voce dell'eccesso un lotto con la sua cessione.
// Non tocca e non cancella gli eventi né la lista dell'eccesso; gli id sono deterministici (raccolto:<id>, eccesso:<id>),
// quindi un lotto già presente non si duplica né si riscrive. Si fa una volta sola (segnata nelle impostazioni).
export async function migraProduzioni() {
  const impostazioni = await leggi();
  if (impostazioni.migrazione_produzioni === VERSIONE_MIGRAZIONE) return { fatta: false, lotti: 0, movimenti: 0 };
  let lotti = 0;
  let movimenti = 0;
  for (const evento of await tutte('eventi')) {
    const lotto = lottoDaRaccolto(evento);
    if (lotto && !(await ottieni('produzioni', lotto.id))) { await salva('produzioni', lotto); lotti += 1; }
  }
  for (const voce of Array.isArray(impostazioni.eccesso) ? impostazioni.eccesso : []) {
    const convertita = daEccesso(voce);
    if (!convertita || (await ottieni('produzioni', convertita.produzione.id))) continue;
    await salva('produzioni', convertita.produzione);
    lotti += 1;
    for (const m of convertita.movimenti) { await salva('movimenti', m); movimenti += 1; }
  }
  await imposta('migrazione_produzioni', VERSIONE_MIGRAZIONE);
  return { fatta: true, lotti, movimenti };
}

// Toglie un lotto e tutti i suoi movimenti (per esempio quando si cancella il raccolto da cui era nato).
export async function eliminaProduzione(id) {
  for (const m of await tutte('movimenti')) if (m && m.produzioneId === id) await elimina('movimenti', m.id);
  await elimina('produzioni', id);
}
