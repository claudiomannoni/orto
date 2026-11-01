// «I tuoi primi passi» in Oggi: compare per chi comincia, avanza con quello che si fa, si può chiudere. Uso: node tests/34-primi-passi.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai } from './lib.mjs';
const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
await vai(page, 'oggi', '?oggi=2026-06-30');
await page.waitForSelector('.primi-passi');
let testo = await page.locator('.primi-passi').innerText();
check('all\'inizio: 0 su 6 e il vermetto indica il primo passo', /0 su 6 fatti/.test(testo) && /prima coltura/i.test(testo), testo.slice(0, 160));
check('sei voci, ognuna con il suo collegamento', (await page.locator('.primi-passi li a').count()) === 6);

// aggiungo una coltura dal modulo e torno in Oggi
await vai(page, 'colture', '?oggi=2026-06-30');
await page.click('button:has-text("+ Nuova coltura")');
await page.waitForSelector('dialog[open] input[name=nome]');
await page.fill('dialog input[name=nome]', 'Pomodori');
await page.click('dialog button[type=submit]');
await page.waitForSelector('li.coltura');
await vai(page, 'oggi', '?oggi=2026-06-30');
await page.waitForSelector('.primi-passi');
testo = await page.locator('.primi-passi').innerText();
check('con una coltura: 1 su 6 e il prossimo passo è il primo lavoro', /1 su 6 fatti/.test(testo) && /primo lavoro/i.test(testo), testo.slice(0, 200));
check('il passo fatto non è più un collegamento', (await page.locator('.primi-passi li a').count()) === 5);

await page.click('#primi-chiudi');
await page.waitForFunction(() => !document.querySelector('.primi-passi'));
await page.reload();
await page.waitForSelector('.titolo-schermata');
await page.waitForTimeout(500);
check('chiuso una volta non torna', (await page.locator('.primi-passi').count()) === 0);
const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
