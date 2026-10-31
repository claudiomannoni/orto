// Impostazioni dell'utente: coppie chiave/valore nello store "impostazioni".
import { tutte, salva, elimina } from './db.js';

export const PREDEFINITE = {
  zona: 'castelli-romani',
  metodo: 'nessuno',
  esperienza: 'principiante',
  nome_orto: '',
  nome_coltivatore: '',
  coltivatore_id: null,
  superficie_mq: null,
  acqua: null,
  tempo: null,
  lingua: 'it',
  ai_provider: 'gemini',
  ai_modello: 'gemini-2.5-flash',
  primo_avvio_fatto: false,
};

// Chiavi che non escono mai dal telefono: niente backup, niente condivisione.
export const PRIVATE = ['ai_chiave'];

export async function leggi() {
  const righe = await tutte('impostazioni');
  const impostazioni = { ...PREDEFINITE };
  for (const riga of righe) impostazioni[riga.chiave] = riga.valore;
  return impostazioni;
}

export const imposta = (chiave, valore) => salva('impostazioni', { chiave, valore });

// Nome dell'orto o del coltivatore: spazi ripuliti, niente caratteri di controllo, lunghezza limitata.
export function pulisciNome(testo, massimo = 40) {
  return String(testo ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, massimo);
}

// Un identificativo anonimo del coltivatore, creato la prima volta e tenuto sul telefono.
// Non contiene niente di personale: serve solo se un giorno ci saranno account o scambi (con consenso).
export async function assicuraIdentita() {
  const attuali = await leggi();
  if (attuali.coltivatore_id) return attuali.coltivatore_id;
  const id = crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  await imposta('coltivatore_id', id);
  return id;
}
export const rimuovi = (chiave) => elimina('impostazioni', chiave);

export function pubbliche(impostazioni) {
  return Object.fromEntries(Object.entries(impostazioni).filter(([chiave]) => !PRIVATE.includes(chiave)));
}
