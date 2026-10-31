// I vermetti vivi: vestiti, tocco, battute, cambio d'abito, guardaroba. Uso: node tests/09-vermetti.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, scroll, BASE } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
async function nuovaPagina(extra = {}) {
  const ctx = await nuovoContesto(browser, extra);
  const page = await ctx.newPage();
  osserva(page, problemi);
  return { ctx, page };
}
const vestiti = (page) => page.$$eval('.avatar[data-chi]', (i) => i.map((x) => `${x.dataset.chi}-${x.dataset.vestito}.svg`));

let { ctx, page } = await nuovaPagina();

// 1. Il vestito segue il calendario (?oggi=)
const giorni = [['2026-10-31', 'halloween'], ['2026-12-25', 'natale'], ['2027-01-01', 'festa'], ['2026-07-15', 'estate'], ['2026-11-10', 'autunno'], ['2026-02-10', 'inverno'], ['2026-04-10', 'primavera'], ['2026-04-05', 'pasqua'], ['2026-02-12', 'carnevale']];
for (const [data, v] of giorni) {
  await vai(page, 'oggi', `?oggi=${data}`);
  await page.waitForSelector('.avatar canvas', { state: 'attached' });
  const src = await vestiti(page);
  check(`${data}: Rosso e Rossella in «${v}»`, src.length >= 2 && src.includes(`rosso-${v}.svg`) && src.includes(`rossella-${v}.svg`), src.join(','));
}

// 2. Tutti i disegni si caricano (nessun 404) e il vestito è sopra il corpo, stessa misura
await vai(page, 'oggi', '?oggi=2026-10-31');
await page.waitForSelector('.meteo .meteo-giorno'); // il meteo arriva e sposta la pagina: si aspetta prima di toccare
const misure = await page.$eval('.avatar.rosso:visible', (a) => {
  const r = a.getBoundingClientRect(); const [c, v] = [...a.querySelectorAll('img')].map((i) => i.getBoundingClientRect());
  return { a: [r.width, r.height], c: [c.width, c.height], v: [v.width, v.height], x: [c.x - v.x, c.y - v.y] };
});
check('corpo e vestito sono sovrapposti e hanno la stessa misura', misure.c[0] === misure.v[0] && misure.c[1] === misure.v[1] && misure.x[0] === 0 && misure.x[1] === 0, JSON.stringify(misure));
check('ogni vermetto è un pulsante accessibile con il nome', (await page.$eval('.avatar.rosso:visible', (a) => a.getAttribute('role') + '|' + a.getAttribute('aria-label') + '|' + a.tabIndex)) === 'button|Tocca Rosso|0');
const rotte = await page.$$eval('.avatar img', (i) => i.map((x) => x.complete && x.naturalWidth > 0));
check('tutte le immagini dei vermetti sono caricate', rotte.length >= 4 && rotte.every(Boolean), JSON.stringify(rotte));

// 3. Il tocco: salto e battuta, che poi sparisce
await page.dispatchEvent('.avatar.rosso:visible', 'click');
check('tocco: il vermetto salta', await page.$eval('.avatar.rosso:visible', (a) => a.classList.contains('salta')));
await page.waitForSelector('.avatar .sbuffo', { timeout: 4000 });
const testo = await page.$eval('.avatar .sbuffo', (s) => s.textContent);
check('tocco: compare una battuta (non vuota, entro 90 caratteri)', testo.length > 5 && testo.length <= 90, testo);
const dentro = await page.$$eval('.sbuffo', (b) => b.every((x) => { const r = x.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }));
check('la battuta sta dentro lo schermo', dentro);
await page.waitForSelector('.sbuffo', { state: 'detached', timeout: 12000 });
check('la battuta sparisce da sola', true);

// 4. Da tastiera
await page.focus('.avatar.rossella:visible');
await page.keyboard.press('Enter');
await page.waitForSelector('.avatar .sbuffo', { state: 'attached', timeout: 4000 }).catch(() => {});
check('da tastiera (Invio) il vermetto reagisce', await page.$eval('.avatar.rossella:visible', (a) => a.classList.contains('salta')) || (await page.locator('.sbuffo').count()) > 0);

// 5. Cambio d'abito: al sesto tocco
const prima = await vestiti(page);
for (let i = 0; i < 6; i++) { await page.dispatchEvent('.avatar.rosso:visible', 'click'); await page.waitForTimeout(80); }
await page.waitForTimeout(300);
const dopo = await vestiti(page);
check('al sesto tocco cambiano vestito (tutti e due, in un altro)', dopo.length === prima.length && dopo.every((v, i) => v !== prima[i]) && new Set(dopo.map((x) => x.replace(/^.*-/, ''))).size === 1, `${prima} -> ${dopo}`);
await page.reload();
await page.waitForSelector('.avatar canvas', { state: 'attached' });
const ricarica = await vestiti(page);
check('il cambio è solo per la sessione: ricaricando torna il vestito del calendario', ricarica.includes('rosso-halloween.svg'), ricarica.join(','));

// 6. Nessuno scroll orizzontale con la battuta aperta
await page.dispatchEvent('.avatar.rossella:visible', 'click');
const sc = await scroll(page);
check('nessuno scroll orizzontale col fumetto', sc.sw <= sc.iw && sc.bw <= sc.iw, JSON.stringify(sc));

