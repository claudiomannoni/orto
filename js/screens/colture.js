// Le colture dell'utente: elenco, aggiunta, promemoria, eliminazione.
import { el, sostituisci, oggiISO, giorniDa, aggiungiGiorni, formattaData, aggiungi, parametriRotta } from '../util.js';
import { t, tn } from '../i18n.js';
import { elencoColture, salvaColtura, eliminaColtura, normalizzaColtura } from '../store/dati.js';
import { elencoZone } from '../store/zone.js';
import { controllaProgressi } from '../store/progressi.js';
import { catalogo, trovaScheda } from '../contenuti.js';
import { apriFoglio } from '../ui/foglio.js';
import { apriPromemoria } from '../ui/promemoria.js';
import { toast } from '../ui/toast.js';
import { aiuole } from '../ui/aiuole.js';
import { bloccoBustina } from '../ui/bustina.js';

let schede = [];
let colture = [];
let zone = [];
let lista;
let riquadro; // «il tuo orto dall'alto»: si ridisegna a ogni modifica
let conteggio;

function testoGiorni(giorni) {
  return giorni >= 0
    ? { numero: giorni, etichetta: tn('coltura.giorni.dopo', giorni) }
    : { numero: -giorni, etichetta: tn('coltura.giorni.prima', -giorni) };
}

function icona(coltura) {
  const scheda = schede.find((s) => s.id === coltura.schedaId) ?? trovaScheda(schede, coltura.nome);
  return el('img', { class: 'icona-coltura', src: scheda?.icona ?? 'assets/colture/generica.svg', alt: '', width: 64, height: 64 });
}

function scheda(coltura) {
  const { numero, etichetta } = testoGiorni(giorniDa(coltura.dataSemina));
  const nomeCompleto = coltura.varieta ? `${coltura.nome} · ${coltura.varieta}` : coltura.nome;
  return el('li', { class: 'card coltura' },
    icona(coltura),
    el('div', { class: 'coltura-testi' },
      el('h3', {}, nomeCompleto),
      el('p', { class: 'meta' },
        el('span', { class: `etichetta ${coltura.dove}` }, t(`form.dove.${coltura.dove}`)),
        ' ', t('coltura.seminata_il', { data: formattaData(coltura.dataSemina) }),
        zone.find((z) => z.id === coltura.zonaId) ? ` · ${zone.find((z) => z.id === coltura.zonaId).nome}` : '',
      ),
    ),
    el('div', { class: 'giorni' }, el('strong', {}, String(numero)), el('span', {}, etichetta)),
    coltura.note ? el('p', { class: 'note' }, coltura.note) : null,
    el('div', { class: 'riga' },
      el('button', { class: 'btn', type: 'button', onclick: () => promemoria(coltura) }, t('coltura.promemoria')),
      el('button', { class: 'btn pericolo', type: 'button', onclick: () => elimina(coltura) }, t('coltura.elimina')),
    ),
  );
}

const tessera = (href, titolo, spiega) => el('a', { class: 'tessera-azione', href }, el('strong', {}, titolo), el('span', { class: 'aiuto' }, spiega));

function mostraLista() {
  const ordinate = [...colture].sort((a, b) => b.dataSemina.localeCompare(a.dataSemina));
  lista.replaceChildren(...ordinate.map(scheda));
  sostituisci(riquadro, aiuole(colture, zone, schede));
  conteggio.textContent = String(colture.length);
  document.getElementById('colture-vuoto').hidden = colture.length > 0;
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
    el('label', {}, t('form.data'), el('input', { name: 'dataSemina', type: 'date', required: true, value: oggiISO() })),
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
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dati = new FormData(form);
    const nome = String(dati.get('nome')).trim();
    const coltura = normalizzaColtura({
      nome,
      varieta: dati.get('varieta'),
      dataSemina: dati.get('dataSemina'),
      dove: dati.get('dove'),
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
  [colture, schede, zone] = await Promise.all([elencoColture(), catalogo(), elencoZone()]);
  conteggio = el('span', { class: 'conteggio' }, '0');
  lista = el('ul', { class: 'lista' });
  riquadro = el('div', {});
  aggiungi(contenitore, 
    el('h2', { class: 'titolo-schermata' }, t('colture.hub')),
    el('button', { class: 'btn primario grande', type: 'button', onclick: apriNuova }, `+ ${t('colture.nuova')}`),
    el('div', { class: 'tessere-azione' },
      tessera('#/zone', t('colture.hub.zone'), t('colture.hub.zone.spiega')),
      tessera('#/diario', t('colture.hub.diario'), t('colture.hub.diario.spiega')),
      tessera('#/storia', t('colture.hub.storia'), t('colture.hub.storia.spiega')),
      tessera('#/raccolto', t('colture.hub.raccolto'), t('colture.hub.raccolto.spiega'))),
    riquadro,
    el('h3', {}, t('colture.elenco'), ' ', conteggio),
    el('p', { class: 'vuoto-testo', id: 'colture-vuoto' }, t('colture.vuoto')),
    lista,
  );
  mostraLista();
  // Arrivando dalla scheda di una coltura («Aggiungi al mio orto») il modulo si apre già col nome.
  const daSchedaId = parametriRotta().get('nuova');
  const daScheda = daSchedaId ? schede.find((s) => s.id === daSchedaId) : null;
  if (daScheda) apriNuova(daScheda.nome);
  else if (parametriRotta().get('bustina') === '1') apriNuova();
}
