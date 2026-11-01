// «I tuoi primi passi»: lista di cose da provare per chi ha appena installato l'app. Funzioni pure.

export function primiPassi(stato) {
  const s = stato && typeof stato === 'object' ? stato : {};
  const passi = [
    { id: 'coltura', rotta: '#/colture', chiave: 'primi.coltura' },
    { id: 'lavoro', rotta: '#/oggi', chiave: 'primi.lavoro' },
    { id: 'foto', rotta: '#/dottore', chiave: 'primi.foto' },
    { id: 'zona', rotta: '#/zone', chiave: 'primi.zona' },
    { id: 'semi', rotta: '#/semi', chiave: 'primi.semi' },
    { id: 'quiz', rotta: '#/quiz', chiave: 'primi.quiz' }
  ];
  return passi.map((p, i) => ({
    ...p,
    fatto: controllo(i, s)
  }));
}

function controllo(i, s) {
  switch (i) {
    case 0: return Array.isArray(s.colture) && s.colture.length >= 1;
    case 1: return Array.isArray(s.eventi) && s.eventi.some(e => e && e.tipo === 'lavoro_fatto');
    case 2: return Array.isArray(s.foto) && s.foto.length >= 1;
    case 3: return Array.isArray(s.zone) && s.zone.length >= 1;
    case 4: return Array.isArray(s.semi) && s.semi.length >= 1;
    case 5: return Number.isFinite(s.quizGiocati) && s.quizGiocati >= 1;
    default: return false;
  }
}

export function prossimoPasso(passi) {
  if (!Array.isArray(passi) || !passi.length) return null;
  return passi.find(p => p && p.fatto === false) || null;
}

export function avanzamento(passi) {
  if (!Array.isArray(passi)) return { fatti: 0, totale: 0 };
  const fatti = passi.filter(p => p && p.fatto === true).length;
  return { fatti, totale: passi.length };
}