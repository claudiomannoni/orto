// Prova del meteo (Node, nessun server né rete). Uso: node tests/fase5-meteo.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const carica = (p) => import(pathToFileURL(path.join(radice, p)).href);
const { descriviCodice, giorniMeteo, piove, avvisiMeteo, cacheValida, arrotondaCoordinata, coordinateValide } = await carica('js/motore/meteo.js');
const { vestitoDelGiorno } = await carica('js/motore/vestiti.js');

let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
const lancia = (f) => { try { f(); return null; } catch (e) { return e; } };

for (const [codice, atteso] of [[0, 'sereno'], [1, 'sereno'], [2, 'nuvoloso'], [3, 'nuvoloso'], [45, 'nebbia'], [48, 'nebbia'], [53, 'pioviggine'], [61, 'pioggia'], [65, 'pioggia'], [80, 'pioggia'], [82, 'pioggia'], [71, 'neve'], [86, 'neve'], [95, 'temporale'], [99, 'temporale'], [null, 'nuvoloso'], ['boh', 'nuvoloso'], [999, 'temporale']]) {
  check(`codice ${codice} = ${atteso}`, descriviCodice(codice) === atteso, descriviCodice(codice));
}

const risposta = {
  daily: {
    time: ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', 'rotto'],
    weather_code: [0, 61, 95, 71, 0],
    temperature_2m_min: [6, -1, 2, 9, 5],
    temperature_2m_max: [16, 12, 34, 14, 15],
    precipitation_sum: [0, 12, 3, null, 0],
    precipitation_probability_max: [5, 90, 60, 20, 0],
    wind_speed_10m_max: [10, 45, 20, 8, 5],
  },
};
const g = giorniMeteo(risposta);
check('giorniMeteo: tiene i giorni con data valida (4 su 5)', g.length === 4 && g[0].data === '2026-11-10', String(g.length));
check('giorniMeteo: campi letti e parola del tempo', g[1].min === -1 && g[1].max === 12 && g[1].pioggia === 12 && g[1].tempo === 'pioggia' && g[2].tempo === 'temporale');
check('giorniMeteo: pioggia mancante = 0', g[3].pioggia === 0);
for (const [nome, r] of [['vuota', {}], ['senza daily', { x: 1 }], ['time vuoto', { daily: { time: [] } }], ['null', null], ['time non array', { daily: { time: 'x' } }]]) {
  check(`giorniMeteo: risposta ${nome} -> errore «meteo»`, lancia(() => giorniMeteo(r))?.codice === 'meteo');
}
const parziale = giorniMeteo({ daily: { time: ['2026-11-10'] } });
check('giorniMeteo: senza gli altri campi non si rompe', parziale.length === 1 && parziale[0].min === null && parziale[0].pioggia === 0 && parziale[0].prob === null);

check('piove: 12 mm sì, 0 mm no, 0,5 mm con 40% no, 0,5 mm con 80% sì', piove(g[1]) && !piove(g[0]) && !piove({ pioggia: 0.5, prob: 40 }) && piove({ pioggia: 0.5, prob: 80 }));
check('piove: senza giorno = no, 1 mm giusto = sì', !piove(undefined) && piove({ pioggia: 1, prob: null }));

const av = avvisiMeteo(g, '2026-11-10', 3);
const tipi = av.map((a) => `${a.indice}:${a.tipo}`);
check('avvisi nei tre giorni: gelo domani, pioggia forte e vento domani, caldo e brina... il 12', tipi.includes('1:gelo') && tipi.includes('1:pioggia') && tipi.includes('1:vento') && tipi.includes('2:caldo') && tipi.includes('2:brina'), tipi.join(' '));
check('nessun avviso per un giorno tranquillo (oggi 6/16 gradi)', !av.some((a) => a.indice === 0));
check('gelo e brina non insieme nello stesso giorno', !(tipi.includes('1:gelo') && tipi.includes('1:brina')));
check('avvisi: solo oggi', avvisiMeteo(g, '2026-11-10', 1).length === 0);
check('avvisi: parte dalla data di oggi (salta i giorni passati)', avvisiMeteo(g, '2026-11-11', 1).map((a) => a.tipo).includes('gelo'));
check('avvisi: oggi dopo l\'ultimo giorno = nessuno, senza errori', avvisiMeteo(g, '2027-01-01').length === 0 && avvisiMeteo([], '2026-11-10').length === 0);
check('avvisi: temperatura mancante non dà avvisi', avvisiMeteo([{ data: '2026-11-10', min: null, max: null, pioggia: 0, vento: null }], '2026-11-10').length === 0);
check('brina: minima 3 sì, 3,1 no', avvisiMeteo([{ data: 'd', min: 3, max: 10, pioggia: 0, vento: 0 }], 'a')[0]?.tipo === 'brina' && avvisiMeteo([{ data: 'd', min: 3.1, max: 10, pioggia: 0, vento: 0 }], 'a').length === 0);

const posto = { lat: 41.81, lon: 12.68 };
const adesso = 1_000_000_000_000;
check('cache valida: stesso posto, 1 ora fa', cacheValida({ ...posto, quando: adesso - 3600000, giorni: [1] }, posto, adesso));
check('cache scaduta: 4 ore fa', !cacheValida({ ...posto, quando: adesso - 4 * 3600000, giorni: [1] }, posto, adesso));
check('cache di un altro posto: no', !cacheValida({ lat: 40, lon: 12.68, quando: adesso, giorni: [1] }, posto, adesso));
check('cache vuota, nulla o dal futuro: no', !cacheValida({ ...posto, quando: adesso, giorni: [] }, posto, adesso) && !cacheValida(null, posto, adesso) && !cacheValida({ ...posto, quando: adesso + 9999, giorni: [1] }, posto, adesso));

check('coordinate arrotondate a 2 decimali', arrotondaCoordinata(41.82336) === 41.82 && arrotondaCoordinata(12.7467) === 12.75 && arrotondaCoordinata(-3.456) === -3.46);
check('coordinate valide e no', coordinateValide(41.8, 12.7) && !coordinateValide(91, 0) && !coordinateValide(0, 181) && !coordinateValide(NaN, 1) && !coordinateValide(undefined, undefined));

// Vestiti con la pioggia
check('con la pioggia l\'ombrello prende il posto della stagione', ['2026-01-15', '2026-04-15', '2026-07-15', '2026-09-15'].every((d) => vestitoDelGiorno(d, { piove: true }) === 'pioggia'));
check('senza pioggia resta la stagione', vestitoDelGiorno('2026-07-15', { piove: false }) === 'estate' && vestitoDelGiorno('2026-07-15') === 'estate');
check('le feste battono la pioggia (Natale, Halloween, Pasqua, compleanno)', vestitoDelGiorno('2026-12-25', { piove: true }) === 'natale' && vestitoDelGiorno('2026-10-31', { piove: true }) === 'halloween' && vestitoDelGiorno('2026-04-05', { piove: true }) === 'pasqua' && vestitoDelGiorno('2027-07-15', { nato: '2026-07-15', piove: true }) === 'compleanno');

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
