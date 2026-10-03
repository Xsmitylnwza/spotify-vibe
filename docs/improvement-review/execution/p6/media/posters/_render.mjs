import { createRequire } from 'module'; const require = createRequire('C:/letmecook/portfolioX/package.json'); const { chromium } = require('playwright');
const b = await chromium.launch(); const which = process.argv.slice(2).length ? process.argv.slice(2) : ['p1', 'p2', 'p3'];
for (const n of which) { const p = await b.newPage({ viewport: { width: 1600, height: 1000 } }); await p.goto('http://127.0.0.1:47460/p/' + n + '.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500); await p.screenshot({ path: n + '.png' }); await p.close(); }
await b.close();
