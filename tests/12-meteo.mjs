// Meteo (Open-Meteo SIMULATO), avvisi per l'orto, vermetti con l'ombrello, posizione. Uso: node tests/12-meteo.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, scroll, leggiDb, BASE } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
async function nuova(extra = {}) {
  const ctx = await nuovoContesto(browser, { serviceWorkers: 'block', ...extra });
  const page = await ctx.newPage();
  osserva(page, problemi);
  return { ctx, page };
}
const vestiti = (page) => page.$$eval('.avatar[data-chi] .vestito', (i) => [...new Set(i.map((x) => x.getAttribute('src').replace(/^.*\//, '')))]);
const impostazione = async (page, chiave) => (await leggiDb(page, 'impostazioni')).find((x) => x.chiave === chiave)?.valore;

let { ctx, page } = await nuova();

// 1. Giornata tranquilla: tre giorni, niente avvisi, niente ombrello
await vai(page, 'oggi', '?oggi=2026-07-15');
await page.waitForSelector('.meteo .meteo-giorno');
check('meteo: tre giorni (Oggi, Domani, Dopodomani)', (await page.locator('.meteo-giorno').count()) === 3 && (await page.locator('.meteo-giorno strong').allInnerTexts()).join() === 'Oggi,Domani,Dopodomani');
const primo = await page.locator('.meteo-giorno').first().innerText();
check('meteo: sereno, 6° / 16°, asciutto', primo.includes('Sereno') && primo.includes('6° / 16°') && primo.includes('Asciutto'), primo.replace(/\n+/g, ' | '));
check('meteo: nessun avviso', (await page.locator('.meteo .avviso').count()) === 0);
check('meteo: dichiara la fonte e che usa il centro della zona', (await page.locator('.meteo').textContent()).includes('Open-Meteo.com') && (await page.locator('.meteo').textContent()).includes('Castelli Romani'));
check('vermetti in estate (non piove)', (await vestiti(page)).every((v) => v.endsWith('-estate.svg')), (await vestiti(page)).join());
check('la richiesta usa le coordinate della zona e 7 giorni', ctx.richiesteMeteo.length === 1 && ctx.richiesteMeteo[0].includes('latitude=41.81') && ctx.richiesteMeteo[0].includes('longitude=12.68') && ctx.richiesteMeteo[0].includes('forecast_days=7'), ctx.richiesteMeteo[0]);
check('nessuna chiave o dato personale nella richiesta', !/key|token|nome|orto=/i.test(ctx.richiesteMeteo[0].replace('open-meteo', '')));
const sc = await scroll(page);
check('nessuno scroll orizzontale', sc.sw <= sc.iw && sc.bw <= sc.iw, JSON.stringify(sc));

// 2. Dentro tre ore non si riscarica
await page.reload();
await page.waitForSelector('.meteo .meteo-giorno');
check('entro 3 ore le previsioni si prendono dalla memoria: nessuna nuova richiesta', ctx.richiesteMeteo.length === 1, String(ctx.richiesteMeteo.length));

// 2b. Acqua: quanta pioggia è caduta nei 7 giorni passati e se annaffiare
check('acqua: la richiesta chiede anche i 7 giorni passati', ctx.richiesteMeteo[0].includes('past_days=7'), ctx.richiesteMeteo[0]);
check('acqua: luglio senza pioggia e fa 16 gradi: «guarda il terreno»', /Acqua: Guarda il terreno/.test(await page.locator('.meteo').textContent()), await page.locator('.meteo').textContent());
ctx.meteoFinto = (oggi, i) => (i === 0 ? { tmax: 31 } : {});
await page.evaluate(() => new Promise((ok) => { const r = indexedDB.open('orto'); r.onsuccess = () => { const db = r.result; const tx = db.transaction('impostazioni', 'readwrite'); tx.objectStore('impostazioni').delete('meteo_cache'); tx.oncomplete = () => { db.close(); ok(); }; }; }));
await page.reload();
await page.waitForSelector('.meteo .acqua');
check('acqua: caldo e settimana asciutta: «conviene annaffiare»', /Oggi conviene annaffiare/.test(await page.locator('.meteo').textContent()) && /pochissima pioggia \(0 mm\)/.test(await page.locator('.meteo').textContent()), await page.locator('.meteo').textContent());
ctx.meteoFinto = (oggi, i) => (i >= -6 && i <= -1 ? { pioggia: 10 } : {});
await page.evaluate(() => new Promise((ok) => { const r = indexedDB.open('orto'); r.onsuccess = () => { const db = r.result; const tx = db.transaction('impostazioni', 'readwrite'); tx.objectStore('impostazioni').delete('meteo_cache'); tx.oncomplete = () => { db.close(); ok(); }; }; }));
await page.reload();
await page.waitForSelector('.meteo .acqua');
check('acqua: settimana piovosa (60 mm): «puoi saltare»', /Oggi puoi saltare l'annaffiatura/.test(await page.locator('.meteo').textContent()) && /60 mm/.test(await page.locator('.meteo').textContent()), await page.locator('.meteo').textContent());
check('acqua: dichiara che è di massima', /di massima/.test(await page.locator('.meteo').textContent()));
ctx.meteoFinto = null;
await page.evaluate(() => new Promise((ok) => { const r = indexedDB.open('orto'); r.onsuccess = () => { const db = r.result; const tx = db.transaction('impostazioni', 'readwrite'); tx.objectStore('impostazioni').delete('meteo_cache'); tx.oncomplete = () => { db.close(); ok(); }; }; }));

await ctx.close();

// 3. Gelata, brina, pioggia forte, caldo, vento
({ ctx, page } = await nuova());
ctx.meteoFinto = (oggi, i) => (i === 1 ? { tmin: -2, tmax: 9, pioggia: 14, prob: 90, vento: 50, codice: 65 } : i === 2 ? { tmin: 2, tmax: 35, codice: 0 } : {});
await vai(page, 'oggi', '?oggi=2026-11-10');
await page.waitForSelector('.meteo .avviso');
const avvisi = await page.locator('.meteo .avviso').allInnerTexts();
check('avviso di gelata «domani» con la minima', avvisi.some((a) => a.includes('Gelata prevista domani') && a.includes('-2°')), avvisi.join(' | '));
check('avviso di pioggia forte e di vento', avvisi.some((a) => a.includes('Pioggia forte domani') && a.includes('14 mm')) && avvisi.some((a) => a.includes('Vento forte domani') && a.includes('50 km/h')));
check('avviso di brina e di caldo «dopodomani»', avvisi.some((a) => a.includes('Possibile brina dopodomani')) && avvisi.some((a) => a.includes('Caldo forte dopodomani') && a.includes('35°')));
check('gli avvisi sono annunciati (role=alert)', (await page.locator('.meteo .avviso[role=alert]').count()) === avvisi.length);
check('domani: «Pioggia», 14 mm', (await page.locator('.meteo-giorno').nth(1).innerText()).includes('Pioggia') && (await page.locator('.meteo-giorno').nth(1).innerText()).includes('14 mm'));
check('oggi non piove: niente ombrello', (await vestiti(page)).every((v) => v.endsWith('-autunno.svg')), (await vestiti(page)).join());
await ctx.close();

// 4. Oggi piove: i vermetti prendono l'ombrello (ma non a Natale)
({ ctx, page } = await nuova());
ctx.meteoFinto = (oggi, i) => (i === 0 ? { pioggia: 6, prob: 95, codice: 63 } : {});
await vai(page, 'oggi', '?oggi=2026-07-15');
await page.waitForSelector('.meteo .meteo-giorno');
await page.waitForFunction(() => [...document.querySelectorAll('.avatar .vestito')].every((i) => i.src.endsWith('-pioggia.svg')));
check('oggi piove: Rosso e Rossella con l\'ombrello', (await vestiti(page)).every((v) => v.endsWith('-pioggia.svg')), (await vestiti(page)).join());
await page.reload();
await page.waitForSelector('.avatar .vestito', { state: 'attached' });
await page.waitForFunction(() => [...document.querySelectorAll('.avatar .vestito')].every((i) => i.src.endsWith('-pioggia.svg')));
check('riaprendo (con le previsioni salvate) l\'ombrello c\'è subito', true);
await page.goto(`${BASE}/?oggi=2026-12-25#/oggi`);
await page.waitForSelector('.meteo .meteo-giorno');
check('a Natale con la pioggia: Natale', (await vestiti(page)).every((v) => v.endsWith('-natale.svg')), (await vestiti(page)).join());
await page.goto(`${BASE}/?oggi=2026-07-15#/impostazioni`);
await page.waitForSelector('select[name=vestiti]');
await page.selectOption('select[name=vestiti]', 'estate');
await page.waitForTimeout(200);
check('scegliendo a mano un vestito, la pioggia non lo cambia', (await vestiti(page)).every((v) => v.endsWith('-estate.svg')));
await ctx.close();

// 5. Senza internet: ultime previsioni salvate, con l'avviso; la prima volta messaggio chiaro
({ ctx, page } = await nuova());
await vai(page, 'oggi', '?oggi=2026-07-15');
await page.waitForSelector('.meteo .meteo-giorno');
await page.evaluate(() => new Promise((ok) => { const r = indexedDB.open('orto'); r.onsuccess = () => { const db = r.result; const tx = db.transaction('impostazioni', 'readwrite'); const s = tx.objectStore('impostazioni'); const q = s.get('meteo_cache'); q.onsuccess = () => { s.put({ chiave: 'meteo_cache', valore: { ...q.result.valore, quando: Date.now() - 5 * 3600000 } }); }; tx.oncomplete = () => { db.close(); ok(); }; }; }));
await ctx.unroute('**/api.open-meteo.com/**');
await ctx.route('**/api.open-meteo.com/**', (r) => r.abort('connectionfailed'));
await page.reload();
await page.waitForSelector('.meteo .meteo-giorno');
check('senza connessione: si vedono le ultime previsioni, con «5 ore fa»', (await page.locator('.meteo').textContent()).includes('Previsioni di 5 ore fa'), (await page.locator('.meteo').textContent()).replace(/\n+/g, ' | ').slice(0, 200));
await ctx.close();

({ ctx, page } = await nuova());
await ctx.unroute('**/api.open-meteo.com/**');
await ctx.route('**/api.open-meteo.com/**', (r) => r.abort('connectionfailed'));
await vai(page, 'oggi', '?oggi=2026-07-15');
await page.waitForFunction(() => document.querySelector('.meteo')?.innerText.includes('non è disponibile'));
check('senza connessione e senza previsioni salvate: messaggio chiaro, l\'app va avanti', (await page.locator('li.lavoro, .vuoto').count()) > 0 || (await page.locator('h2.titolo-schermata').count()) === 1);
await ctx.close();

// 6. Risposta strana: non rompe niente
({ ctx, page } = await nuova());
await ctx.unroute('**/api.open-meteo.com/**');
await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: '{"qualcosa":"di strano"}' }));
await vai(page, 'oggi', '?oggi=2026-07-15');
await page.waitForFunction(() => document.querySelector('.meteo')?.innerText.includes('non è disponibile'));
check('risposta strana di Open-Meteo: «non disponibile», nessun crash', true);
await ctx.close();
({ ctx, page } = await nuova());
await ctx.unroute('**/api.open-meteo.com/**');
await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' }, body: 'boom' }));
await vai(page, 'oggi', '?oggi=2026-07-15');
await page.waitForFunction(() => document.querySelector('.meteo')?.innerText.includes('non è disponibile'));
check('errore 500 di Open-Meteo: «non disponibile», nessun crash', true);
await ctx.close();

// 7. Posizione: quella del telefono (arrotondata) o il centro della zona
({ ctx, page } = await nuova({ permissions: ['geolocation'], geolocation: { latitude: 41.82336, longitude: 12.7467 } }));
await vai(page, 'impostazioni', '?oggi=2026-07-15');
await page.waitForSelector('text=Usa la posizione del telefono');
check('impostazioni: di partenza «centro della zona»', (await page.locator('.posizione-meteo').innerText()).includes('centro della zona'));
await page.getByRole('button', { name: 'Usa la posizione del telefono' }).click();
await page.waitForFunction(() => document.body.innerText.includes('Posizione scelta: 41.82, 12.75'));
const pos = await impostazione(page, 'meteo_posizione');
check('posizione salvata arrotondata a 2 decimali (circa 1 km): 41.82, 12.75', pos?.lat === 41.82 && pos?.lon === 12.75, JSON.stringify(pos));
await page.goto(`${BASE}/?oggi=2026-07-15#/oggi`);
await page.waitForSelector('.meteo .meteo-giorno');
check('il meteo usa la posizione scelta', ctx.richiesteMeteo.some((u) => u.includes('latitude=41.82') && u.includes('longitude=12.75')) && (await page.locator('.meteo').textContent()).includes('posizione scelta'), ctx.richiesteMeteo.join(' '));
await page.goto(`${BASE}/?oggi=2026-07-15#/impostazioni`);
await page.waitForSelector('text=Torna al centro della zona');
await page.getByRole('button', { name: 'Torna al centro della zona' }).click();
await page.waitForFunction(() => document.body.innerText.includes('Posizione: centro della zona'));
check('«Torna al centro della zona» toglie la posizione', (await impostazione(page, 'meteo_posizione')) === null);
await ctx.close();

// Posizione negata
({ ctx, page } = await nuova());
await vai(page, 'impostazioni', '?oggi=2026-07-15');
await page.getByRole('button', { name: 'Usa la posizione del telefono' }).click();
await page.waitForFunction(() => document.body.innerText.includes('Non riesco ad avere la posizione'), null, { timeout: 20000 });
check('permesso di posizione negato: messaggio chiaro e nessuna posizione salvata', (await impostazione(page, 'meteo_posizione')) == null);
await ctx.close();

check('nessun errore in console / rete (esclusi i guasti simulati)', problemi.filter((p) => !/open-meteo|Failed to load resource|Service Worker registration blocked|ERR_|\b500\b|geolocation|Geolocation/i.test(p)).length === 0, problemi.join(' | ').slice(0, 600));
await browser.close();
process.exit(finale() ? 1 : 0);
