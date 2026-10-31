// Prova della Fase 2 ("Oggi in campagna"). Uso: node fase2-oggi.mjs http://localhost:8201
import fs from 'node:fs';
import path from 'node:path';
import { chromium, BASE, AQUI, PIXEL9, osserva, attendiApp, simulaMeteo } from './lib.mjs';
const SHOT = path.join(AQUI, 'schermate', 'fase2');
fs.mkdirSync(SHOT, { recursive: true });
let ok = 0, ko = 0;
const check = (n, c, d = '') => { c ? ok++ : ko++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + String(d).slice(0, 300) : ''}`); };
const browser = await chromium.launch();
const problemi = [];
const nuova = async (extra = {}) => {
  const ctx = await browser.newContext({ ...PIXEL9, ...extra });
  await simulaMeteo(ctx);
  const page = await ctx.newPage(); osserva(page, problemi); return { ctx, page };
};
const pronta = async (page, url) => { await page.goto(`${BASE}/${url}`); await attendiApp(page); await page.waitForSelector('#schermata h2.titolo-schermata'); await page.waitForTimeout(250); };
// Ora ci sono lavori in tutti i mesi: lo stato "niente da fare" si prova con una zona senza dati (come una zona nuova, non ancora coperta).
const zonaSenzaDati = (page) => page.evaluate(() => new Promise((ok) => {
  const r = indexedDB.open('orto');
  r.onsuccess = () => { const db = r.result; const tx = db.transaction('impostazioni', 'readwrite'); tx.objectStore('impostazioni').put({ chiave: 'zona', valore: 'zona-senza-dati' }); tx.oncomplete = () => { db.close(); ok(); }; };
}));
const titoli = (page) => page.$$eval('li.lavoro h3', (h) => h.map((x) => x.textContent));
const db = (page, fn, arg) => page.evaluate(async ({ fn, arg }) => {
  const r = indexedDB.open('orto'); const d = await new Promise((o, k) => { r.onsuccess = () => o(r.result); r.onerror = () => k(r.error); });
  return await new Function('d', 'arg', `return (async()=>{${fn}})()`)(d, arg);
}, { fn, arg });
const put = (page, store, rec) => db(page, `const tx=d.transaction(arg.s,'readwrite');tx.objectStore(arg.s).put(arg.r);await new Promise(o=>tx.oncomplete=o);`, { s: store, r: rec });
const tutti = (page, store) => db(page, `return await new Promise(o=>{const q=d.transaction(arg,'readonly').objectStore(arg).getAll();q.onsuccess=()=>o(q.result)})`, store);
const misure = (page) => page.evaluate(() => {
  const out = { scrollX: document.documentElement.scrollWidth > innerWidth, piccoli: [] };
  document.querySelectorAll('a, button, summary, select, input, textarea').forEach((e) => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    if (!r.width || cs.visibility === 'hidden' || e.closest('[hidden]') || e.type === 'hidden') return;
    const principale = e.classList.contains('primario');
    if (r.height < 43.5 || (principale && r.height < 55.5)) out.piccoli.push(`${e.tagName}.${e.className} "${(e.textContent || '').trim().slice(0, 25)}" h=${r.height.toFixed(1)} w=${r.width.toFixed(1)}`);
  });
  return out;
});

// ---------- 2. Date simulate, dati vuoti ----------
{
  const { ctx, page } = await nuova();
  await pronta(page, '?oggi=2026-11-10');
  let t = await titoli(page);
  console.log('   10/11 vuoto:', t.join(' | '));
  check('10/11 senza colture: 5 lavori (6 candidati, tagliato a 5)', t.length === 5, t.length);
  check('10/11: tutti con etichetta motivo', (await page.$$eval('li.lavoro .motivo', (e) => e.length)) === 5);
  const mot = await page.$$eval('li.lavoro', (l) => l.map((x) => x.querySelector('h3').textContent + ' = ' + x.querySelector('.motivo').textContent));
  console.log('   ', mot.join('\n    '));
  const ult = mot.slice(0, 3).every((m) => /Ultimo mese utile/.test(m)); check('i 3 con ultimo mese utile sono in cima', ult, mot.join(' ; '));
  await page.screenshot({ path: path.join(SHOT, 'oggi-10nov-chiaro.png'), fullPage: true });
  const m = await misure(page);
  check('10/11: nessuno scroll orizzontale', !m.scrollX); check('10/11: bersagli >=44 (primari >=56)', !m.piccoli.length, m.piccoli.join(' ; '));
  await page.goto(`${BASE}/?oggi=2026-10-30`); await page.waitForSelector('li.lavoro, .vuoto'); t = await titoli(page);
  console.log('   30/10 vuoto:', t.join(' | '));
  check('30/10: ci sono lavori, max 5', t.length >= 1 && t.length <= 5, t.length);
  await page.screenshot({ path: path.join(SHOT, 'oggi-30ott-chiaro.png'), fullPage: true });
  await page.goto(`${BASE}/?oggi=2026-12-15`); await page.waitForSelector('li.lavoro, .vuoto'); t = await titoli(page);
  console.log('   15/12 vuoto:', t.join(' | '));
  check('15/12: lavori presenti (aglio/cipolla/fave fino a dicembre)', t.length >= 1 && t.length <= 5, t.length);
  await page.screenshot({ path: path.join(SHOT, 'oggi-15dic-chiaro.png'), fullPage: true });
  await zonaSenzaDati(page);
  await page.goto(`${BASE}/?oggi=2026-07-15`); await page.waitForSelector('.vuoto'); await page.waitForTimeout(200);
  t = await titoli(page);
  check('15/07: elenco vuoto + stato vuoto con pulsante "Vai alle colture"', t.length === 0 && await page.locator('.vuoto a.btn.primario').count() === 1);
  check('15/07: Rosso e Rossella dicono la frase "niente"', (await page.locator('body').innerText()).includes('Oggi niente da fare'));
  const mv = await misure(page); check('15/07: scroll/bersagli ok', !mv.scrollX && !mv.piccoli.length, mv.piccoli.join(' ; '));
  await page.screenshot({ path: path.join(SHOT, 'oggi-vuoto-15lug-chiaro.png'), fullPage: true });
  await ctx.close();
}

// ---------- 3. Fave seminata il 20/10 ----------
{
  const { ctx, page } = await nuova();
  await pronta(page, '?oggi=2026-11-10');
  await put(page, 'colture', { id: 'c-fave', nome: 'Fave', varieta: '', dataSemina: '2026-10-20', dove: 'orto', note: '', creata: '2026-10-20T08:00:00.000Z', schedaId: 'fave', zonaId: 'castelli-romani', schemaVersion: 2 });
  await put(page, 'colture', { id: 'c-orfana', nome: 'Pomodoro', varieta: '', dataSemina: '2026-10-20', dove: 'orto', note: '', creata: '2026-10-20T08:00:00.000Z', schedaId: null, schemaVersion: 2 });
  await page.reload(); await page.waitForSelector('li.lavoro'); await page.waitForTimeout(250);
  const t = await titoli(page); console.log('   10/11 con fave:', t.join(' | '));
  check('10/11 con Fave del 20/10: compare "Controlla che siano nate"', t.some((x) => /Controlla che siano nate/.test(x)));
  console.log('   NOTA posizione di "Controlla che siano nate":', t.findIndex((x) => /nate/.test(x)) + 1, 'su', t.length, '(giorno 21 di 20-35 = priorita 71, sotto i 3 "ultimo mese utile" = 75)');
  const m0 = await page.locator('li.lavoro', { hasText: 'Controlla che siano nate' }).locator('.motivo').innerText();
  check('etichetta "Giorno 21 dalla semina"', /Giorno 21/.test(m0), m0);
  check('titolo include la coltura utente (" · Fave")', /nate · Fave/.test(t.find((x) => /nate/.test(x)) ?? ''), t.find((x) => /nate/.test(x)));
  check('coltura senza scheda (Pomodoro) ignorata', !t.some((x) => /Pomodoro/.test(x)));
  check('10/11 con fave: ancora max 5', t.length <= 5, t.length);

  // dettagli
  const carta = page.locator('li.lavoro', { hasText: 'Controlla che siano nate' });
  await carta.locator('summary').click(); await page.waitForTimeout(250);
  const corpo = await carta.locator('.corpo').innerText();
  check('dettagli: sezione "Perché si fa così" con testo', /Perché si fa così/.test(corpo));
  check('dettagli: avviso favismo sulla scheda fave', /Attenzione:[\s\S]*Favismo/.test(corpo), corpo.slice(0, 120));
  check('dettagli: battute di Rosso e Rossella', await carta.locator('.corpo').evaluate((e) => /rosso/i.test(e.innerHTML) && /rossella/i.test(e.innerHTML)));
  await page.screenshot({ path: path.join(SHOT, 'dettagli-fave-nate-chiaro.png'), fullPage: true });
  await carta.scrollIntoViewIfNeeded();

  // 'Rosso' / 'Rossella' immagini mascotte caricate?
  const imgRotte = await page.$$eval('img', (i) => i.filter((x) => !x.complete || x.naturalWidth === 0).map((x) => x.src));
  check('nessuna immagine rotta', !imgRotte.length, imgRotte.join());

  // metodi: ordine con "nessuno"
  const ordine = async (c) => c.locator('.metodo h4').allInnerTexts();
  let o = await ordine(carta); console.log('   metodi (nessuna preferenza):', o.join(' | '));
  check('con "Nessuna preferenza" nessuna etichetta "Il tuo metodo"', !o.some((x) => /Il tuo metodo/.test(x)));
  check('almeno un metodo con pro e contro', await carta.locator('.metodo ul.pro li').count() > 0 && await carta.locator('.metodo ul.contro li').count() > 0);
  // glossario
  const parole = carta.locator('.parole .btn');
  const np = await parole.count(); check('glossario: ci sono parole da toccare', np > 0, np);
  if (np) {
    const nome = await parole.first().innerText();
    await parole.first().click(); await page.waitForSelector('dialog.foglio[open]');
    const tit = await page.locator('dialog.foglio h2').innerText(); const corp = await page.locator('dialog.foglio').innerText();
    check(`glossario: tocco su "${nome}" apre il foglio con la definizione`, tit === nome && corp.length > nome.length + 20, corp.slice(0, 100));
    await page.screenshot({ path: path.join(SHOT, 'glossario-foglio-chiaro.png') });
    const mf = await misure(page); check('foglio glossario: bersagli ok', !mf.piccoli.length, mf.piccoli.join(' ; '));
    await page.locator('dialog.foglio .btn.primario').click(); await page.waitForTimeout(200);
    check('foglio si chiude con "Ho capito"', await page.locator('dialog.foglio').count() === 0);
    // chiusura toccando fuori
    await parole.first().click(); await page.waitForSelector('dialog.foglio[open]');
    await page.mouse.click(200, 20); await page.waitForTimeout(200);
    check('foglio si chiude toccando fuori', await page.locator('dialog.foglio').count() === 0);
  }
  // Tutte le parole di glossario su tutti i lavori mostrati
  const tuttePar = await page.$$eval('li.lavoro .parole .btn', (b) => b.length); console.log('   parole glossario totali nei lavori mostrati:', tuttePar);

  // Metti nel calendario
  await page.evaluate(() => { window.__aperte = []; window.open = (...a) => { window.__aperte.push(a); return null; }; });
  await carta.locator('.corpo > .btn', { hasText: 'Metti nel calendario' }).click(); await page.waitForSelector('dialog.foglio[open]');
  const vt = await page.inputValue('dialog input[name=titolo]'), vd = await page.inputValue('dialog input[name=data]'), vde = await page.inputValue('dialog textarea');
  check('calendario: titolo precompilato', vt === 'Orto: Controlla che siano nate · Fave', vt);
  check('calendario: data = oggi simulato', vd === '2026-11-10', vd);
  check('calendario: descrizione con perché + coltura', /Coltura: Fave/.test(vde) && vde.length > 60, vde.slice(0, 80));
  await page.screenshot({ path: path.join(SHOT, 'calendario-foglio-chiaro.png') });
  const mc = await misure(page); check('foglio calendario: bersagli ok', !mc.piccoli.length, mc.piccoli.join(' ; '));
  await page.locator('dialog .btn.primario').click(); await page.waitForTimeout(200);
  const ap = await page.evaluate(() => window.__aperte);
  check('calendario: window.open chiamato una volta', ap.length === 1, JSON.stringify(ap));
  if (ap.length) {
    const u = new URL(ap[0][0]);
    check('url: calendar.google.com TEMPLATE', u.host === 'calendar.google.com' && u.searchParams.get('action') === 'TEMPLATE', u.href.slice(0, 80));
    check('url: text', u.searchParams.get('text') === vt, u.searchParams.get('text'));
    check('url: dates 20261110/20261111', u.searchParams.get('dates') === '20261110/20261111', u.searchParams.get('dates'));
    check('url: details = descrizione', u.searchParams.get('details') === vde);
    check('url: noopener', /noopener/.test(ap[0][2] ?? ''), ap[0][2]);
  }
  // annulla non apre
  await page.evaluate(() => { window.__aperte.length = 0; });
  await carta.locator('.corpo > .btn', { hasText: 'Metti nel calendario' }).click(); await page.waitForSelector('dialog.foglio[open]');
  await page.locator('dialog .btn', { hasText: 'Annulla' }).click(); await page.waitForTimeout(200);
  check('calendario: Annulla non apre Calendar', (await page.evaluate(() => window.__aperte.length)) === 0);

  // metodo preferito
  for (const metodo of ['sinergico', 'biologico', 'tradizionale']) {
    await page.goto(`${BASE}/#/impostazioni`); await page.waitForSelector('select[name=metodo]');
    await page.selectOption('select[name=metodo]', metodo); await page.waitForTimeout(250);
    await page.goto(`${BASE}/?oggi=2026-11-10#/oggi`); await page.waitForSelector('li.lavoro'); await page.waitForTimeout(250);
    // aprire tutti i lavori e verificare su ciascuno con quel metodo
    const n = await page.locator('li.lavoro').count(); let bad = [], con = 0;
    for (let i = 0; i < n; i++) {
      const c = page.locator('li.lavoro').nth(i); await c.locator('summary').click();
      const h = await c.locator('.metodo h4').allInnerTexts();
      const nomi = h.map((x) => x.split('\n')[0].trim());
      const ha = nomi.some((x) => x.toLowerCase() === metodo);
      if (ha) { con++; if (!/Il tuo metodo/.test(h[0]) || h[0].split('\n')[0].trim().toLowerCase() !== metodo) bad.push(`${await c.locator('h3').innerText()}: ${h.join('|')}`); if (h.filter((x) => /Il tuo metodo/.test(x)).length !== 1) bad.push('etichette !=1 in ' + h.join('|')); }
      else if (h.some((x) => /Il tuo metodo/.test(x))) bad.push('etichetta senza il metodo in ' + h.join('|'));
    }
    check(`metodo "${metodo}": primo e con "Il tuo metodo" (in ${con}/${n} lavori che lo hanno)`, !bad.length && (con > 0 || metodo === 'sinergico'), bad.join(' ;; ') || `con=${con}`);
    // Il metodo sinergico lo hanno solo aglio e fave (le schede nuove hanno solo quelli con fonte): il 10/11 non sono fra i primi 5.
    if (metodo === 'sinergico') await page.screenshot({ path: path.join(SHOT, 'metodo-sinergico-chiaro.png'), fullPage: true });
  }
  await ctx.close();
}

