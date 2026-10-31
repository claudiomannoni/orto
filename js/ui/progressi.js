// Livello e traguardi: la carta in «Oggi» e il foglio con l'elenco.
import { el, formattaData } from '../util.js';
import { t } from '../i18n.js';
import { leggi } from '../store/impostazioni.js';
import { statoProgressi } from '../store/progressi.js';
import { apriFoglio } from './foglio.js';
import { conversazione } from './mascotte.js';
import { condividiOrto } from './condividi.js';
import { toast } from './toast.js';

const barra = (da, a, punti) => el('progress', { class: 'avanzamento', max: Math.max(1, (a ?? da + 1) - da), value: a === null ? 1 : Math.min(punti - da, a - da), 'aria-hidden': 'true' });

export async function apriProgressi() {
  const stato = await statoProgressi();
  if (!stato) return null;
  const quando = (await leggi()).traguardi ?? {};
  const { dati, livello, prossimo, punti } = stato;
  const raggiunti = new Set(stato.raggiunti);
  const foglio = apriFoglio({
    titolo: t('progressi.titolo'),
    contenuto: el('div', { class: 'form' },
      el('p', { class: 'grande' }, t('progressi.livello', { n: livello.id, nome: livello.nome })),
      barra(stato.daPunti, stato.aPunti, punti),
      el('p', { class: 'aiuto' }, prossimo ? t('progressi.verso', { punti, a: prossimo.da, nome: prossimo.nome }) : t('progressi.massimo', { punti })),
      conversazione([{ chi: 'rosso', testo: livello.rosso, variante: 'ride' }, { chi: 'rossella', testo: livello.rossella, variante: 'pensa' }]),
      el('h3', {}, t('progressi.traguardi', { n: raggiunti.size, tot: dati.traguardi.length })),
      el('ul', { class: 'traguardi' }, dati.traguardi.map((x) => el('li', { class: `traguardo ${raggiunti.has(x.id) ? 'preso' : 'da-prendere'}`, 'data-id': x.id },
        el('strong', {}, x.titolo),
        el('span', { class: 'aiuto' }, x.descrizione),
        el('span', { class: 'etichetta' }, raggiunti.has(x.id) ? (quando[x.id] ? t('progressi.preso_il', { data: formattaData(quando[x.id]) }) : t('progressi.preso')) : t('progressi.da_prendere'))))),
      el('p', { class: 'aiuto' }, t('progressi.punti_come')),
      el('button', {
        class: 'btn', type: 'button', id: 'condividi',
        onclick: async () => {
          try {
            const esito = await condividiOrto();
            if (esito === 'condiviso') toast(t('condividi.fatto'));
            else if (esito === 'scaricato') toast(t('condividi.scaricata'));
          } catch { toast(t('condividi.errore')); }
        },
      }, t('condividi.pulsante')),
      el('p', { class: 'aiuto' }, t('condividi.spiega')),
      el('button', { class: 'btn primario', type: 'button', onclick: () => foglio.close() }, t('foglio.chiudi'))),
  });
  return foglio;
}

// La carta in «Oggi»: livello, barra verso il prossimo, e un tocco per l'elenco. null se mancano i contenuti.
export async function cartaProgressi() {
  const stato = await statoProgressi();
  if (!stato?.livello) return null;
  const { livello, prossimo, punti } = stato;
  return el('button', { class: 'card carta-progressi', type: 'button', onclick: apriProgressi },
    el('span', { class: 'carta-livello' }, t('progressi.livello', { n: livello.id, nome: livello.nome })),
    barra(stato.daPunti, stato.aPunti, punti),
    el('span', { class: 'aiuto' }, prossimo ? t('progressi.verso', { punti, a: prossimo.da, nome: prossimo.nome }) : t('progressi.massimo', { punti })));
}
