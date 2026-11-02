// Pagina unica della pianta: fase e stagione, storia fotografica, scheda agronomica e piano dell'aiuola.
import { el, aggiungi, formattaData, oggiISO, parametriRotta } from '../util.js';
import { t } from '../i18n.js';
import { elencoColture } from '../store/dati.js';
import { elencoFoto } from '../store/foto.js';
import { fasi, catalogo, stagione, raccolta } from '../contenuti.js';
import { lineaDelTempo, andamentoSalute, giorniFraFoto } from '../motore/linea-tempo.js';
import { statoFase, bloccoFase } from '../ui/fasi-pianta.js';
import { riempiStagione } from '../ui/stagione-blocco.js';
import { leggi } from '../store/impostazioni.js';

export async function monta(contenitore) {
  const p = parametriRotta();
  const id = p.get('id');
  const selezionata = ['oggi', 'storia', 'scheda', 'piano'].includes(p.get('scheda')) ? p.get('scheda') : 'oggi';
  const [colture, tutteFoto, dFasi, schede, dStagione, impostazioni, dRaccolta] = await Promise.all([elencoColture(), elencoFoto(), fasi(), catalogo(), stagione(), leggi(), raccolta()]);
  const coltura = colture.find((c) => c.id === id);
  if (!coltura) {
    aggiungi(contenitore, el('h2', { class: 'titolo-schermata' }, t('pianta.titolo')), el('p', { class: 'aiuto' }, t('pianta.non_trovata')), el('a', { class: 'btn', href: '#/colture' }, t('pianta.torna')));
    return;
  }
  const scheda = schede.find((s) => s.id === coltura.schedaId);
  const nome = coltura.varieta ? `${coltura.nome} · ${coltura.varieta}` : coltura.nome;
  const linea = lineaDelTempo(tutteFoto, coltura.id);
  const giorni = giorniFraFoto(linea);
  const andamento = andamentoSalute(linea);
  const st = statoFase(coltura, dFasi, oggiISO());
  const tabs = ['oggi', 'storia', 'scheda', 'piano'];
  const nav = el('nav', { class: 'schede-pianta', role: 'tablist', 'aria-label': nome });
  const pannello = el('section', { class: 'pannello-pianta', role: 'tabpanel' });
  for (const tab of tabs) nav.append(el('button', { class: 'scheda-pianta-tab', type: 'button', role: 'tab', 'aria-selected': String(tab === selezionata), onclick: () => { location.hash = `#/pianta?id=${encodeURIComponent(id)}&scheda=${tab}`; } }, t(`pianta.tab.${tab}`)));
  let contenuto;
  if (selezionata === 'oggi') {
    const stagione = el('div', { class: 'stagione-posto' });
    if (scheda) riempiStagione(stagione, { coltura, scheda, zonaId: impostazioni.zona, dati: dStagione });
    contenuto = [st ? el('p', { class: 'meta' }, t(coltura.partenza === 'piantina' ? 'fase.eta.piantina' : 'fase.eta', { n: st.eta }), ' · ', el('strong', {}, st.fase.nome)) : null,
      bloccoFase(coltura, dFasi, oggiISO(), { conFoto: true, raccoltaDati: dRaccolta }), stagione];
  } else if (selezionata === 'storia') {
    contenuto = [linea.length > 1 ? el('p', { class: andamento === 'peggiora' ? 'avviso' : 'aiuto' }, t(`pianta.andamento.${andamento}`)) : null,
      el('a', { class: 'btn primario', href: `#/dottore?coltura=${encodeURIComponent(coltura.id)}` }, t('fase.esamina')),
      linea.length ? el('ol', { class: 'linea-tempo' }, linea.map((v, i) => el('li', { class: `card passo-tempo stato-${v.stato ?? 'nessuno'}` },
        v.foto?.miniatura ? el('img', { src: v.foto.miniatura, alt: '', width: 72, height: 72, loading: 'lazy' }) : null,
        el('div', {}, el('strong', {}, formattaData(v.data)), i > 0 ? el('span', { class: 'aiuto' }, ` · ${t('pianta.dopo', { n: giorni[i - 1] })}`) : null,
          v.stato ? el('p', {}, t(`diagnosi.stato.${v.stato}`)) : null,
          v.faseNome ? el('p', { class: 'aiuto' }, t('pianta.fase_vista', { nome: v.faseNome })) : null,
          v.problemi.length ? el('p', { class: 'aiuto' }, v.problemi.join(', ')) : null,
          v.foto?.nota ? el('p', { class: 'aiuto' }, v.foto.nota) : null)))) : el('p', { class: 'vuoto-testo' }, t('pianta.nessuna_foto')),
      el('p', { class: 'aiuto' }, t('diagnosi.avvertenza'))];
  } else if (selezionata === 'scheda') {
    contenuto = [scheda ? el('section', { class: 'card' }, el('h3', {}, scheda.nome), scheda.descrizione ? el('p', {}, scheda.descrizione) : null,
      (scheda.avvisi ?? []).map((a) => el('p', { class: 'avviso' }, a)),
      scheda.giorni_alla_raccolta?.min && scheda.giorni_alla_raccolta?.max ? el('p', {}, t('scheda.raccolta', { min: scheda.giorni_alla_raccolta.min, max: scheda.giorni_alla_raccolta.max })) : null,
      (scheda.fonti ? Object.values(scheda.fonti) : []).map((f) => el('p', { class: 'aiuto' }, el('a', { href: f.url, target: '_blank', rel: 'noopener noreferrer' }, f.titolo ?? f.url)))) : el('p', { class: 'aiuto' }, t('scheda.non_trovata')),
      scheda ? el('a', { class: 'btn', href: `#/coltura?id=${encodeURIComponent(scheda.id)}` }, t('scheda.quando')) : null];
  } else {
    contenuto = [el('p', { class: 'aiuto' }, t('piano.spiega', { l: '', w: '' })),
      coltura.zonaId ? el('a', { class: 'btn primario grande', href: `#/piano?zona=${encodeURIComponent(coltura.zonaId)}` }, t('piano.titolo')) : el('p', { class: 'aiuto' }, t('piano.senza_zona'))];
  }
  pannello.append(...contenuto.filter(Boolean));
  aggiungi(contenitore, el('h2', { class: 'titolo-schermata' }, nome), nav, pannello);
}
