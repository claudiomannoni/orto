// «E adesso che stagione è per questa pianta?»: dice se una coltura è fuori stagione, se sta arrivando il gelo, o se è la fine della stagione,
// e cosa fare, come e perché. Funzioni pure. Usa il calendario della scheda (sempre) e, quando c'è, il file data/it/stagione.json
// (tolleranza al freddo e fine stagione, con fonti) insieme alle minime previste dal meteo.
import { daISO, meseDi } from '../util.js';

const GIORNO = 86400000;
const FINESTRA_FUORI_STAGIONE = 45; // si avvisa solo per una pianta messa a dimora da poco
const GELO_C = 2; // minima prevista alla quale si parla di gelo o brina (senza una soglia migliore dalla fonte)
const MESI_FREDDI = [11, 12, 1, 2, 3];

const giorniFra = (a, b) => Math.round((daISO(b) - daISO(a)) / GIORNO);

// I mesi in cui la scheda dice di seminare (partenza da seme) o trapiantare (da piantina) nella zona; [] se non lo dice.
export function mesiConsigliati(scheda, zonaId, partenza) {
  const lavori = scheda?.calendario?.[zonaId];
  if (!Array.isArray(lavori)) return [];
  const tipi = partenza === 'piantina' ? ['trapianto'] : ['semina'];
  const mesi = new Set();
  for (const l of lavori) if (l && tipi.includes(l.operazione) && Array.isArray(l.mesi)) l.mesi.forEach((m) => { if (Number.isInteger(m) && m >= 1 && m <= 12) mesi.add(m); });
  return [...mesi].sort((a, b) => a - b);
}

// Il giudizio: { stato, ... } con stato 'ok' | 'fuori-stagione' | 'gelo-in-arrivo' | 'fine-stagione'.
export function giudizioStagione(argomenti) {
  const { coltura, scheda, zonaId, dati, oggi, minime } = argomenti && typeof argomenti === 'object' ? argomenti : {};
  const ok = { stato: 'ok' };
  if (!coltura || typeof oggi !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(oggi)) return ok;
  const mese = meseDi(oggi);
  const partenza = coltura.partenza === 'piantina' ? 'piantina' : 'seme';

  // 1. Messa a dimora fuori stagione (dal calendario della scheda)
  const consigliati = mesiConsigliati(scheda, zonaId, partenza);
  if (consigliati.length && typeof coltura.dataSemina === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(coltura.dataSemina)) {
    const eta = giorniFra(coltura.dataSemina, oggi);
    const meseInizio = meseDi(coltura.dataSemina);
    if (eta >= 0 && eta <= FINESTRA_FUORI_STAGIONE && !consigliati.includes(meseInizio)) {
      return { stato: 'fuori-stagione', mese: meseInizio, consigliati, partenza, certezza: 'media', fonti: [], origine: 'calendario' };
    }
  }

  // 2. Freddo e gelo (dal file della stagione e dalle minime previste)
  const d = dati?.colture?.[coltura.schedaId ?? scheda?.id];
  const freddo = d?.freddo;
  const fine = d?.fine_stagione;
  if (!freddo || !['muore-col-gelo', 'teme-il-freddo'].includes(freddo.tolleranza)) return ok;
  const valide = Array.isArray(minime) ? minime.filter((x) => typeof x === 'number' && Number.isFinite(x)) : [];
  const piuFredda = valide.length ? Math.min(...valide) : null;
  const soglia = typeof freddo.soglia_c === 'number' && Number.isFinite(freddo.soglia_c) ? freddo.soglia_c : null;
  const limite = soglia !== null ? soglia : GELO_C;
  const base = { freddo, fine, certezza: fine?.certezza ?? freddo.certezza ?? 'bassa', fonti: [...new Set([...(freddo.fonti ?? []), ...(fine?.fonti ?? [])])], origine: 'stagione' };
  if (piuFredda !== null && piuFredda <= limite) return { stato: 'gelo-in-arrivo', minima: piuFredda, soglia: limite, ...base };
  if (MESI_FREDDI.includes(mese) && fine) return { stato: 'fine-stagione', mese, ...base };
  return ok;
}
