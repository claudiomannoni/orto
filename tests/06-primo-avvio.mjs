// Primo avvio guidato. Uso: node tests/06-primo-avvio.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, leggiDb, scroll, bersagli, BASE } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];

async function nuovaPagina() {
  const ctx = await nuovoContesto(browser);
  const page = await ctx.newPage();
  osserva(page, problemi);
  return { ctx, page };
}
const impostazioni = async (page) => Object.fromEntries((await leggiDb(page, 'impostazioni')).map((r) => [r.chiave, r.valore]));
const titolo = (page) => page.locator('#schermata h2.titolo-schermata').innerText();

// 1. Profilo vuoto: si apre il primo avvio, senza barra in basso.
let { ctx, page } = await nuovaPagina();
await page.goto(`${BASE}/#/colture`);
await page.waitForSelector('#schermata h2.titolo-schermata');
check('profilo vuoto -> primo avvio', page.url().endsWith('#/benvenuto'), page.url());
check('barra in basso nascosta', await page.locator('#barra').isHidden());
check('intro: titolo', (await titolo(page)).includes('Benvenuto'), await titolo(page));

// 2. Il nome dell'orto, poi le sette domande a tocco.
await page.getByRole('button', { name: 'Cominciamo' }).click();
await page.waitForSelector('h2.titolo-schermata:has-text("Come si chiama il tuo orto?")');
check('domanda 1 di 8: il nome dell\'orto', (await page.locator('.passo').innerText()) === 'Domanda 1 di 8');
check('il nome è facoltativo: ci sono «Salta» e «Avanti»', await page.getByRole('button', { name: 'Salta', exact: true }).count() === 1 && await page.getByRole('button', { name: 'Avanti' }).count() === 1);
await page.fill('input[name=nome_orto]', "  L'orto    del\tpozzo  ");
await page.fill('input[name=nome_coltivatore]', 'Claudio');
await page.getByRole('button', { name: 'Avanti' }).click();
const attese = ['Dove stai?', 'Quanto spazio hai?', 'Che acqua hai?', 'Quanto tempo hai?', 'Come ti piace lavorare?', 'Quanta esperienza hai?', 'Cosa vuoi coltivare?'];
const risposte = ['Castelli Romani', 'Da 10 a 50 m²', 'Quanto basta', 'Abbastanza', 'Biologico', 'Principiante', null];
for (let i = 0; i < attese.length; i++) {
  await page.waitForSelector(`h2.titolo-schermata:has-text("${attese[i]}")`);
  check(`domanda ${i + 1}: ${attese[i]}`, true);
  if (i === 0) {
    const s = await scroll(page);
    check('nessuno scroll orizzontale', s.sw <= s.iw && s.bw <= s.iw, JSON.stringify(s));
    const piccoli = (await bersagli(page)).filter((b) => b.h < 56 && /opzione/.test(b.cls));
    check('opzioni alte almeno 56 px', piccoli.length === 0, JSON.stringify(piccoli));
  }
  if (risposte[i] === null) {
    check('colture: nessuna scelta = tutte', (await page.locator('.griglia-colture [aria-pressed=true]').count()) === 0);
    await page.locator('.griglia-colture .scegli-voce').nth(0).click();
    await page.locator('.griglia-colture .scegli-voce').nth(1).click();
    check('colture: il riepilogo conta le scelte', (await page.locator('.form p[role=status]').innerText()).includes('2 colture'));
    await page.getByRole('button', { name: 'Avanti' }).click();
  } else await page.locator('.opzioni .btn', { hasText: risposte[i] }).first().click();
}
await page.waitForSelector('h2.titolo-schermata:has-text("Tutto pronto")');
check('schermata finale', true);
let s = await impostazioni(page);
check('risposte salvate', s.zona === 'castelli-romani' && s.superficie_mq === 30 && s.acqua === 'media' && s.tempo === 'medio' && s.metodo === 'biologico' && s.esperienza === 'principiante', JSON.stringify(s));
check('colture scelte salvate (2)', Array.isArray(s.colture_scelte) && s.colture_scelte.length === 2, JSON.stringify(s.colture_scelte));
check('primo avvio non ancora segnato come fatto', s.primo_avvio_fatto !== true);
check('nome dell\'orto ripulito (spazi) e nome del coltivatore salvati', s.nome_orto === "L'orto del pozzo" && s.nome_coltivatore === 'Claudio', JSON.stringify([s.nome_orto, s.nome_coltivatore]));
check('identificativo anonimo creato', typeof s.coltivatore_id === 'string' && s.coltivatore_id.length >= 16);
const idIniziale = s.coltivatore_id;

// 3. Fine: si va a Oggi, la barra torna, e non si rivede il primo avvio.
await page.getByRole('button', { name: 'Vai a Oggi in campagna' }).click();
await page.waitForSelector('#schermata h2.titolo-schermata:has-text("Oggi in campagna")');
check('dopo la fine: Oggi', page.url().endsWith('#/oggi'), page.url());
check('barra visibile', await page.locator('#barra').isVisible());
check('Oggi mostra il nome dell\'orto e di chi lo coltiva', (await page.locator('.nome-orto').innerText()) === "L'orto del pozzo, di Claudio", await page.locator('.nome-orto').innerText().catch(() => 'assente'));
s = await impostazioni(page);
check('primo_avvio_fatto = true', s.primo_avvio_fatto === true);
await page.reload();
await page.waitForSelector('#schermata h2.titolo-schermata');
check('ricaricando resta su Oggi', page.url().endsWith('#/oggi'), page.url());

