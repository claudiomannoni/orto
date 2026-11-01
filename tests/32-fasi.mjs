// Assistenza continua: seme o piantina, «cosa fare» per fase in Oggi, esame con foto che confronta la fase con l'età. Uso: node tests/32-fasi.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, leggiDb } from './lib.mjs';
const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
page.on('dialog', (d) => d.accept());
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const richieste = [];
const risposta = JSON.stringify({ pianta: { nome: 'Pomodoro', confidenza: 'media' }, stato: 'sana', fase: 'crescita', problemi: [], avvisi: '' });
await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  richieste.push(req.postData() ?? '');
  return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: risposta }] } }] }) });
});

await vai(page, 'colture', '?oggi=2026-06-30');
await page.click('button:has-text("+ Nuova coltura")');
await page.waitForSelector('dialog[open] input[name=nome]');
await page.fill('dialog input[name=nome]', 'Pomodori');
await page.check('dialog input[name=partenza][value=piantina]');
check('scegliendo «Da piantina» la data diventa «Data di trapianto»', /trapianto/i.test(await page.locator('dialog .etichetta-data').innerText()));
await page.fill('dialog input[name=dataSemina]', '2026-06-05'); // 25 giorni dal trapianto
await page.click('dialog button[type=submit]');
await page.waitForSelector('li.coltura');
check('la carta dice «Trapiantata il»', /Trapiantata il/.test(await page.locator('li.coltura').first().innerText()));
const colture = await leggiDb(page, 'colture');
check('la coltura salva «partenza: piantina»', colture[0]?.partenza === 'piantina', JSON.stringify(colture[0]));

// Oggi: 25 giorni dal trapianto + 42 di piantina = 67 giorni -> fioritura (66-89)
await vai(page, 'oggi', '?oggi=2026-06-30');
await page.waitForSelector('.fase-pianta');
const blocco = await page.locator('.fase-pianta').first().innerText();
check('Oggi: età stimata di 67 giorni e fase «Fioritura»', /67 giorni/.test(blocco) && /Fioritura/i.test(blocco), blocco.slice(0, 200));
check('«Cosa fare adesso» e accortezze del periodo, con la fonte', /Cosa fare adesso/.test(blocco) && /Accortezze/.test(blocco) && (await page.locator('.fase-pianta details a').count()) >= 1);
check('dice fra quanti giorni cambia fase', /Fra circa \d+ giorni passa alla fase/.test(blocco));

// foto: l'esame parte con la coltura già scelta e chiede la fase
await page.evaluate(() => new Promise((ok) => { const r = indexedDB.open('orto'); r.onsuccess = () => { const d = r.result; const tx = d.transaction('impostazioni', 'readwrite'); const s = tx.objectStore('impostazioni'); s.put({ chiave: 'ai_chiave', valore: 'AIzaSyFINTA-fasi-1234567890' }); s.put({ chiave: 'ai_foto_ok', valore: true }); tx.oncomplete = () => { d.close(); ok(); }; }; }));
await page.locator('.fase-pianta a.btn').first().click();
await page.waitForSelector('#dottore-scatta');
check('«Esamina con una foto» apre il dottore con la coltura scelta', (await page.locator('select[name=coltura]').inputValue()) === colture[0].id);
const png = Buffer.from(await page.evaluate(async () => { const t = document.createElement('canvas'); t.width = 400; t.height = 300; const x = t.getContext('2d'); x.fillStyle = '#3a7'; x.fillRect(0, 0, 400, 300); for (let i = 0; i < 60; i++) { x.fillStyle = `hsl(${(i * 53) % 360} 50% 45%)`; x.fillRect((i * 91) % 400, (i * 47) % 300, 30, 30); } const b = await new Promise((ok) => t.toBlob(ok, 'image/png')); return Array.from(new Uint8Array(await b.arrayBuffer())); }));
await page.setInputFiles('input[name=dottore-foto]', { name: 'p.png', mimeType: 'image/png', buffer: png });
await page.waitForSelector('.dottore-risultato .diagnosi');
const esito = await page.locator('.dottore-risultato').innerText();
check('la richiesta a Gemini contiene l\'età e le fasi possibili', richieste.length === 1 && /67 giorni/.test(richieste[0]) && /germinazione/.test(richieste[0]) && /fioritura/.test(richieste[0]), richieste[0]?.slice(0, 120));
check('il risultato confronta fase attesa e osservata (in ritardo: sembra «Crescita vegetativa»)', /Fase di crescita/.test(esito) && /Fioritura/.test(esito) && /Crescita vegetativa/.test(esito) && /indietro/.test(esito), esito);
const veri = problemi.filter((p) => !/generativelanguage|Failed to load resource|Service Worker registration blocked/.test(p));
check('nessun errore in console', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
