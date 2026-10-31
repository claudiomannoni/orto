// I vermetti «vivi»: due vermi disegnati a segmenti che strisciano davvero (ogni segmento segue quello davanti, con la gravità),
// guardano il dito, si inarcano quando camminano e saltano se li tocchi. Tutto calcolato sul telefono, nessun file di animazione.
import { el } from '../util.js';

const ALTEZZA = 150;
const TERRA = 44; // altezza della fascia di terra in basso
const SCURO = '#4a2a22';

const VERMI = [
  { chi: 'rosso', n: 15, r: 14.5, lungo: 11.5, corpo: '#d0473c', luce: '#ea7262', anello: '#a8332b', partenza: 0.3, zona: [0, 0.55] },
  { chi: 'rossella', n: 13, r: 12.5, lungo: 10.5, corpo: '#d0473c', luce: '#ea7262', anello: '#a8332b', occhiali: true, partenza: 0.8, zona: [0.45, 1] },
];

function terreno(larghezza, dpr) {
  const tela = document.createElement('canvas');
  tela.width = larghezza * dpr;
  tela.height = ALTEZZA * dpr;
  const c = tela.getContext('2d');
  c.scale(dpr, dpr);
  const y = ALTEZZA - TERRA;
  const sfumo = c.createLinearGradient(0, y, 0, ALTEZZA);
  sfumo.addColorStop(0, '#6b4a36');
  sfumo.addColorStop(1, '#4a3225');
  c.fillStyle = sfumo;
  c.beginPath();
  c.moveTo(0, y + 6);
  for (let x = 0; x <= larghezza; x += 12) c.lineTo(x, y + 2 + Math.sin(x * 0.07) * 3);
  c.lineTo(larghezza, ALTEZZA);
  c.lineTo(0, ALTEZZA);
  c.fill();
  // sassolini e granelli (sempre gli stessi: il caso è con un seme fisso)
  let seme = 7;
  const caso = () => { seme = (seme * 16807) % 2147483647; return seme / 2147483647; };
  for (let i = 0; i < larghezza / 9; i++) {
    c.fillStyle = caso() > 0.5 ? '#7d5a44' : '#3a251b';
    c.beginPath();
    c.ellipse(caso() * larghezza, y + 12 + caso() * (TERRA - 16), 1.5 + caso() * 3, 1 + caso() * 2, 0, 0, 7);
    c.fill();
  }
  // fili d'erba sul bordo
  c.strokeStyle = '#4f9a4b';
  c.lineCap = 'round';
  c.lineWidth = 2.2;
  for (let x = 4; x < larghezza; x += 9 + caso() * 14) {
    const h = 7 + caso() * 11;
    const base = y + 2 + Math.sin(x * 0.07) * 3;
    c.beginPath();
    c.moveTo(x, base);
    c.quadraticCurveTo(x + (caso() - 0.5) * 8, base - h * 0.6, x + (caso() - 0.5) * 12, base - h);
    c.stroke();
  }
  return tela;
}

function nuovoVerme(def, larghezza) {
  const terra = ALTEZZA - TERRA;
  const x0 = Math.max(larghezza * def.partenza, def.n * def.lungo + def.r + 4);
  return {
    ...def,
    p: Array.from({ length: def.n }, (_, i) => ({ x: x0 - i * def.lungo, y: terra - def.r })),
    vx: 0, vy: 0, verso: 1, meta: x0, riposo: 40 + Math.random() * 80,
    salto: 0, ride: 0, occhio: 120 + Math.random() * 200, fase: Math.random() * 6,
  };
}

