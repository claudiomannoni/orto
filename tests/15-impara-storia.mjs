// Impara, scheda coltura, seguire le colture, accessibilità, La mia storia, «L'ho fatto un altro giorno», barra e ingranaggio.
// Uso: node tests/15-impara-storia.mjs http://localhost:8101
import fs from 'node:fs';
import { chromium, nuovoContesto, check, osserva, finale, vai, leggiDb, BASE } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block', acceptDownloads: true });
const page = await ctx.newPage();
osserva(page, problemi);
page.on('dialog', (d) => d.accept());
const imp = async () => Object.fromEntries((await leggiDb(page, 'impostazioni')).map((r) => [r.chiave, r.valore]));

// ---------- Barra e ingranaggio ----------
await vai(page, 'oggi', '?oggi=2026-11-10');
const voci = await page.locator('#barra a').allInnerTexts();
check('barra: cinque voci (Oggi, Il mio orto, Fotografa, Calendario, Impara)', voci.length === 5 && /Fotografa/.test(voci.join('|')) && /Impara/.test(voci.join('|')) && !/Impostazioni/.test(voci.join('|')), JSON.stringify(voci));
check('ingranaggio nella testata con nome accessibile', (await page.locator('a.ingranaggio[aria-label]').count()) === 1);
await page.locator('a.ingranaggio').click();
await page.waitForSelector('h2.titolo-schermata:has-text("Impostazioni")');
check('ingranaggio apre le impostazioni', page.url().endsWith('#/impostazioni'));

// ---------- Accessibilità ----------
await page.getByRole('button', { name: 'Grande', exact: true }).click();
await page.waitForTimeout(200);
check('testo grande: attributo su html e salvato', (await page.evaluate(() => document.documentElement.dataset.testo)) === 'grande' && (await imp()).testo === 'grande');
const px = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
check('testo grande: corpo più grande di 16 px', px > 18, String(px));
await page.getByRole('button', { name: 'Normale', exact: true }).click();
await page.getByLabel('Contrasto alto', { exact: false }).check();
await page.getByLabel('Meno movimento', { exact: false }).check();
await page.waitForTimeout(200);
check('contrasto alto e movimento ridotto applicati', await page.evaluate(() => document.documentElement.dataset.contrasto === 'alto' && document.documentElement.dataset.movimento === 'ridotto'));
await page.reload();
await page.waitForSelector('h2.titolo-schermata');
check('dopo il ricaricamento restano', await page.evaluate(() => document.documentElement.dataset.contrasto === 'alto'));
await page.getByLabel('Contrasto alto', { exact: false }).uncheck();
await page.getByLabel('Meno movimento', { exact: false }).uncheck();

// ---------- Impara ----------
await vai(page, 'impara');
const tutte = await page.locator('.griglia-colture a.scheda-voce').count();
check('Impara: elenco delle colture', tutte >= 20, String(tutte));
await page.fill('input[name=cerca]', 'pomod');
await page.waitForTimeout(200);
const trovate = await page.locator('.griglia-colture a.scheda-voce').allInnerTexts();
check('Impara: la ricerca filtra', trovate.length >= 1 && trovate.length < tutte && /omodor/i.test(trovate.join(' ')), JSON.stringify(trovate));
await page.fill('input[name=cerca]', 'xyzxyz');
await page.waitForTimeout(200);
check('Impara: nessun risultato, messaggio chiaro', (await page.locator('.vuoto-testo:visible').count()) >= 1 && (await page.locator('.griglia-colture a.scheda-voce').count()) === 0);
await page.fill('input[name=cerca]', '');
check('Impara: glossario presente', (await page.locator('details.termine').count()) >= 5);

// ---------- Scheda coltura ----------
await vai(page, 'coltura?id=fave');
await page.waitForSelector('.scheda-testa');
const testo = await page.locator('#schermata').innerText();
check('scheda: nome, mesi, fonti', /Fave/i.test(testo) && (await page.locator('.striscia-riga').count()) >= 2 && /Fonti/i.test(testo));
check('scheda: striscia mesi con testo per chi non vede i colori', /:.*(ottobre|novembre)/i.test(await page.locator('.striscia-mesi[role=img]').first().getAttribute('aria-label')));
await vai(page, 'coltura?id=pomodori');
await page.waitForSelector('.scheda-testa');
check('scheda: consociazioni mostrate (pomodori)', /Amiche e nemiche/.test(await page.locator('#schermata').innerText()));
await vai(page, 'coltura?id=fave');
await page.waitForSelector('.scheda-testa');
check('scheda: niente «null» o «undefined»', !/\bnull\b|undefined/.test(testo));
await page.locator('.voce').first().click();
await page.waitForSelector('dialog[open] .btn.primario');
check('scheda: toccando un lavoro si apre il dettaglio', true);
await page.locator('dialog[open] .btn.primario').click();

