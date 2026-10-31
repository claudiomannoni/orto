// Consigli dei vermetti (Node, nessun server). Uso: node tests/fase5-consigli-vermi.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { consigliDeiVermi, scegliConsiglio } = await import(pathToFileURL(path.join(radice, 'js/motore/consigli-vermi.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

const ids = (elenco) => elenco.map((c) => c.id).join(',');
const uno = (stato, id) => consigliDeiVermi(stato).find((c) => c.id === id);

// Stato vuoto: resta solo il consiglio della foto
check('stato vuoto: solo foto', ids(consigliDeiVermi({})) === 'foto');
check('stato undefined: solo foto', ids(consigliDeiVermi(undefined)) === 'foto');
check('stato null: solo foto', ids(consigliDeiVermi(null)) === 'foto');
check('stato non oggetto: solo foto', ids(consigliDeiVermi('boh')) === 'foto');
check('foto: forma completa', (() => {
  const c = uno({}, 'foto');
  return c.chi === 'rosso' && c.chiave === 'verme.consiglio.foto' && c.rotta === '#/dottore'
    && c.peso === 1 && JSON.stringify(c.vars) === '{}';
})());

// Ogni regola da sola
check('lavori: compare e conta', ids(consigliDeiVermi({ lavori: [{ titolo: 'Zappa' }] })) === 'lavori,foto');
check('lavori: vars n e primo', (() => {
  const c = uno({ lavori: [{ titolo: 'Zappa' }, { titolo: 'Annaffia' }] }, 'lavori');
  return c.vars.n === 2 && c.vars.primo === 'Zappa';
})());
check('lavori: chi, chiave, rotta, peso', (() => {
  const c = uno({ lavori: [{ titolo: 'Zappa' }] }, 'lavori');
  return c.chi === 'rosso' && c.chiave === 'verme.consiglio.lavori' && c.rotta === '#/oggi' && c.peso === 3;
})());
check('lavori vuoto: nessun consiglio', ids(consigliDeiVermi({ lavori: [] })) === 'foto');
check('lavori non array: nessun consiglio', ids(consigliDeiVermi({ lavori: 'Zappa' })) === 'foto');
check('lavori con elementi vuoti: nessun consiglio', ids(consigliDeiVermi({ lavori: [null, 3] })) === 'foto');
check('titolo non stringa: consiglio senza primo', (() => {
  const c = uno({ lavori: [{ titolo: 42 }] }, 'lavori');
  return c && c.vars.n === 1 && c.vars.primo === '';
})());

check('haColture false: prima_coltura', ids(consigliDeiVermi({ haColture: false })) === 'prima_coltura,foto');
check('prima_coltura: forma completa', (() => {
  const c = uno({ haColture: false }, 'prima_coltura');
  return c.chi === 'rosso' && c.chiave === 'verme.consiglio.prima_coltura' && c.rotta === '#/colture'
    && c.peso === 3 && JSON.stringify(c.vars) === '{}';
})());
check('haColture true: niente', ids(consigliDeiVermi({ haColture: true })) === 'foto');
check('haColture null: niente', ids(consigliDeiVermi({ haColture: null })) === 'foto');

check('piove true: pioggia', ids(consigliDeiVermi({ piove: true })) === 'pioggia,foto');
check('pioggia: forma completa', (() => {
  const c = uno({ piove: true }, 'pioggia');
  return c.chi === 'rossella' && c.chiave === 'verme.consiglio.pioggia' && c.rotta === '#/oggi'
    && c.peso === 2 && JSON.stringify(c.vars) === '{}';
})());
check('piove false: niente', ids(consigliDeiVermi({ piove: false })) === 'foto');
check('piove null: niente', ids(consigliDeiVermi({ piove: null })) === 'foto');
check('piove non booleano: niente', ids(consigliDeiVermi({ piove: 1 })) === 'foto');

check('quizFatto false: quiz', ids(consigliDeiVermi({ quizFatto: false })) === 'quiz,foto');
check('quiz: forma completa', (() => {
  const c = uno({ quizFatto: false }, 'quiz');
  return c.chi === 'rossella' && c.chiave === 'verme.consiglio.quiz' && c.rotta === '#/quiz'
    && c.peso === 2 && JSON.stringify(c.vars) === '{}';
})());
check('quizFatto true: niente', ids(consigliDeiVermi({ quizFatto: true })) === 'foto');
check('quizFatto null: niente', ids(consigliDeiVermi({ quizFatto: null })) === 'foto');

