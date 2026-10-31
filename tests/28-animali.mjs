// Api, vermi e galline: schede con fonti. Uso: node tests/28-animali.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai } from './lib.mjs';
const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
await vai(page, 'colture');
await page.click('a.tessera-azione[href="#/animali"]');
await page.waitForSelector('a[data-scheda]');
const ids = await page.locator('a[data-scheda]').evaluateAll((a) => a.map((x) => x.dataset.scheda));
check('tre schede: lombricoltura, api, pollaio', ids.join() === 'lombricoltura,api,pollaio', ids.join());
check('la barra tiene acceso «Il mio orto»', (await page.locator('#barra a[aria-current=page]').innerText()).includes('Il mio orto'));
for (const id of ids) {
  await page.goto(`${page.url().split('#')[0]}#/animali?scheda=${id}`);
  await page.waitForSelector('h3');
  const testo = await page.locator('main, #app, body').first().innerText();
  const collegamenti = await page.locator('a[href^="http"]').count();
  check(`${id}: cosa serve, come si parte e almeno una fonte`, /Cosa serve/.test(testo) && /Come si parte/.test(testo) && collegamenti >= 1, `link ${collegamenti}`);
}
await page.goto(`${page.url().split('#')[0]}#/rendita`);
await page.waitForSelector('a[data-scheda]');
const ids2 = await page.locator('a[data-scheda]').evaluateAll((a) => a.map((x) => x.dataset.scheda));
check('colture speciali: zafferano, funghi, fiori, varietà rare, aromatiche', ids2.length === 6 && ids2.includes('zafferano') && ids2.includes('fiori-edibili'), ids2.join());
for (const id of ids2) {
  await page.goto(`${page.url().split('#')[0]}#/rendita?scheda=${id}`);
  await page.waitForSelector('h3');
  check(`${id}: si apre con almeno una fonte`, (await page.locator('a[href^="http"]').count()) >= 1);
}
const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
