import fs from 'node:fs';
import path from 'node:path';
const R=path.resolve(process.argv[2]||'.'); let ok=0,ko=0;
const check=(n,c,d='')=>{c?ok++:ko++;if(!c)console.log(`FAIL ${n}${d?` -> ${d}`:''}`)};
let d;try{d=JSON.parse(fs.readFileSync(path.join(R,'data/it/curiosita.json'),'utf8'))}catch(e){console.log(`FAIL JSON valido -> ${e.message}`);process.exit(1)}
const temi=['terreno','lombrichi','acqua','semi','insetti','piante','compost','storia','clima'];
check('versione 1',d.versione===1);check('curiosita array',Array.isArray(d.curiosita));check('90 voci',d.curiosita?.length===90,d.curiosita?.length);
const ids=new Set(),counts=Object.fromEntries(temi.map(t=>[t,0]));
for(const [i,q] of (d.curiosita||[]).entries()) {const t=`curiosita[${i}]`;check(`${t} id presente`,typeof q.id==='string'&&!!q.id);check(`${t} id unico`,!ids.has(q.id),q.id);ids.add(q.id);check(`${t} tema valido`,temi.includes(q.tema),q.tema);if(temi.includes(q.tema))counts[q.tema]++;check(`${t} testo max 180`,typeof q.testo==='string'&&q.testo.length>0&&q.testo.length<=180,q.testo?.length);for(const k of ['rosso','rossella'])check(`${t} ${k} max 90`,typeof q[k]==='string'&&q[k].length>0&&q[k].length<=90,q[k]?.length);check(`${t} mesi validi`,Array.isArray(q.mesi)&&q.mesi.length>0&&q.mesi.every(m=>Number.isInteger(m)&&m>=1&&m<=12));check(`${t} fonte https`,typeof q.fonte==='string'&&/^https:\/\//.test(q.fonte),q.fonte);check(`${t} certezza`,['alta','media','bassa'].includes(q.certezza),q.certezza)}
for(const tema of temi)check(`tema ${tema}: 10 voci`,counts[tema]===10,counts[tema]);
const raw=fs.readFileSync(path.join(R,'data/it/curiosita.json'));check('UTF-8 senza BOM',!(raw[0]===0xef&&raw[1]===0xbb&&raw[2]===0xbf));const txt=raw.toString('utf8');check('nessun carattere sostitutivo',!txt.includes('\uFFFD'));check('nessuna sequenza ???',!/[?]{3,}/.test(txt));
const all=[];const collect=v=>{if(Array.isArray(v))v.forEach(collect);else if(v&&typeof v==='object')Object.values(v).forEach(collect);else if(typeof v==='string')all.push(v)};collect(d);const bad=all.filter(s=>/[\p{L}]\?[\p{L}]|(?:^|\s)\?(?:\s|$)|[\p{L}]\?:|[\p{L}]\? [a-zÃ Ã¨Ã©Ã¬Ã²Ã¹]/u.test(s));check('nessun ? al posto di un accento',bad.length===0,bad.slice(0,3).join(' | '));
console.log(`\nTotale: ${ok} PASS, ${ko} FAIL (${d.curiosita.length} voci)`);process.exit(ko?1:0);