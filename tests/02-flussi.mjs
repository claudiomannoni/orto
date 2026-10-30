// Flussi: aggiungi/ricarica/elimina colture, promemoria Google Calendar, backup (esporta/importa),
// import del backup della prima versione, file non validi, migrazione dal database v1.
// Uso: node tests/02-flussi.mjs [indirizzo-base]
import { chromium, BASE, CARTELLA_SCHERMATE as OUT, nuovoContesto, osserva, vai, check, finale, svuotaDati, leggiDb, nota, attendiApp } from './lib.mjs';
import path from 'node:path';
import fs from 'node:fs';

const browser = await chromium.launch();
const Q = '?oggi=2026-10-30';
const toast = (page) => page.$eval('#toast', (e) => e.textContent);
const nomiInLista = (page) => page.$$eval('.coltura h3', (h) => h.map((x) => x.textContent));

async function nuova(page, { nome, varieta = '', data = '2026-10-20', dove = 'orto', note = '' }) {
  await page.click('text=+ Nuova coltura');
  await page.fill('dialog input[name=nome]', nome);
  await page.fill('dialog input[name=varieta]', varieta);
  await page.fill('dialog input[name=dataSemina]', data);
  await page.check(`dialog input[name=dove][value=${dove}]`);
  await page.fill('dialog textarea[name=note]', note);
  await page.click('dialog button[type=submit]');
  await page.waitForSelector('dialog', { state: 'detached' });
}

// ---------- 1. Aggiungi / ricarica / elimina ----------
{
  const ctx = await nuovoContesto(browser, { acceptDownloads: true });
  const page = await ctx.newPage();
  const problemi = [];
  osserva(page, problemi);
  let dialogo = 'accept';
  page.on('dialog', async (d) => { const m = d.message(); page.__ultimoDialogo = m; dialogo === 'accept' ? await d.accept() : await d.dismiss(); });
  await vai(page, 'colture', Q);
  await svuotaDati(page);
  await vai(page, 'colture', Q);
  check('colture: elenco vuoto mostra il testo "Qui compariranno"', await page.isVisible('#colture-vuoto'));

  await nuova(page, { nome: 'Fave', varieta: 'Aguadulce', note: 'Dopo il pomodoro' });
  check('aggiunta: compare in elenco', (await nomiInLista(page)).join() === 'Fave · Aguadulce', (await nomiInLista(page)).join());
  check('aggiunta: toast "Coltura aggiunta"', (await toast(page)) === 'Coltura aggiunta', await toast(page));
  check('aggiunta: testo vuoto sparito', !(await page.isVisible('#colture-vuoto')));
  const gg = await page.$eval('.giorni strong', (e) => e.textContent);
  check('aggiunta: 10 giorni dalla semina (20 ott -> 30 ott)', gg === '10', gg);

  await page.reload(); await attendiApp(page);
  check('persistenza: dopo ricarica la coltura c\'è ancora', (await nomiInLista(page)).join() === 'Fave · Aguadulce');
  const db = await leggiDb(page, 'colture');
  check('db: record con schemaVersion 2, schedaId "fave", id stringa', db.length === 1 && db[0].schemaVersion === 2 && db[0].schedaId === 'fave' && typeof db[0].id === 'string', JSON.stringify(db));

  // validazione: nome vuoto non salva
  await page.click('text=+ Nuova coltura');
  await page.fill('dialog input[name=nome]', '');
  await page.click('dialog button[type=submit]');
  check('validazione: nome vuoto non salva (foglio resta aperto)', await page.isVisible('dialog'));
  await page.fill('dialog input[name=nome]', '   ');
  await page.click('dialog button[type=submit]');
  await page.waitForTimeout(300);
  const n1 = (await nomiInLista(page)).length;
  check('validazione: nome di soli spazi non crea colture', n1 === 1, `n=${n1}`);
  await page.click('dialog button:has-text("Annulla")');
  check('annulla chiude il foglio', !(await page.isVisible('dialog')));
  // tap fuori chiude
  await page.click('text=+ Nuova coltura');
  await page.mouse.click(200, 30);
  await page.waitForTimeout(200);
  check('tocco fuori dal foglio lo chiude', !(await page.isVisible('dialog')));

  // caratteri speciali
  await nuova(page, { nome: '<b>Zucca</b> & "co"', note: '<img src=x onerror=alert(1)>' });
  const html = await page.$eval('.lista', (e) => e.innerHTML);
  check('sicurezza: HTML nel nome/note non viene interpretato', !html.includes('<b>Zucca') && !html.includes('<img src=x'), '');

  // elimina: annulla
  dialogo = 'dismiss';
  await page.click('.coltura:has-text("Fave") >> text=Elimina');
  await page.waitForTimeout(200);
  check('elimina: conferma chiesta con il nome', /Fave/.test(page.__ultimoDialogo || ''), page.__ultimoDialogo);
  check('elimina: se annullo la coltura resta', (await nomiInLista(page)).some((n) => n.startsWith('Fave')));
  dialogo = 'accept';
  await page.click('.coltura:has-text("Fave") >> text=Elimina');
  await page.waitForTimeout(300);
  check('elimina: dopo conferma sparisce', !(await nomiInLista(page)).some((n) => n.startsWith('Fave')), (await nomiInLista(page)).join());
  check('elimina: toast', (await toast(page)) === 'Coltura eliminata');
  await page.reload(); await attendiApp(page);
  check('elimina: dopo ricarica non torna', !(await nomiInLista(page)).some((n) => n.startsWith('Fave')));
  await page.click('.coltura >> text=Elimina');
  await page.waitForTimeout(300);
  check('elimina l\'ultima: torna il testo vuoto', await page.isVisible('#colture-vuoto'));

  // Oggi: riepilogo
  await nuova(page, { nome: 'Aglio', data: '2026-10-28' });
  await vai(page, 'oggi', Q);
  const r = await page.$$eval('#schermata .card p', (p) => p.map((x) => x.textContent));
  check('oggi: riepilogo "Hai 1 coltura" e "Ultima semina: Aglio, 2 giorni fa"', r.includes('Hai 1 coltura in corso.') && r.includes('Ultima semina: Aglio, 2 giorni fa.'), JSON.stringify(r));
  check('1. flussi colture: nessun errore in console', problemi.length === 0, problemi.join(' | '));
  await ctx.close();
}

