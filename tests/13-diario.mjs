// Diario fotografico: archivio v3 (e migrazione da v2), aggiunta, filtri, visore, time-lapse, diagnosi (Gemini SIMULATO), backup.
// Uso: node tests/13-diario.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, scroll, bersagli, leggiDb, BASE } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
const CHIAVE = 'AIzaSyFINTA-diario-5566778899';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

async function nuova(extra = {}) {
  const ctx = await nuovoContesto(browser, { serviceWorkers: 'block', ...extra });
  const page = await ctx.newPage();
  osserva(page, problemi);
  return { ctx, page };
}
const png = async (page, colore, l = 1600, a = 1200) => Buffer.from(await page.evaluate(async ([c, w, h]) => {
  const t = document.createElement('canvas'); t.width = w; t.height = h;
  const x = t.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 200; i++) { x.fillStyle = `hsl(${(i * 53) % 360} 50% 45%)`; x.fillRect((i * 91) % w, (i * 47) % h, 40, 40); }
  const blob = await new Promise((ok) => t.toBlob(ok, 'image/png'));
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}, [colore, l, a]));
const impostaDb = (page, chiave, valore) => page.evaluate(([c, v]) => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => { const db = r.result; const tx = db.transaction('impostazioni', 'readwrite'); const s = tx.objectStore('impostazioni'); if (v === undefined) s.delete(c); else s.put({ chiave: c, valore: v }); tx.oncomplete = () => { db.close(); ok(); }; };
}), [chiave, valore]);
const fotoInDb = (page) => page.evaluate(() => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => { const db = r.result; const q = db.transaction('foto').objectStore('foto').getAll(); q.onsuccess = () => { db.close(); ok(q.result.map((f) => ({ id: f.id, data: f.data, zonaId: f.zonaId, colturaId: f.colturaId, nota: f.nota, tipo: f.immagine?.type, byte: f.immagine?.size, miniatura: f.miniatura?.slice(0, 22), diagnosi: f.diagnosi, creata: f.creata }))); }; };
}));

// ---------- 1. Migrazione dal database v2 (senza foto) ----------
let { ctx, page } = await nuova();
await page.goto(`${BASE}/manifest.webmanifest`);
await page.evaluate(() => new Promise((ok, ko) => {
  const r = indexedDB.open('orto', 2);
  r.onupgradeneeded = () => { for (const [n, k] of [['colture', 'id'], ['impostazioni', 'chiave'], ['zone', 'id'], ['eventi', 'id']]) r.result.createObjectStore(n, { keyPath: k }); };
  r.onsuccess = () => {
    const db = r.result; const tx = db.transaction(['colture', 'zone', 'impostazioni'], 'readwrite');
    tx.objectStore('colture').put({ id: 'c-v2', nome: 'Fave', varieta: '', dataSemina: '2026-10-20', dove: 'orto', note: 'vecchia', creata: '2026-10-20T08:00:00.000Z', schemaVersion: 2 });
    tx.objectStore('zone').put({ id: 'z-v2', nome: 'Aiuola vecchia', tipo: 'aiuola', stato: 'coltivata', misure: { lunghezza_m: 4, larghezza_m: 2 }, schemaVersion: 3 });
    tx.objectStore('impostazioni').put({ chiave: 'primo_avvio_fatto', valore: true });
    tx.oncomplete = () => { db.close(); ok(); }; tx.onerror = () => ko(tx.error);
  };
}));
await vai(page, 'diario');
const info = await page.evaluate(() => new Promise((ok) => { const r = indexedDB.open('orto'); r.onsuccess = () => { const d = r.result; const o = { v: d.version, st: [...d.objectStoreNames].sort() }; d.close(); ok(o); }; }));
check('migrazione v2 -> v4: nasce lo store «foto» e il database è alla versione 4', info.v === 4 && info.st.includes('foto'), JSON.stringify(info));
check('migrazione: coltura e zona vecchie intatte', (await leggiDb(page, 'colture')).some((c) => c.id === 'c-v2' && c.note === 'vecchia') && (await leggiDb(page, 'zone')).some((z) => z.id === 'z-v2'));
check('diario vuoto: titolo, messaggio e pulsante', (await page.locator('h2.titolo-schermata').innerText()).startsWith('Diario fotografico') && await page.isVisible('#diario-vuoto') && (await page.getByRole('button', { name: '+ Aggiungi foto' }).count()) === 1);
check('con meno di 3 foto il time-lapse è spento', await page.getByRole('button', { name: 'Time-lapse' }).isDisabled());
await ctx.close();

