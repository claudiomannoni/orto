// Leggi dalla bustina dei semi (Gemini SIMULATO): compila nome, varietà e note; errori e consenso. Uso: node tests/23-bustina.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, leggiDb } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
let accetta = true;
const dialoghi = [];
page.on('dialog', async (d) => { dialoghi.push(d.message()); accetta ? await d.accept() : await d.dismiss(); });

const CHIAVE = 'AIzaSyFINTA-bustina-5544332211';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const richieste = [];
let risposta = { testo: JSON.stringify({ nome: 'Pomodoro', varieta: 'Cuore di bue', schedaId: 'pomodori', giorni_germinazione: { min: 7, max: 14 }, giorni_raccolta: { min: 90, max: 110 }, profondita_cm: 1, distanza_cm: 50, mesi_semina: [2, 3, 4], esposizione: 'sole', avvisi: '' }) };
await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  richieste.push({ corpo: req.postData() ?? '' });
  if (risposta.stato) return route.fulfill({ status: risposta.stato, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ error: { message: 'x' } }) });
  return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: risposta.testo }] } }] }) });
});
const impostaDb = (chiave, valore) => page.evaluate(([c, v]) => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => { const db = r.result; const tx = db.transaction('impostazioni', 'readwrite'); tx.objectStore('impostazioni').put({ chiave: c, valore: v }); tx.oncomplete = () => { db.close(); ok(); }; };
}), [chiave, valore]);
const png = async () => Buffer.from(await page.evaluate(async () => {
  const t = document.createElement('canvas'); t.width = 800; t.height = 600;
  const x = t.getContext('2d'); x.fillStyle = '#c33'; x.fillRect(0, 0, 800, 600);
  for (let i = 0; i < 100; i++) { x.fillStyle = `hsl(${(i * 53) % 360} 50% 45%)`; x.fillRect((i * 91) % 800, (i * 47) % 600, 40, 40); }
  const blob = await new Promise((ok) => t.toBlob(ok, 'image/png'));
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}));
const apriNuova = async () => { await page.getByRole('button', { name: '+ Nuova coltura' }).click(); await page.waitForSelector('dialog[open] #leggi-bustina'); };
const dallaFoto = async () => { await page.setInputFiles('dialog[open] input[name=bustina]', { name: 'bustina.png', mimeType: 'image/png', buffer: await png() }); };

await vai(page, 'colture');
await apriNuova();
check('«Nuova coltura» ha «Leggi dalla bustina dei semi»', /Leggi dalla bustina/.test(await page.locator('#leggi-bustina').innerText()));
await page.locator('#leggi-bustina').click();
await page.waitForSelector('dialog[open] .bustina .esito:has-text("chiave")');
check('senza chiave: dice di metterla nelle impostazioni, nessuna richiesta', /chiave Gemini/.test(await page.locator('dialog[open] .bustina .esito').innerText()) && richieste.length === 0);
await page.keyboard.press('Escape');

await impostaDb('ai_chiave', CHIAVE);
await impostaDb('ai_modello', 'gemini-3.5-flash');
await page.reload();
await apriNuova();
accetta = false;
await page.locator('#leggi-bustina').click();
await page.waitForTimeout(300);
check('consenso rifiutato: nessuna richiesta a Google', richieste.length === 0 && dialoghi.length === 1 && /Google/.test(dialoghi[0]));
accetta = true;
await page.locator('#leggi-bustina').click();
await page.waitForTimeout(300);
await dallaFoto();
await page.waitForFunction(() => document.querySelector('dialog[open] input[name=nome]')?.value === 'Pomodoro');
check('nome e varietà compilati', (await page.inputValue('dialog[open] input[name=nome]')) === 'Pomodoro' && (await page.inputValue('dialog[open] input[name=varieta]')) === 'Cuore di bue');
const note = await page.inputValue('dialog[open] textarea[name=note]');
check('note con quello che c\'è scritto', /Dalla bustina: germinazione 7-14 giorni; raccolta dopo 90-110 giorni; profondità 1 cm; distanza tra le piante 50 cm; semina in feb, mar, apr; esposizione: sole\./.test(note), note);
check('la richiesta contiene la foto e la regola «non inventare»', richieste.length === 1 && /inline_data|inlineData/.test(richieste[0].corpo) && /non inventare/i.test(richieste[0].corpo));
check('invita a controllare', /controlla/i.test(await page.locator('dialog[open] .bustina .esito').innerText()));

// Si può salvare la coltura compilata
await page.locator('dialog[open] button[type=submit]').click();
await page.waitForSelector('dialog[open]', { state: 'detached' });
const colture = await leggiDb(page, 'colture');
check('la coltura è salvata con nome, varietà e note', colture.length === 1 && colture[0].nome === 'Pomodoro' && colture[0].varieta === 'Cuore di bue' && /Dalla bustina/.test(colture[0].note));

// Risposta rovinata
await apriNuova();
risposta = { testo: 'non è json' };
await dallaFoto();
await page.waitForSelector('dialog[open] .bustina .esito:has-text("non è riuscita a leggere")');
check('risposta confusa: messaggio chiaro e il modulo resta com\'è', (await page.inputValue('dialog[open] input[name=nome]')) === '');
const veri = problemi.filter((p) => !/generativelanguage|Failed to load resource|Service Worker registration blocked|\b(404|429)\b/.test(p));
check('nessun errore in console / rete (esclusi quelli simulati)', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
