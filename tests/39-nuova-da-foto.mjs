// Foto -> coltura nuova già compilata (Gemini SIMULATO). Uso: node tests/39-nuova-da-foto.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, leggiDb } from './lib.mjs';
const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
page.on('dialog', (d) => d.accept());
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const risposta = JSON.stringify({ pianta: { nome: 'Pomodoro', confidenza: 'alta' }, stato: 'sana', stadio: 'piantina', giorni_stimati: 20, problemi: [], avvisi: '' });
await page.route('**/generativelanguage.googleapis.com/**', (route) => route.request().method() === 'OPTIONS'
  ? route.fulfill({ status: 204, headers: CORS })
  : route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: risposta }] } }] }) }));
const png = async () => Buffer.from(await page.evaluate(async () => {
  const t = document.createElement('canvas'); t.width = 400; t.height = 300;
  const x = t.getContext('2d'); x.fillStyle = '#3a7'; x.fillRect(0, 0, 400, 300);
  const blob = await new Promise((ok) => t.toBlob(ok, 'image/png'));
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}));
await vai(page, 'dottore', '?oggi=2026-11-02');
await page.evaluate(() => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => { const d = r.result; const tx = d.transaction('impostazioni', 'readwrite'); tx.objectStore('impostazioni').put({ chiave: 'ai_chiave', valore: 'AIzaSyFINTA-nuova-1234567890' }); tx.objectStore('impostazioni').put({ chiave: 'ai_foto_ok', valore: true }); tx.oncomplete = () => { d.close(); ok(); }; };
}));
await page.reload();
await page.waitForSelector('#dottore-scatta');
await page.dispatchEvent('#dottore-galleria', 'click');
await page.setInputFiles('input[name=dottore-galleria]', { name: 'pianta.png', mimeType: 'image/png', buffer: await png() });
await page.waitForSelector('#nuova-da-foto');
const nome = await page.inputValue('#nuova-da-foto input[name=nome]');
const data = await page.inputValue('#nuova-da-foto input[name=dataSemina]');
check('proposta compilata: nome della scheda e data = oggi meno 20 giorni', nome === 'Pomodoro' && data.length === 10 && Math.round((new Date().setHours(0, 0, 0, 0) - new Date(data + 'T00:00:00')) / 86400000) >= 19, `${nome} ${data}`);
check('dice che l\'età è una stima da correggere', /stima/.test(await page.locator('.nuova-da-foto').innerText()));
check('nessuna coltura salvata prima della conferma', (await leggiDb(page, 'colture')).length === 0);
await page.fill('#nuova-da-foto input[name=nome]', 'Pomodoro');
await page.check('#nuova-da-foto input[value=piantina]');
await page.dispatchEvent('#nuova-salva', 'click');
await page.waitForSelector('.nuova-da-foto a[href="#/colture"]');
const colture = await leggiDb(page, 'colture');
check('dopo la conferma la coltura c\'è, con scheda, partenza e data', colture.length === 1 && colture[0].schedaId === 'pomodori' && colture[0].partenza === 'piantina' && colture[0].dataSemina === data, JSON.stringify(colture.map((c) => [c.nome, c.schedaId, c.partenza, c.dataSemina])));
const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
