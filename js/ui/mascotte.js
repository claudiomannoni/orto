// Rossella (la scienziata prudente) e Rosso (il contadino all'antica): vivi e vestiti.
// Cambiano vestito con le stagioni e le feste; toccandoli saltellano e dicono una battuta.
import { el, oggiISO } from '../util.js';
import { t } from '../i18n.js';
import { battute } from '../contenuti.js';
import { creaVermetto, cambiaVestito, ridiAncora } from './vermetto.js';
import { VESTITI, vestitoDelGiorno, contestoDelVestito, altroVestito } from '../motore/vestiti.js';

// Il vestito scelto in Impostazioni ('auto' = lo decide il calendario) e quello cambiato a tocco, solo per questa sessione.
let preferenza = 'auto';
let temporaneo = null;
const TOCCHI_PER_CAMBIO = 6;
let tocchi = 0;

// nato: data del primo avvio (AAAA-MM-GG), per il compleanno dell'orto; se non si passa resta quella di prima.
let nato = null;

export function impostaVestiti(valore, dataNascita) {
  preferenza = VESTITI.includes(valore) ? valore : 'auto';
  if (dataNascita !== undefined) nato = dataNascita;
  temporaneo = null;
  aggiornaVestiti();
}

// Oggi piove? (lo dice il meteo, appena si sa): con «Automatico» i vermetti prendono l'ombrello.
let piove = false;
export function impostaPioggia(valore) {
  if (piove === Boolean(valore)) return;
  piove = Boolean(valore);
  aggiornaVestiti();
}

export const vestitoAttuale = () => temporaneo ?? (preferenza === 'auto' ? vestitoDelGiorno(oggiISO(), { nato, piove }) : preferenza);

function aggiornaVestiti() {
  const vestito = vestitoAttuale();
  document.querySelectorAll('.avatar[data-chi]').forEach((a) => {
    a.dataset.vestito = vestito;
    const tela = a.querySelector('.corpo-vermetto');
    if (tela) cambiaVestito(tela, vestito);
  });
}

// Una battuta a caso di questo vermetto, fra quelle del vestito e quelle generiche. Senza dati: nessuna battuta.
async function battutaDi(chi, contesto) {
  const dati = await battute();
  const gruppi = [dati?.contesti?.[contesto]?.[chi] ?? [], dati?.contesti?.tocco?.[chi] ?? []];
  const pool = Math.random() < 0.6 && gruppi[0].length ? gruppi[0] : gruppi[1].length ? gruppi[1] : gruppi[0];
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function parla(avatar, testo) {
  if (!avatar || !testo) return;
  avatar.querySelector('.sbuffo')?.remove();
  const sbuffo = el('div', { class: 'sbuffo', role: 'status' }, testo);
  avatar.append(sbuffo);
  setTimeout(() => sbuffo.remove(), Math.min(6000, 2600 + testo.length * 35));
}

function salta(avatar) {
  avatar.classList.remove('salta');
  void avatar.offsetWidth; // fa ripartire l'animazione anche con tocchi ravvicinati
  avatar.classList.add('salta');
  setTimeout(() => avatar.classList.remove('salta'), 650);
}

// senzaScambi: il vermetto parla da solo (i vermi liberi non hanno un compagno accanto a cui rispondere).
export async function alTocco(avatar, { senzaScambi = false } = {}) {
  const chi = avatar.dataset.chi;
  salta(avatar);
  tocchi += 1;
  // Ogni tanto cambiano vestito: una risata e un'occasione per vedere gli altri.
  if (tocchi % TOCCHI_PER_CAMBIO === 0) {
    temporaneo = altroVestito(vestitoAttuale());
    aggiornaVestiti();
    parla(avatar, await battutaDi(chi, 'cambio_abito'));
    return;
  }
  const dati = await battute();
  const loro = [...document.querySelectorAll('.avatar[data-chi]')];
  const altro = loro.find((a) => a.dataset.chi !== chi);
  const scambi = (dati?.scambi ?? []).filter((s) => s.contesto === contestoDelVestito(vestitoAttuale()) || s.contesto === 'tocco');
  // A volte si punzecchiano: uno parla, l'altro risponde (se sono tutti e due sulla schermata).
  if (altro && !senzaScambi && scambi.length && Math.random() < 0.3) {
    const scambio = scambi[Math.floor(Math.random() * scambi.length)];
    const rosso = loro.find((a) => a.dataset.chi === 'rosso');
    const rossella = loro.find((a) => a.dataset.chi === 'rossella');
    const primo = chi === 'rosso' ? [rosso, scambio.rosso] : [rossella, scambio.rossella];
    const secondo = chi === 'rosso' ? [rossella, scambio.rossella] : [rosso, scambio.rosso];
    parla(...primo);
    setTimeout(() => { salta(secondo[0]); parla(...secondo); }, 1700);
    return;
  }
  parla(avatar, await battutaDi(chi, contestoDelVestito(vestitoAttuale())));
}

// variante: 'pensa' (Rossella, sguardo in su) o 'ride' (Rosso). Il vermetto è disegnato nel codice (vermetto.js).
export function avatar(chi, variante) {
  const nome = t(`mascotte.${chi}`);
  const corpo = creaVermetto(chi, variante, vestitoAttuale());
  const a = el('div', {
    class: `avatar ${chi}`, 'data-chi': chi, 'data-vestito': vestitoAttuale(), role: 'button', tabindex: '0', 'aria-label': t('mascotte.tocca', { nome }),
  }, corpo);
  const ride = () => { ridiAncora(corpo); };
  a.addEventListener('click', () => { ride(); alTocco(a); });
  a.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ride(); alTocco(a); } });
  return a;
}

