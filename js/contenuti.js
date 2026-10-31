// Contenuti agronomici (cartella data/<lingua>/): zone, schede coltura, glossario.
// Se un file manca o non si apre, si ottiene un elenco vuoto: l'app funziona lo stesso.
import { normalizza } from './util.js';

let lingua = 'it';
const memoria = new Map();

export function impostaLingua(nuova) {
  lingua = nuova;
  memoria.clear();
}

async function json(percorso) {
  if (memoria.has(percorso)) return memoria.get(percorso);
  try {
    const risposta = await fetch(percorso);
    if (!risposta.ok) return null;
    const valore = await risposta.json();
    memoria.set(percorso, valore);
    return valore;
  } catch {
    return null;
  }
}

export async function zone() {
  return (await json(`data/${lingua}/zone-climatiche.json`))?.zone ?? [];
}

export async function catalogo() {
  const indice = await json(`data/${lingua}/colture/indice.json`);
  const schede = await Promise.all((indice?.colture ?? []).map((id) => json(`data/${lingua}/colture/${id}.json`)));
  return schede.filter(Boolean);
}

// Restituisce un oggetto { id: termine }.
export async function glossario() {
  const dati = await json(`data/${lingua}/glossario.json`);
  return Object.fromEntries((dati?.termini ?? []).map((termine) => [termine.id, termine]));
}

// Amiche, nemiche e rotazioni fra le colture (data/it/consociazioni.json), o null se il file non c'è.
export async function consociazioni() {
  return json(`data/${lingua}/consociazioni.json`);
}

// Livelli e traguardi (data/it/traguardi.json), o null.
export async function traguardi() {
  return json(`data/${lingua}/traguardi.json`);
}

// Le battute dei vermetti per stagioni, feste e tocchi, o null.
export async function battute() {
  return json(`data/${lingua}/battute.json`);
}

// Contenuti per capire il terreno (questionario, piante indicatrici, test del barattolo, consigli), o null.
export async function terreno() {
  return json(`data/${lingua}/terreno.json`);
}

export function trovaScheda(schede, nome) {
  const cercato = normalizza(nome);
  if (!cercato) return null;
  return schede.find((s) => [s.id, s.nome, ...(s.alias ?? [])].some((x) => normalizza(x) === cercato)) ?? null;
}
