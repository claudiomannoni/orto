// Che vestito hanno oggi i vermetti: le feste battono le stagioni. Funzioni pure (si provano senza pagina).

export const VESTITI = ['inverno', 'estate', 'primavera', 'autunno', 'halloween', 'natale', 'festa', 'pasqua', 'carnevale', 'compleanno', 'pioggia'];

const GIORNO = 86400000;
const giornoNumero = (iso) => Math.floor(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / GIORNO);

// Domenica di Pasqua (calendario gregoriano, algoritmo di Gauss/Meeus): [mese, giorno].
export function pasqua(anno) {
  const a = anno % 19, b = Math.floor(anno / 100), c = anno % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mese = Math.floor((h + l - 7 * m + 114) / 31);
  const giorno = ((h + l - 7 * m + 114) % 31) + 1;
  return [mese, giorno];
}

const giornoDiPasqua = (anno) => { const [m, g] = pasqua(anno); return giornoNumero(`${anno}-${String(m).padStart(2, '0')}-${String(g).padStart(2, '0')}`); };

// Vestito del giorno (AAAA-MM-GG), dal calendario. In ordine di precedenza:
//  - il compleanno dell'orto (stesso giorno e mese del primo avvio, dall'anno dopo): `nato` = data del primo avvio
//  - 31 dicembre e 1 gennaio: festa (cappellino e coriandoli)
//  - dal 15 dicembre al 6 gennaio: Natale
//  - dal 24 ottobre al 1 novembre: Halloween
//  - da giovedì a lunedì di Pasqua: Pasqua (orecchie da coniglio)
//  - da giovedì a martedì grasso: Carnevale (cappello da giullare)
//  - il resto dell'anno: la stagione (inverno dicembre-febbraio, primavera marzo-maggio,
//    estate giugno-agosto, autunno settembre-novembre)
function vestitoDelCalendario(iso, nato) {
  const anno = Number(iso.slice(0, 4));
  const mese = Number(iso.slice(5, 7));
  const giorno = Number(iso.slice(8, 10));
  if (nato && /^\d{4}-\d{2}-\d{2}$/.test(nato) && anno > Number(nato.slice(0, 4)) && nato.slice(5) === iso.slice(5)) return 'compleanno';
  if ((mese === 12 && giorno === 31) || (mese === 1 && giorno === 1)) return 'festa';
  if ((mese === 12 && giorno >= 15) || (mese === 1 && giorno <= 6)) return 'natale';
  if ((mese === 10 && giorno >= 24) || (mese === 11 && giorno === 1)) return 'halloween';
  const oggi = giornoNumero(iso);
  const p = giornoDiPasqua(anno);
  if (oggi >= p - 3 && oggi <= p + 1) return 'pasqua';
  if (oggi >= p - 52 && oggi <= p - 47) return 'carnevale';
  if (mese === 12 || mese <= 2) return 'inverno';
  if (mese <= 5) return 'primavera';
  if (mese <= 8) return 'estate';
  return 'autunno';
}

// Come vestitoDelCalendario, ma se oggi piove (secondo il meteo) l'ombrello prende il posto dei vestiti di stagione.
// Le feste restano: a Natale con la pioggia si è comunque a Natale. piove: true/false.
export function vestitoDelGiorno(iso, { nato = null, piove = false } = {}) {
  const v = vestitoDelCalendario(iso, nato);
  return piove && ['inverno', 'estate', 'primavera', 'autunno'].includes(v) ? 'pioggia' : v;
}

// Quale gruppo di battute commenta il vestito (ognuno ha le sue; "tocco" sono quelle generiche).
export const contestoDelVestito = (vestito) => (VESTITI.includes(vestito) ? vestito : 'tocco');

// Un altro vestito, diverso da quello attuale (per il "cambio d'abito" a tocco). `caso` in [0, 1).
export function altroVestito(attuale, caso = Math.random()) {
  const altri = VESTITI.filter((v) => v !== attuale);
  return altri[Math.min(altri.length - 1, Math.floor(caso * altri.length))];
}
