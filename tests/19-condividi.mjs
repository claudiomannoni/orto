// Condividi il mio orto: la figurina si crea, si scarica (senza foglio di condivisione) e contiene un PNG vero. Uso: node tests/19-condividi.mjs http://localhost:8101
import fs from 'node:fs';
import { chromium, nuovoContesto, check, osserva, finale, vai } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block', acceptDownloads: true });
const page = await ctx.newPage();
osserva(page, problemi);
await vai(page, 'oggi', '?oggi=2026-11-10');
await page.locator('details.oggi-altri').evaluate((x) => { x.open = true; });
await page.waitForSelector('.carta-progressi');
await page.locator('.carta-progressi').click();
await page.waitForSelector('dialog[open] #condividi');
check('il foglio dei progressi ha «Condividi il mio orto»', (await page.locator('dialog[open] #condividi').innerText()) === 'Condividi il mio orto');
const [scarico] = await Promise.all([page.waitForEvent('download'), page.locator('dialog[open] #condividi').click()]);
check('senza foglio di condivisione scarica il-mio-orto.png', scarico.suggestedFilename() === 'il-mio-orto.png');
const byte = fs.readFileSync(await scarico.path());
check('è un PNG vero (firma) e non vuoto', byte.length > 20000 && byte.slice(0, 8).toString('hex') === '89504e470d0a1a0a', String(byte.length));
const dim = { l: byte.readUInt32BE(16), a: byte.readUInt32BE(20) };
check('misure 1080 x 1350', dim.l === 1080 && dim.a === 1350, JSON.stringify(dim));
fs.writeFileSync(process.env.SCATTO || 'tests/schermate/figurina.png', byte);

const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console / rete', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
