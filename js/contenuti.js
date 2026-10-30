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

export function trovaScheda(schede, nome) {
  const cercato = normalizza(nome);
  if (!cercato) return null;
  return schede.find((s) => [s.id, s.nome, ...(s.alias ?? [])].some((x) => normalizza(x) === cercato)) ?? null;
}
