// Impostazioni: il mio orto, intelligenza artificiale, backup, informazioni.
import { el, oggiISO } from '../util.js';
import { t } from '../i18n.js';
import { leggi, imposta, rimuovi } from '../store/impostazioni.js';
import { creaBackup, scarica, leggiFile, applica } from '../store/backup.js';
import { zone } from '../contenuti.js';
import { provaChiave } from '../ai/ai.js';
import { APP_VERSIONE } from '../versione.js';
import { toast } from '../ui/toast.js';

const METODI = ['nessuno', 'biologico', 'tradizionale', 'sinergico'];
const ESPERIENZE = ['principiante', 'intermedio', 'esperto'];

function selezione(nome, opzioni, valore) {
  return el('select', { name: nome, onchange: async (e) => { await imposta(nome, e.target.value); toast(t('impostazioni.salvato')); } },
    opzioni.map(([v, testo]) => el('option', { value: v, selected: v === valore }, testo)));
}

async function sezioneOrto(s) {
  const elencoZone = await zone();
  const opzioniZone = elencoZone.length
    ? elencoZone.map((z) => [z.id, z.nome])
    : [[s.zona, t(`zona.${s.zona}`)]];
  return el('section', { class: 'card' },
    el('h3', {}, t('impostazioni.orto')),
    el('label', {}, t('impostazioni.zona'), selezione('zona', opzioniZone, s.zona)),
    el('label', {}, t('impostazioni.metodo'), selezione('metodo', METODI.map((m) => [m, t(`metodo.${m}`)]), s.metodo)),
    el('label', {}, t('impostazioni.esperienza'), selezione('esperienza', ESPERIENZE.map((x) => [x, t(`esperienza.${x}`)]), s.esperienza)),
  );
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
    if (!confirm(t('backup.conferma', { n: dati.colture.length }))) return;
    await applica(dati);
    toast(t('backup.importato', { n: dati.colture.length }));
    // Ricarica la schermata per mostrare i dati nuovi.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  return el('section', { class: 'card' },
    el('h3', {}, t('backup.titolo')),
    el('p', { class: 'aiuto' }, t('backup.spiega')),
    el('div', { class: 'riga' },
      el('button', { class: 'btn', type: 'button', onclick: async () => {
        const backup = await creaBackup();
        scarica(backup, `orto-backup-${oggiISO()}.json`);
        toast(t('backup.esportato', { n: backup.colture.length }));
      } }, t('backup.esporta')),
      el('button', { class: 'btn', type: 'button', onclick: () => file.click() }, t('backup.importa')),
    ),
    file,
  );
}

export async function monta(contenitore) {
  const s = await leggi();
  contenitore.append(
    el('h2', { class: 'titolo-schermata' }, t('impostazioni.titolo')),
    await sezioneOrto(s),
    sezioneIA(s),
    sezioneBackup(),
    el('section', { class: 'card' },
      el('h3', {}, t('info.titolo')),
      el('p', {}, t('info.testo')),
      el('p', { class: 'aiuto' }, t('info.versione', { v: APP_VERSIONE })),
    ),
  );
}
