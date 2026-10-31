// Qualità dei contenuti animali.json e rendita.json (Node, nessun server). Uso: node tests/animali-contenuti.mjs <cartella-app>
import path from 'node:path';
import fs from 'node:fs';
const radice = path.resolve(process.argv[2] || '.');
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

const EMOJI = /\p{Extended_Pictographic}/u;
const MASSIMO_STRINGHE = 260;

// Percorso file -> nome del campo calendario (assente = nessun calendario da controllare)
const FILE = [
  { file: 'data/it/animali.json', calendario: 'calendario' },
  { file: 'data/it/rendita.json', calendario: 'quando' }
];

// Visita ricorsiva: elenca le stringhe con il loro percorso (per dire quale campo è sbagliato)
const stringhe = (valore, percorso, lista) => {
  if (typeof valore === 'string') lista.push({ percorso, testo: valore });
  else if (Array.isArray(valore)) valore.forEach((v, i) => stringhe(v, `${percorso}[${i}]`, lista));
  else if (valore && typeof valore === 'object')
    for (const [chiave, v] of Object.entries(valore)) stringhe(v, percorso ? `${percorso}.${chiave}` : chiave, lista);
};

for (const { file, calendario: nomeCalendario } of FILE) {
  let dati;
  try {
    dati = JSON.parse(fs.readFileSync(path.join(radice, file), 'utf8'));
  } catch (e) {
    check(`${file}: file leggibile e JSON valido`, false, e.message);
    continue;
  }
  const schede = Array.isArray(dati.schede) ? dati.schede : [];
  check(`${file}: schede è un array`, Array.isArray(dati.schede));
  const etichetta = (s, i) => `${file} · scheda "${typeof s.id === 'string' && s.id.trim() ? s.id : '(senza id, indice ' + i + ')'}"`;

  const viste = new Set();
  schede.forEach((s, i) => {
    const et = etichetta(s, i);

    // id, nome, in_breve
    check(`${et}: id presente`, typeof s.id === 'string' && s.id.trim().length > 0);
    check(`${et}: id unico nel file`, !viste.has(s.id), viste.has(s.id) ? 'id ripetuto' : '');
    if (typeof s.id === 'string') viste.add(s.id);
    check(`${et}: nome presente`, typeof s.nome === 'string' && s.nome.trim().length > 0, typeof s.nome !== 'string' ? 'nome non è una stringa' : '');
    check(`${et}: in_breve presente`, typeof s.in_breve === 'string' && s.in_breve.trim().length > 0, typeof s.in_breve !== 'string' ? 'in_breve non è una stringa' : '');

    // Tutte le stringhe annidate
    // Una fonte può mancare solo dove il dato è dichiarato «da verificare» (certezza bassa): l'URL vuoto è onesto, uno inventato no.
    const urlVuotoLecito = (x) => x.testo.trim() === '' && x.percorso === 'resa_realistica.fonte_url' && s.resa_realistica?.certezza === 'bassa';
    const lista = [];
    stringhe(s, '', lista);
    const lunghe = lista.filter(x => x.testo.length > MASSIMO_STRINGHE);
    check(`${et}: stringhe al massimo ${MASSIMO_STRINGHE} caratteri`, lunghe.length === 0, lunghe.slice(0, 3).map(x => x.percorso).join(', '));
    const vuote = lista.filter(x => x.testo.trim() === '' && !urlVuotoLecito(x));
    check(`${et}: stringhe non vuote dopo trim`, vuote.length === 0, vuote.slice(0, 3).map(x => x.percorso).join(', '));
    const emoji = lista.filter(x => EMOJI.test(x.testo));
    check(`${et}: nessuna emoji`, emoji.length === 0, emoji.slice(0, 3).map(x => x.percorso).join(', '));

    // Campi _url / url: stringhe che iniziano con https://
    const urlErrate = lista.filter(x => {
      if (urlVuotoLecito(x)) return false;
      const chiave = x.percorso.split('.').pop().split('[')[0];
      return (chiave.endsWith('_url') || chiave === 'url') && !(typeof x.testo === 'string' && x.testo.startsWith('https://'));
    });
    check(`${et}: campi _url/url su https://`, urlErrate.length === 0, urlErrate.slice(0, 3).map(x => x.percorso).join(', '));

    // certezza: raccolgo gli oggetti annidati con i loro percorsi
    const oggetti = [];
    const visitaOggetti = (valore, percorso) => {
      if (Array.isArray(valore)) valore.forEach((v, i) => visitaOggetti(v, `${percorso}[${i}]`));
      else if (valore && typeof valore === 'object') {
        oggetti.push({ percorso, oggetto: valore });
        for (const [chiave, v] of Object.entries(valore)) visitaOggetti(v, percorso ? `${percorso}.${chiave}` : chiave);
      }
    };
    visitaOggetti(s, '');
    const errateCertezza = oggetti.filter(x => 'certezza' in x.oggetto && !['alta', 'media', 'bassa'].includes(x.oggetto.certezza));
    check(`${et}: certezza tra alta, media e bassa`, errateCertezza.length === 0, errateCertezza.slice(0, 3).map(x => `${x.percorso}.certezza = ${JSON.stringify(x.oggetto.certezza)}`).join(', '));

    // Calendario (se presente)
    if (nomeCalendario in s) {
      const cal = s[nomeCalendario];
      const mancano = Array.from({ length: 12 }, (_, m) => String(m + 1)).filter(m => !(m in cal));
      check(`${et}: ${nomeCalendario} con le 12 chiavi "1".."12"`, mancano.length === 0, mancano.length ? 'mancano: ' + mancano.join(', ') : '');
      const listeNonOk = Array.from({ length: 12 }, (_, m) => ({ m: String(m + 1), v: cal[String(m + 1)] }))
        .filter(x => !Array.isArray(x.v) || x.v.some(v => typeof v !== 'string'));
      check(`${et}: ${nomeCalendario} con liste di stringhe`, listeNonOk.length === 0, listeNonOk.slice(0, 3).map(x => x.m).join(', '));
    }

    // fonti
    if ('fonti' in s) {
      check(`${et}: fonti è un array di oggetti con titolo e url`, Array.isArray(s.fonti) && s.fonti.every(f => f && typeof f === 'object' && typeof f.titolo === 'string' && typeof f.url === 'string'));
    }
    check(`${et}: almeno una fonte`, Array.isArray(s.fonti) && s.fonti.length > 0);
  });
}

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