// 4. Impostazioni: i nuovi campi e il link per rifare.
await page.goto(`${BASE}/#/impostazioni`);
await page.waitForSelector('select[name=superficie_mq]');
check('impostazioni: superficie mostra la scelta', (await page.locator('select[name=superficie_mq]').inputValue()) === '30');
check('impostazioni: nomi mostrati', (await page.inputValue('input[name=nome_orto]')) === "L'orto del pozzo" && (await page.inputValue('input[name=nome_coltivatore]')) === 'Claudio');
await page.fill('input[name=nome_orto]', '   Orto <b>nuovo</b>   ');
await page.press('input[name=nome_orto]', 'Tab');
await page.waitForTimeout(250);
s = await impostazioni(page);
check('impostazioni: il nome si cambia e resta testo (nessun HTML interpretato)', s.nome_orto === 'Orto <b>nuovo</b>', JSON.stringify(s.nome_orto));
await page.goto(`${BASE}/#/oggi`);
await page.waitForSelector('.nome-orto');
check('Oggi mostra il testo del nome senza interpretarlo come HTML', (await page.locator('.nome-orto').innerText()).startsWith('Orto <b>nuovo</b>') && (await page.locator('.nome-orto b').count()) === 0);
await page.goto(`${BASE}/#/impostazioni`);
await page.waitForSelector('select[name=superficie_mq]');
await page.fill('input[name=nome_orto]', '');
await page.press('input[name=nome_orto]', 'Tab');
await page.waitForTimeout(250);
await page.fill('input[name=nome_coltivatore]', '');
await page.press('input[name=nome_coltivatore]', 'Tab');
await page.waitForTimeout(250);
await page.goto(`${BASE}/#/oggi`);
await page.waitForSelector('h2.titolo-schermata:has-text("Oggi in campagna")');
check('senza nomi: Oggi non mostra la riga', (await page.locator('.nome-orto').count()) === 0);
await page.goto(`${BASE}/#/impostazioni`);
await page.waitForSelector('select[name=superficie_mq]');
await page.fill('input[name=nome_orto]', "L'orto del pozzo");
await page.press('input[name=nome_orto]', 'Tab');
await page.waitForTimeout(250);
await page.selectOption('select[name=acqua]', 'molta');
await page.selectOption('select[name=tempo]', '');
await page.waitForTimeout(200);
s = await impostazioni(page);
check('impostazioni: acqua cambiata e tempo svuotato', s.acqua === 'molta' && s.tempo === null, JSON.stringify(s));
await page.getByRole('link', { name: 'Rifai il primo avvio' }).click();
await page.waitForSelector('h2.titolo-schermata:has-text("Benvenuto")');
await page.getByRole('button', { name: 'Cominciamo' }).click();
await page.waitForSelector('h2.titolo-schermata:has-text("Come si chiama il tuo orto?")');
check('rifacendo: il nome dell\'orto è già scritto', (await page.inputValue('input[name=nome_orto]')) === "L'orto del pozzo");
await page.getByRole('button', { name: 'Avanti' }).click();
await page.waitForSelector('h2.titolo-schermata:has-text("Dove stai?")');
check('rifacendo: la risposta data è già evidenziata', (await page.locator('.opzioni .btn[aria-pressed=true]').count()) === 1);
await page.getByRole('button', { name: 'Indietro' }).click();
await page.getByRole('button', { name: 'Indietro' }).click();
check('indietro: torna all\'intro', (await titolo(page)).includes('Benvenuto'));
s = await impostazioni(page);
check('l\'identificativo anonimo non cambia rifacendo il primo avvio', s.coltivatore_id === idIniziale);
await ctx.close();

// 5. «Salta per ora» e tornare all'app dopo un po' non azzera le domande.
({ ctx, page } = await nuovaPagina());
await page.goto(`${BASE}/`);
await page.waitForSelector('h2.titolo-schermata:has-text("Benvenuto")');
await page.getByRole('button', { name: 'Cominciamo' }).click();
await page.waitForSelector('h2.titolo-schermata:has-text("Come si chiama il tuo orto?")');
await page.getByRole('button', { name: 'Salta', exact: true }).click();
await page.waitForSelector('h2.titolo-schermata:has-text("Dove stai?")');
s = await impostazioni(page);
check('«Salta» sul nome: nessun nome salvato', !s.nome_orto && !s.nome_coltivatore, JSON.stringify([s.nome_orto, s.nome_coltivatore]));
await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await page.waitForTimeout(300);
check('visibilitychange non riparte dall\'intro', (await titolo(page)).includes('Dove stai?'), await titolo(page));
await page.getByRole('button', { name: 'Salta', exact: true }).click();
await page.waitForSelector('h2.titolo-schermata:has-text("Quanto spazio hai?")');
check('«Salta» passa alla domanda dopo', true);
s = await impostazioni(page);
check('«Salta» non salva niente', !('superficie_mq' in s) && s.primo_avvio_fatto !== true, JSON.stringify(s));
await ctx.close();

({ ctx, page } = await nuovaPagina());
await page.goto(`${BASE}/`);
await page.waitForSelector('h2.titolo-schermata:has-text("Benvenuto")');
await page.getByRole('button', { name: 'Salta per ora' }).click();
await page.waitForSelector('h2.titolo-schermata:has-text("Oggi in campagna")');
s = await impostazioni(page);
check('«Salta per ora»: va a Oggi e non richiede più il primo avvio', s.primo_avvio_fatto === true && page.url().endsWith('#/oggi'));
await ctx.close();

check('nessun errore in console / rete', problemi.length === 0, problemi.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
