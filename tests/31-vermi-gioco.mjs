// Il giardino dei vermi a tutto schermo: trascina (anche col dito), lancia, scava, dai da mangiare, minuti di relax. Uso: node tests/31-vermi-gioco.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, leggiDb } from './lib.mjs';
const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
page.on('dialog', (d) => d.accept());
await vai(page, 'impara');
await page.click('a[href="#/vermi"]');
await page.waitForSelector('canvas.giardino-vermi');
await page.waitForTimeout(900);
check('il gioco occupa tutto lo schermo (niente testata né barra)', await page.evaluate(() => getComputedStyle(document.querySelector('.testata')).display === 'none' && getComputedStyle(document.getElementById('barra')).display === 'none' && document.querySelector('canvas.giardino-vermi').getBoundingClientRect().height >= innerHeight - 1));
const teste = async () => JSON.parse(await page.$eval('canvas.giardino-vermi', (c) => c.dataset.teste || '[]'));
const suolo = Number(await page.$eval('canvas.giardino-vermi', (c) => c.dataset.suolo));
await page.waitForTimeout(400);
let t0 = await teste();
check('i due vermi sono sul prato', t0.length === 2 && t0.every(([, y]) => y <= suolo + 2), JSON.stringify(t0));

// Trascinamento col dito (eventi touch veri via CDP): prendo la testa di Rosso e la porto nella terra
const cdp = await ctx.newCDPSession(page);
const tocco = (tipo, x, y) => cdp.send('Input.dispatchTouchEvent', { type: tipo, touchPoints: tipo === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
const [hx, hy] = t0[0];
await tocco('touchStart', hx, hy);
for (let i = 1; i <= 14; i++) { await tocco('touchMove', hx + i * 2, hy + i * 14); await page.waitForTimeout(16); }
await page.waitForTimeout(250);
const t1 = await teste();
check('col dito la testa segue e va sotto la terra', t1[0][1] > suolo + 40 && t1[0][2] === 1, JSON.stringify(t1));
await tocco('touchEnd');
await page.waitForTimeout(500);
const t2 = await teste();
check('lasciata, resta nella terra e scava (galleria)', t2[0][2] === 1 && t2[0][1] > suolo + 10, JSON.stringify(t2));

// lancio: prendo Rossella e la lancio in alto
const [rx, ry] = (await teste())[1];
await tocco('touchStart', rx, ry);
for (let i = 1; i <= 6; i++) { await tocco('touchMove', rx - i * 6, ry - i * 22); await page.waitForTimeout(16); }
await tocco('touchEnd');
await page.waitForTimeout(160);
const tl = (await teste())[1];
check('lanciata, vola in alto', tl[1] < ry - 20, `da ${ry} a ${tl[1]}`);
await page.waitForTimeout(1500);

// tocco sulla terra vuota: un verme ci va a scavare
const prima = await teste();
await page.mouse.click(Math.round(page.viewportSize().width * 0.75), suolo + 150);
await page.waitForTimeout(2200);
const dopo = await teste();
check('un tocco sulla terra manda un verme a scavare', dopo.some(([, y, dentro], i) => dentro === 1 && y > suolo + 30), JSON.stringify(dopo));

await page.waitForSelector('.fumetto-gioco:not([hidden])', { timeout: 12000 });
const fumetto = await page.locator('.fumetto-gioco').innerText();
check('ogni tanto compare un fumetto con una nozione sui lombrichi e la fonte', fumetto.length > 30 && (await page.locator('.fumetto-gioco a').count()) === 1, fumetto.slice(0, 100));
// cibo
await page.click('#cibo-foglia');
await page.waitForTimeout(1000);
check('la foglia viene disegnata (pixel verdi)', await page.$eval('canvas.giardino-vermi', (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let v = 0; for (let i = 0; i < d.length; i += 16) if (d[i] > 60 && d[i] < 110 && d[i + 1] > 150 && d[i + 2] < 100) v++; return v > 5; }));
await page.waitForTimeout(2500);
check('il riepilogo dei minuti di relax c\'è', /Oggi: \d+ min di relax/.test(await page.locator('#relax-riepilogo').innerText()));
await page.click('#vermi-esci');
await page.waitForTimeout(500);
check('«Esci» riporta all\'app con testata e barra', await page.evaluate(() => getComputedStyle(document.querySelector('.testata')).display !== 'none'));
const imp = await leggiDb(page, 'impostazioni');
const relax = imp.find((x) => x.chiave === 'relax')?.valore;
check('i secondi di relax vengono salvati', relax && Object.values(relax).reduce((a, b) => a + b, 0) >= 1, JSON.stringify(relax));
const veri = problemi.filter((p) => !/Service Worker registration blocked|willReadFrequently/.test(p));
check('nessun errore in console', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
