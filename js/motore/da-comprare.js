export function daComprare(arg) {
  const { semi, schede, zonaId, mese, seguite } = arg && typeof arg === 'object' ? arg : {};
  if (!Array.isArray(semi) || !Array.isArray(schede)) return [];
  if (typeof zonaId !== 'string') return [];
  if (!Number.isInteger(mese) || mese < 1 || mese > 12) return [];

  const seguiteArr = Array.isArray(seguite) && seguite.length ? seguite : null;
  const idsSeguiti = seguiteArr ? new Set(seguiteArr) : null;

  const risultato = [];
  for (const s of schede) {
    if (!s || typeof s !== 'object') continue;
    if (idsSeguiti && !idsSeguiti.has(s.id)) continue;
    const cal = s.calendario;
    if (!cal || typeof cal !== 'object') continue;
    const lavori = cal[zonaId];
    if (!Array.isArray(lavori)) continue;
    let titolo = null;
    for (const l of lavori) {
      if (l && l.operazione === 'semina' && Array.isArray(l.mesi) && l.mesi.includes(mese)) {
        titolo = l.titolo;
        break;
      }
    }
    if (titolo === null) continue;
    const haBustina = semi.some((b) => b && b.schedaId === s.id);
    if (haBustina) continue;
    risultato.push({ schedaId: s.id, nome: s.nome, titolo });
  }
  risultato.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'it'));
  return risultato;
}

export function semiInScadenza(arg) {
  const { semi, annoCorrente } = arg && typeof arg === 'object' ? arg : {};
  if (!Array.isArray(semi)) return [];
  if (!Number.isInteger(annoCorrente)) return [];
  const filtrate = semi.filter((b) => b && Number.isInteger(b.anno) && annoCorrente - b.anno >= 5);
  filtrate.sort((a, b) => {
    if (a.anno !== b.anno) return a.anno - b.anno;
    return String(a.nome).localeCompare(String(b.nome), 'it');
  });
  return filtrate;
}
