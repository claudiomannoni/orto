// Acqua per fase: unisce quanta acqua serve in quella fase con il consiglio del tempo (Node, nessun server). Uso: node tests/fase5-acqua-fase.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { acquaPerFase } = await import(pathToFileURL(path.join(radice, 'js/motore/acqua.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

for (const livello of ['costante', 'molta', 'media', 'poca']) check(`${livello}: se il tempo dice «no» (ha piovuto o piove) non si annaffia`, acquaPerFase(livello, 'no') === 'no');
check('costante e molta: tempo secco -> si annaffia', acquaPerFase('costante', 'si') === 'si' && acquaPerFase('molta', 'si') === 'si');
check('costante e molta: dubbio -> si controlla il terreno', acquaPerFase('costante', 'forse') === 'controlla' && acquaPerFase('molta', 'forse') === 'controlla');
check('media: secco -> si, dubbio -> controlla', acquaPerFase('media', 'si') === 'si' && acquaPerFase('media', 'forse') === 'controlla');
check('poca: secco -> solo poca acqua, dubbio -> niente', acquaPerFase('poca', 'si') === 'poco' && acquaPerFase('poca', 'forse') === 'no');
check('livello sconosciuto o non testo -> null', [acquaPerFase('tanta', 'si'), acquaPerFase(undefined, 'si'), acquaPerFase(3, 'si'), acquaPerFase(null, 'si')].every((x) => x === null));
check('consiglio del tempo sconosciuto o assente -> null', [acquaPerFase('media', 'boh'), acquaPerFase('media', undefined), acquaPerFase('media', null), acquaPerFase('media', 1)].every((x) => x === null));
check('maiuscole non valgono (i valori sono fissi)', acquaPerFase('MEDIA', 'si') === null && acquaPerFase('media', 'SI') === null);

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
