// Meteo: dalle previsioni di Open-Meteo ai giorni, agli avvisi per l'orto e al «piove oggi?».
// Funzioni pure (niente rete, niente DOM): si provano con dati finti.

const SOGLIE = {
  gelo: 0, // minima uguale o sotto
  brina: 3, // minima fino a questa (l'aria a 2 m a 3 gradi può già dare brina a terra)
  pioggiaForte: 10, // mm in un giorno
  caldo: 33, // massima uguale o sopra
  vento: 40, // km/h al massimo
  piove: 1, // mm per dire che oggi piove
};

// Dal codice meteo WMO di Open-Meteo a una parola.
export function descriviCodice(codice) {
  if (codice === null || codice === undefined || codice === '') return 'nuvoloso'; // codice mancante: non è «sereno»
  const c = Number(codice);
  if (!Number.isFinite(c)) return 'nuvoloso';
  if (c <= 1) return 'sereno';
  if (c <= 3) return 'nuvoloso';
  if (c === 45 || c === 48) return 'nebbia';
  if (c >= 51 && c <= 57) return 'pioviggine';
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return 'pioggia';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'neve';
  if (c >= 95) return 'temporale';
  return 'nuvoloso';
}

const numero = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// La risposta di Open-Meteo (daily) -> [{ data, codice, tempo, min, max, pioggia, prob, vento }]. Lancia se non è nel formato giusto.
export function giorniMeteo(risposta) {
  const d = risposta?.daily;
  if (!d || !Array.isArray(d.time) || !d.time.length) throw Object.assign(new Error('previsioni non valide'), { codice: 'meteo' });
  return d.time.map((data, i) => ({
    data,
    codice: numero(d.weather_code?.[i]),
    tempo: descriviCodice(d.weather_code?.[i]),
    min: numero(d.temperature_2m_min?.[i]),
    max: numero(d.temperature_2m_max?.[i]),
    pioggia: numero(d.precipitation_sum?.[i]) ?? 0,
    prob: numero(d.precipitation_probability_max?.[i]),
    vento: numero(d.wind_speed_10m_max?.[i]),
  })).filter((g) => /^\d{4}-\d{2}-\d{2}$/.test(g.data));
}

// Oggi piove? Pioggia prevista di almeno 1 mm, o probabile (70%) con almeno un po' d'acqua.
export const piove = (giorno) => Boolean(giorno) && (giorno.pioggia >= SOGLIE.piove || ((giorno.prob ?? 0) >= 70 && giorno.pioggia >= 0.3));

// Gli avvisi per l'orto nei prossimi giorni (da `oggi` per `quanti` giorni): [{ tipo, data, indice, valore }].
export function avvisiMeteo(giorni, oggi, quanti = 3) {
  const da = giorni.findIndex((g) => g.data >= oggi);
  if (da === -1) return [];
  const avvisi = [];
  giorni.slice(da, da + quanti).forEach((g, indice) => {
    if (g.min !== null && g.min <= SOGLIE.gelo) avvisi.push({ tipo: 'gelo', data: g.data, indice, valore: g.min });
    else if (g.min !== null && g.min <= SOGLIE.brina) avvisi.push({ tipo: 'brina', data: g.data, indice, valore: g.min });
    if (g.pioggia >= SOGLIE.pioggiaForte) avvisi.push({ tipo: 'pioggia', data: g.data, indice, valore: g.pioggia });
    if (g.max !== null && g.max >= SOGLIE.caldo) avvisi.push({ tipo: 'caldo', data: g.data, indice, valore: g.max });
    if (g.vento !== null && g.vento >= SOGLIE.vento) avvisi.push({ tipo: 'vento', data: g.data, indice, valore: g.vento });
  });
  return avvisi;
}

// Le previsioni salvate sono ancora buone? (stesso posto, scaricate da meno di `ore` ore)
export function cacheValida(cache, { lat, lon }, adesso = Date.now(), ore = 3) {
  return Boolean(cache) && cache.lat === lat && cache.lon === lon && Array.isArray(cache.giorni) && cache.giorni.length > 0
    && adesso - cache.quando >= 0 && adesso - cache.quando < ore * 3600000;
}

// Arrotonda una coordinata a 2 decimali (circa un chilometro): basta per il meteo e non dice dove si abita.
export const arrotondaCoordinata = (v) => Math.round(Number(v) * 100) / 100;
export const coordinateValide = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
