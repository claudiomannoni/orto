import fs from 'node:fs';
import path from 'node:path';

const R = path.resolve(process.argv[2] || '.');
let ok = 0, ko = 0;
const check = (name, condition, detail = '') => {
  condition ? ok++ : ko++;
  if (!condition) console.log(`FAIL ${name}${detail ? ` -> ${detail}` : ''}`);
};

const file = path.join(R, 'data/it/quiz.json');
let d;
try { d = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch (e) { console.log(`FAIL JSON valido -> ${e.message}`); process.exit(1); }

const temi = ['semina', 'terreno', 'acqua', 'parassiti', 'raccolta', 'consociazioni', 'calendario', 'compost'];
check('versione 1', d.versione === 1);
check('domande array', Array.isArray(d.domande));
check('60 domande', d.domande?.length === 60, d.domande?.length);
const ids = new Set(), perTema = Object.fromEntries(temi.map(t => [t, 0]));
const perLivello = { 1: 0, 2: 0, 3: 0 };
for (const [i, q] of (d.domande || []).entries()) {
  const tag = `domande[${i}]`;
  check(`${tag} id presente`, typeof q.id === 'string' && q.id.length > 0);
  check(`${tag} id unico`, !ids.has(q.id), q.id); ids.add(q.id);
  check(`${tag} tema valido`, temi.includes(q.tema), q.tema);
  if (temi.includes(q.tema)) perTema[q.tema]++;
  check(`${tag} livello valido`, [1, 2, 3].includes(q.livello), q.livello);
  if (perLivello[q.livello] !== undefined) perLivello[q.livello]++;
  check(`${tag} testo max 180`, typeof q.testo === 'string' && q.testo.length > 0 && q.testo.length <= 180, q.testo?.length);
  check(`${tag} tre risposte`, Array.isArray(q.risposte) && q.risposte.length === 3);
  for (const [j, r] of (q.risposte || []).entries()) check(`${tag} risposta ${j + 1} max 100`, typeof r === 'string' && r.length > 0 && r.length <= 100, r?.length);
  check(`${tag} giusta 0..2`, Number.isInteger(q.giusta) && q.giusta >= 0 && q.giusta <= 2, q.giusta);
  check(`${tag} spiegazione max 160`, typeof q.spiegazione === 'string' && q.spiegazione.length > 0 && q.spiegazione.length <= 160, q.spiegazione?.length);
  check(`${tag} certezza valida`, ['bassa', 'media', 'alta'].includes(q.certezza), q.certezza);
  check(`${tag} fonte https o percorso esistente`, typeof q.fonte === 'string' && (/^https:\/\//.test(q.fonte) || fs.existsSync(path.resolve(R, q.fonte))), q.fonte);
}
for (const tema of temi) check(`tema ${tema}: 7 o 8 domande`, perTema[tema] === 7 || perTema[tema] === 8, perTema[tema]);
for (const livello of [1, 2, 3]) check(`livello ${livello}: 20 domande`, perLivello[livello] === 20, perLivello[livello]);

const raw = fs.readFileSync(file);
check('UTF-8 senza BOM', !(raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf));
const txt = raw.toString('utf8');
check('nessun carattere sostitutivo', !txt.includes('\uFFFD'));
check('nessuna sequenza di punti interrogativi', !/[?]{3,}/.test(txt));
const tutte = [];
const raccogli = v => {
  if (Array.isArray(v)) v.forEach(raccogli);
  else if (v && typeof v === 'object') Object.values(v).forEach(raccogli);
  else if (typeof v === 'string') tutte.push(v);
};
raccogli(d);
const sospette = tutte.filter(s => /[\p{L}]\?[\p{L}]|(?:^|\s)\?(?:\s|$)|[\p{L}]\?:|[\p{L}]\? [a-zàèéìòù]/u.test(s));
check('nessun «?» al posto di una lettera accentata', sospette.length === 0, sospette.slice(0, 3).join(' | '));

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL (${d.domande.length} domande)`);
process.exit(ko ? 1 : 0);
