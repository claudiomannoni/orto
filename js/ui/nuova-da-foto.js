// «Aggiungi al mio orto» dopo la foto: la pianta riconosciuta diventa una coltura, con nome, partenza ed età stimata da controllare.
import { el, oggiISO, sostituisci } from '../util.js';
import { t } from '../i18n.js';
import { catalogo, fasi } from '../contenuti.js';
import { proponiColtura } from '../motore/riconosci.js';
import { normalizzaColtura, salvaColtura } from '../store/dati.js';
import { controllaProgressi } from '../store/progressi.js';
import { toast } from './toast.js';

// risultato: la diagnosi già pulita. Restituisce il riquadro (o null se la pianta non è stata riconosciuta).
export async function bloccoNuovaDaFoto(risultato, { zonaId = null } = {}) {
  if (!risultato?.pianta) return null;
  const [schede, dFasi] = await Promise.all([catalogo(), fasi()]);
  const oggi = oggiISO();
  const p = proponiColtura({ risultato, schede, fasi: dFasi, oggi });
  if (!p) return null;
  const contenitore = el('section', { class: 'card nuova-da-foto' });
  const nome = el('input', { name: 'nome', value: p.nome, maxlength: 60, required: true });
  const data = el('input', { type: 'date', name: 'dataSemina', value: p.dataSemina, max: oggi, required: true });
  const partenza = el('fieldset', {}, el('legend', {}, t('form.partenza')),
    el('label', {}, el('input', { type: 'radio', name: 'partenza', value: 'seme', checked: true }), t('form.partenza.seme')),
    el('label', {}, el('input', { type: 'radio', name: 'partenza', value: 'piantina' }), t('form.partenza.piantina')));
  const stima = p.etaGiorni === null ? t('nuova.eta.ignota') : t(p.fonteEta === 'foto' ? 'nuova.eta.foto' : 'nuova.eta.stadio', { giorni: p.etaGiorni });
  const salva = el('button', { class: 'btn primario', type: 'submit', id: 'nuova-salva' }, t('nuova.salva'));
  const form = el('form', { id: 'nuova-da-foto' },
    el('h3', {}, t('nuova.titolo')),
    el('p', { class: 'aiuto' }, t('nuova.spiega')),
    el('label', {}, t('form.nome'), nome),
    partenza,
    el('label', {}, t('nuova.data'), data),
    el('p', { class: 'aiuto' }, stima),
    p.schedaId ? null : el('p', { class: 'aiuto' }, t('nuova.senza_scheda')),
    salva);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dati = new FormData(form);
    const nomeColtura = String(dati.get('nome')).trim();
    if (!nomeColtura || !dati.get('dataSemina')) return;
    salva.disabled = true;
    const scelta = schede.find((s) => s.id === p.schedaId && nomeColtura.toLowerCase() === s.nome.toLowerCase());
    await salvaColtura(normalizzaColtura({ nome: nomeColtura, dataSemina: dati.get('dataSemina'), dove: 'orto', partenza: dati.get('partenza'), note: t('nuova.nota'), schedaId: scelta?.id ?? p.schedaId, zonaId }));
    controllaProgressi();
    toast(t('coltura.aggiunta'));
    sostituisci(contenitore, el('p', {}, t('nuova.fatto')), el('a', { class: 'btn', href: '#/colture' }, t('nuova.vai')));
  });
  contenitore.append(form);
  return contenitore;
}
