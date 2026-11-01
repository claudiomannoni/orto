// «La storia della mia pianta»: tutte le foto di una coltura in fila, dalla prima all'ultima, con la fase, la salute e i giorni fra una foto e l'altra.
// Si arriva da «Oggi» (blocco della fase) e da «Il mio orto». Le foto si aggiungono con «Esamina con una foto» (dottore delle piante).
import { el, aggiungi, formattaData, oggiISO, parametriRotta } from '../util.js';
import { t } from '../i18n.js';
import { elencoColture } from '../store/dati.js';
import { elencoFoto } from '../store/foto.js';
import { fasi } from '../contenuti.js';
import { lineaDelTempo, andamentoSalute, giorniFraFoto } from '../motore/linea-tempo.js';
import { statoFase } from '../ui/fasi-pianta.js';

export async function monta(contenitore) {
  const id = parametriRotta().get('id');
  const [colture, tutteFoto, dFasi] = await Promise.all([elencoColture(), elencoFoto(), fasi()]);
  const coltura = colture.find((c) => c.id === id);
  if (!coltura) {
    aggiungi(contenitore, el('h2', { class: 'titolo-schermata' }, t('pianta.titolo')), el('p', { class: 'aiuto' }, t('pianta.non_trovata')), el('a', { class: 'btn', href: '#/colture' }, t('pianta.torna')));
    return;
  }
  const linea = lineaDelTempo(tutteFoto, coltura.id);
  const giorni = giorniFraFoto(linea);
  const andamento = andamentoSalute(linea);
  const st = statoFase(coltura, dFasi, oggiISO());
  const miniature = new Map(tutteFoto.map((f) => [f.id, f.miniatura]));
  aggiungi(contenitore,
    el('h2', { class: 'titolo-schermata' }, coltura.varieta ? `${coltura.nome} · ${coltura.varieta}` : coltura.nome),
    st ? el('p', { class: 'meta' }, t(coltura.partenza === 'piantina' ? 'fase.eta.piantina' : 'fase.eta', { n: st.eta }), ' · ', el('strong', {}, st.fase.nome)) : null,
    linea.length > 1 ? el('p', { class: andamento === 'peggiora' ? 'avviso' : 'aiuto' }, t(`pianta.andamento.${andamento}`)) : null,
    el('a', { class: 'btn primario', href: `#/dottore?coltura=${encodeURIComponent(coltura.id)}` }, t('fase.esamina')),
    linea.length ? el('ol', { class: 'linea-tempo' }, linea.map((v, i) => el('li', { class: `card passo-tempo stato-${v.stato ?? 'nessuno'}` },
      v.foto && miniature.get(v.foto.id) ? el('img', { src: miniature.get(v.foto.id), alt: '', width: 72, height: 72, loading: 'lazy' }) : null,
      el('div', {},
        el('strong', {}, formattaData(v.data)),
        i > 0 ? el('span', { class: 'aiuto' }, ` · ${t('pianta.dopo', { n: giorni[i - 1] })}`) : null,
        v.stato ? el('p', {}, t(`diagnosi.stato.${v.stato}`)) : null,
        v.faseNome ? el('p', { class: 'aiuto' }, t('pianta.fase_vista', { nome: v.faseNome }), v.confronto && v.confronto !== 'incerto' ? ` · ${t(`pianta.confronto.${v.confronto}`)}` : '') : null,
        v.problemi.length ? el('p', { class: 'aiuto' }, v.problemi.join(', ')) : null,
        v.foto?.nota ? el('p', { class: 'aiuto' }, v.foto.nota) : null)))) : el('p', { class: 'vuoto-testo' }, t('pianta.nessuna_foto')),
    el('p', { class: 'aiuto' }, t('diagnosi.avvertenza')));
}
