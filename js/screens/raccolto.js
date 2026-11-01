// «Il mio raccolto»: quanto hai raccolto, per coltura e per mese. Si segna a mano o dopo un lavoro di raccolta in Oggi.
import { el, oggiISO, aggiungi, sostituisci } from '../util.js';
import { t, locale } from '../i18n.js';
import { elencoEventi } from '../store/dati.js';
import { elencoColture } from '../store/dati.js';
import { totaleRaccolto, perColtura, perMese, testoQuantita } from '../motore/raccolto.js';
import { apriRaccolto } from '../ui/raccolto-form.js';

const nomeMese = (i) => new Date(2026, i, 1).toLocaleDateString(locale(), { month: 'short' });

export async function monta(contenitore) {
  let colture = await elencoColture();
  let eventi = (await elencoEventi()).filter((e) => e.tipo === 'raccolto');
  const anno = Number(oggiISO().slice(0, 4));
  const area = el('div', { class: 'raccolto' });

  function disegna() {
    const tot = totaleRaccolto(eventi);
    if (!tot.voci) { sostituisci(area, el('p', { class: 'vuoto-testo', id: 'raccolto-vuoto' }, t('raccolto.vuoto'))); return; }
    const gruppi = perColtura(eventi);
    const mesi = perMese(eventi, anno);
    const massimo = Math.max(...mesi, 0.001);
    sostituisci(area,
      el('section', { class: 'card' },
        el('h3', {}, t('raccolto.totale')),
        el('p', { class: 'raccolto-totale' }, [tot.kg ? testoQuantita(tot.kg, 'kg') : null, tot.pezzi ? testoQuantita(tot.pezzi, 'pezzi') : null].filter(Boolean).join(' + ')),
        el('p', { class: 'aiuto' }, t('raccolto.voci', { n: tot.voci }))),
      el('section', { class: 'card' },
        el('h3', {}, t('raccolto.per_coltura')),
        el('ul', { class: 'elenco-semplice' }, gruppi.map((g) => el('li', { class: 'raccolto-riga' },
          el('strong', {}, g.nome), ' ',
          [g.kg ? testoQuantita(g.kg, 'kg') : null, g.pezzi ? testoQuantita(g.pezzi, 'pezzi') : null].filter(Boolean).join(' + '))))),
      mesi.some(Boolean) ? el('section', { class: 'card' },
        el('h3', {}, t('raccolto.per_mese', { anno })),
        el('div', { class: 'barre-mesi', role: 'img', 'aria-label': mesi.map((kg, i) => (kg ? `${nomeMese(i)}: ${testoQuantita(kg, 'kg')}` : null)).filter(Boolean).join(', ') },
          mesi.map((kg, i) => el('div', { class: 'barra-mese' },
            el('span', { class: 'barra-valore', style: `height:${Math.round((kg / massimo) * 100)}%`, 'aria-hidden': 'true' }),
            el('span', { class: 'etichetta-mese', 'aria-hidden': 'true' }, nomeMese(i).slice(0, 1).toUpperCase())))),
        el('p', { class: 'aiuto' }, t('raccolto.pezzi_esclusi'))) : null);
  }

  aggiungi(contenitore,
    el('a', { class: 'btn', href: '#/colture' }, t('zone.alle_colture')),
    el('h2', { class: 'titolo-schermata' }, t('raccolto.titolo')),
    el('a', { class: 'btn', href: '#/cucina', id: 'vai-cucina' }, t('cucina.apri')),
    el('button', {
      class: 'btn primario grande', type: 'button', id: 'segna-raccolto',
      onclick: () => apriRaccolto(colture, { alSalvare: (evento) => { eventi = [...eventi, evento]; disegna(); } }),
    }, `+ ${t('raccolto.segna')}`),
    area);
  disegna();
}
