// Traduzioni: tutte le frasi dell'interfaccia stanno in i18n/<lingua>.json.

let testi = {};
let localeCorrente = 'it-IT';
// La lingua per date e ordine alfabetico (per ora solo l'italiano, il codice è pronto per altre lingue).
export const locale = () => localeCorrente;

export async function caricaTesti(lingua = 'it') {
  const risposta = await fetch(`i18n/${lingua}.json`);
  if (!risposta.ok) throw new Error(`Traduzioni non trovate: ${lingua}`);
  testi = await risposta.json();
  localeCorrente = lingua === 'en' ? 'en-GB' : 'it-IT';
  document.documentElement.lang = lingua;
}

function interpola(testo, vars) {
  return testo.replace(/\{(\w+)\}/g, (_, nome) => (vars && nome in vars ? vars[nome] : `{${nome}}`));
}

export function t(chiave, vars) {
  const testo = testi[chiave];
  if (testo === undefined) {
    console.warn('Traduzione mancante:', chiave);
    return chiave;
  }
  return interpola(testo, vars);
}

// Singolare/plurale: chiave.uno e chiave.altri
export function tn(chiave, n, vars) {
  return t(`${chiave}.${n === 1 ? 'uno' : 'altri'}`, { n, ...vars });
}

export function haTesto(chiave) {
  return chiave in testi;
}
