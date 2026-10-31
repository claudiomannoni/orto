// Cosa cucino? (Gemini SIMULATO): ingredienti dai raccolti, consenso, ricette, errori. Uso: node tests/24-cucina.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
let accetta = true;
const dialoghi = [];
page.on('dialog', async (d) => { dialoghi.push(d.message()); accetta ? await d.accept() : await d.dismiss(); });

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const richieste = [];
const buona = JSON.stringify({ ricette: [
  { titolo: 'Zucchine trifolate', ingredienti: ['3 zucchine', 'olio', 'aglio'], passaggi: ['Taglia le zucchine.', 'Saltale in padella.'], minuti: 15, avviso: '' },
  { titolo: 'Frittata di zucchine', ingredienti: ['2 zucchine', '4 uova'], passaggi: ['Cuoci le zucchine.', 'Aggiungi le uova.'], minuti: 20, avviso: '' },
], avviso: '' });
let risposta = { testo: buona };
await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  richieste.push({ corpo: req.postData() ?? '' });
  return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: risposta.testo }] } }] }) });
});
const db = (fn, arg) => page.evaluate(([f, a]) => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => { const d = r.result; const tx = d.transaction(['impostazioni', 'eventi'], 'readwrite'); new Function('tx', `return (${f})(tx)`)(tx); tx.oncomplete = () => { d.close(); ok(); }; };
}), [fn, arg]);

await vai(page, 'cucina', '?oggi=2026-06-20');
await page.waitForSelector('#cucina-senza');
check('senza raccolti: spiega che servono ricette di stagione', /Segna i tuoi raccolti/.test(await page.locator('#cucina-senza').innerText()));
check('senza chiave: invita a metterla', (await page.getByRole('link', { name: 'Vai alle impostazioni' }).count()) === 1 && (await page.locator('#cucina-chiedi').count()) === 0);

await db("(tx) => { tx.objectStore('impostazioni').put({ chiave: 'ai_chiave', valore: 'AIzaSyFINTA-cucina-1122334455' }); tx.objectStore('impostazioni').put({ chiave: 'ai_modello', valore: 'gemini-3.5-flash' }); for (const [i, n, q, u, d] of [['e1','Zucchine',1.5,'kg','2026-06-18'],['e2','Basilico',200,'g','2026-06-19'],['e3','Pomodori',2,'kg','2026-04-01']]) tx.objectStore('eventi').put({ id: i, tipo: 'raccolto', nomeColtura: n, quantita: q, unita: u, data: d, esito: 'ok', creato: d + 'T08:00:00.000Z' }); }");
await page.reload();
await page.waitForSelector('#cucina-chiedi');
const con = await page.locator('#schermata p').first().innerText();
check('ingredienti dagli ultimi 30 giorni: zucchine e basilico, non i pomodori vecchi', /Zucchine/.test(await page.locator('#schermata').innerText()) && /Basilico/.test(await page.locator('#schermata').innerText()) && !/Pomodori/.test(await page.locator('#schermata').innerText()), con);

accetta = false;
await page.locator('#cucina-chiedi').click();
await page.waitForTimeout(300);
check('consenso rifiutato: nessuna richiesta', richieste.length === 0 && /Google Gemini/.test(dialoghi[0] ?? ''));
accetta = true;
await page.selectOption('select[name=persone]', '4');
await page.locator('#cucina-chiedi').click();
await page.waitForSelector('.ricetta');
check('due ricette mostrate con ingredienti e passaggi', (await page.locator('.ricetta').count()) === 2 && /3 zucchine/.test(await page.locator('.ricetta').first().innerText()) && /Saltale in padella/.test(await page.locator('.ricetta').first().innerText()));
check('il prompt contiene gli ingredienti e 4 persone, solo testo', richieste.length === 1 && /Zucchine/.test(richieste[0].corpo) && /4/.test(richieste[0].corpo) && !/inline_data|inlineData/.test(richieste[0].corpo));
check('avviso: ricette generate da un\'IA', /generate da un'IA/.test(await page.locator('.cucina-risposta').innerText()));

risposta = { testo: 'non è json' };
await page.locator('#cucina-chiedi').click();
await page.waitForSelector('.cucina-risposta .avviso:has-text("confuso")');
check('risposta rovinata: messaggio chiaro', true);

const veri = problemi.filter((p) => !/generativelanguage|Failed to load resource|Service Worker registration blocked|\b(404|429)\b/.test(p));
check('nessun errore in console / rete (esclusi quelli simulati)', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
