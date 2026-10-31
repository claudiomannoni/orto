// «Il mio orto dall'alto»: le zone come aiuole di terra, con dentro le colture e a che punto sono.
import { el, oggiISO } from '../util.js';
import { t } from '../i18n.js';
import { crescita, perZona } from '../motore/crescita.js';

function tessera(coltura, schede, oggi) {
  const scheda = schede.find((s) => s.id === coltura.schedaId) ?? schede.find((s) => s.nome.toLowerCase() === coltura.nome.trim().toLowerCase());
  const c = crescita(coltura, scheda, oggi);
  const stato = t(`aiuola.fase.${c.fase}`, { n: c.giorni ?? 0 });
  return el('li', { class: `tessera fase-${c.fase}`, 'data-id': coltura.id },
    el('img', { src: scheda?.icona ?? 'assets/colture/generica.svg', alt: '', width: 48, height: 48 }),
    el('span', { class: 'tessera-nome' }, coltura.nome),
    c.quota !== null ? el('progress', { class: 'avanzamento', max: 100, value: Math.round(c.quota * 100), 'aria-label': `${coltura.nome}: ${stato}` }) : null,
    el('span', { class: 'tessera-stato' }, stato));
}

// Restituisce null se non ci sono colture (la schermata mostra già il suo messaggio).
export function aiuole(colture, zone, schede, oggi = oggiISO()) {
  if (!colture.length) return null;
  const gruppi = perZona(colture, zone);
  return el('section', { class: 'aiuole', 'aria-label': t('aiuola.titolo') },
    el('h3', {}, t('aiuola.titolo')),
    el('p', { class: 'aiuto' }, t('aiuola.spiega')),
    gruppi.map((g) => el('div', { class: 'aiuola' },
      el('h4', {}, g.zona ? g.zona.nome : t('aiuola.senza_zona')),
      el('ul', { class: 'tessere' }, g.colture.map((c) => tessera(c, schede, oggi))))));
}
