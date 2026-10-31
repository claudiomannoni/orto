// Il meteo in «Oggi»: i prossimi tre giorni e gli avvisi per l'orto (gelo, brina, pioggia forte, caldo, vento).
import { el, oggiISO, sostituisci } from '../util.js';
import { t } from '../i18n.js';
import { previsioni } from '../meteo.js';
import { avvisiMeteo, piove } from '../motore/meteo.js';
import { impostaPioggia } from './mascotte.js';
import { consigliAcqua } from '../motore/acqua.js';

const QUANDO = ['oggi', 'domani', 'dopodomani'];
const gradi = (v) => (v === null ? '–' : `${Math.round(v)}°`);

function testoAvviso(a) {
  const quando = t(`meteo.quando.${QUANDO[a.indice] ?? 'oggi'}`).toLowerCase(); // a metà frase: «domani», non «Domani»
  return t(`meteo.avviso.${a.tipo}`, { quando, valore: Math.round(a.valore) });
}

// La carta si disegna subito (con «cerco il meteo») e si riempie quando arrivano le previsioni.
export function cartaMeteo() {
  const carta = el('section', { class: 'card meteo', 'aria-live': 'polite' }, el('h3', {}, t('meteo.titolo')), el('p', { class: 'aiuto' }, t('meteo.carico')));

  previsioni().then(({ giorni, quando, vecchio, posizione }) => {
    const oggi = oggiISO();
    const da = giorni.findIndex((g) => g.data >= oggi);
    const prossimi = da === -1 ? [] : giorni.slice(da, da + 3);
    impostaPioggia(piove(giorni.find((g) => g.data === oggi)));
    if (!prossimi.length) { carta.replaceChildren(el('h3', {}, t('meteo.titolo')), el('p', { class: 'aiuto' }, t('meteo.non_disponibile'))); return; }
    const avvisi = avvisiMeteo(giorni, oggi, 3);
    // Il consiglio sull'acqua serve solo se abbiamo anche i giorni passati (altrimenti sembrerebbe sempre «secco»).
    const acqua = giorni.some((g) => g.data < oggi) ? consigliAcqua(giorni, oggi) : null;
    const ore = Math.max(1, Math.round((Date.now() - quando) / 3600000));
    sostituisci(carta,
      el('h3', {}, t('meteo.titolo')),
      el('div', { class: 'meteo-giorni' }, prossimi.map((g, i) => el('div', { class: 'meteo-giorno', 'data-data': g.data },
        el('strong', {}, t(`meteo.quando.${QUANDO[i]}`)),
        el('span', {}, t(`meteo.tempo.${g.tempo}`)),
        el('span', { class: 'meteo-gradi' }, `${gradi(g.min)} / ${gradi(g.max)}`),
        el('span', { class: 'aiuto' }, g.pioggia >= 0.5 ? t('meteo.pioggia_mm', { mm: g.pioggia.toFixed(g.pioggia < 10 ? 1 : 0).replace('.', ',') }) : t('meteo.asciutto'))))),
      ...avvisi.map((a) => el('p', { class: `avviso avviso-${a.tipo}`, role: 'alert' }, testoAvviso(a))),
      acqua ? el('div', { class: 'acqua' }, el('p', {}, el('strong', {}, `${t('acqua.titolo')}: `), t(`acqua.${acqua.annaffia}`))) : null,
      // I dettagli (quanta pioggia, da dove vengono i dati) stanno dietro un tocco: la scheda resta corta.
      el('details', { class: 'meteo-dettagli' },
        el('summary', {}, t('meteo.dettagli')),
        acqua ? el('p', { class: 'aiuto' }, t(`acqua.livello.${acqua.livello}`, { mm: String(acqua.mm7).replace('.', ',') }), acqua.previsti > 0 ? ` ${t('acqua.in_arrivo', { mm: String(acqua.previsti).replace('.', ',') })}` : '') : null,
        acqua ? el('p', { class: 'aiuto' }, t('acqua.nota')) : null,
        vecchio ? el('p', { class: 'aiuto' }, t('meteo.vecchio', { ore })) : null,
        el('p', { class: 'aiuto' }, posizione.origine === 'telefono' ? t('meteo.fonte_telefono') : t('meteo.fonte_zona', { zona: posizione.nome ?? '' }))),
    );
  }).catch((errore) => {
    carta.replaceChildren(el('h3', {}, t('meteo.titolo')), el('p', { class: 'aiuto' }, errore?.codice === 'posizione' ? t('meteo.senza_posizione') : t('meteo.non_disponibile')));
  });
  return carta;
}
