// «Scarica l'app». Uso: node tests/10-installa.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, scroll, bersagli, BASE } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
async function nuovaPagina(extra = {}) {
  const ctx = await nuovoContesto(browser, extra);
  const page = await ctx.newPage();
  osserva(page, problemi);
  return { ctx, page };
}
// Un finto «beforeinstallprompt» come lo manda Chrome su Android.
const offerta = (page, esito = 'accepted') => page.evaluate((e) => {
  const ev = new Event('beforeinstallprompt', { cancelable: true });
  ev.prompt = async () => { window.__prompt = (window.__prompt ?? 0) + 1; };
  ev.userChoice = Promise.resolve({ outcome: e });
  window.dispatchEvent(ev);
}, esito);

let { ctx, page } = await nuovaPagina();

// 1. Prima dell'offerta del browser: istruzioni a mano
await vai(page, 'oggi', '?oggi=2026-11-10');
await page.waitForSelector('.installa:not([hidden])');
let blocco = await page.locator('.installa').innerText();
check('Oggi: il riquadro «Scarica l\'app» c\'è, con le istruzioni a mano', blocco.includes('Scarica l\'app') && blocco.includes('Installa app'), blocco.replace(/\n+/g, ' | '));
check('senza l\'offerta del browser non c\'è il pulsante', (await page.locator('.installa button:has-text("Scarica l\'app")').count()) === 0);

// 2. Con l'offerta: compare il pulsante
await offerta(page);
await page.waitForSelector('.installa button:has-text("Scarica l\'app")');
check('arrivata l\'offerta del browser: ecco il pulsante «Scarica l\'app»', true);
const b = (await bersagli(page)).filter((x) => /Scarica/.test(x.nome));
check('il pulsante è grande (almeno 56 px)', b.length === 1 && b[0].h >= 56, JSON.stringify(b));
const sc = await scroll(page);
check('nessuno scroll orizzontale', sc.sw <= sc.iw && sc.bw <= sc.iw, JSON.stringify(sc));

// 3. Il tocco apre la finestra di installazione del browser, poi il riquadro sparisce
await page.click('.installa button:has-text("Scarica l\'app")');
await page.waitForFunction(() => window.__prompt === 1);
check('il tocco apre la finestra di installazione del browser (una volta)', (await page.evaluate(() => window.__prompt)) === 1);
await page.waitForSelector('.installa', { state: 'hidden' });
check('dopo l\'installazione il riquadro sparisce', true);
await ctx.close();

// 4. «Non ora»: sparisce da Oggi, ma resta in Impostazioni; dopo la pausa tornerebbe
({ ctx, page } = await nuovaPagina());
await vai(page, 'oggi', '?oggi=2026-11-10');
await page.waitForSelector('.installa:not([hidden])');
await page.getByRole('button', { name: 'Non ora' }).click();
await page.waitForSelector('.installa', { state: 'hidden' });
await page.reload();
await page.waitForSelector('h2.titolo-schermata:has-text("Oggi in campagna")');
await page.waitForTimeout(400);
check('«Non ora»: dopo il ricaricamento il riquadro resta nascosto', (await page.locator('.installa:not([hidden])').count()) === 0);
await page.goto(`${BASE}/#/impostazioni`);
await page.waitForSelector('.installa:not([hidden])');
check('in Impostazioni «Scarica l\'app» c\'è sempre (senza «Non ora»)', (await page.locator('.installa .pericolo').count()) === 0);
// Pausa scaduta: 8 giorni fa
await page.evaluate(() => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => { const db = r.result; const tx = db.transaction('impostazioni', 'readwrite'); tx.objectStore('impostazioni').put({ chiave: 'installa_rimandato', valore: new Date(Date.now() - 8 * 86400000).toISOString() }); tx.oncomplete = () => { db.close(); ok(); }; };
}));
await page.goto(`${BASE}/#/oggi`);
await page.reload();
await page.waitForSelector('.installa:not([hidden])');
check('dopo 7 giorni il riquadro ritorna', true);
// appinstalled: sparisce anche senza aver toccato il pulsante
await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
await page.waitForSelector('.installa', { state: 'hidden' });
check('evento «app installata»: il riquadro sparisce', true);
await ctx.close();

// 5. Primo avvio: il riquadro c'è anche lì
({ ctx, page } = await nuovaPagina());
await page.goto(`${BASE}/`);
await page.waitForSelector('h2.titolo-schermata:has-text("Benvenuto")');
await page.waitForSelector('.installa:not([hidden])');
check('presentazione iniziale: c\'è «Scarica l\'app»', (await page.locator('.installa').innerText()).includes('Scarica l\'app'));
await ctx.close();

// 6. iPhone: niente evento, si spiega come fare
({ ctx, page } = await nuovaPagina({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1' }));
await vai(page, 'oggi', '?oggi=2026-11-10');
await page.waitForSelector('.installa:not([hidden])');
blocco = await page.locator('.installa').innerText();
check('iPhone: le istruzioni parlano di Condividi e «Aggiungi alla schermata Home»', blocco.includes('Condividi') && blocco.includes('Aggiungi alla schermata Home'), blocco.replace(/\n+/g, ' | '));
await ctx.close();

check('nessun errore in console / rete', problemi.length === 0, problemi.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
