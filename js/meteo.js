// Previsioni del tempo da Open-Meteo (gratuito, senza chiave). Si scaricano al massimo ogni 3 ore e si tengono
// sul telefono: senza internet si usano le ultime. La posizione è quella scelta in Impostazioni o il centro della zona.
import { leggi, imposta } from './store/impostazioni.js';
import { zone } from './contenuti.js';
import { giorniMeteo, cacheValida, coordinateValide, piove } from './motore/meteo.js';
import { oggiISO } from './util.js';

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const TEMPO_MASSIMO = 8000;

// { lat, lon, origine: 'telefono' | 'zona', nome } oppure null se non si sa dove siamo.
export async function posizioneMeteo() {
  const s = await leggi();
  const p = s.meteo_posizione;
  if (p && coordinateValide(p.lat, p.lon)) return { lat: p.lat, lon: p.lon, origine: 'telefono', nome: null };
  const elenco = await zone();
  const z = elenco.find((x) => x.id === s.zona) ?? elenco[0];
  if (z?.posizione && coordinateValide(z.posizione.lat, z.posizione.lon)) return { lat: z.posizione.lat, lon: z.posizione.lon, origine: 'zona', nome: z.nome };
  return null;
}

// Le previsioni: { giorni, quando, vecchio }. Lancia errore con codice 'posizione' | 'rete' | 'meteo'.
// senzaRete: usa solo quelle già salvate (per partire subito).
// Più parti della schermata chiedono le previsioni insieme (carta meteo, consigli sui lavori): una sola richiesta, la risposta è condivisa.
const inCorso = new Map();
export function previsioni(opzioni = {}) {
  const chiave = `${Boolean(opzioni.senzaRete)}|${Boolean(opzioni.forza)}`;
  if (!inCorso.has(chiave)) inCorso.set(chiave, scaricaPrevisioni(opzioni).finally(() => inCorso.delete(chiave)));
  return inCorso.get(chiave);
}

async function scaricaPrevisioni({ senzaRete = false, forza = false } = {}) {
  const pos = await posizioneMeteo();
  if (!pos) throw Object.assign(new Error('posizione'), { codice: 'posizione' });
  const s = await leggi();
  const cache = s.meteo_cache;
  // Le previsioni salvate valgono se sono fresche e se coprono il giorno di oggi (cambiando data a mano non coprirebbero).
  const copreOggi = cache?.giorni?.some((g) => g.data === oggiISO());
  if (!forza && copreOggi && cacheValida(cache, pos)) return { giorni: cache.giorni, quando: cache.quando, vecchio: false, posizione: pos };
  if (senzaRete) {
    if (cache && cache.lat === pos.lat && cache.lon === pos.lon && cache.giorni?.length) return { giorni: cache.giorni, quando: cache.quando, vecchio: true, posizione: pos };
    throw Object.assign(new Error('nessuna previsione salvata'), { codice: 'rete' });
  }
  const url = `${ENDPOINT}?latitude=${pos.lat}&longitude=${pos.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=7`;
  const controllo = new AbortController();
  const timer = setTimeout(() => controllo.abort(), TEMPO_MASSIMO);
  try {
    const risposta = await fetch(url, { signal: controllo.signal });
    if (!risposta.ok) throw Object.assign(new Error(`HTTP ${risposta.status}`), { codice: 'meteo' });
    const giorni = giorniMeteo(await risposta.json());
    const quando = Date.now();
    await imposta('meteo_cache', { lat: pos.lat, lon: pos.lon, quando, giorni });
    return { giorni, quando, vecchio: false, posizione: pos };
  } catch (errore) {
    // Niente rete o risposta strana: meglio le ultime previsioni salvate che niente.
    if (cache && cache.lat === pos.lat && cache.lon === pos.lon && cache.giorni?.length) return { giorni: cache.giorni, quando: cache.quando, vecchio: true, posizione: pos };
    throw errore.codice ? errore : Object.assign(new Error('rete'), { codice: 'rete' });
  } finally {
    clearTimeout(timer);
  }
}

// Oggi piove, secondo le ultime previsioni salvate? (senza rete: serve a vestire i vermetti all'apertura)
export async function pioveOggiDaCache() {
  try {
    const { giorni } = await previsioni({ senzaRete: true });
    return piove(giorni.find((g) => g.data === oggiISO()));
  } catch {
    return false;
  }
}
