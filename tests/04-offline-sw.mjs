// Offline dopo il primo caricamento (3 schermate, immagini, dati) e aggiornamento del service worker.
// Uso: SNAPSHOT=<cartella dell'app> node tests/04-offline-sw.mjs [indirizzo-base]
//  - la parte offline usa l'indirizzo base;
//  - la parte "aggiornamento sw" avvia un suo piccolo server su una COPIA della cartella SNAPSHOT (non modifica l'originale).
import { chromium, BASE, CARTELLA_SCHERMATE as OUT, nuovoContesto, osserva, vai, check, finale, svuotaDati, leggiDb, nota, attendiApp } from './lib.mjs';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';

// Versione dell'app letta da js/versione.js (la cache si chiama orto-<versione>).
const APP_SORGENTE = process.env.SNAPSHOT || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const V0 = 'orto-' + fs.readFileSync(path.join(APP_SORGENTE, 'js/versione.js'), 'utf8').match(/APP_VERSIONE\s*=\s*'([^']+)'/)[1];
const V1 = 'orto-99.0.1';

const browser = await chromium.launch();
const Q = '?oggi=2026-10-30';

// ---------- OFFLINE ----------
{
  const ctx = await nuovoContesto(browser);
  const page = await ctx.newPage();
  const problemi = [];
  osserva(page, problemi);
  await vai(page, 'colture', Q);
  await svuotaDati(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return { stato: r.active?.state, scope: r.scope, script: r.active?.scriptURL }; });
  check('sw: registrato e attivo', sw.stato === 'activated', JSON.stringify(sw));
  await page.reload(); await attendiApp(page); // ora la pagina è controllata dal sw
  check('sw: la pagina è controllata dal service worker', await page.evaluate(() => Boolean(navigator.serviceWorker.controller)));
  const cache = await page.evaluate(async () => { const n = await caches.keys(); const c = await caches.open(n[0]); return { nomi: n, file: (await c.keys()).map((r) => new URL(r.url).pathname) }; });
  check(`cache: una sola cache "${V0}"`, cache.nomi.join() === V0, cache.nomi.join());
  nota(`cache: ${cache.file.length} file`);

  // tutti i file dell'elenco del sw sono in cache?
  const swTesto = await (await fetch(`${BASE}/sw.js`)).text();
  const elenco = [...swTesto.matchAll(/^\s+'\.\/([^']*)',$/gm)].map((m) => m[1]);
  const mancanti = elenco.filter((f) => !cache.file.some((p) => p.endsWith('/' + f) || (f === '' && p.endsWith('/'))));
  check('cache: tutti i file dell\'elenco di sw.js sono in cache', elenco.length > 30 && mancanti.length === 0, `elenco=${elenco.length} mancanti=${mancanti.join(',')}`);

  // il disco ha file non elencati? (immagini/icone dimenticate)
  const disco = process.env.SNAPSHOT;
  if (disco) {
    const tutti = [];
    const giro = (d, rel = '') => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (['.git', '.claude', 'tests', 'docs', 'scripts'].includes(f.name) && rel === '') continue; const r = rel ? `${rel}/${f.name}` : f.name; f.isDirectory() ? giro(path.join(d, f.name), r) : tutti.push(r); } };
    giro(disco);
    const esclusi = /^(README\.md|ROADMAP\.md|BRIEF\.md|CLAUDE\.md|\.nojekyll|sw\.js)$/;
    const nonInCache = tutti.filter((f) => !esclusi.test(f) && !elenco.includes(f));
    check('cache: nessun file dell\'app (assets/icone/js/css/data) fuori dall\'elenco', nonInCache.length === 0, nonInCache.join(','));
  }

  // aggiungo una coltura per ogni scheda + una generica, online
  const colt = ['Fave', 'Aglio', 'Cipolla', 'Piselli', 'Spinaci', 'Pomodoro'];
  for (const n of colt) {
    await page.click('text=+ Nuova coltura');
    await page.fill('dialog input[name=nome]', n);
    await page.click('dialog button[type=submit]');
    await page.waitForSelector('dialog', { state: 'detached' });
  }

  await ctx.setOffline(true);
  const rotte = ['oggi', 'colture', 'impostazioni'];
  for (const r of rotte) {
    await page.goto(`${BASE}/${Q}#/${r}`);
    await page.reload();
    await attendiApp(page);
    const info = await page.evaluate(() => ({
      titolo: document.querySelector('.titolo-schermata')?.textContent.trim(),
      testata: document.querySelector('.testata h1')?.textContent,
      imm: [...document.images].map((i) => ({ src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0 })),
      carte: document.querySelectorAll('.coltura').length,
      stile: getComputedStyle(document.body).backgroundColor,
    }));
    check(`offline ${r}: pagina caricata (titolo "${info.titolo}", testata "${info.testata}")`, Boolean(info.titolo) && info.testata === 'Orto in Tasca', JSON.stringify(info));
    check(`offline ${r}: CSS applicato`, info.stile === 'rgb(255, 246, 227)' || info.stile === 'rgb(28, 22, 17)', info.stile);
    check(`offline ${r}: tutte le immagini visibili (${info.imm.length})`, info.imm.length > 0 && info.imm.every((i) => i.ok), JSON.stringify(info.imm.filter((i) => !i.ok)));
    if (r === 'colture') check('offline colture: le 6 colture ci sono, con icone', info.carte === 6 && info.imm.filter((i) => i.src.includes('assets/colture/')).length === 6, `carte=${info.carte}`);
    await page.screenshot({ path: path.join(OUT, `offline-${r}.png`) });
  }
  // rotta diretta, senza query
  await page.goto(`${BASE}/#/colture`); await attendiApp(page);
  check('offline: apertura dell\'indirizzo nudo (senza ?oggi) funziona', (await page.$$('.coltura')).length === 6);

  // ogni risorsa dell'elenco e ogni immagine di mascotte/icone si carica da cache
  const esiti = await page.evaluate(async (files) => {
    const out = [];
    for (const f of files.filter((x) => x && !x.startsWith('sw'))) {
      try { const r = await fetch(f); out.push([f, r.ok]); } catch { out.push([f, false]); }
    }
    return out;
  }, elenco);
  const ko = esiti.filter(([, ok]) => !ok).map(([f]) => f);
  check(`offline: fetch di tutti i ${esiti.length} file dell'elenco riesce (mascotte, icone, dati, js)`, ko.length === 0, ko.join(','));
  const imm = await page.evaluate(async (files) => Promise.all(files.filter((f) => /\.(svg|png)$/.test(f)).map((f) => new Promise((ok) => { const i = new Image(); i.onload = () => ok([f, i.naturalWidth > 0]); i.onerror = () => ok([f, false]); i.src = f; }))), elenco);
  check(`offline: tutte le ${imm.length} immagini (svg/png) decodificano`, imm.every(([, ok]) => ok), imm.filter(([, o]) => !o).map(([f]) => f).join(','));
  // contenuti agronomici in JSON validi
  const json = await page.evaluate(async (files) => Promise.all(files.filter((f) => f.endsWith('.json')).map(async (f) => { try { await (await fetch(f)).json(); return [f, true]; } catch { return [f, false]; } })), elenco);
  check('offline: tutti i JSON (i18n, data/it, manifest) validi', json.every(([, o]) => o), json.filter(([, o]) => !o).map(([f]) => f).join(','));

  // dati e funzioni offline
  await page.click('text=+ Nuova coltura').catch(() => {});
  await page.fill('dialog input[name=nome]', 'Offline-coltura');
  await page.click('dialog button[type=submit]');
  await page.waitForSelector('dialog', { state: 'detached' });
  check('offline: si può aggiungere una coltura', (await leggiDb(page, 'colture')).some((c) => c.nome === 'Offline-coltura'));
  await ctx.setOffline(false);
  await page.reload(); await attendiApp(page);
  check('di nuovo online: i dati ci sono ancora', (await page.$$('.coltura')).length === 7);
  check('offline: nessun errore in console/richieste fallite oltre a quelle dovute allo stato offline', problemi.filter((p) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(p)).length === 0, problemi.join(' | '));
  if (problemi.length) nota(`voci in console durante la prova offline: ${[...new Set(problemi)].slice(0, 6).join(' | ')}`);
  await ctx.close();
}

