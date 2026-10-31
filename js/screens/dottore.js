// «Il dottore delle piante»: si fotografa una pianta e Rossella dice come sta, cosa potrebbe avere e cosa controllare.
// Da qui partono anche le altre cose che si fanno con la fotocamera: terreno, bustina dei semi, diario. Sempre ipotesi da verificare.
import { el, oggiISO, formattaData, aggiungi, sostituisci } from '../util.js';
import { t } from '../i18n.js';
import { leggi, imposta } from '../store/impostazioni.js';
import { disponibile } from '../ai/ai.js';
import { diagnosiFoto } from '../ai/diagnosi.js';
import { restantiOggi } from '../ai/foto.js';
import { riduciFoto } from '../ui/foto.js';
import { bloccoDiagnosi } from '../ui/diagnosi-blocco.js';
import { elencoColture } from '../store/dati.js';
import { elencoFoto, nuovaFoto, salvaFoto } from '../store/foto.js';
import { controllaProgressi } from '../store/progressi.js';
import { conversazione } from '../ui/mascotte.js';
import { toast } from '../ui/toast.js';

function testoErrore(e) {
  const codice = e?.codice ?? 'altro';
  if (['risposta', 'tetto', 'foto', 'formato', 'lettura'].includes(codice)) return t(`foto.errore.${codice}`);
  return t(`ia.errore.${codice}`, { dettaglio: e?.message });
}

const tessera = (href, titolo, spiega, id) => el('a', { class: 'tessera-azione', href, id }, el('strong', {}, titolo), el('span', { class: 'aiuto' }, spiega));

export async function monta(contenitore) {
  const oggi = oggiISO();
  const [colture, tutteFoto, haChiave] = await Promise.all([elencoColture(), elencoFoto(), disponibile()]);
  const area = el('div', { class: 'dottore-risultato', 'aria-live': 'polite' });
  const anteprima = el('div', { class: 'dottore-anteprima' });
  const scelta = el('select', { name: 'coltura' }, [el('option', { value: '' }, t('dottore.non_so')), ...colture.map((c) => el('option', { value: c.id }, c.nome))]);
  const nota = el('input', { name: 'nota', maxlength: 200, placeholder: t('dottore.nota.esempio') });
  const input = el('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, name: 'dottore-foto' });
  const scatta = el('button', { class: 'btn primario grande', type: 'button', id: 'dottore-scatta' }, t('dottore.scatta'));

  scatta.addEventListener('click', async () => {
    if (!haChiave) { sostituisci(area, el('p', { class: 'avviso' }, t('foto.serve_chiave'))); return; }
    if (!(await restantiOggi())) { sostituisci(area, el('p', { class: 'avviso' }, t('foto.errore.tetto'))); return; }
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
    scatta.disabled = true;
    sostituisci(area, el('p', { class: 'aiuto' }, t('dottore.guardo')));
    try {
      const foto = await riduciFoto(file, { miniatura: true });
      sostituisci(anteprima, el('img', { src: foto.anteprima, alt: t('dottore.anteprima'), width: 240 }));
      const coltura = colture.find((c) => c.id === scelta.value);
      const risultato = await diagnosiFoto({ immagine: { tipo: foto.tipo, base64: foto.base64 }, contesto: { coltura: coltura?.nome, nota: nota.value } });
      const diagnosi = { data: oggi, risultato };
      const salva = el('button', { class: 'btn primario', type: 'button', id: 'dottore-salva' }, t('dottore.salva'));
      salva.addEventListener('click', async () => {
        salva.disabled = true;
        const f = nuovaFoto({ immagine: foto.blob, miniatura: foto.miniatura, larghezza: foto.larghezza, altezza: foto.altezza, data: oggi, colturaId: coltura?.id ?? null, zonaId: coltura?.zonaId ?? null, nota: nota.value });
        f.diagnosi = diagnosi;
        await salvaFoto(f);
        toast(t('dottore.salvata'));
        controllaProgressi();
        salva.hidden = true;
      });
      sostituisci(area, bloccoDiagnosi(diagnosi), el('div', { class: 'riga' }, salva, el('a', { class: 'btn', href: '#/diario' }, t('dottore.vai_diario'))));
    } catch (e) {
      sostituisci(area, el('p', { class: 'avviso', role: 'alert' }, testoErrore(e)));
    } finally {
      scatta.disabled = false;
    }
  });

  const recenti = tutteFoto.filter((f) => f.diagnosi).slice(0, 3);
  aggiungi(contenitore,
    el('h2', { class: 'titolo-schermata' }, t('dottore.titolo')),
    conversazione([
      { chi: 'rossella', testo: t('dottore.rossella'), variante: 'pensa' },
      { chi: 'rosso', testo: t('dottore.rosso'), variante: 'ride' },
    ]),
    el('section', { class: 'card dottore-scheda' },
      el('label', {}, t('dottore.coltura'), scelta),
      el('label', {}, t('dottore.nota'), nota),
      scatta, input, anteprima, area,
      el('p', { class: 'aiuto' }, t('dottore.privacy'))),
    el('h3', {}, t('dottore.altro')),
    el('div', { class: 'tessere-azione' },
      tessera('#/zone', t('dottore.terreno'), t('dottore.terreno.spiega'), 'tessera-terreno'),
      tessera('#/colture?bustina=1', t('dottore.bustina'), t('dottore.bustina.spiega'), 'tessera-bustina'),
      tessera('#/diario?aggiungi=1', t('dottore.diario'), t('dottore.diario.spiega'), 'tessera-diario')),
    recenti.length ? el('section', {},
      el('h3', {}, t('dottore.recenti')),
      el('ul', { class: 'elenco-semplice' }, recenti.map((f) => el('li', {}, el('a', { href: '#/diario' }, `${formattaData(f.diagnosi.data)}: ${t(`diagnosi.stato.${f.diagnosi.risultato.stato}`)}`))))) : null);
}
