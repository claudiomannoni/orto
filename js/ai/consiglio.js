// «Chiedi a Rossella»: una domanda libera sull'orto, con il contesto dell'utente (zona, mese, colture, tempo).
// Parte solo testo, mai foto né nomi. La risposta è un consiglio da verificare: qui si controlla e si ripulisce.
import { chiedi } from './ai.js';
import { leggi, imposta } from '../store/impostazioni.js';
import { oggiISO } from '../util.js';
import { erroreFoto as errore, tagliaTesto as taglia } from './foto.js';

export const DOMANDE_AL_GIORNO = 20;
export const LUNGHEZZA_MASSIMA = 400;
const CERTEZZE = ['alta', 'media', 'bassa'];

// contesto: { zona, mese, metodo, colture: [nome], tempo: 'testo breve' o null }
export function costruisciPromptConsiglio(domanda, contesto = {}) {
  const colture = (contesto.colture ?? []).slice(0, 10).map((c) => taglia(c, 40)).filter(Boolean);
  return [
    'Sei Rossella, una scienziata prudente che aiuta chi coltiva un orto in Italia. Rispondi alla domanda dell\'utente.',
    `Contesto: zona ${taglia(contesto.zona, 60) || 'non indicata'}; mese ${taglia(contesto.mese, 20) || 'non indicato'}; metodo preferito ${taglia(contesto.metodo, 20) || 'nessuno'}.`,
    colture.length ? `Colture che l'utente ha in orto: ${colture.join(', ')}.` : 'L\'utente non ha ancora segnato colture.',
    contesto.tempo ? `Tempo di oggi: ${taglia(contesto.tempo, 120)}.` : null,
    '',
    'Regole:',
    '- Rispondi in italiano semplice, in massimo 6 frasi brevi. Dai prima la risposta, poi il perché.',
    '- Non inventare. Se non sei sicura o la risposta dipende da cose che non sai (terreno, varietà, luogo preciso), dillo e di\' cosa controllare.',
    '- NON consigliare prodotti, trattamenti chimici, dosi o ricette. Per problemi seri di salute delle piante di\' di sentire un tecnico (consorzio agrario o servizio fitosanitario regionale).',
    '- Se la domanda non riguarda orto, piante, terreno, acqua, clima o attrezzi, rispondi gentilmente che puoi aiutare solo con l\'orto.',
    '',
    'Rispondi SOLO con JSON, senza altro testo, in questo formato:',
    '{"risposta":"la risposta, max 700 caratteri","certezza":"alta|media|bassa","da_controllare":"una cosa che l\'utente può verificare, max 140 caratteri, oppure stringa vuota","chiedi_a_un_tecnico":true oppure false}',
    '',
    `Domanda dell'utente: ${taglia(domanda, LUNGHEZZA_MASSIMA)}`,
  ].filter((r) => r !== null).join('\n');
}

export function leggiConsiglio(testo) {
  const grezzo = String(testo ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let dati;
  try { dati = JSON.parse(grezzo); } catch { throw errore('risposta', 'risposta non leggibile'); }
  if (!dati || typeof dati !== 'object' || Array.isArray(dati)) throw errore('risposta', 'risposta non leggibile');
  const risposta = taglia(dati.risposta, 750);
  if (!risposta) throw errore('risposta', 'risposta vuota');
  return {
    risposta,
    certezza: CERTEZZE.includes(dati.certezza) ? dati.certezza : 'bassa',
    da_controllare: taglia(dati.da_controllare, 150),
    chiedi_a_un_tecnico: dati.chiedi_a_un_tecnico === true,
  };
}

export async function restantiOggi() {
  const { ai_testo_conteggio: c } = await leggi();
  return Math.max(0, DOMANDE_AL_GIORNO - (c?.data === oggiISO() ? c.n : 0));
}

export async function chiediARossella(domanda, contesto = {}) {
  const pulita = taglia(domanda, LUNGHEZZA_MASSIMA);
  if (pulita.length < 3) throw errore('domanda', 'domanda troppo corta');
  if (!(await restantiOggi())) throw errore('tetto');
  const risposta = await chiedi({ testo: costruisciPromptConsiglio(pulita, contesto), json: true });
  const { ai_testo_conteggio: c } = await leggi();
  await imposta('ai_testo_conteggio', { data: oggiISO(), n: (c?.data === oggiISO() ? c.n : 0) + 1 });
  return leggiConsiglio(risposta);
}
