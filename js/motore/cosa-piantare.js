// «Cosa piantare qui adesso?». Funzioni pure.

function mesiValidi(mese) {
  return Number.isInteger(mese) && mese >= 1 && mese <= 12;
}

function dataValida(data) {
  if (typeof data !== 'string') return false;
  const d = new Date(data + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

function differenzaGiorni(data1, data2) {
  const d1 = Date.UTC(data1.getUTCFullYear(), data1.getUTCMonth(), data1.getUTCDate());
  const d2 = Date.UTC(data2.getUTCFullYear(), data2.getUTCMonth(), data2.getUTCDate());
  return Math.floor((d1 - d2) / 86400000);
}

export function cosaPiantare({ schede, zonaId, mese, colture, eventi, relazioni, oggi }) {
  if (!Array.isArray(schede) || !mesiValidi(mese) || typeof zonaId !== 'string' || !zonaId) {
    return [];
  }

  const oggiDate = dataValida(oggi) ? new Date(oggi + 'T00:00:00Z') : new Date();
  const limiteRotazione = new Date(oggiDate.getTime() - 365 * 86400000);

  const schedePerId = new Map();
  for (const s of schede) {
    if (s && typeof s.id === 'string' && s.id) {
      schedePerId.set(s.id, s);
    }
  }

  const colturePresenti = new Set();
  const famigliePresenti = new Set();
  const famiglieEventiRecenti = new Set();

  if (Array.isArray(colture)) {
    for (const c of colture) {
      if (c && typeof c.schedaId === 'string' && c.schedaId) {
        colturePresenti.add(c.schedaId);
        const scheda = schedePerId.get(c.schedaId);
        if (scheda && typeof scheda.famiglia === 'string' && scheda.famiglia) {
          famigliePresenti.add(scheda.famiglia);
        }
      }
    }
  }

  if (Array.isArray(eventi)) {
    for (const e of eventi) {
      if (e && typeof e.schedaId === 'string' && e.schedaId && dataValida(e.data)) {
        const dataEvento = new Date(e.data + 'T00:00:00Z');
        if (dataEvento >= limiteRotazione && dataEvento <= oggiDate) {
          const scheda = schedePerId.get(e.schedaId);
          if (scheda && typeof scheda.famiglia === 'string' && scheda.famiglia) {
            famiglieEventiRecenti.add(scheda.famiglia);
          }
        }
      }
    }
  }

  const relazioniPerScheda = new Map();
  if (Array.isArray(relazioni)) {
    for (const r of relazioni) {
      if (r && typeof r.a === 'string' && r.a && typeof r.b === 'string' && r.b &&
          (r.tipo === 'amica' || r.tipo === 'nemica')) { // la certezza è una parola (alta/media/bassa), non un numero
        for (const [da, a] of [[r.a, r.b], [r.b, r.a]]) {
          if (!relazioniPerScheda.has(da)) relazioniPerScheda.set(da, []);
          relazioniPerScheda.get(da).push({ con: a, tipo: r.tipo, certezza: r.certezza });
        }
      }
    }
  }

  const risultati = [];

  for (const scheda of schede) {
    if (!scheda || typeof scheda.id !== 'string' || !scheda.id) continue;
    if (colturePresenti.has(scheda.id)) continue;

    const cal = scheda.calendario && scheda.calendario[zonaId];
    if (!Array.isArray(cal)) continue;

    let lavoroCorrispondente = null;
    for (const lavoro of cal) {
      if (lavoro && (lavoro.operazione === 'semina' || lavoro.operazione === 'trapianto') &&
          Array.isArray(lavoro.mesi) && lavoro.mesi.includes(mese) && typeof lavoro.titolo === 'string') {
        lavoroCorrispondente = lavoro;
        break;
      }
    }
    if (!lavoroCorrispondente) continue;

    const motivi = [];

    const rels = relazioniPerScheda.get(scheda.id) || [];
    for (const rel of rels) {
      if (colturePresenti.has(rel.con)) {
        const schedaCon = schedePerId.get(rel.con);
        if (schedaCon && typeof schedaCon.nome === 'string') {
          motivi.push({ tipo: rel.tipo, con: schedaCon.nome, certezza: rel.certezza });
        }
      }
    }

    if (typeof scheda.famiglia === 'string' && scheda.famiglia) {
      if (famigliePresenti.has(scheda.famiglia) || famiglieEventiRecenti.has(scheda.famiglia)) {
        motivi.push({ tipo: 'rotazione', famiglia: scheda.famiglia });
      }
    }

    const haAttenzione = motivi.some(m => m.tipo === 'nemica' || m.tipo === 'rotazione');
    const stato = haAttenzione ? 'attenzione' : 'consigliata';

    const amicheCount = motivi.filter(m => m.tipo === 'amica').length;

    risultati.push({
      schedaId: scheda.id,
      nome: typeof scheda.nome === 'string' ? scheda.nome : '',
      titolo: lavoroCorrispondente.titolo,
      stato,
      motivi,
      _amicheCount: amicheCount
    });
  }

  risultati.sort((a, b) => {
    if (a.stato !== b.stato) {
      return a.stato === 'consigliata' ? -1 : 1;
    }
    if (b._amicheCount !== a._amicheCount) {
      return b._amicheCount - a._amicheCount;
    }
    return a.nome.localeCompare(b.nome, 'it');
  });

  return risultati.map(({ _amicheCount, ...r }) => r);
}

export function pianteInMq(scheda, mq) {
  if (!scheda || typeof scheda !== 'object') return null;
  const df = scheda.semina && scheda.semina.distanza_file_cm;
  const dp = scheda.semina && scheda.semina.distanza_piante_cm;
  if (typeof df !== 'number' || !isFinite(df) || df <= 0) return null;
  if (typeof dp !== 'number' || !isFinite(dp) || dp <= 0) return null;
  if (typeof mq !== 'number' || !isFinite(mq) || mq <= 0) return null;
  return Math.floor(mq * 10000 / (df * dp));
}