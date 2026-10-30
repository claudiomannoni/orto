// Colture ed eventi dell'utente. Formato in docs/schema-dati.md.
import { tutte, salva, elimina } from './db.js';
import { nuovoId } from '../util.js';

export const SCHEMA = 2;

const testo = (v) => (typeof v === 'string' ? v : '');

// Rende una coltura (nuova, vecchia o importata) nel formato attuale.
export function normalizzaColtura(c) {
  return {
    id: testo(c.id) || nuovoId(),
    nome: testo(c.nome).trim(),
    varieta: testo(c.varieta).trim(),
    dataSemina: c.dataSemina,
    dove: c.dove === 'orto' ? 'orto' : 'semenzaio',
    note: testo(c.note).trim(),
    creata: testo(c.creata) || new Date().toISOString(),
    schedaId: testo(c.schedaId) || null,
    zonaId: testo(c.zonaId) || null,
    schemaVersion: SCHEMA,
  };
}

export const elencoColture = () => tutte('colture');
export const salvaColtura = (coltura) => salva('colture', coltura);
export const eliminaColtura = (id) => elimina('colture', id);

// Un evento è ciò che succede nell'orto: un lavoro fatto o saltato, una nota...
// Nasce sempre con zona, coltura, data ed esito. "condivisibile" resta false:
// la condivisione per zona, con consenso, è un'idea futura.
export function nuovoEvento({ tipo, zonaId = null, colturaId = null, schedaId = null, lavoroId = null, data, esito, note = '' }) {
  return {
    id: nuovoId(),
    tipo,
    zonaId,
    colturaId,
    schedaId,
    lavoroId,
    data,
    esito,
    note,
    creato: new Date().toISOString(),
    condivisibile: false,
  };
}

export const elencoEventi = () => tutte('eventi');
export const registraEvento = (evento) => salva('eventi', evento);
