// Le colture che l'utente segue: «Oggi» e il calendario mostrano i lavori solo per quelle (più quelle che ha davvero in orto).
// Se non ne ha scelta nessuna si vedono tutte. Funzioni pure.

// scelte: elenco di id di scheda (o vuoto/null = tutte). colture: le colture dell'utente (con schedaId).
export function filtraSeguite(schede, scelte, colture = []) {
  if (!Array.isArray(scelte) || !scelte.length) return schede;
  const mie = new Set(colture.map((c) => c.schedaId).filter(Boolean));
  const seguite = new Set(scelte);
  return schede.filter((s) => seguite.has(s.id) || mie.has(s.id));
}

// Aggiunge o toglie una coltura dall'elenco di quelle seguite; restituisce il nuovo elenco (senza doppioni, solo id noti).
export function alternaSeguita(scelte, id, idNoti = null) {
  const attuali = (Array.isArray(scelte) ? scelte : []).filter((x) => typeof x === 'string' && (!idNoti || idNoti.includes(x)));
  if (idNoti && !idNoti.includes(id)) return [...new Set(attuali)];
  return attuali.includes(id) ? attuali.filter((x) => x !== id) : [...new Set([...attuali, id])];
}

export const seguita = (scelte, id) => Array.isArray(scelte) && scelte.includes(id);
