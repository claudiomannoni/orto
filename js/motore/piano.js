// Geometria e giudizi del piano dell'orto. Funzioni pure.
export function limitaPosizione(x, y) {
  const limita = (valore) => typeof valore !== 'number' || Number.isNaN(valore)
    ? 0.5
    : Math.max(0, Math.min(1, valore));
  return { x: limita(x), y: limita(y) };
}

export function distanzaMetri(a, b, larghezza_m, lunghezza_m) {
  if (!Number.isFinite(larghezza_m) || larghezza_m <= 0 || !Number.isFinite(lunghezza_m) || lunghezza_m <= 0) return null;
  if (!a || !b || !Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(b.x) || !Number.isFinite(b.y)) return null;
  return Math.hypot((a.x - b.x) * larghezza_m, (a.y - b.y) * lunghezza_m);
}

export function vicini(segnaposto, larghezza_m, lunghezza_m, raggio_m) {
  if (!Array.isArray(segnaposto) || !Number.isFinite(raggio_m) || raggio_m < 0) return [];
  const coppie = [];
  for (let i = 0; i < segnaposto.length; i++) {
    for (let j = i + 1; j < segnaposto.length; j++) {
      const uno = segnaposto[i], due = segnaposto[j];
      if (!uno || !due || uno.id == null || due.id == null) continue;
      const distanza = distanzaMetri(uno, due, larghezza_m, lunghezza_m);
      if (distanza === null || distanza > raggio_m) continue;
      const [a, b] = [String(uno.id), String(due.id)].sort();
      coppie.push({ a, b, distanza });
    }
  }
  return coppie.sort((p, q) => p.distanza - q.distanza || p.a.localeCompare(q.a) || p.b.localeCompare(q.b));
}

export function giudizioVicinato(segnaposto, consociazioni, larghezza_m, lunghezza_m, raggio_m) {
  if (!Array.isArray(segnaposto) || !Array.isArray(consociazioni)) return [];
  const perId = new Map(segnaposto.filter((s) => s && s.id != null).map((s) => [String(s.id), s]));
  return vicini(segnaposto, larghezza_m, lunghezza_m, raggio_m).flatMap((coppia) => {
    const a = perId.get(coppia.a), b = perId.get(coppia.b);
    if (!a || !b || !a.schedaId || !b.schedaId) return [];
    const relazione = consociazioni.find((r) => r && ((r.a === a.schedaId && r.b === b.schedaId) || (r.b === a.schedaId && r.a === b.schedaId)));
    return relazione && (relazione.tipo === 'amica' || relazione.tipo === 'nemica')
      ? [{ ...coppia, tipo: relazione.tipo }]
      : [];
  });
}

export function statoPerSegnaposto(giudizi) {
  const stati = {};
  if (!Array.isArray(giudizi)) return stati;
  for (const giudizio of giudizi) {
    if (!giudizio || (giudizio.tipo !== 'amica' && giudizio.tipo !== 'nemica')) continue;
    for (const id of [giudizio.a, giudizio.b]) {
      if (id == null) continue;
      const chiave = String(id);
      if (giudizio.tipo === 'nemica') stati[chiave] = 'attenzione';
      else if (stati[chiave] !== 'attenzione') stati[chiave] = 'ok';
    }
  }
  return stati;
}

export function postoLibero(segnaposto, larghezza_m, lunghezza_m, distanzaMinima_m) {
  const centro = { x: 0.5, y: 0.5 };
  if (!Array.isArray(segnaposto) || !Number.isFinite(larghezza_m) || larghezza_m <= 0 || !Number.isFinite(lunghezza_m) || lunghezza_m <= 0 || !Number.isFinite(distanzaMinima_m) || distanzaMinima_m < 0) return centro;
  for (let riga = 0; riga < 8; riga++) {
    for (let colonna = 0; colonna < 8; colonna++) {
      const punto = { x: (colonna + 0.5) / 8, y: (riga + 0.5) / 8 };
      const libero = segnaposto.every((s) => {
        if (!s) return false;
        const distanza = distanzaMetri(punto, s, larghezza_m, lunghezza_m);
        return distanza !== null && distanza >= distanzaMinima_m;
      });
      if (libero) return punto;
    }
  }
  return centro;
}
