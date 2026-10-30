// Logica dell'app "Il mio orto".
(() => {
  const $ = (sel) => document.querySelector(sel);
  const form = $('#form-coltura');
  const lista = $('#lista');
  const vuoto = $('#vuoto');
  const conteggio = $('#conteggio');
  const dlg = $('#dlg-promemoria');
  const formPromemoria = $('#form-promemoria');
  const fileImport = $('#file-import');

  let colture = [];
  let colturaPromemoria = null;

  // ---------- Date (sempre in ora locale, formato AAAA-MM-GG) ----------
  function oggiISO() {
    const d = new Date();
    return isoLocale(d);
  }
  function isoLocale(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function daISO(iso) {
    const [a, m, g] = iso.split('-').map(Number);
    return new Date(a, m - 1, g);
  }
  function giorniDa(iso) {
    const ms = daISO(oggiISO()) - daISO(iso);
    return Math.round(ms / 86400000);
  }
  function aggiungiGiorni(iso, n) {
    const d = daISO(iso);
    d.setDate(d.getDate() + n);
    return isoLocale(d);
  }
  function formattaData(iso) {
    return daISO(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ---------- Utilità ----------
  function nuovoId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  let timerToast;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(timerToast);
    timerToast = setTimeout(() => t.classList.remove('show'), 2800);
  }

  function el(tag, attrs = {}, ...figli) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    figli.flat().forEach((f) => f != null && e.append(f));
    return e;
  }

  // ---------- Rendering ----------
  function render() {
    const ordinate = [...colture].sort((a, b) => b.dataSemina.localeCompare(a.dataSemina));
    lista.replaceChildren(...ordinate.map(card));
    conteggio.textContent = colture.length;
    vuoto.hidden = colture.length > 0;
  }

  function testoGiorni(n) {
    if (n < 0) return { num: -n, label: -n === 1 ? 'giorno alla semina' : 'giorni alla semina' };
    return { num: n, label: n === 1 ? 'giorno dalla semina' : 'giorni dalla semina' };
  }

  function card(c) {
    const g = testoGiorni(giorniDa(c.dataSemina));
    return el('li', { class: 'coltura', 'data-id': c.id },
      el('div', { class: 'coltura-top' },
        el('h3', {}, c.nome, c.varieta ? el('span', { class: 'varieta' }, ` · ${c.varieta}`) : null),
        el('div', { class: 'giorni' }, el('strong', {}, String(g.num)), el('span', {}, g.label)),
      ),
      el('div', { class: 'meta' },
        el('span', { class: `chip ${c.dove}` }, c.dove === 'orto' ? 'Orto' : 'Semenzaio'),
        el('span', {}, `Seminato il ${formattaData(c.dataSemina)}`),
      ),
      c.note ? el('p', { class: 'note' }, c.note) : null,
      el('div', { class: 'row' },
        el('button', { class: 'btn small', type: 'button', onclick: () => apriPromemoria(c) }, '📅 Aggiungi promemoria'),
        el('button', { class: 'btn small danger', type: 'button', onclick: () => elimina(c) }, 'Elimina'),
      ),
    );
  }

  async function carica() {
    colture = await DB.tutte();
    render();
  }

  // ---------- Aggiunta / eliminazione ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dati = new FormData(form);
    const coltura = {
      id: nuovoId(),
      nome: dati.get('nome').trim(),
      varieta: dati.get('varieta').trim(),
      dataSemina: dati.get('dataSemina'),
      dove: dati.get('dove'),
      note: dati.get('note').trim(),
      creata: new Date().toISOString(),
    };
    if (!coltura.nome || !coltura.dataSemina) return;
    await DB.salva(coltura);
    colture.push(coltura);
    render();
    form.reset();
    form.dataSemina.value = oggiISO();
    toast(`${coltura.nome} aggiunto`);
  });

  async function elimina(c) {
    if (!confirm(`Eliminare "${c.nome}${c.varieta ? ' ' + c.varieta : ''}"?`)) return;
    await DB.elimina(c.id);
    colture = colture.filter((x) => x.id !== c.id);
    render();
    toast('Coltura eliminata');
  }

  // ---------- Promemoria Google Calendar ----------
  function apriPromemoria(c) {
    colturaPromemoria = c;
    const nomeCompleto = c.varieta ? `${c.nome} (${c.varieta})` : c.nome;
    const f = formPromemoria;
    f.titolo.value = `Orto: controllare ${nomeCompleto}`;
    f.data.value = aggiungiGiorni(oggiISO(), 7);
    f.descrizione.value = [
      `Coltura: ${nomeCompleto}`,
      `Seminato il ${formattaData(c.dataSemina)} in ${c.dove}`,
      c.note ? `Note: ${c.note}` : '',
    ].filter(Boolean).join('\n');
    dlg.showModal();
  }

  function urlCalendar({ titolo, data, descrizione }) {
    // Evento di tutto il giorno: la data di fine è esclusiva (giorno dopo).
    const inizio = data.replaceAll('-', '');
    const fine = aggiungiGiorni(data, 1).replaceAll('-', '');
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: titolo,
      dates: `${inizio}/${fine}`,
      details: descrizione,
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  }

  // Apriamo Calendar nello stesso gesto del tocco, altrimenti il browser può bloccare la nuova scheda.
  formPromemoria.addEventListener('submit', (e) => {
    if (e.submitter && e.submitter.value !== 'ok') return;
    e.preventDefault();
    const f = formPromemoria;
    const url = urlCalendar({
      titolo: f.titolo.value.trim(),
      data: f.data.value,
      descrizione: f.descrizione.value,
    });
    colturaPromemoria = null;
    dlg.close();
    window.open(url, '_blank', 'noopener');
  });

  // ---------- Backup ----------
  $('#btn-esporta').addEventListener('click', async () => {
    const dati = { app: 'il-mio-orto', versione: 1, esportato: new Date().toISOString(), colture: await DB.tutte() };
    const blob = new Blob([JSON.stringify(dati, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: `orto-backup-${oggiISO()}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Backup esportato (${dati.colture.length} colture)`);
  });

  $('#btn-importa').addEventListener('click', () => fileImport.click());

  function valida(c) {
    return c && typeof c === 'object'
      && typeof c.nome === 'string' && c.nome.trim()
      && typeof c.dataSemina === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.dataSemina);
  }

  fileImport.addEventListener('change', async () => {
    const file = fileImport.files[0];
    fileImport.value = '';
    if (!file) return;
    let dati;
    try {
      dati = JSON.parse(await file.text());
    } catch {
      toast('File non valido: non è un JSON');
      return;
    }
    const elenco = Array.isArray(dati) ? dati : dati && dati.colture;
    if (!Array.isArray(elenco) || !elenco.every(valida)) {
      toast('File non valido: non è un backup dell\'orto');
      return;
    }
    const msg = colture.length
      ? `Sostituire le ${colture.length} colture attuali con le ${elenco.length} del backup?`
      : `Importare ${elenco.length} colture dal backup?`;
    if (!confirm(msg)) return;
    const pulite = elenco.map((c) => ({
      id: typeof c.id === 'string' && c.id ? c.id : nuovoId(),
      nome: c.nome.trim(),
      varieta: typeof c.varieta === 'string' ? c.varieta : '',
      dataSemina: c.dataSemina,
      dove: c.dove === 'orto' ? 'orto' : 'semenzaio',
      note: typeof c.note === 'string' ? c.note : '',
      creata: typeof c.creata === 'string' ? c.creata : new Date().toISOString(),
    }));
    await DB.sostituisciTutte(pulite);
    await carica();
    toast(`Importate ${pulite.length} colture`);
  });

  // ---------- Avvio ----------
  form.dataSemina.value = oggiISO();
  carica().catch((err) => {
    console.error(err);
    toast('Impossibile aprire il database del browser');
  });

  // Aggiorna i giorni quando l'app torna in primo piano (es. il giorno dopo).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') render();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker non registrato', err));
    });
  }
})();