// 7. Guardaroba in Impostazioni
await vai(page, 'impostazioni', '?oggi=2026-07-15');
check('impostazioni: ci sono i due vermetti e il selettore', (await page.locator('.vermetti-riga .avatar').count()) === 2 && (await page.locator('select[name=vestiti] option').count()) === 12);
check('impostazioni: «Automatico» scelto di partenza', (await page.inputValue('select[name=vestiti]')) === 'auto');
check('impostazioni: i vermetti mostrano quello d\'estate', (await vestiti(page)).includes('rosso-estate.svg'));
await page.selectOption('select[name=vestiti]', 'pioggia');
await page.waitForTimeout(200);
check('scegliendo «Pioggia» i vermetti si cambiano subito', (await vestiti(page)).every((v) => v.endsWith('-pioggia.svg')), (await vestiti(page)).join(','));
await page.goto(`${BASE}/?oggi=2026-07-15#/oggi`);
await page.waitForSelector('.avatar canvas', { state: 'attached' });
check('la scelta resta anche in «Oggi»', (await vestiti(page)).every((v) => v.endsWith('-pioggia.svg')), (await vestiti(page)).join(','));
await page.goto(`${BASE}/?oggi=2026-07-15#/impostazioni`);
await page.waitForSelector('select[name=vestiti]');
await page.selectOption('select[name=vestiti]', 'auto');
await page.waitForTimeout(200);
check('tornando ad «Automatico» ricompare il vestito del calendario', (await vestiti(page)).includes('rosso-estate.svg'));
// 7b. Compleanno dell'orto: un anno dopo il primo avvio
await page.evaluate(() => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => { const db = r.result; const tx = db.transaction('impostazioni', 'readwrite'); tx.objectStore('impostazioni').put({ chiave: 'orto_nato', valore: '2025-07-15' }); tx.oncomplete = () => { db.close(); ok(); }; };
}));
await vai(page, 'oggi', '?oggi=2026-07-15');
await page.reload(); // la data del primo avvio si legge all'apertura dell'app
await page.waitForSelector('.avatar canvas', { state: 'attached' });
check('compleanno dell\'orto: un anno dopo il primo avvio i vermetti hanno il cappellino', (await vestiti(page)).includes('rosso-compleanno.svg') && (await vestiti(page)).includes('rossella-compleanno.svg'), (await vestiti(page)).join(','));
await vai(page, 'oggi', '?oggi=2026-07-16');
await page.waitForSelector('.avatar canvas', { state: 'attached' });
check('il giorno dopo il compleanno tornano alla stagione', (await vestiti(page)).includes('rosso-estate.svg'));

// 7c. «Fatto»: un vermetto compare in basso e dice una battuta; «Non oggi» no
await vai(page, 'oggi', '?oggi=2026-11-10');
await page.waitForSelector('.meteo .meteo-giorno');
await page.waitForSelector('li.lavoro');
await page.locator('li.lavoro').nth(1).getByRole('button', { name: 'Non oggi' }).click();
await page.waitForTimeout(500);
check('«Non oggi»: nessun vermetto in festa', (await page.locator('.vermetto-flash').count()) === 0);
await page.locator('li.lavoro').first().locator('.btn.primario').click();
await page.waitForSelector('.vermetto-flash');
await page.waitForTimeout(500); // finita l'entrata
const flash = await page.$eval('.vermetto-flash', (n) => { const r = n.getBoundingClientRect(); return { testo: n.querySelector('.flash-fumetto').textContent, dentro: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, sopraBarra: r.bottom < document.getElementById('barra').getBoundingClientRect().top }; });
check('«Fatto»: compare un vermetto con una battuta (entro 90 caratteri), dentro lo schermo e sopra la barra', flash.testo.length > 5 && flash.testo.length <= 90 && flash.dentro && flash.sopraBarra, JSON.stringify(flash));
await page.waitForSelector('.vermetto-flash', { state: 'detached', timeout: 12000 });
check('il vermetto se ne va da solo', true);
await ctx.close();

// 8. Movimento ridotto: niente animazioni
({ ctx, page } = await nuovaPagina({ reducedMotion: 'reduce' }));
await vai(page, 'oggi', '?oggi=2026-07-15');
await page.waitForSelector('.avatar', { state: 'attached' });
check('con «riduci movimento» i vermetti non si animano', (await page.$eval('.avatar', (a) => getComputedStyle(a).animationName)) === 'none');
await ctx.close();

// 9. Senza le battute (file mancante): il vermetto salta lo stesso, nessun errore
({ ctx, page } = await nuovaPagina({ serviceWorkers: 'block' }));
await page.route('**/data/it/battute.json', (r) => r.fulfill({ status: 404, body: '' }));
await vai(page, 'oggi', '?oggi=2026-07-15');
await page.waitForSelector('.avatar', { state: 'attached' });
await page.dispatchEvent('.avatar.rosso:visible', 'click');
await page.waitForTimeout(500);
check('senza battute: il vermetto salta e l\'app resta in piedi', await page.$eval('.avatar.rosso:visible', (a) => a.classList.contains('salta')) && (await page.locator('.sbuffo').count()) === 0);
await ctx.close();

check('nessun errore in console / rete (esclusi i 404 simulati)', problemi.filter((p) => !/battute\.json|404|Failed to load resource|Service Worker registration blocked/.test(p)).length === 0, problemi.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
