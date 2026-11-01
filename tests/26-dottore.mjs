// Barra con la fotocamera al centro e «Il dottore delle piante» (Gemini SIMULATO). Uso: node tests/26-dottore.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, leggiDb } from './lib.mjs';

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
const buona = JSON.stringify({ pianta: { nome: 'Pomodoro', confidenza: 'media' }, stato: 'problema', problemi: [{ nome: 'Carenza d\'acqua', confidenza: 'media', perche: 'Foglie arrotolate e un po\' flosce', cosa_controllare: 'Il terreno a 5 cm di profondità' }], avvisi: '' });
await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  richieste.push({ corpo: req.postData() ?? '' });
  return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: buona }] } }] }) });
});
const png = async () => Buffer.from(await page.evaluate(async () => {
  const t = document.createElement('canvas'); t.width = 800; t.height = 600;
  const x = t.getContext('2d'); x.fillStyle = '#3a7'; x.fillRect(0, 0, 800, 600);
  for (let i = 0; i < 100; i++) { x.fillStyle = `hsl(${(i * 53) % 360} 50% 45%)`; x.fillRect((i * 91) % 800, (i * 47) % 600, 40, 40); }
  const blob = await new Promise((ok) => t.toBlob(ok, 'image/png'));
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}));

await vai(page, 'oggi');
// La barra: cinque voci, chiara (non verde!), con la fotocamera al centro e grande
const voci = await page.locator('#barra a').allInnerTexts();
check('barra: Oggi, Il mio orto, Fotografa, Calendario, Impara', voci.join('|') === 'Oggi|Il mio orto|Fotografa|Calendario|Impara', voci.join('|'));
const sfondo = await page.evaluate(() => getComputedStyle(document.getElementById('barra')).backgroundColor);
check('la barra ha lo sfondo chiaro della carta (non verde)', sfondo === 'rgb(255, 255, 255)' || sfondo === 'rgb(36, 29, 23)' || /^rgb\((2[3-5]\d|3[0-9]|[0-9]{2}), (2[3-5]\d|[0-9]{2}), /.test(sfondo) && !/rgb\(4[0-9], 1[0-9]{2}/.test(sfondo), sfondo);
const centro = await page.evaluate(() => { const a = document.querySelector('#barra a[data-rotta=dottore] .icona'); const r = a.getBoundingClientRect(); const b = document.getElementById('barra').getBoundingClientRect(); return { w: r.width, sporge: r.top < b.top }; });
check('la fotocamera è un tondo grande che sporge dalla barra', centro.w >= 52 && centro.sporge, JSON.stringify(centro));

await page.locator('#barra a[data-rotta=dottore]').click();
await page.waitForSelector('h2.titolo-schermata:has-text("Il dottore delle piante")');
check('si apre il dottore delle piante e la voce centrale è evidenziata', (await page.locator('#barra a[aria-current=page]').innerText()).includes('Fotografa'));
check('tre scorciatoie: terreno, bustina, diario', (await page.locator('.tessere-azione .tessera-azione').count()) === 3);

// Senza chiave
await page.dispatchEvent('#dottore-scatta', 'click');
await page.waitForSelector('.dottore-risultato .avviso');
check('senza chiave: messaggio chiaro, nessuna richiesta', /chiave Gemini/.test(await page.locator('.dottore-risultato').innerText()) && richieste.length === 0);

await page.evaluate(() => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => { const d = r.result; const tx = d.transaction(['impostazioni', 'colture'], 'readwrite'); tx.objectStore('impostazioni').put({ chiave: 'ai_chiave', valore: 'AIzaSyFINTA-dottore-1234567890' }); tx.objectStore('impostazioni').put({ chiave: 'ai_modello', valore: 'gemini-3.5-flash' });
    tx.objectStore('colture').put({ id: 'c1', nome: 'Pomodori', schedaId: 'pomodori', dataSemina: '2026-05-01', dove: 'orto', varieta: '', note: '', zonaId: null, creata: '2026-05-01T08:00:00.000Z', schemaVersion: 2 });
    tx.oncomplete = () => { d.close(); ok(); }; };
}));
await page.reload();
await page.waitForSelector('#dottore-scatta');
await page.selectOption('select[name=coltura]', 'c1');
await page.fill('input[name=nota]', 'Foglie flosce');
accetta = false;
await page.dispatchEvent('#dottore-scatta', 'click');
await page.waitForTimeout(300);
check('consenso rifiutato: nessuna richiesta', richieste.length === 0 && /Google/.test(dialoghi.at(-1) ?? ''));
accetta = true;
await page.dispatchEvent('#dottore-scatta', 'click');
await page.waitForTimeout(300);
await page.setInputFiles('input[name=dottore-foto]', { name: 'pianta.png', mimeType: 'image/png', buffer: await png() });
await page.waitForSelector('.dottore-risultato .diagnosi');
const testo = await page.locator('.dottore-risultato').innerText();
check('diagnosi mostrata: pianta, causa possibile, cosa controllare, da verificare', /Pomodoro/.test(testo) && /Carenza d'acqua/.test(testo) && /terreno a 5 cm/.test(testo) && /verificare/i.test(testo));
check('la richiesta contiene la foto, la coltura scelta e la nota', richieste.length === 1 && /inline_data|inlineData/.test(richieste[0].corpo) && /Pomodori/.test(richieste[0].corpo) && /Foglie flosce/.test(richieste[0].corpo));
check('la foto non è salvata finché non lo chiedi', (await leggiDb(page, 'foto')).length === 0);
await page.dispatchEvent('#dottore-salva', 'click');
await page.waitForTimeout(500);
const foto = await leggiDb(page, 'foto');
check('«Salva nel diario»: foto con diagnosi, coltura e nota', foto.length === 1 && foto[0].colturaId === 'c1' && foto[0].nota === 'Foglie flosce' && foto[0].diagnosi?.risultato?.stato === 'problema', JSON.stringify(foto.map((f) => [f.colturaId, f.nota, f.diagnosi?.risultato?.stato])));
await page.reload();
await page.waitForSelector('.dottore-scheda');
check('le ultime analisi compaiono in fondo', (await page.getByText('Le ultime analisi').count()) === 1);

// Il mio orto: ordinato a sezioni
await vai(page, 'colture');
check('Il mio orto: titolo, sette sezioni', (await page.locator('h2.titolo-schermata').innerText()) === 'Il mio orto' && (await page.locator('.tessere-azione .tessera-azione').count()) === 7);

const veri = problemi.filter((p) => !/generativelanguage|Failed to load resource|Service Worker registration blocked|\b(404|429)\b/.test(p));
check('nessun errore in console / rete (esclusi quelli simulati)', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
