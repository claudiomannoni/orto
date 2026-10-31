// A che punto è una coltura: dai giorni dalla semina e dai giorni alla raccolta della scheda. Funzioni pure.
import { daISO } from '../util.js';

const giorniTra = (da, a) => Math.round((daISO(a) - daISO(da)) / 86400000);

// Restituisce { giorni, fase, quota } oppure { giorni, fase: 'sconosciuta', quota: null } se la scheda non dice quanto ci vuole.
// fase: 'appena_messa' (primi giorni) | 'cresce' | 'quasi' (dal 80%) | 'pronta' (nella finestra di raccolta) | 'oltre' (molto oltre) | 'sconosciuta'.
export function crescita(coltura, scheda, oggi) {
  if (!coltura?.dataSemina || !/^\d{4}-\d{2}-\d{2}$/.test(coltura.dataSemina)) return { giorni: null, fase: 'sconosciuta', quota: null };
  const giorni = giorniTra(coltura.dataSemina, oggi);
  if (giorni < 0) return { giorni, fase: 'futura', quota: 0 };
  const g = scheda?.giorni_alla_raccolta;
  if (!g || !Number.isFinite(g.min) || !Number.isFinite(g.max) || g.max <= 0) return { giorni, fase: 'sconosciuta', quota: null };
  const quota = Math.min(1, giorni / g.max);
  let fase;
  if (giorni >= g.min && giorni <= g.max * 1.5) fase = 'pronta';
  else if (giorni > g.max * 1.5) fase = 'oltre';
  else if (giorni >= g.max * 0.8) fase = 'quasi';
  else if (giorni <= Math.max(7, g.max * 0.1)) fase = 'appena_messa';
  else fase = 'cresce';
  return { giorni, fase, quota };
}

// Raggruppa le colture per zona: [{ zonaId, zona (oggetto o null), colture: [...] }], prima le zone nell'ordine dato, poi «senza zona».
export function perZona(colture, zone) {
  const gruppi = zone.map((z) => ({ zonaId: z.id, zona: z, colture: colture.filter((c) => c.zonaId === z.id) })).filter((g) => g.colture.length);
  const noteIds = new Set(zone.map((z) => z.id));
  const senza = colture.filter((c) => !c.zonaId || !noteIds.has(c.zonaId));
  if (senza.length) gruppi.push({ zonaId: null, zona: null, colture: senza });
  return gruppi;
}
