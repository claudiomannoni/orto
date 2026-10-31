// Lettura della bustina dei semi (Node, nessun server). Uso: node tests/fase5-bustina.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { costruisciPromptBustina, leggiBustina } = await import(pathToFileURL(path.join(radice, 'js/ai/bustina.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
const schede = [{ id: 'pomodoro', nome: 'Pomodoro' }, { id: 'basilico', nome: 'Basilico' }];
const errore = (t) => {
  try { leggiBustina(t, schede); return null; } catch (e) { return e; }
};

const prompt = costruisciPromptBustina(schede);
check('prompt: elenca le colture', prompt.includes('Pomodoro') && prompt.includes('Basilico') && prompt.includes('pomodoro'));
check('prompt: dice di non inventare', prompt.includes('non inventare'));
check('prompt: chiede solo JSON', prompt.includes('SOLO con JSON'));

const buona = {
  nome: '  Pomodoro   San Marzano ', varieta: 'San Marzano', schedaId: 'pomodoro',
  giorni_germinazione: { min: 7, max: 14 }, giorni_raccolta: { min: 70, max: 90 },
  profondita_cm: 1, distanza_cm: 40, mesi_semina: [3, 4, 5], esposizione: 'sole', avvisi: 'bustina un po\' sbiadita',
};
const b = leggiBustina(JSON.stringify(buona), schede);
check('risposta buona: nome ripulito', b.nome === 'Pomodoro San Marzano', b.nome);
check('risposta buona: varietà e scheda', b.varieta === 'San Marzano' && b.schedaId === 'pomodoro');
check('risposta buona: giorni e misure', b.giorni_germinazione?.min === 7 && b.giorni_germinazione?.max === 14 && b.giorni_raccolta?.max === 90 && b.profondita_cm === 1 && b.distanza_cm === 40);
check('risposta buona: mesi ed esposizione', JSON.stringify(b.mesi_semina) === '[3,4,5]' && b.esposizione === 'sole');
check('risposta buona: avvisi', b.avvisi === 'bustina un po\' sbiadita');

const dentro = leggiBustina('```json\n' + JSON.stringify(buona) + '\n```', schede);
check('risposta dentro ```json: si legge', dentro.nome === 'Pomodoro San Marzano' && dentro.schedaId === 'pomodoro');

const inventato = leggiBustina(JSON.stringify({ ...buona, schedaId: 'zucca-inventata' }), schede);
check('id inventato: null', inventato.schedaId === null);

const assurdi = leggiBustina(JSON.stringify({ nome: 'X', giorni_germinazione: { min: -3, max: 5 }, giorni_raccolta: { min: 5, max: 9999 }, profondita_cm: '2', distanza_cm: -1 }), schede);
check('numeri assurdi: null', assurdi.giorni_germinazione === null && assurdi.giorni_raccolta === null && assurdi.profondita_cm === null && assurdi.distanza_cm === null);
const invertiti = leggiBustina(JSON.stringify({ nome: 'X', giorni_germinazione: { min: 30, max: 10 }, giorni_raccolta: { min: '7', max: '14' }, distanza_cm: 9999 }), schede);
check('min maggiore di max e stringhe: null', invertiti.giorni_germinazione === null && invertiti.giorni_raccolta === null && invertiti.distanza_cm === null);

const mesi = leggiBustina(JSON.stringify({ nome: 'X', mesi_semina: [3, 3, 15, 0, 4.5, 12, 1] }), schede);
check('mesi: interi 1-12, senza doppioni, in ordine', JSON.stringify(mesi.mesi_semina) === '[1,3,12]', JSON.stringify(mesi.mesi_semina));
const mesiRotti = leggiBustina(JSON.stringify({ nome: 'X', mesi_semina: 'marzo' }), schede);
check('mesi non elenco: vuoto', Array.isArray(mesiRotti.mesi_semina) && mesiRotti.mesi_semina.length === 0);

check('testo non JSON: errore risposta', errore('non è json')?.codice === 'risposta');
check('array: errore risposta', errore('[1,2]')?.codice === 'risposta');
check('null: errore risposta', errore('null')?.codice === 'risposta');
check('nome mancante: errore risposta', errore('{"varieta":"x"}')?.codice === 'risposta');
check('nome vuoto: errore risposta', errore('{"nome":"   "}')?.codice === 'risposta');

const vuota = leggiBustina('{"nome":"Lattuga"}', schede);
check('campi mancanti: null e elenco vuoto', vuota.varieta === '' && vuota.schedaId === null && vuota.giorni_germinazione === null && vuota.giorni_raccolta === null && vuota.profondita_cm === null && vuota.distanza_cm === null && vuota.mesi_semina.length === 0 && vuota.esposizione === null && vuota.avvisi === '');
const esposizioneRotta = leggiBustina(JSON.stringify({ nome: 'X', esposizione: 'luna' }), schede);
check('esposizione non valida: null', esposizioneRotta.esposizione === null);

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