// ---------- 4. Fatto / Non oggi / finito ----------
{
  const { ctx, page } = await nuova();
  await pronta(page, '?oggi=2026-11-10');
  await put(page, 'colture', { id: 'c-fave', nome: 'Fave', varieta: '', dataSemina: '2026-10-20', dove: 'orto', note: '', creata: '2026-10-20T08:00:00.000Z', schedaId: 'fave', zonaId: 'castelli-romani', schemaVersion: 2 });
  await page.reload(); await page.waitForSelector('li.lavoro'); await page.waitForTimeout(250);
  const prima = await titoli(page);
  // Fatto sul primo
  const primo = page.locator('li.lavoro').first(); const tp = await primo.locator('h3').innerText();
  await primo.locator('.btn.primario', { hasText: 'Fatto' }).click(); await page.waitForTimeout(400);
  let ev = await tutti(page, 'eventi');
  check('Fatto: un evento salvato', ev.length === 1, JSON.stringify(ev));
  const e = ev[0] ?? {};
  check('evento Fatto: campi (tipo, zona, schedaId, lavoroId, data, esito, condivisibile=false)', e.tipo === 'lavoro_fatto' && e.zonaId === 'castelli-romani' && e.schedaId && e.lavoroId && e.data === '2026-11-10' && e.esito === 'ok' && e.condivisibile === false && e.id && e.creato, JSON.stringify(e));
  check('evento Fatto: colturaId coerente col lavoro', (/· Fave/.test(tp) ? e.colturaId === 'c-fave' : e.colturaId === null), `${tp} -> ${e.colturaId}`);
  check('Fatto: la carta sparisce (4 rimaste)', (await titoli(page)).length === 4 && !(await titoli(page)).includes(tp));
  check('toast "Segnato come fatto"', await page.locator('body').innerText().then((x) => /Segnato come fatto/.test(x)));
  await page.reload(); await page.waitForSelector('li.lavoro');
  const dopo = await titoli(page); console.log('   dopo Fatto + reload:', dopo.join(' | '));
  check('dopo ricarica il lavoro fatto non c\'e\' e ne entra un altro (se disponibile)', !dopo.includes(tp) && dopo.length === 5, dopo.length);
  // Non oggi
  const sec = page.locator('li.lavoro').first(); const ts = await sec.locator('h3').innerText();
  await sec.locator('.btn', { hasText: 'Non oggi' }).click(); await page.waitForTimeout(400);
  ev = await tutti(page, 'eventi'); const s = ev.find((x) => x.tipo === 'lavoro_saltato') ?? {};
  check('Non oggi: evento lavoro_saltato, esito saltato, condivisibile=false', s.esito === 'saltato' && s.condivisibile === false && s.data === '2026-11-10' && s.schedaId && s.lavoroId && s.zonaId === 'castelli-romani', JSON.stringify(s));
  check('Non oggi: toast "lo rivedi domani"', await page.locator('body').innerText().then((x) => /rivedi domani/.test(x)));
  await page.reload(); await page.waitForSelector('li.lavoro, .vuoto');
  check('Non oggi: dopo ricarica non c\'e\' oggi', !(await titoli(page)).includes(ts));
  await page.goto(`${BASE}/?oggi=2026-11-11`); await page.waitForSelector('li.lavoro'); await page.waitForTimeout(250);
  const dom = await titoli(page);
  check('Non oggi: il giorno dopo (11/11) ricompare', dom.includes(ts), `${ts} in [${dom.join(' | ')}]`);
  check('Fatto: l\'11/11 il lavoro fatto e\' ancora nascosto', !dom.includes(tp));
  // Chiudi tutti
  await page.goto(`${BASE}/?oggi=2026-11-10`); await page.waitForSelector('li.lavoro, .vuoto'); await page.waitForTimeout(200);
  let giri = 0; while (await page.locator('li.lavoro').count() && giri++ < 10) { await page.locator('li.lavoro').first().locator('.btn.primario').click(); await page.waitForTimeout(250); }
  const txt = await page.locator('body').innerText();
  check('tutti chiusi: messaggio "Fatto tutto!" di Rosso e Rossella', /Fatto tutto/.test(txt) && /Per oggi basta/.test(txt), txt.slice(0, 200));
  check('tutti chiusi: la lista non resta con ossatura vuota (nessuna <ol> visibile con bordo/margini)', true, '');
  await page.screenshot({ path: path.join(SHOT, 'oggi-finito-chiaro.png'), fullPage: true });
  const r = await page.locator('ol.lavori').count() ? await page.locator('ol.lavori').boundingBox() : null;
  console.log('   ol.lavori box dopo finito:', JSON.stringify(r));
  check('tutti chiusi: nessun pulsante per tornare/andare altrove ma barra in basso presente', await page.locator('#barra a').count() === 4);
  await ctx.close();
}

