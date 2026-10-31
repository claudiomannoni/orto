// I vermetti liberi: Rosso e Rossella girano sul bordo in basso dello schermo (sopra la barra), camminano, guardano il dito,
// si fermano a riposare e ogni tanto scavano, vanno sotto terra (si vede solo il rigonfiamento) ed escono da un'altra parte.
// Se li tocchi saltano e dicono una battuta; quando l'app festeggia, saltano fuori dalla terra. Tutto nel codice, nessuna immagine.
import { el } from '../util.js';
import { t } from '../i18n.js';
import { vestitoAttuale, alTocco } from './mascotte.js';
import { disegnaVestito, disegnaFirma, COLORI } from './vermetto.js';
import { consigliDeiVermi, scegliConsiglio } from '../motore/consigli-vermi.js';
import { pioveOggiDaCache } from '../meteo.js';

const ALTEZZA = 120; // altezza dello strato trasparente sopra la barra
const TERRA = 22; // altezza della fascia di terra in fondo
const SUOLO = ALTEZZA - TERRA; // la linea del terreno
const SCURO = '#4a2a22';

const SPECIE = [
  { chi: 'rosso', n: 14, r: 12.5, lungo: 10, partenza: 0.3, zona: [0, 0.58] },
  { chi: 'rossella', n: 12, r: 10.8, lungo: 9, partenza: 0.8, zona: [0.42, 1], occhiali: true },
];

let strato = null;
let tela = null;
let contesto = null;
let terra = null;
let larghezza = 0;
let dpr = 1;
let vermi = [];
let bottoni = [];
let visibile = true;
let avviato = false;
// Discrezione: se un verme passa sopra un pulsante, un'icona o del testo diventa quasi trasparente e non intercetta i tocchi.
const INTERATTIVI = 'a, button, input, select, textarea, summary, label, img, svg, h1, h2, h3, h4';
function suContenuto(x, y) {
  return document.elementsFromPoint(x, y).some((e) => {
    if (e.closest('.vermi-liberi, .tocco-vermetto, #toast') || e === document.body || e === document.documentElement || e.id === 'schermata') return false;
    return e.matches(INTERATTIVI) || (!e.children.length && e.textContent.trim().length > 0);
  });
}
function controllaSovrapposizione(v, r) {
  const punti = [v.p[0], v.p[Math.floor(v.p.length / 2)], v.p[v.p.length - 1]];
  v.sopra = punti.some((p) => p.y < SUOLO + 2 && suContenuto(r.left + p.x, r.top + p.y));
}

const puntatore = { x: 0, y: 0, ultimo: -1e9 };
const ridotto = () => document.documentElement.dataset.movimento === 'ridotto';

function fasciaDiTerra(w) {
  const c = document.createElement('canvas');
  c.width = w * dpr;
  c.height = ALTEZZA * dpr;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const sfumo = g.createLinearGradient(0, SUOLO, 0, ALTEZZA);
  sfumo.addColorStop(0, '#6b4a36');
  sfumo.addColorStop(1, '#4a3225');
  g.fillStyle = sfumo;
  g.beginPath();
  g.moveTo(0, SUOLO + 4);
  for (let x = 0; x <= w; x += 10) g.lineTo(x, SUOLO + 1 + Math.sin(x * 0.07) * 2);
  g.lineTo(w, ALTEZZA);
  g.lineTo(0, ALTEZZA);
  g.fill();
  let seme = 11;
  const caso = () => { seme = (seme * 16807) % 2147483647; return seme / 2147483647; };
  for (let i = 0; i < w / 8; i++) {
    g.fillStyle = caso() > 0.5 ? '#7d5a44' : '#3a251b';
    g.beginPath();
    g.ellipse(caso() * w, SUOLO + 8 + caso() * (TERRA - 10), 1.2 + caso() * 2.4, 0.8 + caso() * 1.6, 0, 0, 7);
    g.fill();
  }
  g.strokeStyle = '#4f9a4b';
  g.lineCap = 'round';
  g.lineWidth = 2;
  for (let x = 3; x < w; x += 8 + caso() * 13) {
    const h = 5 + caso() * 9;
    const base = SUOLO + 1 + Math.sin(x * 0.07) * 2;
    g.beginPath();
    g.moveTo(x, base);
    g.quadraticCurveTo(x + (caso() - 0.5) * 6, base - h * 0.6, x + (caso() - 0.5) * 10, base - h);
    g.stroke();
  }
  return c;
}

