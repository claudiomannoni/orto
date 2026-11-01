// La scheda di una coltura: in breve, quando si fa (mesi), cosa si fa, amiche e nemiche, rotazione, fonti.
// Tutto con il suo livello di certezza e le fonti che abbiamo letto: l'utente deve potersi fidare, e controllare.
import { el, oggiISO, meseDi, formattaData, parametriRotta, aggiungi } from '../util.js';
import { t, locale } from '../i18n.js';
import { leggi, imposta } from '../store/impostazioni.js';
import { alternaSeguita, seguita } from '../motore/seguite.js';
import { toast } from '../ui/toast.js';
import { catalogo, consociazioni, zone, raccolta } from '../contenuti.js';
import { bloccoRaccoltaConservazione } from '../ui/fasi-pianta.js';
import { apriLavoro } from './calendario.js';

const OPERAZIONI = ['semina', 'trapianto', 'cura', 'lavorazione', 'raccolta'];
const nomeMese = (m, formato = 'long') => new Date(2026, m - 1, 1).toLocaleDateString(locale(), { month: formato });
const certezza = (c) => (c ? el('span', { class: `etichetta certezza ${c}` }, t(`lavoro.certezza.${c}`)) : null);

// Una riga per tipo di lavoro, dodici caselle per i dodici mesi. Scuro = mese migliore, chiaro = possibile.
function strisciaMesi(lavori, meseOggi) {
  const tipi = OPERAZIONI.filter((op) => lavori.some((l) => l.operazione === op));
  const righe = tipi.map((op) => {
    const deiTipo = lavori.filter((l) => l.operazione === op);
    const possibili = new Set(deiTipo.flatMap((l) => l.mesi ?? []));
    const migliori = new Set(deiTipo.flatMap((l) => l.ottimale ?? []));
    const elenco = [...possibili].sort((a, b) => a - b);
    // Per chi non vede i colori: «Semina: ottobre, novembre (meglio: novembre)».
    const parlato = `${t(`scheda.op.${op}`)}: ${elenco.map((m) => nomeMese(m)).join(', ')}${migliori.size ? ` (${t('scheda.meglio')}: ${[...migliori].sort((a, b) => a - b).map((m) => nomeMese(m)).join(', ')})` : ''}`;
    return el('div', { class: 'striscia-riga' },
      el('span', { class: 'striscia-nome' }, t(`scheda.op.${op}`)),
      el('div', { class: 'striscia-mesi', role: 'img', 'aria-label': parlato },
        Array.from({ length: 12 }, (_, i) => i + 1).map((m) => el('span', {
          class: `mese-cella ${migliori.has(m) ? 'meglio' : possibili.has(m) ? 'si' : ''} ${m === meseOggi ? 'ora' : ''}`,
          'aria-hidden': 'true',
        }))));
  });
  const intestazione = el('div', { class: 'striscia-riga' },
    el('span', { class: 'striscia-nome' }),
    el('div', { class: 'striscia-mesi', 'aria-hidden': 'true' },
      Array.from({ length: 12 }, (_, i) => i + 1).map((m) => el('span', { class: `mese-iniziale ${m === meseOggi ? 'ora' : ''}` }, nomeMese(m, 'narrow')))));
  return el('div', { class: 'striscia' }, intestazione, ...righe);
}

function elencoColture(ids, schede) {
  return ids.map((id) => schede.find((s) => s.id === id)?.nome ?? id).join(', ');
}