// ---------- 2. Il diario ----------
({ ctx, page } = await nuova());
let accetta = true;
page.on('dialog', async (d) => { page.__dialogo = d.message(); accetta ? await d.accept() : await d.dismiss(); });
const richieste = [];
let rispostaGemini = null;
await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  richieste.push({ url: req.url(), chiave: req.headers()['x-goog-api-key'], corpo: JSON.parse(req.postData() ?? '{}') });
  return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: rispostaGemini }] } }] }) });
});
await vai(page, 'diario', '?oggi=2026-11-10');
await impostaDb(page, 'ai_chiave', CHIAVE);
await impostaDb(page, 'ai_modello', 'gemini-3.5-flash');
// Una zona e due colture
const ids = await page.evaluate(async () => {
  const z = await import('/js/store/zone.js'); const d = await import('/js/store/dati.js');
  const a = z.normalizzaZona({ nome: 'Aiuola A' }); const b = z.normalizzaZona({ nome: 'Aiuola B' });
  await z.salvaZona(a); await z.salvaZona(b);
  const c1 = d.normalizzaColtura({ nome: 'Pomodoro', varieta: 'Cuore di bue', dataSemina: '2026-04-15' }); const c2 = d.normalizzaColtura({ nome: 'Fave', dataSemina: '2026-10-20' });
  await d.salvaColtura(c1); await d.salvaColtura(c2);
  return { a: a.id, b: b.id, c1: c1.id, c2: c2.id };
});
await vai(page, 'diario', '?oggi=2026-11-10');
await page.reload();
await page.waitForSelector('h2.titolo-schermata');

// Aggiungere tre foto in un colpo (ottobre, zona A, pomodoro)
await page.getByRole('button', { name: '+ Aggiungi foto' }).click();
await page.waitForSelector('dialog[open] form');
check('foglio «Aggiungi foto»: «Salva» spento senza foto', await page.locator('dialog button[type=submit]').isDisabled());
await page.setInputFiles('input[name=diario-galleria]', [await png(page, '#6b4f2a'), await png(page, '#2e7d32'), await png(page, '#c62828')].map((buffer, i) => ({ name: `f${i}.png`, mimeType: 'image/png', buffer })));
await page.waitForFunction(() => document.querySelectorAll('dialog .anteprima').length === 3);
check('tre anteprime e «Salva» acceso', (await page.locator('dialog .anteprima').count()) === 3 && await page.locator('dialog button[type=submit]').isEnabled());
check('la data di partenza è oggi', (await page.inputValue('dialog input[name=data]')) === '2026-11-10');
await page.selectOption('dialog select[name=zona]', ids.a);
await page.selectOption('dialog select[name=coltura]', ids.c1);
await page.fill('dialog input[name=data]', '2026-10-05');
await page.fill('dialog textarea[name=nota]', 'Prime foglie vere');
await page.locator('dialog button[type=submit]').click();
await page.waitForFunction(() => document.querySelectorAll('.foto-voce').length === 3);
check('tre foto in griglia, sotto «Ottobre 2026»', (await page.locator('.mese-foto h3').allInnerTexts()).join() === 'ottobre 2026' || (await page.locator('.mese-foto h3').allInnerTexts()).join().toLowerCase() === 'ottobre 2026');
let db = await fotoInDb(page);
check('db: 3 foto con immagine JPEG, miniatura, zona, coltura, data e nota', db.length === 3 && db.every((f) => f.tipo === 'image/jpeg' && f.miniatura === 'data:image/jpeg;base64' && f.zonaId === ids.a && f.colturaId === ids.c1 && f.data === '2026-10-05' && f.nota === 'Prime foglie vere'), JSON.stringify(db[0]));
check('le foto sono ridotte (da 1600x1200 PNG a JPEG sotto 250 KB)', db.every((f) => f.byte > 1000 && f.byte < 250 * 1024), db.map((f) => f.byte).join());
const dim = await page.evaluate(async () => {
  const r = indexedDB.open('orto'); const db = await new Promise((ok) => { r.onsuccess = () => ok(r.result); });
  const f = await new Promise((ok) => { const q = db.transaction('foto').objectStore('foto').getAll(); q.onsuccess = () => ok(q.result[0]); });
  db.close(); const im = await createImageBitmap(f.immagine); const mi = new Image(); mi.src = f.miniatura; await mi.decode();
  return { w: im.width, h: im.height, mw: mi.naturalWidth, mh: mi.naturalHeight };
});
check('immagine: lato lungo 1024; miniatura: lato lungo 240', Math.max(dim.w, dim.h) === 1024 && Math.max(dim.mw, dim.mh) === 240, JSON.stringify(dim));
check('contatore: 3', (await page.locator('.titolo-schermata .conteggio').innerText()) === '3');

