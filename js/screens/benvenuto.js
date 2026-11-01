// Primo avvio guidato: sei domande, una per schermata. Si risponde con un tocco e si va avanti.
// Tutte le risposte sono impostazioni e si cambiano poi in Impostazioni.
import { el, isoLocale } from '../util.js';
import { t, locale } from '../i18n.js';
import { leggi, imposta, pulisciNome } from '../store/impostazioni.js';
import { zone, catalogo } from '../contenuti.js';
import { alternaSeguita } from '../motore/seguite.js';
import { conversazione } from '../ui/mascotte.js';
import { bloccoInstalla } from '../ui/installa.js';

// Valori scelti per la superficie: il tetto della fascia (300 = oltre 200 m²), in metri quadri.
export const SUPERFICI = [10, 30, 100, 300];
export const ACQUE = ['poca', 'media', 'molta'];
export const TEMPI = ['poco', 'medio', 'molto'];
export const METODI = ['nessuno', 'biologico', 'tradizionale', 'sinergico'];
export const ESPERIENZE = ['principiante', 'intermedio', 'esperto'];

const scelta = (tema, id) => ({
  valore: id,
  titolo: t(`scelta.${tema}.${id}`),
  descrizione: t(`scelta.${tema}.${id}.desc`),
});

async function domande() {
  const elencoZone = await zone();
  return [
    { tipo: 'testo', tema: 'orto', campi: [{ chiave: 'nome_orto', massimo: 40 }, { chiave: 'nome_coltivatore', massimo: 30 }] },
    { chiave: 'zona', tema: 'zona', opzioni: elencoZone.map((z) => ({ valore: z.id, titolo: z.nome })) },
    { chiave: 'superficie_mq', tema: 'superficie', opzioni: SUPERFICI.map((v) => scelta('superficie', v)) },
    { chiave: 'acqua', tema: 'acqua', opzioni: ACQUE.map((v) => scelta('acqua', v)) },
    { chiave: 'tempo', tema: 'tempo', opzioni: TEMPI.map((v) => scelta('tempo', v)) },
    { chiave: 'metodo', tema: 'metodo', opzioni: METODI.map((v) => scelta('metodo', v)) },
    { chiave: 'esperienza', tema: 'esperienza', opzioni: ESPERIENZE.map((v) => ({ valore: v, titolo: t(`esperienza.${v}`) })) },
    { tipo: 'colture', tema: 'colture', chiave: 'colture_scelte' },
  ];
}

