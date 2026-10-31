// Modulo IA (js/ai/): la richiesta a Gemini è intercettata con page.route e risposta con dati SIMULATI.
// L'API vera non viene mai contattata (e in questo ambiente non è raggiungibile): si prova solo il comportamento dell'app.
// Uso: node tests/03-ia.mjs [indirizzo-base]
import { chromium, BASE, CARTELLA_SCHERMATE as OUT, nuovoContesto, osserva, vai, check, finale, svuotaDati, nota, leggiDb } from './lib.mjs';
import path from 'node:path';

const browser = await chromium.launch();
const Q = '?oggi=2026-10-30';
const CHIAVE = 'AIzaSyFINTA-chiave-di-prova-000111222';
const MODELLO = 'gemini-modello-di-prova';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

const ctx = await nuovoContesto(browser);
const page = await ctx.newPage();
const problemi = [];
osserva(page, problemi);
const richieste = [];
const altreOrigini = [];
let modo = { tipo: 'ok' };
// Elenco modelli finto (GET .../models): metodi di generazione diversi, duplicati, modelli che non c'entrano.
const elencoRichieste = [];
const gen = ['generateContent'];
const MODELLI_FINTI = [
  { name: 'models/gemini-2.5-flash', supportedGenerationMethods: gen },
  { name: 'models/gemini-3.5-flash', supportedGenerationMethods: gen },
  { name: 'models/gemini-3.5-flash', supportedGenerationMethods: gen },
  { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: gen },
  { name: 'models/gemini-3.5-pro', supportedGenerationMethods: gen },
  { name: 'models/gemini-embedding-001', supportedGenerationMethods: ['embedContent'] },
  { name: 'models/gemini-3.5-flash-preview-tts', supportedGenerationMethods: gen },
  { name: 'models/gemini-3.5-flash-image', supportedGenerationMethods: gen },
  { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
  { name: 'models/imagen-4', supportedGenerationMethods: ['predict'] },
];
page.on('request', (r) => { const u = new URL(r.url()); if (u.origin !== new URL(BASE).origin && !/generativelanguage|open-meteo/.test(u.host)) altreOrigini.push(r.url()); });
await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  if (req.method() === 'GET' && /\/v1beta\/models\?/.test(req.url())) {
    elencoRichieste.push({ url: req.url(), chiave: req.headers()['x-goog-api-key'] });
    return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ models: MODELLI_FINTI }) });
  }
  richieste.push({ metodo: req.method(), url: req.url(), intestazioni: req.headers(), corpo: req.postData() });
  if (modo.tipo === 'rete') return route.abort('connectionfailed');
  if (modo.tipo === 'ok') return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }) });
  if (modo.tipo === 'vuota') return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ candidates: [] }) });
  if (modo.tipo === 'nonjson') return route.fulfill({ status: 500, headers: { ...CORS, 'content-type': 'text/html' }, body: '<html>boom</html>' });
  return route.fulfill({ status: modo.status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ error: { code: modo.status, message: modo.msg, status: 'X' } }) });
});

