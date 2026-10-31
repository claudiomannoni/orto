// Foto in campo (terreno e erbe spontanee) con Gemini SIMULATO. Uso: node tests/11-foto.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, scroll, leggiDb, BASE } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
let accetta = true;
page.on('dialog', async (d) => { page.__dialogo = d.message(); accetta ? await d.accept() : await d.dismiss(); });

const CHIAVE = 'AIzaSyFINTA-foto-0011223344';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const richieste = [];
let risposta = null;
await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  richieste.push({ url: req.url(), chiave: req.headers()['x-goog-api-key'], corpo: JSON.parse(req.postData() ?? '{}') });
  if (risposta.stato) return route.fulfill({ status: risposta.stato, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ error: { message: 'x' } }) });
  return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: risposta.testo }] } }] }) });
});

// Le erbe vere di terreno.json (gli id veri servono a provare la corrispondenza)
await vai(page, 'zone');
const erbe = await page.evaluate(async () => (await (await fetch('data/it/terreno.json')).json()).piante_indicatrici.map((p) => ({ id: p.id, nome: p.nome, indica: p.indica })));
const [e1, e2] = erbe;
const buona = JSON.stringify({
  piante: [
    { nome: e1.nome, id: e1.id, confidenza: 'alta', perche: 'foglie e portamento' },
    { nome: 'Erba che non so', id: null, confidenza: 'media', perche: 'foglie sottili' },
    { nome: e2.nome, id: e2.id, confidenza: 'bassa', perche: 'forse' },
  ],
  terreno: { tessitura: 'argilloso', drenaggio: 'lento', humus: null, indizi: 'zolle compatte con crepe', confidenza: 'bassa' },
  avvisi: '',
});

const impostaDb = (chiave, valore) => page.evaluate(([c, v]) => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => { const db = r.result; const tx = db.transaction('impostazioni', 'readwrite'); const s = tx.objectStore('impostazioni'); if (v === undefined) s.delete(c); else s.put({ chiave: c, valore: v }); tx.oncomplete = () => { db.close(); ok(); }; };
}), [chiave, valore]);

// Una foto grande (3000 x 2000) fabbricata nella pagina
const fotoGrande = async () => Buffer.from(await page.evaluate(async () => {
  const t = document.createElement('canvas'); t.width = 3000; t.height = 2000;
  const c = t.getContext('2d'); const g = c.createLinearGradient(0, 0, 3000, 2000); g.addColorStop(0, '#6b4f2a'); g.addColorStop(1, '#2e7d32'); c.fillStyle = g; c.fillRect(0, 0, 3000, 2000);
  for (let i = 0; i < 400; i++) { c.fillStyle = `hsl(${(i * 37) % 360} 40% 40%)`; c.fillRect((i * 97) % 3000, (i * 53) % 2000, 60, 60); }
  const blob = await new Promise((ok) => t.toBlob(ok, 'image/png'));
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}));

const apriFoglioTerreno = async () => {
  if (await page.locator('dialog[open]').count()) { await page.keyboard.press('Escape'); await page.waitForSelector('dialog', { state: 'detached' }); }
  await vai(page, 'zone');
  await page.getByRole('button', { name: 'Capisci il terreno' }).click();
  await page.waitForSelector('dialog[open] .terreno-form');
  await page.locator('summary', { hasText: 'Foto in campo' }).click();
};

await impostaDb('ai_chiave', CHIAVE);
await impostaDb('ai_modello', 'gemini-3.5-flash');
// Una zona
await vai(page, 'zone');
await page.getByRole('button', { name: '+ Nuova zona' }).click();
await page.waitForSelector('dialog[open] form');
await page.fill('dialog input[name=nome]', 'Aiuola prova foto');
await page.getByRole('button', { name: 'Aggiungi zona' }).click();
await page.waitForSelector('li.zona');

await apriFoglioTerreno();
const png = await fotoGrande();
check('la sezione «Foto in campo» c\'è, con la privacy dichiarata', (await page.locator('.sezione-foto').innerText()).includes('Google') && (await page.locator('.sezione-foto').innerText()).includes('non restano salvate'));
check('senza foto il pulsante «Analizza» è spento', await page.getByRole('button', { name: 'Analizza con Rossella' }).isDisabled());
const sc = await scroll(page);
check('nessuno scroll orizzontale', sc.sw <= sc.iw && sc.bw <= sc.iw, JSON.stringify(sc));

// Caricare una foto: ridotta a 1024 px e in JPEG
await page.setInputFiles('input[name=foto-galleria]', { name: 'terreno.png', mimeType: 'image/png', buffer: png });
await page.waitForSelector('.anteprima img');
check('compare l\'anteprima e «Analizza» si accende', (await page.locator('.anteprima').count()) === 1 && await page.getByRole('button', { name: 'Analizza con Rossella' }).isEnabled());

