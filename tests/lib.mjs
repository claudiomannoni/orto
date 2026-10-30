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

export async function nuovoContesto(browser, extra = {}) {
  return browser.newContext({ ...PIXEL9, ...extra });
}

// Raccoglie errori di console, eccezioni, richieste fallite e risposte >= 400.
export function osserva(page, problemi) {
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problemi.push(`console.${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => problemi.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problemi.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) problemi.push(`HTTP ${r.status()}: ${r.url()}`); });
}

export async function attendiApp(page) {
  await page.waitForSelector('#schermata > *', { timeout: 10000 });
  await page.waitForTimeout(150);
}

export async function vai(page, rotta, query = '') {
  await page.goto(`${BASE}/${query}#/${rotta}`);
  await attendiApp(page);
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
