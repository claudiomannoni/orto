// Impara: tutte le colture e le parole dell'orto, con una ricerca. Da qui si apre la scheda di ogni coltura.
import { el, normalizza, aggiungi } from '../util.js';
import { t } from '../i18n.js';
import { catalogo, glossario } from '../contenuti.js';

export async function monta(contenitore) {
  const [schede, termini] = await Promise.all([catalogo(), glossario()]);
  const elencoSchede = [...schede].sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  const elencoTermini = Object.values(termini).sort((a, b) => a.termine.localeCompare(b.termine, 'it'));

  const campo = el('input', {
    type: 'search', name: 'cerca', placeholder: t('impara.cerca'), 'aria-label': t('impara.cerca'),
    autocomplete: 'off', enterkeyhint: 'search',
  });
  const titoloColture = el('h3', {});
  const colture = el('div', { class: 'griglia-colture' });
  const titoloParole = el('h3', {});
  const parole = el('div', { class: 'elenco-termini' });
  const nessuno = el('p', { class: 'vuoto-testo', hidden: true }, t('impara.nessuno'));

  function disegna() {
    const q = normalizza(campo.value);
    const s = elencoSchede.filter((x) => !q || [x.nome, x.nome_scientifico, x.famiglia, ...(x.alias ?? [])].some((v) => normalizza(v).includes(q)));
    const p = elencoTermini.filter((x) => !q || normalizza(x.termine).includes(q) || normalizza(x.definizione).includes(q));
    colture.replaceChildren(...s.map((x) => el('a', { class: 'scheda-voce', href: `#/coltura?id=${encodeURIComponent(x.id)}` },
      el('img', { src: x.icona ?? 'assets/colture/generica.svg', alt: '', width: 56, height: 56 }),
      el('span', {}, x.nome))));
    parole.replaceChildren(...p.map((x) => el('details', { class: 'termine' },
      el('summary', {}, x.termine),
      el('p', {}, x.definizione),
      x.esempio ? el('p', { class: 'aiuto' }, x.esempio) : null)));
    titoloColture.textContent = `${t('impara.colture')} (${s.length})`;
    titoloParole.textContent = `${t('impara.glossario')} (${p.length})`;
    titoloColture.hidden = colture.hidden = s.length === 0;
    titoloParole.hidden = parole.hidden = p.length === 0;
    nessuno.hidden = s.length + p.length > 0;
  }
  campo.addEventListener('input', disegna);

  aggiungi(contenitore,
    el('h2', { class: 'titolo-schermata' }, t('impara.titolo')),
    el('p', { class: 'aiuto' }, t('impara.spiega')),
    el('div', { class: 'tessere-azione' },
      el('a', { class: 'tessera-azione', href: '#/chiedi' }, el('strong', {}, t('chiedi.invito')), el('span', { class: 'aiuto' }, t('oggi.gioca.chiedi.spiega'))),
      el('a', { class: 'tessera-azione', href: '#/quiz' }, el('strong', {}, t('quiz.invito')), el('span', { class: 'aiuto' }, t('quiz.invito.spiega')))),
    campo, nessuno, titoloColture, colture, titoloParole, parole);
  disegna();
}