await vai(page, 'impostazioni', Q);
await svuotaDati(page);
await vai(page, 'impostazioni', Q);
const esito = () => page.$eval('.esito', (e) => e.textContent);
const prova = async () => { await page.click('button:has-text("Prova la chiave")'); await page.waitForFunction(() => { const t = document.querySelector('.esito').textContent; return t && t !== 'Sto provando...'; }, null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(150); return esito(); };

// senza chiave
let e = await prova();
check('IA senza chiave: "Prima inserisci la chiave" e nessuna richiesta di rete', e === 'Prima inserisci la chiave' && richieste.length === 0, `"${e}" richieste=${richieste.length}`);

// con chiave: richiesta corretta
await page.fill('input[name=ai_chiave]', CHIAVE);
await page.fill('input[name=ai_modello]', MODELLO);
e = await prova();
const r = richieste[0];
check('IA ok: messaggio "La chiave funziona"', e === 'La chiave funziona', e);
check('IA: una sola richiesta partita', richieste.length === 1, String(richieste.length));
check('IA: metodo POST', r?.metodo === 'POST', r?.metodo);
check('IA: URL = https://generativelanguage.googleapis.com/v1beta/models/<modello salvato>:generateContent', r?.url === `https://generativelanguage.googleapis.com/v1beta/models/${MODELLO}:generateContent`, r?.url);
check('IA: intestazione x-goog-api-key = chiave salvata', r?.intestazioni['x-goog-api-key'] === CHIAVE, r?.intestazioni['x-goog-api-key']);
check('IA: la chiave NON è nell\'URL né nel corpo', r && !r.url.includes(CHIAVE) && !(r.corpo || '').includes(CHIAVE) && !r.url.includes('key='));
check('IA: Content-Type JSON e corpo { contents:[{parts:[{text}]}] }', /application\/json/.test(r?.intestazioni['content-type'] || '') && JSON.parse(r.corpo).contents?.[0]?.parts?.[0]?.text?.length > 0, r?.corpo);
check('IA: nessun\'altra intestazione con la chiave (cookie/authorization)', !r.intestazioni.authorization && !r.intestazioni.cookie, JSON.stringify(Object.keys(r.intestazioni)));
await page.screenshot({ path: path.join(OUT, 'ia-ok.png'), fullPage: false });

// modello vuoto: ricade sul modello precedente
const casi = [
  [{ tipo: 'err', status: 400, msg: 'API key not valid. Please pass a valid API key.' }, 'Google non accetta la chiave (o il nome del modello)', 'HTTP 400'],
  [{ tipo: 'err', status: 401, msg: 'unauthenticated' }, 'Google non accetta la chiave (o il nome del modello)', 'HTTP 401'],
  [{ tipo: 'err', status: 403, msg: 'forbidden' }, 'Google non accetta la chiave (o il nome del modello)', 'HTTP 403'],
  [{ tipo: 'err', status: 404, msg: 'models/x is not found' }, `Il modello «${MODELLO}» non c'è o Google lo ha ritirato. Tocca «Cerca i modelli disponibili» e scegline uno.`, 'HTTP 404 (modello inesistente)'],
  [{ tipo: 'err', status: 400, msg: 'This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash.' }, `Il modello «${MODELLO}» non c'è o Google lo ha ritirato. Tocca «Cerca i modelli disponibili» e scegline uno.`, 'HTTP 400 "no longer available" (errore vero di Google)'],
  [{ tipo: 'err', status: 429, msg: 'Resource has been exhausted (e.g. check quota).' }, 'Troppe richieste: riprova fra un po\'', 'HTTP 429'],
  [{ tipo: 'rete' }, 'Nessuna connessione', 'errore di rete'],
  [{ tipo: 'err', status: 500, msg: 'Internal error' }, 'Errore: Internal error', 'HTTP 500'],
  [{ tipo: 'nonjson' }, 'Errore: HTTP 500', 'HTTP 500 non JSON'],
  [{ tipo: 'vuota' }, 'Errore: risposta vuota', 'risposta 200 senza candidati'],
];
for (const [m, atteso, nomeCaso] of casi) {
  modo = m;
  e = await prova();
  check(`IA ${nomeCaso}: messaggio "${atteso}"`, e === atteso, `ricevuto "${e}"`);
  if (m.status === 429 || m.tipo === 'rete') await page.screenshot({ path: path.join(OUT, `ia-${m.status || m.tipo}.png`) });
}
modo = { tipo: 'ok' };
e = await prova();
check('IA: dopo gli errori, di nuovo ok', e === 'La chiave funziona', e);

// Modello ritirato: si cerca quali la chiave può usare e se ne sceglie uno
await page.click('button:has-text("Cerca i modelli disponibili")');
await page.waitForSelector('select[name=ai_modello_scelta]');
const opzioni = await page.$$eval('select[name=ai_modello_scelta] option', (o) => o.map((x) => x.value).filter(Boolean));
check('elenco modelli: solo testo, senza duplicati, flash per primi, il più recente in testa', JSON.stringify(opzioni) === JSON.stringify(['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-pro']), JSON.stringify(opzioni));
check('elenco modelli: la chiave viaggia nell\'intestazione, non nell\'URL', elencoRichieste.length === 1 && elencoRichieste[0].chiave === CHIAVE && !elencoRichieste[0].url.includes(CHIAVE), JSON.stringify(elencoRichieste));
await page.selectOption('select[name=ai_modello_scelta]', 'gemini-3.5-flash');
await page.waitForTimeout(200);
check('scelta del modello: il campo si aggiorna e si salva', (await page.inputValue('input[name=ai_modello]')) === 'gemini-3.5-flash' && (await leggiDb(page, 'impostazioni')).find((x) => x.chiave === 'ai_modello')?.valore === 'gemini-3.5-flash');
const prima = richieste.length;
e = await prova();
check('dopo la scelta: la prova usa il modello scelto', e === 'La chiave funziona' && richieste[prima]?.url.includes('/models/gemini-3.5-flash:generateContent'), richieste[prima]?.url);

// Predefinito attuale, e passaggio automatico da un modello ritirato
await page.evaluate(() => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => { const db = r.result; const tx = db.transaction('impostazioni', 'readwrite'); tx.objectStore('impostazioni').put({ chiave: 'ai_modello', valore: 'gemini-2.5-flash' }); tx.oncomplete = () => { db.close(); ok(); }; };
}));
await vai(page, 'impostazioni', Q);
check('modello ritirato salvato (2.5): l\'app mostra quello attuale', (await page.inputValue('input[name=ai_modello]')) === 'gemini-3.5-flash', await page.inputValue('input[name=ai_modello]'));
await page.evaluate(() => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => { const db = r.result; const tx = db.transaction('impostazioni', 'readwrite'); tx.objectStore('impostazioni').delete('ai_modello'); tx.oncomplete = () => { db.close(); ok(); }; };
}));
await vai(page, 'impostazioni', Q);
check('senza scelta: il modello predefinito è gemini-3.5-flash', (await page.inputValue('input[name=ai_modello]')) === 'gemini-3.5-flash');

