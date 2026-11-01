// Lotti di produzione e movimenti associati. Funzioni pure.

export const TIPI_MOVIMENTO = Object.freeze([
  'consumo',
  'riserva',
  'rilascio_riserva',
  'pubblicazione',
  'ritiro_pubblicazione',
  'cessione',
  'perdita',
]);

const TIPI_ORIGINE = ['coltura', 'allevamento', 'manuale'];
const CATEGORIE_ECCESSO = ['ortaggi', 'uova_miele', 'piantine_semi', 'speciali'];
const STATI_ECCESSO = ['disponibile', 'regalato', 'scambiato', 'venduto'];
const UNITA_ECCESSO = ['kg', 'g', 'pezzi', 'vasetti'];

function stringaPulita(valore) {
  return typeof valore === 'string' ? valore.trim().replace(/\s+/g, ' ') : '';
}

function idPulito(valore) {
  return typeof valore === 'string' && valore.trim() ? valore.trim() : null;
}

function dataValida(valore) {
  if (typeof valore !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valore)) return null;
  const data = new Date(`${valore}T00:00:00.000Z`);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valore ? valore : null;
}

function numeroValido(valore) {
  return typeof valore === 'number' && Number.isFinite(valore) && valore > 0;
}

function arrotonda(valore) {
  return Math.round((valore + Number.EPSILON) * 1000) / 1000;
}

function oggetto(valore) {
  return valore && typeof valore === 'object' && !Array.isArray(valore);
}

export function pulisciProduzione(grezzo) {
  if (!oggetto(grezzo)) return null;
  const id = idPulito(grezzo.id);
  const categoria = idPulito(grezzo.categoria);
  const prodotto = stringaPulita(grezzo.prodotto).slice(0, 80).trim();
  const unita = idPulito(grezzo.unita);
  if (!id || !categoria || !prodotto || !unita || !numeroValido(grezzo.quantita_ottenuta)) return null;

  const origineGrezza = oggetto(grezzo.origine) ? grezzo.origine : {};
  const tipoOrigine = TIPI_ORIGINE.includes(origineGrezza.tipo) ? origineGrezza.tipo : 'manuale';
  const origine = { tipo: tipoOrigine };
  for (const chiave of ['colturaId', 'zonaId', 'allevamento']) {
    const valore = idPulito(origineGrezza[chiave]);
    if (valore) origine[chiave] = valore;
  }
  return {
    id,
    categoria,
    prodotto,
    schedaId: idPulito(grezzo.schedaId),
    origine,
    unita,
    quantita_ottenuta: Math.min(grezzo.quantita_ottenuta, 1000000),
    data: dataValida(grezzo.data),
    proprieta: oggetto(grezzo.proprieta) ? grezzo.proprieta : {},
    note: typeof grezzo.note === 'string' ? grezzo.note.slice(0, 300) : '',
  };
}

export function pulisciMovimento(grezzo) {
  if (!oggetto(grezzo)) return null;
  const id = idPulito(grezzo.id);
  const produzioneId = idPulito(grezzo.produzioneId);
  if (!id || !produzioneId || !TIPI_MOVIMENTO.includes(grezzo.tipo) || !numeroValido(grezzo.quantita)) return null;
  return {
    id,
    produzioneId,
    tipo: grezzo.tipo,
    quantita: Math.min(grezzo.quantita, 1000000),
    data: dataValida(grezzo.data),
    annuncioId: idPulito(grezzo.annuncioId),
    controparte: stringaPulita(grezzo.controparte).slice(0, 80).trim(),
    note: typeof grezzo.note === 'string' ? grezzo.note.slice(0, 300) : '',
  };
}

function movimentiValidi(produzione, movimenti) {
  if (!produzione || !Array.isArray(movimenti)) return [];
  return movimenti.map(pulisciMovimento).filter((m) => m && m.produzioneId === produzione.id);
}

function somma(movimenti, tipo, predicato = () => true) {
  return movimenti.reduce((totale, movimento) =>
    movimento.tipo === tipo && predicato(movimento) ? totale + movimento.quantita : totale, 0);
}