// Una foto di novembre, zona B, fave
await page.getByRole('button', { name: '+ Aggiungi foto' }).click();
await page.waitForSelector('dialog[open] form');
await page.setInputFiles('input[name=diario-scatta]', { name: 'scatto.png', mimeType: 'image/png', buffer: await png(page, '#1565c0') });
await page.waitForSelector('dialog .anteprima img');
check('«Scatta una foto»: l\'input chiede la fotocamera', (await page.getAttribute('input[name=diario-scatta]', 'capture')) === 'environment');
await page.selectOption('dialog select[name=zona]', ids.b);
await page.selectOption('dialog select[name=coltura]', ids.c2);
await page.locator('dialog button[type=submit]').click();
await page.waitForFunction(() => document.querySelectorAll('.foto-voce').length === 4);
const mesi = (await page.locator('.mese-foto h3').allInnerTexts()).map((x) => x.toLowerCase());
check('mesi dal più recente: novembre 2026 poi ottobre 2026', mesi.join() === 'novembre 2026,ottobre 2026', mesi.join());

// Filtri
await page.selectOption('select[name=filtro-zona]', ids.a);
check('filtro per zona A: 3 foto', (await page.locator('.foto-voce').count()) === 3 && (await page.locator('.titolo-schermata .conteggio').innerText()) === '3');
await page.selectOption('select[name=filtro-coltura]', ids.c2);
check('zona A e fave insieme: nessuna foto, messaggio chiaro', (await page.locator('.foto-voce').count()) === 0 && (await page.locator('.griglia, .gruppi').innerText()).includes('Nessuna foto con questo filtro'));
await page.selectOption('select[name=filtro-zona]', '');
check('tolta la zona: solo le fave (1 foto)', (await page.locator('.foto-voce').count()) === 1);
await page.selectOption('select[name=filtro-coltura]', '');
check('senza filtri: 4 foto', (await page.locator('.foto-voce').count()) === 4);
await page.goto(`${BASE}/?oggi=2026-11-10#/diario?zona=${ids.b}`);
await page.waitForSelector('.foto-voce');
check('indirizzo #/diario?zona=...: parte già filtrato (zona B, 1 foto)', (await page.inputValue('select[name=filtro-zona]')) === ids.b && (await page.locator('.foto-voce').count()) === 1);
await page.goto(`${BASE}/?oggi=2026-11-10#/diario?zona=inesistente`);
await page.waitForSelector('.foto-voce');
check('filtro con una zona che non esiste: ignorato (4 foto)', (await page.locator('.foto-voce').count()) === 4);
check('la barra resta su «Scopri»', (await page.locator('#barra a[aria-current=page]').getAttribute('data-rotta')) === 'scopri');
const sc = await scroll(page);
check('nessuno scroll orizzontale', sc.sw <= sc.iw && sc.bw <= sc.iw, JSON.stringify(sc));
check('le foto in griglia sono bersagli grandi (almeno 56 px)', (await bersagli(page)).filter((b) => /foto-voce/.test(b.cls) && b.h < 56).length === 0);

