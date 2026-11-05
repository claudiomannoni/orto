// Le colture dell'utente: elenco, aggiunta, promemoria, eliminazione.
import { el, sostituisci, oggiISO, giorniDa, aggiungiGiorni, formattaData, aggiungi, parametriRotta } from '../util.js';
import { t, tn } from '../i18n.js';
import { elencoColture, salvaColtura, eliminaColtura, normalizzaColtura, nuovoEvento, registraEvento, eliminaEvento, elencoEventi } from '../store/dati.js';
import { elencoFoto } from '../store/foto.js';
import { statoFase } from '../ui/fasi-pianta.js';
import { fasi, raccolta } from '../contenuti.js';
import { valutaSalute, giorniDaAnnaffiatura } from '../motore/salute.js';
import { giudizioStagione } from '../motore/stagione.js';
import { previsioni } from '../meteo.js';
import { elencoZone } from '../store/zone.js';
import { controllaProgressi } from '../store/progressi.js';
import { catalogo, trovaScheda, animali, rendita, alberi, stagione } from '../contenuti.js';
import { riempiStagione } from '../ui/stagione-blocco.js';
import { leggi } from '../store/impostazioni.js';
import { apriFoglio } from '../ui/foglio.js';
import { apriPromemoria } from '../ui/promemoria.js';
import { toast } from '../ui/toast.js';
import { aiuole } from '../ui/aiuole.js';
import { bloccoBustina } from '../ui/bustina.js';

let schede = [];
let datiStagione = null;
let zonaClimatica = null;
let colture = [];
let zone = [];
let lista;
let riquadro; // «il tuo orto dall'alto»: si ridisegna a ogni modifica
let conteggio;
let eventi = [];
let foto = [];
let datiFasi = null;
let datiRaccolta = null;
let filtro = 'tutte';
let minime = [];

function testoGiorni(giorni) {
  return giorni >= 0
    ? { numero: giorni, etichetta: tn('coltura.giorni.dopo', giorni) }
    : { numero: -giorni, etichetta: tn('coltura.giorni.prima', -giorni) };
}

function icona(coltura) {
  const scheda = schede.find((s) => s.id === coltura.schedaId) ?? trovaScheda(schede, coltura.nome);
  return el('img', { class: 'icona-coltura', src: scheda?.icona ?? 'assets/colture/generica.svg', alt: '', width: 64, height: 64 });
}

// L'avviso di stagione sotto la pianta: fuori stagione, gelo in arrivo, fine stagione (riempito subito col calendario e poi con le previsioni).
function riquadroStagione(coltura) {
  const dentro = el('div', { class: 'stagione-posto' });
  const sc = schede.find((s) => s.id === coltura.schedaId) ?? trovaScheda(schede, coltura.nome);
  if (sc) riempiStagione(dentro, { coltura: { ...coltura, schedaId: coltura.schedaId ?? sc.id }, scheda: sc, zonaId: zonaClimatica, dati: datiStagione });
  return dentro;
}