// Prima volta: chiede il permesso di mandare le foto a Google. Rifiuto = niente richiesta.
accetta = false;
risposta = { testo: buona };
await page.getByRole('button', { name: 'Analizza con Rossella' }).click();
await page.waitForTimeout(400);
check('prima volta: chiede il permesso e dice che vanno a Google', /Google/.test(page.__dialogo ?? ''), page.__dialogo);
check('permesso negato: nessuna richiesta e nessun consenso salvato', richieste.length === 0 && !((await leggiDb(page, 'impostazioni')).find((x) => x.chiave === 'ai_foto_ok')?.valore));

accetta = true;
await page.getByRole('button', { name: 'Analizza con Rossella' }).click();
await page.waitForSelector('.proposte-foto .pianta');
check('permesso dato: parte una sola richiesta', richieste.length === 1);
const r0 = richieste[0];
const parti = r0.corpo.contents[0].parts;
check('la richiesta ha il testo e una sola foto JPEG', parti.length === 2 && parti[0].text && parti[1].inlineData.mimeType === 'image/jpeg');
const mis = await page.evaluate(async (b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const im = await createImageBitmap(new Blob([u], { type: 'image/jpeg' })); return { w: im.width, h: im.height, kb: Math.round(u.length / 1024) }; }, parti[1].inlineData.data);
check('la foto è ridotta: lato lungo 1024 px (da 3000), pochi KB', Math.max(mis.w, mis.h) === 1024 && mis.kb < 400, JSON.stringify(mis));
check('il prompt elenca le erbe vere con i loro id', parti[0].text.includes(e1.id) && parti[0].text.includes(e2.id));
check('chiede JSON a Gemini', r0.corpo.generationConfig?.responseMimeType === 'application/json');
check('la chiave è nell\'intestazione, non nell\'URL né nel corpo', r0.chiave === CHIAVE && !r0.url.includes(CHIAVE) && !JSON.stringify(r0.corpo).includes(CHIAVE));
check('il consenso è salvato', (await leggiDb(page, 'impostazioni')).find((x) => x.chiave === 'ai_foto_ok')?.valore === true);

// Proposte: confermare, mai in automatico
const righe = page.locator('.proposte-foto .pianta');
check('tre proposte; Rossella dice che sono proposte', (await righe.count()) === 3 && (await page.locator('.proposte-foto').innerText()).includes('proposte, non certezze'));
check('«alta» spuntata, «id sconosciuto» non spuntabile, «bassa» non spuntata', await righe.nth(0).locator('input').isChecked() && await righe.nth(1).locator('input').isDisabled() && !(await righe.nth(2).locator('input').isChecked()));
check('l\'erba fuori lista dice che resta una nota', (await righe.nth(1).innerText()).includes('resta solo una nota'));
check('mai «verificato»: l\'IA è «abbastanza sicura», «poco sicura»', (await righe.nth(0).innerText()).includes('abbastanza sicura') && (await righe.nth(2).innerText()).includes('poco sicura'));
check('prima di confermare nulla è segnato nella lista delle erbe', !(await page.locator(`details:not(.sezione-foto) .pianta input[value="${e1.id}"]`).isChecked()));
await page.getByRole('button', { name: 'Segna le erbe scelte' }).click();
check('«Segna le erbe scelte»: l\'erba compare segnata nella lista', await page.locator(`details:not(.sezione-foto) .pianta input[value="${e1.id}"]`).isChecked());
check('l\'erba bassa e quella fuori lista non sono state segnate', !(await page.locator(`details:not(.sezione-foto) .pianta input[value="${e2.id}"]`).isChecked()));

// Terreno dalla foto
check('terreno dalla foto: indizi, valori e confidenza bassa', (await page.locator('.proposte-foto').innerText()).includes('zolle compatte') && (await page.locator('.proposte-foto').innerText()).includes('Argilloso'));
check('avviso: dalla foto il terreno si capisce poco', (await page.locator('.proposte-foto').innerText()).includes('indizio debole'));
await page.getByRole('button', { name: 'Usa questi indizi' }).click();
const ris = await page.locator('.risultato-terreno').innerText();
check('«Usa questi indizi»: il profilo ne tiene conto', ris.includes('Argilloso') && ris.includes('Drena piano'), ris.replace(/\n+/g, ' | '));
await page.getByRole('button', { name: 'Salva il profilo' }).click();
await page.waitForSelector('dialog', { state: 'detached' });
await page.waitForFunction(() => document.querySelector('li.zona')?.innerText.includes('Argilloso'));
const terreno = (await leggiDb(page, 'zone'))[0].terreno;
check('salvato nella zona: indizi dalla foto e nessuna foto', terreno.foto?.indizi?.tessitura === 'argilloso' && terreno.foto?.indizi?.drenaggio === 'lento' && !JSON.stringify(terreno).includes('base64') && terreno.piante.includes(e1.id), JSON.stringify(terreno).slice(0, 300));
await apriFoglioTerreno();
check('riaprendo: gli indizi dalla foto ci sono ancora', (await page.locator('.risultato-terreno').innerText()).includes('Argilloso'));
await page.getByRole('button', { name: 'Annulla' }).click();
await page.waitForSelector('dialog', { state: 'detached' });

