// Il motore di "Oggi in campagna": sceglie i lavori del giorno, in ordine di importanza.
// Funzioni pure (niente DOM, niente database): si provano con dati finti.
import { meseDi, daISO } from '../util.js';

const MASSIMO = 5;

// Quanto conta un lavoro, da 0 a 100 circa. Le regole sono semplici e si leggono:
//  - lavoro del calendario nel suo mese: base 50; nel mese migliore +20; nell'ultimo mese utile +25
//  - lavoro legato a una coltura già seminata, dentro la sua finestra di giorni: base 80,
//    sale fino a +20 man mano che la finestra si chiude
//  - lavoro in ritardo (fino a 7 giorni oltre la finestra): 78
const PESO = {
  calendario: 50,
  ottimale: 20,
  ultimoMese: 25,
  finestra: 80,
  finestraUrgenza: 20,
  ritardo: 78,
  giorniDiRitardo: 7,
};

const GIORNI_SE_FATTO = 30;

function giorniTra(isoA, isoB) {
  return Math.round((daISO(isoB) - daISO(isoA)) / 86400000);
}

// Un lavoro è già stato fatto di recente, o rimandato per oggi?
function nascosto(eventi, oggi, schedaId, lavoroId, colturaId) {
  return eventi.some((e) => {
    if (e.schedaId !== schedaId || e.lavoroId !== lavoroId || (e.colturaId ?? null) !== (colturaId ?? null)) return false;
    if (e.tipo === 'lavoro_fatto') return giorniTra(e.data, oggi) < GIORNI_SE_FATTO;
    if (e.tipo === 'lavoro_saltato') return e.data === oggi;
    return false;
  });
}

function dalCalendario({ oggi, zonaId, schede, eventi }) {
  const mese = meseDi(oggi);
  const trovati = [];
  for (const scheda of schede) {
    for (const lavoro of scheda.calendario?.[zonaId] ?? []) {
      if (!lavoro.mesi?.includes(mese)) continue;
      if (nascosto(eventi, oggi, scheda.id, lavoro.id, null)) continue;
      const ottimale = Boolean(lavoro.ottimale?.includes(mese));
      const ultimoMese = mese === Math.max(...lavoro.mesi);
      let priorita = PESO.calendario;
      let motivo = 'possibile';
      if (ottimale) { priorita += PESO.ottimale; motivo = 'ottimale'; }
      if (ultimoMese) { priorita += PESO.ultimoMese; motivo = 'ultima_finestra'; }
      trovati.push({ chiave: `${scheda.id}:${lavoro.id}`, scheda, lavoro, coltura: null, priorita, motivo, n: null });
    }
  }
  return trovati;
}

function dalleColture({ oggi, schede, colture, eventi }) {
  const trovati = [];
  for (const coltura of colture) {
    const scheda = schede.find((s) => s.id === coltura.schedaId);
    if (!scheda) continue;
    const giorni = giorniTra(coltura.dataSemina, oggi);
    for (const lavoro of scheda.lavori ?? []) {
      if (!lavoro.dopo_giorni) continue;
      const [min, max] = lavoro.dopo_giorni;
      if (giorni < min || giorni > max + PESO.giorniDiRitardo) continue;
      if (nascosto(eventi, oggi, scheda.id, lavoro.id, coltura.id)) continue;
      let priorita;
      let motivo;
      let n;
      if (giorni <= max) {
        const avanzamento = max > min ? (giorni - min) / (max - min) : 1;
        priorita = PESO.finestra + PESO.finestraUrgenza * avanzamento;
        motivo = 'in_finestra';
        n = giorni;
      } else {
        priorita = PESO.ritardo;
        motivo = 'ritardo';
        n = giorni - max;
      }
      trovati.push({ chiave: `${scheda.id}:${lavoro.id}:${coltura.id}`, scheda, lavoro, coltura, priorita, motivo, n });
    }
  }
  return trovati;
}

// Restituisce al massimo 5 lavori, dal più importante. A parità, ordine stabile per titolo.
export function calcolaLavori({ oggi, zonaId, schede, colture, eventi, massimo = MASSIMO }) {
  const tutti = [
    ...dalleColture({ oggi, schede, colture, eventi }),
    ...dalCalendario({ oggi, zonaId, schede, eventi }),
  ];
  tutti.sort((a, b) => b.priorita - a.priorita || a.lavoro.titolo.localeCompare(b.lavoro.titolo, 'it'));
  return tutti.slice(0, massimo);
}