function scheda(coltura) {
  const eta = giorniDa(coltura.dataSemina);
  const st = statoFase(coltura, datiFasi, oggiISO());
  const salute = statoRiga(coltura);
  const sc = schede.find((x) => x.id === coltura.schedaId) ?? trovaScheda(schede, coltura.nome);
  const raccolto = sc?.giorni_alla_raccolta;
  const nomeCompleto = coltura.varieta ? `${coltura.nome} · ${coltura.varieta}` : coltura.nome;
  const zona = zone.find((z) => z.id === coltura.zonaId);
  const dato = (chiave, ...contenuto) => el('div', { class: 'dato' }, el('dt', {}, t(chiave)), el('dd', {}, ...contenuto));
  const registra = (azione) => async () => {
    const ev = nuovoEvento({ tipo: azione, zonaId: coltura.zonaId, colturaId: coltura.id, schedaId: coltura.schedaId, data: oggiISO(), esito: 'ok' });
    await registraEvento(ev);
    eventi.push(ev);
    mostraLista();
    toast(t(`coltura.azione.${azione}.toast`));
  };
  const periodoRaccolto = raccolto?.min && raccolto?.max
    ? t('colture.raccolto', { inizio: formattaData(aggiungiGiorni(oggiISO(), Math.max(0, raccolto.min - (st?.eta ?? eta)))), fine: formattaData(aggiungiGiorni(oggiISO(), Math.max(0, raccolto.max - (st?.eta ?? eta)))) })
    : t('comune.non_disponibile');
  return el('li', { class: `card coltura salute-bordo-${salute.stato}` },
    el('div', { class: 'coltura-testa' },
      icona(coltura),
      el('div', { class: 'coltura-testi' },
        el('h3', {}, nomeCompleto),
        el('p', { class: 'meta' }, el('span', { class: `etichetta ${coltura.dove}` }, t(`form.dove.${coltura.dove}`)), ' ', t(coltura.partenza === 'piantina' ? 'coltura.trapiantata_il' : 'coltura.seminata_il', { data: formattaData(coltura.dataSemina) }), zona ? ` · ${zona.nome}` : '')),
      el('span', { class: `salute salute-${salute.stato}`, role: 'status' }, t(`salute.${salute.stato}`))),
    el('dl', { class: 'dati-coltura' },
      dato('colture.campo.eta', coltura.partenza === 'piantina' ? `${t('colture.eta', { n: eta })} · ${t('colture.trapiantata')}` : t('colture.eta', { n: eta })),
      dato('colture.campo.fase', st?.fase?.nome ?? t('colture.fase_sconosciuta')),
      dato('colture.campo.prossima', st?.fase?.cosa_fare?.[0] ?? t('colture.azione_sconosciuta')),
      dato('colture.campo.raccolto', periodoRaccolto, raccolto?.certezza ? el('span', { class: `etichetta certezza ${['alta', 'media'].includes(raccolto.certezza) ? raccolto.certezza : 'bassa'}` }, t(`animali.certezza.${raccolto.certezza}`)) : null)),
    coltura.note ? el('p', { class: 'note' }, coltura.note) : null,
    riquadroStagione(coltura),
    el('div', { class: 'riga azioni-rapide' },
      el('button', { class: 'btn', type: 'button', onclick: registra('innaffiato') }, t('coltura.azione.innaffiato')),
      el('button', { class: 'btn', type: 'button', onclick: registra('raccolto') }, t('coltura.azione.raccolto')),
      el('a', { class: 'btn primario', href: `#/pianta?id=${encodeURIComponent(coltura.id)}` }, t('pianta.storia'))),
    el('details', { class: 'coltura-azioni' }, el('summary', {}, t('colture.altre_azioni')),
      el('div', { class: 'riga' },
        el('button', { class: 'btn', type: 'button', onclick: () => promemoria(coltura) }, t('coltura.promemoria')),
        el('button', { class: 'btn pericolo', type: 'button', onclick: () => elimina(coltura) }, t('coltura.elimina')))));
}

const tessera = (href, titolo, spiega) => el('a', { class: 'tessera-azione', href }, el('strong', {}, titolo), el('span', { class: 'aiuto' }, spiega));

function statoRiga(coltura) {
  const diagnosi = foto.filter((f) => f.colturaId === coltura.id && f.diagnosi).sort((a,b) => b.data.localeCompare(a.data))[0]?.diagnosi;
  const st = statoFase(coltura, datiFasi, oggiISO());
  const scheda = schede.find((x) => x.id === coltura.schedaId);
  const stagione = giudizioStagione({ coltura, scheda, zonaId: zonaClimatica, dati: datiStagione, oggi: oggiISO(), minime });
  return valutaSalute({ stagione, diagnosi, giorniAnnaffiatura: giorniDaAnnaffiatura(eventi, coltura.id, oggiISO()), acqua: st?.fase?.acqua?.livello });
}

function mostraLista() {
  const ordinate = [...colture].sort((a, b) => b.dataSemina.localeCompare(a.dataSemina));
  const visibili = ordinate.filter((c) => filtro === 'tutte' || (filtro === 'urgenti' ? statoRiga(c).stato === 'urgente' : filtro === 'oggi' ? ['attenzione', 'urgente'].includes(statoRiga(c).stato) : true));
  lista.replaceChildren(...visibili.map(scheda));
  sostituisci(riquadro, aiuole(colture, zone, schede));
  conteggio.textContent = String(colture.length);
  const vuoto = document.getElementById('colture-vuoto');
  vuoto.hidden = visibili.length > 0;
  vuoto.textContent = colture.length && !visibili.length ? t('colture.filtro_vuoto') : t('colture.vuoto');
}

