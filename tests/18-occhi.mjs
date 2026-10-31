// I vermetti disegnati nel codice: sguardo che segue il dito, risata al tocco. Uso: node tests/18-occhi.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
await vai(page, 'impostazioni');
await page.waitForSelector('.vermetti-riga .avatar.rosso canvas');
check('i due vermetti sono disegnati su un riquadro (nessuna immagine)', (await page.locator('.vermetti-riga .avatar canvas').count()) === 2 && (await page.locator('.vermetti-riga .avatar img').count()) === 0);
check('il riquadro non è vuoto', await page.locator('.avatar.rosso canvas').evaluate((c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n > 500; }));
const sguardo = (chi) => page.evaluate((c) => { const a = document.querySelector(`.avatar.${c}`); return [Number(a.dataset.sguardoX), Number(a.dataset.sguardoY)]; }, chi);

await page.evaluate(() => window.scrollTo(0, Math.max(0, document.querySelector('.vermetti-riga').getBoundingClientRect().top + scrollY - 200)));
await page.waitForTimeout(200);
const r = await page.evaluate(() => { const b = document.querySelector('.vermetti-riga .avatar.rosso').getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
const vp = page.viewportSize();
await page.mouse.move(vp.width - 4, r.y + r.height / 2);
await page.waitForTimeout(600);
let [dx, dy] = await sguardo('rosso');
check('dito a destra: lo sguardo va a destra', dx > 0.4, `${dx},${dy}`);
await page.mouse.move(3, r.y + r.height / 2);
await page.waitForTimeout(600);
[dx, dy] = await sguardo('rosso');
check('dito a sinistra: lo sguardo va a sinistra', dx < -0.4, `${dx},${dy}`);
await page.mouse.move(r.x + r.width / 2, Math.min(vp.height - 4, r.y + r.height / 2 + 300));
await page.waitForTimeout(600);
[dx, dy] = await sguardo('rosso');
check('dito in basso: lo sguardo va in basso', dy > 0.4, `${dx},${dy}`);
check('lo sguardo resta nei limiti', Math.hypot(dx, dy) <= 1.01);

await page.dispatchEvent('.vermetti-riga .avatar.rosso', 'click');
await page.waitForTimeout(200);
check('toccato, Rosso ride', (await page.locator('.avatar.rosso').getAttribute('data-ride')) === '1');
await page.waitForTimeout(1300);
check('poi smette di ridere', (await page.locator('.avatar.rosso').getAttribute('data-ride')) === '0');

await page.screenshot({ path: process.env.SCATTO || 'tests/schermate/occhi.png' });
const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console / rete', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
