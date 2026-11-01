// «Il giardino dei vermi»: un gioco antistress a parte. Rosso e Rossella si prendono col dito, si lanciano, si solleticano,
// si infilano nella terra (la si vede in sezione) e si nutrono con foglie e compost. Si contano i minuti di relax, solo per te.
// La fisica (corda di punti) sta in js/motore/corda.js, il conto dei minuti in js/motore/relax.js.
import { el, aggiungi, oggiISO } from '../util.js';
import { t } from '../i18n.js';
import { leggi, imposta } from '../store/impostazioni.js';
import { creaCorda, passoCorda, lanciaCorda } from '../motore/corda.js';
import { pulisciRelax, aggiungiSecondi, minutiDelGiorno, minutiTotali, serieRilassata } from '../motore/relax.js';
import { vestitoAttuale } from '../ui/mascotte.js';
import { disegnaVestito, disegnaFirma, COLORI } from '../ui/vermetto.js';

const ALTEZZA = 380;
const SCURO = '#4a2a22';
const SPECIE = [
  { chi: 'rosso', n: 13, r: 12.5, lungo: 10.5, partenza: 0.3, occhiali: false },
  { chi: 'rossella', n: 11, r: 10.8, lungo: 9.5, partenza: 0.7, occhiali: true },
];

const caso = (a, b) => a + Math.random() * (b - a);

function nuovoVerme(def, larghezza, suolo) {
  const corda = creaCorda(def.n, def.lungo, larghezza * def.partenza, suolo - def.r - 4);
  return { ...def, corda, dentro: false, ride: 0, mangia: 0, occhio: caso(100, 300), fase: caso(0, 6), intento: null, ferma: 0, verso: 1, traccia: [] };
}

function sfondo(larghezza, suolo, dpr) {
  const tela = document.createElement('canvas');
  tela.width = larghezza * dpr;
  tela.height = ALTEZZA * dpr;
  const c = tela.getContext('2d');
  c.scale(dpr, dpr);
  const cielo = c.createLinearGradient(0, 0, 0, suolo);
  cielo.addColorStop(0, '#bfe3f5');
  cielo.addColorStop(1, '#eaf6e4');
  c.fillStyle = cielo;
  c.fillRect(0, 0, larghezza, suolo);
  const terra = c.createLinearGradient(0, suolo, 0, ALTEZZA);
  terra.addColorStop(0, '#7a553c');
  terra.addColorStop(1, '#3f2a1e');
  c.fillStyle = terra;
  c.beginPath();
  c.moveTo(0, suolo + 3);
  for (let x = 0; x <= larghezza; x += 10) c.lineTo(x, suolo + Math.sin(x * 0.06) * 2.5);
  c.lineTo(larghezza, ALTEZZA);
  c.lineTo(0, ALTEZZA);
  c.fill();
  let seme = 5;
  const r = () => { seme = (seme * 16807) % 2147483647; return seme / 2147483647; };
  for (let i = 0; i < larghezza * 0.9; i++) {
    c.fillStyle = r() > 0.55 ? '#8d6a50' : '#2f1f16';
    c.globalAlpha = 0.55;
    c.beginPath();
    c.ellipse(r() * larghezza, suolo + 8 + r() * (ALTEZZA - suolo - 10), 1 + r() * 2.6, 0.8 + r() * 1.6, r() * 3, 0, 7);
    c.fill();
  }
  c.globalAlpha = 1;
  c.strokeStyle = '#4f9a4b';
  c.lineCap = 'round';
  c.lineWidth = 2.2;
  for (let x = 4; x < larghezza; x += 7 + r() * 11) {
    const h = 6 + r() * 12;
    const base = suolo + Math.sin(x * 0.06) * 2.5;
    c.beginPath();
    c.moveTo(x, base);
    c.quadraticCurveTo(x + (r() - 0.5) * 7, base - h * 0.6, x + (r() - 0.5) * 12, base - h);
    c.stroke();
  }
  return tela;
}