function promemoria(coltura) {
  const nome = coltura.varieta ? `${coltura.nome} (${coltura.varieta})` : coltura.nome;
  const righe = [
    t('promemoria.coltura', { nome }),
    t('promemoria.seminata', { data: formattaData(coltura.dataSemina), dove: t(`form.dove.${coltura.dove}`).toLowerCase() }),
    coltura.note ? t('promemoria.note', { note: coltura.note }) : '',
  ].filter(Boolean);
  apriPromemoria({
    titolo: t('promemoria.titolo_evento', { nome }),
    data: aggiungiGiorni(oggiISO(), 7),
    descrizione: righe.join('\n'),
  });
}

async function elimina(coltura) {
  const nome = coltura.varieta ? `${coltura.nome} ${coltura.varieta}` : coltura.nome;
  if (!confirm(t('coltura.elimina.conferma', { nome }))) return;
  await eliminaColtura(coltura.id);
  colture = colture.filter((c) => c.id !== coltura.id);
  mostraLista();
  previsioni().then(({ giorni }) => {
    minime = giorni.filter((x) => x.data >= oggiISO()).slice(0, 7).map((x) => x.min);
    mostraLista();
  }).catch(() => {});
  toast(t('coltura.eliminata'));
}

function apriNuova(nomeIniziale = '') {
  const campoNome = el('input', {
    name: 'nome', required: true, maxlength: 60, list: 'elenco-schede', placeholder: t('form.nome.esempio'), autocomplete: 'off',
    value: typeof nomeIniziale === 'string' ? nomeIniziale : '',
  });
  // «Leggi dalla bustina»: compila nome, varietà e note dal testo della confezione dei semi.
  const campoVarieta = el('input', { name: 'varieta', maxlength: 60, placeholder: t('form.varieta.esempio') });
  const campoNote = el('textarea', { name: 'note', rows: 3, placeholder: t('form.note.esempio') });
  const bustina = bloccoBustina({
    schede,
    riempi: ({ nome, varieta, note }) => {
      campoNome.value = nome;
      campoVarieta.value = varieta;
      if (note) campoNote.value = note;
    },
  });
  const form = el('form', { class: 'form', autocomplete: 'off' },
    bustina,
    el('label', {}, t('form.nome'), campoNome),
    el('datalist', { id: 'elenco-schede' }, schede.map((s) => el('option', { value: s.nome }))),
    el('label', {}, t('form.varieta'), campoVarieta),
    el('fieldset', { class: 'scelte' },
      el('legend', {}, t('form.partenza')),
      el('label', {}, el('input', { type: 'radio', name: 'partenza', value: 'seme', checked: true }), t('form.partenza.seme')),
      el('label', {}, el('input', { type: 'radio', name: 'partenza', value: 'piantina' }), t('form.partenza.piantina')),
    ),
    el('label', {}, el('span', { class: 'etichetta-data' }, t('form.data')), el('input', { name: 'dataSemina', type: 'date', required: true, value: oggiISO() })),
    el('fieldset', { class: 'scelte' },
      el('legend', {}, t('form.dove')),
      el('label', {}, el('input', { type: 'radio', name: 'dove', value: 'semenzaio', checked: true }), t('form.dove.semenzaio')),
      el('label', {}, el('input', { type: 'radio', name: 'dove', value: 'orto' }), t('form.dove.orto')),
    ),
    zone.length ? el('label', {}, t('form.zona'),
      el('select', { name: 'zonaId' }, [el('option', { value: '' }, t('form.zona.nessuna')), ...zone.map((z) => el('option', { value: z.id }, z.nome))])) : null,
    el('label', {}, t('form.note'), campoNote),
    el('div', { class: 'riga' },
      el('button', { class: 'btn', type: 'button', onclick: () => foglio.close() }, t('form.annulla')),
      el('button', { class: 'btn primario', type: 'submit' }, t('form.aggiungi')),
    ),
  );
  const foglio = apriFoglio({ titolo: t('colture.nuova'), contenuto: form });
  // La data è quella di semina o di trapianto, a seconda di come si parte.
  form.querySelectorAll('input[name=partenza]').forEach((r) => r.addEventListener('change', () => {
    form.querySelector('.etichetta-data').textContent = t(form.elements.partenza.value === 'piantina' ? 'form.data.trapianto' : 'form.data');
  }));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dati = new FormData(form);
    const nome = String(dati.get('nome')).trim();
    const coltura = normalizzaColtura({
      nome,
      varieta: dati.get('varieta'),
      dataSemina: dati.get('dataSemina'),
      dove: dati.get('dove'),
      partenza: dati.get('partenza'),
      note: dati.get('note'),
      schedaId: trovaScheda(schede, nome)?.id,
      zonaId: dati.get('zonaId'),
    });
    if (!coltura.nome || !coltura.dataSemina) return;
    await salvaColtura(coltura);
    controllaProgressi();
    colture.push(coltura);
    mostraLista();
    foglio.close();
    toast(t('coltura.aggiunta'));
  });
  campoNome.focus();
}

