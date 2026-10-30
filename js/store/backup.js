// Backup in un file JSON. Formato 2 (docs/schema-dati.md); si leggono anche
// il backup della prima versione e un semplice elenco di colture.
import { tutte, sostituisci } from './db.js';
import { leggi as leggiImpostazioni, imposta, pubbliche, PRIVATE } from './impostazioni.js';
import { normalizzaColtura } from './dati.js';
import { dataValida, nuovoId } from '../util.js';

export async function creaBackup() {
  const [impostazioni, colture, zone, eventi] = await Promise.all([
    leggiImpostazioni(), tutte('colture'), tutte('zone'), tutte('eventi'),
  ]);
  return {
    formato: 'orto-backup',
    versione: 2,
    esportato: new Date().toISOString(),
    impostazioni: pubbliche(impostazioni),
    colture,
    zone,
    eventi,
  };
}

export function scarica(backup, nomeFile) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeFile;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function errore(codice) {
  return Object.assign(new Error(codice), { codice });
}

const colturaValida = (c) => c && typeof c === 'object'
  && typeof c.nome === 'string' && c.nome.trim() && dataValida(c.dataSemina);

const conId = (r) => (r && typeof r === 'object' ? { ...r, id: typeof r.id === 'string' && r.id ? r.id : nuovoId() } : null);

// Legge e controlla un file di backup. Non scrive niente: restituisce i dati puliti,
// oppure lancia un errore con codice 'json' o 'formato'.
export async function leggiFile(file) {
  let dati;
  try {
    dati = JSON.parse(await file.text());
  } catch {
    throw errore('json');
  }
  const colture = Array.isArray(dati) ? dati : dati?.colture;
  if (!Array.isArray(colture) || !colture.every(colturaValida)) throw errore('formato');
  const elenco = (v) => (Array.isArray(v) ? v.map(conId).filter(Boolean) : []);
  const impostazioni = dati && typeof dati.impostazioni === 'object' && dati.impostazioni && !Array.isArray(dati.impostazioni)
    ? Object.fromEntries(Object.entries(dati.impostazioni).filter(([k]) => !PRIVATE.includes(k)))
    : {};
  return {
    colture: colture.map(normalizzaColtura),
    zone: elenco(dati.zone),
    eventi: elenco(dati.eventi),
    impostazioni,
  };
}

// Sostituisce colture, zone ed eventi; le impostazioni del backup si aggiungono
// a quelle attuali (la chiave IA, che non è nel backup, resta com'è).
export async function applica(dati) {
  await sostituisci({ colture: dati.colture, zone: dati.zone, eventi: dati.eventi });
  for (const [chiave, valore] of Object.entries(dati.impostazioni)) await imposta(chiave, valore);
}
