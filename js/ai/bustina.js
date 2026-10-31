// La bustina dei semi: Rossella legge la foto della confezione e tira fuori solo i dati scritti.
// Niente consigli e niente prodotti: quello che non si legge resta null, e l'utente controlla.
// Nessun import: così il file si prova in Node senza il resto dell'app.

function errore(codice, dettaglio) {
  return Object.assign(new Error(dettaglio || codice), { codice });
}

const taglia = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const testo = (v, n) => (typeof v === 'string' ? taglia(v, n) : '');

const ESPOSIZIONI = ['sole', 'mezz_ombra', 'ombra'];

// schede: [{ id, nome }] delle colture dell'app. Restituisce il prompt per Gemini.
export function costruisciPromptBustina(schede = []) {
  const elenco = (Array.isArray(schede) ? schede : [])
    .filter((s) => s && s.id)
    .map((s) => `- ${s.id}: ${taglia(s.nome, 60)}`)
    .join('\n');
  return [
    'Sei Rossella, una scienziata prudente. Guarda la foto di una bustina di semi di un orto in Italia e leggi quello che c\'è scritto.',
    'La bustina può mostrare il davanti o il retro: guarda tutta la confezione.',
    '',
    'Regole:',
    '- Leggi SOLO quello che è scritto sulla bustina. Se un dato non si legge o non c\'è, metti null: non inventare mai.',
    '- Riporta il nome della coltura e la varietà come sono scritti, senza aggiungere altro.',
    '- Se la coltura corrisponde a una di questa lista, scrivi il suo id in schedaId; altrimenti schedaId null.',
    elenco || '(nessuna lista)',
    '- I giorni alla germinazione e i giorni alla raccolta vanno in min e max, in giorni. Se c\'è un solo numero, mettilo sia in min sia in max.',
    '- La profondità di semina e la distanza tra le piante vanno in centimetri, solo il numero.',
    '- Il periodo di semina va in mesi, con numeri da 1 a 12 (1 = gennaio).',
    '- L\'esposizione è "sole", "mezz_ombra" o "ombra"; se non è scritta, null.',
    '- Non dare consigli e non parlare di prodotti.',
    '',
    'Rispondi SOLO con JSON, senza altro testo, in questo formato:',
    '{"nome":"nome della coltura scritto sulla bustina, max 60 caratteri",',
    '"varieta":"varietà scritta, max 60 caratteri oppure stringa vuota",',
    '"schedaId":"id della lista oppure null",',
    '"giorni_germinazione":{"min":numero,"max":numero} oppure null,',
    '"giorni_raccolta":{"min":numero,"max":numero} oppure null,',
    '"profondita_cm":numero oppure null,',
    '"distanza_cm":numero oppure null,',
    '"mesi_semina":[numeri da 1 a 12, senza doppioni],',
    '"esposizione":"sole|mezz_ombra|ombra|null",',
    '"avvisi":"per esempio bustina sbiadita o scritta in un\'altra lingua, max 130 caratteri, oppure stringa vuota"}',
  ].join('\n');
}

function numero(v, minimo, massimo) {
  return typeof v === 'number' && Number.isFinite(v) && v >= minimo && v <= massimo ? v : null;
}

function intervallo(v, minimo, massimo) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const min = numero(v.min, minimo, massimo);
  const max = numero(v.max, minimo, massimo);
  if (min === null || max === null || min > max) return null;
  return { min, max };
}

function mesi(v) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((m) => Number.isInteger(m) && m >= 1 && m <= 12))].sort((a, b) => a - b);
}

// Dalla risposta di Gemini (testo) a dati puliti. Lancia errore 'risposta' se non è JSON utilizzabile.
export function leggiBustina(testoRisposta, schede = []) {
  const grezzo = String(testoRisposta ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let dati;
  try {
    dati = JSON.parse(grezzo);
  } catch {
    throw errore('risposta', 'risposta non leggibile');
  }
  if (!dati || typeof dati !== 'object' || Array.isArray(dati)) throw errore('risposta', 'risposta non leggibile');
  const nome = testo(dati.nome, 60);
  if (!nome || nome.toLowerCase() === 'null') throw errore('risposta', 'nome mancante');

  const idNoti = new Set((Array.isArray(schede) ? schede : []).map((s) => s?.id).filter(Boolean));
  const varieta = testo(dati.varieta, 60);
  return {
    nome,
    varieta: varieta.toLowerCase() === 'null' ? '' : varieta,
    schedaId: typeof dati.schedaId === 'string' && idNoti.has(dati.schedaId) ? dati.schedaId : null, // un id inventato non vale
    giorni_germinazione: intervallo(dati.giorni_germinazione, 1, 400),
    giorni_raccolta: intervallo(dati.giorni_raccolta, 1, 400),
    profondita_cm: numero(dati.profondita_cm, 0, 200),
    distanza_cm: numero(dati.distanza_cm, 0, 200),
    mesi_semina: mesi(dati.mesi_semina),
    esposizione: ESPOSIZIONI.includes(dati.esposizione) ? dati.esposizione : null,
    avvisi: testo(dati.avvisi, 130),
  };
}
