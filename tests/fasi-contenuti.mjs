// Qualità dei contenuti fasi.json e delle schede coltura (Node, nessun server). Uso: node tests/fasi-contenuti.mjs <cartella-app>
import path from 'node:path';
import fs from 'node:fs';
const radice = path.resolve(process.argv[2] || '.');
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); };

const EMOJI = /\p{Extended_Pictographic}/u;
const MASSIMO_STRINGHE = 260;
const CERTEZZE = ['alta', 'media', 'bassa'];
const fileFasi = 'data/it/fasi.json';

// Una data è valida solo se il formato è AAAA-MM-GG e la data esiste davvero
const dataValida = (testo) => {
  if (typeof testo !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(testo)) return false;
  const data = new Date(`${testo}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === testo;
};

// Visita ricorsiva: elenca le stringhe con il loro percorso (per dire quale campo è sbagliato)
const stringhe = (valore, percorso, lista) => {
  if (typeof valore === 'string') lista.push({ percorso, testo: valore });
  else if (Array.isArray(valore)) valore.forEach((v, i) => stringhe(v, `${percorso}[${i}]`, lista));
  else if (valore && typeof valore === 'object')
    for (const [chiave, v] of Object.entries(valore)) stringhe(v, percorso ? `${percorso}.${chiave}` : chiave, lista);
};

let dati;
try {
  dati = JSON.parse(fs.readFileSync(path.join(radice, fileFasi), 'utf8'));
  check(`${fileFasi}: file leggibile e JSON valido`, true);
} catch (e) {
  check(`${fileFasi}: file leggibile e JSON valido`, false, e.message);
  console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
  process.exit(1);
}

// fonti
const fonti = dati.fonti && typeof dati.fonti === 'object' && !Array.isArray(dati.fonti) ? dati.fonti : {};
check(`${fileFasi}: fonti è un oggetto`, dati.fonti && typeof dati.fonti === 'object' && !Array.isArray(dati.fonti));
const idFonti = new Set(Object.keys(fonti));

for (const [id, fonte] of Object.entries(fonti)) {
  const et = `${fileFasi} · fonte "${id}"`;
  check(`${et}: titolo presente`, typeof fonte?.titolo === 'string' && fonte.titolo.trim().length > 0, typeof fonte?.titolo !== 'string' ? 'titolo non è una stringa' : '');
  check(`${et}: ente presente`, typeof fonte?.ente === 'string' && fonte.ente.trim().length > 0, typeof fonte?.ente !== 'string' ? 'ente non è una stringa' : '');
  check(`${et}: url inizia con https://`, typeof fonte?.url === 'string' && fonte.url.startsWith('https://'), typeof fonte?.url !== 'string' ? 'url non è una stringa' : '');
  check(`${et}: consultata in formato AAAA-MM-GG`, dataValida(fonte?.consultata), `consultata = ${JSON.stringify(fonte?.consultata)}`);

  const lista = [];
  stringhe(fonte, '', lista);
  const lunghe = lista.filter(x => x.testo.length > MASSIMO_STRINGHE);
  check(`${et}: stringhe al massimo ${MASSIMO_STRINGHE} caratteri`, lunghe.length === 0, lunghe.slice(0, 3).map(x => x.percorso).join(', '));
  const vuote = lista.filter(x => x.testo.trim() === '');
  check(`${et}: stringhe non vuote dopo trim`, vuote.length === 0, vuote.slice(0, 3).map(x => x.percorso).join(', '));
  const emoji = lista.filter(x => EMOJI.test(x.testo));
  check(`${et}: nessuna emoji`, emoji.length === 0, emoji.slice(0, 3).map(x => x.percorso).join(', '));
}

// colture
const colture = dati.colture && typeof dati.colture === 'object' && !Array.isArray(dati.colture) ? dati.colture : {};
check(`${fileFasi}: colture è un oggetto`, dati.colture && typeof dati.colture === 'object' && !Array.isArray(dati.colture));

for (const [id, coltura] of Object.entries(colture)) {
  const et = `${fileFasi} · coltura "${id}"`;

  // Scheda della coltura
  let scheda = null;
  try {
    scheda = JSON.parse(fs.readFileSync(path.join(radice, 'data/it/colture', `${id}.json`), 'utf8'));
    check(`${et}: file data/it/colture/${id}.json leggibile e JSON valido`, true);
  } catch (e) {
    check(`${et}: file data/it/colture/${id}.json leggibile e JSON valido`, false, e.message);
  }

  // Tutte le stringhe della coltura
  const lista = [];
  stringhe(coltura, '', lista);
  const lunghe = lista.filter(x => x.testo.length > MASSIMO_STRINGHE);
  check(`${et}: stringhe al massimo ${MASSIMO_STRINGHE} caratteri`, lunghe.length === 0, lunghe.slice(0, 3).map(x => x.percorso).join(', '));
  const vuote = lista.filter(x => x.testo.trim() === '');
  check(`${et}: stringhe non vuote dopo trim`, vuote.length === 0, vuote.slice(0, 3).map(x => x.percorso).join(', '));
  const emoji = lista.filter(x => EMOJI.test(x.testo));
  check(`${et}: nessuna emoji`, emoji.length === 0, emoji.slice(0, 3).map(x => x.percorso).join(', '));

  // Fasi
  const fasi = Array.isArray(coltura?.fasi) ? coltura.fasi : [];
  check(`${et}: fasi ha da 3 a 8 elementi`, Array.isArray(coltura?.fasi) && fasi.length >= 3 && fasi.length <= 8, Array.isArray(coltura?.fasi) ? `trovati ${fasi.length}` : 'fasi non è un array');

  const visti = new Set();
  fasi.forEach((fase, i) => {
    const codice = typeof fase?.id === 'string' && fase.id.trim() ? ` "${fase.id}"` : '';
    const ef = `${et} · fase ${i + 1}${codice}`;
    const ultima = i === fasi.length - 1;
    const nonUltima = !ultima;

    check(`${ef}: id presente`, typeof fase?.id === 'string' && fase.id.trim().length > 0, typeof fase?.id !== 'string' ? 'id non è una stringa' : '');
    check(`${ef}: id unico nella coltura`, typeof fase?.id === 'string' && !visti.has(fase.id), typeof fase?.id === 'string' && visti.has(fase.id) ? 'id ripetuto' : '');
    if (typeof fase?.id === 'string') visti.add(fase.id);
    check(`${ef}: nome presente`, typeof fase?.nome === 'string' && fase.nome.trim().length > 0, typeof fase?.nome !== 'string' ? 'nome non è una stringa' : '');
    check(`${ef}: da_giorno intero >= 0`, Number.isInteger(fase?.da_giorno) && fase.da_giorno >= 0, `da_giorno = ${JSON.stringify(fase?.da_giorno)}`);

    const aGiornoOk = fase?.a_giorno === null
      ? ultima
      : Number.isInteger(fase?.a_giorno) && Number.isInteger(fase?.da_giorno) && fase.a_giorno >= fase.da_giorno;
    check(`${ef}: a_giorno intero >= da_giorno (null solo nell'ultima fase)`, aGiornoOk, `a_giorno = ${JSON.stringify(fase?.a_giorno)}, da_giorno = ${JSON.stringify(fase?.da_giorno)}`);

    const listaCampi = (valore) => Array.isArray(valore) && valore.length >= 1 && valore.length <= 6 && valore.every(v => typeof v === 'string' && v.trim().length > 0);
    check(`${ef}: cosa_fare è un array di 1-6 stringhe non vuote`, listaCampi(fase?.cosa_fare), Array.isArray(fase?.cosa_fare) ? `elementi: ${fase.cosa_fare.length}` : 'cosa_fare non è un array');
    check(`${ef}: accortezze è un array di 1-6 stringhe non vuote`, listaCampi(fase?.accortezze), Array.isArray(fase?.accortezze) ? `elementi: ${fase.accortezze.length}` : 'accortezze non è un array');
    check(`${ef}: come_riconoscerla presente`, typeof fase?.come_riconoscerla === 'string' && fase.come_riconoscerla.trim().length > 0, typeof fase?.come_riconoscerla !== 'string' ? 'come_riconoscerla non è una stringa' : '');
    check(`${ef}: certezza tra alta, media e bassa`, CERTEZZE.includes(fase?.certezza), `certezza = ${JSON.stringify(fase?.certezza)}`);

    const fontiOk = Array.isArray(fase?.fonti) && fase.fonti.length > 0 && fase.fonti.every(f => idFonti.has(f));
    const fontiMancanti = Array.isArray(fase?.fonti) ? fase.fonti.filter(f => !idFonti.has(f)) : [];
    const dettaglioFonti = fontiOk ? '' : !Array.isArray(fase?.fonti) ? 'fonti non è un array' : fase.fonti.length === 0 ? 'array vuoto' : `id sconosciuti: ${fontiMancanti.join(', ')}`;
    check(`${ef}: fonti non vuote e presenti in fonti`, fontiOk, dettaglioFonti);

    // Contiguità e ordine rispetto alla fase precedente
    if (i > 0) {
      const precedente = fasi[i - 1];
      const contigua = Number.isInteger(precedente?.a_giorno) && Number.isInteger(fase?.da_giorno) && precedente.a_giorno + 1 === fase.da_giorno;
      check(`${ef}: contigua alla fase precedente (a_giorno + 1 = da_giorno)`, contigua, `precedente a_giorno = ${JSON.stringify(precedente?.a_giorno)}, da_giorno = ${JSON.stringify(fase?.da_giorno)}`);
    }
  });

  if (fasi.length > 0) {
    check(`${et}: la prima fase parte da 0`, fasi[0]?.da_giorno === 0, `da_giorno = ${JSON.stringify(fasi[0]?.da_giorno)}`);
  }

  // Età della piantina
  const piantina = coltura?.piantina_eta_giorni;
  check(`${et}: piantina_eta_giorni è un oggetto`, piantina && typeof piantina === 'object' && !Array.isArray(piantina));
  check(`${et}: piantina_eta_giorni.valore intero > 0 oppure null`, piantina?.valore === null || (Number.isInteger(piantina?.valore) && piantina.valore > 0), `valore = ${JSON.stringify(piantina?.valore)}`);
  check(`${et}: piantina_eta_giorni.certezza tra alta, media e bassa`, CERTEZZE.includes(piantina?.certezza), `certezza = ${JSON.stringify(piantina?.certezza)}`);
  const piantinaFontiOk = Array.isArray(piantina?.fonti) && piantina.fonti.every(f => idFonti.has(f));
  const piantinaMancanti = Array.isArray(piantina?.fonti) ? piantina.fonti.filter(f => !idFonti.has(f)) : [];
  const dettaglioPiantina = piantinaFontiOk ? '' : !Array.isArray(piantina?.fonti) ? 'fonti non è un array' : `id sconosciuti: ${piantinaMancanti.join(', ')}`;
  check(`${et}: piantina_eta_giorni.fonti è un array di id presenti in fonti`, piantinaFontiOk, dettaglioPiantina);

  // Ultima fase allineata ai giorni alla raccolta della scheda (solo se la scheda li dichiara)
  const raccolta = scheda?.giorni_alla_raccolta;
  if (raccolta && typeof raccolta === 'object' && Number.isInteger(raccolta.min) && Number.isInteger(raccolta.max)) {
    const inizio = fasi[fasi.length - 1]?.da_giorno;
    const minimoAmmesso = raccolta.min - 5;
    const allineata = Number.isInteger(inizio) && Number.isInteger(raccolta.min) && Number.isInteger(raccolta.max) &&
      inizio >= minimoAmmesso && inizio <= raccolta.max;
    check(`${et}: ultima fase inizia tra ${minimoAmmesso} e ${raccolta.max} giorni (giorni_alla_raccolta ${raccolta.min}-${raccolta.max})`, allineata, `da_giorno ultima fase = ${JSON.stringify(inizio)}`);
  }
}

// Asparago: prima guida di una perenne, deve spiegare il ciclo dalla zampa al raccolto
const asparagi = colture.asparagi;
const fasiAsparagi = Array.isArray(asparagi?.fasi) ? asparagi.fasi : [];
const testiAsparagi = fasiAsparagi
  .flatMap(f => [
    f?.nome,
    f?.come_riconoscerla,
    ...(Array.isArray(f?.cosa_fare) ? f.cosa_fare : []),
    ...(Array.isArray(f?.accortezze) ? f.accortezze : []),
  ])
  .filter(v => typeof v === 'string')
  .join(' ')
  .toLowerCase();

check('asparagi: la coltura ha da 3 a 8 fasi', fasiAsparagi.length >= 3 && fasiAsparagi.length <= 8, `trovate ${fasiAsparagi.length}`);
check('asparagi: le fasi parlano della zampa', testiAsparagi.includes('zampa'));
check('asparagi: le fasi parlano dei turioni', testiAsparagi.includes('turion'));
check('asparagi: le fasi spiegano chioma e riserve', testiAsparagi.includes('chioma') && testiAsparagi.includes('riserv'));
check('asparagi: la raccolta è presentata con prudenza', testiAsparagi.includes('non raccogliere') || testiAsparagi.includes('prudente') || testiAsparagi.includes('attendere'));
const fontiVisibili = /https?:|extension|universit|illinois|minnesota/;
check('asparagi: nessun riferimento a fonti nei testi delle fasi', !fontiVisibili.test(testiAsparagi));

console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
