// Le mie zone: aiuole già coltivate e terreni da preparare, con misure, esposizione e profilo del terreno.
import { el } from '../util.js';
import { t, tn } from '../i18n.js';
import { elencoZone, salvaZona, eliminaZona, normalizzaZona, direzioneDa } from '../store/zone.js';
import { elencoColture, salvaColtura } from '../store/dati.js';
import { apriFoglio } from '../ui/foglio.js';
import { apriBussola } from '../ui/bussola.js';
import { apriTerreno, riassuntoTerreno } from '../ui/terreno.js';
import { toast } from '../ui/toast.js';

let zone = [];
let colture = [];
let lista;
let conteggio;
let vuoto;

const numero = (n) => n.toLocaleString('it-IT', { maximumFractionDigits: 2 });

function testoMisure(zona) {
  const { lunghezza_m: l, larghezza_m: w } = zona.misure;
  if (!zona.superficie_mq) return t('zone.misure.nessuna');
  return t('zone.misure.valori', { l: numero(l), w: numero(w), mq: numero(zona.superficie_mq) });
}

function riga(titolo, valore, nota) {
  return el('div', { class: 'dato' },
    el('span', { class: 'dato-nome' }, titolo),
    el('strong', {}, valore),
    nota ? el('span', { class: 'aiuto' }, nota) : null);
}

function schedaZona(zona) {
  const gradi = zona.esposizione.gradi;
  const direzione = gradi === null ? null : direzioneDa(gradi);
  const qui = colture.filter((c) => c.zonaId === zona.id).length;
  const terreno = riassuntoTerreno(zona.terreno);
  return el('li', { class: 'card zona', 'data-id': zona.id },
    el('h3', {}, zona.nome),
    el('p', { class: 'etichette' },
      el('span', { class: 'etichetta' }, t(`zone.tipo.${zona.tipo}`)),
      el('span', { class: `etichetta ${zona.stato === 'da_preparare' ? 'semenzaio' : ''}` }, t(`zone.stato.${zona.stato}`)),
    ),
    riga(t('zone.misure'), testoMisure(zona)),
    riga(t('zone.esposizione'),
      direzione === null ? t('zone.esposizione.nessuna') : t('zone.esposizione.valore', { direzione: t(`direzione.${direzione}`), gradi }),
      direzione === null ? null : t(`esposizione.nota.${direzione}`)),
    riga(t('zone.terreno'), terreno ?? t('zone.terreno.nessuno')),
    qui ? riga(t('zone.colture'), tn('zone.colture.qui', qui)) : null,
    zona.note ? el('p', { class: 'note' }, zona.note) : null,
    el('div', { class: 'riga' },
      el('button', { class: 'btn', type: 'button', onclick: () => esposizione(zona) }, t('zone.bussola')),
      el('button', { class: 'btn', type: 'button', onclick: () => terrenoZona(zona) }, t('zone.capisci_terreno')),
    ),
    el('div', { class: 'riga' },
      el('button', { class: 'btn', type: 'button', onclick: () => apriForm(zona) }, t('zone.modifica')),
      el('button', { class: 'btn pericolo', type: 'button', onclick: () => rimuovi(zona) }, t('coltura.elimina')),
    ),
  );
}

function mostraLista() {
  const ordinate = [...zone].sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  lista.replaceChildren(...ordinate.map(schedaZona));
  conteggio.textContent = String(zone.length);
  vuoto.hidden = zone.length > 0;
}

async function aggiorna(zona, cambi) {
  const nuova = normalizzaZona({ ...zona, ...cambi });
  await salvaZona(nuova);
  zone = zone.map((z) => (z.id === nuova.id ? nuova : z));
  mostraLista();
  return nuova;
}

function esposizione(zona) {
  apriBussola({
    gradi: zona.esposizione.gradi,
    alSalvare: async (gradi) => { await aggiorna(zona, { esposizione: { gradi } }); toast(t('zone.salvata')); },
  });
}

