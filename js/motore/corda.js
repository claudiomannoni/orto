// Corda di punti (corpo di un verme) con fisica di Verlet. Funzioni pure, nessun DOM e nessun Math.random.

const PUNTI_MIN = 2;
const PUNTI_MAX = 40;

// Un'opzione vale solo se è un numero finito, altrimenti si usa il default.
const numero = (v, def) => (typeof v === 'number' && Number.isFinite(v) ? v : def);

// Limiti validi solo se hanno tutti e quattro i lati finiti.
function leggiLimiti(v) {
  if (!v || typeof v !== 'object') return null;
  const x0 = numero(v.x0, NaN);
  const y0 = numero(v.y0, NaN);
  const x1 = numero(v.x1, NaN);
  const y1 = numero(v.y1, NaN);
  if (![x0, y0, x1, y1].every(Number.isFinite)) return null;
  return { x0, y0, x1, y1 };
}

// Il suolo vale solo con una y finita; l'attrito mancante non frena.
function leggiTerra(v) {
  if (!v || typeof v !== 'object') return null;
  const y = numero(v.y, NaN);
  if (!Number.isFinite(y)) return null;
  return { y, attrito: numero(v.attrito, 0.5) };
}

// Il punto afferrato deve esistere e avere coordinate finite.
function leggiAfferrato(v, quanti) {
  if (!v || typeof v !== 'object') return null;
  if (!Number.isInteger(v.indice) || v.indice < 0 || v.indice >= quanti) return null;
  const x = numero(v.x, NaN);
  const y = numero(v.y, NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { indice: v.indice, x, y };
}

export function creaCorda(n, lunghezza, x, y) {
  let quanti = Math.round(numero(n, PUNTI_MIN));
  quanti = Math.min(PUNTI_MAX, Math.max(PUNTI_MIN, quanti));
  const passo = numero(lunghezza, 0);
  const inizioX = numero(x, 0);
  const inizioY = numero(y, 0);
  const p = [];
  for (let i = 0; i < quanti; i++) {
    const px = inizioX + i * passo;
    p.push({ x: px, y: inizioY, px, py: inizioY });
  }
  return { p, l: passo };
}

// Rimette il punto dentro il rettangolo e inverte la velocità con il rimbalzo.
function limita(punto, limiti, rimbalzo) {
  if (punto.x < limiti.x0) {
    const vx = punto.x - punto.px;
    punto.x = limiti.x0;
    punto.px = punto.x + vx * rimbalzo;
  } else if (punto.x > limiti.x1) {
    const vx = punto.x - punto.px;
    punto.x = limiti.x1;
    punto.px = punto.x + vx * rimbalzo;
  }
  if (punto.y < limiti.y0) {
    const vy = punto.y - punto.py;
    punto.y = limiti.y0;
    punto.py = punto.y + vy * rimbalzo;
  } else if (punto.y > limiti.y1) {
    const vy = punto.y - punto.py;
    punto.y = limiti.y1;
    punto.py = punto.y + vy * rimbalzo;
  }
}

// Appoggia il punto a terra: verticale ferma, orizzontale frenata.
function appoggiaTerra(punto, terra) {
  const vx = punto.x - punto.px;
  punto.y = terra.y;
  punto.py = terra.y;
  punto.px = punto.x - vx * terra.attrito;
}

export function passoCorda(corda, opz) {
  if (!corda || !Array.isArray(corda.p) || !corda.p.length) return corda;
  const o = opz && typeof opz === 'object' ? opz : {};
  const gravita = numero(o.gravita, 0.5);
  const attrito = numero(o.attrito, 0.99);
  const iterazioni = Math.max(0, Math.round(numero(o.iterazioni, 6)));
  const rimbalzo = numero(o.rimbalzo, 0.5);
  const limiti = leggiLimiti(o.limiti);
  const terra = leggiTerra(o.terra);
  const afferrato = leggiAfferrato(o.afferrato, corda.p.length);
  const preso = afferrato ? afferrato.indice : -1;
  const l = numero(corda.l, 0);
  const p = corda.p;

  // 1. Integrazione di Verlet (il punto afferrato resta fuori).
  for (let i = 0; i < p.length; i++) {
    if (i === preso) continue;
    const punto = p[i];
    const vx = (punto.x - punto.px) * attrito;
    const vy = (punto.y - punto.py) * attrito;
    punto.px = punto.x;
    punto.py = punto.y;
    punto.x += vx;
    punto.y += vy + gravita;
  }

  // 2. Punto afferrato bloccato esattamente sulla mano.
  if (afferrato) {
    const punto = p[preso];
    punto.x = afferrato.x;
    punto.y = afferrato.y;
    punto.px = afferrato.x;
    punto.py = afferrato.y;
  }

  // 3-5. Iterazioni: distanze fra punti vicini, limiti, terra.
  for (let k = 0; k < iterazioni; k++) {
    for (let i = 0; i + 1 < p.length; i++) {
      const a = p[i];
      const b = p[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (!(dist > 0)) continue;
      const scarto = (dist - l) / dist;
      const aFermo = i === preso;
      const bFermo = i + 1 === preso;
      if (aFermo && bFermo) continue;
      if (aFermo) {
        b.x -= dx * scarto;
        b.y -= dy * scarto;
      } else if (bFermo) {
        a.x += dx * scarto;
        a.y += dy * scarto;
      } else {
        const meta = scarto * 0.5;
        a.x += dx * meta;
        a.y += dy * meta;
        b.x -= dx * meta;
        b.y -= dy * meta;
      }
    }
    for (let i = 0; i < p.length; i++) {
      if (i === preso) continue;
      if (limiti) limita(p[i], limiti, rimbalzo);
      if (terra && p[i].y > terra.y) appoggiaTerra(p[i], terra);
    }
  }

  return corda;
}

export function lanciaCorda(corda, vx, vy) {
  if (!corda || !Array.isArray(corda.p)) return corda;
  const sx = numero(vx, 0);
  const sy = numero(vy, 0);
  for (const punto of corda.p) {
    punto.px = punto.x - sx;
    punto.py = punto.y - sy;
  }
  return corda;
}

export function centroCorda(corda) {
  const p = corda && Array.isArray(corda.p) ? corda.p : [];
  if (!p.length) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const punto of p) {
    sx += punto.x;
    sy += punto.y;
  }
  const x = sx / p.length;
  const y = sy / p.length;
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
  };
}

export function lunghezzaMassimaErrore(corda) {
  const p = corda && Array.isArray(corda.p) ? corda.p : [];
  const l = numero(corda && corda.l, 0);
  const riferimento = Math.abs(l) > 0 ? Math.abs(l) : 1;
  let massimo = 0;
  for (let i = 0; i + 1 < p.length; i++) {
    const dx = p[i + 1].x - p[i].x;
    const dy = p[i + 1].y - p[i].y;
    const dist = Math.hypot(dx, dy);
    if (!Number.isFinite(dist)) return Infinity;
    const errore = Math.abs(dist - l) / riferimento;
    if (errore > massimo) massimo = errore;
  }
  return massimo;
}
