// Oggi parla delle tue piante: i bisogni stanno in cima, il calendario generico in un pannello.
import { chromium, nuovoContesto, vai } from './lib.mjs';
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
const b = await chromium.launch(); const ctx = await nuovoContesto(b, { serviceWorkers: 'block' }); const page = await ctx.newPage();
const OGGI = '?oggi=2026-11-09&corta';

// 1. orto vuoto: invito ad aggiungere piante, calendario del mese aperto
await vai(page, 'oggi', OGGI);
check('senza piante: invito ad aggiungerle', /Aggiungi le tue piante/.test(await page.locator('section.bisogni').innerText()) && (await page.locator('section.bisogni a[href="#/colture"]').count()) === 1);
check('senza piante: il calendario del mese è aperto', await page.locator('details.lavori-mese').evaluate((d) => d.open));

// 2. orto con pomodori di giugno, lattuga e fave a novembre
await page.evaluate(() => new Promise((fine) => { const r = indexedDB.open('orto'); r.onsuccess = () => { const db = r.result; const tx = db.transaction('colture', 'readwrite'); const s = tx.objectStore('colture');
  const c = (id, nome, sch, data, p) => s.put({ id, nome, varieta: '', dataSemina: data, dove: 'orto', partenza: p, note: '', creata: data + 'T08:00:00.000Z', schedaId: sch, zonaId: null, schemaVersion: 2 });
  c('b', 'Pomodori', 'pomodori', '2026-06-06', 'piantina'); c('c', 'Fave', 'fave', '2026-10-20', 'seme'); c('e', 'Lattuga', 'lattuga', '2026-10-01', 'piantina');
  tx.oncomplete = () => { db.close(); fine(); }; }; }));
await page.reload();
await vai(page, 'oggi', OGGI);
await page.waitForSelector('li.bisogno');
const titoli = await page.locator('li.bisogno strong').allInnerTexts();
check('i pomodori di giugno compaiono tra le cose da fare', titoli.some((x) => /Pomodori/.test(x)), titoli.join(' | '));
check('ogni voce nomina una pianta dell\'orto', titoli.length >= 2 && titoli.every((x) => /Pomodori|Fave|Lattuga/.test(x)), titoli.join(' | '));
check('con voci dalle piante: il calendario del mese è chiuso', !(await page.locator('details.lavori-mese').evaluate((d) => d.open)));
check('i bisogni stanno sopra il calendario del mese', await page.evaluate(() => { const a = document.querySelector('section.bisogni'), m = document.querySelector('details.lavori-mese'); return Boolean(a.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING); }));
const misure = await page.locator('.bisogno-spunta').first().boundingBox();
check('la casella è un bersaglio di almeno 48 px', misure.width >= 48 && misure.height >= 48, JSON.stringify(misure));
check('la voce porta alla pagina della pianta', /#\/pianta\?id=/.test(await page.locator('li.bisogno a.bisogno-testi').first().getAttribute('href')));

// 3. «Fatto»: sparisce, resta sparita dopo aver ricaricato, e finisce nella storia con il suo titolo
const primo = await page.locator('li.bisogno strong').first().innerText();
const quanti = await page.locator('li.bisogno').count();
await page.locator('.bisogno-spunta').first().click();
await page.waitForTimeout(400);
check('spuntata: la voce sparisce', (await page.locator('li.bisogno').count()) === quanti - 1);
await page.reload();
await vai(page, 'oggi', OGGI);
check('dopo aver ricaricato non torna', !(await page.locator('li.bisogno strong').allInnerTexts()).includes(primo));
await vai(page, 'storia', '?oggi=2026-11-09');
check('nella storia c\'è il lavoro con il suo titolo, non un codice', (await page.locator('#schermata').innerText()).includes(primo) && !/bisogno-/.test(await page.locator('#schermata').innerText()));
await vai(page, 'oggi', OGGI);
check('nessuno scroll orizzontale e niente tagliato a destra', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && [...document.querySelectorAll('main > *, li.bisogno, .tag-urgenza')].every((e) => e.getBoundingClientRect().right <= window.innerWidth + 0.5)));
await b.close();
console.log(`Totale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
