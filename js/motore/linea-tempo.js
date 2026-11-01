// Funzioni pure per ricavare la linea del tempo delle foto.

export function lineaDelTempo(foto, colturaId) {
  if (!Array.isArray(foto)) return [];
  return foto
    .filter((f) => f && typeof f === 'object' && f.colturaId === colturaId)
    .slice()
    .sort((a, b) => {
      const dataA = String(a.data ?? '');
      const dataB = String(b.data ?? '');
      if (dataA !== dataB) return dataA < dataB ? -1 : 1;
      const idA = String(a.id ?? '');
      const idB = String(b.id ?? '');
      return idA < idB ? -1 : idA > idB ? 1 : 0;
    })
    .map((f) => {
      const risultato = f.diagnosi?.risultato;
      return {
        foto: f,
        data: f.data,
        stato: risultato?.stato ?? null,
        faseNome: risultato?.fase_osservata?.nome ?? null,
        confronto: risultato?.confronto_fase ?? null,
        problemi: Array.isArray(risultato?.problemi)
          ? risultato.problemi.filter((p) => p && typeof p === 'object' && typeof p.nome === 'string').map((p) => p.nome)
          : [],
      };
    });
}

export function andamentoSalute(linea) {
  const valori = { sana: 0, dubbio: 1, problema: 2 };
  const validi = (Array.isArray(linea) ? linea : [])
    .map((voce) => voce?.stato)
    .filter((stato) => Object.hasOwn(valori, stato))
    .map((stato) => valori[stato]);
  if (validi.length < 2) return 'ignoto';
  const primo = validi[0];
  const ultimo = validi[validi.length - 1];
  return ultimo < primo ? 'migliora' : ultimo > primo ? 'peggiora' : 'stabile';
}

function giornoUtc(data) {
  if (typeof data !== 'string') return null;
  const parti = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!parti) return null;
  const [anno, mese, giorno] = parti.slice(1).map(Number);
  const dataUtc = new Date(0);
  dataUtc.setUTCHours(0, 0, 0, 0);
  dataUtc.setUTCFullYear(anno, mese - 1, giorno);
  if (dataUtc.getUTCFullYear() !== anno || dataUtc.getUTCMonth() !== mese - 1 || dataUtc.getUTCDate() !== giorno) return null;
  return Date.UTC(anno, mese - 1, giorno);
}

export function giorniFraFoto(linea) {
  const voci = Array.isArray(linea) ? linea : [];
  const giorni = voci.map((voce) => giornoUtc(voce?.data));
  return giorni.slice(1).map((giorno, indice) => {
    const prima = giorni[indice];
    return prima === null || giorno === null ? 0 : Math.max(0, (giorno - prima) / 86400000);
  });
}

export function ultimaPerColtura(foto) {
  const ultime = {};
  if (!Array.isArray(foto)) return ultime;
  const valide = foto.filter((f) => f && typeof f === 'object' && f.colturaId != null);
  valide.sort((a, b) => {
    const da = String(a.data ?? ''), db = String(b.data ?? '');
    if (da !== db) return da < db ? -1 : 1;
    const ia = String(a.id ?? ''), ib = String(b.id ?? '');
    return ia < ib ? -1 : ia > ib ? 1 : 0;
  });
  for (const f of valide) {
    ultime[f.colturaId] = { data: f.data, stato: f.diagnosi?.risultato?.stato ?? null };
  }
  return ultime;
}