// ---------- AGGIORNAMENTO DEL SERVICE WORKER ----------
if (!process.env.SNAPSHOT) {
  nota('SNAPSHOT non impostato: salto la prova di aggiornamento del service worker');
} else {
  const copia = fs.mkdtempSync(path.join(process.env.SCRATCH || os.tmpdir(), 'orto-sw-'));
  fs.cpSync(process.env.SNAPSHOT, copia, { recursive: true, filter: (s) => !s.includes('/.git') });
  const tipi = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
  const server = http.createServer((q, s) => {
    let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(copia, p);
    if (!f.startsWith(copia) || !fs.existsSync(f)) { s.writeHead(404); return s.end('no'); }
    s.writeHead(200, { 'content-type': tipi[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    s.end(fs.readFileSync(f));
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const base2 = `http://127.0.0.1:${server.address().port}`;
  const ctx = await nuovoContesto(browser);
  const page = await ctx.newPage();
  const problemi = [];
  osserva(page, problemi);
  await page.goto(`${base2}/${Q}#/oggi`); await attendiApp(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); await attendiApp(page);
  const prima = await page.evaluate(async () => ({ chiavi: await caches.keys(), slogan: document.querySelector('.testata p').textContent }));
  check(`sw update: stato iniziale = cache ${V0}`, prima.chiavi.join() === V0, prima.chiavi.join());
  // una vecchia cache di una versione ancora precedente (come se il telefono avesse la 1.x)
  await page.evaluate(async () => { const c = await caches.open('il-mio-orto-v1'); await c.put('./vecchio.txt', new Response('vecchio')); });
  // nuova versione: nuovo nome della cache, una frase cambiata e un file nuovo
  let sw = fs.readFileSync(path.join(copia, 'sw.js'), 'utf8').replace(`'${V0}'`, `'${V1}'`).replace("  './js/versione.js',", "  './js/versione.js',\n  './assets/nuovo.svg',");
  fs.writeFileSync(path.join(copia, 'sw.js'), sw);
  fs.writeFileSync(path.join(copia, 'assets/nuovo.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
  const it = JSON.parse(fs.readFileSync(path.join(copia, 'i18n/it.json'), 'utf8')); it['app.slogan'] = 'Slogan NUOVO v99';
  fs.writeFileSync(path.join(copia, 'i18n/it.json'), JSON.stringify(it, null, 2));
  await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; await r.update(); });
  for (let i = 0; i < 40; i++) { if ((await page.evaluate(async (v) => (await caches.keys()).includes(v), V1))) break; await page.waitForTimeout(250); }
  for (let i = 0; i < 40; i++) { if ((await page.evaluate(async () => (await caches.keys()).join())) === V1) break; await page.waitForTimeout(250); } // l'activate cancella le vecchie
  await page.waitForTimeout(300);
  const dopo = await page.evaluate(async (v) => {
    const chiavi = await caches.keys();
    const nuovo = chiavi.includes(v) ? (await (await caches.open(v)).keys()).map((r) => new URL(r.url).pathname) : [];
    return { chiavi, nuovo };
  }, V1);
  check(`sw update: la nuova cache ${V1} esiste`, dopo.chiavi.includes(V1), dopo.chiavi.join());
  check(`sw update: la vecchia cache ${V0} è stata cancellata`, !dopo.chiavi.includes(V0), dopo.chiavi.join());
  check('sw update: cancellate anche le cache non sue (il-mio-orto-v1)', !dopo.chiavi.includes('il-mio-orto-v1'), dopo.chiavi.join());
  check('sw update: il file nuovo (nuovo.svg) è nella nuova cache', dopo.nuovo.some((p) => p.endsWith('/assets/nuovo.svg')), `${dopo.nuovo.length} file`);
  await page.reload(); await attendiApp(page);
  nota('cache dopo il ricaricamento: ' + (await page.evaluate(async () => (await caches.keys()).join(', '))));
  const slogan = await page.$eval('.testata p', (e) => e.textContent);
  check('sw update: dopo il ricaricamento arriva la frase nuova', slogan === 'Slogan NUOVO v99', `prima="${prima.slogan}" dopo="${slogan}"`);
  await ctx.setOffline(true);
  await page.reload(); await attendiApp(page);
  check('sw update: offline funziona con la cache nuova', (await page.$eval('.testata p', (e) => e.textContent)) === 'Slogan NUOVO v99');
  await ctx.setOffline(false);
  check('sw update: nessun errore in console', problemi.filter((p) => !/ERR_INTERNET_DISCONNECTED/.test(p)).length === 0, problemi.join(' | '));
  await ctx.close();
  server.close();
  fs.rmSync(copia, { recursive: true, force: true });
}

await browser.close();
process.exit(finale() ? 1 : 0);
