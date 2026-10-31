// Diario fotografico: le foto datate dell'orto, per zona e coltura. Restano sul telefono.
// Da qui si guardano, si fa il time-lapse e si può chiedere a Rossella cosa vede in una pianta.
import { el, oggiISO, parametriRotta, formattaData, aggiungi } from '../util.js';
import { t, tn } from '../i18n.js';
import { elencoFoto, salvaFoto, eliminaFoto, nuovaFoto, filtra, perMese, dallaPiuVecchia } from '../store/foto.js';
import { elencoZone } from '../store/zone.js';
import { elencoColture } from '../store/dati.js';
import { riduciFoto, blobInBase64 } from '../ui/foto.js';
import { diagnosiFoto } from '../ai/diagnosi.js';
import { disponibile } from '../ai/ai.js';
import { restantiOggi } from '../ai/foto.js';
import { leggi, imposta } from '../store/impostazioni.js';
import { apriFoglio } from '../ui/foglio.js';
import { toast } from '../ui/toast.js';
import { controllaProgressi } from '../store/progressi.js';

const MASSIMO_PER_VOLTA = 10;
const MINIMO_TIMELAPSE = 3;

let foto = [];
let zone = [];
let colture = [];
let filtro = { zonaId: null, colturaId: null };
let griglia;
let conteggio;
let vuoto;
let pulsanteTimelapse;

