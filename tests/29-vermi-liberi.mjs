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

// discrezione: sopra un contenuto il verme diventa trasparente e lascia passare i tocchi
const alfa = await page.evaluate(async () => {
  const r = document.querySelector('.vermi-liberi canvas').getBoundingClientRect();
  const b = document.createElement('button'); b.id = 'prova-sotto'; b.textContent = 'Prova';
  b.style.cssText = `position:fixed;left:0;width:100vw;top:${r.top}px;height:${r.height - 22}px;z-index:5`;
  document.body.append(b);
  await new Promise((ok) => setTimeout(ok, 1500));
  const t = [...document.querySelectorAll('.tocco-vermetto')].map((x) => x.style.pointerEvents);
  b.remove();
  return t;
});
check('sopra un pulsante i vermi lasciano passare i tocchi', alfa.every((a) => a === 'none'), alfa.join());
// consigli utili: un verme si ferma, dice una cosa che serve e si può toccare per andare lì
await page.evaluate(() => dispatchEvent(new Event('vermi-consiglio')));
await page.waitForSelector('.consiglio-verme', { timeout: 5000 });
const consiglio = await page.locator('.consiglio-verme').innerText();
check('un verme dà un consiglio con una frase vera', consiglio.length > 20 && !/verme\.consiglio/.test(consiglio), consiglio);
const rotta = await page.evaluate(() => document.querySelector('.consiglio-verme').dataset.chi);
check('il consiglio ha il suo vermetto (Rosso o Rossella)', ['rosso', 'rossella'].includes(rotta));
await page.locator('.consiglio-verme').click();
await page.waitForFunction(() => !document.querySelector('.consiglio-verme'), null, { timeout: 3000 });
check('toccato, il consiglio si chiude', true);
// assenza lunga: i vermi dormono, si svegliano al tocco, e dicono il bentornato
const dopo = await nuovoContesto(browser, { serviceWorkers: 'block' });
const pagina2 = await dopo.newPage();
osserva(pagina2, problemi);
await vai(pagina2, 'oggi', '?oggi=2026-06-01');
await pagina2.waitForSelector('.vermi-liberi canvas');
await vai(pagina2, 'oggi', '?oggi=2026-06-20'); // 19 giorni dopo
await pagina2.waitForSelector('.vermi-liberi canvas');
await pagina2.waitForTimeout(400);
check('dopo 19 giorni di assenza i vermi dormono', (await pagina2.$$eval('.tocco-vermetto', (b) => b.map((x) => x.dataset.stato))).every((s) => s === 'dorme'));
await pagina2.waitForSelector('.consiglio-verme', { timeout: 6000 });
check('dicono il bentornato con i giorni', /19 giorni/.test(await pagina2.locator('.consiglio-verme').innerText()), await pagina2.locator('.consiglio-verme').innerText());
await pagina2.mouse.click(200, 300);
await pagina2.waitForFunction(() => [...document.querySelectorAll('.tocco-vermetto')].every((b) => b.dataset.stato !== 'dorme'), null, { timeout: 4000 });
check('al primo tocco si svegliano', true);
const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
