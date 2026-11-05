// "Oggi in campagna": i lavori del giorno, in ordine di importanza.
import { el, oggiISO, formattaDataLunga, normalizza, aggiungi, aggiungiGiorni, dataValida } from '../util.js';
import { t, tn } from '../i18n.js';
import { elencoColture, elencoEventi, nuovoEvento, registraEvento } from '../store/dati.js';
import { leggi } from '../store/impostazioni.js';
import { catalogo, glossario, quiz, curiosita, animali, fasi, raccolta } from '../contenuti.js';
import { bloccoFase, aggiornaAcqua } from '../ui/fasi-pianta.js';
import { consigliAcqua } from '../motore/acqua.js';
import { primiPassi, prossimoPasso, avanzamento } from '../motore/primi-passi.js';
import { elencoFoto } from '../store/foto.js';
import { elencoZone } from '../store/zone.js';
import { imposta } from '../store/impostazioni.js';
import { calcolaLavori } from '../motore/oggi.js';
import { conversazione, festeggia, reagisci } from '../ui/mascotte.js';
import { apriFoglio } from '../ui/foglio.js';
import { apriPromemoria } from '../ui/promemoria.js';
import { toast } from '../ui/toast.js';
import { bloccoInstalla } from '../ui/installa.js';
import { controllaProgressi } from '../store/progressi.js';
import { cartaProgressi } from '../ui/progressi.js';
import { cartaMeteo } from '../ui/meteo.js';
import { pulsanteAscolta } from '../ui/voce.js';
import { apriRaccolto } from '../ui/raccolto-form.js';
import { apriResoconto } from '../ui/resoconto.js';
import { filtraSeguite } from '../motore/seguite.js';
import { previsioni, pioveOggiDaCache } from '../meteo.js';
import { consiglioMeteo } from '../motore/meteo.js';
import { serieQuiz } from '../motore/quiz.js';
import { curiositaDelGiorno } from '../motore/curiosita.js';
import { consigliDeiVermi, scegliConsiglio } from '../motore/consigli-vermi.js';
import { chiaveBentornato } from '../motore/assenza.js';
import { giorniAssenzaSessione } from '../ui/sessione.js';
import { giudizioStagione } from '../motore/stagione.js';
import { stagione } from '../contenuti.js';
import { bloccoStagione } from '../ui/stagione-blocco.js';
import { bustinaPianta } from '../ui/bustina-pianta.js';
import { statoFase } from '../ui/fasi-pianta.js';
import { valutaSalute, giorniDaAnnaffiatura } from '../motore/salute.js';

function testoMotivo({ motivo, n }) {
  if (motivo === 'in_finestra') return t('lavoro.motivo.in_finestra', { n });
  if (motivo === 'ritardo') return tn('lavoro.motivo.ritardo', n);
  return t(`lavoro.motivo.${motivo}`);
}

// Se il titolo non nomina già la coltura ("Semina le fave"), la aggiungiamo ("Prepara il terreno · Cipolla").
export function titoloLavoro({ lavoro, coltura, scheda: coltivazione }) {
  if (coltura) return `${lavoro.titolo} · ${coltura.nome}`;
  const radice = normalizza(coltivazione.nome).slice(0, 3);
  return normalizza(lavoro.titolo).includes(radice) ? lavoro.titolo : `${lavoro.titolo} · ${coltivazione.nome}`;
}

// «L'ho fatto un altro giorno»: si sceglie la data (da ieri indietro), così la storia resta giusta anche se ci si dimentica di segnare.
function apriAltroGiorno(titolo, alSalvare) {
  const ieri = aggiungiGiorni(oggiISO(), -1);
  const form = el('form', { class: 'form', autocomplete: 'off' },
    el('p', {}, titolo),
    el('label', {}, t('oggi.altro_giorno.data'), el('input', { name: 'data', type: 'date', required: true, value: ieri, max: oggiISO() })),
    el('div', { class: 'riga' },
      el('button', { class: 'btn', type: 'button', onclick: () => foglio.close() }, t('form.annulla')),
      el('button', { class: 'btn primario', type: 'submit' }, t('oggi.altro_giorno.salva'))));
  const foglio = apriFoglio({ titolo: t('oggi.altro_giorno'), contenuto: form });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form).get('data');
    if (!dataValida(data) || data > oggiISO()) return;
    foglio.close();
    alSalvare(data);
  });
}

