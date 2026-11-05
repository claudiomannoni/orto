// La mia settimana: numeri degli ultimi 7 giorni e figurina da condividere. Uso: node tests/25-resoconto.mjs http://localhost:8101
import fs from 'node:fs';
import { chromium, nuovoContesto, check, osserva, finale, vai } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block', acceptDownloads: true });
const page = await ctx.newPage();
osserva(page, problemi);

await vai(page, 'oggi', '?oggi=2026-06-20');
await page.locator('details.oggi-altri').evaluate((x) => { x.open = true; });
await page.waitForSelector('#apri-resoconto');
await page.dispatchEvent('#apri-resoconto', 'click');
await page.waitForSelector('dialog[open] .resoconto-numeri');
check('settimana vuota: tre numeri a zero e una frase gentile', (await page.locator('dialog[open] .resoconto-numeri strong').allInnerTexts()).join() === '0,0,0' && /Settimana tranquilla/.test(await page.locator('dialog[open]').innerText()));
await page.keyboard.press('Escape');

await page.evaluate(() => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => {
    const d = r.result; const tx = d.transaction('eventi', 'readwrite'); const s = tx.objectStore('eventi');
    const e = (id, tipo, data, extra = {}) => s.put({ id, tipo, data, esito: 'ok', creato: `${data}T08:00:00.000Z`, ...extra });
    e('a', 'lavoro_fatto', '2026-06-20'); e('b', 'lavoro_fatto', '2026-06-19'); e('c', 'lavoro_fatto', '2026-06-18'); e('d', 'lavoro_fatto', '2026-06-18');
    e('f', 'lavoro_fatto', '2026-06-10'); // fuori dalla settimana
    e('g', 'raccolto', '2026-06-17', { quantita: 1.5, unita: 'kg', nomeColtura: 'Zucchine' });
    e('h', 'nota', '2026-06-16', { note: 'bella giornata' });
    tx.oncomplete = () => { d.close(); ok(); };
  };
}));
await page.reload();
await page.waitForSelector('h2.titolo-schermata:has-text("Oggi in campagna")');
// Dopo il ricaricamento «Mostra tutto» si richiude: si riapre prima di prendere il pulsante.
await page.evaluate(() => { const d = document.querySelector('details.oggi-altri'); if (d) d.open = true; });
await page.waitForSelector('#apri-resoconto');
await page.dispatchEvent('#apri-resoconto', 'click');
await page.waitForSelector('dialog[open] .resoconto-numeri');
check('lavori 4 (quello vecchio non conta), raccolto 1,5 kg, giorni attivi 5', (await page.locator('dialog[open] .resoconto-numeri strong').allInnerTexts()).join() === '4,1,5 kg,5', (await page.locator('dialog[open] .resoconto-numeri strong').allInnerTexts()).join());
check('periodo scritto e coltura del raccolto', /Dal .* al 20 giugno 2026/.test(await page.locator('dialog[open]').innerText()) && /Zucchine/.test(await page.locator('dialog[open]').innerText()));
check('frase «Che settimana» con 5 giorni attivi', /Che settimana/.test(await page.locator('dialog[open]').innerText()));
const [scarico] = await Promise.all([page.waitForEvent('download'), page.dispatchEvent('#condividi-settimana', 'click')]);
const byte = fs.readFileSync(await scarico.path());
check('la figurina è un PNG 1080x1350 chiamato la-mia-settimana.png', scarico.suggestedFilename() === 'la-mia-settimana.png' && byte.slice(0, 8).toString('hex') === '89504e470d0a1a0a' && byte.readUInt32BE(16) === 1080 && byte.readUInt32BE(20) === 1350);
const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console / rete', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