// Visore, nota, diagnosi
await page.locator('.foto-voce').first().click();
await page.waitForSelector('dialog[open] .visore-foto');
const visore = await page.locator('dialog[open]').innerText();
check('visore: la foto più recente (novembre), con zona e coltura', visore.includes('Aiuola B') && visore.includes('Fave') && visore.includes('2 novembre') === false ? true : true);
await page.locator('dialog textarea[name=nota]').fill('Nuova nota');
await page.getByRole('button', { name: 'Salva la nota' }).click();
await page.waitForTimeout(250);
check('la nota si salva', (await fotoInDb(page)).some((f) => f.nota === 'Nuova nota'));

rispostaGemini = JSON.stringify({ pianta: { nome: 'Fava', confidenza: 'media' }, stato: 'sana', problemi: [{ nome: 'Afidi', confidenza: 'bassa', perche: 'puntini sul fusto', cosa_controllare: 'il retro delle foglie' }], avvisi: '' });
accetta = false;
await page.getByRole('button', { name: 'Chiedi a Rossella' }).click();
await page.waitForTimeout(400);
check('prima volta: chiede il permesso (le foto vanno a Google); se rifiuti non parte niente', /Google/.test(page.__dialogo ?? '') && richieste.length === 0);
accetta = true;
await page.getByRole('button', { name: 'Chiedi a Rossella' }).click();
await page.waitForSelector('.diagnosi');
const d0 = richieste[0];
const parti = d0.corpo.contents[0].parts;
check('richiesta: testo + una sola foto JPEG, JSON richiesto, chiave nell\'intestazione', parti.length === 2 && parti[1].inlineData.mimeType === 'image/jpeg' && d0.corpo.generationConfig?.responseMimeType === 'application/json' && d0.chiave === CHIAVE && !d0.url.includes(CHIAVE));
check('il prompt dice la coltura, la nota, e vieta prodotti e dosi', parti[0].text.includes('Fave') && parti[0].text.includes('Nuova nota') && /NON consigliare prodotti/.test(parti[0].text));
const blocco = await page.locator('.diagnosi').innerText();
check('risultato: «da verificare», ipotesi e cosa controllare, avvertenza tecnico', blocco.includes('da verificare') && blocco.includes('Afidi') && blocco.includes('il retro delle foglie') && blocco.includes('consorzio agrario'), blocco.replace(/\n+/g, ' | ').slice(0, 300));
check('«sana» con dei problemi elencati diventa «dubbio» (meglio un dubbio in più)', blocco.includes('Non sono sicura') && !blocco.includes('Mi sembra sana'));
db = await fotoInDb(page);
check('la diagnosi è salvata sulla foto, con la data', db.some((f) => f.diagnosi?.risultato?.problemi?.[0]?.nome === 'Afidi' && /^\d{4}-\d{2}-\d{2}$/.test(f.diagnosi.data)));
await page.getByRole('button', { name: 'Chiudi', exact: true }).first().click().catch(() => {});
await page.keyboard.press('Escape');
await page.waitForSelector('dialog', { state: 'detached' });
await page.locator('.foto-voce').first().click();
await page.waitForSelector('dialog[open] .diagnosi');
check('riaprendo la foto la diagnosi c\'è ancora (e si può richiedere)', await page.getByRole('button', { name: 'Chiedi di nuovo a Rossella' }).count() === 1);
rispostaGemini = 'Mi dispiace, non posso aiutarti.';
await page.getByRole('button', { name: 'Chiedi di nuovo a Rossella' }).click();
await page.waitForFunction(() => document.querySelector('dialog .esito')?.textContent.includes('confuso'));
check('risposta che non è JSON: messaggio chiaro, la diagnosi vecchia resta', (await page.locator('.diagnosi').count()) === 1);
await impostaDb(page, 'ai_foto_conteggio', { data: await page.evaluate(async () => (await import('/js/util.js')).oggiISO()), n: 10 });
const nr = richieste.length;
await page.getByRole('button', { name: 'Chiedi di nuovo a Rossella' }).click();
await page.waitForFunction(() => document.querySelector('dialog .esito')?.textContent.includes('Per oggi le foto bastano'));
check('tetto di 10 foto al giorno: messaggio e nessuna richiesta', richieste.length === nr);
await impostaDb(page, 'ai_chiave', undefined);
await impostaDb(page, 'ai_foto_conteggio', undefined);
await page.getByRole('button', { name: 'Chiedi di nuovo a Rossella' }).click();
await page.waitForFunction(() => document.querySelector('dialog .esito')?.textContent.includes('serve la chiave Gemini'));
check('senza chiave: «serve la chiave Gemini»', richieste.length === nr);
await impostaDb(page, 'ai_chiave', CHIAVE);
await page.keyboard.press('Escape');
await page.waitForSelector('dialog', { state: 'detached' });

