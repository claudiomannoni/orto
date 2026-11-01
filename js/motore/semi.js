// La banca dei semi: bustine pulite, ordinate e pronte per la semina del mese. Funzioni pure.

const MASSIMO_NOME = 60;
const MASSIMO_QUANTITA = 40;
const ANNO_MIN = 1990;
const ANNO_MAX = 2100;

// Testo con spazi doppi e bordi tolti, tagliato alla lunghezza massima; altro -> ''.
function testoPulito(valore, massimo) {
  if (typeof valore !== 'string') return '';
  return valore.replace(/\s+/g, ' ').trim().slice(0, massimo).trim();
}

// Anno di acquisto o raccolta valido, altrimenti null.
function annoValido(valore) {
  return Number.isInteger(valore) && valore >= ANNO_MIN && valore <= ANNO_MAX ? valore : null;
}

// Una bustina può stare in banca solo se ha id e nome; il resto si aggiusta o diventa vuoto.
export function pulisciSeme(grezzo) {
  if (!grezzo || typeof grezzo !== 'object' || Array.isArray(grezzo)) return null;

  const id = typeof grezzo.id === 'string' ? grezzo.id.trim() : '';
  if (!id) return null;

  const nome = testoPulito(grezzo.nome, MASSIMO_NOME);
  if (!nome) return null;

  const schedaId = typeof grezzo.schedaId === 'string' ? grezzo.schedaId.trim() : '';

  return {
    id,
    schedaId: schedaId || null,
    nome,
    anno: annoValido(grezzo.anno),
    quantita: testoPulito(grezzo.quantita, MASSIMO_QUANTITA),
  };
}

// Elenco alfabetico italiano senza badare alle maiuscole; a pari nome, prima la bustina più recente.
export function ordinaSemi(semi, schede) {
  if (!Array.isArray(semi)) return [];

  const nomeDi = (seme) => (seme && typeof seme.nome === 'string' ? seme.nome : '');
  const annoDi = (seme) => (seme && Number.isInteger(seme.anno) ? seme.anno : null);

  return semi
    .filter((seme) => seme && typeof seme === 'object' && !Array.isArray(seme))
    .sort((a, b) => {
      const perNome = nomeDi(a).localeCompare(nomeDi(b), 'it', { sensitivity: 'accent' });
      if (perNome) return perNome;

      const annoA = annoDi(a);
      const annoB = annoDi(b);
      if (annoA === annoB) return 0;
      if (annoA === null) return 1;
      if (annoB === null) return -1;
      return annoB - annoA;
    });
}

// Le bustine seminabili nel mese per la zona: [{ seme, titolo }] con il titolo del primo lavoro di semina.
export function semiDaSeminare(semi, schede, zonaId, mese) {
  if (!Array.isArray(semi) || !Array.isArray(schede)) return [];
  if (!Number.isInteger(mese) || mese < 1 || mese > 12) return [];
  if (typeof zonaId !== 'string' || !zonaId) return [];

  const perId = new Map();
  for (const scheda of schede) {
    if (scheda && typeof scheda.id === 'string') perId.set(scheda.id, scheda);
  }

  const fuori = [];
  for (const seme of semi) {
    if (!seme || typeof seme !== 'object') continue;
    if (typeof seme.schedaId !== 'string' || !seme.schedaId) continue;

    const scheda = perId.get(seme.schedaId);
    if (!scheda) continue;

    const lavori = scheda.calendario && scheda.calendario[zonaId];
    if (!Array.isArray(lavori)) continue;

    const lavoro = lavori.find((l) => l && l.operazione === 'semina'
      && Array.isArray(l.mesi) && l.mesi.includes(mese));
    if (lavoro) fuori.push({ seme, titolo: lavoro.titolo });
  }
  return fuori;
}

// Fasce di età della bustina: non dicono nulla sulla germinabilità.
export function statoSeme(seme, annoCorrente) {
  if (!seme || typeof seme !== 'object') return 'ignoto';

  const anno = seme.anno;
  if (!Number.isInteger(anno) || !Number.isInteger(annoCorrente)) return 'ignoto';

  const differenza = annoCorrente - anno;
  if (differenza < 0) return 'ignoto';
  if (differenza <= 1) return 'nuovo';
  if (differenza <= 4) return 'datato';
  return 'vecchio';
}
