// Da una foto a una coltura nuova: abbina il nome che l'IA ha letto a una scheda e stima da quanto tempo la pianta è nata.
// L'età è sempre una STIMA (dai giorni che l'IA vede, oppure dallo stadio): l'utente la controlla prima di salvare. Funzioni pure.
import { normalizza, aggiungiGiorni } from '../util.js';

export const STADI = ['germinazione', 'piantina', 'crescita', 'fioritura', 'frutti', 'raccolta'];

// La scheda che corrisponde a un nome letto dall'IA (nome, alias o nome scientifico); null se non c'è una corrispondenza chiara.
export function abbinaScheda(nome, schede) {
  const q = normalizza(typeof nome === 'string' ? nome : '');
  if (q.length < 3 || !Array.isArray(schede)) return null;
  const nomi = (s) => [s?.nome, s?.nome_scientifico, ...(Array.isArray(s?.alias) ? s.alias : [])].filter((x) => typeof x === 'string' && x).map(normalizza);
  const valide = schede.filter((s) => s && typeof s.id === 'string');
  const esatta = valide.find((s) => nomi(s).includes(q));
  if (esatta) return esatta;
  // «pomodori ciliegino» -> pomodori; «Basilico genovese» -> basilico: il nome della scheda dentro la frase (almeno 4 lettere)
  const dentro = valide.filter((s) => nomi(s).some((n) => n.length >= 4 && (q.includes(n) || n.includes(q))));
  return dentro.length === 1 ? dentro[0] : null;
}

// Giorni di vita stimati: se l'IA ha dato un numero lo si usa, altrimenti si usa l'inizio della fase che corrisponde allo stadio.
// Restituisce { giorni, fonte: 'foto' | 'stadio' | 'ignota' }.
export function etaStimata({ stadio, giorni } = {}, fasi) {
  if (Number.isInteger(giorni) && giorni >= 0 && giorni <= 400) return { giorni, fonte: 'foto' };
  const elenco = Array.isArray(fasi) ? fasi.filter((f) => f && Number.isInteger(f.da_giorno)) : [];
  const i = STADI.indexOf(stadio);
  if (i < 0 || !elenco.length) return { giorni: null, fonte: 'ignota' };
  // 1) una fase con lo stesso id o un nome che contiene lo stadio; 2) altrimenti la posizione proporzionale nella vita della pianta
  const per = elenco.find((f) => f.id === stadio || normalizza(f.nome ?? '').includes(stadio));
  const scelta = per ?? elenco[Math.min(elenco.length - 1, Math.round((i / (STADI.length - 1)) * (elenco.length - 1)))];
  return { giorni: scelta.da_giorno, fonte: 'stadio' };
}

// La coltura proposta, da confermare: { nome, schedaId, partenza: 'seme', dataSemina, etaGiorni, fonteEta }.
export function proponiColtura({ risultato, schede, fasi, oggi } = {}) {
  const nomeIA = risultato?.pianta?.nome;
  if (typeof nomeIA !== 'string' || !nomeIA.trim()) return null;
  const scheda = abbinaScheda(nomeIA, schede);
  const fasiColtura = scheda ? fasi?.colture?.[scheda.id]?.fasi : null;
  const eta = etaStimata({ stadio: risultato.stadio, giorni: risultato.giorni_stimati }, fasiColtura);
  return {
    nome: scheda ? scheda.nome : nomeIA.trim().slice(0, 60),
    schedaId: scheda ? scheda.id : null,
    partenza: 'seme',
    dataSemina: eta.giorni === null ? oggi : aggiungiGiorni(oggi, -eta.giorni),
    etaGiorni: eta.giorni,
    fonteEta: eta.fonte,
  };
}
