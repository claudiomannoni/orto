// Struttura dell'app: nuovo registro, barra principale e indice delle impostazioni. Uso: node tests/37-struttura.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai } from './lib.mjs';
const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);

// Il mio orto: colture subito visibili, risorse secondarie ripiegate.
// La libreria `vai` apre i pannelli ripiegati per comodità dei test: qui il controllo
// è proprio sullo stato iniziale, quindi si ricarica (i pannelli tornano chiusi).
await vai(page, 'colture', '?oggi=2026-06-30');
await page.reload();
await page.waitForSelector('.colture-strumenti');
check('Il mio orto mostra aggiunta fissa e i filtri (ora quattro, con Mappa)', await page.locator('main > h2.titolo-schermata').innerText() === 'Il mio orto' && (await page.locator('.filtri-colture button').count()) === 4 && (await page.locator('.filtri-colture').innerText()).includes('Mappa') && await page.locator('button.colture-nuova-fissa').count() === 1);
check('i nove strumenti sono nella riga scorrevole', (await page.locator('.colture-strumenti .tessera-azione').count()) === 9);

// La testata mantiene solo titolo, ricerca e impostazioni anche nelle sottoschermate.
check('testata essenziale: titolo, ricerca e impostazioni', await page.locator('.testata h1').count() === 1 && await page.locator('.testata .ricerca-apri').count() === 1 && await page.locator('.testata .ingranaggio').count() === 1 && await page.locator('.testata a, .testata button').count() === 2);
await page.click('a.tessera-azione[href="#/semi"]');
await page.waitForSelector('#semi-nuova');
check('la testata essenziale resta senza tasto indietro nelle pagine secondarie', await page.locator('.testata .indietro').count() === 0);
await page.locator('#barra a[data-rotta="colture"]').click();
await page.waitForSelector('main > h2.titolo-schermata');
check('la barra principale torna al mio orto', /#\/colture/.test(page.url()));
await vai(page, 'coltura', '?id=pomodori');
await page.waitForTimeout(500);
check('la pagina coltura mantiene testata essenziale', await page.locator('.testata .ingranaggio').count() === 1 && await page.locator('.testata .indietro').count() === 0);

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
