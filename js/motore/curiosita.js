// «Lo sapevi?»: una curiosità al giorno, uguale per tutti in quel giorno e adatta al mese. Funzioni pure.
import { meseDi } from '../util.js';

export function curiositaDelGiorno(elenco, oggi) {
  const mese = meseDi(oggi);
  const adatte = (Array.isArray(elenco) ? elenco : [])
    .filter((c) => c && typeof c.testo === 'string' && c.testo && (!Array.isArray(c.mesi) || c.mesi.includes(mese)))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  if (!adatte.length) return null;
  const seme = Number(oggi.replace(/-/g, ''));
  return adatte[seme % adatte.length];
}
