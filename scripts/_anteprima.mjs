import { chromium } from '../tests/lib.mjs';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 880, height: 880 }, deviceScaleFactor: 2 });
await p.goto('file:///C:/Users/pcgameluigi/orto/docs/anteprima/mock2.html'); await p.waitForTimeout(400);
await p.screenshot({ path: 'C:/Users/pcgameluigi/orto/docs/anteprima/anteprima2.png' }); await b.close();
