// Pagina unica della pianta: fase e stagione, storia fotografica, scheda agronomica e piano dell'aiuola.
import { el, aggiungi, formattaData, oggiISO, parametriRotta, aggiungiGiorni } from '../util.js';
import { t } from '../i18n.js';
import { elencoColture } from '../store/dati.js';
import { elencoFoto } from '../store/foto.js';
import { fasi, catalogo, stagione, raccolta } from '../contenuti.js';
import { lineaDelTempo, andamentoSalute, giorniFraFoto } from '../motore/linea-tempo.js';
import { statoFase, bloccoFase } from '../ui/fasi-pianta.js';
import { riempiStagione } from '../ui/stagione-blocco.js';
import { leggi } from '../store/impostazioni.js';
import { valutaSalute, giorniDaAnnaffiatura } from '../motore/salute.js';
import { giudizioStagione } from '../motore/stagione.js';
import { elencoEventi } from '../store/dati.js';
import { previsioni } from '../meteo.js';

export async function monta(contenitore) {
  const p = parametriRotta();
  const id = p.get('id');
  const selezionata = ['oggi', 'storia', 'scheda', 'piano'].includes(p.get('scheda')) ? p.get('scheda') : 'oggi';
  const [colture, tutteFoto, dFasi, schede, dStagione, impostazioni, dRaccolta, eventi] = await Promise.all([elencoColture(), elencoFoto(), fasi(), catalogo(), stagione(), leggi(), raccolta(), elencoEventi()]);
  const coltura = colture.find((c) => c.id === id);
  if (!coltura) {
    aggiungi(contenitore, el('h2', { class: 'titolo-schermata' }, t('pianta.titolo')), el('p', { class: 'aiuto' }, t('pianta.non_trovata')), el('a', { class: 'btn', href: '#/colture' }, t('pianta.torna')));
    return;
  }
  const scheda = schede.find((s) => s.id === coltura.schedaId);
  const nome = coltura.varieta ? `${coltura.nome} Â· ${coltura.varieta}` : coltura.nome;
  const linea = lineaDelTempo(tutteFoto, coltura.id);
  const giorni = giorniFraFoto(linea);
  const andamento = andamentoSalute(linea);
  const st = statoFase(coltura, dFasi, oggiISO());
  const ultima = linea.at(-1);
  const ultimaDiagnosi = [...linea].reverse().find((v) => v.stato);
  let minime = [];
  const salute = valutaSalute({ diagnosi: ultimaDiagnosi?.stato ? { stato: ultimaDiagnosi.stato } : null, stagione: giudizioStagione({ coltura, scheda, zonaId: impostazioni.zona, dati: dStagione, oggi: oggiISO(), minime }), giorniAnnaffiatura: giorniDaAnnaffiatura(eventi, coltura.id, oggiISO()), acqua: st?.fase?.acqua?.livello });
  const ciclo = scheda?.giorni_alla_raccolta?.max;
  const cicloFinito = Number.isFinite(ciclo) && st?.eta > ciclo;
  const statoRiepilogo = el('strong', { class: `salute salute-${salute.stato}` }, t(`salute.${salute.stato}`));
  const riepilogo = el('section', { class: 'card riepilogo-pianta', 'aria-label': t('pianta.riepilogo') },
    statoRiepilogo,
    el('span', {}, st ? (cicloFinito ? t('pianta.ciclo_concluso') : st.fase.nome) : t('colture.fase_sconosciuta')),
    el('span', {}, st ? t('colture.eta', { n: st.eta }) : t('comune.non_disponibile')),
    el('span', {}, st?.fase?.cosa_fare?.[0] ?? t('colture.azione_sconosciuta')),
    el('span', {}, ciclo && scheda.giorni_alla_raccolta?.min && st ? t('pianta.raccolto_previsto', { inizio: formattaData(aggiungiGiorni(oggiISO(), Math.max(0, scheda.giorni_alla_raccolta.min - st.eta))), fine: formattaData(aggiungiGiorni(oggiISO(), Math.max(0, ciclo - st.eta))) }) : t('comune.non_disponibile'), scheda?.giorni_alla_raccolta?.certezza ? el('span', { class: `etichetta certezza ${scheda.giorni_alla_raccolta.certezza === 'alta' ? 'media' : 'bassa'}` }, t(`animali.certezza.${scheda.giorni_alla_raccolta.certezza}`)) : null),
    el('span', {}, ultima ? t('pianta.ultima_foto', { data: formattaData(ultima.data) }) : t('pianta.nessuna_foto')));
  const tabs = ['oggi', 'storia', 'scheda', 'piano'];
  const nav = el('nav', { class: 'schede-pianta', role: 'tablist', 'aria-label': nome });
  const pannello = el('section', { class: 'pannello-pianta', role: 'tabpanel' });
  for (const tab of tabs) nav.append(el('button', { class: 'scheda-pianta-tab', type: 'button', role: 'tab', 'aria-selected': String(tab === selezionata), onclick: () => { location.hash = `#/pianta?id=${encodeURIComponent(id)}&scheda=${tab}`; } }, t(`pianta.tab.${tab}`)));
  let contenuto;
  if (selezionata === 'oggi') {
    const avvisoStagione = el('div', { class: 'stagione-posto' });
    if (scheda) riempiStagione(avvisoStagione, { coltura, scheda, zonaId: impostazioni.zona, dati: dStagione });
    contenuto = [avvisoStagione, bloccoFase(coltura, dFasi, oggiISO(), { conFoto: true, raccoltaDati: dRaccolta, conNome: false, conRiepilogo: false, cicloConcluso: cicloFinito })];  } else if (selezionata === 'storia') {
    contenuto = [linea.length > 1 ? el('p', { class: andamento === 'peggiora' ? 'avviso' : 'aiuto' }, t(`pianta.andamento.${andamento}`)) : null,
      el('a', { class: 'btn primario', href: `#/dottore?coltura=${encodeURIComponent(coltura.id)}` }, t('fase.esamina')),
      linea.length ? el('ol', { class: 'linea-tempo' }, linea.map((v, i) => el('li', { class: `card passo-tempo stato-${v.stato ?? 'nessuno'}` },
        v.foto?.miniatura ? el('img', { src: v.foto.miniatura, alt: '', width: 72, height: 72, loading: 'lazy' }) : null,
        el('div', {}, el('strong', {}, formattaData(v.data)), i > 0 ? el('span', { class: 'aiuto' }, ` Â· ${t('pianta.dopo', { n: giorni[i - 1] })}`) : null,
          v.stato ? el('p', {}, t(`diagnosi.stato.${v.stato}`)) : null,
          i > 0 && ['sana', 'dubbio', 'problema'].includes(v.stato) && ['sana', 'dubbio', 'problema'].includes(linea[i - 1].stato) ? el('p', { class: 'aiuto' }, t(`pianta.variazione.${v.stato === linea[i - 1].stato ? 'uguale' : v.stato === 'sana' || (v.stato === 'dubbio' && linea[i - 1].stato === 'problema') ? 'migliora' : 'peggiora'}`)) : null,
          v.faseNome ? el('p', { class: 'aiuto' }, t('pianta.fase_vista', { nome: v.faseNome })) : null,
          v.problemi.length ? el('p', { class: 'aiuto' }, v.problemi.join(', ')) : null,
          v.foto?.nota ? el('p', { class: 'aiuto' }, v.foto.nota) : null)))) : el('p', { class: 'vuoto-testo' }, t('pianta.nessuna_foto')),
      el('p', { class: 'aiuto' }, t('diagnosi.avvertenza'))];
  } else if (selezionata === 'scheda') {
    contenuto = [scheda ? el('section', { class: 'card' }, el('h3', {}, scheda.nome), scheda.descrizione ? el('p', {}, scheda.descrizione) : null,
      (scheda.avvisi ?? []).map((a) => el('p', { class: 'avviso' }, a)),
      scheda.giorni_alla_raccolta?.min && scheda.giorni_alla_raccolta?.max ? el('p', {}, t('scheda.raccolta', { min: scheda.giorni_alla_raccolta.min, max: scheda.giorni_alla_raccolta.max })) : null,
      scheda.fonti ? el('details', { class: 'meteo-dettagli', open: true }, el('summary', {}, t('scheda.fonti')), el('p', { class: 'aiuto' }, t('scheda.fonti.spiega')), Object.values(scheda.fonti).map((f) => el('p', { class: 'aiuto' }, el('a', { href: f.url, target: '_blank', rel: 'noopener noreferrer' }, f.titolo ?? f.url), f.ente ? ' (' + f.ente + ')' : ''))) : null) : el('p', { class: 'aiuto' }, t('scheda.non_trovata')),
      scheda ? el('a', { class: 'btn', href: `#/coltura?id=${encodeURIComponent(scheda.id)}` }, t('scheda.quando')) : null];
  } else {
    contenuto = [el('p', { class: 'aiuto' }, t('piano.spiega', { l: '', w: '' })),
      coltura.zonaId ? el('a', { class: 'btn primario grande', href: `#/piano?zona=${encodeURIComponent(coltura.zonaId)}` }, t('piano.titolo')) : el('p', { class: 'aiuto' }, t('piano.senza_zona'))];
  }
  pannello.append(...contenuto.filter(Boolean));
  aggiungi(contenitore, el('h2', { class: 'titolo-schermata' }, nome), riepilogo, nav, pannello);
  previsioni().then(({ giorni }) => {
    minime = giorni.filter((x) => x.data >= oggiISO()).slice(0, 7).map((x) => x.min);
    const aggiornata = valutaSalute({ diagnosi: ultimaDiagnosi?.stato ? { stato: ultimaDiagnosi.stato } : null, stagione: giudizioStagione({ coltura, scheda, zonaId: impostazioni.zona, dati: dStagione, oggi: oggiISO(), minime }), giorniAnnaffiatura: giorniDaAnnaffiatura(eventi, coltura.id, oggiISO()), acqua: st?.fase?.acqua?.livello });
    statoRiepilogo.className = `salute salute-${aggiornata.stato}`;
    statoRiepilogo.textContent = t(`salute.${aggiornata.stato}`);
  }).catch(() => {});
}
