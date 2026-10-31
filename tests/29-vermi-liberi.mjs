// I vermi liberi sul bordo dello schermo: camminano, scavano, vanno sotto terra e escono. Uso: node tests/29-vermi-liberi.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai } from './lib.mjs';
const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
await vai(page, 'oggi');
await page.waitForSelector('.vermi-liberi canvas');
const stati = () => page.$$eval('.tocco-vermetto', (b) => b.map((x) => x.dataset.stato || 'nascosto'));
await page.waitForTimeout(600);
check('due vermi liberi, camminano', (await page.locator('.tocco-vermetto').count()) === 2 && (await stati()).every((s) => s === 'cammina'), (await stati()).join());
check('lo strato non blocca i tocchi della pagina (pointer-events: none)', await page.$eval('.vermi-liberi', (e) => getComputedStyle(e).pointerEvents === 'none'));
const sopraLaBarra = await page.evaluate(() => { const s = document.querySelector('.vermi-liberi').getBoundingClientRect(); const b = document.getElementById('barra').getBoundingClientRect(); return Math.abs(s.bottom - b.top) < 2; });
check('lo strato sta appoggiato sopra la barra', sopraLaBarra);

await page.evaluate(() => dispatchEvent(new Event('vermi-scavano')));
await page.waitForFunction(() => [...document.querySelectorAll('.tocco-vermetto')].every((b) => b.dataset.stato === 'scava' || b.style.display === 'none'), null, { timeout: 3000 });
await page.waitForFunction(() => [...document.querySelectorAll('.tocco-vermetto')].every((b) => b.style.display === 'none'), null, { timeout: 8000 });
check('scavano e spariscono sotto terra', true);
await page.screenshot({ path: process.env.TEMP + '/sotto.png', clip: { x: 0, y: 623, width: 390, height: 150 } });
await page.evaluate(() => dispatchEvent(new Event('vermi-esci')));
await page.waitForFunction(() => [...document.querySelectorAll('.tocco-vermetto')].every((b) => b.style.display !== 'none' && b.dataset.stato === 'cammina'), null, { timeout: 15000 });
check('escono di nuovo dalla terra e tornano a camminare', true);

// tocco: battuta e salto
await page.waitForTimeout(500);
await page.dispatchEvent('.tocco-vermetto[data-chi=rosso]', 'click');
await page.waitForSelector('.tocco-vermetto[data-chi=rosso] .sbuffo', { state: 'attached', timeout: 3000 });
check('toccato, Rosso dice una battuta', true);

// festa: saltano fuori
await page.evaluate(() => dispatchEvent(new Event('vermi-scavano')));
await page.waitForFunction(() => [...document.querySelectorAll('.tocco-vermetto')].every((b) => b.style.display === 'none'), null, { timeout: 8000 });
await page.evaluate(() => dispatchEvent(new Event('vermi-festa')));
await page.waitForFunction(() => [...document.querySelectorAll('.tocco-vermetto')].every((b) => b.style.display !== 'none'), null, { timeout: 5000 });
check('quando l\'app festeggia escono dalla terra', true);

const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
