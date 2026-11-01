// «Il piano del mio orto»: l'aiuola vista dall'alto, nelle sue misure, con le colture come segnaposto da trascinare.
// Mentre si trascina si vede chi è vicino a chi: verde = amiche, rosso = non vanno d'accordo (dalle consociazioni, con la loro certezza).
// Le posizioni stanno nella coltura (`posizione: { x, y }`, frazioni 0..1 dell'aiuola).
import { el, aggiungi, sostituisci, parametriRotta } from '../util.js';
import { t } from '../i18n.js';
import { elencoColture, salvaColtura } from '../store/dati.js';
import { elencoZone } from '../store/zone.js';
import { catalogo, consociazioni } from '../contenuti.js';
import { limitaPosizione, giudizioVicinato, statoPerSegnaposto, postoLibero } from '../motore/piano.js';

const RAGGIO_M = 1; // «vicine» = entro un metro
const DISTANZA_MIN_M = 0.45;

export async function monta(contenitore) {
  const idZona = parametriRotta().get('zona');
  const [zone, tutteColture, schede, consoc] = await Promise.all([elencoZone(), elencoColture(), catalogo(), consociazioni()]);
  const zona = zone.find((z) => z.id === idZona);
  if (!zona) {
    aggiungi(contenitore, el('h2', { class: 'titolo-schermata' }, t('piano.titolo')), el('p', { class: 'aiuto' }, t('piano.senza_zona')), el('a', { class: 'btn', href: '#/zone' }, t('piano.vai_zone')));
    return;
  }
  const { larghezza_m: larg, lunghezza_m: lung } = zona.misure;
  if (!larg || !lung) {
    aggiungi(contenitore, el('h2', { class: 'titolo-schermata' }, `${t('piano.titolo')} · ${zona.nome}`), el('p', { class: 'avviso' }, t('piano.senza_misure')), el('a', { class: 'btn primario', href: '#/zone' }, t('piano.vai_zone')));
    return;
  }
  const colture = tutteColture.filter((c) => c.zonaId === zona.id);
  const relazioni = consoc?.relazioni ?? [];
  const nomeScheda = (c) => schede.find((s) => s.id === c.schedaId)?.nome ?? c.nome;
  const iconaScheda = (c) => schede.find((s) => s.id === c.schedaId)?.icona ?? 'assets/colture/generica.svg';

  // chi non ha ancora una posizione ne riceve una libera (e la tiene)
  colture.forEach((c) => {
    if (c.posizione && Number.isFinite(c.posizione.x) && Number.isFinite(c.posizione.y)) return;
    const occupati = colture.filter((x) => x.posizione).map((x) => ({ id: x.id, x: x.posizione.x, y: x.posizione.y }));
    c.posizione = postoLibero(occupati, larg, lung, DISTANZA_MIN_M);
    salvaColtura(c);
  });

  const campo = el('div', { class: 'piano-campo', style: `aspect-ratio: ${larg} / ${lung}` });
  const messaggi = el('ul', { class: 'elenco-semplice', 'aria-live': 'polite' });
  const gettoni = new Map();

  const segnaposto = () => colture.map((c) => ({ id: c.id, schedaId: c.schedaId, x: c.posizione.x, y: c.posizione.y }));
  function aggiornaVicinato() {
    const giudizi = giudizioVicinato(segnaposto(), relazioni, larg, lung, RAGGIO_M);
    const stati = statoPerSegnaposto(giudizi);
    gettoni.forEach((g, id) => { g.dataset.vicini = stati[id] ?? 'neutro'; });
    sostituisci(messaggi, giudizi.length ? giudizi.map((g) => {
      const a = colture.find((c) => c.id === g.a);
      const b = colture.find((c) => c.id === g.b);
      const rel = relazioni.find((r) => (r.a === a.schedaId && r.b === b.schedaId) || (r.a === b.schedaId && r.b === a.schedaId));
      return el('li', { class: g.tipo === 'nemica' ? 'avviso' : '' }, t(`piano.${g.tipo}`, { a: nomeScheda(a), b: nomeScheda(b) }), rel?.certezza ? ` (${t(`animali.certezza.${rel.certezza}`)})` : '');
    }) : el('li', { class: 'aiuto' }, t('piano.nessun_vicinato')));
  }

  colture.forEach((c) => {
    const g = el('button', { class: 'gettone', type: 'button', 'data-id': c.id, 'aria-label': t('piano.sposta', { nome: c.nome }) },
      el('img', { src: iconaScheda(c), alt: '', width: 36, height: 36, draggable: 'false' }), el('span', {}, c.nome));
    const metti = () => { g.style.left = `${c.posizione.x * 100}%`; g.style.top = `${c.posizione.y * 100}%`; };
    metti();
    let preso = false;
    g.addEventListener('pointerdown', (e) => { e.preventDefault(); preso = true; g.setPointerCapture?.(e.pointerId); g.classList.add('preso'); });
    g.addEventListener('pointermove', (e) => {
      if (!preso) return;
      const r = campo.getBoundingClientRect();
      c.posizione = limitaPosizione((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      metti();
      aggiornaVicinato();
    });
    const lascia = async () => { if (!preso) return; preso = false; g.classList.remove('preso'); await salvaColtura(c); };
    g.addEventListener('pointerup', lascia);
    g.addEventListener('pointercancel', lascia);
    // da tastiera: frecce per spostare di mezzo metro
    g.addEventListener('keydown', async (e) => {
      const passo = { ArrowLeft: [-0.5 / larg, 0], ArrowRight: [0.5 / larg, 0], ArrowUp: [0, -0.5 / lung], ArrowDown: [0, 0.5 / lung] }[e.key];
      if (!passo) return;
      e.preventDefault();
      c.posizione = limitaPosizione(c.posizione.x + passo[0], c.posizione.y + passo[1]);
      metti(); aggiornaVicinato(); await salvaColtura(c);
    });
    gettoni.set(c.id, g);
    campo.append(g);
  });

  aggiungi(contenitore,
    el('h2', { class: 'titolo-schermata' }, `${t('piano.titolo')} · ${zona.nome}`),
    el('p', { class: 'aiuto' }, t('piano.spiega', { l: larg, w: lung })),
    colture.length ? campo : el('p', { class: 'vuoto-testo' }, t('piano.vuoto')),
    colture.length ? el('section', { class: 'card' }, el('h3', {}, t('piano.vicinato')), messaggi, el('p', { class: 'aiuto' }, t('piano.avvertenza'))) : null,
    el('a', { class: 'btn', href: '#/colture' }, t('pianta.torna')));
  if (colture.length) aggiornaVicinato();
}
