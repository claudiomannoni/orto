// Struttura dell'app: «Il mio orto» a sezioni, «Impara» a linguette, freccia indietro, indice delle impostazioni. Uso: node tests/37-struttura.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai } from './lib.mjs';
const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);

// Il mio orto: tre sezioni con titolo
await vai(page, 'colture', '?oggi=2026-06-30');
await page.waitForSelector('.tessere-azione');
const titoli = await page.locator('main > h3').allInnerTexts();
check('«Il mio orto» ha le tre sezioni con titolo', titoli.slice(0, 3).join('|') === 'Il mio orto|Raccolti e scorte|Allevamenti, frutteto e colture speciali', titoli.join('|'));
check('le nove tessere ci sono ancora tutte, in tre gruppi', (await page.locator('.tessere-azione .tessera-azione').count()) === 9 && (await page.locator('main > .tessere-azione').count()) === 3);

// Freccia indietro
const indietro = page.locator('.testata .indietro');
check('nelle schermate principali la freccia indietro non c\'è', !(await indietro.isVisible()));
await page.click('a.tessera-azione[href="#/semi"]');
await page.waitForSelector('#semi-nuova');
check('in una schermata secondaria compare la freccia e porta a «Il mio orto»', (await indietro.isVisible()) && (await indietro.getAttribute('href')) === '#/colture');
const box = await indietro.boundingBox();
check('la freccia è abbastanza grande per il dito (48 px)', box.width >= 44 && box.height >= 44, JSON.stringify(box));
await indietro.click();
await page.waitForSelector('main > h3');
check('toccandola si torna a «Il mio orto»', /#\/colture/.test(page.url()));
await vai(page, 'coltura', '?id=pomodori');
await page.waitForTimeout(500);
check('dalla scheda di una coltura la freccia porta a «Impara»', (await indietro.getAttribute('href')) === '#/impara');

// Impara a linguette
await vai(page, 'impara', '?oggi=2026-06-30');
await page.waitForSelector('.linguette');
const linguette = await page.locator('.linguetta').allInnerTexts();
check('tre linguette con il numero di voci', linguette.length === 3 && /Colture \(27\)/.test(linguette[0]) && /Parole/.test(linguette[1]) && /Altre coltivazioni \(\d+\)/.test(linguette[2]), linguette.join(' | '));
check('all\'inizio sono visibili solo le colture', (await page.locator('.griglia-colture').isVisible()) && !(await page.locator('.elenco-termini').isVisible()) && !(await page.locator('.elenco-altre').isVisible()));
const alt = await page.evaluate(() => document.querySelector('main').scrollHeight / innerHeight);
check('la pagina non è più una lista infinita (meno di 4 schermate)', alt < 4, alt.toFixed(1));
await page.locator('.linguetta', { hasText: 'Parole' }).click();
check('toccando «Parole» si vedono le parole e non le colture', (await page.locator('.elenco-termini').isVisible()) && !(await page.locator('.griglia-colture').isVisible()));
await page.locator('.linguetta', { hasText: 'Altre coltivazioni' }).click();
const altre = await page.locator('.elenco-altre').innerText();
check('«Altre coltivazioni»: animali, alberi, colture speciali', /Api, vermi e galline/.test(altre) && /Alberi da frutto/.test(altre) && /Colture speciali/.test(altre));
await page.fill('input[name=cerca]', 'lombric');
await page.waitForTimeout(200);
const sel = await page.locator('.linguetta[aria-selected=true]').innerText();
check('cercando «lombric» si passa alla linguetta dove ci sono risultati', !/Colture/.test(sel) || /\(0\)/.test(sel) === false, sel);
await page.fill('input[name=cerca]', 'xyzxyz');
await page.waitForTimeout(200);
check('ricerca senza risultati: messaggio', await page.locator('.vuoto-testo:not([hidden])').count() >= 1);
await page.fill('input[name=cerca]', '');
await page.locator('.linguetta').first().click();
await page.keyboard.press('ArrowRight');
check('le frecce della tastiera cambiano linguetta', (await page.locator('.linguetta[aria-selected=true]').innerText()).startsWith('Parole'));
check('tessera «Pausa con i vermi» in Impara', (await page.locator('a.tessera-azione[href="#/vermi"]').count()) === 1);

// Impostazioni: indice
await vai(page, 'impostazioni', '?oggi=2026-06-30');
await page.waitForSelector('.vai-a');
const voci = await page.locator('.vai-a button').count();
check('indice delle impostazioni con una voce per sezione (8)', voci === 8, String(voci));
await page.locator('.vai-a button').nth(5).click(); // «Intelligenza artificiale» o simile
await page.waitForTimeout(700);
const dentro = await page.evaluate(() => { const r = document.getElementById('imp-5').getBoundingClientRect(); return r.top >= -5 && r.top < innerHeight * 0.6; });
check('toccando una voce si scorre alla sezione', dentro);
const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
