// Prova della lettura delle risposte di Gemini sulle foto e del profilo con gli indizi dalle foto (Node, nessun server).
// Uso: node tests/fase4-foto.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const carica = (p) => import(pathToFileURL(path.join(radice, p)).href);
const { leggiRisposta, costruisciPrompt, MASSIMO_FOTO, FOTO_AL_GIORNO } = await carica('js/ai/foto.js');
const { calcolaProfilo } = await carica('js/motore/terreno.js');

let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
const lancia = (f) => { try { f(); return null; } catch (e) { return e; } };

const lista = [{ id: 'piantaggine', nome: 'Piantaggine maggiore', nome_scientifico: 'Plantago major' }, { id: 'romice', nome: 'Romice crespo', nome_scientifico: 'Rumex crispus' }];
const buona = {
  piante: [
    { nome: 'Piantaggine', id: 'piantaggine', confidenza: 'alta', perche: 'foglie ovali con nervature parallele' },
    { nome: 'Trifoglio', id: 'trifoglio-inventato', confidenza: 'media', perche: 'tre foglioline' },
    { nome: 'Romice', id: 'romice', confidenza: 'sicurissima', perche: 'x'.repeat(300) },
    { nome: '', id: 'romice', confidenza: 'alta' },
    'non un oggetto',
  ],
  terreno: { tessitura: 'argilloso', drenaggio: 'lento', humus: 'molto', indizi: 'zolle compatte e crepe', confidenza: 'bassa' },
  avvisi: 'foto un po\' scura',
};

let r = leggiRisposta(JSON.stringify(buona), lista);
check('piante valide tenute, vuote e strane scartate', r.piante.length === 3, JSON.stringify(r.piante.map((p) => p.nome)));
check('id che non è nella lista = null (non si fida di un id inventato)', r.piante[1].id === null && r.piante[0].id === 'piantaggine' && r.piante[2].id === 'romice');
check('confidenza fuori scala -> bassa', r.piante[2].confidenza === 'bassa' && r.piante[0].confidenza === 'alta');
check('testi troppo lunghi tagliati', r.piante[2].perche.length <= 110);
check('terreno: valori ammessi tenuti, valore non ammesso = null', r.terreno.tessitura === 'argilloso' && r.terreno.drenaggio === 'lento' && r.terreno.humus === null, JSON.stringify(r.terreno));
check('avvisi letti', r.avvisi.includes('scura'));

r = leggiRisposta('```json\n' + JSON.stringify(buona) + '\n```', lista);
check('risposta dentro un blocco ```json: letta lo stesso', r.piante.length === 3);
r = leggiRisposta(JSON.stringify({ piante: [], terreno: null, avvisi: '' }), lista);
check('nessuna pianta, nessun terreno: risposta valida e vuota', r.piante.length === 0 && r.terreno === null && r.avvisi === '');
r = leggiRisposta(JSON.stringify({ piante: [{ nome: 'Tarassaco' }] }), lista);
check('campi mancanti: valori di partenza prudenti', r.piante[0].confidenza === 'bassa' && r.piante[0].id === null && r.terreno === null);
r = leggiRisposta(JSON.stringify({ terreno: { tessitura: 'boh', drenaggio: 'boh', humus: 'boh', indizi: '', confidenza: 'alta' } }), lista);
check('terreno senza niente di utile = null', r.terreno === null);
check('troppe piante: al massimo 12', leggiRisposta(JSON.stringify({ piante: Array.from({ length: 40 }, (_, i) => ({ nome: `p${i}` })) }), lista).piante.length === 12);

for (const [nome, testo] of [['testo qualsiasi', 'Ecco cosa vedo: una pianta'], ['JSON rotto', '{"piante": ['], ['array', '[1,2]'], ['vuoto', ''], ['null', 'null']]) {
  const e = lancia(() => leggiRisposta(testo, lista));
  check(`risposta non utilizzabile (${nome}): errore «risposta»`, e?.codice === 'risposta', e?.codice);
}

const prompt = costruisciPrompt(lista);
check('il prompt elenca le erbe con id e nome scientifico', prompt.includes('piantaggine: Piantaggine maggiore (Plantago major)') && prompt.includes('romice'));
check('il prompt vieta di inventare e le diagnosi, e chiede solo JSON', /non inventare mai/i.test(prompt) && /non fare diagnosi/i.test(prompt) && /SOLO con JSON/.test(prompt));
check('il prompt funziona senza lista di erbe', costruisciPrompt([]).includes('(nessuna lista)'));
check('limiti: 3 foto per volta, 10 al giorno', MASSIMO_FOTO === 3 && FOTO_AL_GIORNO === 10);

// Gli indizi dalle foto contano come una pianta (mezza risposta)
const dati = { questionario: [{ id: 'a', opzioni: [{ id: 'x', valori: { tessitura: 'sabbioso' } }, { id: 'y', valori: { tessitura: 'argilloso' } }] }], piante_indicatrici: [] };
let p = calcolaProfilo({ indiziFoto: { tessitura: 'argilloso', drenaggio: 'lento' } }, dati);
check('solo gli indizi dalla foto: bastano come indizio', p.tessitura === 'argilloso' && p.drenaggio === 'lento' && p.humus === null, JSON.stringify(p));
p = calcolaProfilo({ risposte: { a: 'x' }, indiziFoto: { tessitura: 'argilloso' } }, dati);
check('una risposta pesa più della foto', p.tessitura === 'sabbioso', JSON.stringify(p));
p = calcolaProfilo({ risposte: { a: 'y' }, indiziFoto: { tessitura: 'argilloso' }, barattolo: { sabbia_pct: 80, limo_pct: 12, argilla_pct: 8 } }, dati);
check('il barattolo vince su tutto', p.tessitura === 'sabbioso');
p = calcolaProfilo({ indiziFoto: { tessitura: 'strano', colore: 'rosso' } }, dati);
check('indizi con valori o assi non ammessi: ignorati', p.tessitura === null);
p = calcolaProfilo({ indiziFoto: null }, dati);
check('indiziFoto nullo: nessun crash', p.tessitura === null);

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
