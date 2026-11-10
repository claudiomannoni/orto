// Pagina unica della pianta: fase e stagione, storia fotografica, scheda agronomica e piano dell'aiuola.
import { el, aggiungi, formattaData, oggiISO, parametriRotta, aggiungiGiorni } from '../util.js';
import { t } from '../i18n.js';
import { elencoColture, salvaColtura } from '../store/dati.js';
import { elencoZone } from '../store/zone.js';
import { elencoFoto } from '../store/foto.js';
import { fasi, catalogo, stagione, raccolta, sopravvivenza, cura } from '../contenuti.js';
import { bloccoCura } from '../ui/cura.js';
import { bisogniPiante } from '../motore/bisogni.js';
import { nuovoEvento, registraEvento } from '../store/dati.js';
import { toast } from '../ui/toast.js';
import { bloccoSopravvivenza } from '../ui/sopravvivenza.js';
import { lineaDelTempo, andamentoSalute, giorniFraFoto } from '../motore/linea-tempo.js';
import { statoFase, bloccoFase } from '../ui/fasi-pianta.js';
import { riempiStagione } from '../ui/stagione-blocco.js';
import { leggi } from '../store/impostazioni.js';
import { valutaSalute, giorniDaAnnaffiatura } from '../motore/salute.js';
import { giudizioStagione } from '../motore/stagione.js';
import { elencoEventi } from '../store/dati.js';
import { previsioni } from '../meteo.js';
import { bustinaPianta } from '../ui/bustina-pianta.js';
import { calcolaCorrezioneEta } from '../motore/correzione-eta.js';
import { etaDellaPianta } from '../motore/fasi.js';

