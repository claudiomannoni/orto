// Backup in un file JSON. Formato 3 (docs/schema-dati.md: aggiunge produzioni e movimenti); si leggono anche
// i formati 2 e 1 e un semplice elenco di colture.
import { tutte, sostituisci } from './db.js';
import { leggi as leggiImpostazioni, imposta, pubbliche, PRIVATE } from './impostazioni.js';
import { normalizzaColtura } from './dati.js';
import { dataValida, nuovoId } from '../util.js';
import { elencoFoto, normalizzaFoto } from './foto.js';
import { pulisciProduzione, pulisciMovimento } from '../motore/produzioni.js';
import { migraProduzioni } from './produzioni.js';
import { blobInDataUrl, dataUrlInBlob } from '../ui/foto.js';

// conFoto: aggiunge anche le foto del diario (come data URL: il file diventa grande).
export async function creaBackup({ conFoto = false } = {}) {
  const [impostazioni, colture, zone, eventi, produzioni, movimenti] = await Promise.all([
    leggiImpostazioni(), tutte('colture'), tutte('zone'), tutte('eventi'), tutte('produzioni'), tutte('movimenti'),
  ]);
  const backup = {
    formato: 'orto-backup',
    versione: 3,
    esportato: new Date().toISOString(),
    impostazioni: pubbliche(impostazioni),
    colture,
    zone,
    eventi,
    produzioni,
    movimenti,
  };
  if (conFoto) {
    const foto = await elencoFoto();
    backup.foto = await Promise.all(foto.map(async (f) => ({ ...f, immagine: await blobInDataUrl(f.immagine) })));
  }
  return backup;
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
  // Le foto ci sono solo nel backup «con foto»: senza, quelle già nel diario restano dove sono.
  let foto = null;
  if (Array.isArray(dati.foto)) {
    foto = dati.foto.map((f) => (f && typeof f === 'object' ? normalizzaFoto({ ...f, immagine: dataUrlInBlob(f.immagine) }) : null)).filter(Boolean);
  }
  // I lotti e i movimenti ci sono solo dal formato 3: nei backup più vecchi sono null e verranno ricostruiti dai raccolti e dall'eccesso.
  const produzioni = Array.isArray(dati.produzioni) ? dati.produzioni.map(pulisciProduzione).filter(Boolean) : null;
  const movimenti = Array.isArray(dati.movimenti) ? dati.movimenti.map(pulisciMovimento).filter(Boolean) : null;
  return {
    colture: colture.map(normalizzaColtura),
    zone: elenco(dati.zone),
    eventi: elenco(dati.eventi),
    foto,
    produzioni,
    movimenti,
    impostazioni,
  };
}

// Sostituisce colture, zone ed eventi (e le foto, se il backup le ha); le impostazioni del backup si aggiungono
// a quelle attuali (la chiave IA, che non è nel backup, resta com'è).
export async function applica(dati) {
  const conLotti = Array.isArray(dati.produzioni);
  await sostituisci({
    colture: dati.colture, zone: dati.zone, eventi: dati.eventi, ...(dati.foto ? { foto: dati.foto } : {}),
    // formato 3: i lotti del backup; formati vecchi: si svuotano e si ricostruiscono dai raccolti e dall'eccesso ripristinati
    produzioni: conLotti ? dati.produzioni : [], movimenti: conLotti && Array.isArray(dati.movimenti) ? dati.movimenti : [],
  });
  for (const [chiave, valore] of Object.entries(dati.impostazioni)) await imposta(chiave, valore);
  await imposta('migrazione_produzioni', conLotti ? 1 : null);
  if (!conLotti) await migraProduzioni();
}
