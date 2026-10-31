// Il resoconto della settimana: cosa è successo nell'orto negli ultimi giorni. Funzioni pure.
import { aggiungiGiorni, dataValida } from '../util.js';

const UNITA = new Set(['kg', 'g', 'pezzi']);
const GIORNI_PREDEFINITI = 7;

const arrotonda3 = (n) => Math.round(n * 1000) / 1000;

// I chili di un raccolto (i grammi diventano chili).
const inChili = (e) => (e.unita === 'g' ? e.quantita / 1000 : e.quantita);

// Un raccolto valido: quantità positiva e unità conosciuta.
function raccoltoValido(e) {
  return e.tipo === 'raccolto'
    && typeof e.quantita === 'number' && Number.isFinite(e.quantita) && e.quantita > 0
    && UNITA.has(e.unita);
}

// La data esiste davvero e sta nella finestra (estremi compresi).
const nellaFinestra = (data, da, a) => dataValida(data) && data >= da && data <= a;

// Quanti giorni considerare: un numero intero positivo, altrimenti sette.
const giorniGiusti = (giorni) => (Number.isInteger(giorni) && giorni > 0 ? giorni : GIORNI_PREDEFINITI);

// Il resoconto dei giorni che finiscono oggi (oggi compreso).
// Restituisce null se oggi non è una data valida; scarta senza errori eventi e foto rovinati.
export function resocontoSettimana(stato, oggi, giorni = GIORNI_PREDEFINITI) {
  if (!dataValida(oggi)) return null;

  const { eventi = [], foto = [] } = stato ?? {};
  const a = oggi;
  const da = aggiungiGiorni(oggi, -(giorniGiusti(giorni) - 1));

  let lavori = 0;
  let saltati = 0;
  let note = 0;
  let fotoContate = 0;
  let kg = 0;
  let pezzi = 0;
  let voci = 0;
  const lavoriPerGiorno = new Map();
  const kgPerColtura = new Map();
  const giorniAttivi = new Set();

  for (const e of Array.isArray(eventi) ? eventi : []) {
    if (e == null || typeof e !== 'object' || !nellaFinestra(e.data, da, a)) continue;

    if (e.tipo === 'lavoro_fatto') {
      lavori++;
      giorniAttivi.add(e.data);
      lavoriPerGiorno.set(e.data, (lavoriPerGiorno.get(e.data) ?? 0) + 1);
    } else if (e.tipo === 'lavoro_saltato') {
      saltati++;
    } else if (e.tipo === 'nota') {
      note++;
      giorniAttivi.add(e.data);
    } else if (raccoltoValido(e)) {
      voci++;
      giorniAttivi.add(e.data);
      if (e.unita === 'pezzi') {
        pezzi += e.quantita;
      } else {
        const chili = inChili(e);
        kg += chili;
        const nome = typeof e.nomeColtura === 'string' ? e.nomeColtura.trim() : '';
        if (nome) kgPerColtura.set(nome, (kgPerColtura.get(nome) ?? 0) + chili);
      }
    }
  }

  for (const f of Array.isArray(foto) ? foto : []) {
    if (f == null || typeof f !== 'object' || !nellaFinestra(f.data, da, a)) continue;
    fotoContate++;
    giorniAttivi.add(f.data);
  }

  // A parità di lavori vince il giorno più recente.
  let miglioreGiorno = null;
  for (const [data, quanti] of lavoriPerGiorno) {
    if (miglioreGiorno === null
      || quanti > lavoriPerGiorno.get(miglioreGiorno)
      || (quanti === lavoriPerGiorno.get(miglioreGiorno) && data > miglioreGiorno)) {
      miglioreGiorno = data;
    }
  }

  // A parità di chili vince la prima coltura in ordine alfabetico.
  let colturaDelRaccolto = null;
  let kgMigliore = -1;
  for (const nome of [...kgPerColtura.keys()].sort((x, y) => x.localeCompare(y, 'it'))) {
    const chili = kgPerColtura.get(nome);
    if (chili > kgMigliore) {
      kgMigliore = chili;
      colturaDelRaccolto = nome;
    }
  }

  const vuoto = lavori === 0 && saltati === 0 && note === 0 && fotoContate === 0 && voci === 0;

  return {
    da,
    a,
    lavori,
    saltati,
    note,
    foto: fotoContate,
    raccolto: { kg: arrotonda3(kg), pezzi, voci },
    giorniAttivi: giorniAttivi.size,
    miglioreGiorno,
    colturaDelRaccolto,
    vuoto,
  };
}

// La chiave della frase da mostrare: resoconto.frase.vuoto | top | bene | poco.
export function chiaveFrase(r) {
  if (r == null || r.vuoto) return 'resoconto.frase.vuoto';

  const lavori = r.lavori ?? 0;
  const giorniAttivi = r.giorniAttivi ?? 0;
  const voci = r.raccolto?.voci ?? 0;

  if (lavori >= 7 || giorniAttivi >= 5) return 'resoconto.frase.top';
  if (lavori >= 3 || voci >= 1 || giorniAttivi >= 3) return 'resoconto.frase.bene';
  return 'resoconto.frase.poco';
}
