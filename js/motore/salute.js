// Valutazione prudente e deterministica: nessun dato assente viene interpretato come problema.
export function giorniDaAnnaffiatura(eventi = [], colturaId, oggi) {
  const date = eventi.filter((e) => e.colturaId === colturaId && e.tipo === 'innaffiato' && e.data <= oggi).map((e) => e.data).sort().at(-1);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(oggi)) return null;
  return Math.max(0, Math.floor((Date.parse(`${oggi}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000));
}

export function valutaSalute({ stagione = null, diagnosi = null, giorniAnnaffiatura = null, acqua = null } = {}) {
  const statoDiagnosi = diagnosi?.risultato?.stato ?? diagnosi?.stato;
  if (stagione?.stato === 'gelo-in-arrivo' || statoDiagnosi === 'problema') return { stato: 'urgente', certezza: 'alta', motivo: stagione?.stato === 'gelo-in-arrivo' ? 'gelo' : 'diagnosi' };
  if (statoDiagnosi === 'dubbio' || stagione?.stato === 'fine-stagione' || stagione?.stato === 'fuori-stagione') return { stato: 'attenzione', certezza: 'media', motivo: 'osservazione' };
  if (statoDiagnosi === 'sana' || stagione?.stato === 'ok') return { stato: 'ok', certezza: 'media', motivo: 'dati', giorniAnnaffiatura, acqua };
  return { stato: 'ignoto', certezza: 'bassa', motivo: 'dati_mancanti', giorniAnnaffiatura, acqua };
}
