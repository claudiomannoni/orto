import assert from 'node:assert/strict';
import { giorniDaAnnaffiatura, valutaSalute } from '../js/motore/salute.js';

assert.equal(giorniDaAnnaffiatura([{ colturaId: 'c1', tipo: 'innaffiato', data: '2026-11-01' }], 'c1', '2026-11-02'), 1);
assert.equal(giorniDaAnnaffiatura([{ colturaId: 'c2', tipo: 'innaffiato', data: '2026-11-01' }], 'c1', '2026-11-02'), null);
assert.equal(valutaSalute({ stagione: { stato: 'gelo-in-arrivo' } }).stato, 'urgente');
assert.equal(valutaSalute({ diagnosi: { risultato: { stato: 'problema' } } }).stato, 'urgente');
assert.equal(valutaSalute({ diagnosi: { risultato: { stato: 'dubbio' } } }).stato, 'attenzione');
assert.equal(valutaSalute({ giorniAnnaffiatura: 4, acqua: 'costante' }).stato, 'ignoto');
assert.equal(valutaSalute({ giorniAnnaffiatura: 4, acqua: 'costante' }).giorniAnnaffiatura, 4);
assert.equal(valutaSalute({ diagnosi: { stato: 'sana' } }).stato, 'ok');
assert.equal(valutaSalute().stato, 'ignoto');
console.log('fase5-salute: ok');