function terrenoZona(zona) {
  apriTerreno({
    zona,
    alSalvare: async (terreno) => { await aggiorna(zona, { terreno }); toast(t('zone.salvata')); },
  });
}

async function rimuovi(zona) {
  if (!confirm(t('zone.elimina.conferma', { nome: zona.nome }))) return;
  await eliminaZona(zona.id);
  // Le colture di questa zona restano, ma senza zona.
  for (const c of colture.filter((x) => x.zonaId === zona.id)) {
    c.zonaId = null;
    await salvaColtura(c);
  }
  zone = zone.filter((z) => z.id !== zona.id);
  mostraLista();
  toast(t('zone.eliminata'));
}

function apriForm(zona) {
  const nuova = !zona;
  const z = zona ?? normalizzaZona({});
  const scelta = (nome, valori, attuale, chiave) => el('fieldset', { class: 'scelte' },
    el('legend', {}, t(`zone.${nome}`)),
    valori.map((v) => el('label', {}, el('input', { type: 'radio', name: nome, value: v, checked: v === attuale }), t(`${chiave}.${v}`))));
  const form = el('form', { class: 'form', autocomplete: 'off' },
    el('label', {}, t('zone.nome'), el('input', { name: 'nome', required: true, maxlength: 60, value: z.nome, placeholder: t('zone.nome.esempio') })),
    scelta('tipo', ['aiuola', 'terreno'], z.tipo, 'zone.tipo'),
    scelta('stato', ['coltivata', 'da_preparare'], z.stato, 'zone.stato'),
    el('div', { class: 'riga' },
      el('label', {}, t('zone.lunghezza'), el('input', { name: 'lunghezza', type: 'number', inputmode: 'decimal', min: '0.1', step: '0.1', value: z.misure.lunghezza_m ?? '' })),
      el('label', {}, t('zone.larghezza'), el('input', { name: 'larghezza', type: 'number', inputmode: 'decimal', min: '0.1', step: '0.1', value: z.misure.larghezza_m ?? '' })),
    ),
    el('label', {}, t('form.note'), el('textarea', { name: 'note', rows: 3, placeholder: t('zone.note.esempio') }, z.note)),
    el('div', { class: 'riga' },
      el('button', { class: 'btn', type: 'button', onclick: () => foglio.close() }, t('form.annulla')),
      el('button', { class: 'btn primario', type: 'submit' }, nuova ? t('zone.aggiungi') : t('zone.salva')),
    ),
  );
  const foglio = apriFoglio({ titolo: nuova ? t('zone.nuova') : t('zone.modifica'), contenuto: form });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const base = normalizzaZona({
      ...z,
      nome: d.get('nome'),
      tipo: d.get('tipo'),
      stato: d.get('stato'),
      misure: { lunghezza_m: d.get('lunghezza'), larghezza_m: d.get('larghezza') },
      note: d.get('note'),
    });
    if (!base.nome) return;
    await salvaZona(base);
    zone = nuova ? [...zone, base] : zone.map((x) => (x.id === base.id ? base : x));
    mostraLista();
    foglio.close();
    toast(t('zone.salvata'));
  });
  form.elements.nome.focus();
}

export async function monta(contenitore) {
  [zone, colture] = await Promise.all([elencoZone(), elencoColture()]);
  conteggio = el('span', { class: 'conteggio' }, '0');
  lista = el('ul', { class: 'lista' });
  vuoto = el('p', { class: 'vuoto-testo', id: 'zone-vuoto' }, t('zone.vuoto'));
  contenitore.append(
    el('h2', { class: 'titolo-schermata' }, t('zone.titolo'), ' ', conteggio),
    el('button', { class: 'btn primario grande', type: 'button', onclick: () => apriForm() }, `+ ${t('zone.nuova')}`),
    vuoto,
    lista,
    el('a', { class: 'btn', href: '#/colture' }, t('zone.alle_colture')),
  );
  mostraLista();
}