export async function monta(contenitore, { alTermine }) {
  const impostazioni = await leggi();
  const elenco = await domande();
  const schedeOrdinate = [...(await catalogo())].sort((a, b) => a.nome.localeCompare(b.nome, locale()));
  // Le risposte già date si vedono solo se il primo avvio era già stato fatto (cioè si rifà).
  const dato = (chiave) => (impostazioni.primo_avvio_fatto ? impostazioni[chiave] : undefined);
  let passo = -1;

  const concludi = async () => {
    await imposta('primo_avvio_fatto', true);
    // Il giorno del primo avvio è il «compleanno dell'orto»: non si sposta se si rifà il primo avvio.
    if (!impostazioni.orto_nato) await imposta('orto_nato', isoLocale(new Date()));
    alTermine();
  };

  const battute = (tema) => conversazione([
    { chi: 'rosso', testo: t(`benvenuto.${tema}.rosso`), variante: 'ride' },
    { chi: 'rossella', testo: t(`benvenuto.${tema}.rossella`), variante: 'pensa' },
  ]);

  const vai = (nuovo) => { passo = nuovo; disegna(); };

  function disegnaIntro() {
    contenitore.replaceChildren(
      el('h2', { class: 'titolo-schermata' }, t('benvenuto.intro.titolo')),
      battute('intro'),
      bloccoInstalla(),
      el('div', { class: 'azioni' },
        el('button', { class: 'btn primario grande', type: 'button', onclick: () => vai(0) }, t('benvenuto.comincia')),
        el('button', { class: 'btn pericolo', type: 'button', onclick: concludi }, t('benvenuto.salta')),
      ),
    );
  }

  function disegnaDomanda() {
    const domanda = elenco[passo];
    const attuale = domanda.chiave ? dato(domanda.chiave) : undefined;
    const avanti = () => (passo + 1 < elenco.length ? vai(passo + 1) : vai(elenco.length));
    // Domanda a testo (il nome dell'orto, il tuo nome): si scrive e si va avanti. Il nome è facoltativo.
    const moduloTesto = () => {
      const form = el('form', { class: 'form', autocomplete: 'off' },
        domanda.campi.map((c) => el('label', {}, t(`benvenuto.orto.${c.chiave}`), el('input', {
          name: c.chiave, maxlength: c.massimo, value: impostazioni[c.chiave] ?? '', placeholder: t(`benvenuto.orto.${c.chiave}.esempio`),
        }))),
        el('button', { class: 'btn primario grande', type: 'submit' }, t('benvenuto.avanti')),
      );
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        for (const c of domanda.campi) {
          const valore = pulisciNome(form.elements[c.chiave].value, c.massimo);
          await imposta(c.chiave, valore);
          impostazioni[c.chiave] = valore;
        }
        avanti();
      });
      return form;
    };
    // Domanda a scelta multipla (le colture che interessano): si toccano, si va avanti. Nessuna scelta = «tutte».
    const moduloColture = () => {
      let scelte = Array.isArray(impostazioni.colture_scelte) ? [...impostazioni.colture_scelte] : [];
      const riepilogo = el('p', { class: 'aiuto', role: 'status' });
      const aggiornaRiepilogo = () => { riepilogo.textContent = scelte.length ? t('benvenuto.colture.scelte', { n: scelte.length }) : t('benvenuto.colture.tutte'); };
      const griglia = el('div', { class: 'griglia-colture' }, schedeOrdinate.map((s) => {
        const b = el('button', {
          class: 'scheda-voce scegli-voce', type: 'button', 'aria-pressed': String(scelte.includes(s.id)), 'data-id': s.id,
          onclick: () => { scelte = alternaSeguita(scelte, s.id, schedeOrdinate.map((x) => x.id)); b.setAttribute('aria-pressed', String(scelte.includes(s.id))); aggiornaRiepilogo(); },
        }, el('img', { src: s.icona ?? 'assets/colture/generica.svg', alt: '', width: 56, height: 56 }), el('span', {}, s.nome));
        return b;
      }));
      aggiornaRiepilogo();
      return el('div', { class: 'form' }, griglia, riepilogo,
        el('button', {
          class: 'btn primario grande', type: 'button',
          onclick: async () => { await imposta('colture_scelte', scelte); impostazioni.colture_scelte = scelte; avanti(); },
        }, t('benvenuto.avanti')));
    };
    const opzioni = (domanda.opzioni ?? []).map((o) => el('button', {
      class: 'btn opzione',
      type: 'button',
      'aria-pressed': String(o.valore === attuale),
      onclick: async () => {
        await imposta(domanda.chiave, o.valore);
        impostazioni[domanda.chiave] = o.valore;
        avanti();
      },
    },
    el('span', { class: 'opzione-titolo' }, o.titolo),
    o.descrizione ? el('span', { class: 'opzione-desc' }, o.descrizione) : null));

    contenitore.replaceChildren(
      el('p', { class: 'passo' }, t('benvenuto.passo', { n: passo + 1, tot: elenco.length })),
      el('progress', { class: 'avanzamento', max: elenco.length, value: passo + 1, 'aria-hidden': 'true' }),
      el('h2', { class: 'titolo-schermata' }, t(`benvenuto.${domanda.tema}.titolo`)),
      battute(domanda.tema),
      domanda.tipo === 'testo' ? moduloTesto() : domanda.tipo === 'colture' ? moduloColture() : el('div', { class: 'opzioni' }, opzioni),
      el('div', { class: 'riga' },
        el('button', { class: 'btn', type: 'button', onclick: () => vai(passo - 1) }, t('benvenuto.indietro')),
        el('button', { class: 'btn', type: 'button', onclick: avanti }, t('benvenuto.salta_domanda')),
      ),
    );
  }

  function disegnaFine() {
    contenitore.replaceChildren(
      el('h2', { class: 'titolo-schermata' }, t('benvenuto.fine.titolo')),
      battute('fine'),
      el('button', { class: 'btn primario grande', type: 'button', onclick: concludi }, t('benvenuto.fine.vai')),
    );
  }

  function disegna() {
    if (passo < 0) disegnaIntro();
    else if (passo < elenco.length) disegnaDomanda();
    else disegnaFine();
    window.scrollTo(0, 0);
  }

  disegna();
}