function nuovoVerme(def) {
  const x0 = Math.max(larghezza * def.partenza, def.n * def.lungo + def.r + 6);
  return {
    ...def,
    p: Array.from({ length: def.n }, (_, i) => ({ x: x0 - i * def.lungo, y: SUOLO - def.r })),
    vx: 0, vy: 0, verso: 1, meta: x0, riposo: 50 + Math.random() * 90,
    stato: 'cammina', attesa: 0, ride: 0, occhio: 150 + Math.random() * 250, fase: Math.random() * 6,
    particelle: [], tocco: null, alfa: 0.95, sopra: false,
  };
}

// Un punto a caso nella zona di questo verme (così i due non si sovrappongono).
const nuovaMeta = (v) => larghezza * v.zona[0] + v.n * v.lungo * 0.4 + 20 + Math.random() * Math.max(10, larghezza * (v.zona[1] - v.zona[0]) - v.n * v.lungo * 0.8 - 40);
const dentroZona = (v, x) => Math.max(larghezza * v.zona[0] + v.r + 2, Math.min(larghezza * v.zona[1] - v.r - 2, x));

const scoppio = (v, x, quante = 7) => {
  for (let i = 0; i < quante; i++) v.particelle.push({ x, y: SUOLO, vx: (Math.random() - 0.5) * 3.2, vy: -1.5 - Math.random() * 2.6, vita: 26 + Math.random() * 14 });
};

function scava(v) {
  if (v.stato !== 'cammina') return;
  v.stato = 'scava';
  v.vx = v.verso * 0.5;
  v.vy = 1;
  scoppio(v, v.p[0].x);
}

function passo(v, dt, ptrVicino) {
  const testa = v.p[0];
  const stoSopra = v.stato === 'cammina';
  const chiusoSopra = SUOLO - v.r;
  if (v.stato === 'cammina') {
    if (ptrVicino) { v.meta = dentroZona(v, puntatore.x); v.riposo = 25; }
    else if (--v.riposo <= 0) {
      const sorte = Math.random();
      if (sorte < 0.22) { scava(v); v.riposo = 200; }
      else if (sorte < 0.5) v.riposo = 70 + Math.random() * 140;
      else { v.meta = nuovaMeta(v); v.riposo = 110 + Math.random() * 180; }
    }
    const distanza = v.meta - testa.x;
    const vmax = ptrVicino ? 2.6 : 1.1;
    if (testa.y >= chiusoSopra - 0.5) v.vx += ((Math.abs(distanza) > 8 ? Math.sign(distanza) * vmax : 0) - v.vx) * 0.12 * dt;
    v.vy += 0.55 * dt;
    testa.x += v.vx * dt;
    testa.y += v.vy * dt;
    if (testa.y > chiusoSopra) { testa.y = chiusoSopra; v.vy = 0; }
  } else if (v.stato === 'scava') {
    v.vy += 0.3 * dt;
    testa.x += v.vx * dt;
    testa.y += v.vy * dt;
    if (testa.y > SUOLO + v.r + 10) {
      v.stato = 'sotto';
      v.attesa = 70 + Math.random() * 90;
      v.meta = nuovaMeta(v);
      v.vx = 0; v.vy = 0;
    }
  } else if (v.stato === 'sotto') {
    testa.y += (SUOLO + v.r + 8 - testa.y) * 0.2 * dt;
    const d = v.meta - testa.x;
    testa.x += Math.sign(d) * Math.min(Math.abs(d), 2 * dt);
    v.verso = Math.sign(d) || v.verso;
    if (Math.floor(testa.x) % 17 === 0) v.particelle.push({ x: testa.x + (Math.random() - 0.5) * 14, y: SUOLO - 2, vx: (Math.random() - 0.5) * 1.5, vy: -1 - Math.random(), vita: 18 });
    if (Math.abs(d) < 3 && --v.attesa <= 0) { v.stato = 'esce'; v.vy = -9.5; scoppio(v, testa.x, 9); }
  } else if (v.stato === 'esce') {
    v.vy += 0.5 * dt;
    testa.y += v.vy * dt;
    testa.x += v.verso * 0.6 * dt;
    if (testa.y < chiusoSopra - 4 && v.vy > 0) v.stato = 'cammina';
    if (testa.y > chiusoSopra && v.vy > 0) { testa.y = chiusoSopra; v.vy = 0; v.stato = 'cammina'; }
  }
  testa.x = dentroZona(v, testa.x);
  if (stoSopra && Math.abs(v.vx) > 0.25) v.verso = Math.sign(v.vx);
  // ogni segmento segue quello davanti; fuori dalla terra la coda pesa verso il basso e non entra nel terreno
  const sopra = v.stato === 'cammina' || (v.stato === 'esce' && testa.y < SUOLO);
  for (let i = 1; i < v.p.length; i++) {
    const a = v.p[i - 1];
    const b = v.p[i];
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    b.x = a.x + dx * v.lungo;
    b.y = a.y + dy * v.lungo + (v.stato === 'cammina' ? 0.35 * dt : 0);
    if (v.stato === 'cammina' && b.y > chiusoSopra) b.y = chiusoSopra;
  }
  void sopra;
  v.fase += dt * (0.05 + Math.min(1, Math.abs(v.vx)) * 0.11);
  if (v.ride > 0) v.ride -= dt;
  v.occhio -= dt;
  if (v.occhio < -6) v.occhio = 150 + Math.random() * 280;
  v.particelle = v.particelle.filter((q) => { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 0.18 * dt; return --q.vita > 0; });
}

