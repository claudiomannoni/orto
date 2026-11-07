// «Il tuo eccesso»: segna, cambia stato, vedi lo spreco evitato, togli. Uso: node tests/35-eccesso.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai } from './lib.mjs';
const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
page.on('dialog', (d) => d.accept());
await vai(page, 'scopri', '?oggi=2026-07-10');
await page.click('a.tessera-scopri[href="#/eccesso"]');
await page.waitForSelector('#eccesso-nuovo');
const testo0 = await page.locator('main').innerText();
check('la pagina spiega regalare, scambiare, vendere e la bacheca che arriverà', /Regalare/.test(testo0) && /Scambiare/.test(testo0) && /Vendere/.test(testo0) && /bacheca/i.test(testo0));
check('nessun prezzo e nessuna regola dettagliata: solo l\'invito a informarsi', !/€|euro|partita iva/i.test(testo0));
check('all\'inizio: nessun eccesso e invito a segnarne uno', /Non hai ancora segnato niente/.test(testo0));

async function segna(nome, quantita, unita, categoria = 'ortaggi') {
  await page.click('#eccesso-nuovo');
  await page.waitForSelector('dialog[open] input[name=nome]');
  await page.selectOption('dialog select[name=categoria]', categoria);
  await page.fill('dialog input[name=nome]', nome);
  await page.fill('dialog input[name=quantita]', String(quantita));
  await page.selectOption('dialog select[name=unita]', unita);
  await page.click('dialog button[type=submit]');
  await page.waitForFunction((n) => [...document.querySelectorAll('li.eccesso-voce strong')].some((s) => s.textContent === n), nome);
}
await segna('Zucchine', 3, 'kg');
await segna('Uova', 12, 'pezzi', 'uova_miele');
check('due voci, tutte «disponibili»', (await page.locator('li.eccesso-voce').count()) === 2 && (await page.locator('li.eccesso-voce.stato-disponibile').count()) === 2);
check('lo spreco evitato è ancora a zero', /Quando segni un eccesso come regalato/.test(await page.locator('#eccesso-riepilogo').innerText()));

// le zucchine vengono regalate, le uova vendute
await page.locator('li.eccesso-voce:has-text("Zucchine") select').selectOption('regalato');
await page.locator('li.eccesso-voce:has-text("Uova") select').selectOption('venduto');
await page.waitForFunction(() => /Hai dato una seconda vita/.test(document.getElementById('eccesso-riepilogo').innerText));
const riepilogo = await page.locator('#eccesso-riepilogo').innerText();
check('spreco evitato: 3 kg e 12 pezzi, in 2 volte', /3 kg/.test(riepilogo) && /12 pezzi/.test(riepilogo) && /2 volte/.test(riepilogo), riepilogo);
await page.reload();
await page.waitForSelector('li.eccesso-voce');
check('dopo aver ricaricato le voci e gli stati restano', (await page.locator('li.eccesso-voce').count()) === 2 && (await page.locator('li.eccesso-voce:not(.stato-disponibile)').count()) === 2);
await page.locator('li.eccesso-voce:has-text("Uova") button').click();
await page.waitForFunction(() => document.querySelectorAll('li.eccesso-voce').length === 1);
check('si toglie con conferma', (await page.locator('li.eccesso-voce').count()) === 1);
const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
