// Mini gioco antistress: conta i secondi passati a rilassarsi, giorno per giorno. Funzioni pure.
// La memoria vive come oggetto { 'AAAA-MM-GG': secondi } (secondi interi, al più 86400 al giorno).

const GIORNO_MS = 24 * 60 * 60 * 1000;
const TETTO_GIORNO = 86400;
const TETTO_CHIAMATA = 3600;
const MAX_DATE = 400;

// «AAAA-MM-GG» con calendario vero (febbruraio, anni bisestili compresi).
function dataValida(data) {
  if (typeof data !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!m) return false;
  const anno = Number(m[1]);
  const mese = Number(m[2]);
  const giorno = Number(m[3]);
  if (mese < 1 || mese > 12 || giorno < 1) return false;
  const bisestile = (anno % 4 === 0 && anno % 100 !== 0) || anno % 400 === 0;
  const giorni = [31, bisestile && mese === 2 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mese - 1];
  return giorno <= giorni;
}

// Il giorno precedente come chiave «AAAA-MM-GG».
function giornoPrimaDi(data) {
  const [anno, mese, giorno] = data.split('-').map(Number);
  const preceduto = new Date(Date.UTC(anno, mese - 1, giorno) - GIORNO_MS);
  const p = String(preceduto.getUTCMonth() + 1).padStart(2, '0');
  const g = String(preceduto.getUTCDate()).padStart(2, '0');
  return `${preceduto.getUTCFullYear()}-${p}-${g}`;
}

function leggiSecondi(valore) {
  if (typeof valore !== 'number' || !Number.isFinite(valore) || valore < 0) return 0;
  return Math.min(Math.floor(valore), TETTO_GIORNO);
}

// Pulisce la memoria: solo date valide, valori numerici monnegati, tetto 86400,
// al massimo le 400 date più recenti.
export function pulisciRelax(grezzo) {
  if (!grezzo || typeof grezzo !== 'object' || Array.isArray(grezzo)) return {};
  const pulite = {};
  for (const [chiave, valore] of Object.entries(grezzo)) {
    if (!dataValida(chiave)) continue;
    if (typeof valore !== 'number' || !Number.isFinite(valore) || valore < 0) continue;
    pulite[chiave] = leggiSecondi(valore);
  }
  const chiavi = Object.keys(pulite).sort().slice(-MAX_DATE);
  const ordinate = {};
  for (const chiave of chiavi) ordinate[chiave] = pulite[chiave];
  return ordinate;
}

// Restituisce un NUOVO oggetto pulito con altri secondi sul giorno «data».
export function aggiungiSecondi(relax, data, secondi) {
  const pulito = pulisciRelax(relax);
  if (!dataValida(data)) return pulito;
  if (typeof secondi !== 'number' || !Number.isFinite(secondi) || secondi <= 0) return pulito;
  const daAggiungere = Math.min(Math.floor(secondi), TETTO_CHIAMATA);
  const nuovoTotale = Math.min((pulito[data] || 0) + daAggiungere, TETTO_GIORNO);
  return { ...pulito, [data]: nuovoTotale };
}

// Minuti interi (per difetto) di un giorno: 0 se manca o l'input è strano.
export function minutiDelGiorno(relax, data) {
  if (!dataValida(data)) return 0;
  return Math.floor(leggiSecondi(pulisciRelax(relax)[data]) / 60);
}

// Minuti interi totali di tutti i giorni: sommo i secondi e divido per difetto.
export function minutiTotali(relax) {
  const pulito = pulisciRelax(relax);
  let secondi = 0;
  for (const valore of Object.values(pulito)) secondi += valore;
  return Math.floor(secondi / 60);
}

// Giorni di fila (a ritroso da «oggi», incluso) con almeno 60 secondi.
// Se oggi non ha ancora 60 secondi si parte da ieri: la giornata non è finita.
export function serieRilassata(relax, oggi) {
  if (!dataValida(oggi)) return 0;
  const pulito = pulisciRelax(relax);
  let corrente = (pulito[oggi] || 0) >= 60 ? oggi : giornoPrimaDi(oggi);
  let serie = 0;
  while (corrente && (pulito[corrente] || 0) >= 60) {
    serie++;
    corrente = giornoPrimaDi(corrente);
  }
  return serie;
}