const nomeZona = (id) => zone.find((z) => z.id === id)?.nome ?? null;
const nomeColtura = (id) => {
  const c = colture.find((x) => x.id === id);
  return c ? (c.varieta ? `${c.nome} · ${c.varieta}` : c.nome) : null;
};
const nomeMese = (mese) => new Date(`${mese}-01T12:00:00`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
const visibili = () => filtra(foto, filtro);

function testoErrore(e) {
  const codice = e?.codice ?? 'altro';
  if (['risposta', 'tetto', 'foto', 'formato', 'lettura'].includes(codice)) return t(`foto.errore.${codice}`);
  return t(`ia.errore.${codice}`, { dettaglio: e?.message });
}

function disegna() {
  const lista = visibili();
  conteggio.textContent = String(lista.length);
  vuoto.hidden = foto.length > 0;
  pulsanteTimelapse.disabled = lista.length < MINIMO_TIMELAPSE;
  pulsanteTimelapse.title = lista.length < MINIMO_TIMELAPSE ? t('diario.timelapse.servono', { n: MINIMO_TIMELAPSE }) : '';
  if (foto.length && !lista.length) {
    griglia.replaceChildren(el('p', { class: 'vuoto-testo' }, t('diario.nessuna_con_filtro')));
    return;
  }
  griglia.replaceChildren(...perMese(lista).map(({ mese, foto: gruppo }) => el('section', { class: 'mese-foto' },
    el('h3', {}, nomeMese(mese)),
    el('div', { class: 'griglia-foto' }, gruppo.map((f) => el('button', {
      class: 'foto-voce', type: 'button', 'data-id': f.id, 'aria-label': t('diario.apri', { data: formattaData(f.data) }),
      onclick: () => apriVisore(f.id),
    }, el('img', { src: f.miniatura, alt: '', loading: 'lazy' }), el('span', {}, f.data.slice(8) + '/' + f.data.slice(5, 7))))))));
}

// ---------- Aggiungere foto ----------

function apriAggiunta() {
  const scelte = [];
  const anteprime = el('div', { class: 'anteprime' });
  const esito = el('p', { class: 'esito', role: 'status' });
  const salva = el('button', { class: 'btn primario', type: 'submit', disabled: true }, t('diario.salva'));
  const disegnaAnteprime = () => {
    anteprime.replaceChildren(...scelte.map((f, i) => el('figure', { class: 'anteprima' },
      el('img', { src: f.anteprima, alt: t('foto.anteprima', { n: i + 1 }), width: 96, height: 96 }),
      el('button', { class: 'btn pericolo piccolo', type: 'button', onclick: () => { URL.revokeObjectURL(f.anteprima); scelte.splice(i, 1); disegnaAnteprime(); } }, t('foto.togli.testo')))));
    salva.disabled = scelte.length === 0;
  };
  const aggiungi = async (files) => {
    for (const file of files) {
      if (scelte.length >= MASSIMO_PER_VOLTA) { esito.textContent = t('foto.massimo', { n: MASSIMO_PER_VOLTA }); break; }
      try { scelte.push(await riduciFoto(file, { miniatura: true })); esito.textContent = ''; } catch (e) { esito.textContent = testoErrore(e); }
    }
    disegnaAnteprime();
  };
  const ingresso = (attributi) => {
    const input = el('input', { type: 'file', accept: 'image/*', hidden: true, ...attributi });
    input.addEventListener('change', async () => { const files = [...input.files]; input.value = ''; await aggiungi(files); });
    return input;
  };
  const scatta = ingresso({ capture: 'environment', name: 'diario-scatta' });
  const galleria = ingresso({ multiple: true, name: 'diario-galleria' });
  const selezione = (nome, vuotoTesto, voci, attuale) => el('label', {}, t(`diario.${nome}`),
    el('select', { name: nome }, [el('option', { value: '' }, vuotoTesto), ...voci.map(([v, testo]) => el('option', { value: v, selected: v === attuale }, testo))]));

  const form = el('form', { class: 'form', autocomplete: 'off' },
    el('div', { class: 'riga' },
      el('button', { class: 'btn', type: 'button', onclick: () => scatta.click() }, t('foto.scatta')),
      el('button', { class: 'btn', type: 'button', onclick: () => galleria.click() }, t('foto.galleria'))),
    scatta, galleria, anteprime, esito,
    selezione('zona', t('diario.nessuna_zona'), zone.map((z) => [z.id, z.nome]), filtro.zonaId),
    selezione('coltura', t('diario.nessuna_coltura'), colture.map((c) => [c.id, nomeColtura(c.id)]), filtro.colturaId),
    el('label', {}, t('diario.data'), el('input', { name: 'data', type: 'date', required: true, value: oggiISO() })),
    el('label', {}, t('form.note'), el('textarea', { name: 'nota', rows: 2, maxlength: 500, placeholder: t('diario.nota.esempio') })),
    el('div', { class: 'riga' },
      el('button', { class: 'btn', type: 'button', onclick: () => foglio.close() }, t('form.annulla')),
      salva),
  );
  const foglio = apriFoglio({ titolo: t('diario.aggiungi'), contenuto: form });
  foglio.addEventListener('close', () => scelte.forEach((f) => URL.revokeObjectURL(f.anteprima)));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!scelte.length) return;
    const d = new FormData(form);
    salva.disabled = true;
    for (const s of scelte) {
      const nuova = nuovaFoto({
        immagine: s.blob, miniatura: s.miniatura, larghezza: s.larghezza, altezza: s.altezza,
        data: d.get('data'), zonaId: d.get('zona'), colturaId: d.get('coltura'), nota: d.get('nota'),
      });
      await salvaFoto(nuova);
      foto.push(nuova);
    }
    const n = scelte.length;
    disegna();
    foglio.close();
    toast(tn('diario.aggiunte', n));
    controllaProgressi();
  });
}

// ---------- Guardare una foto, chiedere a Rossella ----------

function bloccoDiagnosi(diagnosi) {
  const r = diagnosi.risultato;
  return el('section', { class: 'card diagnosi' },
    el('h3', {}, t('diagnosi.titolo')),
    el('p', {}, el('span', { class: 'etichetta certezza bassa' }, t('diagnosi.da_verificare'))),
    el('p', {}, el('strong', {}, t(`diagnosi.stato.${r.stato}`))),
    r.pianta ? el('p', {}, t('diagnosi.pianta', { nome: r.pianta.nome }), ' ', el('span', { class: `etichetta certezza ${r.pianta.confidenza === 'alta' ? 'media' : 'bassa'}` }, t(`foto.confidenza.${r.pianta.confidenza}`))) : null,
    r.problemi.length ? el('div', { class: 'elenco-proposte' }, r.problemi.map((p) => el('div', { class: 'problema' },
      el('strong', {}, p.nome), ' ', el('span', { class: `etichetta certezza ${p.confidenza === 'alta' ? 'media' : 'bassa'}` }, t(`foto.confidenza.${p.confidenza}`)),
      p.perche ? el('p', { class: 'aiuto' }, p.perche) : null,
      p.cosa_controllare ? el('p', {}, el('strong', {}, `${t('diagnosi.controlla')}: `), p.cosa_controllare) : null))) : null,
    r.avvisi ? el('p', { class: 'avviso' }, r.avvisi) : null,
    el('p', { class: 'aiuto' }, t('diagnosi.avvertenza')),
    el('p', { class: 'aiuto' }, t('diagnosi.data', { data: formattaData(diagnosi.data) })));
}

