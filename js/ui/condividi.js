// «Condividi il mio orto»: una figurina (immagine) con il livello, i numeri e i vermetti, da mandare agli amici.
// Si crea sul telefono e parte solo quando l'utente tocca «Condividi»: niente viene inviato da noi.
import { t } from '../i18n.js';
import { leggi } from '../store/impostazioni.js';
import { statoProgressi } from '../store/progressi.js';
import { percorsoMascotte, percorsoVestito, vestitoAttuale } from './mascotte.js';

const LARGHEZZA = 1080;
const ALTEZZA = 1350;
export const INDIRIZZO = 'https://claudiomannoni.github.io/orto/';

const carica = (src) => new Promise((ok) => {
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = () => ok(null); // un'immagine che manca non deve impedire la figurina
  img.src = src;
});

function andaACapo(ctx, testo, x, y, larghezzaMax, interlinea) {
  const parole = String(testo).split(' ');
  let riga = '';
  for (const parola of parole) {
    const prova = riga ? `${riga} ${parola}` : parola;
    if (ctx.measureText(prova).width > larghezzaMax && riga) { ctx.fillText(riga, x, y); y += interlinea; riga = parola; } else riga = prova;
  }
  if (riga) ctx.fillText(riga, x, y);
  return y;
}

// I dati della figurina: nome dell'orto, livello, tre numeri. null se i progressi non ci sono.
export async function datiFigurina() {
  const [stato, impostazioni] = await Promise.all([statoProgressi(), leggi()]);
  if (!stato?.livello) return null;
  const m = stato.misure ?? {};
  return {
    orto: impostazioni.nome_orto || t('condividi.orto_senza_nome'),
    livello: t('progressi.livello', { n: stato.livello.id, nome: stato.livello.nome }),
    numeri: [
      [m.lavori_fatti ?? 0, t('condividi.lavori')],
      [m.giorni_di_fila ?? 0, t('condividi.di_fila')],
      [m.colture_diverse ?? 0, t('condividi.colture')],
    ],
  };
}

export async function creaFigurina(dati) {
  const canvas = document.createElement('canvas');
  canvas.width = LARGHEZZA;
  canvas.height = ALTEZZA;
  const ctx = canvas.getContext('2d');
  const sfondo = ctx.createLinearGradient(0, 0, 0, ALTEZZA);
  sfondo.addColorStop(0, '#2b762f');
  sfondo.addColorStop(0.23, '#2b762f');
  sfondo.addColorStop(0.23, '#fff6e0');
  sfondo.addColorStop(1, '#fff6e0');
  ctx.fillStyle = sfondo;
  ctx.fillRect(0, 0, LARGHEZZA, ALTEZZA);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 96px system-ui, sans-serif';
  ctx.fillText('Orto AI', LARGHEZZA / 2, 150);
  ctx.font = '500 40px system-ui, sans-serif';
  ctx.fillText(t('app.slogan'), LARGHEZZA / 2, 220);

  ctx.fillStyle = '#3b2a20';
  ctx.font = '800 76px system-ui, sans-serif';
  andaACapo(ctx, dati.orto, LARGHEZZA / 2, 440, 900, 88);
  ctx.fillStyle = '#2b762f';
  ctx.font = '700 52px system-ui, sans-serif';
  ctx.fillText(dati.livello, LARGHEZZA / 2, 560);

  // I due vermetti, ognuno col suo vestito del giorno
  const vestito = vestitoAttuale();
  const [rosso, rossella, vRosso, vRossella] = await Promise.all([
    carica(percorsoMascotte('rosso')), carica(percorsoMascotte('rossella', 'pensa')),
    carica(percorsoVestito('rosso', vestito)), carica(percorsoVestito('rossella', vestito)),
  ]);
  const lato = 400;
  for (const [corpo, abito, x] of [[rosso, vRosso, 70], [rossella, vRossella, 610]]) {
    if (corpo) ctx.drawImage(corpo, x, 620, lato, lato);
    if (abito) ctx.drawImage(abito, x, 620, lato, lato);
  }

  // Tre numeri
  ctx.fillStyle = '#ffffff';
  const larghezza = 300;
  dati.numeri.forEach(([valore, etichetta], i) => {
    const x = 60 + i * (larghezza + 30);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#f0dcae';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(x, 1060, larghezza, 170, 28);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2b762f';
    ctx.font = '800 76px system-ui, sans-serif';
    ctx.fillText(String(valore), x + larghezza / 2, 1140);
    ctx.fillStyle = '#3b2a20';
    ctx.font = '600 32px system-ui, sans-serif';
    ctx.fillText(etichetta, x + larghezza / 2, 1195);
  });

  ctx.fillStyle = '#6b5a4a';
  ctx.font = '500 34px system-ui, sans-serif';
  ctx.fillText(INDIRIZZO.replace('https://', ''), LARGHEZZA / 2, 1305);
  return new Promise((ok) => canvas.toBlob(ok, 'image/png'));
}

// Condivide con il foglio di condivisione del telefono; dove non c'è, scarica l'immagine.
// Restituisce 'condiviso' | 'scaricato' | 'annullato'.
// Condivide una figurina qualsiasi (dati come da `datiFigurina`) col foglio del telefono; dove non c'è, la scarica.
// Restituisce 'condiviso' | 'scaricato' | 'annullato'.
export async function condividiFigurina(dati, nomeFile = 'il-mio-orto.png') {
  const blob = await creaFigurina(dati);
  if (!blob) return 'annullato';
  const file = new File([blob], nomeFile, { type: 'image/png' });
  const testo = t('condividi.testo', { indirizzo: INDIRIZZO });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Orto AI', text: testo });
      return 'condiviso';
    } catch (e) {
      if (e?.name === 'AbortError') return 'annullato';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nomeFile });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'scaricato';
}

export async function condividiOrto() {
  const dati = await datiFigurina();
  if (!dati) return 'annullato';
  return condividiFigurina(dati, 'il-mio-orto.png');
}