export function quantita(produzione, movimenti) {
  const pulita = pulisciProduzione(produzione);
  const zero = { ottenuta: 0, consumata: 0, ceduta: 0, persa: 0, riservata: 0, pubblicata: 0, disponibile: 0 };
  if (!pulita) return zero;
  const validi = movimentiValidi(pulita, movimenti);
  const consumata = somma(validi, 'consumo');
  const ceduta = somma(validi, 'cessione');
  const persa = somma(validi, 'perdita');
  const riservata = Math.max(0, somma(validi, 'riserva') - somma(validi, 'rilascio_riserva'));
  const cessioniPubblicate = somma(validi, 'cessione', (m) => m.annuncioId !== null);
  const totalePubblicato = somma(validi, 'pubblicazione');
  const ritirato = somma(validi, 'ritiro_pubblicazione');
  const pubblicata = Math.max(0, totalePubblicato - ritirato - cessioniPubblicate);
  const cedutaSenzaAnnuncio = somma(validi, 'cessione', (m) => m.annuncioId === null);
  const disponibile = Math.max(0, pulita.quantita_ottenuta - consumata - persa - riservata - cedutaSenzaAnnuncio - (totalePubblicato - ritirato));
  return {
    ottenuta: arrotonda(pulita.quantita_ottenuta),
    consumata: arrotonda(consumata),
    ceduta: arrotonda(ceduta),
    persa: arrotonda(persa),
    riservata: arrotonda(riservata),
    pubblicata: arrotonda(pubblicata),
    disponibile: arrotonda(disponibile),
  };
}

export function puoRegistrare(produzione, movimenti, nuovo) {
  const lotto = pulisciProduzione(produzione);
  const movimento = pulisciMovimento(nuovo);
  if (!lotto || !movimento || movimento.produzioneId !== lotto.id) return { ok: false, motivo: 'produzione.errore.movimento' };
  const stato = quantita(lotto, movimenti);
  if (['rilascio_riserva'].includes(movimento.tipo) && movimento.quantita > stato.riservata) {
    return { ok: false, motivo: 'produzione.errore.riserva' };
  }
  if (movimento.tipo === 'ritiro_pubblicazione' || (movimento.tipo === 'cessione' && movimento.annuncioId !== null)) {
    if (movimento.quantita > stato.pubblicata) return { ok: false, motivo: 'produzione.errore.pubblicata' };
    return { ok: true };
  }
  if (['consumo', 'riserva', 'pubblicazione', 'perdita'].includes(movimento.tipo)
    || (movimento.tipo === 'cessione' && movimento.annuncioId === null)) {
    if (movimento.quantita > stato.disponibile) return { ok: false, motivo: 'produzione.errore.troppo' };
  }
  return { ok: true };
}

export function lottoDaRaccolto(evento) {
  if (!oggetto(evento) || evento.tipo !== 'raccolto') return null;
  return pulisciProduzione({
    id: `raccolto:${evento.id ?? ''}`,
    categoria: 'ortaggi',
    prodotto: evento.nomeColtura,
    schedaId: evento.schedaId,
    origine: { tipo: 'coltura', colturaId: evento.colturaId, zonaId: evento.zonaId },
    unita: evento.unita,
    quantita_ottenuta: evento.quantita,
    data: evento.data,
    proprieta: {},
    note: '',
  });
}

export function daEccesso(voce) {
  if (!oggetto(voce) || !CATEGORIE_ECCESSO.includes(voce.categoria) || !STATI_ECCESSO.includes(voce.stato)
    || !UNITA_ECCESSO.includes(voce.unita)) return null;
  let categoria;
  if (voce.categoria === 'ortaggi' || voce.categoria === 'speciali') categoria = voce.categoria;
  else if (voce.categoria === 'uova_miele') categoria = ['vasetti', 'kg', 'g'].includes(voce.unita) ? 'miele' : 'uova';
  else categoria = voce.unita === 'pezzi' ? 'piantine' : 'semi';

  const id = `eccesso:${voce.id ?? ''}`;
  const produzione = pulisciProduzione({
    id, categoria, prodotto: voce.nome, schedaId: null,
    origine: { tipo: 'manuale' }, unita: voce.unita,
    quantita_ottenuta: voce.quantita, data: voce.data, proprieta: {}, note: '',
  });
  if (!produzione) return null;
  const movimenti = voce.stato === 'disponibile' ? [] : [pulisciMovimento({
    id: `${id}:cessione`, produzioneId: id, tipo: 'cessione', quantita: voce.quantita,
    data: voce.data, annuncioId: null, controparte: voce.stato, note: '',
  })];
  return { produzione, movimenti };
}