check('curiosita: compare', ids(consigliDeiVermi({ curiosita: { testo: 'I lombrichi respirano dalla pelle' } })) === 'curiosita,foto');
check('curiosita: vars e rotta null', (() => {
  const c = uno({ curiosita: { testo: 'I lombrichi respirano dalla pelle' } }, 'curiosita');
  return c.chi === 'rossella' && c.chiave === 'verme.consiglio.curiosita' && c.rotta === null
    && c.peso === 1 && c.vars.testo === 'I lombrichi respirano dalla pelle';
})());
check('curiosita vuota: niente', ids(consigliDeiVermi({ curiosita: { testo: '   ' } })) === 'foto');
check('curiosita null: niente', ids(consigliDeiVermi({ curiosita: null })) === 'foto');
check('curiosita senza testo: niente', ids(consigliDeiVermi({ curiosita: { mesi: [1] } })) === 'foto');

// Ordine per peso e, a pari peso, per id
check('ordine completo', ids(consigliDeiVermi({
  lavori: [{ titolo: 'Zappa' }], haColture: false, piove: true, quizFatto: false,
  curiosita: { testo: 'Una curiosità' },
})) === 'lavori,prima_coltura,pioggia,quiz,curiosita,foto');
check("a pari peso vince l'id minore", ids(consigliDeiVermi({ haColture: false, lavori: [{ titolo: 'Z' }] })) === 'lavori,prima_coltura,foto');
check('nessun consiglio duplicato', (() => {
  const elenco = consigliDeiVermi({ piove: true, quizFatto: false, curiosita: { testo: 'x' } });
  return new Set(elenco.map((c) => c.id)).size === elenco.length;
})());

// Troncamento e pulizia degli spazi
check('titolo lungo: tagliato a 80 più «…»', (() => {
  const c = uno({ lavori: [{ titolo: 'a'.repeat(100) }] }, 'lavori');
  return c.vars.primo.length === 81 && c.vars.primo.endsWith('…');
})());
check('titolo di 80: non tagliato', (() => {
  const c = uno({ lavori: [{ titolo: 'a'.repeat(80) }] }, 'lavori');
  return c.vars.primo.length === 80 && !c.vars.primo.endsWith('…');
})());
check('testo lungo: tagliato a 140 più «…»', (() => {
  const c = uno({ curiosita: { testo: 'b'.repeat(200) } }, 'curiosita');
  return c.vars.testo.length === 141 && c.vars.testo.endsWith('…');
})());
check('testo di 140: non tagliato', (() => {
  const c = uno({ curiosita: { testo: 'b'.repeat(140) } }, 'curiosita');
  return c.vars.testo.length === 140 && !c.vars.testo.endsWith('…');
})());
check('spazi doppi e bordi tolti', (() => {
  const c = uno({ lavori: [{ titolo: '  Zappa   il   terreno  ' }] }, 'lavori');
  return c.vars.primo === 'Zappa il terreno';
})());

// scegliConsiglio
const elenco = consigliDeiVermi({
  lavori: [{ titolo: 'Zappa' }], haColture: false, piove: true, quizFatto: false,
  curiosita: { testo: 'Una curiosità' },
});
check('scegli: elenco vuoto -> null', scegliConsiglio([], [], 0) === null);
check('scegli: elenco non array -> null', scegliConsiglio(undefined, [], 0) === null);
check('scegli: senza visti prende il primo col peso massimo', scegliConsiglio(elenco, [], 0)?.id === 'lavori');
check('scegli: salta i visti', scegliConsiglio(elenco, ['lavori'], 0)?.id === 'prima_coltura');
check('scegli: salta più visti', scegliConsiglio(elenco, ['lavori', 'prima_coltura'], 0)?.id === 'pioggia');
check('scegli: scende di peso', scegliConsiglio(elenco, ['lavori', 'prima_coltura', 'pioggia', 'quiz'], 0)?.id === 'curiosita');
check('scegli: restituisce lo stesso oggetto', scegliConsiglio(elenco, [], 0) === elenco[0]);
check('scegli: tutti visti -> giro 0', scegliConsiglio(elenco, elenco.map((c) => c.id), 0) === elenco[0]);
check('scegli: tutti visti -> giro 2', scegliConsiglio(elenco, elenco.map((c) => c.id), 2) === elenco[2]);
check('scegli: giro oltre la fine gira', scegliConsiglio(elenco, elenco.map((c) => c.id), 7) === elenco[1]);
check('scegli: giro non valido vale 0', scegliConsiglio(elenco, elenco.map((c) => c.id), undefined) === elenco[0]);
check('scegli: giro negativo resta dentro', scegliConsiglio(elenco, elenco.map((c) => c.id), -1) === elenco[5]);
check("scegli: non modifica l'elenco", (() => {
  const prima = ids(elenco);
  scegliConsiglio(elenco, ['lavori'], 0);
  return ids(elenco) === prima;
})());

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
