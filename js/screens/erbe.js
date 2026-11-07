// Erbe aromatiche e frutta: schede essenziali. Ogni dato ha la sua certezza e le sue fonti; quello che le fonti non dicono resta in «Da verificare».
import { el, aggiungi } from '../util.js';
import { t, locale } from '../i18n.js';
import { erbeFrutta } from '../contenuti.js';
import { bloccoSopravvivenza } from '../ui/sopravvivenza.js';

const certezza = (c) => el('span', { class: `etichetta certezza ${['alta', 'media'].includes(c) ? c : 'bassa'}` }, t(`animali.certezza.${c ?? 'bassa'}`));
const mese = (m) => new Date(2000, m - 1, 1).toLocaleDateString(locale(), { month: 'long' });

function riga(chiave, valore, cert) {
  if (!valore) return null;
  return el('div', { class: 'dato-erbe' }, el('dt', {}, t(chiave)), el('dd', {}, valore, ' ', cert ? certezza(cert) : null));
}

function scheda(p, fonti) {
  const usate = [...new Set([
    ...(p.esposizione?.fonti ?? []), ...(p.acqua?.fonti ?? []), ...(p.terreno?.fonti ?? []), ...(p.in_vaso?.fonti ?? []),
    ...(p.semina?.fonti ?? []), ...(p.mesi?.fonti ?? []),
    ...(p.propagazione ?? []).flatMap((m) => m.fonti ?? []), ...(p.opzioni ?? []).flatMap((o) => o.fonti ?? []),
  ])].map((id) => fonti[id]).filter(Boolean);
  const semina = p.semina
    ? [p.semina.profondita_cm != null ? t('erbe.profondita', { cm: p.semina.profondita_cm }) : null,
      p.semina.distanza_file_cm != null ? t('erbe.file', { cm: p.semina.distanza_file_cm }) : null,
      p.semina.distanza_piante_cm != null ? t('erbe.piante', { cm: p.semina.distanza_piante_cm }) : null].filter(Boolean).join(', ')
    : null;
  const mesi = p.mesi
    ? ['semina', 'trapianto', 'raccolta'].filter((k) => p.mesi[k]?.length).map((k) => `${t(`erbe.mesi.${k}`)}: ${p.mesi[k].map(mese).join(', ')}`).join('. ')
    : null;
  const vaso = p.in_vaso ? [p.in_vaso.valore === 'si' ? t('erbe.si') : p.in_vaso.valore === 'no' ? t('erbe.no') : p.in_vaso.valore, p.in_vaso.come].filter(Boolean).join('. ') : null;
  const dati = [
    riga('erbe.luce', p.esposizione?.valore, p.esposizione?.certezza),
    riga('erbe.acqua', p.acqua?.valore, p.acqua?.certezza),
    riga('erbe.terreno', p.terreno?.valore, p.terreno?.certezza),
    riga('erbe.vaso', vaso, p.in_vaso?.certezza),
    riga('erbe.semina', semina, p.semina?.certezza),
    riga('erbe.mesi', mesi, p.mesi?.certezza),
  ].filter(Boolean);
  const propaga = (p.propagazione ?? []).length
    ? el('div', {}, el('h4', {}, t('erbe.propaga')), ...p.propagazione.map((m) => el('div', { class: 'metodo-erbe' },
      el('strong', {}, t(`erbe.tipo.${m.tipo}`)), ' ', certezza(m.certezza),
      el('ul', { class: 'elenco-semplice' }, (Array.isArray(m.come) ? m.come : [m.come]).filter(Boolean).map((x) => el('li', {}, x))))))
    : null;
  const inverno = p.opzioni?.length ? bloccoSopravvivenza(p.id, { fonti, colture: { [p.id]: { opzioni: p.opzioni } } }) : null;
  return el('details', { class: 'pianta-erbe', 'data-pianta': p.id },
    el('summary', {}, el('span', { class: 'opzione-titolo' }, el('strong', {}, p.nome), el('span', { class: 'aiuto' }, p.descrizione ?? ''))),
    el('div', { class: 'corpo' },
      dati.length ? el('dl', { class: 'dati-erbe' }, ...dati) : el('p', { class: 'aiuto' }, t('erbe.poche_info')),
      propaga, inverno,
      p.da_verificare?.length ? el('div', {}, el('h4', {}, t('erbe.da_verificare')), el('ul', { class: 'elenco-semplice' }, p.da_verificare.map((x) => el('li', {}, x)))) : null,
      usate.length ? el('details', { class: 'meteo-dettagli' }, el('summary', {}, t('animali.fonti')),
        el('ul', { class: 'elenco-semplice' }, usate.map((x) => el('li', {}, el('a', { href: x.url, target: '_blank', rel: 'noopener noreferrer' }, x.titolo), x.ente ? ` (${x.ente})` : '')))) : null));
}

export async function monta(contenitore) {
  const dati = await erbeFrutta();
  aggiungi(contenitore,
    el('h2', { class: 'titolo-schermata' }, t('erbe.titolo')),
    el('p', { class: 'aiuto' }, t('erbe.spiega')),
    dati?.piante?.length ? el('div', { class: 'elenco-erbe' }, dati.piante.map((p) => scheda(p, dati.fonti ?? {}))) : el('p', { class: 'vuoto-testo' }, t('erbe.vuoto')));
}
