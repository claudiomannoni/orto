// «Come curarla»: i consigli hanno fonti vere, niente dosi o prodotti, e la scheda della pianta li mostra.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, nuovoContesto, vai } from './lib.mjs';
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

const radice = path.resolve(import.meta.dirname, '..');
const d = JSON.parse(fs.readFileSync(path.join(radice, 'data/it/cura.json'), 'utf8'));
const schede = new Set(fs.readdirSync(path.join(radice, 'data/it/colture')).map((f) => f.replace('.json', '')));
const ARGOMENTI = ['luce', 'acqua', 'terreno', 'vaso', 'sostegni', 'errori'];
const problemi = [];
for (const [id, c] of Object.entries(d.colture)) {
  if (!schede.has(id)) problemi.push(`${id}: scheda inesistente`);
  for (const x of c.consigli) {
    if (!ARGOMENTI.includes(x.argomento)) problemi.push(`${id}: argomento ${x.argomento}`);
    if (!['alta', 'media', 'bassa'].includes(x.certezza)) problemi.push(`${id}/${x.argomento}: certezza`);
    if (!(x.fonti ?? []).length) problemi.push(`${id}/${x.argomento}: senza fonti`);
    for (const f of x.fonti ?? []) if (!/^https:\/\//.test(d.fonti[f]?.url ?? '')) problemi.push(`${id}/${x.argomento}: fonte ${f}`);
    if (/kg\/ha|P2O5|K2O|urea|nitrato ammonico|\bkg N\b/i.test(x.testo)) problemi.push(`${id}/${x.argomento}: dosi da azienda agricola`);
    if (/^Non (trattat|descritt|documentat)/.test(x.testo)) problemi.push(`${id}/${x.argomento}: segnaposto`);
  }
}
check('dati: argomenti ammessi, certezza, fonti vere, niente dosi né segnaposto', problemi.length === 0, problemi.slice(0, 5).join('; '));
check('dati: 28 colture, nessuna emoji né accento perso', Object.keys(d.colture).length === 28 && !/\p{Extended_Pictographic}/u.test(JSON.stringify(d)) && !/[A-Za-zÀ-ÿ]\?[A-Za-zÀ-ÿ]/.test(JSON.stringify(d).replace(/https?:\/\/\S+/g, '')));

const b = await chromium.launch(); const ctx = await nuovoContesto(b, { serviceWorkers: 'block' }); const page = await ctx.newPage();
await vai(page, 'oggi', '?oggi=2026-06-20');
await page.evaluate(() => new Promise((fine) => { const r = indexedDB.open('orto'); r.onsuccess = () => { const db = r.result; const tx = db.transaction('colture', 'readwrite'); tx.objectStore('colture').put({ id: 'b', nome: 'Pomodoro', varieta: '', dataSemina: '2026-05-06', dove: 'orto', partenza: 'piantina', note: '', creata: '2026-05-06T08:00:00.000Z', schedaId: 'pomodori', zonaId: null, schemaVersion: 2 }); tx.oncomplete = () => { db.close(); fine(); }; }; }));
await vai(page, 'pianta?id=b&scheda=scheda', '?oggi=2026-06-20');
await page.waitForSelector('section.cura');
check('la scheda mostra «Come curarla» con almeno 3 consigli', (await page.locator('section.cura .consiglio-cura').count()) >= 3);
check('ogni consiglio ha la certezza', (await page.locator('section.cura .consiglio-cura .etichetta.certezza').count()) === (await page.locator('section.cura .consiglio-cura').count()));
await page.locator('section.cura details.meteo-dettagli > summary').click();
check('le fonti sono link esterni', (await page.locator('section.cura a[href^="https://"]').count()) >= 1);
check('nessuno scroll orizzontale', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
await b.close();
console.log(`Totale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
