const { chromium } = require('C:/letmecook/portfolioX/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = 'C:/letmecook-lab/spotify-vibe/docs/improvement-review/execution/p2/mockup';
const OUT = 'C:/letmecook-lab/spotify-vibe/docs/improvement-review/execution/p6/media/clips/v2-v3/_tmp';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OVERLAY = `
#fd{position:fixed;left:256px;bottom:14px;z-index:99999;font:500 12px/1 'IBM Plex Sans',system-ui,sans-serif;color:#fff;background:rgba(20,20,24,.78);padding:6px 10px;border-radius:999px;letter-spacing:.02em;pointer-events:none}
#fc{position:fixed;left:0;top:0;width:22px;height:22px;z-index:99999;pointer-events:none;transform:translate(-100px,-100px);filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))}
#fc.k{transform-origin:2px 2px}`;
async function run(name, script) {
  await new Promise(r => srv.listen(0, r));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, recordVideo: { dir: OUT + '/' + name, size: { width: 1600, height: 1000 } }, reducedMotion: 'no-preference' });
  await ctx.route('http://127.0.0.1:17347/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ connected: true, discordUser: { id: '100000000000000001', username: 'vibe.demo', displayName: 'Vibe Demo', avatarUrl: 'https://cdn.discordapp.com/avatars/1/demo.png' } }) }));
  await ctx.route('https://cdn.discordapp.com/**', r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: fs.readFileSync(ROOT + '/assets/art/avatar-2.svg') }));
  await ctx.addInitScript(`document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(OVERLAY)};document.head.appendChild(s);const d=document.createElement('div');d.id='fd';d.textContent='Fictional demo';document.body.appendChild(d);const c=document.createElement('div');c.id='fc';c.innerHTML='<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2l14 8-6 1.5L8 18z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';document.body.appendChild(c);document.addEventListener('mousemove',e=>{c.style.transform='translate('+e.clientX+'px,'+e.clientY+'px)'});document.addEventListener('mousedown',()=>c.style.scale='.85');document.addEventListener('mouseup',()=>c.style.scale='1');});`);
  const T00=Date.now(); const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:'+srv.address().port+'/index.html?dev=0');
  await page.waitForTimeout(800); const sk=page.getByText('Skip',{exact:true}); if(await sk.count()) await sk.first().click(); await page.waitForTimeout(900); await page.mouse.move(800, 500); const T0=Date.now(); await page.waitForTimeout(700);
  const mv = async (loc, o = {}) => { const bb = await loc.boundingBox(); await page.mouse.move(bb.x + bb.width * (o.fx ?? .5), bb.y + bb.height * (o.fy ?? .5), { steps: 16 }); };
  const click = async (loc, o) => { await loc.scrollIntoViewIfNeeded(); await mv(loc, o); await sleep(110); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(o && o.after || 380); };
  await script(page, { mv, click, sleep });
  console.log('START', (T0 - T00)/1000);
  const v = page.video(); await ctx.close(); await b.close(); srv.close();
  fs.copyFileSync(await v.path(), OUT + '/' + name + '.webm');
}
module.exports = { run };
