// Funzioni di servizio: DOM, date, id.

export const $ = (sel, radice = document) => radice.querySelector(sel);

// Parametri dopo il «?» nell'indirizzo della schermata: #/diario?zona=abc -> URLSearchParams { zona: 'abc' }.
export function parametriRotta() {
  return new URLSearchParams(location.hash.split('?')[1] ?? '');
}

export function el(tag, attrs = {}, ...figli) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  figli.flat().forEach((f) => f != null && f !== false && e.append(f));
  return e;
}

export function nuovoId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function normalizza(testo) {
  return String(testo ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// ---------- Date: sempre in ora locale, formato AAAA-MM-GG ----------

const FORMATO_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isoLocale(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function daISO(iso) {
  const [a, m, g] = iso.split('-').map(Number);
  return new Date(a, m - 1, g);
}

// Il giorno "di oggi". Con ?oggi=AAAA-MM-GG nell'indirizzo si può provare un altro giorno.
export function oggiISO() {
  const forzato = new URLSearchParams(location.search).get('oggi');
  if (dataValida(forzato)) return forzato;
  return isoLocale(new Date());
}

// Formato giusto e data che esiste davvero (2026-13-45 e 2026-02-30 no).
export function dataValida(iso) {
  return typeof iso === 'string' && FORMATO_ISO.test(iso) && isoLocale(daISO(iso)) === iso;
}

export function giorniDa(iso) {
  return Math.round((daISO(oggiISO()) - daISO(iso)) / 86400000);
}

export function aggiungiGiorni(iso, n) {
  const d = daISO(iso);
  d.setDate(d.getDate() + n);
  return isoLocale(d);
}

export function formattaData(iso) {
  return daISO(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formattaDataLunga(iso) {
  return daISO(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function meseDi(iso) {
  return Number(iso.slice(5, 7));
}
