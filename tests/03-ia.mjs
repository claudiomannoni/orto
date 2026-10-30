// Modulo IA (js/ai/): la richiesta a Gemini è intercettata con page.route e risposta con dati SIMULATI.
// L'API vera non viene mai contattata (e in questo ambiente non è raggiungibile): si prova solo il comportamento dell'app.
// Uso: node tests/03-ia.mjs [indirizzo-base]
import { chromium, BASE, CARTELLA_SCHERMATE as OUT, nuovoContesto, osserva, vai, check, finale, svuotaDati, nota } from './lib.mjs';
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
page.on('request', (r) => { const u = new URL(r.url()); if (u.origin !== new URL(BASE).origin && !/generativelanguage/.test(u.host)) altreOrigini.push(r.url()); });
await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
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
  [{ tipo: 'err', status: 404, msg: 'models/x is not found' }, 'Errore: models/x is not found', 'HTTP 404 (modello inesistente)'],
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
