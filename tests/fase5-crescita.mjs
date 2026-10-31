// Crescita delle colture e raggruppamento per zona (Node, nessun server). Uso: node tests/fase5-crescita.mjs <cartella-app>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const radice = path.resolve(process.argv[2] || '.');
const { crescita, perZona } = await import(pathToFileURL(path.join(radice, 'js/motore/crescita.js')).href);
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };
const scheda = { giorni_alla_raccolta: { min: 60, max: 100 } };
const a = (giorni) => crescita({ dataSemina: '2026-06-01' }, scheda, new Date(2026, 5, 1 + giorni).toISOString ? `2026-${String(new Date(2026, 5, 1 + giorni).getMonth() + 1).padStart(2, '0')}-${String(new Date(2026, 5, 1 + giorni).getDate()).padStart(2, '0')}` : '');

check('il giorno della semina: appena messa', a(0).fase === 'appena_messa' && a(0).giorni === 0);
check('dopo 30 giorni: cresce', a(30).fase === 'cresce' && Math.abs(a(30).quota - 0.3) < 0.01);
check('dopo 80 giorni con minimo 60: già pronta', a(80).fase === 'pronta');
check('quasi pronta: oltre l 80 per cento ma prima del minimo', crescita({ dataSemina: '2026-06-01' }, { giorni_alla_raccolta: { min: 95, max: 100 } }, '2026-08-25').fase === 'quasi');
check('dopo 60 giorni (minimo) è pronta', a(60).fase === 'pronta');
check('dopo 100 giorni: pronta, quota 1', a(100).fase === 'pronta' && a(100).quota === 1);
check('molto oltre (160 giorni): da raccogliere presto', a(160).fase === 'oltre' && a(160).quota === 1);
check('data di semina nel futuro: futura', crescita({ dataSemina: '2026-07-01' }, scheda, '2026-06-01').fase === 'futura');
check('scheda senza giorni: sconosciuta ma con i giorni', (() => { const c = crescita({ dataSemina: '2026-06-01' }, {}, '2026-06-11'); return c.fase === 'sconosciuta' && c.giorni === 10 && c.quota === null; })());
check('scheda mancante o data rovinata: nessun errore', crescita({ dataSemina: '2026-06-01' }, undefined, '2026-06-11').fase === 'sconosciuta' && crescita({ dataSemina: 'boh' }, scheda, '2026-06-11').fase === 'sconosciuta' && crescita(null, scheda, '2026-06-11').fase === 'sconosciuta');

const zone = [{ id: 'z1', nome: 'Aiuola A' }, { id: 'z2', nome: 'Aiuola B' }];
const colture = [{ id: 'c1', zonaId: 'z2' }, { id: 'c2', zonaId: null }, { id: 'c3', zonaId: 'z2' }, { id: 'c4', zonaId: 'zona-cancellata' }];
const g = perZona(colture, zone);
check('raggruppa: solo zone con colture, poi «senza zona»', g.length === 2 && g[0].zonaId === 'z2' && g[0].colture.length === 2 && g[1].zonaId === null && g[1].colture.length === 2, JSON.stringify(g.map((x) => [x.zonaId, x.colture.length])));
check('nessuna coltura: nessun gruppo', perZona([], zone).length === 0);
console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
