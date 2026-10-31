// Diario fotografico: le foto dell'utente, per zona e coltura. Restano sul telefono (IndexedDB).
// Formato in docs/schema-dati.md. L'immagine è un Blob JPEG; la miniatura un piccolo data URL per la griglia.
import { tutte, salva, elimina, ottieni } from './db.js';
import { nuovoId, dataValida } from '../util.js';

const testo = (v) => (typeof v === 'string' ? v : '');

export function nuovaFoto({ immagine, miniatura, larghezza = null, altezza = null, data, zonaId = null, colturaId = null, nota = '' }) {
  return {
    id: nuovoId(),
    data,
    creata: new Date().toISOString(),
    zonaId: testo(zonaId) || null,
    colturaId: testo(colturaId) || null,
    nota: testo(nota).trim().slice(0, 500),
    immagine,
    miniatura,
    larghezza,
    altezza,
    diagnosi: null,
    schemaVersion: 3,
  };
}

// Rende una foto (nuova, importata o parziale) nel formato attuale; null se non è utilizzabile.
export function normalizzaFoto(f) {
  if (!f || typeof f !== 'object' || !testo(f.id) || !dataValida(f.data) || !(f.immagine instanceof Blob)) return null;
  return {
    id: f.id,
    data: f.data,
    creata: testo(f.creata) || new Date().toISOString(),
    zonaId: testo(f.zonaId) || null,
    colturaId: testo(f.colturaId) || null,
    nota: testo(f.nota).trim().slice(0, 500),
    immagine: f.immagine,
    miniatura: testo(f.miniatura),
    larghezza: Number.isFinite(f.larghezza) ? f.larghezza : null,
    altezza: Number.isFinite(f.altezza) ? f.altezza : null,
    diagnosi: f.diagnosi && typeof f.diagnosi === 'object' ? f.diagnosi : null,
    schemaVersion: 3,
  };
}

export async function elencoFoto() {
  return (await tutte('foto')).map(normalizzaFoto).filter(Boolean);
}
export const leggiFoto = async (id) => normalizzaFoto(await ottieni('foto', id));
export const salvaFoto = (foto) => salva('foto', foto);
export const eliminaFoto = (id) => elimina('foto', id);

// Foto nell'ordine del diario: dalla più recente; a parità di data, l'ultima aggiunta per prima.
export const dallaPiuRecente = (a, b) => b.data.localeCompare(a.data) || b.creata.localeCompare(a.creata);
export const dallaPiuVecchia = (a, b) => a.data.localeCompare(b.data) || a.creata.localeCompare(b.creata);

// Filtra per zona e/o coltura (null = tutte).
export const filtra = (foto, { zonaId = null, colturaId = null } = {}) =>
  foto.filter((f) => (!zonaId || f.zonaId === zonaId) && (!colturaId || f.colturaId === colturaId));

// Raggruppa per mese "AAAA-MM", già in ordine dal più recente.
export function perMese(foto) {
  const gruppi = new Map();
  for (const f of [...foto].sort(dallaPiuRecente)) {
    const mese = f.data.slice(0, 7);
    if (!gruppi.has(mese)) gruppi.set(mese, []);
    gruppi.get(mese).push(f);
  }
  return [...gruppi].map(([mese, lista]) => ({ mese, foto: lista }));
}
