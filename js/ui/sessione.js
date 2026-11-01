// Cose da ricordare solo finché l'app è aperta (non vanno sul telefono): per ora, da quanti giorni mancavi.
let giorniAssenza = 0;
export const impostaGiorniAssenza = (n) => { giorniAssenza = Number.isInteger(n) && n > 0 ? n : 0; };
export const giorniAssenzaSessione = () => giorniAssenza;
