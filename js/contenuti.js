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

// Le domande del quiz dell'ortolano (data/it/quiz.json), o null.
export async function quiz() {
  const [base, extra] = await Promise.all([json(`data/${lingua}/quiz.json`), json(`data/${lingua}/quiz-extra.json`)]);
  if (!base && !extra) return null;
  return { versione: 1, domande: [...(base?.domande ?? []), ...(extra?.domande ?? [])] };
}

// Le curiosità di «Lo sapevi?» (data/it/curiosita.json), o null.
export async function curiosita() {
  return json(`data/${lingua}/curiosita.json`);
}

// Lombricoltura, api e pollaio (data/it/animali.json), o null.
export async function animali() {
  return json(`data/${lingua}/animali.json`);
}

// Coltivazioni particolari e da rendita (data/it/rendita.json), o null.
export async function rendita() {
  return json(`data/${lingua}/rendita.json`);
}

// Le fasi di vita delle colture (data/it/fasi.json), o null.
export async function fasi() {
  return json(`data/${lingua}/fasi.json`);
}

// Alberi da frutto e vite (data/it/alberi.json), o null.
export async function alberi() {
  return json(`data/${lingua}/alberi.json`);
}

// Quando e come si raccoglie e si conserva ogni coltura (data/it/raccolta.json), o null.
export async function raccolta() {
  return json(`data/${lingua}/raccolta.json`);
}

// Freddo, gelo e fine stagione di ogni coltura (data/it/stagione.json), o null.
export async function stagione() {
  return json(`data/${lingua}/stagione.json`);
}

// Come far sopravvivere una coltura all'inverno: all'aperto, talee, riparo (data/it/sopravvivenza.json), o null.
export async function sopravvivenza() {
  return json(`data/${lingua}/sopravvivenza.json`);
}
