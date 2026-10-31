// «Cosa cucino?»: dalle raccolte degli ultimi giorni alle ricette.
// Nessun import dall'app: così le funzioni si provano in Node. Le risposte dell'IA
// sono proposte da controllare: qui si leggono, si ripuliscono e si scartano quelle rovinate.

const GIORNI_DEFAULT = 30;
const MASSIMO_COLTURE = 8;
const KG_PER_PEZZO = 0.2;
const UNITA = new Set(['kg', 'g', 'pezzi']);

function errore(codice, dettaglio) {
  return Object.assign(new Error(dettaglio || codice), { codice });
}

const taglia = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const arrotonda3 = (n) => Math.round(n * 1000) / 1000;

// Mezzanotte UTC di una data AAAA-MM-GG che esiste davvero; null se è rovinata.
function giornoUTC(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const anno = Number(iso.slice(0, 4));
  const mese = Number(iso.slice(5, 7));
  const giorno = Number(iso.slice(8, 10));
  const d = new Date(Date.UTC(anno, mese - 1, giorno));
  if (anno >= 0 && anno < 100) d.setUTCFullYear(anno);
  if (d.getUTCFullYear() !== anno || d.getUTCMonth() !== mese - 1 || d.getUTCDate() !== giorno) return null;
  return d.getTime();
}

// Nomi delle colture raccolte negli ultimi «giorni» giorni fino a «oggi» compreso.
// Un nome per coltura, prima chi pesa di più: grammi e chili in kg, un pezzo vale 0,2 kg.
export function ingredientiDaRaccolto(eventi, giorni = GIORNI_DEFAULT, oggi) {
  const fine = giornoUTC(oggi);
  if (fine === null) return [];
  const chiesti = Number(giorni);
  const finestra = Number.isFinite(chiesti) ? Math.max(0, Math.floor(chiesti)) : GIORNI_DEFAULT;
  const gruppi = new Map();
  for (const e of Array.isArray(eventi) ? eventi : []) {
    if (!e || typeof e !== 'object' || e.tipo !== 'raccolto') continue;
    if (typeof e.quantita !== 'number' || !Number.isFinite(e.quantita) || e.quantita <= 0) continue;
    if (!UNITA.has(e.unita)) continue;
    const giorno = giornoUTC(e.data);
    if (giorno === null) continue;
    const giorniFa = Math.round((fine - giorno) / 86400000);
    if (giorniFa < 0 || giorniFa > finestra) continue;
    const nome = typeof e.nomeColtura === 'string' ? e.nomeColtura.trim() : '';
    if (!nome) continue;
    const chiave = nome.toLowerCase();
    if (!gruppi.has(chiave)) gruppi.set(chiave, { nome, kg: 0 });
    const g = gruppi.get(chiave);
    g.kg += e.unita === 'g' ? e.quantita / 1000 : e.unita === 'pezzi' ? e.quantita * KG_PER_PEZZO : e.quantita;
  }
  return [...gruppi.values()]
    .map((g) => ({ nome: g.nome, kg: arrotonda3(g.kg) }))
    .sort((a, b) => b.kg - a.kg || a.nome.localeCompare(b.nome, 'it'))
    .slice(0, MASSIMO_COLTURE)
    .map((g) => g.nome);
}

// Il prompt per Gemini. Se non ci sono ingredienti chiede ricette stagionali con ortaggi comuni.
export function costruisciPromptRicette(ingredienti, opzioni = {}) {
  const { persone = 2, stagione = null } = opzioni ?? {};
  const elenco = (Array.isArray(ingredienti) ? ingredienti : [])
    .filter((i) => typeof i === 'string')
    .map((i) => taglia(i, 40))
    .filter(Boolean)
    .slice(0, MASSIMO_COLTURE);
  const chi = Number(persone);
  const n = Number.isFinite(chi) && chi >= 1 ? Math.min(20, Math.round(chi)) : 2;
  const s = taglia(stagione, 30);
  return [
    'Sei un cuoco italiano pratico che aiuta chi coltiva un orto. Proponi ricette semplici da fare in casa.',
    elenco.length
      ? `Ingredienti raccolti dall'orto: ${elenco.join(', ')}.`
      : 'Nessun ingrediente indicato: proponi ricette stagionali semplici con ortaggi comuni.',
    `Cucina per ${n} persone.`,
    s ? `Stagione: ${s}.` : null,
    '',
    'Regole:',
    elenco.length
      ? '- Proponi 3 ricette semplici italiane usando gli ingredienti elencati.'
      : '- Proponi 3 ricette semplici italiane con ortaggi comuni di stagione.',
    '- Oltre agli ingredienti dell\'orto puoi usare al massimo ingredienti comuni da dispensa: olio, sale, pasta, riso, uova, farina, aglio, cipolla.',
    '- Per ogni ricetta scrivi: titolo, ingredienti con quantità approssimative, da 3 a 5 passaggi brevi, tempo in minuti.',
    '- Niente ricette che richiedano prodotti strani o difficili da trovare.',
    '- Se un ingrediente richiede cautele (per esempio fave crude, funghi), scrivilo nell\'avviso della ricetta.',
    '- Non dare consigli medici o di dieta.',
    '- Scrivi in italiano semplice.',
    '',
    'Rispondi SOLO con JSON, senza altro testo, in questo formato:',
    '{"ricette":[{"titolo":"titolo, max 80 caratteri","ingredienti":["ingrediente e quantità, max 80 caratteri"],"passaggi":["passaggio breve, max 200 caratteri"],"minuti":30,"avviso":"cautele, max 150 caratteri, oppure stringa vuota"}],"avviso":"avviso generale, max 150 caratteri, oppure stringa vuota"}',
  ].filter((r) => r !== null).join('\n');
}

// Dalla risposta di Gemini (testo, anche dentro ```json ... ```) a ricette pulite.
// Lancia errore 'risposta' se non è JSON utilizzabile o se non resta nessuna ricetta.
export function leggiRicette(testo) {
  const grezzo = String(testo ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let dati;
  try { dati = JSON.parse(grezzo); } catch { throw errore('risposta', 'risposta non leggibile'); }
  if (!dati || typeof dati !== 'object' || Array.isArray(dati)) throw errore('risposta', 'risposta non leggibile');

  const ricette = (Array.isArray(dati.ricette) ? dati.ricette : [])
    .filter((r) => r && typeof r === 'object' && !Array.isArray(r))
    .map((r) => {
      const ingredienti = (Array.isArray(r.ingredienti) ? r.ingredienti : [])
        .map((v) => taglia(v, 80)).filter(Boolean).slice(0, 12);
      const passaggi = (Array.isArray(r.passaggi) ? r.passaggi : [])
        .map((v) => taglia(v, 200)).filter(Boolean).slice(0, 8);
      const numero = typeof r.minuti === 'number'
        ? r.minuti
        : (typeof r.minuti === 'string' && /^\d+$/.test(r.minuti.trim()) ? Number(r.minuti) : NaN);
      return {
        titolo: taglia(r.titolo, 80),
        ingredienti,
        passaggi,
        minuti: Number.isInteger(numero) && numero >= 1 && numero <= 600 ? numero : null,
        avviso: taglia(r.avviso, 150),
      };
    })
    .filter((r) => r.titolo && r.passaggi.length)
    .slice(0, 3);

  if (!ricette.length) throw errore('risposta', 'nessuna ricetta leggibile');
  return { ricette, avviso: taglia(dati.avviso, 150) };
}
