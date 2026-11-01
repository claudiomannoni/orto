// «Leggi dalla bustina»: si fotografa la confezione dei semi e Rossella compila nome e varietà della coltura,
// con quello che c'è scritto (germinazione, profondità...) nelle note. Sempre da controllare: l'utente può correggere tutto.
import { el } from '../util.js';
import { t, locale } from '../i18n.js';
import { leggi, imposta } from '../store/impostazioni.js';
import { disponibile, chiedi } from '../ai/ai.js';
import { restantiOggi, registraUso } from '../ai/foto.js';
import { costruisciPromptBustina, leggiBustina } from '../ai/bustina.js';
import { riduciFoto } from './foto.js';

const nomeMese = (m) => new Date(2026, m - 1, 1).toLocaleDateString(locale(), { month: 'short' });
const coppia = (i) => (i.min === i.max ? `${i.min}` : `${i.min}-${i.max}`);

// Le righe lette dalla bustina, per le note della coltura.
export function righeBustina(d) {
  const righe = [];
  if (d.giorni_germinazione) righe.push(t('bustina.germinazione', { giorni: coppia(d.giorni_germinazione) }));
  if (d.giorni_raccolta) righe.push(t('bustina.raccolta', { giorni: coppia(d.giorni_raccolta) }));
  if (d.profondita_cm !== null) righe.push(t('bustina.profondita', { cm: String(d.profondita_cm).replace('.', ',') }));
  if (d.distanza_cm !== null) righe.push(t('bustina.distanza', { cm: String(d.distanza_cm).replace('.', ',') }));
  if (d.mesi_semina.length) righe.push(t('bustina.mesi', { mesi: d.mesi_semina.map(nomeMese).join(', ') }));
  if (d.esposizione) righe.push(t('bustina.esposizione', { esposizione: t(`bustina.esposizione.${d.esposizione}`) }));
  return righe;
}

function testoErrore(e) {
  const codice = e?.codice ?? 'altro';
  if (codice === 'risposta') return t('bustina.errore.risposta');
  if (['tetto', 'formato', 'lettura'].includes(codice)) return t(`foto.errore.${codice}`);
  return t(`ia.errore.${codice}`, { dettaglio: e?.message });
}

// schede: le schede dell'app. riempi({ nome, varieta, note, schedaId }): compila il modulo della nuova coltura.
export function bloccoBustina({ schede, riempi }) {
  const esito = el('p', { class: 'esito', role: 'status' });
  const input = el('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, name: 'bustina' });
  const pulsante = el('button', { class: 'btn', type: 'button', id: 'leggi-bustina' }, t('bustina.leggi'));
  pulsante.addEventListener('click', async () => {
    if (!(await disponibile())) { esito.textContent = t('foto.serve_chiave'); return; }
    if (!(await restantiOggi())) { esito.textContent = t('foto.errore.tetto'); return; }
    if (!(await leggi()).ai_foto_ok) {
      if (!confirm(t('foto.consenso'))) return;
      await imposta('ai_foto_ok', true);
    }
    input.click();
  });
  input.addEventListener('change', async () => {
    const file = input.files[0];
    input.value = '';
    if (!file) return;
    pulsante.disabled = true;
    esito.textContent = t('bustina.leggo');
    try {
      const foto = await riduciFoto(file);
      const risposta = await chiedi({ testo: costruisciPromptBustina(schede.map((s) => ({ id: s.id, nome: s.nome }))), immagine: { tipo: foto.tipo, base64: foto.base64 }, json: true });
      await registraUso(); // si conta solo se Google ha risposto
      const dati = leggiBustina(risposta, schede);
      const righe = righeBustina(dati);
      riempi({ nome: dati.nome, varieta: dati.varieta, schedaId: dati.schedaId, note: righe.length ? `${t('bustina.dalla_bustina')}: ${righe.join('; ')}.` : '' });
      esito.textContent = [t('bustina.fatto'), dati.avvisi].filter(Boolean).join(' ');
    } catch (e) {
      esito.textContent = testoErrore(e);
    } finally {
      pulsante.disabled = false;
    }
  });
  return el('div', { class: 'bustina' }, pulsante, input, esito, el('p', { class: 'aiuto' }, t('bustina.spiega')));
}
