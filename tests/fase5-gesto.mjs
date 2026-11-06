import assert from 'node:assert/strict';
import { interpretaGesto } from '../js/motore/gesto.js';
assert.equal(interpretaGesto(72, 0), 'innaffiato');
assert.equal(interpretaGesto(-90, 1), 'raccolto');
assert.equal(interpretaGesto(71, 0), null);
assert.equal(interpretaGesto(100, 110), null);
assert.equal(interpretaGesto(NaN, 0), null);
console.log('fase5-gesto: PASS');
