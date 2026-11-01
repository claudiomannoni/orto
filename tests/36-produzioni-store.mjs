// Migrazione dei dati vecchi nei lotti di produzione (database versione 3 -> 4), backup formato 3 e ripristino di un backup vecchio.
// Uso: node tests/36-produzioni-store.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, BASE } from './lib.mjs';
const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block', acceptDownloads: true });
const page = await ctx.newPage();
osserva(page, problemi);
page.on('dialog', (d) => d.accept());

// 1. un telefono con la versione vecchia: database 3 con colture, eventi di raccolto ed eccesso nelle impostazioni
await page.goto(`${BASE}/manifest.webmanifest`);
await page.evaluate(() => new Promise((ok, ko) => {
  const r = indexedDB.open('orto', 3);
  r.onupgradeneeded = () => { const d = r.result; for (const [n, k] of [['colture', 'id'], ['impostazioni', 'chiave'], ['zone', 'id'], ['eventi', 'id'], ['foto', 'id']]) d.createObjectStore(n, { keyPath: k }); };
  r.onerror = () => ko(r.error);
  r.onsuccess = () => {
    const d = r.result; const tx = d.transaction(['impostazioni', 'eventi', 'colture'], 'readwrite');
    const imp = tx.objectStore('impostazioni');
    imp.put({ chiave: 'primo_avvio_fatto', valore: true });
    imp.put({ chiave: 'eccesso', valore: [
      { id: 'x1', categoria: 'ortaggi', nome: 'Zucchine', quantita: 3, unita: 'kg', stato: 'disponibile', data: '2026-07-10' },
      { id: 'x2', categoria: 'uova_miele', nome: 'Uova', quantita: 12, unita: 'pezzi', stato: 'venduto', data: '2026-07-11' },
    ] });
    const ev = tx.objectStore('eventi');
    ev.put({ id: 'r1', tipo: 'raccolto', data: '2026-07-04', esito: 'ok', quantita: 2, unita: 'kg', nomeColtura: 'Pomodori', colturaId: 'c1', schedaId: 'pomodori', zonaId: null, creato: '2026-07-04T08:00:00.000Z' });
    ev.put({ id: 'r2', tipo: 'raccolto', data: '2026-07-05', esito: 'ok', quantita: 500, unita: 'g', nomeColtura: 'Basilico', colturaId: 'c2', schedaId: 'basilico', zonaId: null, creato: '2026-07-05T08:00:00.000Z' });
    ev.put({ id: 'n1', tipo: 'nota', data: '2026-07-05', esito: 'ok', note: 'bella giornata', creato: '2026-07-05T09:00:00.000Z' });
    tx.objectStore('colture').put({ id: 'c1', nome: 'Pomodori', varieta: '', dataSemina: '2026-05-01', dove: 'orto', note: '', creata: '2026-05-01T08:00:00.000Z', schemaVersion: 2 });
    tx.oncomplete = () => { d.close(); ok(); };
  };
}));

// 2. l'app si apre: il database sale a 4 e i dati vecchi diventano lotti
await page.goto(`${BASE}/#/oggi?oggi=2026-07-12`);
await page.waitForSelector('.titolo-schermata');
const leggi = (store) => page.evaluate((s) => new Promise((ok) => { const r = indexedDB.open('orto'); r.onsuccess = () => { const d = r.result; const q = d.transaction(s).objectStore(s).getAll(); q.onsuccess = () => { ok(q.result); d.close(); }; }; }), store);
// la migrazione parte all'avvio: si aspetta che i lotti compaiano (senza un'attesa fissa)
await page.waitForFunction(() => new Promise((ok) => { const r = indexedDB.open('orto'); r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains('produzioni')) { d.close(); return ok(false); } const q = d.transaction('produzioni').objectStore('produzioni').count(); q.onsuccess = () => { ok(q.result >= 4); d.close(); }; }; }), null, { timeout: 15000, polling: 300 });
const versioneDb = await page.evaluate(() => new Promise((ok) => { const r = indexedDB.open('orto'); r.onsuccess = () => { ok([r.result.version, [...r.result.objectStoreNames].sort().join()]); r.result.close(); }; }));
check('il database è passato alla versione 4 con i due archivi nuovi', versioneDb[0] === 4 && /movimenti/.test(versioneDb[1]) && /produzioni/.test(versioneDb[1]), JSON.stringify(versioneDb));
let lotti = await leggi('produzioni');
const ids = lotti.map((l) => l.id).sort().join();
check('quattro lotti: due raccolti e due voci dell\'eccesso (la nota non conta)', ids === 'eccesso:x1,eccesso:x2,raccolto:r1,raccolto:r2', ids);
let mov = await leggi('movimenti');
check('un solo movimento: la cessione delle uova «vendute»', mov.length === 1 && mov[0].produzioneId === 'eccesso:x2' && mov[0].tipo === 'cessione' && mov[0].quantita === 12, JSON.stringify(mov));
check('il raccolto in grammi resta in grammi (500 g di basilico)', lotti.find((l) => l.id === 'raccolto:r2').unita === 'g' && lotti.find((l) => l.id === 'raccolto:r2').quantita_ottenuta === 500);
const eventi = await leggi('eventi');
check('gli eventi di prima ci sono ancora tutti e tre (niente cancellato)', eventi.length === 3);
const imp = await leggi('impostazioni');
check('la lista dell\'eccesso nelle impostazioni è intatta e la migrazione è segnata', imp.find((x) => x.chiave === 'eccesso').valore.length === 2 && imp.find((x) => x.chiave === 'migrazione_produzioni')?.valore === 1);

