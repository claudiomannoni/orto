// «Chiedi a Rossella»: domanda libera sull'orto. La risposta arriva da Gemini (con la chiave dell'utente) ed è sempre un consiglio da verificare.
import { el, oggiISO, meseDi, aggiungi, sostituisci } from '../util.js';
import { t } from '../i18n.js';
import { leggi, imposta } from '../store/impostazioni.js';
import { disponibile } from '../ai/ai.js';
import { chiediARossella, restantiOggi, LUNGHEZZA_MASSIMA } from '../ai/consiglio.js';
import { elencoColture } from '../store/dati.js';
import { zone } from '../contenuti.js';
import { previsioni } from '../meteo.js';
import { conversazione } from '../ui/mascotte.js';
import { pulsanteAscolta } from '../ui/voce.js';

const ESEMPI = ['chiedi.esempio.1', 'chiedi.esempio.2', 'chiedi.esempio.3'];

async function tempoDiOggi() {
  try {
    const { giorni } = await previsioni({ senzaRete: true });
    const g = giorni.find((x) => x.data === oggiISO());
    if (!g) return null;
    return `${t(`meteo.tempo.${g.tempo}`)}, minima ${Math.round(g.min)} gradi, massima ${Math.round(g.max)} gradi, pioggia ${g.pioggia} mm`;
  } catch { return null; }
}

function messaggioErrore(e) {
  if (['tetto', 'risposta', 'domanda'].includes(e?.codice)) return t(`chiedi.errore.${e.codice}`);
  return t(`ia.errore.${e?.codice ?? 'altro'}`, { dettaglio: e?.message });
}

export async function monta(contenitore) {
  const [impostazioni, elencoZone, colture] = await Promise.all([leggi(), zone(), elencoColture()]);
  const haChiave = await disponibile();
  const area = el('div', { class: 'chiedi-risposta', 'aria-live': 'polite' });
  const campo = el('textarea', { name: 'domanda', rows: 3, maxlength: LUNGHEZZA_MASSIMA, placeholder: t('chiedi.placeholder'), 'aria-label': t('chiedi.placeholder') });
  const invia = el('button', { class: 'btn primario grande', type: 'submit' }, t('chiedi.invia'));
  const form = el('form', { class: 'form', autocomplete: 'off' }, campo,
    el('div', { class: 'parole' }, ESEMPI.map((k) => el('button', { class: 'btn piccolo', type: 'button', onclick: () => { campo.value = t(k); campo.focus(); } }, t(k)))),
    invia);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!impostazioni.ai_testo_ok) {
      if (!confirm(t('chiedi.consenso'))) return;
      await imposta('ai_testo_ok', true);
      impostazioni.ai_testo_ok = true;
    }
    invia.disabled = true;
    sostituisci(area, el('p', { class: 'aiuto' }, t('chiedi.penso')));
    try {
      const zona = elencoZone.find((z) => z.id === impostazioni.zona);
      const r = await chiediARossella(campo.value, {
        zona: zona?.nome,
        mese: new Date(2026, meseDi(oggiISO()) - 1, 1).toLocaleDateString('it-IT', { month: 'long' }),
        metodo: impostazioni.metodo,
        colture: colture.map((c) => c.nome),
        tempo: await tempoDiOggi(),
      });
      sostituisci(area,
        el('section', { class: 'card' },
          el('p', {}, r.risposta),
          pulsanteAscolta(r.risposta),
          r.da_controllare ? el('p', { class: 'aiuto' }, el('strong', {}, `${t('chiedi.controlla')}: `), r.da_controllare) : null,
          r.chiedi_a_un_tecnico ? el('p', { class: 'avviso' }, t('chiedi.tecnico')) : null,
          el('p', {}, el('span', { class: `etichetta certezza ${r.certezza}` }, t(`lavoro.certezza.${r.certezza}`))),
          el('p', { class: 'aiuto' }, t('chiedi.nota_ia'))));
    } catch (errore) {
      sostituisci(area, el('p', { class: 'avviso', role: 'alert' }, messaggioErrore(errore)));
    } finally {
      invia.disabled = false;
    }
  });

  const rimasteTesto = el('p', { class: 'aiuto' });
  restantiOggi().then((n) => { rimasteTesto.textContent = t('chiedi.rimaste', { n }); });

  aggiungi(contenitore,
    el('a', { class: 'btn', href: '#/impara' }, t('scheda.indietro')),
    el('h2', { class: 'titolo-schermata' }, t('chiedi.titolo')),
    conversazione([
      { chi: 'rosso', testo: t('chiedi.rosso'), variante: 'ride' },
      { chi: 'rossella', testo: t('chiedi.rossella'), variante: 'pensa' },
    ]),
    haChiave ? form : el('section', { class: 'card' },
      el('p', {}, t('chiedi.serve_chiave')),
      el('a', { class: 'btn primario', href: '#/impostazioni' }, t('chiedi.vai_impostazioni'))),
    area,
    haChiave ? rimasteTesto : null);
}
