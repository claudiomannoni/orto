// «Il dottore delle piante»: si fotografa una pianta e Rossella dice come sta, cosa potrebbe avere e cosa controllare.
// Da qui partono anche le altre cose che si fanno con la fotocamera: terreno, bustina dei semi, diario. Sempre ipotesi da verificare.
import { el, oggiISO, formattaData, aggiungi, sostituisci, parametriRotta } from '../util.js';
import { fasi } from '../contenuti.js';
import { statoFase } from '../ui/fasi-pianta.js';
import { t } from '../i18n.js';
import { leggi, imposta } from '../store/impostazioni.js';
import { disponibile } from '../ai/ai.js';
import { diagnosiFoto } from '../ai/diagnosi.js';
import { restantiOggi } from '../ai/foto.js';
import { riduciFoto } from '../ui/foto.js';
import { bloccoDiagnosi } from '../ui/diagnosi-blocco.js';
import { elencoColture, salvaColtura } from '../store/dati.js';
import { elencoFoto, nuovaFoto, salvaFoto } from '../store/foto.js';
import { controllaProgressi } from '../store/progressi.js';
import { conversazione } from '../ui/mascotte.js';
import { toast } from '../ui/toast.js';
import { bloccoNuovaDaFoto } from '../ui/nuova-da-foto.js';

function testoErrore(e) {
  const codice = e?.codice ?? 'altro';
  if (['risposta', 'tetto', 'foto', 'formato', 'lettura'].includes(codice)) return t(`foto.errore.${codice}`);
  return t(`ia.errore.${codice}`, { dettaglio: e?.message });
}

const tessera = (href, titolo, spiega, id) => el('a', { class: 'tessera-azione', href, id }, el('strong', {}, titolo), el('span', { class: 'aiuto' }, spiega));

