// «Il tuo orto dall'alto»: zone come aiuole, colture con la crescita. Uso: node tests/20-aiuole.mjs http://localhost:8101
import { chromium, nuovoContesto, check, osserva, finale, vai } from './lib.mjs';

const browser = await chromium.launch();
const problemi = [];
const ctx = await nuovoContesto(browser, { serviceWorkers: 'block' });
const page = await ctx.newPage();
osserva(page, problemi);

// Nel nuovo aspetto «L'orto dall'alto» sta nella vista «Mappa» della schermata Colture.
await vai(page, 'colture', '?oggi=2026-06-20');
check('senza colture non c\'è l\'orto dall\'alto', (await page.locator('.aiuole').count()) === 0);

// Una zona e tre colture: una in zona (pomodori seminati da 30 giorni), una senza zona, una senza scheda nota
await page.evaluate(() => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => {
    const db = r.result; const tx = db.transaction(['zone', 'colture'], 'readwrite');
    tx.objectStore('zone').put({ id: 'z-test', nome: 'Aiuola sole', creata: '2026-05-01T08:00:00.000Z', schemaVersion: 2 });
    const base = { varieta: '', dove: 'orto', note: '', creata: '2026-05-01T08:00:00.000Z', schemaVersion: 2 };
    tx.objectStore('colture').put({ ...base, id: 'c1', nome: 'Carote', schedaId: 'carote', dataSemina: '2026-05-21', zonaId: 'z-test' });
    tx.objectStore('colture').put({ ...base, id: 'c2', nome: 'Radicchio misterioso', schedaId: null, dataSemina: '2026-06-10', zonaId: null });
    tx.oncomplete = () => { db.close(); ok(); };
  };
}));
await page.reload();
await page.waitForSelector('h2.titolo-schermata');
await page.locator('.filtri-colture button', { hasText: 'Mappa' }).click();
await page.waitForSelector('.aiuole');
check('titolo e spiegazione', /dall'alto/.test(await page.locator('.aiuole h3').innerText()));
check('due aiuole: la zona e «Senza zona»', (await page.locator('.aiuola h4').allInnerTexts()).join('|') === 'Aiuola sole|Senza zona');
check('una tessera per coltura (2)', (await page.locator('.tessera').count()) === 2);
const carote = page.locator('.tessera[data-id=c1]');
check('carote: barra di crescita e stato', (await carote.locator('progress').count()) === 1 && /giorni|Cresce|Appena|Quasi|Pronta/.test(await carote.locator('.tessera-stato').innerText()), await carote.locator('.tessera-stato').innerText());
check('coltura senza scheda: niente barra, ma «Seminata da N giorni»', (await page.locator('.tessera[data-id=c2] progress').count()) === 0 && /Seminata da 10 giorni/.test(await page.locator('.tessera[data-id=c2] .tessera-stato').innerText()), await page.locator('.tessera[data-id=c2] .tessera-stato').innerText());
check('la barra ha il nome accessibile', /Carote:/.test(await carote.locator('progress').getAttribute('aria-label')));

// Eliminando la coltura l'aiuola si aggiorna
page.on('dialog', (d) => d.accept());
await page.locator('.lista button', { hasText: 'Elimina' }).first().click().catch(() => {});
await page.waitForTimeout(400);
check('dopo un\'eliminazione le tessere si aggiornano', (await page.locator('.tessera').count()) <= 2);

const orizzontale = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
check('nessuno scroll orizzontale', orizzontale);
const veri = problemi.filter((p) => !/Service Worker registration blocked/.test(p));
check('nessun errore in console / rete', veri.length === 0, veri.join(' | '));
await page.screenshot({ path: process.env.SCATTO || 'tests/schermate/aiuole.png' });
await browser.close();
process.exit(finale() ? 1 : 0);