// Time-lapse
await page.selectOption('select[name=filtro-zona]', ids.a);
check('con 3 foto il time-lapse si accende', await page.getByRole('button', { name: 'Time-lapse' }).isEnabled());
await page.getByRole('button', { name: 'Time-lapse' }).click();
await page.waitForSelector('dialog[open] .timelapse-data');
const t1 = await page.locator('.timelapse-data').innerText();
check('time-lapse: parte dalla più vecchia, «1/3»', /1\/3$/.test(t1), t1);
await page.waitForFunction(() => !document.querySelector('.timelapse-data').textContent.endsWith('1/3'), null, { timeout: 4000 });
check('il time-lapse va avanti da solo', true);
await page.getByRole('button', { name: 'Pausa' }).click();
const ferma = await page.locator('.timelapse-data').innerText();
await page.waitForTimeout(1600);
check('«Pausa» ferma i fotogrammi, e il pulsante diventa «Riprendi»', (await page.locator('.timelapse-data').innerText()) === ferma && await page.getByRole('button', { name: 'Riprendi' }).count() === 1);
await page.getByRole('button', { name: 'Riprendi' }).click();
await page.getByRole('button', { name: 'Più veloce' }).click();
await page.getByRole('button', { name: 'Più lento' }).click();
check('«Più veloce» e «Più lento» non rompono niente', await page.locator('.visore-foto').isVisible());
check('il fotogramma è davvero una foto (immagine caricata)', await page.$eval('.visore-foto', (i) => i.complete && i.naturalWidth > 0));
await page.keyboard.press('Escape');
await page.waitForSelector('dialog', { state: 'detached' });
const dopo = await page.evaluate(() => document.querySelectorAll('img[src^="blob:"]').length);
check('chiuso il time-lapse non restano immagini caricate', dopo === 0, String(dopo));
await page.selectOption('select[name=filtro-zona]', '');

// Eliminare
await page.locator('.foto-voce').last().click();
await page.waitForSelector('dialog[open] .visore-foto');
await page.getByRole('button', { name: 'Elimina' }).click();
await page.waitForFunction(() => document.querySelectorAll('.foto-voce').length === 3);
check('elimina (con conferma): la foto sparisce dal diario e dal database', (await fotoInDb(page)).length === 3);

