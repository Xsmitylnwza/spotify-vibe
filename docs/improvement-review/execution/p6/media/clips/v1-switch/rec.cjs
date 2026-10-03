const {chromium}=require('C:/letmecook/portfolioX/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const root='C:/letmecook-lab/spotify-vibe';
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]));fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':types[path.extname(p)]||'application/octet-stream'});r.end(d)})}).listen(47481,async()=>{
 const out=path.join(__dirname,'_rec');fs.rmSync(out,{recursive:true,force:true});
 const b=await chromium.launch();const vs=Date.now();
 const c=await b.newContext({viewport:{width:1600,height:1000},recordVideo:{dir:out,size:{width:1600,height:1000}}});
 const pg=await c.newPage();await pg.goto('http://localhost:47481/docs/improvement-review/execution/p6/media/clips/v1-switch/stage.html');
 await pg.evaluate(()=>document.fonts.ready);
 const t0=await pg.evaluate(()=>window.__t0);
 console.log('OFFSET',(t0-vs)/1000);
 await pg.waitForTimeout(19500);
 await c.close();await b.close();srv.close();
});
