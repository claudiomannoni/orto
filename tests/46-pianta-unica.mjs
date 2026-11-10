// Pagina della pianta in una pagina sola: stato e cosa fare in alto, voci chiuse che si aprono.
import { chromium, nuovoContesto, vai } from './lib.mjs';
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
const b = await chromium.launch(); const ctx = await nuovoContesto(b, { serviceWorkers: 'block' }); const page = await ctx.newPage();
const errori = []; page.on('pageerror', (e) => errori.push(e.message));
const Q = '?oggi=2026-11-09&corta';
await vai(page, 'oggi', Q);
await page.evaluate(() => new Promise((fine) => { const r = indexedDB.open('orto'); r.onsuccess = () => { const db = r.result; const tx = db.transaction('colture', 'readwrite'); const s = tx.objectStore('colture');
  const c = (id, nome, sch, data, p) => s.put({ id, nome, varieta: '', dataSemina: data, dove: 'orto', partenza: p, note: '', creata: data + 'T08:00:00.000Z', schedaId: sch, zonaId: null, schemaVersion: 2 });
  c('b', 'Pomodori', 'pomodori', '2026-06-06', 'piantina'); c('x', 'Pianta misteriosa', null, '2026-10-01', 'seme');
  tx.oncomplete = () => { db.close(); fine(); }; }; }));
await page.reload();

// 1. pomodori di giugno a novembre: fine stagione, con la frase dei dati e il tasto Fatto
await vai(page, 'pianta?id=b', Q);
await page.waitForSelector('section.stato-pianta h3');
check('in alto lo stato: «Fine stagione» con cosa fare', (await page.locator('.stato-titolo').innerText()) === 'Fine stagione' && /Raccogli i frutti rimasti/.test(await page.locator('.stato-frase').innerText()));
check('non c\'è più il raccolto previsto per un ciclo concluso', !/Raccolto previsto/.test(await page.locator('section.stato-pianta').innerText()));
check('le schede in alto non ci sono più', (await page.locator('.schede-pianta, .scheda-pianta-tab').count()) === 0);
const voci = await page.locator('details.voce-pianta:not([hidden])').evaluateAll((d) => d.map((x) => `${x.dataset.voce}:${x.open}`));
check('le voci sono tutte chiuse all\'inizio', voci.length >= 5 && voci.every((v) => v.endsWith(':false')), voci.join(' '));
check('ogni voce è un bersaglio di almeno 48 px', (await page.locator('details.voce-pianta:not([hidden]) > summary').evaluateAll((s) => s.every((x) => x.getBoundingClientRect().height >= 48))));
check('«Può passare l\'inverno?» dice subito «No»', /No/.test(await page.locator('details[data-voce="inverno"] .voce-accenno').innerText()));
await page.locator('details[data-voce="inverno"] > summary').click();
check('aperta: ci sono le opzioni (talee comprese)', (await page.locator('details[data-voce="inverno"] details.opzione-sopravvivenza').count()) === 2);
await page.click('#stato-fatto');
await page.waitForTimeout(400);
check('dopo «Fatto» lo stato non chiede più la stessa cosa', /Già fatto/.test(await page.locator('.stato-titolo').innerText()) && (await page.locator('#stato-fatto').count()) === 0, await page.locator('.stato-titolo').innerText());
await page.reload(); await vai(page, 'oggi', Q);
check('e in Oggi i pomodori non chiedono più la fine stagione', !(await page.locator('li.bisogno strong').allInnerTexts()).some((x) => /Raccogli quello che resta: Pomodori/.test(x)));

// 2. indirizzi vecchi e nuovi aprono la voce giusta
await vai(page, 'pianta?id=b&scheda=piano', Q);
check('?scheda=piano apre «Dove sta»', await page.locator('details[data-voce="piano"]').evaluate((d) => d.open));
await vai(page, 'pianta?id=b&scheda=scheda', Q);
check('?scheda=scheda apre «Come curarla» e la scheda', (await page.locator('details[data-voce="cura"]').evaluate((d) => d.open)) && (await page.locator('details[data-voce="scheda"]').evaluate((d) => d.open)));
await vai(page, 'pianta?id=b&scheda=inverno', Q);
check('?scheda=inverno apre l\'inverno', await page.locator('details[data-voce="inverno"]').evaluate((d) => d.open));

// 3. pianta senza scheda: nessuna voce inventata
await vai(page, 'pianta?id=x', Q);
await page.waitForSelector('section.stato-pianta h3');
check('pianta senza scheda: dice che non ha indicazioni, senza tasto Fatto', /non ho indicazioni/.test(await page.locator('.stato-titolo').innerText()) && (await page.locator('#stato-fatto').count()) === 0);
check('pianta senza scheda: niente voci su inverno, cura o fase', (await page.locator('details[data-voce="inverno"], details[data-voce="cura"], details[data-voce="fase"]').count()) === 0);
check('nessuno scroll orizzontale e nessun errore', (await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)) && errori.length === 0, errori.join(' | '));
await b.close();
console.log(`Totale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
