// «La mia settimana»: cosa hai fatto negli ultimi 7 giorni, con una figurina da condividere. Tutto calcolato sul telefono.
import { el, oggiISO, formattaData } from '../util.js';
import { t } from '../i18n.js';
import { tutte } from '../store/db.js';
import { leggi } from '../store/impostazioni.js';
import { resocontoSettimana, chiaveFrase } from '../motore/resoconto.js';
import { testoQuantita } from '../motore/raccolto.js';
import { condividiFigurina } from './condividi.js';
import { apriFoglio } from './foglio.js';
import { toast } from './toast.js';
import { conversazione } from './mascotte.js';

// Il testo del raccolto: «2 kg + 3 pezzi», o vuoto se non c'è.
const testoRaccolto = (r) => [r.raccolto.kg ? testoQuantita(r.raccolto.kg, 'kg') : null, r.raccolto.pezzi ? testoQuantita(r.raccolto.pezzi, 'pezzi') : null].filter(Boolean).join(' + ');

export async function leggiResoconto() {
  const [eventi, foto] = await Promise.all([tutte('eventi'), tutte('foto')]);
  return resocontoSettimana({ eventi, foto: foto.map(({ data }) => ({ data })) }, oggiISO());
}

export async function apriResoconto() {
  const [r, impostazioni] = await Promise.all([leggiResoconto(), leggi()]);
  if (!r) return null;
  const frase = t(chiaveFrase(r));
  const righe = [
    [r.lavori, t('resoconto.lavori')],
    [testoRaccolto(r) || '0', t('resoconto.raccolto')],
    [r.giorniAttivi, t('resoconto.giorni')],
  ];
  const foglio = apriFoglio({
    titolo: t('resoconto.titolo'),
    contenuto: el('div', { class: 'form' },
      el('p', { class: 'aiuto' }, t('resoconto.periodo', { da: formattaData(r.da), a: formattaData(r.a) })),
      el('ul', { class: 'resoconto-numeri' }, righe.map(([valore, etichetta]) => el('li', {}, el('strong', {}, String(valore)), el('span', {}, etichetta)))),
      r.foto || r.note ? el('p', { class: 'aiuto' }, [r.foto ? t('resoconto.foto', { n: r.foto }) : null, r.note ? t('resoconto.note', { n: r.note }) : null].filter(Boolean).join(' · ')) : null,
      r.colturaDelRaccolto ? el('p', {}, t('resoconto.coltura', { nome: r.colturaDelRaccolto })) : null,
      conversazione([{ chi: 'rosso', testo: frase, variante: 'ride' }]),
      el('button', {
        class: 'btn primario', type: 'button', id: 'condividi-settimana',
        onclick: async () => {
          const esito = await condividiFigurina({
            orto: impostazioni.nome_orto || t('condividi.orto_senza_nome'),
            livello: t('resoconto.titolo'),
            numeri: [[r.lavori, t('resoconto.lavori')], [testoRaccolto(r) || '0', t('resoconto.raccolto')], [r.giorniAttivi, t('resoconto.giorni')]],
          }, 'la-mia-settimana.png');
          if (esito === 'condiviso') toast(t('condividi.fatto'));
          else if (esito === 'scaricato') toast(t('condividi.scaricata'));
        },
      }, t('resoconto.condividi')),
      el('button', { class: 'btn', type: 'button', onclick: () => foglio.close() }, t('foglio.chiudi'))),
  });
  return foglio;
}