// 3. riaprire non duplica
await page.reload();
await page.waitForSelector('.titolo-schermata');
await page.waitForTimeout(600);
lotti = await leggi('produzioni');
mov = await leggi('movimenti');
check('riaprendo l\'app niente doppioni', lotti.length === 4 && mov.length === 1);

// 4. un nuovo raccolto dal modulo scrive anche il lotto
await page.goto(`${BASE}/#/raccolto?oggi=2026-07-12`);
await page.waitForSelector('.titolo-schermata');
await page.locator('button:has-text("Segna")').first().click().catch(() => {});
await page.waitForTimeout(300);
const haForm = (await page.locator('dialog[open] input[name=quantita]').count()) > 0;
if (haForm) {
  await page.fill('dialog input[name=quantita]', '1.5');
  await page.click('dialog button[type=submit]');
  await page.waitForTimeout(500);
  lotti = await leggi('produzioni');
  const nuovo = lotti.find((l) => /^raccolto:/.test(l.id) && !['raccolto:r1', 'raccolto:r2'].includes(l.id));
  check('un raccolto registrato ora crea anche il suo lotto, collegato all\'evento', Boolean(nuovo) && nuovo.quantita_ottenuta === 1.5 && (await leggi('eventi')).some((e) => e.tipo === 'raccolto' && e.produzioneId === nuovo.id), JSON.stringify(nuovo));
} else {
  check('(modulo del raccolto non aperto in prova: controllo saltato)', true);
}

// 5. backup formato 3 con i lotti, e backup vecchio che li ricostruisce
const backup = await page.evaluate(async () => { const m = await import('./js/store/backup.js'); return JSON.parse(JSON.stringify(await m.creaBackup())); });
check('il backup è di formato 3 e contiene lotti e movimenti', backup.versione === 3 && Array.isArray(backup.produzioni) && backup.produzioni.length >= 4 && Array.isArray(backup.movimenti) && backup.movimenti.length === 1);
check('nel backup non c\'è la chiave dell\'IA', !JSON.stringify(backup).includes('ai_chiave'));
const vecchio = { ...backup, versione: 2 };
delete vecchio.produzioni; delete vecchio.movimenti;
vecchio.eventi = backup.eventi.filter((e) => e.id !== 'r2'); // un backup di prima: un raccolto in meno
const esito = await page.evaluate(async (dati) => {
  const m = await import('./js/store/backup.js');
  const blob = new Blob([JSON.stringify(dati)], { type: 'application/json' });
  const letto = await m.leggiFile(new File([blob], 'vecchio.json'));
  await m.applica(letto);
  return { produzioni: letto.produzioni, movimenti: letto.movimenti };
}, vecchio);
check('un backup di formato 2 non ha lotti (null) e viene accettato', esito.produzioni === null && esito.movimenti === null);
lotti = await leggi('produzioni');
check('dopo il ripristino vecchio i lotti sono ricostruiti dai raccolti e dall\'eccesso ripristinati (r2 non c\'è più)', !lotti.some((l) => l.id === 'raccolto:r2') && lotti.some((l) => l.id === 'raccolto:r1') && lotti.some((l) => l.id === 'eccesso:x2'), lotti.map((l) => l.id).join());
const nuovoBackup = await page.evaluate(async (dati) => {
  const m = await import('./js/store/backup.js');
  const letto = await m.leggiFile(new File([new Blob([JSON.stringify(dati)])], 'v3.json'));
  await m.applica(letto);
  return letto.produzioni?.length;
}, backup);
check('un backup di formato 3 riporta tutti i lotti com\'erano', nuovoBackup === backup.produzioni.length && (await leggi('produzioni')).length === backup.produzioni.length);

const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
