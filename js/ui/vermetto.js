// Rosso e Rossella: due vermetti disegnati nel codice (nessuna immagine). Stanno in piedi, ondeggiano, battono le palpebre,
// guardano il dito, ridono se li tocchi e cambiano vestito con le stagioni e le feste.
// Questo file sa solo disegnare e animare; le battute, i tocchi e i vestiti del giorno stanno in mascotte.js.
import { el } from '../util.js';

export const LATO = 96;
const SCURO = '#4a2a22';
const SEGMENTI = 8;
const ALTO = 8.1; // distanza fra un segmento e l'altro
const BASE_Y = 92;

const STILE = {
  rosso: { r0: 9.5, r1: 15.5, corpo: '#c2412c', luce: '#df6a52', anello: '#8f2e22' },
  rossella: { r0: 8.5, r1: 14.2, corpo: '#e0728f', luce: '#f6a9bd', anello: '#b94a69', occhiali: true },
};

// I colori e i segni di riconoscimento, per chi disegna il vermetto in altro modo.
export const COLORI = {
  rosso: { corpo: STILE.rosso.corpo, luce: STILE.rosso.luce, anello: STILE.rosso.anello },
  rossella: { corpo: STILE.rossella.corpo, luce: STILE.rossella.luce, anello: STILE.rossella.anello },
};

// Il segno che distingue i due: Rosso ha le sopracciglia folte da contadino, Rossella un fiocco rosa (e gli occhiali). (x, y) = centro del viso, hr = raggio della testa.
// occhi = [[x, y], [x, y]] i centri dei due occhi; bocca = [x, y] il centro della bocca.
export function disegnaFirma(c, chi, h, hr, occhi, bocca) {
  if (chi === 'rosso') {
    c.strokeStyle = '#2e1a11'; c.lineWidth = 3.6; c.lineCap = 'round';
    occhi.forEach(([x, y], n) => { const q = n === 0 ? -1 : 1; c.beginPath(); c.moveTo(x - q * hr * 0.34, y - hr * 0.62 - (n === 0 ? 0 : 1)); c.lineTo(x + q * hr * 0.32, y - hr * 0.5); c.stroke(); });
  } else {
    const bx = h.x - hr * 0.72; const by = h.y - hr * 0.9;
    c.fillStyle = '#ff7aa8'; c.strokeStyle = SCURO; c.lineWidth = 1.4; c.lineJoin = 'round';
    [-1, 1].forEach((s) => { c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + s * hr * 0.55, by - hr * 0.32); c.lineTo(bx + s * hr * 0.55, by + hr * 0.32); c.closePath(); c.fill(); c.stroke(); });
    c.beginPath(); c.arc(bx, by, hr * 0.14, 0, 7); c.fillStyle = '#ffd1e0'; c.fill(); c.stroke();
  }
}

// Un punto del corpo (i = 0 la coda in basso, i = SEGMENTI - 1 la testa), con ondeggio e inclinazione verso lo sguardo.
function punto(chi, i, tempo, guarda, fase) {
  const k = i / (SEGMENTI - 1);
  const curva = (chi === 'rosso' ? 8 : -8) * Math.sin(i * 0.78 + fase);
  const onda = 3.2 * k * Math.sin(tempo * 1.6 - i * 0.55 + fase);
  const inclina = guarda.x * 7 * k ** 1.5;
  return { x: LATO / 2 + curva * (0.35 + k * 0.65) + onda + inclina, y: BASE_Y - i * ALTO - r(chi, i) * 0.2 + guarda.y * 2 * k };
}
const r = (chi, i) => STILE[chi].r0 + (STILE[chi].r1 - STILE[chi].r0) * (i / (SEGMENTI - 1)) ** 1.2;

