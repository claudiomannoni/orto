// Il CSS ha le parentesi graffe in pari: una graffa lasciata aperta fa sparire in silenzio tutte le regole dopo. Uso: node tests/css-bilanciato.mjs .
import fs from 'node:fs';
import path from 'node:path';
const radice = path.resolve(process.argv[2] || '.');
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
const css = fs.readFileSync(path.join(radice, 'css/app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
let profondita = 0, minimo = 0, riga = 1, primaRigaNegativa = null;
for (const ch of css) {
  if (ch === '\n') riga++;
  if (ch === '{') profondita++;
  if (ch === '}') { profondita--; if (profondita < 0 && primaRigaNegativa === null) primaRigaNegativa = riga; }
  minimo = Math.min(minimo, profondita);
}
check('le graffe aperte e chiuse sono in pari', profondita === 0, `differenza ${profondita}`);
check('nessuna graffa chiusa di troppo', primaRigaNegativa === null, `riga ${primaRigaNegativa}`);
// ogni regola in cima (profondità 0) che comincia con un selettore di classe deve avere la sua graffa sulla stessa riga o poco dopo: controllo di fine file
check('l\'ultima regola è chiusa', css.trimEnd().endsWith('}'));
console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
