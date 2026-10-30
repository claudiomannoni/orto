// Calendario: tutti i lavori possibili in un mese, per la zona scelta nelle impostazioni.
// "Oggi in campagna" mostra solo i più importanti; qui si vede il quadro intero e si guarda avanti.
import { el, oggiISO, meseDi } from '../util.js';
import { t } from '../i18n.js';
import { leggi } from '../store/impostazioni.js';
import { catalogo } from '../contenuti.js';
import { conversazione } from '../ui/mascotte.js';
import { apriFoglio } from '../ui/foglio.js';
import { titoloLavoro } from './oggi.js';
import { faseLunare, fasiDelMese } from '../motore/luna.js';
import { disegnaLuna } from '../ui/luna.js';

const OPERAZIONI = ['semina', 'trapianto', 'cura', 'lavorazione', 'raccolta'];

const nomeMese = (mese, formato) => new Date(2026, mese - 1, 1).toLocaleDateString('it-IT', { month: formato });

// Tutti i lavori del calendario della zona che cadono nel mese, in ordine: tipo, periodo migliore, titolo.
export function lavoriDelMese(schede, zonaId, mese) {
  const trovati = [];
  for (const scheda of schede) {
    for (const lavoro of scheda.calendario?.[zonaId] ?? []) {
      if (lavoro.mesi?.includes(mese)) trovati.push({ scheda, lavoro, coltura: null });
    }
  }
  const posto = (v) => {
    const i = OPERAZIONI.indexOf(v.lavoro.operazione);
    return i === -1 ? OPERAZIONI.length : i;
  };
  return trovati.sort((a, b) => posto(a) - posto(b)
    || Number(Boolean(b.lavoro.ottimale?.includes(mese))) - Number(Boolean(a.lavoro.ottimale?.includes(mese)))
    || a.lavoro.titolo.localeCompare(b.lavoro.titolo, 'it'));
}

function apriLavoro(voce, mese) {
  const { lavoro } = voce;
  const foglio = apriFoglio({
    titolo: titoloLavoro(voce),
    contenuto: el('div', { class: 'form' },
      el('p', { class: 'etichette' }, etichette(voce, mese)),
      (voce.scheda.avvisi ?? []).map((a) => el('p', { class: 'avviso' }, el('strong', {}, `${t('lavoro.avviso')}: `), a)),
      el('h4', {}, t('lavoro.perche')),
      el('p', {}, lavoro.perche),
      conversazione([
        { chi: 'rosso', testo: lavoro.rosso, variante: 'ride' },
        { chi: 'rossella', testo: lavoro.rossella, variante: 'pensa' },
      ]),
      lavoro.certezza === 'bassa' ? el('p', { class: 'nota-certezza' }, t('lavoro.certezza.nota')) : null,
      el('button', { class: 'btn primario', type: 'button', onclick: () => foglio.close() }, t('foglio.chiudi')),
    ),
  });
}

function etichette({ lavoro }, mese) {
  const ottimale = Boolean(lavoro.ottimale?.includes(mese));
  const ultimo = mese === Math.max(...lavoro.mesi);
  return [
    ultimo ? el('span', { class: 'etichetta motivo' }, t('lavoro.motivo.ultima_finestra'))
      : ottimale ? el('span', { class: 'etichetta motivo' }, t('lavoro.motivo.ottimale')) : null,
    el('span', { class: `etichetta certezza ${lavoro.certezza}` }, t(`lavoro.certezza.${lavoro.certezza}`)),
  ];
}

function voceLavoro(voce, mese) {
  return el('li', {},
    el('button', { class: 'voce', type: 'button', onclick: () => apriLavoro(voce, mese) },
      el('img', { class: 'icona-coltura', src: voce.scheda.icona ?? 'assets/colture/generica.svg', alt: '', width: 48, height: 48 }),
      el('span', { class: 'lavoro-testi' },
        el('strong', {}, titoloLavoro(voce)),
        el('span', { class: 'etichette' }, etichette(voce, mese)),
      ),
    ),
  );
}

const giornoMese = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });

// La luna del mese: le quattro fasi e, se è il mese di oggi, com'è oggi con Rosso e Rossella.
// La tradizione è presentata come tradizione; Rossella dice che non ci sono prove solide.
function sezioneLuna(anno, mese, oggi, meseOggi) {
  const fasi = fasiDelMese(anno, mese);
  const adesso = mese === meseOggi ? faseLunare(oggi) : null;
  return el('section', { class: 'card luna-sezione' },
    el('h3', {}, t('luna.titolo')),
    adesso ? el('div', { class: 'luna-oggi' },
      disegnaLuna(adesso.ciclo),
      el('p', {}, el('strong', {}, adesso.nome ? t(`luna.fase.${adesso.nome}`) : t(`luna.stato.${adesso.stato}`)),
        el('span', { class: 'etichetta certezza bassa' }, t('luna.certezza'))),
    ) : null,
    adesso ? conversazione([
      { chi: 'rosso', testo: t(`luna.rosso.${adesso.stato}`), variante: 'ride' },
      { chi: 'rossella', testo: t('luna.rossella'), variante: 'pensa' },
    ]) : null,
    el('ul', { class: 'fasi' }, fasi.map((f) => el('li', {},
      el('span', {}, t(`luna.fase.${f.tipo}`)), el('strong', {}, giornoMese(f.data))))),
    el('p', { class: 'aiuto' }, t('luna.circa')),
  );
}

export async function monta(contenitore) {
  const [impostazioni, schede] = await Promise.all([leggi(), catalogo()]);
  const oggi = oggiISO();
  const meseOggi = meseDi(oggi);
  let mese = meseOggi;

  const titolo = el('h2', { class: 'titolo-schermata titolo-mese' });
  const sottotitolo = el('p', { class: 'data-lunga' });
  const elenco = el('div', { class: 'gruppi' });
  const mesi = el('div', { class: 'mesi', role: 'group', 'aria-label': t('mese.scegli') });
  const luna = el('div', {});

  function disegna() {
    titolo.textContent = nomeMese(mese, 'long');
    sottotitolo.textContent = mese === meseOggi ? t('mese.corrente') : t('mese.spiega');
    mesi.replaceChildren(...Array.from({ length: 12 }, (_, i) => i + 1).map((m) => el('button', {
      class: `btn mese ${m === meseOggi ? 'oggi' : ''}`,
      type: 'button',
      'aria-pressed': String(m === mese),
      onclick: () => { mese = m; disegna(); },
    }, nomeMese(m, 'short'))));

    luna.replaceChildren(sezioneLuna(Number(oggi.slice(0, 4)), mese, oggi, meseOggi));
    const lavori = lavoriDelMese(schede, impostazioni.zona, mese);
    if (!lavori.length) {
      elenco.replaceChildren(el('p', { class: 'card vuoto-testo' }, t('mese.vuoto')));
      return;
    }
    const gruppi = [];
    for (const operazione of [...OPERAZIONI, undefined]) {
      const voci = lavori.filter((v) => (OPERAZIONI.includes(v.lavoro.operazione) ? v.lavoro.operazione : undefined) === operazione);
      if (!voci.length) continue;
      gruppi.push(el('section', { class: 'gruppo' },
        el('h3', {}, t(`mese.operazione.${operazione ?? 'altro'}`)),
        el('ul', { class: 'lista' }, voci.map((v) => voceLavoro(v, mese))),
      ));
    }
    elenco.replaceChildren(...gruppi);
  }

  disegna();
  contenitore.append(mesi, titolo, sottotitolo, elenco, luna);
}
