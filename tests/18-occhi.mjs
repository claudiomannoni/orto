// Occhi dei vermetti: pupille che seguono il dito, palpebre, Rosso che ride al tocco. Uso: node tests/18-occhi.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
await vai(page, 'impostazioni');
await page.waitForSelector('.vermetti-riga .avatar.rosso .occhi');
check('i due vermetti hanno gli occhi sopra l\'immagine', (await page.locator('.vermetti-riga .avatar .occhi').count()) === 2);
check('palpebre per ogni occhio (4)', (await page.locator('.vermetti-riga .palpebra').count()) === 4);
check('l\'immagine del corpo è quella senza pupille', (await page.locator('.avatar.rosso .corpo-vermetto').getAttribute('src')).includes('/occhi/'));
const spostamento = async (chi) => page.evaluate((c) => { const s = document.querySelector(`.avatar.${c} .occhi`); return [Number(s.style.getPropertyValue('--dx')), Number(s.style.getPropertyValue('--dy'))]; }, chi);

await page.evaluate(() => window.scrollTo(0, Math.max(0, document.querySelector('.vermetti-riga').getBoundingClientRect().top + scrollY - 200)));
await page.waitForTimeout(200);
const r = await page.evaluate(() => { const b = document.querySelector('.vermetti-riga .avatar.rosso').getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
const vp = page.viewportSize();
await page.mouse.move(vp.width - 4, r.y + r.height / 2);
await page.waitForTimeout(250);
let [dx, dy] = await spostamento('rosso');
check('dito a destra: le pupille vanno a destra', dx > 2, `${dx},${dy}`);
await page.mouse.move(3, r.y + r.height / 2);
await page.waitForTimeout(250);
[dx, dy] = await spostamento('rosso');
check('dito a sinistra: le pupille vanno a sinistra', dx < -2, `${dx},${dy}`);
await page.mouse.move(r.x + r.width / 2, Math.min(vp.height - 4, r.y + r.height / 2 + 300));
await page.waitForTimeout(250);
[dx, dy] = await spostamento('rosso');
check('dito in basso: le pupille vanno in basso', dy > 1.5, `${dx},${dy}`);
check('lo spostamento non esce dall\'occhio (massimo 4)', Math.hypot(dx, dy) <= 4.01);

await page.dispatchEvent('.vermetti-riga .avatar.rosso', 'click');
await page.waitForTimeout(150);
check('toccato, Rosso ride a occhi chiusi', (await page.locator('.avatar.rosso .corpo-vermetto').getAttribute('src')).includes('rosso-ride') && await page.locator('.avatar.rosso .occhi').evaluate((e) => e.style.visibility === 'hidden'));
await page.waitForTimeout(1000);
check('poi riapre gli occhi', (await page.locator('.avatar.rosso .corpo-vermetto').getAttribute('src')).includes('/occhi/'));

await page.screenshot({ path: process.env.SCATTO || 'tests/schermate/occhi.png' });
const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console / rete', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
