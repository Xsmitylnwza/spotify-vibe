import { createRequire } from 'module'; const require = createRequire('C:/letmecook/portfolioX/package.json'); const { chromium } = require('playwright');
const b = await chromium.launch();
for (const n of ['p1-a','p1-b','p1-c']) { const p = await b.newPage({ viewport: { width: 1600, height: 1000 } }); await p.goto('http://127.0.0.1:47460/p/' + n + '.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600); await p.screenshot({ path: n + '.png' }); await p.close(); }
await b.close();
