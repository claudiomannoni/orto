// Test della linea del tempo (Node, nessun server).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { lineaDelTempo, andamentoSalute, giorniFraFoto, ultimaPerColtura } = await import(pathToFileURL(path.join(radice, 'js/motore/linea-tempo.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
const uguale = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const foto = [
  { id: 'b', data: '2025-02-01', colturaId: 'x', diagnosi: { risultato: { stato: 'dubbio', fase_osservata: { nome: 'Fiore' }, confronto_fase: 'in-linea', problemi: [{ nome: 'Afidi' }, {}] } } },
  { id: 'z', data: '2025-01-01', colturaId: 'x', diagnosi: { risultato: { stato: 'sana', problemi: [] } } },
  { id: 'a', data: '2025-02-01', colturaId: 'x' },
  { id: 'altro', data: '2024-01-01', colturaId: 'y' },
  null, 'strana', { id: 'c', data: '2025-03-01', colturaId: 'x', diagnosi: { risultato: { stato: 'non_si_vede' } } },
];
const linea = lineaDelTempo(foto, 'x');
check('ordina per data e id', uguale(linea.map((v) => v.foto.id), ['z', 'a', 'b', 'c']));
check('esclude altra coltura', linea.every((v) => v.foto.colturaId === 'x'));
check('foto senza diagnosi produce valori null e problemi vuoti', linea[1].stato === null && linea[1].faseNome === null && linea[1].confronto === null && uguale(linea[1].problemi, []));
check('estrae stato, fase, confronto e problemi validi', linea[2].stato === 'dubbio' && linea[2].faseNome === 'Fiore' && linea[2].confronto === 'in-linea' && uguale(linea[2].problemi, ['Afidi']));
check('non_si_vede e problemi assenti', linea[3].stato === 'non_si_vede' && uguale(linea[3].problemi, []));
check('lista vuota, null e non array', lineaDelTempo([], 'x').length === 0 && lineaDelTempo(null, 'x').length === 0 && lineaDelTempo({}, 'x').length === 0);
check('ignora elementi nulli e stringhe', lineaDelTempo([null, 'x'], 'x').length === 0);

check('andamento migliora', andamentoSalute([{ stato: 'problema' }, { stato: 'sana' }]) === 'migliora');
check('andamento peggiora', andamentoSalute([{ stato: 'sana' }, { stato: 'problema' }]) === 'peggiora');
check('andamento stabile', andamentoSalute([{ stato: 'dubbio' }, { stato: 'dubbio' }]) === 'stabile');
check('un solo valore è ignoto', andamentoSalute([{ stato: 'sana' }]) === 'ignoto');
check('ignora null e non_si_vede', andamentoSalute([{ stato: null }, { stato: 'problema' }, { stato: 'non_si_vede' }, { stato: 'sana' }]) === 'migliora');
check('solo non_si_vede è ignoto', andamentoSalute([{ stato: 'non_si_vede' }, { stato: 'non_si_vede' }]) === 'ignoto');

check('giorni stessa data', uguale(giorniFraFoto([{ data: '2024-05-01' }, { data: '2024-05-01' }]), [0]));
check('giorni fra mese e anno diversi', uguale(giorniFraFoto([{ data: '2023-12-31' }, { data: '2024-01-02' }]), [2]));
check('giorno bisestile', uguale(giorniFraFoto([{ data: '2024-02-28' }, { data: '2024-03-01' }]), [2]));
check('date strane valgono zero', uguale(giorniFraFoto([{ data: '2024-02-30' }, { data: 'no' }, { data: '2024-03-01' }]), [0, 0]));
check('giorni senza linea', uguale(giorniFraFoto(null), []));

const ultime = ultimaPerColtura([
  { id: '1', data: '2025-01-01', colturaId: 'x', diagnosi: { risultato: { stato: 'sana' } } },
  { id: '2', data: '2025-02-01', colturaId: 'x', diagnosi: { risultato: { stato: 'dubbio' } } },
  { id: 'a', data: '2025-02-01', colturaId: 'y' },
  { id: 'b', data: '2025-02-01', colturaId: 'y', diagnosi: { risultato: { stato: 'problema' } } },
  { id: 'n', data: '2025-03-01', colturaId: null }, null,
]);
check('ultima foto per coltura', uguale(ultime, { x: { data: '2025-02-01', stato: 'dubbio' }, y: { data: '2025-02-01', stato: 'problema' } }));
check('ultimaPerColtura non array', uguale(ultimaPerColtura(null), {}));

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