export async function monta(contenitore) {
  const p = parametriRotta();
  const id = p.get('id');
  const selezionata = ['oggi', 'fase', 'stagione', 'inverno', 'cura', 'storia', 'scheda', 'piano'].includes(p.get('scheda')) ? p.get('scheda') : 'oggi';
  const [colture, tutteFoto, dFasi, schede, dStagione, impostazioni, dRaccolta, eventi, dSopravvivenza, dCura] = await Promise.all([elencoColture(), elencoFoto(), fasi(), catalogo(), stagione(), leggi(), raccolta(), elencoEventi(), sopravvivenza(), cura()]);
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
  const fotoFase = [...tutteFoto].filter((f) => f.colturaId === coltura.id && f.diagnosi?.risultato?.confronto_fase && f.diagnosi.risultato.confronto_fase !== 'in-linea').sort((a, b) => b.data.localeCompare(a.data))[0];
  const risultatoFotoFase = fotoFase?.diagnosi?.risultato;
  const datiFaseColtura = dFasi.colture?.[coltura.schedaId];
  const etaAllaFoto = fotoFase && datiFaseColtura ? etaDellaPianta({ partenza: coltura.partenza, data: coltura.dataSemina, piantinaEta: datiFaseColtura.piantina_eta_giorni?.valore }, fotoFase.data) : null;
  const correzioneProposta = !coltura.correzioneEta && risultatoFotoFase?.fase_osservata && Number.isInteger(etaAllaFoto) ? calcolaCorrezioneEta({ eta: etaAllaFoto, faseOsservata: risultatoFotoFase.fase_osservata.id, fasi: datiFaseColtura.fasi, data: fotoFase.data }) : null;
  const ultima = linea.at(-1);
  const ultimaDiagnosi = [...linea].reverse().find((v) => v.stato);
  let minime = [];
  const salute = valutaSalute({ diagnosi: ultimaDiagnosi?.stato ? { stato: ultimaDiagnosi.stato } : null, stagione: giudizioStagione({ coltura, scheda, zonaId: impostazioni.zona, dati: dStagione, oggi: oggiISO(), minime }), giorniAnnaffiatura: giorniDaAnnaffiatura(eventi, coltura.id, oggiISO()), acqua: st?.fase?.acqua?.livello });
  const ciclo = scheda?.giorni_alla_raccolta?.max;
  const cicloFinito = Number.isFinite(ciclo) && st?.eta > ciclo;
  const cicloFasi = st?.dati?.fasi?.at(-1)?.a_giorno;
  const raccoltoPrevisto = ciclo && scheda?.giorni_alla_raccolta?.min && st ? t('pianta.raccolto_previsto', { inizio: formattaData(aggiungiGiorni(oggiISO(), Math.max(0, scheda.giorni_alla_raccolta.min - st.eta))), fine: formattaData(aggiungiGiorni(oggiISO(), Math.max(0, ciclo - st.eta))) }) : t('comune.non_disponibile');
  const bustina = bustinaPianta({ coltura, scheda, stato: salute.stato, fase: st ? (cicloFinito ? t('pianta.ciclo_concluso') : st.fase.nome) : null, eta: st?.eta, ciclo: ciclo ?? cicloFasi, prossima: null, raccolto: null, nota: null });
  // Una pagina sola: in alto come sta la pianta e la cosa da fare; sotto, le voci che si aprono con un tocco.
  const oggi = oggiISO();
  const annuale = dStagione?.colture?.[coltura.schedaId]?.ciclo === 'annuale';
  const statoCarta = el('section', { class: 'card stato-pianta' });
  const disegnaStato = (min) => {
    const giudizio = giudizioStagione({ coltura, scheda, zonaId: impostazioni.zona, dati: dStagione, oggi, minime: min });
    const [b] = bisogniPiante({ oggi, eventi, piante: [{ coltura, giudizio, fase: st?.fase ?? null, cicloFinito: annuale && cicloFinito }] });
    const titolo = b ? (b.tipo === 'fase' ? (b.fase ?? t('pianta.stato.fase')) : t(`pianta.stato.${b.tipo}`)) : t(giudizio.stato !== 'ok' || (annuale && cicloFinito) ? 'pianta.stato.fatto' : st || scheda ? 'pianta.stato.ok' : 'pianta.stato.ignoto');
    const frase = b ? (b.tipo === 'gelo' && b.minima !== null ? `${t('bisogni.gelo.minima', { minima: String(Math.round(b.minima * 10) / 10).replace('.', ',') })}. ${b.dettaglio ?? ''}` : b.dettaglio ?? t(`bisogni.${b.tipo}.sotto`)) : null;
    statoCarta.replaceChildren(...[
      el('h3', { class: `stato-titolo urgenza-${b?.urgenza ?? 'nessuna'}` }, titolo),
      frase ? el('p', { class: 'stato-frase' }, frase) : null,
      !cicloFinito && ciclo && scheda?.giorni_alla_raccolta?.min && st ? el('p', { class: 'aiuto' }, raccoltoPrevisto) : null,
      ultima ? el('p', { class: 'aiuto' }, t('pianta.ultima_foto', { data: formattaData(ultima.data) })) : null,
      el('div', { class: 'riga stato-azioni' },
        b ? el('button', { class: 'btn primario', type: 'button', id: 'stato-fatto', onclick: async () => {
          await registraEvento(nuovoEvento({ tipo: 'lavoro_fatto', zonaId: impostazioni.zona, colturaId: coltura.id, schedaId: coltura.schedaId ?? null, lavoroId: b.lavoroId, data: oggi, esito: 'ok', note: t(`bisogni.${b.tipo}.${b.azione}`, { nome }) }));
          toast(t('lavoro.fatto.toast'));
          eventi.push({ tipo: 'lavoro_fatto', colturaId: coltura.id, lavoroId: b.lavoroId, data: oggi });
          disegnaStato(min);
        } }, t('pianta.fatto')) : null,
        el('a', { class: b ? 'btn' : 'btn primario', href: `#/dottore?coltura=${encodeURIComponent(coltura.id)}` }, t('fase.esamina'))),
    ].filter(Boolean));
  };
  disegnaStato(minime);

  const zone = await elencoZone();
  const zona = zone.find((z) => z.id === coltura.zonaId);
  const scelta = el('select', { name: 'zona', 'aria-label': t('piano.scegli_zona') }, zone.map((z) => el('option', { value: z.id }, z.nome)));
  const avvisoStagione = el('div', { class: 'stagione-posto' });
  if (scheda) riempiStagione(avvisoStagione, { coltura, scheda, zonaId: impostazioni.zona, dati: dStagione });
  const opzioniInverno = dSopravvivenza?.colture?.[coltura.schedaId ?? scheda?.id]?.opzioni ?? [];
  const sulPosto = opzioniInverno.find((o) => o.id === 'sul-posto') ?? opzioniInverno[0];
  const voce = (id, titolo, accenno, contenuto, apri = []) => {
    const figli = (Array.isArray(contenuto) ? contenuto : [contenuto]).filter(Boolean);
    if (!figli.length) return null;
    return el('details', { class: 'voce-pianta', 'data-voce': id, open: [id, ...apri].includes(selezionata) },
      el('summary', {}, el('span', { class: 'voce-titolo' }, titolo), accenno ? el('span', { class: 'voce-accenno' }, accenno) : null),
      el('div', { class: 'voce-corpo' }, ...figli));
  };
  const voceStagione = voce('stagione', t('pianta.voce.stagione'), null, avvisoStagione);
  const aggiornaStagione = () => { voceStagione.hidden = !avvisoStagione.querySelector('.stagione'); };
  new MutationObserver(aggiornaStagione).observe(avvisoStagione, { childList: true });
  aggiornaStagione();
  const voci = [
    voce('fase', t('pianta.voce.fase'), st ? (cicloFinito ? t('pianta.ciclo_concluso') : st.fase.nome) : null, bloccoFase(coltura, dFasi, oggi, { conFoto: false, raccoltaDati: dRaccolta, conNome: false, conRiepilogo: false, cicloConcluso: cicloFinito })),
    voceStagione,
    voce('inverno', t('pianta.voce.inverno'), sulPosto ? t(`sopravvivenza.esito.${sulPosto.esito}`) : null, bloccoSopravvivenza(coltura.schedaId ?? scheda?.id, dSopravvivenza)),
    voce('cura', t('cura.titolo'), null, bloccoCura(coltura.schedaId ?? scheda?.id, dCura), ['scheda']),
    voce('storia', t('pianta.voce.storia'), linea.length ? t('pianta.voce.foto', { n: linea.length }) : t('pianta.voce.nessuna_foto'), [coltura.correzioneEta ? el('p', { class: 'aiuto' }, t('fase.corretta_foto', { data: formattaData(coltura.correzioneEta.data) }), el('button', { class: 'btn piccolo', type: 'button', onclick: async () => { coltura.correzioneEta = null; await salvaColtura(coltura); location.reload(); } }, t('fase.annulla_correzione'))) : null,
      correzioneProposta ? el('section', { class: 'card correzione-fase' }, el('p', {}, t('diagnosi.correzione.domanda', { fase: risultatoFotoFase.fase_osservata.nome })), el('div', { class: 'riga' }, el('button', { class: 'btn primario', type: 'button', onclick: async () => { coltura.correzioneEta = correzioneProposta; await salvaColtura(coltura); location.reload(); } }, t('diagnosi.correzione.aggiorna')), el('button', { class: 'btn', type: 'button', onclick: (e) => e.currentTarget.closest('.correzione-fase').remove() }, t('diagnosi.correzione.lascia')))) : null,
      linea.length > 1 ? el('p', { class: andamento === 'peggiora' ? 'avviso' : 'aiuto' }, t(`pianta.andamento.${andamento}`)) : null,
      el('a', { class: 'btn primario', href: `#/dottore?coltura=${encodeURIComponent(coltura.id)}` }, t('fase.esamina')),
      linea.length ? el('ol', { class: 'linea-tempo' }, linea.map((v, i) => el('li', { class: `card passo-tempo stato-${v.stato ?? 'nessuno'}` },
        v.foto?.miniatura ? el('img', { src: v.foto.miniatura, alt: '', width: 72, height: 72, loading: 'lazy' }) : null,
        el('div', {}, el('strong', {}, formattaData(v.data)), i > 0 ? el('span', { class: 'aiuto' }, ` · ${t('pianta.dopo', { n: giorni[i - 1] })}`) : null,
          v.stato ? el('p', {}, t(`diagnosi.stato.${v.stato}`)) : null,
          i > 0 && ['sana', 'dubbio', 'problema'].includes(v.stato) && ['sana', 'dubbio', 'problema'].includes(linea[i - 1].stato) ? el('p', { class: 'aiuto' }, t(`pianta.variazione.${v.stato === linea[i - 1].stato ? 'uguale' : v.stato === 'sana' || (v.stato === 'dubbio' && linea[i - 1].stato === 'problema') ? 'migliora' : 'peggiora'}`)) : null,
          v.faseNome ? el('p', { class: 'aiuto' }, t('pianta.fase_vista', { nome: v.faseNome })) : null,
          ['in-linea', 'in-ritardo', 'in-anticipo'].includes(v.confronto) ? el('p', { class: 'aiuto' }, t(`pianta.confronto.${v.confronto}`)) : null,
          v.problemi.length ? el('p', { class: 'aiuto' }, v.problemi.join(', ')) : null,
          v.foto?.nota ? el('p', { class: 'aiuto' }, v.foto.nota) : null)))) : el('p', { class: 'vuoto-testo' }, t('pianta.nessuna_foto')),
      el('p', { class: 'aiuto' }, t('diagnosi.avvertenza'))]),
    voce('scheda', t('pianta.voce.scheda'), scheda?.nome ?? null, [scheda ? el('section', { class: 'card' }, el('h3', {}, scheda.nome), scheda.descrizione ? el('p', {}, scheda.descrizione) : null,
      (scheda.avvisi ?? []).map((a) => el('p', { class: 'avviso' }, a)),
      scheda.giorni_alla_raccolta?.min && scheda.giorni_alla_raccolta?.max ? el('p', {}, t('scheda.raccolta', { min: scheda.giorni_alla_raccolta.min, max: scheda.giorni_alla_raccolta.max })) : null,
      scheda.fonti ? el('details', { class: 'meteo-dettagli', open: true }, el('summary', {}, t('scheda.fonti')), el('p', { class: 'aiuto' }, t('scheda.fonti.spiega')), Object.values(scheda.fonti).map((f) => el('p', { class: 'aiuto' }, el('a', { href: f.url, target: '_blank', rel: 'noopener noreferrer' }, f.titolo ?? f.url), f.ente ? ' (' + f.ente + ')' : ''))) : null) : el('p', { class: 'aiuto' }, t('scheda.non_trovata')),
      scheda ? el('a', { class: 'btn', href: `#/coltura?id=${encodeURIComponent(scheda.id)}` }, t('scheda.quando')) : null]),
    voce('piano', t('pianta.voce.piano'), zona?.nome ?? t('pianta.voce.nessuna_zona'), coltura.zonaId
      ? [el('p', { class: 'aiuto' }, t('piano.spiega_breve')), el('a', { class: 'btn primario grande', href: `#/piano?zona=${encodeURIComponent(coltura.zonaId)}` }, t('piano.titolo'))]
      : [el('section', { class: 'card piano-senza-zona' },
        el('h3', {}, t('piano.senza_zona_titolo')),
        el('p', {}, t('piano.senza_zona_testo')),
        zone.length ? el('label', {}, t('piano.scegli_zona'), scelta) : null,
        zone.length ? el('button', { class: 'btn primario', type: 'button', onclick: async () => { coltura.zonaId = scelta.value; await salvaColtura(coltura); location.reload(); } }, t('piano.metti_in_zona')) : null,
        el('a', { class: zone.length ? 'btn' : 'btn primario', href: '#/zone' }, t(zone.length ? 'piano.vai_zone' : 'piano.crea_zona')))]),
  ].filter(Boolean);
  aggiungi(contenitore, el('h2', { class: 'titolo-schermata' }, nome), bustina, statoCarta, el('div', { class: 'voci-pianta' }, ...voci));
  previsioni().then(({ giorni }) => {
    minime = giorni.filter((x) => x.data >= oggiISO()).slice(0, 7).map((x) => x.min);
    const aggiornata = valutaSalute({ diagnosi: ultimaDiagnosi?.stato ? { stato: ultimaDiagnosi.stato } : null, stagione: giudizioStagione({ coltura, scheda, zonaId: impostazioni.zona, dati: dStagione, oggi: oggiISO(), minime }), giorniAnnaffiatura: giorniDaAnnaffiatura(eventi, coltura.id, oggiISO()), acqua: st?.fase?.acqua?.livello });
    bustina.classList.remove('stato-ok', 'stato-attenzione', 'stato-urgente', 'stato-ignoto');
    bustina.classList.add(`stato-${aggiornata.stato}`);
    bustina.setAttribute('aria-label', `${nome}: ${t(`salute.${aggiornata.stato}`)}`);
    disegnaStato(minime);
  }).catch(() => {});
}
