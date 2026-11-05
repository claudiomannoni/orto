// Piano visivo dell'aiuola (trascina, vicini amici/nemici) e storia delle foto di una pianta. Uso: node tests/33-piano-pianta.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai, leggiDb } from './lib.mjs';
const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);
await vai(page, 'oggi', '?oggi=2026-06-30');
await page.locator('details.oggi-altri').evaluate((x) => { x.open = true; });
// dati: una zona 4 x 2 metri, due colture nemiche e una amica, e due foto esaminate di una di esse
await page.evaluate(() => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => {
    const d = r.result; const tx = d.transaction(['zone', 'colture', 'foto'], 'readwrite');
    tx.objectStore('zone').put({ id: 'z1', nome: 'Aiuola sud', tipo: 'aiuola', stato: 'coltivata', misure: { lunghezza_m: 2, larghezza_m: 4 }, superficie_mq: 8, esposizione: { gradi: 180 }, terreno: null, note: '', creata: '2026-05-01T08:00:00.000Z', schemaVersion: 3 });
    const c = (id, nome, schedaId) => tx.objectStore('colture').put({ id, nome, varieta: '', dataSemina: '2026-06-01', dove: 'orto', partenza: 'seme', note: '', creata: '2026-06-01T08:00:00.000Z', schedaId, zonaId: 'z1', schemaVersion: 2 });
    c('c1', 'Pomodori', 'pomodori'); c('c2', 'Basilico', 'basilico'); c('c3', 'Finocchi', 'finocchi');
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    const f = (id, data, stato, fase) => tx.objectStore('foto').put({ id, data, creata: `${data}T08:00:00.000Z`, zonaId: 'z1', colturaId: 'c1', nota: 'prova', immagine: blob, miniatura: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', larghezza: 1, altezza: 1, diagnosi: { data, risultato: { stato, pianta: null, problemi: stato === 'problema' ? [{ nome: 'Carenza d\'acqua', confidenza: 'media', perche: '', cosa_controllare: '' }] : [], avvisi: '', fase, fase_osservata: { id: 'crescita', nome: 'Crescita vegetativa' }, confronto_fase: 'in-ritardo' } }, schemaVersion: 3 });
    f('f1', '2026-06-10', 'problema', 'crescita'); f('f2', '2026-06-25', 'sana', 'crescita');
    tx.oncomplete = () => { d.close(); ok(); };
  };
}));

// Piano: apro dalla pagina «Il mio orto»
await vai(page, 'colture', '?oggi=2026-06-30');
await page.waitForSelector('a.link-piano');
await page.click('a.link-piano');
await page.waitForSelector('.gettone');
check('tre gettoni nell\'aiuola, con le misure scritte', (await page.locator('.gettone').count()) === 3 && /4 x 2 metri/.test(await page.locator('main').innerText()));
const r = await page.locator('.piano-campo').boundingBox();
check('l\'aiuola ha le proporzioni 4:2', Math.abs(r.width / r.height - 2) < 0.05, `${r.width}x${r.height}`);
// trascino Basilico accanto a Pomodori (amici) e Finocchi accanto a Pomodori (nemici)
const centro = async (id) => { const b = await page.locator(`.gettone[data-id=${id}]`).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const trascina = async (id, x, y) => { const c0 = await centro(id); await page.mouse.move(c0.x, c0.y); await page.mouse.down(); await page.mouse.move(x, y, { steps: 8 }); await page.mouse.up(); };
const cPom = await centro('c1');
await trascina('c2', cPom.x + 25, cPom.y + 25);
await page.waitForTimeout(300);
check('Basilico vicino a Pomodori: verde e frase «amiche»', (await page.locator('.gettone[data-id=c2]').getAttribute('data-vicini')) === 'ok' && /amiche/.test(await page.locator('main').innerText()));
await trascina('c3', cPom.x - 25, cPom.y - 25);
await page.waitForTimeout(300);
const nemici = await page.locator('main').innerText();
check('se c\'è una coppia che non va d\'accordo lo dice con la certezza', /non vanno d'accordo|amiche/.test(nemici) && (await page.locator('.gettone[data-vicini]').count()) === 3);
// «Cosa posso piantare qui adesso?»: a giugno 2026 nell'aiuola ci sono pomodori, basilico e finocchi
await page.click('#piano-suggerisci');
await page.waitForSelector('dialog[open] .suggerimento, dialog[open] .aiuto');
const suggerimenti = await page.locator('dialog[open]').innerText();
check('«Cosa posso piantare qui»: si apre con la spiegazione e un elenco (oppure il messaggio se non c e niente)', /Le colture che questo mese|Questo mese non trovo/.test(suggerimenti), suggerimenti.slice(0, 120));
await page.keyboard.press('Escape');
await page.reload();
await page.waitForSelector('.gettone');
const dopo = await leggiDb(page, 'colture');
check('le posizioni restano dopo aver ricaricato', dopo.every((c) => c.posizione && Number.isFinite(c.posizione.x)) && Math.abs(dopo.find((c) => c.id === 'c2').posizione.x - ((await centro('c2')).x - (await page.locator('.piano-campo').boundingBox()).x) / (await page.locator('.piano-campo').boundingBox()).width) < 0.03);

// Storia della pianta
await vai(page, 'oggi', '?oggi=2026-06-30');
await page.locator('details.oggi-altri').evaluate((x) => { x.open = true; });
await page.waitForSelector('.fase-pianta');
await page.locator('.fase-pianta a:has-text("Apri la pianta")').first().click();
await page.waitForSelector('.linea-tempo li');
const storia = await page.locator('main').innerText();
check('due foto in ordine, con «15 giorni dopo»', (await page.locator('.linea-tempo li').count()) === 2 && /15 giorni dopo/.test(storia), storia.slice(0, 200));
check('andamento: dalla foto con problema a quella sana «stia meglio»', /stia meglio/.test(storia));
check('fase vista e confronto con l\'età', /Crescita vegetativa/.test(storia) && /indietro/.test(storia));
const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console', veri.length === 0, veri.join(' | '));
await browser.close();
process.exit(finale() ? 1 : 0);
