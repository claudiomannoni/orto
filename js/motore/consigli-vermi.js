// I consigli dei vermetti: cosa dicono Rosso e Rossella adesso. Funzioni pure.
// Restituisce solo chiavi di traduzione e parametri: le frasi stanno in i18n.

// Spazi doppi via, bordi via. Solo stringhe: il resto diventa vuoto.
function pulisci(testo) {
  return typeof testo === 'string' ? testo.replace(/\s+/g, ' ').trim() : '';
}

// Taglia a `max` caratteri e chiude con «…» se ha tagliato.
function taglia(testo, max) {
  return testo.length > max ? `${testo.slice(0, max)}…` : testo;
}

export function consigliDeiVermi(stato) {
  const s = stato && typeof stato === 'object' ? stato : {};
  const consigli = [];

  // Lavori di oggi ancora da fare: quanti sono e come si chiama il primo.
  const lavori = Array.isArray(s.lavori) ? s.lavori.filter((l) => l && typeof l === 'object') : [];
  if (lavori.length) {
    consigli.push({
      id: 'lavori', chi: 'rosso', chiave: 'verme.consiglio.lavori',
      vars: { n: lavori.length, primo: taglia(pulisci(lavori[0].titolo), 80) },
      rotta: '#/oggi', peso: 3,
    });
  }

  // Nessuna coltura salvata: prima si semina qualcosa.
  if (s.haColture === false) {
    consigli.push({
      id: 'prima_coltura', chi: 'rosso', chiave: 'verme.consiglio.prima_coltura',
      vars: {}, rotta: '#/colture', peso: 3,
    });
  }

  // Oggi piove: Rossella lo dice, così non si annaffia a vuoto.
  if (s.piove === true) {
    consigli.push({
      id: 'pioggia', chi: 'rossella', chiave: 'verme.consiglio.pioggia',
      vars: {}, rotta: '#/oggi', peso: 2,
    });
  }

  // Quiz non ancora fatto oggi.
  if (s.quizFatto === false) {
    consigli.push({
      id: 'quiz', chi: 'rossella', chiave: 'verme.consiglio.quiz',
      vars: {}, rotta: '#/quiz', peso: 2,
    });
  }

  // Curiosità del giorno, se c'è un testo.
  const testoCuriosita = s.curiosita && typeof s.curiosita === 'object' ? taglia(pulisci(s.curiosita.testo), 140) : '';
  if (testoCuriosita) {
    consigli.push({
      id: 'curiosita', chi: 'rossella', chiave: 'verme.consiglio.curiosita',
      vars: { testo: testoCuriosita }, rotta: null, peso: 1,
    });
  }

  // Il dottore delle piante va sempre ricordato.
  consigli.push({
    id: 'foto', chi: 'rosso', chiave: 'verme.consiglio.foto',
    vars: {}, rotta: '#/dottore', peso: 1,
  });

  // Peso decrescente; a pari peso l'id, così l'ordine è sempre lo stesso.
  return consigli.sort((a, b) => b.peso - a.peso || a.id.localeCompare(b.id));
}

export function scegliConsiglio(elenco, giaVisti, giro) {
  const lista = Array.isArray(elenco) ? elenco.filter((c) => c && typeof c === 'object') : [];
  if (!lista.length) return null;

  const peso = (c) => (Number.isFinite(Number(c.peso)) ? Number(c.peso) : 0);
  const visti = new Set(Array.isArray(giaVisti) ? giaVisti : []);

  // Il primo consiglio col peso più alto fra quelli mai mostrati.
  const liberi = lista.filter((c) => !visti.has(c.id));
  if (liberi.length) {
    const massimo = Math.max(...liberi.map(peso));
    return liberi.find((c) => peso(c) === massimo);
  }

  // Visti tutti: si ricomincia dal giro, senza uscire dall'elenco.
  const n = Number.isInteger(giro) ? giro : 0;
  return lista[((n % lista.length) + lista.length) % lista.length];
}