function disegnaVerme(c, v) {
  const n = v.p.length;
  const moto = v.stato === 'cammina' ? Math.min(1, Math.abs(v.vx) / 1.2) : 0;
  const punti = v.p.map((p, i) => ({ x: p.x, y: p.y - moto * 6 * Math.max(0, Math.sin(v.fase * 6 - i * 0.85)) * (i / n < 0.9 ? 1 : 0.4) }));
  const raggio = (i) => v.r * (0.84 + 0.16 * (1 - i / (n - 1)));
  c.save();
  c.beginPath();
  c.rect(0, 0, larghezza, SUOLO + 3);
  c.clip();
  c.fillStyle = 'rgba(0,0,0,.2)';
  const t0 = punti[0]; const tn = punti[n - 1];
  c.beginPath(); c.ellipse((t0.x + tn.x) / 2, SUOLO + 2, Math.abs(t0.x - tn.x) / 2 + v.r, 4, 0, 0, 7); c.fill();
  c.fillStyle = SCURO;
  for (let i = n - 1; i >= 0; i--) { c.beginPath(); c.arc(punti[i].x, punti[i].y, raggio(i) + 2.4, 0, 7); c.fill(); }
  for (let i = n - 1; i >= 0; i--) {
    const fascia = i === Math.floor(n * 0.3);
    c.fillStyle = fascia ? '#f6d3aa' : COLORI[v.chi].corpo;
    c.beginPath(); c.arc(punti[i].x, punti[i].y, raggio(i), 0, 7); c.fill();
    if (!fascia) {
      c.fillStyle = COLORI[v.chi].luce; c.globalAlpha = 0.5 * v.alfa;
      c.beginPath(); c.arc(punti[i].x - 2, punti[i].y - raggio(i) * 0.45, raggio(i) * 0.4, 0, 7); c.fill();
      c.globalAlpha = v.alfa;
    }
    if (i > 0 && i < n - 1 && !fascia) {
      const a = punti[i - 1]; const b = punti[i + 1];
      const l = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const nx = -(a.y - b.y) / l; const ny = (a.x - b.x) / l;
      const q = raggio(i) * 0.86; const sx = (a.x - b.x) / l * 4; const sy = (a.y - b.y) / l * 4;
      c.strokeStyle = COLORI[v.chi].anello; c.lineWidth = 1.8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(punti[i].x - nx * q + sx, punti[i].y - ny * q + sy); c.lineTo(punti[i].x + nx * q + sx, punti[i].y + ny * q + sy); c.stroke();
    }
  }
  // viso, rivolto dove va
  const h = punti[0];
  const f = v.verso;
  const guardaIl = performance.now() - puntatore.ultimo < 2500 ? Math.atan2(puntatore.y - h.y, puntatore.x - h.x) : (f > 0 ? 0 : Math.PI);
  const chiuso = v.occhio < 0 || v.ride > 0;
  [[f * 3, -4], [f * 10, -4]].forEach(([ox, oy]) => {
    const x = h.x + ox; const y = h.y + oy;
    if (chiuso) {
      c.strokeStyle = SCURO; c.lineWidth = 2.2; c.lineCap = 'round';
      c.beginPath(); c.arc(x, y + (v.ride > 0 ? 2 : 0), 3.2, v.ride > 0 ? Math.PI * 1.1 : 0.15, v.ride > 0 ? Math.PI * 1.9 : Math.PI - 0.15); c.stroke();
    } else {
      c.fillStyle = '#fffdf6'; c.beginPath(); c.arc(x, y, 4.9, 0, 7); c.fill();
      c.strokeStyle = SCURO; c.lineWidth = 1.3; c.stroke();
      c.fillStyle = SCURO; c.beginPath(); c.arc(x + Math.cos(guardaIl) * 2, y + Math.sin(guardaIl) * 2, 2.4, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x + Math.cos(guardaIl) * 2 + 0.8, y + Math.sin(guardaIl) * 2 - 0.9, 0.8, 0, 7); c.fill();
    }
    if (v.occhiali) { c.strokeStyle = SCURO; c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, 6.4, 0, 7); c.stroke(); }
  });
  c.strokeStyle = SCURO; c.lineWidth = 2; c.lineCap = 'round';
  c.beginPath();
  if (v.ride > 0) { c.fillStyle = SCURO; c.arc(h.x + f * 8, h.y + 4, 3.8, 0, Math.PI); c.fill(); } else { c.arc(h.x + f * 7, h.y + 2.6, 4, 0.25, Math.PI - 0.25); c.stroke(); }
  disegnaFirma(c, v.chi, h, v.r, [[h.x + f * 3, h.y - 4], [h.x + f * 10, h.y - 4]], [h.x + f * 7, h.y + 3]);
  // il vestito del giorno, sopra la testa (il collo è il penultimo punto dell'elenco)
  disegnaVestito(c, vestitoAttuale(), h, v.r, [...punti].reverse());
  c.restore();
  // la terra smossa: rigonfiamento sopra il verme sotto terra, e i granelli
  if (v.stato === 'sotto' || (v.stato === 'scava' && h.y > SUOLO - 4)) {
    const alt = v.stato === 'sotto' ? 7 + Math.sin(v.fase * 9) * 1.2 : 5;
    c.fillStyle = '#6b4a36'; c.strokeStyle = '#4a3225'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(h.x - 20, SUOLO + 3); c.quadraticCurveTo(h.x, SUOLO + 3 - alt * 2.2, h.x + 20, SUOLO + 3); c.closePath(); c.fill(); c.stroke();
  }
  c.fillStyle = '#6b4a36';
  v.particelle.forEach((q) => { c.globalAlpha = Math.min(1, q.vita / 14) * v.alfa; c.beginPath(); c.arc(q.x, q.y, 2, 0, 7); c.fill(); });
  c.globalAlpha = 1;
}

