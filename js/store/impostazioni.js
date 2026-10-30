// Impostazioni dell'utente: coppie chiave/valore nello store "impostazioni".
import { tutte, salva, elimina } from './db.js';

export const PREDEFINITE = {
  zona: 'castelli-romani',
  metodo: 'nessuno',
  esperienza: 'principiante',
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
export const rimuovi = (chiave) => elimina('impostazioni', chiave);

export function pubbliche(impostazioni) {
  return Object.fromEntries(Object.entries(impostazioni).filter(([chiave]) => !PRIVATE.includes(chiave)));
}