const cerchio = (c, x, y, raggio, colore) => { c.fillStyle = colore; c.beginPath(); c.arc(x, y, raggio, 0, 7); c.fill(); };
const ovale = (c, x, y, rx, ry, colore, rot = 0) => { c.fillStyle = colore; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); c.fill(); };
const poligono = (c, punti, colore) => { c.fillStyle = colore; c.beginPath(); punti.forEach(([x, y], n) => (n ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); c.strokeStyle = SCURO; c.lineWidth = 1.6; c.lineJoin = 'round'; c.stroke(); };

// I vestiti, disegnati intorno alla testa (centro h, raggio hr). Davanti = sopra al viso, dietro = prima del viso.
const VESTITI_DISEGNO = {
  inverno(c, h, hr, corpo) {
    const q = corpo[SEGMENTI - 2];
    c.strokeStyle = '#c73a3a'; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(q.x - r('rosso', 6) * 0.85, q.y + 5); c.quadraticCurveTo(q.x, q.y + 11, q.x + r('rosso', 6) * 0.85, q.y + 5); c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(q.x - 8, q.y + 8.5); c.lineTo(q.x - 8, q.y + 12); c.moveTo(q.x + 4, q.y + 9); c.lineTo(q.x + 4, q.y + 12.5); c.stroke();
    c.fillStyle = '#3b6ea5'; c.beginPath(); c.arc(h.x, h.y - hr * 0.35, hr * 0.98, Math.PI * 1.04, Math.PI * 1.96); c.closePath(); c.fill();
    c.strokeStyle = SCURO; c.lineWidth = 1.6; c.stroke();
    ovale(c, h.x, h.y - hr * 0.42, hr * 0.98, 3.4, '#2c5886');
    cerchio(c, h.x, h.y - hr * 1.42, 4.6, '#fff');
  },
  estate(c, h, hr) {
    ovale(c, h.x, h.y - hr * 0.72, hr * 1.55, 4.2, '#f2c75c');
    c.fillStyle = '#f2c75c'; c.beginPath(); c.arc(h.x, h.y - hr * 0.74, hr * 0.78, Math.PI, 0); c.fill();
    ovale(c, h.x, h.y - hr * 0.86, hr * 0.8, 2.2, '#d9534f');
  },
  primavera(c, h, hr) {
    const fx = h.x + hr * 0.5; const fy = h.y - hr * 0.95;
    for (let a = 0; a < 5; a++) ovale(c, fx + Math.cos(a * 1.2566) * 5, fy + Math.sin(a * 1.2566) * 5, 4.4, 3.2, '#ff8fb1', a * 1.2566);
    cerchio(c, fx, fy, 3.2, '#ffd54f');
  },
  autunno(c, h, hr) {
    ovale(c, h.x - 1, h.y - hr * 0.78, hr * 1.02, 5.2, '#8d5a3b');
    cerchio(c, h.x - 1, h.y - hr * 1.1, 2.4, '#6b3f27');
    ovale(c, h.x + hr * 0.6, h.y - hr * 1.0, 5.6, 3, '#e9822b', -0.7);
  },
  halloween(c, h, hr) {
    ovale(c, h.x, h.y - hr * 0.74, hr * 1.4, 3.6, '#4b2a6b');
    poligono(c, [[h.x - hr * 0.78, h.y - hr * 0.78], [h.x + hr * 0.12, h.y - hr * 2.15], [h.x + hr * 0.78, h.y - hr * 0.78]], '#5a3480');
    c.fillStyle = '#f08a24'; c.fillRect(h.x - hr * 0.74, h.y - hr * 1.05, hr * 1.48, 3.6);
  },
  natale(c, h, hr) {
    poligono(c, [[h.x - hr * 0.95, h.y - hr * 0.55], [h.x + hr * 0.5, h.y - hr * 1.9], [h.x + hr * 0.95, h.y - hr * 0.55]], '#d93636');
    ovale(c, h.x, h.y - hr * 0.55, hr * 1.02, 4.4, '#fff');
    cerchio(c, h.x + hr * 0.52, h.y - hr * 1.92, 4.2, '#fff');
  },
  festa(c, h, hr) {
    poligono(c, [[h.x - hr * 0.6, h.y - hr * 0.7], [h.x + hr * 0.1, h.y - hr * 2.0], [h.x + hr * 0.7, h.y - hr * 0.7]], '#3fa7e0');
    c.strokeStyle = '#ffd54f'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(h.x - hr * 0.35, h.y - hr * 1.08); c.lineTo(h.x + hr * 0.45, h.y - hr * 1.2); c.stroke();
    cerchio(c, h.x + hr * 0.1, h.y - hr * 2.02, 3.2, '#ffd54f');
    [[-1.3, -1.4, '#ff8a80'], [1.4, -1.6, '#66bb6a'], [1.5, -0.2, '#ffd54f']].forEach(([a, b, col]) => cerchio(c, h.x + a * hr, h.y + b * hr, 2.2, col));
  },
  pasqua(c, h, hr) {
    [-1, 1].forEach((s) => { ovale(c, h.x + s * hr * 0.42, h.y - hr * 1.55, 4.6, 12, '#fffdf6', s * 0.14); ovale(c, h.x + s * hr * 0.42, h.y - hr * 1.5, 2.2, 8.4, '#ffb3c6', s * 0.14); });
  },
  carnevale(c, h, hr) {
    poligono(c, [[h.x - hr * 0.8, h.y - hr * 0.7], [h.x - hr * 1.5, h.y - hr * 1.7], [h.x - hr * 0.1, h.y - hr * 0.95]], '#7e57c2');
    poligono(c, [[h.x + hr * 0.8, h.y - hr * 0.7], [h.x + hr * 1.5, h.y - hr * 1.7], [h.x + hr * 0.1, h.y - hr * 0.95]], '#ffb300');
    ovale(c, h.x, h.y - hr * 0.74, hr * 0.85, 3.4, '#e53935');
    cerchio(c, h.x - hr * 1.5, h.y - hr * 1.74, 3, '#ffd54f'); cerchio(c, h.x + hr * 1.5, h.y - hr * 1.74, 3, '#ffd54f');
  },
  compleanno(c, h, hr) {
    poligono(c, [[h.x - hr * 0.55, h.y - hr * 0.7], [h.x, h.y - hr * 1.95], [h.x + hr * 0.55, h.y - hr * 0.7]], '#ff7aa8');
    c.strokeStyle = '#fff'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(h.x - hr * 0.38, h.y - hr * 1.05); c.lineTo(h.x + hr * 0.3, h.y - hr * 1.3); c.stroke();
    cerchio(c, h.x, h.y - hr * 2.0, 3.4, '#ffd54f');
    [[-1.4, -1.0, '#4fc3f7'], [1.4, -1.3, '#ffd54f'], [-1.2, 0.2, '#66bb6a']].forEach(([a, b, col]) => cerchio(c, h.x + a * hr, h.y + b * hr, 2.2, col));
  },
  pioggia(c, h, hr) {
    const y = h.y - hr * 1.1;
    c.strokeStyle = SCURO; c.lineWidth = 2; c.beginPath(); c.moveTo(h.x + hr * 0.4, y); c.lineTo(h.x + hr * 0.4, h.y - hr * 0.5); c.stroke();
    c.fillStyle = '#3b8fd6'; c.beginPath(); c.ellipse(h.x + hr * 0.4, y, hr * 1.6, hr * 0.95, 0, Math.PI, 0); c.closePath(); c.fill(); c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 1.4;
    [-0.9, 0, 0.9].forEach((k) => { c.beginPath(); c.moveTo(h.x + hr * 0.4, y - hr * 0.94); c.lineTo(h.x + hr * (0.4 + k * 1.5), y); c.stroke(); });
  },
};
export const VESTITI_DISEGNATI = Object.keys(VESTITI_DISEGNO);

// Per chi disegna il vermetto in altro modo (per esempio coricato): mette il vestito sulla testa h, di raggio hr. corpo[corpo.length - 2] è il collo.
export function disegnaVestito(c, vestito, h, hr, corpo) {
  VESTITI_DISEGNO[vestito]?.(c, h, hr, corpo);
}

// Disegna un vermetto nel riquadro LATO x LATO che parte da (ox, oy), grande `scala` volte.
// stato: { chi, vestito, tempo, guarda: {x, y} (da -1 a 1), ride, chiuso, pensa, fase }
export function disegnaVermetto(c, stato, ox = 0, oy = 0, scala = 1) {
  const { chi, vestito, tempo = 0, guarda = { x: 0, y: 0 }, ride = false, chiuso = false, pensa = false, fase = 0 } = stato; // stato.espressione: contento | pensa | sorpreso | triste | arrabbiato | ride; stato.parla: la bocca si muove
  const stile = STILE[chi];
  c.save();
  c.translate(ox, oy);
  c.scale(scala, scala);
  const corpo = Array.from({ length: SEGMENTI }, (_, i) => punto(chi, i, tempo, guarda, fase));
  // ombra a terra
  ovale(c, corpo[0].x, BASE_Y + 3, 22, 4.4, 'rgba(0,0,0,.2)');
  // contorno poi corpo, così i segmenti si fondono
  for (let i = 0; i < SEGMENTI; i++) cerchio(c, corpo[i].x, corpo[i].y, r(chi, i) + 2.4, SCURO);
  for (let i = 0; i < SEGMENTI; i++) {
    const fascia = i === SEGMENTI - 4;
    cerchio(c, corpo[i].x, corpo[i].y, r(chi, i), fascia ? '#f6d3aa' : stile.corpo);
    if (!fascia) { c.globalAlpha = 0.5; cerchio(c, corpo[i].x - 3, corpo[i].y - r(chi, i) * 0.3, r(chi, i) * 0.36, stile.luce); c.globalAlpha = 1; }
    if (i > 0 && i < SEGMENTI - 1 && !fascia) {
      c.strokeStyle = stile.anello; c.lineWidth = 1.8; c.lineCap = 'round';
      c.beginPath(); c.arc(corpo[i].x, corpo[i].y + 1, r(chi, i) * 0.9, Math.PI * 0.12, Math.PI * 0.88); c.stroke();
    }
  }
  const h = corpo[SEGMENTI - 1];
  const hr = r(chi, SEGMENTI - 1);
  if (vestito === 'inverno' || vestito === 'carnevale') { /* il vestito si disegna dopo il viso */ }
  // viso: occhi grandi e luminosi, sopracciglia e bocca cambiano con l'espressione
  const esp = ride ? 'ride' : (stato.espressione ?? (pensa ? 'pensa' : 'contento'));
  const sorpreso = esp === 'sorpreso';
  const dx = guarda.x * 2.6 + (esp === 'pensa' ? -1.8 : 0);
  const dy = guarda.y * 2.4 + (esp === 'pensa' ? -2.6 : 0) + (esp === 'triste' ? 1.6 : 0);
  [-1, 1].forEach((s) => {
    const x = h.x + s * hr * 0.43;
    const y = h.y - hr * 0.1;
    if (chiuso || esp === 'ride') {
      c.strokeStyle = SCURO; c.lineWidth = 2.5; c.lineCap = 'round';
      c.beginPath(); c.arc(x, y + (esp === 'ride' ? 2 : 0), 4.4, esp === 'ride' ? Math.PI * 1.12 : 0.2, esp === 'ride' ? Math.PI * 1.88 : Math.PI - 0.2); c.stroke();
    } else {
      const re = hr * (sorpreso ? 0.5 : 0.44);
      cerchio(c, x, y, re, '#fffdf6'); c.strokeStyle = SCURO; c.lineWidth = 1.5; c.stroke();
      cerchio(c, x + dx, y + dy, re * (sorpreso ? 0.42 : 0.55), SCURO);
      cerchio(c, x + dx + 1.5, y + dy - 1.7, 1.6, '#fff');
      cerchio(c, x + dx - 1.2, y + dy + 1.6, 0.8, '#fff');
    }
    if (stile.occhiali) { c.strokeStyle = '#2f6fb0'; c.lineWidth = 1.7; c.beginPath(); c.arc(x, y, hr * 0.54, 0, 7); c.stroke(); }
    // sopracciglia
    if (esp !== 'contento' && esp !== 'ride' && !chiuso) {
      c.strokeStyle = SCURO; c.lineWidth = 2.2; c.lineCap = 'round';
      const by = y - hr * (sorpreso ? 0.9 : 0.75);
      c.beginPath();
      if (esp === 'arrabbiato') { c.moveTo(x - s * hr * 0.05, by + 3.5); c.lineTo(x + s * hr * 0.5, by - 1.5); }
      else if (esp === 'triste') { c.moveTo(x - s * hr * 0.05, by - 2); c.lineTo(x + s * hr * 0.5, by + 3); }
      else if (esp === 'pensa') { c.moveTo(x - hr * 0.3, by + (s < 0 ? 0 : -3)); c.lineTo(x + hr * 0.3, by + (s < 0 ? -2 : -4)); }
      else { c.arc(x, by + 4, hr * 0.32, Math.PI * 1.15, Math.PI * 1.85); }
      c.stroke();
    }
  });
  if (stile.occhiali) { c.strokeStyle = '#2f6fb0'; c.lineWidth = 1.7; c.beginPath(); c.moveTo(h.x - hr * 0.43 + hr * 0.54, h.y - hr * 0.1); c.lineTo(h.x + hr * 0.43 - hr * 0.55, h.y - hr * 0.1); c.stroke(); }
  c.strokeStyle = SCURO; c.lineWidth = 2.3; c.lineCap = 'round';
  c.beginPath();
  const apertura = stato.parla ? 1.5 + Math.abs(Math.sin(tempo * 13)) * 3.6 : 0; // mentre parla la bocca si apre e si chiude
  if (esp === 'ride') { c.fillStyle = SCURO; c.arc(h.x, h.y + hr * 0.3, 5.4, 0, Math.PI); c.fill(); ovale(c, h.x, h.y + hr * 0.3 + 3.4, 2.8, 1.7, '#ff8a80'); }
  else if (apertura) { c.fillStyle = SCURO; c.ellipse(h.x, h.y + hr * 0.38, 3.8 + apertura * 0.3, apertura, 0, 0, 7); c.fill(); }
  else if (sorpreso) { c.fillStyle = SCURO; c.ellipse(h.x, h.y + hr * 0.4, 3, 4.2, 0, 0, 7); c.fill(); }
  else if (esp === 'pensa') { c.arc(h.x + 1, h.y + hr * 0.5, 2.3, 0, 7); c.stroke(); }
  else if (esp === 'triste') { c.arc(h.x, h.y + hr * 0.62, 5, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
  else if (esp === 'arrabbiato') { c.moveTo(h.x - 5, h.y + hr * 0.45); c.lineTo(h.x + 5, h.y + hr * 0.4); c.stroke(); }
  else { c.arc(h.x, h.y + hr * 0.18, 5.6, 0.3, Math.PI - 0.3); c.stroke(); }
  // guance
  c.globalAlpha = 0.45; cerchio(c, h.x - hr * 0.78, h.y + hr * 0.3, 2.8, '#ff8a80'); cerchio(c, h.x + hr * 0.78, h.y + hr * 0.3, 2.8, '#ff8a80'); c.globalAlpha = 1;
  disegnaFirma(c, chi, h, hr, [-1, 1].map((s) => [h.x + s * hr * 0.42, h.y - hr * 0.1]), [h.x, h.y + hr * 0.22]);
  VESTITI_DISEGNO[vestito]?.(c, h, hr, corpo);
  c.restore();
}

// ---- Il vermetto sulla pagina: un riquadro che si anima da solo, tutti con un unico ciclo di animazione ----
const vivi = new Set();
const puntatore = { x: 0, y: 0, ultimo: 0 };
let avviato = false;

function ridisegna(tela) {
  const d = tela.__vermetto;
  const c = d.contesto;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, tela.width, tela.height);
  c.scale(d.dpr, d.dpr);
  disegnaVermetto(c, d.stato);
}

function aggiornaSguardo(tela, adesso) {
  const d = tela.__vermetto;
  const r = tela.getBoundingClientRect();
  let bersaglio = { x: 0, y: 0 };
  if (adesso - puntatore.ultimo < 6000) {
    const vx = puntatore.x - (r.left + r.width / 2);
    const vy = puntatore.y - (r.top + r.height * 0.2);
    const dist = Math.hypot(vx, vy) || 1;
    const forza = Math.min(1, dist / 90);
    bersaglio = { x: (vx / dist) * forza, y: (vy / dist) * forza };
  } else if (adesso > d.prossimoSguardo) {
    d.sguardo = { x: Math.random() * 2 - 1, y: (Math.random() - 0.5) };
    d.prossimoSguardo = adesso + 1800 + Math.random() * 2600;
  }
  if (adesso - puntatore.ultimo >= 6000) bersaglio = d.sguardo;
  d.stato.guarda.x += (bersaglio.x - d.stato.guarda.x) * 0.18;
  d.stato.guarda.y += (bersaglio.y - d.stato.guarda.y) * 0.18;
}

function ciclo(adesso) {
  const fermo = document.documentElement.dataset.movimento === 'ridotto' || document.hidden;
  for (const tela of vivi) {
    if (!tela.isConnected) { vivi.delete(tela); continue; }
    const r = tela.getBoundingClientRect();
    if (fermo || r.bottom < 0 || r.top > innerHeight || !r.width) continue;
    const d = tela.__vermetto;
    d.stato.tempo = adesso / 1000;
    aggiornaSguardo(tela, adesso);
    d.stato.chiuso = adesso % 4600 < 130 + d.fase * 10 && adesso > d.nonBattere; // ogni tanto una palpebra
    d.stato.ride = adesso < d.rideFinoA;
    d.stato.parla = adesso < d.parlaFinoA;
    if (d.espressioneFinoA && adesso > d.espressioneFinoA) { d.stato.espressione = d.espressioneBase; d.espressioneFinoA = 0; }
    tela.parentElement.dataset.ride = d.stato.ride ? '1' : '0';
    tela.parentElement.dataset.sguardoX = d.stato.guarda.x.toFixed(2);
    tela.parentElement.dataset.sguardoY = d.stato.guarda.y.toFixed(2);
    ridisegna(tela);
  }
  requestAnimationFrame(ciclo);
}

function avvia() {
  if (avviato) return;
  avviato = true;
  const alPuntatore = (e) => {
    const p = e.touches?.[0] ?? e;
    if (p.clientX === undefined) return;
    puntatore.x = p.clientX; puntatore.y = p.clientY; puntatore.ultimo = performance.now();
  };
  addEventListener('pointermove', alPuntatore, { passive: true });
  addEventListener('pointerdown', alPuntatore, { passive: true });
  addEventListener('touchmove', alPuntatore, { passive: true });
  requestAnimationFrame(ciclo);
}

// Crea il riquadro del vermetto `chi` ('rosso' | 'rossella'). variante: 'pensa' (Rossella) o 'ride'.
export function creaVermetto(chi, variante, vestito) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const tela = el('canvas', { class: 'corpo-vermetto', width: LATO * dpr, height: LATO * dpr, 'aria-hidden': 'true' });
  tela.__vermetto = {
    contesto: tela.getContext('2d'), dpr, fase: Math.random() * 6, sguardo: { x: 0, y: 0 }, prossimoSguardo: 0, rideFinoA: 0, nonBattere: 0, parlaFinoA: 0, espressioneBase: variante === 'pensa' ? 'pensa' : (variante === 'ride' ? 'contento' : (variante ?? 'contento')), espressioneFinoA: 0,
    stato: { chi, vestito, tempo: 0, guarda: { x: 0, y: 0 }, ride: false, chiuso: false, pensa: false, espressione: variante === 'pensa' ? 'pensa' : (variante === 'ride' ? 'contento' : (variante ?? 'contento')), parla: false, fase: Math.random() * 6 },
  };
  tela.__vermetto.stato.fase = tela.__vermetto.fase;
  vivi.add(tela);
  avvia();
  ridisegna(tela);
  return tela;
}

export function cambiaVestito(tela, vestito) {
  tela.__vermetto.stato.vestito = vestito;
  ridisegna(tela);
}

// Una risata di un momento (al tocco).
export function ridiAncora(tela, millisecondi = 900) {
  tela.__vermetto.rideFinoA = performance.now() + millisecondi;
}

// Il vermetto fa un'espressione per un po' (poi torna a quella di prima).
export function impostaEspressione(tela, espressione, millisecondi = 2500) {
  const d = tela.__vermetto;
  d.stato.espressione = espressione;
  d.espressioneFinoA = performance.now() + millisecondi;
}

// La bocca si muove come se parlasse, per un po'.
export function parlaPer(tela, millisecondi = 1800, ritardo = 0) {
  const d = tela.__vermetto;
  setTimeout(() => { d.parlaFinoA = performance.now() + millisecondi; }, ritardo);
}