// Un vermetto compare in basso e dice una battuta (per esempio dopo un lavoro fatto), poi se ne va.
// Sta sopra a tutto: si vede anche se la conversazione in alto è fuori schermo.
// Con { chi, testo } dice proprio quella battuta (per esempio quella di un livello); senza, ne pesca una del contesto.
// Una pioggia di coriandoli colorati (solo CSS). Con «meno movimento» non si vede: la regola dell'accessibilità ferma le animazioni.
const COLORI_CORIANDOLI = ['#f4cd5c', '#e53935', '#66bb6a', '#4fc3f7', '#ff8a80', '#ffffff'];
function coriandoli(quanti = 18) {
  document.querySelector('.coriandoli')?.remove();
  if (document.documentElement.dataset.movimento === 'ridotto') return;
  const nodo = el('div', { class: 'coriandoli', 'aria-hidden': 'true' });
  for (let i = 0; i < quanti; i++) {
    const pezzo = el('span', { class: 'coriandolo' });
    pezzo.style.setProperty('--x', `${Math.round(Math.random() * 100)}%`);
    pezzo.style.setProperty('--r', `${Math.round(Math.random() * 720 - 360)}deg`);
    pezzo.style.setProperty('--d', `${(0.9 + Math.random() * 0.9).toFixed(2)}s`);
    pezzo.style.setProperty('--ritardo', `${(Math.random() * 0.35).toFixed(2)}s`);
    pezzo.style.background = COLORI_CORIANDOLI[i % COLORI_CORIANDOLI.length];
    nodo.append(pezzo);
  }
  document.body.append(nodo);
  setTimeout(() => nodo.remove(), 2400);
}

export async function festeggia(contesto = 'fatto', { chi: scelto = null, testo: fisso = null } = {}) {
  const chi = scelto ?? (Math.random() < 0.5 ? 'rosso' : 'rossella');
  let testo = fisso;
  if (!testo) {
    const dati = await battute();
    const pool = dati?.contesti?.[contesto]?.[chi] ?? [];
    if (!pool.length) return;
    testo = pool[Math.floor(Math.random() * pool.length)];
  }
  coriandoli();
  document.querySelector('.vermetto-flash')?.remove();
  const nodo = el('div', { class: `vermetto-flash ${chi}`, role: 'status' },
    avatar(chi, chi === 'rosso' ? 'ride' : 'pensa'),
    el('div', { class: 'flash-fumetto' }, testo));
  document.body.append(nodo);
  salta(nodo.querySelector('.avatar'));
  setTimeout(() => nodo.remove(), 3600 + testo.length * 30);
}

// battute = [{ chi: 'rosso' | 'rossella', testo, variante? }]
export function conversazione(lista) {
  return el('div', { class: 'conversazione' },
    lista.map(({ chi, testo, variante }) =>
      el('div', { class: `battuta ${chi}` },
        avatar(chi, variante),
        el('div', { class: 'fumetto' },
          el('strong', { class: 'chi' }, t(`mascotte.${chi}`)),
          el('p', {}, testo),
        ),
      )),
  );
}