export async function monta(contenitore) {
  const id = parametriRotta().get('id');
  const [schede, impostazioni, elencoZone, consoc, dRaccolta] = await Promise.all([catalogo(), leggi(), zone(), consociazioni(), raccolta()]);
  const scheda = schede.find((s) => s.id === id);
  const indietro = el('a', { class: 'btn', href: '#/impara' }, t('scheda.indietro'));
  if (!scheda) {
    aggiungi(contenitore, el('h2', { class: 'titolo-schermata' }, t('scheda.non_trovata')), indietro);
    return;
  }
  const zona = elencoZone.find((z) => z.id === impostazioni.zona) ?? elencoZone[0];
  const lavori = scheda.calendario?.[impostazioni.zona] ?? [];
  const meseOggi = meseDi(oggiISO());

  // Fatti in breve
  const fatti = [];
  if (scheda.famiglia) fatti.push(el('li', {}, t('scheda.famiglia', { nome: scheda.famiglia })));
  const g = scheda.giorni_alla_raccolta;
  if (g?.min && g?.max) fatti.push(el('li', {}, t('scheda.raccolta', { min: g.min, max: g.max }), ' ', certezza(g.certezza)));
  const s = scheda.semina;
  if (s?.profondita_cm) fatti.push(el('li', {}, t('scheda.semina_prof', { cm: s.profondita_cm }), ' ', certezza(s.certezza)));
  if (s?.distanza_file_cm) fatti.push(el('li', {}, t('scheda.distanza_file', { cm: s.distanza_file_cm }), ' ', certezza(s.certezza)));
  if (s?.distanza_piante_cm) fatti.push(el('li', {}, t('scheda.distanza_piante', { cm: s.distanza_piante_cm }), ' ', certezza(s.certezza)));

  // Amiche e nemiche: dal file delle consociazioni (con fonti) e, se manca, da quello che dice la scheda
  const relazioni = (consoc?.relazioni ?? []).filter((r) => r.a === scheda.id || r.b === scheda.id)
    .map((r) => ({ altra: r.a === scheda.id ? r.b : r.a, tipo: r.tipo, perche: r.perche, certezza: r.certezza }));
  const amiche = relazioni.filter((r) => r.tipo === 'amica');
  const nemiche = relazioni.filter((r) => r.tipo === 'nemica');
  const bloccoRelazioni = (titolo, lista) => (lista.length ? el('div', {},
    el('h4', {}, titolo),
    el('ul', { class: 'elenco-semplice' }, lista.map((r) => el('li', {},
      el('strong', {}, schede.find((x) => x.id === r.altra)?.nome ?? r.altra), r.perche ? ` — ${r.perche} ` : ' ', certezza(r.certezza))))) : null);

  // «Segui questa coltura»: con alcune colture seguite, Oggi e il calendario mostrano solo i loro lavori.
  let seguite = Array.isArray(impostazioni.colture_scelte) ? impostazioni.colture_scelte : [];
  const bottoneSegui = el('button', { class: 'btn', type: 'button', 'aria-pressed': String(seguita(seguite, scheda.id)), id: 'segui' }, seguita(seguite, scheda.id) ? t('scheda.non_seguire') : t('scheda.segui'));
  bottoneSegui.addEventListener('click', async () => {
    seguite = alternaSeguita(seguite, scheda.id, schede.map((x) => x.id));
    await imposta('colture_scelte', seguite);
    const ora = seguita(seguite, scheda.id);
    bottoneSegui.setAttribute('aria-pressed', String(ora));
    bottoneSegui.textContent = ora ? t('scheda.non_seguire') : t('scheda.segui');
    toast(ora ? t('scheda.segui.fatto') : t('scheda.segui.tolta'));
  });

  const rotazione = scheda.rotazione;
  const fonti = Object.values(scheda.fonti ?? {});

  aggiungi(contenitore,
    indietro,
    el('div', { class: 'scheda-testa' },
      el('img', { class: 'scheda-icona', src: scheda.icona ?? 'assets/colture/generica.svg', alt: '', width: 96, height: 96 }),
      el('div', {},
        el('h2', { class: 'titolo-schermata' }, scheda.nome),
        scheda.nome_scientifico ? el('p', { class: 'aiuto' }, el('em', {}, scheda.nome_scientifico)) : null)),
    scheda.descrizione ? el('p', {}, scheda.descrizione) : null,
    (scheda.avvisi ?? []).map((a) => el('p', { class: 'avviso' }, el('strong', {}, `${t('scheda.avvisi')}: `), a)),
    el('a', { class: 'btn primario grande', href: `#/colture?nuova=${encodeURIComponent(scheda.id)}` }, t('scheda.aggiungi')),
    bottoneSegui,
    el('p', { class: 'aiuto' }, t('scheda.segui.spiega')),

    fatti.length ? el('section', { class: 'card' }, el('h3', {}, t('scheda.in_breve')), el('ul', { class: 'elenco-semplice' }, fatti)) : null,
    bloccoRaccoltaConservazione(scheda.id, dRaccolta) ? el('section', { class: 'card' }, bloccoRaccoltaConservazione(scheda.id, dRaccolta)) : null,

    el('section', { class: 'card' },
      el('h3', {}, t('scheda.quando')),
      lavori.length
        ? [el('p', { class: 'aiuto' }, t('scheda.quando.spiega', { zona: zona?.nome ?? '' })), strisciaMesi(lavori, meseOggi)]
        : el('p', { class: 'aiuto' }, t('scheda.nessun_calendario'))),

    lavori.length ? el('section', { class: 'card' },
      el('h3', {}, t('scheda.lavori')),
      el('p', { class: 'aiuto' }, t('scheda.lavori.tocca')),
      el('ul', { class: 'lista' }, lavori.map((l) => el('li', {},
        el('button', {
          class: 'voce', type: 'button',
          onclick: () => apriLavoro({ scheda, lavoro: l, coltura: null }, l.mesi?.includes(meseOggi) ? meseOggi : l.mesi?.[0] ?? meseOggi, impostazioni.metodo),
        },
        el('img', { class: 'icona-coltura', src: scheda.icona ?? 'assets/colture/generica.svg', alt: '', width: 48, height: 48 }),
        el('span', { class: 'lavoro-testi' },
          el('strong', {}, l.titolo),
          el('span', { class: 'etichette' }, el('span', { class: 'etichetta' }, (l.mesi ?? []).map((m) => nomeMese(m, 'short')).join(' · ')), certezza(l.certezza))))))))
      : null,

    amiche.length || nemiche.length ? el('section', { class: 'card' }, el('h3', {}, t('scheda.consociazioni')), bloccoRelazioni(t('scheda.amiche'), amiche), bloccoRelazioni(t('scheda.nemiche'), nemiche)) : null,

    rotazione && (rotazione.dopo?.length || rotazione.prima_di?.length) ? el('section', { class: 'card' },
      el('h3', {}, t('scheda.rotazione')),
      rotazione.dopo?.length ? el('p', {}, t('scheda.rotazione.dopo', { elenco: elencoColture(rotazione.dopo, schede) })) : null,
      rotazione.prima_di?.length ? el('p', {}, t('scheda.rotazione.prima', { elenco: elencoColture(rotazione.prima_di, schede) })) : null,
      rotazione.note ? el('p', { class: 'aiuto' }, rotazione.note) : null,
      certezza(rotazione.certezza)) : null,

    el('section', { class: 'card' },
      el('h3', {}, t('scheda.fonti')),
      el('p', { class: 'aiuto' }, t('scheda.fonti.spiega')),
      fonti.length ? el('ul', { class: 'elenco-semplice' }, fonti.map((f) => el('li', {},
        el('a', { href: f.url, target: '_blank', rel: 'noopener noreferrer' }, f.titolo ?? f.url),
        f.ente ? ` · ${f.ente}` : '',
        f.consultata ? ` · ${t('scheda.consultata', { data: formattaData(f.consultata) })}` : ''))) : null,
      (scheda.da_verificare ?? []).length ? [el('h4', {}, t('scheda.da_verificare')), el('ul', { class: 'elenco-semplice' }, scheda.da_verificare.map((d) => el('li', {}, d)))] : null),
  );
}
