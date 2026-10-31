// Impostazioni: il mio orto, intelligenza artificiale, backup, informazioni.
import { el, oggiISO, aggiungi } from '../util.js';
import { t, tn } from '../i18n.js';
import { leggi, imposta, rimuovi, pulisciNome } from '../store/impostazioni.js';
import { creaBackup, scarica, leggiFile, applica } from '../store/backup.js';
import { zone } from '../contenuti.js';
import { provaChiave, modelliDisponibili } from '../ai/ai.js';
import { APP_VERSIONE } from '../versione.js';
import { toast } from '../ui/toast.js';
import { SUPERFICI, ACQUE, TEMPI, METODI, ESPERIENZE } from './benvenuto.js';
import { avatar, impostaVestiti } from '../ui/mascotte.js';
import { bloccoInstalla } from '../ui/installa.js';
import { applicaAccessibilita, DIMENSIONI_TESTO } from '../ui/accessibilita.js';
import { vocePossibile } from '../ui/voce.js';
import { arrotondaCoordinata, coordinateValide } from '../motore/meteo.js';
import { VESTITI } from '../motore/vestiti.js';

// Campo di testo che salva da solo quando si esce (nome dell'orto, nome del coltivatore).
function campoTesto(nome, massimo, valore) {
  return el('input', {
    name: nome, maxlength: massimo, value: valore ?? '', autocomplete: 'off', placeholder: t(`benvenuto.orto.${nome}.esempio`),
    onchange: async (e) => {
      const pulito = pulisciNome(e.target.value, massimo);
      e.target.value = pulito;
      await imposta(nome, pulito);
      toast(t('impostazioni.salvato'));
    },
  });
}

// opzionale: aggiunge «Non indicato» (per le risposte che il primo avvio può lasciare vuote).
function selezione(nome, opzioni, valore, { opzionale = false } = {}) {
  const tutte = opzionale ? [['', t('impostazioni.non_indicato')], ...opzioni] : opzioni;
  const originali = new Map(opzioni.map(([v]) => [String(v), v]));
  return el('select', {
    name: nome,
    onchange: async (e) => {
      const scelto = e.target.value;
      await imposta(nome, scelto === '' ? null : originali.get(scelto) ?? scelto);
      toast(t('impostazioni.salvato'));
    },
  }, tutte.map(([v, testo]) => el('option', { value: v, selected: String(v) === String(valore ?? '') }, testo)));
}

const scelte = (tema, ids) => ids.map((id) => [id, t(`scelta.${tema}.${id}`)]);

async function sezioneOrto(s) {
  const elencoZone = await zone();
  const opzioniZone = elencoZone.length
    ? elencoZone.map((z) => [z.id, z.nome])
    : [[s.zona, t(`zona.${s.zona}`)]];
  return el('section', { class: 'card' },
    el('h3', {}, t('impostazioni.orto')),
    el('label', {}, t('impostazioni.nome_orto'), campoTesto('nome_orto', 40, s.nome_orto)),
    el('label', {}, t('impostazioni.nome_coltivatore'), campoTesto('nome_coltivatore', 30, s.nome_coltivatore)),
    el('p', { class: 'aiuto' }, t('impostazioni.nome_privacy')),
    el('label', {}, t('impostazioni.zona'), selezione('zona', opzioniZone, s.zona)),
    el('label', {}, t('impostazioni.metodo'), selezione('metodo', METODI.map((m) => [m, t(`metodo.${m}`)]), s.metodo)),
    el('label', {}, t('impostazioni.esperienza'), selezione('esperienza', ESPERIENZE.map((x) => [x, t(`esperienza.${x}`)]), s.esperienza)),
    el('label', {}, t('impostazioni.superficie'), selezione('superficie_mq', scelte('superficie', SUPERFICI), s.superficie_mq, { opzionale: true })),
    el('label', {}, t('impostazioni.acqua'), selezione('acqua', scelte('acqua', ACQUE), s.acqua, { opzionale: true })),
    el('label', {}, t('impostazioni.tempo'), selezione('tempo', scelte('tempo', TEMPI), s.tempo, { opzionale: true })),
    el('a', { class: 'btn', href: '#/benvenuto' }, t('impostazioni.rifai')),
  );
}

// Le colture che si seguono: «Oggi» e il calendario mostrano i lavori solo per quelle.
function sezioneSeguite(s) {
  const n = Array.isArray(s.colture_scelte) ? s.colture_scelte.length : 0;
  const stato = el('p', { class: 'aiuto', role: 'status' }, n ? t('impostazioni.seguite.n', { n }) : t('impostazioni.seguite.tutte'));
  return el('section', { class: 'card', id: 'seguite' },
    el('h3', {}, t('impostazioni.seguite')),
    stato,
    el('div', { class: 'riga' },
      el('a', { class: 'btn', href: '#/impara' }, t('impostazioni.seguite.scegli')),
      n ? el('button', { class: 'btn', type: 'button', onclick: async () => { await imposta('colture_scelte', []); stato.textContent = t('impostazioni.seguite.tutte'); toast(t('impostazioni.salvato')); } }, t('impostazioni.seguite.azzera')) : null));
}

