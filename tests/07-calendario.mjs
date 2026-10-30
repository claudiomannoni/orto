// Schermata Calendario. Uso: node tests/07-calendario.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, scroll, bersagli } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser);
const page = await ctx.newPage();
osserva(page, problemi);

await vai(page, 'calendario', '?oggi=2026-11-10');
await page.waitForSelector('h2.titolo-mese');

// Quanti lavori ci sono davvero nei dati per un mese? (il conteggio segue le schede, non un numero fisso)
const attesi = (mese) => page.evaluate(async (m) => {
  const indice = await (await fetch('data/it/colture/indice.json')).json();
  let n = 0;
  for (const id of indice.colture) {
    const scheda = await (await fetch(`data/it/colture/${id}.json`)).json();
    n += (scheda.calendario?.['castelli-romani'] ?? []).filter((l) => l.mesi?.includes(m)).length;
  }
  return n;
}, mese);

check('apre sul mese di oggi (novembre)', (await page.locator('h2.titolo-mese').innerText()) === 'Novembre', await page.locator('h2.titolo-mese').innerText());
check('12 pulsanti dei mesi', (await page.locator('.mesi .btn').count()) === 12);
check('novembre selezionato', (await page.locator('.mesi .btn[aria-pressed=true]').innerText()).toLowerCase() === 'nov');
const nov = await page.locator('.voce').count();
check('novembre: tanti lavori quanti ne dicono i dati', nov > 0 && nov === await attesi(11), `${nov} vs ${await attesi(11)}`);
check('barra in basso: Calendario evidenziato', (await page.locator('#barra a[aria-current=page]').getAttribute('data-rotta')) === 'calendario');

// Misure Pixel 9
const s = await scroll(page);
check('nessuno scroll orizzontale', s.sw <= s.iw && s.bw <= s.iw, JSON.stringify(s));
const bassi = (await bersagli(page)).filter((b) => b.h < 56 && /(^| )(btn|voce)( |$)/.test(b.cls));
check('pulsanti e voci alti almeno 56 px', bassi.length === 0, JSON.stringify(bassi));

// Un lavoro si apre in un foglio, con il perché e le due mascotte
await page.locator('.voce').first().click();
await page.waitForSelector('dialog[open]');
const foglio = await page.locator('dialog[open]').innerText();
check('foglio: il perché', foglio.includes('Perché si fa così'), foglio.slice(0, 80));
check('foglio: Rosso e Rossella', foglio.includes('ROSSO') && foglio.includes('ROSSELLA'));
await page.getByRole('button', { name: 'Ho capito' }).click();
await page.waitForSelector('dialog', { state: 'detached' });

// Cambio mese
await page.locator('.mesi .btn', { hasText: 'dic' }).click();
check('dicembre: titolo', (await page.locator('h2.titolo-mese').innerText()) === 'Dicembre');
check('dicembre: lavori come nei dati', (await page.locator('.voce').count()) === (await attesi(12)), `${await page.locator('.voce').count()} vs ${await attesi(12)}`);
await page.locator('.mesi .btn', { hasText: 'lug' }).click();
const luglio = await attesi(7);
check('luglio: ' + (luglio ? 'lavori presenti' : 'messaggio "nessun lavoro"'), luglio ? (await page.locator('.voce').count()) === luglio : (await page.locator('.vuoto-testo').count()) === 1);

// Un mese diverso da quello di oggi dice che non è questo mese
await page.locator('.mesi .btn', { hasText: 'nov' }).click();
check('questo mese: spiegazione dedicata', (await page.locator('.data-lunga').innerText()).startsWith('Questo mese'));
await page.locator('.mesi .btn', { hasText: 'dic' }).click();
check('altro mese: spiegazione dedicata', !(await page.locator('.data-lunga').innerText()).startsWith('Questo mese'));

// Navigando via barra
await page.locator('#barra a[data-rotta=colture]').click();
await page.waitForSelector('h2.titolo-schermata:has-text("Le mie colture")');
await page.locator('#barra a[data-rotta=calendario]').click();
await page.waitForSelector('h2.titolo-mese');
check('dalla barra: torna al mese corrente', (await page.locator('h2.titolo-mese').innerText()) === 'Novembre');

check('nessun errore in console / rete', problemi.length === 0, problemi.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
