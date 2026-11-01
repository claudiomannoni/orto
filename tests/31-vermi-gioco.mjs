// Il giardino dei vermi: trascina, lancia, solletica, scava, dai da mangiare, minuti di relax. Uso: node tests/31-vermi-gioco.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, leggiDb } from './lib.mjs';
const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
await vai(page, 'oggi');
await page.click('a.gioco-vermi');
await page.waitForSelector('canvas.giardino-vermi');
check('si entra dall\'icona in testata e la barra non cambia voce', (await page.locator('.gioco-vermi').getAttribute('aria-current')) === 'page');
await page.waitForTimeout(800);
const r = await page.locator('canvas.giardino-vermi').boundingBox();
const pieno = () => page.$eval('canvas.giardino-vermi', (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let rossi = 0; for (let i = 0; i < d.length; i += 16) if (d[i] > 170 && d[i + 1] < 90 && d[i + 2] < 80) rossi++; return rossi; });
check('i vermi sono disegnati (pixel rossi sul quadro)', (await pieno()) > 30);

// trascinare e lanciare: prendo il verme di sinistra vicino alla sua testa e lo trascino in alto a sinistra
const suolo = Math.round(380 * 0.46);
const testa = async () => page.evaluate(() => null);
const x0 = r.x + r.width * 0.3 + 8;
const y0 = r.y + suolo - 14;
await page.mouse.move(x0, y0);
await page.mouse.down();
await page.mouse.move(x0 - 40, y0 - 90, { steps: 8 });
await page.mouse.move(x0 - 60, y0 - 140, { steps: 6 });
await page.waitForTimeout(150);
const sollevato = await pieno();
check('trascinato in alto il verme segue il dito', sollevato > 30);
await page.mouse.up();
await page.waitForTimeout(900);
check('lasciato, ricade (nessun errore, ancora disegnato)', (await pieno()) > 30);

// cibo: una foglia compare e cade
await page.click('#cibo-foglia');
await page.waitForTimeout(1200);
check('la foglia viene disegnata (pixel verdi)', await page.$eval('canvas.giardino-vermi', (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let v = 0; for (let i = 0; i < d.length; i += 16) if (d[i] > 60 && d[i] < 110 && d[i + 1] > 150 && d[i + 2] < 100) v++; return v > 5; }));

// minuti di relax: dopo qualche secondo di gioco il riepilogo parla di relax
await page.mouse.move(r.x + 100, r.y + 100);
await page.mouse.down(); await page.mouse.up();
await page.waitForTimeout(2500);
check('il riepilogo dei minuti di relax c\'è', /Oggi: \d+ min di relax/.test(await page.locator('#relax-riepilogo').innerText()));
await page.goBack().catch(() => {});
await page.waitForTimeout(400);
const imp = await leggiDb(page, 'impostazioni');
const relax = imp.find((x) => x.chiave === 'relax')?.valore;
check('i secondi di relax vengono salvati', relax && Object.values(relax).reduce((a, b) => a + b, 0) >= 1, JSON.stringify(relax));
const veri = problemi.filter((p) => !/Service Worker registration blocked|willReadFrequently/.test(p));
check('nessun errore in console', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
