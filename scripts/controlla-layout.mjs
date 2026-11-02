// Controlla ogni schermata a 360 px: scroll orizzontale, colonne strette, pulsanti piccoli. Serve il server su 8101.
import { chromium, nuovoContesto } from '../tests/lib.mjs';
const b = await chromium.launch(); const ctx = await nuovoContesto(b, { serviceWorkers: 'block' }); const page = await ctx.newPage();
await page.setViewportSize({ width: 360, height: 780 });
const rotte = ['oggi','colture','dottore','calendario','impara','impostazioni','piano','semi','eccesso','vermi','diario','zone','animali','rendita','alberi','cucina','quiz','raccolto','storia'];
for (const r of rotte) {
  await page.goto(`http://localhost:8101/#/${r}?oggi=2026-11-02`); await page.reload(); await page.waitForTimeout(700);
  const res = await page.evaluate(() => {
    const W = document.documentElement.clientWidth; const out = [];
    if (document.documentElement.scrollWidth > W + 1) out.push('SCROLL-ORIZZ ' + document.documentElement.scrollWidth);
    for (const e of document.querySelectorAll('main *')) {
      const r = e.getBoundingClientRect(); if (!r.width) continue;
      if (r.right > W + 2 && getComputedStyle(e).position !== 'fixed') out.push('FUORI ' + e.tagName + '.' + e.className + ' ' + Math.round(r.right));
      const cs = getComputedStyle(e); const lh = parseFloat(cs.lineHeight) || 20;
      if (e.children.length === 0 && e.textContent.trim().length > 25 && r.width < 110 && r.height / lh > 4) out.push('STRETTO ' + e.tagName + '.' + e.className + ' w' + Math.round(r.width) + ' "' + e.textContent.trim().slice(0, 30) + '"');
      if (e.matches('button,a.btn,a,input,select') && r.height > 0 && r.height < 36 && r.width < 400 && !e.closest('.solo-lettori')) out.push('PICCOLO ' + e.tagName + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' "' + (e.textContent || e.name || '').trim().slice(0, 20) + '"');
    }
    return [...new Set(out)].slice(0, 8);
  });
  console.log(r, res.length ? '\n  ' + res.join('\n  ') : 'ok');
}
await b.close();
