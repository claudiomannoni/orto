// Colture seguite (Node, nessun server). Uso: node tests/fase5-seguite.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { filtraSeguite, alternaSeguita, seguita } = await import(pathToFileURL(path.join(radice, 'js/motore/seguite.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
const schede = [{ id: 'fave' }, { id: 'pomodoro' }, { id: 'aglio' }];

check('nessuna scelta = tutte le schede', filtraSeguite(schede, [], []).length === 3);
check('scelte null o non array = tutte', filtraSeguite(schede, null).length === 3 && filtraSeguite(schede, 'fave').length === 3);
check('una scelta = solo quella', JSON.stringify(filtraSeguite(schede, ['fave']).map((s) => s.id)) === '["fave"]');
check('si aggiungono le schede delle colture che hai davvero in orto', JSON.stringify(filtraSeguite(schede, ['fave'], [{ schedaId: 'aglio' }, { schedaId: null }]).map((s) => s.id)) === '["fave","aglio"]');
check('id sconosciuto tra le scelte: ignorato', filtraSeguite(schede, ['marziano']).length === 0);

check('alterna: aggiunge', JSON.stringify(alternaSeguita([], 'fave', ['fave', 'aglio'])) === '["fave"]');
check('alterna: toglie', JSON.stringify(alternaSeguita(['fave', 'aglio'], 'fave', ['fave', 'aglio'])) === '["aglio"]');
check('alterna: nessun doppione', alternaSeguita(['fave', 'fave'], 'aglio', ['fave', 'aglio']).filter((x) => x === 'fave').length === 1);
check('alterna: id non noto non entra', JSON.stringify(alternaSeguita(['fave'], 'marziano', ['fave'])) === '["fave"]');
check('alterna: elenco rovinato (null, numeri) non rompe', JSON.stringify(alternaSeguita(null, 'fave', ['fave'])) === '["fave"]' && JSON.stringify(alternaSeguita([3, null, 'fave'], 'aglio', ['fave', 'aglio'])) === '["fave","aglio"]');
check('seguita', seguita(['fave'], 'fave') === true && seguita(['fave'], 'aglio') === false && seguita(null, 'fave') === false);
console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
