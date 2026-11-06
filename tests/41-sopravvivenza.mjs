// «Come farla sopravvivere»: i dati sono coerenti (fonti, certezza, passi) e la pagina della pianta mostra voci apribili.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, nuovoContesto, vai } from './lib.mjs';
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

const radice = path.resolve(import.meta.dirname, '..');
const d = JSON.parse(fs.readFileSync(path.join(radice, 'data/it/sopravvivenza.json'), 'utf8'));
const schede = new Set(fs.readdirSync(path.join(radice, 'data/it/colture')).map((f) => f.replace('.json', '')));
let problemi = [];
for (const [id, c] of Object.entries(d.colture)) {
  if (!schede.has(id)) problemi.push(`${id}: scheda inesistente`);
  for (const o of c.opzioni) {
    if (!['si', 'dipende', 'no'].includes(o.esito)) problemi.push(`${id}/${o.id}: esito`);
    if (!['alta', 'media', 'bassa'].includes(o.certezza)) problemi.push(`${id}/${o.id}: certezza`);
    if (!o.riassunto) problemi.push(`${id}/${o.id}: senza riassunto`);
    if (o.esito !== 'no' && !o.passi?.length) problemi.push(`${id}/${o.id}: senza passi`);
    if (!o.fonti?.length) problemi.push(`${id}/${o.id}: senza fonti`);
    for (const f of o.fonti ?? []) if (!/^https:\/\//.test(d.fonti[f]?.url ?? '')) problemi.push(`${id}/${o.id}: fonte ${f} senza indirizzo`);
  }
}
check('dati: ogni voce ha esito, certezza, riassunto, fonti e (se non è un «no») i passi', problemi.length === 0, problemi.join('; '));
check('dati: non c\'è nessuna emoji né accento perso', !/\p{Extended_Pictographic}/u.test(JSON.stringify(d)) && !/[A-Za-zÀ-ÿ]\?[A-Za-zÀ-ÿ]/.test(JSON.stringify(d).replace(/https?:\/\/\S+/g, '')));
check('dati: pomodori, peperoni, basilico e carciofi', ['pomodori', 'peperoni', 'basilico', 'carciofi'].every((k) => d.colture[k]));

const b = await chromium.launch(); const ctx = await nuovoContesto(b, { serviceWorkers: 'block' }); const page = await ctx.newPage();
await vai(page, 'oggi', '?oggi=2026-11-06');
await page.evaluate(() => new Promise((fine) => { const r = indexedDB.open('orto'); r.onsuccess = () => { const db = r.result; const tx = db.transaction('colture', 'readwrite'); tx.objectStore('colture').put({ id: 'b', nome: 'Pomodoro', varieta: 'Grappolo', dataSemina: '2026-06-06', dove: 'orto', partenza: 'piantina', note: '', creata: '2026-06-06T08:00:00.000Z', schedaId: 'pomodori', zonaId: null, schemaVersion: 2 }); tx.oncomplete = () => { db.close(); fine(); }; }; }));
await vai(page, 'pianta?id=b', '?oggi=2026-11-06');
const voci = await page.locator('details.opzione-sopravvivenza').count();
check('pomodoro: due voci apribili (all\'aperto e talee)', voci === 2, String(voci));
const talee = page.locator('details.opzione-sopravvivenza[data-opzione="talee"]');
check('la voce è chiusa all\'inizio', (await talee.evaluate((e) => e.open)) === false);
await talee.locator('> summary').click();
check('aperta: si vedono i passi e la certezza', (await talee.locator('ol.passi-sopravvivenza li').count()) >= 4 && (await talee.locator('.etichetta.certezza').count()) === 1);
check('il bersaglio di apertura è alto almeno 48 px', (await talee.locator('> summary').boundingBox()).height >= 48);
await talee.locator('details.meteo-dettagli summary').click();
check('le fonti sono link esterni', (await talee.locator('details.meteo-dettagli a[href^="https://"]').count()) >= 2);
const scroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
check('nessuno scroll orizzontale', scroll);
await vai(page, 'colture', '?oggi=2026-11-06');
const sborda = await page.evaluate(() => { const c = document.querySelector('.colture-registro .coltura'); const s = c?.querySelector('.stagione'); if (!c || !s) return 'assente'; const a = c.getBoundingClientRect(), r = s.getBoundingClientRect(); return r.right <= a.right + 0.5 && r.left >= a.left - 0.5 ? 'dentro' : 'fuori'; });
check('nella riga della coltura l\'avviso di stagione resta dentro la carta', sborda === 'dentro', sborda);
check('nella riga il tasto «Come farla sopravvivere» che porta alla pianta', (await page.locator('.colture-registro .link-sopravvivenza').first().getAttribute('href'))?.includes('#/pianta?id=b'));
await b.close();
console.log(`Totale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
