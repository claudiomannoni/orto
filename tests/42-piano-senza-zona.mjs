// Scheda «Piano» della pianta: senza zona spiega cosa fare e permette di sceglierla; con zona porta al piano dell'aiuola.
import { chromium, nuovoContesto, vai } from './lib.mjs';
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
const b = await chromium.launch(); const ctx = await nuovoContesto(b, { serviceWorkers: 'block' }); const page = await ctx.newPage();
const seme = (zone) => page.evaluate((zone) => new Promise((fine) => { const r = indexedDB.open('orto'); r.onsuccess = () => { const db = r.result; const tx = db.transaction(['colture', 'zone'], 'readwrite');
  tx.objectStore('colture').put({ id: 'c1', nome: 'Carciofo', varieta: '', dataSemina: '2026-03-10', dove: 'orto', partenza: 'piantina', note: '', creata: '2026-03-10T08:00:00.000Z', schedaId: 'carciofi', zonaId: null, schemaVersion: 2 });
  for (const z of zone) tx.objectStore('zone').put({ id: z, nome: `Aiuola ${z}`, tipo: 'aiuola', stato: 'coltivata', misure: { lunghezza_m: 4, larghezza_m: 1.5 }, superficie_mq: 6, esposizione: { gradi: null }, terreno: null, note: '', creata: '2026-03-01T08:00:00.000Z', schemaVersion: 3 });
  tx.oncomplete = () => { db.close(); fine(); }; }; }), zone);
await vai(page, 'oggi', '?oggi=2026-11-07');

// 1. nessuna zona esistente: spiega e manda a crearla
await seme([]);
await vai(page, 'pianta?id=c1&scheda=piano', '?oggi=2026-11-07');
let testo = await page.locator('#schermata').innerText();
check('senza zona: nessun «x metri» e nessun «Non trovo questa zona»', !/ x | x metri|Non trovo questa zona/.test(testo.replace('Aiuola di', '')) && !/Non trovo questa zona/.test(testo), testo.slice(0, 80));
check('senza zona e senza zone: il tasto «Crea la prima zona» porta alle zone', (await page.locator('a:has-text("Crea la prima zona")').getAttribute('href')) === '#/zone');

// 2. una zona esiste: si sceglie e si salva
await seme(['z1']);
await page.reload();
await vai(page, 'pianta?id=c1&scheda=piano', '?oggi=2026-11-07');
check('con zone esistenti: si sceglie la zona da un elenco', (await page.locator('select[name="zona"] option').count()) === 1);
await page.click('button:has-text("Metti in questa zona")');
await page.waitForSelector('a:has-text("Piano")', { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(600);
const href = await page.locator('a.btn.primario.grande').first().getAttribute('href').catch(() => null);
check('dopo averla scelta: il tasto porta al piano di quella zona', href === '#/piano?zona=z1', String(href));
check('nessuno scroll orizzontale', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
await b.close();
console.log(`Totale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
