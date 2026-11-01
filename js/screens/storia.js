// La mia storia: tutto quello che hai fatto nell'orto, in ordine di data: lavori segnati «Fatto», note libere e foto.
// Serve a ricordare (cosa ho seminato, quando, cosa è andato storto) e a non dover scrivere due volte le stesse cose.
import { el, oggiISO, formattaData, parametriRotta, aggiungi, sostituisci } from '../util.js';
import { t, locale } from '../i18n.js';
import { elencoEventi, registraEvento, nuovoEvento, elencoColture } from '../store/dati.js';
import { elimina } from '../store/db.js';
import { testoQuantita } from '../motore/raccolto.js';
import { elencoZone } from '../store/zone.js';
import { elencoFoto } from '../store/foto.js';
import { catalogo } from '../contenuti.js';
import { apriFoglio } from '../ui/foglio.js';
import { toast } from '../ui/toast.js';
import { controllaProgressi } from '../store/progressi.js';

let voci = []; // eventi e foto, già mescolati
let schede = [];
let zone = [];
let colture = [];
let filtro = { zonaId: null, colturaId: null, tipo: 'tutto' };
let elenco;
let conteggio;
let vuoto;

const nomeZona = (id) => zone.find((z) => z.id === id)?.nome ?? null;
const nomeColtura = (id) => {
  const c = colture.find((x) => x.id === id);
  return c ? (c.varieta ? `${c.nome} · ${c.varieta}` : c.nome) : null;
};
const nomeMese = (mese) => new Date(`${mese}-01T12:00:00`).toLocaleDateString(locale(), { month: 'long', year: 'numeric' });

// Il titolo di un lavoro segnato: dalla scheda, o l'id se la scheda non c'è più.
function titoloLavoro(e) {
  const scheda = schede.find((s) => s.id === e.schedaId);
  const lavoro = [...Object.values(scheda?.calendario ?? {}).flat(), ...(scheda?.lavori ?? [])].find((l) => l.id === e.lavoroId);
  return lavoro?.titolo ?? e.lavoroId ?? t('storia.lavoro');
}

// Righe uniche e ordinate: dal più recente; a parità di data, l'ultimo aggiunto.
function costruisciVoci(eventi, foto) {
  const daEventi = eventi
    .filter((e) => typeof e.data === 'string' && e.data)
    .map((e) => ({ genere: 'evento', id: e.id, data: e.data, creato: e.creato ?? '', zonaId: e.zonaId ?? null, colturaId: e.colturaId ?? null, evento: e }));
  const daFoto = foto.map((f) => ({ genere: 'foto', id: f.id, data: f.data, creato: f.creata ?? '', zonaId: f.zonaId, colturaId: f.colturaId, foto: f }));
  return [...daEventi, ...daFoto].sort((a, b) => b.data.localeCompare(a.data) || b.creato.localeCompare(a.creato));
}

const tipoVoce = (v) => (v.genere === 'foto' ? 'foto' : v.evento.tipo === 'nota' ? 'note' : 'lavori');
const visibili = () => voci.filter((v) => (!filtro.zonaId || v.zonaId === filtro.zonaId)
  && (!filtro.colturaId || v.colturaId === filtro.colturaId)
  && (filtro.tipo === 'tutto' || tipoVoce(v) === filtro.tipo));

function descrizione(v) {
  if (v.genere === 'foto') return { titolo: t('storia.foto'), dettaglio: v.foto.nota || '', icona: 'foto' };
  const e = v.evento;
  if (e.tipo === 'nota') return { titolo: t('storia.nota'), dettaglio: e.note, icona: 'nota' };
  if (e.tipo === 'raccolto') return { titolo: `${t('storia.raccolto')}: ${e.nomeColtura || ''}`.trim(), dettaglio: testoQuantita(e.quantita, e.unita), icona: 'fatto', etichetta: t('storia.raccolto') };
  if (e.tipo === 'lavoro_fatto') return { titolo: titoloLavoro(e), dettaglio: e.note || '', icona: 'fatto', etichetta: t('storia.fatto') };
  if (e.tipo === 'lavoro_saltato') return { titolo: titoloLavoro(e), dettaglio: e.note || '', icona: 'saltato', etichetta: t('storia.saltato') };
  return { titolo: e.tipo, dettaglio: e.note || '', icona: 'nota' };
}

