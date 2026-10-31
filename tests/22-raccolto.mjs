// Il mio raccolto: si segna, compare nei totali, nel grafico e nella storia. Uso: node tests/22-raccolto.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, leggiDb } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);

await vai(page, 'colture', '?oggi=2026-06-20');
check('Colture ha il link «Il mio raccolto»', (await page.getByRole('link', { name: 'Il mio raccolto' }).count()) === 1);
await page.getByRole('link', { name: 'Il mio raccolto' }).click();
await page.waitForSelector('#raccolto-vuoto');
check('all\'inizio: messaggio vuoto che invita a segnare', /Segna il primo raccolto/.test(await page.locator('#raccolto-vuoto').innerText()));
check('la barra evidenzia Il mio orto', (await page.locator('#barra a[aria-current=page]').innerText()).includes('Il mio orto'));

// Una coltura per scegliere nell'elenco
await page.evaluate(() => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => { const db = r.result; const tx = db.transaction('colture', 'readwrite'); tx.objectStore('colture').put({ id: 'c1', nome: 'Zucchine', schedaId: 'zucchine', dataSemina: '2026-05-01', dove: 'orto', varieta: '', note: '', zonaId: null, creata: '2026-05-01T08:00:00.000Z', schemaVersion: 2 }); tx.oncomplete = () => { db.close(); ok(); }; };
}));
await page.reload();
await page.waitForSelector('#segna-raccolto');

const segna = async (quantita, unita, nome = null) => {
  await page.dispatchEvent('#segna-raccolto', 'click');
  await page.waitForSelector('dialog[open] input[name=quantita]');
  if (nome) { await page.selectOption('dialog[open] select[name=coltura]', ''); await page.fill('dialog[open] input[name=nome]', nome); }
  await page.fill('dialog[open] input[name=quantita]', quantita);
  await page.selectOption('dialog[open] select[name=unita]', unita);
  await page.locator('dialog[open] button[type=submit]').click();
  await page.waitForSelector('dialog[open]', { state: 'detached' });
};
await segna('1.5', 'kg');
await segna('500', 'g');
await segna('3', 'pezzi', 'Zucca del vicino');
await page.waitForTimeout(300);
const ev = (await leggiDb(page, 'eventi')).filter((e) => e.tipo === 'raccolto');
check('tre eventi «raccolto» salvati con quantità e unità', ev.length === 3 && ev.some((e) => e.quantita === 1.5 && e.unita === 'kg' && e.nomeColtura === 'Zucchine' && e.colturaId === 'c1') && ev.some((e) => e.unita === 'g') && ev.some((e) => e.unita === 'pezzi' && e.nomeColtura === 'Zucca del vicino' && e.colturaId === null), JSON.stringify(ev.map((e) => [e.quantita, e.unita, e.nomeColtura])));
check('totale: 2 kg + 3 pezzi', (await page.locator('.raccolto-totale').innerText()) === '2 kg + 3 pezzi', await page.locator('.raccolto-totale').innerText());
check('per coltura: Zucchine 2 kg e la zucca a pezzi', /Zucchine\s*2 kg/.test(await page.locator('.raccolto').innerText()) && /Zucca del vicino\s*3 pezzi/.test(await page.locator('.raccolto').innerText()));
check('grafico dei mesi con descrizione per chi non vede', /giu.*2 kg/.test(await page.locator('.barre-mesi').getAttribute('aria-label')), await page.locator('.barre-mesi').getAttribute('aria-label'));

// Quantità non valida: non salva
await page.dispatchEvent('#segna-raccolto', 'click');
await page.waitForSelector('dialog[open] input[name=quantita]');
await page.fill('dialog[open] input[name=quantita]', '0');
await page.locator('dialog[open] button[type=submit]').click();
await page.waitForTimeout(300);
check('quantità zero: non salva e il foglio resta aperto', (await page.locator('dialog[open]').count()) === 1 && (await leggiDb(page, 'eventi')).filter((e) => e.tipo === 'raccolto').length === 3);
await page.keyboard.press('Escape');

// La storia li mostra
await vai(page, 'storia', '?oggi=2026-06-20');
await page.waitForSelector('.voce-storia');
check('La mia storia mostra i raccolti con la quantità', /Raccolto: Zucchine/.test(await page.locator('#schermata').innerText()) && /1,5 kg/.test(await page.locator('#schermata').innerText()));

const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console / rete', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
