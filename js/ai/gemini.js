// Provider Gemini (Google AI Studio, piano gratuito). La chiave è dell'utente:
// vive solo sul suo telefono e viaggia soltanto verso Google, nell'intestazione.
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function errore(codice, dettaglio) {
  return Object.assign(new Error(dettaglio || codice), { codice });
}

export async function chiedi({ chiave, modello, testo, immagine }) {
  const parti = [{ text: testo }];
  if (immagine) parti.push({ inlineData: { mimeType: immagine.tipo, data: immagine.base64 } });

  let risposta;
  try {
    risposta = await fetch(`${BASE}/${encodeURIComponent(modello)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chiave },
      body: JSON.stringify({ contents: [{ parts: parti }] }),
    });
  } catch {
    throw errore('rete');
  }

  if (!risposta.ok) {
    let dettaglio = '';
    try { dettaglio = (await risposta.json())?.error?.message ?? ''; } catch { /* nessun dettaglio */ }
    if (risposta.status === 429) throw errore('quota', dettaglio);
    if (risposta.status === 400 || risposta.status === 401 || risposta.status === 403) throw errore('chiave', dettaglio);
    throw errore('altro', dettaglio || `HTTP ${risposta.status}`);
  }

  const dati = await risposta.json();
  const risultato = dati?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!risultato) throw errore('altro', 'risposta vuota');
  return risultato;
}