function disegnaVerme(c, v, puntatore) {
  const p = v.corda.p;
  const n = p.length;
  const raggio = (i) => v.r * (0.84 + 0.16 * (1 - i / (n - 1)));
  const col = COLORI[v.chi];
  c.fillStyle = SCURO;
  for (let i = n - 1; i >= 0; i--) { c.beginPath(); c.arc(p[i].x, p[i].y, raggio(i) + 2.4, 0, 7); c.fill(); }
  for (let i = n - 1; i >= 0; i--) {
    const fascia = i === Math.floor(n * 0.3);
    c.fillStyle = fascia ? '#f6d3aa' : col.corpo;
    c.beginPath(); c.arc(p[i].x, p[i].y, raggio(i), 0, 7); c.fill();
    if (!fascia) {
      c.fillStyle = col.luce; c.globalAlpha = 0.5;
      c.beginPath(); c.arc(p[i].x - 2, p[i].y - raggio(i) * 0.45, raggio(i) * 0.4, 0, 7); c.fill();
      c.globalAlpha = 1;
    }
    if (i > 0 && i < n - 1 && !fascia) {
      const a = p[i - 1]; const b = p[i + 1];
      const l = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const nx = -(a.y - b.y) / l; const ny = (a.x - b.x) / l;
      const q = raggio(i) * 0.86; const sx = (a.x - b.x) / l * 4; const sy = (a.y - b.y) / l * 4;
      c.strokeStyle = col.anello; c.lineWidth = 1.8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(p[i].x - nx * q + sx, p[i].y - ny * q + sy); c.lineTo(p[i].x + nx * q + sx, p[i].y + ny * q + sy); c.stroke();
    }
  }
  const h = p[0];
  const f = v.verso;
  const guarda = puntatore.attivo ? Math.atan2(puntatore.y - h.y, puntatore.x - h.x) : (f > 0 ? 0 : Math.PI);
  const chiuso = v.occhio < 0 || v.ride > 0;
  [[f * 3, -4], [f * 10, -4]].forEach(([ox, oy]) => {
    const x = h.x + ox; const y = h.y + oy;
    if (chiuso) {
      c.strokeStyle = SCURO; c.lineWidth = 2.2; c.lineCap = 'round';
      c.beginPath(); c.arc(x, y + (v.ride > 0 ? 2 : 0), 3.2, v.ride > 0 ? Math.PI * 1.1 : 0.15, v.ride > 0 ? Math.PI * 1.9 : Math.PI - 0.15); c.stroke();
    } else {
      c.fillStyle = '#fffdf6'; c.beginPath(); c.arc(x, y, 4.9, 0, 7); c.fill();
      c.strokeStyle = SCURO; c.lineWidth = 1.3; c.stroke();
      c.fillStyle = SCURO; c.beginPath(); c.arc(x + Math.cos(guarda) * 2, y + Math.sin(guarda) * 2, 2.4, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x + Math.cos(guarda) * 2 + 0.8, y + Math.sin(guarda) * 2 - 0.9, 0.8, 0, 7); c.fill();
    }
    if (v.occhiali) { c.strokeStyle = SCURO; c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, 6.4, 0, 7); c.stroke(); }
  });
  c.strokeStyle = SCURO; c.lineWidth = 2; c.lineCap = 'round';
  c.beginPath();
  if (v.ride > 0) { c.fillStyle = SCURO; c.arc(h.x + f * 8, h.y + 4, 3.8, 0, Math.PI); c.fill(); }
  else if (v.mangia > 0) { const a = 2 + Math.abs(Math.sin(v.mangia * 0.5)) * 2.6; c.fillStyle = SCURO; c.ellipse(h.x + f * 8, h.y + 4, 3.4, a, 0, 0, 7); c.fill(); }
  else { c.arc(h.x + f * 7, h.y + 2.6, 4, 0.25, Math.PI - 0.25); c.stroke(); }
  disegnaFirma(c, v.chi, h, v.r, [[h.x + f * 3, h.y - 4], [h.x + f * 10, h.y - 4]], [h.x + f * 7, h.y + 3]);
  disegnaVestito(c, vestitoAttuale(), h, v.r, [...p].reverse());
}

function disegnaCibo(c, o) {
  c.save();
  c.translate(o.x, o.y);
  if (o.tipo === 'foglia') {
    c.rotate(o.rot);
    c.fillStyle = '#5aa84f'; c.strokeStyle = '#2f6b2a'; c.lineWidth = 1.6;
    c.beginPath(); c.ellipse(0, 0, 13, 7, 0, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-11, 0); c.lineTo(11, 0); c.stroke();
  } else {
    c.fillStyle = '#6b4a2e'; c.strokeStyle = '#3f2a1e'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#a07a50';
    [[-3, -2], [3, 1], [0, 4]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill(); });
  }
  c.restore();
}

function cuore(c, x, y, s, a) {
  c.globalAlpha = a; c.fillStyle = '#ff5c8a';
  c.beginPath();
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.6, y - s * 1.1, x, y - s * 0.3);
  c.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.4, y - s * 0.2, x, y + s * 0.9);
  c.fill();
  c.globalAlpha = 1;
}

