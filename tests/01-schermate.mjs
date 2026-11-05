// Schermate Oggi, Colture, Impostazioni in tema chiaro e scuro: screenshot, console, scroll orizzontale, bersagli di tocco.
// Uso: node tests/01-schermate.mjs [indirizzo-base]   (oppure BASE=...)
import { chromium, BASE, CARTELLA_SCHERMATE as OUT, nuovoContesto, osserva, vai, scroll, bersagli, check, finale, svuotaDati, nota } from './lib.mjs';
import path from 'node:path';

const browser = await chromium.launch();
const ROTTE = ['oggi', 'calendario', 'colture', 'impostazioni', 'zone', 'diario'];

for (const tema of ['light', 'dark']) {
  const ctx = await nuovoContesto(browser, { colorScheme: tema });
  const page = await ctx.newPage();
  const problemi = [];
  osserva(page, problemi);
  page.on('dialog', (d) => d.accept());
  await vai(page, 'oggi', '?oggi=2026-10-30');
  await svuotaDati(page);

  const snap = async (nome, opzioni = {}) => page.screenshot({ path: path.join(OUT, `${nome}-${tema}.png`), ...opzioni });

  // A) archivio vuoto
  for (const r of ROTTE) {
    await vai(page, r, '?oggi=2026-10-30');
    await snap(`${r}-vuoto`, { fullPage: true });
    const s = await scroll(page);
    check(`[${tema}] ${r} (vuoto): nessuno scroll orizzontale`, s.sw <= s.iw && s.bw <= s.iw, JSON.stringify(s));
    const b = await bersagli(page);
    const piccoli = b.filter((x) => x.h < 44);
    const btnBassi = b.filter((x) => /(^| )btn( |$)/.test(x.cls) && x.h < (/piccolo/.test(x.cls) ? 44 : 56));
    check(`[${tema}] ${r} (vuoto): bersagli >= 44 px`, piccoli.length === 0, JSON.stringify(piccoli));
    check(`[${tema}] ${r} (vuoto): pulsanti .btn >= 56 px`, btnBassi.length === 0, JSON.stringify(btnBassi));
    const barra = b.filter((x) => x.tag === 'a' && !x.cls);
    check(`[${tema}] ${r}: barra in basso con 5 voci e >= 56 px`, barra.length === 5 && barra.every((x) => x.h >= 56), JSON.stringify(barra));
    // Un figlio vuoto passato a append() scrive la parola Â«nullÂ» nella pagina: mai nel testo visibile.
    const testo = await page.locator('#schermata').innerText();
    check(`[${tema}] ${r} (vuoto): niente Â«nullÂ» nÃ© Â«undefinedÂ» nel testo`, !/\b(null|undefined|NaN)\b/.test(testo), testo.slice(0, 120));
  }

  // B) con colture, anche una con testi lunghissimi
  const colt = [
    ['Fave', 'Aguadulce', '2026-10-20', 'orto', 'Dopo il pomodoro'],
    ['Aglio', '', '2026-10-28', 'orto', ''],
    ['Cipolla', 'Rossa di Tropea', '2026-11-05', 'semenzaio', '3 semi per vasetto'],
    ['Piselli', '', '2026-09-01', 'orto', ''],
    ['Spinaci', '', '2026-10-30', 'semenzaio', ''],
    ['Pomodoro', 'Cuore di bue', '2026-10-01', 'semenzaio', ''],
    ['Superlungonomedicolturachenonvaamcapomai'.repeat(1), 'Varietaextralungasenzaspazibuonaperprovarelarottura', '2026-10-29', 'orto', 'Nota molto lunga senza spazi: ' + 'x'.repeat(80) + ' e poi una frase normale lunga abbastanza per andare a capo piÃ¹ volte nella carta.'],
  ];
  await vai(page, 'colture', '?oggi=2026-10-30');
  for (const [nome, varieta, data, dove, note] of colt) {
    await page.click('button.colture-nuova-fissa');
    await page.fill('dialog input[name=nome]', nome);
    await page.fill('dialog input[name=varieta]', varieta);
    await page.fill('dialog input[name=dataSemina]', data);
    await page.check(`dialog input[name=dove][value=${dove}]`);
    await page.fill('dialog textarea[name=note]', note);
    if (nome === 'Fave') {
      await snap('foglio-nuova-coltura'); // foglio compilato
      const b = await bersagli(page);
      check(`[${tema}] foglio nuova coltura: bersagli >= 44 px`, b.every((x) => x.h >= 44), JSON.stringify(b.filter((x) => x.h < 44)));
      check(`[${tema}] foglio nuova coltura: .btn >= 56 px`, b.filter((x) => /(^| )btn( |$)/.test(x.cls)).every((x) => x.h >= 56), JSON.stringify(b.filter((x) => /btn/.test(x.cls))));
      const s = await scroll(page);
      check(`[${tema}] foglio nuova coltura: nessuno scroll orizzontale`, s.sw <= s.iw, JSON.stringify(s));
    }
    await page.click('dialog button[type=submit]');
    await page.waitForSelector('dialog', { state: 'detached' });
  }
  await page.waitForTimeout(3400); // lascia sparire il toast (dura 3 s)
  await snap('colture-piene', { fullPage: true });
  const s2 = await scroll(page);
  check(`[${tema}] colture (7, con nome lunghissimo): nessuno scroll orizzontale`, s2.sw <= s2.iw && s2.bw <= s2.iw, JSON.stringify(s2));
  const b2 = await bersagli(page);
  check(`[${tema}] colture piene: bersagli >= 44 px`, b2.every((x) => x.h >= 44), JSON.stringify(b2.filter((x) => x.h < 44)));
  check(`[${tema}] colture piene: .btn >= 56 px`, b2.filter((x) => /(^| )btn( |$)/.test(x.cls)).every((x) => x.h >= 56), JSON.stringify(b2.filter((x) => /(^| )btn( |$)/.test(x.cls) && x.h < 56)));
  // testo tagliato/overflow dentro le carte
  const sbordi = await page.evaluate(() => [...document.querySelectorAll('.coltura *')].filter((e) => {
    const c = e.closest('.coltura').getBoundingClientRect(); const r = e.getBoundingClientRect();
    return r.width && (r.right > c.right + 1 || r.left < c.left - 1);
  }).map((e) => e.tagName + '.' + e.className + ' ' + (e.textContent || '').slice(0, 30)));
  check(`[${tema}] colture: nessun elemento sborda dalla carta`, sbordi.length === 0, sbordi.join(' | '));
  const icone = await page.$$eval('.icona-coltura', (is) => is.map((i) => ({ src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0 })));
  check(`[${tema}] colture: tutte le icone caricate`, icone.length === 7 && icone.every((i) => i.ok), JSON.stringify(icone));

  // Oggi con dati
  await vai(page, 'oggi', '?oggi=2026-10-30');
  await snap('oggi-con-dati', { fullPage: true });
  const imm = await page.$$eval('img', (is) => is.map((i) => ({ src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0 })));
  check(`[${tema}] oggi: tutte le immagini caricate`, imm.every((i) => i.ok), JSON.stringify(imm));
  const s3 = await scroll(page);
  check(`[${tema}] oggi con dati: nessuno scroll orizzontale`, s3.sw <= s3.iw, JSON.stringify(s3));

  // Foglio promemoria
  await vai(page, 'colture', '?oggi=2026-10-30');
  await page.click('text=Aggiungi promemoria >> nth=0');
  await snap('foglio-promemoria');
  const b4 = await bersagli(page);
  check(`[${tema}] foglio promemoria: bersagli >= 44 e .btn >= 56`, b4.every((x) => x.h >= 44) && b4.filter((x) => /(^| )btn( |$)/.test(x.cls)).every((x) => x.h >= 56), JSON.stringify(b4.filter((x) => x.h < 56)));
  await page.keyboard.press('Escape');

  // Impostazioni con IA compilata (solo per lo screenshot)
  await vai(page, 'impostazioni', '?oggi=2026-10-30');
  await snap('impostazioni-pieno', { fullPage: true });

  // Tema applicato davvero?
  const sfondo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  nota(`[${tema}] sfondo body = ${sfondo}`);
  check(`[${tema}] il tema cambia lo sfondo`, tema === 'light' ? sfondo === 'rgb(255, 246, 227)' : sfondo === 'rgb(28, 22, 17)', sfondo);

  check(`[${tema}] nessun errore/avviso in console, nessuna richiesta fallita`, problemi.length === 0, problemi.join(' | '));
  await ctx.close();
}
await browser.close();
process.exit(finale() ? 1 : 0);
