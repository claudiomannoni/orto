// Foto in campo: Rossella guarda il terreno e le erbe spontanee e propone cosa vede.
// Tutto il codice IA sta qui e in gemini.js/ai.js. Le risposte dell'IA sono proposte da verificare:
// qui si controllano e si ripuliscono, e l'utente conferma (mai in automatico).
import { chiedi } from './ai.js';
import { leggi, imposta } from '../store/impostazioni.js';
import { oggiISO } from '../util.js';

export const MASSIMO_FOTO = 3;
export const FOTO_AL_GIORNO = 10; // un tetto, per non finire la quota del piano gratuito

const CONFIDENZE = ['alta', 'media', 'bassa'];
const ASSI = { tessitura: ['sabbioso', 'medio', 'argilloso'], drenaggio: ['rapido', 'buono', 'lento'], humus: ['povero', 'medio', 'ricco'] };

function errore(codice, dettaglio) {
  return Object.assign(new Error(dettaglio || codice), { codice });
}

const taglia = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export function costruisciPrompt(indicatrici = []) {
  const elenco = indicatrici.map((p) => `- ${p.id}: ${p.nome}${p.nome_scientifico ? ` (${p.nome_scientifico})` : ''}`).join('\n');
  return [
    'Sei Rossella, una scienziata prudente. Guarda le foto scattate in un orto in Italia (collina vicino a Roma) e aiuta a capire il terreno.',
    'Le foto possono mostrare il terreno da vicino, le erbe spontanee che crescono lì, o l\'insieme.',
    '',
    'Regole:',
    '- Elenca solo le piante che vedi davvero e che riconosci. Se non sei sicura, mettile con confidenza "bassa" oppure non metterle. Non inventare mai.',
    '- Per ogni pianta, se corrisponde a una di questa lista, scrivi il suo id; altrimenti id null.',
    elenco || '(nessuna lista)',
    '- Per il terreno di\' solo quello che si vede: colore, grana, crepe, zolle, compattezza, umidità. Da una foto la tessitura è incerta: usa confidenza "bassa" salvo segni chiari. Se non si capisce, metti null.',
    '- Non fare diagnosi su malattie e non consigliare prodotti.',
    '- Scrivi in italiano semplice e breve.',
    '',
    'Rispondi SOLO con JSON, senza altro testo, in questo formato:',
    '{"piante":[{"nome":"nome comune","id":"id della lista oppure null","confidenza":"alta|media|bassa","perche":"cosa ti fa pensare questa pianta, max 100 caratteri"}],',
    '"terreno":null oppure {"tessitura":"sabbioso|medio|argilloso|null","drenaggio":"rapido|buono|lento|null","humus":"povero|medio|ricco|null","indizi":"cosa vedi, max 160 caratteri","confidenza":"alta|media|bassa"},',
    '"avvisi":"per esempio foto troppo scura o sfocata, max 120 caratteri, oppure stringa vuota"}',
  ].join('\n');
}

// Dalla risposta di Gemini (testo) a dati puliti. Lancia errore 'risposta' se non è JSON utilizzabile.
export function leggiRisposta(testo, indicatrici = []) {
  const grezzo = String(testo ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let dati;
  try {
    dati = JSON.parse(grezzo);
  } catch {
    throw errore('risposta', 'risposta non leggibile');
  }
  if (!dati || typeof dati !== 'object' || Array.isArray(dati)) throw errore('risposta', 'risposta non leggibile');
  const idNoti = new Set(indicatrici.map((p) => p.id));
  const confidenza = (c) => (CONFIDENZE.includes(c) ? c : 'bassa');

  const piante = (Array.isArray(dati.piante) ? dati.piante : [])
    .filter((p) => p && typeof p === 'object' && taglia(p.nome, 60))
    .slice(0, 12)
    .map((p) => ({
      nome: taglia(p.nome, 60),
      id: typeof p.id === 'string' && idNoti.has(p.id) ? p.id : null, // un id inventato non vale
      confidenza: confidenza(p.confidenza),
      perche: taglia(p.perche, 110),
    }));

  let terreno = null;
  if (dati.terreno && typeof dati.terreno === 'object') {
    const t = { indizi: taglia(dati.terreno.indizi, 170), confidenza: confidenza(dati.terreno.confidenza) };
    for (const [asse, valori] of Object.entries(ASSI)) t[asse] = valori.includes(dati.terreno[asse]) ? dati.terreno[asse] : null;
    if (t.indizi || Object.keys(ASSI).some((a) => t[a])) terreno = t;
  }
  return { piante, terreno, avvisi: taglia(dati.avvisi, 130) };
}

// Quante foto si possono ancora analizzare oggi.
export async function restantiOggi() {
  const { ai_foto_conteggio: conteggio } = await leggi();
  const usate = conteggio?.data === oggiISO() ? conteggio.n : 0;
  return Math.max(0, FOTO_AL_GIORNO - usate);
}

// immagini: [{ tipo, base64 }] già ridotte. indicatrici: le erbe di terreno.json (id, nome, nome_scientifico).
export async function analizzaFoto({ immagini, indicatrici = [] }) {
  if (!immagini?.length || immagini.length > MASSIMO_FOTO) throw errore('foto', 'numero di foto non valido');
  if (!(await restantiOggi())) throw errore('tetto');
  const risposta = await chiedi({ testo: costruisciPrompt(indicatrici), immagini, json: true });
  await registraUso(); // si conta solo se Google ha risposto: un errore di rete o di chiave non consuma il tetto
  return leggiRisposta(risposta, indicatrici);
}

// Una richiesta con foto in più per oggi (il tetto vale per tutte le funzioni con le foto).
export async function registraUso() {
  const { ai_foto_conteggio: c } = await leggi();
  await imposta('ai_foto_conteggio', { data: oggiISO(), n: (c?.data === oggiISO() ? c.n : 0) + 1 });
}

export { errore as erroreFoto, taglia as tagliaTesto };
