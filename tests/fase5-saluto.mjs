// Saluto del giorno (Node, nessun server). Uso: node tests/fase5-saluto.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { fasciaDelGiorno, chiaveSaluto } = await import(pathToFileURL(path.join(radice, 'js/motore/saluto.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

// Confini fascia del giorno
check('fasciaDelGiorno(0): notte', fasciaDelGiorno(0) === 'notte');
check('fasciaDelGiorno(4): notte', fasciaDelGiorno(4) === 'notte');
check('fasciaDelGiorno(5): mattina', fasciaDelGiorno(5) === 'mattina');
check('fasciaDelGiorno(11): mattina', fasciaDelGiorno(11) === 'mattina');
check('fasciaDelGiorno(12): pomeriggio', fasciaDelGiorno(12) === 'pomeriggio');
check('fasciaDelGiorno(17): pomeriggio', fasciaDelGiorno(17) === 'pomeriggio');
check('fasciaDelGiorno(18): sera', fasciaDelGiorno(18) === 'sera');
check('fasciaDelGiorno(21): sera', fasciaDelGiorno(21) === 'sera');
check('fasciaDelGiorno(22): notte', fasciaDelGiorno(22) === 'notte');
check('fasciaDelGiorno(23): notte', fasciaDelGiorno(23) === 'notte');

// Valori non validi
check('fasciaDelGiorno(-1): giorno (non valido)', fasciaDelGiorno(-1) === 'giorno');
check('fasciaDelGiorno(24): giorno (non valido)', fasciaDelGiorno(24) === 'giorno');
check('fasciaDelGiorno(3.5): giorno (non intero)', fasciaDelGiorno(3.5) === 'giorno');
check("fasciaDelGiorno('7'): giorno (stringa)", fasciaDelGiorno('7') === 'giorno');
check('fasciaDelGiorno(null): giorno', fasciaDelGiorno(null) === 'giorno');
check('fasciaDelGiorno(undefined): giorno', fasciaDelGiorno(undefined) === 'giorno');
check('fasciaDelGiorno(NaN): giorno', fasciaDelGiorno(NaN) === 'giorno');

// chiaveSaluto per fasce
check('chiaveSaluto(8): saluto.mattina', chiaveSaluto(8) === 'saluto.mattina');
check('chiaveSaluto(14): saluto.pomeriggio', chiaveSaluto(14) === 'saluto.pomeriggio');
check('chiaveSaluto(19): saluto.sera', chiaveSaluto(19) === 'saluto.sera');
check('chiaveSaluto(0): saluto.notte', chiaveSaluto(0) === 'saluto.notte');
check('chiaveSaluto(-1): saluto.giorno (ora non valida)', chiaveSaluto(-1) === 'saluto.giorno');

// Festa vince sull'ora
check("chiaveSaluto(8, { festa: 'natale' }): saluto.festa vince", chiaveSaluto(8, { festa: 'natale' }) === 'saluto.festa');
check("chiaveSaluto(23, { festa: 'pasqua' }): saluto.festa vince", chiaveSaluto(23, { festa: 'pasqua' }) === 'saluto.festa');

// Festa vuota/non stringa non vince
check("chiaveSaluto(8, { festa: '' }): non vince, usa fascia", chiaveSaluto(8, { festa: '' }) === 'saluto.mattina');
check('chiaveSaluto(8, { festa: null }): non vince', chiaveSaluto(8, { festa: null }) === 'saluto.mattina');

// Stagione accettata (non cambia nulla)
check("chiaveSaluto(8, { stagione: 'inverno' }): accettata", chiaveSaluto(8, { stagione: 'inverno' }) === 'saluto.mattina');
check("chiaveSaluto(14, { stagione: 'estate', festa: null }): accettata", chiaveSaluto(14, { stagione: 'estate', festa: null }) === 'saluto.pomeriggio');

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
