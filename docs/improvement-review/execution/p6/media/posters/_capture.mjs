import { createRequire } from 'module'; import fs from 'fs'; const require = createRequire('C:/letmecook/portfolioX/package.json'); const { chromium } = require('playwright');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
await p.goto('http://127.0.0.1:47460/m/index.html?screen=now&dev=0&theme=light'); await p.waitForTimeout(800);
const out = await p.evaluate(() => {
  Object.assign(DCID, { id: '1', name: 'Vibe Demo', handle: '@vibe.demo', avatarUrl: 'assets/art/avatar-2.svg' }); profileStatus = 'ready';
  const neutral = 'assets/art/app.svg';
  const base = id => Object.assign({}, sceneBy(id), { btns: [{ label: '', url: '' }, { label: '', url: '' }] });
  const design = Object.assign(base('design'), { actName: 'Design', l1: 'Designing in Figma', l2: 'Landing page v3 – Figma', btns: [{ label: '', url: '' }, { label: '', url: '' }] });
  const coding = Object.assign(base('coding'), { actName: 'Coding', l1: 'Writing code', l2: 'Tests are green (mostly)' });
  const chill = Object.assign(base('music'), { actName: 'Chill', type: 'listening', l1: 'Spotify on repeat', l2: 'Lo-fi beats to refactor to' });
  sceneBy('design').actName = 'Design'; sceneBy('design').btns = [{ label: '', url: '' }, { label: '', url: '' }];
  render();
  const fix = h => h.replace(/src="assets\/art\/(poster|chill-poster|gaming-poster)\.png"/g, `src="${neutral}"`);
  const o = {};
  for (const [k, sc] of Object.entries({ design, coding, chill })) { o[k + 'Pop'] = fix(dcCard(sc, { view: 'popout', app: 'Figma' })); o[k + 'List'] = fix(dcCard(sc, { view: 'list' })); }
  o.root = fix(document.querySelector('#root').innerHTML);
  return o;
});
fs.writeFileSync('_frag.json', JSON.stringify(out, null, 1)); console.log(Object.keys(out), out.designPop.slice(0, 900));
await b.close();