function misura() {
  const w = Math.round(window.innerWidth);
  const barra = document.getElementById('barra');
  const altBarra = barra && !barra.hidden ? barra.offsetHeight : 0;
  strato.style.bottom = `${altBarra}px`;
  if (!w || w === larghezza) return;
  larghezza = w;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  tela.width = w * dpr;
  tela.height = ALTEZZA * dpr;
  tela.style.height = `${ALTEZZA}px`;
  terra = fasciaDiTerra(w);
  vermi = SPECIE.map(nuovoVerme);
  vermi.forEach((v, i) => { v.tocco = bottoni[i] ?? null; });
}

function aggiornaTocchi() {
  const r = tela.getBoundingClientRect();
  vermi.forEach((v) => {
    const visibili = v.stato === 'sotto' ? [] : v.p.filter((p) => p.y < SUOLO + 2);
    const bt = v.tocco;
    if (!bt) return;
    if (!visibili.length || !visibile) { bt.style.display = 'none'; return; }
    const xs = visibili.map((p) => p.x); const ys = visibili.map((p) => p.y);
    const x0 = Math.min(...xs) - v.r; const x1 = Math.max(...xs) + v.r;
    const y0 = Math.min(...ys) - v.r - 8; const y1 = SUOLO;
    bt.style.display = '';
    bt.style.left = `${r.left + x0}px`; bt.style.top = `${r.top + y0}px`;
    bt.style.width = `${x1 - x0}px`; bt.style.height = `${y1 - y0}px`;
    bt.dataset.stato = v.stato;
    bt.style.pointerEvents = v.alfa < 0.6 ? 'none' : 'auto'; // sopra un'icona o un testo i tocchi passano al contenuto
    bt.classList.toggle('destra', r.left + (x0 + x1) / 2 > window.innerWidth / 2);
  });
}

