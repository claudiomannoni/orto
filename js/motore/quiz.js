// Il quiz del giorno: cinque domande uguali per tutti in quel giorno, sempre diverse da un giorno all'altro. Funzioni pure.
import { aggiungiGiorni } from '../util.js';

// Generatore pseudocasuale con seme (mulberry32): stesso giorno, stesse domande.
function generatore(seme) {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const semeDelGiorno = (oggi) => Number(oggi.replace(/-/g, '')); // 2026-11-10 -> 20261110, uguale ovunque

// Sceglie `quante` domande valide per il giorno: un po' di facili, poi medie, poi una difficile.
export function domandeDelGiorno(domande, oggi, quante = 5) {
  const valide = (Array.isArray(domande) ? domande : []).filter((d) => d && typeof d.testo === 'string'
    && Array.isArray(d.risposte) && d.risposte.length >= 2 && Number.isInteger(d.giusta) && d.giusta >= 0 && d.giusta < d.risposte.length);
  const caso = generatore(semeDelGiorno(oggi));
  const mescolate = [...valide].sort((a, b) => a.id.localeCompare(b.id)); // ordine stabile prima di mescolare
  for (let i = mescolate.length - 1; i > 0; i--) {
    const j = Math.floor(caso() * (i + 1));
    [mescolate[i], mescolate[j]] = [mescolate[j], mescolate[i]];
  }
  const ordine = [1, 1, 2, 2, 3];
  const scelte = [];
  for (const livello of ordine.slice(0, quante)) {
    const d = mescolate.find((x) => x.livello === livello && !scelte.includes(x)) ?? mescolate.find((x) => !scelte.includes(x));
    if (d) scelte.push(d);
  }
  return scelte;
}

// Giorni di fila (fino a oggi o a ieri) in cui hai fatto il quiz.
export function serieQuiz(risultati, oggi) {
  const giorni = new Set(Object.keys(risultati ?? {}));
  let giorno = giorni.has(oggi) ? oggi : aggiungiGiorni(oggi, -1);
  let n = 0;
  while (giorni.has(giorno)) {
    n++;
    giorno = aggiungiGiorni(giorno, -1);
  }
  return n;
}
