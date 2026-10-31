// Che vestito hanno oggi i vermetti: le feste battono le stagioni. Funzioni pure (si provano senza pagina).

export const VESTITI = ['inverno', 'estate', 'primavera', 'autunno', 'halloween', 'natale', 'festa', 'pioggia'];

// Vestito del giorno (AAAA-MM-GG), dal calendario:
//  - 31 dicembre e 1 gennaio: festa (cappellino e coriandoli)
//  - dal 15 dicembre al 6 gennaio: Natale
//  - dal 24 ottobre al 1 novembre: Halloween
//  - il resto dell'anno: la stagione (inverno dicembre-febbraio, primavera marzo-maggio,
//    estate giugno-agosto, autunno settembre-novembre)
export function vestitoDelGiorno(iso) {
  const mese = Number(iso.slice(5, 7));
  const giorno = Number(iso.slice(8, 10));
  if ((mese === 12 && giorno === 31) || (mese === 1 && giorno === 1)) return 'festa';
  if ((mese === 12 && giorno >= 15) || (mese === 1 && giorno <= 6)) return 'natale';
  if ((mese === 10 && giorno >= 24) || (mese === 11 && giorno === 1)) return 'halloween';
  if (mese === 12 || mese <= 2) return 'inverno';
  if (mese <= 5) return 'primavera';
  if (mese <= 8) return 'estate';
  return 'autunno';
}

// Quale gruppo di battute commenta il vestito: la pioggia non ne ha di proprie, usa quelle generiche.
export const contestoDelVestito = (vestito) => (vestito === 'pioggia' ? 'tocco' : vestito);

// Un altro vestito, diverso da quello attuale (per il "cambio d'abito" a tocco). `caso` in [0, 1).
export function altroVestito(attuale, caso = Math.random()) {
  const altri = VESTITI.filter((v) => v !== attuale);
  return altri[Math.min(altri.length - 1, Math.floor(caso * altri.length))];
}
