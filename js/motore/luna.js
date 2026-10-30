// Fasi della luna, calcolate con la durata media del mese lunare (nessun dato esterno).
// Funzioni pure. L'errore è di qualche ora, fino a circa mezza giornata: le date delle fasi
// sono "intorno a", non al minuto. Basta per un calendario dell'orto.
import { isoLocale } from '../util.js';

const MESE_LUNARE = 29.530588853; // giorni
const LUNA_NUOVA_RIFERIMENTO = 2451550.1; // giorno giuliano della luna nuova del 6 gennaio 2000 (18:14 UTC)
const MS_GIORNO = 86400000;
const GIORNO_GIULIANO_EPOCA_UNIX = 2440587.5;
const UN_GIORNO = 1 / MESE_LUNARE; // un giorno, come frazione del ciclo

const TIPI_QUARTO = ['nuova', 'primo_quarto', 'piena', 'ultimo_quarto'];

const giornoGiuliano = (ms) => ms / MS_GIORNO + GIORNO_GIULIANO_EPOCA_UNIX;
const dataDaGiornoGiuliano = (jd) => new Date((jd - GIORNO_GIULIANO_EPOCA_UNIX) * MS_GIORNO);

// Posizione nel ciclo, da 0 (luna nuova) a 1, a mezzogiorno del giorno indicato (AAAA-MM-GG).
function posizione(iso) {
  const [a, m, g] = iso.split('-').map(Number);
  const cicli = (giornoGiuliano(Date.UTC(a, m - 1, g, 12)) - LUNA_NUOVA_RIFERIMENTO) / MESE_LUNARE;
  return cicli - Math.floor(cicli);
}

// { stato: 'crescente' | 'calante', nome: 'nuova' | 'piena' | null (solo nel giorno della fase), luce: 0..1, ciclo: 0..1 }
export function faseLunare(iso) {
  const ciclo = posizione(iso);
  const nuova = ciclo < UN_GIORNO || ciclo > 1 - UN_GIORNO;
  const piena = Math.abs(ciclo - 0.5) < UN_GIORNO;
  return {
    stato: ciclo < 0.5 ? 'crescente' : 'calante',
    nome: nuova ? 'nuova' : piena ? 'piena' : null,
    luce: (1 - Math.cos(2 * Math.PI * ciclo)) / 2,
    ciclo,
  };
}

// Le quattro fasi principali che cadono nel mese (anno, mese 1-12): [{ tipo, data: 'AAAA-MM-GG' }].
export function fasiDelMese(anno, mese) {
  const inizio = Date.UTC(anno, mese - 1, 1);
  const fine = Date.UTC(anno, mese, 1);
  const primo = Math.floor(((giornoGiuliano(inizio) - LUNA_NUOVA_RIFERIMENTO) / MESE_LUNARE) * 4) - 1;
  const trovate = [];
  for (let k = primo; k <= primo + 6; k++) {
    const quando = dataDaGiornoGiuliano(LUNA_NUOVA_RIFERIMENTO + (k / 4) * MESE_LUNARE);
    const data = isoLocale(quando);
    if (quando.getTime() < inizio - MS_GIORNO || quando.getTime() >= fine) continue;
    if (Number(data.slice(5, 7)) !== mese) continue;
    trovate.push({ tipo: TIPI_QUARTO[((k % 4) + 4) % 4], data });
  }
  return trovate.sort((x, y) => x.data.localeCompare(y.data));
}
