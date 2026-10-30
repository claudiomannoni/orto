// "Oggi in campagna": la schermata principale.
import { el, oggiISO, formattaDataLunga, giorniDa } from '../util.js';
import { t, tn } from '../i18n.js';
import { elencoColture } from '../store/dati.js';
import { conversazione } from '../ui/mascotte.js';

function quando(giorni) {
  if (giorni === 0) return t('tempo.oggi');
  if (giorni === 1) return t('tempo.ieri');
  if (giorni === -1) return t('tempo.domani');
  return giorni > 0 ? t('tempo.giorni_fa', { n: giorni }) : t('tempo.fra_giorni', { n: -giorni });
}

function riepilogo(colture) {
  if (!colture.length) {
    return el('section', { class: 'card vuoto' },
      el('img', { class: 'illustrazione', src: 'assets/illustrazioni/vuoto.svg', alt: '' }),
      el('p', {}, t('oggi.riepilogo.nessuna')),
      el('a', { class: 'btn primario', href: '#/colture' }, t('oggi.aggiungi_prima')),
    );
  }
  const ultima = [...colture].sort((a, b) => b.dataSemina.localeCompare(a.dataSemina))[0];
  return el('section', { class: 'card' },
    el('p', { class: 'grande' }, tn('oggi.riepilogo', colture.length)),
    el('p', {}, t('oggi.ultima', { nome: ultima.nome, quando: quando(giorniDa(ultima.dataSemina)) })),
    el('a', { class: 'btn', href: '#/colture' }, t('oggi.vai_colture')),
  );
}

export async function monta(contenitore) {
  const colture = await elencoColture();
  contenitore.append(
    el('h2', { class: 'titolo-schermata' }, t('oggi.titolo')),
    el('p', { class: 'data-lunga' }, formattaDataLunga(oggiISO())),
    conversazione([
      { chi: 'rosso', testo: t('oggi.rosso.1'), variante: 'ride' },
      { chi: 'rossella', testo: t('oggi.rossella.1'), variante: 'pensa' },
    ]),
    riepilogo(colture),
  );
}
