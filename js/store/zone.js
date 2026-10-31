// Zone di coltivazione dell'utente (aiuole e terreni). Formato in docs/schema-dati.md.
// Non sono la zona climatica (impostazione "zona"): sono i posti dove si coltiva.
import { tutte, salva, elimina } from './db.js';
import { nuovoId } from '../util.js';

export const SCHEMA_ZONA = 3;

const testo = (v) => (typeof v === 'string' ? v : '');
const positivo = (v) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

export function superficie(lunghezza, larghezza) {
  return lunghezza && larghezza ? Math.round(lunghezza * larghezza * 10) / 10 : null;
}

// Gradi 0-359 (0 = nord) oppure null.
export function normalizzaGradi(v) {
  const n = typeof v === 'number' ? v : Number(v);
  if (v === null || v === undefined || v === '' || !Number.isFinite(n)) return null;
  return ((Math.round(n) % 360) + 360) % 360;
}

// Rende una zona (nuova, parziale o importata) nel formato attuale.
export function normalizzaZona(z) {
  const lunghezza = positivo(z.misure?.lunghezza_m);
  const larghezza = positivo(z.misure?.larghezza_m);
  return {
    id: testo(z.id) || nuovoId(),
    nome: testo(z.nome).trim(),
    tipo: z.tipo === 'terreno' ? 'terreno' : 'aiuola',
    stato: z.stato === 'da_preparare' ? 'da_preparare' : 'coltivata',
    misure: { lunghezza_m: lunghezza, larghezza_m: larghezza },
    superficie_mq: superficie(lunghezza, larghezza),
    esposizione: { gradi: normalizzaGradi(z.esposizione?.gradi) },
    terreno: z.terreno && typeof z.terreno === 'object' ? z.terreno : null,
    note: testo(z.note).trim(),
    creata: testo(z.creata) || new Date().toISOString(),
    schemaVersion: SCHEMA_ZONA,
  };
}

export async function elencoZone() {
  return (await tutte('zone')).map(normalizzaZona);
}
export const salvaZona = (zona) => salva('zone', zona);
export const eliminaZona = (id) => elimina('zone', id);

// Le otto direzioni: 0 = nord, in senso orario.
export const DIREZIONI = ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ovest', 'ovest', 'nord-ovest'];
export const direzioneDa = (gradi) => DIREZIONI[Math.round(gradi / 45) % 8];
