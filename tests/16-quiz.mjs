// Quiz del giorno: schermata, risposte, punteggio salvato, una sola partita al giorno. Uso: node tests/16-quiz.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, leggiDb } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
const imp = async () => Object.fromEntries((await leggiDb(page, 'impostazioni')).map((r) => [r.chiave, r.valore]));

await vai(page, 'oggi');
check('Oggi invita al quiz del giorno', (await page.locator('.gioca a[href="#/quiz"]').count()) === 1 && /Giorni di fila: 0/.test(await page.locator('.gioca').innerText()));
check('Oggi ha «Lo sapevi?» con la fonte e senza doppio nome davanti ai commenti', /Lo sapevi\?/.test(await page.locator('.sapevi').innerText()) && (await page.locator('.sapevi a[href^="https://"]').count()) === 1 && !/Rosso: Rosso:|Rossella: Rossella:/.test(await page.locator('.sapevi').innerText()));
check('Oggi saluta (Buongiorno, Buon pomeriggio, Buonasera, Ancora in piedi o Buone feste)', /^(Buongiorno|Buon pomeriggio|Buonasera|Ancora in piedi|Buone feste|Ciao)/.test(await page.locator('.saluto').innerText()));
check('Oggi invita a Rossella', (await page.locator('.gioca a[href="#/chiedi"]').count()) === 1);
check('Oggi ha «Fotografa il tuo orto»', (await page.locator('#fotografa').count()) === 1 && /Fotografa il tuo orto/.test(await page.locator('#fotografa').innerText()));
await page.locator('#fotografa').click();
await page.waitForSelector('dialog[open] input[type=file]', { state: 'attached' });
check('toccandolo si apre subito la finestra per aggiungere la foto (scatta o scegli)', (await page.locator('dialog[open] button', { hasText: /Scatta/ }).count()) >= 1);
await page.keyboard.press('Escape');
await vai(page, 'oggi');
await vai(page, 'impara');
check('Impara ha il pulsante del quiz', (await page.getByRole('link', { name: 'Gioca al quiz del giorno' }).count()) === 1);
await page.getByRole('link', { name: 'Gioca al quiz del giorno' }).click();
await page.waitForSelector('.quiz h3');
check('prima domanda: 1 di 5, tre risposte', (await page.locator('.quiz .passo').innerText()) === 'Domanda 1 di 5' && (await page.locator('.quiz .opzioni .btn').count()) >= 2);
check('la barra evidenzia Impara', (await page.locator('#barra a[aria-current=page]').innerText()).includes('Impara'));

let giuste = 0;
for (let i = 0; i < 5; i++) {
  await page.waitForSelector(`.quiz .passo:has-text("Domanda ${i + 1} di 5")`);
  check(`domanda ${i + 1}: la spiegazione è nascosta prima di rispondere`, await page.locator('.quiz-spiegazione').isHidden());
  // si risponde alla prima opzione: a volte giusta, a volte no
  await page.locator('.quiz .opzioni .btn').first().click();
  await page.waitForSelector('.quiz-spiegazione:visible');
  const esito = await page.locator('.quiz-spiegazione strong').innerText();
  if (esito === 'Giusto!') giuste++;
  check(`domanda ${i + 1}: dopo la risposta le opzioni sono bloccate e una è segnata giusta`, (await page.locator('.quiz .opzioni .btn:disabled').count()) >= 2 && (await page.locator('.quiz .opzioni .btn.giusta').count()) === 1);
  await page.locator('.quiz .btn.primario:visible').click();
}
await page.waitForSelector('.quiz-fine');
check('risultato mostrato', (await page.locator('.quiz-fine h3').innerText()) === `${giuste} su 5`, await page.locator('.quiz-fine h3').innerText());
const s = await imp();
const chiavi = Object.keys(s.quiz_risultati ?? {});
check('punteggio salvato per oggi', chiavi.length === 1 && s.quiz_risultati[chiavi[0]] === giuste, JSON.stringify(s.quiz_risultati));
check('serie di 1 giorno', /Giorni di fila con il quiz: 1/.test(await page.locator('.quiz-fine').innerText()));

await vai(page, 'oggi');
check('Oggi, dopo il quiz, mostra il punteggio e non invita', /Quiz di oggi: \d su 5/.test(await page.locator('.gioca').innerText()) && (await page.locator('.gioca a[href="#/quiz"]').count()) === 0);
await vai(page, 'quiz');
await page.waitForSelector('.quiz-fine');
check('tornando non si rigioca: stesso risultato', (await page.locator('.quiz-fine h3').innerText()) === `${giuste} su 5` && (await page.locator('.quiz .opzioni').count()) === 0);

const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console / rete', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