// ---------- 2. Promemoria Google Calendar ----------
{
  const ctx = await nuovoContesto(browser);
  const page = await ctx.newPage();
  const problemi = [];
  osserva(page, problemi);
  await page.addInitScript(() => { window.__aperti = []; window.open = (...a) => { window.__aperti.push(a); return null; }; });
  await vai(page, 'colture', Q);
  await svuotaDati(page);
  await vai(page, 'colture', Q);
  await nuova(page, { nome: 'Fave', varieta: 'Aguadulce', data: '2026-10-20', dove: 'orto', note: 'Dopo il pomodoro' });
  await page.click('text=Aggiungi promemoria');
  const v = await page.$eval('dialog form', (f) => ({ t: f.titolo.value, d: f.data.value, x: f.descrizione.value }));
  check('promemoria: titolo precompilato', v.t === 'Orto: controllare Fave (Aguadulce)', v.t);
  check('promemoria: data precompilata = oggi + 7 (2026-11-06)', v.d === '2026-11-06', v.d);
  check('promemoria: descrizione precompilata', v.x.includes('Fave (Aguadulce)') && v.x.includes('20') && v.x.includes('Dopo il pomodoro'), JSON.stringify(v.x));
  await page.click('dialog button:has-text("Apri Calendar")');
  await page.waitForTimeout(200);
  const aperti = await page.evaluate(() => window.__aperti);
  check('promemoria: window.open chiamato una volta', aperti.length === 1, JSON.stringify(aperti));
  const u = new URL(aperti[0][0]);
  check('promemoria: host/percorso Google Calendar', u.origin === 'https://calendar.google.com' && u.pathname === '/calendar/render', aperti[0][0]);
  check('promemoria: action=TEMPLATE', u.searchParams.get('action') === 'TEMPLATE');
  check('promemoria: text = titolo', u.searchParams.get('text') === 'Orto: controllare Fave (Aguadulce)', u.searchParams.get('text'));
  check('promemoria: dates = 20261106/20261107 (giorno intero, fine esclusiva)', u.searchParams.get('dates') === '20261106/20261107', u.searchParams.get('dates'));
  check('promemoria: details = descrizione', u.searchParams.get('details') === v.x, u.searchParams.get('details'));
  check('promemoria: aperto in nuova scheda con noopener', aperti[0][1] === '_blank' && /noopener/.test(aperti[0][2] || ''), JSON.stringify(aperti[0].slice(1)));
  check('promemoria: il foglio si chiude', !(await page.isVisible('dialog')));
  // modifica di titolo/data/descrizione + fine anno
  await page.evaluate(() => { window.__aperti.length = 0; });
  await page.click('text=Aggiungi promemoria');
  await page.fill('dialog input[name=titolo]', 'Innaffiare & "sarchiare"');
  await page.fill('dialog input[name=data]', '2026-12-31');
  await page.fill('dialog textarea[name=descrizione]', 'riga1\nriga2 è bella');
  await page.click('dialog button:has-text("Apri Calendar")');
  const u2 = new URL((await page.evaluate(() => window.__aperti))[0][0]);
  check('promemoria modificato: testo con & e virgolette', u2.searchParams.get('text') === 'Innaffiare & "sarchiare"', u2.searchParams.get('text'));
  check('promemoria 31 dic: fine = 1 gen anno dopo', u2.searchParams.get('dates') === '20261231/20270101', u2.searchParams.get('dates'));
  check('promemoria modificato: descrizione a capo e accenti', u2.searchParams.get('details') === 'riga1\nriga2 è bella');
  // annulla non apre; titolo vuoto non apre
  await page.evaluate(() => { window.__aperti.length = 0; });
  await page.click('text=Aggiungi promemoria');
  await page.click('dialog button:has-text("Annulla")');
  check('promemoria: Annulla non apre nulla e chiude', (await page.evaluate(() => window.__aperti.length)) === 0 && !(await page.isVisible('dialog')));
  await page.click('text=Aggiungi promemoria');
  await page.fill('dialog input[name=titolo]', '');
  await page.click('dialog button:has-text("Apri Calendar")');
  check('promemoria: titolo vuoto non apre Calendar', (await page.evaluate(() => window.__aperti.length)) === 0 && await page.isVisible('dialog'));
  check('2. promemoria: nessun errore in console', problemi.length === 0, problemi.join(' | '));
  await ctx.close();
}

