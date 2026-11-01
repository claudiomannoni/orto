// Fasi di vita di una coltura: età della pianta, fase corrente, confronto con quanto atteso. Funzioni pure.

const GIORNO_MS = 86400000;

// Date in formato AAAA-MM-GG: giorni interi di calendario tra le due date (oggi - inizio).
// 0 se una data non è valida o se dataInizio è nel futuro.
export function etaInGiorni(dataInizio, oggi) {
  if (!isDataValida(dataInizio) || !isDataValida(oggi)) return 0;
  const t = (Date.UTC(+oggi.slice(0, 4), +oggi.slice(5, 7) - 1, +oggi.slice(8, 10))
    - Date.UTC(+dataInizio.slice(0, 4), +dataInizio.slice(5, 7) - 1, +dataInizio.slice(8, 10))) / GIORNO_MS;
  return t >= 0 ? t : 0;
}

// AAAA-MM-GG: formato giusto, componenti plausibili (es. 2026-02-30 no) e date che esistono davvero.
function isDataValida(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const a = +s.slice(0, 4), m = +s.slice(5, 7), g = +s.slice(8, 10);
  if (m < 1 || m > 12 || g < 1 || g > 31) return false;
  const t = Date.UTC(a, m - 1, g);
  return !Number.isNaN(t) && new Date(t).getUTCMonth() === m - 1 && new Date(t).getUTCDate() === g;
}

// Età della pianta: da SEME giorni dalla semina, da PIANTINA giorni dal trapianto più l'età
// che la piantina aveva al trapianto (intero >= 0, altrimenti 0). Partenze sconosciute = seme.
export function etaDellaPianta({ partenza, data, piantinaEta } = {}, oggi) {
  const base = etaInGiorni(data, oggi);
  if (partenza !== 'piantina') return base;
  return base + (Number.isInteger(piantinaEta) && piantinaEta >= 0 ? piantinaEta : 0);
}

// Fase che contiene l'età: da_giorno <= eta <= a_giorno (a_giorno null = fase aperta, vale per sempre).
// Età oltre l'ultima fase o prima della prima: si sta sull'ultima o sulla prima.
export function faseAttuale(fasi, eta) {
  const elenco = (Array.isArray(fasi) ? fasi : []).filter(faseValida);
  if (!elenco.length) return null;
  let indice = 0;
  for (let i = 0; i < elenco.length; i++) {
    if (elenco[i].da_giorno <= eta) indice = i; else break;
  }
  const fase = elenco[indice];
  const dopo = elenco[indice + 1];
  return {
    fase,
    indice,
    giorniNellaFase: eta - fase.da_giorno,
    giorniAllaProssima: dopo ? dopo.da_giorno - eta : null,
  };
}

function faseValida(f) {
  return !!f
    && typeof f.id === 'string' && f.id
    && typeof f.da_giorno === 'number' && Number.isInteger(f.da_giorno)
    && (f.a_giorno === null || f.a_giorno === undefined
      || (typeof f.a_giorno === 'number' && Number.isInteger(f.a_giorno)));
}

// Confronto tra fase attesa e osservata secondo l'ordine degli id: 'in-linea', 'in-ritardo'
// (l'osservata viene prima), 'in-anticipo' (viene dopo), 'incerto' se un id non è nell'ordine
// o l'elenco non è valido.
export function confrontaFase(attesa, osservata, ordine) {
  if (!Array.isArray(ordine) || !ordine.length) return 'incerto';
  const iA = ordine.indexOf(attesa), iO = ordine.indexOf(osservata);
  if (iA < 0 || iO < 0) return 'incerto';
  if (iA === iO) return 'in-linea';
  return iO < iA ? 'in-ritardo' : 'in-anticipo';
}