async function apriVisore(id) {
  const f = foto.find((x) => x.id === id);
  if (!f) return;
  const url = URL.createObjectURL(f.immagine);
  const esito = el('p', { class: 'esito', role: 'status' });
  const zonaDiagnosi = el('div', {});
  const nota = el('textarea', { name: 'nota', rows: 2, maxlength: 500, placeholder: t('diario.nota.esempio') }, f.nota);
  const mostraDiagnosi = () => zonaDiagnosi.replaceChildren(...(f.diagnosi ? [bloccoDiagnosi(f.diagnosi)] : []));
  mostraDiagnosi();

  const chiedi = el('button', { class: 'btn', type: 'button' }, f.diagnosi ? t('diagnosi.richiedi') : t('diagnosi.chiedi'));
  chiedi.addEventListener('click', async () => {
    if (!(await disponibile())) { esito.textContent = t('foto.serve_chiave'); return; }
    if (!(await restantiOggi())) { esito.textContent = t('foto.errore.tetto'); return; }
    if (!(await leggi()).ai_foto_ok) {
      if (!confirm(t('foto.consenso'))) return;
      await imposta('ai_foto_ok', true);
    }
    chiedi.disabled = true;
    esito.textContent = t('foto.guardo');
    try {
      const risultato = await diagnosiFoto({
        immagine: { tipo: 'image/jpeg', base64: await blobInBase64(f.immagine) },
        contesto: { coltura: nomeColtura(f.colturaId), nota: nota.value },
      });
      f.diagnosi = { data: oggiISO(), risultato };
      await salvaFoto(f);
      esito.textContent = '';
      mostraDiagnosi();
      chiedi.textContent = t('diagnosi.richiedi');
      controllaProgressi();
    } catch (e) {
      esito.textContent = testoErrore(e);
    } finally {
      chiedi.disabled = false;
    }
  });

  const dettagli = [formattaData(f.data), nomeZona(f.zonaId), nomeColtura(f.colturaId)].filter(Boolean).join(' · ');
  const foglio = apriFoglio({
    titolo: t('diario.foto'),
    contenuto: el('div', { class: 'form' },
      el('img', { class: 'visore-foto', src: url, alt: t('diario.foto_di', { dettagli }) }),
      el('p', { class: 'grande' }, dettagli),
      el('label', {}, t('form.note'), nota),
      el('div', { class: 'riga' },
        el('button', {
          class: 'btn', type: 'button',
          onclick: async () => { f.nota = nota.value.trim().slice(0, 500); await salvaFoto(f); toast(t('zone.salvata')); },
        }, t('diario.salva_nota')),
        chiedi),
      esito, zonaDiagnosi,
      el('div', { class: 'riga' },
        el('button', { class: 'btn', type: 'button', onclick: () => foglio.close() }, t('foglio.chiudi')),
        el('button', {
          class: 'btn pericolo', type: 'button',
          onclick: async () => {
            if (!confirm(t('diario.elimina.conferma'))) return;
            await eliminaFoto(f.id);
            foto = foto.filter((x) => x.id !== f.id);
            foglio.close();
            disegna();
            toast(t('diario.eliminata'));
          },
        }, t('coltura.elimina'))),
    ),
  });
  foglio.addEventListener('close', () => URL.revokeObjectURL(url));
}

// ---------- Time-lapse ----------