// ---------- 3. Backup esporta / importa ----------
{
  const ctx = await nuovoContesto(browser, { acceptDownloads: true });
  const page = await ctx.newPage();
  const problemi = [];
  osserva(page, problemi);
  let conferma = 'accept';
  let ultimoMsg = '';
  page.on('dialog', async (d) => { ultimoMsg = d.message(); conferma === 'accept' ? await d.accept() : await d.dismiss(); });
  await vai(page, 'colture', Q);
  await svuotaDati(page);
  await vai(page, 'colture', Q);
  await nuova(page, { nome: 'Fave', varieta: 'Aguadulce', data: '2026-10-20', note: 'Dopo il pomodoro' });
  await nuova(page, { nome: 'Aglio', data: '2026-10-28', dove: 'semenzaio' });
  // chiave finta + impostazioni
  const CHIAVE = 'AIzaSyFINTA-chiave-di-prova-000111222';
  await vai(page, 'impostazioni', Q);
  await page.fill('input[name=ai_chiave]', CHIAVE);
  await page.fill('input[name=ai_modello]', 'gemini-modello-finto');
  await page.click('button:has-text("Salva")');
  await page.selectOption('select[name=metodo]', 'biologico');
  await page.waitForTimeout(300);
  const dbImp = await leggiDb(page, 'impostazioni');
  check('impostazioni: la chiave finta è salvata nel database (come previsto)', dbImp.some((r) => r.chiave === 'ai_chiave' && r.valore === CHIAVE), JSON.stringify(dbImp.map((r) => r.chiave)));
  check('impostazioni: placeholder "Chiave salvata" dopo il salvataggio', (await page.getAttribute('input[name=ai_chiave]', 'placeholder')).startsWith('Chiave salvata'));
  await page.reload(); await attendiApp(page);
  check('impostazioni: metodo e modello restano dopo ricarica', (await page.inputValue('select[name=metodo]')) === 'biologico' && (await page.inputValue('input[name=ai_modello]')) === 'gemini-modello-finto');

  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Esporta backup")')]);
  const file = path.join(OUT, '..', '..', 'backup-esportato.json');
  await dl.saveAs(file);
  const testo = fs.readFileSync(file, 'utf8');
  const bk = JSON.parse(testo);
  check('export: nome file orto-backup-AAAA-MM-GG.json', /^orto-backup-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  check('export: formato "orto-backup" versione 2', bk.formato === 'orto-backup' && bk.versione === 2, `${bk.formato} v${bk.versione}`);
  check('export: campi esportato/impostazioni/colture/zone/eventi', typeof bk.esportato === 'string' && bk.impostazioni && Array.isArray(bk.colture) && Array.isArray(bk.zone) && Array.isArray(bk.eventi));
  check('export: 2 colture', bk.colture.length === 2, String(bk.colture.length));
  check('export: LA CHIAVE IA NON COMPARE (né ai_chiave né il valore)', !testo.includes(CHIAVE) && !testo.includes('ai_chiave') && !('ai_chiave' in bk.impostazioni), 'impostazioni=' + JSON.stringify(bk.impostazioni));
  check('export: impostazioni pubbliche presenti (metodo, modello)', bk.impostazioni.metodo === 'biologico' && bk.impostazioni.ai_modello === 'gemini-modello-finto');
  fs.unlinkSync(file); // non lasciare il file in repo

  // import: stesso backup dopo aver svuotato
  const bkBuf = Buffer.from(testo);
  await svuotaDati(page);
  await vai(page, 'impostazioni', Q);
  // la chiave è stata svuotata con i dati: la rimetto per verificare che l'import non la tocchi
  await page.fill('input[name=ai_chiave]', CHIAVE);
  await page.click('button:has-text("Salva")');
  await page.setInputFiles('input[type=file]', { name: 'b.json', mimeType: 'application/json', buffer: bkBuf });
  await page.waitForTimeout(500);
  check('import v2: chiede conferma con il numero di colture', /2 colture/.test(ultimoMsg), ultimoMsg);
  check('import v2: toast "Importate 2 colture"', (await toast(page)) === 'Importate 2 colture', await toast(page));
  let cs = await leggiDb(page, 'colture');
  check('import v2: 2 colture nel database', cs.length === 2 && cs.some((c) => c.nome === 'Fave' && c.varieta === 'Aguadulce' && c.dataSemina === '2026-10-20'), JSON.stringify(cs.map((c) => c.nome)));
  let imp = await leggiDb(page, 'impostazioni');
  check('import v2: metodo ripristinato e chiave IA locale intatta', imp.find((r) => r.chiave === 'metodo')?.valore === 'biologico' && imp.find((r) => r.chiave === 'ai_chiave')?.valore === CHIAVE);

  // import annullato = nessun cambiamento
  await svuotaDati(page);
  conferma = 'dismiss';
  await page.setInputFiles('input[type=file]', { name: 'b.json', mimeType: 'application/json', buffer: bkBuf });
  await page.waitForTimeout(400);
  check('import: se non confermo non cambia nulla', (await leggiDb(page, 'colture')).length === 0);
  conferma = 'accept';

  // import sostituisce (non unisce)
  await vai(page, 'colture', Q);
  await nuova(page, { nome: 'Extra', data: '2026-10-01' });
  await vai(page, 'impostazioni', Q);
  await page.setInputFiles('input[type=file]', { name: 'b.json', mimeType: 'application/json', buffer: bkBuf });
  await page.waitForTimeout(500);
  cs = await leggiDb(page, 'colture');
  check('import: sostituisce i dati (Extra sparita, 2 colture)', cs.length === 2 && !cs.some((c) => c.nome === 'Extra'), JSON.stringify(cs.map((c) => c.nome)));

  // backup della prima versione
  const v1 = { app: 'il-mio-orto', versione: 1, esportato: '2026-05-01T08:00:00.000Z', colture: [
    { id: 'a1', nome: 'Pomodoro', varieta: 'San Marzano', dataSemina: '2026-04-10', dove: 'semenzaio', note: 'prima', creata: '2026-04-10T07:00:00.000Z' },
    { id: 'b2', nome: 'Zucchine', varieta: '', dataSemina: '2026-05-01', dove: 'orto', note: '', creata: '2026-05-01T07:00:00.000Z' },
  ] };
  await page.setInputFiles('input[type=file]', { name: 'v1.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(v1)) });
  await page.waitForTimeout(500);
  cs = await leggiDb(page, 'colture');
  check('import backup v1 (il-mio-orto): importate 2 colture con gli stessi id', cs.length === 2 && cs.map((c) => c.id).sort().join() === 'a1,b2', JSON.stringify(cs.map((c) => c.id)));
  check('import backup v1: campi portati al formato 2 (schemaVersion 2, schedaId/zonaId null)', cs.every((c) => c.schemaVersion === 2 && 'schedaId' in c && 'zonaId' in c), JSON.stringify(cs[0]));
  check('import backup v1: dati intatti (San Marzano, 2026-04-10, semenzaio)', cs.some((c) => c.id === 'a1' && c.varieta === 'San Marzano' && c.dataSemina === '2026-04-10' && c.dove === 'semenzaio' && c.note === 'prima'));
  await vai(page, 'colture', Q);
  check('import backup v1: l\'elenco le mostra', (await nomiInLista(page)).length === 2);
  await page.screenshot({ path: path.join(OUT, 'dopo-import-v1.png'), fullPage: true });

  // semplice elenco di colture
  await vai(page, 'impostazioni', Q);
  await page.setInputFiles('input[type=file]', { name: 'e.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([{ nome: 'Basilico', dataSemina: '2026-06-01' }])) });
  await page.waitForTimeout(500);
  cs = await leggiDb(page, 'colture');
  check('import semplice elenco (senza id): id generato, 1 coltura', cs.length === 1 && cs[0].nome === 'Basilico' && typeof cs[0].id === 'string' && cs[0].id.length > 5, JSON.stringify(cs));

  // file non validi: i dati devono restare
  const prima = JSON.stringify(await leggiDb(page, 'colture'));
  const brutti = [
    ['non JSON', 'questo non è json {'],
    ['JSON ma non backup (oggetto)', '{"ciao":1}'],
    ['colture non array', '{"colture":"x"}'],
    ['coltura senza nome', '{"colture":[{"dataSemina":"2026-01-01"}]}'],
    ['coltura con data impossibile', '{"colture":[{"nome":"X","dataSemina":"2026-13-45"}]}'],
    ['coltura senza data', '{"colture":[{"nome":"X"}]}'],
    ['file vuoto', ''],
    ['null', 'null'],
  ];
  for (const [nome, contenuto] of brutti) {
    ultimoMsg = '';
    await page.setInputFiles('input[type=file]', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from(contenuto) });
    await page.waitForTimeout(350);
    const t = await toast(page);
    const dopo = JSON.stringify(await leggiDb(page, 'colture'));
    check(`file non valido (${nome}): messaggio "File non valido…", nessuna conferma, dati intatti`, /^File non valido/.test(t) && ultimoMsg === '' && dopo === prima, `toast="${t}" dialogo="${ultimoMsg}"`);
    if (nome === 'non JSON') check('file non valido: messaggio JSON corretto', t === 'File non valido: non è un JSON', t);
    if (nome === 'JSON ma non backup (oggetto)') check('file non valido: messaggio formato corretto', t === 'File non valido: non è un backup dell\'orto', t);
    await page.waitForTimeout(100);
  }
  // un backup con ai_chiave inserita a mano non deve importarla
  await page.setInputFiles('input[type=file]', { name: 'k.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ formato: 'orto-backup', versione: 2, impostazioni: { ai_chiave: 'CHIAVE-DA-FILE', metodo: 'sinergico' }, colture: [] })) });
  await page.waitForTimeout(500);
  imp = await leggiDb(page, 'impostazioni');
  check('import: una ai_chiave dentro il file viene ignorata', imp.find((r) => r.chiave === 'ai_chiave')?.valore !== 'CHIAVE-DA-FILE' && imp.find((r) => r.chiave === 'metodo')?.valore === 'sinergico', JSON.stringify(imp));
  check('3. backup: nessun errore in console', problemi.length === 0, problemi.join(' | '));
  await ctx.close();
}

// ---------- 4. Migrazione da database v1 ----------
{
  const ctx = await nuovoContesto(browser);
  const page = await ctx.newPage();
  const problemi = [];
  osserva(page, problemi);
  // pagina senza app, stessa origine: costruisco il database come la prima versione
  await page.goto(`${BASE}/manifest.webmanifest`);
  await page.evaluate(() => new Promise((ok, ko) => {
    const r = indexedDB.open('orto', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('colture', { keyPath: 'id' });
    r.onsuccess = () => {
      const db = r.result;
      const tx = db.transaction('colture', 'readwrite');
      const s = tx.objectStore('colture');
      s.put({ id: 'v1-aaa', nome: 'Pomodoro', varieta: 'Cuore di bue', dataSemina: '2026-04-15', dove: 'semenzaio', note: '3 semi per vasetto', creata: '2026-04-15T08:00:00.000Z' });
      s.put({ id: 'v1-bbb', nome: 'Fave', varieta: '', dataSemina: '2026-10-20', dove: 'orto', note: '', creata: '2026-10-20T08:00:00.000Z' });
      s.put({ id: 'v1-ccc', nome: 'Zucchina', varieta: 'Romanesca', dataSemina: '2026-05-02', dove: 'orto', note: 'vicino al pozzo', creata: '2026-05-02T08:00:00.000Z' });
      tx.oncomplete = () => { db.close(); ok(); };
      tx.onerror = () => ko(tx.error);
    };
  }));
  const ver0 = await page.evaluate(() => new Promise((ok) => indexedDB.databases().then((d) => ok(d.find((x) => x.name === 'orto')?.version))));
  check('migrazione: database di partenza è v1', ver0 === 1, String(ver0));
  await vai(page, 'colture', Q);
  const nomi = await nomiInLista(page);
  check('migrazione: le 3 colture della v1 sono in elenco', nomi.length === 3 && nomi.includes('Fave') && nomi.includes('Pomodoro · Cuore di bue') && nomi.includes('Zucchina · Romanesca'), nomi.join(' | '));
  const info = await page.evaluate(() => new Promise((ok) => { const r = indexedDB.open('orto'); r.onsuccess = () => { const d = r.result; const o = { v: d.version, st: [...d.objectStoreNames].sort() }; d.close(); ok(o); }; }));
  check('migrazione: database ora v2 con store colture/eventi/impostazioni/zone', info.v === 2 && info.st.join() === 'colture,eventi,impostazioni,zone', JSON.stringify(info));
  const cs = await leggiDb(page, 'colture');
  check('migrazione: record originali intatti (id, nome, data, note)', cs.length === 3 && cs.find((c) => c.id === 'v1-aaa')?.note === '3 semi per vasetto' && cs.find((c) => c.id === 'v1-ccc')?.dataSemina === '2026-05-02', JSON.stringify(cs.map((c) => c.id)));
  await page.screenshot({ path: path.join(OUT, 'migrazione-da-v1.png'), fullPage: true });
  await page.reload(); await attendiApp(page);
  check('migrazione: dopo ricarica ci sono ancora', (await nomiInLista(page)).length === 3);
  // si possono ancora promemoria/elimina su una coltura vecchia
  await page.addInitScript(() => { window.open = () => null; });
  page.on('dialog', (d) => d.accept());
  await page.click('.coltura:has-text("Zucchina") >> text=Elimina');
  await page.waitForTimeout(300);
  check('migrazione: una coltura vecchia si elimina', (await nomiInLista(page)).length === 2 && (await leggiDb(page, 'colture')).length === 2);
  const bk = await page.evaluate(async () => { const m = await import('./js/store/backup.js'); return m.creaBackup(); });
  check('migrazione: il backup esporta le colture vecchie', bk.colture.length === 2 && bk.versione === 2);
  check('4. migrazione: nessun errore in console', problemi.length === 0, problemi.join(' | '));
  await ctx.close();
}

await browser.close();
process.exit(finale() ? 1 : 0);
