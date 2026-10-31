import fs from 'node:fs';
import path from 'node:path';

const R = path.resolve(process.argv[2] || '.');
let ok = 0, ko = 0;
const check = (name, condition, detail = '') => {
  condition ? ok++ : ko++;
  if (!condition) console.log(`FAIL ${name}${detail ? ` -> ${detail}` : ''}`);
};
const read = file => JSON.parse(fs.readFileSync(path.join(R, file), 'utf8'));
let d, base;
try { d = read('data/it/quiz-extra.json'); base = read('data/it/quiz.json'); }
catch (e) { console.log(`FAIL JSON valido -> ${e.message}`); process.exit(1); }

const temi = ['semina','terreno','acqua','parassiti','raccolta','consociazioni','calendario','compost','lombrichi','insetti utili','impollinatori','conservazione','attrezzi'];
check('versione 1', d.versione === 1);
check('60 domande', d.domande?.length === 60, d.domande?.length);
const perTema = Object.fromEntries(temi.map(t => [t, 0]));
const perLivello = {1:0,2:0,3:0}, perGiusta = {0:0,1:0,2:0};
const ids = new Set(), baseTexts = new Set(base.domande.map(q => q.testo.trim().toLocaleLowerCase('it')));
for (const [i, q] of (d.domande || []).entries()) {
  const tag = `domande[${i}]`, n = i + 61;
  check(`${tag} id atteso`, q.id === `q${String(n).padStart(3,'0')}`, q.id);
  check(`${tag} id unico`, !ids.has(q.id), q.id); ids.add(q.id);
  check(`${tag} tema valido`, temi.includes(q.tema), q.tema);
  if (perTema[q.tema] !== undefined) perTema[q.tema]++;
  check(`${tag} livello valido`, [1,2,3].includes(q.livello), q.livello);
  if (perLivello[q.livello] !== undefined) perLivello[q.livello]++;
  check(`${tag} testo valido`, typeof q.testo === 'string' && q.testo.length > 0 && q.testo.length <= 180);
  check(`${tag} testo non duplicato`, !baseTexts.has(q.testo?.trim().toLocaleLowerCase('it')), q.testo);
  check(`${tag} tre risposte`, Array.isArray(q.risposte) && q.risposte.length === 3);
  for (const [j,r] of (q.risposte || []).entries()) check(`${tag} risposta ${j+1}`, typeof r === 'string' && r.length > 0 && r.length <= 100);
  check(`${tag} giusta 0..2`, Number.isInteger(q.giusta) && q.giusta >= 0 && q.giusta <= 2, q.giusta);
  if (perGiusta[q.giusta] !== undefined) perGiusta[q.giusta]++;
  check(`${tag} spiegazione max 160`, typeof q.spiegazione === 'string' && q.spiegazione.length > 0 && q.spiegazione.length <= 160, q.spiegazione?.length);
  check(`${tag} certezza valida`, ['bassa','media','alta'].includes(q.certezza), q.certezza);
  check(`${tag} fonte https`, typeof q.fonte === 'string' && /^https:\/\//.test(q.fonte), q.fonte);
}
for (const tema of temi) check(`tema ${tema}: distribuzione ragionevole`, perTema[tema] >= 3 && perTema[tema] <= 7, perTema[tema]);
for (const livello of [1,2,3]) check(`livello ${livello}: 20 domande`, perLivello[livello] === 20, perLivello[livello]);
for (const pos of [0,1,2]) check(`giusta posizione ${pos}: circa 20`, perGiusta[pos] >= 17 && perGiusta[pos] <= 23, perGiusta[pos]);

const raw = fs.readFileSync(path.join(R,'data/it/quiz-extra.json'));
check('UTF-8 senza BOM', !(raw[0]===0xef && raw[1]===0xbb && raw[2]===0xbf));
const txt = raw.toString('utf8');
check('nessun carattere sostitutivo', !txt.includes('\uFFFD'));
check('nessuna sequenza di tre punti interrogativi', !/[?]{3,}/.test(txt));
const strings=[];
const collect=v=>{ if(Array.isArray(v))v.forEach(collect); else if(v&&typeof v==='object')Object.values(v).forEach(collect); else if(typeof v==='string')strings.push(v); };
collect(d);
const bad=strings.filter(s=>/[\p{L}]\?[\p{L}]|(?:^|\s)\?(?:\s|$)|[\p{L}]\?:|[\p{L}]\? [a-zàèéìòù]/u.test(s));
check('nessun punto interrogativo al posto di una lettera accentata', bad.length===0, bad.slice(0,3).join(' | '));
console.log(`\nTotale: ${ok} PASS, ${ko} FAIL (${d.domande.length} domande)`);
process.exit(ko ? 1 : 0);
