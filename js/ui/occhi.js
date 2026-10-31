// Gli occhi dei vermetti: le pupille seguono il dito (o il mouse), ogni tanto guardano l'altro vermetto o si guardano intorno, e sbattono le palpebre.
// Le pupille sono disegnate qui sopra l'immagine senza pupille (assets/mascotte/occhi/). Niente rete, niente costi.
const NS = 'http://www.w3.org/2000/svg';

// Posizione degli occhi nel disegno (stesso gruppo trasformato dell'immagine), raggio del bianco e della pupilla, punto di riposo.
const OCCHI = {
  rosso: { gruppo: 'translate(-51 -33) scale(1.22)', centri: [[214, 145], [250, 145]], bianco: 11, pupilla: 5.5, corsa: 4, riposo: [-1, 0], pelle: '#d0473c' },
  rossella: { gruppo: 'translate(-37 -33) scale(1.22)', centri: [[150, 144], [186, 144]], bianco: 9, pupilla: 4.5, corsa: 3, riposo: [1, 0], pelle: '#d0473c' },
};

const nodo = (nome, attributi = {}, figli = []) => {
  const n = document.createElementNS(NS, nome);
  for (const [k, v] of Object.entries(attributi)) n.setAttribute(k, v);
  figli.forEach((f) => n.append(f));
  return n;
};

export const haOcchi = (chi) => chi in OCCHI;

// Il disegno senza pupille da usare al posto di quello normale.
export const percorsoSenzaPupille = (chi, variante) => `assets/mascotte/occhi/${chi}${variante === 'pensa' ? '-pensa' : ''}.svg`;

// Lo strato con pupille e palpebre, da mettere sopra l'immagine del corpo.
export function creaOcchi(chi) {
  const c = OCCHI[chi];
  const svg = nodo('svg', { class: 'occhi', viewBox: '0 0 400 400', 'aria-hidden': 'true', focusable: 'false' });
  svg.style.setProperty('--dx', '0');
  svg.style.setProperty('--dy', '0');
  svg.style.setProperty('--ritardo', `${(Math.random() * 4).toFixed(2)}s`);
  const gruppo = nodo('g', { transform: c.gruppo });
  for (const [x, y] of c.centri) {
    gruppo.append(nodo('g', { class: 'pupilla' }, [
      nodo('circle', { cx: x + c.riposo[0], cy: y + c.riposo[1], r: c.pupilla, fill: '#4a2a22' }),
      nodo('circle', { cx: x + c.riposo[0] + 2, cy: y + c.riposo[1] - 2.5, r: 2, fill: '#fff' }),
    ]));
    gruppo.append(nodo('circle', { class: 'palpebra', cx: x, cy: y, r: c.bianco + 1.5, fill: c.pelle }));
  }
  svg.append(gruppo);
  return svg;
}

// Guarda verso un punto dello schermo (clientX, clientY).
function guarda(avatar, x, y) {
  const strato = avatar.querySelector('.occhi');
  if (!strato) return;
  const r = avatar.getBoundingClientRect();
  const vx = x - (r.left + r.width / 2);
  const vy = y - (r.top + r.height * 0.4); // gli occhi stanno nella parte alta
  const distanza = Math.hypot(vx, vy) || 1;
  const forza = Math.min(1, distanza / 80); // vicino al dito lo sguardo si attenua, lontano arriva al massimo
  const corsa = OCCHI[avatar.dataset.chi]?.corsa ?? 3;
  strato.style.setProperty('--dx', ((vx / distanza) * corsa * forza).toFixed(2));
  strato.style.setProperty('--dy', ((vy / distanza) * corsa * forza).toFixed(2));
}

let avviato = false;
let ultimoMovimento = 0;
let inAttesa = null;

// Si chiama una volta sola: ascolta il dito o il mouse e muove le pupille di tutti i vermetti sullo schermo.
export function avviaSguardo() {
  if (avviato || typeof document === 'undefined') return;
  avviato = true;
  const tutti = () => [...document.querySelectorAll('.avatar[data-chi]')].filter((a) => a.querySelector('.occhi'));
  const alPuntatore = (e) => {
    const p = e.touches?.[0] ?? e;
    if (p.clientX === undefined) return;
    ultimoMovimento = Date.now();
    if (inAttesa) return;
    inAttesa = requestAnimationFrame(() => { inAttesa = null; tutti().forEach((a) => guarda(a, p.clientX, p.clientY)); });
  };
  addEventListener('pointermove', alPuntatore, { passive: true });
  addEventListener('pointerdown', alPuntatore, { passive: true });
  addEventListener('touchmove', alPuntatore, { passive: true });

  // Se nessuno tocca lo schermo, ogni tanto si guardano fra loro o intorno.
  setInterval(() => {
    if (document.hidden || document.documentElement.dataset.movimento === 'ridotto' || Date.now() - ultimoMovimento < 4000) return;
    const lista = tutti();
    lista.forEach((a) => {
      const altro = lista.find((b) => b !== a);
      if (altro && Math.random() < 0.5) {
        const r = altro.getBoundingClientRect();
        guarda(a, r.left + r.width / 2, r.top + r.height * 0.4);
      } else {
        guarda(a, innerWidth * Math.random(), innerHeight * (0.2 + Math.random() * 0.6));
      }
    });
  }, 2600);

  // Ogni tanto, se nessuno li tocca, un vermetto fa un saltello da solo (mai con «meno movimento»).
  setInterval(() => {
    if (document.hidden || document.documentElement.dataset.movimento === 'ridotto' || Date.now() - ultimoMovimento < 8000) return;
    const visibili = tutti().filter((a) => a.getBoundingClientRect().height > 0 && a.getBoundingClientRect().top < innerHeight && a.getBoundingClientRect().bottom > 0);
    if (!visibili.length || Math.random() > 0.4) return;
    const a = visibili[Math.floor(Math.random() * visibili.length)];
    a.classList.remove('salta');
    void a.offsetWidth;
    a.classList.add('salta');
    setTimeout(() => a.classList.remove('salta'), 650);
  }, 9000);
}
