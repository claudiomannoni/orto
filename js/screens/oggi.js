// "Oggi in campagna": i lavori del giorno, in ordine di importanza.
import { el, oggiISO, formattaDataLunga, normalizza, aggiungi, aggiungiGiorni, dataValida } from '../util.js';
import { t, tn } from '../i18n.js';
import { elencoColture, elencoEventi, nuovoEvento, registraEvento } from '../store/dati.js';
import { leggi } from '../store/impostazioni.js';
import { catalogo, glossario, quiz, curiosita, animali } from '../contenuti.js';
import { calcolaLavori } from '../motore/oggi.js';
import { conversazione, festeggia, vestitoAttuale } from '../ui/mascotte.js';
import { apriFoglio } from '../ui/foglio.js';
import { apriPromemoria } from '../ui/promemoria.js';
import { toast } from '../ui/toast.js';
import { etichettaOrto } from '../ui/identita.js';
import { bloccoInstalla } from '../ui/installa.js';
import { controllaProgressi } from '../store/progressi.js';
import { cartaProgressi } from '../ui/progressi.js';
import { cartaMeteo } from '../ui/meteo.js';
import { pulsanteAscolta } from '../ui/voce.js';
import { apriRaccolto } from '../ui/raccolto-form.js';
import { apriResoconto } from '../ui/resoconto.js';
import { filtraSeguite } from '../motore/seguite.js';
import { previsioni } from '../meteo.js';
import { consiglioMeteo } from '../motore/meteo.js';
import { serieQuiz } from '../motore/quiz.js';
import { curiositaDelGiorno } from '../motore/curiosita.js';
import { chiaveSaluto } from '../motore/saluto.js';

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
    dettagli,
    consiglio,
    el('div', { class: 'riga' },
      el('button', { class: 'btn primario', type: 'button', onclick: () => alChiudere(voce, carta, 'lavoro_fatto', 'ok') }, t('lavoro.fatto')),
      el('button', { class: 'btn', type: 'button', onclick: () => alChiudere(voce, carta, 'lavoro_saltato', 'saltato') }, t('lavoro.non_oggi')),
    ),
  );
  return carta;
}

const FESTE = ['halloween', 'natale', 'pasqua', 'carnevale', 'compleanno', 'festa'];

// «Buongiorno, Claudio»: dipende dall'ora; nei giorni di festa (quando i vermetti sono vestiti a festa) saluta con gli auguri.
function testoSaluto(impostazioni) {
  const festa = FESTE.includes(vestitoAttuale()) ? vestitoAttuale() : null;
  const saluto = t(chiaveSaluto(new Date().getHours(), { festa }));
  return impostazioni.nome_coltivatore ? t('saluto.con_nome', { saluto, nome: impostazioni.nome_coltivatore }) : saluto;
}

export async function monta(contenitore) {
  const oggi = oggiISO();
  const [colture, eventi, schede, impostazioni, termini, carta] = await Promise.all([
    elencoColture(), elencoEventi(), catalogo(), leggi(), glossario(), cartaProgressi().catch(() => null),
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
    if (!lista.children.length) mostraConversazione('finito');
  };

  lavori.forEach((voce, i) => lista.append(scheda(voce, i, { termini, impostazioni, alChiudere })));

  if (lavori.length) {
    // Se qualche consiglio non è verificato, Rossella lo dice subito, prima dell'elenco.
    const nonVerificati = lavori.some((v) => v.lavoro.certezza === 'bassa');
    mostraConversazione('lavori', nonVerificati ? 'lavori_prova' : 'lavori');
  } else {
    mostraConversazione('niente');
  }

  // I vermetti liberi usano questo stato per dare consigli utili (js/ui/vermi-liberi.js).
  window.dispatchEvent(new CustomEvent('stato-oggi', { detail: { lavori: lavori.map((v) => ({ titolo: v.lavoro.titolo })), quizFatto: domandeQuiz ? Boolean(quizFatto) : null, haColture: colture.length > 0, curiosita: cur ?? null, haSchedeAnimali: Boolean((await animali())?.schede?.length) } }));
  aggiungi(contenitore, 
    el('h2', { class: 'titolo-schermata' }, t('oggi.titolo')),
    el('p', { class: 'saluto' }, testoSaluto(impostazioni)),
    el('p', { class: 'data-lunga' }, formattaDataLunga(oggi)),
    etichettaOrto(impostazioni) ? el('p', { class: 'nome-orto' }, etichettaOrto(impostazioni)) : null,
    cartaMeteo(),
    lavori.length ? lista : el('section', { class: 'card vuoto' },
      el('img', { class: 'illustrazione', src: 'assets/illustrazioni/vuoto.svg', alt: '' }),
      el('a', { class: 'btn primario', href: '#/colture' }, t('oggi.vai_colture')),
    ),
    // Prima quello che serve oggi (il tempo e i lavori); poi i vermetti che commentano, i progressi e l'invito a scaricare l'app.
    cartaGioca,
    cartaSapevi,
    zonaConversazione,
    carta,
    bloccoInstalla({ rimandabile: true }),
  );
}
