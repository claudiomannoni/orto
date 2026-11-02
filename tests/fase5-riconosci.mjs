// Da foto a coltura: abbinamento della scheda ed età stimata (Node, nessun server). Uso: node tests/fase5-riconosci.mjs <cartella-app>
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { abbinaScheda, etaStimata, proponiColtura } = await import(pathToFileURL(path.join(radice, 'js/motore/riconosci.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
const indice = JSON.parse(fs.readFileSync(path.join(radice, 'data/it/colture/indice.json'), 'utf8')).colture;
const schede = indice.map((id) => JSON.parse(fs.readFileSync(path.join(radice, `data/it/colture/${id}.json`), 'utf8')));
const fasi = JSON.parse(fs.readFileSync(path.join(radice, 'data/it/fasi.json'), 'utf8'));

check('«Basilico» e «basilico genovese» -> basilico', abbinaScheda('Basilico', schede)?.id === 'basilico' && abbinaScheda('basilico genovese', schede)?.id === 'basilico');
check('«Pomodoro» (singolare, alias) -> pomodori', abbinaScheda('Pomodoro', schede)?.id === 'pomodori', String(abbinaScheda('Pomodoro', schede)?.id));
check('pianta sconosciuta o testo strano: nessuna scheda', abbinaScheda('Rosa canina', schede) === null && abbinaScheda('', schede) === null && abbinaScheda(null, schede) === null && abbinaScheda('ab', schede) === null && abbinaScheda('basilico', null) === null);
check('schede con dati rotti non fanno errori', abbinaScheda('basilico', [null, {}, { id: 'x', nome: 3 }, { id: 'y', alias: 'no' }]) === null);

const fp = fasi.colture.pomodori.fasi;
check('giorni dati dalla foto vincono sullo stadio', JSON.stringify(etaStimata({ stadio: 'frutti', giorni: 30 }, fp)) === '{"giorni":30,"fonte":"foto"}');
const e = etaStimata({ stadio: 'fioritura' }, fp);
check('senza giorni: dallo stadio, con una fase vera', e.fonte === 'stadio' && fp.some((f) => f.da_giorno === e.giorni), JSON.stringify(e));
check('stadio sconosciuto o senza fasi: età ignota', etaStimata({ stadio: 'boh' }, fp).fonte === 'ignota' && etaStimata({ stadio: 'frutti' }, undefined).fonte === 'ignota' && etaStimata({}, fp).giorni === null);
check('giorni assurdi (negativi, enormi, decimali) sono scartati', ['x', -3, 9999, 2.5, NaN].every((g) => etaStimata({ giorni: g }, fp).fonte === 'ignota'));
check('lo stadio più avanzato non è prima di quello iniziale', etaStimata({ stadio: 'raccolta' }, fp).giorni >= etaStimata({ stadio: 'germinazione' }, fp).giorni);

let p = proponiColtura({ risultato: { pianta: { nome: 'Pomodoro' }, stadio: 'piantina', giorni_stimati: 20 }, schede, fasi, oggi: '2026-11-02' });
check('pomodoro di 20 giorni: nome della scheda, data = oggi - 20', p.schedaId === 'pomodori' && p.nome === schede.find((s) => s.id === 'pomodori').nome && p.dataSemina === '2026-10-13' && p.etaGiorni === 20 && p.fonteEta === 'foto', JSON.stringify(p));
p = proponiColtura({ risultato: { pianta: { nome: 'Ficus' } }, schede, fasi, oggi: '2026-11-02' });
check('pianta senza scheda e senza età: nome dell\'IA, data oggi, nessuna scheda', p.schedaId === null && p.nome === 'Ficus' && p.dataSemina === '2026-11-02' && p.fonteEta === 'ignota');
check('nessuna pianta riconosciuta: nessuna proposta', proponiColtura({ risultato: { pianta: null }, schede, fasi, oggi: '2026-11-02' }) === null && proponiColtura({}) === null && proponiColtura(undefined) === null);
console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
