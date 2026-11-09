// Funzioni comuni alle prove. Uso: import { ... } from './lib.mjs'
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
export const { chromium } = pw;

export const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const BASE = (process.argv[2] || process.env.BASE || 'http://localhost:8101').replace(/\/$/, '');
export const CARTELLA_SCHERMATE = process.env.SCHERMATE || path.join(AQUI, 'schermate', 'fase1');

export const PIXEL9 = {
  viewport: { width: 412, height: 923 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
  locale: 'it-IT',
};

export const risultati = [];
export function check(nome, ok, dettaglio = '') {
  risultati.push({ nome, ok: Boolean(ok), dettaglio: String(dettaglio) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${nome}${dettaglio ? '  -> ' + dettaglio : ''}`);
}
export function nota(testo) { console.log(`NOTA  ${testo}`); }

// Meteo finto (Open-Meteo non si contatta mai nelle prove: sarebbe lento e imprevedibile). Sette giorni a partire da
// «oggi» (?oggi= nell'indirizzo della pagina, o la data vera), più i 7 giorni passati (i da -7 a -1): sereno, 6-16 gradi, niente pioggia. Una prova può cambiare
// ctx.meteoFinto = (oggi, i) => ({ tmin, tmax, pioggia, prob, vento, codice }) per un giorno i (0 = oggi).
const aggiungiGiorni = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export async function simulaMeteo(ctx) {
  ctx.meteoFinto = null;
  ctx.richiesteMeteo = [];
  await ctx.route('**/api.open-meteo.com/**', async (route) => {
    const req = route.request();
    ctx.richiesteMeteo.push(req.url());
    let oggi = new Date().toISOString().slice(0, 10);
    try { const q = new URL(req.frame().url()).searchParams.get('oggi'); if (q) oggi = q; } catch { /* data vera */ }
    const giorni = Array.from({ length: 14 }, (_, k) => k - 7).map((i) => ({ data: aggiungiGiorni(oggi, i), ...{ tmin: 6, tmax: 16, pioggia: 0, prob: 5, vento: 12, codice: 0 }, ...(ctx.meteoFinto?.(oggi, i) ?? {}) }));
    await route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: JSON.stringify({ daily: {
        time: giorni.map((g) => g.data), weather_code: giorni.map((g) => g.codice), temperature_2m_min: giorni.map((g) => g.tmin), temperature_2m_max: giorni.map((g) => g.tmax),
        precipitation_sum: giorni.map((g) => g.pioggia), precipitation_probability_max: giorni.map((g) => g.prob), wind_speed_10m_max: giorni.map((g) => g.vento),
      } }),
    });
  });
}

export async function nuovoContesto(browser, extra = {}) {
  const ctx = await browser.newContext({ ...PIXEL9, ...extra });
  await simulaMeteo(ctx);
  return ctx;
}

// Raccoglie errori di console, eccezioni, richieste fallite e risposte >= 400.
export function osserva(page, problemi) {
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problemi.push(`console.${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => problemi.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problemi.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) problemi.push(`HTTP ${r.status()}: ${r.url()}`); });
}

// Su un profilo vuoto l'app apre il primo avvio guidato: le prove che non lo riguardano lo saltano
// («Salta per ora») e tornano alla schermata che avevano chiesto. Il primo avvio si prova in 06-primo-avvio.mjs.
export async function attendiApp(page) {
  await page.waitForSelector('#schermata > *', { timeout: 10000 });
  const salta = page.locator('#schermata .azioni .btn.pericolo');
  if (await salta.count()) {
    const richiesta = await page.evaluate(() => new URL(performance.getEntriesByType('navigation')[0].name).hash);
    await salta.click();
    await page.waitForSelector('#schermata h2.titolo-schermata:has-text("Oggi in campagna")');
    if (richiesta && !['#/benvenuto', '#/oggi', '#'].includes(richiesta)) {
      await page.evaluate((h) => { location.hash = h; }, richiesta);
      await page.waitForTimeout(200);
    }
  }
  await page.waitForTimeout(150);
}

export async function vai(page, rotta, query = '') {
  await page.goto(`${BASE}/${query}#/${rotta}`);
  await attendiApp(page);
  // I test che cercano i contenuti secondari li aprono; «corta» controlla la schermata iniziale compatta.
  if (rotta === 'colture') await page.evaluate(() => { document.querySelectorAll('details.coltura-azioni, details.stagione-riga').forEach((d) => { d.open = true; }); });
  if (rotta === 'oggi' && !query.includes('corta')) await page.evaluate(() => { const d = document.querySelector('details.oggi-altri'); if (d) d.open = true; const mese = document.querySelector('details.lavori-mese'); if (mese) mese.open = true; const altri = document.querySelector('details.altri-lavori'); if (altri) altri.open = true; });
}

export async function scroll(page) {
  return page.evaluate(() => ({ sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth, iw: window.innerWidth }));
}

export async function bersagli(page) {
  return page.evaluate(() => {
    const aperto = document.querySelector('dialog[open]');
    const radice = aperto || document;
    const sel = 'a,button,input:not([type=hidden]),select,textarea,summary,[role=button]';
    const out = [];
    for (const e of radice.querySelectorAll(sel)) {
      if (e.closest('[hidden]') || e.hidden) continue;
      let r = e.getBoundingClientRect();
      if (e.type === 'radio' || e.type === 'checkbox') { const l = e.closest('label'); if (l) r = l.getBoundingClientRect(); }
      if (!r.width || !r.height) continue;
      out.push({
        tag: e.tagName.toLowerCase(), cls: e.className, nome: (e.innerText || e.name || e.placeholder || '').trim().slice(0, 28),
        h: Math.round(r.height * 10) / 10, w: Math.round(r.width * 10) / 10,
      });
    }
    return out;
  });
}

export async function leggiDb(page, store) {
  return page.evaluate((s) => new Promise((ok, ko) => {
    const r = indexedDB.open('orto');
    r.onsuccess = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(s)) { db.close(); ok(null); return; }
      const q = db.transaction(s).objectStore(s).getAll();
      q.onsuccess = () => { db.close(); ok(q.result); };
      q.onerror = () => ko(q.error);
    };
    r.onerror = () => ko(r.error);
  }), store);
}

export async function svuotaDati(page) {
  await page.evaluate(() => new Promise((ok) => {
    const r = indexedDB.open('orto');
    r.onsuccess = () => {
      const db = r.result;
      const nomi = [...db.objectStoreNames];
      const tx = db.transaction(nomi, 'readwrite');
      nomi.forEach((n) => tx.objectStore(n).clear());
      // Dati vuoti sì, ma non si rifà il primo avvio ogni volta (si prova in 06-primo-avvio.mjs).
      if (nomi.includes('impostazioni')) tx.objectStore('impostazioni').put({ chiave: 'primo_avvio_fatto', valore: true });
      tx.oncomplete = () => { db.close(); ok(); };
    };
  }));
}

export function finale() {
  const ko = risultati.filter((r) => !r.ok);
  console.log(`\nTotale: ${risultati.length} controlli, ${risultati.length - ko.length} passati, ${ko.length} falliti`);
  ko.forEach((r) => console.log(`  FALLITO: ${r.nome} -> ${r.dettaglio}`));
  return ko.length;
}
