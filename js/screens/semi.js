// «La mia banca dei semi»: le bustine che hai in casa, con l'anno, e cosa puoi seminare questo mese.
// Le bustine stanno nelle impostazioni (chiave `semi`), quindi finiscono anche nel backup. Nessuna promessa sulla germinabilità: solo l'età dei semi.
import { el, aggiungi, sostituisci, oggiISO, meseDi } from '../util.js';
import { t } from '../i18n.js';
import { leggi, imposta } from '../store/impostazioni.js';
import { catalogo } from '../contenuti.js';
import { apriFoglio } from '../ui/foglio.js';
import { toast } from '../ui/toast.js';
import { pulisciSeme, ordinaSemi, semiDaSeminare, statoSeme } from '../motore/semi.js';

const nuovoId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `s${Date.now()}${Math.floor(Math.random() * 1e6)}`);

export async function monta(contenitore) {
  const [schede, impostazioni] = await Promise.all([catalogo(), leggi()]);
  let semi = (Array.isArray(impostazioni.semi) ? impostazioni.semi : []).map(pulisciSeme).filter(Boolean);
  const oggi = oggiISO();
  const annoCorrente = Number(oggi.slice(0, 4));
  const elenco = el('ul', { class: 'lista' });
  const adesso = el('div', {});
  const vuoto = el('p', { class: 'vuoto-testo' }, t('semi.vuoto'));

  const salva = async (nuovi) => { semi = nuovi; await imposta('semi', semi); disegna(); };

  function disegna() {
    const ordinati = ordinaSemi(semi, schede);
    const pronti = semiDaSeminare(semi, schede, impostazioni.zona, meseDi(oggi));
    sostituisci(adesso, pronti.length ? el('section', { class: 'card' },
      el('h3', {}, t('semi.adesso')),
      el('ul', { class: 'elenco-semplice' }, pronti.map(({ seme, titolo }) => el('li', {}, el('strong', {}, seme.nome), `: ${titolo}`)))) : null);
    vuoto.hidden = ordinati.length > 0;
    sostituisci(elenco, ordinati.map((s) => {
      const stato = statoSeme(s, annoCorrente);
      return el('li', { class: 'card seme' },
        el('div', {}, el('strong', {}, s.nome), s.anno ? ` · ${s.anno}` : '', s.quantita ? el('p', { class: 'aiuto' }, s.quantita) : null,
          el('p', { class: stato === 'vecchio' || stato === 'datato' ? 'avviso' : 'aiuto' }, t(`semi.stato.${stato}`))),
        el('button', {
          class: 'btn', type: 'button', 'aria-label': t('semi.togli', { nome: s.nome }),
          onclick: async () => { if (confirm(t('semi.togli.conferma', { nome: s.nome }))) { await salva(semi.filter((x) => x.id !== s.id)); toast(t('semi.tolto')); } },
        }, t('semi.togli.bottone')));
    }));
  }

  function apriNuovo() {
    const ordinate = [...schede].sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    const scelta = el('select', { name: 'scheda' }, ordinate.map((s) => el('option', { value: s.id }, s.nome)), el('option', { value: '' }, t('semi.altra')));
    const nome = el('input', { name: 'nome', maxlength: 60, placeholder: t('semi.nome.esempio'), required: true, value: ordinate[0]?.nome ?? '' });
    const form = el('form', { class: 'form', autocomplete: 'off' },
      el('label', {}, t('semi.coltura'), scelta),
      el('label', {}, t('semi.nome'), nome),
      el('div', { class: 'riga' },
        el('label', {}, t('semi.anno'), el('input', { name: 'anno', type: 'number', inputmode: 'numeric', min: '1990', max: String(annoCorrente), value: String(annoCorrente) })),
        el('label', {}, t('semi.quantita'), el('input', { name: 'quantita', maxlength: 40, placeholder: t('semi.quantita.esempio') }))),
      el('div', { class: 'riga' },
        el('button', { class: 'btn', type: 'button', onclick: () => foglio.close() }, t('form.annulla')),
        el('button', { class: 'btn primario', type: 'submit' }, t('diario.salva'))));
    scelta.addEventListener('change', () => { const s = ordinate.find((x) => x.id === scelta.value); nome.value = s ? s.nome : ''; if (!s) nome.focus(); });
    const foglio = apriFoglio({ titolo: t('semi.nuova'), contenuto: form });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = new FormData(form);
      const seme = pulisciSeme({ id: nuovoId(), schedaId: d.get('scheda') || null, nome: d.get('nome'), anno: Number(d.get('anno')) || null, quantita: d.get('quantita') });
      if (!seme) { toast(t('semi.errore')); return; }
      foglio.close();
      await salva([...semi, seme]);
      toast(t('semi.salvata'));
    });
  }

  aggiungi(contenitore,
    el('h2', { class: 'titolo-schermata' }, t('semi.titolo')),
    el('p', { class: 'aiuto' }, t('semi.spiega')),
    el('button', { class: 'btn primario grande', type: 'button', id: 'semi-nuova', onclick: apriNuovo }, `+ ${t('semi.nuova')}`),
    adesso, vuoto,
    el('h3', {}, t('semi.elenco')),
    elenco);
  disegna();
}