function riga(v) {
  const d = descrizione(v);
  const dove = [nomeColtura(v.colturaId), nomeZona(v.zonaId)].filter(Boolean).join(' · ');
  const giorno = new Date(`${v.data}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
  return el('li', { class: `voce-storia ${d.icona}`, 'data-genere': v.genere, 'data-id': v.id },
    el('span', { class: 'storia-data' }, giorno),
    el('div', { class: 'storia-corpo' },
      el('strong', {}, d.titolo),
      d.etichetta ? el('span', { class: `etichetta ${d.icona === 'fatto' ? '' : 'semenzaio'}` }, d.etichetta) : null,
      dove ? el('span', { class: 'aiuto' }, dove) : null,
      d.dettaglio ? el('p', { class: 'note' }, d.dettaglio) : null,
      v.genere === 'foto' ? el('a', { class: 'storia-foto', href: `#/diario${v.zonaId ? `?zona=${encodeURIComponent(v.zonaId)}` : ''}`, 'aria-label': t('storia.apri_foto') },
        el('img', { src: v.foto.miniatura, alt: '', width: 96, height: 96, loading: 'lazy' })) : null),
    v.genere === 'evento' ? el('button', {
      class: 'btn pericolo piccolo', type: 'button', 'aria-label': t('storia.togli', { titolo: d.titolo }),
      onclick: async () => {
        if (!confirm(t('storia.togli.conferma'))) return;
        await elimina('eventi', v.id);
        voci = voci.filter((x) => x.id !== v.id);
        disegna();
        toast(t('storia.tolto'));
      },
    }, t('storia.togli.testo')) : null);
}

function disegna() {
  const lista = visibili();
  conteggio.textContent = String(lista.length);
  vuoto.hidden = voci.length > 0;
  if (voci.length && !lista.length) { sostituisci(elenco, el('p', { class: 'vuoto-testo' }, t('storia.nessuna_con_filtro'))); return; }
  const gruppi = new Map();
  for (const v of lista) {
    const m = v.data.slice(0, 7);
    if (!gruppi.has(m)) gruppi.set(m, []);
    gruppi.get(m).push(v);
  }
  sostituisci(elenco, ...[...gruppi].map(([mese, righe]) => el('section', { class: 'mese-foto' },
    el('h3', {}, nomeMese(mese)),
    el('ul', { class: 'storia-lista' }, righe.map(riga)))));
}

// ---------- Nuova nota ----------

function apriNota() {
  const selezione = (nome, vuotoTesto, lista, attuale) => el('label', {}, t(`diario.${nome}`),
    el('select', { name: nome }, [el('option', { value: '' }, vuotoTesto), ...lista.map(([v, testo]) => el('option', { value: v, selected: v === attuale }, testo))]));
  const form = el('form', { class: 'form', autocomplete: 'off' },
    el('label', {}, t('storia.nota.testo'), el('textarea', { name: 'testo', rows: 4, required: true, maxlength: 500, placeholder: t('storia.nota.esempio') })),
    el('label', {}, t('diario.data'), el('input', { name: 'data', type: 'date', required: true, value: oggiISO() })),
    selezione('zona', t('diario.nessuna_zona'), zone.map((z) => [z.id, z.nome]), filtro.zonaId),
    selezione('coltura', t('diario.nessuna_coltura'), colture.map((c) => [c.id, nomeColtura(c.id)]), filtro.colturaId),
    el('div', { class: 'riga' },
      el('button', { class: 'btn', type: 'button', onclick: () => foglio.close() }, t('form.annulla')),
      el('button', { class: 'btn primario', type: 'submit' }, t('diario.salva'))));
  const foglio = apriFoglio({ titolo: t('storia.nota.nuova'), contenuto: form });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const testo = String(d.get('testo')).trim().slice(0, 500);
    if (!testo) return;
    const evento = nuovoEvento({ tipo: 'nota', zonaId: d.get('zona') || null, colturaId: d.get('coltura') || null, data: d.get('data'), esito: 'ok', note: testo });
    await registraEvento(evento);
    voci = costruisciVoci([...voci.filter((v) => v.genere === 'evento').map((v) => v.evento), evento], voci.filter((v) => v.genere === 'foto').map((v) => v.foto));
    disegna();
    foglio.close();
    toast(t('storia.nota.salvata'));
    controllaProgressi();
  });
  form.elements.testo.focus();
}

