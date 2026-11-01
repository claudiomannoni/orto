// «Il tuo eccesso»: gestione del raccolto in avanzo. Funzioni pure.

export const CATEGORIE = ['ortaggi', 'uova_miele', 'piantine_semi', 'speciali'];
export const UNITA = ['kg', 'g', 'pezzi', 'vasetti'];
export const STATI = ['disponibile', 'regalato', 'scambiato', 'venduto'];

function isValidDate(data) {
  if (typeof data !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  // controllo in UTC: con l'ora locale (fuso dell'Italia) una data valida risulterebbe sbagliata
  const [a, m, g] = data.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, g));
  return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === g;
}

export function pulisciEccesso(grezzo) {
  if (!grezzo || typeof grezzo !== 'object' || Array.isArray(grezzo)) return null;

  const id = typeof grezzo.id === 'string' ? grezzo.id.trim() : '';
  if (!id) return null;

  let nome = typeof grezzo.nome === 'string' ? grezzo.nome.trim() : '';
  nome = nome.replace(/\s+/g, ' ');
  if (!nome) return null;
  if (nome.length > 60) nome = nome.slice(0, 60);

  const categoria = CATEGORIE.includes(grezzo.categoria) ? grezzo.categoria : null;
  if (!categoria) return null;

  // solo numeri finiti positivi (le stringhe no); oltre il tetto si porta al tetto
  if (typeof grezzo.quantita !== 'number' || !isFinite(grezzo.quantita) || grezzo.quantita <= 0) return null;
  const quantita = Math.min(grezzo.quantita, 100000);

  const unita = UNITA.includes(grezzo.unita) ? grezzo.unita : 'pezzi';

  const stato = STATI.includes(grezzo.stato) ? grezzo.stato : 'disponibile';

  const data = isValidDate(grezzo.data) ? grezzo.data : null;

  return { id, categoria, nome, quantita, unita, stato, data };
}

export function ordinaEccesso(elenco) {
  if (!Array.isArray(elenco)) return [];

  const copia = [...elenco];
  const gruppo = (v) => (v && v.stato === 'disponibile' ? 0 : 1);

  copia.sort((a, b) => {
    const ga = gruppo(a);
    const gb = gruppo(b);
    if (ga !== gb) return ga - gb;

    const da = a && a.data ? new Date(a.data + 'T00:00:00') : null;
    const db = b && b.data ? new Date(b.data + 'T00:00:00') : null;

    if (da && db && db - da !== 0) return db - da;
    if (da && !db) return -1;
    if (!da && db) return 1;
    if (da) return -1;
    if (db) return 1;

    const na = (a && a.nome) || '';
    const nb = (b && b.nome) || '';
    return na.localeCompare(nb, 'it');
  });

  return copia;
}

export function totaliEccesso(elenco) {
  const vuoto = {
    disponibili: 0,
    salvate: 0,
    kgSalvati: 0,
    pezziSalvati: 0,
    perStato: { disponibile: 0, regalato: 0, scambiato: 0, venduto: 0 },
    perCategoria: { ortaggi: 0, uova_miele: 0, piantine_semi: 0, speciali: 0 }
  };

  if (!Array.isArray(elenco)) return vuoto;

  let kgSalvati = 0;
  let pezziSalvati = 0;

  for (const v of elenco) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
    if (!CATEGORIE.includes(v.categoria)) continue;
    if (!STATI.includes(v.stato)) continue;

    if (v.stato === 'disponibile') {
      vuoto.disponibili++;
    } else {
      vuoto.salvate++;
      if (v.unita === 'kg' && typeof v.quantita === 'number') {
        kgSalvati += v.quantita;
      } else if (v.unita === 'g' && typeof v.quantita === 'number') {
        kgSalvati += v.quantita / 1000;
      } else if ((v.unita === 'pezzi' || v.unita === 'vasetti') && typeof v.quantita === 'number') {
        pezziSalvati += v.quantita;
      }
    }

    vuoto.perStato[v.stato]++;
    vuoto.perCategoria[v.categoria]++;
  }

  vuoto.kgSalvati = Math.round(kgSalvati * 100) / 100;
  vuoto.pezziSalvati = pezziSalvati;

  return vuoto;
}