function passo(v, larghezza, dt, puntatore) {
  const terra = ALTEZZA - TERRA - v.r;
  const testa = v.p[0];
  const sulTerreno = testa.y >= terra - 0.5;
  // dove vuole andare: verso il dito se è vicino, altrimenti passeggia e ogni tanto si ferma
  if (puntatore.attivo) { v.meta = Math.max(v.zona[0] * larghezza + 24, Math.min(v.zona[1] * larghezza - 24, puntatore.x)); v.riposo = 20; }
  else if (--v.riposo <= 0) {
    if (Math.random() < 0.3) v.riposo = 60 + Math.random() * 120;
    else { v.meta = larghezza * v.zona[0] + 30 + Math.random() * (larghezza * (v.zona[1] - v.zona[0]) - 60); v.riposo = 90 + Math.random() * 150; }
  }
  const distanza = v.meta - testa.x;
  const velocitaMax = puntatore.attivo ? 2.6 : 1.1;
  if (sulTerreno) {
    const voglia = Math.abs(distanza) > 8 ? Math.sign(distanza) * velocitaMax : 0;
    v.vx += (voglia - v.vx) * 0.12 * dt;
  }
  v.vy += 0.55 * dt;
  testa.x += v.vx * dt;
  testa.y += v.vy * dt;
  if (testa.y > terra) { testa.y = terra; v.vy = 0; }
  testa.x = Math.max(v.r + v.zona[0] * larghezza, Math.min(v.zona[1] * larghezza - v.r, testa.x));
  if (Math.abs(v.vx) > 0.25) v.verso = Math.sign(v.vx);
  // ogni segmento segue quello davanti, restando a distanza fissa e senza entrare nella terra
  for (let i = 1; i < v.p.length; i++) {
    const a = v.p[i - 1];
    const b = v.p[i];
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    b.x = a.x + dx * v.lungo;
    b.y = a.y + dy * v.lungo + 0.35 * dt; // la coda pesa verso il basso
    if (b.y > terra) b.y = terra;
  }
  v.fase += dt * (0.05 + Math.min(1, Math.abs(v.vx)) * 0.11);
  if (v.ride > 0) v.ride -= dt;
  v.occhio -= dt;
  if (v.occhio < -6) v.occhio = 120 + Math.random() * 240;
}

function disegna(c, v, puntatore) {
  const n = v.p.length;
  const moto = Math.min(1, Math.abs(v.vx) / 1.2);
  const punti = v.p.map((p, i) => {
    const onda = Math.max(0, Math.sin(v.fase * 6 - i * 0.85));
    return { x: p.x, y: p.y - moto * 8 * onda * (i / n < 0.9 ? 1 : 0.4) };
  });
  const raggio = (i) => v.r * (0.84 + 0.16 * (1 - i / (n - 1)));
  // ombra
  c.fillStyle = 'rgba(0,0,0,.22)';
  const t0 = punti[0];
  const tn = punti[n - 1];
  c.beginPath();
  c.ellipse((t0.x + tn.x) / 2, ALTEZZA - TERRA + 4, Math.abs(t0.x - tn.x) / 2 + v.r, 5, 0, 0, 7);
  c.fill();
  // contorno, poi corpo (così i segmenti si fondono)
  c.fillStyle = SCURO;
  for (let i = n - 1; i >= 0; i--) { c.beginPath(); c.arc(punti[i].x, punti[i].y, raggio(i) + 2.6, 0, 7); c.fill(); }
  for (let i = n - 1; i >= 0; i--) {
    const fascia = i === Math.floor(n * 0.3);
    c.fillStyle = fascia ? '#f6d3aa' : v.corpo;
    c.beginPath(); c.arc(punti[i].x, punti[i].y, raggio(i), 0, 7); c.fill();
    if (!fascia) {
      c.fillStyle = v.luce; c.globalAlpha = 0.5;
      c.beginPath(); c.arc(punti[i].x - 2, punti[i].y - raggio(i) * 0.45, raggio(i) * 0.4, 0, 7); c.fill();
      c.globalAlpha = 1;
    }
    if (i > 0 && i < n - 1) { // anellino fra un segmento e l'altro
      c.strokeStyle = v.anello; c.lineWidth = 2; c.lineCap = 'round';
      const a = punti[i - 1];
      const b = punti[i + 1];
      const l = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const nx = -(a.y - b.y) / l;
      const ny = (a.x - b.x) / l;
      const q = raggio(i) * 0.86;
      const sx = (a.x - b.x) / l * 5;
      const sy = (a.y - b.y) / l * 5;
      c.beginPath();
      c.moveTo(punti[i].x - nx * q + sx, punti[i].y - ny * q + sy);
      c.lineTo(punti[i].x + nx * q + sx, punti[i].y + ny * q + sy);
      c.stroke();
    }
  }
  // la faccia, sulla testa, rivolta dove va
  const h = punti[0];
  const f = v.verso;
  const occhi = [[f * 3, -4.5], [f * 11, -4.5]];
  const chiuso = v.occhio < 0 || v.ride > 0;
  const guarda = puntatore.vicino ? Math.atan2(puntatore.y - h.y, puntatore.x - h.x) : (f > 0 ? 0 : Math.PI);
  occhi.forEach(([ox, oy]) => {
    const x = h.x + ox;
    const y = h.y + oy;
    if (chiuso) {
      c.strokeStyle = SCURO; c.lineWidth = 2.4; c.lineCap = 'round';
      c.beginPath(); c.arc(x, y + (v.ride > 0 ? 2 : 0), 3.6, v.ride > 0 ? Math.PI * 1.1 : 0.15, v.ride > 0 ? Math.PI * 1.9 : Math.PI - 0.15); c.stroke();
    } else {
      c.fillStyle = '#fffdf6'; c.beginPath(); c.arc(x, y, 5.4, 0, 7); c.fill();
      c.strokeStyle = SCURO; c.lineWidth = 1.4; c.stroke();
      c.fillStyle = SCURO; c.beginPath(); c.arc(x + Math.cos(guarda) * 2.2, y + Math.sin(guarda) * 2.2, 2.7, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x + Math.cos(guarda) * 2.2 + 0.9, y + Math.sin(guarda) * 2.2 - 1, 0.9, 0, 7); c.fill();
    }
    if (v.occhiali) { c.strokeStyle = SCURO; c.lineWidth = 1.8; c.beginPath(); c.arc(x, y, 7.2, 0, 7); c.stroke(); }
  });
  // bocca: sorriso, o risata aperta se lo hai toccato
  c.strokeStyle = SCURO; c.lineWidth = 2.2; c.lineCap = 'round';
  c.beginPath();
  if (v.ride > 0) { c.fillStyle = SCURO; c.arc(h.x + f * 9, h.y + 4.5, 4.2, 0, Math.PI); c.fill(); } else { c.arc(h.x + f * 8, h.y + 3, 4.5, 0.25, Math.PI - 0.25); c.stroke(); }
}

