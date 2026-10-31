// Il quiz dell'ortolano: cinque domande al giorno, una alla volta, con la spiegazione dopo ogni risposta.
import { el, oggiISO, aggiungi, sostituisci } from '../util.js';
import { t } from '../i18n.js';
import { leggi, imposta } from '../store/impostazioni.js';
import { quiz } from '../contenuti.js';
import { domandeDelGiorno, serieQuiz } from '../motore/quiz.js';
import { conversazione, festeggia } from '../ui/mascotte.js';
import { controllaProgressi } from '../store/progressi.js';

export async function monta(contenitore) {
  const oggi = oggiISO();
  const [dati, impostazioni] = await Promise.all([quiz(), leggi()]);
  const risultati = { ...(impostazioni.quiz_risultati ?? {}) };
  const domande = domandeDelGiorno(dati?.domande, oggi);
  const area = el('div', { class: 'quiz' });
  aggiungi(contenitore, el('a', { class: 'btn', href: '#/impara' }, t('scheda.indietro')), el('h2', { class: 'titolo-schermata' }, t('quiz.titolo')), area);

  if (!domande.length) { sostituisci(area, el('p', { class: 'vuoto-testo' }, t('quiz.non_disponibile'))); return; }

  const fine = (punti) => {
    sostituisci(area,
      el('section', { class: 'card quiz-fine' },
        el('h3', {}, t('quiz.risultato', { punti, tot: domande.length })),
        conversazione([
          { chi: 'rosso', testo: t(punti === domande.length ? 'quiz.rosso.tutte' : punti >= 3 ? 'quiz.rosso.bene' : 'quiz.rosso.poco'), variante: 'ride' },
          { chi: 'rossella', testo: t('quiz.rossella'), variante: 'pensa' },
        ]),
        el('p', {}, t('quiz.serie', { n: serieQuiz(risultati, oggi) })),
        el('p', { class: 'aiuto' }, t('quiz.domani')),
        el('a', { class: 'btn primario', href: '#/oggi' }, t('quiz.torna'))));
    if (punti >= 3) festeggia('fatto');
  };

  if (risultati[oggi] !== undefined) {
    sostituisci(area, el('p', { class: 'aiuto' }, t('quiz.gia_fatto')));
    fine(risultati[oggi]);
    return;
  }

  let indice = 0;
  let punti = 0;
  const mostra = () => {
    const d = domande[indice];
    const spiegazione = el('div', { class: 'quiz-spiegazione', role: 'status', hidden: true });
    const bottoni = d.risposte.map((r, i) => el('button', { class: 'btn opzione', type: 'button', 'data-i': String(i) }, r));
    const avanti = el('button', { class: 'btn primario', type: 'button', hidden: true, onclick: async () => {
      indice += 1;
      if (indice < domande.length) { mostra(); return; }
      risultati[oggi] = punti;
      await imposta('quiz_risultati', risultati);
      fine(punti);
      controllaProgressi();
    } }, indice + 1 < domande.length ? t('quiz.prossima') : t('quiz.vedi_risultato'));
    bottoni.forEach((b, i) => b.addEventListener('click', () => {
      const giusta = i === d.giusta;
      if (giusta) punti += 1;
      bottoni.forEach((x, k) => {
        x.disabled = true;
        if (k === d.giusta) x.classList.add('giusta');
        else if (k === i) x.classList.add('sbagliata');
      });
      spiegazione.replaceChildren(el('strong', {}, giusta ? t('quiz.giusto') : t('quiz.sbagliato')), ' ', d.spiegazione ?? '');
      spiegazione.hidden = false;
      avanti.hidden = false;
      avanti.focus();
    }));
    sostituisci(area,
      el('p', { class: 'passo' }, t('quiz.domanda_n', { n: indice + 1, tot: domande.length })),
      el('progress', { class: 'avanzamento', max: domande.length, value: indice + 1, 'aria-hidden': 'true' }),
      el('h3', {}, d.testo),
      el('div', { class: 'opzioni' }, bottoni),
      spiegazione, avanti);
  };
  mostra();
}