function apriTermine(termine) {
  const foglio = apriFoglio({
    titolo: termine.termine,
    contenuto: el('div', { class: 'form' },
      el('p', {}, termine.definizione),
      termine.esempio ? el('p', { class: 'aiuto' }, termine.esempio) : null,
      el('button', { class: 'btn primario', type: 'button', onclick: () => foglio.close() }, t('foglio.chiudi')),
    ),
  });
}

export function blocchiMetodi(metodi, preferito) {
  const ordinati = [...metodi].sort((a, b) => (b.tipo === preferito) - (a.tipo === preferito));
  return el('div', { class: 'metodi' },
    ordinati.map((m) => el('section', { class: `metodo ${m.tipo === preferito ? 'preferito' : ''}` },
      el('h4', {}, t(`metodo.${m.tipo}`), m.tipo === preferito ? el('span', { class: 'etichetta' }, t('lavoro.metodo.preferito')) : null),
      el('p', {}, m.come),
      el('ul', { class: 'pro' }, m.pro.map((x) => el('li', {}, x))),
      el('ul', { class: 'contro' }, m.contro.map((x) => el('li', {}, x))),
    )),
  );
}

function scheda(voce, indice, { termini, impostazioni, alChiudere }) {
  const { lavoro, coltura, scheda: coltivazione } = voce;
  const titolo = titoloLavoro(voce);

  const dettagli = el('details', { class: 'dettagli' },
    el('summary', {},
      el('img', { class: 'icona-coltura', src: coltivazione.icona ?? 'assets/colture/generica.svg', alt: '', width: 56, height: 56 }),
      el('div', { class: 'lavoro-testi' },
        el('h3', {}, titolo),
        el('p', { class: 'etichette' },
          el('span', { class: 'etichetta motivo' }, testoMotivo(voce)),
          el('span', { class: `etichetta certezza ${lavoro.certezza}` }, t(`lavoro.certezza.${lavoro.certezza}`)),
        ),
      ),
    ),
    el('div', { class: 'corpo' },
      (coltivazione.avvisi ?? []).map((a) => el('p', { class: 'avviso' }, el('strong', {}, `${t('lavoro.avviso')}: `), a)),
      el('h4', {}, t('lavoro.perche')),
      el('p', {}, lavoro.perche),
      pulsanteAscolta(() => `${titolo}. ${lavoro.perche}`),
      el('button', { class: 'btn piccolo', type: 'button', onclick: () => apriAltroGiorno(titolo, (data) => alChiudere(voce, carta, 'lavoro_fatto', 'ok', data)) }, t('oggi.altro_giorno')),
      conversazione([
        { chi: 'rosso', testo: lavoro.rosso, variante: 'ride' },
        { chi: 'rossella', testo: lavoro.rossella, variante: 'pensa' },
      ]),
      lavoro.certezza === 'bassa' ? el('p', { class: 'nota-certezza' }, t('lavoro.certezza.nota')) : null,
      lavoro.metodi?.length ? [el('h4', {}, t('lavoro.metodi')), blocchiMetodi(lavoro.metodi, impostazioni.metodo)] : null,
      (lavoro.glossario ?? []).some((id) => termini[id])
        ? [
          el('h4', {}, t('lavoro.glossario')),
          el('div', { class: 'parole' },
            lavoro.glossario.filter((id) => termini[id]).map((id) =>
              el('button', { class: 'btn piccolo', type: 'button', onclick: () => apriTermine(termini[id]) }, termini[id].termine))),
        ]
        : null,
      el('button', {
        class: 'btn', type: 'button',
        onclick: () => apriPromemoria({
          titolo: t('calendario.titolo', { titolo }),
          data: oggiISO(),
          descrizione: [lavoro.perche, coltura ? t('promemoria.coltura', { nome: coltura.nome }) : ''].filter(Boolean).join('\n\n'),
        }),
      }, t('lavoro.calendario')),
    ),
  );

  // Il consiglio del tempo compare sotto il lavoro quando arrivano le previsioni (da internet o dalla memoria); se non arrivano, niente.
  const consiglio = el('p', { class: 'consiglio-meteo', role: 'note', hidden: true });
  previsioni().then(({ giorni }) => {
    const chiave = consiglioMeteo({ operazione: lavoro.operazione, titolo: lavoro.titolo }, giorni.find((g) => g.data === oggiISO()));
    if (chiave) { consiglio.textContent = t(`meteo.consiglio.${chiave}`); consiglio.hidden = false; }
  }).catch(() => {});

  const carta = el('li', { class: 'card lavoro' },
    el('span', { class: 'numero', 'aria-hidden': 'true' }, String(indice + 1)),
    el('div', { class: 'lavoro-riga' }, dettagli,
      el('button', { class: 'btn primario lavoro-spunta', type: 'button', 'aria-label': t('lavoro.fatto'), onclick: () => alChiudere(voce, carta, 'lavoro_fatto', 'ok') }, el('span', { 'aria-hidden': 'true' }), el('span', { class: 'solo-lettori' }, t('lavoro.fatto')))),
    consiglio,
    el('div', { class: 'riga' },
      el('button', { class: 'btn', type: 'button', onclick: () => alChiudere(voce, carta, 'lavoro_saltato', 'saltato') }, t('lavoro.non_oggi')),
    ),
  );
  carta.prepend(el('button', { class: 'lavoro-spunta', type: 'button', 'aria-label': `${t('lavoro.fatto')}: ${titolo}`, onclick: () => alChiudere(voce, carta, 'lavoro_fatto', 'ok') }, el('span', { 'aria-hidden': 'true' })));
  return carta;
}