// Errori
const provaConUnaFoto = async () => {
  await apriFoglioTerreno();
  await page.setInputFiles('input[name=foto-galleria]', { name: 'a.png', mimeType: 'image/png', buffer: png });
  await page.waitForSelector('.anteprima img');
  await page.getByRole('button', { name: 'Analizza con Rossella' }).click();
  await page.waitForTimeout(700);
  return page.locator('.sezione-foto .esito').innerText();
};
const prima = richieste.length;
risposta = { testo: 'Mi dispiace, non posso aiutarti.' };
let msg = await provaConUnaFoto();
check('risposta che non è JSON: messaggio chiaro, nessun crash', msg.includes('risposto in modo confuso') && richieste.length === prima + 1, msg);
risposta = { stato: 429 };
msg = await provaConUnaFoto();
check('quota esaurita (429): messaggio chiaro', msg.includes('Troppe richieste'), msg);
risposta = { stato: 404 };
msg = await provaConUnaFoto();
check('modello ritirato (404): rimanda alla ricerca dei modelli', msg.includes('Cerca i modelli disponibili'), msg);
const cont = (await leggiDb(page, 'impostazioni')).find((x) => x.chiave === 'ai_foto_conteggio')?.valore;
check('il conteggio giornaliero conta solo le risposte arrivate (2: buona e confusa)', cont?.n === 2, JSON.stringify(cont));

// Tetto giornaliero
await impostaDb('ai_foto_conteggio', { data: await page.evaluate(async () => (await import('/js/util.js')).oggiISO()), n: 10 });
const dopoTetto = richieste.length;
risposta = { testo: buona };
msg = await provaConUnaFoto();
check('tetto di 10 foto al giorno: messaggio e nessuna richiesta', msg.includes('Per oggi le foto bastano') && richieste.length === dopoTetto, msg);
await impostaDb('ai_foto_conteggio', { data: '2020-01-01', n: 10 });
msg = await provaConUnaFoto();
check('il giorno dopo il tetto riparte da zero', richieste.length === dopoTetto + 1, msg);

// Senza chiave
await impostaDb('ai_chiave', undefined);
const senza = richieste.length;
msg = await provaConUnaFoto();
check('senza chiave: «serve la chiave» e nessuna richiesta', msg.includes('serve la chiave Gemini') && richieste.length === senza, msg);
await impostaDb('ai_chiave', CHIAVE);

// File che non è una foto, e troppe foto
await apriFoglioTerreno();
await page.setInputFiles('input[name=foto-galleria]', { name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('ciao') });
await page.waitForTimeout(300);
check('un file che non è una foto: messaggio e nessuna anteprima', (await page.locator('.sezione-foto .esito').innerText()).includes('non è una foto') && (await page.locator('.anteprima').count()) === 0);
await page.setInputFiles('input[name=foto-galleria]', [1, 2, 3, 4].map((i) => ({ name: `f${i}.png`, mimeType: 'image/png', buffer: png })));
await page.waitForFunction(() => document.querySelectorAll('.anteprima').length === 3);
await page.waitForTimeout(300);
check('al massimo 3 foto alla volta', (await page.locator('.anteprima').count()) === 3 && (await page.locator('.sezione-foto .esito').innerText()).includes('Al massimo 3'));
await page.locator('.anteprima button').first().click();
check('«Togli» toglie una foto', (await page.locator('.anteprima').count()) === 2);
await page.locator('.anteprima button').first().click();
await page.locator('.anteprima button').first().click();
check('senza foto «Analizza» si spegne di nuovo', await page.getByRole('button', { name: 'Analizza con Rossella' }).isDisabled());
await page.setInputFiles('input[name=foto-scatta]', { name: 'scatto.png', mimeType: 'image/png', buffer: png });
await page.waitForSelector('.anteprima img');
check('«Scatta una foto» (fotocamera) funziona come la galleria; l\'input chiede la fotocamera', (await page.locator('.anteprima').count()) === 1 && (await page.getAttribute('input[name=foto-scatta]', 'capture')) === 'environment');

check('nessun errore in console / rete (esclusi gli errori simulati)', problemi.filter((p) => !/generativelanguage|Failed to load resource|Service Worker registration blocked|\b(404|429)\b/.test(p)).length === 0, problemi.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
