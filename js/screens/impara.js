// Impara: le colture, le parole dell'orto e le altre coltivazioni (alberi, animali, colture speciali), in tre linguette con una ricerca sola.
import { el, normalizza, aggiungi } from '../util.js';
import { t, locale } from '../i18n.js';
import { catalogo, glossario, animali, alberi, rendita } from '../contenuti.js';

export async function monta(contenitore) {
  const [schede, termini, dAnimali, dAlberi, dRendita] = await Promise.all([catalogo(), glossario(), animali(), alberi(), rendita()]);
  const elencoSchede = [...schede].sort((a, b) => a.nome.localeCompare(b.nome, locale()));
  const elencoTermini = Object.values(termini).sort((a, b) => a.termine.localeCompare(b.termine, locale()));
  const altre = [
    dAnimali?.schede?.length ? { id: 'animali', href: '#/animali', titolo: t('colture.hub.animali'), spiega: t('colture.hub.animali.spiega'), elementi: dAnimali.schede } : null,
    dAlberi?.schede?.length ? { id: 'alberi', href: '#/alberi', titolo: t('colture.hub.alberi'), spiega: t('colture.hub.alberi.spiega'), elementi: dAlberi.schede } : null,
    dRendita?.schede?.length ? { id: 'rendita', href: '#/rendita', titolo: t('colture.hub.rendita'), spiega: t('colture.hub.rendita.spiega'), elementi: dRendita.schede } : null,
  ].filter(Boolean);

  const campo = el('input', {
    type: 'search', name: 'cerca', placeholder: t('impara.cerca'), 'aria-label': t('impara.cerca'),
    autocomplete: 'off', enterkeyhint: 'search',
  });
  const colture = el('div', { class: 'griglia-colture' });
  const parole = el('div', { class: 'elenco-termini' });
  const altrePannello = el('div', { class: 'elenco-altre' });
  const nessuno = el('p', { class: 'vuoto-testo', hidden: true }, t('impara.nessuno'));

  const SCHEDE = [
    { id: 'colture', pannello: colture },
    { id: 'parole', pannello: parole },
    ...(altre.length ? [{ id: 'altre', pannello: altrePannello }] : []),
  ];
  let attiva = 'colture';
  const barra = el('div', { class: 'linguette', role: 'tablist', 'aria-label': t('impara.titolo') });
  const bottoni = new Map();
  for (const sc of SCHEDE) {
    const b = el('button', { class: 'linguetta', type: 'button', role: 'tab', id: `linguetta-${sc.id}`, 'aria-controls': `pannello-${sc.id}`, onclick: () => scegli(sc.id) });
    bottoni.set(sc.id, b);
    sc.pannello.id = `pannello-${sc.id}`;
    sc.pannello.setAttribute('role', 'tabpanel');
    sc.pannello.setAttribute('aria-labelledby', `linguetta-${sc.id}`);
    barra.append(b);
  }
  barra.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = SCHEDE.findIndex((s) => s.id === attiva);
    scegli(SCHEDE[(i + (e.key === 'ArrowRight' ? 1 : SCHEDE.length - 1)) % SCHEDE.length].id);
    bottoni.get(attiva).focus();
  });

  let conteggi = { colture: 0, parole: 0, altre: 0 };
  function aggiornaVuoto() {
    nessuno.hidden = !(normalizza(campo.value) && conteggi[attiva] === 0);
  }
  function scegli(id) {
    attiva = id;
    for (const sc of SCHEDE) {
      const su = sc.id === id;
      bottoni.get(sc.id).setAttribute('aria-selected', String(su));
      bottoni.get(sc.id).tabIndex = su ? 0 : -1;
      sc.pannello.hidden = !su;
    }
    aggiornaVuoto();
  }

  function disegna() {
    const q = normalizza(campo.value);
    const s = elencoSchede.filter((x) => !q || [x.nome, x.nome_scientifico, x.famiglia, ...(x.alias ?? [])].some((v) => normalizza(v).includes(q)));
    const p = elencoTermini.filter((x) => !q || normalizza(x.termine).includes(q) || normalizza(x.definizione).includes(q));
    const a = altre.map((g) => ({ ...g, trovati: g.elementi.filter((x) => !q || [x.nome, x.in_breve].some((v) => normalizza(v).includes(q))) })).filter((g) => g.trovati.length);
    colture.replaceChildren(...s.map((x) => el('a', { class: 'scheda-voce', href: `#/coltura?id=${encodeURIComponent(x.id)}` },
      el('img', { src: x.icona ?? 'assets/colture/generica.svg', alt: '', width: 56, height: 56 }),
      el('span', {}, x.nome))));
    parole.replaceChildren(...p.map((x) => el('details', { class: 'termine' },
      el('summary', {}, x.termine),
      el('p', {}, x.definizione),
      x.esempio ? el('p', { class: 'aiuto' }, x.esempio) : null)));
    altrePannello.replaceChildren(...a.map((g) => el('section', {},
      el('h3', {}, el('a', { href: g.href }, g.titolo)),
      el('p', { class: 'aiuto' }, g.spiega),
      el('div', { class: 'tessere-azione' }, g.trovati.map((x) => el('a', { class: 'tessera-azione', href: `${g.href}?scheda=${encodeURIComponent(x.id)}` }, el('strong', {}, x.nome), el('span', { class: 'aiuto' }, x.in_breve ?? '')))))));
    conteggi = { colture: s.length, parole: p.length, altre: a.reduce((n, g) => n + g.trovati.length, 0) };
    bottoni.get('colture').textContent = `${t('impara.colture')} (${s.length})`;
    bottoni.get('parole').textContent = `${t('impara.glossario')} (${p.length})`;
    if (bottoni.has('altre')) bottoni.get('altre').textContent = `${t('impara.altre')} (${conteggi.altre})`;
    // se nella linguetta aperta non c'è niente ma altrove sì, si passa lì
    if (q && conteggi[attiva] === 0) {
      const altra = SCHEDE.find((x) => conteggi[x.id] > 0);
      if (altra) { scegli(altra.id); return; }
    }
    aggiornaVuoto();
  }
  campo.addEventListener('input', disegna);

  aggiungi(contenitore,
    el('h2', { class: 'titolo-schermata' }, t('impara.titolo')),
    el('p', { class: 'aiuto' }, t('impara.spiega')),
    el('div', { class: 'tessere-azione' },
      el('a', { class: 'tessera-azione', href: '#/chiedi' }, el('strong', {}, t('chiedi.invito')), el('span', { class: 'aiuto' }, t('oggi.gioca.chiedi.spiega'))),
      el('a', { class: 'tessera-azione', href: '#/quiz' }, el('strong', {}, t('quiz.invito')), el('span', { class: 'aiuto' }, t('quiz.invito.spiega'))),
      el('a', { class: 'tessera-azione', href: '#/vermi' }, el('strong', {}, t('impara.pausa')), el('span', { class: 'aiuto' }, t('impara.pausa.spiega')))),
    campo, barra, nessuno, colture, parole, altrePannello);
  disegna();
  scegli('colture');
}
