// Bussola del telefono: legge il nord dal sensore e fa scegliere la direzione verso cui guarda una zona.
// Se il sensore non c'è (computer, permesso negato) restano le otto direzioni a tocco.
import { el } from '../util.js';
import { t } from '../i18n.js';
import { apriFoglio } from './foglio.js';
import { DIREZIONI, direzioneDa } from '../store/zone.js';

// Direzione (0-360, 0 = nord) verso cui punta il retro del telefono, dagli angoli del sensore.
// Funziona sia col telefono in piano sia tenuto in piedi (formula degli esempi W3C).
export function direzioneDaSensore({ alpha, beta, gamma }) {
  if ([alpha, beta, gamma].some((v) => typeof v !== 'number' || Number.isNaN(v))) return null;
  const r = Math.PI / 180;
  const cA = Math.cos(alpha * r), sA = Math.sin(alpha * r);
  const cB = Math.cos(beta * r), sB = Math.sin(beta * r);
  const cG = Math.cos(gamma * r), sG = Math.sin(gamma * r);
  const rA = -cA * sG - sA * sB * cG;
  const rB = -sA * sG + cA * sB * cG;
  const gradi = Math.atan2(rA, rB) / r;
  return (gradi + 360) % 360;
}

const nomeDirezione = (gradi) => t(`direzione.${direzioneDa(gradi)}`);

// gradi: valore attuale (o null). alSalvare(gradi) riceve la scelta.
export function apriBussola({ gradi, alSalvare }) {
  let letto = null; // ultima lettura del sensore
  const freccia = el('div', { class: 'bussola-freccia', 'aria-hidden': 'true' });
  const lettura = el('p', { class: 'grande bussola-lettura', role: 'status' }, t('bussola.cerco'));
  const usa = el('button', { class: 'btn primario', type: 'button', disabled: true }, t('bussola.usa'));
  const abilita = el('button', { class: 'btn', type: 'button', hidden: true }, t('bussola.abilita'));
  const manuali = el('div', { class: 'direzioni' }, DIREZIONI.map((nome, i) => el('button', {
    class: 'btn', type: 'button', 'aria-pressed': String(gradi === i * 45), 'data-gradi': String(i * 45),
    onclick: () => scegli(i * 45),
  }, t(`direzione.${nome}`))));

  const quandoArriva = (evento) => {
    const gradiSensore = typeof evento.webkitCompassHeading === 'number'
      ? evento.webkitCompassHeading
      : direzioneDaSensore(evento);
    if (gradiSensore === null) return;
    letto = Math.round(gradiSensore) % 360;
    abilita.hidden = true;
    freccia.style.transform = `rotate(${-letto}deg)`;
    lettura.textContent = t('bussola.lettura', { direzione: nomeDirezione(letto), gradi: letto });
    usa.disabled = false;
  };

  const ascolta = () => {
    // "absolute" punta al vero nord magnetico (Android); su iOS arriva webkitCompassHeading.
    window.addEventListener('deviceorientationabsolute', quandoArriva);
    window.addEventListener('deviceorientation', quandoArriva);
  };

  const smetti = () => {
    window.removeEventListener('deviceorientationabsolute', quandoArriva);
    window.removeEventListener('deviceorientation', quandoArriva);
  };

  function scegli(valore) {
    smetti();
    alSalvare(((Math.round(valore) % 360) + 360) % 360);
    foglio.close();
  }

  usa.addEventListener('click', () => { if (letto !== null) scegli(letto); });

  // Si ascolta subito. Dove i sensori chiedono un permesso (iOS) serve in più un tocco dell'utente.
  ascolta();
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    abilita.hidden = false;
    abilita.addEventListener('click', async () => {
      try {
        if (await DeviceOrientationEvent.requestPermission() === 'granted') { abilita.hidden = true; ascolta(); }
        else lettura.textContent = t('bussola.negata');
      } catch {
        lettura.textContent = t('bussola.negata');
      }
    });
  }
  // Se dopo un po' non è arrivato niente: o serve il permesso, o non c'è il sensore (un computer). Restano le direzioni a tocco.
  setTimeout(() => {
    if (letto === null) lettura.textContent = abilita.hidden ? t('bussola.assente') : t('bussola.tocca');
  }, 2000);

  const foglio = apriFoglio({
    titolo: t('bussola.titolo'),
    contenuto: el('div', { class: 'form' },
      el('p', {}, t('bussola.istruzioni')),
      el('div', { class: 'bussola' }, freccia, el('span', { class: 'bussola-davanti', 'aria-hidden': 'true' })),
      lettura,
      abilita,
      usa,
      el('p', { class: 'aiuto' }, t('bussola.oppure')),
      manuali,
      el('button', { class: 'btn', type: 'button', onclick: () => foglio.close() }, t('form.annulla')),
    ),
  });
  foglio.addEventListener('close', smetti);
  return foglio;
}