// Il riquadro con i due vermi. Si mette in una schermata: si ferma da solo quando la schermata cambia o non si vede.
export function palcoVermi() {
  const tela = el('canvas', { class: 'palco-vermi', 'aria-hidden': 'true' });
  const palco = el('div', { class: 'palco-vermi-box' }, tela);
  const contesto = tela.getContext('2d');
  const puntatore = { x: 0, y: 0, attivo: false, vicino: false, ultimo: 0 };
  let vermi = [];
  let terra = null;
  let larghezza = 0;
  let dpr = 1;
  let ultimoGiro = 0;
  let giri = 0;

  const misura = () => {
    const w = Math.round(palco.clientWidth);
    if (!w || w === larghezza) return;
    larghezza = w;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    tela.width = w * dpr;
    tela.height = ALTEZZA * dpr;
    tela.style.height = `${ALTEZZA}px`;
    terra = terreno(w, dpr);
    vermi = VERMI.map((d) => nuovoVerme(d, w));
  };

  const fotogramma = (dt) => {
    contesto.setTransform(1, 0, 0, 1, 0, 0);
    contesto.clearRect(0, 0, tela.width, tela.height);
    contesto.drawImage(terra, 0, 0);
    contesto.scale(dpr, dpr);
    puntatore.vicino = Date.now() - puntatore.ultimo < 2500;
    puntatore.attivo = Date.now() - puntatore.ultimo < 1500;
    // un solo vermetto per volta segue il dito: il più vicino
    const piuVicino = puntatore.attivo ? vermi.reduce((a, b) => (Math.abs(a.p[0].x - puntatore.x) < Math.abs(b.p[0].x - puntatore.x) ? a : b)) : null; // il più vicino al dito
    vermi.forEach((v) => {
      passo(v, larghezza, dt, { ...puntatore, attivo: puntatore.attivo && v === piuVicino });
      disegna(contesto, v, puntatore);
    });
  };

  const aggiorna = (adesso) => {
    giri++;
    if (!tela.isConnected && giri > 8) return; // la schermata è cambiata: ci si ferma
    if (tela.isConnected && !document.hidden) {
      misura();
      if (larghezza) fotogramma(Math.min(2.5, ((adesso - ultimoGiro) / 16.7) || 1));
    }
    ultimoGiro = adesso;
    requestAnimationFrame(aggiorna);
  };

  const sposta = (e) => {
    const r = tela.getBoundingClientRect();
    puntatore.x = e.clientX - r.left;
    puntatore.y = e.clientY - r.top;
    puntatore.ultimo = Date.now();
  };
  tela.addEventListener('pointermove', sposta, { passive: true });
  tela.addEventListener('pointerdown', (e) => {
    sposta(e);
    const toccato = vermi.find((v) => v.p.some((p) => Math.hypot(p.x - puntatore.x, p.y - puntatore.y) < v.r + 10));
    if (toccato) { toccato.vy = -9.5; toccato.ride = 55; toccato.vx += toccato.verso * 1.5; }
  });

  if (document.documentElement.dataset.movimento === 'ridotto') {
    requestAnimationFrame(() => { misura(); if (larghezza) fotogramma(0); });
  } else {
    requestAnimationFrame(aggiorna);
  }
  return palco;
}
