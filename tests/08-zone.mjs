// Zone, bussola e profilo del terreno. Uso: node tests/08-zone.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, scroll, bersagli, leggiDb, BASE } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
// Service worker bloccato: altrimenti le richieste dei contenuti finti passano da lui e page.route non le vede.
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
page.on('dialog', (d) => d.accept());

// Contenuti del terreno finti (la prova non dipende dal testo vero): sabbioso/lento ecc.
const terrenoFinto = {
  versione: 1,
  questionario: [
    { id: 'mano', testo: 'Stringi il terreno in mano: cosa succede?', perche: 'Dice quanta argilla c\'è.', certezza: 'media', fonti: [], opzioni: [
      { id: 'si-modella', testo: 'Si modella come plastilina', valori: { tessitura: 'argilloso', drenaggio: 'lento' } },
      { id: 'sgretola', testo: 'Si sgretola', valori: { tessitura: 'sabbioso', drenaggio: 'rapido' } },
    ] },
    { id: 'scuro', testo: 'È scuro e profuma di bosco?', perche: 'Humus.', certezza: 'media', fonti: [], opzioni: [
      { id: 'si', testo: 'Sì', valori: { humus: 'ricco' } }, { id: 'no', testo: 'No', valori: { humus: 'povero' } },
    ] },
  ],
  piante_indicatrici: [{ id: 'romice', nome: 'Romice', nome_scientifico: 'Rumex', indica: [{ asse: 'drenaggio', valore: 'lento' }], come_riconoscerla: 'Foglie larghe', note: 'Indizio debole', certezza: 'bassa', fonti: [] }],
  test_barattolo: { titolo: 'Test del barattolo', materiali: ['un barattolo'], passi: [{ testo: 'Riempi a metà con terra' }], lettura: 'Aspetta 24 ore.', certezza: 'media', fonti: [], tipi: [] },
  consigli: [
    { asse: 'tessitura', valore: 'argilloso', testo: 'Non lavorare il terreno quando è bagnato.', certezza: 'media', fonti: [] },
    { asse: 'tessitura', valore: 'sabbioso', testo: 'Aggiungi sostanza organica.', certezza: 'media', fonti: [] },
  ],
  da_verificare: [], fonti: {},
};
await page.route('**/data/it/terreno.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(terrenoFinto) }));

await vai(page, 'zone');
check('zone: titolo e stato vuoto', (await page.locator('h2.titolo-schermata').innerText()).startsWith('Le mie zone') && await page.isVisible('#zone-vuoto'));
check('barra: resta evidenziata «Colture»', (await page.locator('#barra a[aria-current=page]').getAttribute('data-rotta')) === 'colture');
check('colture: c\'è il link «Le mie zone»', (await vai(page, 'colture'), await page.getByRole('link', { name: 'Le mie zone' }).count()) === 1);
await page.getByRole('link', { name: 'Le mie zone' }).click();
await page.waitForSelector('#zone-vuoto');

// Nuova zona
await page.getByRole('button', { name: '+ Nuova zona' }).click();
await page.waitForSelector('dialog[open] form');
await page.fill('dialog input[name=nome]', 'Aiuola del pozzo');
await page.check('dialog input[name=stato][value=da_preparare]');
await page.fill('dialog input[name=lunghezza]', '4');
await page.fill('dialog input[name=larghezza]', '1.5');
await page.fill('dialog textarea[name=note]', 'Vicino al pozzo');
await page.getByRole('button', { name: 'Aggiungi zona' }).click();
await page.waitForSelector('li.zona');
const carta = await page.locator('li.zona').innerText();
check('zona creata: nome, da preparare, misure e superficie', carta.includes('Aiuola del pozzo') && carta.includes('Da preparare') && carta.includes('4 × 1,5 m') && carta.includes('6 m²'), carta.replace(/\n+/g, ' | '));
check('zona: esposizione e terreno ancora da indicare', carta.includes('Non indicata') && carta.includes('Da capire'));
let db = await leggiDb(page, 'zone');
check('db: zona con schemaVersion 3, superficie 6, gradi null', db.length === 1 && db[0].schemaVersion === 3 && db[0].superficie_mq === 6 && db[0].esposizione.gradi === null, JSON.stringify(db[0]));
check('nessuno scroll orizzontale', (({ sw, bw, iw }) => sw <= iw && bw <= iw)(await scroll(page)));
check('pulsanti alti almeno 56 px', (await bersagli(page)).filter((b) => b.h < 56 && /(^| )btn( |$)/.test(b.cls)).length === 0);

// Nome vuoto: non salva
await page.getByRole('button', { name: '+ Nuova zona' }).click();
await page.waitForSelector('dialog[open] form');
await page.getByRole('button', { name: 'Aggiungi zona' }).click();
check('nome vuoto: il modulo non parte', (await page.locator('dialog[open]').count()) === 1 && (await page.locator('li.zona').count()) === 1);
await page.getByRole('button', { name: 'Annulla' }).click();
await page.waitForSelector('dialog', { state: 'detached' });

// Bussola: a mano
await page.getByRole('button', { name: 'Bussola' }).click();
await page.waitForSelector('dialog[open] .bussola');
await page.locator('.direzioni .btn', { hasText: 'Sud-est' }).click();
await page.waitForSelector('dialog', { state: 'detached' });
await page.waitForFunction(() => document.querySelector('li.zona')?.innerText.includes('Sud-est (135°)'));
check('bussola a mano: sud-est 135° con la nota di Rossella', (await page.locator('li.zona').innerText()).includes('buona luce tutto il giorno'));
db = await leggiDb(page, 'zone');
check('db: gradi 135', db[0].esposizione.gradi === 135);

// Bussola: sensore finto. Telefono in piedi (beta 90), alpha 90 = punta a ovest.
await page.getByRole('button', { name: 'Bussola' }).click();
await page.waitForSelector('dialog[open] .bussola');
check('bussola: il «sud-est» attuale è già evidenziato', (await page.locator('.direzioni .btn[aria-pressed=true]').innerText()) === 'Sud-est');
check('bussola: senza lettura il pulsante «Usa» è spento', await page.getByRole('button', { name: 'Usa questa direzione' }).isDisabled());
await page.evaluate(() => window.dispatchEvent(Object.assign(new Event('deviceorientationabsolute'), { alpha: 90, beta: 90, gamma: 0 })));
await page.waitForFunction(() => document.querySelector('.bussola-lettura')?.textContent.includes('Ovest'));
check('sensore: alpha 90 con telefono in piedi = ovest (270°)', (await page.locator('.bussola-lettura').innerText()).includes('270'), await page.locator('.bussola-lettura').innerText());
await page.evaluate(() => window.dispatchEvent(Object.assign(new Event('deviceorientation'), { webkitCompassHeading: 45 })));
await page.waitForFunction(() => document.querySelector('.bussola-lettura')?.textContent.includes('Nord-est'));
check('iOS: webkitCompassHeading 45 = nord-est', true);
await page.getByRole('button', { name: 'Usa questa direzione' }).click();
await page.waitForSelector('dialog', { state: 'detached' });
await page.waitForFunction(() => document.querySelector('li.zona')?.innerText.includes('Nord-est (45°)'));
check('«Usa questa direzione» salva la lettura', (await leggiDb(page, 'zone'))[0].esposizione.gradi === 45);

// Bussola su un computer: nessun sensore, messaggio e scelta a mano
await page.getByRole('button', { name: 'Bussola' }).click();
await page.waitForSelector('dialog[open] .bussola');
await page.waitForFunction(() => document.querySelector('.bussola-lettura')?.textContent.includes('non ha la bussola') || document.querySelector('.bussola-lettura')?.textContent.includes('Punti'), null, { timeout: 5000 }).catch(() => {});
await page.getByRole('button', { name: 'Annulla' }).click();
await page.waitForSelector('dialog', { state: 'detached' });

// Terreno
await page.getByRole('button', { name: 'Capisci il terreno' }).click();
await page.waitForSelector('dialog[open] .terreno-form');
check('terreno: le domande ci sono', (await page.locator('.domanda').count()) === 2);
check('terreno: nessun risultato prima di rispondere', (await page.locator('.risultato-terreno').innerText()).includes('Rispondi a qualche domanda'));
await page.locator('.domanda[data-id=mano] label', { hasText: 'plastilina' }).click();
await page.locator('.domanda[data-id=scuro] label', { hasText: 'Sì' }).click();
let ris = await page.locator('.risultato-terreno').innerText();
check('terreno: argilloso, drena piano, humus ricco, con il consiglio', ris.includes('Argilloso') && ris.includes('Drena piano') && ris.includes('Humus ricco') && ris.includes('Non lavorare il terreno quando è bagnato'), ris.replace(/\n+/g, ' | '));
await page.locator('summary', { hasText: 'Test del barattolo' }).click();
await page.fill('dialog input[name=sabbia]', '80');
await page.fill('dialog input[name=limo]', '12');
await page.fill('dialog input[name=argilla]', '8');
ris = await page.locator('.risultato-terreno').innerText();
check('terreno: il barattolo (80/12/8) cambia la tessitura in sabbioso', ris.includes('Sabbioso') && ris.includes('Aggiungi sostanza organica'), ris.replace(/\n+/g, ' | '));
await page.fill('dialog input[name=argilla]', '60');
check('terreno: percentuali che non fanno 100 = avviso e tessitura dalle risposte', (await page.locator('dialog').innerText()).includes('fare circa 100') && (await page.locator('.risultato-terreno').innerText()).includes('Argilloso'));
await page.fill('dialog input[name=argilla]', '8');
await page.getByRole('button', { name: 'Salva il profilo' }).click();
await page.waitForSelector('dialog', { state: 'detached' });
await page.waitForFunction(() => document.querySelector('li.zona')?.innerText.includes('Sabbioso'));
const t0 = (await leggiDb(page, 'zone'))[0].terreno;
check('db: terreno salvato con profilo, risposte e barattolo', t0.tessitura === 'sabbioso' && t0.drenaggio === 'lento' && t0.humus === 'ricco' && t0.risposte.mano === 'si-modella' && t0.barattolo.sabbia_pct === 80, JSON.stringify(t0));
check('scheda zona: riassunto del terreno', (await page.locator('li.zona').innerText()).includes('Sabbioso · Drena piano · Humus ricco'));

// Una coltura nella zona
await vai(page, 'colture');
await page.locator('button.colture-nuova-fissa').click();
await page.waitForSelector('dialog select[name=zonaId]');
await page.fill('dialog input[name=nome]', 'Fave');
await page.selectOption('dialog select[name=zonaId]', { label: 'Aiuola del pozzo' });
await page.click('dialog button[type=submit]');
await page.waitForSelector('dialog', { state: 'detached' });
// Aspetto nuovo: il nome della zona non sta più nella riga della coltura ma nella sezione «Il tuo orto dall'alto» in cima alla schermata.
check('coltura: mostra il nome della zona (nel orto dall\'alto)', (await page.locator('.aiuole').innerText()).includes('Aiuola del pozzo') && (await page.locator('li.coltura').count()) === 1);
await vai(page, 'zone');
check('zona: «1 coltura qui»', (await page.locator('li.zona').innerText()).includes('1 coltura qui'));

// Modifica
await page.getByRole('button', { name: 'Modifica' }).click();
await page.waitForSelector('dialog[open] form');
check('modifica: il modulo parte coi valori attuali', (await page.inputValue('dialog input[name=nome]')) === 'Aiuola del pozzo' && (await page.inputValue('dialog input[name=lunghezza]')) === '4');
await page.fill('dialog input[name=nome]', 'Aiuola grande');
await page.fill('dialog input[name=larghezza]', '2');
await page.getByRole('button', { name: 'Salva', exact: true }).click();
await page.waitForSelector('dialog', { state: 'detached' });
const c2 = await page.locator('li.zona').innerText();
check('modifica: nome e superficie aggiornati, terreno ed esposizione intatti', c2.includes('Aiuola grande') && c2.includes('8 m²') && c2.includes('Sabbioso') && c2.includes('Nord-est (45°)'), c2.replace(/\n+/g, ' | '));
check('modifica: ancora una sola zona', (await page.locator('li.zona').count()) === 1);

// Backup e ripristino
const backup = await page.evaluate(async () => {
  const { creaBackup } = await import('/js/store/backup.js');
  return creaBackup();
});
check('backup: contiene la zona con il terreno', backup.zone.length === 1 && backup.zone[0].terreno.tessitura === 'sabbioso');

// Elimina: la coltura resta, senza zona
await page.getByRole('button', { name: 'Elimina' }).click();
await page.waitForFunction(() => !document.querySelector('li.zona'));
check('elimina: la zona sparisce e torna lo stato vuoto', await page.isVisible('#zone-vuoto'));
await vai(page, 'colture');
check('elimina: la coltura resta, senza zona', (await page.locator('li.coltura').count()) === 1 && !(await page.locator('li.coltura').innerText()).includes('Aiuola'));
db = await leggiDb(page, 'colture');
check('db: coltura con zonaId vuoto', db[0].zonaId === null);

// Ripristino del backup
const ripristinato = await page.evaluate(async (b) => {
  const { applica } = await import('/js/store/backup.js');
  await applica({ colture: b.colture, zone: b.zone, eventi: b.eventi, impostazioni: {} });
  const { elencoZone } = await import('/js/store/zone.js');
  return (await elencoZone()).map((z) => ({ nome: z.nome, tess: z.terreno?.tessitura }));
}, backup);
check('ripristino del backup: la zona torna con il suo terreno', ripristinato.length === 1 && ripristinato[0].tess === 'sabbioso', JSON.stringify(ripristinato));

// Contenuti veri (data/it/terreno.json): il foglio si apre e ha tutto
await page.unroute('**/data/it/terreno.json');
await page.evaluate(async () => { const { impostaLingua } = await import('/js/contenuti.js'); impostaLingua('it'); });
await vai(page, 'zone');
await page.getByRole('button', { name: 'Capisci il terreno' }).click();
await page.waitForSelector('dialog[open] .terreno-form');
const veri = { domande: await page.locator('.domanda').count(), piante: await page.locator('.pianta').count(), barattolo: await page.locator('summary', { hasText: 'barattolo' }).count() };
check('contenuti veri: domande, piante e test del barattolo', veri.domande >= 6 && veri.piante >= 8 && veri.barattolo === 1, JSON.stringify(veri));
await page.locator('.domanda').first().locator('label').first().click();
await page.locator('summary', { hasText: 'Le erbe' }).click();
await page.locator('.pianta input').first().check();
check('contenuti veri: rispondendo compare il risultato senza errori', (await page.locator('.risultato-terreno').innerText()).includes('Cosa ne esce'));
check('contenuti veri: le erbe sono dichiarate indizio debole', (await page.locator('dialog').innerText()).includes('indizio debole'));
const sc2 = await scroll(page);
check('contenuti veri: nessuno scroll orizzontale', sc2.sw <= sc2.iw && sc2.bw <= sc2.iw, JSON.stringify(sc2));
await page.getByRole('button', { name: 'Annulla' }).click();
await page.waitForSelector('dialog', { state: 'detached' });

// Contenuti del terreno mancanti: messaggio, nessun crash
await page.route('**/data/it/terreno.json', (r) => r.fulfill({ status: 404, body: '' }));
await page.evaluate(async () => { const { impostaLingua } = await import('/js/contenuti.js'); impostaLingua('it'); });
await vai(page, 'zone');
await page.getByRole('button', { name: 'Capisci il terreno' }).click();
await page.waitForSelector('dialog[open]');
check('terreno senza contenuti: messaggio chiaro', (await page.locator('dialog[open]').innerText()).includes('non sono ancora disponibili'));

check('nessun errore in console / rete (esclusi i 404 simulati)', problemi.filter((p) => !/terreno\.json|404|Service Worker registration blocked|Failed to load resource/.test(p)).length === 0, problemi.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
