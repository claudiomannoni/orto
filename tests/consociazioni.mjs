import fs from 'node:fs';
import path from 'node:path';
const R=path.resolve(process.argv[2]||'.'); let ok=0,ko=0;
const check=(name,condition,detail='')=>{condition?ok++:ko++;if(!condition)console.log(`FAIL ${name}${detail?` -> ${detail}`:''}`)};
let d;try{d=JSON.parse(fs.readFileSync(path.join(R,'data/it/consociazioni.json'),'utf8'));}catch(e){console.log('FAIL JSON valido -> '+e.message);process.exit(1);}
const ids=new Set(JSON.parse(fs.readFileSync(path.join(R,'data/it/colture/indice.json'),'utf8')).colture);
const fonti=new Set(Object.keys(d.fonti||{}));
check('versione 1',d.versione===1);check('relazioni array',Array.isArray(d.relazioni));
const coppie=new Set();
for(const [i,r] of d.relazioni.entries()){
 const tag=`relazioni[${i}]`;
 check(tag+' id a esistente',ids.has(r.a),r.a); check(tag+' id b esistente',ids.has(r.b),r.b);
 check(tag+' coppia distinta',r.a!==r.b);
 const k=[r.a,r.b].sort().join('|');check(tag+' coppia non ripetuta/invertita',!coppie.has(k),k);coppie.add(k);
 check(tag+' tipo valido',['amica','nemica'].includes(r.tipo),r.tipo);
 check(tag+' perche max 120',typeof r.perche==='string'&&r.perche.length<=120,r.perche?.length);
 check(tag+' certezza valida',['bassa','media','alta'].includes(r.certezza),r.certezza);
 check(tag+' fonti array',Array.isArray(r.fonti));
 for(const f of r.fonti||[])check(tag+' fonte esistente '+f,fonti.has(f));
 if(['media','alta'].includes(r.certezza))check(tag+' media/alta con fonti',r.fonti?.length>0);
}
for(const [k,f] of Object.entries(d.fonti||{})){check('fonte '+k+' url https',/^https:\/\//.test(f.url||''),f.url);check('fonte '+k+' consultata',/^\d{4}-\d\d-\d\d$/.test(f.consultata||''));}
for(const r of d.rotazione?.regole||[]){check('regola '+r.id+' certezza valida',['bassa','media','alta'].includes(r.certezza));if(['media','alta'].includes(r.certezza))check('regola '+r.id+' fonti',r.fonti?.length>0);for(const f of r.fonti||[])check('regola '+r.id+' fonte '+f,fonti.has(f));}
for(const g of d.rotazione?.gruppi||[]){for(const id of g.colture||[])check('gruppo '+g.famiglia+' coltura '+id,ids.has(id));check('gruppo '+g.famiglia+' certezza', ['bassa','media','alta'].includes(g.certezza));if(['media','alta'].includes(g.certezza))check('gruppo '+g.famiglia+' fonti',g.fonti?.length>0);for(const f of g.fonti||[])check('gruppo '+g.famiglia+' fonte '+f,fonti.has(f));}
const raw=fs.readFileSync(path.join(R,'data/it/consociazioni.json'));check('UTF-8 senza BOM',!(raw[0]===0xef&&raw[1]===0xbb&&raw[2]===0xbf));const txt=raw.toString('utf8');check('nessun carattere sostitutivo',!txt.includes('\uFFFD'));check('nessuna sequenza di punti interrogativi',!/[?]{3,}/.test(txt));
// Un «?» in mezzo a una frase di solito è una lettera accentata persa nella codifica ("pi?", "variet?").
{
  const tutte = [];
  const raccogli = (v) => { if (Array.isArray(v)) v.forEach(raccogli); else if (v && typeof v === 'object') Object.values(v).forEach(raccogli); else if (typeof v === 'string') tutte.push(v); };
  raccogli(JSON.parse(fs.readFileSync(path.join(R, 'data/it/consociazioni.json'), 'utf8')));
  const sospette = tutte.filter((s) => /[\p{L}]\?[\p{L}]|(?:^|\s)\?(?:\s|$)|[\p{L}]\?:|[\p{L}]\? [a-zàèéìòù]/u.test(s));
  check('nessun «?» al posto di una lettera accentata', sospette.length === 0, sospette.slice(0, 3).join(' | '));
}

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL (${d.relazioni.length} relazioni)`);process.exit(ko?1:0);