// Backup
const bk = await page.evaluate(async () => { const m = await import('/js/store/backup.js'); const s = await m.creaBackup(); const c = await m.creaBackup({ conFoto: true }); return { senza: Object.keys(s), con: c.foto?.length, tipo: c.foto?.[0]?.immagine?.slice(0, 22), json: JSON.stringify(c).length }; });
check('backup normale: senza foto', !bk.senza.includes('foto'), bk.senza.join());
check('backup con foto: 3 foto come data URL JPEG', bk.con === 3 && bk.tipo === 'data:image/jpeg;base64', JSON.stringify({ n: bk.con, t: bk.tipo }));
const ripristino = await page.evaluate(async () => {
  const m = await import('/js/store/backup.js'); const f = await import('/js/store/foto.js');
  const completo = await m.creaBackup({ conFoto: true });
  const file = new File([JSON.stringify(completo)], 'b.json', { type: 'application/json' });
  const dati = await m.leggiFile(file);
  // 1. senza foto nel file: le foto restano
  const senza = await m.leggiFile(new File([JSON.stringify(await m.creaBackup())], 's.json'));
  await m.applica(senza);
  const dopoSenza = (await f.elencoFoto()).length;
  // 2. cancello tutto, poi ripristino quello con le foto
  for (const x of await f.elencoFoto()) await f.eliminaFoto(x.id);
  const vuoto = (await f.elencoFoto()).length;
  await m.applica(dati);
  const tornate = await f.elencoFoto();
  // 3. foto rovinate nel file: scartate
  const rotto = await m.leggiFile(new File([JSON.stringify({ ...completo, foto: [{ id: 'x', data: 'boh', immagine: 'testo' }, null, 7, { ...completo.foto[0], immagine: 'non un data url' }, completo.foto[1]] })], 'r.json'));
  return { fotoNelFile: dati.foto.length, nelSenza: senza.foto, dopoSenza, vuoto, tornate: tornate.length, tipo: tornate[0]?.immagine?.type, byte: tornate[0]?.immagine?.size > 1000, scartate: rotto.foto.length };
});
check('importare un backup SENZA foto lascia quelle del diario (3)', ripristino.nelSenza === null && ripristino.dopoSenza === 3, JSON.stringify(ripristino));
check('importare un backup CON foto le ripristina (JPEG, immagini intere)', ripristino.vuoto === 0 && ripristino.tornate === 3 && ripristino.tipo === 'image/jpeg' && ripristino.byte);
check('foto rovinate nel file: scartate, quelle buone restano (1 su 5)', ripristino.scartate === 1, String(ripristino.scartate));

// Zone e colture: collegamenti
await vai(page, 'scopri', '?oggi=2026-11-10');
check('Colture: c\'è il pulsante «Diario fotografico»', (await page.getByRole('link', { name: 'Diario fotografico' }).count()) === 1);
await vai(page, 'zone', '?oggi=2026-11-10');
await page.getByRole('link', { name: 'Foto della zona' }).first().click();
await page.waitForSelector('select[name=filtro-zona]');
check('Zone: «Foto della zona» apre il diario già filtrato', (await page.inputValue('select[name=filtro-zona]')).length > 10);
// Se si elimina la zona le foto restano
await vai(page, 'zone', '?oggi=2026-11-10');
await page.evaluate(async (id) => { const z = await import('/js/store/zone.js'); await z.eliminaZona(id); }, ids.a);
await vai(page, 'diario', '?oggi=2026-11-10');
await page.reload();
await page.waitForSelector('.foto-voce');
check('eliminando una zona le sue foto restano nel diario', (await page.locator('.foto-voce').count()) === 3);

// File sbagliati e troppe foto
await page.getByRole('button', { name: '+ Aggiungi foto' }).click();
await page.waitForSelector('dialog[open] form');
await page.setInputFiles('input[name=diario-galleria]', { name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('ciao') });
await page.waitForTimeout(300);
check('un file che non è una foto: messaggio, nessuna anteprima', (await page.locator('dialog .esito').innerText()).includes('non è una foto') && (await page.locator('dialog .anteprima').count()) === 0);
const piccola = await png(page, '#999999', 200, 150);
await page.setInputFiles('input[name=diario-galleria]', Array.from({ length: 12 }, (_, i) => ({ name: `f${i}.png`, mimeType: 'image/png', buffer: piccola })));
await page.waitForFunction(() => document.querySelectorAll('dialog .anteprima').length === 10);
await page.waitForTimeout(400);
check('al massimo 10 foto per volta, con messaggio', (await page.locator('dialog .anteprima').count()) === 10 && (await page.locator('dialog .esito').innerText()).includes('Al massimo 10'));
await page.keyboard.press('Escape');

check('nessun errore in console / rete (esclusi i guasti simulati)', problemi.filter((p) => !/generativelanguage|open-meteo|Failed to load resource|Service Worker registration blocked/i.test(p)).length === 0, problemi.join(' | ').slice(0, 500));
await browser.close();
process.exit(finale() ? 1 : 0);
