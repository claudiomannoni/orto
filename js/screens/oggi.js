// "Oggi in campagna": i lavori del giorno, in ordine di importanza.
import { el, oggiISO, formattaDataLunga, normalizza, aggiungi } from '../util.js';
import { t, tn } from '../i18n.js';
import { elencoColture, elencoEventi, nuovoEvento, registraEvento } from '../store/dati.js';
import { leggi } from '../store/impostazioni.js';
import { catalogo, glossario } from '../contenuti.js';
import { calcolaLavori } from '../motore/oggi.js';
import { conversazione, festeggia } from '../ui/mascotte.js';
import { apriFoglio } from '../ui/foglio.js';
import { apriPromemoria } from '../ui/promemoria.js';
import { toast } from '../ui/toast.js';
import { etichettaOrto } from '../ui/identita.js';
import { bloccoInstalla } from '../ui/installa.js';
import { controllaProgressi } from '../store/progressi.js';
import { cartaProgressi } from '../ui/progressi.js';
import { cartaMeteo } from '../ui/meteo.js';

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

function blocchiMetodi(metodi, preferito) {
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

  const carta = el('li', { class: 'card lavoro' },
    el('span', { class: 'numero', 'aria-hidden': 'true' }, String(indice + 1)),
    dettagli,
    el('div', { class: 'riga' },
      el('button', { class: 'btn primario', type: 'button', onclick: () => alChiudere(voce, carta, 'lavoro_fatto', 'ok') }, t('lavoro.fatto')),
      el('button', { class: 'btn', type: 'button', onclick: () => alChiudere(voce, carta, 'lavoro_saltato', 'saltato') }, t('lavoro.non_oggi')),
    ),
  );
  return carta;
}

export async function monta(contenitore) {
  const oggi = oggiISO();
  const [colture, eventi, schede, impostazioni, termini, carta] = await Promise.all([
    elencoColture(), elencoEventi(), catalogo(), leggi(), glossario(), cartaProgressi().catch(() => null),
  ]);
  const lavori = calcolaLavori({ oggi, zonaId: impostazioni.zona, schede, colture, eventi });

  const lista = el('ol', { class: 'lavori' });
  const zonaConversazione = el('div', {});

  const mostraConversazione = (chiave, chiaveRossella = chiave) => zonaConversazione.replaceChildren(conversazione([
    { chi: 'rosso', testo: t(`oggi.rosso.${chiave}`), variante: 'ride' },
    { chi: 'rossella', testo: t(`oggi.rossella.${chiaveRossella}`), variante: 'pensa' },
  ]));

  const alChiudere = async (voce, carta, tipo, esito) => {
    await registraEvento(nuovoEvento({
      tipo,
      zonaId: impostazioni.zona,
      colturaId: voce.coltura?.id ?? null,
      schedaId: voce.scheda.id,
      lavoroId: voce.lavoro.id,
      data: oggi,
      esito,
    }));
    carta.remove();
    toast(t(tipo === 'lavoro_fatto' ? 'lavoro.fatto.toast' : 'lavoro.saltato.toast'));
    if (tipo === 'lavoro_fatto') {
      // Se c'è un traguardo o un livello nuovo, festeggiano quello; altrimenti i complimenti di tutti i giorni.
      const r = await controllaProgressi();
      if (!r?.nuovi?.length && !r?.livelloSalito) festeggia('fatto');
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

  aggiungi(contenitore, 
    el('h2', { class: 'titolo-schermata' }, t('oggi.titolo')),
    el('p', { class: 'data-lunga' }, formattaDataLunga(oggi)),
    etichettaOrto(impostazioni) ? el('p', { class: 'nome-orto' }, etichettaOrto(impostazioni)) : null,
    carta,
    cartaMeteo(),
    bloccoInstalla({ rimandabile: true }),
    zonaConversazione,
    lavori.length ? lista : el('section', { class: 'card vuoto' },
      el('img', { class: 'illustrazione', src: 'assets/illustrazioni/vuoto.svg', alt: '' }),
      el('a', { class: 'btn primario', href: '#/colture' }, t('oggi.vai_colture')),
    ),
  );
}
