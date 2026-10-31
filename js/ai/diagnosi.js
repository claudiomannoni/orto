// Diagnosi di una pianta da foto: Rossella, prudente. Dice cosa vede, cosa potrebbe essere e cosa controllare.
// Mai prodotti né dosi, e sempre «da verificare»: per un problema serio si chiede a un tecnico.
import { chiedi } from './ai.js';
import { restantiOggi, registraUso, erroreFoto, tagliaTesto } from './foto.js';

const CONFIDENZE = ['alta', 'media', 'bassa'];

export function costruisciPromptDiagnosi(contesto = {}) {
  const note = [
    contesto.coltura ? `La coltura indicata dall'utente è: ${tagliaTesto(contesto.coltura, 60)}.` : null,
    contesto.nota ? `Nota dell'utente: ${tagliaTesto(contesto.nota, 200)}` : null,
  ].filter(Boolean);
  return [
    'Sei Rossella, una scienziata prudente. Guarda la foto di una pianta di un orto in Italia (collina vicino a Roma) e dì cosa vedi.',
    ...note,
    '',
    'Regole:',
    '- Di\' prima di tutto se la pianta sembra sana, e quale pianta ti sembra. Se non si vede bene, dillo: non inventare mai.',
    '- Se vedi segni di un problema (macchie, ingiallimenti, foglie arrotolate o morse, muffe, appassimento), elenca le cause possibili, dalla più probabile, con confidenza "alta", "media" o "bassa". Una foto non basta per essere sicuri: usa "alta" solo per segni molto chiari.',
    '- Per ogni causa scrivi cosa può controllare l\'utente (per esempio il retro delle foglie, il terreno, l\'acqua, le piante vicine).',
    '- NON consigliare prodotti, trattamenti, dosi o ricette. Se il problema può essere serio, di\' di chiedere conferma a un tecnico (consorzio agrario o servizio fitosanitario regionale).',
    '- Scrivi in italiano semplice e breve.',
    '',
    'Rispondi SOLO con JSON, senza altro testo, in questo formato:',
    '{"pianta":{"nome":"nome comune oppure null","confidenza":"alta|media|bassa"},',
    '"stato":"sana|dubbio|problema|non_si_vede",',
    '"problemi":[{"nome":"causa possibile","confidenza":"alta|media|bassa","perche":"cosa vedi che lo fa pensare, max 110 caratteri","cosa_controllare":"max 120 caratteri"}],',
    '"avvisi":"per esempio foto sfocata o troppo lontana, max 130 caratteri, oppure stringa vuota"}',
  ].join('\n');
}

// Dalla risposta di Gemini (testo) a dati puliti. Lancia errore 'risposta' se non è JSON utilizzabile.
export function leggiDiagnosi(testo) {
  const grezzo = String(testo ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let dati;
  try {
    dati = JSON.parse(grezzo);
  } catch {
    throw erroreFoto('risposta', 'risposta non leggibile');
  }
  if (!dati || typeof dati !== 'object' || Array.isArray(dati)) throw erroreFoto('risposta', 'risposta non leggibile');
  const confidenza = (c) => (CONFIDENZE.includes(c) ? c : 'bassa');
  const nomePianta = tagliaTesto(dati.pianta?.nome, 60);
  const stato = ['sana', 'dubbio', 'problema', 'non_si_vede'].includes(dati.stato) ? dati.stato : 'dubbio';
  const problemi = (Array.isArray(dati.problemi) ? dati.problemi : [])
    .filter((p) => p && typeof p === 'object' && tagliaTesto(p.nome, 70))
    .slice(0, 5)
    .map((p) => ({
      nome: tagliaTesto(p.nome, 70),
      confidenza: confidenza(p.confidenza),
      perche: tagliaTesto(p.perche, 120),
      cosa_controllare: tagliaTesto(p.cosa_controllare, 130),
    }));
  return {
    pianta: nomePianta && nomePianta.toLowerCase() !== 'null' ? { nome: nomePianta, confidenza: confidenza(dati.pianta?.confidenza) } : null,
    // Se dice "sana" ma elenca problemi, ci si fida dei problemi: meglio un dubbio in più che uno in meno.
    stato: stato === 'sana' && problemi.length ? 'dubbio' : stato,
    problemi,
    avvisi: tagliaTesto(dati.avvisi, 140),
  };
}

// immagine: { tipo, base64 } già ridotta. contesto: { coltura?, nota? }.
export async function diagnosiFoto({ immagine, contesto = {} }) {
  if (!immagine?.base64) throw erroreFoto('foto', 'nessuna foto');
  if (!(await restantiOggi())) throw erroreFoto('tetto');
  const risposta = await chiedi({ testo: costruisciPromptDiagnosi(contesto), immagini: [immagine], json: true });
  await registraUso();
  return leggiDiagnosi(risposta);
}