export async function monta(contenitore) {
  [colture, schede, zone, eventi, foto, datiFasi, datiRaccolta] = await Promise.all([elencoColture(), catalogo(), elencoZone(), elencoEventi(), elencoFoto(), fasi(), raccolta()]);
  [datiStagione, zonaClimatica] = await Promise.all([stagione(), leggi().then((i) => i.zona)]);
  const [dAnimali, dRendita, dAlberi] = await Promise.all([animali(), rendita(), alberi()]);
  conteggio = el('span', { class: 'conteggio' }, '0');
  lista = el('ul', { class: 'lista' });
  riquadro = el('div', {});
  const filtri = el('div', { class: 'filtri-colture', role: 'group', 'aria-label': t('colture.filtra') }, ...['tutte','oggi','urgenti'].map((val) => el('button', { class: 'btn', type: 'button', 'aria-pressed': String(filtro === val), onclick: () => { filtro = val; mostraLista(); } }, t(`colture.filtro.${val}`))));
  const altro = el('details', { class: 'contenuto-secondario' }, el('summary', {}, t('colture.altro')), el('div', { class: 'tessere-azione' },
    tessera('#/zone', t('colture.hub.zone'), t('colture.hub.zone.spiega')), tessera('#/diario', t('colture.hub.diario'), t('colture.hub.diario.spiega')), tessera('#/storia', t('colture.hub.storia'), t('colture.hub.storia.spiega')), tessera('#/raccolto', t('colture.hub.raccolto'), t('colture.hub.raccolto.spiega')), tessera('#/eccesso', t('colture.hub.eccesso'), t('colture.hub.eccesso.spiega')), tessera('#/semi', t('colture.hub.semi'), t('colture.hub.semi.spiega')), tessera('#/animali', t('colture.hub.animali'), t('colture.hub.animali.spiega')), tessera('#/alberi', t('colture.hub.alberi'), t('colture.hub.alberi.spiega')), tessera('#/rendita', t('colture.hub.rendita'), t('colture.hub.rendita.spiega'))));
  aggiungi(contenitore,
    el('h2', { class: 'titolo-schermata' }, t('colture.hub')),
    el('button', { class: 'btn primario grande', type: 'button', onclick: apriNuova }, `+ ${t('colture.nuova')}`),
    filtri,
    el('p', { class: 'vuoto-testo', id: 'colture-vuoto' }, t('colture.vuoto')),
    lista, riquadro, altro,
  );
  mostraLista();
  previsioni().then(({ giorni }) => {
    minime = giorni.filter((x) => x.data >= oggiISO()).slice(0, 7).map((x) => x.min);
    mostraLista();
  }).catch(() => {});
  // Arrivando dalla scheda di una coltura («Aggiungi al mio orto») il modulo si apre già col nome.
  const daSchedaId = parametriRotta().get('nuova');
  const daScheda = daSchedaId ? schede.find((s) => s.id === daSchedaId) : null;
  if (daScheda) apriNuova(daScheda.nome);
  else if (parametriRotta().get('bustina') === '1') apriNuova();
}