// Accessibilità: testo più grande, contrasto alto, meno movimento. Si applicano subito e restano salvati.
function sezioneAccessibilita(s) {
  const attuale = { testo: s.testo, contrasto: s.contrasto, movimento_ridotto: s.movimento_ridotto };
  const cambia = async (chiave, valore) => {
    attuale[chiave] = valore;
    await imposta(chiave, valore);
    applicaAccessibilita(attuale);
    toast(t('impostazioni.salvato'));
  };
  const bottoniTesto = el('div', { class: 'riga', role: 'group', 'aria-label': t('accessibilita.testo') },
    DIMENSIONI_TESTO.map((d) => el('button', {
      class: `btn dim-${d}`, type: 'button', 'aria-pressed': String(attuale.testo === d), 'data-testo': d,
      onclick: async () => { await cambia('testo', d); bottoniTesto.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.testo === d))); },
    }, t(`accessibilita.testo.${d}`))));
  const interruttore = (chiave, etichetta) => el('label', { class: 'interruttore' },
    el('input', { type: 'checkbox', name: chiave, checked: Boolean(attuale[chiave]), onchange: (e) => cambia(chiave, e.target.checked) }),
    el('span', {}, etichetta));
  return el('section', { class: 'card', id: 'accessibilita' },
    el('h3', {}, t('accessibilita.titolo')),
    el('p', { class: 'aiuto' }, t('accessibilita.spiega')),
    el('p', { class: 'dato-nome' }, t('accessibilita.testo')),
    bottoniTesto,
    interruttore('contrasto', t('accessibilita.contrasto')),
    interruttore('movimento_ridotto', t('accessibilita.movimento')),
    vocePossibile() ? el('p', { class: 'aiuto' }, t('accessibilita.voce')) : null);
}

// I vermetti: si toccano per vedere che fanno, e qui si sceglie il vestito (o si lascia fare al calendario).
function sezioneVermetti(s) {
  const riga = el('div', { class: 'vermetti-riga' }, avatar('rosso', 'ride'), avatar('rossella', 'pensa'));
  const selettore = el('select', {
    name: 'vestiti',
    onchange: async (e) => {
      await imposta('vestiti', e.target.value);
      impostaVestiti(e.target.value);
      toast(t('impostazioni.salvato'));
    },
  }, [['auto', t('vestito.auto')], ...VESTITI.map((v) => [v, t(`vestito.${v}`)])].map(([v, testo]) => el('option', { value: v, selected: v === s.vestiti }, testo)));
  return el('section', { class: 'card' },
    el('h3', {}, t('impostazioni.vermetti')),
    el('p', { class: 'aiuto' }, t('impostazioni.vermetti.spiega')),
    riga,
    el('label', {}, t('impostazioni.vestiti'), selettore),
  );
}

// Il meteo: di solito basta il centro della zona; volendo, la posizione del telefono (arrotondata, solo per le previsioni).
function sezioneMeteo(s) {
  const stato = el('p', { class: 'aiuto posizione-meteo', role: 'status' });
  const testoPosizione = (p) => (p ? t('impostazioni.meteo.posizione_telefono', { lat: p.lat, lon: p.lon }) : t('impostazioni.meteo.posizione_zona'));
  stato.textContent = testoPosizione(s.meteo_posizione);
  const usa = el('button', { class: 'btn', type: 'button' }, t('impostazioni.meteo.usa_posizione'));
  usa.addEventListener('click', () => {
    stato.textContent = t('impostazioni.meteo.cerco');
    if (!navigator.geolocation) { stato.textContent = t('impostazioni.meteo.negata'); return; }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const p = { lat: arrotondaCoordinata(coords.latitude), lon: arrotondaCoordinata(coords.longitude) };
      if (!coordinateValide(p.lat, p.lon)) { stato.textContent = t('impostazioni.meteo.negata'); return; }
      await imposta('meteo_posizione', p);
      await imposta('meteo_cache', null);
      stato.textContent = testoPosizione(p);
      toast(t('impostazioni.meteo.fatto'));
    }, () => { stato.textContent = t('impostazioni.meteo.negata'); }, { maximumAge: 600000, timeout: 15000 });
  });
  const zona = el('button', { class: 'btn', type: 'button', onclick: async () => {
    await imposta('meteo_posizione', null);
    await imposta('meteo_cache', null);
    stato.textContent = testoPosizione(null);
    toast(t('impostazioni.meteo.fatto'));
  } }, t('impostazioni.meteo.usa_zona'));
  return el('section', { class: 'card' },
    el('h3', {}, t('impostazioni.meteo')),
    el('p', { class: 'aiuto' }, t('impostazioni.meteo.spiega')),
    stato,
    el('div', { class: 'riga' }, usa, zona));
}

