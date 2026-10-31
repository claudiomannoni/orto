// Coriandoli quando un lavoro è fatto; niente coriandoli con «meno movimento». Uso: node tests/21-coriandoli.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, leggiDb } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);

await vai(page, 'oggi', '?oggi=2026-11-10');
await page.waitForSelector('.lavoro .btn.primario');
await page.locator('.lavoro .btn.primario').first().click();
await page.waitForSelector('.coriandoli', { state: 'attached', timeout: 5000 }).catch(() => {});
check('segnato un lavoro: compaiono i coriandoli', (await page.locator('.coriandolo').count()) >= 10, String(await page.locator('.coriandolo').count()));
await page.waitForTimeout(2700);
check('poi spariscono da soli', (await page.locator('.coriandoli').count()) === 0);

// Meno movimento: nessun coriandolo
await page.evaluate(() => new Promise((ok) => { const r = indexedDB.open('orto'); r.onsuccess = () => { const db = r.result; const tx = db.transaction('impostazioni', 'readwrite'); tx.objectStore('impostazioni').put({ chiave: 'movimento_ridotto', valore: true }); tx.oncomplete = () => { db.close(); ok(); }; }; }));
await page.reload();
await page.waitForSelector('.lavoro .btn.primario');
await page.locator('.lavoro .btn.primario').first().click();
await page.waitForTimeout(600);
check('con «meno movimento» niente coriandoli', (await page.locator('.coriandolo').count()) === 0);
check('il lavoro risulta comunque fatto', (await leggiDb(page, 'eventi')).filter((e) => e.tipo === 'lavoro_fatto').length === 2);

const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console / rete', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