function apriTimelapse() {
  const fotogrammi = [...visibili()].sort(dallaPiuVecchia);
  if (fotogrammi.length < MINIMO_TIMELAPSE) return;
  let indice = 0;
  let intervallo = 700;
  let corre = true;
  let timer = null;
  let urlAttuale = null;
  const immagine = el('img', { class: 'visore-foto', alt: '' });
  const etichetta = el('p', { class: 'grande timelapse-data', role: 'status' });
  const contatore = el('progress', { class: 'avanzamento', max: fotogrammi.length, value: 1, 'aria-hidden': 'true' });
  const play = el('button', { class: 'btn primario', type: 'button' }, t('timelapse.pausa'));

  const mostra = () => {
    const f = fotogrammi[indice];
    if (urlAttuale) URL.revokeObjectURL(urlAttuale);
    urlAttuale = URL.createObjectURL(f.immagine);
    immagine.src = urlAttuale;
    immagine.alt = t('diario.foto_di', { dettagli: formattaData(f.data) });
    etichetta.textContent = `${formattaData(f.data)} · ${indice + 1}/${fotogrammi.length}`;
    contatore.value = indice + 1;
  };
  const avvia = () => { clearInterval(timer); if (corre) timer = setInterval(() => { indice = (indice + 1) % fotogrammi.length; mostra(); }, intervallo); };
  play.addEventListener('click', () => { corre = !corre; play.textContent = corre ? t('timelapse.pausa') : t('timelapse.riprendi'); avvia(); });
  const velocita = (fattore) => () => { intervallo = Math.min(2000, Math.max(250, Math.round(intervallo * fattore))); avvia(); };

  const foglio = apriFoglio({
    titolo: t('timelapse.titolo'),
    contenuto: el('div', { class: 'form' },
      immagine, contatore, etichetta,
      el('div', { class: 'riga' }, play,
        el('button', { class: 'btn', type: 'button', onclick: velocita(0.7) }, t('timelapse.piu_veloce')),
        el('button', { class: 'btn', type: 'button', onclick: velocita(1.4) }, t('timelapse.piu_lento'))),
      el('button', { class: 'btn', type: 'button', onclick: () => foglio.close() }, t('foglio.chiudi'))),
  });
  foglio.addEventListener('close', () => { clearInterval(timer); if (urlAttuale) URL.revokeObjectURL(urlAttuale); });
  mostra();
  avvia();
}

// ---------- Schermata ----------

export async function monta(contenitore) {
  [foto, zone, colture] = await Promise.all([elencoFoto(), elencoZone(), elencoColture()]);
  const p = parametriRotta();
  filtro = { zonaId: zone.some((z) => z.id === p.get('zona')) ? p.get('zona') : null, colturaId: colture.some((c) => c.id === p.get('coltura')) ? p.get('coltura') : null };
  conteggio = el('span', { class: 'conteggio' }, '0');
  griglia = el('div', { class: 'gruppi' });
  vuoto = el('p', { class: 'vuoto-testo', id: 'diario-vuoto' }, t('diario.vuoto'));
  pulsanteTimelapse = el('button', { class: 'btn', type: 'button', onclick: apriTimelapse }, t('timelapse.titolo'));
  const filtri = (nome, voci, attuale, chiave) => el('label', {}, t(`diario.filtro.${nome}`),
    el('select', {
      name: `filtro-${nome}`,
      onchange: (e) => { filtro[chiave] = e.target.value || null; disegna(); },
    }, [el('option', { value: '' }, t('diario.tutte')), ...voci.map(([v, testo]) => el('option', { value: v, selected: v === attuale }, testo))]));
  aggiungi(contenitore, 
    el('h2', { class: 'titolo-schermata' }, t('diario.titolo'), ' ', conteggio),
    el('button', { class: 'btn primario grande', type: 'button', onclick: apriAggiunta }, `+ ${t('diario.aggiungi')}`),
    vuoto,
    zone.length || colture.length ? el('div', { class: 'riga filtri' },
      zone.length ? filtri('zona', zone.map((z) => [z.id, z.nome]), filtro.zonaId, 'zonaId') : null,
      colture.length ? filtri('coltura', colture.map((c) => [c.id, nomeColtura(c.id)]), filtro.colturaId, 'colturaId') : null) : null,
    pulsanteTimelapse,
    griglia,
    el('p', { class: 'aiuto' }, t('diario.privacy')),
    el('a', { class: 'btn', href: '#/colture' }, t('zone.alle_colture')),
  );
  disegna();
  // Arrivando da «Fotografa il tuo orto» in Oggi, si apre subito la finestra per aggiungere la foto.
  if (p.get('aggiungi') === '1') apriAggiunta();
}
