// Erbe aromatiche e frutta: i dati sono coerenti (fonti vere, certezza) e la schermata mostra schede apribili.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, nuovoContesto, vai } from './lib.mjs';
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

const radice = path.resolve(import.meta.dirname, '..');
const d = JSON.parse(fs.readFileSync(path.join(radice, 'data/it/erbe-frutta.json'), 'utf8'));
const problemi = [];
const usaFonti = (nome, v) => { for (const f of v?.fonti ?? []) if (!/^https:\/\//.test(d.fonti[f]?.url ?? '')) problemi.push(`${nome}: fonte ${f}`); };
for (const p of d.piante) {
  for (const k of ['esposizione', 'acqua', 'terreno', 'in_vaso', 'semina', 'mesi']) {
    const v = p[k];
    if (!v) continue;
    if (!['alta', 'media', 'bassa'].includes(v.certezza)) problemi.push(`${p.id}/${k}: certezza`);
    if (!(v.fonti ?? []).length) problemi.push(`${p.id}/${k}: senza fonti`);
    usaFonti(`${p.id}/${k}`, v);
  }
  for (const m of p.propagazione ?? []) { if (!(m.fonti ?? []).length) problemi.push(`${p.id}/propagazione: senza fonti`); usaFonti(`${p.id}/propagazione`, m); }
  for (const o of p.opzioni ?? []) { if (!(o.fonti ?? []).length) problemi.push(`${p.id}/${o.id}: senza fonti`); usaFonti(`${p.id}/${o.id}`, o); }
  if (!Array.isArray(p.da_verificare)) problemi.push(`${p.id}: manca «da verificare»`);
}
check('dati: ogni dato ha certezza e fonti con indirizzo vero', problemi.length === 0, problemi.join('; '));
check('dati: dieci piante, senza emoji né accenti persi', d.piante.length === 10 && !/\p{Extended_Pictographic}/u.test(JSON.stringify(d)) && !/[A-Za-zÀ-ÿ]\?[A-Za-zÀ-ÿ]/.test(JSON.stringify(d).replace(/https?:\/\/\S+/g, '')));

const b = await chromium.launch(); const ctx = await nuovoContesto(b, { serviceWorkers: 'block' }); const page = await ctx.newPage();
await vai(page, 'scopri', '?oggi=2026-11-07');
check('Scopri ha la tessera «Erbe aromatiche e frutta»', (await page.locator('a.tessera-scopri[href="#/erbe"]').count()) === 1);
await page.click('a.tessera-scopri[href="#/erbe"]');
await page.waitForSelector('details.pianta-erbe');
check('dieci schede chiuse all\'inizio', (await page.locator('details.pianta-erbe').count()) === 10 && (await page.locator('details.pianta-erbe[open]').count()) === 0);
check('la barra resta su «Scopri»', (await page.locator('#barra a[aria-current=page]').getAttribute('data-rotta')) === 'scopri');
const ros = page.locator('details.pianta-erbe[data-pianta="rosmarino"]');
await ros.locator('> summary').click();
check('rosmarino aperto: luce, acqua e terreno con la certezza', (await ros.locator('.dato-erbe').count()) >= 3 && (await ros.locator('.etichetta.certezza').count()) >= 3);
check('rosmarino: come si moltiplica e consiglio per l\'inverno', (await ros.locator('.metodo-erbe').count()) >= 1 && (await ros.locator('details.opzione-sopravvivenza').count()) >= 1);
check('rosmarino: «Da verificare» elenca quello che manca', (await ros.locator('h4:has-text("Da verificare")').count()) === 1);
check('il bersaglio di apertura è alto almeno 48 px', (await ros.locator('> summary').boundingBox()).height >= 48);
check('nessuno scroll orizzontale', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
await b.close();
console.log(`Totale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