// ---------- Esporta ----------

const cella = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

// La storia come tabella (CSV): si apre in Excel, Fogli o qualunque programma, e resta tua anche senza l'app.
export function storiaInCsv(lista, { titoli = true } = {}) {
  const righe = [['Data', 'Cosa', 'Titolo', 'Coltura', 'Zona', 'Nota'].map(cella).join(',')];
  for (const v of lista) {
    const d = descrizione(v);
    const cosa = v.genere === 'foto' ? 'Foto' : v.evento.tipo === 'nota' ? 'Nota' : v.evento.tipo === 'lavoro_fatto' ? 'Lavoro fatto' : v.evento.tipo === 'lavoro_saltato' ? 'Lavoro rimandato' : v.evento.tipo;
    righe.push([v.data, cosa, titoli ? d.titolo : '', nomeColtura(v.colturaId) ?? '', nomeZona(v.zonaId) ?? '', d.dettaglio].map(cella).join(','));
  }
  return `﻿${righe.join('\r\n')}\r\n`;
}

function esporta() {
  const blob = new Blob([storiaInCsv([...visibili()].sort((a, b) => a.data.localeCompare(b.data)))], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: `orto-storia-${oggiISO()}.csv` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(t('storia.esportata'));
}

// ---------- Schermata ----------

export async function monta(contenitore) {
  const [eventi, foto, elencoSchede, elencoZ, elencoC] = await Promise.all([elencoEventi(), elencoFoto(), catalogo(), elencoZone(), elencoColture()]);
  schede = elencoSchede;
  zone = elencoZ;
  colture = elencoC;
  voci = costruisciVoci(eventi, foto);
  const p = parametriRotta();
  filtro = {
    zonaId: zone.some((z) => z.id === p.get('zona')) ? p.get('zona') : null,
    colturaId: colture.some((c) => c.id === p.get('coltura')) ? p.get('coltura') : null,
    tipo: 'tutto',
  };
  conteggio = el('span', { class: 'conteggio' }, '0');
  elenco = el('div', { class: 'gruppi' });
  vuoto = el('p', { class: 'vuoto-testo', id: 'storia-vuoto' }, t('storia.vuoto'));
  const selettore = (nome, chiave, lista, attuale) => el('label', {}, t(`storia.filtro.${nome}`),
    el('select', { name: `filtro-${nome}`, onchange: (e) => { filtro[chiave] = e.target.value || (chiave === 'tipo' ? 'tutto' : null); disegna(); } },
      lista.map(([v, testo]) => el('option', { value: v, selected: v === (attuale ?? '') }, testo))));
  aggiungi(contenitore,
    el('h2', { class: 'titolo-schermata' }, t('storia.titolo'), ' ', conteggio),
    el('p', { class: 'aiuto' }, t('storia.spiega')),
    el('button', { class: 'btn primario grande', type: 'button', onclick: apriNota }, `+ ${t('storia.nota.nuova')}`),
    vuoto,
    el('div', { class: 'riga filtri' },
      selettore('tipo', 'tipo', [['', t('storia.tutto')], ['lavori', t('storia.solo_lavori')], ['note', t('storia.solo_note')], ['foto', t('storia.solo_foto')]], ''),
      zone.length ? selettore('zona', 'zonaId', [['', t('diario.tutte')], ...zone.map((z) => [z.id, z.nome])], filtro.zonaId) : null,
      colture.length ? selettore('coltura', 'colturaId', [['', t('diario.tutte')], ...colture.map((c) => [c.id, nomeColtura(c.id)])], filtro.colturaId) : null),
    elenco,
    el('button', { class: 'btn', type: 'button', onclick: esporta }, t('storia.esporta')),
    el('p', { class: 'aiuto' }, t('storia.esporta.spiega')),
    el('a', { class: 'btn', href: '#/colture' }, t('zone.alle_colture')));
  disegna();
}
