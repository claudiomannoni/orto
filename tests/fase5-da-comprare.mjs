import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { daComprare, semiInScadenza } = await import(pathToFileURL(path.join(radice, 'js/motore/da-comprare.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

const schede = [
  { id: 's1', nome: 'Pomodoro', calendario: { z1: [{ operazione: 'semina', titolo: 'Semina pomodoro', mesi: [3, 4] }] } },
  { id: 's2', nome: 'Basilico', calendario: { z1: [{ operazione: 'semina', titolo: 'Semina basilico', mesi: [4] }] } },
  { id: 's3', nome: 'Carota', calendario: { z1: [{ operazione: 'raccolta', titolo: 'Raccolta', mesi: [4] }] } },
  { id: 's4', nome: 'Zucchina', calendario: { z2: [{ operazione: 'semina', titolo: 'Semina zucchina', mesi: [4] }] } },
];

// scheda seminabile senza bustina
check('senza bustina', JSON.stringify(daComprare({ semi: [], schede, zonaId: 'z1', mese: 4, seguite: [] })) === JSON.stringify([
  { schedaId: 's2', nome: 'Basilico', titolo: 'Semina basilico' },
  { schedaId: 's1', nome: 'Pomodoro', titolo: 'Semina pomodoro' },
]));

// con bustina
check('con bustina esclusa', daComprare({ semi: [{ id: 'b1', schedaId: 's1', nome: 'P', anno: 2024, quantita: 1 }], schede, zonaId: 'z1', mese: 4, seguite: [] }).length === 1);

// bustina di altra scheda non esclude
check('bustina altra scheda', daComprare({ semi: [{ id: 'b1', schedaId: 's99', nome: 'X', anno: 2024, quantita: 1 }], schede, zonaId: 'z1', mese: 4, seguite: [] }).some((x) => x.schedaId === 's1'));

// schedaId null bustina non matcha
check('schedaId null bustina', daComprare({ semi: [{ id: 'b1', schedaId: null, nome: 'X', anno: 2024, quantita: 1 }], schede, zonaId: 'z1', mese: 4, seguite: [] }).some((x) => x.schedaId === 's1'));

// più bustine stessa scheda
check('più bustine stessa', daComprare({ semi: [
  { id: 'b1', schedaId: 's1', nome: 'P', anno: 2024, quantita: 1 },
  { id: 'b2', schedaId: 's1', nome: 'P', anno: 2023, quantita: 1 },
], schede, zonaId: 'z1', mese: 4, seguite: [] }).every((x) => x.schedaId !== 's1'));

// mese fuori calendario
check('mese fuori', daComprare({ semi: [], schede, zonaId: 'z1', mese: 9, seguite: [] }).length === 0);

// zona assente
check('zona assente', daComprare({ semi: [], schede, zonaId: 'z9', mese: 4, seguite: [] }).length === 0);

// seguite pieno
check('seguite pieno', JSON.stringify(daComprare({ semi: [], schede, zonaId: 'z1', mese: 4, seguite: ['s2'] })) === JSON.stringify([{ schedaId: 's2', nome: 'Basilico', titolo: 'Semina basilico' }]));

// seguite vuoto/null/non array -> tutte
check('seguite vuoto', daComprare({ semi: [], schede, zonaId: 'z1', mese: 4, seguite: [] }).length === 2);
check('seguite null', daComprare({ semi: [], schede, zonaId: 'z1', mese: 4, seguite: null }).length === 2);
check('seguite stringa', daComprare({ semi: [], schede, zonaId: 'z1', mese: 4, seguite: 'x' }).length === 2);

// ordine alfabetico accenti
const schedeA = [
  { id: 'a', nome: 'Àlbero', calendario: { z: [{ operazione: 'semina', titolo: 't', mesi: [1] }] } },
  { id: 'b', nome: 'Basilico', calendario: { z: [{ operazione: 'semina', titolo: 't', mesi: [1] }] } },
];
const ord = daComprare({ semi: [], schede: schedeA, zonaId: 'z', mese: 1, seguite: [] }).map((x) => x.nome);
check('ordine accenti', ord[0] === 'Àlbero' && ord[1] === 'Basilico');

// input strani
check('semi null -> []', Array.isArray(daComprare({ semi: null, schede, zonaId: 'z1', mese: 4, seguite: [] })) && daComprare({ semi: null, schede, zonaId: 'z1', mese: 4, seguite: [] }).length === 0);
check('schede null -> []', daComprare({ semi: [], schede: null, zonaId: 'z1', mese: 4, seguite: [] }).length === 0);
check('zonaId non stringa -> []', daComprare({ semi: [], schede, zonaId: 1, mese: 4, seguite: [] }).length === 0);
check('mese non intero -> []', daComprare({ semi: [], schede, zonaId: 'z1', mese: 4.5, seguite: [] }).length === 0);
check('mese 0 -> []', daComprare({ semi: [], schede, zonaId: 'z1', mese: 0, seguite: [] }).length === 0);
check('mese 13 -> []', daComprare({ semi: [], schede, zonaId: 'z1', mese: 13, seguite: [] }).length === 0);
check('elementi null ignorati', daComprare({ semi: [null], schede: [null, ...schede], zonaId: 'z1', mese: 4, seguite: [] }).length === 2);
check('input non oggetto -> []', Array.isArray(daComprare(null)) && daComprare(null).length === 0);

// titolo primo lavoro che corrisponde
const schedeT = [{ id: 't', nome: 'T', calendario: { z: [
  { operazione: 'cura', titolo: 'cura', mesi: [4] },
  { operazione: 'semina', titolo: 'semina1', mesi: [4] },
  { operazione: 'semina', titolo: 'semina2', mesi: [4] },
] } }];
check('titolo primo semina', daComprare({ semi: [], schede: schedeT, zonaId: 'z', mese: 4, seguite: [] })[0].titolo === 'semina1');

// semiInScadenza
const semi = [
  { id: 'a', schedaId: 's1', nome: 'Vecchio', anno: 2016, quantita: 1 },
  { id: 'b', schedaId: 's2', nome: 'Recente', anno: 2023, quantita: 1 },
  { id: 'c', schedaId: 's3', nome: 'Vecchissimo', anno: 2010, quantita: 1 },
  { id: 'd', schedaId: 's4', nome: 'NullAnno', anno: null, quantita: 1 },
  { id: 'e', schedaId: 's5', nome: 'Futuro', anno: 2030, quantita: 1 },
];
check('esattamente 5', semiInScadenza({ semi, annoCorrente: 2021 }).some((x) => x.id === 'a'));
check('4 anni no', !semiInScadenza({ semi, annoCorrente: 2020 }).some((x) => x.id === 'a'));
check('10 anni si', semiInScadenza({ semi, annoCorrente: 2026 }).some((x) => x.id === 'c'));
check('anno null escluso', !semiInScadenza({ semi, annoCorrente: 2026 }).some((x) => x.id === 'd'));
check('anno futuro escluso', !semiInScadenza({ semi, annoCorrente: 2026 }).some((x) => x.id === 'e'));
// ordine
const ordS = semiInScadenza({ semi, annoCorrente: 2026 }).map((x) => x.id);
check('ordine vecchia->recente', ordS.indexOf('c') < ordS.indexOf('a'));
check('annoCorrente strano -> []', Array.isArray(semiInScadenza({ semi, annoCorrente: '2026' })) && semiInScadenza({ semi, annoCorrente: '2026' }).length === 0);
check('semi non array -> []', Array.isArray(semiInScadenza({ semi: 'x', annoCorrente: 2026 })) && semiInScadenza({ semi: 'x', annoCorrente: 2026 }).length === 0);
check('semi null -> []', Array.isArray(semiInScadenza({ semi: null, annoCorrente: 2026 })) && semiInScadenza({ semi: null, annoCorrente: 2026 }).length === 0);

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