// Rimuovi la chiave
await page.click('button:has-text("Rimuovi la chiave")');
await page.waitForTimeout(200);
check('IA: "Rimuovi la chiave" -> messaggio e placeholder iniziale', (await esito()) === 'Chiave rimossa da questo telefono' && (await page.getAttribute('input[name=ai_chiave]', 'placeholder')) === 'Incolla qui la tua chiave');
const n = richieste.length;
e = await prova();
check('IA: dopo la rimozione niente richieste e "Prima inserisci la chiave"', e === 'Prima inserisci la chiave' && richieste.length === n, e);

// Il campo chiave è mascherato
check('IA: campo chiave di tipo password', (await page.getAttribute('input[name=ai_chiave]', 'type')) === 'password');
check('IA: nessuna richiesta verso altri domini (oltre a generativelanguage)', altreOrigini.length === 0, altreOrigini.join(' '));

// Codice IA solo in js/ai/
import { execSync } from 'node:child_process';
const root = process.env.SNAPSHOT;
if (root) {
  const fuori = execSync(`grep -rlE "generativelanguage|x-goog-api-key" ${root} --include=*.js --include=*.html --include=*.json | grep -v "/js/ai/" || true`).toString().trim();
  check('IA: "generativelanguage"/"x-goog-api-key" compaiono solo in js/ai/', fuori === '', fuori);
} else nota('SNAPSHOT non impostato: salto il controllo "codice IA solo in js/ai/" (rilancia con SNAPSHOT=<cartella>)');

// Filtra gli errori di console attesi dalle risposte simulate 4xx/5xx e dall'abort
const inattesi = problemi.filter((p) => !/generativelanguage|Failed to load resource/.test(p));
check('IA: nessun errore di console imprevisto (esclusi i 4xx/5xx simulati)', inattesi.length === 0, inattesi.join(' | '));
nota(`console durante gli errori simulati: ${problemi.length} voci (attese): ${[...new Set(problemi)].slice(0, 4).join(' | ')}`);
await browser.close();
process.exit(finale() ? 1 : 0);