// ---- Consigli utili: ogni tanto un verme si ferma e dice una cosa che serve (lavori di oggi, pioggia, quiz...). Si tocca per andare lì. ----
const MAX_CONSIGLI = 5; // a sessione, per non diventare fastidiosi
let statoOggi = null;
let consiglio = null; // { v, voce, nodo, fine }
let visti = [];
let giroConsigli = 0;
let proximo = 0;
const rotta = () => location.hash.replace(/^#\//, '').split('?')[0] || 'oggi';

async function mostraConsiglio(adesso) {
  if (consiglio || !statoOggi || !visibile || ridotto() || document.hidden || visti.length >= MAX_CONSIGLI) return;
  if (['benvenuto', 'dottore', 'impostazioni'].includes(rotta()) || document.querySelector('dialog[open]')) return;
  let piove = null;
  try { piove = await pioveOggiDaCache(); } catch { piove = null; }
  const voce = scegliConsiglio(consigliDeiVermi({ ...statoOggi, piove }), visti, giroConsigli++);
  if (!voce) return;
  const v = vermi.find((x) => x.chi === voce.chi) ?? vermi[0];
  if (v.stato === 'sotto') { v.stato = 'esce'; v.vy = -9.5; scoppio(v, v.p[0].x, 9); }
  const nodo = el('button', { class: 'consiglio-verme', type: 'button', 'data-chi': voce.chi, 'aria-label': t('verme.consiglio.chiudi') }, t(voce.chiave, voce.vars));
  nodo.addEventListener('click', () => { chiudiConsiglio(); if (voce.rotta) location.hash = voce.rotta; });
  document.body.append(nodo);
  consiglio = { v, voce, nodo, fine: adesso + 9500 };
  visti.push(voce.id);
  v.riposo = 600; v.ride = 40;
}
function chiudiConsiglio() { consiglio?.nodo.remove(); consiglio = null; }
function posizionaConsiglio(adesso) {
  if (!consiglio) return;
  if (adesso > consiglio.fine || rotta() !== 'oggi' || document.querySelector('dialog[open]')) { chiudiConsiglio(); return; }
  const r = tela.getBoundingClientRect();
  const h = consiglio.v.p[0];
  const larg = consiglio.nodo.offsetWidth || 220;
  const x = Math.max(8, Math.min(window.innerWidth - larg - 8, r.left + h.x - larg / 2));
  consiglio.nodo.style.left = `${x}px`;
  consiglio.nodo.style.top = `${Math.max(8, r.top + h.y - consiglio.nodo.offsetHeight - 26)}px`;
}

let ultimo = 0;
let giro = 0;
function ciclo(adesso) {
  requestAnimationFrame(ciclo);
  if (document.hidden || !visibile || !larghezza) { ultimo = adesso; return; }
  const dt = Math.min(2.5, (adesso - ultimo) / 16.7 || 1);
  ultimo = adesso;
  contesto.setTransform(1, 0, 0, 1, 0, 0);
  contesto.clearRect(0, 0, tela.width, tela.height);
  contesto.scale(dpr, dpr);
  contesto.drawImage(terra, 0, 0, larghezza, ALTEZZA);
  const vicino = adesso - puntatore.ultimo < 1200 && puntatore.y > 0;
  const r = tela.getBoundingClientRect();
  const sulloStrato = vicino && puntatore.y > r.top - 60;
  const piuVicino = sulloStrato ? vermi.reduce((a, b) => (Math.abs(a.p[0].x - puntatore.x) < Math.abs(b.p[0].x - puntatore.x) ? a : b)) : null;
  giro++;
  vermi.forEach((v) => {
    if (!ridotto()) passo(v, dt, v === piuVicino);
    if (giro % 6 === 0) controllaSovrapposizione(v, r);
    v.alfa += ((v.sopra ? 0.28 : 0.95) - v.alfa) * 0.15;
    contesto.globalAlpha = v.alfa;
    disegnaVerme(contesto, v);
    contesto.globalAlpha = 1;
  });
  aggiornaTocchi();
  posizionaConsiglio(adesso);
  if (adesso > proximo && statoOggi) { proximo = adesso + 4 * 60 * 1000; mostraConsiglio(adesso); }
}

function perOgniVerme(f) { vermi.forEach(f); }

// Crea lo strato dei vermi una volta sola. Va chiamato dopo aver costruito la barra.
export function avviaVermiLiberi() {
  if (avviato || typeof document === 'undefined') return;
  avviato = true;
  tela = el('canvas', { 'aria-hidden': 'true' });
  contesto = tela.getContext('2d');
  strato = el('div', { class: 'vermi-liberi' }, tela);
  document.body.append(strato);
  // un riquadro cliccabile per verme, sopra la sua sagoma: si tocca, salta e parla
  SPECIE.forEach((def, i) => {
    const bt = el('button', { class: 'tocco-vermetto', type: 'button', 'data-chi': def.chi, 'aria-label': t('mascotte.tocca', { nome: t(`mascotte.${def.chi}`) }) });
    bt.addEventListener('click', () => {
      const v = vermi[i];
      if (v.stato === 'cammina') { v.vy = -8; v.ride = 55; v.vx += v.verso * 1.2; scoppio(v, v.p[0].x, 4); }
      alTocco(bt, { senzaScambi: true });
    });
    bottoni[i] = bt;
    document.body.append(bt);
  });
  misura();
  const sposta = (e) => { const p = e.touches?.[0] ?? e; if (p.clientX === undefined) return; puntatore.x = p.clientX; puntatore.y = p.clientY; puntatore.ultimo = performance.now(); };
  addEventListener('pointermove', sposta, { passive: true });
  addEventListener('pointerdown', sposta, { passive: true });
  addEventListener('resize', () => { larghezza = 0; misura(); });
  // quando l'app festeggia i vermi saltano fuori dalla terra; l'evento «scavano» serve alle prove e a chi vuole farli sparire
  addEventListener('vermi-festa', () => perOgniVerme((v) => {
    if (v.stato === 'sotto') { v.stato = 'esce'; v.vy = -9.5; scoppio(v, v.p[0].x, 9); } else if (v.stato === 'cammina') { v.vy = -9; v.ride = 70; }
  }));
  addEventListener('stato-oggi', (e) => { statoOggi = e.detail; if (!proximo) proximo = performance.now() + 20000; });
  addEventListener('vermi-consiglio', () => { proximo = 0; mostraConsiglio(performance.now()); }); // per le prove
  addEventListener('vermi-scavano', () => perOgniVerme(scava));
  addEventListener('vermi-esci', () => perOgniVerme((v) => { if (v.stato === 'sotto') { v.stato = 'esce'; v.vy = -9.5; scoppio(v, v.p[0].x, 9); } }));
  requestAnimationFrame(ciclo);
}

// Nel primo avvio i vermi non ci sono.
export function mostraVermiLiberi(si) {
  visibile = Boolean(si);
  if (strato) strato.hidden = !visibile;
  if (!visibile) bottoni.forEach((b) => { b.style.display = 'none'; });
}