function sezioneIA(s) {
  const campoChiave = el('input', { type: 'password', name: 'ai_chiave', autocomplete: 'off', placeholder: s.ai_chiave ? t('ia.chiave.presente') : t('ia.chiave.esempio') });
  const campoModello = el('input', { name: 'ai_modello', value: s.ai_modello, autocomplete: 'off' });
  const esito = el('p', { class: 'esito', role: 'status' });

  const salva = async () => {
    const chiave = campoChiave.value.trim();
    if (chiave) await imposta('ai_chiave', chiave);
    await imposta('ai_modello', campoModello.value.trim() || s.ai_modello);
    campoChiave.value = '';
    campoChiave.placeholder = t('ia.chiave.presente');
    toast(t('ia.salvata'));
  };
  const prova = async () => {
    await salva();
    esito.textContent = t('ia.provando');
    try {
      await provaChiave();
      esito.textContent = t('ia.ok');
    } catch (e) {
      esito.textContent = t(`ia.errore.${e.codice ?? 'altro'}`, { dettaglio: e.message });
    }
  };
  // Google ritira i modelli ogni tanto: qui si chiede alla chiave quali può usare adesso e se ne sceglie uno.
  const modelli = el('div', {});
  const cercaModelli = async () => {
    await salva();
    esito.textContent = t('ia.modelli.cerco');
    try {
      const nomi = await modelliDisponibili();
      if (!nomi.length) { esito.textContent = t('ia.modelli.nessuno'); return; }
      modelli.replaceChildren(el('select', {
        name: 'ai_modello_scelta',
        'aria-label': t('ia.modelli.scegli'),
        onchange: async (e) => {
          if (!e.target.value) return;
          campoModello.value = e.target.value;
          await imposta('ai_modello', e.target.value);
          esito.textContent = t('ia.modelli.scelto', { modello: e.target.value });
        },
      }, [el('option', { value: '' }, t('ia.modelli.scegli')), ...nomi.map((n) => el('option', { value: n, selected: n === campoModello.value }, n))]));
      esito.textContent = t('ia.modelli.trovati', { n: nomi.length });
    } catch (e) {
      esito.textContent = t(`ia.errore.${e.codice ?? 'altro'}`, { dettaglio: e.message });
    }
  };
  const togli = async () => {
    await rimuovi('ai_chiave');
    campoChiave.placeholder = t('ia.chiave.esempio');
    esito.textContent = t('ia.rimossa');
  };

  return el('section', { class: 'card' },
    el('h3', {}, t('ia.titolo')),
    el('p', { class: 'aiuto' }, t('ia.spiega')),
    el('label', {}, t('ia.chiave'), campoChiave),
    el('label', {}, t('ia.modello'), campoModello),
    el('button', { class: 'btn', type: 'button', onclick: cercaModelli }, t('ia.modelli.cerca')),
    modelli,
    el('div', { class: 'riga' },
      el('button', { class: 'btn', type: 'button', onclick: salva }, t('ia.salva')),
      el('button', { class: 'btn', type: 'button', onclick: prova }, t('ia.prova')),
    ),
    el('button', { class: 'btn pericolo', type: 'button', onclick: togli }, t('ia.rimuovi')),
    esito,
  );
}

function sezioneBackup() {
  const file = el('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  file.addEventListener('change', async () => {
    const scelto = file.files[0];
    file.value = '';
    if (!scelto) return;
    let dati;
    try {
      dati = await leggiFile(scelto);
    } catch (e) {
      toast(t(`backup.errore.${e.codice === 'json' ? 'json' : 'formato'}`));
      return;
    }
    if (!confirm(tn('backup.conferma', dati.colture.length))) return;
    await applica(dati);
    toast(tn('backup.importato', dati.colture.length));
    // Ricarica la schermata per mostrare i dati nuovi.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  return el('section', { class: 'card' },
    el('h3', {}, t('backup.titolo')),
    el('p', { class: 'aiuto' }, t('backup.spiega')),
    el('p', { class: 'aiuto' }, t('backup.foto_nota')),
    el('div', { class: 'riga' },
      el('button', { class: 'btn', type: 'button', onclick: async () => {
        const backup = await creaBackup();
        scarica(backup, `orto-backup-${oggiISO()}.json`);
        toast(tn('backup.esportato', backup.colture.length));
      } }, t('backup.esporta')),
      el('button', { class: 'btn', type: 'button', onclick: async () => {
        const backup = await creaBackup({ conFoto: true });
        scarica(backup, `orto-backup-con-foto-${oggiISO()}.json`);
        toast(tn('backup.esportato', backup.colture.length));
      } }, t('backup.esporta_foto')),
      el('button', { class: 'btn', type: 'button', onclick: () => file.click() }, t('backup.importa')),
    ),
    file,
  );
}

export async function monta(contenitore) {
  const s = await leggi();
  aggiungi(contenitore, 
    el('h2', { class: 'titolo-schermata' }, t('impostazioni.titolo')),
    bloccoInstalla(),
    await sezioneOrto(s),
    sezioneSeguite(s),
    sezioneAccessibilita(s),
    sezioneVermetti(s),
    sezioneMeteo(s),
    sezioneIA(s),
    sezioneBackup(),
    el('section', { class: 'card' },
      el('h3', {}, t('info.titolo')),
      el('p', {}, t('info.testo')),
      el('p', { class: 'aiuto' }, t('info.versione', { v: APP_VERSIONE })),
    ),
  );
}