export async function monta(contenitore) {
  const oggi = oggiISO();
  const [colture, tutteFoto, haChiave, restanti, impostazioni, dFasi] = await Promise.all([elencoColture(), elencoFoto(), disponibile(), restantiOggi(), leggi(), fasi()]);
  let consenso = Boolean(impostazioni.ai_foto_ok);
  const area = el('div', { class: 'dottore-risultato', 'aria-live': 'polite' });
  const anteprima = el('div', { class: 'dottore-anteprima' });
  const daScegliere = parametriRotta().get('coltura'); // arrivando da «Esamina con una foto» la coltura è già scelta
  const scelta = el('select', { name: 'coltura' }, [el('option', { value: '' }, t('dottore.non_so')), ...colture.map((c) => el('option', { value: c.id, selected: c.id === daScegliere }, c.nome))]);
  const nota = el('input', { name: 'nota', maxlength: 200, placeholder: t('dottore.nota.esempio') });
  // Due ingressi: la fotocamera e la galleria (su alcuni telefoni la fotocamera diretta chiude la pagina e la foto si perde).
  const campo = (camera) => el('input', { type: 'file', accept: 'image/*', ...(camera ? { capture: 'environment' } : {}), class: 'solo-lettori', tabindex: '-1', name: camera ? 'dottore-foto' : 'dottore-galleria' });
  const input = campo(true);
  const galleria = campo(false);
  const scatta = el('button', { class: 'btn primario grande', type: 'button', id: 'dottore-scatta' }, t('dottore.scatta'));
  const scegliGalleria = el('button', { class: 'btn', type: 'button', id: 'dottore-galleria' }, t('dottore.galleria'));

  // Tutto sincrono: il telefono apre la fotocamera solo se il gesto è ancora «fresco», dopo un await non lo è più.
  const apri = (campoFile, dallaCamera = false) => {
    if (!haChiave) { sostituisci(area, el('p', { class: 'avviso' }, t('foto.serve_chiave'))); return; }
    if (!restanti) { sostituisci(area, el('p', { class: 'avviso' }, t('foto.errore.tetto'))); return; }
    if (!consenso) {
      if (!confirm(t('foto.consenso'))) return;
      consenso = true;
      imposta('ai_foto_ok', true);
    }
    if (dallaCamera && navigator.mediaDevices?.getUserMedia) avviaCamera(campoFile);
    else campoFile.click();
  };

  // La fotocamera dentro la pagina: su molti Android aprire l'app fotocamera chiude questa pagina e la foto si perde.
  async function avviaCamera(riserva) {
    let flusso;
    try {
      flusso = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    } catch (e) {
      sostituisci(area, el('p', { class: 'avviso', role: 'alert' }, t('dottore.camera_no', { motivo: e?.name ?? 'errore' })));
      return;
    }
    const video = el('video', { class: 'dottore-video', autoplay: true, muted: true, playsinline: true });
    video.srcObject = flusso;
    const chiudi = () => { flusso.getTracks().forEach((x) => x.stop()); sostituisci(anteprima); };
    const scatto = el('button', { class: 'btn primario grande', type: 'button', id: 'dottore-click' }, t('dottore.click'));
    scatto.addEventListener('click', () => {
      if (!video.videoWidth) return;
      const tela = document.createElement('canvas');
      tela.width = video.videoWidth;
      tela.height = video.videoHeight;
      tela.getContext('2d').drawImage(video, 0, 0);
      tela.toBlob((blob) => { chiudi(); if (blob) elabora(new File([blob], 'pianta.jpg', { type: 'image/jpeg' })); }, 'image/jpeg', 0.9);
    });
    sostituisci(anteprima, video, el('div', { class: 'riga' }, scatto, el('button', { class: 'btn', type: 'button', onclick: chiudi }, t('form.annulla'))));
  }
  scatta.addEventListener('click', () => apri(input, true));
  scegliGalleria.addEventListener('click', () => apri(galleria));

  const alloScatto = async (campoFile) => {
    const file = campoFile.files[0];
    try { await elabora(file); } finally { campoFile.value = ''; }
  };

  async function elabora(file) {
    if (!file) return;
    scatta.disabled = true;
    sostituisci(area, el('p', { class: 'aiuto' }, t('dottore.guardo')));
    try {
      const foto = await riduciFoto(file, { miniatura: true });
      sostituisci(anteprima, el('img', { src: foto.anteprima, alt: t('dottore.anteprima'), width: 240 }));
      const coltura = colture.find((c) => c.id === scelta.value);
      // Se per questa coltura abbiamo le fasi, si chiede anche in che fase sembra essere e si confronta con l'età.
      const st = coltura ? statoFase(coltura, dFasi, oggi) : null;
      const fase = st ? { eta: st.eta, attesa: { id: st.fase.id, nome: st.fase.nome, come_riconoscerla: st.fase.come_riconoscerla }, elenco: st.dati.fasi.map((f) => ({ id: f.id, nome: f.nome, da_giorno: f.da_giorno })) } : null;
      const risultato = await diagnosiFoto({ immagine: { tipo: foto.tipo, base64: foto.base64 }, contesto: { coltura: coltura?.nome, nota: nota.value, fase } });
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
      const nuova = coltura ? null : await bloccoNuovaDaFoto(risultato);
      sostituisci(area, bloccoDiagnosi(diagnosi, { fase: st, coltura, fasi: st?.dati?.fasi ?? [], salvaCorrezione: coltura ? async (correzione) => { coltura.correzioneEta = correzione; await salvaColtura(coltura); toast(t('diagnosi.correzione.salvata')); } : null }), nuova, el('div', { class: 'riga' }, salva, el('a', { class: 'btn', href: '#/diario' }, t('dottore.vai_diario'))));
    } catch (e) {
      sostituisci(area, el('p', { class: 'avviso', role: 'alert' }, testoErrore(e)));
    } finally {
      scatta.disabled = false;
    }
  }
  input.addEventListener('change', () => alloScatto(input));
  galleria.addEventListener('change', () => alloScatto(galleria));

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
      el('div', { class: 'riga' }, scatta, scegliGalleria), input, galleria, anteprima, area,
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