// Il cruscotto saluta con il nome salvato; senza nome usa il saluto breve scelto per la schermata.
function testoSaluto(impostazioni) {
  const saluto = t('saluto.buongiorno');
  return impostazioni.nome_coltivatore ? t('saluto.con_nome', { saluto, nome: impostazioni.nome_coltivatore }) : saluto;
}

function iconaScorciatoia(nome) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'icona-scorciatoia');
  svg.setAttribute('aria-hidden', 'true');
  const forme = {
    dottore: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    acqua: '<path d="M12 3C9 7 6 10 6 14a6 6 0 0 0 12 0c0-4-3-7-6-11z"/>',
    raccolto: '<path d="M4 10h16l-2 10H6zM3 7h18M8 7c0-3 2-4 4-4s4 1 4 4"/>',
    appunto: '<path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4"/>',
  };
  svg.innerHTML = forme[nome];
  return svg;
}

export async function monta(contenitore) {
  const oggi = oggiISO();
  const [colture, eventi, schede, impostazioni, termini, carta, datiStagione] = await Promise.all([
    elencoColture(), elencoEventi(), catalogo(), leggi(), glossario(), cartaProgressi().catch(() => null), stagione(),
  ]);
  const lavori = calcolaLavori({ oggi, zonaId: impostazioni.zona, schede: filtraSeguite(schede, impostazioni.colture_scelte, colture), colture, eventi });

  // Un invito al quiz del giorno e a Rossella, sotto i lavori: un motivo per riaprire l'app anche quando non c'è molto da fare.
  const domandeQuiz = (await quiz())?.domande?.length ? impostazioni.quiz_risultati ?? {} : null;
  // Le cose da fare per divertirsi e capire: la foto sta sempre qui, il quiz solo se ci sono le domande.
  const quizFatto = domandeQuiz && domandeQuiz[oggi] !== undefined;
  const tessera = (href, titolo, spiega, extra = {}) => el(extra.pulsante ? 'button' : 'a', { class: 'tessera-azione', ...(extra.pulsante ? { type: 'button', onclick: extra.pulsante } : { href }), ...(extra.id ? { id: extra.id } : {}) }, el('strong', {}, titolo), el('span', { class: 'aiuto' }, spiega));
  const cartaGioca = el('section', { class: 'gioca' },
    el('h3', {}, t('oggi.gioca.titolo')),
    tessera('#/dottore', t('oggi.gioca.foto'), t('oggi.gioca.foto.spiega'), { id: 'fotografa' }),
    el('div', { class: 'tessere-azione' },
      domandeQuiz ? tessera('#/quiz', t('oggi.gioca.quiz'), quizFatto ? t('oggi.gioca.quiz.fatto', { punti: domandeQuiz[oggi] }) : t('oggi.gioca.quiz.da_fare', { n: serieQuiz(domandeQuiz, oggi) })) : null,
      tessera('', t('resoconto.apri'), t('resoconto.spiega'), { pulsante: apriResoconto, id: 'apri-resoconto' }),
      tessera('#/cucina', t('cucina.apri'), t('cucina.spiega')),
      tessera('#/chiedi', t('oggi.gioca.chiedi'), t('oggi.gioca.chiedi.spiega'))));

  // «Lo sapevi?»: una curiosità al giorno, con la sua fonte e i commenti dei vermetti.
  const cur = curiositaDelGiorno((await curiosita())?.curiosita, oggi);
  const cartaSapevi = cur ? el('section', { class: 'card sapevi' },
    el('h3', {}, t('sapevi.titolo')),
    el('p', {}, cur.testo),
    cur.rosso ? el('p', { class: 'aiuto' }, el('strong', {}, `${t('mascotte.rosso')}: `), String(cur.rosso).replace(/^Rosso:\s*/, '')) : null,
    cur.rossella ? el('p', { class: 'aiuto' }, el('strong', {}, `${t('mascotte.rossella')}: `), String(cur.rossella).replace(/^Rossella:\s*/, '')) : null,
    cur.fonte && /^https:/.test(cur.fonte) ? el('p', { class: 'aiuto' }, el('a', { class: 'btn piccolo', href: cur.fonte, target: '_blank', rel: 'noopener noreferrer' }, t('sapevi.fonte'))) : null) : null;

  const lista = el('ol', { class: 'lavori' });
  const listaExtra = el('ol', { class: 'lavori' });
  const zonaConversazione = el('div', {});

  const mostraConversazione = (chiave, chiaveRossella = chiave) => zonaConversazione.replaceChildren(conversazione([
    { chi: 'rosso', testo: t(`oggi.rosso.${chiave}`), variante: 'ride' },
    { chi: 'rossella', testo: t(`oggi.rossella.${chiaveRossella}`), variante: 'pensa' },
  ]));

  const alChiudere = async (voce, carta, tipo, esito, dataFatto = oggi) => {
    await registraEvento(nuovoEvento({
      tipo,
      zonaId: impostazioni.zona,
      colturaId: voce.coltura?.id ?? null,
      schedaId: voce.scheda.id,
      lavoroId: voce.lavoro.id,
      data: dataFatto, // di solito oggi; «L'ho fatto un altro giorno» la sceglie
      esito,
    }));
    carta.remove();
    toast(t(tipo === 'lavoro_fatto' ? 'lavoro.fatto.toast' : 'lavoro.saltato.toast'));
    if (tipo === 'lavoro_fatto') {
      // Se c'è un traguardo o un livello nuovo, festeggiano quello; altrimenti i complimenti di tutti i giorni.
      const r = await controllaProgressi();
      if (!r?.nuovi?.length && !r?.livelloSalito) festeggia('fatto');
    }
    if (tipo === 'lavoro_fatto' && voce.lavoro.operazione === 'raccolta') {
      apriRaccolto(colture, { colturaId: voce.coltura?.id ?? null, nome: voce.scheda.nome, data: dataFatto });
    }
    if (!lista.children.length && !listaExtra.children.length) mostraConversazione('finito');
  };

  lavori.forEach((voce, i) => (i < 3 ? lista : listaExtra).append(scheda(voce, i, { termini, impostazioni, alChiudere })));

  if (lavori.length) {
    // Se qualche consiglio non è verificato, Rossella lo dice subito, prima dell'elenco.
    const nonVerificati = lavori.some((v) => v.lavoro.certezza === 'bassa');
    mostraConversazione('lavori', nonVerificati ? 'lavori_prova' : 'lavori');
  } else {
    mostraConversazione('niente');
  }

  // Il consiglio dei vermetti (o il bentornato, se mancavi da giorni): una battuta utile con, se serve, un pulsante per andare lì.
  const giorniFuori = giorniAssenzaSessione();
  const chiaveBentornato_ = chiaveBentornato(giorniFuori);
  let piove = null;
  try { piove = await pioveOggiDaCache(); } catch { piove = null; }
  const voce = chiaveBentornato_
    ? { chi: 'rosso', chiave: chiaveBentornato_, vars: { n: giorniFuori }, rotta: null }
    : scegliConsiglio(consigliDeiVermi({ lavori: lavori.map((v) => ({ titolo: v.lavoro.titolo })), quizFatto: domandeQuiz ? Boolean(quizFatto) : null, haColture: colture.length > 0, curiosita: cur ?? null, piove, haSchedeAnimali: Boolean((await animali())?.schede?.length) }), [], Number(oggi.replace(/-/g, '')));
  const cartaConsiglio = voce ? el('section', { class: 'card consiglio-vignetta' },
    conversazione([{ chi: voce.chi, testo: t(voce.chiave, voce.vars), variante: voce.chi === 'rosso' ? 'ride' : 'pensa' }]),
    voce.rotta ? el('a', { class: 'btn', href: voce.rotta }, t('verme.consiglio.vai')) : null) : null;
  // Le piante dell'utente, fase per fase: cosa fare adesso in base all'età (solo per le colture di cui abbiamo le fasi).
  const [dFasi, dRaccolta] = await Promise.all([fasi(), raccolta()]);
  const fotoDiagnosi = await elencoFoto().catch(() => []);
  const bloccoPiante = [...colture].sort((a, b) => b.dataSemina.localeCompare(a.dataSemina)).map((c) => bloccoFase(c, dFasi, oggi, { raccoltaDati: dRaccolta })).filter(Boolean).slice(0, 5);
  const minime = await previsioni().then(({ giorni }) => giorni.filter((x) => x.data >= oggi).slice(0, 7).map((x) => x.min)).catch(() => []);
  const pianteBustine = [...colture].sort((a, b) => b.dataSemina.localeCompare(a.dataSemina)).slice(0, 8).map((c) => {
    const sc = schede.find((x) => x.id === c.schedaId);
    const st = statoFase(c, dFasi, oggi);
    const diagnosi = fotoDiagnosi.filter((f) => f.colturaId === c.id && f.diagnosi).sort((a, b) => b.data.localeCompare(a.data))[0]?.diagnosi ?? null;
    const stagioneColtura = giudizioStagione({ coltura: c, scheda: sc, zonaId: impostazioni.zona, dati: datiStagione, oggi, minime });
    const salute = valutaSalute({ diagnosi, stagione: stagioneColtura, giorniAnnaffiatura: giorniDaAnnaffiatura(eventi, c.id, oggi), acqua: st?.fase?.acqua?.livello });
    const cicloFasi = st?.dati?.fasi?.at(-1)?.a_giorno;
    return bustinaPianta({ coltura: c, scheda: sc, stato: salute.stato, fase: st?.fase?.nome, eta: st?.eta, ciclo: sc?.giorni_alla_raccolta?.max ?? cicloFasi, href: `#/pianta?id=${encodeURIComponent(c.id)}&scheda=oggi` });
  });
  const cartaPiante = pianteBustine.length ? el('section', { class: 'riquadro sezione-bustine bento-largo' }, el('h3', {}, t('oggi.piante')), el('div', { class: 'striscia-bustine' }, pianteBustine)) : null;
  const avvisiGelo = el('section', { class: 'avvisi-stagione' });
  for (const c of colture) {
    const sc = schede.find((x) => x.id === c.schedaId);
    const giudizio = giudizioStagione({ coltura: c, scheda: sc, zonaId: impostazioni.zona, dati: datiStagione, oggi, minime });
    if (giudizio.stato === 'gelo-in-arrivo') avvisiGelo.append(bloccoStagione(giudizio, datiStagione));
  }
  // «I tuoi primi passi»: una breve lista di cose da provare, finché non sono fatte (o l'utente la chiude).
  let cartaPassi = null;
  if (!impostazioni.primi_passi_chiusi) {
    const [foto, zone] = await Promise.all([elencoFoto(), elencoZone()]);
    const passi = primiPassi({ colture, eventi, foto, zone, semi: impostazioni.semi, quizGiocati: Object.keys(impostazioni.quiz_risultati ?? {}).length, haChiave: Boolean(impostazioni.ai_chiave) });
    const prossimo = prossimoPasso(passi);
    const { fatti, totale } = avanzamento(passi);
    if (prossimo) {
      cartaPassi = el('section', { class: 'card primi-passi' },
        el('h3', {}, t('primi.titolo')),
        conversazione([{ chi: 'rosso', testo: t('primi.rosso', { passo: t(prossimo.chiave).toLowerCase() }), variante: 'ride' }]),
        el('p', { class: 'aiuto' }, t('primi.avanzamento', { fatti, totale })),
        el('ul', { class: 'elenco-passi' }, passi.map((p) => el('li', { class: p.fatto ? 'fatto' : '' }, el('span', { class: 'segno', 'aria-hidden': 'true' }, p.fatto ? '+' : '-'), ' ', p.fatto ? el('span', {}, t(p.chiave), ' ', el('em', {}, `(${t('primi.fatto')})`)) : el('a', { class: 'voce-passo', href: p.rotta }, t(p.chiave))))),
        el('button', { class: 'btn', type: 'button', id: 'primi-chiudi', onclick: async () => { await imposta('primi_passi_chiusi', true); cartaPassi.remove(); } }, t('primi.chiudi')));
    }
  }
  aggiungi(contenitore, 
    el('h2', { class: 'titolo-schermata' }, t('oggi.titolo')),
    el('div', { class: 'striscia-giorno' }, el('div', { class: 'giorno-condizioni' }, el('span', { class: 'giorno-data' }, formattaDataLunga(oggi)), cartaMeteo()), avvisiGelo),
    el('section', { class: 'sezione-da-fare' },
    el('h3', { class: 'titolo-lavori' }, t('oggi.da_fare')),
    lavori.length ? lista : el('section', { class: 'card vuoto' },
      el('img', { class: 'illustrazione', src: 'assets/illustrazioni/vuoto.svg', alt: '' }),
      el('a', { class: 'btn primario', href: '#/colture' }, t('oggi.vai_colture')),
    ),
    lavori.length > 3 ? el('details', { class: 'altri-lavori' }, el('summary', {}, t('oggi.altri_lavori', { n: lavori.length - 3 })), listaExtra) : null),
    cartaPiante,
    el('section', { class: 'scorciatoie' }, el('h3', {}, t('oggi.scorciatoie')), el('div', { class: 'scorciatoie-griglia' },
      ...[['dottore','oggi.scorciatoia.foto','#/dottore'],['acqua','oggi.scorciatoia.acqua','#/colture'],['raccolto','oggi.scorciatoia.raccolto','#/raccolto'],['appunto','oggi.scorciatoia.appunto','#/diario']].map(([ic, key, href]) => el('a', { class: 'scorciatoia', href }, iconaScorciatoia(ic), t(key))))),
    el('details', { class: 'contenuto-secondario oggi-altri' }, el('summary', {}, t('oggi.per_te')), el('p', { class: 'saluto' }, testoSaluto(impostazioni)), cartaPassi, bloccoPiante.length ? el('section', { class: 'piante-fasi-legacy' }, ...bloccoPiante) : null, cartaConsiglio, cartaGioca, cartaSapevi, zonaConversazione, carta, bloccoInstalla({ rimandabile: true })),
  );
  // L'acqua di ogni fase, unita al tempo: cosa fare oggi.
  previsioni().then(({ giorni }) => {
    const c = giorni.some((g) => g.data < oggi) ? consigliAcqua(giorni, oggi) : null;
    if (c) aggiornaAcqua(contenitore, c.annaffia);
  }).catch(() => {});
  // Se oggi piove, Rosso è sorpreso (le previsioni le conosciamo già).
  if (piove === true) setTimeout(() => reagisci('sorpreso', 3500, 'rosso'), 700);
}
