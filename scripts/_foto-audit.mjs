import { chromium, nuovoContesto, vai } from '../tests/lib.mjs';
const b = await chromium.launch(); const ctx = await nuovoContesto(b, { serviceWorkers: 'block' }); const page = await ctx.newPage();
await vai(page, 'oggi', '?oggi=2026-11-02');
await page.evaluate(() => new Promise((ok) => { const r = indexedDB.open('orto'); r.onsuccess = () => { const d = r.result; const tx = d.transaction('colture', 'readwrite'); const s = tx.objectStore('colture');
  const c = (id, nome, sch, data, p) => s.put({ id, nome, varieta: '', dataSemina: data, dove: 'orto', partenza: p, note: '', creata: data + 'T08:00:00.000Z', schedaId: sch, zonaId: null, schemaVersion: 2 });
  c('a', 'Basilico', 'basilico', '2026-11-02', 'piantina'); c('b', 'Pomodori', 'pomodori', '2026-06-01', 'piantina'); c('c', 'Fave', 'fave', '2026-10-20', 'seme'); c('d', 'Prezzemolo', 'prezzemolo', '2026-09-10', 'piantina');
  tx.oncomplete = () => { d.close(); ok(); }; }; }));
for (const r of ['oggi', 'colture', 'pianta?id=b', 'dottore', 'impara']) {
  await page.goto(`http://localhost:8101/?oggi=2026-11-02#/${r}`); await page.reload(); await page.waitForTimeout(900);
  await page.screenshot({ path: `C:/Users/pcgameluigi/audit/${r.split('?')[0]}.png`, fullPage: true });
}
await b.close();
