// Il profilo del terreno di una zona: questionario, piante spontanee, test del barattolo, consigli.
import { el } from '../util.js';
import { t } from '../i18n.js';
import { terreno as caricaTerreno } from '../contenuti.js';
import { apriFoglio } from './foglio.js';
import { calcolaProfilo, barattoloValido, ASSI } from '../motore/terreno.js';
import { sezioneFoto } from './foto-terreno.js';

// "Sabbioso · Drenaggio buono · Humus ricco", o null se non si sa niente.
export function riassuntoTerreno(terreno) {
  if (!terreno) return null;
  const parti = Object.keys(ASSI).map((asse) => (terreno[asse] ? t(`terreno.${asse}.${terreno[asse]}`) : null)).filter(Boolean);
  return parti.length ? parti.join(' · ') : null;
}

const etichettaCertezza = (certezza) => el('span', { class: `etichetta certezza ${certezza}` }, t(`lavoro.certezza.${certezza}`));

const numeroOpzionale = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return String(v ?? '').trim() !== '' && Number.isFinite(n) ? n : null;
};

export async function apriTerreno({ zona, alSalvare }) {
  const dati = await caricaTerreno();
  if (!dati) {
    const foglio = apriFoglio({
      titolo: t('terreno.titolo'),
      contenuto: el('div', { class: 'form' },
        el('p', {}, t('terreno.mancano')),
        el('button', { class: 'btn primario', type: 'button', onclick: () => foglio.close() }, t('foglio.chiudi'))),
    });
    return foglio;
  }

  const stato = {
    risposte: { ...(zona.terreno?.risposte ?? {}) },
    piante: [...(zona.terreno?.piante ?? [])],
    barattolo: zona.terreno?.barattolo ?? null,
    indiziFoto: { ...(zona.terreno?.foto?.indizi ?? {}) },
  };
  const caselle = new Map(); // erba -> casella nella lista, per segnarla anche dalle foto
  const risultato = el('section', { class: 'card risultato-terreno', 'aria-live': 'polite' });

  function disegnaRisultato() {
    const profilo = calcolaProfilo(stato, dati);
    const consigli = (dati.consigli ?? []).filter((c) => profilo[c.asse] === c.valore);
    risultato.replaceChildren(
      el('h3', {}, t('terreno.risultato')),
      el('ul', { class: 'fasi' }, Object.keys(ASSI).map((asse) => el('li', {},
        el('span', {}, t(`terreno.asse.${asse}`)),
        el('strong', {}, profilo[asse] ? t(`terreno.${asse}.${profilo[asse]}`) : t('terreno.nonso'))))),
      consigli.length ? el('div', { class: 'consigli' }, consigli.map((c) => el('div', {},
        el('p', {}, c.testo), etichettaCertezza(c.certezza)))) : el('p', { class: 'aiuto' }, t('terreno.risultato.vuoto')),
    );
    return profilo;
  }

  const domande = (dati.questionario ?? []).map((d) => el('fieldset', { class: 'scelte domanda', 'data-id': d.id },
    el('legend', {}, d.testo),
    d.perche ? el('p', { class: 'aiuto' }, d.perche) : null,
    d.opzioni.map((o) => el('label', {},
      el('input', {
        type: 'radio', name: `d-${d.id}`, value: o.id, checked: stato.risposte[d.id] === o.id,
        onchange: () => { stato.risposte[d.id] = o.id; disegnaRisultato(); },
      }), o.testo))));

  const piante = (dati.piante_indicatrici ?? []).map((p) => el('label', { class: 'pianta' },
    (() => {
      const casella = el('input', {
        type: 'checkbox', value: p.id, checked: stato.piante.includes(p.id),
        onchange: (e) => {
          stato.piante = e.target.checked ? [...stato.piante, p.id] : stato.piante.filter((x) => x !== p.id);
          disegnaRisultato();
        },
      });
      caselle.set(p.id, casella);
      return casella;
    })(),
    el('span', {},
      el('strong', {}, p.nome), p.nome_scientifico ? el('em', {}, ` ${p.nome_scientifico}`) : null,
      el('span', { class: 'aiuto' }, p.come_riconoscerla ?? ''),
      el('span', { class: 'aiuto' }, p.note ?? ''),
      etichettaCertezza(p.certezza ?? 'bassa'))));

  const barattoloDati = dati.test_barattolo;
  const campo = (nome, chiave) => el('label', {}, t(`terreno.barattolo.${nome}`), el('input', {
    name: nome, type: 'number', inputmode: 'decimal', min: '0', max: '100', step: '1', value: stato.barattolo?.[chiave] ?? '',
    oninput: aggiornaBarattolo,
  }));
  const campi = [campo('sabbia', 'sabbia_pct'), campo('limo', 'limo_pct'), campo('argilla', 'argilla_pct')];
  const avvisoBarattolo = el('p', { class: 'aiuto', role: 'status' });

  function aggiornaBarattolo() {
    const [sabbia, limo, argilla] = campi.map((c) => numeroOpzionale(c.querySelector('input').value));
    if ([sabbia, limo, argilla].every((v) => v === null)) {
      stato.barattolo = null;
      avvisoBarattolo.textContent = '';
    } else {
      const valori = { sabbia_pct: sabbia, limo_pct: limo, argilla_pct: argilla };
      stato.barattolo = valori;
      avvisoBarattolo.textContent = barattoloValido(valori) ? '' : t('terreno.barattolo.somma');
    }
    disegnaRisultato();
  }

  const sezioneBarattolo = barattoloDati ? el('details', { class: 'sezione-terreno' },
    el('summary', {}, barattoloDati.titolo ?? t('terreno.barattolo')),
    el('div', { class: 'corpo' },
      el('h4', {}, t('terreno.barattolo.materiali')),
      el('ul', { class: 'elenco-semplice' }, (barattoloDati.materiali ?? []).map((m) => el('li', {}, m))),
      el('h4', {}, t('terreno.barattolo.passi')),
      el('ol', { class: 'elenco-semplice' }, (barattoloDati.passi ?? []).map((p) => el('li', {}, p.testo))),
      barattoloDati.lettura ? [el('h4', {}, t('terreno.barattolo.lettura')), el('p', {}, barattoloDati.lettura)] : null,
      etichettaCertezza(barattoloDati.certezza ?? 'bassa'),
      el('h4', {}, t('terreno.barattolo.risultato')),
      el('div', { class: 'riga' }, campi),
      avvisoBarattolo,
    )) : null;

  disegnaRisultato();
  const salva = el('button', {
    class: 'btn primario', type: 'button',
    onclick: () => {
      const profilo = calcolaProfilo(stato, dati);
      alSalvare({
        tessitura: profilo.tessitura, drenaggio: profilo.drenaggio, humus: profilo.humus,
        risposte: stato.risposte, barattolo: stato.barattolo && barattoloValido(stato.barattolo) ? stato.barattolo : null,
        piante: stato.piante, aggiornato: new Date().toISOString(),
        foto: Object.keys(stato.indiziFoto).length ? { indizi: stato.indiziFoto, data: new Date().toISOString() } : null,
      });
      foglio.close();
    },
  }, t('terreno.salva'));

  const foglio = apriFoglio({
    titolo: t('terreno.titolo'),
    contenuto: el('div', { class: 'form terreno-form' },
      el('p', { class: 'aiuto' }, t('terreno.spiega')),
      sezioneFoto({ dati, stato, caselle, aggiorna: disegnaRisultato }),
      el('details', { class: 'sezione-terreno', open: true }, el('summary', {}, t('terreno.questionario')), el('div', { class: 'corpo' }, domande)),
      el('details', { class: 'sezione-terreno' }, el('summary', {}, t('terreno.piante')),
        el('div', { class: 'corpo' }, el('p', { class: 'aiuto' }, t('terreno.piante.spiega')), piante)),
      sezioneBarattolo,
      risultato,
      (dati.da_verificare ?? []).length ? el('p', { class: 'aiuto' }, t('terreno.da_verificare')) : null,
      el('div', { class: 'riga' },
        el('button', { class: 'btn', type: 'button', onclick: () => foglio.close() }, t('form.annulla')),
        salva),
    ),
  });
  return foglio;
}