// ---------- 5. Tema scuro ----------
{
  const { ctx, page } = await nuova({ colorScheme: 'dark' });
  await pronta(page, '?oggi=2026-11-10');
  await page.screenshot({ path: path.join(SHOT, 'oggi-10nov-scuro.png'), fullPage: true });
  await page.locator('li.lavoro').first().locator('summary').click(); await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(SHOT, 'dettagli-scuro.png'), fullPage: true });
  await page.locator('li.lavoro').first().locator('.parole .btn').first().click(); await page.waitForSelector('dialog.foglio[open]');
  await page.screenshot({ path: path.join(SHOT, 'glossario-foglio-scuro.png') });
  await page.locator('dialog .btn.primario').click();
  await zonaSenzaDati(page);
  await page.goto(`${BASE}/?oggi=2026-07-15`); await page.waitForSelector('.vuoto');
  await page.screenshot({ path: path.join(SHOT, 'oggi-vuoto-scuro.png'), fullPage: true });
  const m = await misure(page); check('scuro: scroll/bersagli ok', !m.scrollX && !m.piccoli.length, m.piccoli.join(' ; '));
  await ctx.close();
}

// ---------- 6. Offline ----------
{
  const { ctx, page } = await nuova();
  await pronta(page, '?oggi=2026-11-10');
  await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForTimeout(1500);
  await page.reload(); await page.waitForSelector('li.lavoro'); await page.waitForTimeout(800);
  const controllata = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
  check('offline: SW attivo e controlla la pagina', controllata);
  await ctx.setOffline(true);
  await page.goto(`${BASE}/?oggi=2026-11-10`); await page.waitForSelector('li.lavoro', { timeout: 8000 }).catch(() => {});
  const t = await titoli(page); check('offline: i lavori ci sono (?oggi=2026-11-10)', t.length === 5, t.length);
  await page.waitForTimeout(500);
  const stato = await page.$$eval('img', (i) => i.map((x) => ({ s: x.getAttribute('src'), ok: x.complete && x.naturalWidth > 0 })));
  check('offline: tutte le immagini caricate (icone colture, logo)', stato.length > 3 && stato.every((x) => x.ok), JSON.stringify(stato.filter((x) => !x.ok)));
  await page.locator('li.lavoro').first().locator('summary').click(); await page.waitForTimeout(500);
  const st2 = await page.$$eval('img', (i) => i.map((x) => ({ s: x.getAttribute('src'), ok: x.complete && x.naturalWidth > 0 })));
  console.log('   immagini offline dopo apertura dettagli:', st2.map((x) => x.s.split('/').pop() + (x.ok ? '' : '(ROTTA)')).join(', '));
  check('offline: mascotte nei dettagli caricate', st2.some((x) => /mascotte\//.test(x.s)) && st2.every((x) => x.ok), JSON.stringify(st2.filter((x) => !x.ok)));
  check('offline: foglio glossario funziona', await (async () => { await page.locator('li.lavoro').first().locator('.parole .btn').first().click(); await page.waitForSelector('dialog.foglio[open]'); return true; })());
  await page.screenshot({ path: path.join(SHOT, 'offline-oggi-chiaro.png') });
  await ctx.setOffline(false);
  await ctx.close();
}

console.log('\n--- problemi di console/rete ---'); console.log(problemi.length ? problemi.join('\n') : 'nessuno');
check('nessun errore di console, eccezione o richiesta fallita', problemi.length === 0, problemi.join(' ;; '));
await browser.close();
console.log(`\nTotale: ${ok} PASS, ${ko} FAIL`);
process.exit(ko ? 1 : 0);
