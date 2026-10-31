// «Foto in campo» dentro il profilo del terreno: si fotografano il terreno e le erbe spontanee,
// Rossella propone cosa vede e l'utente conferma. Mai in automatico: le proposte dell'IA sono indizi deboli.
import { el } from '../util.js';
import { t } from '../i18n.js';
import { leggi, imposta } from '../store/impostazioni.js';
import { disponibile } from '../ai/ai.js';
import { analizzaFoto, restantiOggi, MASSIMO_FOTO } from '../ai/foto.js';
import { riduciFoto } from './foto.js';
import { ASSI } from '../motore/terreno.js';
import { toast } from './toast.js';

const etichettaConfidenza = (c) => el('span', { class: `etichetta certezza ${c === 'alta' ? 'media' : 'bassa'}` }, t(`foto.confidenza.${c}`));

function testoErrore(e) {
  const codice = e?.codice ?? 'altro';
  if (['risposta', 'tetto', 'foto', 'formato', 'lettura'].includes(codice)) return t(`foto.errore.${codice}`);
  return t(`ia.errore.${codice}`, { dettaglio: e?.message });
}

// dati: terreno.json. stato: lo stato del foglio (piante, indiziFoto). caselle: id erba -> casella della lista.
// aggiorna(): ridisegna il risultato del profilo.
export function sezioneFoto({ dati, stato, caselle, aggiorna }) {
  const foto = [];
  const anteprime = el('div', { class: 'anteprime' });
  const esito = el('p', { class: 'esito', role: 'status' });
  const proposte = el('div', { class: 'proposte-foto', 'aria-live': 'polite' });
  const analizza = el('button', { class: 'btn primario', type: 'button', disabled: true }, t('foto.analizza'));
  const messaggio = (testo) => { esito.textContent = testo; };

  function disegnaAnteprime() {
    anteprime.replaceChildren(...foto.map((f, i) => el('figure', { class: 'anteprima' },
      el('img', { src: f.anteprima, alt: t('foto.anteprima', { n: i + 1 }), width: 96, height: 96 }),
      el('button', {
        class: 'btn pericolo piccolo', type: 'button', 'aria-label': t('foto.togli', { n: i + 1 }),
        onclick: () => { URL.revokeObjectURL(f.anteprima); foto.splice(i, 1); disegnaAnteprime(); },
      }, t('foto.togli.testo')))));
    analizza.disabled = foto.length === 0;
  }

  async function aggiungi(files) {
    for (const file of files) {
      if (foto.length >= MASSIMO_FOTO) { messaggio(t('foto.massimo', { n: MASSIMO_FOTO })); break; }
      try {
        foto.push(await riduciFoto(file));
        messaggio('');
      } catch (e) {
        messaggio(testoErrore(e));
      }
    }
    disegnaAnteprime();
  }

  const ingresso = (attributi) => {
    const input = el('input', { type: 'file', accept: 'image/*', hidden: true, ...attributi });
    input.addEventListener('change', async () => { const files = [...input.files]; input.value = ''; await aggiungi(files); });
    return input;
  };
  const scatta = ingresso({ capture: 'environment', name: 'foto-scatta' });
  const galleria = ingresso({ multiple: true, name: 'foto-galleria' });

  function mostraProposte(r) {
    const blocchi = [];
    blocchi.push(el('p', { class: 'aiuto' }, t('foto.rossella.intro')));
    if (r.avvisi) blocchi.push(el('p', { class: 'avviso' }, r.avvisi));

    if (r.piante.length) {
      const scelte = new Map();
      const righe = r.piante.map((p, i) => {
        const casella = el('input', { type: 'checkbox', value: p.id ?? '', disabled: !p.id, checked: Boolean(p.id) && p.confidenza !== 'bassa', 'data-i': String(i) });
        scelte.set(i, casella);
        return el('label', { class: 'pianta' }, casella, el('span', {},
          el('strong', {}, p.nome), p.perche ? el('span', { class: 'aiuto' }, p.perche) : null,
          el('span', {}, etichettaConfidenza(p.confidenza)),
          p.id ? null : el('span', { class: 'aiuto' }, t('foto.non_in_lista'))));
      });
      blocchi.push(el('h4', {}, t('foto.erbe')), el('div', { class: 'elenco-proposte' }, righe),
        el('button', {
          class: 'btn', type: 'button',
          onclick: () => {
            const scelte_id = [...scelte.values()].filter((c) => c.checked && c.value).map((c) => c.value);
            for (const id of scelte_id) {
              if (!stato.piante.includes(id)) stato.piante.push(id);
              if (caselle.has(id)) caselle.get(id).checked = true;
            }
            aggiorna();
            toast(t('foto.erbe.aggiunte', { n: scelte_id.length }));
          },
        }, t('foto.erbe.aggiungi')));
    } else {
      blocchi.push(el('p', { class: 'aiuto' }, t('foto.nessuna_erba')));
    }

    if (r.terreno) {
      const valori = Object.keys(ASSI).filter((a) => r.terreno[a]);
      blocchi.push(el('h4', {}, t('foto.terreno')),
        r.terreno.indizi ? el('p', {}, r.terreno.indizi) : null,
        valori.length ? el('ul', { class: 'fasi' }, valori.map((a) => el('li', {}, el('span', {}, t(`terreno.asse.${a}`)), el('strong', {}, t(`terreno.${a}.${r.terreno[a]}`))))) : null,
        el('p', {}, etichettaConfidenza(r.terreno.confidenza)),
        valori.length ? el('button', {
          class: 'btn', type: 'button',
          onclick: () => {
            stato.indiziFoto = Object.fromEntries(valori.map((a) => [a, r.terreno[a]]));
            aggiorna();
            toast(t('foto.indizi.usati'));
          },
        }, t('foto.indizi.usa')) : null,
        el('p', { class: 'aiuto' }, t('foto.indizi.nota')));
    }
    proposte.replaceChildren(...blocchi.filter(Boolean));
  }

  analizza.addEventListener('click', async () => {
    proposte.replaceChildren();
    if (!(await disponibile())) { messaggio(t('foto.serve_chiave')); return; }
    if (!(await restantiOggi())) { messaggio(t('foto.errore.tetto')); return; }
    const impostazioni = await leggi();
    if (!impostazioni.ai_foto_ok) {
      if (!confirm(t('foto.consenso'))) return;
      await imposta('ai_foto_ok', true);
    }
    analizza.disabled = true;
    messaggio(t('foto.guardo'));
    try {
      const r = await analizzaFoto({
        immagini: foto.map(({ tipo, base64 }) => ({ tipo, base64 })),
        indicatrici: (dati.piante_indicatrici ?? []).map(({ id, nome, nome_scientifico: ns }) => ({ id, nome, nome_scientifico: ns })),
      });
      messaggio('');
      mostraProposte(r);
    } catch (e) {
      messaggio(testoErrore(e));
    } finally {
      analizza.disabled = foto.length === 0;
    }
  });

  return el('details', { class: 'sezione-terreno sezione-foto' },
    el('summary', {}, t('foto.titolo')),
    el('div', { class: 'corpo' },
      el('p', { class: 'aiuto' }, t('foto.spiega')),
      el('p', { class: 'aiuto' }, t('foto.privacy', { n: MASSIMO_FOTO })),
      el('div', { class: 'riga' },
        el('button', { class: 'btn', type: 'button', onclick: () => scatta.click() }, t('foto.scatta')),
        el('button', { class: 'btn', type: 'button', onclick: () => galleria.click() }, t('foto.galleria')),
      ),
      scatta, galleria, anteprime, analizza, esito, proposte,
    ));
}
