// Disegno della luna: un cerchio scuro con la parte illuminata sopra.
// ciclo: 0 = nuova, 0.5 = piena. Crescente = luce a destra, calante = luce a sinistra.
const R = 40;

function percorsoLuce(ciclo) {
  const specchio = ciclo > 0.5;
  const f = specchio ? 1 - ciclo : ciclo; // 0..0.5, sempre "crescente"
  const rx = Math.abs(Math.cos(2 * Math.PI * f)) * R;
  // Mezzo cerchio a destra, poi il bordo dell'ombra: verso destra se è uno spicchio, verso sinistra se è più di metà.
  const ritorno = f < 0.25 ? 0 : 1;
  const d = `M 50 ${50 - R} A ${R} ${R} 0 0 1 50 ${50 + R} A ${rx.toFixed(2)} ${R} 0 0 ${ritorno} 50 ${50 - R} Z`;
  return { d, specchio };
}

export function disegnaLuna(ciclo, dimensione = 72) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('width', dimensione);
  svg.setAttribute('height', dimensione);
  svg.setAttribute('class', 'luna');
  svg.setAttribute('aria-hidden', 'true');
  const buio = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  buio.setAttribute('cx', 50);
  buio.setAttribute('cy', 50);
  buio.setAttribute('r', R);
  buio.setAttribute('class', 'luna-buio');
  const { d, specchio } = percorsoLuce(ciclo);
  const luce = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  luce.setAttribute('d', d);
  luce.setAttribute('class', 'luna-luce');
  if (specchio) luce.setAttribute('transform', 'translate(100 0) scale(-1 1)');
  svg.append(buio, luce);
  return svg;
}
