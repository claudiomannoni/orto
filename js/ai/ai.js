// Unico punto d'ingresso per l'intelligenza artificiale. Il resto dell'app chiama
// solo questo file: un domani il provider potrà essere un server con abbonamento
// (aggiungendo un modulo come gemini.js) senza toccare altro.
import { leggi } from '../store/impostazioni.js';
import * as gemini from './gemini.js';

const PROVIDER = { gemini };

function errore(codice, dettaglio) {
  return Object.assign(new Error(dettaglio || codice), { codice });
}

export async function disponibile() {
  const impostazioni = await leggi();
  return Boolean(impostazioni.ai_chiave);
}

// testo: la domanda. immagine (facoltativa): { tipo: 'image/jpeg', base64: '...' }.
// Lancia un errore con codice: 'nochiave' | 'provider' | 'chiave' | 'modello' | 'quota' | 'rete' | 'altro'.
export async function chiedi({ testo, immagine }) {
  const impostazioni = await leggi();
  const provider = PROVIDER[impostazioni.ai_provider];
  if (!provider) throw errore('provider');
  if (!impostazioni.ai_chiave) throw errore('nochiave');
  return provider.chiedi({
    chiave: impostazioni.ai_chiave,
    modello: impostazioni.ai_modello,
    testo,
    immagine,
  });
}

// I modelli che la chiave dell'utente può usare adesso.
export async function modelliDisponibili() {
  const impostazioni = await leggi();
  const provider = PROVIDER[impostazioni.ai_provider];
  if (!provider) throw errore('provider');
  if (!impostazioni.ai_chiave) throw errore('nochiave');
  return provider.elencoModelli({ chiave: impostazioni.ai_chiave });
}

export async function provaChiave() {
  return chiedi({ testo: 'Rispondi con una sola parola: ok' });
}