export async function monta(contenitore) {
  const impostazioni = await leggi();
  let relax = pulisciRelax(impostazioni.relax);
  const oggi = oggiISO();
  let secondiDaSalvare = 0;
  let ultimaAttivita = 0;

  const tela = el('canvas', { class: 'giardino-vermi', role: 'img', 'aria-label': t('vermi.canvas') });
  const contesto = tela.getContext('2d');
  const riepilogo = el('p', { class: 'aiuto', role: 'status', id: 'relax-riepilogo' });
  const aggiornaRiepilogo = () => {
    const oggiMin = minutiDelGiorno(relax, oggi);
    const totale = minutiTotali(relax);
    const serie = serieRilassata(relax, oggi);
    riepilogo.textContent = [t('vermi.relax.oggi', { n: oggiMin }), t('vermi.relax.totale', { n: totale }), serie > 1 ? t('vermi.relax.serie', { n: serie }) : null].filter(Boolean).join(' · ');
  };
  aggiornaRiepilogo();

  const salva = async () => { if (secondiDaSalvare > 0) { secondiDaSalvare = 0; await imposta('relax', relax); } };

  let larghezza = 0;
  let dpr = 1;
  let fondo = null;
  let suolo = 0;
  let vermi = [];
  const cibo = [];
  const particelle = [];
  const puntatore = { x: 0, y: 0, attivo: false, ultimo: 0 };
  let preso = null; // { tipo: 'verme', verme, indice } | { tipo: 'cibo', oggetto }
  let storia = [];

  const misura = () => {
    const w = Math.round(tela.parentElement?.clientWidth ?? 0);
    if (!w || w === larghezza) return;
    larghezza = w;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    tela.width = w * dpr;
    tela.height = ALTEZZA * dpr;
    tela.style.height = `${ALTEZZA}px`;
    suolo = Math.round(ALTEZZA * 0.46);
    fondo = sfondo(w, suolo, dpr);
    vermi = SPECIE.map((d) => nuovoVerme(d, w, suolo));
  };

  const coordinate = (e) => { const r = tela.getBoundingClientRect(); return { x: (e.clientX - r.left) * (larghezza / r.width), y: (e.clientY - r.top) * (ALTEZZA / r.height) }; };

  tela.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    tela.setPointerCapture?.(e.pointerId);
    const { x, y } = coordinate(e);
    puntatore.x = x; puntatore.y = y; puntatore.attivo = true; puntatore.ultimo = performance.now();
    ultimaAttivita = performance.now();
    storia = [{ x, y, t: performance.now() }];
    // prima il cibo, poi i vermi: il punto più vicino entro 30 px
    const o = cibo.find((c) => Math.hypot(c.x - x, c.y - y) < 24);
    if (o) { preso = { tipo: 'cibo', oggetto: o, inizio: { x, y, t: performance.now() } }; o.vx = 0; o.vy = 0; return; }
    let migliore = null;
    vermi.forEach((v) => v.corda.p.forEach((q, i) => { const d = Math.hypot(q.x - x, q.y - y); if (d < 30 && (!migliore || d < migliore.d)) migliore = { d, verme: v, indice: i }; }));
    if (migliore) preso = { tipo: 'verme', verme: migliore.verme, indice: migliore.indice, inizio: { x, y, t: performance.now() }, mosso: false };
  });
  tela.addEventListener('pointermove', (e) => {
    const { x, y } = coordinate(e);
    puntatore.x = x; puntatore.y = y; puntatore.attivo = true; puntatore.ultimo = performance.now();
    if (preso) {
      ultimaAttivita = performance.now();
      storia.push({ x, y, t: performance.now() });
      if (storia.length > 6) storia.shift();
      if (preso.tipo === 'verme' && Math.hypot(x - preso.inizio.x, y - preso.inizio.y) > 8) preso.mosso = true;
    }
  });
  const rilascia = () => {
    if (!preso) return;
    const ultimo = storia[storia.length - 1];
    const primo = storia[0];
    const dt = Math.max(16, (ultimo?.t ?? 0) - (primo?.t ?? 0));
    const vx = ((ultimo?.x ?? 0) - (primo?.x ?? 0)) / dt * 16;
    const vy = ((ultimo?.y ?? 0) - (primo?.y ?? 0)) / dt * 16;
    if (preso.tipo === 'cibo') { preso.oggetto.vx = vx; preso.oggetto.vy = vy; }
    else {
      const v = preso.verme;
      if (!preso.mosso && performance.now() - preso.inizio.t < 350) { // un tocco: solletico
        v.ride = 70;
        v.corda.p.forEach((q, i) => { q.px = q.x - Math.sin(i * 1.3) * 3; q.py = q.y - 4 - Math.cos(i * 1.1) * 2; });
      } else {
        const forza = Math.min(18, Math.hypot(vx, vy)) / (Math.hypot(vx, vy) || 1);
        v.corda.p.forEach((q) => { q.px = q.x - vx * forza * 1.1; q.py = q.y - vy * forza * 1.1; });
        if (Math.hypot(vx, vy) > 6) v.ride = 40;
      }
    }
    preso = null;
  };
  tela.addEventListener('pointerup', rilascia);
  tela.addEventListener('pointercancel', rilascia);
  tela.addEventListener('pointerleave', () => { puntatore.attivo = false; });

  const dai = (tipo) => {
    cibo.push({ tipo, x: caso(40, Math.max(60, larghezza - 40)), y: 14, vx: caso(-1, 1), vy: 0, rot: caso(0, 6) });
    ultimaAttivita = performance.now();
    if (cibo.length > 12) cibo.shift();
  };

  const sbocciaCuori = (x, y) => { for (let i = 0; i < 4; i++) particelle.push({ tipo: 'cuore', x: x + caso(-10, 10), y, vx: caso(-0.4, 0.4), vy: caso(-1.6, -0.8), vita: 50 + caso(0, 20) }); };
  const spruzzaTerra = (x) => { for (let i = 0; i < 7; i++) particelle.push({ tipo: 'terra', x, y: suolo, vx: caso(-2, 2), vy: caso(-3, -1), vita: 26 }); };

  function passo(dt) {
    vermi.forEach((v) => {
      const p = v.corda.p;
      const testa = p[0];
      const sotto = p.some((q) => q.y > suolo + 6); // basta un punto nella terra: il resto lo segue
      const tuttiFuori = p.every((q) => q.y < suolo - 2);
      if (!v.dentro && sotto) { v.dentro = true; spruzzaTerra(testa.x); }
      if (v.dentro && tuttiFuori) { v.dentro = false; spruzzaTerra(testa.x); }
      const afferrato = preso?.tipo === 'verme' && preso.verme === v ? { indice: preso.indice, x: puntatore.x, y: puntatore.y } : null;
      if (!afferrato && !(preso && preso.tipo === 'verme')) v.ferma += dt;
      if (afferrato) v.ferma = 0;
      // da solo: ogni tanto scava e poi riesce
      if (!afferrato && !v.intento && v.ferma > 240) {
        v.ferma = 0;
        v.intento = v.dentro ? { x: caso(30, larghezza - 30), y: suolo - 36, quando: 0, esce: true } : { x: testa.x + caso(-40, 40), y: caso(suolo + 40, ALTEZZA - 30), quando: 0, esce: false };
      }
      if (v.intento && !afferrato) {
        v.intento.quando += dt;
        const forza = v.dentro ? 0.06 : 0.0;
        testa.x += (v.intento.x - testa.x) * (v.dentro ? 0.02 : 0.03) * dt;
        testa.y += (v.intento.y - testa.y) * (v.dentro ? 0.02 : 0.035) * dt + forza;
        if (v.intento.quando > 260 || Math.hypot(v.intento.x - testa.x, v.intento.y - testa.y) < 8) v.intento = null;
      }
      if (afferrato) v.intento = null;
      if (Math.abs(testa.x - testa.px) > 0.3) v.verso = Math.sign(testa.x - testa.px);
      passoCorda(v.corda, {
        gravita: v.dentro ? 0.04 : 0.5,
        attrito: v.dentro ? 0.93 : 0.995,
        iterazioni: 8,
        rimbalzo: 0.55,
        limiti: { x0: v.r, y0: v.r, x1: larghezza - v.r, y1: ALTEZZA - v.r },
        terra: v.dentro ? null : { y: suolo - v.r * 0.6, attrito: 0.82 },
        afferrato,
      });
      if (v.dentro) { v.traccia.push({ x: p[0].x, y: p[0].y }); if (v.traccia.length > 160) v.traccia.shift(); } else if (v.traccia.length) v.traccia.shift();
      if (v.ride > 0) v.ride -= dt;
      if (v.mangia > 0) v.mangia -= dt;
      v.occhio -= dt;
      if (v.occhio < -6) v.occhio = caso(120, 300);
    });
    // il cibo cade e si ferma sull'erba; i vermi lo mangiano con la bocca
    cibo.forEach((o) => {
      if (preso?.tipo === 'cibo' && preso.oggetto === o) { o.x = puntatore.x; o.y = puntatore.y; return; }
      o.vy += 0.4 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= 0.99; o.rot += o.vx * 0.05;
      if (o.y > suolo - 5) { o.y = suolo - 5; o.vy *= -0.3; o.vx *= 0.8; }
      if (o.x < 8 || o.x > larghezza - 8) { o.x = Math.max(8, Math.min(larghezza - 8, o.x)); o.vx *= -0.6; }
    });
    for (let i = cibo.length - 1; i >= 0; i--) {
      const o = cibo[i];
      const chi = vermi.find((v) => v.mangia <= 0 && Math.hypot(v.corda.p[0].x - o.x, v.corda.p[0].y - o.y) < v.r + 12);
      if (chi) { cibo.splice(i, 1); chi.mangia = 40; sbocciaCuori(chi.corda.p[0].x, chi.corda.p[0].y - chi.r); ultimaAttivita = performance.now(); if (preso?.oggetto === o) preso = null; }
    }
    particelle.forEach((q) => { q.x += q.vx * dt; q.y += q.vy * dt; if (q.tipo === 'terra') q.vy += 0.2 * dt; q.vita -= dt; });
    for (let i = particelle.length - 1; i >= 0; i--) if (particelle[i].vita <= 0) particelle.splice(i, 1);
  }

  function disegna() {
    contesto.setTransform(1, 0, 0, 1, 0, 0);
    contesto.clearRect(0, 0, tela.width, tela.height);
    contesto.drawImage(fondo, 0, 0, tela.width, tela.height);
    contesto.scale(dpr, dpr);
    // le gallerie scavate
    vermi.forEach((v) => {
      if (v.traccia.length < 2) return;
      contesto.strokeStyle = 'rgba(30,18,12,.45)'; contesto.lineCap = 'round'; contesto.lineJoin = 'round'; contesto.lineWidth = v.r * 1.7;
      contesto.beginPath(); v.traccia.forEach((q, i) => (i ? contesto.lineTo(q.x, q.y) : contesto.moveTo(q.x, q.y))); contesto.stroke();
    });
    cibo.forEach((o) => disegnaCibo(contesto, o));
    const attivo = puntatore.attivo && performance.now() - puntatore.ultimo < 2500;
    vermi.forEach((v) => disegnaVerme(contesto, v, { ...puntatore, attivo }));
    particelle.forEach((q) => {
      if (q.tipo === 'cuore') cuore(contesto, q.x, q.y, 6, Math.min(1, q.vita / 25));
      else { contesto.globalAlpha = Math.min(1, q.vita / 14); contesto.fillStyle = '#6b4a36'; contesto.beginPath(); contesto.arc(q.x, q.y, 2, 0, 7); contesto.fill(); contesto.globalAlpha = 1; }
    });
  }

  let ultimo = performance.now();
  let contatoreSecondo = 0;
  function ciclo(adesso) {
    if (!tela.isConnected) { clearInterval(salvataggio); document.removeEventListener('visibilitychange', alNascondere); salva(); return; }
    requestAnimationFrame(ciclo);
    if (document.hidden) { ultimo = adesso; return; }
    misura();
    if (!larghezza) { ultimo = adesso; return; }
    const dt = Math.min(2.5, (adesso - ultimo) / 16.7 || 1);
    ultimo = adesso;
    passo(dt);
    disegna();
    // minuti di relax: un secondo conta se negli ultimi 20 s hai toccato qualcosa
    contatoreSecondo += dt * 16.7;
    if (contatoreSecondo >= 1000) {
      contatoreSecondo -= 1000;
      if (adesso - ultimaAttivita < 20000) { relax = aggiungiSecondi(relax, oggi, 1); secondiDaSalvare += 1; aggiornaRiepilogo(); }
    }
  }
  const salvataggio = setInterval(salva, 10000);
  const alNascondere = () => { if (document.hidden) salva(); };
  document.addEventListener('visibilitychange', alNascondere);

  const bottone = (tipo, chiave) => el('button', { class: 'btn', type: 'button', id: `cibo-${tipo}`, onclick: () => dai(tipo) }, t(chiave));
  const palco = el('div', { class: 'giardino-palco' }, tela);
  aggiungi(contenitore,
    el('h2', { class: 'titolo-schermata' }, t('vermi.titolo')),
    el('p', { class: 'aiuto' }, t('vermi.spiega')),
    palco,
    el('div', { class: 'riga' }, bottone('foglia', 'vermi.foglia'), bottone('compost', 'vermi.compost')),
    riepilogo);
  requestAnimationFrame(ciclo);
}
