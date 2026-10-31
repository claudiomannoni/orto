// Provider Gemini (Google AI Studio, piano gratuito). La chiave è dell'utente:
// vive solo sul suo telefono e viaggia soltanto verso Google, nell'intestazione.
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function errore(codice, dettaglio) {
  return Object.assign(new Error(dettaglio || codice), { codice });
}

// I modelli di testo che questa chiave può usare, dal più recente. Serve quando Google ritira un modello.
export async function elencoModelli({ chiave }) {
  let risposta;
  try {
    risposta = await fetch(`${BASE}?pageSize=200`, { headers: { 'x-goog-api-key': chiave } });
  } catch {
    throw errore('rete');
  }
  if (!risposta.ok) {
    if (risposta.status === 401 || risposta.status === 403 || risposta.status === 400) throw errore('chiave');
    throw errore('altro', `HTTP ${risposta.status}`);
  }
  const dati = await risposta.json();
  const nomi = (dati?.models ?? [])
    .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((m) => String(m.name ?? '').replace(/^models\//, ''))
    .filter((n) => /^gemini-/.test(n) && !/(embedding|tts|image|live|audio|robotics|computer-use|aqa)/.test(n));
  // Prima i "flash" (veloci e gratuiti), poi gli altri; dentro ogni gruppo il numero di versione più alto per primo.
  const peso = (n) => (/flash/.test(n) && !/lite/.test(n) ? 0 : /flash/.test(n) ? 1 : 2);
  return [...new Set(nomi)].sort((a, b) => peso(a) - peso(b) || b.localeCompare(a, 'en', { numeric: true }));
}

// immagini: elenco di { tipo, base64 } (anche una sola); json: chiede a Gemini di rispondere in JSON.
export async function chiedi({ chiave, modello, testo, immagine, immagini = [], json = false }) {
  const parti = [{ text: testo }];
  for (const img of [...(immagine ? [immagine] : []), ...immagini]) parti.push({ inlineData: { mimeType: img.tipo, data: img.base64 } });
  const corpo = { contents: [{ parts: parti }] };
  if (json) corpo.generationConfig = { responseMimeType: 'application/json', temperature: 0.2 };

  // Google a volte è sovraccarico (503): si riprova due volte, poi si prova il modello «flash» sempre aggiornato.
  const invia = (nome) => fetch(`${BASE}/${encodeURIComponent(nome)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chiave },
    body: JSON.stringify(corpo),
  });
  const sovraccarico = (r) => r.status === 503;
  let risposta;
  try {
    risposta = await invia(modello);
    for (let giro = 0; giro < 2 && sovraccarico(risposta); giro++) {
      await new Promise((ok) => setTimeout(ok, 1500 * (giro + 1)));
      risposta = await invia(modello);
    }
    if (sovraccarico(risposta) && modello !== 'gemini-flash-latest') {
      const altra = await invia('gemini-flash-latest');
      if (altra.ok) risposta = altra;
    }
  } catch {
    throw errore('rete');
  }
  if (sovraccarico(risposta)) throw errore('sovraccarico');

  if (!risposta.ok) {
    let dettaglio = '';
    try { dettaglio = (await risposta.json())?.error?.message ?? ''; } catch { /* nessun dettaglio */ }
    if (risposta.status === 429) throw errore('quota', dettaglio);
    // Modello ritirato o con un nome che non esiste: non è colpa della chiave.
    if (risposta.status === 404 || /no longer available|is not found|not supported for generateContent/i.test(dettaglio)) throw errore('modello', modello);
    if (risposta.status === 400 || risposta.status === 401 || risposta.status === 403) throw errore('chiave', dettaglio);
    throw errore('altro', dettaglio || `HTTP ${risposta.status}`);
  }

  const dati = await risposta.json();
  const risultato = dati?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!risultato) throw errore('altro', 'risposta vuota');
  return risultato;
}
