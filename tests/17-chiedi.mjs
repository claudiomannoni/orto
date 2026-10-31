// Chiedi a Rossella (Gemini SIMULATO): senza chiave, consenso, contesto inviato, risposta, errori, tetto.
// Uso: node tests/17-chiedi.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, leggiDb } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
let accetta = true;
const dialoghi = [];
page.on('dialog', async (d) => { dialoghi.push(d.message()); accetta ? await d.accept() : await d.dismiss(); });

const CHIAVE = 'AIzaSyFINTA-chiedi-0099887766';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const richieste = [];
let risposta = { testo: JSON.stringify({ risposta: 'A novembre puoi seminare le fave. Il terreno deve essere sgrondato.', certezza: 'media', da_controllare: 'Controlla che il terreno non sia fradicio.', chiedi_a_un_tecnico: false }) };
await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  richieste.push({ chiave: req.headers()['x-goog-api-key'], corpo: req.postData() ?? '' });
  if (risposta.stato) return route.fulfill({ status: risposta.stato, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ error: { message: 'x' } }) });
  return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: risposta.testo }] } }] }) });
});
const impostaDb = (chiave, valore) => page.evaluate(([c, v]) => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => { const db = r.result; const tx = db.transaction('impostazioni', 'readwrite'); tx.objectStore('impostazioni').put({ chiave: c, valore: v }); tx.oncomplete = () => { db.close(); ok(); }; };
}), [chiave, valore]);
const imp = async () => Object.fromEntries((await leggiDb(page, 'impostazioni')).map((r) => [r.chiave, r.valore]));

// Senza chiave
await vai(page, 'impara');
check('Impara: pulsante «Chiedi a Rossella»', (await page.getByRole('link', { name: 'Chiedi a Rossella' }).count()) === 1);
await page.getByRole('link', { name: 'Chiedi a Rossella' }).click();
await page.waitForSelector('h2.titolo-schermata:has-text("Chiedi a Rossella")');
check('senza chiave: spiega cosa fare e non mostra il modulo', (await page.locator('textarea[name=domanda]').count()) === 0 && (await page.getByRole('link', { name: 'Vai alle impostazioni' }).count()) === 1);

// Con la chiave
await impostaDb('ai_chiave', CHIAVE);
await impostaDb('ai_modello', 'gemini-3.5-flash');
await page.reload();
await page.waitForSelector('textarea[name=domanda]');
check('con chiave: modulo, tre esempi e domande rimaste', (await page.locator('.parole .btn').count()) === 3 && /Domande rimaste oggi: 20/.test(await page.locator('.aiuto').last().innerText()));
await page.locator('.parole .btn').first().click();
check('un esempio riempie il campo', (await page.inputValue('textarea[name=domanda]')).includes('seminare'));

// Consenso rifiutato: niente richiesta
accetta = false;
await page.getByRole('button', { name: 'Chiedi', exact: true }).click();
await page.waitForTimeout(300);
check('consenso rifiutato: nessuna richiesta a Google', richieste.length === 0 && dialoghi.length === 1 && /Google Gemini/.test(dialoghi[0]));

// Consenso accettato
accetta = true;
await page.getByRole('button', { name: 'Chiedi', exact: true }).click();
await page.waitForSelector('.chiedi-risposta .card');
check('risposta mostrata con certezza e cosa controllare', /fave/.test(await page.locator('.chiedi-risposta').innerText()) && (await page.locator('.chiedi-risposta .etichetta.certezza').count()) === 1 && /Da controllare/.test(await page.locator('.chiedi-risposta').innerText()));
check('avviso: è un consiglio da verificare', /da verificare/i.test(await page.locator('.chiedi-risposta').innerText()));
check('chiave inviata nell\'intestazione, non nell\'indirizzo', richieste.length === 1 && richieste[0].chiave === CHIAVE);
const corpo = richieste[0].corpo;
check('il contesto parte: zona, mese, domanda; niente foto', /Castelli Romani/.test(corpo) && /novembre|ottobre/i.test(corpo) && /seminare/.test(corpo) && !/inline_data|inlineData/.test(corpo));
check('regola: niente prodotti né dosi nel prompt', /NON consigliare prodotti/.test(corpo));
const s = await imp();
check('consenso e conteggio salvati', s.ai_testo_ok === true && s.ai_testo_conteggio?.n === 1, JSON.stringify(s.ai_testo_conteggio));

// Risposta rovinata
risposta = { testo: 'non è json' };
await page.getByRole('button', { name: 'Chiedi', exact: true }).click();
await page.waitForSelector('.chiedi-risposta .avviso');
check('risposta non valida: messaggio chiaro, nessun crash', /confuso/.test(await page.locator('.chiedi-risposta').innerText()));

// Quota di Google
risposta = { stato: 429 };
await page.getByRole('button', { name: 'Chiedi', exact: true }).click();
await page.waitForSelector('.chiedi-risposta .avviso:has-text("Troppe richieste")');
check('errore 429: messaggio di quota', true);

// Tetto giornaliero
await impostaDb('ai_testo_conteggio', { data: new Date().toLocaleDateString('sv-SE'), n: 20 });
await page.reload();
await page.waitForSelector('textarea[name=domanda]');
await page.fill('textarea[name=domanda]', 'Una domanda qualsiasi');
const prima = richieste.length;
await page.getByRole('button', { name: 'Chiedi', exact: true }).click();
await page.waitForSelector('.chiedi-risposta .avviso:has-text("Per oggi le domande bastano")');
check('tetto: nessuna richiesta in più', richieste.length === prima);

const veri = problemi.filter((p) => !/generativelanguage|Failed to load resource|Service Worker registration blocked|\b(404|429)\b/.test(p));
check('nessun errore in console / rete (esclusi quelli simulati)', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
