// «Cosa cucino?»: dalle cose raccolte negli ultimi 30 giorni, Rossella propone tre ricette semplici. Sempre un suggerimento da controllare.
import { el, oggiISO, aggiungi, sostituisci } from '../util.js';
import { t } from '../i18n.js';
import { leggi, imposta } from '../store/impostazioni.js';
import { disponibile, chiedi } from '../ai/ai.js';
import { restantiOggi } from '../ai/consiglio.js';
import { ingredientiDaRaccolto, costruisciPromptRicette, leggiRicette } from '../ai/ricette.js';
import { elencoEventi } from '../store/dati.js';
import { pulsanteAscolta } from '../ui/voce.js';

function messaggioErrore(e) {
  if (e?.codice === 'tetto') return t('chiedi.errore.tetto');
  if (e?.codice === 'risposta') return t('cucina.errore.risposta');
  return t(`ia.errore.${e?.codice ?? 'altro'}`, { dettaglio: e?.message });
}

function cartaRicetta(r) {
  const testo = `${r.titolo}. ${r.ingredienti.join(', ')}. ${r.passaggi.join(' ')}`;
  return el('section', { class: 'card ricetta' },
    el('h3', {}, r.titolo),
    r.minuti ? el('p', { class: 'aiuto' }, t('cucina.minuti', { n: r.minuti })) : null,
    el('h4', {}, t('cucina.ingredienti')),
    el('ul', { class: 'elenco-semplice' }, r.ingredienti.map((i) => el('li', {}, i))),
    el('h4', {}, t('cucina.passaggi')),
    el('ol', { class: 'elenco-semplice' }, r.passaggi.map((p) => el('li', {}, p))),
    r.avviso ? el('p', { class: 'avviso' }, r.avviso) : null,
    pulsanteAscolta(testo));
}

export async function monta(contenitore) {
  const oggi = oggiISO();
  const [impostazioni, eventi, haChiave] = await Promise.all([leggi(), elencoEventi(), disponibile()]);
  const ingredienti = ingredientiDaRaccolto(eventi, 30, oggi);
  const area = el('div', { class: 'cucina-risposta', 'aria-live': 'polite' });
  const persone = el('select', { name: 'persone' }, [1, 2, 4, 6].map((n) => el('option', { value: String(n), selected: n === 2 }, t('cucina.persone', { n }))));
  const invia = el('button', { class: 'btn primario grande', type: 'button', id: 'cucina-chiedi' }, t('cucina.chiedi'));

  invia.addEventListener('click', async () => {
    if (!impostazioni.ai_testo_ok) {
      if (!confirm(t('cucina.consenso'))) return;
      await imposta('ai_testo_ok', true);
      impostazioni.ai_testo_ok = true;
    }
    if (!(await restantiOggi())) { sostituisci(area, el('p', { class: 'avviso', role: 'alert' }, t('chiedi.errore.tetto'))); return; }
    invia.disabled = true;
    sostituisci(area, el('p', { class: 'aiuto' }, t('chiedi.penso')));
    try {
      const risposta = await chiedi({ testo: costruisciPromptRicette(ingredienti, { persone: Number(persone.value) }), json: true });
      const { ai_testo_conteggio: c } = await leggi();
      await imposta('ai_testo_conteggio', { data: oggi, n: (c?.data === oggi ? c.n : 0) + 1 });
      const { ricette, avviso } = leggiRicette(risposta);
      sostituisci(area, ...ricette.map(cartaRicetta), avviso ? el('p', { class: 'aiuto' }, avviso) : null, el('p', { class: 'aiuto' }, t('cucina.nota_ia')));
    } catch (e) {
      sostituisci(area, el('p', { class: 'avviso', role: 'alert' }, messaggioErrore(e)));
    } finally {
      invia.disabled = false;
    }
  });

  aggiungi(contenitore,
    el('a', { class: 'btn', href: '#/raccolto' }, t('cucina.indietro')),
    el('h2', { class: 'titolo-schermata' }, t('cucina.titolo')),
    ingredienti.length
      ? el('p', {}, t('cucina.con', { elenco: ingredienti.join(', ') }))
      : el('p', { class: 'aiuto', id: 'cucina-senza' }, t('cucina.senza_raccolti')),
    haChiave ? el('div', { class: 'form' }, el('label', {}, t('cucina.per'), persone), invia)
      : el('section', { class: 'card' }, el('p', {}, t('chiedi.serve_chiave')), el('a', { class: 'btn primario', href: '#/impostazioni' }, t('chiedi.vai_impostazioni'))),
    area);
}
