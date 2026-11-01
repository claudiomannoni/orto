// «Il tuo eccesso»: il raccolto che avanza si segna qui, per non sprecarlo (regalare, scambiare, vendere).
// Per ora è un diario personale e un conto dello spreco evitato; la bacheca fra utenti vicini arriverà quando in una zona ci saranno abbastanza persone.
// Nessuna regola, nessun prezzo suggerito: chi vende si informa e decide. Le voci stanno nelle impostazioni (chiave `eccesso`).
import { el, aggiungi, sostituisci, oggiISO, formattaData } from '../util.js';
import { t, tn } from '../i18n.js';
import { leggi, imposta } from '../store/impostazioni.js';
import { apriFoglio } from '../ui/foglio.js';
import { toast } from '../ui/toast.js';
import { CATEGORIE, UNITA, STATI, pulisciEccesso, ordinaEccesso, totaliEccesso } from '../motore/eccesso.js';

const nuovoId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `e${Date.now()}${Math.floor(Math.random() * 1e6)}`);
const numeroLeggibile = (n) => String(Math.round(n * 100) / 100).replace('.', ',');

export async function monta(contenitore) {
  const impostazioni = await leggi();
  let voci = (Array.isArray(impostazioni.eccesso) ? impostazioni.eccesso : []).map(pulisciEccesso).filter(Boolean);
  const oggi = oggiISO();
  const riepilogo = el('section', { class: 'card', id: 'eccesso-riepilogo' });
  const elenco = el('ul', { class: 'lista' });
  const vuoto = el('p', { class: 'vuoto-testo' }, t('eccesso.vuoto'));

  const salva = async (nuove) => { voci = nuove; await imposta('eccesso', voci); disegna(); };

  function disegna() {
    const tot = totaliEccesso(voci);
    sostituisci(riepilogo,
      el('h3', {}, t('eccesso.salvato.titolo')),
      tot.salvate
        ? el('p', {}, t('eccesso.salvato', { kg: numeroLeggibile(tot.kgSalvati), pezzi: tot.pezziSalvati, n: tot.salvate }))
        : el('p', { class: 'aiuto' }, t('eccesso.salvato.niente')),
      tot.disponibili ? el('p', { class: 'aiuto' }, tn('eccesso.disponibili', tot.disponibili)) : null);
    vuoto.hidden = voci.length > 0;
    sostituisci(elenco, ordinaEccesso(voci).map((v) => el('li', { class: `card eccesso-voce stato-${v.stato}`, 'data-id': v.id },
      el('div', {},
        el('strong', {}, v.nome), ` · ${numeroLeggibile(v.quantita)} ${t(`eccesso.unita.${v.unita}`)}`,
        el('p', { class: 'aiuto' }, `${t(`eccesso.categoria.${v.categoria}`)}${v.data ? ` · ${formattaData(v.data)}` : ''}`)),
      el('label', {}, t('eccesso.stato'),
        el('select', { name: 'stato', onchange: async (e) => { await salva(voci.map((x) => (x.id === v.id ? { ...x, stato: e.target.value } : x))); } },
          STATI.map((s) => el('option', { value: s, selected: s === v.stato }, t(`eccesso.stato.${s}`))))),
      el('button', { class: 'btn', type: 'button', 'aria-label': t('eccesso.togli', { nome: v.nome }), onclick: async () => { if (confirm(t('eccesso.togli.conferma', { nome: v.nome }))) { await salva(voci.filter((x) => x.id !== v.id)); toast(t('eccesso.tolto')); } } }, t('eccesso.togli.bottone')))));
  }

  function apriNuovo() {
    const form = el('form', { class: 'form', autocomplete: 'off' },
      el('label', {}, t('eccesso.categoria'), el('select', { name: 'categoria' }, CATEGORIE.map((c) => el('option', { value: c }, t(`eccesso.categoria.${c}`))))),
      el('label', {}, t('eccesso.nome'), el('input', { name: 'nome', maxlength: 60, required: true, placeholder: t('eccesso.nome.esempio') })),
      el('div', { class: 'riga' },
        el('label', {}, t('eccesso.quantita'), el('input', { name: 'quantita', type: 'number', inputmode: 'decimal', step: 'any', min: '0', required: true, placeholder: '3' })),
        el('label', {}, t('eccesso.unita'), el('select', { name: 'unita' }, UNITA.map((u) => el('option', { value: u }, t(`eccesso.unita.${u}`)))))),
      el('label', {}, t('diario.data'), el('input', { name: 'data', type: 'date', required: true, value: oggi, max: oggi })),
      el('div', { class: 'riga' },
        el('button', { class: 'btn', type: 'button', onclick: () => foglio.close() }, t('form.annulla')),
        el('button', { class: 'btn primario', type: 'submit' }, t('diario.salva'))));
    const foglio = apriFoglio({ titolo: t('eccesso.nuovo'), contenuto: form });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = new FormData(form);
      const voce = pulisciEccesso({ id: nuovoId(), categoria: d.get('categoria'), nome: d.get('nome'), quantita: Number(String(d.get('quantita')).replace(',', '.')), unita: d.get('unita'), stato: 'disponibile', data: d.get('data') });
      if (!voce) { toast(t('eccesso.errore')); return; }
      foglio.close();
      await salva([...voci, voce]);
      toast(t('eccesso.salvata'));
    });
  }

  aggiungi(contenitore,
    el('h2', { class: 'titolo-schermata' }, t('eccesso.titolo')),
    el('p', {}, t('eccesso.spiega')),
    el('button', { class: 'btn primario grande', type: 'button', id: 'eccesso-nuovo', onclick: apriNuovo }, `+ ${t('eccesso.nuovo')}`),
    riepilogo, vuoto,
    el('h3', {}, t('eccesso.elenco')),
    elenco,
    el('section', { class: 'card' },
      el('h3', {}, t('eccesso.come.titolo')),
      el('ul', { class: 'elenco-semplice' }, ['regalare', 'scambiare', 'vendere'].map((k) => el('li', {}, el('strong', {}, `${t(`eccesso.come.${k}`)}: `), t(`eccesso.come.${k}.testo`)))),
      el('p', {}, t('eccesso.perche')),
      el('p', { class: 'aiuto' }, t('eccesso.bacheca'))),
    el('p', { class: 'aiuto' }, t('eccesso.avvertenza')));
  disegna();
}