// seguire
await page.locator('#segui').click();
await page.waitForTimeout(300);
check('segui: pulsante premuto e salvato', (await page.locator('#segui').getAttribute('aria-pressed')) === 'true' && JSON.stringify((await imp()).colture_scelte) === '["fave"]');
await vai(page, 'calendario', '?oggi=2026-11-10');
check('calendario: interruttore «solo le colture che segui»', (await page.locator('#solo-mie').count()) === 1);
const soloMie = await page.locator('.lista .voce').count();
await page.locator('#solo-mie').click();
const tuttiLavori = await page.locator('.lista .voce').count();
check('calendario: filtro riduce l\'elenco', soloMie < tuttiLavori, `${soloMie} < ${tuttiLavori}`);
await vai(page, 'oggi', '?oggi=2026-11-10');
const titoliOggi = await page.locator('.lavori').innerText();
check('Oggi: con una coltura seguita non compaiono lavori di altre (es. pomodoro)', !/pomodor/i.test(titoliOggi));
await vai(page, 'coltura?id=fave');
await page.locator('#segui').click();
await page.waitForTimeout(300);
check('segui: si toglie', JSON.stringify((await imp()).colture_scelte) === '[]');

// aggiungi al mio orto
await page.getByRole('link', { name: 'Aggiungi al mio orto' }).click();
await page.waitForSelector('dialog[open] input[name=nome]');
const nomeScritto = await page.inputValue('dialog[open] input[name=nome]');
check('aggiungi: il modulo si apre con il nome già scritto', /fav/i.test(nomeScritto), nomeScritto);
await page.keyboard.press('Escape');

// ---------- Storia ----------
await vai(page, 'storia', '?oggi=2026-11-10');
check('storia: vuota all\'inizio, con spiegazione', (await page.locator('#storia-vuoto').count()) === 1);
await page.getByRole('button', { name: /Aggiungi una nota/ }).click();
await page.waitForSelector('dialog[open] textarea');
await page.fill('dialog[open] textarea[name=testo]', 'Prima gelata, ho coperto le fave <b>col tessuto</b>');
await page.locator('dialog[open] button[type=submit]').click();
await page.waitForSelector('.voce-storia');
const ev = await leggiDb(page, 'eventi');
check('storia: nota salvata come evento «nota»', ev.length === 1 && ev[0].tipo === 'nota' && ev[0].data === '2026-11-10', JSON.stringify(ev));
check('storia: il testo resta testo (niente HTML)', (await page.locator('.voce-storia b').count()) === 0 && /<b>col tessuto<\/b>/.test(await page.locator('.voce-storia').innerText()));
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Esporta la storia/ }).click()]);
const csv = fs.readFileSync(await download.path(), 'utf8');
check('esporta: file CSV con intestazione e la nota', /data/i.test(csv.split('\n')[0]) && csv.includes('Prima gelata'), csv.slice(0, 160));
check('esporta: nome file orto-storia-AAAA-MM-GG.csv', /^orto-storia-\d{4}-\d{2}-\d{2}\.csv$/.test(download.suggestedFilename()), download.suggestedFilename());
await page.locator('.voce-storia button.pericolo').click();
await page.waitForTimeout(300);
check('storia: si toglie una voce', (await leggiDb(page, 'eventi')).length === 0);

// ---------- «L'ho fatto un altro giorno» ----------
await vai(page, 'oggi', '?oggi=2026-11-10');
await page.locator('details.lavoro summary, details summary').first().click();
const altro = page.getByRole('button', { name: "L'ho fatto un altro giorno" }).first();
check('Oggi: i lavori hanno «L\'ho fatto un altro giorno»', (await altro.count()) === 1);
await altro.click();
await page.waitForSelector('dialog[open] input[name=data]');
check('altro giorno: data predefinita ieri e massimo oggi', (await page.inputValue('dialog[open] input[name=data]')) === '2026-11-09' && (await page.getAttribute('dialog[open] input[name=data]', 'max')) === '2026-11-10');
await page.fill('dialog[open] input[name=data]', '2026-11-07');
await page.locator('dialog[open] button[type=submit]').click();
await page.waitForTimeout(500);
const fatti = (await leggiDb(page, 'eventi')).filter((e) => e.tipo === 'lavoro_fatto');
check('altro giorno: l\'evento ha la data scelta', fatti.length === 1 && fatti[0].data === '2026-11-07', JSON.stringify(fatti.map((e) => e.data)));

const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console / rete', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
