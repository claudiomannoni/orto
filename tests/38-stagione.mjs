// L'avviso di stagione sotto le piante: fuori stagione, fine stagione, gelo. Uso: node tests/38-stagione.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai } from './lib.mjs';
const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
// dati di prova per freddo e fine stagione (il file vero lo scrive Codex con le fonti)
const prova = { versione: 1, fonti: { f1: { titolo: 'Fonte di prova', ente: 'Prova', url: 'https://example.com/f1', consultata: '2026-11-02', nota: '' } }, colture: {
  basilico: { ciclo: 'annuale', freddo: { tolleranza: 'muore-col-gelo', soglia_c: null, nota: 'Le foglie anneriscono con il gelo.', certezza: 'media', fonti: ['f1'] }, fine_stagione: { azione: 'raccogliere-tutto', cosa_fare: 'Raccogli tutte le foglie prima del gelo.', come: 'Taglia i rami e usa o congela le foglie.', perche: 'Il gelo distrugge la pianta.', certezza: 'media', fonti: ['f1'] } },
} };
await page.route('**/data/it/stagione.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(prova) }));

await vai(page, 'oggi', '?oggi=2026-11-02');
await page.evaluate(() => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => {
    const d = r.result; const tx = d.transaction('colture', 'readwrite');
    tx.objectStore('colture').put({ id: 'c1', nome: 'Basilico', varieta: '', dataSemina: '2026-11-02', dove: 'orto', partenza: 'piantina', note: '', creata: '2026-11-02T08:00:00.000Z', schedaId: 'basilico', zonaId: null, schemaVersion: 2 });
    tx.objectStore('colture').put({ id: 'c2', nome: 'Basilico vecchio', varieta: '', dataSemina: '2026-09-12', dove: 'orto', partenza: 'piantina', note: '', creata: '2026-09-12T08:00:00.000Z', schedaId: 'basilico', zonaId: null, schemaVersion: 2 });
    tx.objectStore('colture').put({ id: 'c3', nome: 'Pomodori', varieta: '', dataSemina: '2026-06-01', dove: 'orto', partenza: 'piantina', note: '', creata: '2026-06-01T08:00:00.000Z', schedaId: 'pomodori', zonaId: null, schemaVersion: 2 });
    tx.oncomplete = () => { d.close(); ok(); };
  };
}));
await vai(page, 'colture', '?oggi=2026-11-02');
await page.waitForSelector('li.coltura');
await page.waitForTimeout(800);
const carta = (nome) => page.locator('li.coltura', { hasText: nome }).first();
const nuovo = await carta('Basilico').innerText();
check('basilico trapiantato il 2 novembre: «Fuori stagione» con i mesi giusti (maggio...settembre)', /Fuori stagione/.test(await page.locator('li.coltura:has-text("Trapiantata il 2 novembre") .stagione').innerText()) && /maggio/i.test(await page.locator('li.coltura:has-text("Trapiantata il 2 novembre") .stagione').innerText()) && /settembre/i.test(await page.locator('li.coltura:has-text("Trapiantata il 2 novembre") .stagione').innerText()), nuovo.slice(0, 120));
const vecchio = page.locator('li.coltura:has-text("Basilico vecchio") .stagione');
check('basilico di settembre: «Fine stagione» con cosa fare, come, perché e la fonte', /Fine stagione/.test(await vecchio.innerText()) && /Raccogli tutte le foglie/.test(await vecchio.innerText()) && /Taglia i rami/.test(await vecchio.innerText()) && /Il gelo distrugge/.test(await vecchio.innerText()) && (await vecchio.locator('a[href^="https://example.com"]').count()) === 1, (await vecchio.innerText()).slice(0, 200));
check('i pomodori (nessun dato sul freddo nel file di prova) non hanno avvisi inventati', (await page.locator('li.coltura:has-text("Pomodori") .stagione').count()) === 0);
const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
