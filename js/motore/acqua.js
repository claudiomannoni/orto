// Pioggia e annaffiature: quanta acqua è caduta, quanta ne arriva e se conviene annaffiare. Funzioni pure, niente DOM.
import { aggiungiGiorni, dataValida, meseDi } from '../util.js';

// Millimetri a settimana che un orto amatoriale mediterraneo ha di norma bisogno di ricevere.
// Inventario semplice e dichiarato indicativo: serve solo a dare un'idea, non è un dato misurato.
const FABBISOGNO = { 1: 8, 2: 8, 3: 12, 4: 18, 5: 28, 6: 38, 7: 38, 8: 38, 9: 28, 10: 18, 11: 12, 12: 8 };

const arrotonda1 = (mm) => {
  const r = Math.round(mm * 10) / 10;
  return r === 0 ? 0 : r; // al posto di -0
};

// Quanti giorni considerare: numeri finiti, interi e non negativi; tutto il resto vale zero.
const quantiGiorni = (n) => {
  const numero = Number(n);
  if (!Number.isFinite(numero)) return 0;
  return Math.max(0, Math.trunc(numero));
};

// Pioggia di una voce: solo i numeri finiti contano; giorni mancanti o pioggia non numerica valgono 0.
const mmDi = (voce) => (Number.isFinite(voce?.pioggia) ? voce.pioggia : 0);

// Somma la pioggia delle voci con una data nell'elenco dato (le date ripetute si sommano).
const sommaDate = (giorni, date) => {
  let mm = 0;
  for (const voce of giorni) if (date.has(voce?.data)) mm += mmDi(voce);
  return arrotonda1(mm);
};

// Millimetri caduti negli n giorni che finiscono oggi (oggi compreso): da oggi-n+1 a oggi.
export function pioggiaCaduta(giorni, oggi, n = 7) {
  if (!Array.isArray(giorni) || !dataValida(oggi)) return 0;
  const date = new Set();
  for (let i = 0; i < quantiGiorni(n); i++) date.add(aggiungiGiorni(oggi, -i));
  return sommaDate(giorni, date);
}

// Millimetri previsti nei prossimi n giorni, a partire da domani (oggi escluso).
export function pioggiaPrevista(giorni, oggi, n = 3) {
  if (!Array.isArray(giorni) || !dataValida(oggi)) return 0;
  const date = new Set();
  for (let i = 1; i <= quantiGiorni(n); i++) date.add(aggiungiGiorni(oggi, i));
  return sommaDate(giorni, date);
}

// Millimetri a settimana di norma necessari nel mese dato (1-12). Mese non valido: 20.
export function fabbisognoSettimanale(mese) {
  const m = Number(mese);
  return Number.isInteger(m) && FABBISOGNO[m] != null ? FABBISOGNO[m] : 20;
}

// Consiglio sull'acqua: quanto è caduto in 7 giorni, quanto è previsto in 3 e se annaffiare.
// Restituisce { mm7, previsti, fabbisogno, livello, annaffia, chiave } oppure null se l'elenco o oggi non sono validi.
export function consigliAcqua(giorni, oggi) {
  if (!Array.isArray(giorni) || !dataValida(oggi)) return null;
  const mm7 = pioggiaCaduta(giorni, oggi, 7);
  const previsti = pioggiaPrevista(giorni, oggi, 3);
  const fabbisogno = fabbisognoSettimanale(meseDi(oggi));

  // Confronti in decimi di millimetro, così i confini del 60% e del 25% non ballano con la virgola mobile.
  const mm10 = Math.round(mm7 * 10);
  let livello;
  if (mm10 >= fabbisogno * 10) livello = 'abbondante';
  else if (mm10 >= fabbisogno * 6) livello = 'sufficiente';
  else if (mm10 >= fabbisogno * 2.5) livello = 'poca';
  else livello = 'secca';

  // Il caldo conta solo se oggi c'è una massima numerica: senza, non è un motivo per non annaffiare.
  const voceOggi = giorni.find((v) => v?.data === oggi);
  const maxOggi = Number.isFinite(voceOggi?.max) ? voceOggi.max : null;

  let annaffia;
  if (livello === 'abbondante' || previsti >= 6) annaffia = 'no';
  else if ((livello === 'secca' || livello === 'poca') && previsti < 3 && (maxOggi === null || maxOggi >= 22)) annaffia = 'si';
  else annaffia = 'forse';

  return { mm7, previsti, fabbisogno, livello, annaffia, chiave: `acqua.${annaffia}.${livello}` };
}
